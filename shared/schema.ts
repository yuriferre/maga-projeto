import { z } from "zod";

// ---------- Taxonomias ----------
export const Competency = z.enum(["VOC", "SPK", "LIS", "PRO", "REA", "WRI", "CNF"]);
export type Competency = z.infer<typeof Competency>;

export const Register = z.enum(["formal", "neutral", "informal"]);
export type Register = z.infer<typeof Register>;

export const TagGroup = z.enum(["comp", "gram", "vocab", "br", "topic"]);
export const TagSchema = z
  .object({ id: z.string().min(3), group: TagGroup, label: z.string().min(1) })
  .refine((t) => t.id.startsWith(`${t.group}.`), { message: "tag id deve começar com '<group>.'" });
export type Tag = z.infer<typeof TagSchema>;
export const TagsFileSchema = z.object({ tags: z.array(TagSchema).min(1) });

export const BlockSchema = z.enum(["warmup", "quiz", "listening", "writing", "speaking", "placement"]);
export type Block = z.infer<typeof BlockSchema>;

// ---------- Exercícios ----------
const exerciseBase = {
  id: z.string().regex(/^[A-Za-z0-9]+(-[A-Za-z0-9]+)+$/, "id no formato M01-02-q1"),
  prompt: z.string().min(1),
  explanation: z.string().min(1),
  tags: z.array(z.string().min(3)).min(1),
};

const multipleChoiceObject = z.object({ ...exerciseBase, type: z.literal("multiple_choice"), options: z.array(z.string().min(1)).min(2), answer: z.number().int().nonnegative() });
const fillBlankObject = z.object({ ...exerciseBase, type: z.literal("fill_blank"), accepted: z.array(z.string().min(1)).min(1) });
const reorderObject = z.object({ ...exerciseBase, type: z.literal("reorder"), tokens: z.array(z.string().min(1)).min(2), answer: z.string().min(1) });

const sameTokens = (tokens: string[], answer: string) => [...tokens].sort().join(" ") === answer.split(" ").sort().join(" ");

export const MultipleChoiceSchema = multipleChoiceObject.refine((e) => e.answer < e.options.length, { message: "answer fora do intervalo de options" });
export const FillBlankSchema = fillBlankObject.refine((e) => e.prompt.includes("___"), { message: "prompt de fill_blank precisa conter ___" });
export const ErrorCorrectionSchema = z.object({ ...exerciseBase, type: z.literal("error_correction"), accepted: z.array(z.string().min(1)).min(1) });
export const ReorderSchema = reorderObject.refine((e) => sameTokens(e.tokens, e.answer), { message: "answer deve usar exatamente os tokens fornecidos" });
export const TranslateSchema = z.object({ ...exerciseBase, type: z.literal("translate"), accepted: z.array(z.string().min(1)).min(1) });
export const MatchSchema = z.object({
  ...exerciseBase,
  type: z.literal("match"),
  pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(2),
});
export const FreeTextSchema = z.object({ ...exerciseBase, type: z.literal("free_text"), minWords: z.number().int().positive().optional(), model: z.string().optional() });

// discriminatedUnion exige ZodObject puros; os refinements são reaplicados no superRefine.
export const ExerciseSchema = z
  .discriminatedUnion("type", [multipleChoiceObject, fillBlankObject, ErrorCorrectionSchema, reorderObject, TranslateSchema, MatchSchema, FreeTextSchema])
  .superRefine((e, ctx) => {
    if (e.type === "multiple_choice" && e.answer >= e.options.length) ctx.addIssue({ code: "custom", message: "answer fora do intervalo de options" });
    if (e.type === "fill_blank" && !e.prompt.includes("___")) ctx.addIssue({ code: "custom", message: "prompt de fill_blank precisa conter ___" });
    if (e.type === "reorder" && !sameTokens(e.tokens, e.answer)) ctx.addIssue({ code: "custom", message: "answer deve usar exatamente os tokens fornecidos" });
  });
export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseType = Exercise["type"];

// ---------- Aula ----------
const line = z.object({ speaker: z.string().min(1), text: z.string().min(1), note: z.string().optional() });

// ---------- Blocos reutilizados por aula e teste inicial ----------
export const WritingSpecSchema = z.object({
  prompt: z.string().min(1),
  constraints: z.array(z.object({ label: z.string().min(1), pattern: z.string().optional() })).default([]),
  rubric: z.array(z.string().min(1)).min(1),
  model: z.string().min(1),
  minWords: z.number().int().positive(),
  maxWords: z.number().int().positive(),
  tags: z.array(z.string().min(3)).default([]),
});
export type WritingSpec = z.infer<typeof WritingSpecSchema>;

export const SpeakingModeASchema = z.object({
  prompt: z.string().min(1),
  maxSeconds: z.number().int().positive(),
  targetPhrases: z.array(z.string().min(1)).min(1),
  checklist: z.array(z.string()).default([]),
});
export type SpeakingModeA = z.infer<typeof SpeakingModeASchema>;

export const LessonSchema = z.object({
  id: z.string().regex(/^M\d{2}-\d{2}$/),
  module: z.string().regex(/^M\d{2}$/),
  order: z.number().int().positive(),
  title: z.string().min(1),
  objective: z.string().min(1),
  durationMin: z.number().int().positive(),
  competencies: z.array(Competency).min(1),
  tags: z.array(z.string().min(3)).min(1),
  prerequisites: z.array(z.string()).default([]),
  context: z.object({ scenario: z.string().min(1), roles: z.array(z.string()).default([]) }),
  vocabulary: z
    .array(z.object({ term: z.string().min(1), meaning: z.string().min(1), example: z.string().min(1), translation: z.string().optional(), note: z.string().optional(), register: Register.default("neutral") }))
    .min(1),
  grammar: z.object({ title: z.string().min(1), explanation: z.string().min(1), examples: z.array(z.object({ en: z.string(), pt: z.string() })).default([]) }).optional(),
  examples: z.array(z.object({ en: z.string().min(1), pt: z.string().min(1), context: z.string().min(1) })).min(1),
  variations: z
    .array(z.object({ idea: z.string().min(1), items: z.array(z.object({ register: z.string().min(1), text: z.string().min(1), adequate: z.boolean(), note: z.string().optional() })).min(1) }))
    .default([]),
  brErrors: z.array(z.object({ wrong: z.string().min(1), right: z.string().min(1), why: z.string().min(1), tag: z.string().min(3) })).default([]),
  dialogue: z.object({ title: z.string().min(1), lines: z.array(line).min(2), notes: z.array(z.string()).default([]) }),
  listening: z.object({ lines: z.array(line).min(1), questions: z.array(ExerciseSchema).min(1) }),
  writing: WritingSpecSchema,
  speaking: z.object({
    modeA: SpeakingModeASchema,
    modeB: z.object({ persona: z.string().min(1), goals: z.array(z.string()).min(1), followUps: z.array(z.string()).min(1), rubric: z.array(z.string()).min(1) }).optional(),
  }),
  quiz: z.array(ExerciseSchema).min(3),
  review: z.object({ count: z.number().int().positive().default(5), preferTags: z.array(z.string()).default([]) }).default({ count: 5, preferTags: [] }),
  srsCards: z.array(z.object({ front: z.string().min(1), back: z.string().min(1), hint: z.string().optional(), tag: z.string().min(3) })).min(1),
  completion: z.object({ quizMin: z.number().min(0).max(1), writingMin: z.number().min(1).max(5), speakingRequired: z.boolean() }),
});
export type Lesson = z.infer<typeof LessonSchema>;

// ---------- Teste inicial (placement) ----------
export const PlacementBlockSchema = z.enum(["reading", "vocabulary", "grammar", "listening"]);
export type PlacementBlock = z.infer<typeof PlacementBlockSchema>;

const passage = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source: z.string().min(1),
  /** markdown passa pelo mini-markdown; pre é renderizado monoespaçado, sem interpretação (logs, erros). */
  format: z.enum(["markdown", "pre"]).default("markdown"),
  text: z.string().min(1),
  questions: z.array(ExerciseSchema).min(1),
});
const script = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  lines: z.array(line).min(1),
  questions: z.array(ExerciseSchema).min(1),
});

export const PlacementSchema = z.object({
  id: z.literal("placement"),
  title: z.string().min(1),
  intro: z.string().min(1),
  durationMin: z.number().int().positive(),
  reading: z.object({ passages: z.array(passage).min(1) }),
  vocabulary: z.object({ intro: z.string().optional(), questions: z.array(ExerciseSchema).min(1) }),
  grammar: z.object({ intro: z.string().optional(), questions: z.array(ExerciseSchema).min(1) }),
  listening: z.object({ scripts: z.array(script).min(1) }),
  writing: WritingSpecSchema,
  speaking: z.object({ readAloud: z.array(z.string().min(1)).min(1), modeA: SpeakingModeASchema }),
});
export type Placement = z.infer<typeof PlacementSchema>;
export type PlacementPassage = Placement["reading"]["passages"][number];
export type PlacementScript = Placement["listening"]["scripts"][number];

/** Todos os exercícios objetivos do teste, na ordem em que aparecem, com o bloco lógico. */
export function placementExercises(p: Placement): Array<{ exercise: Exercise; block: PlacementBlock }> {
  return [
    ...p.reading.passages.flatMap((ps) => ps.questions.map((exercise) => ({ exercise, block: "reading" as const }))),
    ...p.vocabulary.questions.map((exercise) => ({ exercise, block: "vocabulary" as const })),
    ...p.grammar.questions.map((exercise) => ({ exercise, block: "grammar" as const })),
    ...p.listening.scripts.flatMap((s) => s.questions.map((exercise) => ({ exercise, block: "listening" as const }))),
  ];
}

// ---------- Módulo (metadados de avaliação) ----------
export const ModuleFileSchema = z.object({
  id: z.string().regex(/^M\d{2}$/),
  assessment: z.object({ description: z.string().min(1), passPct: z.number().min(0).max(1) }),
});
export type ModuleFile = z.infer<typeof ModuleFileSchema>;

// ---------- Trilha ----------
export const LessonRefSchema = z.object({ id: z.string().regex(/^M\d{2}-\d{2}$/), title: z.string().min(1), simulation: z.boolean().default(false) });
export type LessonRef = z.infer<typeof LessonRefSchema>;
export const ModuleMetaSchema = z.object({
  id: z.string().regex(/^M\d{2}$/),
  title: z.string().min(1),
  objective: z.string().min(1),
  competencies: z.array(Competency).min(1),
  prerequisites: z.array(z.string()).default([]),
  lessons: z.array(LessonRefSchema).min(1),
  completion: z.string().min(1),
  evaluation: z.string().min(1),
});
export type ModuleMeta = z.infer<typeof ModuleMetaSchema>;
export const LevelSchema = z.object({
  id: z.number().int().min(0),
  name: z.string().min(1),
  subtitle: z.string().min(1),
  focus: z.string().min(1),
  exitCriteria: z.string().min(1),
  modules: z.array(ModuleMetaSchema),
});
export type Level = z.infer<typeof LevelSchema>;
export const LevelsFileSchema = z.object({ levels: z.array(LevelSchema).min(1) });
export type LevelsFile = z.infer<typeof LevelsFileSchema>;

// ---------- Catálogo de erros BR ----------
export const BrErrorPatternSchema = z.object({
  id: z.string().min(1),
  pattern: z.string().min(1),
  flags: z.string().default("gi"),
  wrong: z.string().min(1),
  right: z.string().min(1),
  why: z.string().min(1),
  tag: z.string().min(3),
});
export type BrErrorPattern = z.infer<typeof BrErrorPatternSchema>;
export const BrErrorsFileSchema = z.object({ patterns: z.array(BrErrorPatternSchema).min(1) });

// ---------- Glossário ----------
export const GlossaryEntrySchema = z.object({
  term: z.string().min(1),
  /** Significado em português. */
  meaning: z.string().min(1),
  /** Definição curta em inglês. */
  definition: z.string().min(1).optional(),
  examples: z.array(z.object({ en: z.string().min(1), pt: z.string().min(1).optional() })).min(1),
  collocations: z.array(z.string().min(1)).default([]),
  /** Pronúncia aproximada para brasileiros (ex.: "HEDZ-âp"). */
  pronunciation: z.string().min(1).optional(),
  /** Armadilhas: calques e confusões típicas. */
  pitfalls: z.array(z.string().min(1)).default([]),
  register: Register.default("neutral"),
  tags: z.array(z.string().min(3)).min(1),
});
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;
export const GlossaryFileSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  entries: z.array(GlossaryEntrySchema).min(1),
});
export type GlossaryFile = z.infer<typeof GlossaryFileSchema>;

// ---------- Bundle consumido pelo cliente e servidor ----------
export type ContentBundle = {
  levels: Level[];
  lessons: Record<string, Lesson>;
  modules: Record<string, ModuleFile>;
  tags: Tag[];
  brErrors: BrErrorPattern[];
  placement: Placement;
  glossary: GlossaryFile[];
};
