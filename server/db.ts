import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type Db = DatabaseSync;

export function nowIso(): string {
  return new Date().toISOString();
}

// Cada posição é uma migração; a versão gravada é o índice da última aplicada.
export const MIGRATIONS: string[] = [
  `
  create table attempts (
    id integer primary key autoincrement,
    lesson_id text not null,
    exercise_id text not null,
    block text not null check (block in ('warmup','quiz','listening','writing','speaking')),
    type text not null,
    correct integer not null check (correct in (0,1)),
    answer text,
    score real,
    tags_json text not null,
    ts text not null
  );
  create index idx_attempts_lesson_block on attempts(lesson_id, block);
  create index idx_attempts_ts on attempts(ts);

  create table lesson_progress (
    lesson_id text primary key,
    status text not null check (status in ('in_progress','completed')),
    score real,
    started_at text not null,
    completed_at text
  );

  create table writing_submissions (
    id integer primary key autoincrement,
    lesson_id text not null,
    text text not null,
    feedback_json text not null,
    score real,
    ts text not null
  );
  create index idx_writing_lesson on writing_submissions(lesson_id, ts);

  create table speaking_sessions (
    id integer primary key autoincrement,
    lesson_id text not null,
    mode text not null check (mode in ('A','B')),
    transcript text not null,
    metrics_json text not null,
    score real,
    self_confidence integer,
    ts text not null
  );
  create index idx_speaking_lesson on speaking_sessions(lesson_id, ts);

  create table srs_cards (
    id integer primary key autoincrement,
    lesson_id text not null,
    front text not null,
    back text not null,
    hint text,
    tag text not null,
    ease real not null default 2.5,
    interval_days integer not null default 0,
    due text not null,
    reps integer not null default 0,
    lapses integer not null default 0,
    created_at text not null,
    unique (lesson_id, front)
  );
  create index idx_cards_due on srs_cards(due);

  create table srs_reviews (
    id integer primary key autoincrement,
    card_id integer not null references srs_cards(id),
    grade integer not null check (grade between 0 and 5),
    ts text not null
  );

  create table assessments (
    id integer primary key autoincrement,
    kind text not null check (kind in ('placement','module','level','checkpoint')),
    ref text not null,
    score_json text not null,
    ts text not null
  );

  create table weekly_goals (
    week_start text primary key,
    lessons_target integer not null,
    reviews_target integer not null,
    minutes_target integer not null
  );

  create table study_sessions (
    id integer primary key autoincrement,
    started_at text not null,
    ended_at text,
    lesson_id text
  );

  create table settings (
    key text primary key,
    value text not null
  );
  `,
  // Migração 1: SQLite não altera CHECK; a tabela attempts é reconstruída para aceitar block='placement'.
  `
  create table attempts_new (
    id integer primary key autoincrement,
    lesson_id text not null,
    exercise_id text not null,
    block text not null check (block in ('warmup','quiz','listening','writing','speaking','placement')),
    type text not null,
    correct integer not null check (correct in (0,1)),
    answer text,
    score real,
    tags_json text not null,
    ts text not null
  );
  insert into attempts_new (id, lesson_id, exercise_id, block, type, correct, answer, score, tags_json, ts)
    select id, lesson_id, exercise_id, block, type, correct, answer, score, tags_json, ts from attempts;
  drop table attempts;
  alter table attempts_new rename to attempts;
  create index idx_attempts_lesson_block on attempts(lesson_id, block);
  create index idx_attempts_ts on attempts(ts);
  `,
];

export function migrate(db: Db): number {
  db.exec("create table if not exists schema_version (version integer not null)");
  const row = db.prepare("select version from schema_version limit 1").get() as { version: number } | undefined;
  if (!row) db.prepare("insert into schema_version (version) values (-1)").run();
  const current = row?.version ?? -1;
  for (let i = current + 1; i < MIGRATIONS.length; i++) {
    db.exec("begin");
    try {
      db.exec(MIGRATIONS[i]!);
      db.prepare("update schema_version set version = ?").run(i);
      db.exec("commit");
    } catch (err) {
      db.exec("rollback");
      throw err;
    }
  }
  return MIGRATIONS.length - 1;
}

export function openDb(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("pragma foreign_keys = on");
  if (path !== ":memory:") db.exec("pragma journal_mode = wal");
  migrate(db);
  return db;
}
