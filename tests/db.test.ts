import { describe, it, expect } from "vitest";
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
