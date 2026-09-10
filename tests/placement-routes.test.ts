import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp, DEFAULT_GOAL } from "../server/app.ts";
import { openDb, type Db } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";
import { placementExercises } from "../shared/schema.ts";
import { listAssessments } from "../server/repo.ts";
import { weekStart } from "../server/time.ts";

const content = loadContent("content");
const p = content.placement;
const all = placementExercises(p);
let app: Hono;
let db: Db;
let clock = 0;
const now = () => new Date(Date.UTC(2026, 8, 9, 10, 0, clock++)).toISOString();

beforeEach(() => {
  clock = 0;
  db = openDb(":memory:");
  app = createApp({ db, content, now });
});

const json = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const get = async (path: string) => (await app.request(path)).json();

async function answer(isCorrect: (id: string) => boolean, only?: (id: string) => boolean) {
  for (const { exercise } of all) {
    if (only && !only(exercise.id)) continue;
    const res = await json("POST", "/api/attempts", { lessonId: "placement", exerciseId: exercise.id, block: "placement", type: exercise.type, correct: isCorrect(exercise.id), answer: "x", tags: exercise.tags });
    expect(res.status).toBe(200);
  }
}

describe("GET /api/placement/state", () => {
  it("is empty at first", async () => {
    expect(await get("/api/placement/state")).toEqual({ latest: null, run: { answered: [], writing: null, speaking: null } });
  });
  it("lists answered ids of the current run", async () => {
    await answer(() => true, (id) => id === "PL-r01" || id === "PL-v02");
    const state = await get("/api/placement/state");
    expect(state.run.answered.sort()).toEqual(["PL-r01", "PL-v02"]);
  });
});

describe("POST /api/placement/finish", () => {
  it("refuses an incomplete run with 409 and the missing list", async () => {
    await answer(() => true, (id) => id !== "PL-g10");
    const res = await json("POST", "/api/placement/finish");
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "teste incompleto", missing: { exercises: ["PL-g10"], writing: true } });
  });
  it("needs a self score on the writing", async () => {
    await answer(() => true);
    expect((await json("POST", "/api/placement/writing", { text: p.writing.model })).status).toBe(200);
    const res = await json("POST", "/api/placement/finish");
    expect(res.status).toBe(409);
    expect((await res.json()).missing).toEqual({ exercises: [], writing: true });
  });
  it("full run: attempts → writing → speaking → finish stores the assessment and the week goal", async () => {
    await answer((id) => !id.startsWith("PL-l"));
    const w = await json("POST", "/api/placement/writing", { text: p.writing.model, selfScore: 4 });
    expect(w.status).toBe(200);
    expect((await w.json()).feedback.score).toBe(4);
    const s = await json("POST", "/api/placement/speaking", {
      readAloud: [{ target: p.speaking.readAloud[0], transcript: p.speaking.readAloud[0] }, { target: p.speaking.readAloud[1], transcript: "" }],
      transcript: "Yesterday I worked on the VPC module and I finished the peering config. No blockers.", durationSec: 20, selfConfidence: 3,
    });
    expect(s.status).toBe(200);
    const sBody = await s.json();
    expect(sBody.metrics.readAloudPct).toBeCloseTo(0.5);
    expect(sBody.metrics.used).toEqual(expect.arrayContaining(["I worked on", "I finished", "no blockers"]));

    const fin = await json("POST", "/api/placement/finish");
    expect(fin.status).toBe(200);
    const { assessment } = await fin.json();
    expect(assessment.result.level).toBe(3);
    expect(assessment.result.blocks.listening.pct).toBe(0);
    expect(assessment.result.radar.PRO).toBeCloseTo(0.5);
    expect(assessment.result.radar.CNF).toBeCloseTo(0.6);

    const state = await get("/api/placement/state");
    expect(state.latest.id).toBe(assessment.id);
    expect(state.run).toEqual({ answered: [], writing: null, speaking: null });

    const goal = db.prepare("select * from weekly_goals").all();
    expect(goal).toEqual([{ week_start: weekStart(assessment.ts), lessons_target: DEFAULT_GOAL.lessonsTarget, reviews_target: DEFAULT_GOAL.reviewsTarget, minutes_target: DEFAULT_GOAL.minutesTarget }]);
  });
  it("a retake after finish creates a second assessment and becomes the latest", async () => {
    await answer(() => false);
    await json("POST", "/api/placement/writing", { text: p.writing.model, selfScore: 2 });
    const first = (await (await json("POST", "/api/placement/finish")).json()).assessment;
    expect(first.result.level).toBe(1);
    await answer(() => true);
    await json("POST", "/api/placement/writing", { text: p.writing.model, selfScore: 5 });
    const second = (await (await json("POST", "/api/placement/finish")).json()).assessment;
    expect(second.result.level).toBe(3);
    expect(listAssessments(db)).toHaveLength(2);
    expect((await get("/api/placement/state")).latest.id).toBe(second.id);
  });
});

describe("validation", () => {
  it("400 on invalid writing and speaking bodies", async () => {
    expect((await json("POST", "/api/placement/writing", { text: "" })).status).toBe(400);
    expect((await json("POST", "/api/placement/speaking", { transcript: "x", durationSec: 0 })).status).toBe(400);
    expect((await json("POST", "/api/placement/speaking", { readAloud: [{ target: "a" }], transcript: "x", durationSec: 5 })).status).toBe(400);
  });
});
