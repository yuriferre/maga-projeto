import { Hono } from "hono";
import { z } from "zod";
import type { Db } from "./db.ts";
import { nowIso } from "./db.ts";
import { BlockSchema, placementExercises, type ContentBundle } from "../shared/schema.ts";
import {
  insertAttempt, startLesson, getLessonProgress, completeLesson, listProgress,
  insertWriting, latestWriting, insertSpeaking, insertCards, tagStats,
} from "./repo.ts";
import { evaluateCompletion } from "./completion.ts";
import { selectWarmup, weakTags } from "./warmup.ts";
import { ruleBasedFeedback } from "./writing-feedback.ts";
import { computeSpeakingMetrics } from "./speaking-metrics.ts";

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
const WritingBody = z.object({ text: z.string().min(1), selfScore: z.number().min(1).max(5).optional() });
const SpeakingBody = z.object({
  mode: z.literal("A"),
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
    const rawDays = Number(c.req.query("days"));
    const days = Number.isFinite(rawDays) && rawDays >= 1 ? Math.min(365, Math.floor(rawDays)) : 30;
    const current = new Date(now());
    const since = new Date(current.getTime() - days * 864e5).toISOString();
    return c.json({ since, stats: tagStats(db, since), weak: weakTags(db, current) });
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

  app.route("/api/lessons", lessons);
  return app;
}
