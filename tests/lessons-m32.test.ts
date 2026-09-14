import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M32 lessons", () => {
  it("módulo M32 existe e cross-validation passa", () => {
    expect(bundle.modules["M32"]).toBeTruthy();
    expect(crossValidate(bundle)).toEqual([]);
  });
});
