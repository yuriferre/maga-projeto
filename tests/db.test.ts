import { describe, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { openDb, migrate, MIGRATIONS } from "../server/db.ts";

describe("openDb", () => {
  it("creates every table and records the schema version", () => {
    const db = openDb(":memory:");
    const tables = (db.prepare("select name from sqlite_master where type='table' order by name").all() as { name: string }[]).map((r) => r.name);
    for (const t of ["attempts", "lesson_progress", "writing_submissions", "speaking_sessions", "srs_cards", "srs_reviews", "assessments", "weekly_goals", "study_sessions", "settings", "schema_version"]) {
      expect(tables).toContain(t);
    }
    const v = db.prepare("select version from schema_version").get() as { version: number };
    expect(v.version).toBe(MIGRATIONS.length - 1);
  });
  it("migrate is idempotent", () => {
    const db = openDb(":memory:");
    expect(migrate(db)).toBe(MIGRATIONS.length - 1);
    expect(migrate(db)).toBe(MIGRATIONS.length - 1);
  });
});

describe("migration 1", () => {
  it("rebuilds attempts keeping rows and accepting block placement", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(MIGRATIONS[0]!);
    db.exec("create table schema_version (version integer not null); insert into schema_version (version) values (0)");
    db.prepare("insert into attempts (lesson_id, exercise_id, block, type, correct, answer, tags_json, ts) values ('M01-02','M01-02-q1','quiz','fill_blank',1,'x','[\"gram.since-for\"]','2026-09-01T10:00:00.000Z')").run();
    expect(migrate(db)).toBe(MIGRATIONS.length - 1);
    const rows = db.prepare("select * from attempts").all() as Array<{ exercise_id: string; answer: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ exercise_id: "M01-02-q1", answer: "x" });
    const insert = (block: string) => db.prepare("insert into attempts (lesson_id, exercise_id, block, type, correct, tags_json, ts) values ('placement','PL-r01',?,'multiple_choice',0,'[]','2026-09-02T10:00:00.000Z')").run(block);
    expect(() => insert("placement")).not.toThrow();
    expect(() => insert("bogus")).toThrow();
    const indexes = (db.prepare("select name from sqlite_master where type='index' and tbl_name='attempts'").all() as { name: string }[]).map((r) => r.name);
    expect(indexes).toEqual(expect.arrayContaining(["idx_attempts_lesson_block", "idx_attempts_ts"]));
  });
});

describe("migration 2", () => {
  it("rebuilds attempts keeping rows and accepting block assessment", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(MIGRATIONS[0]!);
    db.exec(MIGRATIONS[1]!);
    db.exec("create table schema_version (version integer not null); insert into schema_version (version) values (1)");
    db.prepare("insert into attempts (lesson_id, exercise_id, block, type, correct, answer, tags_json, ts) values ('placement','PL-r01','placement','multiple_choice',1,'x','[]','2026-09-01T10:00:00.000Z')").run();
    expect(migrate(db)).toBe(MIGRATIONS.length - 1);
    expect((db.prepare("select count(*) as n from attempts").get() as { n: number }).n).toBe(1);
    const insert = (block: string) => db.prepare("insert into attempts (lesson_id, exercise_id, block, type, correct, tags_json, ts) values ('M01','M01-A01',?,'multiple_choice',1,'[]','2026-09-02T10:00:00.000Z')").run(block);
    expect(() => insert("assessment")).not.toThrow();
    expect(() => insert("bogus")).toThrow();
    const indexes = (db.prepare("select name from sqlite_master where type='index' and tbl_name='attempts'").all() as { name: string }[]).map((r) => r.name);
    expect(indexes).toEqual(expect.arrayContaining(["idx_attempts_lesson_block", "idx_attempts_ts"]));
  });
});
