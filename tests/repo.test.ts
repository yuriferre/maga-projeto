import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type Db } from "../server/db.ts";
import {
  insertAttempt, latestAttemptsByExercise, startLesson, getLessonProgress, completeLesson, listProgress,
  insertWriting, latestWriting, insertSpeaking, countSpeaking, insertCards, countCards, tagStats,
  insertAssessment, latestAssessment, listAssessments, latestAttemptsSince, latestWritingSince, latestSpeakingSince,
  getWeekGoal, upsertWeekGoal, ensureWeekGoal, latestStudySession, insertStudySession, extendStudySession, studySessionsBetween,
  activityDays, completedLessonsBetween, reviewsBetween, attemptAccuracy, writingAverage, speakingAverage, readAloudAverage,
  dueCards, getCard, applyReview, cardCounts, reviewAccuracy, insertGlossaryCard,
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

describe("weekly_goals", () => {
  it("upserts and ensure does not overwrite", () => {
    expect(getWeekGoal(db, "2026-09-07")).toBeUndefined();
    ensureWeekGoal(db, "2026-09-07", { lessonsTarget: 3, reviewsTarget: 5, minutesTarget: 150 });
    upsertWeekGoal(db, "2026-09-07", { lessonsTarget: 4, reviewsTarget: 5, minutesTarget: 150 });
    ensureWeekGoal(db, "2026-09-07", { lessonsTarget: 9, reviewsTarget: 9, minutesTarget: 9 });
    expect(getWeekGoal(db, "2026-09-07")).toEqual({ week_start: "2026-09-07", lessons_target: 4, reviews_target: 5, minutes_target: 150 });
  });
});

describe("study_sessions", () => {
  it("inserts, extends and selects sessions overlapping a window", () => {
    const id = insertStudySession(db, t(1), null);
    extendStudySession(db, id, "2026-09-01T10:05:00.000Z", "M01-02");
    expect(latestStudySession(db)).toMatchObject({ id, started_at: t(1), ended_at: "2026-09-01T10:05:00.000Z", lesson_id: "M01-02" });
    insertStudySession(db, t(5), null);
    expect(studySessionsBetween(db, "2026-09-01T10:02:00.000Z", "2026-09-02T00:00:00.000Z").map((s) => s.id)).toEqual([id]);
    expect(studySessionsBetween(db, "2026-09-01T10:05:00.000Z", "2026-09-02T00:00:00.000Z")).toEqual([]);
  });
});

describe("atividade e contagens da semana", () => {
  const localIso = (d: number, h: number) => new Date(2026, 8, d, h, 0, 0).toISOString();
  it("activityDays unions attempts, writing, speaking and study sessions as local dates", () => {
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: true, tags: ["gram.since-for"] }, localIso(9, 12));
    insertWriting(db, { lessonId: "M01-02", text: "a", feedback: {}, score: null }, localIso(8, 23));
    insertSpeaking(db, { lessonId: "M01-02", mode: "A", transcript: "x", metrics: {}, score: 3, selfConfidence: null }, localIso(8, 1));
    insertStudySession(db, localIso(5, 9), null);
    expect(activityDays(db)).toEqual(["2026-09-05", "2026-09-08", "2026-09-09"]);
  });
  it("counts completed lessons and reviews inside [start, end)", () => {
    completeLesson(db, "M01-02", 0.9, "2026-09-08T12:00:00.000Z");
    db.prepare("insert into srs_cards (lesson_id, front, back, tag, due, created_at) values ('M01-02','f','b','vocab.standup',?,?)").run(t(1), t(1));
    db.prepare("insert into srs_reviews (card_id, grade, ts) values (1, 4, ?)").run("2026-09-08T13:00:00.000Z");
    db.prepare("insert into srs_reviews (card_id, grade, ts) values (1, 4, ?)").run("2026-09-14T00:00:00.000Z");
    expect(completedLessonsBetween(db, "2026-09-07T00:00:00.000Z", "2026-09-14T00:00:00.000Z")).toBe(1);
    expect(completedLessonsBetween(db, "2026-09-09T00:00:00.000Z", "2026-09-14T00:00:00.000Z")).toBe(0);
    expect(reviewsBetween(db, "2026-09-07T00:00:00.000Z", "2026-09-14T00:00:00.000Z")).toBe(1);
  });
});

describe("amostras do radar", () => {
  it("attemptAccuracy matches by block, tag list or tag prefix, counting each attempt once", () => {
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-l1", block: "listening", type: "multiple_choice", correct: true, tags: ["comp.listening", "vocab.ci"] }, t(2));
    insertAttempt(db, { lessonId: "placement", exerciseId: "PL-l01", block: "placement", type: "multiple_choice", correct: false, tags: ["comp.listening"] }, t(2));
    insertAttempt(db, { lessonId: "placement", exerciseId: "PL-v01", block: "placement", type: "multiple_choice", correct: true, tags: ["comp.vocabulary", "vocab.ci"] }, t(2));
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: true, tags: ["gram.since-for"] }, t(1));
    expect(attemptAccuracy(db, t(2), { blocks: ["listening"], tags: ["comp.listening"] })).toEqual({ value: 0.5, samples: 2 });
    expect(attemptAccuracy(db, t(2), { blocks: [], tags: ["comp.vocabulary"], tagPrefix: "vocab." })).toEqual({ value: 1, samples: 2 });
    expect(attemptAccuracy(db, t(2), { blocks: [], tags: ["comp.reading"] })).toEqual({ value: null, samples: 0 });
    expect(attemptAccuracy(db, t(3), { blocks: ["listening"], tags: [] })).toEqual({ value: null, samples: 0 });
  });
  it("writing, speaking and read-aloud averages ignore nulls and the window", () => {
    insertWriting(db, { lessonId: "M01-02", text: "a", feedback: {}, score: 4 }, t(2));
    insertWriting(db, { lessonId: "M01-02", text: "b", feedback: {}, score: null }, t(2));
    insertWriting(db, { lessonId: "M01-02", text: "c", feedback: {}, score: 1 }, t(1));
    insertSpeaking(db, { lessonId: "placement", mode: "A", transcript: "x", metrics: { readAloudPct: 0.9 }, score: 3, selfConfidence: 4 }, t(2));
    insertSpeaking(db, { lessonId: "M01-02", mode: "A", transcript: "y", metrics: {}, score: 5, selfConfidence: null }, t(2));
    expect(writingAverage(db, t(2))).toEqual({ value: 0.8, samples: 1 });
    expect(speakingAverage(db, t(2), "score")).toEqual({ value: 0.8, samples: 2 });
    expect(speakingAverage(db, t(2), "self_confidence")).toEqual({ value: 0.8, samples: 1 });
    expect(readAloudAverage(db, t(2))).toEqual({ value: 0.9, samples: 1 });
    expect(readAloudAverage(db, t(3))).toEqual({ value: null, samples: 0 });
  });
  it("readAloudAverage ignores a session whose readAloudPct is null", () => {
    insertSpeaking(db, { lessonId: "placement", mode: "A", transcript: "x", metrics: { readAloudPct: 0.9 }, score: 3, selfConfidence: 4 }, t(2));
    insertSpeaking(db, { lessonId: "placement", mode: "A", transcript: "y", metrics: { readAloudPct: null }, score: 3, selfConfidence: 4 }, t(2));
    expect(readAloudAverage(db, t(2))).toEqual({ value: 0.9, samples: 1 });
  });
});

describe("srs: fila, revisão, contagens", () => {
  const cards = [
    { front: "a", back: "A", tag: "vocab.standup" },
    { front: "b", back: "B", tag: "vocab.standup" },
    { front: "c", back: "C", tag: "vocab.standup" },
  ];
  const ids = () => (db.prepare("select id from srs_cards order by id").all() as { id: number }[]).map((r) => r.id);
  const reviews = () => (db.prepare("select count(*) as n from srs_reviews").get() as { n: number }).n;

  it("dueCards lista só os vencidos, mais antigos primeiro, com limite", () => {
    insertCards(db, "M01-02", cards, t(1));
    const [a, b] = ids();
    applyReview(db, b!, 4, { ease: 2.5, intervalDays: 1, reps: 1, lapses: 0, due: t(5) }, t(2));
    expect(dueCards(db, t(3), 10).map((r) => r.front)).toEqual(["a", "c"]);
    expect(dueCards(db, t(3), 1).map((r) => r.front)).toEqual(["a"]);
    expect(dueCards(db, t(5), 10).map((r) => r.front)).toEqual(["a", "c", "b"]);
    expect(getCard(db, a!)?.front).toBe("a");
    expect(getCard(db, 999)).toBeUndefined();
  });

  it("applyReview grava estado e revisão juntos; nota inválida não deixa nada gravado", () => {
    insertCards(db, "M01-02", cards.slice(0, 1), t(1));
    const [id] = ids();
    applyReview(db, id!, 4, { ease: 2.5, intervalDays: 1, reps: 1, lapses: 0, due: t(2) }, t(1));
    expect(getCard(db, id!)).toMatchObject({ ease: 2.5, interval_days: 1, reps: 1, lapses: 0, due: t(2) });
    expect(reviews()).toBe(1);
    expect(() => applyReview(db, id!, 9, { ease: 1.3, intervalDays: 0, reps: 0, lapses: 1, due: t(3) }, t(3))).toThrow();
    expect(getCard(db, id!)).toMatchObject({ interval_days: 1, reps: 1, due: t(2) });
    expect(reviews()).toBe(1);
  });

  it("cardCounts classifica novos/aprendendo/maduros, conta vencidos e aponta o próximo", () => {
    expect(cardCounts(db, t(1))).toEqual({ new: 0, learning: 0, mature: 0, dueNow: 0, total: 0, nextDue: null });
    insertCards(db, "M01-02", cards, t(1));
    const [, b, c] = ids();
    applyReview(db, b!, 4, { ease: 2.5, intervalDays: 6, reps: 2, lapses: 0, due: t(7) }, t(1));
    applyReview(db, c!, 5, { ease: 2.6, intervalDays: 30, reps: 4, lapses: 0, due: t(9) }, t(1));
    expect(cardCounts(db, t(2))).toEqual({ new: 1, learning: 1, mature: 1, dueNow: 1, total: 3, nextDue: t(7) });
    expect(cardCounts(db, t(9))).toMatchObject({ dueNow: 3, nextDue: null });
  });

  it("reviewAccuracy conta notas ≥ 3 na janela", () => {
    insertCards(db, "M01-02", cards.slice(0, 1), t(1));
    const [id] = ids();
    const next = { ease: 2.5, intervalDays: 1, reps: 1, lapses: 0, due: t(9) };
    applyReview(db, id!, 5, next, t(1));
    applyReview(db, id!, 4, next, t(2));
    applyReview(db, id!, 1, next, t(3));
    expect(reviewAccuracy(db, t(2))).toEqual({ value: 0.5, samples: 2 });
    expect(reviewAccuracy(db, t(4))).toEqual({ value: null, samples: 0 });
  });

  it("insertGlossaryCard insere uma vez e devolve o id existente depois", () => {
    const first = insertGlossaryCard(db, { front: "aviso rápido", back: "heads up", hint: "just a heads up", tag: "vocab.slack" }, t(1));
    const second = insertGlossaryCard(db, { front: "aviso rápido", back: "heads up", tag: "vocab.slack" }, t(2));
    expect(first.inserted).toBe(true);
    expect(second).toEqual({ inserted: false, id: first.id });
    expect(getCard(db, first.id)).toMatchObject({ lesson_id: "glossary", hint: "just a heads up", due: t(1), reps: 0 });
  });
});
