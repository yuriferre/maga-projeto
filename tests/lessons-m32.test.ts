import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M32 lessons", () => {
  it("módulo M32 existe e cross-validation passa", () => {
    expect(bundle.modules["M32"]).toBeTruthy();
    expect(crossValidate(bundle)).toEqual([]);
  });
  checkLesson(bundle, "M32-01", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M26-04"],
  });
  checkLesson(bundle, "M32-02", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 90,
    prerequisites: ["M32-01"],
  });
});
