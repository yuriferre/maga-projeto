import { describe, it, expect } from "vitest";
import { isResponseComplete } from "../src/components/exercises/ExerciseRunner.tsx";
import type { Exercise } from "../shared/schema.ts";

const base = { id: "T-1", prompt: "p", explanation: "e", tags: ["topic.daily"] };

describe("isResponseComplete", () => {
  it("reorder needs every token", () => {
    const ex: Exercise = { ...base, type: "reorder", tokens: ["a", "b", "c"], answer: "a b c" };
    expect(isResponseComplete(ex, ["a"])).toBe(false);
    expect(isResponseComplete(ex, ["a", "b", "c"])).toBe(true);
  });
  it("match needs every pair", () => {
    const ex: Exercise = { ...base, type: "match", pairs: [{ left: "by", right: "prazo" }, { left: "until", right: "duração" }] };
    expect(isResponseComplete(ex, { by: "prazo" })).toBe(false);
    expect(isResponseComplete(ex, { by: "prazo", until: "" })).toBe(false);
    expect(isResponseComplete(ex, { by: "prazo", until: "duração" })).toBe(true);
  });
  it("multiple choice accepts index 0; text needs non-blank", () => {
    expect(isResponseComplete({ ...base, type: "multiple_choice", options: ["x", "y"], answer: 0 }, 0)).toBe(true);
    expect(isResponseComplete({ ...base, type: "fill_blank", prompt: "a ___ b", accepted: ["x"] }, "   ")).toBe(false);
    expect(isResponseComplete({ ...base, type: "translate", accepted: ["x"] }, "It's timing out")).toBe(true);
  });
});
