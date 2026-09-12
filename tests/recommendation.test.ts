import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../server/app.ts";
import { openDb, type Db } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";
import { completeLesson, insertAttempt } from "../server/repo.ts";
import { nextLessonId, recommendation } from "../server/recommend.ts";

const content = loadContent("content");
let db: Db;
const now = new Date("2026-09-09T15:00:00.000Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 864e5).toISOString();

beforeEach(() => { db = openDb(":memory:"); });

/** Semeia `n` erros recentes na tag (2/dia para ficar acima do piso de weakTags). */
function failTag(tag: string, n = 4) {
  for (let i = 0; i < n; i++) {
    insertAttempt(db, { lessonId: "M01-01", exerciseId: `M01-01-x${i}`, block: "quiz", type: "fill_blank", correct: false, tags: [tag] }, daysAgo(2));
  }
}

describe("nextLessonId", () => {
  it("aponta a primeira aula com conteúdo não concluída na ordem da trilha", () => {
    expect(nextLessonId(content, db)).toBe("M01-01");
    completeLesson(db, "M01-01", 0.9, daysAgo(1));
    expect(nextLessonId(content, db)).toBe("M01-02");
  });
  it("retorna null quando todas as aulas com conteúdo estão concluídas", () => {
    for (const id of Object.keys(content.lessons)) completeLesson(db, id, 0.9, daysAgo(1));
    expect(nextLessonId(content, db)).toBeNull();
  });
});

describe("recommendation", () => {
  it("sugere a próxima aula quando não há tags fracas", () => {
    expect(recommendation(db, content, now)).toEqual({ kind: "next", lessonId: "M01-01" });
  });

  it("sugere revisar a tag quando só uma tag fraca existe", () => {
    failTag("br.doubt");
    const rec = recommendation(db, content, now);
    expect(rec).toEqual({ kind: "review-tag", tag: "br.doubt" });
  });

  it("sugere refazer exercícios quando ≥ 2 tags fracas ligadas à próxima aula", () => {
    // M01-01 (a próxima) usa br.actually e br.pretend nos exercícios.
    failTag("br.actually");
    failTag("br.pretend");
    const rec = recommendation(db, content, now);
    expect(rec.kind).toBe("review-lesson");
    if (rec.kind !== "review-lesson") return;
    expect(rec.lessonId).toBe("M01-01");
    expect(rec.tags).toEqual(expect.arrayContaining(["br.actually", "br.pretend"]));
  });

  it("prioriza review-tag quando as tags fracas não pertencem à próxima aula", () => {
    // gram.since-for e br.since-present são de M01-02, não de M01-01 (a próxima).
    failTag("gram.since-for");
    failTag("br.since-present");
    const rec = recommendation(db, content, now);
    expect(rec.kind).toBe("review-tag");
  });
});

describe("GET /api/dashboard → recommendation", () => {
  it("expõe a recomendação no painel", async () => {
    const app: Hono = createApp({ db, content, now: () => now.toISOString() });
    failTag("br.actually");
    failTag("br.pretend");
    const d = await (await app.request("/api/dashboard")).json();
    expect(d.recommendation.kind).toBe("review-lesson");
    expect(d.recommendation.lessonId).toBe("M01-01");
  });
});
