import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../server/app.ts";
import { openDb, type Db } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";
import { completeLesson, insertAssessment, insertAttempt, insertCards, insertSpeaking, insertStudySession, insertWriting, upsertWeekGoal } from "../server/repo.ts";

const content = loadContent("content");
const NOW = "2026-09-09T15:00:00.000Z";

const json = (app: Hono, method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

/** Semeia uma linha em cada tabela de dados. */
function seed(db: Db) {
  completeLesson(db, "M01-01", 0.9, NOW);
  insertAttempt(db, { lessonId: "M01-01", exerciseId: "M01-01-q1", block: "quiz", type: "fill_blank", correct: true, answer: "have worked", tags: ["gram.present-perfect"] }, NOW);
  insertWriting(db, { lessonId: "M01-01", text: "Yesterday I worked on the migration.", feedback: { score: 4 }, score: 4 }, NOW);
  insertSpeaking(db, { lessonId: "M01-01", mode: "A", transcript: "I have worked on this since Monday.", metrics: { score: 5 }, score: 5, selfConfidence: 4 }, NOW);
  insertCards(db, "M01-01", [{ front: "blocker", back: "bloqueio", tag: "vocab.standup" }], NOW);
  db.prepare("insert into srs_reviews (card_id, grade, ts) values (1, 4, ?)").run(NOW);
  insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 1, pct: 0.5 } }, NOW);
  upsertWeekGoal(db, "2026-09-07", { lessonsTarget: 3, reviewsTarget: 5, minutesTarget: 150 });
  insertStudySession(db, NOW, "M01-01");
  db.prepare("insert into settings (key, value) values ('ttsVoice', 'en-US')").run();
}

let db: Db;
let app: Hono;
beforeEach(() => {
  db = openDb(":memory:");
  app = createApp({ db, content, now: () => NOW });
});

describe("export/import", () => {
  it("exporta todas as tabelas de dados", async () => {
    seed(db);
    const res = await app.request("/api/export");
    expect(res.status).toBe(200);
    const file = await res.json();
    expect(file.version).toBe(1);
    for (const t of ["attempts", "lesson_progress", "writing_submissions", "speaking_sessions", "srs_cards", "srs_reviews", "assessments", "weekly_goals", "study_sessions", "settings"]) {
      expect(file.tables[t], `tabela ${t}`).toHaveLength(1);
    }
  });

  it("importa sem perda: export → import em banco novo → export igual", async () => {
    seed(db);
    const file = await (await app.request("/api/export")).json();

    const db2 = openDb(":memory:");
    const app2 = createApp({ db: db2, content, now: () => NOW });
    const res = await json(app2, "POST", "/api/import", file);
    expect(res.status).toBe(200);
    const { imported } = await res.json();
    expect(imported.attempts).toBe(1);

    const file2 = await (await app2.request("/api/export")).json();
    const strip = (f: { tables: Record<string, unknown[]> }) => f.tables;
    expect(strip(file2)).toEqual(strip(file));
  });

  it("rejeita corpo inválido e versão desconhecida", async () => {
    expect((await json(app, "POST", "/api/import", { hello: 1 })).status).toBe(400);
    expect((await json(app, "POST", "/api/import", { version: 2, exportedAt: NOW, tables: {} })).status).toBe(400);
    const res = await json(app, "POST", "/api/import", { version: 1, exportedAt: NOW, tables: { attempts: [{ id: 1, coluna_falsa: "x" }] } });
    expect(res.status).toBe(400);
  });

  it("import substitui os dados existentes (restore, não merge)", async () => {
    seed(db);
    const file = await (await app.request("/api/export")).json();
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: false, answer: "x", tags: ["gram.since-for"] }, NOW);
    const res = await json(app, "POST", "/api/import", file);
    expect(res.status).toBe(200);
    const again = await (await app.request("/api/export")).json();
    expect(again.tables.attempts).toHaveLength(1);
  });
});
