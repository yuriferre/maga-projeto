import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { z } from "zod";
import {
  BrErrorsFileSchema, LessonSchema, LevelsFileSchema, ModuleFileSchema, PlacementSchema, TagsFileSchema, placementExercises,
  type ContentBundle, type Exercise, type Lesson, type ModuleFile,
} from "./schema.ts";

function readYaml<S extends z.ZodType>(path: string, schema: S, problems: string[]): z.infer<S> | undefined {
  const raw = parse(readFileSync(path, "utf8"));
  const result = schema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) problems.push(`${path}: ${issue.path.join(".") || "(raiz)"} — ${issue.message}`);
    return undefined;
  }
  return result.data;
}

/** Lê todo o diretório content/ e valida cada arquivo pelo schema. Lança Error listando todos os problemas. */
export function loadContent(root: string): ContentBundle {
  const problems: string[] = [];
  const levels = readYaml(join(root, "levels.yaml"), LevelsFileSchema, problems);
  const tags = readYaml(join(root, "tags.yaml"), TagsFileSchema, problems);
  const brErrors = readYaml(join(root, "br-errors.yaml"), BrErrorsFileSchema, problems);
  const placement = readYaml(join(root, "placement", "placement.yaml"), PlacementSchema, problems);

  const lessons: Record<string, Lesson> = {};
  const modules: Record<string, ModuleFile> = {};
  const modulesDir = join(root, "modules");
  if (existsSync(modulesDir)) {
    for (const moduleId of readdirSync(modulesDir).filter((d) => statSync(join(modulesDir, d)).isDirectory()).sort()) {
      const moduleFile = join(modulesDir, moduleId, "module.yaml");
      if (existsSync(moduleFile)) {
        const mod = readYaml(moduleFile, ModuleFileSchema, problems);
        if (mod) modules[mod.id] = mod;
      }
      const lessonsDir = join(modulesDir, moduleId, "lessons");
      if (!existsSync(lessonsDir)) continue;
      for (const file of readdirSync(lessonsDir).filter((f) => f.endsWith(".yaml")).sort()) {
        const lesson = readYaml(join(lessonsDir, file), LessonSchema, problems);
        if (lesson) lessons[lesson.id] = lesson;
      }
    }
  }

  if (problems.length > 0 || !levels || !tags || !brErrors || !placement) {
    throw new Error(`Conteúdo inválido:\n- ${problems.join("\n- ")}`);
  }
  return { levels: levels.levels, lessons, modules, tags: tags.tags, brErrors: brErrors.patterns, placement };
}

export function allExercises(lesson: Lesson): Array<{ exercise: Exercise; block: "quiz" | "listening" }> {
  return [
    ...lesson.quiz.map((exercise) => ({ exercise, block: "quiz" as const })),
    ...lesson.listening.questions.map((exercise) => ({ exercise, block: "listening" as const })),
  ];
}

function checkExerciseShape(exercise: Exercise, problems: string[]): void {
  if (exercise.type === "match") {
    const rights = exercise.pairs.map((p) => p.right);
    if (new Set(rights).size !== rights.length) problems.push(`exercício '${exercise.id}': valores 'right' duplicados em match`);
  }
  if (exercise.type === "fill_blank") {
    const blanks = exercise.prompt.split("___").length - 1;
    if (blanks !== 1) problems.push(`exercício '${exercise.id}': fill_blank precisa de exatamente um ___`);
  }
}

/** Verificações entre arquivos. Retorna lista de problemas legíveis (vazia = ok). */
export function crossValidate(bundle: ContentBundle): string[] {
  const problems: string[] = [];
  const tagIds = new Set(bundle.tags.map((t) => t.id));
  const checkTags = (where: string, tags: string[]) => {
    for (const t of tags) if (!tagIds.has(t)) problems.push(`${where}: tag desconhecida '${t}'`);
  };
  const seenExercise = new Set<string>();

  const roadmapLessonIds = new Set<string>();
  const roadmapModuleIds = new Set<string>();
  for (const level of bundle.levels) {
    for (const mod of level.modules) {
      if (roadmapModuleIds.has(mod.id)) problems.push(`levels.yaml: módulo duplicado '${mod.id}'`);
      roadmapModuleIds.add(mod.id);
      for (const ref of mod.lessons) {
        if (roadmapLessonIds.has(ref.id)) problems.push(`levels.yaml: aula duplicada '${ref.id}'`);
        roadmapLessonIds.add(ref.id);
        if (!ref.id.startsWith(`${mod.id}-`)) problems.push(`levels.yaml: aula '${ref.id}' listada fora do módulo '${mod.id}'`);
      }
    }
  }

  for (const lesson of Object.values(bundle.lessons)) {
    const where = `aula ${lesson.id}`;
    if (!roadmapLessonIds.has(lesson.id)) problems.push(`${where}: não está listada em levels.yaml`);
    if (!lesson.id.startsWith(`${lesson.module}-`)) problems.push(`${where}: campo module '${lesson.module}' não bate com o id`);
    if (lesson.writing.minWords > lesson.writing.maxWords) problems.push(`${where}: writing.minWords > maxWords`);
    checkTags(where, lesson.tags);
    checkTags(`${where}.writing`, lesson.writing.tags);
    checkTags(`${where}.review`, lesson.review.preferTags);
    for (const e of lesson.brErrors) checkTags(`${where}.brErrors`, [e.tag]);
    for (const c of lesson.srsCards) checkTags(`${where}.srsCards`, [c.tag]);
    for (const { exercise, block } of allExercises(lesson)) {
      if (seenExercise.has(exercise.id)) problems.push(`${where}: exercício duplicado '${exercise.id}'`);
      seenExercise.add(exercise.id);
      if (!exercise.id.startsWith(`${lesson.id}-`)) problems.push(`${where}: exercício '${exercise.id}' (${block}) deveria começar com '${lesson.id}-'`);
      checkTags(`${where}.${block}.${exercise.id}`, exercise.tags);
      checkExerciseShape(exercise, problems);
    }
  }

  const pl = bundle.placement;
  checkTags("placement.writing", pl.writing.tags);
  if (pl.writing.minWords > pl.writing.maxWords) problems.push("placement: writing.minWords > maxWords");
  for (const { exercise, block } of placementExercises(pl)) {
    if (seenExercise.has(exercise.id)) problems.push(`placement: exercício duplicado '${exercise.id}'`);
    seenExercise.add(exercise.id);
    if (!exercise.id.startsWith("PL-")) problems.push(`placement: exercício '${exercise.id}' (${block}) deveria começar com 'PL-'`);
    checkTags(`placement.${block}.${exercise.id}`, exercise.tags);
    checkExerciseShape(exercise, problems);
  }

  for (const mod of Object.values(bundle.modules)) {
    if (!roadmapModuleIds.has(mod.id)) problems.push(`module.yaml ${mod.id}: módulo não existe em levels.yaml`);
  }
  for (const p of bundle.brErrors) {
    checkTags(`br-errors.${p.id}`, [p.tag]);
    try { new RegExp(p.pattern, p.flags); } catch (err) { problems.push(`br-errors.${p.id}: regex inválida (${(err as Error).message})`); }
  }
  return problems;
}
