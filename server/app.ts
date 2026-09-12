import { Hono } from "hono";
import { z } from "zod";
import type { Db } from "./db.ts";
import { nowIso } from "./db.ts";
import { BlockSchema, placementExercises, DEFAULT_PASS_RULE, type ContentBundle } from "../shared/schema.ts";
import {
  insertAttempt, startLesson, getLessonProgress, completeLesson, listProgress,
  insertWriting, latestWriting, insertSpeaking, insertCards, tagStats,
  insertAssessment, latestAssessment, latestModuleAssessments, latestAttemptsSince, latestWritingSince, latestSpeakingSince, ensureWeekGoal, listAssessments,
  upsertWeekGoal, latestStudySession, insertStudySession, extendStudySession,
  dueCards, getCard, applyReview, cardCounts, insertGlossaryCard,
} from "./repo.ts";
import { sm2, maturity, type Grade } from "../shared/sm2.ts";
import { evaluateCompletion } from "./completion.ts";
import { selectWarmup, weakTags } from "./warmup.ts";
import { ruleBasedFeedback } from "./writing-feedback.ts";
import { computeSpeakingMetrics } from "./speaking-metrics.ts";
import { wordOverlap } from "../shared/speech-compare.ts";
import { computePlacementResult, missingForFinish, parsePlacementAssessment, type PlacementInputs, type PlacementSpeakingMetrics } from "./placement.ts";
import { checkpointDue } from "./checkpoint.ts";
import { computeAssessmentResult, levelEligibility, missingForAssessment, moduleEligibility, parseAssessmentRecord, type AssessmentInputs } from "./assessment.ts";
import { weekStart } from "./time.ts";
import { buildDashboard } from "./dashboard.ts";

export type AppDeps = { db: Db; content: ContentBundle; now?: () => string };

const AttemptBody = z.object({
  lessonId: z.string().min(1),
  exerciseId: z.string().min(1),
  block: BlockSchema,
  type: z.enum(["multiple_choice", "fill_blank", "error_correction", "reorder", "translate", "match", "free_text"]),
  correct: z.boolean(),
  answer: z.string().optional(),
  score: z.number().optional(),
  tags: z.array(z.string()),
});
const WritingBody = z.object({ text: z.string().trim().min(1), selfScore: z.number().min(1).max(5).optional() });
const SpeakingBody = z.object({
  mode: z.literal("A"),
  transcript: z.string().trim().min(1),
  durationSec: z.number().positive(),
  selfConfidence: z.number().int().min(1).max(5).optional(),
});

/** Meta semanal criada ao concluir o teste inicial (trilha assume 3 aulas/semana). */
export const DEFAULT_GOAL = { lessonsTarget: 3, reviewsTarget: 5, minutesTarget: 150 };

/** Heartbeat mais antigo que isso abre uma sessão nova. */
export const HEARTBEAT_GAP_MS = 120_000;

const GoalBody = z.object({
  lessonsTarget: z.number().int().min(0).max(50),
  reviewsTarget: z.number().int().min(0).max(500),
  minutesTarget: z.number().int().min(0).max(3000),
});
const HeartbeatBody = z.object({ lessonId: z.string().min(1).optional() });

/** `days` da query: inteiro entre 1 e 365; qualquer outra coisa vira 30. */
function sanitizeDays(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.min(365, Math.floor(n)) : 30;
}

const PlacementSpeakingBody = z.object({
  readAloud: z.array(z.object({ target: z.string().min(1), transcript: z.string() })).default([]),
  transcript: z.string().trim().min(1),
  durationSec: z.number().positive(),
  selfConfidence: z.number().int().min(1).max(5).optional(),
});

const ReviewBody = z.object({ cardId: z.number().int().min(1), grade: z.number().int().min(0).max(5) });
const CardBody = z.object({
  front: z.string().trim().min(1),
  back: z.string().trim().min(1),
  hint: z.string().trim().min(1).optional(),
  tag: z.string().min(3),
});

/** `limit` da fila: inteiro entre 1 e 200; qualquer outra coisa vira 50. */
function sanitizeLimit(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.min(200, Math.floor(n)) : 50;
}

export function createApp({ db, content, now = nowIso }: AppDeps): Hono {
  const app = new Hono();
  const placementIds = new Set(placementExercises(content.placement).map((e) => e.exercise.id));
  const assessmentIds = new Map([
    ...Object.entries(content.moduleAssessments).map(([id, a]) => [id, new Set(a.items.map((q) => q.id))] as const),
    ...Object.entries(content.levelAssessments).map(([id, a]) => [id, new Set(a.items.map((q) => q.id))] as const),
  ]);

  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: err.message }, 500);
  });

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.get("/api/progress/overview", (c) => {
    const modules = Object.fromEntries(latestModuleAssessments(db).map((r) => {
      const rec = parseAssessmentRecord(r);
      return [r.ref, { passed: rec.result.passed, latest: rec }];
    }));
    return c.json({ lessons: listProgress(db), modules });
  });

  app.get("/api/tags/stats", (c) => {
    const days = sanitizeDays(c.req.query("days"));
    const current = new Date(now());
    const since = new Date(current.getTime() - days * 864e5).toISOString();
    return c.json({ since, stats: tagStats(db, since), weak: weakTags(db, current) });
  });

  app.get("/api/dashboard", (c) => c.json(buildDashboard(db, content, now(), sanitizeDays(c.req.query("days")))));

  app.put("/api/goals/week", async (c) => {
    const parsed = GoalBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const ws = weekStart(now());
    const row = upsertWeekGoal(db, ws, parsed.data);
    return c.json({ weekStart: ws, goal: { lessonsTarget: row.lessons_target, reviewsTarget: row.reviews_target, minutesTarget: row.minutes_target } });
  });

  app.post("/api/study/heartbeat", async (c) => {
    // Corpo vazio é válido: heartbeat sem aula.
    const parsed = HeartbeatBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const ts = now();
    const lessonId = parsed.data.lessonId ?? null;
    const last = latestStudySession(db);
    if (last && Date.parse(ts) - Date.parse(last.ended_at ?? last.started_at) <= HEARTBEAT_GAP_MS) {
      extendStudySession(db, last.id, ts, lessonId);
      return c.json({ sessionId: last.id, resumed: true });
    }
    return c.json({ sessionId: insertStudySession(db, ts, lessonId), resumed: false });
  });

  app.post("/api/attempts", async (c) => {
    const parsed = AttemptBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const { lessonId, block, exerciseId } = parsed.data;
    if (lessonId === "placement" || lessonId === "checkpoint") {
      // O checkpoint reusa o conjunto do teste inicial (mesmo formato, comparação direta).
      if (block !== "placement") return c.json({ error: "o teste inicial usa o bloco placement" }, 400);
      if (!placementIds.has(exerciseId)) return c.json({ error: "exercício não pertence ao teste inicial" }, 400);
    } else if (assessmentIds.has(lessonId)) {
      // lessonId é um módulo com avaliação: só aceita o bloco assessment, mesmo que o item exista.
      if (block !== "assessment") return c.json({ error: "a avaliação do módulo usa o bloco assessment" }, 400);
      if (!assessmentIds.get(lessonId)!.has(exerciseId)) return c.json({ error: "exercício não pertence à avaliação" }, 400);
    } else {
      if (block === "assessment") return c.json({ error: "módulo sem avaliação" }, 404);
      if (block === "placement") return c.json({ error: "bloco placement só vale para o teste inicial" }, 400);
      if (!content.lessons[lessonId]) return c.json({ error: "aula não encontrada" }, 404);
    }
    return c.json({ id: insertAttempt(db, parsed.data, now()) });
  });

  const lessons = new Hono();

  lessons.use("/:id/*", async (c, next) => {
    if (!content.lessons[c.req.param("id") ?? ""]) return c.json({ error: "aula não encontrada" }, 404);
    await next();
  });

  lessons.post("/:id/start", (c) => {
    const id = c.req.param("id");
    startLesson(db, id, now());
    return c.json({ progress: getLessonProgress(db, id) ?? null });
  });

  lessons.get("/:id/status", (c) => {
    const id = c.req.param("id");
    return c.json({ progress: getLessonProgress(db, id) ?? null, completion: evaluateCompletion(db, content.lessons[id]!) });
  });

  lessons.post("/:id/complete", (c) => {
    const id = c.req.param("id");
    const lesson = content.lessons[id]!;
    let completion = evaluateCompletion(db, lesson);
    let cardsInserted = 0;
    if (completion.met) {
      const ts = now();
      completeLesson(db, id, completion.quizPct, ts);
      cardsInserted = insertCards(db, id, lesson.srsCards, ts);
      completion = evaluateCompletion(db, lesson);
    }
    return c.json({ progress: getLessonProgress(db, id) ?? null, completion, cardsInserted });
  });

  lessons.get("/:id/warmup", (c) => c.json({ items: selectWarmup(db, content, c.req.param("id"), new Date(now())) }));

  lessons.get("/:id/writing/latest", (c) => c.json({ submission: latestWriting(db, c.req.param("id")) ?? null }));

  lessons.post("/:id/writing", async (c) => {
    const id = c.req.param("id");
    const parsed = WritingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const feedback = ruleBasedFeedback(parsed.data.text, content.lessons[id]!.writing, content.brErrors, parsed.data.selfScore);
    const rowId = insertWriting(db, { lessonId: id, text: parsed.data.text, feedback, score: feedback.score }, now());
    return c.json({ id: rowId, feedback });
  });

  lessons.post("/:id/speaking", async (c) => {
    const id = c.req.param("id");
    const parsed = SpeakingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const metrics = computeSpeakingMetrics(parsed.data.transcript, parsed.data.durationSec, content.lessons[id]!.speaking.modeA, content.brErrors);
    const rowId = insertSpeaking(
      db,
      { lessonId: id, mode: "A", transcript: parsed.data.transcript, metrics, score: metrics.score, selfConfidence: parsed.data.selfConfidence ?? null },
      now(),
    );
    return c.json({ id: rowId, metrics });
  });

  // ---------- teste inicial ----------
  const placement = new Hono();
  const pl = content.placement;
  /** A rodada atual é tudo que foi gravado depois da última avaliação ("" = desde sempre). */
  const runInputs = (): { since: string; inputs: PlacementInputs } => {
    const since = latestAssessment(db, "placement", "placement")?.ts ?? "";
    return {
      since,
      inputs: {
        attempts: latestAttemptsSince(db, "placement", "placement", since),
        writing: latestWritingSince(db, "placement", since),
        speaking: latestSpeakingSince(db, "placement", since),
      },
    };
  };

  placement.get("/state", (c) => {
    const latestRow = latestAssessment(db, "placement", "placement");
    const { inputs } = runInputs();
    return c.json({
      latest: latestRow ? parsePlacementAssessment(latestRow) : null,
      run: { answered: [...inputs.attempts.keys()], writing: inputs.writing ?? null, speaking: inputs.speaking ?? null },
    });
  });

  placement.post("/writing", async (c) => {
    const parsed = WritingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const feedback = ruleBasedFeedback(parsed.data.text, pl.writing, content.brErrors, parsed.data.selfScore);
    const id = insertWriting(db, { lessonId: "placement", text: parsed.data.text, feedback, score: feedback.score }, now());
    return c.json({ id, feedback });
  });

  placement.post("/speaking", async (c) => {
    const parsed = PlacementSpeakingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const { readAloud, transcript, durationSec, selfConfidence } = parsed.data;
    // Sem leitura em voz alta não há fonte para o eixo Pronúncia: `null`, não zero (spec §7.3).
    const readAloudPct = readAloud.length === 0 ? null : readAloud.reduce((sum, r) => sum + wordOverlap(r.transcript, r.target), 0) / readAloud.length;
    const metrics: PlacementSpeakingMetrics = { ...computeSpeakingMetrics(transcript, durationSec, pl.speaking.modeA, content.brErrors), readAloudPct };
    const id = insertSpeaking(db, { lessonId: "placement", mode: "A", transcript, metrics, score: metrics.score, selfConfidence: selfConfidence ?? null }, now());
    return c.json({ id, metrics });
  });

  placement.post("/finish", (c) => {
    const { inputs } = runInputs();
    const missing = missingForFinish(pl, inputs);
    if (missing.exercises.length > 0 || missing.writing) return c.json({ error: "teste incompleto", missing }, 409);
    const ts = now();
    const result = computePlacementResult(pl, inputs, ts);
    const id = insertAssessment(db, { kind: "placement", ref: "placement", score: result }, ts);
    ensureWeekGoal(db, weekStart(ts), DEFAULT_GOAL);
    return c.json({ assessment: { id, ts, result } });
  });

  app.route("/api/placement", placement);

  // ---------- checkpoint de 4 semanas (mesmo formato do teste inicial, ref "checkpoint") ----------
  const checkpoint = new Hono();
  const checkpointInputs = (): PlacementInputs => {
    const since = latestAssessment(db, "checkpoint", "checkpoint")?.ts ?? "";
    return {
      attempts: latestAttemptsSince(db, "checkpoint", "placement", since),
      writing: latestWritingSince(db, "checkpoint", since),
      speaking: latestSpeakingSince(db, "checkpoint", since),
    };
  };

  checkpoint.get("/state", (c) => {
    const latestRow = latestAssessment(db, "checkpoint", "checkpoint");
    const inputs = checkpointInputs();
    return c.json({
      ...checkpointDue(db, new Date(now())),
      latest: latestRow ? parsePlacementAssessment(latestRow) : null,
      run: { answered: [...inputs.attempts.keys()], writing: inputs.writing ?? null, speaking: inputs.speaking ?? null },
    });
  });

  checkpoint.post("/writing", async (c) => {
    const parsed = WritingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const feedback = ruleBasedFeedback(parsed.data.text, pl.writing, content.brErrors, parsed.data.selfScore);
    const id = insertWriting(db, { lessonId: "checkpoint", text: parsed.data.text, feedback, score: feedback.score }, now());
    return c.json({ id, feedback });
  });

  checkpoint.post("/speaking", async (c) => {
    const parsed = PlacementSpeakingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const { readAloud, transcript, durationSec, selfConfidence } = parsed.data;
    const readAloudPct = readAloud.length === 0 ? null : readAloud.reduce((sum, r) => sum + wordOverlap(r.transcript, r.target), 0) / readAloud.length;
    const metrics: PlacementSpeakingMetrics = { ...computeSpeakingMetrics(transcript, durationSec, pl.speaking.modeA, content.brErrors), readAloudPct };
    const id = insertSpeaking(db, { lessonId: "checkpoint", mode: "A", transcript, metrics, score: metrics.score, selfConfidence: selfConfidence ?? null }, now());
    return c.json({ id, metrics });
  });

  checkpoint.post("/finish", (c) => {
    const inputs = checkpointInputs();
    const missing = missingForFinish(pl, inputs);
    if (missing.exercises.length > 0 || missing.writing) return c.json({ error: "checkpoint incompleto", missing }, 409);
    const ts = now();
    const result = computePlacementResult(pl, inputs, ts);
    const id = insertAssessment(db, { kind: "checkpoint", ref: "checkpoint", score: result }, ts);
    return c.json({ assessment: { id, ts, result } });
  });

  app.route("/api/checkpoint", checkpoint);

  // ---------- avaliação de módulo ----------
  const moduleAssessment = new Hono();

  moduleAssessment.use("/:id/*", async (c, next) => {
    if (!content.moduleAssessments[c.req.param("id") ?? ""]) return c.json({ error: "módulo sem avaliação" }, 404);
    await next();
  });

  /** Rodada atual do módulo: tudo gravado com lesson_id = id depois da última avaliação dele. */
  const assessmentRun = (id: string): AssessmentInputs => {
    const since = latestAssessment(db, "module", id)?.ts ?? "";
    return {
      attempts: latestAttemptsSince(db, id, "assessment", since),
      writing: latestWritingSince(db, id, since),
      speaking: latestSpeakingSince(db, id, since),
    };
  };

  moduleAssessment.get("/:id/assessment/state", (c) => {
    const id = c.req.param("id");
    const latestRow = latestAssessment(db, "module", id);
    const run = assessmentRun(id);
    return c.json({
      eligible: moduleEligibility(content, listProgress(db), id),
      latest: latestRow ? parseAssessmentRecord(latestRow) : null,
      run: { answered: [...run.attempts.keys()], writing: run.writing ?? null, speaking: run.speaking ?? null },
    });
  });

  moduleAssessment.post("/:id/assessment/writing", async (c) => {
    const id = c.req.param("id");
    const parsed = WritingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const feedback = ruleBasedFeedback(parsed.data.text, content.moduleAssessments[id]!.writing, content.brErrors, parsed.data.selfScore);
    const rowId = insertWriting(db, { lessonId: id, text: parsed.data.text, feedback, score: feedback.score }, now());
    return c.json({ id: rowId, feedback });
  });

  moduleAssessment.post("/:id/assessment/speaking", async (c) => {
    const id = c.req.param("id");
    const parsed = SpeakingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const metrics = computeSpeakingMetrics(parsed.data.transcript, parsed.data.durationSec, content.moduleAssessments[id]!.speaking, content.brErrors);
    const rowId = insertSpeaking(db, { lessonId: id, mode: "A", transcript: parsed.data.transcript, metrics, score: metrics.score, selfConfidence: parsed.data.selfConfidence ?? null }, now());
    return c.json({ id: rowId, metrics });
  });

  moduleAssessment.post("/:id/assessment/finish", (c) => {
    const id = c.req.param("id");
    const eligible = moduleEligibility(content, listProgress(db), id);
    if (eligible.missing.length > 0) return c.json({ error: "aulas pendentes", missing: eligible.missing }, 409);
    const spec = { kind: "module" as const, ref: id, items: content.moduleAssessments[id]!.items, pass: content.modules[id]?.pass ?? DEFAULT_PASS_RULE };
    const inputs = assessmentRun(id);
    const missing = missingForAssessment(spec, inputs);
    if (missing.exercises.length > 0 || missing.writing || missing.speaking) return c.json({ error: "avaliação incompleta", missing }, 409);
    const ts = now();
    const result = computeAssessmentResult(spec, inputs, ts);
    const rowId = insertAssessment(db, { kind: "module", ref: id, score: result }, ts);
    return c.json({ assessment: { id: rowId, ts, result } });
  });

  app.route("/api/modules", moduleAssessment);

  // ---------- Avaliação de nível (/api/levels/:n/assessment/*, ref "L<n>") ----------
  const levelAssessment = new Hono();

  levelAssessment.use("/:n/assessment/*", async (c, next) => {
    if (!content.levelAssessments[`L${c.req.param("n")}`]) return c.json({ error: "nível sem avaliação" }, 404);
    await next();
  });

  const levelRun = (ref: string): AssessmentInputs => {
    const since = latestAssessment(db, "level", ref)?.ts ?? "";
    return {
      attempts: latestAttemptsSince(db, ref, "assessment", since),
      writing: latestWritingSince(db, ref, since),
      speaking: latestSpeakingSince(db, ref, since),
    };
  };

  levelAssessment.get("/:n/assessment/state", (c) => {
    const ref = `L${c.req.param("n")}`;
    const latestRow = latestAssessment(db, "level", ref);
    const run = levelRun(ref);
    return c.json({
      eligible: levelEligibility(content, listAssessments(db), Number(c.req.param("n"))),
      latest: latestRow ? parseAssessmentRecord(latestRow) : null,
      run: { answered: [...run.attempts.keys()], writing: run.writing ?? null, speaking: run.speaking ?? null },
    });
  });

  levelAssessment.post("/:n/assessment/writing", async (c) => {
    const ref = `L${c.req.param("n")}`;
    const parsed = WritingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const feedback = ruleBasedFeedback(parsed.data.text, content.levelAssessments[ref]!.writing, content.brErrors, parsed.data.selfScore);
    const rowId = insertWriting(db, { lessonId: ref, text: parsed.data.text, feedback, score: feedback.score }, now());
    return c.json({ id: rowId, feedback });
  });

  levelAssessment.post("/:n/assessment/speaking", async (c) => {
    const ref = `L${c.req.param("n")}`;
    const parsed = SpeakingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const metrics = computeSpeakingMetrics(parsed.data.transcript, parsed.data.durationSec, content.levelAssessments[ref]!.speaking, content.brErrors);
    const rowId = insertSpeaking(db, { lessonId: ref, mode: "A", transcript: parsed.data.transcript, metrics, score: metrics.score, selfConfidence: parsed.data.selfConfidence ?? null }, now());
    return c.json({ id: rowId, metrics });
  });

  levelAssessment.post("/:n/assessment/finish", (c) => {
    const ref = `L${c.req.param("n")}`;
    const eligible = levelEligibility(content, listAssessments(db), Number(c.req.param("n")));
    if (eligible.missing.length > 0) return c.json({ error: "módulos pendentes", missing: eligible.missing }, 409);
    const spec = { kind: "level" as const, ref, items: content.levelAssessments[ref]!.items, pass: content.levelAssessments[ref]!.pass };
    const inputs = levelRun(ref);
    const missing = missingForAssessment(spec, inputs);
    if (missing.exercises.length > 0 || missing.writing || missing.speaking) return c.json({ error: "avaliação incompleta", missing }, 409);
    const ts = now();
    const result = computeAssessmentResult(spec, inputs, ts);
    const rowId = insertAssessment(db, { kind: "level", ref, score: result }, ts);
    return c.json({ assessment: { id: rowId, ts, result } });
  });

  app.route("/api/levels", levelAssessment);

  // ---------- SRS ----------
  const srs = new Hono();

  srs.get("/queue", (c) => {
    const ts = now();
    return c.json({ cards: dueCards(db, ts, sanitizeLimit(c.req.query("limit"))), counts: cardCounts(db, ts) });
  });

  srs.post("/review", async (c) => {
    const parsed = ReviewBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const card = getCard(db, parsed.data.cardId);
    if (!card) return c.json({ error: "card não encontrado" }, 404);
    const ts = now();
    const next = sm2({ ease: card.ease, intervalDays: card.interval_days, reps: card.reps, lapses: card.lapses }, parsed.data.grade as Grade, ts);
    applyReview(db, card.id, parsed.data.grade, next, ts);
    const updated = getCard(db, card.id)!;
    return c.json({ card: updated, maturity: maturity({ reps: updated.reps, intervalDays: updated.interval_days }), counts: cardCounts(db, ts) });
  });

  srs.post("/cards", async (c) => {
    const parsed = CardBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    return c.json(insertGlossaryCard(db, parsed.data, now()));
  });

  app.route("/api/srs", srs);

  app.route("/api/lessons", lessons);
  return app;
}
