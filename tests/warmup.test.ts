import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type Db } from "../server/db.ts";
import { completeLesson, insertAttempt } from "../server/repo.ts";
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
});
