import { Hono } from "hono";
import { z } from "zod";
import type { Db } from "./db.ts";
import { nowIso } from "./db.ts";
import { BlockSchema, placementExercises, type ContentBundle } from "../shared/schema.ts";
import {
  insertAttempt, startLesson, getLessonProgress, completeLesson, listProgress,
  insertWriting, latestWriting, insertSpeaking, insertCards, tagStats,
  insertAssessment, latestAssessment, latestAttemptsSince, latestWritingSince, latestSpeakingSince, ensureWeekGoal,
  upsertWeekGoal, latestStudySession, insertStudySession, extendStudySession,
} from "./repo.ts";
import { evaluateCompletion } from "./completion.ts";
import { selectWarmup, weakTags } from "./warmup.ts";
import { ruleBasedFeedback } from "./writing-feedback.ts";
import { computeSpeakingMetrics } from "./speaking-metrics.ts";
import { wordOverlap } from "../shared/speech-compare.ts";
import { computePlacementResult, missingForFinish, parsePlacementAssessment, type PlacementInputs, type PlacementSpeakingMetrics } from "./placement.ts";
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

export function createApp({ db, content, now = nowIso }: AppDeps): Hono {
  const app = new Hono();
  const placementIds = new Set(placementExercises(content.placement).map((e) => e.exercise.id));

  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: err.message }, 500);
  });

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.get("/api/progress/overview", (c) => c.json({ lessons: listProgress(db) }));

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
    if (lessonId === "placement") {
      if (block !== "placement") return c.json({ error: "o teste inicial usa o bloco placement" }, 400);
      if (!placementIds.has(exerciseId)) return c.json({ error: "exercício não pertence ao teste inicial" }, 400);
    } else {
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

  app.route("/api/lessons", lessons);
  return app;
}
