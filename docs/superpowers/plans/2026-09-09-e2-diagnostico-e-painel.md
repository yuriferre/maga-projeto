# E2 — Diagnóstico e painel: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o teste inicial de nível jogável ponta a ponta (6 blocos, nível sugerido, radar e tags fracas), o painel v1 na rota raiz (radar 30 dias, heatmap de tags, streak, meta semanal, linha do tempo) e metas semanais com minutos rastreados por sessões de estudo.

**Architecture:** O teste é conteúdo próprio (`content/placement/placement.yaml`, `PlacementSchema`) e suas respostas vão para a tabela `attempts` com `lesson_id='placement'` e `block='placement'`, para que `tagStats`, `weakTags` e o warm-up enxerguem os erros sem código novo. O resultado (nível, radar, tags fracas, itens) é calculado por função pura em `server/placement.ts` e gravado em `assessments`. O painel é montado por `server/dashboard.ts` a partir de SQL em `server/repo.ts` e de funções puras de calendário em `server/time.ts`. No cliente, `/` vira o painel, `/trilha` recebe a trilha e `/placement` o teste; `Listening`, `Writing`, `Speaking` e `ExerciseList` passam a receber a spec do bloco em vez de `Lesson`, para serem reutilizados pelo teste.

**Tech Stack:** Node 25 (roda `.ts` direto), pnpm, TypeScript 7, Vite 8, React 19, react-router 8, Tailwind 4, Hono 4, `node:sqlite`, zod 4, yaml 2, vitest 5.

**Spec:** `docs/superpowers/specs/2026-09-09-e2-diagnostico-e-painel-design.md` (este plano argumenta a partir dela; leia as duas). Origem: `docs/planejamento/01-plano-geral.md` (seções 4, 5, 6, 8) e `docs/planejamento/02-trilha.md` (Nível 0).

## Global Constraints

- **Branch:** todo o trabalho vai em `feat/e2-diagnostico-e-painel` (já criada). Sem `git push`, sem PR, sem `--no-verify`. Commits em Conventional Commits (`feat`, `fix`, `content`, `docs`, `test`, `refactor`), verificados pelo hook `commit-msg`; `pre-commit` roda validação de conteúdo e typecheck.
- **Runtime:** Node ≥ 25 executa `.ts` direto. Imports relativos em `server/`, `shared/` e `scripts/` levam extensão `.ts`. Sem `enum`, `namespace` ou parameter properties (`erasableSyntaxOnly`). `noUncheckedIndexedAccess` está ligado: acesso por índice devolve `T | undefined`.
- **Dependências fechadas:** react, react-dom, react-router, hono, @hono/node-server, zod, yaml (+ vite, @vitejs/plugin-react, typescript, tailwindcss, @tailwindcss/vite, vitest, @types/*). Nada novo. Radar e heatmap são SVG/HTML inline.
- **`shared/` é puro:** sem DOM, sem `node:` (exceto `content-loader.ts`). O cliente importa tipos do servidor só com `import type`.
- **Texto:** interface e comentários em português com acentos; identificadores em inglês; conteúdo educacional em inglês. Nunca placeholder.
- **Conteúdo YAML:** quote escalares com `#`, `: ` ou que começam com aspas. Mini-markdown só: parágrafos, `**negrito**`, `*itálico*` (sem aninhar), `` `código` ``, listas `- `, tabelas `|---|`. Toda tag usada existe em `content/tags.yaml`. Depois de editar `content/`, rode `pnpm content:build`.
- **SQL parametrizado; toda rota POST/PUT validada com zod; timestamps ISO gerados no servidor via `now()` injetável.**
- **Testes:** vitest, `tests/**/*.test.ts`, Node puro (sem jsdom). Conteúdo real via `loadContent("content")`, banco `openDb(":memory:")`, rotas via `app.request`. Nunca altere um teste para fazê-lo passar: corrija o código ou explique por que a asserção estava errada.
- **Unicode:** arquivos com aspas curvas (`‘ ’ “ ”`) e travessões existem; não use o modelo haiku como implementador. Confira codepoints se editar conteúdo.
- **Verificação:** `pnpm content:build && pnpm typecheck && pnpm test` ao fim de cada tarefa; cole a saída no relatório. UI é verificada no Chrome na última tarefa.

---

## Estrutura de arquivos

```
content/placement/placement.yaml                     novo (T3)
shared/schema.ts                                     Block+placement, WritingSpecSchema, SpeakingModeASchema, PlacementSchema, placementExercises (T1); ContentBundle.placement (T3)
shared/speech-compare.ts                             wordOverlap (T2)
shared/content-loader.ts                             carrega placement; crossValidate com ids globais (T3)
server/writing-feedback.ts, server/speaking-metrics.ts   recebem spec em vez de Lesson (T2)
server/db.ts                                         migração 1 (T4)
server/repo.ts                                       assessments, *Since, metas, sessões, atividade, radar (T4, T6)
server/placement.ts                                  novo: cálculo do resultado (T5)
server/time.ts                                       novo: calendário local, streak, interseção (T6)
server/dashboard.ts                                  novo: buildDashboard (T8)
server/warmup.ts                                     pool com placement (T9)
server/app.ts                                        attempts placement (T4), /api/placement/* (T7), /api/dashboard, /api/goals/week, /api/study/heartbeat (T8)
src/lib/api.ts, src/lib/useStudyHeartbeat.ts         (T10)
src/App.tsx, src/components/Layout.tsx               rotas e navegação (T10)
src/components/exercises/{ExerciseRunner,ExerciseList}.tsx   feedback deferred, initialAnswered (T10)
src/components/lesson/{Listening,Writing,Speaking,Stepper}.tsx   props por spec, readOnly (T10)
src/pages/{Lesson,Module}.tsx                        call sites, link /trilha (T10)
src/components/placement/{PassageView,ReadAloud,PlacementResult}.tsx, src/components/dashboard/RadarChart.tsx, src/pages/Placement.tsx   (T11)
src/lib/useDashboard.ts, src/components/dashboard/{PlacementCard,TagHeatmap,StreakCard,WeeklyGoalCard,Timeline}.tsx, src/pages/Dashboard.tsx   (T12)
README.md, AGENTS.md                                 (T13)
tests/schema.test.ts (T1), tests/speech-compare.test.ts, tests/writing-feedback.test.ts, tests/speaking-metrics.test.ts (T2), tests/placement-content.test.ts (T3),
tests/db.test.ts, tests/repo.test.ts, tests/app.test.ts (T4, T6), tests/placement.test.ts (T5), tests/time.test.ts (T6),
tests/placement-routes.test.ts (T7), tests/dashboard.test.ts (T8), tests/warmup.test.ts (T9)
```

Ordem: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13. T5 e T6 são independentes entre si; T11 e T12 também.

---

### Task 1: Schema do teste inicial (`shared/schema.ts`)

**Files:**
- Modify: `shared/schema.ts`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Produces: `BlockSchema` aceita `"placement"`; `WritingSpecSchema`/`WritingSpec`; `SpeakingModeASchema`/`SpeakingModeA`; `PlacementBlockSchema`/`PlacementBlock = "reading" | "vocabulary" | "grammar" | "listening"`; `PlacementSchema`/`Placement`; `PlacementPassage`; `PlacementScript`; `placementExercises(p: Placement): Array<{ exercise: Exercise; block: PlacementBlock }>`.
- **Não** adicione `placement` a `ContentBundle` nesta tarefa (o loader ainda não lê o arquivo; isso acontece na T3).

- [ ] **Step 1: Escreva os testes que falham**

Acrescente ao final de `tests/schema.test.ts` (ajuste o import da primeira linha do arquivo para incluir `BlockSchema, PlacementSchema, placementExercises`):

```ts
const pq = (id: string, tag = "comp.reading") => ({ id, type: "multiple_choice", prompt: "p?", options: ["a", "b"], answer: 0, explanation: "e", tags: [tag] });
const placementFixture = {
  id: "placement", title: "Teste", intro: "Intro.", durationMin: 40,
  reading: { passages: [{ id: "p1", title: "Doc", source: "doc", text: "Some text.", questions: [pq("PL-r01")] }] },
  vocabulary: { questions: [pq("PL-v01", "comp.vocabulary")] },
  grammar: { questions: [pq("PL-g01", "gram.since-for")] },
  listening: { scripts: [{ id: "s1", title: "Standup", lines: [{ speaker: "Ana", text: "Hi." }], questions: [pq("PL-l01", "comp.listening")] }] },
  writing: { prompt: "Write.", rubric: ["r"], model: "m", minWords: 60, maxWords: 100 },
  speaking: { readAloud: ["Read this."], modeA: { prompt: "Speak.", maxSeconds: 45, targetPhrases: ["I worked on"] } },
};

describe("PlacementSchema", () => {
  it("accepts the fixture and applies defaults", () => {
    const p = PlacementSchema.parse(placementFixture);
    expect(p.reading.passages[0]!.format).toBe("markdown");
    expect(p.writing.constraints).toEqual([]);
    expect(p.speaking.modeA.checklist).toEqual([]);
  });
  it("rejects an empty passages list and an unknown passage format", () => {
    expect(() => PlacementSchema.parse({ ...placementFixture, reading: { passages: [] } })).toThrow();
    expect(() => PlacementSchema.parse({ ...placementFixture, reading: { passages: [{ ...placementFixture.reading.passages[0], format: "html" }] } })).toThrow();
  });
  it("placementExercises flattens the four blocks in order", () => {
    const items = placementExercises(PlacementSchema.parse(placementFixture));
    expect(items.map((i) => `${i.block}:${i.exercise.id}`)).toEqual(["reading:PL-r01", "vocabulary:PL-v01", "grammar:PL-g01", "listening:PL-l01"]);
  });
});

describe("BlockSchema", () => {
  it("accepts placement", () => {
    expect(BlockSchema.parse("placement")).toBe("placement");
  });
});
```

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/schema.test.ts`
Expected: FAIL — `PlacementSchema`/`placementExercises` não exportados (erro de import) ou `BlockSchema.parse("placement")` lança.

- [ ] **Step 3: Implemente em `shared/schema.ts`**

1. Troque a linha do `BlockSchema`:

```ts
export const BlockSchema = z.enum(["warmup", "quiz", "listening", "writing", "speaking", "placement"]);
```

2. Logo depois de `const line = z.object({ speaker: ..., text: ..., note: ... });` (antes de `LessonSchema`), adicione:

```ts
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
```

3. Em `LessonSchema`, substitua o objeto inteiro de `writing:` por `writing: WritingSpecSchema,` e, em `speaking:`, substitua o objeto de `modeA:` por `modeA: SpeakingModeASchema,` (mantendo `modeB` como está). O formato das aulas não muda: os campos e defaults são idênticos.

4. Depois de `export type Lesson = z.infer<typeof LessonSchema>;`, adicione:

```ts
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
```

- [ ] **Step 4: Rode os testes e o typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: todos passam (os 76 existentes + 4 novos). O typecheck passa porque `ContentBundle` ainda não exige `placement`.

- [ ] **Step 5: Commit**

```bash
git add shared/schema.ts tests/schema.test.ts
git commit -m "feat(shared): schema do teste inicial e bloco placement"
```

---

### Task 2: `wordOverlap` e motores de escrita/fala por spec

**Files:**
- Modify: `shared/speech-compare.ts`, `server/writing-feedback.ts`, `server/speaking-metrics.ts`, `server/app.ts` (duas chamadas)
- Test: `tests/speech-compare.test.ts`, `tests/writing-feedback.test.ts`, `tests/speaking-metrics.test.ts`

**Interfaces:**
- Consumes: `WritingSpec`, `SpeakingModeA` (T1).
- Produces: `wordOverlap(transcript: string, target: string): number` (0–1); `ruleBasedFeedback(text, spec: WritingSpec, patterns, selfScore?)`; `computeSpeakingMetrics(transcript, durationSec, spec: SpeakingModeA, patterns)`.

- [ ] **Step 1: Testes que falham**

Acrescente a `tests/speech-compare.test.ts` (inclua `wordOverlap` no import):

```ts
describe("wordOverlap", () => {
  it("is 1 for the same sentence, contractions included", () => {
    expect(wordOverlap("we're still waiting on the security team", "We're still waiting on the security team.")).toBe(1);
    expect(wordOverlap("we are still waiting on the security team", "We're still waiting on the security team.")).toBe(1);
  });
  it("counts each target word once and returns 0 for an empty transcript", () => {
    expect(wordOverlap("the deploy failed", "The deploy failed because the token expired.")).toBeCloseTo(3 / 6);
    expect(wordOverlap("", "The deploy failed.")).toBe(0);
  });
});
```

Em `tests/writing-feedback.test.ts`, troque toda ocorrência de `ruleBasedFeedback(<texto>, lesson, brErrors` por `ruleBasedFeedback(<texto>, lesson.writing, brErrors` (4 chamadas). Em `tests/speaking-metrics.test.ts`, troque `computeSpeakingMetrics(<...>, lesson, brErrors)` por `computeSpeakingMetrics(<...>, lesson.speaking.modeA, brErrors)` (2 chamadas).

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/speech-compare.test.ts tests/writing-feedback.test.ts tests/speaking-metrics.test.ts`
Expected: `wordOverlap` não existe; os outros dois arquivos falham em tempo de execução (`lesson.writing.writing` indefinido / `spec.speaking` indefinido).

- [ ] **Step 3: Implemente**

`shared/speech-compare.ts`, ao final:

```ts
/** Fração das palavras distintas do alvo presentes na transcrição (0–1). Usa a mesma tokenização das frases-alvo. */
export function wordOverlap(transcript: string, target: string): number {
  const targetWords = [...new Set(tokenizeWords(target))];
  if (targetWords.length === 0) return 0;
  const have = new Set(tokenizeWords(transcript));
  return targetWords.filter((w) => have.has(w)).length / targetWords.length;
}
```

`server/writing-feedback.ts`: import `WritingSpec` em vez de `Lesson`; assinatura e desestruturação:

```ts
import type { BrErrorPattern, WritingSpec } from "../shared/schema.ts";
// ...
export function ruleBasedFeedback(text: string, spec: WritingSpec, patterns: BrErrorPattern[], selfScore?: number): WritingFeedback {
  const wordCount = countWords(text);
  const { minWords, maxWords, constraints, model, rubric } = spec;
```

`server/speaking-metrics.ts`:

```ts
import type { BrErrorPattern, SpeakingModeA } from "../shared/schema.ts";
// ...
export function computeSpeakingMetrics(transcript: string, durationSec: number, spec: SpeakingModeA, patterns: BrErrorPattern[]): SpeakingMetrics {
  const words = tokenizeWords(transcript);
  const { used, missing } = matchTargetPhrases(transcript, spec.targetPhrases);
  const findings = detectBrErrors(transcript, patterns);
  const wpm = wordsPerMinute(words.length, durationSec);
  const withinTime = durationSec <= spec.maxSeconds;
```

`server/app.ts`: na rota `lessons.post("/:id/writing")` passe `content.lessons[id]!.writing`; na rota `lessons.post("/:id/speaking")` passe `content.lessons[id]!.speaking.modeA`.

- [ ] **Step 4: Verifique**

Run: `pnpm test && pnpm typecheck`
Expected: PASS (78 testes).

- [ ] **Step 5: Commit**

```bash
git add shared/speech-compare.ts server/writing-feedback.ts server/speaking-metrics.ts server/app.ts tests/speech-compare.test.ts tests/writing-feedback.test.ts tests/speaking-metrics.test.ts
git commit -m "refactor(server): motores de escrita e fala recebem a spec do bloco; wordOverlap"
```

---

### Task 3: Conteúdo do teste inicial + loader

**Files:**
- Create: `content/placement/placement.yaml`
- Modify: `shared/schema.ts` (`ContentBundle.placement`), `shared/content-loader.ts`
- Test: `tests/placement-content.test.ts` (novo), `tests/content-loader.test.ts` (inalterado, continua passando)

**Interfaces:**
- Consumes: `PlacementSchema`, `placementExercises` (T1); `ruleBasedFeedback(text, spec, …)`, `wordOverlap` (T2).
- Produces: `ContentBundle.placement: Placement`; `loadContent` lança se `content/placement/placement.yaml` faltar ou for inválido; `crossValidate` cobre tags e unicidade global de ids de exercício; `src/generated/content.json` passa a conter `placement`.

- [ ] **Step 1: Testes que falham** — crie `tests/placement-content.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { placementExercises } from "../shared/schema.ts";
import { parseMarkdown } from "../shared/mini-markdown.ts";
import { ruleBasedFeedback } from "../server/writing-feedback.ts";
import { wordOverlap } from "../shared/speech-compare.ts";

const bundle = loadContent("content");
const p = bundle.placement;

describe("placement content (content/placement/placement.yaml)", () => {
  it("has the Nível 0 block sizes: 12 reading in 3 passages, 10 vocabulary, 10 grammar, 6 listening in 2 scripts", () => {
    expect(p.reading.passages).toHaveLength(3);
    expect(p.reading.passages.flatMap((x) => x.questions)).toHaveLength(12);
    expect(p.vocabulary.questions).toHaveLength(10);
    expect(p.grammar.questions).toHaveLength(10);
    expect(p.listening.scripts).toHaveLength(2);
    expect(p.listening.scripts.flatMap((s) => s.questions)).toHaveLength(6);
    expect(placementExercises(p)).toHaveLength(38);
  });

  it("passes cross-validation (known tags, ids unique across lessons and placement)", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });

  it("vocabulary items are multiple choice with 4 options and the answer position varies", () => {
    const answers = new Set<number>();
    for (const q of p.vocabulary.questions) {
      expect(q.type).toBe("multiple_choice");
      if (q.type === "multiple_choice") { expect(q.options).toHaveLength(4); answers.add(q.answer); }
    }
    expect(answers.size).toBeGreaterThanOrEqual(3);
  });

  it("every item carries the tag of its competency", () => {
    for (const ps of p.reading.passages) for (const q of ps.questions) expect(q.tags).toContain("comp.reading");
    for (const q of p.vocabulary.questions) expect(q.tags).toContain("comp.vocabulary");
    for (const q of p.grammar.questions) expect(q.tags.some((t) => t.startsWith("gram.") || t.startsWith("br."))).toBe(true);
    for (const s of p.listening.scripts) for (const q of s.questions) expect(q.tags).toContain("comp.listening");
  });

  it("listening scripts are about 40 seconds of speech (70–130 words)", () => {
    for (const s of p.listening.scripts) {
      const words = s.lines.map((l) => l.text).join(" ").split(/\s+/).length;
      expect(words, s.id).toBeGreaterThanOrEqual(70);
      expect(words, s.id).toBeLessThanOrEqual(130);
    }
  });

  it("writing model satisfies its own constraints and length, with no BR errors", () => {
    const fb = ruleBasedFeedback(p.writing.model, p.writing, bundle.brErrors);
    expect(fb.withinLength).toBe(true);
    expect(fb.constraints.filter((c) => c.met !== null).every((c) => c.met)).toBe(true);
    expect(fb.findings).toEqual([]);
  });

  it("read-aloud sentences overlap themselves fully", () => {
    for (const s of p.speaking.readAloud) expect(wordOverlap(s, s)).toBe(1);
  });

  it("markdown fields render without leftover asterisks", () => {
    const fields = [p.intro, p.writing.prompt, ...p.reading.passages.filter((x) => x.format === "markdown").map((x) => x.text)];
    for (const text of fields) {
      for (const block of parseMarkdown(text)) {
        const inlines = block.type === "paragraph" ? block.inlines : block.type === "list" ? block.items.flat() : [...block.header.flat(), ...block.rows.flat(2)];
        for (const inline of inlines) expect(inline.text, text.slice(0, 40)).not.toContain("*");
      }
    }
  });
});
```

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/placement-content.test.ts`
Expected: FAIL — `bundle.placement` é `undefined` (erro de tipo no typecheck e de execução).

- [ ] **Step 3: Crie `content/placement/placement.yaml`** com exatamente este conteúdo (revisão humana item a item acontece no PR):

```yaml
# Teste inicial de nível (Nível 0 — Diagnóstico). Formato e cortes: docs/planejamento/02-trilha.md.
id: placement
title: Teste inicial de nível
durationMin: 40
intro: |
  Seis blocos, cerca de 40 minutos: leitura, vocabulário, gramática, escuta, escrita e fala (opcional).
  Durante o teste você não vê se acertou; tudo aparece no resultado. Responda sem consultar nada: o objetivo é medir, não ensinar.

  Ao final você recebe um **nível sugerido de entrada** (1, 2 ou 3), o radar inicial das competências e a lista de tags fracas que o warm-up das aulas vai usar. Você pode ignorar a sugestão.

reading:
  passages:
    - id: iam-doc
      title: "Trecho de documentação: políticas IAM"
      source: "Documentação oficial de um provedor de nuvem (estilo AWS IAM)"
      text: |
        An IAM policy is a JSON document that defines permissions. When you attach a policy to an identity (a user, a group, or a role), that identity can perform only the actions the policy explicitly allows. By default, all requests are denied. An explicit allow overrides this default, and an explicit deny overrides any allow.

        As a best practice, grant least privilege: start with the minimum set of permissions a workload needs and add more only when required. Avoid using the root user for everyday tasks. Prefer roles over long-term access keys, because role credentials are temporary and are rotated automatically. If a request is unexpectedly denied, check the policy simulator before changing production policies.
      questions:
        - { id: PL-r01, type: multiple_choice, prompt: "A policy contains an explicit allow and an explicit deny for the same action. What happens?", options: ["The allow wins", "The deny wins", "The request is logged and retried", "The most recently attached policy wins"], answer: 1, explanation: '"An explicit deny overrides any allow."', tags: [comp.reading, vocab.security] }
        - { id: PL-r02, type: multiple_choice, prompt: 'What does "grant least privilege" mean in the text?', options: ["Give only the permissions a workload needs", "Give admin rights to one trusted user", "Use the root user for critical tasks", "Rotate access keys every day"], answer: 0, explanation: '"start with the minimum set of permissions a workload needs"', tags: [comp.reading, vocab.security] }
        - { id: PL-r03, type: multiple_choice, prompt: "Why does the text prefer roles over access keys?", options: ["Roles are cheaper", "Role credentials are temporary and rotate automatically", "Access keys cannot be attached to policies", "Roles do not need policies"], answer: 1, explanation: '"because role credentials are temporary and are rotated automatically"', tags: [comp.reading, vocab.cloud] }
        - { id: PL-r04, type: fill_blank, prompt: "Before changing production policies, the text tells you to check the policy ___.", accepted: ["simulator"], explanation: 'Leitura de varredura (scanning): "check the policy simulator before changing production policies".', tags: [comp.reading] }

    - id: pipeline-log
      title: "Log de um job de CI que falhou"
      source: "Saída de um job de build e push de imagem"
      format: pre
      text: |
        [14:02:11] Step 3/5: Build image
        [14:02:11] $ docker build -t registry.internal/payments-api:1.42.0 .
        [14:03:48] Successfully tagged registry.internal/payments-api:1.42.0
        [14:03:49] Step 4/5: Push image
        [14:03:49] $ docker push registry.internal/payments-api:1.42.0
        [14:04:20] error: failed to push: unauthorized: authentication required
        [14:04:20] hint: the registry token expired at 13:58:02 UTC; re-run the job after refreshing REGISTRY_TOKEN
        [14:04:21] Step 4/5 failed (exit code 1). Retrying (attempt 2 of 3)...
        [14:04:52] error: failed to push: unauthorized: authentication required
        [14:05:23] error: failed to push: unauthorized: authentication required
        [14:05:23] Job failed after 3 attempts. Duration: 3m12s
        [14:05:23] Artifacts: build.log (14 KB) uploaded
      questions:
        - { id: PL-r05, type: multiple_choice, prompt: "Which step failed?", options: ["Build image", "Push image", "Run tests", "Upload artifacts"], answer: 1, explanation: '"Step 4/5: Push image" é o passo com "failed"; o build (3/5) terminou com "Successfully tagged".', tags: [comp.reading, vocab.errors, vocab.ci] }
        - { id: PL-r06, type: multiple_choice, prompt: "What is the most likely cause, according to the log?", options: ["The image is too large", "The Dockerfile has a syntax error", "The registry token expired", "The network timed out"], answer: 2, explanation: 'A linha "hint" diz: "the registry token expired at 13:58:02 UTC".', tags: [comp.reading, vocab.errors] }
        - { id: PL-r07, type: multiple_choice, prompt: 'What does "re-run the job after refreshing REGISTRY_TOKEN" ask you to do?', options: ["Delete the job", "Get a new token, then run the job again", "Increase the retry count", "Push the image from your laptop"], answer: 1, explanation: "re-run = rodar de novo; refreshing the token = renovar o token. Primeiro renova, depois roda.", tags: [comp.reading, vocab.ci] }
        - { id: PL-r08, type: fill_blank, prompt: "The push was attempted ___ times in total before the job gave up.", accepted: ["3", "three"], explanation: '"Job failed after 3 attempts."', tags: [comp.reading, vocab.errors] }

    - id: github-issue
      title: "Issue no GitHub: helm upgrade trava"
      source: "Bug report aberto no repositório de um chart interno"
      text: |
        **Title:** `helm upgrade` hangs when the previous release is stuck in `pending-upgrade`

        **Describe the bug**

        Running `helm upgrade --install api ./chart` never returns if a previous upgrade was interrupted (for example, the CI job was cancelled). The release stays in `pending-upgrade` and every new upgrade waits forever.

        **To reproduce**

        - Start an upgrade and cancel the job halfway.
        - Run `helm upgrade` again.
        - The command hangs; `helm history api` shows the last revision as `pending-upgrade`.

        **Expected behavior**

        The command should either fail fast with a clear message or roll back the pending revision automatically.

        **Workaround**

        `helm rollback api <previous-revision>` clears the stuck state. It works, but it is easy to forget, and on-call engineers have lost time on it twice this month.

        **Environment:** Helm 3.14, Kubernetes 1.29 (EKS).
      questions:
        - { id: PL-r09, type: multiple_choice, prompt: "When does the bug happen?", options: ["On every helm upgrade", "Only on Kubernetes 1.29", "When a previous upgrade was interrupted", "When the chart has no values file"], answer: 2, explanation: '"never returns if a previous upgrade was interrupted"', tags: [comp.reading, vocab.k8s] }
        - { id: PL-r10, type: multiple_choice, prompt: 'What does "fail fast" mean here?', options: ["Crash the cluster", "Stop immediately with a clear error instead of hanging", "Retry quickly", "Fail only in CI"], answer: 1, explanation: "fail fast = falhar logo e com mensagem clara, em vez de travar em silêncio.", tags: [comp.reading, comp.vocabulary, vocab.errors] }
        - { id: PL-r11, type: multiple_choice, prompt: "What does the author say about the workaround?", options: ["It does not work", "It works but is easy to forget", "It requires a cluster restart", "It only works on Helm 2"], answer: 1, explanation: '"It works, but it is easy to forget"', tags: [comp.reading, vocab.tickets-prs] }
        - { id: PL-r12, type: fill_blank, prompt: "The command that clears the stuck state is helm ___ api <previous-revision>.", accepted: ["rollback"], explanation: '"helm rollback api <previous-revision> clears the stuck state."', tags: [comp.reading, vocab.k8s] }

vocabulary:
  intro: "Complete cada frase de trabalho com a opção mais natural."
  questions:
    - { id: PL-v01, type: multiple_choice, prompt: "The deploy failed because a config map was missing, so I had to ___ to the previous release.", options: ["roll back", "roll out", "scale up", "spin down"], answer: 0, explanation: "roll back = voltar à versão anterior. roll out = lançar; scale up = aumentar capacidade; spin down = desligar.", tags: [comp.vocabulary, vocab.ci] }
    - { id: PL-v02, type: multiple_choice, prompt: "Can you ___ me on the ticket so I get notified when it moves?", options: ["flag", "tag", "pin", "push"], answer: 1, explanation: "tag someone = marcar a pessoa (@) para ela ser notificada. flag = sinalizar um problema; pin = fixar; push = empurrar/publicar.", tags: [comp.vocabulary, vocab.slack] }
    - { id: PL-v03, type: multiple_choice, prompt: "We're seeing a lot of 502s; I think the load balancer is marking the pods as ___.", options: ["unsafe", "unclear", "unhealthy", "unlucky"], answer: 2, explanation: "unhealthy = reprovado no health check. É o termo usado por load balancers e pelo Kubernetes.", tags: [comp.vocabulary, vocab.k8s, vocab.incident] }
    - { id: PL-v04, type: multiple_choice, prompt: "The PR looks good. Just one ___: please rename the variable to something more descriptive.", options: ["net", "knot", "nut", "nit"], answer: 3, explanation: "nit (de nitpick) = detalhe pequeno num code review, sem bloquear a aprovação.", tags: [comp.vocabulary, vocab.tickets-prs] }
    - { id: PL-v05, type: multiple_choice, prompt: "The old dev accounts nobody turned off are pure ___: they cost $4k a month and run nothing.", options: ["profit", "waste", "savings", "revenue"], answer: 1, explanation: 'waste = desperdício. Em FinOps, recurso ligado sem uso é "waste".', tags: [comp.vocabulary, vocab.finops] }
    - { id: PL-v06, type: multiple_choice, prompt: "The incident is resolved, but we still need to write the ___ by Friday.", options: ["pre-flight", "post-it", "post-mortem", "pre-check"], answer: 2, explanation: "post-mortem = documento de análise do incidente (o que aconteceu, por quê, ações).", tags: [comp.vocabulary, vocab.incident] }
    - { id: PL-v07, type: multiple_choice, prompt: "The alert fired at 3 a.m., but it turned out to be a ___: nothing was actually wrong.", options: ["false negative", "true positive", "silent failure", "false positive"], answer: 3, explanation: "false positive = alarme falso (alerta disparou sem problema real). false negative é o oposto: problema real sem alerta.", tags: [comp.vocabulary, vocab.observability] }
    - { id: PL-v08, type: multiple_choice, prompt: "Terraform wants to ___ the database because I changed the instance name. That would delete all the data.", options: ["replace", "refresh", "import", "format"], answer: 0, explanation: 'replace = destruir e recriar o recurso (o plano mostra "must be replaced"). refresh só atualiza o state; import traz um recurso existente para o state.', tags: [comp.vocabulary, vocab.iac] }
    - { id: PL-v09, type: multiple_choice, prompt: "Heads up: I'll be ___ tomorrow afternoon, so please review the PR in the morning.", options: ["out of order", "out of office", "out of scope", "out of memory"], answer: 1, explanation: "out of office (OOO) = ausente do trabalho. out of order = quebrado; out of scope = fora do escopo; out of memory = sem memória.", tags: [comp.vocabulary, vocab.slack] }
    - { id: PL-v10, type: multiple_choice, prompt: "The pipeline is ___: it passes on retry without any code change.", options: ["sticky", "fluffy", "flaky", "slippery"], answer: 2, explanation: "flaky = instável, falha de forma intermitente. É o adjetivo padrão para testes e pipelines não determinísticos.", tags: [comp.vocabulary, vocab.ci] }

grammar:
  intro: "Frases de standup e Slack. Corrija a frase ou escolha a opção correta."
  questions:
    - { id: PL-g01, type: error_correction, prompt: "I'm working on this migration since Monday.", accepted: ["I've been working on this migration since Monday.", "I have worked on this migration since Monday."], explanation: 'since marca o início de algo que continua: present perfect (continuous). "I''m working since" é calque do português.', tags: [gram.since-for, br.since-present] }
    - { id: PL-g02, type: multiple_choice, prompt: "I'll have the fix deployed ___ 5 pm, so QA can test it before they leave.", options: ["until", "by", "since", "for"], answer: 1, explanation: "by = prazo final (no máximo às 17h). until diria que o deploy fica acontecendo continuamente até as 17h.", tags: [gram.by-until, br.until-by] }
    - { id: PL-g03, type: error_correction, prompt: "Why the pipeline failed?", accepted: ["Why did the pipeline fail?", "Why has the pipeline failed?"], explanation: "Pergunta no passado precisa do auxiliar did: Why did the pipeline fail? O verbo principal volta à forma base.", tags: [gram.question-forms] }
    - { id: PL-g04, type: error_correction, prompt: "I have a doubt about the rollout strategy.", accepted: ["I have a question about the rollout strategy.", "I've got a question about the rollout strategy."], explanation: "doubt = dúvida no sentido de desconfiança. Quando você quer perguntar algo, é question.", tags: [br.doubt] }
    - { id: PL-g05, type: multiple_choice, prompt: "Could you ___ how the retry logic works?", options: ["explain me", "explain to me", "explain-me", "explaining me"], answer: 1, explanation: 'explain é seguido de to + pessoa: explain something to me. "Explain me" é calque de "me explica".', tags: [br.explain-me, gram.modals-polite] }
    - { id: PL-g06, type: multiple_choice, prompt: "The service ___ when I call the health endpoint.", options: ["is giving error", "is throwing an error", "gives error", "is giving an error"], answer: 1, explanation: 'throw / return an error. "Giving error" é calque de "dando erro"; error é contável e precisa de artigo.', tags: [br.giving-error] }
    - { id: PL-g07, type: multiple_choice, prompt: "We're still ___ the security team to approve the firewall rule.", options: ["waiting", "waiting on", "waiting to", "waiting that"], answer: 1, explanation: 'wait on / wait for someone to do something. Sem preposição ("waiting the team") é o erro mais comum de brasileiros.', tags: [br.waiting-no-prep, gram.prepositions-infra] }
    - { id: PL-g08, type: multiple_choice, prompt: "Do you know ___?", options: ["where is the runbook", "where the runbook is", "where the runbook is it", "where is it the runbook"], answer: 1, explanation: 'Pergunta indireta: depois de "Do you know", a ordem volta a ser sujeito + verbo (where the runbook is).', tags: [gram.indirect-questions, gram.question-forms] }
    - { id: PL-g09, type: error_correction, prompt: "If the deploy will fail, the pipeline rolls back automatically.", accepted: ["If the deploy fails, the pipeline rolls back automatically.", "If the deploy fails the pipeline rolls back automatically."], explanation: "Condicional real: if + present simple, nunca if + will. O will fica na outra oração, se houver.", tags: [gram.conditionals-real] }
    - { id: PL-g10, type: multiple_choice, prompt: "I ___ the cluster upgrade next week; the change request is already approved.", options: ["will doing", "am going to do", "going to do", "do"], answer: 1, explanation: 'Plano decidido e preparado: be going to (ou present continuous: I''m doing). "will doing" não existe; "going to do" sem o verbo be está incompleto.', tags: [gram.future-plans] }

listening:
  scripts:
    - id: standup
      title: "Standup de um time de plataforma (3 pessoas)"
      lines:
        - { speaker: Lucas, text: "Yesterday I finished the Terraform module for the new VPC and opened the PR. Today I'm going to start on the peering config. One blocker: I still don't have access to the network account, so I can't run a plan against it." }
        - { speaker: Maya, text: "I can sort that out after the call, I have admin there. I spent most of yesterday on the flaky integration tests. It turned out two of them depended on the order they ran in. The fix is in review. Today I'm picking up the on-call handover doc." }
        - { speaker: Tom, text: "Nothing new from me, still on the cost report. Heads up: the finance review moved to Thursday, so I need the numbers from everyone by Wednesday end of day." }
      questions:
        - { id: PL-l01, type: multiple_choice, prompt: "What is Lucas blocked on?", options: ["The PR review", "Access to the network account", "The peering config", "The cost report"], answer: 1, explanation: '"I still don''t have access to the network account, so I can''t run a plan against it."', tags: [comp.listening] }
        - { id: PL-l02, type: multiple_choice, prompt: "What caused the flaky tests?", options: ["A slow database", "They depended on the order they ran in", "Missing credentials", "A timeout in CI"], answer: 1, explanation: '"two of them depended on the order they ran in"', tags: [comp.listening, vocab.ci] }
        - { id: PL-l03, type: fill_blank, prompt: "Tom needs the numbers from everyone by ___ end of day.", accepted: ["Wednesday"], explanation: '"I need the numbers from everyone by Wednesday end of day." A revisão é quinta; os números, quarta.', tags: [comp.listening] }
    - id: incident
      title: "Update de incidente (incident commander)"
      lines:
        - { speaker: Priya, text: "This is the ten thirty update on the checkout incident. Since nine fifty, about fifteen percent of checkout requests have been failing with 504 errors. We've narrowed it down to the payments service: its connection pool to the database is exhausted. We haven't found the root cause yet, but we restarted the pods and the error rate dropped from fifteen to three percent. Next steps: Daniel is checking whether last night's deploy changed the pool size, and I'm keeping the status page updated. Next update in thirty minutes, or sooner if anything changes." }
      questions:
        - { id: PL-l04, type: multiple_choice, prompt: "What is the current status of the incident?", options: ["Fully resolved", "Mitigated, root cause still unknown", "Getting worse", "Not started yet"], answer: 1, explanation: '"We haven''t found the root cause yet, but we restarted the pods and the error rate dropped". Mitigado, não resolvido.', tags: [comp.listening, vocab.incident] }
        - { id: PL-l05, type: multiple_choice, prompt: "What did the team do that reduced the error rate?", options: ["Rolled back the deploy", "Increased the pool size", "Restarted the pods", "Moved traffic to another region"], answer: 2, explanation: '"we restarted the pods and the error rate dropped"', tags: [comp.listening, vocab.incident] }
        - { id: PL-l06, type: fill_blank, prompt: "The error rate dropped from fifteen to ___ percent.", accepted: ["3", "three"], explanation: '"dropped from fifteen to three percent"', tags: [comp.listening, gram.numbers-percentages] }

writing:
  prompt: |
    **Cenário:** você está rodando `terraform apply` para criar o bucket S3 de logs `acme-prod-logs` e recebe o erro `Error: creating S3 Bucket (acme-prod-logs): BucketAlreadyExists`. Você já conferiu que o bucket não existe na sua conta. Precisa de ajuda do time de plataforma.

    **Tarefa:** escreva a mensagem que você mandaria no canal `#platform-help` do Slack (60–100 palavras): contexto, o que você já tentou e o que exatamente está pedindo.
  constraints:
    - { label: "O erro citado (BucketAlreadyExists)", pattern: "BucketAlreadyExists" }
    - { label: "O que você já tentou (I've checked / I tried…)", pattern: "\\b(I('ve| have)( already)? (tried|checked|confirmed|verified|looked)|I (tried|checked|confirmed|verified|looked))\\b" }
    - { label: "Um pedido claro (could/can/would you…)", pattern: "\\b(could|can|would) (you|someone|anyone|somebody|anybody)\\b" }
    - { label: "Contexto antes do pedido (o que você estava fazendo)" }
  rubric:
    - "Estrutura: contexto → o que tentei → pedido"
    - Gramática e tempos verbais
    - Naturalidade e registro (Slack, colegas)
    - Concisão
  model: >-
    Hi team, quick question about S3. I'm running terraform apply to create the logs bucket acme-prod-logs
    and it fails with BucketAlreadyExists. I've already checked our account and the bucket isn't there,
    so I think the name is taken by another AWS account, because bucket names are global. Could someone
    confirm whether we own a bucket with that name in a different account? If not, I'll add the account ID
    as a suffix and re-run the apply. Thanks!
  minWords: 60
  maxWords: 100
  tags: [comp.writing, topic.help, vocab.iac]

speaking:
  readAloud:
    - "Yesterday I finished the migration and opened the pull request."
    - "We're still waiting on the security team to approve the firewall rule."
    - "The deploy failed because the registry token had expired."
  modeA:
    prompt: "Responda em inglês, em até 45 segundos: What did you work on yesterday? Diga o que fez, o que ficou pendente e se há algum bloqueio."
    maxSeconds: 45
    targetPhrases:
      - I worked on
      - I finished
      - I've been working on
      - I'm still on
      - I'm waiting on
      - I'm blocked on
      - no blockers
      - today I'm going to
      - it turned out
```

- [ ] **Step 4: `ContentBundle` e loader**

`shared/schema.ts`, em `ContentBundle`, adicione `placement: Placement;`.

`shared/content-loader.ts`:

1. Import: acrescente `PlacementSchema, placementExercises` e `type Placement` à lista importada de `./schema.ts`.
2. Em `loadContent`, depois de `const brErrors = readYaml(...)`:

```ts
  const placement = readYaml(join(root, "placement", "placement.yaml"), PlacementSchema, problems);
```

e troque a condição/retorno finais por:

```ts
  if (problems.length > 0 || !levels || !tags || !brErrors || !placement) {
    throw new Error(`Conteúdo inválido:\n- ${problems.join("\n- ")}`);
  }
  return { levels: levels.levels, lessons, modules, tags: tags.tags, brErrors: brErrors.patterns, placement };
```

3. Extraia as verificações de forma de exercício para uma função de módulo (antes de `crossValidate`):

```ts
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
```

4. Em `crossValidate`: declare `const seenExercise = new Set<string>();` logo após `checkTags`; no laço de aulas, remova o `const seen = new Set<string>();` e use `seenExercise` no lugar de `seen`; substitua os dois `if (exercise.type === "match") {...}` / `if (exercise.type === "fill_blank") {...}` por `checkExerciseShape(exercise, problems);`. Depois do laço de aulas (antes do laço de `bundle.modules`), adicione:

```ts
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
```

- [ ] **Step 5: Verifique**

Run: `pnpm content:build && pnpm test && pnpm typecheck`
Expected: `gerado src/generated/content.json (1 aula(s) com conteúdo)`; todos os testes passam (86). Se `writing model … no BR errors` falhar, ajuste o **modelo** (não o teste) até não disparar nenhum padrão do catálogo, mantendo 60–100 palavras e as restrições.

- [ ] **Step 6: Commit**

```bash
git add content/placement/placement.yaml shared/schema.ts shared/content-loader.ts tests/placement-content.test.ts
git commit -m "content(placement): teste inicial de nível com 38 itens, escrita e fala"
```

---

### Task 4: Migração 1, tentativas do teste e helpers de rodada

**Files:**
- Modify: `server/db.ts`, `server/repo.ts`, `server/app.ts`
- Test: `tests/db.test.ts`, `tests/repo.test.ts`, `tests/app.test.ts`

**Interfaces:**
- Consumes: `placementExercises`, `Block` (T1); `ContentBundle.placement` (T3).
- Produces: `MIGRATIONS[1]` (attempts aceita `block='placement'`); `AssessmentKind`, `AssessmentRow`, `insertAssessment(db, { kind, ref, score }, now): number`, `latestAssessment(db, kind, ref): AssessmentRow | undefined`, `listAssessments(db): AssessmentRow[]`; `latestAttemptsSince(db, lessonId, block, sinceExclusive): Map<string, AttemptRow>`, `latestWritingSince(db, lessonId, sinceExclusive): WritingRow | undefined`, `SpeakingRow`, `latestSpeakingSince(db, lessonId, sinceExclusive): SpeakingRow | undefined`; `POST /api/attempts` aceita `lessonId: "placement"` + `block: "placement"` + exercício do teste.

- [ ] **Step 1: Testes que falham**

`tests/db.test.ts` — acrescente `import { DatabaseSync } from "node:sqlite";` e o teste:

```ts
describe("migration 1", () => {
  it("rebuilds attempts keeping rows and accepting block placement", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(MIGRATIONS[0]!);
    db.exec("create table schema_version (version integer not null); insert into schema_version (version) values (0)");
    db.prepare("insert into attempts (lesson_id, exercise_id, block, type, correct, answer, tags_json, ts) values ('M01-02','M01-02-q1','quiz','fill_blank',1,'x','[\"gram.since-for\"]','2026-09-01T10:00:00.000Z')").run();
    expect(migrate(db)).toBe(MIGRATIONS.length - 1);
    const rows = db.prepare("select * from attempts").all() as Array<{ exercise_id: string; answer: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ exercise_id: "M01-02-q1", answer: "x" });
    const insert = (block: string) => db.prepare("insert into attempts (lesson_id, exercise_id, block, type, correct, tags_json, ts) values ('placement','PL-r01',?,'multiple_choice',0,'[]','2026-09-02T10:00:00.000Z')").run(block);
    expect(() => insert("placement")).not.toThrow();
    expect(() => insert("bogus")).toThrow();
    const indexes = (db.prepare("select name from sqlite_master where type='index' and tbl_name='attempts'").all() as { name: string }[]).map((r) => r.name);
    expect(indexes).toEqual(expect.arrayContaining(["idx_attempts_lesson_block", "idx_attempts_ts"]));
  });
});
```

`tests/repo.test.ts` — acrescente ao import: `insertAssessment, latestAssessment, listAssessments, latestAttemptsSince, latestWritingSince, latestSpeakingSince` e os blocos:

```ts
describe("assessments", () => {
  it("inserts, returns the latest per kind/ref and lists newest first", () => {
    insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 1 } }, t(1));
    const second = insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 2 } }, t(3));
    insertAssessment(db, { kind: "module", ref: "M01", score: { pct: 0.8 } }, t(2));
    expect(latestAssessment(db, "placement", "placement")?.id).toBe(second);
    expect(JSON.parse(latestAssessment(db, "placement", "placement")!.score_json)).toEqual({ level: 2 });
    expect(latestAssessment(db, "level", "1")).toBeUndefined();
    expect(listAssessments(db).map((a) => a.ts)).toEqual([t(3), t(2), t(1)]);
  });
});

describe("rodada (registros após um instante)", () => {
  it("latestAttemptsSince ignores rows at or before the cutoff and keeps the latest per exercise", () => {
    insertAttempt(db, { lessonId: "placement", exerciseId: "PL-r01", block: "placement", type: "multiple_choice", correct: false, tags: ["comp.reading"] }, t(1));
    insertAttempt(db, { lessonId: "placement", exerciseId: "PL-r01", block: "placement", type: "multiple_choice", correct: true, tags: ["comp.reading"] }, t(2));
    insertAttempt(db, { lessonId: "placement", exerciseId: "PL-r02", block: "placement", type: "multiple_choice", correct: true, tags: ["comp.reading"] }, t(3));
    expect([...latestAttemptsSince(db, "placement", "placement", "").keys()].sort()).toEqual(["PL-r01", "PL-r02"]);
    const since2 = latestAttemptsSince(db, "placement", "placement", t(2));
    expect([...since2.keys()]).toEqual(["PL-r02"]);
    expect(latestAttemptsSince(db, "placement", "placement", "").get("PL-r01")?.correct).toBe(1);
  });
  it("latestWritingSince / latestSpeakingSince respect the cutoff", () => {
    insertWriting(db, { lessonId: "placement", text: "a", feedback: {}, score: 3 }, t(1));
    insertWriting(db, { lessonId: "placement", text: "b", feedback: {}, score: 4 }, t(2));
    insertSpeaking(db, { lessonId: "placement", mode: "A", transcript: "x", metrics: { readAloudPct: 1 }, score: 4, selfConfidence: 3 }, t(2));
    expect(latestWritingSince(db, "placement", "")?.text).toBe("b");
    expect(latestWritingSince(db, "placement", t(2))).toBeUndefined();
    expect(latestSpeakingSince(db, "placement", t(1))?.self_confidence).toBe(3);
    expect(latestSpeakingSince(db, "placement", t(2))).toBeUndefined();
  });
});
```

`tests/app.test.ts` — novo bloco:

```ts
describe("placement attempts", () => {
  const body = (over: Record<string, unknown>) => ({ lessonId: "placement", exerciseId: "PL-r01", block: "placement", type: "multiple_choice", correct: true, tags: ["comp.reading"], ...over });
  it("accepts a placement attempt", async () => {
    const res = await json("POST", "/api/attempts", body({}));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBeGreaterThan(0);
  });
  it("rejects a wrong block, an unknown placement exercise and block placement on a lesson", async () => {
    expect((await json("POST", "/api/attempts", body({ block: "quiz" }))).status).toBe(400);
    expect((await json("POST", "/api/attempts", body({ exerciseId: "PL-zz" }))).status).toBe(400);
    expect((await json("POST", "/api/attempts", body({ lessonId: lesson.id, exerciseId: "M01-02-q1", type: "fill_blank", tags: ["gram.since-for"] }))).status).toBe(400);
  });
});
```

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/db.test.ts tests/repo.test.ts tests/app.test.ts`
Expected: FAIL — `migrate` devolve 0 (só uma migração), funções não exportadas, rota devolve 404 para `placement`.

- [ ] **Step 3: Migração em `server/db.ts`**

Acrescente um segundo elemento ao array `MIGRATIONS` (depois da string da migração 0):

```ts
  `
  create table attempts_new (
    id integer primary key autoincrement,
    lesson_id text not null,
    exercise_id text not null,
    block text not null check (block in ('warmup','quiz','listening','writing','speaking','placement')),
    type text not null,
    correct integer not null check (correct in (0,1)),
    answer text,
    score real,
    tags_json text not null,
    ts text not null
  );
  insert into attempts_new (id, lesson_id, exercise_id, block, type, correct, answer, score, tags_json, ts)
    select id, lesson_id, exercise_id, block, type, correct, answer, score, tags_json, ts from attempts;
  drop table attempts;
  alter table attempts_new rename to attempts;
  create index idx_attempts_lesson_block on attempts(lesson_id, block);
  create index idx_attempts_ts on attempts(ts);
  `,
```

Comentário acima do array: `// Migração 1: SQLite não altera CHECK; a tabela attempts é reconstruída para aceitar block='placement'.`

- [ ] **Step 4: `server/repo.ts`** — acrescente ao final:

```ts
// ---------- avaliações ----------
export type AssessmentKind = "placement" | "module" | "level" | "checkpoint";
export type AssessmentRow = { id: number; kind: AssessmentKind; ref: string; score_json: string; ts: string };

export function insertAssessment(db: Db, a: { kind: AssessmentKind; ref: string; score: unknown }, now: string): number {
  const r = db.prepare("insert into assessments (kind, ref, score_json, ts) values (?,?,?,?)").run(a.kind, a.ref, JSON.stringify(a.score), now);
  return Number(r.lastInsertRowid);
}

export function latestAssessment(db: Db, kind: AssessmentKind, ref: string): AssessmentRow | undefined {
  return db.prepare("select * from assessments where kind = ? and ref = ? order by ts desc, id desc limit 1").get(kind, ref) as AssessmentRow | undefined;
}

export function listAssessments(db: Db): AssessmentRow[] {
  return db.prepare("select * from assessments order by ts desc, id desc").all() as AssessmentRow[];
}

// ---------- rodada: registros com ts estritamente maior que um instante ("" = desde sempre) ----------
export function latestAttemptsSince(db: Db, lessonId: string, block: Block, sinceExclusive: string): Map<string, AttemptRow> {
  const rows = db.prepare("select * from attempts where lesson_id = ? and block = ? and ts > ? order by ts asc, id asc").all(lessonId, block, sinceExclusive) as AttemptRow[];
  const map = new Map<string, AttemptRow>();
  for (const r of rows) map.set(r.exercise_id, r);
  return map;
}

export function latestWritingSince(db: Db, lessonId: string, sinceExclusive: string): WritingRow | undefined {
  return db.prepare("select * from writing_submissions where lesson_id = ? and ts > ? order by ts desc, id desc limit 1").get(lessonId, sinceExclusive) as WritingRow | undefined;
}

export type SpeakingRow = {
  id: number; lesson_id: string; mode: "A" | "B"; transcript: string; metrics_json: string;
  score: number | null; self_confidence: number | null; ts: string;
};

export function latestSpeakingSince(db: Db, lessonId: string, sinceExclusive: string): SpeakingRow | undefined {
  return db.prepare("select * from speaking_sessions where lesson_id = ? and ts > ? order by ts desc, id desc limit 1").get(lessonId, sinceExclusive) as SpeakingRow | undefined;
}
```

- [ ] **Step 5: `server/app.ts`** — importe `placementExercises` de `../shared/schema.ts`; dentro de `createApp`, antes das rotas, `const placementIds = new Set(placementExercises(content.placement).map((e) => e.exercise.id));` e substitua a rota de tentativas por:

```ts
  app.post("/api/attempts", async (c) => {
    const parsed = AttemptBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const { lessonId, block, exerciseId } = parsed.data;
    if (lessonId === "placement") {
      if (block !== "placement") return c.json({ error: "o teste inicial usa o bloco placement" }, 400);
      if (!placementIds.has(exerciseId)) return c.json({ error: "exercício não pertence ao teste inicial" }, 400);
    } else {
      if (block === "placement") return c.json({ error: "bloco placement só vale para o teste inicial" }, 400);
      if (!content.lessons[lessonId]) return c.json({ error: "aula não encontrada" }, 404);
    }
    return c.json({ id: insertAttempt(db, parsed.data, now()) });
  });
```

- [ ] **Step 6: Verifique**

Run: `pnpm test && pnpm typecheck`
Expected: PASS (91 testes).

- [ ] **Step 7: Commit**

```bash
git add server/db.ts server/repo.ts server/app.ts tests/db.test.ts tests/repo.test.ts tests/app.test.ts
git commit -m "feat(server): migração para tentativas do teste inicial e helpers de rodada"
```

---

### Task 5: Cálculo do resultado do teste (`server/placement.ts`)

**Files:**
- Create: `server/placement.ts`
- Test: `tests/placement.test.ts`

**Interfaces:**
- Consumes: `Placement`, `PlacementBlock`, `Competency`, `placementExercises` (T1/T3); `AttemptRow`, `WritingRow`, `SpeakingRow`, `AssessmentRow` (T4).
- Produces: `BlockScore`, `PlacementRadar`, `PlacementResult`, `PlacementInputs`, `PlacementAssessment`, `suggestLevel(pct, writingScore)`, `placementWeakTags(attempts)`, `missingForFinish(placement, inputs)`, `computePlacementResult(placement, inputs, finishedAt)`, `parsePlacementAssessment(row)`.

- [ ] **Step 1: Testes que falham** — crie `tests/placement.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { loadContent } from "../shared/content-loader.ts";
import { placementExercises } from "../shared/schema.ts";
import { computePlacementResult, missingForFinish, placementWeakTags, suggestLevel, parsePlacementAssessment, type PlacementInputs } from "../server/placement.ts";
import type { AttemptRow, WritingRow, SpeakingRow } from "../server/repo.ts";

const content = loadContent("content");
const p = content.placement;
const all = placementExercises(p);
const T = "2026-09-09T12:00:00.000Z";

let seq = 0;
function attempt(exerciseId: string, correct: boolean, tags: string[], answer = "x"): AttemptRow {
  return { id: ++seq, lesson_id: "placement", exercise_id: exerciseId, block: "placement", type: "multiple_choice", correct: correct ? 1 : 0, answer, score: null, tags_json: JSON.stringify(tags), ts: T };
}
/** Responde todos os itens; `isCorrect` decide item a item. */
function answers(isCorrect: (id: string) => boolean): Map<string, AttemptRow> {
  return new Map(all.map(({ exercise }) => [exercise.id, attempt(exercise.id, isCorrect(exercise.id), exercise.tags)]));
}
const writing = (score: number | null): WritingRow => ({ id: 1, lesson_id: "placement", text: "t", feedback_json: "{}", score, ts: T });
const speaking = (score: number, readAloudPct: number, selfConfidence: number | null): SpeakingRow =>
  ({ id: 1, lesson_id: "placement", mode: "A", transcript: "t", metrics_json: JSON.stringify({ readAloudPct }), score, self_confidence: selfConfidence, ts: T });
const inputs = (o: Partial<PlacementInputs>): PlacementInputs => ({ attempts: new Map(), writing: undefined, speaking: undefined, ...o });

describe("suggestLevel (regra de corte da trilha)", () => {
  it.each<[number, number | null, 1 | 2 | 3]>([
    [0.59, 5, 1], [0.6, 3, 2], [0.6, 2, 1], [0.8, 4, 2], [0.8, 5, 2], [0.81, 4, 3], [0.81, 3, 2], [1, 5, 3], [0.9, null, 1],
  ])("pct %s + escrita %s → nível %s", (pct, w, level) => {
    expect(suggestLevel(pct, w)).toBe(level);
  });
});

describe("computePlacementResult", () => {
  it("scores blocks from the latest attempt per exercise and builds radar, weak tags and items", () => {
    const att = answers((id) => !id.startsWith("PL-l")); // erra só a escuta
    const r = computePlacementResult(p, inputs({ attempts: att, writing: writing(4), speaking: speaking(3.5, 0.8, 4) }), T);
    expect(r.version).toBe(1);
    expect(r.itemCount).toBe(38);
    expect(r.correct).toBe(32);
    expect(r.pct).toBeCloseTo(32 / 38);
    expect(r.blocks.listening).toEqual({ correct: 0, total: 6, pct: 0 });
    expect(r.blocks.reading).toEqual({ correct: 12, total: 12, pct: 1 });
    expect(r.level).toBe(3);
    expect(r.writingScore).toBe(4);
    expect(r.speaking).toEqual({ score: 3.5, readAloudPct: 0.8, selfConfidence: 4 });
    expect(r.radar).toEqual({ REA: 1, VOC: 1, LIS: 0, WRI: 0.8, SPK: 0.7, PRO: 0.8, CNF: 0.8 });
    expect(r.weakTags).toContain("comp.listening");
    expect(r.weakTags).not.toContain("comp.reading");
    expect(r.items).toHaveLength(38);
    expect(r.items.find((i) => i.id === "PL-l01")).toEqual({ id: "PL-l01", block: "listening", correct: false, answer: "x" });
    expect(r.finishedAt).toBe(T);
  });
  it("leaves speaking axes null without a speaking session and applies the writing floor", () => {
    const r = computePlacementResult(p, inputs({ attempts: answers(() => true), writing: writing(3) }), T);
    expect(r.speaking).toBeNull();
    expect(r.radar.SPK).toBeNull();
    expect(r.radar.PRO).toBeNull();
    expect(r.radar.CNF).toBeNull();
    expect(r.level).toBe(2);
  });
});

describe("placementWeakTags", () => {
  it("returns tags with error rate ≥ 50%, most errors first, ties alphabetical", () => {
    const rows = [
      attempt("a", false, ["gram.since-for", "br.doubt"]), attempt("b", false, ["gram.since-for"]),
      attempt("c", true, ["br.doubt"]), attempt("d", true, ["gram.by-until"]), attempt("e", true, ["br.doubt"]),
      attempt("f", false, ["br.until-by"]), attempt("g", false, ["br.actually"]),
    ];
    expect(placementWeakTags(rows)).toEqual(["gram.since-for", "br.actually", "br.until-by"]);
  });
});

describe("missingForFinish", () => {
  it("lists unanswered exercises and a writing without self score", () => {
    const att = answers(() => true);
    att.delete("PL-g05");
    expect(missingForFinish(p, inputs({ attempts: att, writing: writing(null) }))).toEqual({ exercises: ["PL-g05"], writing: true });
    expect(missingForFinish(p, inputs({ attempts: answers(() => true), writing: writing(3) }))).toEqual({ exercises: [], writing: false });
    expect(missingForFinish(p, inputs({ attempts: answers(() => true) })).writing).toBe(true);
  });
});

describe("parsePlacementAssessment", () => {
  it("parses score_json into result", () => {
    const parsed = parsePlacementAssessment({ id: 7, kind: "placement", ref: "placement", score_json: JSON.stringify({ level: 2, pct: 0.7 }), ts: T });
    expect(parsed).toMatchObject({ id: 7, ts: T, result: { level: 2, pct: 0.7 } });
  });
});
```

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/placement.test.ts`
Expected: FAIL — módulo `server/placement.ts` não existe.

- [ ] **Step 3: Crie `server/placement.ts`**

```ts
import type { Competency, Placement, PlacementBlock } from "../shared/schema.ts";
import { placementExercises } from "../shared/schema.ts";
import type { AssessmentRow, AttemptRow, SpeakingRow, WritingRow } from "./repo.ts";

export type BlockScore = { correct: number; total: number; pct: number };
export type PlacementRadar = Record<Competency, number | null>;
export type PlacementResult = {
  version: 1;
  itemCount: number; correct: number; pct: number;
  blocks: Record<PlacementBlock, BlockScore>;
  /** Autoavaliação 1–5 (modo por regras) até a E4. */
  writingScore: number | null;
  speaking: { score: number; readAloudPct: number; selfConfidence: number | null } | null;
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
    const metrics = JSON.parse(inputs.speaking.metrics_json) as { readAloudPct?: number };
    speaking = { score: inputs.speaking.score ?? 0, readAloudPct: metrics.readAloudPct ?? 0, selfConfidence: inputs.speaking.self_confidence };
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
```

- [ ] **Step 4: Verifique**

Run: `pnpm test tests/placement.test.ts && pnpm typecheck`
Expected: PASS. Se `placementWeakTags` do primeiro teste não contiver `comp.listening`, o conteúdo da T3 mudou; corrija o cálculo, não o conteúdo.

- [ ] **Step 5: Commit**

```bash
git add server/placement.ts tests/placement.test.ts
git commit -m "feat(server): cálculo do resultado do teste inicial (nível, radar, tags fracas)"
```

---

### Task 6: Calendário local, streak, metas, sessões de estudo e amostras do radar

**Files:**
- Create: `server/time.ts`
- Modify: `server/repo.ts`
- Test: `tests/time.test.ts` (novo), `tests/repo.test.ts`

**Interfaces:**
- Produces (`server/time.ts`): `localDate(iso): string` (`YYYY-MM-DD` local), `addDays(date, n): string`, `weekStart(iso): string` (segunda-feira local), `weekBounds(weekStartDate): { start: string; end: string }` (ISO, início inclusivo, fim exclusivo), `overlapMs(aStart, aEnd, bStart, bEnd): number`, `computeStreak(days: string[], today: string): { current: number; best: number; activeToday: boolean }`.
- Produces (`server/repo.ts`): `WeeklyGoalRow`, `getWeekGoal(db, weekStart)`, `upsertWeekGoal(db, weekStart, goal)`, `ensureWeekGoal(db, weekStart, goal)`; `StudySessionRow`, `latestStudySession(db)`, `insertStudySession(db, now, lessonId)`, `extendStudySession(db, id, now, lessonId)`, `studySessionsBetween(db, startIso, endIso)`; `activityDays(db): string[]`; `completedLessonsBetween(db, startIso, endIso): number`; `reviewsBetween(db, startIso, endIso): number`; `RadarSample = { value: number | null; samples: number }`, `attemptAccuracy(db, sinceIso, { blocks, tags, tagPrefix? })`, `writingAverage(db, sinceIso)`, `speakingAverage(db, sinceIso, "score" | "self_confidence")`, `readAloudAverage(db, sinceIso)`.
- Convenção: `goal` em camelCase `{ lessonsTarget, reviewsTarget, minutesTarget }`; linhas do banco em snake_case.

- [ ] **Step 1: Testes que falham**

Crie `tests/time.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { localDate, addDays, weekStart, weekBounds, overlapMs, computeStreak } from "../server/time.ts";

// Datas construídas no fuso local da máquina, como o servidor faz em produção.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0).toISOString();

describe("calendário local", () => {
  it("localDate uses the machine time zone", () => {
    expect(localDate(local(2026, 9, 9, 0))).toBe("2026-09-09");
    expect(localDate(local(2026, 9, 9, 23))).toBe("2026-09-09");
  });
  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
  });
  it("weekStart is the local Monday", () => {
    expect(weekStart(local(2026, 9, 9))).toBe("2026-09-07"); // quarta → segunda 7
    expect(weekStart(local(2026, 9, 7, 0))).toBe("2026-09-07"); // segunda
    expect(weekStart(local(2026, 9, 13, 23))).toBe("2026-09-07"); // domingo
    expect(weekStart(local(2026, 9, 14, 0))).toBe("2026-09-14");
  });
  it("weekBounds spans 7 local days", () => {
    const { start, end } = weekBounds("2026-09-07");
    expect(start).toBe(new Date(2026, 8, 7, 0, 0, 0).toISOString());
    expect(end).toBe(new Date(2026, 8, 14, 0, 0, 0).toISOString());
  });
});

describe("overlapMs", () => {
  it("returns the intersection length in ms, 0 when disjoint", () => {
    expect(overlapMs("2026-09-07T10:00:00.000Z", "2026-09-07T11:00:00.000Z", "2026-09-07T10:30:00.000Z", "2026-09-08T00:00:00.000Z")).toBe(30 * 60000);
    expect(overlapMs("2026-09-07T10:00:00.000Z", "2026-09-07T11:00:00.000Z", "2026-09-07T11:00:00.000Z", "2026-09-08T00:00:00.000Z")).toBe(0);
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-09-07", "2026-09-08", "2026-09-09"], "2026-09-09")).toEqual({ current: 3, best: 3, activeToday: true });
  });
  it("keeps the streak alive through yesterday, tracks the best run", () => {
    expect(computeStreak(["2026-09-01", "2026-09-02", "2026-09-08", "2026-09-08"], "2026-09-09")).toEqual({ current: 1, best: 2, activeToday: false });
  });
  it("is zero after a gap", () => {
    expect(computeStreak(["2026-09-05"], "2026-09-09")).toEqual({ current: 0, best: 1, activeToday: false });
    expect(computeStreak([], "2026-09-09")).toEqual({ current: 0, best: 0, activeToday: false });
  });
});
```

Acrescente a `tests/repo.test.ts` (estenda o import com `getWeekGoal, upsertWeekGoal, ensureWeekGoal, latestStudySession, insertStudySession, extendStudySession, studySessionsBetween, activityDays, completedLessonsBetween, reviewsBetween, attemptAccuracy, writingAverage, speakingAverage, readAloudAverage`):

```ts
describe("weekly_goals", () => {
  it("upserts and ensure does not overwrite", () => {
    expect(getWeekGoal(db, "2026-09-07")).toBeUndefined();
    ensureWeekGoal(db, "2026-09-07", { lessonsTarget: 3, reviewsTarget: 5, minutesTarget: 150 });
    upsertWeekGoal(db, "2026-09-07", { lessonsTarget: 4, reviewsTarget: 5, minutesTarget: 150 });
    ensureWeekGoal(db, "2026-09-07", { lessonsTarget: 9, reviewsTarget: 9, minutesTarget: 9 });
    expect(getWeekGoal(db, "2026-09-07")).toEqual({ week_start: "2026-09-07", lessons_target: 4, reviews_target: 5, minutes_target: 150 });
  });
});

describe("study_sessions", () => {
  it("inserts, extends and selects sessions overlapping a window", () => {
    const id = insertStudySession(db, t(1), null);
    extendStudySession(db, id, "2026-09-01T10:05:00.000Z", "M01-02");
    expect(latestStudySession(db)).toMatchObject({ id, started_at: t(1), ended_at: "2026-09-01T10:05:00.000Z", lesson_id: "M01-02" });
    insertStudySession(db, t(5), null);
    expect(studySessionsBetween(db, "2026-09-01T10:02:00.000Z", "2026-09-02T00:00:00.000Z").map((s) => s.id)).toEqual([id]);
    expect(studySessionsBetween(db, "2026-09-01T10:05:00.000Z", "2026-09-02T00:00:00.000Z")).toEqual([]);
  });
});

describe("atividade e contagens da semana", () => {
  const localIso = (d: number, h: number) => new Date(2026, 8, d, h, 0, 0).toISOString();
  it("activityDays unions attempts, writing, speaking and study sessions as local dates", () => {
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: true, tags: ["gram.since-for"] }, localIso(9, 12));
    insertWriting(db, { lessonId: "M01-02", text: "a", feedback: {}, score: null }, localIso(8, 23));
    insertSpeaking(db, { lessonId: "M01-02", mode: "A", transcript: "x", metrics: {}, score: 3, selfConfidence: null }, localIso(8, 1));
    insertStudySession(db, localIso(5, 9), null);
    expect(activityDays(db)).toEqual(["2026-09-05", "2026-09-08", "2026-09-09"]);
  });
  it("counts completed lessons and reviews inside [start, end)", () => {
    completeLesson(db, "M01-02", 0.9, "2026-09-08T12:00:00.000Z");
    db.prepare("insert into srs_cards (lesson_id, front, back, tag, due, created_at) values ('M01-02','f','b','vocab.standup',?,?)").run(t(1), t(1));
    db.prepare("insert into srs_reviews (card_id, grade, ts) values (1, 4, ?)").run("2026-09-08T13:00:00.000Z");
    db.prepare("insert into srs_reviews (card_id, grade, ts) values (1, 4, ?)").run("2026-09-14T00:00:00.000Z");
    expect(completedLessonsBetween(db, "2026-09-07T00:00:00.000Z", "2026-09-14T00:00:00.000Z")).toBe(1);
    expect(completedLessonsBetween(db, "2026-09-09T00:00:00.000Z", "2026-09-14T00:00:00.000Z")).toBe(0);
    expect(reviewsBetween(db, "2026-09-07T00:00:00.000Z", "2026-09-14T00:00:00.000Z")).toBe(1);
  });
});

describe("amostras do radar", () => {
  it("attemptAccuracy matches by block, tag list or tag prefix, counting each attempt once", () => {
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-l1", block: "listening", type: "multiple_choice", correct: true, tags: ["comp.listening", "vocab.ci"] }, t(2));
    insertAttempt(db, { lessonId: "placement", exerciseId: "PL-l01", block: "placement", type: "multiple_choice", correct: false, tags: ["comp.listening"] }, t(2));
    insertAttempt(db, { lessonId: "placement", exerciseId: "PL-v01", block: "placement", type: "multiple_choice", correct: true, tags: ["comp.vocabulary", "vocab.ci"] }, t(2));
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: true, tags: ["gram.since-for"] }, t(1));
    expect(attemptAccuracy(db, t(2), { blocks: ["listening"], tags: ["comp.listening"] })).toEqual({ value: 0.5, samples: 2 });
    expect(attemptAccuracy(db, t(2), { blocks: [], tags: ["comp.vocabulary"], tagPrefix: "vocab." })).toEqual({ value: 1, samples: 2 });
    expect(attemptAccuracy(db, t(2), { blocks: [], tags: ["comp.reading"] })).toEqual({ value: null, samples: 0 });
    expect(attemptAccuracy(db, t(3), { blocks: ["listening"], tags: [] })).toEqual({ value: null, samples: 0 });
  });
  it("writing, speaking and read-aloud averages ignore nulls and the window", () => {
    insertWriting(db, { lessonId: "M01-02", text: "a", feedback: {}, score: 4 }, t(2));
    insertWriting(db, { lessonId: "M01-02", text: "b", feedback: {}, score: null }, t(2));
    insertWriting(db, { lessonId: "M01-02", text: "c", feedback: {}, score: 1 }, t(1));
    insertSpeaking(db, { lessonId: "placement", mode: "A", transcript: "x", metrics: { readAloudPct: 0.9 }, score: 3, selfConfidence: 4 }, t(2));
    insertSpeaking(db, { lessonId: "M01-02", mode: "A", transcript: "y", metrics: {}, score: 5, selfConfidence: null }, t(2));
    expect(writingAverage(db, t(2))).toEqual({ value: 0.8, samples: 1 });
    expect(speakingAverage(db, t(2), "score")).toEqual({ value: 0.8, samples: 2 });
    expect(speakingAverage(db, t(2), "self_confidence")).toEqual({ value: 0.8, samples: 1 });
    expect(readAloudAverage(db, t(2))).toEqual({ value: 0.9, samples: 1 });
    expect(readAloudAverage(db, t(3))).toEqual({ value: null, samples: 0 });
  });
});
```

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/time.test.ts tests/repo.test.ts`
Expected: FAIL — `server/time.ts` não existe; funções não exportadas de `repo.ts`.

- [ ] **Step 3: Crie `server/time.ts`**

```ts
// Calendário no fuso local da máquina (uso pessoal, um computador). Datas locais são strings YYYY-MM-DD.
const pad = (n: number) => String(n).padStart(2, "0");

function fromLocalDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Data local (YYYY-MM-DD) de um instante ISO. */
export function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date: string, n: number): string {
  const d = fromLocalDate(date);
  d.setDate(d.getDate() + n);
  return localDate(d.toISOString());
}

/** Segunda-feira local da semana que contém o instante. */
export function weekStart(iso: string): string {
  const d = new Date(iso);
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return localDate(d.toISOString());
}

/** Início (inclusivo) e fim (exclusivo) da semana local, como instantes ISO. */
export function weekBounds(weekStartDate: string): { start: string; end: string } {
  return { start: fromLocalDate(weekStartDate).toISOString(), end: fromLocalDate(addDays(weekStartDate, 7)).toISOString() };
}

/** Milissegundos da interseção de [aStart, aEnd) com [bStart, bEnd). */
export function overlapMs(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  const s = Math.max(Date.parse(aStart), Date.parse(bStart));
  const e = Math.min(Date.parse(aEnd), Date.parse(bEnd));
  return e > s ? e - s : 0;
}

/** Streak a partir das datas locais com atividade. `current` conta até hoje, ou até ontem se hoje ainda não teve atividade. */
export function computeStreak(days: string[], today: string): { current: number; best: number; activeToday: boolean } {
  const set = new Set(days);
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...set].sort()) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const activeToday = set.has(today);
  let current = 0;
  let cursor = activeToday ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, best, activeToday };
}
```

- [ ] **Step 4: `server/repo.ts`** — acrescente ao final:

```ts
// ---------- metas semanais ----------
export type WeeklyGoalRow = { week_start: string; lessons_target: number; reviews_target: number; minutes_target: number };
export type WeekGoalInput = { lessonsTarget: number; reviewsTarget: number; minutesTarget: number };

export function getWeekGoal(db: Db, weekStart: string): WeeklyGoalRow | undefined {
  return db.prepare("select * from weekly_goals where week_start = ?").get(weekStart) as WeeklyGoalRow | undefined;
}

export function upsertWeekGoal(db: Db, weekStart: string, g: WeekGoalInput): WeeklyGoalRow {
  db.prepare(
    `insert into weekly_goals (week_start, lessons_target, reviews_target, minutes_target) values (?,?,?,?)
     on conflict(week_start) do update set lessons_target = excluded.lessons_target, reviews_target = excluded.reviews_target, minutes_target = excluded.minutes_target`,
  ).run(weekStart, g.lessonsTarget, g.reviewsTarget, g.minutesTarget);
  return getWeekGoal(db, weekStart)!;
}

/** Cria a meta da semana se não existir; nunca sobrescreve. */
export function ensureWeekGoal(db: Db, weekStart: string, g: WeekGoalInput): WeeklyGoalRow {
  db.prepare("insert or ignore into weekly_goals (week_start, lessons_target, reviews_target, minutes_target) values (?,?,?,?)").run(weekStart, g.lessonsTarget, g.reviewsTarget, g.minutesTarget);
  return getWeekGoal(db, weekStart)!;
}

// ---------- sessões de estudo ----------
export type StudySessionRow = { id: number; started_at: string; ended_at: string | null; lesson_id: string | null };

export function latestStudySession(db: Db): StudySessionRow | undefined {
  return db.prepare("select * from study_sessions order by coalesce(ended_at, started_at) desc, id desc limit 1").get() as StudySessionRow | undefined;
}

export function insertStudySession(db: Db, now: string, lessonId: string | null): number {
  const r = db.prepare("insert into study_sessions (started_at, ended_at, lesson_id) values (?,?,?)").run(now, now, lessonId);
  return Number(r.lastInsertRowid);
}

export function extendStudySession(db: Db, id: number, now: string, lessonId: string | null): void {
  db.prepare("update study_sessions set ended_at = ?, lesson_id = coalesce(?, lesson_id) where id = ?").run(now, lessonId, id);
}

/** Sessões que intersectam [startIso, endIso). */
export function studySessionsBetween(db: Db, startIso: string, endIso: string): StudySessionRow[] {
  return db.prepare("select * from study_sessions where started_at < ? and coalesce(ended_at, started_at) > ? order by started_at").all(endIso, startIso) as StudySessionRow[];
}

// ---------- atividade (dias locais) e contagens ----------
export function activityDays(db: Db): string[] {
  const rows = db
    .prepare(
      `select distinct d from (
         select date(ts, 'localtime') as d from attempts
         union select date(ts, 'localtime') from writing_submissions
         union select date(ts, 'localtime') from speaking_sessions
         union select date(started_at, 'localtime') from study_sessions
       ) order by d`,
    )
    .all() as { d: string }[];
  return rows.map((r) => r.d);
}

export function completedLessonsBetween(db: Db, startIso: string, endIso: string): number {
  return (db.prepare("select count(*) as n from lesson_progress where status = 'completed' and completed_at >= ? and completed_at < ?").get(startIso, endIso) as { n: number }).n;
}

export function reviewsBetween(db: Db, startIso: string, endIso: string): number {
  return (db.prepare("select count(*) as n from srs_reviews where ts >= ? and ts < ?").get(startIso, endIso) as { n: number }).n;
}

// ---------- amostras do radar ----------
export type RadarSample = { value: number | null; samples: number };

/** Acerto médio das tentativas desde `sinceIso` que casam por bloco OU por tag (lista exata ou prefixo). Cada tentativa conta uma vez. */
export function attemptAccuracy(db: Db, sinceIso: string, match: { blocks: string[]; tags: string[]; tagPrefix?: string }): RadarSample {
  const conds: string[] = [];
  const params: string[] = [sinceIso];
  if (match.blocks.length > 0) {
    conds.push(`a.block in (${match.blocks.map(() => "?").join(",")})`);
    params.push(...match.blocks);
  }
  const tagConds: string[] = [];
  if (match.tags.length > 0) {
    tagConds.push(`j.value in (${match.tags.map(() => "?").join(",")})`);
    params.push(...match.tags);
  }
  if (match.tagPrefix) {
    tagConds.push("j.value like ?");
    params.push(`${match.tagPrefix}%`);
  }
  if (tagConds.length > 0) conds.push(`exists (select 1 from json_each(a.tags_json) j where ${tagConds.join(" or ")})`);
  if (conds.length === 0) return { value: null, samples: 0 };
  const row = db.prepare(`select count(*) as n, coalesce(sum(a.correct), 0) as ok from attempts a where a.ts >= ? and (${conds.join(" or ")})`).get(...params) as { n: number; ok: number };
  return { value: row.n === 0 ? null : row.ok / row.n, samples: row.n };
}

function average(db: Db, sql: string, sinceIso: string, divisor: number): RadarSample {
  const row = db.prepare(sql).get(sinceIso) as { n: number; avg: number | null };
  return { value: row.n === 0 || row.avg === null ? null : row.avg / divisor, samples: row.n };
}

export function writingAverage(db: Db, sinceIso: string): RadarSample {
  return average(db, "select count(*) as n, avg(score) as avg from writing_submissions where ts >= ? and score is not null", sinceIso, 5);
}

export function speakingAverage(db: Db, sinceIso: string, column: "score" | "self_confidence"): RadarSample {
  const col = column === "score" ? "score" : "self_confidence";
  return average(db, `select count(*) as n, avg(${col}) as avg from speaking_sessions where ts >= ? and ${col} is not null`, sinceIso, 5);
}

export function readAloudAverage(db: Db, sinceIso: string): RadarSample {
  return average(db, "select count(*) as n, avg(json_extract(metrics_json, '$.readAloudPct')) as avg from speaking_sessions where ts >= ? and json_extract(metrics_json, '$.readAloudPct') is not null", sinceIso, 1);
}
```

(`col` vem de um `enum` de string do TypeScript, nunca de entrada do usuário: a interpolação é segura.)

- [ ] **Step 5: Verifique**

Run: `pnpm test && pnpm typecheck`
Expected: PASS. Se `activityDays` devolver datas deslocadas, a máquina tem fuso ≠ do JS (impossível no mesmo processo) — investigue antes de tocar no teste.

- [ ] **Step 6: Commit**

```bash
git add server/time.ts server/repo.ts tests/time.test.ts tests/repo.test.ts
git commit -m "feat(server): calendário local, streak, metas semanais, sessões de estudo e amostras do radar"
```

---

### Task 7: Rotas do teste inicial (`/api/placement/*`)

**Files:**
- Modify: `server/app.ts`
- Test: `tests/placement-routes.test.ts` (novo)

**Interfaces:**
- Consumes: T2 (`wordOverlap`, motores por spec), T4 (`latestAttemptsSince`, `latestWritingSince`, `latestSpeakingSince`, `insertAssessment`, `latestAssessment`), T5 (`computePlacementResult`, `missingForFinish`, `parsePlacementAssessment`, `PlacementInputs`), T6 (`weekStart`, `ensureWeekGoal`).
- Produces: `GET /api/placement/state`, `POST /api/placement/writing`, `POST /api/placement/speaking`, `POST /api/placement/finish`; `DEFAULT_GOAL` exportado de `server/app.ts`.

- [ ] **Step 1: Testes que falham** — crie `tests/placement-routes.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp, DEFAULT_GOAL } from "../server/app.ts";
import { openDb, type Db } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";
import { placementExercises } from "../shared/schema.ts";
import { listAssessments } from "../server/repo.ts";
import { weekStart } from "../server/time.ts";

const content = loadContent("content");
const p = content.placement;
const all = placementExercises(p);
let app: Hono;
let db: Db;
let clock = 0;
const now = () => new Date(Date.UTC(2026, 8, 9, 10, 0, clock++)).toISOString();

beforeEach(() => {
  clock = 0;
  db = openDb(":memory:");
  app = createApp({ db, content, now });
});

const json = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const get = async (path: string) => (await app.request(path)).json();

async function answer(isCorrect: (id: string) => boolean, only?: (id: string) => boolean) {
  for (const { exercise } of all) {
    if (only && !only(exercise.id)) continue;
    const res = await json("POST", "/api/attempts", { lessonId: "placement", exerciseId: exercise.id, block: "placement", type: exercise.type, correct: isCorrect(exercise.id), answer: "x", tags: exercise.tags });
    expect(res.status).toBe(200);
  }
}

describe("GET /api/placement/state", () => {
  it("is empty at first", async () => {
    expect(await get("/api/placement/state")).toEqual({ latest: null, run: { answered: [], writing: null, speaking: null } });
  });
  it("lists answered ids of the current run", async () => {
    await answer(() => true, (id) => id === "PL-r01" || id === "PL-v02");
    const state = await get("/api/placement/state");
    expect(state.run.answered.sort()).toEqual(["PL-r01", "PL-v02"]);
  });
});

describe("POST /api/placement/finish", () => {
  it("refuses an incomplete run with 409 and the missing list", async () => {
    await answer(() => true, (id) => id !== "PL-g10");
    const res = await json("POST", "/api/placement/finish");
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "teste incompleto", missing: { exercises: ["PL-g10"], writing: true } });
  });
  it("needs a self score on the writing", async () => {
    await answer(() => true);
    expect((await json("POST", "/api/placement/writing", { text: p.writing.model })).status).toBe(200);
    const res = await json("POST", "/api/placement/finish");
    expect(res.status).toBe(409);
    expect((await res.json()).missing).toEqual({ exercises: [], writing: true });
  });
  it("full run: attempts → writing → speaking → finish stores the assessment and the week goal", async () => {
    await answer((id) => !id.startsWith("PL-l"));
    const w = await json("POST", "/api/placement/writing", { text: p.writing.model, selfScore: 4 });
    expect(w.status).toBe(200);
    expect((await w.json()).feedback.score).toBe(4);
    const s = await json("POST", "/api/placement/speaking", {
      readAloud: [{ target: p.speaking.readAloud[0], transcript: p.speaking.readAloud[0] }, { target: p.speaking.readAloud[1], transcript: "" }],
      transcript: "Yesterday I worked on the VPC module and I finished the peering config. No blockers.", durationSec: 20, selfConfidence: 3,
    });
    expect(s.status).toBe(200);
    const sBody = await s.json();
    expect(sBody.metrics.readAloudPct).toBeCloseTo(0.5);
    expect(sBody.metrics.used).toEqual(expect.arrayContaining(["I worked on", "I finished", "no blockers"]));

    const fin = await json("POST", "/api/placement/finish");
    expect(fin.status).toBe(200);
    const { assessment } = await fin.json();
    expect(assessment.result.level).toBe(3);
    expect(assessment.result.blocks.listening.pct).toBe(0);
    expect(assessment.result.radar.PRO).toBeCloseTo(0.5);
    expect(assessment.result.radar.CNF).toBeCloseTo(0.6);

    const state = await get("/api/placement/state");
    expect(state.latest.id).toBe(assessment.id);
    expect(state.run).toEqual({ answered: [], writing: null, speaking: null });

    const goal = db.prepare("select * from weekly_goals").all();
    expect(goal).toEqual([{ week_start: weekStart(assessment.ts), lessons_target: DEFAULT_GOAL.lessonsTarget, reviews_target: DEFAULT_GOAL.reviewsTarget, minutes_target: DEFAULT_GOAL.minutesTarget }]);
  });
  it("a retake after finish creates a second assessment and becomes the latest", async () => {
    await answer(() => false);
    await json("POST", "/api/placement/writing", { text: p.writing.model, selfScore: 2 });
    const first = (await (await json("POST", "/api/placement/finish")).json()).assessment;
    expect(first.result.level).toBe(1);
    await answer(() => true);
    await json("POST", "/api/placement/writing", { text: p.writing.model, selfScore: 5 });
    const second = (await (await json("POST", "/api/placement/finish")).json()).assessment;
    expect(second.result.level).toBe(3);
    expect(listAssessments(db)).toHaveLength(2);
    expect((await get("/api/placement/state")).latest.id).toBe(second.id);
  });
});

describe("validation", () => {
  it("400 on invalid writing and speaking bodies", async () => {
    expect((await json("POST", "/api/placement/writing", { text: "" })).status).toBe(400);
    expect((await json("POST", "/api/placement/speaking", { transcript: "x", durationSec: 0 })).status).toBe(400);
    expect((await json("POST", "/api/placement/speaking", { readAloud: [{ target: "a" }], transcript: "x", durationSec: 5 })).status).toBe(400);
  });
});
```

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/placement-routes.test.ts`
Expected: FAIL — `DEFAULT_GOAL` não exportado; rotas 404.

- [ ] **Step 3: Implemente em `server/app.ts`**

Imports adicionais:

```ts
import { wordOverlap } from "../shared/speech-compare.ts";
import {
  // ...os já importados...
  insertAssessment, latestAssessment, latestAttemptsSince, latestWritingSince, latestSpeakingSince, ensureWeekGoal,
} from "./repo.ts";
import { computePlacementResult, missingForFinish, parsePlacementAssessment, type PlacementInputs } from "./placement.ts";
import { weekStart } from "./time.ts";
```

Constantes e schemas (nível de módulo, junto dos outros `*Body`):

```ts
/** Meta semanal criada ao concluir o teste inicial (trilha assume 3 aulas/semana). */
export const DEFAULT_GOAL = { lessonsTarget: 3, reviewsTarget: 5, minutesTarget: 150 };

const PlacementSpeakingBody = z.object({
  readAloud: z.array(z.object({ target: z.string().min(1), transcript: z.string() })).default([]),
  transcript: z.string().trim().min(1),
  durationSec: z.number().positive(),
  selfConfidence: z.number().int().min(1).max(5).optional(),
});
```

Sub-router, antes de `app.route("/api/lessons", lessons);`:

```ts
  // ---------- teste inicial ----------
  const placement = new Hono();
  const pl = content.placement;
  /** A rodada atual é tudo que foi gravado depois da última avaliação ("" = desde sempre). */
  const runInputs = (): { since: string; inputs: PlacementInputs } => {
    const since = latestAssessment(db, "placement", "placement")?.ts ?? "";
    return {
      since,
      inputs: {
        attempts: latestAttemptsSince(db, "placement", "placement", since),
        writing: latestWritingSince(db, "placement", since),
        speaking: latestSpeakingSince(db, "placement", since),
      },
    };
  };

  placement.get("/state", (c) => {
    const latestRow = latestAssessment(db, "placement", "placement");
    const { inputs } = runInputs();
    return c.json({
      latest: latestRow ? parsePlacementAssessment(latestRow) : null,
      run: { answered: [...inputs.attempts.keys()], writing: inputs.writing ?? null, speaking: inputs.speaking ?? null },
    });
  });

  placement.post("/writing", async (c) => {
    const parsed = WritingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const feedback = ruleBasedFeedback(parsed.data.text, pl.writing, content.brErrors, parsed.data.selfScore);
    const id = insertWriting(db, { lessonId: "placement", text: parsed.data.text, feedback, score: feedback.score }, now());
    return c.json({ id, feedback });
  });

  placement.post("/speaking", async (c) => {
    const parsed = PlacementSpeakingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const { readAloud, transcript, durationSec, selfConfidence } = parsed.data;
    const readAloudPct = readAloud.length === 0 ? 0 : readAloud.reduce((sum, r) => sum + wordOverlap(r.transcript, r.target), 0) / readAloud.length;
    const metrics = { ...computeSpeakingMetrics(transcript, durationSec, pl.speaking.modeA, content.brErrors), readAloudPct };
    const id = insertSpeaking(db, { lessonId: "placement", mode: "A", transcript, metrics, score: metrics.score, selfConfidence: selfConfidence ?? null }, now());
    return c.json({ id, metrics });
  });

  placement.post("/finish", (c) => {
    const { inputs } = runInputs();
    const missing = missingForFinish(pl, inputs);
    if (missing.exercises.length > 0 || missing.writing) return c.json({ error: "teste incompleto", missing }, 409);
    const ts = now();
    const result = computePlacementResult(pl, inputs, ts);
    const id = insertAssessment(db, { kind: "placement", ref: "placement", score: result }, ts);
    ensureWeekGoal(db, weekStart(ts), DEFAULT_GOAL);
    return c.json({ assessment: { id, ts, result } });
  });

  app.route("/api/placement", placement);
```

- [ ] **Step 4: Verifique**

Run: `pnpm test && pnpm typecheck`
Expected: PASS. No teste "full run", `radar.CNF` = 3/5 = 0,6 e `PRO` = média(1, 0) = 0,5.

- [ ] **Step 5: Commit**

```bash
git add server/app.ts tests/placement-routes.test.ts
git commit -m "feat(server): rotas do teste inicial (estado, escrita, fala, conclusão)"
```

---

### Task 8: Painel, metas e heartbeat (`server/dashboard.ts` + rotas)

**Files:**
- Create: `server/dashboard.ts`
- Modify: `server/app.ts`
- Test: `tests/dashboard.test.ts` (novo)

**Interfaces:**
- Consumes: T6 (`time.ts`, repo de metas/sessões/atividade/radar), T5 (`parsePlacementAssessment`, `PlacementAssessment`, `PlacementResult`), `tagStats`, `weakTags`, `listAssessments`, `latestAssessment`, `Tag`.
- Produces: `WeekGoal`, `Dashboard`, `buildDashboard(db, content, nowIso, days)`; `GET /api/dashboard?days=30`, `PUT /api/goals/week`, `POST /api/study/heartbeat`; `HEARTBEAT_GAP_MS = 120_000`.

- [ ] **Step 1: Testes que falham** — crie `tests/dashboard.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../server/app.ts";
import { openDb, type Db } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";
import { insertAssessment, insertAttempt, completeLesson } from "../server/repo.ts";
import { weekStart } from "../server/time.ts";

const content = loadContent("content");
let app: Hono;
let db: Db;
// Relógio controlável: quarta-feira 2026-09-09 15:00 no fuso local da máquina.
let current = new Date(2026, 8, 9, 15, 0, 0).toISOString();
const now = () => current;
const at = (dayOffset: number, hour: number) => new Date(2026, 8, 9 + dayOffset, hour, 0, 0).toISOString();

beforeEach(() => {
  current = at(0, 15);
  db = openDb(":memory:");
  app = createApp({ db, content, now });
});
const json = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const dashboard = async (days?: number) => (await app.request(`/api/dashboard${days ? `?days=${days}` : ""}`)).json();

describe("GET /api/dashboard", () => {
  it("is empty but well-formed with no data", async () => {
    const d = await dashboard();
    expect(d.since).toBe(new Date(Date.parse(current) - 30 * 864e5).toISOString());
    for (const key of ["REA", "VOC", "LIS", "WRI", "SPK", "PRO", "CNF"]) expect(d.radar[key]).toEqual({ value: null, samples: 0 });
    expect(d.tags).toEqual({ stats: [], weak: [] });
    expect(d.streak).toEqual({ current: 0, best: 0, activeToday: false });
    expect(d.week).toEqual({ weekStart: weekStart(current), goal: null, progress: { lessons: 0, reviews: 0, minutes: 0 } });
    expect(d.placement).toEqual({ latest: null });
    expect(d.timeline).toEqual([]);
  });

  it("radar mixes lesson and placement data; tags carry labels; streak and week reflect activity", async () => {
    current = at(-1, 10);
    await json("POST", "/api/attempts", { lessonId: "M01-02", exerciseId: "M01-02-l1", block: "listening", type: "multiple_choice", correct: true, tags: ["comp.listening"] });
    await json("POST", "/api/attempts", { lessonId: "placement", exerciseId: "PL-l01", block: "placement", type: "multiple_choice", correct: false, tags: ["comp.listening"] });
    await json("POST", "/api/attempts", { lessonId: "placement", exerciseId: "PL-r01", block: "placement", type: "multiple_choice", correct: true, tags: ["comp.reading", "vocab.security"] });
    current = at(0, 9);
    await json("POST", "/api/placement/writing", { text: content.placement.writing.model, selfScore: 4 });
    await json("POST", "/api/placement/speaking", { readAloud: [{ target: "the deploy failed", transcript: "the deploy failed" }], transcript: "I worked on the module. No blockers.", durationSec: 10, selfConfidence: 3 });
    completeLesson(db, "M01-02", 0.9, current);
    current = at(0, 15);

    const d = await dashboard();
    expect(d.radar.LIS).toEqual({ value: 0.5, samples: 2 });
    expect(d.radar.REA).toEqual({ value: 1, samples: 1 });
    expect(d.radar.VOC).toEqual({ value: 1, samples: 1 });
    expect(d.radar.WRI).toEqual({ value: 0.8, samples: 1 });
    expect(d.radar.PRO).toEqual({ value: 1, samples: 1 });
    expect(d.radar.CNF).toEqual({ value: 0.6, samples: 1 });
    expect(d.radar.SPK.samples).toBe(1);
    const lis = d.tags.stats.find((s: { tag: string }) => s.tag === "comp.listening");
    expect(lis).toMatchObject({ attempts: 2, errors: 1, label: "Compreensão auditiva", group: "comp" });
    expect(d.streak).toEqual({ current: 2, best: 2, activeToday: true });
    expect(d.week.progress.lessons).toBe(1);
  });

  it("streak stays alive through yesterday and the window filter applies", async () => {
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: true, tags: ["gram.since-for"] }, at(-1, 12));
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: false, tags: ["gram.since-for"] }, at(-40, 12));
    const d = await dashboard(7);
    expect(d.streak).toEqual({ current: 1, best: 1, activeToday: false });
    expect(d.tags.stats.find((s: { tag: string }) => s.tag === "gram.since-for")).toMatchObject({ attempts: 1, errors: 0 });
  });

  it("timeline lists assessments newest first with level and pct", async () => {
    insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 1, pct: 0.4 } }, at(-3, 10));
    const later = insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 2, pct: 0.7 } }, at(-1, 10));
    const d = await dashboard();
    expect(d.timeline.map((t: { id: number }) => t.id)[0]).toBe(later);
    expect(d.timeline[0]).toMatchObject({ kind: "placement", ref: "placement", summary: { level: 2, pct: 0.7 } });
    expect(d.placement.latest.id).toBe(later);
  });
});

describe("POST /api/study/heartbeat", () => {
  it("creates, extends and reopens sessions; the week sums whole minutes", async () => {
    current = at(0, 10);
    const first = await (await json("POST", "/api/study/heartbeat", {})).json();
    expect(first.resumed).toBe(false);
    current = new Date(Date.parse(at(0, 10)) + 60_000).toISOString();
    const second = await (await json("POST", "/api/study/heartbeat", { lessonId: "M01-02" })).json();
    expect(second).toEqual({ sessionId: first.sessionId, resumed: true });
    current = new Date(Date.parse(at(0, 10)) + 60_000 + 121_000).toISOString();
    const third = await (await json("POST", "/api/study/heartbeat")).json();
    expect(third.resumed).toBe(false);
    expect(third.sessionId).not.toBe(first.sessionId);
    current = at(0, 15);
    expect((await dashboard()).week.progress.minutes).toBe(1);
    expect(db.prepare("select lesson_id from study_sessions where id = ?").get(first.sessionId)).toEqual({ lesson_id: "M01-02" });
  });
  it("rejects a malformed body", async () => {
    expect((await json("POST", "/api/study/heartbeat", { lessonId: 5 })).status).toBe(400);
  });
});

describe("PUT /api/goals/week", () => {
  it("upserts the current week's goal and validates", async () => {
    const res = await json("PUT", "/api/goals/week", { lessonsTarget: 3, reviewsTarget: 5, minutesTarget: 150 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ weekStart: weekStart(current), goal: { lessonsTarget: 3, reviewsTarget: 5, minutesTarget: 150 } });
    await json("PUT", "/api/goals/week", { lessonsTarget: 4, reviewsTarget: 5, minutesTarget: 150 });
    expect((await dashboard()).week.goal).toEqual({ lessonsTarget: 4, reviewsTarget: 5, minutesTarget: 150 });
    expect((await json("PUT", "/api/goals/week", { lessonsTarget: -1, reviewsTarget: 5, minutesTarget: 150 })).status).toBe(400);
    expect((await json("PUT", "/api/goals/week", { lessonsTarget: 3 })).status).toBe(400);
  });
  it("week progress counts only the part of a session that falls inside the week", async () => {
    const [y, m, d] = weekStart(current).split("-").map(Number) as [number, number, number];
    const mondayMidnight = new Date(y, m - 1, d, 0, 0, 0);
    const start = new Date(mondayMidnight.getTime() - 30 * 60000).toISOString(); // domingo 23:30
    const end = new Date(mondayMidnight.getTime() + 30 * 60000).toISOString(); // segunda 00:30
    db.prepare("insert into study_sessions (started_at, ended_at, lesson_id) values (?,?,null)").run(start, end);
    expect((await dashboard()).week.progress.minutes).toBe(30);
  });
});
```

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/dashboard.test.ts`
Expected: FAIL — rotas 404.

- [ ] **Step 3: Crie `server/dashboard.ts`**

```ts
import type { Db } from "./db.ts";
import type { Competency, ContentBundle, Tag } from "../shared/schema.ts";
import {
  activityDays, attemptAccuracy, completedLessonsBetween, getWeekGoal, latestAssessment, listAssessments,
  readAloudAverage, reviewsBetween, speakingAverage, studySessionsBetween, tagStats, writingAverage, type RadarSample, type TagStat,
} from "./repo.ts";
import { weakTags } from "./warmup.ts";
import { computeStreak, localDate, overlapMs, weekBounds, weekStart } from "./time.ts";
import { parsePlacementAssessment, type PlacementAssessment, type PlacementResult } from "./placement.ts";

export type WeekGoal = { lessonsTarget: number; reviewsTarget: number; minutesTarget: number };
export type Dashboard = {
  since: string;
  radar: Record<Competency, RadarSample>;
  tags: { stats: Array<TagStat & { label: string; group: Tag["group"] }>; weak: string[] };
  streak: { current: number; best: number; activeToday: boolean };
  week: { weekStart: string; goal: WeekGoal | null; progress: { lessons: number; reviews: number; minutes: number } };
  placement: { latest: PlacementAssessment | null };
  timeline: Array<{ id: number; kind: string; ref: string; ts: string; summary: { level?: number; pct?: number } }>;
};

const DAY = 864e5;

/** Monta o painel a partir do banco. `nowIso` vem do relógio injetável do app; `days` é a janela do radar/heatmap. */
export function buildDashboard(db: Db, content: ContentBundle, nowIso: string, days: number): Dashboard {
  const since = new Date(Date.parse(nowIso) - days * DAY).toISOString();
  const radar: Record<Competency, RadarSample> = {
    LIS: attemptAccuracy(db, since, { blocks: ["listening"], tags: ["comp.listening"] }),
    REA: attemptAccuracy(db, since, { blocks: [], tags: ["comp.reading"] }),
    VOC: attemptAccuracy(db, since, { blocks: [], tags: ["comp.vocabulary"], tagPrefix: "vocab." }),
    WRI: writingAverage(db, since),
    SPK: speakingAverage(db, since, "score"),
    PRO: readAloudAverage(db, since),
    CNF: speakingAverage(db, since, "self_confidence"),
  };

  const byId = new Map(content.tags.map((t) => [t.id, t]));
  const stats = tagStats(db, since).map((s) => ({ ...s, label: byId.get(s.tag)?.label ?? s.tag, group: byId.get(s.tag)?.group ?? ("topic" as const) }));

  const ws = weekStart(nowIso);
  const { start, end } = weekBounds(ws);
  const goalRow = getWeekGoal(db, ws);
  const minutesMs = studySessionsBetween(db, start, end).reduce((sum, s) => sum + overlapMs(s.started_at, s.ended_at ?? s.started_at, start, end), 0);

  const placementRow = latestAssessment(db, "placement", "placement");
  const timeline = listAssessments(db).map((r) => {
    const s = JSON.parse(r.score_json) as Partial<PlacementResult>;
    return { id: r.id, kind: r.kind, ref: r.ref, ts: r.ts, summary: { level: s.level, pct: s.pct } };
  });

  return {
    since,
    radar,
    tags: { stats, weak: weakTags(db, new Date(nowIso)) },
    streak: computeStreak(activityDays(db), localDate(nowIso)),
    week: {
      weekStart: ws,
      goal: goalRow ? { lessonsTarget: goalRow.lessons_target, reviewsTarget: goalRow.reviews_target, minutesTarget: goalRow.minutes_target } : null,
      progress: { lessons: completedLessonsBetween(db, start, end), reviews: reviewsBetween(db, start, end), minutes: Math.floor(minutesMs / 60000) },
    },
    placement: { latest: placementRow ? parsePlacementAssessment(placementRow) : null },
    timeline,
  };
}
```

- [ ] **Step 4: Rotas em `server/app.ts`**

Imports: `import { buildDashboard } from "./dashboard.ts";` e, de `./repo.ts`, acrescente `upsertWeekGoal, latestStudySession, insertStudySession, extendStudySession`.

Nível de módulo:

```ts
/** Heartbeat mais antigo que isso abre uma sessão nova. */
export const HEARTBEAT_GAP_MS = 120_000;

const GoalBody = z.object({
  lessonsTarget: z.number().int().min(0).max(50),
  reviewsTarget: z.number().int().min(0).max(500),
  minutesTarget: z.number().int().min(0).max(3000),
});
const HeartbeatBody = z.object({ lessonId: z.string().min(1).optional() });

/** `days` da query: inteiro entre 1 e 365; qualquer outra coisa vira 30. */
function sanitizeDays(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.min(365, Math.floor(n)) : 30;
}
```

Substitua o cálculo de `days` em `/api/tags/stats` por `const days = sanitizeDays(c.req.query("days"));` e adicione, logo depois dessa rota:

```ts
  app.get("/api/dashboard", (c) => c.json(buildDashboard(db, content, now(), sanitizeDays(c.req.query("days")))));

  app.put("/api/goals/week", async (c) => {
    const parsed = GoalBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const ws = weekStart(now());
    const row = upsertWeekGoal(db, ws, parsed.data);
    return c.json({ weekStart: ws, goal: { lessonsTarget: row.lessons_target, reviewsTarget: row.reviews_target, minutesTarget: row.minutes_target } });
  });

  app.post("/api/study/heartbeat", async (c) => {
    // Corpo vazio é válido: heartbeat sem aula.
    const parsed = HeartbeatBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const ts = now();
    const lessonId = parsed.data.lessonId ?? null;
    const last = latestStudySession(db);
    if (last && Date.parse(ts) - Date.parse(last.ended_at ?? last.started_at) <= HEARTBEAT_GAP_MS) {
      extendStudySession(db, last.id, ts, lessonId);
      return c.json({ sessionId: last.id, resumed: true });
    }
    return c.json({ sessionId: insertStudySession(db, ts, lessonId), resumed: false });
  });
```

- [ ] **Step 5: Verifique**

Run: `pnpm test && pnpm typecheck`
Expected: PASS. O teste existente `tag stats ignores a non-numeric days param` continua verde com `sanitizeDays`.

- [ ] **Step 6: Commit**

```bash
git add server/dashboard.ts server/app.ts tests/dashboard.test.ts
git commit -m "feat(server): painel, meta semanal e heartbeat de sessões de estudo"
```

---

### Task 9: Warm-up com itens do teste inicial

**Files:**
- Modify: `server/warmup.ts`
- Test: `tests/warmup.test.ts`

**Interfaces:**
- Consumes: `placementExercises` (T1/T3), `latestAssessment` (T4).
- Produces: `selectWarmup` inclui exercícios do placement no pool quando existe avaliação de placement; devolve `[]` só quando o pool está vazio.

- [ ] **Step 1: Teste que falha** — acrescente a `tests/warmup.test.ts` (estenda o import de repo com `insertAssessment`):

```ts
  it("draws placement items for weak tags when no lesson is completed but the placement was taken", () => {
    insertAssessment(db, { kind: "placement", ref: "placement", score: { level: 1 } }, daysAgo(2));
    for (let i = 0; i < 4; i++) insertAttempt(db, { lessonId: "placement", exerciseId: "PL-g01", block: "placement", type: "error_correction", correct: false, tags: ["gram.since-for", "br.since-present"] }, daysAgo(2));
    const items = selectWarmup(db, content, "M01-02", now, rng);
    expect(items.length).toBe(5);
    expect(items.every((e) => e.id.startsWith("PL-"))).toBe(true);
    expect(items.some((e) => e.tags.includes("gram.since-for"))).toBe(true);
  });
```

(Dentro do `describe("selectWarmup")`. O teste existente "returns [] when no other lesson is completed" permanece: sem placement e sem aula, pool vazio.)

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/warmup.test.ts`
Expected: FAIL — devolve `[]`.

- [ ] **Step 3: Implemente em `server/warmup.ts`**

Imports: `import { allExercises } from "../shared/content-loader.ts";` permanece; acrescente `import { placementExercises } from "../shared/schema.ts";` e `latestAssessment` ao import de `./repo.ts`. Substitua o trecho de `const completed = ...` até `const pool: Candidate[] = ...;` por:

```ts
  const completed = listProgress(db).filter((p) => p.status === "completed" && p.lesson_id !== lessonId && content.lessons[p.lesson_id]);
  const placementTs = latestAssessment(db, "placement", "placement")?.ts;
  const pool: Candidate[] = [
    ...completed.flatMap((p) =>
      allExercises(content.lessons[p.lesson_id]!).map(({ exercise }) => ({ exercise, lessonId: p.lesson_id, completedAt: p.completed_at ?? p.started_at })),
    ),
    // Itens do teste inicial entram no pool depois da primeira avaliação (spec: seção 13 da aula-exemplo).
    ...(placementTs ? placementExercises(content.placement).map(({ exercise }) => ({ exercise, lessonId: "placement", completedAt: placementTs })) : []),
  ];
  if (pool.length === 0) return [];
```

Atualize o comentário de doc da função: "Só aulas concluídas com conteúdo e, se houver avaliação, o teste inicial."

- [ ] **Step 4: Verifique**

Run: `pnpm test && pnpm typecheck`
Expected: PASS (todos os arquivos).

- [ ] **Step 5: Commit**

```bash
git add server/warmup.ts tests/warmup.test.ts
git commit -m "feat(server): warm-up usa itens do teste inicial nas tags fracas"
```

---

### Task 10: Cliente — API, rotas, navegação, heartbeat e componentes generalizados

**Files:**
- Modify: `src/lib/api.ts`, `src/App.tsx`, `src/components/Layout.tsx`, `src/components/exercises/ExerciseRunner.tsx`, `src/components/exercises/ExerciseList.tsx`, `src/components/lesson/Listening.tsx`, `src/components/lesson/Writing.tsx`, `src/components/lesson/Speaking.tsx`, `src/components/lesson/Stepper.tsx`, `src/pages/Lesson.tsx`, `src/pages/Module.tsx`
- Create: `src/lib/useStudyHeartbeat.ts`, `src/pages/Dashboard.tsx` (esqueleto mínimo, preenchido na T12), `src/pages/Placement.tsx` (esqueleto mínimo, preenchido na T11)

**Interfaces:**
- Consumes: tipos do servidor via `import type` (`PlacementResult`, `PlacementAssessment` de `server/placement.ts`; `Dashboard`, `WeekGoal` de `server/dashboard.ts`; `SpeakingRow`, `WritingRow` de `server/repo.ts`; `WritingSpec`, `SpeakingModeA`, `Block`, `Exercise` de `shared/schema.ts`).
- Produces: `ApiError` (com `status` e `body`); `api.placementState()`, `api.submitPlacementWriting(body)`, `api.submitPlacementSpeaking(body)`, `api.finishPlacement()`, `api.dashboard(days?)`, `api.setWeekGoal(goal)`, `api.heartbeat(lessonId?)`; `useStudyHeartbeat()`; `ExerciseList({ lessonId, block, exercises, feedback?, initialAnswered?, onFinished? })`; `ExerciseRunner({ exercise, onAnswered, feedback? })`; `Listening({ lessonId, block, lines, questions, feedback?, initialAnswered?, onFinished? })`; `Writing({ spec, fetchLatest, submit, minScoreLabel?, onSaved? })`; `Speaking({ spec, submit, title?, onSubmitted? })`; `Stepper({ steps, current, onSelect, readOnly? })`; rotas `/` (painel), `/trilha`, `/placement`.
- Sem teste automatizado (UI). Verificação: `pnpm typecheck && pnpm build` e a aula M01-02 continua funcionando no Chrome (T13).

- [ ] **Step 1: `src/lib/api.ts`** — substitua o arquivo inteiro:

```ts
import type { Block, Exercise } from "../../shared/schema.ts";
import type { AttemptInput, LessonProgressRow, SpeakingRow, TagStat, WritingRow } from "../../server/repo.ts";
import type { CompletionStatus } from "../../server/completion.ts";
import type { WritingFeedback } from "../../server/writing-feedback.ts";
import type { SpeakingMetrics } from "../../server/speaking-metrics.ts";
import type { PlacementAssessment } from "../../server/placement.ts";
import type { Dashboard, WeekGoal } from "../../server/dashboard.ts";

/** Erro HTTP com o corpo da resposta (ex.: 409 do finish traz `missing`). */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    let body: unknown = null;
    try {
      body = await res.json();
      const err = (body as { error?: string }).error;
      if (err) message = err;
    } catch {
      // corpo não é JSON; mantém a mensagem padrão
    }
    throw new ApiError(message, res.status, body);
  }
  return (await res.json()) as T;
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) });

export type LessonStatus = { progress: LessonProgressRow | null; completion: CompletionStatus };
export type PlacementState = { latest: PlacementAssessment | null; run: { answered: string[]; writing: WritingRow | null; speaking: SpeakingRow | null } };
export type ReadAloudEntry = { target: string; transcript: string };
export type PlacementSpeakingMetrics = SpeakingMetrics & { readAloudPct: number };
export type { Block, Exercise, WeekGoal, Dashboard, PlacementAssessment, WritingRow, SpeakingRow, WritingFeedback, SpeakingMetrics, TagStat };

export const api = {
  overview: () => request<{ lessons: LessonProgressRow[] }>("/api/progress/overview"),
  tagStats: (days = 30) => request<{ since: string; stats: TagStat[]; weak: string[] }>(`/api/tags/stats?days=${days}`),
  startLesson: (id: string) => post<{ progress: LessonProgressRow | null }>(`/api/lessons/${id}/start`),
  lessonStatus: (id: string) => request<LessonStatus>(`/api/lessons/${id}/status`),
  completeLesson: (id: string) => post<LessonStatus & { cardsInserted: number }>(`/api/lessons/${id}/complete`),
  warmup: (id: string) => request<{ items: Exercise[] }>(`/api/lessons/${id}/warmup`),
  latestWriting: (id: string) => request<{ submission: WritingRow | null }>(`/api/lessons/${id}/writing/latest`),
  submitWriting: (id: string, body: { text: string; selfScore?: number }) => post<{ id: number; feedback: WritingFeedback }>(`/api/lessons/${id}/writing`, body),
  submitSpeaking: (id: string, body: { mode: "A"; transcript: string; durationSec: number; selfConfidence?: number }) =>
    post<{ id: number; metrics: SpeakingMetrics }>(`/api/lessons/${id}/speaking`, body),
  postAttempt: (a: AttemptInput) => post<{ id: number }>("/api/attempts", a),

  // teste inicial
  placementState: () => request<PlacementState>("/api/placement/state"),
  submitPlacementWriting: (body: { text: string; selfScore?: number }) => post<{ id: number; feedback: WritingFeedback }>("/api/placement/writing", body),
  submitPlacementSpeaking: (body: { readAloud: ReadAloudEntry[]; transcript: string; durationSec: number; selfConfidence?: number }) =>
    post<{ id: number; metrics: PlacementSpeakingMetrics }>("/api/placement/speaking", body),
  finishPlacement: () => post<{ assessment: PlacementAssessment }>("/api/placement/finish"),

  // painel, metas, sessões
  dashboard: (days = 30) => request<Dashboard>(`/api/dashboard?days=${days}`),
  setWeekGoal: (goal: WeekGoal) => put<{ weekStart: string; goal: WeekGoal }>("/api/goals/week", goal),
  heartbeat: (lessonId?: string) => post<{ sessionId: number; resumed: boolean }>("/api/study/heartbeat", lessonId ? { lessonId } : {}),
};
```

- [ ] **Step 2: `src/lib/useStudyHeartbeat.ts`** (novo)

```ts
import { useEffect } from "react";
import { api } from "./api.ts";

const INTERVAL_MS = 60_000;

/** Mantém a sessão de estudo viva enquanto a aba está visível. Erros de rede são silenciosos. */
export function useStudyHeartbeat(): void {
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      api.heartbeat().catch((err: Error) => console.warn("heartbeat falhou:", err.message));
    };
    beat();
    const timer = window.setInterval(beat, INTERVAL_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);
}
```

- [ ] **Step 3: Rotas e navegação**

`src/App.tsx`:

```tsx
import { createBrowserRouter, RouterProvider } from "react-router";
import { Layout } from "./components/Layout.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { Levels } from "./pages/Levels.tsx";
import { Module } from "./pages/Module.tsx";
import { Lesson } from "./pages/Lesson.tsx";
import { Placement } from "./pages/Placement.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "trilha", element: <Levels /> },
      { path: "modules/:id", element: <Module /> },
      { path: "lessons/:id", element: <Lesson /> },
      { path: "placement", element: <Placement /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

`src/components/Layout.tsx`:

```tsx
import { NavLink, Outlet } from "react-router";
import { useStudyHeartbeat } from "../lib/useStudyHeartbeat.ts";

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? "font-medium text-indigo-700" : "hover:text-indigo-700");

export function Layout() {
  useStudyHeartbeat();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <NavLink to="/" className="text-lg font-semibold text-slate-900">Inglês para Tecnologia</NavLink>
          <nav className="flex gap-4 text-sm text-slate-600">
            <NavLink to="/" end className={linkClass}>Painel</NavLink>
            <NavLink to="/trilha" className={linkClass}>Trilha</NavLink>
            <NavLink to="/placement" className={linkClass}>Teste inicial</NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
```

`src/pages/Module.tsx`: troque `<Link to="/" ...>← Trilha</Link>` por `<Link to="/trilha" ...>← Trilha</Link>`.

Esqueletos (substituídos nas T11/T12), para o typecheck passar já:

`src/pages/Placement.tsx`:

```tsx
export function Placement() {
  return <p className="text-slate-500">Teste inicial: em construção.</p>;
}
```

`src/pages/Dashboard.tsx`:

```tsx
export function Dashboard() {
  return <p className="text-slate-500">Painel: em construção.</p>;
}
```

- [ ] **Step 4: `Stepper` com `readOnly`** — `src/components/lesson/Stepper.tsx`:

```tsx
type Step = { key: string; label: string };

export function Stepper({ steps, current, onSelect, readOnly = false }: { steps: Step[]; current: number; onSelect(i: number): void; readOnly?: boolean }) {
  return (
    <ol className="flex flex-wrap gap-1 text-xs">
      {steps.map((s, i) => {
        const cls = `rounded-full px-3 py-1 ${i === current ? "bg-indigo-600 text-white" : i < current ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"}`;
        return (
          <li key={s.key}>
            {readOnly
              ? <span aria-current={i === current ? "step" : undefined} className={cls}>{i + 1}. {s.label}</span>
              : <button type="button" onClick={() => onSelect(i)} aria-current={i === current ? "step" : undefined} className={`${cls} ${i === current ? "" : "hover:bg-slate-200"}`}>{i + 1}. {s.label}</button>}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 5: `ExerciseRunner` e `ExerciseList` com feedback adiado**

`src/components/exercises/ExerciseRunner.tsx`: altere `type Props` e o bloco de resultado:

```tsx
export type FeedbackMode = "immediate" | "deferred";
type Props = { exercise: Exercise; onAnswered(result: CheckResult, response: ExerciseResponse): void; feedback?: FeedbackMode };
```

```tsx
export function ExerciseRunner({ exercise, onAnswered, feedback = "immediate" }: Props) {
```

e substitua o `{result && (...)}` final por:

```tsx
      {result && feedback === "deferred" && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Resposta registrada. O resultado aparece no fim do teste.</div>
      )}
      {result && feedback === "immediate" && (
        <div className={`rounded-md border p-3 text-sm ${result.correct ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
          <div className="font-medium">{result.correct ? "✓ Correto" : "✗ Não é isso"}</div>
          {!result.correct && <div className="mt-1">Esperado: <span className="font-medium">{result.expected}</span></div>}
          <div className="mt-2 text-slate-700">{exercise.explanation}</div>
        </div>
      )}
```

`src/components/exercises/ExerciseList.tsx` — substitua o arquivo:

```tsx
import { useMemo, useState } from "react";
import type { Block, Exercise } from "../../../shared/schema.ts";
import type { CheckResult, ExerciseResponse } from "../../../shared/scoring.ts";
import { api } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";
import { ProgressBar } from "../ui/ProgressBar.tsx";
import { ExerciseRunner, type FeedbackMode } from "./ExerciseRunner.tsx";

type Props = {
  lessonId: string;
  block: Block;
  exercises: Exercise[];
  /** immediate: mostra acerto e explicação a cada item (aulas). deferred: só registra (teste inicial). */
  feedback?: FeedbackMode;
  /** Ids já respondidos numa rodada anterior; são pulados ao retomar. */
  initialAnswered?: string[];
  onFinished?(summary: { correct: number; total: number }): void;
};

const responseToString = (r: ExerciseResponse) => (typeof r === "string" ? r : Array.isArray(r) ? r.join(" ") : typeof r === "number" ? String(r) : JSON.stringify(r));

export function ExerciseList({ lessonId, block, exercises, feedback = "immediate", initialAnswered = [], onFinished }: Props) {
  const pending = useMemo(() => exercises.filter((e) => !initialAnswered.includes(e.id)), [exercises, initialAnswered]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [answered, setAnswered] = useState(false);
  const [round, setRound] = useState(0);
  const [postError, setPostError] = useState<string | null>(null);

  const current = pending[index];
  const finished = index >= pending.length;
  const correct = results.filter((r) => r.correct).length;

  const onAnswered = (result: CheckResult, response: ExerciseResponse) => {
    setResults((prev) => [...prev, result]);
    setAnswered(true);
    if (!current) return;
    api.postAttempt({ lessonId, exerciseId: current.id, block, type: current.type, correct: result.correct, answer: responseToString(response), tags: current.tags })
      .then(() => setPostError(null))
      .catch((err: Error) => setPostError(`Não foi possível salvar a tentativa (${err.message}).`));
  };

  const next = () => {
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setAnswered(false);
    if (nextIndex >= pending.length) onFinished?.({ correct, total: pending.length });
  };

  const restart = () => { setIndex(0); setResults([]); setAnswered(false); setRound((r) => r + 1); };

  if (exercises.length === 0) return <p className="text-slate-500">Nenhum exercício.</p>;

  if (pending.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-slate-600">Bloco já respondido.</p>
        <Button onClick={() => onFinished?.({ correct: 0, total: 0 })}>Continuar</Button>
      </div>
    );
  }

  if (finished) {
    if (feedback === "deferred") return <p className="text-slate-600">Bloco concluído.</p>;
    return (
      <div className="space-y-3">
        <p className="text-lg font-medium">Resultado: {correct}/{pending.length} ({Math.round((correct / pending.length) * 100)}%)</p>
        <ProgressBar value={correct / pending.length} />
        <Button variant="secondary" onClick={restart}>Refazer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Item {index + 1} de {pending.length}</span>
        {feedback === "immediate" && <span>{correct} certo(s)</span>}
      </div>
      <ProgressBar value={index / pending.length} />
      <ExerciseRunner key={`${round}-${current!.id}`} exercise={current!} onAnswered={onAnswered} feedback={feedback} />
      {postError && <p className="text-xs text-rose-700">{postError}</p>}
      {answered && <Button onClick={next}>{index + 1 < pending.length ? "Próximo" : feedback === "deferred" ? "Concluir bloco" : "Ver resultado"}</Button>}
    </div>
  );
}
```

- [ ] **Step 6: `Listening`, `Writing`, `Speaking` por spec**

`src/components/lesson/Listening.tsx` — substitua o arquivo:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { Block, Exercise } from "../../../shared/schema.ts";
import { loadVoices, pickVoice, speak, stopSpeaking, isSpeechSynthesisSupported } from "../../lib/speech.ts";
import { Button } from "../ui/Button.tsx";
import { ExerciseList } from "../exercises/ExerciseList.tsx";
import type { FeedbackMode } from "../exercises/ExerciseRunner.tsx";
import { speakerIndexes } from "./Dialogue.tsx";

type Line = { speaker: string; text: string; note?: string };
type Props = { lessonId: string; block: Block; lines: Line[]; questions: Exercise[]; feedback?: FeedbackMode; initialAnswered?: string[]; onFinished?(): void };

export function Listening({ lessonId, block, lines, questions, feedback = "immediate", initialAnswered, onFinished }: Props) {
  const [rate, setRate] = useState(0.95);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [plays, setPlays] = useState(0);
  const indexes = useMemo(() => speakerIndexes(lines), [lines]);
  // Token da execução atual: incrementar cancela qualquer playAll em andamento.
  const runId = useRef(0);
  useEffect(() => () => { runId.current++; stopSpeaking(); }, []);

  const playAll = async () => {
    if (playing) { runId.current++; stopSpeaking(); setPlaying(false); return; }
    const myRun = ++runId.current;
    setPlaying(true);
    setPlays((p) => p + 1);
    const voices = await loadVoices();
    try {
      for (const line of lines) {
        if (runId.current !== myRun) return;
        await speak(line.text, { voice: pickVoice(voices, indexes.get(line.speaker) ?? 0), rate });
      }
    } finally {
      if (runId.current === myRun) setPlaying(false);
    }
  };

  const canReveal = feedback === "immediate";

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Compreensão auditiva</h2>
      <p className="text-sm text-slate-600">Ouça as {lines.length} fala(s) sem ler. Pode repetir e reduzir a velocidade.{canReveal ? " A transcrição aparece depois das perguntas." : ""}</p>
      <div className="flex flex-wrap items-center gap-3">
        {isSpeechSynthesisSupported() ? <Button onClick={playAll}>{playing ? "◼ Parar" : plays === 0 ? "▶ Ouvir" : "▶ Ouvir de novo"}</Button> : <span className="text-sm text-rose-700">Áudio indisponível neste navegador.</span>}
        <label className="flex items-center gap-2 text-sm text-slate-600">Velocidade <input type="range" min={0.7} max={1.1} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} /> {rate.toFixed(2)}×</label>
        <span className="text-xs text-slate-500">{plays} reprodução(ões)</span>
      </div>
      <ExerciseList lessonId={lessonId} block={block} exercises={questions} feedback={feedback} initialAnswered={initialAnswered} onFinished={() => { setRevealed(true); onFinished?.(); }} />
      {canReveal && (revealed || !isSpeechSynthesisSupported()) && (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <h3 className="text-sm font-medium text-slate-600">Transcrição</h3>
          <ol className="mt-2 space-y-2 text-sm">{lines.map((l, i) => <li key={i}><span className="font-medium text-slate-600">{l.speaker}:</span> {l.text}</li>)}</ol>
        </div>
      )}
      {canReveal && !revealed && isSpeechSynthesisSupported() && <Button variant="ghost" onClick={() => setRevealed(true)}>Mostrar transcrição agora</Button>}
    </section>
  );
}
```

`src/components/lesson/Writing.tsx` — substitua o arquivo:

```tsx
import { useEffect, useState } from "react";
import type { WritingSpec } from "../../../shared/schema.ts";
import type { WritingFeedback } from "../../../server/writing-feedback.ts";
import type { WritingRow } from "../../../server/repo.ts";
import { Button } from "../ui/Button.tsx";
import { Markdown } from "../ui/Markdown.tsx";

type Props = {
  spec: WritingSpec;
  fetchLatest(): Promise<WritingRow | null>;
  submit(body: { text: string; selfScore?: number }): Promise<{ id: number; feedback: WritingFeedback }>;
  /** Texto ao lado da nota salva, ex.: "mínimo 3". */
  minScoreLabel?: string;
  onSaved?(score: number | null): void;
};

export function Writing({ spec, fetchLatest, submit, minScoreLabel, onSaved }: Props) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [selfScore, setSelfScore] = useState<number | "">("");
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const { minWords, maxWords } = spec;

  useEffect(() => {
    let cancelled = false;
    fetchLatest().then((submission) => {
      if (cancelled || !submission) return;
      setText(submission.text);
      setFeedback(JSON.parse(submission.feedback_json) as WritingFeedback);
      setSavedScore(submission.score);
    }).catch(() => undefined);
    return () => { cancelled = true; };
    // fetchLatest muda a cada render; buscamos uma vez por spec.
  }, [spec]);

  const send = async (score?: number) => {
    setBusy(true); setError(null);
    try {
      const res = await submit(score === undefined ? { text } : { text, selfScore: score });
      setFeedback(res.feedback);
      setSavedScore(res.feedback.score);
      onSaved?.(res.feedback.score);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Exercício de escrita</h2>
      <Markdown text={spec.prompt} />
      <ul className="text-sm text-slate-600">
        {spec.constraints.length > 0 && <li><span className="font-medium">Obrigatório:</span> {spec.constraints.map((c) => c.label).join(" · ")}</li>}
        <li><span className="font-medium">Rubrica:</span> {spec.rubric.join(" · ")}</li>
      </ul>
      <textarea className="min-h-40 w-full rounded border border-slate-300 p-3 focus:border-indigo-500 focus:outline-none" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva em inglês…" />
      <div className="flex items-center justify-between">
        <span className={`text-sm ${words >= minWords && words <= maxWords ? "text-emerald-700" : "text-slate-500"}`}>{words} palavras (meta {minWords}–{maxWords})</span>
        <Button onClick={() => send()} disabled={busy || words === 0}>{feedback ? "Enviar de novo" : "Enviar"}</Button>
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}

      {feedback && (
        <div className="space-y-4 rounded-md border border-slate-200 bg-white p-4">
          <h3 className="font-medium">Correção {feedback.mode === "rules" && <span className="text-xs font-normal text-slate-500">(modo por regras — sem IA nesta etapa)</span>}</h3>
          <ul className="space-y-1 text-sm">
            <li>{feedback.withinLength ? "✓" : "✗"} Tamanho: {feedback.wordCount} palavras (meta {feedback.minWords}–{feedback.maxWords})</li>
            {feedback.constraints.map((c, i) => <li key={i}>{c.met === null ? "•" : c.met ? "✓" : "✗"} {c.label}</li>)}
          </ul>
          {feedback.findings.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-rose-800">Padrões de erro encontrados</h4>
              <ul className="mt-1 space-y-2 text-sm">
                {feedback.findings.map((f, i) => (
                  <li key={i} className="rounded border border-rose-200 bg-rose-50 p-2">
                    <div><span className="line-through decoration-rose-400">{f.match}</span> → <span className="font-medium text-emerald-800">{f.right}</span></div>
                    <div className="text-slate-600">{f.why} <span className="text-xs text-slate-400">[{f.tag}]</span></div>
                  </li>
                ))}
              </ul>
            </div>
          ) : <p className="text-sm text-emerald-700">✓ Nenhum padrão de erro do catálogo encontrado.</p>}
          <div>
            <h4 className="text-sm font-medium">Modelo de resposta</h4>
            <p className="mt-1 rounded bg-slate-50 p-3 text-sm text-slate-800">{feedback.model}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Compare com o modelo e avalie sua escrita pela rubrica:</span>
            <select className="rounded border border-slate-300 px-2 py-1" value={selfScore} onChange={(e) => setSelfScore(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <Button variant="secondary" disabled={selfScore === "" || busy} onClick={() => send(Number(selfScore))}>Salvar nota</Button>
            {savedScore !== null && <span className="text-emerald-700">nota salva: {savedScore}/5{minScoreLabel ? ` (${minScoreLabel})` : ""}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
```

`src/components/lesson/Speaking.tsx` — altere só o cabeçalho, a chamada de envio e o título:

```tsx
import { useEffect, useRef, useState } from "react";
import type { SpeakingModeA } from "../../../shared/schema.ts";
import type { SpeakingMetrics } from "../../../server/speaking-metrics.ts";
import { isRecognitionSupported, startRecognition } from "../../lib/speech.ts";
import { Button } from "../ui/Button.tsx";

type Props = {
  spec: SpeakingModeA;
  submit(body: { transcript: string; durationSec: number; selfConfidence?: number }): Promise<{ metrics: SpeakingMetrics }>;
  title?: string;
  onSubmitted?(metrics: SpeakingMetrics): void;
};

export function Speaking({ spec, submit: send, title = "Atividade de conversação (modo A)", onSubmitted }: Props) {
  const modeA = spec;
```

Na função `submit` interna, troque a linha do `api.submitSpeaking(...)` por:

```tsx
      const res = await send({ transcript, durationSec, ...(confidence === "" ? {} : { selfConfidence: Number(confidence) }) });
      setMetrics(res.metrics);
      onSubmitted?.(res.metrics);
```

E o `<h2>` por `<h2 className="text-xl font-semibold">{title}</h2>`. Remova o import de `api` (não é mais usado). O resto do componente permanece igual.

- [ ] **Step 7: `src/pages/Lesson.tsx`** — os três call sites:

```tsx
      case "listening": return <Listening lessonId={lesson.id} block="listening" lines={lesson.listening.lines} questions={lesson.listening.questions} />;
      case "writing": return <Writing spec={lesson.writing} fetchLatest={() => api.latestWriting(lesson.id).then((r) => r.submission)} submit={(body) => api.submitWriting(lesson.id, body)} minScoreLabel={`mínimo ${lesson.completion.writingMin}`} />;
      case "speaking": return <Speaking spec={lesson.speaking.modeA} submit={(body) => api.submitSpeaking(lesson.id, { mode: "A", ...body })} />;
```

- [ ] **Step 8: Verifique**

Run: `pnpm content:build && pnpm typecheck && pnpm build && pnpm test`
Expected: tudo passa; `vite build` gera `dist/`. Suba `pnpm dev`, abra `http://localhost:5173/lessons/M01-02` e confirme que escuta, escrita e fala continuam funcionando (Chrome); `http://localhost:5173/` mostra "Painel: em construção" e a navegação tem os três links.

- [ ] **Step 9: Commit**

```bash
git add src/lib/api.ts src/lib/useStudyHeartbeat.ts src/App.tsx src/components/Layout.tsx src/components/exercises src/components/lesson/Listening.tsx src/components/lesson/Writing.tsx src/components/lesson/Speaking.tsx src/components/lesson/Stepper.tsx src/pages/Lesson.tsx src/pages/Module.tsx src/pages/Placement.tsx src/pages/Dashboard.tsx
git commit -m "refactor(client): API do teste e painel, rotas /trilha e /placement, blocos por spec, heartbeat"
```

---

### Task 11: Página do teste inicial

**Files:**
- Create: `src/components/placement/PassageView.tsx`, `src/components/placement/ReadAloud.tsx`, `src/components/placement/PlacementResult.tsx`, `src/components/dashboard/RadarChart.tsx`
- Modify: `src/pages/Placement.tsx` (substitui o esqueleto), `src/lib/content.ts` (`placement`, `tagLabel`)

**Interfaces:**
- Consumes: `api.placementState/submitPlacementWriting/submitPlacementSpeaking/finishPlacement`, `ApiError`, `ReadAloudEntry` (T10); `ExerciseList` com `feedback="deferred"` e `initialAnswered`; `Listening`, `Writing`, `Speaking`, `Stepper readOnly` (T10); `placementExercises`, `wordOverlap` (shared); `competencyLabel` (content.ts).
- Produces: `RadarChart({ axes, size? })` reutilizado pelo painel (T12); `content.placement`, `tagLabel(id)` em `src/lib/content.ts`; página `/placement` com fluxo intro → 6 blocos → resultado, retomada e refazer.

- [ ] **Step 1: `src/lib/content.ts`** — acrescente:

```ts
export const placement = content.placement;

const tagById = new Map(content.tags.map((t) => [t.id, t]));
/** Rótulo humano de uma tag (ou o próprio id se desconhecida). */
export function tagLabel(id: string): string {
  return tagById.get(id)?.label ?? id;
}
```

(`content.tags` já existe no bundle; `Placement` vem em `ContentBundle` desde a T3.)

- [ ] **Step 2: `src/components/dashboard/RadarChart.tsx`**

```tsx
export type RadarAxis = { key: string; label: string; value: number | null };

/** Radar SVG inline, 7 eixos por padrão. Eixo sem dado fica em 0 e é listado abaixo do gráfico. */
export function RadarChart({ axes, size = 280 }: { axes: RadarAxis[]; size?: number }) {
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 40;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const point = (i: number, v: number) => ({ x: cx + r * v * Math.cos(angle(i)), y: cy + r * v * Math.sin(angle(i)) });
  const ring = (v: number) => axes.map((_, i) => point(i, v)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const polygon = axes.map((a, i) => point(i, a.value ?? 0)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const missing = axes.filter((a) => a.value === null).map((a) => a.label);

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full max-w-xs" role="img" aria-label="Radar de competências">
        {[0.25, 0.5, 0.75, 1].map((v) => <polygon key={v} points={ring(v)} fill="none" stroke="#e2e8f0" strokeWidth={1} />)}
        {axes.map((_, i) => { const p = point(i, 1); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth={1} />; })}
        <polygon points={polygon} fill="rgba(79, 70, 229, 0.25)" stroke="#4f46e5" strokeWidth={2} />
        {axes.map((a, i) => {
          const p = point(i, a.value ?? 0);
          const l = point(i, 1.18);
          return (
            <g key={a.key}>
              <circle cx={p.x} cy={p.y} r={3} fill={a.value === null ? "#cbd5e1" : "#4f46e5"} />
              <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-600" fontSize={11}>
                {a.label}{a.value === null ? "" : ` ${Math.round(a.value * 100)}%`}
              </text>
            </g>
          );
        })}
      </svg>
      {missing.length > 0 && <p className="text-center text-xs text-slate-500">Sem dados: {missing.join(", ")}.</p>}
    </div>
  );
}
```

- [ ] **Step 3: `src/components/placement/PassageView.tsx`**

```tsx
import type { PlacementPassage } from "../../../shared/schema.ts";
import { Markdown } from "../ui/Markdown.tsx";

export function PassageView({ passage }: { passage: PlacementPassage }) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium">{passage.title}</h3>
      <p className="text-xs text-slate-500">{passage.source}</p>
      {passage.format === "pre"
        ? <pre className="overflow-x-auto rounded-md bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">{passage.text}</pre>
        : <div className="rounded-md border border-slate-200 bg-white p-4"><Markdown text={passage.text} /></div>}
    </div>
  );
}
```

- [ ] **Step 4: `src/components/placement/ReadAloud.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { wordOverlap } from "../../../shared/speech-compare.ts";
import { isRecognitionSupported, startRecognition } from "../../lib/speech.ts";
import type { ReadAloudEntry } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";

type Props = { sentences: string[]; entries: ReadAloudEntry[]; onChange(entries: ReadAloudEntry[]): void };

/** Leitura em voz alta: uma frase por vez, transcrição editável, % de palavras reconhecidas. */
export function ReadAloud({ sentences, entries, onChange }: Props) {
  const supported = isRecognitionSupported();
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handle = useRef<{ stop(): void } | null>(null);

  const stop = () => { handle.current?.stop(); handle.current = null; setRecordingIndex(null); };
  useEffect(() => () => stop(), []);

  const setTranscript = (i: number, transcript: string) => {
    const next = sentences.map((target, j) => ({ target, transcript: j === i ? transcript : entries[j]?.transcript ?? "" }));
    onChange(next);
  };

  const start = (i: number) => {
    setError(null);
    setTranscript(i, "");
    handle.current = startRecognition({
      onResult: (t) => setTranscript(i, t),
      onEnd: () => stop(),
      onError: (msg) => { setError(msg); stop(); },
    });
    setRecordingIndex(i);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Leia em voz alta</h3>
      {!supported && <p className="text-sm text-rose-700">Reconhecimento de fala indisponível. Use o Google Chrome ou digite o que você leu.</p>}
      <ol className="space-y-3">
        {sentences.map((target, i) => {
          const transcript = entries[i]?.transcript ?? "";
          const pct = transcript ? Math.round(wordOverlap(transcript, target) * 100) : null;
          const recording = recordingIndex === i;
          return (
            <li key={i} className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-base">{i + 1}. {target}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {supported && <Button variant={recording ? "secondary" : "primary"} disabled={recordingIndex !== null && !recording} onClick={() => (recording ? stop() : start(i))}>{recording ? "◼ Parar" : transcript ? "● Regravar" : "● Gravar"}</Button>}
                {pct !== null && <span className={`text-sm ${pct >= 80 ? "text-emerald-700" : "text-amber-700"}`}>{pct}% das palavras reconhecidas</span>}
              </div>
              <input className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm" value={transcript} onChange={(e) => setTranscript(i, e.target.value)} placeholder="Transcrição" />
            </li>
          );
        })}
      </ol>
      {error && <p className="text-sm text-rose-700">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 5: `src/components/placement/PlacementResult.tsx`**

```tsx
import { Link } from "react-router";
import type { Placement } from "../../../shared/schema.ts";
import { placementExercises } from "../../../shared/schema.ts";
import type { PlacementAssessment } from "../../lib/api.ts";
import { competencyLabel, tagLabel } from "../../lib/content.ts";
import { Button } from "../ui/Button.tsx";
import { Badge } from "../ui/Badge.tsx";
import { Card } from "../ui/Card.tsx";
import { RadarChart } from "../dashboard/RadarChart.tsx";

const blockLabel = { reading: "Leitura", vocabulary: "Vocabulário", grammar: "Gramática", listening: "Escuta" } as const;
const AXES = ["REA", "VOC", "LIS", "WRI", "SPK", "PRO", "CNF"] as const;

function levelSentence(level: 1 | 2 | 3, pct: number, writing: number | null): string {
  const p = Math.round(pct * 100);
  if (level === 3) return `${p}% nos itens objetivos (acima de 80%) e escrita ${writing}/5 (4 ou mais): sugestão de começar no Nível 3.`;
  if (level === 2) return `${p}% nos itens objetivos (60% ou mais) e escrita ${writing}/5 (3 ou mais): sugestão de começar no Nível 2.`;
  return `${p}% nos itens objetivos${writing === null ? "" : ` e escrita ${writing}/5`}: sugestão de começar no Nível 1, a base da trilha.`;
}

export function PlacementResult({ assessment, placement, onRetake }: { assessment: PlacementAssessment; placement: Placement; onRetake(): void }) {
  const r = assessment.result;
  const byId = new Map(placementExercises(placement).map((e) => [e.exercise.id, e.exercise]));
  const date = new Date(assessment.ts).toLocaleString("pt-BR");

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-sm text-slate-500">Teste concluído em {date}</p>
        <h2 className="mt-1 text-2xl font-semibold">Nível sugerido: {r.level}</h2>
        <p className="mt-2 text-slate-700">{levelSentence(r.level, r.pct, r.writingScore)}</p>
        <p className="mt-2 text-xs text-slate-500">A nota de escrita é a sua autoavaliação guiada pela rubrica; a correção automática chega na etapa E4. Você pode ignorar a sugestão e começar onde preferir.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/"><Button>Ir para o painel</Button></Link>
          <Link to="/trilha"><Button variant="secondary">Ver a trilha</Button></Link>
          <Button variant="ghost" onClick={onRetake}>Refazer o teste</Button>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="font-medium">Por bloco</h3>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {(["reading", "vocabulary", "grammar", "listening"] as const).map((b) => (
                <tr key={b} className="border-t border-slate-100"><td className="py-1">{blockLabel[b]}</td><td className="py-1 text-right">{r.blocks[b].correct}/{r.blocks[b].total}</td><td className="py-1 text-right text-slate-500">{Math.round(r.blocks[b].pct * 100)}%</td></tr>
              ))}
              <tr className="border-t border-slate-100"><td className="py-1">Escrita (autoavaliação)</td><td className="py-1 text-right" colSpan={2}>{r.writingScore === null ? "—" : `${r.writingScore}/5`}</td></tr>
              <tr className="border-t border-slate-100"><td className="py-1">Fala</td><td className="py-1 text-right" colSpan={2}>{r.speaking ? `${r.speaking.score}/5 · leitura ${Math.round(r.speaking.readAloudPct * 100)}%` : "não feita"}</td></tr>
            </tbody>
          </table>
        </Card>
        <Card>
          <h3 className="font-medium">Radar inicial</h3>
          <RadarChart axes={AXES.map((k) => ({ key: k, label: competencyLabel[k] ?? k, value: r.radar[k] }))} />
        </Card>
      </div>

      <Card>
        <h3 className="font-medium">Tags fracas ({r.weakTags.length})</h3>
        <p className="text-sm text-slate-600">Erro em metade ou mais dos itens da tag. O warm-up das aulas vai puxar itens daqui.</p>
        <div className="mt-2 flex flex-wrap gap-1">{r.weakTags.length === 0 ? <span className="text-sm text-slate-500">nenhuma</span> : r.weakTags.map((t) => <Badge key={t} tone="red">{tagLabel(t)}</Badge>)}</div>
        <p className="mt-3 text-xs text-slate-500">Meta desta semana criada: 3 aulas, 5 revisões, 150 minutos. Ajuste no painel.</p>
      </Card>

      <Card>
        <h3 className="font-medium">Revisão item a item</h3>
        <ol className="mt-3 space-y-3 text-sm">
          {r.items.map((item, i) => {
            const ex = byId.get(item.id);
            if (!ex) return null;
            const expected = ex.type === "multiple_choice" ? ex.options[ex.answer] : "accepted" in ex ? ex.accepted[0] : "answer" in ex ? ex.answer : "";
            return (
              <li key={item.id} className={`rounded-md border p-3 ${item.correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                <div className="text-xs text-slate-500">{i + 1} · {blockLabel[item.block]}</div>
                <div className="font-medium">{ex.prompt}</div>
                <div>{item.correct ? "✓" : "✗"} Sua resposta: {item.answer ?? "—"}{!item.correct && <> · Esperado: <span className="font-medium">{expected}</span></>}</div>
                <div className="mt-1 text-slate-600">{ex.explanation}</div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: `src/pages/Placement.tsx`** — substitua o esqueleto:

```tsx
import { useEffect, useMemo, useState } from "react";
import type { SpeakingMetrics } from "../../server/speaking-metrics.ts";
import { placementExercises } from "../../shared/schema.ts";
import { api, ApiError, type PlacementAssessment, type PlacementState, type ReadAloudEntry } from "../lib/api.ts";
import { placement } from "../lib/content.ts";
import { Button } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";
import { Markdown } from "../components/ui/Markdown.tsx";
import { Stepper } from "../components/lesson/Stepper.tsx";
import { ExerciseList } from "../components/exercises/ExerciseList.tsx";
import { Listening } from "../components/lesson/Listening.tsx";
import { Writing } from "../components/lesson/Writing.tsx";
import { Speaking } from "../components/lesson/Speaking.tsx";
import { PassageView } from "../components/placement/PassageView.tsx";
import { ReadAloud } from "../components/placement/ReadAloud.tsx";
import { PlacementResult } from "../components/placement/PlacementResult.tsx";

type Stage = "loading" | "intro" | "reading" | "vocabulary" | "grammar" | "listening" | "writing" | "speaking" | "result";
const STEPS: Array<{ key: Stage; label: string }> = [
  { key: "reading", label: "Leitura" }, { key: "vocabulary", label: "Vocabulário" }, { key: "grammar", label: "Gramática" },
  { key: "listening", label: "Escuta" }, { key: "writing", label: "Escrita" }, { key: "speaking", label: "Fala (opcional)" }, { key: "result", label: "Resultado" },
];
const ORDER: Stage[] = ["intro", "reading", "vocabulary", "grammar", "listening", "writing", "speaking", "result"];
const next = (s: Stage): Stage => ORDER[Math.min(ORDER.indexOf(s) + 1, ORDER.length - 1)]!;

/** Primeiro bloco com item sem resposta na rodada; escrita se falta nota; senão fala. */
function resumeStage(state: PlacementState): Stage {
  const answered = new Set(state.run.answered);
  for (const { exercise, block } of placementExercises(placement)) if (!answered.has(exercise.id)) return block;
  if (!state.run.writing || state.run.writing.score === null) return "writing";
  return "speaking";
}

export function Placement() {
  const [stage, setStage] = useState<Stage>("loading");
  const [state, setState] = useState<PlacementState | null>(null);
  const [assessment, setAssessment] = useState<PlacementAssessment | null>(null);
  const [passageIndex, setPassageIndex] = useState(0);
  const [scriptIndex, setScriptIndex] = useState(0);
  const [writingScore, setWritingScore] = useState<number | null>(null);
  const [readAloud, setReadAloud] = useState<ReadAloudEntry[]>(placement.speaking.readAloud.map((target) => ({ target, transcript: "" })));
  const [spoken, setSpoken] = useState<SpeakingMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ exercises: string[]; writing: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.placementState().then((s) => {
      setState(s);
      const hasRun = s.run.answered.length > 0 || s.run.writing !== null || s.run.speaking !== null;
      if (s.latest && !hasRun) { setAssessment(s.latest); setStage("result"); return; }
      if (hasRun) {
        setWritingScore(s.run.writing?.score ?? null);
        const resume = resumeStage(s);
        const answeredPassages = placement.reading.passages.findIndex((p) => p.questions.some((q) => !s.run.answered.includes(q.id)));
        const answeredScripts = placement.listening.scripts.findIndex((sc) => sc.questions.some((q) => !s.run.answered.includes(q.id)));
        setPassageIndex(Math.max(0, answeredPassages));
        setScriptIndex(Math.max(0, answeredScripts));
        setStage(resume);
        return;
      }
      setStage("intro");
    }).catch((e: Error) => { setError(e.message); setStage("intro"); });
  }, []);

  const answered = useMemo(() => state?.run.answered ?? [], [state]);

  const finish = async () => {
    setBusy(true); setError(null); setMissing(null);
    try {
      const res = await api.finishPlacement();
      setAssessment(res.assessment);
      setStage("result");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setMissing((e.body as { missing: { exercises: string[]; writing: boolean } }).missing);
      else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Recarrega o estado do servidor (itens desta sessão já foram gravados) e retoma no primeiro bloco incompleto. */
  const backToBlocks = () => {
    api.placementState().then((s) => { setState(s); setPassageIndex(0); setScriptIndex(0); setMissing(null); setStage(resumeStage(s)); }).catch((e: Error) => setError(e.message));
  };

  const retake = () => {
    setAssessment(null); setState(null); setPassageIndex(0); setScriptIndex(0); setWritingScore(null); setSpoken(null); setMissing(null);
    setReadAloud(placement.speaking.readAloud.map((target) => ({ target, transcript: "" })));
    setStage("intro");
  };

  if (stage === "loading") return <p className="text-slate-500">Carregando…</p>;
  if (stage === "result" && assessment) return <PlacementResult assessment={assessment} placement={placement} onRetake={retake} />;

  const body = (() => {
    switch (stage) {
      case "intro":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{placement.title}</h2>
            <Markdown text={placement.intro} />
            <p className="text-sm text-slate-500">Duração estimada: {placement.durationMin} min. Você pode fechar a aba e retomar depois: as respostas ficam salvas.</p>
            <Button onClick={() => setStage("reading")}>Começar</Button>
          </div>
        );
      case "reading": {
        const passage = placement.reading.passages[passageIndex]!;
        const last = passageIndex >= placement.reading.passages.length - 1;
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Leitura · trecho {passageIndex + 1} de {placement.reading.passages.length}</h2>
            <PassageView passage={passage} />
            <ExerciseList key={passage.id} lessonId="placement" block="placement" exercises={passage.questions} feedback="deferred" initialAnswered={answered}
              onFinished={() => (last ? setStage("vocabulary") : setPassageIndex((i) => i + 1))} />
          </div>
        );
      }
      case "vocabulary":
      case "grammar": {
        const block = placement[stage];
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{stage === "vocabulary" ? "Vocabulário em contexto" : "Gramática em contexto"}</h2>
            {block.intro && <p className="text-sm text-slate-600">{block.intro}</p>}
            <ExerciseList key={stage} lessonId="placement" block="placement" exercises={block.questions} feedback="deferred" initialAnswered={answered} onFinished={() => setStage(next(stage))} />
          </div>
        );
      }
      case "listening": {
        const script = placement.listening.scripts[scriptIndex]!;
        const last = scriptIndex >= placement.listening.scripts.length - 1;
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Escuta · áudio {scriptIndex + 1} de {placement.listening.scripts.length}: {script.title}</h2>
            <Listening key={script.id} lessonId="placement" block="placement" lines={script.lines} questions={script.questions} feedback="deferred" initialAnswered={answered}
              onFinished={() => (last ? setStage("writing") : setScriptIndex((i) => i + 1))} />
          </div>
        );
      }
      case "writing":
        return (
          <div className="space-y-4">
            <Writing spec={placement.writing} fetchLatest={() => api.placementState().then((s) => s.run.writing)} submit={(b) => api.submitPlacementWriting(b)} onSaved={setWritingScore} />
            <p className="text-sm text-slate-600">Para concluir o teste, envie o texto, compare com o modelo e salve sua nota (1–5).</p>
            <Button disabled={writingScore === null} onClick={() => setStage("speaking")}>Continuar para a fala →</Button>
          </div>
        );
      case "speaking":
        return (
          <div className="space-y-6">
            <p className="text-sm text-slate-600">Bloco opcional. Sem ele, os eixos Fala, Pronúncia e Confiança ficam vazios no radar.</p>
            <ReadAloud sentences={placement.speaking.readAloud} entries={readAloud} onChange={setReadAloud} />
            <Speaking spec={placement.speaking.modeA} title="Pergunta" onSubmitted={setSpoken}
              submit={(b) => api.submitPlacementSpeaking({ ...b, readAloud: readAloud.filter((r) => r.transcript.trim().length > 0) })} />
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy} onClick={finish}>{spoken ? "Concluir o teste" : "Pular a fala e concluir"}</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Teste inicial</h1>
      {stage !== "intro" && <Stepper steps={STEPS} current={Math.max(0, STEPS.findIndex((s) => s.key === stage))} onSelect={() => undefined} readOnly />}
      {error && <p className="text-sm text-rose-700">Servidor não respondeu ({error}).</p>}
      {missing && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Faltam {missing.exercises.length > 0 ? `${missing.exercises.length} item(ns) objetivo(s)` : ""}{missing.exercises.length > 0 && missing.writing ? " e " : ""}{missing.writing ? "a nota da escrita" : ""}.
          {missing.exercises.length > 0 && <Button variant="ghost" onClick={backToBlocks}>Voltar aos blocos</Button>}
          {missing.writing && <Button variant="ghost" onClick={() => setStage("writing")}>Ir para a escrita</Button>}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">{body}</div>
    </div>
  );
}
```

- [ ] **Step 7: Verifique**

Run: `pnpm typecheck && pnpm build`
Expected: PASS. No Chrome (`pnpm dev`, `http://localhost:5173/placement`): intro → leitura (3 trechos, log em monoespaçado) → vocabulário → gramática → escuta (áudio toca, transcrição não aparece) → escrita (modelo só após enviar; botão "Continuar" só com nota) → fala (gravar 3 frases, % aparece; pergunta; ou pular) → resultado com nível, tabela, radar, tags e revisão. Recarregar no meio retoma no bloco certo. "Refazer" volta à intro e o servidor trata como rodada nova.

- [ ] **Step 8: Commit**

```bash
git add src/lib/content.ts src/components/dashboard/RadarChart.tsx src/components/placement src/pages/Placement.tsx
git commit -m "feat(client): página do teste inicial com leitura, escuta, escrita, fala e resultado"
```

---

### Task 12: Painel

**Files:**
- Create: `src/lib/useDashboard.ts`, `src/components/dashboard/PlacementCard.tsx`, `src/components/dashboard/TagHeatmap.tsx`, `src/components/dashboard/StreakCard.tsx`, `src/components/dashboard/WeeklyGoalCard.tsx`, `src/components/dashboard/Timeline.tsx`
- Modify: `src/pages/Dashboard.tsx` (substitui o esqueleto)

**Interfaces:**
- Consumes: `api.dashboard`, `api.setWeekGoal`, tipos `Dashboard`, `WeekGoal` (T10); `RadarChart` (T11); `competencyLabel` (content.ts).
- Produces: página `/` completa.

- [ ] **Step 1: `src/lib/useDashboard.ts`**

```ts
import { useCallback, useEffect, useState } from "react";
import { api, type Dashboard } from "./api.ts";

export function useDashboard(days = 30) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    api.dashboard(days).then((d) => { setData(d); setError(null); }).catch((e: Error) => setError(e.message));
  }, [days]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload };
}
```

- [ ] **Step 2: Componentes**

`src/components/dashboard/PlacementCard.tsx`:

```tsx
import { Link } from "react-router";
import type { PlacementAssessment } from "../../lib/api.ts";
import { placement } from "../../lib/content.ts";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";

export function PlacementCard({ latest }: { latest: PlacementAssessment | null }) {
  if (!latest) {
    return (
      <Card>
        <h2 className="font-medium">Teste inicial</h2>
        <p className="mt-1 text-sm text-slate-600">Cerca de {placement.durationMin} minutos. Define seu nível de entrada, o radar inicial e as tags fracas que o warm-up das aulas vai usar.</p>
        <Link to="/placement" className="mt-3 inline-block"><Button>Fazer o teste</Button></Link>
      </Card>
    );
  }
  const r = latest.result;
  return (
    <Card>
      <h2 className="font-medium">Teste inicial</h2>
      <p className="mt-1 text-2xl font-semibold">Nível sugerido: {r.level}</p>
      <p className="text-sm text-slate-600">{Math.round(r.pct * 100)}% nos itens objetivos · escrita {r.writingScore ?? "—"}/5 · {new Date(latest.ts).toLocaleDateString("pt-BR")}</p>
      <div className="mt-3 flex gap-3">
        <Link to="/placement"><Button variant="secondary">Ver resultado</Button></Link>
        <Link to="/trilha"><Button variant="ghost">Ir para a trilha</Button></Link>
      </div>
    </Card>
  );
}
```

`src/components/dashboard/TagHeatmap.tsx`:

```tsx
import type { Dashboard } from "../../lib/api.ts";
import { Card } from "../ui/Card.tsx";

const GROUPS: Array<{ key: Dashboard["tags"]["stats"][number]["group"]; label: string }> = [
  { key: "gram", label: "Gramática" }, { key: "br", label: "Erros típicos" }, { key: "vocab", label: "Vocabulário" }, { key: "topic", label: "Situação" }, { key: "comp", label: "Competência" },
];

function tone(rate: number): string {
  if (rate === 0) return "bg-emerald-100 text-emerald-900";
  if (rate <= 0.2) return "bg-lime-100 text-lime-900";
  if (rate <= 0.4) return "bg-amber-100 text-amber-900";
  if (rate <= 0.6) return "bg-orange-200 text-orange-900";
  return "bg-rose-200 text-rose-900";
}

export function TagHeatmap({ stats, weak, days }: { stats: Dashboard["tags"]["stats"]; weak: string[]; days: number }) {
  const weakSet = new Set(weak);
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">Erros por tag</h2>
        <span className="text-xs text-slate-500">últimos {days} dias · borda vermelha = tag fraca</span>
      </div>
      {stats.length === 0 && <p className="mt-2 text-sm text-slate-500">Nenhuma tentativa na janela.</p>}
      {GROUPS.map((g) => {
        const mine = stats.filter((s) => s.group === g.key);
        if (mine.length === 0) return null;
        return (
          <div key={g.key} className="mt-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">{g.label}</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {mine.map((s) => (
                <span key={s.tag} title={`${s.tag}: ${s.errors} erro(s) em ${s.attempts}`} className={`rounded px-2 py-1 text-xs ${tone(s.errorRate)} ${weakSet.has(s.tag) ? "ring-2 ring-rose-500" : ""}`}>
                  {s.label} <span className="opacity-70">{s.errors}/{s.attempts}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
```

`src/components/dashboard/StreakCard.tsx`:

```tsx
import type { Dashboard } from "../../lib/api.ts";
import { Card } from "../ui/Card.tsx";

export function StreakCard({ streak }: { streak: Dashboard["streak"] }) {
  return (
    <Card>
      <h2 className="font-medium">Sequência</h2>
      <p className="mt-1 text-3xl font-semibold">{streak.current} <span className="text-base font-normal text-slate-500">dia(s)</span></p>
      <p className="text-sm text-slate-600">Melhor: {streak.best} · hoje {streak.activeToday ? "✓" : "ainda sem atividade"}</p>
    </Card>
  );
}
```

`src/components/dashboard/WeeklyGoalCard.tsx`:

```tsx
import { useState } from "react";
import { api, type Dashboard, type WeekGoal } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";
import { ProgressBar } from "../ui/ProgressBar.tsx";

const DEFAULTS: WeekGoal = { lessonsTarget: 3, reviewsTarget: 5, minutesTarget: 150 };

export function WeeklyGoalCard({ week, onSaved }: { week: Dashboard["week"]; onSaved(): void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WeekGoal>(week.goal ?? DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true); setError(null);
    try { await api.setWeekGoal(draft); setEditing(false); onSaved(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const rows: Array<{ label: string; done: number; target: number; note?: string }> = week.goal
    ? [
        { label: "Aulas", done: week.progress.lessons, target: week.goal.lessonsTarget },
        { label: "Revisões", done: week.progress.reviews, target: week.goal.reviewsTarget, note: "disponível na E3" },
        { label: "Minutos", done: week.progress.minutes, target: week.goal.minutesTarget },
      ]
    : [];

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">Meta da semana</h2>
        <span className="text-xs text-slate-500">desde {week.weekStart}</span>
      </div>
      {!week.goal && !editing && (
        <div className="mt-2">
          <p className="text-sm text-slate-600">Sem meta definida para esta semana.</p>
          <Button className="mt-2" variant="secondary" onClick={() => setEditing(true)}>Definir meta</Button>
        </div>
      )}
      {week.goal && !editing && (
        <div className="mt-2 space-y-3">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-sm"><span>{r.label}{r.note && r.done === 0 ? <span className="ml-1 text-xs text-slate-400">({r.note})</span> : null}</span><span className="text-slate-600">{r.done}/{r.target}</span></div>
              <ProgressBar value={r.target === 0 ? 0 : r.done / r.target} />
            </div>
          ))}
          <Button variant="ghost" onClick={() => { setDraft(week.goal ?? DEFAULTS); setEditing(true); }}>Editar</Button>
        </div>
      )}
      {editing && (
        <form className="mt-2 space-y-2 text-sm" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {([["lessonsTarget", "Aulas"], ["reviewsTarget", "Revisões"], ["minutesTarget", "Minutos"]] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3">{label}
              <input type="number" min={0} className="w-24 rounded border border-slate-300 px-2 py-1" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })} />
            </label>
          ))}
          {error && <p className="text-rose-700">{error}</p>}
          <div className="flex gap-2"><Button type="submit" disabled={busy}>Salvar</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button></div>
        </form>
      )}
    </Card>
  );
}
```

`src/components/dashboard/Timeline.tsx`:

```tsx
import type { Dashboard } from "../../lib/api.ts";
import { Card } from "../ui/Card.tsx";

const kindLabel: Record<string, string> = { placement: "Teste inicial", module: "Avaliação de módulo", level: "Avaliação de nível", checkpoint: "Checkpoint" };

export function Timeline({ items }: { items: Dashboard["timeline"] }) {
  return (
    <Card>
      <h2 className="font-medium">Linha do tempo</h2>
      {items.length === 0 ? <p className="mt-2 text-sm text-slate-500">Nenhuma avaliação ainda. O teste inicial é a primeira.</p> : (
        <ol className="mt-2 space-y-1 text-sm">
          {items.map((t) => (
            <li key={t.id} className="flex justify-between border-t border-slate-100 py-1">
              <span>{kindLabel[t.kind] ?? t.kind}{t.kind !== "placement" ? ` · ${t.ref}` : ""}</span>
              <span className="text-slate-600">{t.summary.level !== undefined ? `nível ${t.summary.level} · ` : ""}{t.summary.pct !== undefined ? `${Math.round(t.summary.pct * 100)}%` : ""} · {new Date(t.ts).toLocaleDateString("pt-BR")}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: `src/pages/Dashboard.tsx`**

```tsx
import { useDashboard } from "../lib/useDashboard.ts";
import { competencyLabel } from "../lib/content.ts";
import { Card } from "../components/ui/Card.tsx";
import { RadarChart } from "../components/dashboard/RadarChart.tsx";
import { PlacementCard } from "../components/dashboard/PlacementCard.tsx";
import { TagHeatmap } from "../components/dashboard/TagHeatmap.tsx";
import { StreakCard } from "../components/dashboard/StreakCard.tsx";
import { WeeklyGoalCard } from "../components/dashboard/WeeklyGoalCard.tsx";
import { Timeline } from "../components/dashboard/Timeline.tsx";

const DAYS = 30;
const AXES = ["REA", "VOC", "LIS", "WRI", "SPK", "PRO", "CNF"] as const;

export function Dashboard() {
  const { data, error, reload } = useDashboard(DAYS);
  if (error) return <p className="text-rose-700">Servidor não respondeu ({error}). Painel indisponível.</p>;
  if (!data) return <p className="text-slate-500">Carregando painel…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="mt-1 text-sm text-slate-600">Radar e heatmap consideram os últimos {DAYS} dias. A sequência conta qualquer atividade no dia.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <PlacementCard latest={data.placement.latest} />
        <StreakCard streak={data.streak} />
        <Card>
          <h2 className="font-medium">Competências</h2>
          <RadarChart axes={AXES.map((k) => ({ key: k, label: competencyLabel[k] ?? k, value: data.radar[k].value }))} />
          <p className="text-center text-xs text-slate-500">{AXES.map((k) => `${competencyLabel[k]}: ${data.radar[k].samples}`).join(" · ")} amostra(s)</p>
        </Card>
        <WeeklyGoalCard week={data.week} onSaved={reload} />
      </div>
      <TagHeatmap stats={data.tags.stats} weak={data.tags.weak} days={DAYS} />
      <Timeline items={data.timeline} />
    </div>
  );
}
```

- [ ] **Step 4: Verifique**

Run: `pnpm typecheck && pnpm build`
Expected: PASS. No Chrome, `http://localhost:5173/`: cards renderizam com o banco real; sem meta → "Definir meta" → salvar → barras aparecem; heatmap agrupado; radar com eixos vazios listados.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useDashboard.ts src/components/dashboard src/pages/Dashboard.tsx
git commit -m "feat(client): painel com radar, heatmap de tags, sequência, meta semanal e linha do tempo"
```

---

### Task 13: Documentação e verificação no navegador

**Files:**
- Modify: `README.md`, `AGENTS.md`

Esta tarefa é executada pelo controlador (subagentes não têm acesso ao navegador). Verificar não é consertar: defeito encontrado vira uma tarefa de correção com seu próprio teste, não um patch direto.

- [ ] **Step 1: Documentação**

`AGENTS.md`, parágrafo "O projeto": troque a frase de estado por: `Estado atual: etapas E0, E1 e E2 entregues (motor de aula + aula M01-02 + teste inicial e painel). Próximas: E3 flashcards e glossário, E4 Claude API, E5 conteúdo do Nível 1, E6 adaptação.` Na seção "Estrutura", em `content/`, acrescente `placement/placement.yaml (teste inicial)`; em `server/`, acrescente `placement.ts, dashboard.ts, time.ts`. Na seção "Conteúdo", acrescente o item: `- Trechos de log/erro no teste inicial usam \`format: pre\` (sem mini-markdown).`

`README.md`, depois de "Abra http://localhost:5173.", acrescente:

```markdown
Páginas: `/` painel (radar, heatmap de tags, sequência, meta semanal), `/trilha` níveis e módulos, `/placement` teste inicial de nível, `/lessons/:id` aula.

Ao atualizar de uma versão anterior, faça uma cópia de `data/progress.sqlite` antes do primeiro `pnpm dev`: a migração 1 reconstrói a tabela `attempts`.
```

- [ ] **Step 2: Verificação completa no Chrome** (com `pnpm dev`)

1. `/` sem teste: card "Fazer o teste"; sequência 0; sem meta; heatmap vazio; timeline vazia.
2. `/placement`: fluxo completo. Leitura: 3 trechos, o log em monoespaçado. Nenhum acerto/explicação aparece durante o teste. Escuta: áudio toca em vozes diferentes por falante; sem botão de transcrição. Escrita: enviar sem nota não libera "Continuar"; salvar nota libera. Fala: gravar as 3 frases mostra %; responder a pergunta e enviar; "Concluir o teste".
3. Resultado: nível coerente com a regra (confira contas), tabela por bloco, radar com 7 eixos, tags fracas rotuladas, revisão item a item mostra sua resposta e a esperada.
4. `/`: card do teste com nível e data; meta 3/5/150 criada; radar com REA/VOC/LIS/WRI (e SPK/PRO/CNF se fez a fala); heatmap com tags do teste, fracas com borda; timeline com 1 entrada; sequência 1 e "hoje ✓".
5. Editar meta → salvar → barras atualizam. Esperar > 1 minuto na aba visível → recarregar `/` → minutos ≥ 1.
6. Abrir `/lessons/M01-02`: warm-up mostra itens `PL-` das tags fracas (a aula não tem outra concluída). Escuta, escrita e fala da aula continuam funcionando.
7. Recarregar `/placement` no meio de uma segunda rodada (clicar "Refazer", responder 5 itens, recarregar): retoma no item certo.
8. `pnpm content:build && pnpm typecheck && pnpm test && pnpm build` verde.

- [ ] **Step 3: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: rotas do painel e do teste inicial; estado E2 entregue"
```

Relate ao final: contagem de testes, o que foi verificado no navegador, decisões que desviaram do plano e pendências adiadas.
