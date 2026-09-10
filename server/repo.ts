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

// ---------- avaliações ----------
export type AssessmentKind = "placement" | "module" | "level" | "checkpoint";
export type AssessmentRow = { id: number; kind: AssessmentKind; ref: string; score_json: string; ts: string };

export function insertAssessment(db: Db, a: { kind: AssessmentKind; ref: string; score: unknown }, now: string): number {
  const r = db.prepare("insert into assessments (kind, ref, score_json, ts) values (?,?,?,?)").run(a.kind, a.ref, JSON.stringify(a.score), now);
  return Number(r.lastInsertRowid);
}

export function latestAssessment(db: Db, kind: AssessmentKind, ref: string): AssessmentRow | undefined {
  return db.prepare("select * from assessments where kind = ? and ref = ? order by ts desc, id desc limit 1").get(kind, ref) as AssessmentRow | undefined;
}

export function listAssessments(db: Db): AssessmentRow[] {
  return db.prepare("select * from assessments order by ts desc, id desc").all() as AssessmentRow[];
}

// ---------- rodada: registros com ts estritamente maior que um instante ("" = desde sempre) ----------
export function latestAttemptsSince(db: Db, lessonId: string, block: Block, sinceExclusive: string): Map<string, AttemptRow> {
  const rows = db.prepare("select * from attempts where lesson_id = ? and block = ? and ts > ? order by ts asc, id asc").all(lessonId, block, sinceExclusive) as AttemptRow[];
  const map = new Map<string, AttemptRow>();
  for (const r of rows) map.set(r.exercise_id, r);
  return map;
}

export function latestWritingSince(db: Db, lessonId: string, sinceExclusive: string): WritingRow | undefined {
  return db.prepare("select * from writing_submissions where lesson_id = ? and ts > ? order by ts desc, id desc limit 1").get(lessonId, sinceExclusive) as WritingRow | undefined;
}

export type SpeakingRow = {
  id: number; lesson_id: string; mode: "A" | "B"; transcript: string; metrics_json: string;
  score: number | null; self_confidence: number | null; ts: string;
};

export function latestSpeakingSince(db: Db, lessonId: string, sinceExclusive: string): SpeakingRow | undefined {
  return db.prepare("select * from speaking_sessions where lesson_id = ? and ts > ? order by ts desc, id desc limit 1").get(lessonId, sinceExclusive) as SpeakingRow | undefined;
}

// ---------- metas semanais ----------
export type WeeklyGoalRow = { week_start: string; lessons_target: number; reviews_target: number; minutes_target: number };
export type WeekGoalInput = { lessonsTarget: number; reviewsTarget: number; minutesTarget: number };

export function getWeekGoal(db: Db, weekStart: string): WeeklyGoalRow | undefined {
  return db.prepare("select * from weekly_goals where week_start = ?").get(weekStart) as WeeklyGoalRow | undefined;
}

export function upsertWeekGoal(db: Db, weekStart: string, g: WeekGoalInput): WeeklyGoalRow {
  db.prepare(
    `insert into weekly_goals (week_start, lessons_target, reviews_target, minutes_target) values (?,?,?,?)
     on conflict(week_start) do update set lessons_target = excluded.lessons_target, reviews_target = excluded.reviews_target, minutes_target = excluded.minutes_target`,
  ).run(weekStart, g.lessonsTarget, g.reviewsTarget, g.minutesTarget);
  return getWeekGoal(db, weekStart)!;
}

/** Cria a meta da semana se não existir; nunca sobrescreve. */
export function ensureWeekGoal(db: Db, weekStart: string, g: WeekGoalInput): WeeklyGoalRow {
  db.prepare("insert or ignore into weekly_goals (week_start, lessons_target, reviews_target, minutes_target) values (?,?,?,?)").run(weekStart, g.lessonsTarget, g.reviewsTarget, g.minutesTarget);
  return getWeekGoal(db, weekStart)!;
}

// ---------- sessões de estudo ----------
export type StudySessionRow = { id: number; started_at: string; ended_at: string | null; lesson_id: string | null };

export function latestStudySession(db: Db): StudySessionRow | undefined {
  return db.prepare("select * from study_sessions order by coalesce(ended_at, started_at) desc, id desc limit 1").get() as StudySessionRow | undefined;
}

export function insertStudySession(db: Db, now: string, lessonId: string | null): number {
  const r = db.prepare("insert into study_sessions (started_at, ended_at, lesson_id) values (?,?,?)").run(now, now, lessonId);
  return Number(r.lastInsertRowid);
}

export function extendStudySession(db: Db, id: number, now: string, lessonId: string | null): void {
  db.prepare("update study_sessions set ended_at = ?, lesson_id = coalesce(?, lesson_id) where id = ?").run(now, lessonId, id);
}

/** Sessões que intersectam [startIso, endIso). */
export function studySessionsBetween(db: Db, startIso: string, endIso: string): StudySessionRow[] {
  return db.prepare("select * from study_sessions where started_at < ? and coalesce(ended_at, started_at) > ? order by started_at").all(endIso, startIso) as StudySessionRow[];
}

// ---------- atividade (dias locais) e contagens ----------
export function activityDays(db: Db): string[] {
  const rows = db
    .prepare(
      `select distinct d from (
         select date(ts, 'localtime') as d from attempts
         union select date(ts, 'localtime') from writing_submissions
         union select date(ts, 'localtime') from speaking_sessions
         union select date(started_at, 'localtime') from study_sessions
       ) order by d`,
    )
    .all() as { d: string }[];
  return rows.map((r) => r.d);
}

export function completedLessonsBetween(db: Db, startIso: string, endIso: string): number {
  return (db.prepare("select count(*) as n from lesson_progress where status = 'completed' and completed_at >= ? and completed_at < ?").get(startIso, endIso) as { n: number }).n;
}

export function reviewsBetween(db: Db, startIso: string, endIso: string): number {
  return (db.prepare("select count(*) as n from srs_reviews where ts >= ? and ts < ?").get(startIso, endIso) as { n: number }).n;
}

// ---------- amostras do radar ----------
export type RadarSample = { value: number | null; samples: number };

/** Acerto médio das tentativas desde `sinceIso` que casam por bloco OU por tag (lista exata ou prefixo). Cada tentativa conta uma vez. */
export function attemptAccuracy(db: Db, sinceIso: string, match: { blocks: string[]; tags: string[]; tagPrefix?: string }): RadarSample {
  const conds: string[] = [];
  const params: string[] = [sinceIso];
  if (match.blocks.length > 0) {
    conds.push(`a.block in (${match.blocks.map(() => "?").join(",")})`);
    params.push(...match.blocks);
  }
  const tagConds: string[] = [];
  if (match.tags.length > 0) {
    tagConds.push(`j.value in (${match.tags.map(() => "?").join(",")})`);
    params.push(...match.tags);
  }
  if (match.tagPrefix) {
    tagConds.push("j.value like ?");
    params.push(`${match.tagPrefix}%`);
  }
  if (tagConds.length > 0) conds.push(`exists (select 1 from json_each(a.tags_json) j where ${tagConds.join(" or ")})`);
  if (conds.length === 0) return { value: null, samples: 0 };
  const row = db.prepare(`select count(*) as n, coalesce(sum(a.correct), 0) as ok from attempts a where a.ts >= ? and (${conds.join(" or ")})`).get(...params) as { n: number; ok: number };
  return { value: row.n === 0 ? null : row.ok / row.n, samples: row.n };
}

function average(db: Db, sql: string, sinceIso: string, divisor: number): RadarSample {
  const row = db.prepare(sql).get(sinceIso) as { n: number; avg: number | null };
  return { value: row.n === 0 || row.avg === null ? null : row.avg / divisor, samples: row.n };
}

export function writingAverage(db: Db, sinceIso: string): RadarSample {
  return average(db, "select count(*) as n, avg(score) as avg from writing_submissions where ts >= ? and score is not null", sinceIso, 5);
}

export function speakingAverage(db: Db, sinceIso: string, column: "score" | "self_confidence"): RadarSample {
  const col = column === "score" ? "score" : "self_confidence";
  return average(db, `select count(*) as n, avg(${col}) as avg from speaking_sessions where ts >= ? and ${col} is not null`, sinceIso, 5);
}

export function readAloudAverage(db: Db, sinceIso: string): RadarSample {
  return average(db, "select count(*) as n, avg(json_extract(metrics_json, '$.readAloudPct')) as avg from speaking_sessions where ts >= ? and json_extract(metrics_json, '$.readAloudPct') is not null", sinceIso, 1);
}
