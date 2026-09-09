import type { BrErrorPattern, SpeakingModeA } from "../shared/schema.ts";
import { detectBrErrors, type Finding } from "../shared/br-detector.ts";
import { tokenizeWords, matchTargetPhrases, wordsPerMinute } from "../shared/speech-compare.ts";

export type SpeakingMetrics = {
  wordCount: number; durationSec: number; wpm: number;
  used: string[]; missing: string[];
  findings: Finding[];
  withinTime: boolean;
  score: number;
};

/**
 * Nota 1–5 (modo A, sem LLM):
 *   base 1
 *   + expressões-alvo usadas: ≥4 → 1,5 · ≥2 → 1 · ≥1 → 0,5
 *   + erros BR: 0 → 1,5 · ≤2 → 0,5
 *   + dentro do tempo → 0,5
 *   + ritmo 90–170 palavras/min → 0,5
 *   Menos de 10 palavras: nota máxima 2.
 */
export function computeSpeakingMetrics(transcript: string, durationSec: number, spec: SpeakingModeA, patterns: BrErrorPattern[]): SpeakingMetrics {
  const words = tokenizeWords(transcript);
  const { used, missing } = matchTargetPhrases(transcript, spec.targetPhrases);
  const findings = detectBrErrors(transcript, patterns);
  const wpm = wordsPerMinute(words.length, durationSec);
  const withinTime = durationSec <= spec.maxSeconds;

  let score = 1;
  score += used.length >= 4 ? 1.5 : used.length >= 2 ? 1 : used.length >= 1 ? 0.5 : 0;
  score += findings.length === 0 ? 1.5 : findings.length <= 2 ? 0.5 : 0;
  score += withinTime ? 0.5 : 0;
  score += wpm >= 90 && wpm <= 170 ? 0.5 : 0;
  score = Math.min(5, Math.round(score * 2) / 2);
  if (words.length < 10) score = Math.min(score, 2);

  return { wordCount: words.length, durationSec, wpm, used, missing, findings, withinTime, score };
}
