import { describe } from "vitest";
import { loadContent } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M15 lessons", () => {
  checkLesson(bundle, "M15-01", {
    vocabMin: 12,
    dialogueMin: 6,
    listening: 6,
    quiz: 8,
    cardsMin: 10,
    maxSeconds: 45,
    prerequisites: ["M10-05", "M03-05"],
  });
});
