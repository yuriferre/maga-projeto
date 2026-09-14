import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M18 lessons", () => {
  it("passes cross-validation", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });
  checkLesson(bundle, "M18-01", {
    vocabMin: 10,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M12-05"],
  });
  checkLesson(bundle, "M18-02", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M18-01"],
  });
  checkLesson(bundle, "M18-03", {
    vocabMin: 11,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M18-02"],
  });
  checkLesson(bundle, "M18-04", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M18-03"],
  });
});
