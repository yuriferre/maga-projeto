import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M06 lessons", () => {
  it("passes cross-validation", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });
  // Cada aula nova adiciona uma linha (T3–T7 do plano 2026-09-11-e5-m06).
  checkLesson(bundle, "M06-01", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M03-05", "M04-05"],
  });
  checkLesson(bundle, "M06-02", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M06-01"],
  });
  checkLesson(bundle, "M06-03", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M06-02"],
  });
  checkLesson(bundle, "M06-04", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M06-03"],
  });
  checkLesson(bundle, "M06-05", {
    vocabMin: 12,
    dialogueMin: 10,
    listening: 8,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 60,
    prerequisites: ["M06-01", "M06-02", "M06-03", "M06-04"],
  });
});
