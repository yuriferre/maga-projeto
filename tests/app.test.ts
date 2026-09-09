import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../server/app.ts";
import { openDb } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";

const content = loadContent("content");
const lesson = content.lessons["M01-02"]!;
let app: Hono;
let clock = 0;
const now = () => new Date(Date.UTC(2026, 8, 8, 10, 0, clock++)).toISOString();

beforeEach(() => {
  clock = 0;
  app = createApp({ db: openDb(":memory:"), content, now });
});

const json = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

describe("health", () => {
  it("GET /api/health", async () => {
    const res = await app.request("/api/health");
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("lesson flow", () => {
  it("404 for unknown lesson", async () => {
    expect((await json("POST", "/api/lessons/M99-99/start")).status).toBe(404);
    expect((await app.request("/api/lessons/M99-99/status")).status).toBe(404);
  });

  it("400 for invalid attempt body", async () => {
    const res = await json("POST", "/api/attempts", { lessonId: "M01-02" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("corpo inválido");
  });

  it("400 for invalid speaking body", async () => {
    const res = await json("POST", `/api/lessons/${lesson.id}/speaking`, { mode: "A", transcript: "", durationSec: 0 });
    expect(res.status).toBe(400);
  });

  it("start → attempts → status → writing → speaking → complete inserts cards", async () => {
    expect((await json("POST", `/api/lessons/${lesson.id}/start`)).status).toBe(200);

    for (const q of lesson.quiz.slice(0, 7)) {
      const res = await json("POST", "/api/attempts", { lessonId: lesson.id, exerciseId: q.id, block: "quiz", type: q.type, correct: true, answer: "x", tags: q.tags });
      expect(res.status).toBe(200);
    }
    let status = await (await app.request(`/api/lessons/${lesson.id}/status`)).json();
    expect(status.progress.status).toBe("in_progress");
    expect(status.completion.quizPct).toBeCloseTo(7 / 8);
    expect(status.completion.met).toBe(false);

    const w = await json("POST", `/api/lessons/${lesson.id}/writing`, { text: lesson.writing.model, selfScore: 4 });
    expect(w.status).toBe(200);
    const wBody = await w.json();
    expect(wBody.feedback.mode).toBe("rules");
    expect(wBody.feedback.score).toBe(4);
    expect((await (await app.request(`/api/lessons/${lesson.id}/writing/latest`)).json()).submission.text).toBe(lesson.writing.model);

    const s = await json("POST", `/api/lessons/${lesson.id}/speaking`, { mode: "A", transcript: "I've been working on the pipeline. I'm blocked on access. No blockers otherwise. Heads up it might slip.", durationSec: 20, selfConfidence: 3 });
    expect(s.status).toBe(200);
    expect((await s.json()).metrics.used.length).toBeGreaterThan(0);

    const done = await json("POST", `/api/lessons/${lesson.id}/complete`);
    const body = await done.json();
    expect(body.completion.met).toBe(true);
    expect(body.progress.status).toBe("completed");
    expect(body.cardsInserted).toBe(lesson.srsCards.length);

    status = await (await app.request(`/api/lessons/${lesson.id}/status`)).json();
    expect(status.completion.cardsAdded).toBe(true);
  });

  it("complete refuses when criteria are not met", async () => {
    const res = await json("POST", `/api/lessons/${lesson.id}/complete`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.completion.met).toBe(false);
    expect(body.cardsInserted).toBe(0);
    expect(body.progress).toBeNull();
  });

  it("warmup is empty with no completed lessons", async () => {
    expect(await (await app.request(`/api/lessons/${lesson.id}/warmup`)).json()).toEqual({ items: [] });
  });

  it("overview and tag stats reflect attempts", async () => {
    await json("POST", "/api/attempts", { lessonId: lesson.id, exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: false, tags: ["gram.since-for"] });
    await json("POST", `/api/lessons/${lesson.id}/start`);
    const overview = await (await app.request("/api/progress/overview")).json();
    expect(overview.lessons).toHaveLength(1);
    const stats = await (await app.request("/api/tags/stats?days=7")).json();
    expect(stats.stats.find((s: { tag: string }) => s.tag === "gram.since-for").errors).toBe(1);
  });

  it("tag stats ignores a non-numeric days param and defaults to 30", async () => {
    const res = await app.request("/api/tags/stats?days=abc");
    expect(res.status).toBe(200);
    const body = await res.json();
    const expected = new Date(Date.UTC(2026, 8, 8, 10, 0, 0) - 30 * 864e5).toISOString();
    expect(body.since).toBe(expected);
  });
});
