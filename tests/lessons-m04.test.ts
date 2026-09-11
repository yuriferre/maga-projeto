import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M04 lessons", () => {
  it("passes cross-validation", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });
  // Cada aula nova adiciona uma linha (T3–T7 do plano 2026-09-11-e5-m04).
  checkLesson(bundle, "M04-01", { vocabMin: 12, dialogueMin: 6, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 45, prerequisites: [] });
  checkLesson(bundle, "M04-02", { vocabMin: 12, dialogueMin: 6, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 45, prerequisites: ["M04-01"] });
  checkLesson(bundle, "M04-03", { vocabMin: 12, dialogueMin: 6, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 45, prerequisites: ["M04-02"] });
  checkLesson(bundle, "M04-04", { vocabMin: 12, dialogueMin: 6, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 45, prerequisites: ["M04-03"] });
  checkLesson(bundle, "M04-05", { vocabMin: 12, dialogueMin: 8, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 60, prerequisites: ["M04-02", "M04-03", "M04-04"] });
});
