import { describe, it, expect } from "vitest";
import { ruleBasedFeedback } from "../server/writing-feedback.ts";
import { loadContent } from "../shared/content-loader.ts";

const { lessons, brErrors } = loadContent("content");
const lesson = lessons["M01-02"]!;

describe("ruleBasedFeedback", () => {
  it("passes every constraint on the model answer and finds no BR errors", () => {
    const fb = ruleBasedFeedback(lesson.writing.model, lesson.writing, brErrors);
    expect(fb.mode).toBe("rules");
    expect(fb.withinLength).toBe(true);
    expect(fb.constraints.every((c) => c.met === true)).toBe(true);
    expect(fb.findings).toEqual([]);
    expect(fb.score).toBeNull();
  });
  it("flags length, missing constraints and BR errors", () => {
    const fb = ruleBasedFeedback("I'm working on this since yesterday and I have a doubt.", lesson.writing, brErrors);
    expect(fb.withinLength).toBe(false);
    expect(fb.constraints.find((c) => c.label.includes("turned out"))?.met).toBe(false);
    expect(fb.findings.map((f) => f.tag)).toEqual(expect.arrayContaining(["br.since-present", "br.doubt"]));
  });
  it("stores a clamped self score", () => {
    expect(ruleBasedFeedback("x", lesson.writing, brErrors, 9).score).toBe(5);
    expect(ruleBasedFeedback("x", lesson.writing, brErrors, 3.5).score).toBe(3.5);
  });
});
