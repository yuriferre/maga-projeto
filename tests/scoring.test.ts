import { describe, it, expect } from "vitest";
import { normalizeAnswer, isAccepted, checkExercise } from "../shared/scoring.ts";
import type { Exercise } from "../shared/schema.ts";

describe("normalizeAnswer", () => {
  it("lowercases, trims, collapses spaces, strips trailing punctuation and curly quotes", () => {
    expect(normalizeAnswer("  I haven’t   finished yet. ")).toBe("i haven't finished yet");
    expect(normalizeAnswer("“by”")).toBe("by");
  });
});

describe("isAccepted", () => {
  it("matches any accepted variant after normalization", () => {
    expect(isAccepted("Have been working", ["have been working", "'ve been working"])).toBe(true);
    expect(isAccepted("am working", ["have been working"])).toBe(false);
  });
  it("accepts uncontracted forms of a contracted accepted answer, and vice versa", () => {
    expect(isAccepted("I have not finished yet.", ["I haven't finished yet."])).toBe(true);
    expect(isAccepted("It is failing with a timeout", ["It's failing with a timeout."])).toBe(true);
    expect(isAccepted("I haven't finished yet", ["I have not finished yet."])).toBe(true);
  });
});

const base = { id: "T-1", prompt: "p", explanation: "e", tags: ["topic.daily"] };

describe("checkExercise", () => {
  it("multiple_choice compares the index", () => {
    const ex: Exercise = { ...base, type: "multiple_choice", options: ["by", "until"], answer: 0 };
    expect(checkExercise(ex, 0)).toEqual({ correct: true, expected: "by", given: "by" });
    expect(checkExercise(ex, 1).correct).toBe(false);
  });
  it("fill_blank / error_correction / translate use accepted[]", () => {
    const ex: Exercise = { ...base, type: "error_correction", accepted: ["I haven't finished yet."] };
    expect(checkExercise(ex, "i haven't finished yet").correct).toBe(true);
    expect(checkExercise(ex, "I didn't finish yet").correct).toBe(false);
  });
  it("reorder accepts a token array or a string", () => {
    const ex: Exercise = { ...base, type: "reorder", tokens: ["on", "blocked", "I'm"], answer: "I'm blocked on" };
    expect(checkExercise(ex, ["I'm", "blocked", "on"]).correct).toBe(true);
    expect(checkExercise(ex, "I'm blocked on").correct).toBe(true);
    expect(checkExercise(ex, ["blocked", "I'm", "on"]).correct).toBe(false);
  });
  it("match requires every pair and nothing extra", () => {
    const ex: Exercise = { ...base, type: "match", pairs: [{ left: "by", right: "prazo" }, { left: "until", right: "duração" }] };
    expect(checkExercise(ex, { by: "prazo", until: "duração" }).correct).toBe(true);
    expect(checkExercise(ex, { by: "duração", until: "prazo" }).correct).toBe(false);
    expect(checkExercise(ex, { by: "prazo" }).correct).toBe(false);
  });
  it("free_text is correct when it reaches minWords", () => {
    const ex: Exercise = { ...base, type: "free_text", minWords: 3 };
    expect(checkExercise(ex, "one two three").correct).toBe(true);
    expect(checkExercise(ex, "one two").correct).toBe(false);
  });
});
