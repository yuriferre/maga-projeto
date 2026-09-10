import type { Competency, Placement, PlacementBlock } from "../shared/schema.ts";
import { placementExercises } from "../shared/schema.ts";
import type { AssessmentRow, AttemptRow, SpeakingRow, WritingRow } from "./repo.ts";
import type { SpeakingMetrics } from "./speaking-metrics.ts";

export type BlockScore = { correct: number; total: number; pct: number };
/** Métricas da fala do teste inicial: `readAloudPct` é `null` quando não houve leitura em voz alta. */
export type PlacementSpeakingMetrics = SpeakingMetrics & { readAloudPct: number | null };
export type PlacementRadar = Record<Competency, number | null>;
export type PlacementResult = {
  version: 1;
  itemCount: number; correct: number; pct: number;
  blocks: Record<PlacementBlock, BlockScore>;
  /** Autoavaliação 1–5 (modo por regras) até a E4. */
  writingScore: number | null;
  speaking: { score: number; readAloudPct: number | null; selfConfidence: number | null } | null;
  level: 1 | 2 | 3;
  radar: PlacementRadar;
  /** Tags com erro ≥ 50% entre as tentativas do teste, mais erros primeiro. */
  weakTags: string[];
  items: Array<{ id: string; block: PlacementBlock; correct: boolean; answer: string | null }>;
  finishedAt: string;
};
export type PlacementInputs = {
  /** Última tentativa por exercício da rodada atual. */
  attempts: Map<string, AttemptRow>;
  writing: WritingRow | undefined;
  speaking: SpeakingRow | undefined;
};
export type PlacementAssessment = { id: number; ts: string; result: PlacementResult };

const BLOCKS: PlacementBlock[] = ["reading", "vocabulary", "grammar", "listening"];

/** Regra de corte (trilha, Nível 0): > 80% e escrita ≥ 4 → 3; ≥ 60% e escrita ≥ 3 → 2; senão 1. */
export function suggestLevel(pct: number, writingScore: number | null): 1 | 2 | 3 {
  if (writingScore === null) return 1;
  if (pct > 0.8 && writingScore >= 4) return 3;
  if (pct >= 0.6 && writingScore >= 3) return 2;
  return 1;
}

export function placementWeakTags(attempts: Iterable<AttemptRow>): string[] {
  const counts = new Map<string, { attempts: number; errors: number }>();
  for (const a of attempts) {
    for (const tag of JSON.parse(a.tags_json) as string[]) {
      const c = counts.get(tag) ?? { attempts: 0, errors: 0 };
      c.attempts++;
      if (a.correct === 0) c.errors++;
      counts.set(tag, c);
    }
  }
  return [...counts.entries()]
    .filter(([, c]) => c.errors / c.attempts >= 0.5)
    .sort((a, b) => b[1].errors - a[1].errors || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
}

/** O que falta para concluir: itens objetivos sem tentativa e escrita sem nota. Fala é opcional. */
export function missingForFinish(placement: Placement, inputs: PlacementInputs): { exercises: string[]; writing: boolean } {
  const exercises = placementExercises(placement).filter(({ exercise }) => !inputs.attempts.has(exercise.id)).map(({ exercise }) => exercise.id);
  const writing = inputs.writing === undefined || inputs.writing.score === null;
  return { exercises, writing };
}

export function computePlacementResult(placement: Placement, inputs: PlacementInputs, finishedAt: string): PlacementResult {
  const all = placementExercises(placement);
  const items = all.map(({ exercise, block }) => {
    const a = inputs.attempts.get(exercise.id);
    return { id: exercise.id, block, correct: a?.correct === 1, answer: a?.answer ?? null };
  });
  const score = (block: PlacementBlock): BlockScore => {
    const mine = items.filter((i) => i.block === block);
    const correct = mine.filter((i) => i.correct).length;
    return { correct, total: mine.length, pct: mine.length === 0 ? 0 : correct / mine.length };
  };
  const blocks = Object.fromEntries(BLOCKS.map((b) => [b, score(b)])) as Record<PlacementBlock, BlockScore>;
  const itemCount = items.length;
  const correct = items.filter((i) => i.correct).length;
  const pct = itemCount === 0 ? 0 : correct / itemCount;
  const writingScore = inputs.writing?.score ?? null;

  let speaking: PlacementResult["speaking"] = null;
  if (inputs.speaking) {
    const metrics = JSON.parse(inputs.speaking.metrics_json) as { readAloudPct?: number | null };
    speaking = { score: inputs.speaking.score ?? 0, readAloudPct: metrics.readAloudPct ?? null, selfConfidence: inputs.speaking.self_confidence };
  }
  const radar: PlacementRadar = {
    REA: blocks.reading.pct,
    VOC: blocks.vocabulary.pct,
    LIS: blocks.listening.pct,
    WRI: writingScore === null ? null : writingScore / 5,
    SPK: speaking ? speaking.score / 5 : null,
    PRO: speaking ? speaking.readAloudPct : null,
    CNF: speaking && speaking.selfConfidence !== null ? speaking.selfConfidence / 5 : null,
  };
  return {
    version: 1, itemCount, correct, pct, blocks, writingScore, speaking,
    level: suggestLevel(pct, writingScore), radar,
    weakTags: placementWeakTags(inputs.attempts.values()), items, finishedAt,
  };
}

export function parsePlacementAssessment(row: AssessmentRow): PlacementAssessment {
  return { id: row.id, ts: row.ts, result: JSON.parse(row.score_json) as PlacementResult };
}
