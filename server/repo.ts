import type { Db } from "./db.ts";
import type { Block, ExerciseType } from "../shared/schema.ts";

// ---------- attempts ----------
export type AttemptInput = {
  lessonId: string; exerciseId: string; block: Block; type: ExerciseType;
  correct: boolean; answer?: string; score?: number; tags: string[];
};
export type AttemptRow = {
  id: number; lesson_id: string; exercise_id: string; block: string; type: string;
  correct: number; answer: string | null; score: number | null; tags_json: string; ts: string;
};

export function insertAttempt(db: Db, a: AttemptInput, now: string): number {
  const r = db
    .prepare("insert into attempts (lesson_id, exercise_id, block, type, correct, answer, score, tags_json, ts) values (?,?,?,?,?,?,?,?,?)")
    .run(a.lessonId, a.exerciseId, a.block, a.type, a.correct ? 1 : 0, a.answer ?? null, a.score ?? null, JSON.stringify(a.tags), now);
  return Number(r.lastInsertRowid);
}

/** Última tentativa de cada exercício (por lesson + block). */
export function latestAttemptsByExercise(db: Db, lessonId: string, block: Block): Map<string, AttemptRow> {
  const rows = db.prepare("select * from attempts where lesson_id = ? and block = ? order by ts asc, id asc").all(lessonId, block) as AttemptRow[];
  const map = new Map<string, AttemptRow>();
  for (const r of rows) map.set(r.exercise_id, r);
  return map;
}

// ---------- lesson_progress ----------
export type LessonProgressRow = {
  lesson_id: string; status: "in_progress" | "completed"; score: number | null; started_at: string; completed_at: string | null;
};

export function startLesson(db: Db, lessonId: string, now: string): void {
  db.prepare("insert or ignore into lesson_progress (lesson_id, status, started_at) values (?, 'in_progress', ?)").run(lessonId, now);
}

export function getLessonProgress(db: Db, lessonId: string): LessonProgressRow | undefined {
  return db.prepare("select * from lesson_progress where lesson_id = ?").get(lessonId) as LessonProgressRow | undefined;
}

export function completeLesson(db: Db, lessonId: string, score: number, now: string): void {
  db.prepare(
    `insert into lesson_progress (lesson_id, status, score, started_at, completed_at) values (?, 'completed', ?, ?, ?)
     on conflict(lesson_id) do update set status = 'completed', score = excluded.score, completed_at = excluded.completed_at`,
  ).run(lessonId, score, now, now);
}

export function listProgress(db: Db): LessonProgressRow[] {
  return db.prepare("select * from lesson_progress order by started_at").all() as LessonProgressRow[];
}

// ---------- writing ----------
export type WritingRow = { id: number; lesson_id: string; text: string; feedback_json: string; score: number | null; ts: string };

export function insertWriting(db: Db, w: { lessonId: string; text: string; feedback: unknown; score: number | null }, now: string): number {
  const r = db.prepare("insert into writing_submissions (lesson_id, text, feedback_json, score, ts) values (?,?,?,?,?)").run(w.lessonId, w.text, JSON.stringify(w.feedback), w.score, now);
  return Number(r.lastInsertRowid);
}

export function latestWriting(db: Db, lessonId: string): WritingRow | undefined {
  return db.prepare("select * from writing_submissions where lesson_id = ? order by ts desc, id desc limit 1").get(lessonId) as WritingRow | undefined;
}

// ---------- speaking ----------
export function insertSpeaking(
  db: Db,
  s: { lessonId: string; mode: "A" | "B"; transcript: string; metrics: unknown; score: number | null; selfConfidence: number | null },
  now: string,
): number {
  const r = db
    .prepare("insert into speaking_sessions (lesson_id, mode, transcript, metrics_json, score, self_confidence, ts) values (?,?,?,?,?,?,?)")
    .run(s.lessonId, s.mode, s.transcript, JSON.stringify(s.metrics), s.score, s.selfConfidence, now);
  return Number(r.lastInsertRowid);
}

export function countSpeaking(db: Db, lessonId: string): number {
  return (db.prepare("select count(*) as n from speaking_sessions where lesson_id = ?").get(lessonId) as { n: number }).n;
}

// ---------- srs cards ----------
export function insertCards(db: Db, lessonId: string, cards: Array<{ front: string; back: string; hint?: string; tag: string }>, now: string): number {
  const stmt = db.prepare("insert or ignore into srs_cards (lesson_id, front, back, hint, tag, due, created_at) values (?,?,?,?,?,?,?)");
  let inserted = 0;
  for (const c of cards) inserted += Number(stmt.run(lessonId, c.front, c.back, c.hint ?? null, c.tag, now, now).changes);
  return inserted;
}

export function countCards(db: Db, lessonId: string): number {
  return (db.prepare("select count(*) as n from srs_cards where lesson_id = ?").get(lessonId) as { n: number }).n;
}

// ---------- estatísticas por tag ----------
export type TagStat = { tag: string; attempts: number; errors: number; errorRate: number };

export function tagStats(db: Db, sinceIso: string): TagStat[] {
  const rows = db
    .prepare(
      `select j.value as tag, count(*) as attempts, sum(case when a.correct = 0 then 1 else 0 end) as errors
       from attempts a, json_each(a.tags_json) j
       where a.ts >= ?
       group by j.value
       order by errors desc, attempts desc`,
    )
    .all(sinceIso) as Array<{ tag: string; attempts: number; errors: number }>;
  return rows.map((r) => ({ tag: r.tag, attempts: r.attempts, errors: r.errors, errorRate: r.attempts === 0 ? 0 : r.errors / r.attempts }));
}
