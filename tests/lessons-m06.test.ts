import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M06 lessons", () => {
  it("passes cross-validation", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });
  // Cada aula nova adiciona uma linha (T3–T7 do plano 2026-09-11-e5-m06).
});
