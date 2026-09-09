import { describe, it, expect } from "vitest";
import { ExerciseSchema, LessonSchema, TagsFileSchema } from "../shared/schema.ts";

const mc = {
  id: "M01-02-q4", type: "multiple_choice", prompt: "Which one sounds evasive?",
  options: ["It's taking longer than expected; I'll need another day.", "It's almost done, almost."],
  answer: 1, explanation: "Sem informação concreta.", tags: ["topic.daily"],
};

describe("ExerciseSchema", () => {
  it("accepts a multiple_choice exercise", () => {
    expect(ExerciseSchema.parse(mc)).toMatchObject({ type: "multiple_choice", answer: 1 });
  });
  it("rejects multiple_choice whose answer index is out of range", () => {
    expect(() => ExerciseSchema.parse({ ...mc, answer: 2 })).toThrow();
  });
  it("accepts fill_blank with accepted[]", () => {
    const ex = { id: "M01-02-q1", type: "fill_blank", prompt: "I ___ (work) on this since Monday.", accepted: ["have been working", "'ve been working"], explanation: "since → present perfect continuous", tags: ["gram.since-for"] };
    expect(ExerciseSchema.parse(ex).type).toBe("fill_blank");
  });
  it("rejects reorder whose answer does not use exactly the given tokens", () => {
    const ex = { id: "M01-02-q8", type: "reorder", prompt: "Reordene.", tokens: ["on", "blocked", "staging", "to", "access", "I'm"], answer: "I'm blocked on staging", explanation: "x", tags: ["vocab.standup"] };
    expect(() => ExerciseSchema.parse(ex)).toThrow();
  });
  it("rejects an exercise with no tags", () => {
    expect(() => ExerciseSchema.parse({ ...mc, tags: [] })).toThrow();
  });
});

describe("TagsFileSchema", () => {
  it("requires the id to start with the group", () => {
    expect(() => TagsFileSchema.parse({ tags: [{ id: "gram.present-perfect", group: "vocab", label: "x" }] })).toThrow();
    expect(TagsFileSchema.parse({ tags: [{ id: "gram.present-perfect", group: "gram", label: "x" }] }).tags).toHaveLength(1);
  });
});

describe("LessonSchema", () => {
  it("rejects a lesson missing the quiz", () => {
    expect(() => LessonSchema.parse({ id: "M01-02", module: "M01", order: 2, title: "t" })).toThrow();
  });
});
