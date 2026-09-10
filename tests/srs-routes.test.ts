import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../server/app.ts";
import { openDb, type Db } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";
import { localDayStart, addDays, localDate } from "../shared/local-date.ts";

const content = loadContent("content");
const lesson = content.lessons["M01-02"]!;
let app: Hono;
let db: Db;
let current = new Date(2026, 8, 10, 15, 0, 0).toISOString();
const now = () => current;
const at = (dayOffset: number, hour: number) => new Date(2026, 8, 10 + dayOffset, hour, 0, 0).toISOString();

beforeEach(() => {
  current = at(0, 15);
  db = openDb(":memory:");
  app = createApp({ db, content, now });
});
const json = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const queue = async (limit?: number) => (await app.request(`/api/srs/queue${limit === undefined ? "" : `?limit=${limit}`}`)).json();

/** Conclui a M01-02 pelas rotas de aula: quiz, escrita com nota, fala, complete. */
async function completeLesson() {
  await json("POST", `/api/lessons/${lesson.id}/start`);
  for (const q of lesson.quiz) await json("POST", "/api/attempts", { lessonId: lesson.id, exerciseId: q.id, block: "quiz", type: q.type, correct: true, answer: "x", tags: q.tags });
  await json("POST", `/api/lessons/${lesson.id}/writing`, { text: lesson.writing.model, selfScore: 4 });
  await json("POST", `/api/lessons/${lesson.id}/speaking`, { mode: "A", transcript: "I've been working on the pipeline. No blockers.", durationSec: 20 });
  const done = await (await json("POST", `/api/lessons/${lesson.id}/complete`)).json();
  expect(done.cardsInserted).toBe(lesson.srsCards.length);
}

describe("GET /api/srs/queue", () => {
  it("is empty without cards", async () => {
    expect(await queue()).toEqual({ cards: [], counts: { new: 0, learning: 0, mature: 0, dueNow: 0, total: 0, nextDue: null } });
  });
  it("lists the lesson's cards as due right after completion, honouring the limit", async () => {
    await completeLesson();
    const q = await queue();
    expect(q.cards).toHaveLength(lesson.srsCards.length);
    expect(q.counts).toMatchObject({ new: lesson.srsCards.length, dueNow: lesson.srsCards.length, nextDue: null });
    expect((await queue(5)).cards).toHaveLength(5);
    expect((await (await app.request("/api/srs/queue?limit=abc")).json()).cards).toHaveLength(lesson.srsCards.length);
  });
});

describe("POST /api/srs/review", () => {
  it("grade 4 schedules the card for tomorrow's local midnight and removes it from today's queue", async () => {
    await completeLesson();
    const first = (await queue()).cards[0];
    const res = await json("POST", "/api/srs/review", { cardId: first.id, grade: 4 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.card).toMatchObject({ id: first.id, reps: 1, interval_days: 1, ease: 2.5, due: localDayStart(addDays(localDate(current), 1)) });
    expect(body.maturity).toBe("learning");
    expect(body.counts).toMatchObject({ new: lesson.srsCards.length - 1, learning: 1, dueNow: lesson.srsCards.length - 1 });
    expect((await queue()).cards.map((c: { id: number }) => c.id)).not.toContain(first.id);
    current = at(1, 9);
    expect((await queue()).cards.map((c: { id: number }) => c.id)).toContain(first.id);
    expect((await (await app.request("/api/dashboard")).json()).week.progress.reviews).toBe(1);
  });
  it("grade 1 keeps the card due now with a lapse", async () => {
    await completeLesson();
    const first = (await queue()).cards[0];
    const body = await (await json("POST", "/api/srs/review", { cardId: first.id, grade: 1 })).json();
    expect(body.card).toMatchObject({ reps: 0, interval_days: 0, lapses: 1, due: current });
    expect(body.maturity).toBe("new");
    expect(body.counts.dueNow).toBe(lesson.srsCards.length);
    expect((await queue()).cards.map((c: { id: number }) => c.id)).toContain(first.id);
  });
  it("404 for an unknown card, 400 for an invalid body", async () => {
    expect((await json("POST", "/api/srs/review", { cardId: 999, grade: 4 })).status).toBe(404);
    expect((await json("POST", "/api/srs/review", { cardId: 1, grade: 7 })).status).toBe(400);
    expect((await json("POST", "/api/srs/review", { grade: 4 })).status).toBe(400);
  });
});

describe("POST /api/srs/cards", () => {
  it("adds a glossary card once and it shows up in the queue", async () => {
    const body = { front: "aviso rápido", back: "heads up", hint: "just a heads up", tag: "vocab.slack" };
    const first = await (await json("POST", "/api/srs/cards", body)).json();
    const second = await (await json("POST", "/api/srs/cards", body)).json();
    expect(first.inserted).toBe(true);
    expect(second).toEqual({ inserted: false, id: first.id });
    const q = await queue();
    expect(q.cards).toHaveLength(1);
    expect(q.cards[0]).toMatchObject({ lesson_id: "glossary", front: "aviso rápido", back: "heads up" });
    expect((await json("POST", "/api/srs/cards", { front: " ", back: "x", tag: "vocab.slack" })).status).toBe(400);
  });
});
