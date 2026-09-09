# Fundações + Motor de Aula (E0 + E1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a running local app where the example lesson M01-02 is fully playable end to end (12 blocks, 7 exercise types, browser TTS/STT, warm-up, writing with rule-based feedback, speaking mode A, completion criteria evaluated from the database), with the whole 5-level roadmap visible.

**Architecture:** Single pnpm package. `content/` holds YAML validated by zod schemas in `shared/`; a build script emits `src/generated/content.json` for the React client. A small Hono server (`server/`) owns a SQLite database (`node:sqlite`, no native deps) and exposes ~10 JSON routes under `/api`; Vite proxies `/api` to it in dev. Scoring of objective exercises happens client-side (single user, no anti-cheat), attempts are posted to the server, and completion is computed server-side from stored attempts.

**Tech Stack:** Node 25 (runs `.ts` directly, type-stripping only; `erasableSyntaxOnly`), pnpm 9, TypeScript 7, Vite 8, React 19, react-router 8, Tailwind CSS 4 (`@tailwindcss/vite`), Hono 4 + `@hono/node-server`, zod 4, yaml 2, vitest 5.

**Spec:** `docs/planejamento/01-plano-geral.md` (sections 4, 6, 7, 8, 9), `docs/planejamento/02-trilha.md` (roadmap data), `docs/planejamento/03-exemplo-aula-M01-02.md` (lesson content).

## Global Constraints

- **No git yet.** The project is not a git repository and the user has not asked for commits. Skip every "commit" step; do NOT run `git init`. Report at the end that the repo is not under version control.
- **Runtime:** Node ≥ 25 (`node --version` → v25.9.0). Server and scripts run with plain `node file.ts` (no tsx, no ts-node). Therefore: `"type": "module"` in package.json, relative imports in `server/`, `shared/`, `scripts/` MUST carry explicit `.ts` extensions, and no enums / parameter properties / namespaces anywhere (`erasableSyntaxOnly: true`).
- **Dependencies (exhaustive):** runtime: `react`, `react-dom`, `react-router`, `hono`, `@hono/node-server`, `zod`, `yaml`. dev: `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `@types/react`, `@types/react-dom`, `@types/node`. Nothing else without updating this section.
- **Ports:** Vite 5173, Hono 3001. Vite proxies `/api` → `http://localhost:3001`.
- **Database file:** `data/progress.sqlite` (env `DB_PATH` overrides; tests use `:memory:`). `data/` and `src/generated/` are gitignored.
- **Language:** UI copy and comments in Portuguese (pt-BR, with accents). Learning content in English as authored in the spec. Code identifiers in English.
- **Content quality:** never placeholder text. Lesson content is transposed verbatim from `docs/planejamento/03-exemplo-aula-M01-02.md`; roadmap from `docs/planejamento/02-trilha.md`.
- **Tests:** vitest, `tests/**/*.test.ts`, Node environment only (no jsdom). Test pure logic (schemas, loader, detector, scoring, speech-compare, db, routes, warm-up). UI is verified manually in the last task.
- **Timestamps:** ISO-8601 UTC strings produced in JS (`new Date().toISOString()`), passed into repository functions as `now` so tests are deterministic.

---

## File Structure

```
package.json  pnpm-lock.yaml  tsconfig.json  vite.config.ts  vitest.config.ts  index.html
.gitignore  .env.example  README.md
scripts/
  dev.mjs                 # spawns server + client, prefixes output, forwards SIGINT
  build-content.ts        # YAML → src/generated/content.json (validates first)
  validate-content.ts     # validate only
shared/                   # code used by server, scripts AND client (pure, no node-only imports except content-loader.ts)
  schema.ts               # zod schemas + inferred types (Exercise, Lesson, LevelsFile, TagsFile, BrErrorsFile)
  content-loader.ts       # loadContent(root) — node:fs + yaml; crossValidate(bundle)
  br-detector.ts          # detectBrErrors(text, patterns)
  scoring.ts              # normalizeAnswer, isAccepted, checkExercise
  speech-compare.ts       # tokenizeWords, expandContractions, matchTargetPhrases, wordsPerMinute
server/
  index.ts                # boot: loadContent, openDb, serve(createApp)
  app.ts                  # createApp({ db, content }) → Hono with all /api routes
  db.ts                   # openDb(path), MIGRATIONS, nowIso
  repo.ts                 # all SQL: attempts, progress, writing, speaking, cards, stats
  completion.ts           # evaluateCompletion(db, lesson)
  warmup.ts               # selectWarmup(db, content, lessonId, now, rng)
  writing-feedback.ts     # ruleBasedFeedback(text, lesson, patterns)
  speaking-metrics.ts     # computeSpeakingMetrics(transcript, durationSec, lesson, patterns)
content/
  tags.yaml  br-errors.yaml  levels.yaml
  modules/M01/module.yaml
  modules/M01/lessons/M01-02.yaml
src/
  main.tsx  App.tsx  index.css
  lib/api.ts              # typed fetch wrappers
  lib/content.ts          # import generated JSON, getLesson/getModule/getLevelOfModule
  lib/speech.ts           # speak(), pickVoice(), recognizeOnce(), isRecognitionSupported()
  pages/Levels.tsx  pages/Module.tsx  pages/Lesson.tsx
  components/ui/{Button,Card,ProgressBar,Badge}.tsx
  components/exercises/{ExerciseRunner,MultipleChoice,FillBlank,ErrorCorrection,Reorder,Translate,Match}.tsx
  components/lesson/{Stepper,WarmUp,Objective,Context,Vocabulary,Grammar,Examples,BrErrors,Dialogue,Listening,Writing,Speaking,Quiz,Completion}.tsx
tests/
  schema.test.ts  content-loader.test.ts  br-detector.test.ts  scoring.test.ts  speech-compare.test.ts
  db.test.ts  repo.test.ts  completion.test.ts  warmup.test.ts  writing-feedback.test.ts  speaking-metrics.test.ts  app.test.ts
```

---

### Task 1: Project scaffold (package, TS, Vite, Tailwind, Hono health route, dev script)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `server/index.ts`, `server/app.ts`, `scripts/dev.mjs`, `README.md`
- Test: `tests/app.test.ts` (health route only, for now)

**Interfaces:**
- Produces: `createApp(deps)` in `server/app.ts` — in THIS task `deps` is typed as `Record<string, unknown>` and only `/api/health` exists; Task 8 replaces the signature with `createApp({ db, content })`.
- Produces: `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm content:build`, `pnpm content:validate` scripts.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "projeto-ingles",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=25" },
  "scripts": {
    "dev": "node scripts/dev.mjs",
    "dev:client": "vite",
    "dev:server": "node --watch --env-file-if-exists=.env server/index.ts",
    "content:build": "node scripts/build-content.ts",
    "content:validate": "node scripts/validate-content.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "build": "pnpm content:build && pnpm typecheck && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run from the project root:
```bash
pnpm add react react-dom react-router hono @hono/node-server zod yaml
pnpm add -D vite @vitejs/plugin-react typescript tailwindcss @tailwindcss/vite vitest @types/react @types/react-dom @types/node
```
Expected: `node_modules/` created, `pnpm-lock.yaml` written.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "types": ["node", "vite/client"]
  },
  "include": ["src", "server", "shared", "scripts", "tests", "vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts` and `vitest.config.ts`**

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3001" },
  },
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 5: Create `index.html`, `src/index.css`, `src/main.tsx`, `src/App.tsx`**

`index.html`:
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Inglês para Tecnologia</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css`:
```css
@import "tailwindcss";

:root {
  color-scheme: light;
}

body {
  @apply bg-slate-50 text-slate-900 antialiased;
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (temporary; Task 9 replaces it with the router):
```tsx
export function App() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Inglês para Tecnologia</h1>
      <p className="mt-2 text-slate-600">Scaffold ok.</p>
    </main>
  );
}
```

- [ ] **Step 6: Write the failing health-route test**

`tests/app.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createApp } from "../server/app.ts";

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const app = createApp({} as never);
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `../server/app.ts`.

- [ ] **Step 8: Create `server/app.ts` and `server/index.ts`**

`server/app.ts`:
```ts
import { Hono } from "hono";

export type AppDeps = Record<string, unknown>; // substituído na Task 8

export function createApp(_deps: AppDeps): Hono {
  const app = new Hono();
  app.get("/api/health", (c) => c.json({ ok: true }));
  return app;
}
```

`server/index.ts`:
```ts
import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";

const port = Number(process.env.PORT ?? 3001);
const app = createApp({});

serve({ fetch: app.fetch, port }, () => {
  console.log(`[server] http://localhost:${port}`);
});
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS (1 test).

- [ ] **Step 10: Create `scripts/dev.mjs`**

```js
// Sobe servidor (Hono) e cliente (Vite) juntos, com prefixo nas linhas, e encerra os dois no Ctrl+C.
import { spawn } from "node:child_process";

const ESC = String.fromCharCode(27);
const procs = [
  { name: "server", color: `${ESC}[36m`, cmd: "pnpm", args: ["dev:server"] },
  { name: "client", color: `${ESC}[35m`, cmd: "pnpm", args: ["dev:client"] },
];

const children = procs.map((p) => {
  const child = spawn(p.cmd, p.args, { stdio: ["ignore", "pipe", "pipe"], env: process.env });
  const prefix = `${p.color}[${p.name}]${ESC}[0m `;
  const pipe = (stream, out) => {
    let buf = "";
    stream.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) out.write(prefix + line + "\n");
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => {
    process.stdout.write(`${prefix}saiu com código ${code}\n`);
  });
  return child;
});

const shutdown = () => {
  for (const c of children) c.kill("SIGTERM");
  setTimeout(() => process.exit(0), 300);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
```

- [ ] **Step 11: Create `.gitignore`, `.env.example`, `README.md`**

`.gitignore`:
```
node_modules/
dist/
data/
src/generated/
.env
.DS_Store
```

`.env.example`:
```
# Porta do servidor local
PORT=3001
# Caminho do banco SQLite (padrão: data/progress.sqlite)
DB_PATH=data/progress.sqlite
# Credencial da Claude API (usada a partir da etapa E4). Alternativa: `ant auth login`.
# ANTHROPIC_API_KEY=
```

`README.md` — write exactly this content (the inner fence uses four backticks so it nests):
````markdown
# Inglês para Tecnologia

Treinamento prático de inglês para profissionais de DevOps, Cloud, SRE e desenvolvimento.
Planejamento completo em `docs/planejamento/`.

## Requisitos
- Node ≥ 25 (roda TypeScript diretamente)
- pnpm ≥ 9
- Google Chrome (reconhecimento de fala)

## Rodando
```bash
pnpm install
pnpm content:build   # valida o conteúdo YAML e gera src/generated/content.json
pnpm dev             # servidor em :3001 e cliente em :5173
```
Abra http://localhost:5173.

## Scripts
- `pnpm test` — testes (vitest)
- `pnpm typecheck` — TypeScript sem emitir
- `pnpm content:validate` — valida `content/` sem gerar arquivo
- `pnpm build` — build de produção do cliente

## Estrutura
- `content/` — aulas, níveis, tags e catálogo de erros (YAML)
- `shared/` — schemas e lógica pura compartilhada (cliente, servidor, scripts)
- `server/` — API local (Hono) + SQLite (`node:sqlite`)
- `src/` — cliente React (Vite)
- `docs/` — planejamento e planos de implementação
````

- [ ] **Step 12: Verify typecheck and dev boot**

Run: `pnpm typecheck`
Expected: no errors.

Run in background: `node server/index.ts &` then `sleep 1 && curl -s localhost:3001/api/health && kill %1`
Expected: `{"ok":true}`.

`pnpm build` will FAIL until Task 3 creates the content build script — expected at this point; do not "fix" it here.

---

### Task 2: Content schemas (zod) and the tags taxonomy

**Files:**
- Create: `shared/schema.ts`, `content/tags.yaml`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Produces (from `shared/schema.ts`):
  - `Competency = z.enum(["VOC","SPK","LIS","PRO","REA","WRI","CNF"])`
  - `ExerciseSchema` (discriminated union on `type`) and type `Exercise`; per-type schemas `MultipleChoiceSchema`, `FillBlankSchema`, `ErrorCorrectionSchema`, `ReorderSchema`, `TranslateSchema`, `MatchSchema`, `FreeTextSchema`
  - `LessonSchema` / `Lesson`, `LevelsFileSchema` / `LevelsFile`, `Level`, `ModuleMeta`, `TagsFileSchema` / `Tag`, `BrErrorsFileSchema` / `BrErrorPattern`, `ModuleFileSchema` / `ModuleFile`
  - `BlockSchema` / `Block = "warmup" | "quiz" | "listening" | "writing" | "speaking"`
  - `ContentBundle` type: `{ levels: Level[]; lessons: Record<string, Lesson>; modules: Record<string, ModuleFile>; tags: Tag[]; brErrors: BrErrorPattern[] }`

- [ ] **Step 1: Write the failing schema tests**

`tests/schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { ExerciseSchema, LessonSchema, TagsFileSchema } from "../shared/schema.ts";

const mc = {
  id: "M01-02-q4", type: "multiple_choice", prompt: "Which one sounds evasive?",
  options: ["It's taking longer than expected; I'll need another day.", "It's almost done, almost."],
  answer: 1, explanation: "Sem informação concreta.", tags: ["topic.daily"],
};

describe("ExerciseSchema", () => {
  it("accepts a multiple_choice exercise", () => {
    expect(ExerciseSchema.parse(mc)).toMatchObject({ type: "multiple_choice", answer: 1 });
  });
  it("rejects multiple_choice whose answer index is out of range", () => {
    expect(() => ExerciseSchema.parse({ ...mc, answer: 2 })).toThrow();
  });
  it("accepts fill_blank with accepted[]", () => {
    const ex = { id: "M01-02-q1", type: "fill_blank", prompt: "I ___ (work) on this since Monday.", accepted: ["have been working", "'ve been working"], explanation: "since → present perfect continuous", tags: ["gram.since-for"] };
    expect(ExerciseSchema.parse(ex).type).toBe("fill_blank");
  });
  it("rejects reorder whose answer does not use exactly the given tokens", () => {
    const ex = { id: "M01-02-q8", type: "reorder", prompt: "Reordene.", tokens: ["on", "blocked", "staging", "to", "access", "I'm"], answer: "I'm blocked on staging", explanation: "x", tags: ["vocab.standup"] };
    expect(() => ExerciseSchema.parse(ex)).toThrow();
  });
  it("rejects an exercise with no tags", () => {
    expect(() => ExerciseSchema.parse({ ...mc, tags: [] })).toThrow();
  });
});

describe("TagsFileSchema", () => {
  it("requires the id to start with the group", () => {
    expect(() => TagsFileSchema.parse({ tags: [{ id: "gram.present-perfect", group: "vocab", label: "x" }] })).toThrow();
    expect(TagsFileSchema.parse({ tags: [{ id: "gram.present-perfect", group: "gram", label: "x" }] }).tags).toHaveLength(1);
  });
});

describe("LessonSchema", () => {
  it("rejects a lesson missing the quiz", () => {
    expect(() => LessonSchema.parse({ id: "M01-02", module: "M01", order: 2, title: "t" })).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test tests/schema.test.ts`
Expected: FAIL — cannot resolve `../shared/schema.ts`.

- [ ] **Step 3: Create `shared/schema.ts`**

```ts
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

export const BlockSchema = z.enum(["warmup", "quiz", "listening", "writing", "speaking"]);
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
  writing: z.object({
    prompt: z.string().min(1),
    constraints: z.array(z.object({ label: z.string().min(1), pattern: z.string().optional() })).default([]),
    rubric: z.array(z.string().min(1)).min(1),
    model: z.string().min(1),
    minWords: z.number().int().positive(),
    maxWords: z.number().int().positive(),
    tags: z.array(z.string().min(3)).default([]),
  }),
  speaking: z.object({
    modeA: z.object({ prompt: z.string().min(1), maxSeconds: z.number().int().positive(), targetPhrases: z.array(z.string().min(1)).min(1), checklist: z.array(z.string()).default([]) }),
    modeB: z.object({ persona: z.string().min(1), goals: z.array(z.string()).min(1), followUps: z.array(z.string()).min(1), rubric: z.array(z.string()).min(1) }).optional(),
  }),
  quiz: z.array(ExerciseSchema).min(3),
  review: z.object({ count: z.number().int().positive().default(5), preferTags: z.array(z.string()).default([]) }).default({ count: 5, preferTags: [] }),
  srsCards: z.array(z.object({ front: z.string().min(1), back: z.string().min(1), hint: z.string().optional(), tag: z.string().min(3) })).min(1),
  completion: z.object({ quizMin: z.number().min(0).max(1), writingMin: z.number().min(1).max(5), speakingRequired: z.boolean() }),
});
export type Lesson = z.infer<typeof LessonSchema>;

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

// ---------- Bundle consumido pelo cliente e servidor ----------
export type ContentBundle = {
  levels: Level[];
  lessons: Record<string, Lesson>;
  modules: Record<string, ModuleFile>;
  tags: Tag[];
  brErrors: BrErrorPattern[];
};
```

- [ ] **Step 4: Create `content/tags.yaml`**

```yaml
# Taxonomia fechada de tags. Toda tag usada em aulas, exercícios e catálogo de erros precisa existir aqui.
tags:
  # Competências
  - { id: comp.vocabulary,    group: comp, label: Vocabulário }
  - { id: comp.speaking,      group: comp, label: Conversação }
  - { id: comp.listening,     group: comp, label: Compreensão auditiva }
  - { id: comp.pronunciation, group: comp, label: Pronúncia }
  - { id: comp.reading,       group: comp, label: Leitura }
  - { id: comp.writing,       group: comp, label: Escrita }
  - { id: comp.confidence,    group: comp, label: Confiança }
  # Gramática em contexto
  - { id: gram.present-perfect,        group: gram, label: Present perfect × past simple }
  - { id: gram.since-for,              group: gram, label: since / for }
  - { id: gram.by-until,               group: gram, label: by × until }
  - { id: gram.still-yet-already,      group: gram, label: still / yet / already }
  - { id: gram.future-plans,           group: gram, label: Planos (going to / will / -ing) }
  - { id: gram.question-forms,         group: gram, label: Formação de perguntas }
  - { id: gram.modals-polite,          group: gram, label: Modais de polidez }
  - { id: gram.indirect-questions,     group: gram, label: Perguntas indiretas }
  - { id: gram.present-simple-process, group: gram, label: Present simple para processos }
  - { id: gram.prepositions-infra,     group: gram, label: Preposições de infraestrutura }
  - { id: gram.imperative,             group: gram, label: Imperativo em instruções }
  - { id: gram.conditionals-real,      group: gram, label: Condicionais reais }
  - { id: gram.hedging,                group: gram, label: Cautela (hedging) }
  - { id: gram.softeners,              group: gram, label: Suavizadores }
  - { id: gram.past-narrative,         group: gram, label: Narrativa no passado }
  - { id: gram.cause-effect,           group: gram, label: Causa e efeito }
  - { id: gram.passive,                group: gram, label: Voz passiva }
  - { id: gram.describing-trends,      group: gram, label: Descrever tendências }
  - { id: gram.numbers-percentages,    group: gram, label: Números e percentuais }
  # Vocabulário por tema
  - { id: vocab.standup,       group: vocab, label: Standup }
  - { id: vocab.slack,         group: vocab, label: Slack / Teams }
  - { id: vocab.errors,        group: vocab, label: Mensagens de erro e logs }
  - { id: vocab.architecture,  group: vocab, label: Arquitetura e fluxos }
  - { id: vocab.tickets-prs,   group: vocab, label: Tickets, commits e PRs }
  - { id: vocab.ci,            group: vocab, label: CI/CD }
  - { id: vocab.iac,           group: vocab, label: Infra como código }
  - { id: vocab.k8s,           group: vocab, label: Containers e Kubernetes }
  - { id: vocab.cloud,         group: vocab, label: Cloud providers }
  - { id: vocab.incident,      group: vocab, label: Incidentes }
  - { id: vocab.observability, group: vocab, label: Observabilidade e SLOs }
  - { id: vocab.security,      group: vocab, label: Segurança }
  - { id: vocab.finops,        group: vocab, label: Custos e FinOps }
  - { id: vocab.interview,     group: vocab, label: Entrevistas e carreira }
  # Erros típicos de brasileiros
  - { id: br.since-present,    group: br, label: "since/for + presente" }
  - { id: br.doubt,            group: br, label: "doubt em vez de question" }
  - { id: br.until-by,         group: br, label: "until em vez de by" }
  - { id: br.until-late,       group: br, label: "until late" }
  - { id: br.actually,         group: br, label: "actually = atualmente" }
  - { id: br.pretend,          group: br, label: "pretend = pretender" }
  - { id: br.assist,           group: br, label: "assist = assistir" }
  - { id: br.explain-me,       group: br, label: "explain me" }
  - { id: br.giving-error,     group: br, label: "giving error" }
  - { id: br.waiting-no-prep,  group: br, label: "waiting + objeto sem preposição" }
  - { id: br.make-a-question,  group: br, label: "make a question" }
  - { id: br.in-the-last-week, group: br, label: "in the last week (= semana passada)" }
  - { id: br.have-years,       group: br, label: "have X years (idade)" }
  - { id: br.people-is,        group: br, label: "people is" }
  - { id: br.discuss-about,    group: br, label: "discuss about" }
  - { id: br.depend-of,        group: br, label: "depend of" }
  - { id: br.according-with,   group: br, label: "according with" }
  - { id: br.win-money,        group: br, label: "win money" }
  - { id: br.lose-the-deadline, group: br, label: "lose (perder) hora/prazo" }
  # Situação
  - { id: topic.daily,         group: topic, label: Daily standup }
  - { id: topic.help,          group: topic, label: Pedir ajuda }
  - { id: topic.async,         group: topic, label: Assíncrono e fusos }
  - { id: topic.reading,       group: topic, label: Leitura técnica }
  - { id: topic.architecture,  group: topic, label: Explicar arquitetura }
  - { id: topic.code-review,   group: topic, label: Code review }
  - { id: topic.incident-call, group: topic, label: Incident call }
  - { id: topic.interview,     group: topic, label: Entrevista }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test tests/schema.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

---

### Task 3: Content loader, build scripts, roadmap (`levels.yaml`), module M01 and lesson M01-02

**Files:**
- Create: `shared/content-loader.ts`, `scripts/build-content.ts`, `scripts/validate-content.ts`, `content/levels.yaml`, `content/modules/M01/module.yaml`, `content/modules/M01/lessons/M01-02.yaml`, `content/br-errors.yaml` (minimal here; Task 4 completes it)
- Test: `tests/content-loader.test.ts`

**Interfaces:**
- Consumes: every schema from `shared/schema.ts` (Task 2).
- Produces (from `shared/content-loader.ts`):
  - `loadContent(root: string): ContentBundle` — reads and parses all YAML; throws `Error` whose message lists every problem (path + zod issue) when any file fails schema validation.
  - `crossValidate(bundle: ContentBundle): string[]` — returns human-readable problems (empty array = OK): unknown tags, duplicate exercise ids, lesson ids not listed in `levels.yaml`, lesson `module` mismatch, `minWords > maxWords`.
  - `allExercises(lesson: Lesson): Array<{ exercise: Exercise; block: "quiz" | "listening" }>`
- Produces: `src/generated/content.json` (shape = `ContentBundle`) via `pnpm content:build`.

- [ ] **Step 1: Write the failing loader tests**

`tests/content-loader.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { loadContent, crossValidate, allExercises } from "../shared/content-loader.ts";

describe("loadContent(content/)", () => {
  const bundle = loadContent("content");

  it("loads the full roadmap: 5 levels, 32 modules, 157 lessons", () => {
    expect(bundle.levels).toHaveLength(5);
    const modules = bundle.levels.flatMap((l) => l.modules);
    expect(modules).toHaveLength(32);
    expect(modules.flatMap((m) => m.lessons)).toHaveLength(157);
  });

  it("loads lesson M01-02 with the counts from the spec", () => {
    const lesson = bundle.lessons["M01-02"]!;
    expect(lesson.title).toBe("Reportando progresso, atraso e bloqueio no daily");
    expect(lesson.vocabulary).toHaveLength(16);
    expect(lesson.brErrors).toHaveLength(11);
    expect(lesson.listening.questions).toHaveLength(6);
    expect(lesson.quiz).toHaveLength(8);
    expect(lesson.srsCards).toHaveLength(12);
    expect(lesson.dialogue.lines).toHaveLength(8);
    expect(lesson.completion).toEqual({ quizMin: 0.75, writingMin: 3, speakingRequired: true });
  });

  it("passes cross-validation", () => {
    expect(crossValidate(bundle)).toEqual([]);
  });

  it("allExercises returns quiz + listening with their block", () => {
    const items = allExercises(bundle.lessons["M01-02"]!);
    expect(items.filter((i) => i.block === "quiz")).toHaveLength(8);
    expect(items.filter((i) => i.block === "listening")).toHaveLength(6);
  });
});

describe("crossValidate", () => {
  it("reports unknown tags and duplicate exercise ids", () => {
    const bundle = loadContent("content");
    const lesson = structuredClone(bundle.lessons["M01-02"]!);
    lesson.quiz[0]!.tags = ["gram.does-not-exist"];
    lesson.quiz[1]!.id = lesson.quiz[2]!.id;
    const problems = crossValidate({ ...bundle, lessons: { ...bundle.lessons, "M01-02": lesson } });
    expect(problems.some((p) => p.includes("gram.does-not-exist"))).toBe(true);
    expect(problems.some((p) => p.includes("duplicad"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test tests/content-loader.test.ts`
Expected: FAIL — cannot resolve `../shared/content-loader.ts`.

- [ ] **Step 3: Create `shared/content-loader.ts`**

```ts
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { ZodTypeAny, z } from "zod";
import {
  BrErrorsFileSchema, LessonSchema, LevelsFileSchema, ModuleFileSchema, TagsFileSchema,
  type ContentBundle, type Exercise, type Lesson, type ModuleFile,
} from "./schema.ts";

function readYaml<S extends ZodTypeAny>(path: string, schema: S, problems: string[]): z.infer<S> | undefined {
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

  if (problems.length > 0 || !levels || !tags || !brErrors) {
    throw new Error(`Conteúdo inválido:\n- ${problems.join("\n- ")}`);
  }
  return { levels: levels.levels, lessons, modules, tags: tags.tags, brErrors: brErrors.patterns };
}

export function allExercises(lesson: Lesson): Array<{ exercise: Exercise; block: "quiz" | "listening" }> {
  return [
    ...lesson.quiz.map((exercise) => ({ exercise, block: "quiz" as const })),
    ...lesson.listening.questions.map((exercise) => ({ exercise, block: "listening" as const })),
  ];
}

/** Verificações entre arquivos. Retorna lista de problemas legíveis (vazia = ok). */
export function crossValidate(bundle: ContentBundle): string[] {
  const problems: string[] = [];
  const tagIds = new Set(bundle.tags.map((t) => t.id));
  const checkTags = (where: string, tags: string[]) => {
    for (const t of tags) if (!tagIds.has(t)) problems.push(`${where}: tag desconhecida '${t}'`);
  };

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
    const seen = new Set<string>();
    for (const { exercise, block } of allExercises(lesson)) {
      if (seen.has(exercise.id)) problems.push(`${where}: exercício duplicado '${exercise.id}'`);
      seen.add(exercise.id);
      if (!exercise.id.startsWith(`${lesson.id}-`)) problems.push(`${where}: exercício '${exercise.id}' (${block}) deveria começar com '${lesson.id}-'`);
      checkTags(`${where}.${block}.${exercise.id}`, exercise.tags);
    }
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
```

- [ ] **Step 4: Create `scripts/validate-content.ts` and `scripts/build-content.ts`**

`scripts/validate-content.ts`:
```ts
import { loadContent, crossValidate } from "../shared/content-loader.ts";

try {
  const bundle = loadContent("content");
  const problems = crossValidate(bundle);
  if (problems.length > 0) {
    console.error(`Conteúdo com ${problems.length} problema(s):\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  const lessonCount = Object.keys(bundle.lessons).length;
  console.log(`ok: ${bundle.levels.length} níveis, ${lessonCount} aula(s) com conteúdo, ${bundle.tags.length} tags, ${bundle.brErrors.length} padrões de erro`);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
```

`scripts/build-content.ts`:
```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { loadContent, crossValidate } from "../shared/content-loader.ts";

try {
  const bundle = loadContent("content");
  const problems = crossValidate(bundle);
  if (problems.length > 0) {
    console.error(`Conteúdo com ${problems.length} problema(s):\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  mkdirSync("src/generated", { recursive: true });
  writeFileSync("src/generated/content.json", JSON.stringify(bundle, null, 2));
  console.log(`gerado src/generated/content.json (${Object.keys(bundle.lessons).length} aula(s) com conteúdo)`);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
```

- [ ] **Step 5: Create a minimal `content/br-errors.yaml` (Task 4 expands it)**

```yaml
# Catálogo de erros típicos de brasileiros. Regex aplicada ao texto do aluno (flags padrão: gi).
patterns:
  - id: doubt-question
    pattern: "\\b(i have|i've got|i got|any|some|one|a) doubts?\\b"
    wrong: "I have a doubt"
    right: "I have a question / I'm not sure about…"
    why: "doubt = desconfiança. Dúvida no sentido de pergunta é question."
    tag: br.doubt
```

- [ ] **Step 6: Create `content/modules/M01/module.yaml`**

```yaml
id: M01
assessment:
  description: "15 itens mistos das tags do módulo + gravação de um update de standup real avaliado por rubrica (≥ 3/5)."
  passPct: 0.75
```

- [ ] **Step 7: Create `content/levels.yaml` (the complete roadmap from `docs/planejamento/02-trilha.md`)**

```yaml
levels:
  - id: 1
    name: Foundation
    subtitle: Sobreviver ao dia a dia
    focus: Standup, pedir ajuda, Slack, ler logs e docs, descrever sistemas, tickets e PRs.
    exitCriteria: Avaliação de nível ≥ 75% + simulação de standup avaliada ≥ 3/5.
    modules:
      - id: M01
        title: Daily standups
        objective: Dar um update de 30–45 s claro, no tempo verbal certo, sem soar evasivo nem alarmista.
        competencies: [SPK, VOC, LIS]
        prerequisites: []
        completion: Todas as aulas concluídas + avaliação de módulo ≥ 75% + gravação de update real ≥ 3/5.
        evaluation: Duração média do update, % de expressões-alvo usadas, erros br.since-present e br.until-by tendendo a zero.
        lessons:
          - { id: M01-01, title: "Anatomia de um standup: yesterday / today / blockers" }
          - { id: M01-02, title: "Reportando progresso, atraso e bloqueio no daily" }
          - { id: M01-03, title: "Tempo e prazos: ETA, EOD, by × until, within" }
          - { id: M01-04, title: "Bloqueios e dependências: blocked on, waiting on, depends on" }
          - { id: M01-05, title: "Standup completo com 3 personas + parking lot", simulation: true }
      - id: M02
        title: Pedindo ajuda e esclarecimento
        objective: Pedir ajuda, dizer que não entendeu e fazer perguntas técnicas precisas sem parecer despreparado nem rude.
        competencies: [SPK, LIS, CNF]
        prerequisites: [M01-01]
        completion: Padrão + 3 perguntas técnicas escritas avaliadas ≥ 3/5 cada.
        evaluation: Nota de módulo e rubrica da simulação de pair debugging.
        lessons:
          - { id: M02-01, title: "Pedidos educados e escaláveis: could / would you mind / when you get a chance" }
          - { id: M02-02, title: "Não entendi: I'm not sure I follow, Do you mean…?, Just to confirm…" }
          - { id: M02-03, title: "Pergunta técnica que recebe resposta: contexto → o que tentei → pergunta" }
          - { id: M02-04, title: "Interromper e retomar em reunião: Sorry to jump in, Going back to…" }
          - { id: M02-05, title: "Pair debugging por chamada: você pede ajuda com um erro de kubectl", simulation: true }
      - id: M03
        title: Slack e Teams no dia a dia
        objective: Escrever mensagens curtas com tom certo, responder e fechar threads, lidar com assíncrono e fusos.
        competencies: [WRI, VOC, REA]
        prerequisites: [M01-01]
        completion: Padrão + 10 mensagens corrigidas com média ≥ 3,5/5.
        evaluation: Tamanho médio da mensagem caindo, erros de registro caindo.
        lessons:
          - { id: M03-01, title: "Tom e formato: no hello, threads, quando marcar alguém, emojis" }
          - { id: M03-02, title: "Fórmulas que resolvem 80%: FYI, heads up, quick question, +1, TL;DR" }
          - { id: M03-03, title: "Responder e fechar: on it, will do, done, thanks for flagging" }
          - { id: M03-04, title: "Assíncrono e fusos: EOD my time, handoffs, avisos de ausência" }
          - { id: M03-05, title: "Escrita guiada: 10 mensagens reais" }
      - id: M04
        title: Lendo logs, erros e documentação
        objective: Ler com método mensagens de erro, stack traces, READMEs e issues, e resumir o que leu em uma frase.
        competencies: [REA, VOC]
        prerequisites: []
        completion: Padrão + resumo de 1 frase para cada uma das 6 leituras avaliado.
        evaluation: Acerto nas perguntas de compreensão e qualidade dos resumos.
        lessons:
          - { id: M04-01, title: "Anatomia de mensagens de erro: expected/got, failed to, unable to, timed out" }
          - { id: M04-02, title: "Stack traces e logs estruturados: ler de baixo para cima" }
          - { id: M04-03, title: "READMEs e docs oficiais: skimming, prerequisites, caveats, deprecated" }
          - { id: M04-04, title: "Issues e PRs no GitHub: reproduzir, comentar, workaround" }
          - { id: M04-05, title: "Prática: 6 leituras reais com perguntas" }
      - id: M05
        title: Descrevendo sistemas e fluxos
        objective: Explicar uma arquitetura e um fluxo de requisição em voz alta, com verbos e preposições certos.
        competencies: [SPK, VOC, PRO]
        prerequisites: [M01]
        completion: Padrão + explicação gravada de 2 min ≥ 3/5.
        evaluation: Rubrica da explicação gravada e erros de preposição por tag.
        lessons:
          - { id: M05-01, title: "Componentes e relações: sits behind, talks to, is fronted by, backed by" }
          - { id: M05-02, title: "Fluxos: the request goes through → hits → gets routed to → returns" }
          - { id: M05-03, title: "Preposições e verbos de infraestrutura: deploy to, run on, expose via, listen on" }
          - { id: M05-04, title: "Explicando um diagrama: signposting básico" }
          - { id: M05-05, title: "Explicar sua arquitetura atual para um colega novo", simulation: true }
      - id: M06
        title: Tickets, commits e PRs
        objective: Escrever ticket, commit, PR e comentários básicos que outros conseguem agir sem perguntar.
        competencies: [WRI, REA]
        prerequisites: [M03, M04]
        completion: Padrão + 5 textos avaliados ≥ 3,5/5.
        evaluation: Rubrica dos textos escritos.
        lessons:
          - { id: M06-01, title: "Ticket: título, contexto, steps to reproduce, expected × actual" }
          - { id: M06-02, title: "Commit messages e títulos de PR: imperativo, escopo, convenções" }
          - { id: M06-03, title: "PR description: what / why / how to test / risks" }
          - { id: M06-04, title: "Comentar e responder em PRs: good catch, addressed, PTAL, nit:, LGTM" }
          - { id: M06-05, title: "Prática: 3 tickets + 2 PRs a partir de cenários" }
  - id: 2
    name: Professional
    subtitle: Participar ativamente
    focus: Refinamento, retro e 1:1, code review, explicar problemas, CI/CD, IaC, Kubernetes, e-mail e docs, clouds.
    exitCriteria: Avaliação ≥ 75% + code review escrito + e-mail de escalada + simulação de refinamento.
    modules:
      - id: M07
        title: Planejamento, refinamento e estimativas
        objective: Participar de refinamento: entender a história, levantar dúvidas, estimar com cautela e registrar riscos.
        competencies: [SPK, LIS, VOC]
        prerequisites: [M01, M02]
        completion: Padrão + simulação ≥ 3/5.
        evaluation: Rubrica da simulação de refinamento.
        lessons:
          - { id: M07-01, title: "Vocabulário de backlog: story, epic, spike, acceptance criteria, scope creep" }
          - { id: M07-02, title: "Estimando com cautela: I'd say, roughly, ballpark, it depends on" }
          - { id: M07-03, title: "Condicionais reais: If we go with X, we'll need…; unless; as long as" }
          - { id: M07-04, title: "Levantando dúvidas e riscos de escopo" }
          - { id: M07-05, title: "Refinamento de uma história de infraestrutura com PO e dev", simulation: true }
      - id: M08
        title: Retrospectivas e 1:1s
        objective: Falar de problemas do time sem culpar, dar e receber feedback, conduzir um 1:1 com objetivo.
        competencies: [SPK, CNF]
        prerequisites: [M02]
        completion: Padrão.
        evaluation: Rubrica das simulações de retro e 1:1.
        lessons:
          - { id: M08-01, title: "Retro: what went well / what didn't / action items" }
          - { id: M08-02, title: "Dando feedback construtivo: I noticed, it would help if" }
          - { id: M08-03, title: "Recebendo feedback: fair point, I'll work on that" }
          - { id: M08-04, title: "1:1 com gestor: prioridades, carga, carreira" }
          - { id: M08-05, title: "Retro + 1:1 (dois cenários curtos)", simulation: true }
      - id: M09
        title: Code review
        objective: Sugerir, pedir mudanças e responder reviews com tom certo e vocabulário preciso.
        competencies: [WRI, REA, VOC]
        prerequisites: [M06]
        completion: Padrão + 6 comentários de review avaliados ≥ 3,5/5.
        evaluation: Rubrica dos comentários escritos.
        lessons:
          - { id: M09-01, title: "Sugerindo sem impor: consider, what do you think about, nit:, non-blocking" }
          - { id: M09-02, title: "Pedindo mudanças: this would break…, could we…; severidade explícita" }
          - { id: M09-03, title: "Respondendo: concordar, discordar com motivo, addressed in abc123" }
          - { id: M09-04, title: "Léxico de review: refactor, extract, dead code, edge case, race condition" }
          - { id: M09-05, title: "Prática: revisar 3 PRs reais e responder a 3 reviews" }
      - id: M10
        title: Explicando problemas e soluções
        objective: Narrar um problema, o que foi tentado, a causa e a solução, em voz e em texto.
        competencies: [SPK, WRI]
        prerequisites: [M04, M05]
        completion: Padrão.
        evaluation: Rubrica da narrativa em thread e em voz.
        lessons:
          - { id: M10-01, title: "Narrativa de problema: symptom → context → what I tried → what I found" }
          - { id: M10-02, title: "Causa e efeito: turned out, because of, which caused, led to" }
          - { id: M10-03, title: "Verbos de troubleshooting: narrow down, rule out, reproduce, roll back, bisect" }
          - { id: M10-04, title: "Propondo solução com alternativas: the quickest fix is…, the proper fix is…" }
          - { id: M10-05, title: "Explicar um bug e a correção numa thread e em voz", simulation: true }
      - id: M11
        title: CI/CD e Infraestrutura como Código
        objective: Discutir pipelines e IaC em conversa e em PR, descrever falhas e estratégias de rollout.
        competencies: [VOC, SPK, WRI]
        prerequisites: [M06, M10]
        completion: Padrão.
        evaluation: Rubrica da simulação de revisão de pipeline.
        lessons:
          - { id: M11-01, title: "Vocabulário de pipelines: stage, job, artifact, runner, trigger, flaky, gate" }
          - { id: M11-02, title: "Descrevendo falhas de pipeline e como corrigiu" }
          - { id: M11-03, title: "Terraform/IaC em conversa: plan, apply, drift, state, it wants to recreate" }
          - { id: M11-04, title: "Estratégias: trunk-based, feature flags, blue/green, canary, rollback" }
          - { id: M11-05, title: "Revisão de mudança de pipeline + discussão de rollout", simulation: true }
      - id: M12
        title: Containers e Kubernetes
        objective: Descrever estados, fazer troubleshooting em voz alta e discutir recursos e escala.
        competencies: [VOC, SPK, PRO]
        prerequisites: [M05, M10]
        completion: Padrão.
        evaluation: Rubrica da simulação de incidente leve.
        lessons:
          - { id: M12-01, title: "Vocabulário: image, pod, node, deployment, service, ingress, probe, sidecar" }
          - { id: M12-02, title: "Descrevendo estados: crash-looping, pending, evicted, OOMKilled, throttled" }
          - { id: M12-03, title: "Troubleshooting narrado: let me describe the pod, the liveness probe is failing" }
          - { id: M12-04, title: "Recursos e escala: requests/limits, HPA, we're over-provisioned" }
          - { id: M12-05, title: "Incidente leve de K8s em pair com colega", simulation: true }
      - id: M13
        title: E-mails e documentação
        objective: Escrever e-mails profissionais, README e runbook claros.
        competencies: [WRI]
        prerequisites: [M03, M06]
        completion: Padrão + os 2 textos finais ≥ 4/5.
        evaluation: Rubrica do e-mail de escalada e do runbook.
        lessons:
          - { id: M13-01, title: "E-mail profissional: assunto, abertura, corpo, fechamento; formal × neutro" }
          - { id: M13-02, title: "E-mails comuns: pedido, follow-up, agendamento, escalada, gentle reminder" }
          - { id: M13-03, title: "README e documentação: estrutura, imperativo, exemplos, Note / Warning" }
          - { id: M13-04, title: "Runbooks: pré-condições, passos numerados, verificação, rollback" }
          - { id: M13-05, title: "Prática: 1 e-mail de escalada + 1 runbook completo" }
      - id: M14
        title: "Cloud providers: AWS, Azure, GCP"
        objective: Falar dos serviços dos três provedores, comparar e justificar escolhas, ler pricing e limites.
        competencies: [VOC, REA, SPK]
        prerequisites: [M05]
        completion: Padrão.
        evaluation: Rubrica da apresentação de proposta de migração.
        lessons:
          - { id: M14-01, title: "Mapa de serviços: compute, storage, networking, IAM nos três provedores" }
          - { id: M14-02, title: "Termos que confundem: region/zone, managed/serverless, spin up, tear down" }
          - { id: M14-03, title: "Comparando e justificando: X is a better fit because…" }
          - { id: M14-04, title: "Lendo docs e pricing pages: quotas, limits, SLAs, tiered pricing" }
          - { id: M14-05, title: "Apresentar proposta de migração de um serviço para outro provedor", simulation: true }
  - id: 3
    name: Incident-ready
    subtitle: Liderar sob pressão
    focus: Comunicação de incidente, bridges, post-mortem, observabilidade e SLOs, segurança, FinOps.
    exitCriteria: Post-mortem escrito ≥ 4/5 + simulação de incident call ≥ 3/5 + avaliação ≥ 75%.
    modules:
      - id: M15
        title: Comunicação de incidentes
        objective: Escrever e falar atualizações de incidente para técnicos e não técnicos, com cadência e confiança.
        competencies: [WRI, SPK]
        prerequisites: [M10, M03]
        completion: Padrão + sequência de 4 atualizações escritas ≥ 4/5.
        evaluation: Rubrica das atualizações escritas.
        lessons:
          - { id: M15-01, title: "Severidades e impacto: customer-facing, degraded, partial outage, blast radius" }
          - { id: M15-02, title: "Primeira atualização: what / impact / current status / next update at" }
          - { id: M15-03, title: "Atualizações periódicas: still investigating, identified, mitigated, monitoring" }
          - { id: M15-04, title: "Stakeholders não técnicos: sem jargão, com confiança" }
          - { id: M15-05, title: "Encerrando: resolved, we'll follow up with a post-mortem by…" }
      - id: M16
        title: Incident calls (bridges)
        objective: Participar e conduzir uma bridge: pedir e dar informação, decidir, interromper e realinhar.
        competencies: [SPK, LIS, CNF]
        prerequisites: [M15, M02-04]
        completion: Padrão + simulação ≥ 3/5.
        evaluation: Rubrica da bridge simulada.
        lessons:
          - { id: M16-01, title: "Papéis e protocolo: incident commander, scribe, comms lead" }
          - { id: M16-02, title: "Informação sob pressão: can someone confirm…, I'm seeing…" }
          - { id: M16-03, title: "Decidindo: let's roll back, I'd rather…, hold off on…, go ahead" }
          - { id: M16-04, title: "Interromper, corrigir e realinhar: hang on, let's stay on…" }
          - { id: M16-05, title: "Bridge de 15 min com 3 personas; você é o incident commander", simulation: true }
      - id: M17
        title: Post-mortems
        objective: Escrever um post-mortem blameless completo.
        competencies: [WRI]
        prerequisites: [M15, M13]
        completion: Post-mortem ≥ 4/5.
        evaluation: Rubrica do post-mortem.
        lessons:
          - { id: M17-01, title: "Cultura blameless: linguagem que evita culpa, voz passiva útil" }
          - { id: M17-02, title: "Timeline: horários, timezones, verbos (alerts fired, was paged, rolled back)" }
          - { id: M17-03, title: "Root cause e contributing factors: the underlying cause, exacerbated by" }
          - { id: M17-04, title: "Action items: owner, prazo, verbo de ação, prioridade" }
          - { id: M17-05, title: "Prática: post-mortem completo a partir de um incidente dado" }
      - id: M18
        title: Observabilidade, SLOs e performance
        objective: Descrever gráficos, SLOs e gargalos em voz e em texto.
        competencies: [VOC, SPK]
        prerequisites: [M12]
        completion: Padrão.
        evaluation: Rubrica da apresentação de análise de degradação.
        lessons:
          - { id: M18-01, title: "Metrics, logs, traces: vocabulário e verbos (emit, scrape, sample, correlate)" }
          - { id: M18-02, title: "Descrevendo gráficos: spiked, dropped, plateaued, p99 latency went from… to…" }
          - { id: M18-03, title: "SLOs e error budget: burning budget, within SLO, burn rate" }
          - { id: M18-04, title: "Performance: bottleneck, throughput, saturation, it's CPU-bound" }
          - { id: M18-05, title: "Apresentar análise de degradação com gráfico para o time", simulation: true }
      - id: M19
        title: Segurança
        objective: Reportar e discutir problemas de segurança com urgência proporcional e vocabulário preciso.
        competencies: [VOC, WRI, SPK]
        prerequisites: [M15]
        completion: Padrão.
        evaluation: Rubrica da discussão de finding.
        lessons:
          - { id: M19-01, title: "Vocabulário: vulnerability, CVE, exposure, least privilege, hardening" }
          - { id: M19-02, title: "Reportando: urgência sem pânico, canal certo, o que incluir" }
          - { id: M19-03, title: "Riscos e compliance: this violates…, we're required to…, compensating control" }
          - { id: M19-04, title: "Respondendo a findings: remediação, aceitação de risco, prazo" }
          - { id: M19-05, title: "Discutir um finding de pentest com o time e negociar prazo", simulation: true }
      - id: M20
        title: Custos e FinOps
        objective: Falar de custo com números, justificar gasto e apresentar economia.
        competencies: [SPK, VOC]
        prerequisites: [M14]
        completion: Padrão.
        evaluation: Rubrica da apresentação do plano de redução de custo.
        lessons:
          - { id: M20-01, title: "Vocabulário: cost driver, right-sizing, reserved/savings plan, spot, egress" }
          - { id: M20-02, title: "Falando de números: percentuais, ordens de grandeza, roughly a third" }
          - { id: M20-03, title: "Justificando gasto e apresentando economia: this pays for itself in…" }
          - { id: M20-04, title: "Trade-off custo × risco × esforço: we could save X, but…" }
          - { id: M20-05, title: "Apresentar plano de redução de custo para gestor não técnico", simulation: true }
  - id: 4
    name: Influence
    subtitle: Influenciar e decidir
    focus: Defender decisões, riscos e trade-offs, discordar, apresentar, RFCs, colaboração multicultural.
    exitCriteria: RFC escrita ≥ 4/5 + apresentação gravada 5 min ≥ 3,5/5 + debate simulado ≥ 3/5.
    modules:
      - id: M21
        title: Defendendo decisões técnicas
        objective: Argumentar uma decisão com estrutura, lidar com pushback e admitir limites.
        competencies: [SPK, WRI, CNF]
        prerequisites: [M10, M14]
        completion: Padrão.
        evaluation: Rubrica do design review simulado.
        lessons:
          - { id: M21-01, title: "Estrutura: context → options → decision → rationale → consequences" }
          - { id: M21-02, title: "ADRs: escrever e discutir; we chose X over Y because…" }
          - { id: M21-03, title: "Pushback: that's a fair concern, however…; let me address that" }
          - { id: M21-04, title: "Limites: we don't know yet; I'd want to validate that before committing" }
          - { id: M21-05, title: "Defender decisão em design review com 2 revisores céticos", simulation: true }
      - id: M22
        title: Riscos e trade-offs
        objective: Apresentar riscos, trade-offs e mitigações de forma que ajude a decidir.
        competencies: [SPK, WRI]
        prerequisites: [M21]
        completion: Padrão.
        evaluation: Rubrica da análise de risco escrita.
        lessons:
          - { id: M22-01, title: "Linguagem de risco: likelihood, impact, there's a chance that, worst case" }
          - { id: M22-02, title: "Trade-offs: we're trading X for Y; the downside is…; on balance…" }
          - { id: M22-03, title: "Mitigações e planos B: to reduce that risk…; if that happens, we…" }
          - { id: M22-04, title: "Para decisão: recomendação clara + alternativas + o que você precisa" }
          - { id: M22-05, title: "Prática: análise de risco escrita de uma migração de banco" }
      - id: M23
        title: Discordando profissionalmente
        objective: Discordar com o nível certo de diretude e buscar consenso.
        competencies: [SPK, CNF, LIS]
        prerequisites: [M08, M21]
        completion: Padrão.
        evaluation: Rubrica do debate simulado.
        lessons:
          - { id: M23-01, title: "Escala de discordância: suave → direto; quando usar cada grau" }
          - { id: M23-02, title: "Fórmulas: I see it differently; I'd push back on…; I'm not convinced that…" }
          - { id: M23-03, title: "Diferenças culturais: EUA, Reino Unido, Índia, Alemanha, Holanda × Brasil" }
          - { id: M23-04, title: "Consenso: can we agree that…; what would it take to…; let's park that" }
          - { id: M23-05, title: "Debate técnico com colega insistente", simulation: true }
      - id: M24
        title: Apresentações e demos
        objective: Apresentar 5–10 min com estrutura, descrever slides e diagramas, fazer demo e lidar com Q&A.
        competencies: [SPK, PRO, CNF]
        prerequisites: [M05, M18]
        completion: Padrão.
        evaluation: Rubrica da apresentação gravada.
        lessons:
          - { id: M24-01, title: "Estrutura e signposting: I'll start with…; moving on to…; to wrap up…" }
          - { id: M24-02, title: "Descrevendo diagramas e slides ao vivo; ritmo e pausas" }
          - { id: M24-03, title: "Demos: narrar enquanto executa; falhas ao vivo sem pânico" }
          - { id: M24-04, title: "Q&A: ganhar tempo, reformular, não saber a resposta com elegância" }
          - { id: M24-05, title: "Apresentar 5 min sobre projeto seu (gravado)", simulation: true }
      - id: M25
        title: RFCs e design reviews
        objective: Ler, escrever e revisar propostas técnicas.
        competencies: [WRI, REA]
        prerequisites: [M21, M22]
        completion: RFC ≥ 4/5 + 5 comentários de review ≥ 3,5/5.
        evaluation: Rubrica da RFC e dos comentários.
        lessons:
          - { id: M25-01, title: "Lendo RFCs: estrutura, non-goals, alternatives considered, open questions" }
          - { id: M25-02, title: "Escrevendo uma proposta técnica (1–2 páginas)" }
          - { id: M25-03, title: "Comentando propostas: esclarecimento × objeção × sugestão" }
          - { id: M25-04, title: "Convergindo: resolver comentários, registrar decisão" }
          - { id: M25-05, title: "Prática: escrever RFC curta + revisar RFC de colega" }
      - id: M26
        title: Colaboração multicultural e small talk
        objective: Abrir e fechar reuniões com naturalidade, entender idioms reais, reconhecer humor e sarcasmo.
        competencies: [SPK, LIS, CNF]
        prerequisites: [M08]
        completion: Padrão.
        evaluation: Nota de módulo.
        lessons:
          - { id: M26-01, title: "Small talk profissional: início de reunião, sexta-feira, feriados, how's it going?" }
          - { id: M26-02, title: "Cultura assíncrona e fusos: circle back, take it offline, let's sync" }
          - { id: M26-03, title: "Idioms e phrasal verbs que aparecem de verdade: low-hanging fruit, bandwidth, loop in" }
          - { id: M26-04, title: "Humor, ironia e sarcasmo: reconhecer, reagir, e quando não tentar" }
  - id: 5
    name: Career
    subtitle: Carreira internacional
    focus: Pitch, recrutadores, entrevistas comportamentais e técnicas, ofertas, onboarding.
    exitCriteria: Entrevista simulada completa ≥ 4/5.
    modules:
      - id: M27
        title: Apresentação profissional e histórias de experiência
        objective: Contar sua trajetória em 30 s, 2 min e em formato STAR, com impacto quantificado.
        competencies: [SPK, CNF]
        prerequisites: [M10, M24]
        completion: Padrão.
        evaluation: Rubrica das 5 histórias STAR gravadas.
        lessons:
          - { id: M27-01, title: "Elevator pitch: 30 s, 60 s, 2 min" }
          - { id: M27-02, title: "Cargos e responsabilidades: I was responsible for, I led, I owned" }
          - { id: M27-03, title: "Quantificando impacto: reduced deploy time from 40 min to 6" }
          - { id: M27-04, title: "STAR para histórias técnicas: incidente, migração, custo, conflito" }
          - { id: M27-05, title: "Prática: 5 histórias STAR do seu histórico real" }
      - id: M28
        title: Conversas com recrutadores
        objective: Conduzir um screening call e falar de expectativas com naturalidade.
        competencies: [SPK, LIS]
        prerequisites: [M27]
        completion: Padrão.
        evaluation: Rubrica do screening simulado.
        lessons:
          - { id: M28-01, title: "Screening call: roteiro típico, perguntas frequentes" }
          - { id: M28-02, title: "Expectativas: salário, remoto, disponibilidade, visto, notice period" }
          - { id: M28-03, title: "Perguntas para fazer ao recrutador" }
          - { id: M28-04, title: "Screening call completo (20 min)", simulation: true }
      - id: M29
        title: Entrevistas comportamentais
        objective: Responder perguntas comportamentais com estrutura, sinais de senioridade e sem decorar.
        competencies: [SPK, CNF]
        prerequisites: [M27]
        completion: Padrão.
        evaluation: Rubrica da entrevista simulada.
        lessons:
          - { id: M29-01, title: "Perguntas clássicas: conflict, failure, ownership, ambiguity" }
          - { id: M29-02, title: "Respostas estruturadas sem decorar: esqueleto + detalhes reais" }
          - { id: M29-03, title: "Pontos fracos, gaps, mudanças de emprego, demissões" }
          - { id: M29-04, title: "Sinais de senioridade na fala: trade-offs, in hindsight" }
          - { id: M29-05, title: "Entrevista comportamental 30 min", simulation: true }
      - id: M30
        title: Entrevistas técnicas e system design
        objective: Pensar em voz alta, esclarecer requisitos e narrar design e troubleshooting em formato de entrevista.
        competencies: [SPK, LIS, CNF]
        prerequisites: [M05, M12, M18, M21]
        completion: Padrão.
        evaluation: Rubrica da entrevista técnica simulada.
        lessons:
          - { id: M30-01, title: "Pensar em voz alta: let me think; my first instinct is…; let me clarify…" }
          - { id: M30-02, title: "Esclarecendo requisitos antes de responder: escala, restrições" }
          - { id: M30-03, title: "System design narrado: componentes, trade-offs, escala" }
          - { id: M30-04, title: "Troubleshooting scenarios (SRE): the site is slow — walk me through" }
          - { id: M30-05, title: "Perguntas de DevOps/Cloud em formato entrevista: IaC, CI/CD, K8s, IAM" }
          - { id: M30-06, title: "Entrevista técnica 45 min (design + troubleshooting)", simulation: true }
      - id: M31
        title: Ofertas e negociação
        objective: Entender uma oferta e negociar com educação.
        competencies: [SPK, REA, WRI]
        prerequisites: [M28]
        completion: Padrão.
        evaluation: Rubrica da negociação simulada.
        lessons:
          - { id: M31-01, title: "Componentes de oferta: base, bonus, equity, benefits, PTO, sign-on" }
          - { id: M31-02, title: "Negociando: I was hoping for…; is there flexibility on…" }
          - { id: M31-03, title: "Aceitar, pedir tempo e recusar por escrito" }
          - { id: M31-04, title: "Negociação de oferta", simulation: true }
      - id: M32
        title: Onboarding em empresa internacional
        objective: Atravessar as primeiras semanas com iniciativa e sem medo de perguntar.
        competencies: [SPK, WRI, CNF]
        prerequisites: [M26]
        completion: Padrão.
        evaluation: Rubrica dos cenários de primeira semana.
        lessons:
          - { id: M32-01, title: "Primeiras semanas: se apresentar, mensagem de intro, perguntas sem medo" }
          - { id: M32-02, title: "Construindo relação: 1:1s de conhecimento, coffee chat" }
          - { id: M32-03, title: "Pedindo contexto e documentação: is there a doc for…; who owns…" }
          - { id: M32-04, title: "Primeira semana (3 cenários curtos)", simulation: true }
```

Count check: level 1 = 30, level 2 = 40, level 3 = 30, level 4 = 29, level 5 = 28 → 157 lessons, 32 modules. The test in Step 1 enforces this.

- [ ] **Step 8: Create `content/modules/M01/lessons/M01-02.yaml` (full lesson, transposed from `docs/planejamento/03-exemplo-aula-M01-02.md`)**

```yaml
id: M01-02
module: M01
order: 2
title: Reportando progresso, atraso e bloqueio no daily
objective: >-
  Ao final, você consegue dar um update de 30–45 segundos que diga o que fez, o que vai fazer e onde está
  travado, usando past simple e present perfect nos lugares certos, sinalizando atraso cedo e sem soar evasivo
  ("almost done, almost") nem alarmista ("everything is broken").
durationMin: 40
competencies: [SPK, VOC, LIS]
tags: [topic.daily, gram.present-perfect, gram.since-for, gram.by-until, gram.still-yet-already, vocab.standup, br.since-present, br.doubt, br.until-by, br.giving-error, comp.speaking]
prerequisites: [M01-01]

context:
  scenario: |
    Você é SRE num time distribuído (Brasil, Portugal, EUA). Daily às 10h BRT, 15 minutos, 7 pessoas, câmera ligada.

    Ontem você começou a migrar o pipeline de deploy do serviço `payments-api` do Jenkins para GitHub Actions. Build e lint já funcionam. O job de testes de integração falha por timeout ao subir o container de Postgres no runner. Você já aumentou o timeout para 10 minutos e não resolveu. O prazo combinado com o time era hoje. Você também está esperando a Ana revisar um PR de Terraform desde ontem.

    Você precisa dizer tudo isso em menos de um minuto, deixar claro que não está parado, avisar que pode atrasar e pedir ajuda sem transformar o daily em sessão de debugging.
  roles: [Priya (scrum master), Ana (SRE), Marcos (platform engineer)]

vocabulary:
  - term: I've been working on X
    meaning: atividade que começou antes e continua
    example: I've been working on the payments-api pipeline migration.
    translation: Estou trabalhando na migração do pipeline (desde antes, e continuo).
    note: Nunca "I'm working on X since yesterday".
  - term: I got X done / I finished X
    meaning: tarefa concluída
    example: I got the build and lint stages done.
    translation: Terminei as etapas de build e lint.
    note: '"got done" é neutro e muito comum em standup.'
  - term: I'm still on X
    meaning: continua na mesma tarefa; neutro, não é desculpa
    example: I'm still on the integration tests.
    translation: Ainda estou nos testes de integração.
  - term: I'm blocked on X
    meaning: algo impede você de avançar
    example: I'm blocked on the Postgres container timing out.
    translation: Estou travado no container do Postgres dando timeout.
    note: '"blocked by" também existe, mas "blocked on" é mais usual para o problema em si.'
  - term: I'm waiting on X (from Y)
    meaning: dependência de alguém
    example: I'm waiting on a review from Ana.
    translation: Estou esperando a revisão da Ana.
    note: '"waiting for" também é correto. Sem preposição é erro.'
  - term: It's taking longer than expected
    meaning: atraso sem drama
    example: The integration tests are taking longer than expected.
    translation: Os testes de integração estão demorando mais que o esperado.
    note: Registro neutro, funciona em qualquer time.
  - term: I should have it done by EOD
    meaning: previsão em que você confia
    example: I should have it done by EOD.
    translation: Devo terminar até o fim do dia.
    note: '"should" = confiança razoável.'
  - term: I'm aiming to have it done by…
    meaning: meta com risco
    example: I'm aiming to have it done by tomorrow.
    translation: Minha meta é terminar até amanhã.
    note: '"aiming" avisa que pode não dar.'
  - term: This might slip (to tomorrow)
    meaning: avisar que o prazo pode escorregar
    example: "Heads up: this might slip to tomorrow."
    translation: Aviso: isso pode escorregar para amanhã.
    note: '"slip" é o verbo padrão para prazo que atrasa.'
  - term: I'll need another day on this
    meaning: pedir mais tempo
    example: Realistically, I'll need another day on this.
    translation: Sendo realista, vou precisar de mais um dia nisso.
    note: '"Realistically" suaviza e mostra maturidade.'
  - term: "Heads up:"
    meaning: aviso antecipado
    example: "Heads up: the deploy window may move."
    translation: Aviso: a janela de deploy pode mudar.
    note: Informal-neutro; ótimo para Slack e voz.
    register: informal
  - term: It turned out (that)…
    meaning: descoberta depois de investigar
    example: It turned out the runner doesn't have enough memory.
    translation: Descobri que o runner não tem memória suficiente.
    note: Substitui "I discovered that", que soa formal demais.
  - term: I've tried X, but it didn't help
    meaning: mostrar o que já tentou
    example: I've tried bumping the timeout, but it didn't help.
    translation: Já tentei aumentar o timeout, mas não ajudou.
    note: '"bump" = aumentar (informal, comum em infra).'
  - term: Can someone pair with me on this after the call?
    meaning: pedir ajuda sem travar o daily
    example: Can someone pair with me on this after the call?
    translation: Alguém pode fazer pair comigo nisso depois da call?
    note: '"after the call" mantém o daily curto.'
  - term: No blockers / Nothing blocking me
    meaning: fechar o update
    example: No blockers on my side.
    translation: Sem bloqueios do meu lado.
    note: Diga sempre, mesmo quando não há bloqueio.
  - term: "Quick one: / One more thing:"
    meaning: introduzir item extra
    example: "Quick one: is anyone touching the RDS module this week?"
    translation: Uma rápida: alguém mexendo no módulo do RDS esta semana?

grammar:
  title: Past simple × present perfect × present perfect continuous no standup
  explanation: |
    | Forma | Uso no standup | Exemplo |
    |---|---|---|
    | Past simple | ação fechada num momento definido ("yesterday") | Yesterday I **fixed** the build stage. |
    | Present perfect | resultado que importa **agora**, sem marcar quando | I**'ve fixed** the build stage. (está pronto, pode usar) |
    | Present perfect continuous | atividade em andamento, começou antes e continua | I**'ve been working** on the migration since Monday. |

    **Regra prática:** *yesterday* → past simple · estado atual → present perfect (simple ou continuous) · *today* → going to / will / aiming to.

    **since / for exigem present perfect.** Em português "estou trabalhando nisso desde ontem" usa presente. Em inglês: *I've been working on this since yesterday* / *for two days*. "I'm working on this since yesterday" é o erro mais frequente de brasileiros no daily.

    **still / yet / already**

    | Palavra | Posição | Frase | Sentido |
    |---|---|---|---|
    | still | antes do verbo principal, afirmativa | I'm **still** waiting on the review. | continua |
    | yet | fim da frase, negativa ou pergunta | It hasn't been merged **yet**. / Is it merged **yet**? | ainda não |
    | already | antes do verbo principal, afirmativa | It's **already** merged. | já |

    **by × until**

    - **by** = prazo (até, no máximo): *I'll have it done **by** Friday.*
    - **until** = duração (até, durante): *I'll be working on it **until** Friday.*
    - "I will finish until Friday" está errado e soa estranho para nativos.
  examples:
    - { en: "Yesterday I fixed the build stage.", pt: "Ontem consertei a etapa de build." }
    - { en: "I've fixed the build stage.", pt: "Consertei a etapa de build (está pronta agora)." }
    - { en: "I've been working on the migration since Monday.", pt: "Estou trabalhando na migração desde segunda." }
    - { en: "It hasn't been merged yet.", pt: "Ainda não foi mergeado." }
    - { en: "I'll have it done by Friday.", pt: "Vou ter isso pronto até sexta." }

examples:
  - en: Yesterday I got the build and lint stages working. Today I'm on the integration tests.
    pt: Ontem fiz build e lint funcionarem. Hoje estou nos testes de integração.
    context: Update normal, sem problema.
  - en: I'm still on the pipeline migration. The integration job keeps timing out when it spins up Postgres.
    pt: Ainda estou na migração. O job de integração fica dando timeout ao subir o Postgres.
    context: Atraso com causa clara. "keeps + -ing" = acontece repetidamente.
  - en: I've tried bumping the timeout to ten minutes, but it didn't help, so I'm going to look at the runner's resources next.
    pt: Tentei aumentar o timeout para dez minutos, mas não ajudou, então vou olhar os recursos do runner.
    context: Mostra que você não está parado e tem próximo passo.
  - en: "Heads up: this might slip to tomorrow. I'll know more by lunchtime."
    pt: "Aviso: pode escorregar para amanhã. Saberei mais até o almoço."
    context: Gerenciar expectativa cedo, com data para nova informação.
  - en: I'm blocked on access to the staging cluster. I've asked in #platform-support but haven't heard back yet.
    pt: Estou bloqueado no acesso ao cluster de staging. Pedi no canal, mas ainda não responderam.
    context: Bloqueio por terceiros, já com ação tomada.
  - en: "No blockers on my side. Quick one: is anyone touching the Terraform for the RDS module this week? I'd rather not step on toes."
    pt: "Sem bloqueios. Uma rápida: alguém mexendo no Terraform do RDS esta semana? Prefiro não atropelar ninguém."
    context: Fechar update e coordenar. "step on toes" = pisar no trabalho de alguém.
  - en: Realistically, I'll need another day on this.
    pt: Sendo realista, vou precisar de mais um dia.
    context: Pedir tempo com maturidade.

variations:
  - idea: '"está atrasado"'
    items:
      - { register: Neutro, text: "It's taking longer than I expected.", adequate: true }
      - { register: Direto, text: "I won't have this done today.", adequate: true }
      - { register: Com plano, text: "This is going to slip a day; I'll have it done by tomorrow EOD.", adequate: true, note: A melhor opção. }
      - { register: Informal (time próximo), text: "Still fighting the integration tests.", adequate: true, note: Com colegas. }
      - { register: Inadequada, text: "Sorry, sorry, I'm so slow, I couldn't do it…", adequate: false, note: Autodepreciação sem informação. }
      - { register: Inadequada, text: "It's not my fault, the runner is bad.", adequate: false, note: Culpa sem dado, sem próximo passo. }
      - { register: Inadequada, text: "It's almost done, almost.", adequate: false, note: Evasivo; ninguém sabe o que significa. }
  - idea: '"estou bloqueado"'
    items:
      - { register: Formal (e-mail ao gestor), text: "I'm currently unable to proceed due to a pending access request.", adequate: true }
      - { register: Neutro (daily), text: "I'm blocked on access to staging.", adequate: true }
      - { register: Informal (Slack com colega), text: "Still no staging access 😅 any idea who can unblock me?", adequate: true }

brErrors:
  - { wrong: "I'm working on this since yesterday.", right: "I've been working on this since yesterday.", why: "since/for pedem present perfect", tag: br.since-present }
  - { wrong: "I didn't finish yet.", right: "I haven't finished yet.", why: '"yet" pede present perfect', tag: gram.still-yet-already }
  - { wrong: "I have a doubt about the runner.", right: "I have a question about the runner. / I'm not sure about…", why: '"doubt" = desconfiança, não dúvida', tag: br.doubt }
  - { wrong: "I will finish it until Friday.", right: "I'll have it done by Friday.", why: "until = duração; by = prazo", tag: br.until-by }
  - { wrong: "Actually I finished it. (querendo dizer \"atualmente\")", right: "I've finished it now. / It's done now.", why: "actually = na verdade", tag: br.actually }
  - { wrong: "I'm waiting the review.", right: "I'm waiting on/for the review.", why: "o verbo exige preposição", tag: br.waiting-no-prep }
  - { wrong: "It's giving error.", right: "It's throwing an error. / It's failing with a timeout. / It's timing out.", why: 'calque de "está dando erro"', tag: br.giving-error }
  - { wrong: "I pretend to finish today.", right: "I intend to / I plan to finish today.", why: "pretend = fingir", tag: br.pretend }
  - { wrong: "I'm doing the deploy today. (plano)", right: "I'm going to deploy today. / I'll deploy today.", why: 'presente contínuo soa como "agora"; ok se está agendado', tag: gram.future-plans }
  - { wrong: "Can you explain me the runner setup?", right: "Can you explain the runner setup to me? / Can you walk me through the runner setup?", why: "explain não aceita objeto indireto direto", tag: br.explain-me }
  - { wrong: "I stayed until late to fix it.", right: "I stayed late to fix it.", why: '"until late" não existe', tag: br.until-late }

dialogue:
  title: Standup, 10:00 BRT. Sete pessoas; trecho com quatro.
  lines:
    - { speaker: Priya, text: "Morning everyone. Let's go around. Yuri, you're up." }
    - { speaker: Yuri, text: "Morning. Yesterday I got the build and lint stages of the payments-api pipeline working on GitHub Actions. I'm still on the integration tests — the job keeps timing out when it spins up the Postgres service container. I've tried bumping the timeout, but it didn't help, so today I'm going to check the runner's memory and try a smaller Postgres image. Heads up: this might slip to tomorrow. And I'm waiting on a review from Ana on the Terraform PR." }
    - { speaker: Ana, text: "Sorry, I'll get to it right after this." }
    - { speaker: Yuri, text: "No worries, thanks." }
    - { speaker: Priya, text: "Do you need a hand with the runner thing?" }
    - { speaker: Yuri, text: "Actually, yeah. Marcos, could you pair with me for twenty minutes after the call? You set up the runners, right?", note: 'Uso correto de "actually" (= na verdade, sim).' }
    - { speaker: Marcos, text: "Sure, ping me." }
    - { speaker: Priya, text: "Great. Next — Ana?" }
  notes:
    - '"You're up" = é a sua vez. "Do you need a hand?" = precisa de ajuda?'
    - '"Actually, yeah" aqui é o uso correto de actually (= na verdade, sim), diferente do erro "actually = atualmente".'
    - '"Ping me" = me chama (no Slack). "No worries" = sem problema; resposta padrão para um pedido de desculpa pequeno.'
    - "O update de Yuri tem 75 palavras e ~35 segundos. Cobre: feito / em andamento / tentativa / próximo passo / risco de prazo / dependência."

listening:
  lines:
    - { speaker: Ana, text: "Yesterday I finished the RDS module refactor and opened the PR. Today I'm picking up the alerting rules for the new cluster. No blockers, but I'll be out from 2 pm my time for a dentist appointment." }
    - { speaker: Marcos, text: "Still on the runner autoscaling. It turned out the scale-down policy was too aggressive, so we were killing runners mid-job. I've got a fix in review. Nothing blocking me, but I could use a second pair of eyes on the PR." }
    - { speaker: Priya, text: "Quick one from me: the release is moving to Thursday because of the pipeline migration. I'll update the ticket. Anything else for the parking lot?" }
  questions:
    - { id: M01-02-l1, type: multiple_choice, prompt: "Who is blocked?", options: ["Ana", "Marcos", "Nobody", "Priya"], answer: 2, explanation: "Ana diz \"No blockers\", Marcos diz \"Nothing blocking me\", Priya não fala de bloqueio.", tags: [comp.listening] }
    - { id: M01-02-l2, type: multiple_choice, prompt: "What caused Marcos's problem?", options: ["a timeout", "an aggressive scale-down policy", "low memory", "a flaky test"], answer: 1, explanation: '"It turned out the scale-down policy was too aggressive."', tags: [comp.listening, vocab.ci] }
    - { id: M01-02-l3, type: fill_blank, prompt: "The release is now on ___.", accepted: ["Thursday"], explanation: '"the release is moving to Thursday"', tags: [comp.listening] }
    - { id: M01-02-l4, type: multiple_choice, prompt: "What is Ana picking up today?", options: ["the RDS refactor", "alerting rules", "the runner autoscaling", "the release"], answer: 1, explanation: '"Today I'm picking up the alerting rules for the new cluster."', tags: [comp.listening] }
    - { id: M01-02-l5, type: multiple_choice, prompt: '"I could use a second pair of eyes" means…', options: ["I need two monitors", "I'd like someone to review it", "I'm tired", "I need glasses"], answer: 1, explanation: "Expressão idiomática: quero que alguém revise.", tags: [vocab.standup] }
    - { id: M01-02-l6, type: multiple_choice, prompt: '"I'll be out from 2 pm my time" — why "my time"?', options: ["she's the boss", "the team is in different time zones", "it's a typo", "she works part-time"], answer: 1, explanation: 'Em times distribuídos, horário sempre vem com referência de fuso ("my time", "UTC", "BRT").', tags: [topic.async] }

writing:
  prompt: |
    **Cenário:** Ontem você investigou alertas falsos de CPU no cluster de produção. Descobriu que o threshold estava em 60% em vez de 85%. Corrigiu via Terraform, mas o PR ainda não foi revisado. Hoje pretende validar em staging. Está dependendo de alguém do time de rede liberar uma regra de firewall pedida há dois dias.

    **Tarefa:** escreva seu update de standup (60–90 palavras) para ser lido em voz alta.
  constraints:
    - { label: "1 present perfect", pattern: "\\b(I've|I have|it's been|it has been|has been|hasn't been|haven't|hasn't|we've|we have)\\b" }
    - { label: '"it turned out"', pattern: "\\bit turned out\\b" }
    - { label: '"waiting on"', pattern: "\\bwaiting (on|for)\\b" }
    - { label: '1 previsão com "by"', pattern: "\\bby (tomorrow|today|eod|end of|noon|lunch|friday|monday|tuesday|wednesday|thursday|the end|\\d)" }
  rubric:
    - Estrutura yesterday / today / blockers
    - Tempos verbais
    - Preposições e conectores
    - Naturalidade e registro
    - Concisão
  model: >-
    Yesterday I looked into the false CPU alerts on the prod cluster. It turned out the threshold was set to 60%
    instead of 85%. I've fixed it in Terraform and the PR is up, but it hasn't been reviewed yet. Today I'm going
    to validate the change in staging. One blocker: I'm still waiting on the network team to open the firewall
    rule I requested on Monday — I'll chase it again after this. I should have everything merged by tomorrow EOD.
  minWords: 60
  maxWords: 90
  tags: [comp.writing, topic.daily, gram.present-perfect]

speaking:
  modeA:
    prompt: Grave-se dando seu update de standup real de hoje em até 45 segundos. Use pelo menos 4 das expressões da aula.
    maxSeconds: 45
    targetPhrases:
      - I've been working on
      - I got it done
      - I finished
      - I'm still on
      - I'm blocked on
      - I'm waiting on
      - I'm waiting for
      - taking longer than expected
      - I should have it done by
      - I'm aiming to
      - might slip
      - I'll need another day
      - heads up
      - it turned out
      - I've tried
      - pair with me
      - no blockers
      - nothing blocking me
      - quick one
    checklist:
      - Usei past simple para ontem?
      - Usei present perfect para o estado atual?
      - Disse o que já tentei?
      - Dei previsão com "by"?
      - Fechei com "no blockers" ou um pedido claro?
  modeB:
    persona: Priya, scrum master, direta e simpática. Conduz o daily e faz follow-ups curtos.
    goals:
      - Dar o update completo (feito / em andamento / bloqueio) em menos de 45 segundos
      - Responder aos follow-ups sem se perder
      - Fechar com "no blockers" ou um pedido de ajuda específico
    followUps:
      - What have you tried so far?
      - When do you think it'll be ready?
      - Do you need someone to chase the network team?
    rubric:
      - Clareza
      - Tempos verbais
      - Naturalidade
      - Concisão

quiz:
  - { id: M01-02-q1, type: fill_blank, prompt: "I ___ (work) on this since Monday.", accepted: ["have been working", "'ve been working"], explanation: "since marca o ponto de início de algo que continua; isso é present perfect continuous. \"I'm working since\" é o calque mais comum do português.", tags: [gram.since-for, br.since-present] }
  - { id: M01-02-q2, type: multiple_choice, prompt: "I'll finish it ___ Friday.", options: ["by", "until"], answer: 0, explanation: "by = prazo final. until diria que você vai ficar terminando durante toda a semana até sexta.", tags: [gram.by-until, br.until-by] }
  - { id: M01-02-q3, type: error_correction, prompt: "I didn't finish yet.", accepted: ["I haven't finished yet.", "I haven't finished it yet.", "I haven't finished yet"], explanation: "yet aparece com present perfect em negativas e perguntas. \"didn't… yet\" é compreensível, mas marca não-nativo.", tags: [gram.still-yet-already, gram.present-perfect] }
  - { id: M01-02-q4, type: multiple_choice, prompt: "Which one sounds evasive?", options: ["It's taking longer than expected; I'll need another day.", "It's almost done, almost."], answer: 1, explanation: "\"Almost done, almost\" não dá informação: quanto falta, o que trava, quando fica pronto. A alternativa (a) diz o problema e o novo prazo.", tags: [topic.daily, vocab.standup] }
  - { id: M01-02-q5, type: fill_blank, prompt: "I'm waiting ___ Ana's review.", accepted: ["on", "for"], explanation: "wait pede preposição. wait on e wait for são intercambiáveis aqui; \"waiting the review\" está errado.", tags: [br.waiting-no-prep] }
  - { id: M01-02-q6, type: error_correction, prompt: "I have a doubt about the runner.", accepted: ["I have a question about the runner.", "I have a question about the runner", "I'm not sure about the runner.", "I'm not sure about the runner"], explanation: "doubt é desconfiança (\"I doubt it will work\"). Dúvida no sentido de pergunta é question.", tags: [br.doubt] }
  - { id: M01-02-q7, type: translate, prompt: "Está dando erro de timeout.", accepted: ["It's timing out.", "It's timing out", "It's failing with a timeout.", "It's failing with a timeout", "It is timing out.", "It's throwing a timeout error.", "It's throwing a timeout error"], explanation: "\"Giving error\" é tradução literal. Em inglês, erros são thrown, raised, ou o sistema fails with, times out, crashes.", tags: [br.giving-error, vocab.errors] }
  - { id: M01-02-q8, type: reorder, prompt: "Coloque na ordem certa.", tokens: ["on", "blocked", "staging", "to", "access", "I'm"], answer: "I'm blocked on access to staging", explanation: "Ordem fixa: sujeito + blocked on + o que bloqueia. \"Access to staging\" é a unidade.", tags: [vocab.standup] }

review:
  count: 5
  preferTags: [gram.question-forms, br.doubt, gram.present-perfect]

srsCards:
  - { front: "estou trabalhando nisso desde ontem", back: "I've been working on this since yesterday", tag: br.since-present }
  - { front: "ainda não terminei", back: "I haven't finished yet", tag: gram.still-yet-already }
  - { front: "estou travado em X", back: "I'm blocked on X", tag: vocab.standup }
  - { front: "estou esperando a revisão da Ana", back: "I'm waiting on a review from Ana", tag: br.waiting-no-prep }
  - { front: "está demorando mais que o esperado", back: "It's taking longer than expected", tag: vocab.standup }
  - { front: "devo terminar até o fim do dia", back: "I should have it done by EOD", tag: gram.by-until }
  - { front: "isso pode atrasar para amanhã", back: "This might slip to tomorrow", tag: vocab.standup }
  - { front: "vou precisar de mais um dia", back: "I'll need another day on this", tag: vocab.standup }
  - { front: "descobri que… (depois de investigar)", back: "It turned out (that)…", tag: vocab.standup }
  - { front: "já tentei X, mas não ajudou", back: "I've tried X, but it didn't help", tag: gram.present-perfect }
  - { front: "alguém pode fazer pair comigo depois da call?", back: "Can someone pair with me on this after the call?", tag: topic.help }
  - { front: "tenho uma dúvida (pergunta)", back: "I have a question (NÃO \"doubt\")", tag: br.doubt }

completion:
  quizMin: 0.75
  writingMin: 3
  speakingRequired: true
```

- [ ] **Step 9: Run the loader tests and the validate script**

Run: `pnpm test tests/content-loader.test.ts`
Expected: PASS (5 tests). If a YAML parse error appears, the usual cause is an unquoted value containing `: ` or starting with a quote — quote the whole scalar.

Run: `pnpm content:validate`
Expected: `ok: 5 níveis, 1 aula(s) com conteúdo, 65 tags, 1 padrões de erro` (tag count may differ by ±2 if you fixed a typo; the test file does not assert it).

Run: `pnpm content:build`
Expected: `gerado src/generated/content.json (1 aula(s) com conteúdo)`.

- [ ] **Step 10: Verify `pnpm build` now passes**

Run: `pnpm build`
Expected: content built, typecheck clean, Vite `dist/` produced.

---

### Task 4: Brazilian-error detector and the full `br-errors.yaml` catalogue

**Files:**
- Create: `shared/br-detector.ts`
- Modify: `content/br-errors.yaml` (replace the one-pattern file from Task 3 with the full catalogue)
- Test: `tests/br-detector.test.ts`

**Interfaces:**
- Produces (from `shared/br-detector.ts`):
  - `type Finding = { id: string; match: string; index: number; wrong: string; right: string; why: string; tag: string }`
  - `detectBrErrors(text: string, patterns: BrErrorPattern[]): Finding[]` — every non-overlapping regex match, ordered by `index`; one pattern can produce several findings.

- [ ] **Step 1: Write the failing detector tests**

`tests/br-detector.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { detectBrErrors } from "../shared/br-detector.ts";
import { loadContent } from "../shared/content-loader.ts";

const patterns = loadContent("content").brErrors;
const tagsOf = (text: string) => detectBrErrors(text, patterns).map((f) => f.tag);

describe("detectBrErrors", () => {
  it("flags 'I have a doubt'", () => {
    expect(tagsOf("I have a doubt about the runner.")).toContain("br.doubt");
  });
  it("flags present continuous + since", () => {
    expect(tagsOf("I'm working on this since yesterday.")).toContain("br.since-present");
    expect(tagsOf("I am working on this since Monday")).toContain("br.since-present");
  });
  it("does NOT flag the correct present perfect + since", () => {
    expect(tagsOf("I've been working on this since yesterday.")).not.toContain("br.since-present");
  });
  it("flags 'until' used as a deadline after finish/done", () => {
    expect(tagsOf("I will finish it until Friday.")).toContain("br.until-by");
    expect(tagsOf("I'll be working on it until Friday.")).not.toContain("br.until-by");
  });
  it("flags 'giving error'", () => {
    expect(tagsOf("The job is giving error again")).toContain("br.giving-error");
  });
  it("flags 'waiting the'", () => {
    expect(tagsOf("I'm waiting the review")).toContain("br.waiting-no-prep");
    expect(tagsOf("I'm waiting on the review")).not.toContain("br.waiting-no-prep");
  });
  it("flags 'explain me'", () => {
    expect(tagsOf("Can you explain me the setup?")).toContain("br.explain-me");
  });
  it("flags 'pretend to' and 'assist the meeting'", () => {
    expect(tagsOf("I pretend to finish today")).toContain("br.pretend");
    expect(tagsOf("I will assist the meeting")).toContain("br.assist");
  });
  it("returns findings ordered by index with match text", () => {
    const findings = detectBrErrors("I have a doubt. It's giving error.", patterns);
    expect(findings.map((f) => f.tag)).toEqual(["br.doubt", "br.giving-error"]);
    expect(findings[0]!.match.toLowerCase()).toContain("doubt");
    expect(findings[0]!.index).toBeLessThan(findings[1]!.index);
  });
  it("returns an empty array for clean text", () => {
    expect(detectBrErrors("I've been working on this since Monday and I'm blocked on access.", patterns)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test tests/br-detector.test.ts`
Expected: FAIL — cannot resolve `../shared/br-detector.ts`.

- [ ] **Step 3: Create `shared/br-detector.ts`**

```ts
import type { BrErrorPattern } from "./schema.ts";

export type Finding = {
  id: string;
  match: string;
  index: number;
  wrong: string;
  right: string;
  why: string;
  tag: string;
};

/** Aplica cada regex do catálogo ao texto e devolve todos os matches, ordenados por posição. */
export function detectBrErrors(text: string, patterns: BrErrorPattern[]): Finding[] {
  const findings: Finding[] = [];
  for (const p of patterns) {
    const flags = p.flags.includes("g") ? p.flags : `${p.flags}g`;
    const re = new RegExp(p.pattern, flags);
    for (const m of text.matchAll(re)) {
      findings.push({ id: p.id, match: m[0], index: m.index ?? 0, wrong: p.wrong, right: p.right, why: p.why, tag: p.tag });
    }
  }
  return findings.sort((a, b) => a.index - b.index);
}
```

- [ ] **Step 4: Replace `content/br-errors.yaml` with the full catalogue**

```yaml
# Catálogo de erros típicos de brasileiros. Regex aplicada ao texto do aluno (flags padrão: gi).
# Regras: padrões conservadores (poucos falsos positivos). Quando em dúvida, não detectar.
patterns:
  - id: doubt-question
    pattern: "\\b(i have|i've got|i got|any|some|one|a|my|another) doubts?\\b"
    wrong: "I have a doubt"
    right: "I have a question / I'm not sure about…"
    why: "doubt = desconfiança. Dúvida no sentido de pergunta é question."
    tag: br.doubt
  - id: since-present-continuous
    pattern: "\\b(i'm|i am|we're|we are|he's|she's|it's|they're|they are)\\s+\\w+ing\\b[^.!?]{0,40}\\b(since|for the last|for the past)\\b"
    wrong: "I'm working on this since yesterday"
    right: "I've been working on this since yesterday"
    why: "since/for exigem present perfect (continuous)."
    tag: br.since-present
  - id: until-as-deadline
    pattern: "\\b(finish(ed)?|done|deliver(ed)?|send|sent|ready|merge[d]?|deploy(ed)?|complete[d]?|have it)\\s+(it\\s+)?until\\b"
    wrong: "I will finish it until Friday"
    right: "I'll have it done by Friday"
    why: "until = duração; by = prazo."
    tag: br.until-by
  - id: until-late
    pattern: "\\buntil late\\b"
    wrong: "I stayed until late"
    right: "I stayed late"
    why: '"until late" não existe em inglês.'
    tag: br.until-late
  - id: giving-error
    pattern: "\\b(giving|gives|gave|is giving|it's giving)\\s+(an?\\s+)?errors?\\b"
    wrong: "It's giving error"
    right: "It's throwing an error / It's failing with… / It's timing out"
    why: 'Calque de "está dando erro".'
    tag: br.giving-error
  - id: waiting-no-preposition
    pattern: "\\bwaiting (the|a|an|my|your|his|her|their|our|him|her|them|you|me)\\b"
    wrong: "I'm waiting the review"
    right: "I'm waiting on/for the review"
    why: "wait exige preposição (on/for)."
    tag: br.waiting-no-prep
  - id: explain-me
    pattern: "\\bexplain(s|ed)? (me|us|him|her|them)\\b"
    wrong: "explain me"
    right: "explain to me / walk me through"
    why: "explain não aceita objeto indireto direto."
    tag: br.explain-me
  - id: pretend
    pattern: "\\bpretend(s|ed)? to\\b"
    wrong: "I pretend to finish today"
    right: "I intend to / I plan to finish today"
    why: "pretend = fingir."
    tag: br.pretend
  - id: assist-meeting
    pattern: "\\bassist(ed|ing)? (the|a|our|this|that) (meeting|call|daily|standup|stand-up|presentation|class|session)\\b"
    wrong: "assist the meeting"
    right: "attend the meeting"
    why: "assist = ajudar; attend = participar."
    tag: br.assist
  - id: actually-currently
    pattern: "\\bactually (i'm|i am|we're|we are|i work|we work|i live|we live)\\b"
    wrong: 'Actually I''m working on… (querendo dizer "atualmente")'
    right: "Currently / Right now / At the moment"
    why: "actually = na verdade. Atualmente = currently."
    tag: br.actually
  - id: make-a-question
    pattern: "\\bmake (a|one|some|two|three) questions?\\b"
    wrong: "make a question"
    right: "ask a question"
    why: "Perguntas são feitas com ask."
    tag: br.make-a-question
  - id: in-the-last-week
    pattern: "\\bin the last (week|month|year)\\b"
    wrong: "in the last week (= na semana passada)"
    right: "last week / over the past week"
    why: '"in the last week" soa como "nos últimos 7 dias"; "na semana passada" é last week.'
    tag: br.in-the-last-week
  - id: have-years-old
    pattern: "\\b(i|he|she|we|they) (have|has) \\d+ years\\b"
    wrong: "I have 30 years"
    right: "I'm 30 (years old)"
    why: "Idade em inglês usa be."
    tag: br.have-years
  - id: people-is
    pattern: "\\bpeople (is|was|has|doesn't|isn't|wasn't)\\b"
    wrong: "people is"
    right: "people are"
    why: "people é plural."
    tag: br.people-is
  - id: discuss-about
    pattern: "\\bdiscuss(ed|ing)? about\\b"
    wrong: "discuss about the plan"
    right: "discuss the plan"
    why: "discuss é transitivo direto."
    tag: br.discuss-about
  - id: depend-of
    pattern: "\\bdepend(s|ed|ing)? of\\b"
    wrong: "depends of"
    right: "depends on"
    why: "depend on."
    tag: br.depend-of
  - id: according-with
    pattern: "\\baccording with\\b"
    wrong: "according with the docs"
    right: "according to the docs"
    why: "according to."
    tag: br.according-with
  - id: win-money
    pattern: "\\bwin(s|ning)? (money|a salary|\\$|\\d+ (dollars|euros|reais))\\b"
    wrong: "win money"
    right: "earn money / make money"
    why: "win = ganhar em competição; salário se earn/make."
    tag: br.win-money
  - id: lose-deadline
    pattern: "\\b(lose|lost|losing) (the|a|my|our) (deadline|meeting|call|bus|flight|train)\\b"
    wrong: "lose the deadline"
    right: "miss the deadline"
    why: "Perder hora/prazo/transporte é miss."
    tag: br.lose-the-deadline
```

- [ ] **Step 5: Run the detector tests, then the full suite**

Run: `pnpm test tests/br-detector.test.ts`
Expected: PASS (10 tests). If `since-present-continuous` misses "I am working on this since Monday", check the `{0,40}` window and that `since` is preceded by a word boundary.

Run: `pnpm test`
Expected: all green (schema, content-loader, br-detector, app health).

---

### Task 5: Shared pure logic — answer scoring and speech comparison

**Files:**
- Create: `shared/scoring.ts`, `shared/speech-compare.ts`
- Test: `tests/scoring.test.ts`, `tests/speech-compare.test.ts`

**Interfaces:**
- Produces (from `shared/scoring.ts`):
  - `normalizeAnswer(s: string): string`
  - `isAccepted(answer: string, accepted: string[]): boolean`
  - `type ExerciseResponse = number | string | string[] | Record<string, string>`
  - `type CheckResult = { correct: boolean; expected: string; given: string }`
  - `checkExercise(ex: Exercise, response: ExerciseResponse): CheckResult`
- Produces (from `shared/speech-compare.ts`):
  - `expandContractions(text: string): string` (lower-cases too)
  - `tokenizeWords(text: string): string[]`
  - `matchTargetPhrases(transcript: string, targets: string[]): { used: string[]; missing: string[] }`
  - `wordsPerMinute(wordCount: number, seconds: number): number`

- [ ] **Step 1: Write the failing scoring tests**

`tests/scoring.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { normalizeAnswer, isAccepted, checkExercise } from "../shared/scoring.ts";
import type { Exercise } from "../shared/schema.ts";

describe("normalizeAnswer", () => {
  it("lowercases, trims, collapses spaces, strips trailing punctuation and curly quotes", () => {
    expect(normalizeAnswer("  I haven’t   finished yet. ")).toBe("i haven't finished yet");
    expect(normalizeAnswer('"by"')).toBe("by");
  });
});

describe("isAccepted", () => {
  it("matches any accepted variant after normalization", () => {
    expect(isAccepted("Have been working", ["have been working", "'ve been working"])).toBe(true);
    expect(isAccepted("am working", ["have been working"])).toBe(false);
  });
});

const base = { id: "T-1", prompt: "p", explanation: "e", tags: ["topic.daily"] };

describe("checkExercise", () => {
  it("multiple_choice compares the index", () => {
    const ex: Exercise = { ...base, type: "multiple_choice", options: ["by", "until"], answer: 0 };
    expect(checkExercise(ex, 0)).toEqual({ correct: true, expected: "by", given: "by" });
    expect(checkExercise(ex, 1).correct).toBe(false);
  });
  it("fill_blank / error_correction / translate use accepted[]", () => {
    const ex: Exercise = { ...base, type: "error_correction", accepted: ["I haven't finished yet."] };
    expect(checkExercise(ex, "i haven't finished yet").correct).toBe(true);
    expect(checkExercise(ex, "I didn't finish yet").correct).toBe(false);
  });
  it("reorder accepts a token array or a string", () => {
    const ex: Exercise = { ...base, type: "reorder", tokens: ["on", "blocked", "I'm"], answer: "I'm blocked on" };
    expect(checkExercise(ex, ["I'm", "blocked", "on"]).correct).toBe(true);
    expect(checkExercise(ex, "I'm blocked on").correct).toBe(true);
    expect(checkExercise(ex, ["blocked", "I'm", "on"]).correct).toBe(false);
  });
  it("match requires every pair and nothing extra", () => {
    const ex: Exercise = { ...base, type: "match", pairs: [{ left: "by", right: "prazo" }, { left: "until", right: "duração" }] };
    expect(checkExercise(ex, { by: "prazo", until: "duração" }).correct).toBe(true);
    expect(checkExercise(ex, { by: "duração", until: "prazo" }).correct).toBe(false);
    expect(checkExercise(ex, { by: "prazo" }).correct).toBe(false);
  });
  it("free_text is correct when it reaches minWords", () => {
    const ex: Exercise = { ...base, type: "free_text", minWords: 3 };
    expect(checkExercise(ex, "one two three").correct).toBe(true);
    expect(checkExercise(ex, "one two").correct).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing speech-compare tests**

`tests/speech-compare.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { expandContractions, tokenizeWords, matchTargetPhrases, wordsPerMinute } from "../shared/speech-compare.ts";

describe("expandContractions", () => {
  it("expands common contractions and lowercases", () => {
    expect(expandContractions("I've been blocked, it's fine")).toBe("i have been blocked, it is fine");
    expect(expandContractions("I’m still on it")).toBe("i am still on it");
  });
});

describe("tokenizeWords", () => {
  it("drops punctuation and keeps words", () => {
    expect(tokenizeWords("Heads up: this might slip!")).toEqual(["heads", "up", "this", "might", "slip"]);
  });
});

describe("matchTargetPhrases", () => {
  it("finds phrases regardless of contraction form", () => {
    const r = matchTargetPhrases("yesterday i have been working on the pipeline and i am blocked on access", ["I've been working on", "I'm blocked on", "heads up"]);
    expect(r.used).toEqual(["I've been working on", "I'm blocked on"]);
    expect(r.missing).toEqual(["heads up"]);
  });
  it("does not match partial words", () => {
    expect(matchTargetPhrases("we unblocked on time", ["blocked on"]).used).toEqual([]);
  });
});

describe("wordsPerMinute", () => {
  it("scales to 60 seconds and rounds", () => {
    expect(wordsPerMinute(75, 35)).toBe(129);
    expect(wordsPerMinute(10, 0)).toBe(0);
  });
});
```

- [ ] **Step 3: Run both test files to verify they fail**

Run: `pnpm test tests/scoring.test.ts tests/speech-compare.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Create `shared/scoring.ts`**

```ts
import type { Exercise } from "./schema.ts";

/** Normaliza resposta livre: minúsculas, aspas retas, espaços únicos, sem pontuação final nem aspas nas pontas. */
export function normalizeAnswer(s: string): string {
  return s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^["']+|["']+$/g, "")
    .replace(/[.!?,;:]+$/g, "")
    .trim();
}

export function isAccepted(answer: string, accepted: string[]): boolean {
  const a = normalizeAnswer(answer);
  return accepted.some((x) => normalizeAnswer(x) === a);
}

export type ExerciseResponse = number | string | string[] | Record<string, string>;
export type CheckResult = { correct: boolean; expected: string; given: string };

export function checkExercise(ex: Exercise, response: ExerciseResponse): CheckResult {
  switch (ex.type) {
    case "multiple_choice": {
      const idx = typeof response === "number" ? response : -1;
      return { correct: idx === ex.answer, expected: ex.options[ex.answer] ?? "", given: ex.options[idx] ?? String(response) };
    }
    case "fill_blank":
    case "error_correction":
    case "translate": {
      const given = typeof response === "string" ? response : "";
      return { correct: isAccepted(given, ex.accepted), expected: ex.accepted[0] ?? "", given };
    }
    case "reorder": {
      const given = Array.isArray(response) ? response.join(" ") : typeof response === "string" ? response : "";
      return { correct: normalizeAnswer(given) === normalizeAnswer(ex.answer), expected: ex.answer, given };
    }
    case "match": {
      const given = response !== null && typeof response === "object" && !Array.isArray(response) ? response : {};
      const correct = ex.pairs.every((p) => given[p.left] === p.right) && Object.keys(given).length === ex.pairs.length;
      return {
        correct,
        expected: ex.pairs.map((p) => `${p.left} → ${p.right}`).join("; "),
        given: Object.entries(given).map(([l, r]) => `${l} → ${r}`).join("; "),
      };
    }
    case "free_text": {
      const given = typeof response === "string" ? response : "";
      const words = given.trim().split(/\s+/).filter(Boolean).length;
      return { correct: words >= (ex.minWords ?? 1), expected: ex.model ?? "", given };
    }
  }
}
```

- [ ] **Step 5: Create `shared/speech-compare.ts`**

```ts
const CONTRACTIONS: Record<string, string> = {
  "i've": "i have", "i'm": "i am", "i'll": "i will", "i'd": "i would",
  "it's": "it is", "that's": "that is", "there's": "there is", "what's": "what is", "who's": "who is",
  "he's": "he is", "she's": "she is", "it'll": "it will",
  "we've": "we have", "we're": "we are", "we'll": "we will",
  "they've": "they have", "they're": "they are", "they'll": "they will",
  "you've": "you have", "you're": "you are", "you'll": "you will",
  "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
  "didn't": "did not", "don't": "do not", "doesn't": "does not",
  "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not",
  "won't": "will not", "wouldn't": "would not", "can't": "cannot", "couldn't": "could not", "shouldn't": "should not",
  "let's": "let us", "could've": "could have", "should've": "should have", "would've": "would have",
};

/** Minúsculas + contrações expandidas, para comparar transcrição (STT) com frases-alvo. */
export function expandContractions(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .toLowerCase()
    .replace(/\b[a-z]+'[a-z]+\b/g, (m) => CONTRACTIONS[m] ?? m);
}

export function tokenizeWords(text: string): string[] {
  return expandContractions(text)
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function matchTargetPhrases(transcript: string, targets: string[]): { used: string[]; missing: string[] } {
  const haystack = ` ${tokenizeWords(transcript).join(" ")} `;
  const used: string[] = [];
  const missing: string[] = [];
  for (const t of targets) {
    const needle = ` ${tokenizeWords(t).join(" ")} `;
    (haystack.includes(needle) ? used : missing).push(t);
  }
  return { used, missing };
}

export function wordsPerMinute(wordCount: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round((wordCount / seconds) * 60);
}
```

- [ ] **Step 6: Run both test files to verify they pass**

Run: `pnpm test tests/scoring.test.ts tests/speech-compare.test.ts`
Expected: PASS (12 tests).

---

### Task 6: SQLite layer — migrations and repository functions

**Files:**
- Create: `server/db.ts`, `server/repo.ts`
- Test: `tests/db.test.ts`, `tests/repo.test.ts`

**Interfaces:**
- Produces (from `server/db.ts`): `type Db = DatabaseSync`, `openDb(path: string): Db` (creates parent dir, applies migrations), `migrate(db: Db): number` (returns latest version), `nowIso(): string`, `MIGRATIONS: string[]`.
- Produces (from `server/repo.ts`):
  - `type AttemptInput = { lessonId: string; exerciseId: string; block: Block; type: ExerciseType; correct: boolean; answer?: string; score?: number; tags: string[] }`
  - `type AttemptRow = { id: number; lesson_id: string; exercise_id: string; block: string; type: string; correct: number; answer: string | null; score: number | null; tags_json: string; ts: string }`
  - `insertAttempt(db, a: AttemptInput, now: string): number`
  - `latestAttemptsByExercise(db, lessonId: string, block: Block): Map<string, AttemptRow>`
  - `type LessonProgressRow = { lesson_id: string; status: "in_progress" | "completed"; score: number | null; started_at: string; completed_at: string | null }`
  - `startLesson(db, lessonId, now): void`, `getLessonProgress(db, lessonId): LessonProgressRow | undefined`, `completeLesson(db, lessonId, score: number, now): void`, `listProgress(db): LessonProgressRow[]`
  - `insertWriting(db, w: { lessonId: string; text: string; feedback: unknown; score: number | null }, now): number`, `latestWriting(db, lessonId): WritingRow | undefined` where `WritingRow = { id: number; lesson_id: string; text: string; feedback_json: string; score: number | null; ts: string }`
  - `insertSpeaking(db, s: { lessonId: string; mode: "A" | "B"; transcript: string; metrics: unknown; score: number | null; selfConfidence: number | null }, now): number`, `countSpeaking(db, lessonId): number`
  - `insertCards(db, lessonId, cards: Array<{ front: string; back: string; hint?: string; tag: string }>, now): number` (inserted count; duplicates ignored), `countCards(db, lessonId): number`
  - `type TagStat = { tag: string; attempts: number; errors: number; errorRate: number }`, `tagStats(db, sinceIso: string): TagStat[]`

- [ ] **Step 1: Write the failing db tests**

`tests/db.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { openDb, migrate, MIGRATIONS } from "../server/db.ts";

describe("openDb", () => {
  it("creates every table and records the schema version", () => {
    const db = openDb(":memory:");
    const tables = (db.prepare("select name from sqlite_master where type='table' order by name").all() as { name: string }[]).map((r) => r.name);
    for (const t of ["attempts", "lesson_progress", "writing_submissions", "speaking_sessions", "srs_cards", "srs_reviews", "assessments", "weekly_goals", "study_sessions", "settings", "schema_version"]) {
      expect(tables).toContain(t);
    }
    const v = db.prepare("select version from schema_version").get() as { version: number };
    expect(v.version).toBe(MIGRATIONS.length - 1);
  });
  it("migrate is idempotent", () => {
    const db = openDb(":memory:");
    expect(migrate(db)).toBe(MIGRATIONS.length - 1);
    expect(migrate(db)).toBe(MIGRATIONS.length - 1);
  });
});
```

- [ ] **Step 2: Write the failing repo tests**

`tests/repo.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type Db } from "../server/db.ts";
import {
  insertAttempt, latestAttemptsByExercise, startLesson, getLessonProgress, completeLesson, listProgress,
  insertWriting, latestWriting, insertSpeaking, countSpeaking, insertCards, countCards, tagStats,
} from "../server/repo.ts";

let db: Db;
beforeEach(() => { db = openDb(":memory:"); });

const t = (n: number) => `2026-09-0${n}T10:00:00.000Z`;

describe("attempts", () => {
  it("keeps the latest attempt per exercise for a block", () => {
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: false, answer: "am working", tags: ["gram.since-for"] }, t(1));
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: true, answer: "have been working", tags: ["gram.since-for"] }, t(2));
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "M01-02-l1", block: "listening", type: "multiple_choice", correct: true, tags: ["comp.listening"] }, t(2));
    const latest = latestAttemptsByExercise(db, "M01-02", "quiz");
    expect(latest.size).toBe(1);
    expect(latest.get("M01-02-q1")?.correct).toBe(1);
  });
});

describe("lesson_progress", () => {
  it("starts once, completes with score, lists all", () => {
    startLesson(db, "M01-02", t(1));
    startLesson(db, "M01-02", t(2));
    expect(getLessonProgress(db, "M01-02")?.started_at).toBe(t(1));
    completeLesson(db, "M01-02", 0.875, t(3));
    const row = getLessonProgress(db, "M01-02")!;
    expect(row.status).toBe("completed");
    expect(row.score).toBe(0.875);
    expect(row.completed_at).toBe(t(3));
    expect(listProgress(db)).toHaveLength(1);
  });
  it("completeLesson works even if the lesson was never started", () => {
    completeLesson(db, "M01-01", 1, t(3));
    expect(getLessonProgress(db, "M01-01")?.status).toBe("completed");
  });
});

describe("writing and speaking", () => {
  it("stores submissions and returns the latest writing", () => {
    insertWriting(db, { lessonId: "M01-02", text: "first", feedback: { a: 1 }, score: null }, t(1));
    insertWriting(db, { lessonId: "M01-02", text: "second", feedback: { a: 2 }, score: 4 }, t(2));
    const w = latestWriting(db, "M01-02")!;
    expect(w.text).toBe("second");
    expect(JSON.parse(w.feedback_json)).toEqual({ a: 2 });
    expect(w.score).toBe(4);
  });
  it("counts speaking sessions per lesson", () => {
    insertSpeaking(db, { lessonId: "M01-02", mode: "A", transcript: "hi", metrics: {}, score: 3, selfConfidence: 4 }, t(1));
    expect(countSpeaking(db, "M01-02")).toBe(1);
    expect(countSpeaking(db, "M01-01")).toBe(0);
  });
});

describe("srs cards", () => {
  it("inserts cards once per (lesson, front)", () => {
    const cards = [{ front: "a", back: "A", tag: "vocab.standup" }, { front: "b", back: "B", tag: "vocab.standup" }];
    expect(insertCards(db, "M01-02", cards, t(1))).toBe(2);
    expect(insertCards(db, "M01-02", cards, t(2))).toBe(0);
    expect(countCards(db, "M01-02")).toBe(2);
  });
});

describe("tagStats", () => {
  it("aggregates attempts and errors per tag since a date", () => {
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "x1", block: "quiz", type: "fill_blank", correct: false, tags: ["gram.since-for", "br.since-present"] }, t(1));
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "x2", block: "quiz", type: "fill_blank", correct: true, tags: ["gram.since-for"] }, t(2));
    insertAttempt(db, { lessonId: "M01-02", exerciseId: "x3", block: "quiz", type: "fill_blank", correct: false, tags: ["gram.since-for"] }, t(3));
    const stats = tagStats(db, t(2));
    const since = stats.find((s) => s.tag === "gram.since-for")!;
    expect(since).toEqual({ tag: "gram.since-for", attempts: 2, errors: 1, errorRate: 0.5 });
    expect(stats.find((s) => s.tag === "br.since-present")).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test tests/db.test.ts tests/repo.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Create `server/db.ts`**

```ts
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type Db = DatabaseSync;

export function nowIso(): string {
  return new Date().toISOString();
}

// Cada posição é uma migração; a versão gravada é o índice da última aplicada.
export const MIGRATIONS: string[] = [
  `
  create table attempts (
    id integer primary key autoincrement,
    lesson_id text not null,
    exercise_id text not null,
    block text not null check (block in ('warmup','quiz','listening','writing','speaking')),
    type text not null,
    correct integer not null check (correct in (0,1)),
    answer text,
    score real,
    tags_json text not null,
    ts text not null
  );
  create index idx_attempts_lesson_block on attempts(lesson_id, block);
  create index idx_attempts_ts on attempts(ts);

  create table lesson_progress (
    lesson_id text primary key,
    status text not null check (status in ('in_progress','completed')),
    score real,
    started_at text not null,
    completed_at text
  );

  create table writing_submissions (
    id integer primary key autoincrement,
    lesson_id text not null,
    text text not null,
    feedback_json text not null,
    score real,
    ts text not null
  );
  create index idx_writing_lesson on writing_submissions(lesson_id, ts);

  create table speaking_sessions (
    id integer primary key autoincrement,
    lesson_id text not null,
    mode text not null check (mode in ('A','B')),
    transcript text not null,
    metrics_json text not null,
    score real,
    self_confidence integer,
    ts text not null
  );
  create index idx_speaking_lesson on speaking_sessions(lesson_id, ts);

  create table srs_cards (
    id integer primary key autoincrement,
    lesson_id text not null,
    front text not null,
    back text not null,
    hint text,
    tag text not null,
    ease real not null default 2.5,
    interval_days integer not null default 0,
    due text not null,
    reps integer not null default 0,
    lapses integer not null default 0,
    created_at text not null,
    unique (lesson_id, front)
  );
  create index idx_cards_due on srs_cards(due);

  create table srs_reviews (
    id integer primary key autoincrement,
    card_id integer not null references srs_cards(id),
    grade integer not null check (grade between 0 and 5),
    ts text not null
  );

  create table assessments (
    id integer primary key autoincrement,
    kind text not null check (kind in ('placement','module','level','checkpoint')),
    ref text not null,
    score_json text not null,
    ts text not null
  );

  create table weekly_goals (
    week_start text primary key,
    lessons_target integer not null,
    reviews_target integer not null,
    minutes_target integer not null
  );

  create table study_sessions (
    id integer primary key autoincrement,
    started_at text not null,
    ended_at text,
    lesson_id text
  );

  create table settings (
    key text primary key,
    value text not null
  );
  `,
];

export function migrate(db: Db): number {
  db.exec("create table if not exists schema_version (version integer not null)");
  const row = db.prepare("select version from schema_version limit 1").get() as { version: number } | undefined;
  if (!row) db.prepare("insert into schema_version (version) values (-1)").run();
  const current = row?.version ?? -1;
  for (let i = current + 1; i < MIGRATIONS.length; i++) {
    db.exec("begin");
    try {
      db.exec(MIGRATIONS[i]!);
      db.prepare("update schema_version set version = ?").run(i);
      db.exec("commit");
    } catch (err) {
      db.exec("rollback");
      throw err;
    }
  }
  return MIGRATIONS.length - 1;
}

export function openDb(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("pragma foreign_keys = on");
  if (path !== ":memory:") db.exec("pragma journal_mode = wal");
  migrate(db);
  return db;
}
```

- [ ] **Step 5: Create `server/repo.ts`**

```ts
import type { Db } from "./db.ts";
import type { Block, ExerciseType } from "../shared/schema.ts";

// ---------- attempts ----------
export type AttemptInput = {
  lessonId: string; exerciseId: string; block: Block; type: ExerciseType;
  correct: boolean; answer?: string; score?: number; tags: string[];
};
export type AttemptRow = {
  id: number; lesson_id: string; exercise_id: string; block: string; type: string;
  correct: number; answer: string | null; score: number | null; tags_json: string; ts: string;
};

export function insertAttempt(db: Db, a: AttemptInput, now: string): number {
  const r = db
    .prepare("insert into attempts (lesson_id, exercise_id, block, type, correct, answer, score, tags_json, ts) values (?,?,?,?,?,?,?,?,?)")
    .run(a.lessonId, a.exerciseId, a.block, a.type, a.correct ? 1 : 0, a.answer ?? null, a.score ?? null, JSON.stringify(a.tags), now);
  return Number(r.lastInsertRowid);
}

/** Última tentativa de cada exercício (por lesson + block). */
export function latestAttemptsByExercise(db: Db, lessonId: string, block: Block): Map<string, AttemptRow> {
  const rows = db.prepare("select * from attempts where lesson_id = ? and block = ? order by ts asc, id asc").all(lessonId, block) as AttemptRow[];
  const map = new Map<string, AttemptRow>();
  for (const r of rows) map.set(r.exercise_id, r);
  return map;
}

// ---------- lesson_progress ----------
export type LessonProgressRow = {
  lesson_id: string; status: "in_progress" | "completed"; score: number | null; started_at: string; completed_at: string | null;
};

export function startLesson(db: Db, lessonId: string, now: string): void {
  db.prepare("insert or ignore into lesson_progress (lesson_id, status, started_at) values (?, 'in_progress', ?)").run(lessonId, now);
}

export function getLessonProgress(db: Db, lessonId: string): LessonProgressRow | undefined {
  return db.prepare("select * from lesson_progress where lesson_id = ?").get(lessonId) as LessonProgressRow | undefined;
}

export function completeLesson(db: Db, lessonId: string, score: number, now: string): void {
  db.prepare(
    `insert into lesson_progress (lesson_id, status, score, started_at, completed_at) values (?, 'completed', ?, ?, ?)
     on conflict(lesson_id) do update set status = 'completed', score = excluded.score, completed_at = excluded.completed_at`,
  ).run(lessonId, score, now, now);
}

export function listProgress(db: Db): LessonProgressRow[] {
  return db.prepare("select * from lesson_progress order by started_at").all() as LessonProgressRow[];
}

// ---------- writing ----------
export type WritingRow = { id: number; lesson_id: string; text: string; feedback_json: string; score: number | null; ts: string };

export function insertWriting(db: Db, w: { lessonId: string; text: string; feedback: unknown; score: number | null }, now: string): number {
  const r = db.prepare("insert into writing_submissions (lesson_id, text, feedback_json, score, ts) values (?,?,?,?,?)").run(w.lessonId, w.text, JSON.stringify(w.feedback), w.score, now);
  return Number(r.lastInsertRowid);
}

export function latestWriting(db: Db, lessonId: string): WritingRow | undefined {
  return db.prepare("select * from writing_submissions where lesson_id = ? order by ts desc, id desc limit 1").get(lessonId) as WritingRow | undefined;
}

// ---------- speaking ----------
export function insertSpeaking(
  db: Db,
  s: { lessonId: string; mode: "A" | "B"; transcript: string; metrics: unknown; score: number | null; selfConfidence: number | null },
  now: string,
): number {
  const r = db
    .prepare("insert into speaking_sessions (lesson_id, mode, transcript, metrics_json, score, self_confidence, ts) values (?,?,?,?,?,?,?)")
    .run(s.lessonId, s.mode, s.transcript, JSON.stringify(s.metrics), s.score, s.selfConfidence, now);
  return Number(r.lastInsertRowid);
}

export function countSpeaking(db: Db, lessonId: string): number {
  return (db.prepare("select count(*) as n from speaking_sessions where lesson_id = ?").get(lessonId) as { n: number }).n;
}

// ---------- srs cards ----------
export function insertCards(db: Db, lessonId: string, cards: Array<{ front: string; back: string; hint?: string; tag: string }>, now: string): number {
  const stmt = db.prepare("insert or ignore into srs_cards (lesson_id, front, back, hint, tag, due, created_at) values (?,?,?,?,?,?,?)");
  let inserted = 0;
  for (const c of cards) inserted += Number(stmt.run(lessonId, c.front, c.back, c.hint ?? null, c.tag, now, now).changes);
  return inserted;
}

export function countCards(db: Db, lessonId: string): number {
  return (db.prepare("select count(*) as n from srs_cards where lesson_id = ?").get(lessonId) as { n: number }).n;
}

// ---------- estatísticas por tag ----------
export type TagStat = { tag: string; attempts: number; errors: number; errorRate: number };

export function tagStats(db: Db, sinceIso: string): TagStat[] {
  const rows = db
    .prepare(
      `select j.value as tag, count(*) as attempts, sum(case when a.correct = 0 then 1 else 0 end) as errors
       from attempts a, json_each(a.tags_json) j
       where a.ts >= ?
       group by j.value
       order by errors desc, attempts desc`,
    )
    .all(sinceIso) as Array<{ tag: string; attempts: number; errors: number }>;
  return rows.map((r) => ({ tag: r.tag, attempts: r.attempts, errors: r.errors, errorRate: r.attempts === 0 ? 0 : r.errors / r.attempts }));
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test tests/db.test.ts tests/repo.test.ts`
Expected: PASS (9 tests). If `json_each` errors, the SQLite bundled with Node lacks JSON1 — it does not (Node's SQLite is built with JSON1); re-check the SQL quoting.

---

### Task 7: Server services — completion, warm-up, rule-based writing feedback, speaking metrics

**Files:**
- Create: `server/completion.ts`, `server/warmup.ts`, `server/writing-feedback.ts`, `server/speaking-metrics.ts`
- Test: `tests/completion.test.ts`, `tests/warmup.test.ts`, `tests/writing-feedback.test.ts`, `tests/speaking-metrics.test.ts`

**Interfaces:**
- Consumes: repo functions (Task 6), `detectBrErrors` (Task 4), `matchTargetPhrases`/`tokenizeWords`/`wordsPerMinute` (Task 5), `allExercises` (Task 3).
- Produces:
  - `type CompletionStatus = { quizPct: number; quizMin: number; writingScore: number | null; writingMin: number; speakingCount: number; speakingRequired: boolean; cardsAdded: boolean; met: boolean; missing: string[] }`; `evaluateCompletion(db: Db, lesson: Lesson): CompletionStatus`
  - `weakTags(db: Db, now: Date): string[]`; `selectWarmup(db: Db, content: ContentBundle, lessonId: string, now?: Date, rng?: () => number): Exercise[]`
  - `type ConstraintCheck = { label: string; met: boolean | null }`; `type WritingFeedback = { mode: "rules"; wordCount: number; withinLength: boolean; minWords: number; maxWords: number; constraints: ConstraintCheck[]; findings: Finding[]; model: string; rubric: string[]; score: number | null }`; `ruleBasedFeedback(text: string, lesson: Lesson, patterns: BrErrorPattern[], selfScore?: number): WritingFeedback`
  - `type SpeakingMetrics = { wordCount: number; durationSec: number; wpm: number; used: string[]; missing: string[]; findings: Finding[]; withinTime: boolean; score: number }`; `computeSpeakingMetrics(transcript: string, durationSec: number, lesson: Lesson, patterns: BrErrorPattern[]): SpeakingMetrics`

- [ ] **Step 1: Write the failing completion tests**

`tests/completion.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type Db } from "../server/db.ts";
import { insertAttempt, insertWriting, insertSpeaking } from "../server/repo.ts";
import { evaluateCompletion } from "../server/completion.ts";
import { loadContent } from "../shared/content-loader.ts";

const lesson = loadContent("content").lessons["M01-02"]!;
let db: Db;
beforeEach(() => { db = openDb(":memory:"); });
const now = "2026-09-08T10:00:00.000Z";

function answerQuiz(correctCount: number) {
  lesson.quiz.forEach((q, i) => {
    insertAttempt(db, { lessonId: lesson.id, exerciseId: q.id, block: "quiz", type: q.type, correct: i < correctCount, tags: q.tags }, now);
  });
}

describe("evaluateCompletion", () => {
  it("lists everything missing on a fresh lesson", () => {
    const s = evaluateCompletion(db, lesson);
    expect(s.met).toBe(false);
    expect(s.quizPct).toBe(0);
    expect(s.missing).toHaveLength(3);
  });
  it("uses the latest attempt per quiz exercise", () => {
    answerQuiz(5); // 5/8 = 62.5% < 75%
    insertAttempt(db, { lessonId: lesson.id, exerciseId: lesson.quiz[5]!.id, block: "quiz", type: lesson.quiz[5]!.type, correct: true, tags: [] }, "2026-09-08T11:00:00.000Z");
    expect(evaluateCompletion(db, lesson).quizPct).toBe(0.75);
  });
  it("is met when quiz ≥ 75%, writing ≥ 3 and one speaking session exist", () => {
    answerQuiz(6);
    insertWriting(db, { lessonId: lesson.id, text: "x", feedback: {}, score: 3 }, now);
    insertSpeaking(db, { lessonId: lesson.id, mode: "A", transcript: "x", metrics: {}, score: 3, selfConfidence: null }, now);
    const s = evaluateCompletion(db, lesson);
    expect(s.met).toBe(true);
    expect(s.missing).toEqual([]);
    expect(s.cardsAdded).toBe(false);
  });
  it("reports a low writing score as missing", () => {
    answerQuiz(8);
    insertWriting(db, { lessonId: lesson.id, text: "x", feedback: {}, score: 2 }, now);
    insertSpeaking(db, { lessonId: lesson.id, mode: "A", transcript: "x", metrics: {}, score: 3, selfConfidence: null }, now);
    const s = evaluateCompletion(db, lesson);
    expect(s.met).toBe(false);
    expect(s.missing[0]).toMatch(/Escrita/);
  });
});
```

- [ ] **Step 2: Write the failing warm-up tests**

`tests/warmup.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type Db } from "../server/db.ts";
import { completeLesson, insertAttempt } from "../server/repo.ts";
import { selectWarmup, weakTags } from "../server/warmup.ts";
import { loadContent } from "../shared/content-loader.ts";
import type { ContentBundle, Lesson } from "../shared/schema.ts";

/** Clona M01-02 como M01-01 (ids de exercícios reescritos) para ter duas aulas com conteúdo. */
function twoLessonBundle(): ContentBundle {
  const bundle = loadContent("content");
  const src = bundle.lessons["M01-02"]!;
  const clone = JSON.parse(JSON.stringify(src).replaceAll("M01-02", "M01-01")) as Lesson;
  clone.order = 1;
  return { ...bundle, lessons: { ...bundle.lessons, "M01-01": clone } };
}

let db: Db;
const content = twoLessonBundle();
const now = new Date("2026-09-08T10:00:00.000Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 864e5).toISOString();
const rng = () => 0.42; // determinístico

beforeEach(() => { db = openDb(":memory:"); });

describe("weakTags", () => {
  it("flags tags with error rate > 40% over ≥ 3 attempts, or ≥ 3 errors in 7 days", () => {
    for (let i = 0; i < 5; i++) insertAttempt(db, { lessonId: "M01-01", exerciseId: `M01-01-q${i}`, block: "quiz", type: "fill_blank", correct: i > 2, tags: ["gram.since-for"] }, daysAgo(10));
    for (let i = 0; i < 3; i++) insertAttempt(db, { lessonId: "M01-01", exerciseId: `M01-01-l${i}`, block: "listening", type: "multiple_choice", correct: false, tags: ["comp.listening"] }, daysAgo(2));
    insertAttempt(db, { lessonId: "M01-01", exerciseId: "M01-01-q9", block: "quiz", type: "fill_blank", correct: false, tags: ["br.doubt"] }, daysAgo(1));
    const weak = weakTags(db, now);
    expect(weak).toContain("gram.since-for");   // 3/5 erros = 60%
    expect(weak).toContain("comp.listening");   // 3 erros em 7 dias
    expect(weak).not.toContain("br.doubt");     // 1 erro só
  });
});

describe("selectWarmup", () => {
  it("returns [] when no other lesson is completed", () => {
    expect(selectWarmup(db, content, "M01-02", now, rng)).toEqual([]);
  });
  it("prefers exercises tagged with weak tags, never from the current lesson, up to review.count", () => {
    completeLesson(db, "M01-01", 0.9, daysAgo(3));
    for (let i = 0; i < 4; i++) insertAttempt(db, { lessonId: "M01-01", exerciseId: `M01-01-q1`, block: "quiz", type: "fill_blank", correct: false, tags: ["gram.since-for"] }, daysAgo(2));
    const items = selectWarmup(db, content, "M01-02", now, rng);
    expect(items.length).toBe(5);
    expect(items.every((e) => e.id.startsWith("M01-01-"))).toBe(true);
    expect(new Set(items.map((e) => e.id)).size).toBe(5);
    const weakSet = ["gram.since-for", "gram.question-forms", "br.doubt", "gram.present-perfect"];
    expect(items.slice(0, 3).every((e) => e.tags.some((t) => weakSet.includes(t)))).toBe(true);
    expect(items.some((e) => e.tags.includes("gram.since-for"))).toBe(true);
  });
});
```

- [ ] **Step 3: Write the failing writing-feedback and speaking-metrics tests**

`tests/writing-feedback.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { ruleBasedFeedback } from "../server/writing-feedback.ts";
import { loadContent } from "../shared/content-loader.ts";

const { lessons, brErrors } = loadContent("content");
const lesson = lessons["M01-02"]!;

describe("ruleBasedFeedback", () => {
  it("passes every constraint on the model answer and finds no BR errors", () => {
    const fb = ruleBasedFeedback(lesson.writing.model, lesson, brErrors);
    expect(fb.mode).toBe("rules");
    expect(fb.withinLength).toBe(true);
    expect(fb.constraints.every((c) => c.met === true)).toBe(true);
    expect(fb.findings).toEqual([]);
    expect(fb.score).toBeNull();
  });
  it("flags length, missing constraints and BR errors", () => {
    const fb = ruleBasedFeedback("I'm working on this since yesterday and I have a doubt.", lesson, brErrors);
    expect(fb.withinLength).toBe(false);
    expect(fb.constraints.find((c) => c.label.includes("turned out"))?.met).toBe(false);
    expect(fb.findings.map((f) => f.tag)).toEqual(expect.arrayContaining(["br.since-present", "br.doubt"]));
  });
  it("stores a clamped self score", () => {
    expect(ruleBasedFeedback("x", lesson, brErrors, 9).score).toBe(5);
    expect(ruleBasedFeedback("x", lesson, brErrors, 3.5).score).toBe(3.5);
  });
});
```

`tests/speaking-metrics.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeSpeakingMetrics } from "../server/speaking-metrics.ts";
import { loadContent } from "../shared/content-loader.ts";

const { lessons, brErrors } = loadContent("content");
const lesson = lessons["M01-02"]!;
const good = "Yesterday I got the build and lint stages working. I'm still on the integration tests. I've tried bumping the timeout but it didn't help. Heads up, this might slip to tomorrow. I'm waiting on a review from Ana. No blockers otherwise.";

describe("computeSpeakingMetrics", () => {
  it("scores a good update near the top", () => {
    const m = computeSpeakingMetrics(good, 30, lesson, brErrors);
    expect(m.used.length).toBeGreaterThanOrEqual(4);
    expect(m.findings).toEqual([]);
    expect(m.withinTime).toBe(true);
    expect(m.wpm).toBeGreaterThan(80);
    expect(m.score).toBeGreaterThanOrEqual(4);
  });
  it("scores a short, error-laden update low", () => {
    const m = computeSpeakingMetrics("I have a doubt, it's giving error", 60, lesson, brErrors);
    expect(m.withinTime).toBe(false);
    expect(m.score).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 4: Run the four test files to verify they fail**

Run: `pnpm test tests/completion.test.ts tests/warmup.test.ts tests/writing-feedback.test.ts tests/speaking-metrics.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 5: Create `server/completion.ts`**

```ts
import type { Db } from "./db.ts";
import type { Lesson } from "../shared/schema.ts";
import { latestAttemptsByExercise, latestWriting, countSpeaking, countCards } from "./repo.ts";

export type CompletionStatus = {
  quizPct: number; quizMin: number;
  writingScore: number | null; writingMin: number;
  speakingCount: number; speakingRequired: boolean;
  cardsAdded: boolean;
  met: boolean; missing: string[];
};

export function evaluateCompletion(db: Db, lesson: Lesson): CompletionStatus {
  const latest = latestAttemptsByExercise(db, lesson.id, "quiz");
  const correct = lesson.quiz.filter((q) => latest.get(q.id)?.correct === 1).length;
  const quizPct = lesson.quiz.length === 0 ? 0 : correct / lesson.quiz.length;
  const writingScore = latestWriting(db, lesson.id)?.score ?? null;
  const speakingCount = countSpeaking(db, lesson.id);
  const cardsAdded = countCards(db, lesson.id) >= lesson.srsCards.length;
  const { quizMin, writingMin, speakingRequired } = lesson.completion;

  const missing: string[] = [];
  if (quizPct < quizMin) missing.push(`Quiz: ${Math.round(quizPct * 100)}% (mínimo ${Math.round(quizMin * 100)}%)`);
  if (writingScore === null) missing.push("Escrita não enviada");
  else if (writingScore < writingMin) missing.push(`Escrita: nota ${writingScore} (mínimo ${writingMin})`);
  if (speakingRequired && speakingCount === 0) missing.push("Nenhuma gravação de fala registrada");

  return { quizPct, quizMin, writingScore, writingMin, speakingCount, speakingRequired, cardsAdded, met: missing.length === 0, missing };
}
```

- [ ] **Step 6: Create `server/warmup.ts`**

```ts
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
 * Warm-up da aula: até 3 itens de tags fracas, até 2 de aulas concluídas há ~3, ~7 e ~21 dias,
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
```

- [ ] **Step 7: Create `server/writing-feedback.ts`**

```ts
import type { BrErrorPattern, Lesson } from "../shared/schema.ts";
import { detectBrErrors, type Finding } from "../shared/br-detector.ts";

export type ConstraintCheck = { label: string; met: boolean | null };
export type WritingFeedback = {
  mode: "rules";
  wordCount: number; withinLength: boolean; minWords: number; maxWords: number;
  constraints: ConstraintCheck[];
  findings: Finding[];
  model: string;
  rubric: string[];
  score: number | null;
};

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Feedback sem LLM: tamanho, restrições por regex, erros BR, modelo e rubrica. A nota é a autoavaliação (1–5), se enviada. */
export function ruleBasedFeedback(text: string, lesson: Lesson, patterns: BrErrorPattern[], selfScore?: number): WritingFeedback {
  const wordCount = countWords(text);
  const { minWords, maxWords, constraints, model, rubric } = lesson.writing;
  const checks: ConstraintCheck[] = constraints.map((c) => ({
    label: c.label,
    met: c.pattern ? new RegExp(c.pattern, "i").test(text) : null,
  }));
  const score = selfScore === undefined ? null : Math.min(5, Math.max(1, selfScore));
  return {
    mode: "rules",
    wordCount, withinLength: wordCount >= minWords && wordCount <= maxWords, minWords, maxWords,
    constraints: checks,
    findings: detectBrErrors(text, patterns),
    model, rubric, score,
  };
}
```

- [ ] **Step 8: Create `server/speaking-metrics.ts`**

```ts
import type { BrErrorPattern, Lesson } from "../shared/schema.ts";
import { detectBrErrors, type Finding } from "../shared/br-detector.ts";
import { tokenizeWords, matchTargetPhrases, wordsPerMinute } from "../shared/speech-compare.ts";

export type SpeakingMetrics = {
  wordCount: number; durationSec: number; wpm: number;
  used: string[]; missing: string[];
  findings: Finding[];
  withinTime: boolean;
  score: number;
};

/**
 * Nota 1–5 (modo A, sem LLM):
 *   base 1
 *   + expressões-alvo usadas: ≥4 → 1,5 · ≥2 → 1 · ≥1 → 0,5
 *   + erros BR: 0 → 1,5 · ≤2 → 0,5
 *   + dentro do tempo → 0,5
 *   + ritmo 90–170 palavras/min → 0,5
 *   Menos de 10 palavras: nota máxima 2.
 */
export function computeSpeakingMetrics(transcript: string, durationSec: number, lesson: Lesson, patterns: BrErrorPattern[]): SpeakingMetrics {
  const words = tokenizeWords(transcript);
  const { used, missing } = matchTargetPhrases(transcript, lesson.speaking.modeA.targetPhrases);
  const findings = detectBrErrors(transcript, patterns);
  const wpm = wordsPerMinute(words.length, durationSec);
  const withinTime = durationSec <= lesson.speaking.modeA.maxSeconds;

  let score = 1;
  score += used.length >= 4 ? 1.5 : used.length >= 2 ? 1 : used.length >= 1 ? 0.5 : 0;
  score += findings.length === 0 ? 1.5 : findings.length <= 2 ? 0.5 : 0;
  score += withinTime ? 0.5 : 0;
  score += wpm >= 90 && wpm <= 170 ? 0.5 : 0;
  score = Math.min(5, Math.round(score * 2) / 2);
  if (words.length < 10) score = Math.min(score, 2);

  return { wordCount: words.length, durationSec, wpm, used, missing, findings, withinTime, score };
}
```

- [ ] **Step 9: Run the four test files, then the whole suite**

Run: `pnpm test tests/completion.test.ts tests/warmup.test.ts tests/writing-feedback.test.ts tests/speaking-metrics.test.ts`
Expected: PASS (11 tests). If the warm-up test fails, check that weak-tag candidates (including `review.preferTags`) are taken first and that `used` de-duplicates by exercise id.

Run: `pnpm test && pnpm typecheck`
Expected: all green.

---

### Task 8: API routes and server boot

**Files:**
- Modify: `server/app.ts` (replace the Task 1 stub entirely), `server/index.ts` (replace)
- Modify: `tests/app.test.ts` (replace)

**Interfaces:**
- Consumes: everything from Tasks 3–7.
- Produces: `type AppDeps = { db: Db; content: ContentBundle; now?: () => string }`, `createApp(deps: AppDeps): Hono`, and these routes (all JSON):

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/health` | — | `{ ok: true }` |
| GET | `/api/progress/overview` | — | `{ lessons: LessonProgressRow[] }` |
| GET | `/api/tags/stats?days=30` | — | `{ since: string; stats: TagStat[]; weak: string[] }` |
| POST | `/api/lessons/:id/start` | — | `{ progress: LessonProgressRow }` |
| GET | `/api/lessons/:id/status` | — | `{ progress: LessonProgressRow \| null; completion: CompletionStatus }` |
| POST | `/api/lessons/:id/complete` | — | `{ progress: LessonProgressRow \| null; completion: CompletionStatus; cardsInserted: number }` |
| GET | `/api/lessons/:id/warmup` | — | `{ items: Exercise[] }` |
| GET | `/api/lessons/:id/writing/latest` | — | `{ submission: WritingRow \| null }` |
| POST | `/api/lessons/:id/writing` | `{ text: string; selfScore?: number }` | `{ id: number; feedback: WritingFeedback }` |
| POST | `/api/lessons/:id/speaking` | `{ mode: "A"; transcript: string; durationSec: number; selfConfidence?: number }` | `{ id: number; metrics: SpeakingMetrics }` |
| POST | `/api/attempts` | `AttemptInput` | `{ id: number }` |

Unknown lesson → 404 `{ error: "aula não encontrada" }`; invalid body → 400 `{ error: "corpo inválido", issues: [...] }`.

- [ ] **Step 1: Replace `tests/app.test.ts` with the full route tests**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../server/app.ts";
import { openDb } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";

const content = loadContent("content");
const lesson = content.lessons["M01-02"]!;
let app: Hono;
let clock = 0;
const now = () => new Date(Date.UTC(2026, 8, 8, 10, 0, clock++)).toISOString();

beforeEach(() => {
  clock = 0;
  app = createApp({ db: openDb(":memory:"), content, now });
});

const json = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

describe("health", () => {
  it("GET /api/health", async () => {
    const res = await app.request("/api/health");
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("lesson flow", () => {
  it("404 for unknown lesson", async () => {
    expect((await json("POST", "/api/lessons/M99-99/start")).status).toBe(404);
    expect((await app.request("/api/lessons/M99-99/status")).status).toBe(404);
  });

  it("400 for invalid attempt body", async () => {
    const res = await json("POST", "/api/attempts", { lessonId: "M01-02" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("corpo inválido");
  });

  it("start → attempts → status → writing → speaking → complete inserts cards", async () => {
    expect((await json("POST", `/api/lessons/${lesson.id}/start`)).status).toBe(200);

    for (const q of lesson.quiz.slice(0, 7)) {
      const res = await json("POST", "/api/attempts", { lessonId: lesson.id, exerciseId: q.id, block: "quiz", type: q.type, correct: true, answer: "x", tags: q.tags });
      expect(res.status).toBe(200);
    }
    let status = await (await app.request(`/api/lessons/${lesson.id}/status`)).json();
    expect(status.progress.status).toBe("in_progress");
    expect(status.completion.quizPct).toBeCloseTo(7 / 8);
    expect(status.completion.met).toBe(false);

    const w = await json("POST", `/api/lessons/${lesson.id}/writing`, { text: lesson.writing.model, selfScore: 4 });
    expect(w.status).toBe(200);
    const wBody = await w.json();
    expect(wBody.feedback.mode).toBe("rules");
    expect(wBody.feedback.score).toBe(4);
    expect((await (await app.request(`/api/lessons/${lesson.id}/writing/latest`)).json()).submission.text).toBe(lesson.writing.model);

    const s = await json("POST", `/api/lessons/${lesson.id}/speaking`, { mode: "A", transcript: "I've been working on the pipeline. I'm blocked on access. No blockers otherwise. Heads up it might slip.", durationSec: 20, selfConfidence: 3 });
    expect(s.status).toBe(200);
    expect((await s.json()).metrics.used.length).toBeGreaterThan(0);

    const done = await json("POST", `/api/lessons/${lesson.id}/complete`);
    const body = await done.json();
    expect(body.completion.met).toBe(true);
    expect(body.progress.status).toBe("completed");
    expect(body.cardsInserted).toBe(lesson.srsCards.length);

    status = await (await app.request(`/api/lessons/${lesson.id}/status`)).json();
    expect(status.completion.cardsAdded).toBe(true);
  });

  it("complete refuses when criteria are not met", async () => {
    const res = await json("POST", `/api/lessons/${lesson.id}/complete`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.completion.met).toBe(false);
    expect(body.cardsInserted).toBe(0);
    expect(body.progress).toBeNull();
  });

  it("warmup is empty with no completed lessons", async () => {
    expect(await (await app.request(`/api/lessons/${lesson.id}/warmup`)).json()).toEqual({ items: [] });
  });

  it("overview and tag stats reflect attempts", async () => {
    await json("POST", "/api/attempts", { lessonId: lesson.id, exerciseId: "M01-02-q1", block: "quiz", type: "fill_blank", correct: false, tags: ["gram.since-for"] });
    await json("POST", `/api/lessons/${lesson.id}/start`);
    const overview = await (await app.request("/api/progress/overview")).json();
    expect(overview.lessons).toHaveLength(1);
    const stats = await (await app.request("/api/tags/stats?days=7")).json();
    expect(stats.stats.find((s: { tag: string }) => s.tag === "gram.since-for").errors).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test tests/app.test.ts`
Expected: FAIL — `createApp` ignores deps / routes missing (404s, type errors).

- [ ] **Step 3: Replace `server/app.ts`**

```ts
import { Hono } from "hono";
import { z } from "zod";
import type { Db } from "./db.ts";
import { nowIso } from "./db.ts";
import { BlockSchema, type ContentBundle } from "../shared/schema.ts";
import {
  insertAttempt, startLesson, getLessonProgress, completeLesson, listProgress,
  insertWriting, latestWriting, insertSpeaking, insertCards, tagStats,
} from "./repo.ts";
import { evaluateCompletion } from "./completion.ts";
import { selectWarmup, weakTags } from "./warmup.ts";
import { ruleBasedFeedback } from "./writing-feedback.ts";
import { computeSpeakingMetrics } from "./speaking-metrics.ts";

export type AppDeps = { db: Db; content: ContentBundle; now?: () => string };

const AttemptBody = z.object({
  lessonId: z.string().min(1),
  exerciseId: z.string().min(1),
  block: BlockSchema,
  type: z.enum(["multiple_choice", "fill_blank", "error_correction", "reorder", "translate", "match", "free_text"]),
  correct: z.boolean(),
  answer: z.string().optional(),
  score: z.number().optional(),
  tags: z.array(z.string()),
});
const WritingBody = z.object({ text: z.string().min(1), selfScore: z.number().min(1).max(5).optional() });
const SpeakingBody = z.object({
  mode: z.literal("A"),
  transcript: z.string(),
  durationSec: z.number().nonnegative(),
  selfConfidence: z.number().int().min(1).max(5).optional(),
});

export function createApp({ db, content, now = nowIso }: AppDeps): Hono {
  const app = new Hono();

  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: err.message }, 500);
  });

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.get("/api/progress/overview", (c) => c.json({ lessons: listProgress(db) }));

  app.get("/api/tags/stats", (c) => {
    const days = Math.max(1, Number(c.req.query("days") ?? 30));
    const current = new Date(now());
    const since = new Date(current.getTime() - days * 864e5).toISOString();
    return c.json({ since, stats: tagStats(db, since), weak: weakTags(db, current) });
  });

  app.post("/api/attempts", async (c) => {
    const parsed = AttemptBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    if (!content.lessons[parsed.data.lessonId]) return c.json({ error: "aula não encontrada" }, 404);
    return c.json({ id: insertAttempt(db, parsed.data, now()) });
  });

  const lessons = new Hono();

  lessons.use("/:id/*", async (c, next) => {
    if (!content.lessons[c.req.param("id") ?? ""]) return c.json({ error: "aula não encontrada" }, 404);
    await next();
  });

  lessons.post("/:id/start", (c) => {
    const id = c.req.param("id");
    startLesson(db, id, now());
    return c.json({ progress: getLessonProgress(db, id) ?? null });
  });

  lessons.get("/:id/status", (c) => {
    const id = c.req.param("id");
    return c.json({ progress: getLessonProgress(db, id) ?? null, completion: evaluateCompletion(db, content.lessons[id]!) });
  });

  lessons.post("/:id/complete", (c) => {
    const id = c.req.param("id");
    const lesson = content.lessons[id]!;
    let completion = evaluateCompletion(db, lesson);
    let cardsInserted = 0;
    if (completion.met) {
      const ts = now();
      completeLesson(db, id, completion.quizPct, ts);
      cardsInserted = insertCards(db, id, lesson.srsCards, ts);
      completion = evaluateCompletion(db, lesson);
    }
    return c.json({ progress: getLessonProgress(db, id) ?? null, completion, cardsInserted });
  });

  lessons.get("/:id/warmup", (c) => c.json({ items: selectWarmup(db, content, c.req.param("id"), new Date(now())) }));

  lessons.get("/:id/writing/latest", (c) => c.json({ submission: latestWriting(db, c.req.param("id")) ?? null }));

  lessons.post("/:id/writing", async (c) => {
    const id = c.req.param("id");
    const parsed = WritingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const feedback = ruleBasedFeedback(parsed.data.text, content.lessons[id]!, content.brErrors, parsed.data.selfScore);
    const rowId = insertWriting(db, { lessonId: id, text: parsed.data.text, feedback, score: feedback.score }, now());
    return c.json({ id: rowId, feedback });
  });

  lessons.post("/:id/speaking", async (c) => {
    const id = c.req.param("id");
    const parsed = SpeakingBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const metrics = computeSpeakingMetrics(parsed.data.transcript, parsed.data.durationSec, content.lessons[id]!, content.brErrors);
    const rowId = insertSpeaking(
      db,
      { lessonId: id, mode: "A", transcript: parsed.data.transcript, metrics, score: metrics.score, selfConfidence: parsed.data.selfConfidence ?? null },
      now(),
    );
    return c.json({ id: rowId, metrics });
  });

  app.route("/api/lessons", lessons);
  return app;
}
```

Hono note: `lessons.use("/:id/*", …)` matches sub-paths; `c.req.param("id")` inside the middleware is available because the pattern declares `:id`. If a route like `/:id/start` is not covered by the middleware in your Hono version, add the same lesson-existence check at the top of each handler.

- [ ] **Step 4: Replace `server/index.ts`**

```ts
import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { openDb } from "./db.ts";
import { loadContent, crossValidate } from "../shared/content-loader.ts";

const port = Number(process.env.PORT ?? 3001);
const dbPath = process.env.DB_PATH ?? "data/progress.sqlite";

const content = loadContent("content");
const problems = crossValidate(content);
if (problems.length > 0) {
  console.error(`Conteúdo inválido:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

const db = openDb(dbPath);
const app = createApp({ db, content });

serve({ fetch: app.fetch, port }, () => {
  console.log(`[server] http://localhost:${port} · banco: ${dbPath} · ${Object.keys(content.lessons).length} aula(s)`);
});
```

- [ ] **Step 5: Run the route tests, the full suite, and a real boot**

Run: `pnpm test tests/app.test.ts`
Expected: PASS (7 tests).

Run: `pnpm test && pnpm typecheck`
Expected: all green.

Run: `node server/index.ts & sleep 1; curl -s localhost:3001/api/lessons/M01-02/status; echo; curl -s -X POST localhost:3001/api/lessons/M01-02/start; echo; kill %1`
Expected: JSON status with `completion.met: false`, then `{"progress":{...,"status":"in_progress",...}}`. File `data/progress.sqlite` now exists.

---

### Task 9: Client foundation — content access, API client, router, UI primitives, Levels and Module pages

**Files:**
- Create: `src/lib/content.ts`, `src/lib/api.ts`, `src/lib/useOverview.ts`, `src/components/ui/Button.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Badge.tsx`, `src/components/ui/ProgressBar.tsx`, `src/components/Layout.tsx`, `src/pages/Levels.tsx`, `src/pages/Module.tsx`, `src/pages/Lesson.tsx` (placeholder page for now; Task 13 replaces it)
- Modify: `src/App.tsx` (router)

**Interfaces:**
- Consumes: `src/generated/content.json` (Task 3), server types (type-only imports, erased at build).
- Produces (from `src/lib/content.ts`): `content: ContentBundle`, `levels: Level[]`, `getLesson(id): Lesson | undefined`, `hasContent(id): boolean`, `findModule(id): { level: Level; module: ModuleMeta } | undefined`, `findLessonRef(id): { level: Level; module: ModuleMeta; ref: LessonRef } | undefined`.
- Produces (from `src/lib/api.ts`): `api` object with `overview()`, `tagStats(days)`, `startLesson(id)`, `lessonStatus(id)`, `completeLesson(id)`, `warmup(id)`, `latestWriting(id)`, `submitWriting(id, body)`, `submitSpeaking(id, body)`, `postAttempt(a)` — each returns the JSON described in Task 8.
- Produces (from `src/lib/useOverview.ts`): `useOverview(): { byLesson: Map<string, LessonProgressRow>; loading: boolean; error: string | null; reload(): void }`.
- Produces UI: `Button({ variant?: "primary" | "secondary" | "ghost", ...buttonProps })`, `Card({ children, className? })`, `Badge({ children, tone?: "neutral" | "green" | "amber" | "blue" | "red" })`, `ProgressBar({ value: number /* 0..1 */ })`.
- Routes: `/` → Levels, `/modules/:id` → Module, `/lessons/:id` → Lesson.

- [ ] **Step 1: Create `src/lib/content.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/lib/api.ts`**

```ts
import type { Exercise } from "../../shared/schema.ts";
import type { AttemptInput, LessonProgressRow, WritingRow } from "../../server/repo.ts";
import type { CompletionStatus } from "../../server/completion.ts";
import type { WritingFeedback } from "../../server/writing-feedback.ts";
import type { SpeakingMetrics } from "../../server/speaking-metrics.ts";
import type { TagStat } from "../../server/repo.ts";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // corpo não é JSON; mantém a mensagem padrão
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

const post = <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export type LessonStatus = { progress: LessonProgressRow | null; completion: CompletionStatus };

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
};
```

- [ ] **Step 3: Create `src/lib/useOverview.ts`**

```ts
import { useCallback, useEffect, useState } from "react";
import { api } from "./api.ts";
import type { LessonProgressRow } from "../../server/repo.ts";

export function useOverview() {
  const [byLesson, setByLesson] = useState<Map<string, LessonProgressRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    api.overview()
      .then(({ lessons }) => { setByLesson(new Map(lessons.map((l) => [l.lesson_id, l]))); setError(null); })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { byLesson, loading, error, reload };
}
```

- [ ] **Step 4: Create the UI primitives**

`src/components/ui/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" };

const styles = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
  secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 disabled:text-slate-400",
  ghost: "bg-transparent text-indigo-700 hover:bg-indigo-50 disabled:text-slate-400",
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return <button {...props} className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles[variant]} ${className}`} />;
}
```

`src/components/ui/Card.tsx`:
```tsx
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}
```

`src/components/ui/Badge.tsx`:
```tsx
import type { ReactNode } from "react";

const tones = {
  neutral: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-sky-100 text-sky-800",
  red: "bg-rose-100 text-rose-800",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
```

`src/components/ui/ProgressBar.tsx`:
```tsx
export function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/Layout.tsx` and the router in `src/App.tsx`**

`src/components/Layout.tsx`:
```tsx
import { Link, Outlet } from "react-router";

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link to="/" className="text-lg font-semibold text-slate-900">Inglês para Tecnologia</Link>
          <nav className="text-sm text-slate-600">
            <Link to="/" className="hover:text-indigo-700">Trilha</Link>
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

`src/App.tsx`:
```tsx
import { createBrowserRouter, RouterProvider } from "react-router";
import { Layout } from "./components/Layout.tsx";
import { Levels } from "./pages/Levels.tsx";
import { Module } from "./pages/Module.tsx";
import { Lesson } from "./pages/Lesson.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Levels /> },
      { path: "modules/:id", element: <Module /> },
      { path: "lessons/:id", element: <Lesson /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 6: Create `src/pages/Levels.tsx`**

```tsx
import { Link } from "react-router";
import { levels, hasContent } from "../lib/content.ts";
import { useOverview } from "../lib/useOverview.ts";
import { Card } from "../components/ui/Card.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { ProgressBar } from "../components/ui/ProgressBar.tsx";

export function Levels() {
  const { byLesson, error } = useOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trilha</h1>
        <p className="mt-1 text-slate-600">5 níveis · 32 módulos · 157 aulas. Módulos dentro de um nível podem ser feitos em qualquer ordem.</p>
        {error && <p className="mt-2 text-sm text-rose-700">Servidor não respondeu ({error}). Progresso indisponível.</p>}
      </div>

      {levels.map((level) => {
        const lessonIds = level.modules.flatMap((m) => m.lessons.map((l) => l.id));
        const done = lessonIds.filter((id) => byLesson.get(id)?.status === "completed").length;
        return (
          <Card key={level.id}>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-semibold">Nível {level.id} · {level.name} <span className="font-normal text-slate-500">— {level.subtitle}</span></h2>
              <span className="text-sm text-slate-500">{done}/{lessonIds.length} aulas</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{level.focus}</p>
            <div className="mt-2"><ProgressBar value={lessonIds.length ? done / lessonIds.length : 0} /></div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {level.modules.map((m) => {
                const available = m.lessons.filter((l) => hasContent(l.id)).length;
                const completed = m.lessons.filter((l) => byLesson.get(l.id)?.status === "completed").length;
                return (
                  <li key={m.id}>
                    <Link to={`/modules/${m.id}`} className="block rounded-md border border-slate-200 p-3 hover:border-indigo-400 hover:bg-indigo-50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{m.id} · {m.title}</span>
                        {available === 0 ? <Badge>em breve</Badge> : completed === m.lessons.length ? <Badge tone="green">concluído</Badge> : <Badge tone="blue">{available} aula(s) disponíveis</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{m.lessons.length} aulas · {completed} concluídas</div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Create `src/pages/Module.tsx`**

```tsx
import { Link, useParams } from "react-router";
import { findModule, hasContent, competencyLabel } from "../lib/content.ts";
import { useOverview } from "../lib/useOverview.ts";
import { Card } from "../components/ui/Card.tsx";
import { Badge } from "../components/ui/Badge.tsx";

export function Module() {
  const { id = "" } = useParams();
  const found = findModule(id);
  const { byLesson } = useOverview();

  if (!found) return <p className="text-rose-700">Módulo não encontrado.</p>;
  const { level, module } = found;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-sm text-indigo-700 hover:underline">← Trilha</Link>
        <h1 className="mt-2 text-2xl font-semibold">{module.id} · {module.title}</h1>
        <p className="text-sm text-slate-500">Nível {level.id} · {level.name}</p>
      </div>

      <Card>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2"><dt className="font-medium text-slate-700">Objetivo</dt><dd className="text-slate-600">{module.objective}</dd></div>
          <div><dt className="font-medium text-slate-700">Competências</dt><dd className="mt-1 flex flex-wrap gap-1">{module.competencies.map((c) => <Badge key={c} tone="blue">{competencyLabel[c] ?? c}</Badge>)}</dd></div>
          <div><dt className="font-medium text-slate-700">Pré-requisitos</dt><dd className="text-slate-600">{module.prerequisites.length ? module.prerequisites.join(", ") : "nenhum"}</dd></div>
          <div><dt className="font-medium text-slate-700">Critério de conclusão</dt><dd className="text-slate-600">{module.completion}</dd></div>
          <div><dt className="font-medium text-slate-700">Como medir a evolução</dt><dd className="text-slate-600">{module.evaluation}</dd></div>
        </dl>
      </Card>

      <ol className="space-y-2">
        {module.lessons.map((l, i) => {
          const available = hasContent(l.id);
          const status = byLesson.get(l.id)?.status;
          const inner = (
            <div className="flex items-center justify-between gap-3">
              <span><span className="mr-2 text-slate-400">{i + 1}.</span>{l.title}</span>
              <span className="flex gap-1">
                {l.simulation && <Badge tone="amber">simulação</Badge>}
                {status === "completed" ? <Badge tone="green">concluída</Badge> : status === "in_progress" ? <Badge tone="blue">em andamento</Badge> : available ? <Badge tone="neutral">disponível</Badge> : <Badge>em breve</Badge>}
              </span>
            </div>
          );
          return (
            <li key={l.id}>
              {available
                ? <Link to={`/lessons/${l.id}`} className="block rounded-md border border-slate-200 bg-white p-3 hover:border-indigo-400 hover:bg-indigo-50">{inner}</Link>
                : <div className="rounded-md border border-dashed border-slate-200 p-3 text-slate-500">{inner}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```

- [ ] **Step 8: Create a placeholder `src/pages/Lesson.tsx` (Task 13 replaces it)**

```tsx
import { Link, useParams } from "react-router";
import { getLesson } from "../lib/content.ts";

export function Lesson() {
  const { id = "" } = useParams();
  const lesson = getLesson(id);
  if (!lesson) return <p className="text-rose-700">Aula não encontrada.</p>;
  return (
    <div>
      <Link to={`/modules/${lesson.module}`} className="text-sm text-indigo-700 hover:underline">← {lesson.module}</Link>
      <h1 className="mt-2 text-2xl font-semibold">{lesson.id} · {lesson.title}</h1>
      <p className="mt-2 text-slate-600">{lesson.objective}</p>
    </div>
  );
}
```

- [ ] **Step 9: Verify typecheck, build and the pages in the browser**

Run: `pnpm content:build && pnpm typecheck && pnpm build`
Expected: green. (`typecheck` needs `src/generated/content.json`; `content:build` creates it.)

Run: `pnpm dev` and open http://localhost:5173 — expect the 5 levels with module cards; click M01 → 5 lessons, only M01-02 "disponível"; click it → placeholder lesson header. Stop with Ctrl+C.

---

### Task 10: Mini-markdown parser (for scenario, grammar and prompts) and its React renderer

**Files:**
- Create: `shared/mini-markdown.ts`, `src/components/ui/Markdown.tsx`
- Test: `tests/mini-markdown.test.ts`

**Interfaces:**
- Produces (from `shared/mini-markdown.ts`):
  - `type Inline = { type: "text" | "bold" | "italic" | "code"; text: string }`
  - `type MdBlock = { type: "paragraph"; inlines: Inline[] } | { type: "table"; header: Inline[][]; rows: Inline[][][] } | { type: "list"; items: Inline[][] }`
  - `parseInline(text: string): Inline[]`, `parseMarkdown(text: string): MdBlock[]`
- Produces (from `src/components/ui/Markdown.tsx`): `Markdown({ text, className? })` React component.

Supported syntax only: paragraphs separated by blank lines, `**bold**`, `*italic*`, `` `code` ``, `- item` lists, pipe tables with a `|---|` separator line. Anything else is plain text.

- [ ] **Step 1: Write the failing tests**

`tests/mini-markdown.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseInline, parseMarkdown } from "../shared/mini-markdown.ts";

describe("parseInline", () => {
  it("splits bold, italic and code", () => {
    expect(parseInline("I**'ve fixed** it *now* `x`")).toEqual([
      { type: "text", text: "I" }, { type: "bold", text: "'ve fixed" }, { type: "text", text: " it " },
      { type: "italic", text: "now" }, { type: "text", text: " " }, { type: "code", text: "x" },
    ]);
  });
});

describe("parseMarkdown", () => {
  it("parses paragraphs, lists and tables", () => {
    const blocks = parseMarkdown(`Intro **here**.\n\n- one\n- two\n\n| A | B |\n|---|---|\n| 1 | **2** |\n| 3 | 4 |\n\nEnd.`);
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "list", "table", "paragraph"]);
    const table = blocks[2] as Extract<(typeof blocks)[number], { type: "table" }>;
    expect(table.header.map((c) => c[0]?.text)).toEqual(["A", "B"]);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]?.[1]?.[0]).toEqual({ type: "bold", text: "2" });
    const list = blocks[1] as Extract<(typeof blocks)[number], { type: "list" }>;
    expect(list.items).toHaveLength(2);
  });
  it("keeps single newlines inside a paragraph as spaces", () => {
    const [p] = parseMarkdown("line one\nline two");
    expect(p?.type).toBe("paragraph");
    expect((p as { inlines: { text: string }[] }).inlines[0]?.text).toBe("line one line two");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/mini-markdown.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `shared/mini-markdown.ts`**

```ts
export type Inline = { type: "text" | "bold" | "italic" | "code"; text: string };
export type MdBlock =
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "table"; header: Inline[][]; rows: Inline[][][] }
  | { type: "list"; items: Inline[][] };

const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ type: "text", text: text.slice(last, idx) });
    const tok = m[0];
    if (tok.startsWith("**")) out.push({ type: "bold", text: tok.slice(2, -2) });
    else if (tok.startsWith("`")) out.push({ type: "code", text: tok.slice(1, -1) });
    else out.push({ type: "italic", text: tok.slice(1, -1) });
    last = idx + tok.length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

const splitRow = (line: string): Inline[][] =>
  line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => parseInline(cell.trim()));

const isSeparator = (line: string) => /^\s*\|?\s*:?-{3,}/.test(line);

export function parseMarkdown(text: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const chunks = text.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);
  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    if (lines.every((l) => l.trim().startsWith("|")) && lines.length >= 2 && isSeparator(lines[1]!)) {
      blocks.push({ type: "table", header: splitRow(lines[0]!), rows: lines.slice(2).map(splitRow) });
    } else if (lines.every((l) => /^\s*-\s+/.test(l))) {
      blocks.push({ type: "list", items: lines.map((l) => parseInline(l.replace(/^\s*-\s+/, ""))) });
    } else {
      blocks.push({ type: "paragraph", inlines: parseInline(lines.map((l) => l.trim()).join(" ")) });
    }
  }
  return blocks;
}
```

- [ ] **Step 4: Create `src/components/ui/Markdown.tsx`**

```tsx
import { parseMarkdown, type Inline } from "../../../shared/mini-markdown.ts";

function Inlines({ inlines }: { inlines: Inline[] }) {
  return (
    <>
      {inlines.map((n, i) => {
        if (n.type === "bold") return <strong key={i}>{n.text}</strong>;
        if (n.type === "italic") return <em key={i}>{n.text}</em>;
        if (n.type === "code") return <code key={i} className="rounded bg-slate-100 px-1 font-mono text-[0.9em]">{n.text}</code>;
        return <span key={i}>{n.text}</span>;
      })}
    </>
  );
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className={`space-y-3 text-slate-700 ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === "paragraph") return <p key={i}><Inlines inlines={b.inlines} /></p>;
        if (b.type === "list") return <ul key={i} className="list-disc space-y-1 pl-5">{b.items.map((it, j) => <li key={j}><Inlines inlines={it} /></li>)}</ul>;
        return (
          <div key={i} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>{b.header.map((c, j) => <th key={j} className="border-b border-slate-300 px-2 py-1 text-left font-medium"><Inlines inlines={c} /></th>)}</tr></thead>
              <tbody>{b.rows.map((r, j) => <tr key={j} className="odd:bg-slate-50">{r.map((c, k) => <td key={k} className="px-2 py-1 align-top"><Inlines inlines={c} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Run the test and typecheck**

Run: `pnpm test tests/mini-markdown.test.ts && pnpm typecheck`
Expected: PASS (3 tests), no type errors.

---

### Task 11: Exercise components and the `ExerciseList` runner

**Files:**
- Create: `src/components/exercises/MultipleChoice.tsx`, `FillBlank.tsx`, `ErrorCorrection.tsx`, `Reorder.tsx`, `Translate.tsx`, `Match.tsx`, `FreeText.tsx`, `ExerciseRunner.tsx`, `ExerciseList.tsx` (all under `src/components/exercises/`)

**Interfaces:**
- Consumes: `checkExercise`, `ExerciseResponse`, `CheckResult` (Task 5); `api.postAttempt` (Task 9); `Exercise` types (Task 2).
- Produces:
  - Every input component: `({ exercise, value, onChange, disabled }: { exercise: <its type>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean })`.
  - `ExerciseRunner({ exercise, onAnswered }: { exercise: Exercise; onAnswered(result: CheckResult, response: ExerciseResponse): void })` — renders prompt, input, "Responder", then the commented correction (result + explanation).
  - `ExerciseList({ lessonId, block, exercises, onFinished }: { lessonId: string; block: Block; exercises: Exercise[]; onFinished?(summary: { correct: number; total: number }): void })` — runs exercises one after another, posts each attempt, shows a summary with "Refazer".

Behaviour rules: one exercise visible at a time; after "Responder" the explanation is ALWAYS shown (correct or not); the attempt is posted with `block`, `type`, `correct`, `answer` (string form) and the exercise's `tags`; a posting failure shows a small red note but does not block navigation.

- [ ] **Step 1: Create the seven input components**

`src/components/exercises/MultipleChoice.tsx`:
```tsx
import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "multiple_choice" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

export function MultipleChoice({ exercise, value, onChange, disabled }: Props) {
  return (
    <ul className="space-y-2">
      {exercise.options.map((opt, i) => (
        <li key={i}>
          <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${value === i ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"} ${disabled ? "cursor-default" : ""}`}>
            <input type="radio" name={exercise.id} checked={value === i} onChange={() => onChange(i)} disabled={disabled} />
            <span><span className="mr-2 text-slate-400">{String.fromCharCode(97 + i)})</span>{opt}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
```

`src/components/exercises/FillBlank.tsx`:
```tsx
import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "fill_blank" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

export function FillBlank({ exercise, value, onChange, disabled }: Props) {
  const [before, after = ""] = exercise.prompt.split("___");
  return (
    <p className="text-lg leading-loose">
      {before}
      <input
        className="mx-1 inline-block w-48 rounded border border-slate-300 px-2 py-1 text-base focus:border-indigo-500 focus:outline-none"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus
        aria-label="resposta"
      />
      {after}
    </p>
  );
}
```

`src/components/exercises/ErrorCorrection.tsx`:
```tsx
import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "error_correction" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

export function ErrorCorrection({ exercise, value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-900 line-through decoration-rose-400">{exercise.prompt}</p>
      <input
        className="w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        placeholder="Escreva a versão correta"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus
      />
    </div>
  );
}
```

`src/components/exercises/Reorder.tsx`:
```tsx
import { useMemo, useState } from "react";
import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "reorder" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

/** Embaralha de forma determinística a partir do id (não muda a cada render). */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const a = items.map((v, i) => ({ v, i }));
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a.map((x) => x.v);
}

export function Reorder({ exercise, value, onChange, disabled }: Props) {
  const pool = useMemo(() => seededShuffle(exercise.tokens.map((t, i) => ({ t, i })), exercise.id), [exercise]);
  const [usedIdx, setUsedIdx] = useState<number[]>([]);
  const chosen = Array.isArray(value) ? value : [];

  const pick = (i: number) => { const next = [...usedIdx, i]; setUsedIdx(next); onChange(next.map((k) => exercise.tokens[k]!)); };
  const unpick = (pos: number) => { const next = usedIdx.filter((_, p) => p !== pos); setUsedIdx(next); onChange(next.map((k) => exercise.tokens[k]!)); };

  return (
    <div className="space-y-3">
      <div className="flex min-h-12 flex-wrap gap-2 rounded-md border border-dashed border-slate-300 p-2">
        {chosen.length === 0 && <span className="text-sm text-slate-400">Clique nas palavras na ordem certa.</span>}
        {usedIdx.map((k, pos) => (
          <button key={pos} type="button" disabled={disabled} onClick={() => unpick(pos)} className="rounded bg-indigo-600 px-3 py-1 text-white">{exercise.tokens[k]}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {pool.map(({ t, i }) => (
          <button key={i} type="button" disabled={disabled || usedIdx.includes(i)} onClick={() => pick(i)} className="rounded border border-slate-300 bg-white px-3 py-1 disabled:opacity-30">{t}</button>
        ))}
      </div>
    </div>
  );
}
```

`src/components/exercises/Translate.tsx`:
```tsx
import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "translate" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

export function Translate({ exercise, value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <p className="rounded-md bg-slate-100 p-3 text-slate-800">🇧🇷 {exercise.prompt}</p>
      <input
        className="w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        placeholder="Em inglês…"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus
      />
    </div>
  );
}
```

`src/components/exercises/Match.tsx`:
```tsx
import { useMemo } from "react";
import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "match" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

export function Match({ exercise, value, onChange, disabled }: Props) {
  const current = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const rights = useMemo(() => [...exercise.pairs.map((p) => p.right)].sort(), [exercise]);
  return (
    <ul className="space-y-2">
      {exercise.pairs.map((p) => (
        <li key={p.left} className="flex items-center gap-3">
          <span className="w-1/2 rounded bg-slate-100 px-3 py-2">{p.left}</span>
          <select className="w-1/2 rounded border border-slate-300 px-2 py-2" value={current[p.left] ?? ""} disabled={disabled} onChange={(e) => onChange({ ...current, [p.left]: e.target.value })}>
            <option value="">—</option>
            {rights.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </li>
      ))}
    </ul>
  );
}
```

`src/components/exercises/FreeText.tsx`:
```tsx
import type { Exercise } from "../../../shared/schema.ts";
import type { ExerciseResponse } from "../../../shared/scoring.ts";

type Props = { exercise: Extract<Exercise, { type: "free_text" }>; value: ExerciseResponse | undefined; onChange(v: ExerciseResponse): void; disabled: boolean };

export function FreeText({ exercise, value, onChange, disabled }: Props) {
  const text = typeof value === "string" ? value : "";
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="space-y-1">
      <textarea className="min-h-32 w-full rounded border border-slate-300 p-3 focus:border-indigo-500 focus:outline-none" value={text} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      <div className="text-right text-xs text-slate-500">{words} palavra(s){exercise.minWords ? ` · mínimo ${exercise.minWords}` : ""}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/exercises/ExerciseRunner.tsx`**

```tsx
import { useState } from "react";
import type { Exercise } from "../../../shared/schema.ts";
import { checkExercise, type CheckResult, type ExerciseResponse } from "../../../shared/scoring.ts";
import { Button } from "../ui/Button.tsx";
import { MultipleChoice } from "./MultipleChoice.tsx";
import { FillBlank } from "./FillBlank.tsx";
import { ErrorCorrection } from "./ErrorCorrection.tsx";
import { Reorder } from "./Reorder.tsx";
import { Translate } from "./Translate.tsx";
import { Match } from "./Match.tsx";
import { FreeText } from "./FreeText.tsx";

const typeLabel: Record<Exercise["type"], string> = {
  multiple_choice: "Escolha a alternativa", fill_blank: "Complete", error_correction: "Corrija a frase",
  reorder: "Coloque em ordem", translate: "Traduza", match: "Associe", free_text: "Escreva",
};

type Props = { exercise: Exercise; onAnswered(result: CheckResult, response: ExerciseResponse): void };

export function ExerciseRunner({ exercise, onAnswered }: Props) {
  const [value, setValue] = useState<ExerciseResponse | undefined>(undefined);
  const [result, setResult] = useState<CheckResult | null>(null);
  const disabled = result !== null;

  const submit = () => {
    if (value === undefined) return;
    const r = checkExercise(exercise, value);
    setResult(r);
    onAnswered(r, value);
  };

  const input = (() => {
    const common = { value, onChange: setValue, disabled };
    switch (exercise.type) {
      case "multiple_choice": return <MultipleChoice exercise={exercise} {...common} />;
      case "fill_blank": return <FillBlank exercise={exercise} {...common} />;
      case "error_correction": return <ErrorCorrection exercise={exercise} {...common} />;
      case "reorder": return <Reorder exercise={exercise} {...common} />;
      case "translate": return <Translate exercise={exercise} {...common} />;
      case "match": return <Match exercise={exercise} {...common} />;
      case "free_text": return <FreeText exercise={exercise} {...common} />;
    }
  })();

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{typeLabel[exercise.type]}</div>
      {exercise.type !== "fill_blank" && exercise.type !== "error_correction" && exercise.type !== "translate" && <p className="text-lg">{exercise.prompt}</p>}
      {input}
      {!disabled && <Button type="submit" disabled={value === undefined || value === ""}>Responder</Button>}
      {result && (
        <div className={`rounded-md border p-3 text-sm ${result.correct ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
          <div className="font-medium">{result.correct ? "✓ Correto" : "✗ Não é isso"}</div>
          {!result.correct && <div className="mt-1">Esperado: <span className="font-medium">{result.expected}</span></div>}
          <div className="mt-2 text-slate-700">{exercise.explanation}</div>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Create `src/components/exercises/ExerciseList.tsx`**

```tsx
import { useState } from "react";
import type { Block, Exercise } from "../../../shared/schema.ts";
import type { CheckResult, ExerciseResponse } from "../../../shared/scoring.ts";
import { api } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";
import { ProgressBar } from "../ui/ProgressBar.tsx";
import { ExerciseRunner } from "./ExerciseRunner.tsx";

type Props = { lessonId: string; block: Block; exercises: Exercise[]; onFinished?(summary: { correct: number; total: number }): void };

const responseToString = (r: ExerciseResponse) => (typeof r === "string" ? r : Array.isArray(r) ? r.join(" ") : typeof r === "number" ? String(r) : JSON.stringify(r));

export function ExerciseList({ lessonId, block, exercises, onFinished }: Props) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [answered, setAnswered] = useState(false);
  const [round, setRound] = useState(0);
  const [postError, setPostError] = useState<string | null>(null);

  const current = exercises[index];
  const finished = index >= exercises.length;
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
    if (nextIndex >= exercises.length) onFinished?.({ correct: correct, total: exercises.length });
  };

  const restart = () => { setIndex(0); setResults([]); setAnswered(false); setRound((r) => r + 1); };

  if (exercises.length === 0) return <p className="text-slate-500">Nenhum exercício.</p>;

  if (finished) {
    return (
      <div className="space-y-3">
        <p className="text-lg font-medium">Resultado: {correct}/{exercises.length} ({Math.round((correct / exercises.length) * 100)}%)</p>
        <ProgressBar value={correct / exercises.length} />
        <Button variant="secondary" onClick={restart}>Refazer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Item {index + 1} de {exercises.length}</span>
        <span>{correct} certo(s)</span>
      </div>
      <ProgressBar value={index / exercises.length} />
      <ExerciseRunner key={`${round}-${current!.id}`} exercise={current!} onAnswered={onAnswered} />
      {postError && <p className="text-xs text-rose-700">{postError}</p>}
      {answered && <Button onClick={next}>{index + 1 < exercises.length ? "Próximo" : "Ver resultado"}</Button>}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no errors. (The components are exercised visually in Task 13/14.)

---

### Task 12: Browser speech (TTS/STT) and the content blocks of a lesson

**Files:**
- Create: `src/lib/speech.ts`, `src/components/lesson/Objective.tsx`, `Context.tsx`, `Vocabulary.tsx`, `Grammar.tsx`, `Examples.tsx`, `BrErrors.tsx`, `Dialogue.tsx`, `Listening.tsx`, `SpeakButton.tsx` (all under `src/components/lesson/`)

**Interfaces:**
- Produces (from `src/lib/speech.ts`):
  - `isSpeechSynthesisSupported(): boolean`, `isRecognitionSupported(): boolean`
  - `loadVoices(): Promise<SpeechSynthesisVoice[]>` (English voices only; waits for `voiceschanged` up to 700 ms)
  - `pickVoice(voices: SpeechSynthesisVoice[], index?: number): SpeechSynthesisVoice | undefined` (prefers names in `PREFERRED_VOICES`, then cycles by index for different speakers)
  - `speak(text: string, opts?: { voice?: SpeechSynthesisVoice; rate?: number }): Promise<void>` (cancels anything playing), `stopSpeaking(): void`
  - `startRecognition(opts: { onResult(transcript: string, isFinal: boolean): void; onEnd(): void; onError(message: string): void }): { stop(): void }` — continuous, interim results, `en-US`.
- Block components take `{ lesson: Lesson }` (plus `lessonId` for Listening) and render one section each.

- [ ] **Step 1: Create `src/lib/speech.ts`**

```ts
const PREFERRED_VOICES = ["Samantha", "Daniel", "Karen", "Moira", "Google US English", "Google UK English Female", "Google UK English Male"];

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSynthesisSupported()) return Promise.resolve([]);
  const english = () => window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const now = english();
  if (now.length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => { window.speechSynthesis.removeEventListener("voiceschanged", done); resolve(english()); };
    window.speechSynthesis.addEventListener("voiceschanged", done);
    setTimeout(done, 700);
  });
}

/** Voz preferida; com index > 0 alterna entre vozes para diferenciar falantes. */
export function pickVoice(voices: SpeechSynthesisVoice[], index = 0): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  const preferred = PREFERRED_VOICES.map((name) => voices.find((v) => v.name === name)).filter((v): v is SpeechSynthesisVoice => Boolean(v));
  const ordered = [...preferred, ...voices.filter((v) => !preferred.includes(v))];
  return ordered[index % ordered.length];
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}

export function speak(text: string, opts: { voice?: SpeechSynthesisVoice; rate?: number } = {}): Promise<void> {
  if (!isSpeechSynthesisSupported()) return Promise.reject(new Error("Síntese de voz não disponível neste navegador."));
  stopSpeaking();
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts.voice?.lang ?? "en-US";
    if (opts.voice) u.voice = opts.voice;
    u.rate = opts.rate ?? 0.95;
    u.onend = () => resolve();
    u.onerror = (e) => (e.error === "interrupted" || e.error === "canceled" ? resolve() : reject(new Error(e.error)));
    window.speechSynthesis.speak(u);
  });
}

// ---- Reconhecimento de fala (Chrome). Tipos mínimos declarados aqui para não depender de @types externos.
type RecognitionEvent = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void; stop(): void; abort(): void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isRecognitionSupported(): boolean {
  return recognitionCtor() !== undefined;
}

export function startRecognition(opts: { onResult(transcript: string, isFinal: boolean): void; onEnd(): void; onError(message: string): void }): { stop(): void } {
  const Ctor = recognitionCtor();
  if (!Ctor) { opts.onError("Reconhecimento de fala não disponível. Use o Google Chrome."); return { stop() {} }; }
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.continuous = true;
  rec.interimResults = true;
  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]!;
      const t = r[0]?.transcript ?? "";
      if (r.isFinal) finalText += `${t} `;
      else interim += t;
    }
    opts.onResult(`${finalText}${interim}`.trim(), interim === "");
  };
  rec.onend = () => opts.onEnd();
  rec.onerror = (e) => opts.onError(e.error === "not-allowed" ? "Permissão de microfone negada." : `Erro no reconhecimento: ${e.error}`);
  rec.start();
  return { stop: () => rec.stop() };
}
```

- [ ] **Step 2: Create `src/components/lesson/SpeakButton.tsx` (reused by Vocabulary, Examples, Dialogue, Listening)**

```tsx
import { useEffect, useState } from "react";
import { loadVoices, pickVoice, speak, stopSpeaking, isSpeechSynthesisSupported } from "../../lib/speech.ts";

type Props = { text: string; voiceIndex?: number; rate?: number; label?: string; small?: boolean };

export function SpeakButton({ text, voiceIndex = 0, rate = 0.95, label = "Ouvir", small = false }: Props) {
  const [playing, setPlaying] = useState(false);
  const supported = isSpeechSynthesisSupported();
  useEffect(() => () => stopSpeaking(), []);

  const play = async () => {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    setPlaying(true);
    try {
      const voices = await loadVoices();
      await speak(text, { voice: pickVoice(voices, voiceIndex), rate });
    } finally {
      setPlaying(false);
    }
  };

  if (!supported) return null;
  return (
    <button type="button" onClick={play} title={label} className={`rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 ${small ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}`}>
      {playing ? "◼" : "▶"} {small ? "" : label}
    </button>
  );
}
```

- [ ] **Step 3: Create the text blocks**

`src/components/lesson/Objective.tsx`:
```tsx
import type { Lesson } from "../../../shared/schema.ts";
import { Badge } from "../ui/Badge.tsx";
import { competencyLabel } from "../../lib/content.ts";

export function Objective({ lesson }: { lesson: Lesson }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Objetivo da aula</h2>
      <p className="text-lg text-slate-700">{lesson.objective}</p>
      <div className="flex flex-wrap gap-2 text-sm">
        {lesson.competencies.map((c) => <Badge key={c} tone="blue">{competencyLabel[c] ?? c}</Badge>)}
        <Badge>{lesson.durationMin} min</Badge>
        {lesson.prerequisites.length > 0 && <Badge tone="amber">pré-requisito: {lesson.prerequisites.join(", ")}</Badge>}
      </div>
      <div className="text-sm text-slate-600">
        <span className="font-medium">Para concluir:</span> quiz ≥ {Math.round(lesson.completion.quizMin * 100)}% · escrita com nota ≥ {lesson.completion.writingMin} · {lesson.completion.speakingRequired ? "1 gravação de fala" : "fala opcional"} · {lesson.srsCards.length} cards para o SRS
      </div>
    </section>
  );
}
```

`src/components/lesson/Context.tsx`:
```tsx
import type { Lesson } from "../../../shared/schema.ts";
import { Markdown } from "../ui/Markdown.tsx";

export function Context({ lesson }: { lesson: Lesson }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Contexto profissional real</h2>
      <Markdown text={lesson.context.scenario} className="text-base" />
      {lesson.context.roles.length > 0 && <p className="text-sm text-slate-500">Personagens: {lesson.context.roles.join(" · ")}</p>}
    </section>
  );
}
```

`src/components/lesson/Vocabulary.tsx`:
```tsx
import type { Lesson } from "../../../shared/schema.ts";
import { Badge } from "../ui/Badge.tsx";
import { SpeakButton } from "./SpeakButton.tsx";

const registerTone = { formal: "amber", neutral: "neutral", informal: "blue" } as const;

export function Vocabulary({ lesson }: { lesson: Lesson }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Vocabulário e expressões essenciais</h2>
      <p className="text-sm text-slate-500">{lesson.vocabulary.length} expressões. Ouça cada uma e repita em voz alta.</p>
      <ol className="space-y-3">
        {lesson.vocabulary.map((v, i) => (
          <li key={i} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-lg font-medium">{i + 1}. {v.term}</span>
              <span className="flex items-center gap-2">
                <Badge tone={registerTone[v.register]}>{v.register}</Badge>
                <SpeakButton text={v.example} small />
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-600">{v.meaning}</div>
            <div className="mt-2 text-slate-800">“{v.example}”</div>
            {v.translation && <div className="text-sm text-slate-500">{v.translation}</div>}
            {v.note && <div className="mt-1 text-sm text-amber-800">{v.note}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
```

`src/components/lesson/Grammar.tsx`:
```tsx
import type { Lesson } from "../../../shared/schema.ts";
import { Markdown } from "../ui/Markdown.tsx";
import { SpeakButton } from "./SpeakButton.tsx";

export function Grammar({ lesson }: { lesson: Lesson }) {
  if (!lesson.grammar) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Gramática (só o necessário)</h2>
      <h3 className="font-medium text-slate-800">{lesson.grammar.title}</h3>
      <Markdown text={lesson.grammar.explanation} />
      {lesson.grammar.examples.length > 0 && (
        <ul className="space-y-1 text-sm">
          {lesson.grammar.examples.map((e, i) => <li key={i} className="flex items-center gap-2"><SpeakButton text={e.en} small /><span className="font-medium">{e.en}</span><span className="text-slate-500">— {e.pt}</span></li>)}
        </ul>
      )}
    </section>
  );
}
```

`src/components/lesson/Examples.tsx`:
```tsx
import type { Lesson } from "../../../shared/schema.ts";
import { SpeakButton } from "./SpeakButton.tsx";

export function Examples({ lesson }: { lesson: Lesson }) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Exemplos naturais</h2>
        <ul className="mt-3 space-y-3">
          {lesson.examples.map((e, i) => (
            <li key={i} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2"><span className="text-slate-900">{e.en}</span><SpeakButton text={e.en} small /></div>
              <div className="text-sm text-slate-500">{e.pt}</div>
              <div className="mt-1 text-xs text-slate-500"><span className="font-medium">Quando usar:</span> {e.context}</div>
            </li>
          ))}
        </ul>
      </div>
      {lesson.variations.map((v, i) => (
        <div key={i}>
          <h3 className="font-medium text-slate-800">Variações da mesma ideia: {v.idea}</h3>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {v.items.map((it, j) => (
                <tr key={j} className={it.adequate ? "" : "bg-rose-50"}>
                  <td className="w-40 px-2 py-1 align-top text-slate-500">{it.register}</td>
                  <td className="px-2 py-1">{it.adequate ? "✓" : "✗"} {it.text}{it.note && <span className="ml-2 text-xs text-slate-500">— {it.note}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
```

`src/components/lesson/BrErrors.tsx`:
```tsx
import type { Lesson } from "../../../shared/schema.ts";

export function BrErrors({ lesson }: { lesson: Lesson }) {
  if (lesson.brErrors.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Erros comuns de brasileiros nesta situação</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="px-2 py-1">Errado</th><th className="px-2 py-1">Certo</th><th className="px-2 py-1">Por quê</th></tr></thead>
          <tbody>
            {lesson.brErrors.map((e, i) => (
              <tr key={i} className="odd:bg-slate-50">
                <td className="px-2 py-2 text-rose-800 line-through decoration-rose-300">{e.wrong}</td>
                <td className="px-2 py-2 font-medium text-emerald-800">{e.right}</td>
                <td className="px-2 py-2 text-slate-600">{e.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create `src/components/lesson/Dialogue.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import type { Lesson } from "../../../shared/schema.ts";
import { loadVoices, pickVoice, speak, stopSpeaking, isSpeechSynthesisSupported } from "../../lib/speech.ts";
import { Button } from "../ui/Button.tsx";
import { SpeakButton } from "./SpeakButton.tsx";

/** Índice de voz por falante (ordem de aparição), para que cada pessoa soe diferente. */
export function speakerIndexes(lines: { speaker: string }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of lines) if (!map.has(l.speaker)) map.set(l.speaker, map.size);
  return map;
}

export function Dialogue({ lesson }: { lesson: Lesson }) {
  const [rate, setRate] = useState(0.95);
  const [showText, setShowText] = useState(true);
  const [playingAll, setPlayingAll] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const indexes = useMemo(() => speakerIndexes(lesson.dialogue.lines), [lesson]);
  useEffect(() => () => stopSpeaking(), []);

  const playAll = async () => {
    if (playingAll) { stopSpeaking(); setPlayingAll(false); setCurrent(null); return; }
    setPlayingAll(true);
    const voices = await loadVoices();
    try {
      for (let i = 0; i < lesson.dialogue.lines.length; i++) {
        const line = lesson.dialogue.lines[i]!;
        setCurrent(i);
        await speak(line.text, { voice: pickVoice(voices, indexes.get(line.speaker) ?? 0), rate });
      }
    } finally {
      setPlayingAll(false);
      setCurrent(null);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Diálogo</h2>
      <p className="text-sm text-slate-500">{lesson.dialogue.title}</p>
      <div className="flex flex-wrap items-center gap-3">
        {isSpeechSynthesisSupported() ? <Button onClick={playAll}>{playingAll ? "◼ Parar" : "▶ Ouvir tudo"}</Button> : <span className="text-sm text-rose-700">Áudio indisponível neste navegador.</span>}
        <label className="flex items-center gap-2 text-sm text-slate-600">Velocidade <input type="range" min={0.7} max={1.1} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} /> {rate.toFixed(2)}×</label>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} /> mostrar texto</label>
      </div>
      <ol className="space-y-2">
        {lesson.dialogue.lines.map((l, i) => (
          <li key={i} className={`rounded-md border p-3 ${current === i ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-600">{l.speaker}</span>
              <SpeakButton text={l.text} voiceIndex={indexes.get(l.speaker) ?? 0} rate={rate} small />
            </div>
            {showText && <p className="mt-1 text-slate-900">{l.text}</p>}
            {showText && l.note && <p className="mt-1 text-xs text-amber-800">{l.note}</p>}
          </li>
        ))}
      </ol>
      {lesson.dialogue.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">{lesson.dialogue.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Create `src/components/lesson/Listening.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import type { Lesson } from "../../../shared/schema.ts";
import { loadVoices, pickVoice, speak, stopSpeaking, isSpeechSynthesisSupported } from "../../lib/speech.ts";
import { Button } from "../ui/Button.tsx";
import { ExerciseList } from "../exercises/ExerciseList.tsx";
import { speakerIndexes } from "./Dialogue.tsx";

export function Listening({ lesson }: { lesson: Lesson }) {
  const [rate, setRate] = useState(0.95);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [plays, setPlays] = useState(0);
  const indexes = useMemo(() => speakerIndexes(lesson.listening.lines), [lesson]);
  useEffect(() => () => stopSpeaking(), []);

  const playAll = async () => {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    setPlaying(true);
    setPlays((p) => p + 1);
    const voices = await loadVoices();
    try {
      for (const line of lesson.listening.lines) await speak(line.text, { voice: pickVoice(voices, indexes.get(line.speaker) ?? 0), rate });
    } finally {
      setPlaying(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Compreensão auditiva</h2>
      <p className="text-sm text-slate-600">Ouça os {lesson.listening.lines.length} updates sem ler. Pode repetir e reduzir a velocidade. A transcrição aparece depois das perguntas.</p>
      <div className="flex flex-wrap items-center gap-3">
        {isSpeechSynthesisSupported() ? <Button onClick={playAll}>{playing ? "◼ Parar" : plays === 0 ? "▶ Ouvir" : "▶ Ouvir de novo"}</Button> : <span className="text-sm text-rose-700">Áudio indisponível neste navegador.</span>}
        <label className="flex items-center gap-2 text-sm text-slate-600">Velocidade <input type="range" min={0.7} max={1.1} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} /> {rate.toFixed(2)}×</label>
        <span className="text-xs text-slate-500">{plays} reprodução(ões)</span>
      </div>
      <ExerciseList lessonId={lesson.id} block="listening" exercises={lesson.listening.questions} onFinished={() => setRevealed(true)} />
      {(revealed || !isSpeechSynthesisSupported()) && (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <h3 className="text-sm font-medium text-slate-600">Transcrição</h3>
          <ol className="mt-2 space-y-2 text-sm">{lesson.listening.lines.map((l, i) => <li key={i}><span className="font-medium text-slate-600">{l.speaker}:</span> {l.text}</li>)}</ol>
        </div>
      )}
      {!revealed && isSpeechSynthesisSupported() && <Button variant="ghost" onClick={() => setRevealed(true)}>Mostrar transcrição agora</Button>}
    </section>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: no errors. If TS complains about `SpeechSynthesisErrorEvent.error` comparisons, the union in lib.dom includes `"interrupted"` and `"canceled"`; keep the string comparisons.

---

### Task 13: Lesson page — stepper, warm-up, quiz, writing, speaking, completion

**Files:**
- Create: `src/components/lesson/Stepper.tsx`, `WarmUp.tsx`, `Quiz.tsx`, `Writing.tsx`, `Speaking.tsx`, `Completion.tsx` (under `src/components/lesson/`)
- Modify: `src/pages/Lesson.tsx` (replace the Task 9 placeholder)

**Interfaces:**
- Consumes: every block from Task 12, `ExerciseList` (Task 11), `api` (Task 9), `startRecognition`/`isRecognitionSupported` (Task 12).
- Produces: `Stepper({ steps: { key: string; label: string }[]; current: number; onSelect(i: number): void })`; `WarmUp({ lesson, items })`; `Quiz({ lesson })`; `Writing({ lesson })`; `Speaking({ lesson })`; `Completion({ lesson })`.

Flow of the page: on mount → `api.startLesson`, `api.warmup`. Steps (in order): Revisão (only if warm-up has items), Objetivo, Contexto, Vocabulário, Gramática (if present), Exemplos, Erros comuns, Diálogo, Escuta, Escrita, Fala, Quiz, Conclusão. Free navigation (the stepper is clickable); "Anterior"/"Próximo" at the bottom.

- [ ] **Step 1: Create `src/components/lesson/Stepper.tsx`**

```tsx
type Step = { key: string; label: string };

export function Stepper({ steps, current, onSelect }: { steps: Step[]; current: number; onSelect(i: number): void }) {
  return (
    <ol className="flex flex-wrap gap-1 text-xs">
      {steps.map((s, i) => (
        <li key={s.key}>
          <button
            type="button"
            onClick={() => onSelect(i)}
            aria-current={i === current ? "step" : undefined}
            className={`rounded-full px-3 py-1 ${i === current ? "bg-indigo-600 text-white" : i < current ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {i + 1}. {s.label}
          </button>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Create `WarmUp.tsx` and `Quiz.tsx`**

`src/components/lesson/WarmUp.tsx`:
```tsx
import type { Exercise, Lesson } from "../../../shared/schema.ts";
import { ExerciseList } from "../exercises/ExerciseList.tsx";

export function WarmUp({ lesson, items }: { lesson: Lesson; items: Exercise[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Revisão espaçada</h2>
      <p className="text-sm text-slate-600">{items.length} itens de aulas anteriores, escolhidos pelas tags em que você mais errou e pelo tempo desde a última vez.</p>
      <ExerciseList lessonId={lesson.id} block="warmup" exercises={items} />
    </section>
  );
}
```

`src/components/lesson/Quiz.tsx`:
```tsx
import type { Lesson } from "../../../shared/schema.ts";
import { ExerciseList } from "../exercises/ExerciseList.tsx";

export function Quiz({ lesson }: { lesson: Lesson }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Quiz</h2>
      <p className="text-sm text-slate-600">{lesson.quiz.length} itens. Conta a última tentativa de cada item; mínimo {Math.round(lesson.completion.quizMin * 100)}% para concluir. Pode refazer.</p>
      <ExerciseList lessonId={lesson.id} block="quiz" exercises={lesson.quiz} />
    </section>
  );
}
```

- [ ] **Step 3: Create `src/components/lesson/Writing.tsx`**

```tsx
import { useEffect, useState } from "react";
import type { Lesson } from "../../../shared/schema.ts";
import type { WritingFeedback } from "../../../server/writing-feedback.ts";
import { api } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";
import { Markdown } from "../ui/Markdown.tsx";

export function Writing({ lesson }: { lesson: Lesson }) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [selfScore, setSelfScore] = useState<number | "">("");
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const { minWords, maxWords } = lesson.writing;

  useEffect(() => {
    api.latestWriting(lesson.id).then(({ submission }) => {
      if (!submission) return;
      setText(submission.text);
      setFeedback(JSON.parse(submission.feedback_json) as WritingFeedback);
      setSavedScore(submission.score);
    }).catch(() => undefined);
  }, [lesson.id]);

  const submit = async (score?: number) => {
    setBusy(true); setError(null);
    try {
      const res = await api.submitWriting(lesson.id, score === undefined ? { text } : { text, selfScore: score });
      setFeedback(res.feedback);
      setSavedScore(res.feedback.score);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Exercício de escrita</h2>
      <Markdown text={lesson.writing.prompt} />
      <ul className="text-sm text-slate-600">
        <li><span className="font-medium">Obrigatório usar:</span> {lesson.writing.constraints.map((c) => c.label).join(" · ")}</li>
        <li><span className="font-medium">Rubrica:</span> {lesson.writing.rubric.join(" · ")}</li>
      </ul>
      <textarea className="min-h-40 w-full rounded border border-slate-300 p-3 focus:border-indigo-500 focus:outline-none" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva em inglês…" />
      <div className="flex items-center justify-between">
        <span className={`text-sm ${words >= minWords && words <= maxWords ? "text-emerald-700" : "text-slate-500"}`}>{words} palavras (meta {minWords}–{maxWords})</span>
        <Button onClick={() => submit()} disabled={busy || words === 0}>{feedback ? "Enviar de novo" : "Enviar"}</Button>
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
            <Button variant="secondary" disabled={selfScore === "" || busy} onClick={() => submit(Number(selfScore))}>Salvar nota</Button>
            {savedScore !== null && <span className="text-emerald-700">nota salva: {savedScore}/5 (mínimo {lesson.completion.writingMin})</span>}
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Create `src/components/lesson/Speaking.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import type { Lesson } from "../../../shared/schema.ts";
import type { SpeakingMetrics } from "../../../server/speaking-metrics.ts";
import { api } from "../../lib/api.ts";
import { isRecognitionSupported, startRecognition } from "../../lib/speech.ts";
import { Button } from "../ui/Button.tsx";

export function Speaking({ lesson }: { lesson: Lesson }) {
  const { modeA } = lesson.speaking;
  const supported = isRecognitionSupported();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [durationSec, setDurationSec] = useState(0);
  const [confidence, setConfidence] = useState<number | "">("");
  const [metrics, setMetrics] = useState<SpeakingMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handle = useRef<{ stop(): void } | null>(null);
  const timer = useRef<number | null>(null);

  const stop = () => {
    handle.current?.stop();
    handle.current = null;
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
    setRecording(false);
  };
  useEffect(() => () => stop(), []);

  const start = () => {
    setError(null); setMetrics(null); setTranscript(""); setSeconds(0);
    const startedAt = Date.now();
    handle.current = startRecognition({
      onResult: (t) => setTranscript(t),
      onEnd: () => { setDurationSec(Math.round((Date.now() - startedAt) / 1000)); stop(); },
      onError: (msg) => { setError(msg); stop(); },
    });
    setRecording(true);
    timer.current = window.setInterval(() => {
      const s = Math.round((Date.now() - startedAt) / 1000);
      setSeconds(s);
      setDurationSec(s);
      if (s >= modeA.maxSeconds + 10) stop();
    }, 500);
  };

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const res = await api.submitSpeaking(lesson.id, { mode: "A", transcript, durationSec, ...(confidence === "" ? {} : { selfConfidence: Number(confidence) }) });
      setMetrics(res.metrics);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Atividade de conversação (modo A)</h2>
      <p className="text-slate-700">{modeA.prompt}</p>
      <details className="text-sm text-slate-600"><summary className="cursor-pointer font-medium">Expressões-alvo ({modeA.targetPhrases.length})</summary><p className="mt-1">{modeA.targetPhrases.join(" · ")}</p></details>
      {modeA.checklist.length > 0 && <ul className="list-disc pl-5 text-sm text-slate-600">{modeA.checklist.map((c, i) => <li key={i}>{c}</li>)}</ul>}

      <div className="flex flex-wrap items-center gap-3">
        {supported
          ? <Button onClick={recording ? stop : start} variant={recording ? "secondary" : "primary"}>{recording ? "◼ Parar" : "● Gravar"}</Button>
          : <span className="text-sm text-rose-700">Reconhecimento de fala indisponível. Use o Google Chrome ou digite a transcrição abaixo.</span>}
        <span className={`font-mono text-sm ${seconds > modeA.maxSeconds ? "text-rose-700" : "text-slate-600"}`}>{seconds}s / {modeA.maxSeconds}s</span>
      </div>

      <textarea className="min-h-28 w-full rounded border border-slate-300 p-3 text-slate-800 focus:border-indigo-500 focus:outline-none" value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder={supported ? "A transcrição aparece aqui enquanto você fala. Corrija o que o reconhecimento errou." : "Digite o que você diria."} />
      {!supported && <label className="text-sm text-slate-600">Duração (s): <input type="number" className="ml-2 w-20 rounded border border-slate-300 px-2 py-1" value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} /></label>}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>Como você se sentiu?</span>
        <select className="rounded border border-slate-300 px-2 py-1" value={confidence} onChange={(e) => setConfidence(e.target.value === "" ? "" : Number(e.target.value))}>
          <option value="">—</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <Button onClick={submit} disabled={busy || recording || transcript.trim().length === 0}>Enviar gravação</Button>
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}

      {metrics && (
        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4 text-sm">
          <div className="text-lg font-medium">Nota: {metrics.score}/5</div>
          <div>{metrics.wordCount} palavras · {metrics.durationSec}s ({metrics.withinTime ? "dentro do tempo" : "acima do tempo"}) · {metrics.wpm} palavras/min {metrics.wpm >= 90 && metrics.wpm <= 170 ? "(ritmo bom)" : metrics.wpm < 90 ? "(devagar)" : "(rápido demais)"}</div>
          <div><span className="font-medium text-emerald-800">Expressões usadas ({metrics.used.length}):</span> {metrics.used.join(" · ") || "nenhuma"}</div>
          <div><span className="font-medium text-slate-600">Não usadas:</span> {metrics.missing.join(" · ")}</div>
          {metrics.findings.length > 0 && (
            <ul className="space-y-1">
              {metrics.findings.map((f, i) => <li key={i} className="rounded border border-rose-200 bg-rose-50 p-2"><span className="line-through decoration-rose-400">{f.match}</span> → <span className="font-medium text-emerald-800">{f.right}</span> <span className="text-slate-600">— {f.why}</span></li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Create `src/components/lesson/Completion.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import type { Lesson } from "../../../shared/schema.ts";
import { api, type LessonStatus } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";

export function Completion({ lesson }: { lesson: Lesson }) {
  const [status, setStatus] = useState<LessonStatus | null>(null);
  const [cards, setCards] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => { api.lessonStatus(lesson.id).then(setStatus).catch((e: Error) => setError(e.message)); }, [lesson.id]);
  useEffect(load, [load]);

  const complete = async () => {
    try {
      const res = await api.completeLesson(lesson.id);
      setStatus(res);
      setCards(res.cardsInserted);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (error) return <p className="text-rose-700">{error}</p>;
  if (!status) return <p className="text-slate-500">Carregando…</p>;
  const c = status.completion;
  const done = status.progress?.status === "completed";

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Conclusão</h2>
      <ul className="space-y-1 text-sm">
        <li>{c.quizPct >= c.quizMin ? "✓" : "✗"} Quiz: {Math.round(c.quizPct * 100)}% (mínimo {Math.round(c.quizMin * 100)}%)</li>
        <li>{c.writingScore !== null && c.writingScore >= c.writingMin ? "✓" : "✗"} Escrita: {c.writingScore === null ? "não enviada" : `nota ${c.writingScore}`} (mínimo {c.writingMin})</li>
        <li>{!c.speakingRequired || c.speakingCount > 0 ? "✓" : "✗"} Fala: {c.speakingCount} gravação(ões){c.speakingRequired ? " (mínimo 1)" : ""}</li>
        <li>{c.cardsAdded ? "✓" : "•"} Cards no SRS: {c.cardsAdded ? `${lesson.srsCards.length} adicionados` : `${lesson.srsCards.length} serão adicionados ao concluir`}</li>
      </ul>
      {done ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4">
          <p className="font-medium text-emerald-900">Aula concluída{cards !== null ? ` · ${cards} card(s) adicionados` : ""}.</p>
          <Link to={`/modules/${lesson.module}`} className="mt-2 inline-block text-sm text-indigo-700 hover:underline">← Voltar ao módulo</Link>
        </div>
      ) : (
        <Button onClick={complete} disabled={!c.met}>{c.met ? "Concluir aula" : `Faltam: ${c.missing.join("; ")}`}</Button>
      )}
      <div>
        <h3 className="text-sm font-medium text-slate-600">Cards desta aula</h3>
        <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2">{lesson.srsCards.map((k, i) => <li key={i} className="rounded border border-slate-200 bg-white px-2 py-1"><span className="text-slate-500">{k.front}</span> → {k.back}</li>)}</ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Replace `src/pages/Lesson.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import type { Exercise } from "../../shared/schema.ts";
import { getLesson } from "../lib/content.ts";
import { api } from "../lib/api.ts";
import { Button } from "../components/ui/Button.tsx";
import { Stepper } from "../components/lesson/Stepper.tsx";
import { WarmUp } from "../components/lesson/WarmUp.tsx";
import { Objective } from "../components/lesson/Objective.tsx";
import { Context } from "../components/lesson/Context.tsx";
import { Vocabulary } from "../components/lesson/Vocabulary.tsx";
import { Grammar } from "../components/lesson/Grammar.tsx";
import { Examples } from "../components/lesson/Examples.tsx";
import { BrErrors } from "../components/lesson/BrErrors.tsx";
import { Dialogue } from "../components/lesson/Dialogue.tsx";
import { Listening } from "../components/lesson/Listening.tsx";
import { Writing } from "../components/lesson/Writing.tsx";
import { Speaking } from "../components/lesson/Speaking.tsx";
import { Quiz } from "../components/lesson/Quiz.tsx";
import { Completion } from "../components/lesson/Completion.tsx";

export function Lesson() {
  const { id = "" } = useParams();
  const lesson = getLesson(id);
  const [warmup, setWarmup] = useState<Exercise[] | null>(null);
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!lesson) return;
    setStep(0);
    api.startLesson(lesson.id).catch((e: Error) => setServerError(e.message));
    api.warmup(lesson.id).then(({ items }) => setWarmup(items)).catch(() => setWarmup([]));
  }, [lesson]);

  const steps = useMemo(() => {
    if (!lesson) return [];
    const list = [
      ...(warmup && warmup.length > 0 ? [{ key: "warmup", label: "Revisão" }] : []),
      { key: "objective", label: "Objetivo" },
      { key: "context", label: "Contexto" },
      { key: "vocabulary", label: "Vocabulário" },
      ...(lesson.grammar ? [{ key: "grammar", label: "Gramática" }] : []),
      { key: "examples", label: "Exemplos" },
      ...(lesson.brErrors.length > 0 ? [{ key: "brErrors", label: "Erros comuns" }] : []),
      { key: "dialogue", label: "Diálogo" },
      { key: "listening", label: "Escuta" },
      { key: "writing", label: "Escrita" },
      { key: "speaking", label: "Fala" },
      { key: "quiz", label: "Quiz" },
      { key: "completion", label: "Conclusão" },
    ];
    return list;
  }, [lesson, warmup]);

  if (!lesson) return <p className="text-rose-700">Aula não encontrada.</p>;
  if (warmup === null) return <p className="text-slate-500">Carregando aula…</p>;
  const current = steps[Math.min(step, steps.length - 1)]!;

  const body = (() => {
    switch (current.key) {
      case "warmup": return <WarmUp lesson={lesson} items={warmup} />;
      case "objective": return <Objective lesson={lesson} />;
      case "context": return <Context lesson={lesson} />;
      case "vocabulary": return <Vocabulary lesson={lesson} />;
      case "grammar": return <Grammar lesson={lesson} />;
      case "examples": return <Examples lesson={lesson} />;
      case "brErrors": return <BrErrors lesson={lesson} />;
      case "dialogue": return <Dialogue lesson={lesson} />;
      case "listening": return <Listening lesson={lesson} />;
      case "writing": return <Writing lesson={lesson} />;
      case "speaking": return <Speaking lesson={lesson} />;
      case "quiz": return <Quiz lesson={lesson} />;
      case "completion": return <Completion lesson={lesson} />;
      default: return null;
    }
  })();

  return (
    <div className="space-y-5">
      <div>
        <Link to={`/modules/${lesson.module}`} className="text-sm text-indigo-700 hover:underline">← {lesson.module}</Link>
        <h1 className="mt-1 text-2xl font-semibold">{lesson.id} · {lesson.title}</h1>
        {serverError && <p className="mt-1 text-sm text-rose-700">Servidor não respondeu ({serverError}). O progresso não será salvo.</p>}
      </div>
      <Stepper steps={steps} current={step} onSelect={setStep} />
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">{body}</div>
      <div className="flex justify-between">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>← Anterior</Button>
        <Button disabled={step >= steps.length - 1} onClick={() => setStep((s) => s + 1)}>Próximo →</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Typecheck and build**

Run: `pnpm typecheck && pnpm build`
Expected: green.

---

### Task 14: End-to-end verification in the browser and final README touches

**Files:**
- Modify: `README.md` (add the "Como usar uma aula" section below)

- [ ] **Step 1: Start everything**

Run: `pnpm dev` (keep it running; use a second terminal or background it). Open http://localhost:5173 in **Google Chrome**.

- [ ] **Step 2: Walk the whole lesson M01-02 and tick each item**

- Trilha shows 5 levels; M01 card shows "1 aula(s) disponíveis".
- M01 page: lesson 2 "disponível", others "em breve"; click lesson 2.
- Stepper has no "Revisão" step (no completed lessons yet) and shows Objetivo … Conclusão.
- Objetivo, Contexto (markdown renders the `payments-api` code span), Vocabulário (16 items, ▶ plays audio), Gramática (two tables render), Exemplos (7 + 2 variation tables), Erros comuns (11 rows).
- Diálogo: "Ouvir tudo" plays 8 lines with different voices; the current line highlights; speed slider works; "mostrar texto" hides text.
- Escuta: audio plays; answer the 6 questions (try one wrong: explanation shows); transcript revealed at the end.
- Escrita: paste the model answer → all constraints ✓, no findings; then paste `I'm working on this since yesterday and I have a doubt.` → ✗ length, findings for `br.since-present` and `br.doubt`. Set self score 4 → "nota salva: 4/5".
- Fala: click Gravar, allow the microphone, speak for ~20 s using "I've been working on", "I'm blocked on", "no blockers"; stop; transcript filled; send → nota, used/missing lists, wpm.
- Quiz: answer all 8 (reorder by clicking tokens; match is not used here). Score shown; "Refazer" works.
- Conclusão: all ✓ when quiz ≥ 75%; "Concluir aula" → "Aula concluída · 12 card(s) adicionados"; back to module shows "concluída"; Trilha shows 1/30 for level 1.
- Reload the lesson: Escrita shows the last submission; Conclusão still says concluída.
- `sqlite3 data/progress.sqlite 'select count(*) from attempts; select * from lesson_progress; select count(*) from srs_cards;'` (or `node -e` with `node:sqlite`) shows the rows.

Fix anything that fails before moving on; re-run `pnpm test && pnpm typecheck` after fixes.

- [ ] **Step 3: Append to `README.md`**

```markdown
## Como usar uma aula
1. Abra a trilha, escolha o módulo e a aula.
2. Siga os blocos na ordem (ou pule pelo stepper). Áudio usa a voz do sistema; a fala usa o reconhecimento do Chrome.
3. Para concluir: quiz ≥ 75%, escrita enviada e avaliada (≥ 3/5), uma gravação de fala. Os cards da aula entram no SRS na conclusão.
4. O progresso fica em `data/progress.sqlite`. Apague o arquivo para recomeçar do zero.

## Estado atual (etapas E0–E1)
- Conteúdo: aula M01-02 completa; demais aulas listadas como "em breve".
- Correção de escrita e fala em modo por regras (sem IA). A integração com a Claude API entra na etapa E4.
```

- [ ] **Step 4: Final checks**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: all green. Report: tests count, that the repo is not under git, and the list of everything created.

---

## Self-review (done while writing; kept for the executor)

- **Spec coverage (E0 + E1 from `01-plano-geral.md` §8):** scaffold (T1), schema + validator (T2–T3), example lesson rendered end to end (T3, T9–T13), all 7 exercise types (T11), 12 blocks (T12–T13), TTS/STT (T12–T13), warm-up (T7, T13), completion criteria from DB (T7–T8, T13), progress persisted (T6–T8). Roadmap visible (T3, T9). Not in scope by design: placement test, dashboard, SRS review UI, Claude API (E2–E4).
- **Type consistency:** `Block` union used in schema, repo, api and ExerciseList; `CheckResult`/`ExerciseResponse` defined once in `shared/scoring.ts`; `CompletionStatus`, `WritingFeedback`, `SpeakingMetrics`, `LessonProgressRow`, `WritingRow`, `TagStat`, `AttemptInput` are imported type-only by the client from `server/*` — the client bundle never includes server code.
- **Known simplifications:** speaking mode B (LLM roleplay) is declared in content but not rendered until E4; `free_text` and `match` components exist for future lessons and are not exercised by M01-02's quiz; the warm-up cannot show items until a second lesson with content exists (E5).
