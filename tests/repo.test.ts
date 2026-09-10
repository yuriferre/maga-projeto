import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type Db } from "../server/db.ts";
import {
  insertAttempt, latestAttemptsByExercise, startLesson, getLessonProgress, completeLesson, listProgress,
  insertWriting, latestWriting, insertSpeaking, countSpeaking, insertCards, countCards, tagStats,
  insertAssessment, latestAssessment, listAssessments, latestAttemptsSince, latestWritingSince, latestSpeakingSince,
} from "../server/repo.ts";

let db: Db;
beforeEach(() => { db = openDb(":memory:"); });

const t = (n: number) => `2026-09-0${n}T10:00:00.000Z`;

describe("attempts", () => {
  it("keeps the latest attempt per exercise for a block", () => {
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: false, answer: "am working", tags: ["gram.since-for"] }, t(1));
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: true, answer: "have been working", tags: ["gram.since-for"] }, t(2));
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-l1", block: "listening", type: "multiple_choice", correct: true, tags: ["comp.listening"] }, t(2));
    const latest = latestAttemptsByExercise(db, "M01-02", "quiz");
    expect(latest.size).toBe(1);
    expect(latest.get("M01-02-q1")?.correct).toBe(1);
  });
});

describe("lesson_progress", () => {
  it("starts once, completes with score, lists all", () => {
    startLesson(db, "M01-02", t(1));
    startLesson(db, "M01-02", t(2));
    expect(getLessonProgress(db, "M01-02")?.started_at).toBe(t(1));
    completeLesson(db, "M01-02", 0.875, t(3));
    const row = getLessonProgress(db, "M01-02")!;
    expect(row.status).toBe("completed");
    expect(row.score).toBe(0.875);
    expect(row.completed_at).toBe(t(3));
    expect(listProgress(db)).toHaveLength(1);
  });
  it("completeLesson works even if the lesson was never started", () => {
    completeLesson(db, "M01-01", 1, t(3));
    expect(getLessonProgress(db, "M01-01")?.status).toBe("completed");
  });
});

describe("writing and speaking", () => {
  it("stores submissions and returns the latest writing", () => {
    insertWriting(db, { lessonId: "M01-02", text: "first", feedback: { a: 1 }, score: null }, t(1));
    insertWriting(db, { lessonId: "M01-02", text: "second", feedback: { a: 2 }, score: 4 }, t(2));
    const w = latestWriting(db, "M01-02")!;
    expect(w.text).toBe("second");
    expect(JSON.parse(w.feedback_json)).toEqual({ a: 2 });
    expect(w.score).toBe(4);
  });
  it("counts speaking sessions per lesson", () => {
    insertSpeaking(db, { lessonId: "M01-02", mode: "A", transcript: "hi", metrics: {}, score: 3, selfConfidence: 4 }, t(1));
    expect(countSpeaking(db, "M01-02")).toBe(1);
    expect(countSpeaking(db, "M01-01")).toBe(0);
  });
});

describe("srs cards", () => {
  it("inserts cards once per (lesson, front)", () => {
    const cards = [{ front: "a", back: "A", tag: "vocab.standup" }, { front: "b", back: "B", tag: "vocab.standup" }];
    expect(insertCards(db, "M01-02", cards, t(1))).toBe(2);
    expect(insertCards(db, "M01-02", cards, t(2))).toBe(0);
    expect(countCards(db, "M01-02")).toBe(2);
  });
});

describe("tagStats", () => {
  it("aggregates attempts and errors per tag since a date", () => {
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "x1", block: "quiz", type: "fill_blank", correct: false, tags: ["gram.since-for", "br.since-present"] }, t(1));
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "x2", block: "quiz", type: "fill_blank", correct: true, tags: ["gram.since-for"] }, t(2));
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "x3", block: "quiz", type: "fill_blank", correct: false, tags: ["gram.since-for"] }, t(3));
    const stats = tagStats(db, t(2));
    const since = stats.find((s) => s.tag === "gram.since-for")!;
    expect(since).toEqual({ tag: "gram.since-for", attempts: 2, errors: 1, errorRate: 0.5 });
    expect(stats.find((s) => s.tag === "br.since-present")).toBeUndefined();
  });
});

describe("assessments", () => {
  it("inserts, returns the latest per kind/ref and lists newest first", () => {
    insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 1 } }, t(1));
    const second = insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 2 } }, t(3));
    insertAssessment(db, { kind: "module", ref: "M01", score: { pct: 0.8 } }, t(2));
    expect(latestAssessment(db, "placement", "placement")?.id).toBe(second);
    expect(JSON.parse(latestAssessment(db, "placement", "placement")!.score_json)).toEqual({ level: 2 });
    expect(latestAssessment(db, "level", "1")).toBeUndefined();
    expect(listAssessments(db).map((a) => a.ts)).toEqual([t(3), t(2), t(1)]);
  });
});

describe("rodada (registros após um instante)", () => {
  it("latestAttemptsSince ignores rows at or before the cutoff and keeps the latest per exercise", () => {
    insertAttempt(db, { lessonId: "placement", exerciseId: "PL-r01", block: "placement", type: "multiple_choice", correct: false, tags: ["comp.reading"] }, t(1));
    insertAttempt(db, { lessonId: "placement", exerciseId: "PL-r01", block: "placement", type: "multiple_choice", correct: true, tags: ["comp.reading"] }, t(2));
    insertAttempt(db, { lessonId: "placement", exerciseId: "PL-r02", block: "placement", type: "multiple_choice", correct: true, tags: ["comp.reading"] }, t(3));
    expect([...latestAttemptsSince(db, "placement", "placement", "").keys()].sort()).toEqual(["PL-r01", "PL-r02"]);
    const since2 = latestAttemptsSince(db, "placement", "placement", t(2));
    expect([...since2.keys()]).toEqual(["PL-r02"]);
    expect(latestAttemptsSince(db, "placement", "placement", "").get("PL-r01")?.correct).toBe(1);
  });
  it("latestWritingSince / latestSpeakingSince respect the cutoff", () => {
    insertWriting(db, { lessonId: "placement", text: "a", feedback: {}, score: 3 }, t(1));
    insertWriting(db, { lessonId: "placement", text: "b", feedback: {}, score: 4 }, t(2));
    insertSpeaking(db, { lessonId: "placement", mode: "A", transcript: "x", metrics: { readAloudPct: 1 }, score: 4, selfConfidence: 3 }, t(2));
    expect(latestWritingSince(db, "placement", "")?.text).toBe("b");
    expect(latestWritingSince(db, "placement", t(2))).toBeUndefined();
    expect(latestSpeakingSince(db, "placement", t(1))?.self_confidence).toBe(3);
    expect(latestSpeakingSince(db, "placement", t(2))).toBeUndefined();
  });
});
