import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../server/app.ts";
import { openDb, type Db } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";
import { placementExercises } from "../shared/schema.ts";
import { insertAssessment } from "../server/repo.ts";
import { checkpointDue } from "../server/checkpoint.ts";

const content = loadContent("content");
const items = placementExercises(content.placement);
const NOW = new Date("2026-09-09T15:00:00.000Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 864e5).toISOString();

let db: Db;
let app: Hono;
beforeEach(() => {
  db = openDb(":memory:");
  app = createApp({ db, content, now: () => NOW.toISOString() });
});
const json = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

describe("checkpointDue", () => {
  it("não vence sem teste inicial", () => {
    expect(checkpointDue(db, NOW).due).toBe(false);
  });
  it("vence 28 dias depois do teste inicial, não antes", () => {
    insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 1 } }, daysAgo(27));
    expect(checkpointDue(db, NOW).due).toBe(false);
    db = openDb(":memory:");
    insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 1 } }, daysAgo(28));
    expect(checkpointDue(db, NOW).due).toBe(true);
  });
  it("recomeça a contagem depois de um checkpoint", () => {
    insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 1 } }, daysAgo(40));
    insertAssessment(db, { kind: "checkpoint", ref: "checkpoint", score: { level: 2 } }, daysAgo(10));
    expect(checkpointDue(db, NOW).due).toBe(false);
  });
});

describe("/api/checkpoint/*", () => {
  it("state expõe due, latest e a rodada atual", async () => {
    const s = await (await app.request("/api/checkpoint/state")).json();
    expect(s.due).toBe(false);
    expect(s.latest).toBeNull();
    expect(s.run).toEqual({ answered: [], writing: null, speaking: null });
  });

  it("attempts aceitam lessonId checkpoint com block placement e ids do teste inicial", async () => {
    const q = items[0]!.exercise;
    const ok = await json("POST", "/api/attempts", { lessonId: "checkpoint", exerciseId: q.id, block: "placement", type: q.type, correct: true, answer: "x", tags: q.tags });
    expect(ok.status).toBe(200);
    const bad = await json("POST", "/api/attempts", { lessonId: "checkpoint", exerciseId: "M01-01-q1", block: "placement", type: "fill_blank", correct: true, answer: "x", tags: [] });
    expect(bad.status).toBe(400);
    const wrongBlock = await json("POST", "/api/attempts", { lessonId: "checkpoint", exerciseId: q.id, block: "quiz", type: q.type, correct: true, answer: "x", tags: [] });
    expect(wrongBlock.status).toBe(400);
  });

  it("finish sem itens retorna 409; fluxo completo grava kind checkpoint e alimenta a timeline", async () => {
    const early = await json("POST", "/api/checkpoint/finish");
    expect(early.status).toBe(409);

    for (const { exercise: q } of items) {
      const answer = q.type === "multiple_choice" ? String(q.answer) : "accepted" in q ? q.accepted[0] : "matched";
      const r = await json("POST", "/api/attempts", { lessonId: "checkpoint", exerciseId: q.id, block: "placement", type: q.type, correct: true, answer, tags: q.tags });
      expect(r.status).toBe(200);
    }
    const w = await json("POST", "/api/checkpoint/writing", { text: content.placement.writing.model, selfScore: 4 });
    expect(w.status).toBe(200);
    const sp = await json("POST", "/api/checkpoint/speaking", { readAloud: [], transcript: "I have been working on the migration since Monday and today I am finishing the last part.", durationSec: 30 });
    expect(sp.status).toBe(200);

    const fin = await json("POST", "/api/checkpoint/finish");
    expect(fin.status).toBe(200);
    const { assessment } = await fin.json();
    expect(assessment.result.itemCount).toBe(items.length);
    expect(assessment.result.pct).toBe(1);

    const rows = db.prepare("select kind, ref from assessments where kind = 'checkpoint'").all() as Array<{ kind: string; ref: string }>;
    expect(rows).toEqual([{ kind: "checkpoint", ref: "checkpoint" }]);

    const d = await (await app.request("/api/dashboard")).json();
    expect(d.timeline.some((t: { kind: string }) => t.kind === "checkpoint")).toBe(true);
    const s2 = await (await app.request("/api/checkpoint/state")).json();
    expect(s2.latest.result.level).toBeGreaterThanOrEqual(1);
    expect(s2.due).toBe(false);
  });
});
