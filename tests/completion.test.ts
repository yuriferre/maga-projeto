import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type Db } from "../server/db.ts";
import { insertAttempt, insertWriting, insertSpeaking } from "../server/repo.ts";
import { evaluateCompletion } from "../server/completion.ts";
import { loadContent } from "../shared/content-loader.ts";

const lesson = loadContent("content").lessons["M01-02"]!;
let db: Db;
beforeEach(() => { db = openDb(":memory:"); });
const now = "2026-09-08T10:00:00.000Z";

function answerQuiz(correctCount: number) {
  lesson.quiz.forEach((q, i) => {
    insertAttempt(db, { lessonId: lesson.id, exerciseId: q.id, block: "quiz", type: q.type, correct: i < correctCount, tags: q.tags }, now);
  });
}

describe("evaluateCompletion", () => {
  it("lists everything missing on a fresh lesson", () => {
    const s = evaluateCompletion(db, lesson);
    expect(s.met).toBe(false);
    expect(s.quizPct).toBe(0);
    expect(s.missing).toHaveLength(3);
  });
  it("uses the latest attempt per quiz exercise", () => {
    answerQuiz(5); // 5/8 = 62.5% < 75%
    insertAttempt(db, { lessonId: lesson.id, exerciseId: lesson.quiz[5]!.id, block: "quiz", type: lesson.quiz[5]!.type, correct: true, tags: [] }, "2026-09-08T11:00:00.000Z");
    expect(evaluateCompletion(db, lesson).quizPct).toBe(0.75);
  });
  it("is met when quiz ≥ 75%, writing ≥ 3 and one speaking session exist", () => {
    answerQuiz(6);
    insertWriting(db, { lessonId: lesson.id, text: "x", feedback: {}, score: 3 }, now);
    insertSpeaking(db, { lessonId: lesson.id, mode: "A", transcript: "x", metrics: {}, score: 3, selfConfidence: null }, now);
    const s = evaluateCompletion(db, lesson);
    expect(s.met).toBe(true);
    expect(s.missing).toEqual([]);
    expect(s.cardsAdded).toBe(false);
  });
  it("reports a low writing score as missing", () => {
    answerQuiz(8);
    insertWriting(db, { lessonId: lesson.id, text: "x", feedback: {}, score: 2 }, now);
    insertSpeaking(db, { lessonId: lesson.id, mode: "A", transcript: "x", metrics: {}, score: 3, selfConfidence: null }, now);
    const s = evaluateCompletion(db, lesson);
    expect(s.met).toBe(false);
    expect(s.missing[0]).toMatch(/Escrita/);
  });
});
