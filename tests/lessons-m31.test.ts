import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M31 lessons", () => {
  it("módulo M31 existe e cross-validation passa", () => {
    expect(bundle.modules["M31"]).toBeTruthy();
    expect(crossValidate(bundle)).toEqual([]);
  });
  checkLesson(bundle, "M31-01", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M28-04"],
  });
  checkLesson(bundle, "M31-02", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M31-01"],
  });
  checkLesson(bundle, "M31-03", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M31-02"],
  });
  checkLesson(bundle, "M31-04", {
    vocabMin: 12,
    dialogueMin: 10,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 120,
    prerequisites: ["M31-03"],
  });
});
