import { describe, it, expect } from "vitest";
import { loadContent, crossValidate, allExercises } from "../shared/content-loader.ts";
import { parseMarkdown } from "../shared/mini-markdown.ts";

describe("loadContent(content/)", () => {
  const bundle = loadContent("content");

  it("loads the full roadmap: 5 levels, 32 modules, 157 lessons", () => {
    expect(bundle.levels).toHaveLength(5);
    const modules = bundle.levels.flatMap((l) => l.modules);
    expect(modules).toHaveLength(32);
    expect(modules.flatMap((m) => m.lessons)).toHaveLength(157);
  });

  it("loads lesson M01-02 with the counts from the spec", () => {
    const lesson = bundle.lessons["M01-02"]!;
    expect(lesson.title).toBe("Reportando progresso, atraso e bloqueio no daily");
    expect(lesson.vocabulary).toHaveLength(16);
    expect(lesson.brErrors).toHaveLength(11);
    expect(lesson.listening.questions).toHaveLength(6);
    expect(lesson.quiz).toHaveLength(8);
    expect(lesson.srsCards).toHaveLength(12);
    expect(lesson.dialogue.lines).toHaveLength(8);
    expect(lesson.completion).toEqual({ quizMin: 0.75, writingMin: 3, speakingRequired: true });
    expect(lesson.examples[4]!.en).toMatch(/haven't heard back yet\.$/);
  });

  it("renders lesson markdown fields without leftover asterisks", () => {
    const lesson = bundle.lessons["M01-02"]!;
    const fields = [lesson.context.scenario, lesson.writing.prompt, lesson.grammar?.explanation ?? ""];
    for (const text of fields) {
      for (const block of parseMarkdown(text)) {
        const inlines = block.type === "paragraph" ? block.inlines : block.type === "list" ? block.items.flat() : [...block.header.flat(), ...block.rows.flat(2)];
        for (const inline of inlines) expect(inline.text, text.slice(0, 40)).not.toContain("*");
      }
    }
  });

  it("passes cross-validation", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });

  it("allExercises returns quiz + listening with their block", () => {
    const items = allExercises(bundle.lessons["M01-02"]!);
    expect(items.filter((i) => i.block === "quiz")).toHaveLength(8);
    expect(items.filter((i) => i.block === "listening")).toHaveLength(6);
  });

  it("loads the curated glossary themes", () => {
    expect(bundle.glossary.map((g) => g.id)).toEqual(["daily"]);
  });
});

describe("crossValidate", () => {
  it("reports unknown tags and duplicate exercise ids", () => {
    const bundle = loadContent("content");
    const lesson = structuredClone(bundle.lessons["M01-02"]!);
    lesson.quiz[0]!.tags = ["gram.does-not-exist"];
    lesson.quiz[1]!.id = lesson.quiz[2]!.id;
    const problems = crossValidate({ ...bundle, lessons: { ...bundle.lessons, "M01-02": lesson } });
    expect(problems.some((p) => p.includes("gram.does-not-exist"))).toBe(true);
    expect(problems.some((p) => p.includes("duplicad"))).toBe(true);
  });

  it("reports duplicate match rights and a wrong number of fill_blank placeholders", () => {
    const bundle = loadContent("content");
    const lesson = structuredClone(bundle.lessons["M01-02"]!);
    lesson.quiz.push(
      { id: `${lesson.id}-dup-match`, prompt: "p", explanation: "e", tags: ["topic.daily"], type: "match", pairs: [{ left: "a", right: "x" }, { left: "b", right: "x" }] },
      { id: `${lesson.id}-dup-fill`, prompt: "one ___ two ___", explanation: "e", tags: ["topic.daily"], type: "fill_blank", accepted: ["y"] },
    );
    const problems = crossValidate({ ...bundle, lessons: { ...bundle.lessons, "M01-02": lesson } });
    expect(problems.some((p) => p.includes("valores 'right' duplicados em match"))).toBe(true);
    expect(problems.some((p) => p.includes("fill_blank precisa de exatamente um ___"))).toBe(true);
  });
});
