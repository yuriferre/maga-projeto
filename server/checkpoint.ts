import type { Db } from "./db.ts";
import { latestAssessment } from "./repo.ts";

const FOUR_WEEKS_MS = 28 * 864e5;

/**
 * Checkpoint de 4 semanas (spec): vence 28 dias após a avaliação mais recente
 * entre o teste inicial e checkpoints anteriores. Sem teste inicial, nunca vence.
 */
export function checkpointDue(db: Db, now: Date): { due: boolean; lastAt: string | null; nextAt: string | null } {
  const last = [
    latestAssessment(db, "placement", "placement")?.ts,
    latestAssessment(db, "checkpoint", "checkpoint")?.ts,
  ].filter((t): t is string => !!t).sort().at(-1) ?? null;
  if (!last) return { due: false, lastAt: null, nextAt: null };
  const nextAt = new Date(Date.parse(last) + FOUR_WEEKS_MS).toISOString();
  return { due: now.getTime() >= Date.parse(nextAt), lastAt: last, nextAt };
}
