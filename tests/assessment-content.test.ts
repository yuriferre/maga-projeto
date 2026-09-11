import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { ruleBasedFeedback } from "../server/writing-feedback.ts";
import { wordOverlap } from "../shared/speech-compare.ts";

const bundle = loadContent("content");
const a = bundle.moduleAssessments["M01"]!;
const m01 = Object.values(bundle.lessons).filter((l) => l.module === "M01");

describe("content/modules/M01/assessment.yaml", () => {
  it("has 15 items mixing at least 4 types, with balanced multiple-choice keys", () => {
    expect(a.items).toHaveLength(15);
    expect(new Set(a.items.map((q) => q.type)).size).toBeGreaterThanOrEqual(4);
    const mc = a.items.filter((q) => q.type === "multiple_choice");
    const counts = new Map<number, number>();
    for (const q of mc) if (q.type === "multiple_choice") counts.set(q.answer, (counts.get(q.answer) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(Math.floor(mc.length * 0.5));
    expect(crossValidate(bundle)).toEqual([]);
  });
  it("covers every gram.* and br.* tag taught in the five M01 lessons", () => {
    const taught = new Set(m01.flatMap((l) => l.tags).filter((t) => t.startsWith("gram.") || t.startsWith("br.")));
    const assessed = new Set(a.items.flatMap((q) => q.tags));
    const missing = [...taught].filter((t) => !assessed.has(t));
    expect(missing, `tags do módulo sem item na avaliação: ${missing.join(", ")}`).toEqual([]);
  });
  it("writing model passes its own constraints and the BR detector; target phrases are clean", () => {
    const fb = ruleBasedFeedback(a.writing.model, a.writing, bundle.brErrors);
    expect(fb.withinLength).toBe(true);
    expect(fb.constraints.filter((c) => c.met !== null).every((c) => c.met)).toBe(true);
    expect(fb.findings).toEqual([]);
    for (const p of a.speaking.targetPhrases) expect(wordOverlap(p, p)).toBe(1);
  });
});
