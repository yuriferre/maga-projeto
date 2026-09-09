import type { Db } from "./db.ts";
import type { ContentBundle, Exercise } from "../shared/schema.ts";
import { allExercises } from "../shared/content-loader.ts";
import { listProgress, tagStats } from "./repo.ts";

const DAY = 864e5;

/** Tags fracas: taxa de erro > 40% com ≥ 3 tentativas em 30 dias, ou ≥ 3 erros nos últimos 7 dias. */
export function weakTags(db: Db, now: Date): string[] {
  const s30 = tagStats(db, new Date(now.getTime() - 30 * DAY).toISOString());
  const s7 = tagStats(db, new Date(now.getTime() - 7 * DAY).toISOString());
  const weak = new Set<string>();
  for (const t of s30) if (t.attempts >= 3 && t.errorRate > 0.4) weak.add(t.tag);
  for (const t of s7) if (t.errors >= 3) weak.add(t.tag);
  return [...weak];
}

type Candidate = { exercise: Exercise; lessonId: string; completedAt: string };

function shuffled<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Warm-up da aula: até 3 itens de tags fracas, até 1 item de aulas concluídas há ~3, ~7 e ~21 dias,
 * completando com itens aleatórios do pool. Nunca usa a aula atual. Só aulas concluídas com conteúdo.
 */
export function selectWarmup(db: Db, content: ContentBundle, lessonId: string, now: Date = new Date(), rng: () => number = Math.random): Exercise[] {
  const lesson = content.lessons[lessonId];
  if (!lesson) return [];
  const count = lesson.review.count;

  const completed = listProgress(db).filter((p) => p.status === "completed" && p.lesson_id !== lessonId && content.lessons[p.lesson_id]);
  if (completed.length === 0) return [];

  const pool: Candidate[] = completed.flatMap((p) =>
    allExercises(content.lessons[p.lesson_id]!).map(({ exercise }) => ({ exercise, lessonId: p.lesson_id, completedAt: p.completed_at ?? p.started_at })),
  );

  const weak = new Set([...weakTags(db, now), ...lesson.review.preferTags]);
  const chosen: Exercise[] = [];
  const used = new Set<string>();
  const take = (candidates: Candidate[], limit: number) => {
    for (const c of shuffled(candidates, rng)) {
      if (chosen.length >= limit) return;
      if (used.has(c.exercise.id)) continue;
      used.add(c.exercise.id);
      chosen.push(c.exercise);
    }
  };

  take(pool.filter((c) => c.exercise.tags.some((t) => weak.has(t))), Math.min(3, count));

  for (const days of [3, 7, 21]) {
    const target = chosen.length + 1;
    if (target > count) break;
    const window = pool.filter((c) => {
      const ageDays = (now.getTime() - new Date(c.completedAt).getTime()) / DAY;
      return Math.abs(ageDays - days) <= 1.5;
    });
    take(window, target);
  }

  take(pool, count);
  return chosen.slice(0, count);
}
