import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M28 lessons", () => {
  it("passes cross-validation", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });
  checkLesson(bundle, "M28-01", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M27-05"],
  });
  checkLesson(bundle, "M28-02", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M28-01"],
  });
  checkLesson(bundle, "M28-03", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M28-02"],
  });
  checkLesson(bundle, "M28-04", {
    vocabMin: 12,
    dialogueMin: 10,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 120,
    prerequisites: ["M28-03"],
  });
});
