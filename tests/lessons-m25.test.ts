import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M25 lessons", () => {
  it("passes cross-validation", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });
  checkLesson(bundle, "M25-01", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 60,
    prerequisites: ["M21-05", "M22-05"],
  });
  checkLesson(bundle, "M25-02", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 60,
    prerequisites: ["M25-01"],
  });
  checkLesson(bundle, "M25-03", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 60,
    prerequisites: ["M25-02"],
  });
  checkLesson(bundle, "M25-04", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 60,
    prerequisites: ["M25-03"],
  });
  checkLesson(bundle, "M25-05", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 120,
    prerequisites: ["M25-04"],
  });
});
