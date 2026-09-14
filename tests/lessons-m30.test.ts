import { describe, expect, it } from "vitest";
import { loadContent } from "../shared/content-loader.ts";
import { crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M30 lessons", () => {
  it("módulo M30 existe e cross-validation passa", () => {
    expect(bundle.modules["M30"]).toBeTruthy();
    expect(crossValidate(bundle)).toEqual([]);
  });
  checkLesson(bundle, "M30-01", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M18-04", "M21-05"],
  });
  checkLesson(bundle, "M30-02", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M30-01"],
  });
  checkLesson(bundle, "M30-03", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M30-02"],
  });
  checkLesson(bundle, "M30-04", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M30-03"],
  });
  checkLesson(bundle, "M30-05", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M30-04"],
  });
  checkLesson(bundle, "M30-06", {
    vocabMin: 12,
    dialogueMin: 10,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 120,
    prerequisites: ["M30-05"],
  });
});
