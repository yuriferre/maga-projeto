import raw from "../generated/content.json";
import type { ContentBundle, Exercise, Lesson, LessonRef, Level, ModuleMeta } from "../../shared/schema.ts";

export const content = raw as unknown as ContentBundle;
export const levels: Level[] = content.levels;
export const placement = content.placement;

const tagById = new Map(content.tags.map((t) => [t.id, t]));
/** Rótulo humano de uma tag (ou o próprio id se desconhecida). */
export function tagLabel(id: string): string {
  return tagById.get(id)?.label ?? id;
}

export function getLesson(id: string): Lesson | undefined {
  return content.lessons[id];
}

/** Exercícios respondíveis de uma aula (quiz + listening), na ordem do conteúdo. */
export function lessonExercises(lesson: Lesson): Exercise[] {
  return [...lesson.quiz, ...lesson.listening.questions];
}

export function hasContent(id: string): boolean {
  return id in content.lessons;
}

export function findModule(id: string): { level: Level; module: ModuleMeta } | undefined {
  for (const level of levels) {
    const module = level.modules.find((m) => m.id === id);
    if (module) return { level, module };
  }
  return undefined;
}

export function findLessonRef(id: string): { level: Level; module: ModuleMeta; ref: LessonRef } | undefined {
  for (const level of levels) {
    for (const module of level.modules) {
      const ref = module.lessons.find((l) => l.id === id);
      if (ref) return { level, module, ref };
    }
  }
  return undefined;
}

export const competencyLabel: Record<string, string> = {
  VOC: "Vocabulário", SPK: "Conversação", LIS: "Escuta", PRO: "Pronúncia", REA: "Leitura", WRI: "Escrita", CNF: "Confiança",
};
