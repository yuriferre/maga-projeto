import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../server/app.ts";
import { openDb, type Db } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";
import { insertAssessment, insertAttempt, completeLesson } from "../server/repo.ts";
import { weekStart } from "../server/time.ts";

const content = loadContent("content");
let app: Hono;
let db: Db;
// Relógio controlável: quarta-feira 2026-09-09 15:00 no fuso local da máquina.
let current = new Date(2026, 8, 9, 15, 0, 0).toISOString();
const now = () => current;
const at = (dayOffset: number, hour: number) => new Date(2026, 8, 9 + dayOffset, hour, 0, 0).toISOString();

beforeEach(() => {
  current = at(0, 15);
  db = openDb(":memory:");
  app = createApp({ db, content, now });
});
const json = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const dashboard = async (days?: number) => (await app.request(`/api/dashboard${days ? `?days=${days}` : ""}`)).json();

describe("GET /api/dashboard", () => {
  it("is empty but well-formed with no data", async () => {
    const d = await dashboard();
    expect(d.since).toBe(new Date(Date.parse(current) - 30 * 864e5).toISOString());
    for (const key of ["REA", "VOC", "LIS", "WRI", "SPK", "PRO", "CNF"]) expect(d.radar[key]).toEqual({ value: null, samples: 0 });
    expect(d.tags).toEqual({ stats: [], weak: [] });
    expect(d.streak).toEqual({ current: 0, best: 0, activeToday: false });
    expect(d.week).toEqual({ weekStart: weekStart(current), goal: null, progress: { lessons: 0, reviews: 0, minutes: 0 } });
    expect(d.placement).toEqual({ latest: null });
    expect(d.timeline).toEqual([]);
  });

  it("radar mixes lesson and placement data; tags carry labels; streak and week reflect activity", async () => {
    current = at(-1, 10);
    await json("POST", "/api/attempts", { lessonId: "M01-02", exerciseId: "M01-02-l1", block: "listening", type: "multiple_choice", correct: true, tags: ["comp.listening"] });
    await json("POST", "/api/attempts", { lessonId: "placement", exerciseId: "PL-l01", block: "placement", type: "multiple_choice", correct: false, tags: ["comp.listening"] });
    await json("POST", "/api/attempts", { lessonId: "placement", exerciseId: "PL-r01", block: "placement", type: "multiple_choice", correct: true, tags: ["comp.reading", "vocab.security"] });
    current = at(0, 9);
    await json("POST", "/api/placement/writing", { text: content.placement.writing.model, selfScore: 4 });
    await json("POST", "/api/placement/speaking", { readAloud: [{ target: "the deploy failed", transcript: "the deploy failed" }], transcript: "I worked on the module. No blockers.", durationSec: 10, selfConfidence: 3 });
    completeLesson(db, "M01-02", 0.9, current);
    current = at(0, 15);

    const d = await dashboard();
    expect(d.radar.LIS).toEqual({ value: 0.5, samples: 2 });
    expect(d.radar.REA).toEqual({ value: 1, samples: 1 });
    expect(d.radar.VOC).toEqual({ value: 1, samples: 1 });
    expect(d.radar.WRI).toEqual({ value: 0.8, samples: 1 });
    expect(d.radar.PRO).toEqual({ value: 1, samples: 1 });
    expect(d.radar.CNF).toEqual({ value: 0.6, samples: 1 });
    expect(d.radar.SPK.samples).toBe(1);
    const lis = d.tags.stats.find((s: { tag: string }) => s.tag === "comp.listening");
    expect(lis).toMatchObject({ attempts: 2, errors: 1, label: "Compreensão auditiva", group: "comp" });
    expect(d.streak).toEqual({ current: 2, best: 2, activeToday: true });
    expect(d.week.progress.lessons).toBe(1);
  });

  it("streak stays alive through yesterday and the window filter applies", async () => {
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: true, tags: ["gram.since-for"] }, at(-1, 12));
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: false, tags: ["gram.since-for"] }, at(-40, 12));
    const d = await dashboard(7);
    expect(d.streak).toEqual({ current: 1, best: 1, activeToday: false });
    expect(d.tags.stats.find((s: { tag: string }) => s.tag === "gram.since-for")).toMatchObject({ attempts: 1, errors: 0 });
  });

  it("timeline lists assessments newest first with level and pct", async () => {
    insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 1, pct: 0.4 } }, at(-3, 10));
    const later = insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 2, pct: 0.7 } }, at(-1, 10));
    const d = await dashboard();
    expect(d.timeline.map((t: { id: number }) => t.id)[0]).toBe(later);
    expect(d.timeline[0]).toMatchObject({ kind: "placement", ref: "placement", summary: { level: 2, pct: 0.7 } });
    expect(d.placement.latest.id).toBe(later);
  });
});

describe("POST /api/study/heartbeat", () => {
  it("creates, extends and reopens sessions; the week sums whole minutes", async () => {
    current = at(0, 10);
    const first = await (await json("POST", "/api/study/heartbeat", {})).json();
    expect(first.resumed).toBe(false);
    current = new Date(Date.parse(at(0, 10)) + 60_000).toISOString();
    const second = await (await json("POST", "/api/study/heartbeat", { lessonId: "M01-02" })).json();
    expect(second).toEqual({ sessionId: first.sessionId, resumed: true });
    current = new Date(Date.parse(at(0, 10)) + 60_000 + 121_000).toISOString();
    const third = await (await json("POST", "/api/study/heartbeat")).json();
    expect(third.resumed).toBe(false);
    expect(third.sessionId).not.toBe(first.sessionId);
    current = at(0, 15);
    expect((await dashboard()).week.progress.minutes).toBe(1);
    expect(db.prepare("select lesson_id from study_sessions where id = ?").get(first.sessionId)).toEqual({ lesson_id: "M01-02" });
  });
  it("rejects a malformed body", async () => {
    expect((await json("POST", "/api/study/heartbeat", { lessonId: 5 })).status).toBe(400);
  });
});

describe("PUT /api/goals/week", () => {
  it("upserts the current week's goal and validates", async () => {
    const res = await json("PUT", "/api/goals/week", { lessonsTarget: 3, reviewsTarget: 5, minutesTarget: 150 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ weekStart: weekStart(current), goal: { lessonsTarget: 3, reviewsTarget: 5, minutesTarget: 150 } });
    await json("PUT", "/api/goals/week", { lessonsTarget: 4, reviewsTarget: 5, minutesTarget: 150 });
    expect((await dashboard()).week.goal).toEqual({ lessonsTarget: 4, reviewsTarget: 5, minutesTarget: 150 });
    expect((await json("PUT", "/api/goals/week", { lessonsTarget: -1, reviewsTarget: 5, minutesTarget: 150 })).status).toBe(400);
    expect((await json("PUT", "/api/goals/week", { lessonsTarget: 3 })).status).toBe(400);
  });
  it("week progress counts only the part of a session that falls inside the week", async () => {
    const [y, m, d] = weekStart(current).split("-").map(Number) as [number, number, number];
    const mondayMidnight = new Date(y, m - 1, d, 0, 0, 0);
    const start = new Date(mondayMidnight.getTime() - 30 * 60000).toISOString(); // domingo 23:30
    const end = new Date(mondayMidnight.getTime() + 30 * 60000).toISOString(); // segunda 00:30
    db.prepare("insert into study_sessions (started_at, ended_at, lesson_id) values (?,?,null)").run(start, end);
    expect((await dashboard()).week.progress.minutes).toBe(30);
  });
});
