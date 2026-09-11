import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M02 lessons", () => {
  it("passes cross-validation", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });
  // Cada aula nova adiciona uma linha (T3–T7 do plano 2026-09-11-e5-m02).
  checkLesson(bundle, "M02-01", { vocabMin: 12, dialogueMin: 6, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 45, prerequisites: ["M01-01"] });
  checkLesson(bundle, "M02-02", { vocabMin: 12, dialogueMin: 6, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 45, prerequisites: ["M02-01"] });
  checkLesson(bundle, "M02-03", { vocabMin: 12, dialogueMin: 6, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 45, prerequisites: ["M02-02"] });
  checkLesson(bundle, "M02-04", { vocabMin: 12, dialogueMin: 6, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 45, prerequisites: ["M02-03"] });
  checkLesson(bundle, "M02-05", { vocabMin: 12, dialogueMin: 12, listening: 8, quiz: 8, cardsMin: 10, maxSeconds: 60, prerequisites: ["M02-02", "M02-03", "M02-04"] });
});
