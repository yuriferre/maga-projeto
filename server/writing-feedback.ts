import type { BrErrorPattern, WritingSpec } from "../shared/schema.ts";
import { detectBrErrors, type Finding } from "../shared/br-detector.ts";

export type ConstraintCheck = { label: string; met: boolean | null };
export type WritingFeedback = {
  mode: "rules";
  wordCount: number; withinLength: boolean; minWords: number; maxWords: number;
  constraints: ConstraintCheck[];
  findings: Finding[];
  model: string;
  rubric: string[];
  score: number | null;
};

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Feedback sem LLM: tamanho, restrições por regex, erros BR, modelo e rubrica. A nota é a autoavaliação (1–5), se enviada. */
export function ruleBasedFeedback(text: string, spec: WritingSpec, patterns: BrErrorPattern[], selfScore?: number): WritingFeedback {
  const wordCount = countWords(text);
  const { minWords, maxWords, constraints, model, rubric } = spec;
  const checks: ConstraintCheck[] = constraints.map((c) => ({
    label: c.label,
    met: c.pattern ? new RegExp(c.pattern, "i").test(text) : null,
  }));
  const score = selfScore === undefined ? null : Math.min(5, Math.max(1, selfScore));
  return {
    mode: "rules",
    wordCount, withinLength: wordCount >= minWords && wordCount <= maxWords, minWords, maxWords,
    constraints: checks,
    findings: detectBrErrors(text, patterns),
    model, rubric, score,
  };
}
