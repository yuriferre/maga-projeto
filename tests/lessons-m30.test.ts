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
});
