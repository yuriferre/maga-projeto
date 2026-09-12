import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M11 lessons", () => {
  it("passes cross-validation", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });
  // Cada aula nova adiciona uma linha (T3–T7 do plano 2026-09-12-e5-m11).
  checkLesson(bundle, "M11-01", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M06-05", "M10-05"],
  });
  checkLesson(bundle, "M11-02", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M11-01"],
  });
  checkLesson(bundle, "M11-03", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M11-02"],
  });
  checkLesson(bundle, "M11-04", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M11-03"],
  });
});
