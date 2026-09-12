import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../server/app.ts";
import { openDb, type Db } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";
import { levelEligibility } from "../server/assessment.ts";

const content = loadContent("content");
const l1 = content.levelAssessments["L1"]!;
const l2 = content.levelAssessments["L2"]!;
const level1Modules = content.levels.find((l) => l.id === 1)!.modules.map((m) => m.id);
const level2Modules = content.levels.find((l) => l.id === 2)!.modules.map((m) => m.id);
let app: Hono;
let db: Db;
let clock = 0;
const now = () => new Date(Date.UTC(2026, 8, 12, 10, 0, clock++)).toISOString();

beforeEach(() => {
  clock = 0;
  db = openDb(":memory:");
  app = createApp({ db, content, now });
});
const json = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const state = async () => (await app.request("/api/levels/1/assessment/state")).json();

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

/** Aprova a avaliação de um módulo pelas rotas. */
async function passModule(moduleId: string) {
  const a = content.moduleAssessments[moduleId]!;
  const lessonIds = Object.keys(content.lessons).filter((id) => id.startsWith(`${moduleId}-`)).sort();
  for (const id of lessonIds) await completeLesson(id);
  for (const q of a.items) await json("POST", "/api/attempts", { lessonId: moduleId, exerciseId: q.id, block: "assessment", type: q.type, correct: true, answer: "x", tags: q.tags });
  await json("POST", `/api/modules/${moduleId}/assessment/writing`, { text: a.writing.model, selfScore: 4 });
  await json("POST", `/api/modules/${moduleId}/assessment/speaking`, { mode: "A", transcript: a.speaking.targetPhrases.join(". ") + ". Done.", durationSec: Math.min(45, a.speaking.maxSeconds - 5) });
  const res = await json("POST", `/api/modules/${moduleId}/assessment/finish`);
  expect(res.status, moduleId).toBe(200);
}

async function answerAll(assessment: typeof l1) {
  for (const q of assessment.items) {
    const res = await json("POST", "/api/attempts", { lessonId: assessment.id, exerciseId: q.id, block: "assessment", type: q.type, correct: true, answer: "x", tags: q.tags });
    expect(res.status, q.id).toBe(200);
  }
}

describe("avaliação de nível 1", () => {
  it("existe no bundle e cobre o nível 1", () => {
    expect(l1).toBeDefined();
    expect(l1.items).toHaveLength(30);
  });

  it("levelEligibility exige os módulos aprovados", () => {
    const none = levelEligibility(content, [], 1);
    expect(none.modulesTotal).toBe(6);
    expect(none.modulesDone).toBe(0);
    expect(none.missing).toEqual(level1Modules);
  });

  it("state lista os módulos que faltam e bloqueia o finish", async () => {
    const s = await state();
    expect(s.eligible.modulesDone).toBe(0);
    expect(s.eligible.missing).toEqual(level1Modules);
    const res = await json("POST", "/api/levels/1/assessment/finish");
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.missing).toEqual(level1Modules);
  });

  it("fluxo completo: módulos aprovados → itens → escrita → fala → aprovado → 409", async () => {
    for (const m of level1Modules) await passModule(m);
    const s = await state();
    expect(s.eligible.missing).toEqual([]);

    const early = await json("POST", "/api/levels/1/assessment/finish");
    expect(early.status).toBe(409);

    await answerAll(l1);
    const w = await json("POST", "/api/levels/1/assessment/writing", { text: l1.writing.model, selfScore: 4 });
    expect(w.status).toBe(200);
    const sp = await json("POST", "/api/levels/1/assessment/speaking", { mode: "A", transcript: l1.speaking.targetPhrases.join(". ") + ". Done.", durationSec: 80 });
    expect(sp.status).toBe(200);

    const fin = await (await json("POST", "/api/levels/1/assessment/finish")).json();
    expect(fin.assessment.result.kind).toBe("level");
    expect(fin.assessment.result.passed).toBe(true);
    expect(fin.assessment.result.itemsPct).toBe(1);

    const again = await json("POST", "/api/levels/1/assessment/finish");
    expect(again.status).toBe(409);
  }, 30000);

  it("nível sem avaliação devolve 404", async () => {
    const res = await app.request("/api/levels/9/assessment/state");
    expect(res.status).toBe(404);
  });
});

describe("avaliação de nível 2", () => {
  it("existe no bundle e cobre os oito módulos", () => {
    expect(l2).toBeDefined();
    expect(l2.items).toHaveLength(30);
    expect(level2Modules).toHaveLength(8);
  });

  it("levelEligibility exige os módulos aprovados", () => {
    const none = levelEligibility(content, [], 2);
    expect(none.modulesTotal).toBe(8);
    expect(none.modulesDone).toBe(0);
    expect(none.missing).toEqual(level2Modules);
  });

  it("fluxo completo: módulos aprovados → itens → escrita → fala → aprovado → 409", async () => {
    for (const m of level2Modules) await passModule(m);
    const s = await (await app.request("/api/levels/2/assessment/state")).json();
    expect(s.eligible.missing).toEqual([]);

    const early = await json("POST", "/api/levels/2/assessment/finish");
    expect(early.status).toBe(409);

    await answerAll(l2);
    const w = await json("POST", "/api/levels/2/assessment/writing", { text: l2.writing.model, selfScore: 4 });
    expect(w.status).toBe(200);
    const sp = await json("POST", "/api/levels/2/assessment/speaking", { mode: "A", transcript: l2.speaking.targetPhrases.join(". ") + ". Done.", durationSec: 80 });
    expect(sp.status).toBe(200);

    const fin = await (await json("POST", "/api/levels/2/assessment/finish")).json();
    expect(fin.assessment.result.kind).toBe("level");
    expect(fin.assessment.result.passed).toBe(true);
    expect(fin.assessment.result.itemsPct).toBe(1);

    const again = await json("POST", "/api/levels/2/assessment/finish");
    expect(again.status).toBe(409);
  }, 60000);
});
