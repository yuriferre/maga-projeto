import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { placementExercises } from "../shared/schema.ts";
import { parseMarkdown } from "../shared/mini-markdown.ts";
import { ruleBasedFeedback } from "../server/writing-feedback.ts";
import { wordOverlap } from "../shared/speech-compare.ts";

const bundle = loadContent("content");
const p = bundle.placement;

describe("placement content (content/placement/placement.yaml)", () => {
  it("has the Nível 0 block sizes: 12 reading in 3 passages, 10 vocabulary, 10 grammar, 6 listening in 2 scripts", () => {
    expect(p.reading.passages).toHaveLength(3);
    expect(p.reading.passages.flatMap((x) => x.questions)).toHaveLength(12);
    expect(p.vocabulary.questions).toHaveLength(10);
    expect(p.grammar.questions).toHaveLength(10);
    expect(p.listening.scripts).toHaveLength(2);
    expect(p.listening.scripts.flatMap((s) => s.questions)).toHaveLength(6);
    expect(placementExercises(p)).toHaveLength(38);
  });

  it("passes cross-validation (known tags, ids unique across lessons and placement)", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });

  it("vocabulary items are multiple choice with 4 options and the answer position varies", () => {
    const answers = new Set<number>();
    for (const q of p.vocabulary.questions) {
      expect(q.type).toBe("multiple_choice");
      if (q.type === "multiple_choice") { expect(q.options).toHaveLength(4); answers.add(q.answer); }
    }
    expect(answers.size).toBeGreaterThanOrEqual(3);
  });

  it("every item carries the tag of its competency", () => {
    for (const ps of p.reading.passages) for (const q of ps.questions) expect(q.tags).toContain("comp.reading");
    for (const q of p.vocabulary.questions) expect(q.tags).toContain("comp.vocabulary");
    for (const q of p.grammar.questions) expect(q.tags.some((t) => t.startsWith("gram.") || t.startsWith("br."))).toBe(true);
    for (const s of p.listening.scripts) for (const q of s.questions) expect(q.tags).toContain("comp.listening");
  });

  it("listening scripts are about 40 seconds of speech (70–130 words)", () => {
    for (const s of p.listening.scripts) {
      const words = s.lines.map((l) => l.text).join(" ").split(/\s+/).length;
      expect(words, s.id).toBeGreaterThanOrEqual(70);
      expect(words, s.id).toBeLessThanOrEqual(130);
    }
  });

  it("writing model satisfies its own constraints and length, with no BR errors", () => {
    const fb = ruleBasedFeedback(p.writing.model, p.writing, bundle.brErrors);
    expect(fb.withinLength).toBe(true);
    expect(fb.constraints.filter((c) => c.met !== null).every((c) => c.met)).toBe(true);
    expect(fb.findings).toEqual([]);
  });

  it("read-aloud sentences overlap themselves fully", () => {
    for (const s of p.speaking.readAloud) expect(wordOverlap(s, s)).toBe(1);
  });

  it("markdown fields render without leftover asterisks", () => {
    const fields = [p.intro, p.writing.prompt, ...p.reading.passages.filter((x) => x.format === "markdown").map((x) => x.text)];
    for (const text of fields) {
      for (const block of parseMarkdown(text)) {
        const inlines = block.type === "paragraph" ? block.inlines : block.type === "list" ? block.items.flat() : [...block.header.flat(), ...block.rows.flat(2)];
        for (const inline of inlines) expect(inline.text, text.slice(0, 40)).not.toContain("*");
      }
    }
  });
});
