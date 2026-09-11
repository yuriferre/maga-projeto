import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../server/app.ts";
import { openDb, type Db } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";
import { listAssessments } from "../server/repo.ts";

const content = loadContent("content");
const a = content.moduleAssessments["M01"]!;
const m01Lessons = Object.keys(content.lessons).filter((id) => id.startsWith("M01-")).sort();
let app: Hono;
let db: Db;
let clock = 0;
const now = () => new Date(Date.UTC(2026, 8, 11, 10, 0, clock++)).toISOString();

beforeEach(() => {
  clock = 0;
  db = openDb(":memory:");
  app = createApp({ db, content, now });
});
const json = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const state = async () => (await app.request("/api/modules/M01/assessment/state")).json();

/** Conclui uma aula pelas rotas: quiz 100 %, escrita nota 4, uma fala. */
async function completeLesson(id: string) {
  const lesson = content.lessons[id]!;
  await json("POST", `/api/lessons/${id}/start`);
  for (const q of lesson.quiz) await json("POST", "/api/attempts", { lessonId: id, exerciseId: q.id, block: "quiz", type: q.type, correct: true, answer: "x", tags: q.tags });
  await json("POST", `/api/lessons/${id}/writing`, { text: lesson.writing.model, selfScore: 4 });
  await json("POST", `/api/lessons/${id}/speaking`, { mode: "A", transcript: lesson.speaking.modeA.targetPhrases.slice(0, 5).join(". ") + ". No blockers.", durationSec: 20 });
  const done = await (await json("POST", `/api/lessons/${id}/complete`)).json();
  expect(done.progress.status, id).toBe("completed");
}
async function answerAll(isCorrect: (id: string) => boolean) {
  for (const q of a.items) {
    const res = await json("POST", "/api/attempts", { lessonId: "M01", exerciseId: q.id, block: "assessment", type: q.type, correct: isCorrect(q.id), answer: "x", tags: q.tags });
    expect(res.status).toBe(200);
  }
}
const goodSpeech = a.speaking.targetPhrases.slice(0, 5).join(". ") + ". No blockers.";

describe("attempts for assessments", () => {
  it("accepts an assessment attempt and rejects wrong block / unknown item / unknown module", async () => {
    expect((await json("POST", "/api/attempts", { lessonId: "M01", exerciseId: "M01-A01", block: "assessment", type: "fill_blank", correct: true, tags: ["gram.since-for"] })).status).toBe(200);
    expect((await json("POST", "/api/attempts", { lessonId: "M01", exerciseId: "M01-A01", block: "quiz", type: "fill_blank", correct: true, tags: [] })).status).toBe(400);
    expect((await json("POST", "/api/attempts", { lessonId: "M01", exerciseId: "M01-Z99", block: "assessment", type: "fill_blank", correct: true, tags: [] })).status).toBe(400);
    expect((await json("POST", "/api/attempts", { lessonId: "M07", exerciseId: "M07-A01", block: "assessment", type: "fill_blank", correct: true, tags: [] })).status).toBe(404);
  });
});

describe("/api/modules/:id/assessment", () => {
  it("404 for a module without assessment.yaml", async () => {
    expect((await app.request("/api/modules/M07/assessment/state")).status).toBe(404);
  });
  it("state reports eligibility and an empty run", async () => {
    const s = await state();
    expect(s.eligible).toEqual({ lessonsTotal: m01Lessons.length, lessonsDone: 0, missing: m01Lessons });
    expect(s).toMatchObject({ latest: null, run: { answered: [], writing: null, speaking: null } });
  });
  it("finish refuses with pending lessons", async () => {
    await answerAll(() => true);
    const res = await json("POST", "/api/modules/M01/assessment/finish");
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("aulas pendentes");
  });
  it("full flow: lessons → items → writing → speaking → finish passes; overview and timeline reflect it", async () => {
    for (const id of m01Lessons) await completeLesson(id);
    expect((await state()).eligible.missing).toEqual([]);
    await answerAll(() => true);
    let res = await json("POST", "/api/modules/M01/assessment/finish");
    expect(res.status).toBe(409);
    expect((await res.json()).missing).toEqual({ exercises: [], writing: true, speaking: true });
    expect((await json("POST", "/api/modules/M01/assessment/writing", { text: a.writing.model, selfScore: 4 })).status).toBe(200);
    const sp = await (await json("POST", "/api/modules/M01/assessment/speaking", { mode: "A", transcript: goodSpeech, durationSec: 25 })).json();
    expect(sp.metrics.score).toBeGreaterThanOrEqual(3);
    res = await json("POST", "/api/modules/M01/assessment/finish");
    expect(res.status).toBe(200);
    const { assessment } = await res.json();
    expect(assessment.result).toMatchObject({ kind: "module", ref: "M01", passed: true, itemsPct: 1, writingScore: 4 });
    const s = await state();
    expect(s.latest.id).toBe(assessment.id);
    expect(s.run).toEqual({ answered: [], writing: null, speaking: null });
    const repeated = await json("POST", "/api/modules/M01/assessment/finish");
    expect(repeated.status).toBe(409);
    expect(await repeated.json()).toEqual({ error: "avaliação incompleta", missing: { exercises: a.items.map((q) => q.id), writing: true, speaking: true } });
    const overview = await (await app.request("/api/progress/overview")).json();
    expect(overview.modules.M01).toMatchObject({ passed: true, latest: { id: assessment.id } });
    expect(listAssessments(db).filter((r) => r.kind === "module")).toHaveLength(1);
  });
  it("fails on a low speaking score and a retake can pass", async () => {
    for (const id of m01Lessons) await completeLesson(id);
    await answerAll(() => true);
    await json("POST", "/api/modules/M01/assessment/writing", { text: a.writing.model, selfScore: 4 });
    await json("POST", "/api/modules/M01/assessment/speaking", { mode: "A", transcript: "I have a doubt, it's giving error and I'm waiting the review", durationSec: 70 });
    const first = (await (await json("POST", "/api/modules/M01/assessment/finish")).json()).assessment;
    expect(first.result.passed).toBe(false);
    expect(first.result.speakingScore).toBeLessThan(3);
    await answerAll(() => true);
    await json("POST", "/api/modules/M01/assessment/writing", { text: a.writing.model, selfScore: 4 });
    await json("POST", "/api/modules/M01/assessment/speaking", { mode: "A", transcript: goodSpeech, durationSec: 25 });
    const second = (await (await json("POST", "/api/modules/M01/assessment/finish")).json()).assessment;
    expect(second.result.passed).toBe(true);
    expect((await state()).latest.id).toBe(second.id);
    expect((await (await app.request("/api/progress/overview")).json()).modules.M01.passed).toBe(true);
  });
  it("400 on invalid bodies", async () => {
    expect((await json("POST", "/api/modules/M01/assessment/writing", { text: " " })).status).toBe(400);
    expect((await json("POST", "/api/modules/M01/assessment/speaking", { mode: "B", transcript: "x", durationSec: 1 })).status).toBe(400);
  });
});
