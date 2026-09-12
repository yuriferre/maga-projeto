import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type Db } from "../server/db.ts";
import { completeLesson, insertAttempt, insertAssessment } from "../server/repo.ts";
import { selectWarmup, weakTags } from "../server/warmup.ts";
import { loadContent } from "../shared/content-loader.ts";
import type { ContentBundle, Lesson } from "../shared/schema.ts";

/** Clona M01-02 como M01-01 (ids de exercícios reescritos) para ter duas aulas com conteúdo. */
function twoLessonBundle(): ContentBundle {
  const bundle = loadContent("content");
  const src = bundle.lessons["M01-02"]!;
  const clone = JSON.parse(JSON.stringify(src).replaceAll("M01-02", "M01-01")) as Lesson;
  clone.order = 1;
  return { ...bundle, lessons: { ...bundle.lessons, "M01-01": clone } };
}

let db: Db;
const content = twoLessonBundle();
const now = new Date("2026-09-08T10:00:00.000Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 864e5).toISOString();
const rng = () => 0.42; // determinístico

beforeEach(() => { db = openDb(":memory:"); });

describe("weakTags", () => {
  it("flags tags with error rate > 40% over ≥ 3 attempts, or ≥ 3 errors in 7 days", () => {
    for (let i = 0; i < 5; i++) insertAttempt(db, { lessonId: "M01-01", exerciseId: `M01-01-q${i}`, block: "quiz", type: "fill_blank", correct: i > 2, tags: ["gram.since-for"] }, daysAgo(10));
    for (let i = 0; i < 3; i++) insertAttempt(db, { lessonId: "M01-01", exerciseId: `M01-01-l${i}`, block: "listening", type: "multiple_choice", correct: false, tags: ["comp.listening"] }, daysAgo(2));
    insertAttempt(db, { lessonId: "M01-01", exerciseId: "M01-01-q9", block: "quiz", type: "fill_blank", correct: false, tags: ["br.doubt"] }, daysAgo(1));
    const weak = weakTags(db, now);
    expect(weak).toContain("gram.since-for");   // 3/5 erros = 60%
    expect(weak).toContain("comp.listening");   // 3 erros em 7 dias
    expect(weak).not.toContain("br.doubt");     // 1 erro só
  });
});

describe("selectWarmup", () => {
  it("returns [] when no other lesson is completed", () => {
    expect(selectWarmup(db, content, "M01-02", now, rng)).toEqual([]);
  });
  it("prefers exercises tagged with weak tags, never from the current lesson, up to review.count", () => {
    completeLesson(db, "M01-01", 0.9, daysAgo(3));
    for (let i = 0; i < 4; i++) insertAttempt(db, { lessonId: "M01-01", exerciseId: `M01-01-q1`, block: "quiz", type: "fill_blank", correct: false, tags: ["gram.since-for"] }, daysAgo(2));
    const items = selectWarmup(db, content, "M01-02", now, rng);
    expect(items.length).toBe(5);
    expect(items.every((e) => e.id.startsWith("M01-01-"))).toBe(true);
    expect(new Set(items.map((e) => e.id)).size).toBe(5);
    const weakSet = ["gram.since-for", "gram.question-forms", "br.doubt", "gram.present-perfect"];
    expect(items.slice(0, 3).every((e) => e.tags.some((t) => weakSet.includes(t)))).toBe(true);
    expect(items.some((e) => e.tags.includes("gram.since-for"))).toBe(true);
  });
  it("draws placement items for weak tags when no lesson is completed but the placement was taken", () => {
    insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 1 } }, daysAgo(2));
    for (let i = 0; i < 4; i++) insertAttempt(db, { lessonId: "placement", exerciseId: "PL-g01", block: "placement", type: "error_correction", correct: false, tags: ["gram.since-for", "br.since-present"] }, daysAgo(2));
    const items = selectWarmup(db, content, "M01-02", now, rng);
    expect(items.length).toBe(5);
    expect(items.every((e) => e.id.startsWith("PL-"))).toBe(true);
    expect(items.some((e) => e.tags.includes("gram.since-for"))).toBe(true);
  });
});

describe("aceite E6 — errar uma tag reflete no warm-up seguinte", () => {
  it("3 erros propositais numa tag → weakTags a lista → warm-up traz item dela", () => {
    completeLesson(db, "M01-01", 0.9, daysAgo(3));
    const exerciseComTag = content.lessons["M01-01"]!.quiz.find((q) => q.tags.includes("br.doubt"))!;
    // Sem o erro proposital, nada garante a tag no warm-up; depois de 3 erros em 7 dias, vira fraca.
    for (let i = 0; i < 3; i++) {
      insertAttempt(db, { lessonId: "M01-01", exerciseId: exerciseComTag.id, block: "quiz", type: exerciseComTag.type, correct: false, answer: "wrong", tags: exerciseComTag.tags }, daysAgo(1));
    }
    expect(weakTags(db, now)).toContain("br.doubt");
    const items = selectWarmup(db, content, "M01-02", now, rng);
    expect(items.some((e) => e.tags.includes("br.doubt"))).toBe(true);
  });
});
