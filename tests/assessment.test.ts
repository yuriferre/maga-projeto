import { describe, it, expect } from "vitest";
import { loadContent } from "../shared/content-loader.ts";
import { computeAssessmentResult, missingForAssessment, moduleEligibility, parseAssessmentRecord, type AssessmentInputs, type AssessmentSpec } from "../server/assessment.ts";
import type { AttemptRow, WritingRow, SpeakingRow, LessonProgressRow } from "../server/repo.ts";

const content = loadContent("content");
const a = content.moduleAssessments["M01"]!;
const spec: AssessmentSpec = { kind: "module", ref: "M01", items: a.items, pass: content.modules["M01"]!.pass };
const T = "2026-09-11T12:00:00.000Z";

let seq = 0;
const attempt = (exerciseId: string, correct: boolean, tags: string[]): AttemptRow =>
  ({ id: ++seq, lesson_id: "M01", exercise_id: exerciseId, block: "assessment", type: "multiple_choice", correct: correct ? 1 : 0, answer: correct ? "ok" : "nope", score: null, tags_json: JSON.stringify(tags), ts: T });
const answers = (isCorrect: (id: string) => boolean) => new Map(a.items.map((q) => [q.id, attempt(q.id, isCorrect(q.id), q.tags)]));
const writing = (score: number | null): WritingRow => ({ id: 1, lesson_id: "M01", text: "t", feedback_json: "{}", score, ts: T });
const speaking = (score: number | null): SpeakingRow => ({ id: 1, lesson_id: "M01", mode: "A", transcript: "t", metrics_json: "{}", score, self_confidence: null, ts: T });
const inputs = (o: Partial<AssessmentInputs>): AssessmentInputs => ({ attempts: new Map(), writing: undefined, speaking: undefined, ...o });

describe("computeAssessmentResult", () => {
  it("passes when items ≥ 75 %, writing ≥ 3 and speaking ≥ 3", () => {
    const r = computeAssessmentResult(spec, inputs({ attempts: answers(() => true), writing: writing(3), speaking: speaking(3) }), T);
    expect(r).toMatchObject({ version: 1, kind: "module", ref: "M01", itemCount: a.items.length, correct: a.items.length, itemsPct: 1, writingScore: 3, speakingScore: 3, passed: true, finishedAt: T });
    expect(r.pass).toEqual(spec.pass);
    expect(r.items).toHaveLength(a.items.length);
    expect(r.weakTags).toEqual([]);
  });
  it.each([
    ["items below threshold", { items: 0.7, w: 5, s: 5 }],
    ["writing below threshold", { items: 1, w: 2, s: 5 }],
    ["speaking below threshold", { items: 1, w: 5, s: 2.5 }],
  ])("fails on %s", (_name, c) => {
    const n = Math.round(a.items.length * c.items);
    const r = computeAssessmentResult(spec, inputs({ attempts: answers((id) => a.items.findIndex((q) => q.id === id) < n), writing: writing(c.w), speaking: speaking(c.s) }), T);
    expect(r.passed).toBe(false);
  });
  it("uses the exact boundaries: 75 % passes, writing 3 passes, speaking 3 passes", () => {
    const twelve = Math.ceil(a.items.length * 0.75);
    const r = computeAssessmentResult(spec, inputs({ attempts: answers((id) => a.items.findIndex((q) => q.id === id) < twelve), writing: writing(3), speaking: speaking(3) }), T);
    expect(r.itemsPct).toBeGreaterThanOrEqual(0.75);
    expect(r.passed).toBe(true);
  });
  it("collects weak tags (error rate ≥ 50 %) and marks missing writing/speaking as null", () => {
    const r = computeAssessmentResult(spec, inputs({ attempts: answers((id) => id !== "M01-A05" && id !== "M01-A06") }), T);
    expect(r.writingScore).toBeNull();
    expect(r.speakingScore).toBeNull();
    expect(r.passed).toBe(false);
    expect(r.weakTags).toEqual(expect.arrayContaining(["br.waiting-no-prep", "br.doubt"]));
  });
});

describe("missingForAssessment", () => {
  it("lists unanswered items, missing writing score and missing speaking", () => {
    const att = answers(() => true);
    att.delete("M01-A03");
    expect(missingForAssessment(spec, inputs({ attempts: att, writing: writing(null) }))).toEqual({ exercises: ["M01-A03"], writing: true, speaking: true });
    expect(missingForAssessment(spec, inputs({ attempts: answers(() => true), writing: writing(4), speaking: speaking(4) }))).toEqual({ exercises: [], writing: false, speaking: false });
  });
});

describe("moduleEligibility", () => {
  const progress = (done: string[]): LessonProgressRow[] => done.map((id) => ({ lesson_id: id, status: "completed", score: 1, started_at: T, completed_at: T }));
  it("counts only lessons that have content and reports the missing ones", () => {
    const withContent = Object.keys(content.lessons).filter((id) => id.startsWith("M01-")).sort();
    expect(moduleEligibility(content, [], "M01")).toEqual({ lessonsTotal: withContent.length, lessonsDone: 0, missing: withContent });
    expect(moduleEligibility(content, progress(withContent), "M01")).toEqual({ lessonsTotal: withContent.length, lessonsDone: withContent.length, missing: [] });
  });
  it("is empty for a module without content", () => {
    expect(moduleEligibility(content, [], "M07")).toEqual({ lessonsTotal: 0, lessonsDone: 0, missing: [] });
  });
});

describe("parseAssessmentRecord", () => {
  it("parses score_json", () => {
    expect(parseAssessmentRecord({ id: 3, kind: "module", ref: "M01", score_json: JSON.stringify({ passed: true }), ts: T })).toMatchObject({ id: 3, ts: T, result: { passed: true } });
  });
});
