import type { ContentBundle, Exercise, PassRule } from "../shared/schema.ts";
import type { AssessmentRow, AttemptRow, LessonProgressRow, SpeakingRow, WritingRow } from "./repo.ts";

export type AssessmentKind = "module" | "level";
export type AssessmentSpec = { kind: AssessmentKind; ref: string; items: Exercise[]; pass: PassRule };
export type AssessmentInputs = { attempts: Map<string, AttemptRow>; writing: WritingRow | undefined; speaking: SpeakingRow | undefined };
export type AssessmentMissing = { exercises: string[]; writing: boolean; speaking: boolean };
export type AssessmentResult = {
  version: 1;
  kind: AssessmentKind;
  ref: string;
  itemCount: number; correct: number; itemsPct: number;
  /** Autoavaliação 1–5 da escrita (sem LLM). */
  writingScore: number | null;
  /** Nota do modo A (1–5). */
  speakingScore: number | null;
  passed: boolean;
  pass: PassRule;
  /** Tags com erro ≥ 50 % entre os itens, mais erros primeiro. */
  weakTags: string[];
  items: Array<{ id: string; correct: boolean; answer: string | null }>;
  finishedAt: string;
};
export type AssessmentRecord = { id: number; ts: string; result: AssessmentResult };

/** Itens sem tentativa, escrita sem nota e fala ausente. Os três são obrigatórios para concluir. */
export function missingForAssessment(spec: AssessmentSpec, inputs: AssessmentInputs): AssessmentMissing {
  return {
    exercises: spec.items.filter((q) => !inputs.attempts.has(q.id)).map((q) => q.id),
    writing: inputs.writing === undefined || inputs.writing.score === null,
    speaking: inputs.speaking === undefined || inputs.speaking.score === null,
  };
}

function weakTagsOf(attempts: Iterable<AttemptRow>): string[] {
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
    .sort((x, y) => y[1].errors - x[1].errors || x[0].localeCompare(y[0]))
    .map(([tag]) => tag);
}

/** Regra de aprovação (spec §3): itens ≥ itemsMin E escrita ≥ writingMin E fala ≥ speakingMin. */
export function computeAssessmentResult(spec: AssessmentSpec, inputs: AssessmentInputs, finishedAt: string): AssessmentResult {
  const items = spec.items.map((q) => {
    const a = inputs.attempts.get(q.id);
    return { id: q.id, correct: a?.correct === 1, answer: a?.answer ?? null };
  });
  const itemCount = items.length;
  const correct = items.filter((i) => i.correct).length;
  const itemsPct = itemCount === 0 ? 0 : correct / itemCount;
  const writingScore = inputs.writing?.score ?? null;
  const speakingScore = inputs.speaking?.score ?? null;
  const passed = itemsPct >= spec.pass.itemsMin && writingScore !== null && writingScore >= spec.pass.writingMin && speakingScore !== null && speakingScore >= spec.pass.speakingMin;
  return { version: 1, kind: spec.kind, ref: spec.ref, itemCount, correct, itemsPct, writingScore, speakingScore, passed, pass: spec.pass, weakTags: weakTagsOf(inputs.attempts.values()), items, finishedAt };
}

export function parseAssessmentRecord(row: AssessmentRow): AssessmentRecord {
  return { id: row.id, ts: row.ts, result: JSON.parse(row.score_json) as AssessmentResult };
}

/** Aulas do módulo que têm conteúdo e ainda não foram concluídas. Módulo sem conteúdo → tudo zero. */
export function moduleEligibility(content: Pick<ContentBundle, "levels" | "lessons">, progress: LessonProgressRow[], moduleId: string): { lessonsTotal: number; lessonsDone: number; missing: string[] } {
  const done = new Set(progress.filter((p) => p.status === "completed").map((p) => p.lesson_id));
  const refs = content.levels.flatMap((l) => l.modules).find((m) => m.id === moduleId)?.lessons ?? [];
  const withContent = refs.map((r) => r.id).filter((id) => id in content.lessons);
  const missing = withContent.filter((id) => !done.has(id));
  return { lessonsTotal: withContent.length, lessonsDone: withContent.length - missing.length, missing };
}

/** Módulos do nível cuja última avaliação de módulo passou. Nível sem avaliações → tudo pendente. */
export function levelEligibility(content: Pick<ContentBundle, "levels">, assessments: AssessmentRow[], levelId: number): { modulesTotal: number; modulesDone: number; missing: string[] } {
  const refs = content.levels.find((l) => l.id === levelId)?.modules.map((m) => m.id) ?? [];
  const latest = new Map<string, AssessmentRow>();
  for (const row of assessments.filter((a) => a.kind === "module" && refs.includes(a.ref))) {
    const cur = latest.get(row.ref);
    if (!cur || row.ts > cur.ts || (row.ts === cur.ts && row.id > cur.id)) latest.set(row.ref, row);
  }
  const missing = refs.filter((id) => {
    const row = latest.get(id);
    return !row || !(JSON.parse(row.score_json) as AssessmentResult).passed;
  });
  return { modulesTotal: refs.length, modulesDone: refs.length - missing.length, missing };
}
