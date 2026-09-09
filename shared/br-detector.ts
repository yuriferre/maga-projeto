import type { BrErrorPattern } from "./schema.ts";

export type Finding = {
  id: string;
  match: string;
  index: number;
  wrong: string;
  right: string;
  why: string;
  tag: string;
};

/** Aplica cada regex do catálogo ao texto e devolve todos os matches, ordenados por posição. */
export function detectBrErrors(text: string, patterns: BrErrorPattern[]): Finding[] {
  const findings: Finding[] = [];
  for (const p of patterns) {
    const flags = p.flags.includes("g") ? p.flags : `${p.flags}g`;
    const re = new RegExp(p.pattern, flags);
    for (const m of text.matchAll(re)) {
      findings.push({ id: p.id, match: m[0], index: m.index ?? 0, wrong: p.wrong, right: p.right, why: p.why, tag: p.tag });
    }
  }
  return findings.sort((a, b) => a.index - b.index);
}
