import raw from "../generated/content.json";
import type { ContentBundle, Lesson, LessonRef, Level, ModuleMeta } from "../../shared/schema.ts";

export const content = raw as unknown as ContentBundle;
export const levels: Level[] = content.levels;

export function getLesson(id: string): Lesson | undefined {
  return content.lessons[id];
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
