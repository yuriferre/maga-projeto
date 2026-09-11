import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { ruleBasedFeedback } from "../server/writing-feedback.ts";
import { wordOverlap } from "../shared/speech-compare.ts";
import { checkExercise } from "../shared/scoring.ts";

const bundle = loadContent("content");
const a = bundle.moduleAssessments["M01"]!;
const m01 = Object.values(bundle.lessons).filter((l) => l.module === "M01");

describe("content/modules/M01/assessment.yaml", () => {
  it("has 15 items mixing at least 4 types, with balanced multiple-choice keys", () => {
    expect(a.items).toHaveLength(15);
    expect(new Set(a.items.map((q) => q.type)).size).toBeGreaterThanOrEqual(4);
    const mc = a.items.filter((q) => q.type === "multiple_choice");
    const counts = new Map<number, number>();
    for (const q of mc) if (q.type === "multiple_choice") counts.set(q.answer, (counts.get(q.answer) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(Math.floor(mc.length * 0.5));
    expect(crossValidate(bundle)).toEqual([]);
  });
  it("covers gram.*, br.* and vocab.* from lesson metadata and actual exercises", () => {
    const taught = new Set(m01.flatMap((l) => [
      ...l.tags,
      ...l.quiz.flatMap((q) => q.tags),
      ...l.listening.questions.flatMap((q) => q.tags),
    ]).filter((t) => /^(gram|br|vocab)\./.test(t)));
    const assessed = new Set(a.items.flatMap((q) => q.tags));
    const missing = [...taught].filter((t) => !assessed.has(t));
    expect(missing, `tags do módulo sem item na avaliação: ${missing.join(", ")}`).toEqual([]);
  });
  it("uses new assessment stems instead of repeating lesson questions", () => {
    const lessonPrompts = new Set(m01.flatMap((l) => [...l.quiz, ...l.listening.questions]).map((q) => q.prompt));
    expect(a.items.filter((q) => lessonPrompts.has(q.prompt)).map((q) => q.id)).toEqual([]);
  });
  it.each(["have worked", "'ve worked", "have been working", "'ve been working"])("accepts the valid since variant %s in assessment and lesson", (response) => {
    for (const q of [a.items.find((q) => q.id === "M01-A01")!, bundle.lessons["M01-02"]!.quiz[0]!]) {
      expect(checkExercise(q, response).correct).toBe(true);
      expect(checkExercise(q, "am working").correct).toBe(false);
    }
  });
  it("requires correcting both dependency and waiting prepositions", () => {
    const q = a.items.find((q) => q.id === "M01-A05")!;
    for (const prep of ["on", "for"]) {
      expect(checkExercise(q, `The canary rollout depends on Ana's approval, so I'm waiting ${prep} her reply.`).correct).toBe(true);
    }
    for (const answer of [
      "The canary rollout depends of Ana's approval, so I'm waiting for her reply.",
      "The canary rollout depends on Ana's approval, so I'm waiting her reply.",
    ]) expect(checkExercise(q, answer).correct).toBe(false);
  });
  it.each(["seven out of ten", "7 out of 10", "seven out of 10", "7 out of ten"])("accepts the pipeline proportion in %s runs", (proportion) => {
    const q = a.items.find((q) => q.id === "M01-A08")!;
    expect(checkExercise(q, `The pipeline passed in ${proportion} runs.`).correct).toBe(true);
    expect(checkExercise(q, "The pipeline passed in ten out of seven runs.").correct).toBe(false);
  });
  it.each(["plan to", "intend to", "am planning to", "am intending to", "am going to"])("accepts intention variant %s with corrected discuss and access", (intention) => {
    const q = a.items.find((q) => q.id === "M01-A10")!;
    expect(checkExercise(q, `I ${intention} discuss the rollout with Ana before requesting access to staging.`).correct).toBe(true);
    expect(checkExercise(q, `I ${intention} discuss about the rollout with Ana before requesting access to staging.`).correct).toBe(false);
    expect(checkExercise(q, `I ${intention} discuss the rollout with Ana before requesting access for staging.`).correct).toBe(false);
  });
  it.each(["Currently I'm", "Currently, I'm", "I'm currently", "Right now I'm", "Right now, I'm", "At the moment I'm", "At the moment, I'm"])("accepts the natural currently variant %s", (beginning) => {
    const q = a.items.find((q) => q.id === "M01-A12")!;
    expect(checkExercise(q, `${beginning} working on the platform team's migration.`).correct).toBe(true);
    expect(checkExercise(q, "Actually I'm working on the platform team's migration.").correct).toBe(false);
  });
  it("writing model passes its own constraints and the BR detector; target phrases are clean", () => {
    const fb = ruleBasedFeedback(a.writing.model, a.writing, bundle.brErrors);
    expect(fb.withinLength).toBe(true);
    expect(fb.constraints.filter((c) => c.met !== null).every((c) => c.met)).toBe(true);
    expect(fb.findings).toEqual([]);
    for (const p of a.speaking.targetPhrases) expect(wordOverlap(p, p)).toBe(1);
  });
});
