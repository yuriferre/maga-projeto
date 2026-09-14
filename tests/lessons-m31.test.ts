import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { checkLesson } from "./lib/check-lesson.ts";

const bundle = loadContent("content");

describe("M31 lessons", () => {
  it("módulo M31 existe e cross-validation passa", () => {
    expect(bundle.modules["M31"]).toBeTruthy();
    expect(crossValidate(bundle)).toEqual([]);
  });
});
