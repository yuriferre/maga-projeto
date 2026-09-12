import { it, expect } from "vitest";
import { crossValidate } from "../../shared/content-loader.ts";
import { ruleBasedFeedback } from "../../server/writing-feedback.ts";
import { wordOverlap } from "../../shared/speech-compare.ts";
import type { ContentBundle } from "../../shared/schema.ts";

/**
 * Checklist de qualidade de uma avaliação de módulo: 15 itens mistos cobrindo as
 * tags gram.*, br.* e vocab.* ensinadas nas aulas do módulo, stems novos, gabarito de
 * múltipla escolha balanceado e modelos de escrita/fala limpos no motor local.
 */
export function checkAssessment(bundle: ContentBundle, moduleId: string) {
  const a = bundle.moduleAssessments[moduleId]!;
  const lessons = Object.values(bundle.lessons).filter((l) => l.module === moduleId);

  it(`${moduleId} assessment has 15 items mixing at least 4 types, with balanced multiple-choice keys`, () => {
    expect(a).toBeDefined();
    expect(a.items).toHaveLength(15);
    expect(new Set(a.items.map((q) => q.type)).size).toBeGreaterThanOrEqual(4);
    const mc = a.items.filter((q) => q.type === "multiple_choice");
    const counts = new Map<number, number>();
    for (const q of mc) if (q.type === "multiple_choice") counts.set(q.answer, (counts.get(q.answer) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(Math.floor(mc.length * 0.5));
    expect(crossValidate(bundle)).toEqual([]);
  });

  it(`${moduleId} assessment covers gram.*, br.* and vocab.* from lesson metadata and actual exercises`, () => {
    const taught = new Set(lessons.flatMap((l) => [
      ...l.tags,
      ...l.quiz.flatMap((q) => q.tags),
      ...l.listening.questions.flatMap((q) => q.tags),
    ]).filter((t) => /^(gram|br|vocab)\./.test(t)));
    const assessed = new Set(a.items.flatMap((q) => q.tags));
    const missing = [...taught].filter((t) => !assessed.has(t));
    expect(missing, `tags do módulo sem item na avaliação: ${missing.join(", ")}`).toEqual([]);
  });

  it(`${moduleId} assessment uses new stems instead of repeating lesson questions`, () => {
    const lessonPrompts = new Set(lessons.flatMap((l) => [...l.quiz, ...l.listening.questions]).map((q) => q.prompt));
    expect(a.items.filter((q) => lessonPrompts.has(q.prompt)).map((q) => q.id)).toEqual([]);
  });

  it(`${moduleId} writing model passes its own constraints and the BR detector; target phrases are clean`, () => {
    const fb = ruleBasedFeedback(a.writing.model, a.writing, bundle.brErrors);
    expect(fb.withinLength).toBe(true);
    expect(fb.constraints.filter((c) => c.met !== null).every((c) => c.met)).toBe(true);
    expect(fb.findings).toEqual([]);
    for (const p of a.speaking.targetPhrases) expect(wordOverlap(p, p)).toBe(1);
  });
}

/**
 * Mesma checklist, para a avaliação de nível: os itens cobrem as tags
 * gram./br./vocab. de todas as aulas dos módulos do nível, com stems novos.
 */
export function checkLevelAssessment(bundle: ContentBundle, levelId: number, itemsCount: number) {
  const a = bundle.levelAssessments[`L${levelId}`]!;
  const moduleIds = new Set(bundle.levels.find((l) => l.id === levelId)!.modules.map((m) => m.id));
  const lessons = Object.values(bundle.lessons).filter((l) => moduleIds.has(l.module));

  it(`L${levelId} assessment has ${itemsCount} items mixing at least 4 types, with balanced multiple-choice keys`, () => {
    expect(a).toBeDefined();
    expect(a.items).toHaveLength(itemsCount);
    expect(new Set(a.items.map((q) => q.type)).size).toBeGreaterThanOrEqual(4);
    const mc = a.items.filter((q) => q.type === "multiple_choice");
    const counts = new Map<number, number>();
    for (const q of mc) if (q.type === "multiple_choice") counts.set(q.answer, (counts.get(q.answer) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(Math.floor(mc.length * 0.5));
    expect(crossValidate(bundle)).toEqual([]);
  });

  it(`L${levelId} assessment covers gram.*, br.* and vocab.* from every lesson of the level`, () => {
    const taught = new Set(lessons.flatMap((l) => [
      ...l.tags,
      ...l.quiz.flatMap((q) => q.tags),
      ...l.listening.questions.flatMap((q) => q.tags),
    ]).filter((t) => /^(gram|br|vocab)\./.test(t)));
    const assessed = new Set(a.items.flatMap((q) => q.tags));
    const missing = [...taught].filter((t) => !assessed.has(t));
    expect(missing, `tags do nível sem item na avaliação: ${missing.join(", ")}`).toEqual([]);
  });

  it(`L${levelId} assessment uses new stems instead of repeating lesson or module-assessment questions`, () => {
    const lessonPrompts = new Set(lessons.flatMap((l) => [...l.quiz, ...l.listening.questions]).map((q) => q.prompt));
    const assessmentPrompts = new Set([...moduleIds].flatMap((m) => bundle.moduleAssessments[m]?.items ?? []).map((q) => q.prompt));
    expect(a.items.filter((q) => lessonPrompts.has(q.prompt) || assessmentPrompts.has(q.prompt)).map((q) => q.id)).toEqual([]);
  });

  it(`L${levelId} writing model passes its own constraints and the BR detector; target phrases are clean`, () => {
    const fb = ruleBasedFeedback(a.writing.model, a.writing, bundle.brErrors);
    expect(fb.withinLength).toBe(true);
    expect(fb.constraints.filter((c) => c.met !== null).every((c) => c.met)).toBe(true);
    expect(fb.findings).toEqual([]);
    for (const p of a.speaking.targetPhrases) expect(wordOverlap(p, p)).toBe(1);
  });
}
