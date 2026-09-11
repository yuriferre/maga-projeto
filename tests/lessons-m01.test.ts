import { describe, it, expect } from "vitest";
import { loadContent, crossValidate, allExercises } from "../shared/content-loader.ts";
import { ruleBasedFeedback } from "../server/writing-feedback.ts";
import { wordOverlap } from "../shared/speech-compare.ts";
import { parseMarkdown } from "../shared/mini-markdown.ts";
import type { Lesson } from "../shared/schema.ts";

const bundle = loadContent("content");

type Expect = { vocabMin: number; dialogueMin: number; listening: number; quiz: number; cardsMin: number; maxSeconds: number; prerequisites: string[] };

/** Checklist de qualidade da spec §4.1, aplicada a cada aula nova do M01. */
function checkLesson(id: string, e: Expect) {
  const lesson: Lesson = bundle.lessons[id]!;
  it(`${id} exists in the bundle and follows the roadmap`, () => {
    expect(lesson).toBeDefined();
    expect(lesson.module).toBe("M01");
    expect(lesson.prerequisites).toEqual(e.prerequisites);
    expect(lesson.completion).toEqual({ quizMin: 0.75, writingMin: 3, speakingRequired: true });
  });
  it(`${id} has the required block sizes`, () => {
    expect(lesson.vocabulary.length).toBeGreaterThanOrEqual(e.vocabMin);
    expect(lesson.vocabulary.length).toBeLessThanOrEqual(16);
    expect(lesson.examples.length).toBeGreaterThanOrEqual(6);
    expect(lesson.variations.length).toBeGreaterThanOrEqual(2);
    expect(lesson.brErrors.length).toBeGreaterThanOrEqual(8);
    expect(lesson.dialogue.lines.length).toBeGreaterThanOrEqual(e.dialogueMin);
    expect(lesson.listening.questions).toHaveLength(e.listening);
    expect(lesson.quiz).toHaveLength(e.quiz);
    expect(lesson.srsCards.length).toBeGreaterThanOrEqual(e.cardsMin);
    expect(lesson.srsCards.length).toBeLessThanOrEqual(12);
    expect(lesson.speaking.modeA.targetPhrases.length).toBeGreaterThanOrEqual(12);
    expect(lesson.speaking.modeA.maxSeconds).toBe(e.maxSeconds);
    expect(lesson.writing.constraints.length).toBeGreaterThanOrEqual(3);
    expect(lesson.review.preferTags.length).toBeGreaterThanOrEqual(3);
  });
  it(`${id} quiz mixes at least 4 exercise types and balances multiple-choice answers`, () => {
    expect(new Set(lesson.quiz.map((q) => q.type)).size).toBeGreaterThanOrEqual(4);
    const mc = allExercises(lesson).map((x) => x.exercise).filter((q) => q.type === "multiple_choice");
    const counts = new Map<number, number>();
    for (const q of mc) if (q.type === "multiple_choice") counts.set(q.answer, (counts.get(q.answer) ?? 0) + 1);
    const max = Math.max(0, ...counts.values());
    expect(max, `distribuição ${JSON.stringify([...counts])}`).toBeLessThanOrEqual(Math.max(1, Math.floor(mc.length * 0.5)));
  });
  it(`${id} writing model satisfies its constraints and length with no BR errors`, () => {
    const fb = ruleBasedFeedback(lesson.writing.model, lesson.writing, bundle.brErrors);
    expect(fb.withinLength).toBe(true);
    expect(fb.constraints.filter((c) => c.met !== null).every((c) => c.met), JSON.stringify(fb.constraints)).toBe(true);
    expect(fb.findings).toEqual([]);
  });
  it(`${id} target phrases, dialogue and cards are clean`, () => {
    for (const p of lesson.speaking.modeA.targetPhrases) expect(wordOverlap(p, p)).toBe(1);
    const fronts = lesson.srsCards.map((c) => c.front.toLowerCase());
    expect(new Set(fronts).size).toBe(fronts.length);
    for (const line of lesson.dialogue.lines) expect(line.text.trim().length).toBeGreaterThan(0);
  });
  it(`${id} markdown fields render without leftover asterisks`, () => {
    const fields = [lesson.context.scenario, lesson.writing.prompt, lesson.grammar?.explanation ?? ""];
    for (const text of fields) {
      for (const block of parseMarkdown(text)) {
        const inlines = block.type === "paragraph" ? block.inlines : block.type === "list" ? block.items.flat() : [...block.header.flat(), ...block.rows.flat(2)];
        for (const inline of inlines) expect(inline.text, text.slice(0, 40)).not.toContain("*");
      }
    }
  });
}

describe("M01 lessons", () => {
  it("passes cross-validation", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });
  checkLesson("M01-01", { vocabMin: 12, dialogueMin: 6, listening: 6, quiz: 8, cardsMin: 10, maxSeconds: 45, prerequisites: [] });
});
