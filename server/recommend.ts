import type { Db } from "./db.ts";
import type { ContentBundle } from "../shared/schema.ts";
import { allExercises } from "../shared/content-loader.ts";
import { listProgress, tagStats } from "./repo.ts";
import { weakTags } from "./warmup.ts";

export type Recommendation =
  | { kind: "review-lesson"; lessonId: string; tags: string[] }
  | { kind: "review-tag"; tag: string }
  | { kind: "next"; lessonId: string | null };

/** Primeira aula com conteúdo não concluída, na ordem da trilha (nível → módulo → aula). */
export function nextLessonId(content: ContentBundle, db: Db): string | null {
  const done = new Set(listProgress(db).filter((p) => p.status === "completed").map((p) => p.lesson_id));
  for (const level of content.levels) {
    for (const module of level.modules) {
      for (const ref of module.lessons) {
        if (content.lessons[ref.id] && !done.has(ref.id)) return ref.id;
      }
    }
  }
  return null;
}

/**
 * Recomendação diária (spec): "refazer exercícios de aula Y" quando ≥ 2 tags fracas
 * ligadas à próxima aula — o alvo é a aula concluída que mais cobre essas tags (ou a
 * própria próxima aula se nenhuma concluída cobrir). Com tags fracas de fora da
 * próxima aula, "revisar tag X" (a com mais erros). Sem fraquezas, a próxima aula.
 */
export function recommendation(db: Db, content: ContentBundle, now: Date): Recommendation {
  const weak = weakTags(db, now);
  const next = nextLessonId(content, db);
  if (weak.length === 0) return { kind: "next", lessonId: next };

  if (next) {
    const nextTags = new Set(allExercises(content.lessons[next]!).flatMap((e) => e.exercise.tags));
    const weakOnNext = weak.filter((t) => nextTags.has(t));
    if (weakOnNext.length >= 2) {
      const done = new Set(listProgress(db).filter((p) => p.status === "completed").map((p) => p.lesson_id));
      const weakSet = new Set(weakOnNext);
      let best: { id: string; cover: number } = { id: next, cover: 0 };
      for (const id of done) {
        if (!content.lessons[id]) continue;
        const cover = new Set(allExercises(content.lessons[id]!).flatMap((e) => e.exercise.tags).filter((t) => weakSet.has(t))).size;
        if (cover > best.cover) best = { id, cover };
      }
      return { kind: "review-lesson", lessonId: best.id, tags: weakOnNext };
    }
  }

  const stats = tagStats(db, new Date(now.getTime() - 30 * 864e5).toISOString());
  const weakest = stats.filter((s) => weak.includes(s.tag)).sort((a, b) => b.errors - a.errors)[0];
  return { kind: "review-tag", tag: weakest?.tag ?? weak[0]! };
}
