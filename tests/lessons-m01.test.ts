import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkExercise } from "../shared/scoring.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M01 lessons", () => {
  it.each(["three out of five", "3 out of 5", "three out of 5", "3 out of five"])("accepts the run proportion in %s runs", (proportion) => {
    const q = bundle.lessons["M01-05"]!.quiz.find((q) => q.id === "M01-05-q4")!;
    expect(checkExercise(q, `It passed in ${proportion} runs.`).correct).toBe(true);
    expect(checkExercise(q, "It passed in five out of three runs.").correct).toBe(false);
  });
  it.each(["At the moment I'm", "At the moment, I'm", "Currently, I'm", "Right now, I'm"])("accepts the onboarding currently variant %s", (beginning) => {
    const q = bundle.lessons["M01-01"]!.quiz.find((q) => q.id === "M01-01-q3")!;
    expect(checkExercise(q, `${beginning} working on the onboarding tasks.`).correct).toBe(true);
    expect(checkExercise(q, "Actually I'm working on the onboarding tasks now.").correct).toBe(false);
  });
  it("passes cross-validation", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });
  checkLesson(bundle, "M01-01", { vocabMin: 12, dialogueMin: 6, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 45, prerequisites: [] });
  checkLesson(bundle, "M01-03", { vocabMin: 12, dialogueMin: 6, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 45, prerequisites: ["M01-02"] });
  checkLesson(bundle, "M01-04", { vocabMin: 12, dialogueMin: 6, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 45, prerequisites: ["M01-02"] });
  checkLesson(bundle, "M01-05", { vocabMin: 12, dialogueMin: 12, listening: 8, quiz: 8, cardsMin: 10, maxSeconds: 60, prerequisites: ["M01-03", "M01-04"] });
});
