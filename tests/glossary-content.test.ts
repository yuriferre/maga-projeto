import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { buildGlossary, matches, normalize } from "../shared/glossary.ts";

const bundle = loadContent("content");
const daily = bundle.glossary.find((g) => g.id === "daily")!;
const items = buildGlossary(bundle);

describe("content/glossary/daily.yaml", () => {
  it("has at least 20 curated entries with meaning, example and known tags", () => {
    expect(daily).toBeDefined();
    expect(daily.entries.length).toBeGreaterThanOrEqual(20);
    for (const e of daily.entries) {
      expect(e.meaning.length, e.term).toBeGreaterThan(0);
      expect(e.examples.length, e.term).toBeGreaterThanOrEqual(1);
      expect(e.tags.length, e.term).toBeGreaterThanOrEqual(1);
    }
    expect(crossValidate(bundle)).toEqual([]);
  });
  it("has unique terms (case-insensitive)", () => {
    const terms = daily.entries.map((e) => e.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
  });
  it("crossValidate reports a duplicated term and an unknown tag", () => {
    const broken = structuredClone(bundle);
    const g = broken.glossary[0]!;
    g.entries.push({ ...g.entries[0]!, term: g.entries[0]!.term.toUpperCase(), tags: ["vocab.nope"] });
    const problems = crossValidate(broken);
    expect(problems.some((p) => p.includes("termo duplicado"))).toBe(true);
    expect(problems.some((p) => p.includes("vocab.nope"))).toBe(true);
  });
});

describe("buildGlossary", () => {
  it("merges curated entries with every lesson's vocabulary and sorts by term", () => {
    const themed = items.filter((i) => i.source.kind === "theme");
    const fromLesson = items.filter((i) => i.source.kind === "lesson");
    expect(themed).toHaveLength(daily.entries.length);
    expect(fromLesson).toHaveLength(bundle.lessons["M01-02"]!.vocabulary.length);
    expect(fromLesson[0]!.source).toEqual({ kind: "lesson", id: "M01-02", label: "Aula M01-02" });
    expect(fromLesson.every((i) => i.tags.length > 0 && i.examples.length === 1)).toBe(true);
    const terms = items.map((i) => normalize(i.term));
    expect(terms).toEqual([...terms].sort());
  });
  it("gives lesson items the lesson's vocab.* tags and the note as pitfall", () => {
    const item = items.find((i) => i.source.kind === "lesson" && i.term.startsWith("I've been working on"))!;
    expect(item.tags).toEqual(["vocab.standup"]);
    expect(item.pitfalls).toEqual(['Nunca "I\'m working on X since yesterday".']);
    expect(item.examples[0]!.pt).toContain("migração");
  });
});

describe("normalize / matches", () => {
  it("ignores accents and case", () => {
    expect(normalize("Ação É")).toBe("acao e");
  });
  it("searches term, meaning, definition, examples and collocations", () => {
    const headsUp = items.find((i) => i.term === "heads up")!;
    expect(matches(headsUp, "")).toBe(true);
    expect(matches(headsUp, "HEADS")).toBe(true);
    expect(matches(headsUp, "aviso")).toBe(true);
    expect(matches(headsUp, "deploy window")).toBe(true);
    expect(matches(headsUp, "just a heads up")).toBe(true);
    expect(matches(headsUp, "kubernetes")).toBe(false);
  });
});
