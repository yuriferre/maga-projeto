# E3 — SRS e glossário: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar agenda SM-2 aos cards que as aulas já criam, entregar a tela de revisão diária (`/review`), o glossário com busca e áudio (`/glossary`, tema `daily.yaml` + vocabulário das aulas) e o card de SRS no painel.

**Architecture:** SM-2 puro em `shared/sm2.ts` (com as funções de data local movidas para `shared/local-date.ts`, reexportadas por `server/time.ts`); o servidor aplica o algoritmo e grava em `srs_cards`/`srs_reviews` via `server/repo.ts`; rotas `/api/srs/{queue,review,cards}`; o painel ganha `srs`. Glossário curado em `content/glossary/*.yaml` validado por schema, fundido com `lesson.vocabulary` por `shared/glossary.ts` (puro, testável) e exibido pela página.

**Tech Stack:** Node 25 (roda `.ts` direto), pnpm, TypeScript 7, Vite 8, React 19, react-router 8, Tailwind 4, Hono 4, `node:sqlite`, zod 4, yaml 2, vitest 5.

**Spec:** `docs/superpowers/specs/2026-09-10-e3-srs-e-glossario-design.md` (autoridade; leia antes). Origem: `docs/planejamento/01-plano-geral.md` (seções 2, 4, 5, 6, 8).

## Global Constraints

- **Branch:** `feat/e3-srs-glossario` (já criada). Sem `git push`, sem PR, sem `--no-verify`. Conventional Commits (hook `commit-msg`, assunto ≤ 72 chars); `pre-commit` valida conteúdo e roda typecheck.
- **Runtime:** Node ≥ 25 executa `.ts` direto. Imports relativos em `server/`, `shared/`, `scripts/` com extensão `.ts`. Sem `enum`, `namespace`, parameter properties. `noUncheckedIndexedAccess` ligado.
- **Dependências fechadas:** nada novo. `shared/` é puro (sem DOM, sem `node:` exceto `content-loader.ts`); o cliente importa tipos do servidor só com `import type` e pode importar `shared/` em runtime.
- **Texto:** UI e comentários em português com acentos; identificadores em inglês; conteúdo educacional em inglês (significados/armadilhas em português). Nunca placeholder. Caracteres tipográficos existentes (`→ · — – ✓ ✗ ● ◼ ▶`) intactos.
- **YAML:** quote escalares com `#`, `: ` ou aspas iniciais. Toda tag existe em `content/tags.yaml`. Depois de editar `content/`, `pnpm content:build`.
- **SQL parametrizado; todo POST/PUT com zod; timestamps só via `now()` injetável.**
- **Testes:** vitest, Node puro, conteúdo real (`loadContent("content")`), `openDb(":memory:")`, rotas via `app.request`. Nunca enfraqueça um teste existente. Suíte atual: 145 testes.
- **Verificação por tarefa:** `pnpm content:build && pnpm typecheck && pnpm test` (cliente: `&& pnpm build`). UI verificada no Chrome na última tarefa.

---

## Estrutura de arquivos

```
shared/local-date.ts        novo (T1): fromLocalDate, localDate, addDays, localDayStart — movidos de server/time.ts
shared/sm2.ts               novo (T1): CardState, Sm2Result, Grade, Maturity, INITIAL_STATE, MATURE_DAYS, GRADE_BUTTONS, sm2, nextInterval, previewIntervals, maturity
server/time.ts              (T1) reexporta localDate/addDays/localDayStart e usa fromLocalDate de shared
server/repo.ts              (T2) CardRow, CardCounts, dueCards, getCard, applyReview, cardCounts, reviewAccuracy, insertGlossaryCard
server/app.ts               (T3) sub-router /api/srs
server/dashboard.ts         (T4) srs
shared/schema.ts            (T5) GlossaryEntrySchema, GlossaryFileSchema, ContentBundle.glossary
shared/content-loader.ts    (T5) lê content/glossary/*.yaml; crossValidate
shared/glossary.ts          (T5) GlossaryItem, normalize, buildGlossary, matches
content/glossary/daily.yaml (T5) 30 termos
src/lib/api.ts              (T6) srsQueue, srsReview, addCard
src/App.tsx, src/components/Layout.tsx (T6) rotas /review e /glossary, nav
src/pages/Review.tsx        (T6) nova; src/pages/Glossary.tsx placeholder (T6) → completa (T7)
src/components/dashboard/SrsCard.tsx (T7) nova; WeeklyGoalCard.tsx (T7) sem nota E3; Dashboard.tsx (T7)
README.md, AGENTS.md        (T8)
tests/sm2.test.ts (T1), tests/time.test.ts (T1), tests/repo.test.ts (T2), tests/srs-routes.test.ts (T3), tests/dashboard.test.ts (T4),
tests/glossary-content.test.ts (T5), tests/content-loader.test.ts (T5)
```

Ordem: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8. T5 é independente de T2–T4 (pode rodar em paralelo com a revisão delas).

---

### Task 1: SM-2 puro e datas locais em `shared/`

**Files:**
- Create: `shared/local-date.ts`, `shared/sm2.ts`
- Modify: `server/time.ts`
- Test: `tests/sm2.test.ts` (novo), `tests/time.test.ts` (1 teste a mais)

**Interfaces:**
- Produces (`shared/local-date.ts`): `fromLocalDate(date: string): Date`, `localDate(iso: string): string`, `addDays(date: string, n: number): string`, `localDayStart(date: string): string` (ISO da meia-noite local).
- Produces (`shared/sm2.ts`): `CardState { ease; intervalDays; reps; lapses }`, `Sm2Result = CardState & { due: string }`, `Grade = 0|1|2|3|4|5`, `Maturity = "new"|"learning"|"mature"`, `INITIAL_STATE`, `MATURE_DAYS = 21`, `GRADE_BUTTONS` (`[{ key: "again", label: "Errei", grade: 1 }, { key: "hard", label: "Difícil", grade: 3 }, { key: "good", label: "Bom", grade: 4 }, { key: "easy", label: "Fácil", grade: 5 }]`), `sm2(state, grade, nowIso): Sm2Result`, `nextInterval(state, grade): number`, `previewIntervals(state): { again, hard, good, easy }`, `maturity({ reps, intervalDays }): Maturity`.
- `server/time.ts` continua exportando `localDate`, `addDays`, `weekStart`, `weekBounds`, `overlapMs`, `computeStreak` e passa a exportar `localDayStart`.

- [ ] **Step 1: Testes que falham**

Crie `tests/sm2.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sm2, nextInterval, previewIntervals, maturity, INITIAL_STATE, GRADE_BUTTONS, type Grade } from "../shared/sm2.ts";
import { localDayStart, addDays, localDate } from "../shared/local-date.ts";

const now = new Date(2026, 8, 10, 15, 0, 0).toISOString();
const dueIn = (days: number) => localDayStart(addDays(localDate(now), days));

describe("sm2", () => {
  it.each<[Grade, number, number]>([[1, 1.96, 0], [3, 2.36, 1], [4, 2.5, 1], [5, 2.6, 1]])("primeira resposta com nota %s → ease %s, intervalo %s", (grade, ease, interval) => {
    const r = sm2(INITIAL_STATE, grade, now);
    expect(r.ease).toBeCloseTo(ease, 2);
    expect(r.intervalDays).toBe(interval);
  });
  it("segunda resposta boa dá 6 dias; terceira, round(6 × ease); due à meia-noite local", () => {
    const first = sm2(INITIAL_STATE, 4, now);
    expect(first).toMatchObject({ reps: 1, intervalDays: 1, lapses: 0, due: dueIn(1) });
    const second = sm2(first, 4, now);
    expect(second).toMatchObject({ reps: 2, intervalDays: 6, due: dueIn(6) });
    const third = sm2(second, 4, now);
    expect(third).toMatchObject({ reps: 3, intervalDays: 15, due: dueIn(15) });
  });
  it("nota < 3 zera reps e intervalo, soma lapso e vence agora", () => {
    const learned = sm2(sm2(INITIAL_STATE, 4, now), 4, now);
    const r = sm2(learned, 1, now);
    expect(r).toMatchObject({ reps: 0, intervalDays: 0, lapses: 1, due: now });
    expect(r.ease).toBeCloseTo(1.86, 2);
  });
  it("ease nunca cai abaixo de 1,3", () => {
    let s = { ...INITIAL_STATE };
    for (let i = 0; i < 10; i++) s = sm2(s, 1, now);
    expect(s.ease).toBe(1.3);
    expect(s.lapses).toBe(10);
  });
  it("intervalo mínimo de 1 dia com ease baixa", () => {
    expect(nextInterval({ ease: 1.3, intervalDays: 1, reps: 2, lapses: 0 }, 3)).toBe(1);
    expect(nextInterval(INITIAL_STATE, 1)).toBe(0);
  });
  it("previewIntervals reflete os quatro botões", () => {
    expect(previewIntervals(INITIAL_STATE)).toEqual({ again: 0, hard: 1, good: 1, easy: 1 });
    expect(previewIntervals({ ease: 2.5, intervalDays: 6, reps: 2, lapses: 0 })).toEqual({ again: 0, hard: Math.round(6 * 2.36), good: 15, easy: Math.round(6 * 2.6) });
    expect(GRADE_BUTTONS.map((b) => b.grade)).toEqual([1, 3, 4, 5]);
  });
  it("maturity: novo (reps 0), aprendendo (< 21 d), maduro (≥ 21 d)", () => {
    expect(maturity({ reps: 0, intervalDays: 0 })).toBe("new");
    expect(maturity({ reps: 3, intervalDays: 20 })).toBe("learning");
    expect(maturity({ reps: 3, intervalDays: 21 })).toBe("mature");
  });
});
```

Em `tests/time.test.ts`, acrescente `localDayStart` ao import de `../server/time.ts` e, dentro de `describe("calendário local")`:

```ts
  it("localDayStart is the local midnight of the date", () => {
    expect(localDayStart("2026-09-10")).toBe(new Date(2026, 8, 10, 0, 0, 0).toISOString());
  });
```

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/sm2.test.ts tests/time.test.ts`
Expected: FAIL — módulos `shared/sm2.ts`/`shared/local-date.ts` inexistentes; `localDayStart` não exportado.

- [ ] **Step 3: Crie `shared/local-date.ts`**

```ts
// Calendário no fuso local da máquina (uso pessoal, um computador). Datas locais são strings YYYY-MM-DD.
const pad = (n: number) => String(n).padStart(2, "0");

export function fromLocalDate(date: string): Date {
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

/** Instante ISO da meia-noite local da data. */
export function localDayStart(date: string): string {
  return fromLocalDate(date).toISOString();
}
```

- [ ] **Step 4: `server/time.ts`** — remova `pad`, `fromLocalDate`, `localDate` e `addDays` do arquivo e coloque no topo:

```ts
import { addDays, fromLocalDate, localDate } from "../shared/local-date.ts";
export { addDays, localDate, localDayStart } from "../shared/local-date.ts";
```

`weekStart`, `weekBounds`, `overlapMs` e `computeStreak` ficam como estão (usam `localDate`, `addDays`, `fromLocalDate` importados).

- [ ] **Step 5: Crie `shared/sm2.ts`**

```ts
import { addDays, localDate, localDayStart } from "./local-date.ts";

export type CardState = { ease: number; intervalDays: number; reps: number; lapses: number };
export type Sm2Result = CardState & { due: string };
export type Grade = 0 | 1 | 2 | 3 | 4 | 5;
export type Maturity = "new" | "learning" | "mature";

export const INITIAL_STATE: CardState = { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 };
/** Intervalo a partir do qual um card é considerado maduro (corte do Anki). */
export const MATURE_DAYS = 21;
/** Botões da tela de revisão → nota SM-2. */
export const GRADE_BUTTONS = [
  { key: "again", label: "Errei", grade: 1 },
  { key: "hard", label: "Difícil", grade: 3 },
  { key: "good", label: "Bom", grade: 4 },
  { key: "easy", label: "Fácil", grade: 5 },
] as const;
export type GradeKey = (typeof GRADE_BUTTONS)[number]["key"];

/** Fator de facilidade após a resposta: EF + 0,1 − (5 − q)(0,08 + (5 − q) · 0,02), nunca abaixo de 1,3. */
function nextEase(ease: number, grade: number): number {
  const q = 5 - grade;
  return Math.max(1.3, ease + 0.1 - q * (0.08 + q * 0.02));
}

/** Intervalo em dias após a resposta: 0 (volta agora) para nota < 3; 1, 6, depois round(intervalo × ease). */
export function nextInterval(state: CardState, grade: number): number {
  if (grade < 3) return 0;
  const reps = state.reps + 1;
  if (reps === 1) return 1;
  if (reps === 2) return 6;
  return Math.max(1, Math.round(state.intervalDays * nextEase(state.ease, grade)));
}

/** SM-2: nota < 3 reinicia o card e vence agora; nota ≥ 3 agenda para a meia-noite local de hoje + intervalo. */
export function sm2(state: CardState, grade: Grade, nowIso: string): Sm2Result {
  const ease = Number(nextEase(state.ease, grade).toFixed(2));
  if (grade < 3) return { ease, intervalDays: 0, reps: 0, lapses: state.lapses + 1, due: nowIso };
  const intervalDays = nextInterval(state, grade);
  return { ease, intervalDays, reps: state.reps + 1, lapses: state.lapses, due: localDayStart(addDays(localDate(nowIso), intervalDays)) };
}

/** Prévia do intervalo de cada botão, para o rótulo "em N dias". */
export function previewIntervals(state: CardState): Record<GradeKey, number> {
  return { again: 0, hard: nextInterval(state, 3), good: nextInterval(state, 4), easy: nextInterval(state, 5) };
}

export function maturity(state: Pick<CardState, "reps" | "intervalDays">): Maturity {
  if (state.reps === 0) return "new";
  return state.intervalDays >= MATURE_DAYS ? "mature" : "learning";
}
```

- [ ] **Step 6: Verifique**

Run: `pnpm test && pnpm typecheck`
Expected: PASS (145 + 7 + 1 = 153). `tests/time.test.ts` inteiro continua verde.

- [ ] **Step 7: Commit**

```bash
git add shared/local-date.ts shared/sm2.ts server/time.ts tests/sm2.test.ts tests/time.test.ts
git commit -m "feat(shared): algoritmo SM-2 e datas locais compartilhadas"
```

---

### Task 2: Repositório do SRS

**Files:**
- Modify: `server/repo.ts`
- Test: `tests/repo.test.ts`

**Interfaces:**
- Consumes: `Sm2Result`, `MATURE_DAYS` (T1); `insertCards`, `average` (privado), `RadarSample` (existentes).
- Produces: `CardRow`, `CardCounts`, `dueCards(db, nowIso, limit): CardRow[]`, `getCard(db, id): CardRow | undefined`, `applyReview(db, id, grade, next: Sm2Result, nowIso): void`, `cardCounts(db, nowIso): CardCounts`, `reviewAccuracy(db, sinceIso): RadarSample`, `insertGlossaryCard(db, card, nowIso): { inserted: boolean; id: number }`.

- [ ] **Step 1: Testes que falham** — em `tests/repo.test.ts`, estenda o import de `../server/repo.ts` com `dueCards, getCard, applyReview, cardCounts, reviewAccuracy, insertGlossaryCard` e acrescente:

```ts
describe("srs: fila, revisão, contagens", () => {
  const cards = [
    { front: "a", back: "A", tag: "vocab.standup" },
    { front: "b", back: "B", tag: "vocab.standup" },
    { front: "c", back: "C", tag: "vocab.standup" },
  ];
  const ids = () => (db.prepare("select id from srs_cards order by id").all() as { id: number }[]).map((r) => r.id);
  const reviews = () => (db.prepare("select count(*) as n from srs_reviews").get() as { n: number }).n;

  it("dueCards lista só os vencidos, mais antigos primeiro, com limite", () => {
    insertCards(db, "M01-02", cards, t(1));
    const [a, b] = ids();
    applyReview(db, b!, 4, { ease: 2.5, intervalDays: 1, reps: 1, lapses: 0, due: t(5) }, t(2));
    expect(dueCards(db, t(3), 10).map((r) => r.front)).toEqual(["a", "c"]);
    expect(dueCards(db, t(3), 1).map((r) => r.front)).toEqual(["a"]);
    expect(dueCards(db, t(5), 10).map((r) => r.front)).toEqual(["a", "c", "b"]);
    expect(getCard(db, a!)?.front).toBe("a");
    expect(getCard(db, 999)).toBeUndefined();
  });

  it("applyReview grava estado e revisão juntos; nota inválida não deixa nada gravado", () => {
    insertCards(db, "M01-02", cards.slice(0, 1), t(1));
    const [id] = ids();
    applyReview(db, id!, 4, { ease: 2.5, intervalDays: 1, reps: 1, lapses: 0, due: t(2) }, t(1));
    expect(getCard(db, id!)).toMatchObject({ ease: 2.5, interval_days: 1, reps: 1, lapses: 0, due: t(2) });
    expect(reviews()).toBe(1);
    expect(() => applyReview(db, id!, 9, { ease: 1.3, intervalDays: 0, reps: 0, lapses: 1, due: t(3) }, t(3))).toThrow();
    expect(getCard(db, id!)).toMatchObject({ interval_days: 1, reps: 1, due: t(2) });
    expect(reviews()).toBe(1);
  });

  it("cardCounts classifica novos/aprendendo/maduros, conta vencidos e aponta o próximo", () => {
    expect(cardCounts(db, t(1))).toEqual({ new: 0, learning: 0, mature: 0, dueNow: 0, total: 0, nextDue: null });
    insertCards(db, "M01-02", cards, t(1));
    const [, b, c] = ids();
    applyReview(db, b!, 4, { ease: 2.5, intervalDays: 6, reps: 2, lapses: 0, due: t(7) }, t(1));
    applyReview(db, c!, 5, { ease: 2.6, intervalDays: 30, reps: 4, lapses: 0, due: t(9) }, t(1));
    expect(cardCounts(db, t(2))).toEqual({ new: 1, learning: 1, mature: 1, dueNow: 1, total: 3, nextDue: t(7) });
    expect(cardCounts(db, t(9))).toMatchObject({ dueNow: 3, nextDue: null });
  });

  it("reviewAccuracy conta notas ≥ 3 na janela", () => {
    insertCards(db, "M01-02", cards.slice(0, 1), t(1));
    const [id] = ids();
    const next = { ease: 2.5, intervalDays: 1, reps: 1, lapses: 0, due: t(9) };
    applyReview(db, id!, 5, next, t(1));
    applyReview(db, id!, 4, next, t(2));
    applyReview(db, id!, 1, next, t(3));
    expect(reviewAccuracy(db, t(2))).toEqual({ value: 0.5, samples: 2 });
    expect(reviewAccuracy(db, t(4))).toEqual({ value: null, samples: 0 });
  });

  it("insertGlossaryCard insere uma vez e devolve o id existente depois", () => {
    const first = insertGlossaryCard(db, { front: "aviso rápido", back: "heads up", hint: "just a heads up", tag: "vocab.slack" }, t(1));
    const second = insertGlossaryCard(db, { front: "aviso rápido", back: "heads up", tag: "vocab.slack" }, t(2));
    expect(first.inserted).toBe(true);
    expect(second).toEqual({ inserted: false, id: first.id });
    expect(getCard(db, first.id)).toMatchObject({ lesson_id: "glossary", hint: "just a heads up", due: t(1), reps: 0 });
  });
});
```

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/repo.test.ts`
Expected: FAIL — funções não exportadas.

- [ ] **Step 3: Implemente em `server/repo.ts`** — importe no topo `import { MATURE_DAYS, type Sm2Result } from "../shared/sm2.ts";` e acrescente ao final:

```ts
// ---------- srs: fila, revisões e contagens ----------
export type CardRow = {
  id: number; lesson_id: string; front: string; back: string; hint: string | null; tag: string;
  ease: number; interval_days: number; due: string; reps: number; lapses: number; created_at: string;
};
export type CardCounts = { new: number; learning: number; mature: number; dueNow: number; total: number; nextDue: string | null };

/** Cards vencidos até `nowIso`, mais antigos primeiro. */
export function dueCards(db: Db, nowIso: string, limit: number): CardRow[] {
  return db.prepare("select * from srs_cards where due <= ? order by due asc, id asc limit ?").all(nowIso, limit) as CardRow[];
}

export function getCard(db: Db, id: number): CardRow | undefined {
  return db.prepare("select * from srs_cards where id = ?").get(id) as CardRow | undefined;
}

/** Grava o novo estado do card e a revisão na mesma transação. */
export function applyReview(db: Db, id: number, grade: number, next: Sm2Result, nowIso: string): void {
  db.exec("begin");
  try {
    db.prepare("update srs_cards set ease = ?, interval_days = ?, reps = ?, lapses = ?, due = ? where id = ?")
      .run(next.ease, next.intervalDays, next.reps, next.lapses, next.due, id);
    db.prepare("insert into srs_reviews (card_id, grade, ts) values (?,?,?)").run(id, grade, nowIso);
    db.exec("commit");
  } catch (err) {
    db.exec("rollback");
    throw err;
  }
}

export function cardCounts(db: Db, nowIso: string): CardCounts {
  const row = db
    .prepare(
      `select count(*) as total,
         coalesce(sum(case when reps = 0 then 1 else 0 end), 0) as new,
         coalesce(sum(case when reps > 0 and interval_days < ? then 1 else 0 end), 0) as learning,
         coalesce(sum(case when reps > 0 and interval_days >= ? then 1 else 0 end), 0) as mature,
         coalesce(sum(case when due <= ? then 1 else 0 end), 0) as dueNow
       from srs_cards`,
    )
    .get(MATURE_DAYS, MATURE_DAYS, nowIso) as { total: number; new: number; learning: number; mature: number; dueNow: number };
  const next = db.prepare("select min(due) as d from srs_cards where due > ?").get(nowIso) as { d: string | null };
  return { new: row.new, learning: row.learning, mature: row.mature, dueNow: row.dueNow, total: row.total, nextDue: next.d };
}

/** Fração das revisões com nota ≥ 3 desde `sinceIso`. */
export function reviewAccuracy(db: Db, sinceIso: string): RadarSample {
  return average(db, "select count(*) as n, avg(case when grade >= 3 then 1.0 else 0.0 end) as avg from srs_reviews where ts >= ?", sinceIso, 1);
}

/** Card criado a partir do glossário (`lesson_id = 'glossary'`); `unique (lesson_id, front)` impede duplicata. */
export function insertGlossaryCard(db: Db, card: { front: string; back: string; hint?: string; tag: string }, nowIso: string): { inserted: boolean; id: number } {
  const inserted = insertCards(db, "glossary", [card], nowIso) === 1;
  const row = db.prepare("select id from srs_cards where lesson_id = 'glossary' and front = ?").get(card.front) as { id: number };
  return { inserted, id: row.id };
}
```

(`average` já existe no arquivo como função privada `average(db, sql, sinceIso, divisor)`; `RadarSample` também.)

- [ ] **Step 4: Verifique**

Run: `pnpm test && pnpm typecheck`
Expected: PASS (158).

- [ ] **Step 5: Commit**

```bash
git add server/repo.ts tests/repo.test.ts
git commit -m "feat(server): fila, revisão e contagens do SRS no repositório"
```

---

### Task 3: Rotas `/api/srs`

**Files:**
- Modify: `server/app.ts`
- Test: `tests/srs-routes.test.ts` (novo)

**Interfaces:**
- Consumes: `sm2`, `maturity`, `Grade` (T1); `dueCards`, `getCard`, `applyReview`, `cardCounts`, `insertGlossaryCard` (T2).
- Produces: `GET /api/srs/queue?limit=` → `{ cards: CardRow[]; counts: CardCounts }`; `POST /api/srs/review { cardId, grade }` → `{ card: CardRow; maturity: Maturity; counts: CardCounts }` (404 card inexistente); `POST /api/srs/cards { front, back, hint?, tag }` → `{ inserted, id }`.

- [ ] **Step 1: Testes que falham** — crie `tests/srs-routes.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import type { Hono } from "hono";
import { createApp } from "../server/app.ts";
import { openDb, type Db } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";
import { localDayStart, addDays, localDate } from "../shared/local-date.ts";

const content = loadContent("content");
const lesson = content.lessons["M01-02"]!;
let app: Hono;
let db: Db;
let current = new Date(2026, 8, 10, 15, 0, 0).toISOString();
const now = () => current;
const at = (dayOffset: number, hour: number) => new Date(2026, 8, 10 + dayOffset, hour, 0, 0).toISOString();

beforeEach(() => {
  current = at(0, 15);
  db = openDb(":memory:");
  app = createApp({ db, content, now });
});
const json = (method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const queue = async (limit?: number) => (await app.request(`/api/srs/queue${limit === undefined ? "" : `?limit=${limit}`}`)).json();

/** Conclui a M01-02 pelas rotas de aula: quiz, escrita com nota, fala, complete. */
async function completeLesson() {
  await json("POST", `/api/lessons/${lesson.id}/start`);
  for (const q of lesson.quiz) await json("POST", "/api/attempts", { lessonId: lesson.id, exerciseId: q.id, block: "quiz", type: q.type, correct: true, answer: "x", tags: q.tags });
  await json("POST", `/api/lessons/${lesson.id}/writing`, { text: lesson.writing.model, selfScore: 4 });
  await json("POST", `/api/lessons/${lesson.id}/speaking`, { mode: "A", transcript: "I've been working on the pipeline. No blockers.", durationSec: 20 });
  const done = await (await json("POST", `/api/lessons/${lesson.id}/complete`)).json();
  expect(done.cardsInserted).toBe(lesson.srsCards.length);
}

describe("GET /api/srs/queue", () => {
  it("is empty without cards", async () => {
    expect(await queue()).toEqual({ cards: [], counts: { new: 0, learning: 0, mature: 0, dueNow: 0, total: 0, nextDue: null } });
  });
  it("lists the lesson's cards as due right after completion, honouring the limit", async () => {
    await completeLesson();
    const q = await queue();
    expect(q.cards).toHaveLength(lesson.srsCards.length);
    expect(q.counts).toMatchObject({ new: lesson.srsCards.length, dueNow: lesson.srsCards.length, nextDue: null });
    expect((await queue(5)).cards).toHaveLength(5);
    expect((await (await app.request("/api/srs/queue?limit=abc")).json()).cards).toHaveLength(lesson.srsCards.length);
  });
});

describe("POST /api/srs/review", () => {
  it("grade 4 schedules the card for tomorrow's local midnight and removes it from today's queue", async () => {
    await completeLesson();
    const first = (await queue()).cards[0];
    const res = await json("POST", "/api/srs/review", { cardId: first.id, grade: 4 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.card).toMatchObject({ id: first.id, reps: 1, interval_days: 1, ease: 2.5, due: localDayStart(addDays(localDate(current), 1)) });
    expect(body.maturity).toBe("learning");
    expect(body.counts).toMatchObject({ new: lesson.srsCards.length - 1, learning: 1, dueNow: lesson.srsCards.length - 1 });
    expect((await queue()).cards.map((c: { id: number }) => c.id)).not.toContain(first.id);
    current = at(1, 9);
    expect((await queue()).cards.map((c: { id: number }) => c.id)).toContain(first.id);
    expect((await (await app.request("/api/dashboard")).json()).week.progress.reviews).toBe(1);
  });
  it("grade 1 keeps the card due now with a lapse", async () => {
    await completeLesson();
    const first = (await queue()).cards[0];
    const body = await (await json("POST", "/api/srs/review", { cardId: first.id, grade: 1 })).json();
    expect(body.card).toMatchObject({ reps: 0, interval_days: 0, lapses: 1, due: current });
    expect(body.maturity).toBe("new");
    expect(body.counts.dueNow).toBe(lesson.srsCards.length);
    expect((await queue()).cards.map((c: { id: number }) => c.id)).toContain(first.id);
  });
  it("404 for an unknown card, 400 for an invalid body", async () => {
    expect((await json("POST", "/api/srs/review", { cardId: 999, grade: 4 })).status).toBe(404);
    expect((await json("POST", "/api/srs/review", { cardId: 1, grade: 7 })).status).toBe(400);
    expect((await json("POST", "/api/srs/review", { grade: 4 })).status).toBe(400);
  });
});

describe("POST /api/srs/cards", () => {
  it("adds a glossary card once and it shows up in the queue", async () => {
    const body = { front: "aviso rápido", back: "heads up", hint: "just a heads up", tag: "vocab.slack" };
    const first = await (await json("POST", "/api/srs/cards", body)).json();
    const second = await (await json("POST", "/api/srs/cards", body)).json();
    expect(first.inserted).toBe(true);
    expect(second).toEqual({ inserted: false, id: first.id });
    const q = await queue();
    expect(q.cards).toHaveLength(1);
    expect(q.cards[0]).toMatchObject({ lesson_id: "glossary", front: "aviso rápido", back: "heads up" });
    expect((await json("POST", "/api/srs/cards", { front: " ", back: "x", tag: "vocab.slack" })).status).toBe(400);
  });
});
```

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/srs-routes.test.ts`
Expected: FAIL — rotas 404 (o teste da fila vazia falha primeiro).

- [ ] **Step 3: Implemente em `server/app.ts`**

Imports: `import { sm2, maturity, type Grade } from "../shared/sm2.ts";` e acrescente `dueCards, getCard, applyReview, cardCounts, insertGlossaryCard` ao import de `./repo.ts`.

Nível de módulo (junto dos outros schemas):

```ts
const ReviewBody = z.object({ cardId: z.number().int().min(1), grade: z.number().int().min(0).max(5) });
const CardBody = z.object({
  front: z.string().trim().min(1),
  back: z.string().trim().min(1),
  hint: z.string().trim().min(1).optional(),
  tag: z.string().min(3),
});

/** `limit` da fila: inteiro entre 1 e 200; qualquer outra coisa vira 50. */
function sanitizeLimit(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.min(200, Math.floor(n)) : 50;
}
```

Sub-router, antes de `app.route("/api/lessons", lessons);`:

```ts
  // ---------- SRS ----------
  const srs = new Hono();

  srs.get("/queue", (c) => {
    const ts = now();
    return c.json({ cards: dueCards(db, ts, sanitizeLimit(c.req.query("limit"))), counts: cardCounts(db, ts) });
  });

  srs.post("/review", async (c) => {
    const parsed = ReviewBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    const card = getCard(db, parsed.data.cardId);
    if (!card) return c.json({ error: "card não encontrado" }, 404);
    const ts = now();
    const next = sm2({ ease: card.ease, intervalDays: card.interval_days, reps: card.reps, lapses: card.lapses }, parsed.data.grade as Grade, ts);
    applyReview(db, card.id, parsed.data.grade, next, ts);
    const updated = getCard(db, card.id)!;
    return c.json({ card: updated, maturity: maturity({ reps: updated.reps, intervalDays: updated.interval_days }), counts: cardCounts(db, ts) });
  });

  srs.post("/cards", async (c) => {
    const parsed = CardBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "corpo inválido", issues: parsed.error.issues }, 400);
    return c.json(insertGlossaryCard(db, parsed.data, now()));
  });

  app.route("/api/srs", srs);
```

- [ ] **Step 4: Verifique**

Run: `pnpm test && pnpm typecheck`
Expected: PASS (164).

- [ ] **Step 5: Commit**

```bash
git add server/app.ts tests/srs-routes.test.ts
git commit -m "feat(server): rotas do SRS (fila, revisão, card do glossário)"
```

---

### Task 4: Painel com `srs`

**Files:**
- Modify: `server/dashboard.ts`
- Test: `tests/dashboard.test.ts`

**Interfaces:**
- Consumes: `cardCounts`, `reviewAccuracy`, `CardCounts`, `insertCards`, `applyReview` (T2).
- Produces: `Dashboard.srs: CardCounts & { accuracy30d: RadarSample }`.

- [ ] **Step 1: Testes que falham** — em `tests/dashboard.test.ts`, estenda o import de `../server/repo.ts` com `insertCards, applyReview` e:

1. No teste "is empty but well-formed with no data", acrescente:

```ts
    expect(d.srs).toEqual({ new: 0, learning: 0, mature: 0, dueNow: 0, total: 0, nextDue: null, accuracy30d: { value: null, samples: 0 } });
```

2. Novo `describe`:

```ts
describe("dashboard srs", () => {
  it("counts cards by maturity, due now, next due and 30-day accuracy", async () => {
    insertCards(db, "M01-02", [{ front: "a", back: "A", tag: "vocab.standup" }, { front: "b", back: "B", tag: "vocab.standup" }], at(-2, 10));
    const [a, b] = (db.prepare("select id from srs_cards order by id").all() as { id: number }[]).map((r) => r.id);
    applyReview(db, a!, 4, { ease: 2.5, intervalDays: 1, reps: 1, lapses: 0, due: at(1, 0) }, at(-1, 10));
    applyReview(db, b!, 1, { ease: 1.96, intervalDays: 0, reps: 0, lapses: 1, due: at(-1, 10) }, at(-1, 10));
    const d = await dashboard();
    expect(d.srs).toEqual({ new: 1, learning: 1, mature: 0, dueNow: 1, total: 2, nextDue: at(1, 0), accuracy30d: { value: 0.5, samples: 2 } });
    expect(d.week.progress.reviews).toBe(2);
  });
});
```

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/dashboard.test.ts`
Expected: FAIL — `d.srs` undefined.

- [ ] **Step 3: Implemente em `server/dashboard.ts`**

Import: acrescente `cardCounts, reviewAccuracy, type CardCounts` ao import de `./repo.ts`. No tipo `Dashboard`, adicione `srs: CardCounts & { accuracy30d: RadarSample };`. Em `buildDashboard`, antes do `return`:

```ts
  const srs = { ...cardCounts(db, nowIso), accuracy30d: reviewAccuracy(db, since) };
```

e inclua `srs,` no objeto retornado (depois de `timeline`).

- [ ] **Step 4: Verifique**

Run: `pnpm test && pnpm typecheck`
Expected: PASS (165).

- [ ] **Step 5: Commit**

```bash
git add server/dashboard.ts tests/dashboard.test.ts
git commit -m "feat(server): contagens e acerto do SRS no painel"
```

---

### Task 5: Glossário — schema, loader, conteúdo `daily.yaml` e lógica pura

**Files:**
- Create: `content/glossary/daily.yaml`, `shared/glossary.ts`
- Modify: `shared/schema.ts`, `shared/content-loader.ts`
- Test: `tests/glossary-content.test.ts` (novo), `tests/content-loader.test.ts` (1 asserção)

**Interfaces:**
- Produces (`shared/schema.ts`): `GlossaryEntrySchema`/`GlossaryEntry`, `GlossaryFileSchema`/`GlossaryFile`, `ContentBundle.glossary: GlossaryFile[]`.
- Produces (`shared/glossary.ts`): `GlossarySource { kind: "theme" | "lesson"; id: string; label: string }`, `GlossaryItem`, `normalize(s): string`, `buildGlossary(content): GlossaryItem[]`, `matches(item, query): boolean`.
- `loadContent` lê `content/glossary/*.yaml` (diretório opcional); `crossValidate` cobre ids e termos duplicados e tags.

- [ ] **Step 1: Testes que falham** — crie `tests/glossary-content.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { loadContent, crossValidate } from "../shared/content-loader.ts";
import { buildGlossary, matches, normalize } from "../shared/glossary.ts";

const bundle = loadContent("content");
const daily = bundle.glossary.find((g) => g.id === "daily")!;
const items = buildGlossary(bundle);

describe("content/glossary/daily.yaml", () => {
  it("has at least 20 curated entries with meaning, example and known tags", () => {
    expect(daily).toBeDefined();
    expect(daily.entries.length).toBeGreaterThanOrEqual(20);
    for (const e of daily.entries) {
      expect(e.meaning.length, e.term).toBeGreaterThan(0);
      expect(e.examples.length, e.term).toBeGreaterThanOrEqual(1);
      expect(e.tags.length, e.term).toBeGreaterThanOrEqual(1);
    }
    expect(crossValidate(bundle)).toEqual([]);
  });
  it("has unique terms (case-insensitive)", () => {
    const terms = daily.entries.map((e) => e.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
  });
  it("crossValidate reports a duplicated term and an unknown tag", () => {
    const broken = structuredClone(bundle);
    const g = broken.glossary[0]!;
    g.entries.push({ ...g.entries[0]!, term: g.entries[0]!.term.toUpperCase(), tags: ["vocab.nope"] });
    const problems = crossValidate(broken);
    expect(problems.some((p) => p.includes("termo duplicado"))).toBe(true);
    expect(problems.some((p) => p.includes("vocab.nope"))).toBe(true);
  });
});

describe("buildGlossary", () => {
  it("merges curated entries with every lesson's vocabulary and sorts by term", () => {
    const themed = items.filter((i) => i.source.kind === "theme");
    const fromLesson = items.filter((i) => i.source.kind === "lesson");
    expect(themed).toHaveLength(daily.entries.length);
    expect(fromLesson).toHaveLength(bundle.lessons["M01-02"]!.vocabulary.length);
    expect(fromLesson[0]!.source).toEqual({ kind: "lesson", id: "M01-02", label: "Aula M01-02" });
    expect(fromLesson.every((i) => i.tags.length > 0 && i.examples.length === 1)).toBe(true);
    const terms = items.map((i) => normalize(i.term));
    expect(terms).toEqual([...terms].sort());
  });
  it("gives lesson items the lesson's vocab.* tags and the note as pitfall", () => {
    const item = items.find((i) => i.source.kind === "lesson" && i.term.startsWith("I've been working on"))!;
    expect(item.tags).toEqual(["vocab.standup"]);
    expect(item.pitfalls).toEqual(['Nunca "I\'m working on X since yesterday".']);
    expect(item.examples[0]!.pt).toContain("migração");
  });
});

describe("normalize / matches", () => {
  it("ignores accents and case", () => {
    expect(normalize("Ação É")).toBe("acao e");
  });
  it("searches term, meaning, definition, examples and collocations", () => {
    const headsUp = items.find((i) => i.term === "heads up")!;
    expect(matches(headsUp, "")).toBe(true);
    expect(matches(headsUp, "HEADS")).toBe(true);
    expect(matches(headsUp, "aviso")).toBe(true);
    expect(matches(headsUp, "deploy window")).toBe(true);
    expect(matches(headsUp, "just a heads up")).toBe(true);
    expect(matches(headsUp, "kubernetes")).toBe(false);
  });
});
```

Em `tests/content-loader.test.ts`, dentro de `describe("loadContent(content/)")`, acrescente:

```ts
  it("loads the curated glossary themes", () => {
    expect(bundle.glossary.map((g) => g.id)).toEqual(["daily"]);
  });
```

- [ ] **Step 2: Rode para ver falhar**

Run: `pnpm test tests/glossary-content.test.ts tests/content-loader.test.ts`
Expected: FAIL — `shared/glossary.ts` inexistente; `bundle.glossary` undefined.

- [ ] **Step 3: Schema** — em `shared/schema.ts`, antes de `// ---------- Bundle consumido pelo cliente e servidor ----------`:

```ts
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
```

Em `ContentBundle`, acrescente `glossary: GlossaryFile[];`.

- [ ] **Step 4: Loader** — em `shared/content-loader.ts`: importe `GlossaryFileSchema` e `type GlossaryFile` de `./schema.ts`. Em `loadContent`, depois do laço de módulos:

```ts
  const glossary: GlossaryFile[] = [];
  const glossaryDir = join(root, "glossary");
  if (existsSync(glossaryDir)) {
    for (const file of readdirSync(glossaryDir).filter((f) => f.endsWith(".yaml")).sort()) {
      const theme = readYaml(join(glossaryDir, file), GlossaryFileSchema, problems);
      if (theme) glossary.push(theme);
    }
  }
```

e inclua `glossary` no objeto retornado. Em `crossValidate`, antes do laço de `bundle.modules`:

```ts
  const glossaryIds = new Set<string>();
  for (const theme of bundle.glossary) {
    if (glossaryIds.has(theme.id)) problems.push(`glossary: id duplicado '${theme.id}'`);
    glossaryIds.add(theme.id);
    const terms = new Set<string>();
    for (const entry of theme.entries) {
      const key = entry.term.trim().toLowerCase();
      if (terms.has(key)) problems.push(`glossary ${theme.id}: termo duplicado '${entry.term}'`);
      terms.add(key);
      checkTags(`glossary ${theme.id}.${entry.term}`, entry.tags);
    }
  }
```

- [ ] **Step 5: `shared/glossary.ts`**

```ts
import type { ContentBundle, Register } from "./schema.ts";

export type GlossarySource = { kind: "theme" | "lesson"; id: string; label: string };
export type GlossaryItem = {
  key: string;
  term: string;
  meaning: string;
  definition?: string;
  examples: Array<{ en: string; pt?: string }>;
  collocations: string[];
  pronunciation?: string;
  pitfalls: string[];
  register: Register;
  tags: string[];
  source: GlossarySource;
};

/** Minúsculas sem diacríticos, para busca e ordenação. */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Entradas curadas dos temas + vocabulário de cada aula com conteúdo, ordenadas por termo. */
export function buildGlossary(content: Pick<ContentBundle, "glossary" | "lessons">): GlossaryItem[] {
  const items: GlossaryItem[] = [];
  for (const theme of content.glossary) {
    for (const e of theme.entries) {
      items.push({ key: `${theme.id}:${normalize(e.term)}`, ...e, source: { kind: "theme", id: theme.id, label: theme.title } });
    }
  }
  for (const lesson of Object.values(content.lessons).sort((a, b) => a.id.localeCompare(b.id))) {
    const vocabTags = lesson.tags.filter((t) => t.startsWith("vocab."));
    for (const v of lesson.vocabulary) {
      items.push({
        key: `${lesson.id}:${normalize(v.term)}`,
        term: v.term,
        meaning: v.meaning,
        examples: [v.translation ? { en: v.example, pt: v.translation } : { en: v.example }],
        collocations: [],
        pitfalls: v.note ? [v.note] : [],
        register: v.register,
        tags: vocabTags.length > 0 ? vocabTags : ["comp.vocabulary"],
        source: { kind: "lesson", id: lesson.id, label: `Aula ${lesson.id}` },
      });
    }
  }
  return items.sort((a, b) => normalize(a.term).localeCompare(normalize(b.term)));
}

/** Busca sem acento e sem caixa em termo, significado, definição, exemplos (EN) e colocações. Consulta vazia casa tudo. */
export function matches(item: GlossaryItem, query: string): boolean {
  const q = normalize(query);
  if (q === "") return true;
  const haystack = [item.term, item.meaning, item.definition ?? "", ...item.examples.map((x) => x.en), ...item.collocations];
  return haystack.some((h) => normalize(h).includes(q));
}
```

- [ ] **Step 6: Conteúdo** — crie `content/glossary/daily.yaml` exatamente com:

```yaml
# Glossário curado — tema "dia a dia". Cada entrada: significado em português, definição curta em inglês,
# exemplos reais com tradução, colocações, pronúncia aproximada para brasileiros, armadilhas, registro e tags.
id: daily
title: "Dia a dia: standup e Slack"
entries:
  - term: heads up
    meaning: aviso rápido de algo que vai acontecer ou mudar
    definition: a short advance warning about something
    examples:
      - { en: "Heads up: the deploy window moved to 3 pm.", pt: "Aviso: a janela de deploy mudou para 15h." }
      - { en: "Just a heads up, I'll be out tomorrow morning.", pt: "Só avisando: não estarei amanhã de manhã." }
    collocations: ["quick heads up", "just a heads up", "heads up that…"]
    pronunciation: "HEDZ-âp"
    pitfalls: ["Não é pergunta nem pedido: é aviso. Para pedir atenção, use \"FYI\" ou \"please note\"."]
    register: informal
    tags: [vocab.slack]
  - term: FYI
    meaning: "para sua informação (sem ação esperada)"
    definition: for your information; no action required
    examples:
      - { en: "FYI, the staging database will be down for 10 minutes at noon.", pt: "Para sua informação, o banco de staging vai ficar fora por 10 minutos ao meio-dia." }
    collocations: ["FYI only", "just FYI", "FYI: …"]
    pronunciation: "éf-uái-ái"
    pitfalls: ["Não use quando espera resposta ou ação; aí é \"could you…\" ou \"please…\"."]
    register: neutral
    tags: [vocab.slack]
  - term: TL;DR
    meaning: resumo de uma mensagem longa, no começo ou no fim
    definition: too long; didn't read — a one-line summary
    examples:
      - { en: "TL;DR: the deploy is postponed to Thursday; details below.", pt: "Resumindo: o deploy foi adiado para quinta; detalhes abaixo." }
    collocations: ["TL;DR:", "the TL;DR is…"]
    pronunciation: "tí-él-dí-ár"
    pitfalls: ["Escreve-se com ponto e vírgula. Vem seguido de dois-pontos e uma frase só."]
    register: informal
    tags: [vocab.slack]
  - term: on it
    meaning: "estou cuidando disso (resposta a um pedido)"
    definition: I'm handling it right now
    examples:
      - { en: "Can someone restart the runner? — On it.", pt: "Alguém pode reiniciar o runner? — Já estou nisso." }
    collocations: ["I'm on it", "on it, give me 5 minutes"]
    pronunciation: "ón it"
    pitfalls: ["Não confundir com \"I'm in it\"; a preposição é \"on\"."]
    register: informal
    tags: [vocab.slack]
  - term: will do
    meaning: "pode deixar, farei (aceitando um pedido)"
    definition: I will do that
    examples:
      - { en: "Please update the ticket when you're done. — Will do.", pt: "Atualiza o ticket quando terminar. — Pode deixar." }
    collocations: ["will do!", "sure, will do"]
    pronunciation: "uíl du"
    pitfalls: ["Só como resposta curta; não inicia uma frase completa."]
    register: informal
    tags: [vocab.slack]
  - term: ETA
    meaning: previsão de quando algo fica pronto ou chega
    definition: estimated time of arrival; when something is expected to be done
    examples:
      - { en: "What's the ETA on the fix? — Around 4 pm.", pt: "Qual a previsão do fix? — Por volta das 16h." }
    collocations: ["ETA on X", "give me an ETA", "no ETA yet"]
    pronunciation: "í-tí-êi"
    pitfalls: ["Fala-se letra a letra. Pede-se \"an ETA on\" algo, não \"of\"."]
    register: neutral
    tags: [vocab.standup]
  - term: EOD
    meaning: "fim do dia (de trabalho); usado como prazo"
    definition: end of day
    examples:
      - { en: "I'll have the PR up by EOD.", pt: "Vou abrir o PR até o fim do dia." }
      - { en: "Send me the numbers by EOD my time, please.", pt: "Me manda os números até o fim do meu dia, por favor." }
    collocations: ["by EOD", "EOD my time", "EOD Friday"]
    pronunciation: "í-ou-dí"
    pitfalls: ["Prazo é \"by EOD\", nunca \"until EOD\". Em times distribuídos, diga de quem é o dia: \"EOD my time\"."]
    register: neutral
    tags: [vocab.standup, vocab.slack]
  - term: blocker
    meaning: algo que impede o trabalho de avançar
    definition: something that prevents progress
    examples:
      - { en: "No blockers on my side.", pt: "Sem bloqueios do meu lado." }
      - { en: "My main blocker is the missing IAM permission.", pt: "Meu principal bloqueio é a permissão IAM que falta." }
    collocations: ["no blockers", "hit a blocker", "raise a blocker", "main blocker"]
    pronunciation: "BLÓ-ker"
    pitfalls: ["\"blocker\" é a coisa; a pessoa está \"blocked\". Não diga \"I have a block\"."]
    register: neutral
    tags: [vocab.standup]
  - term: blocked on
    meaning: travado por causa de algo específico
    definition: unable to proceed because of something
    examples:
      - { en: "I'm blocked on the security review.", pt: "Estou travado na revisão de segurança." }
    collocations: ["blocked on X", "still blocked on", "no longer blocked"]
    pronunciation: "blókt ón"
    pitfalls: ["\"blocked by Ana\" soa acusatório; prefira \"blocked on the review\" (a coisa, não a pessoa)."]
    register: neutral
    tags: [vocab.standup]
  - term: waiting on
    meaning: esperando alguém ou algo para continuar
    definition: waiting for someone or something before continuing
    examples:
      - { en: "Still waiting on the network team to open the port.", pt: "Ainda esperando o time de rede liberar a porta." }
    collocations: ["waiting on a review", "waiting on approval", "waiting for X"]
    pronunciation: "UÊI-ting ón"
    pitfalls: ["Nunca sem preposição (\"waiting the team\" é calque). \"waiting for\" também vale."]
    register: neutral
    tags: [vocab.standup]
  - term: pair with
    meaning: trabalhar junto com alguém numa tarefa (pair programming, pair debugging)
    definition: to work together with someone on a task
    examples:
      - { en: "Can you pair with me on the Helm chart after lunch?", pt: "Você pode fazer par comigo no chart do Helm depois do almoço?" }
    collocations: ["pair with someone on X", "pairing session", "let's pair"]
    pronunciation: "pér uíth"
    pitfalls: ["\"pair\" é verbo aqui; \"make a pair\" não se usa nesse sentido."]
    register: neutral
    tags: [vocab.standup]
  - term: ping
    meaning: chamar alguém rapidamente por mensagem
    definition: to send someone a quick message to get their attention
    examples:
      - { en: "Ping me when the pipeline is green.", pt: "Me chama quando o pipeline ficar verde." }
    collocations: ["ping me", "I'll ping you", "quick ping"]
    pronunciation: "ping"
    pitfalls: ["É mensagem, não ligação. Para ligar, diga \"call me\"."]
    register: informal
    tags: [vocab.slack]
  - term: loop in
    meaning: incluir alguém na conversa ou no assunto
    definition: to include someone in a conversation or decision
    examples:
      - { en: "Let's loop in Priya, she owns that service.", pt: "Vamos incluir a Priya, ela é dona desse serviço." }
      - { en: "Keep me in the loop on the migration.", pt: "Me mantém informado sobre a migração." }
    collocations: ["loop someone in", "keep me in the loop", "out of the loop"]
    pronunciation: "lup in"
    pitfalls: ["Verbo separável: \"loop Priya in\" ou \"loop in Priya\". \"in the loop\" é o estado."]
    register: informal
    tags: [vocab.slack]
  - term: follow up
    meaning: "dar continuidade a algo; cobrar uma resposta"
    definition: to check on or continue something later
    examples:
      - { en: "I'll follow up with the vendor tomorrow.", pt: "Vou cobrar o fornecedor amanhã." }
      - { en: "Quick follow-up on yesterday's incident.", pt: "Rápido acompanhamento do incidente de ontem." }
    collocations: ["follow up on X", "follow up with someone", "a follow-up (substantivo)"]
    pronunciation: "FÓ-lou âp"
    pitfalls: ["Verbo em duas palavras (follow up); substantivo com hífen (follow-up)."]
    register: neutral
    tags: [vocab.slack]
  - term: circle back
    meaning: voltar a um assunto mais tarde
    definition: to return to a topic later
    examples:
      - { en: "Let's circle back on this after the release.", pt: "Vamos voltar a isso depois do release." }
    collocations: ["circle back on X", "circle back later"]
    pronunciation: "SÂR-col bék"
    pitfalls: ["Jargão corporativo; em texto formal prefira \"revisit\"."]
    register: informal
    tags: [vocab.slack]
  - term: push back
    meaning: discordar de uma decisão ou prazo com argumentos
    definition: to resist or challenge a request or decision
    examples:
      - { en: "I pushed back on the deadline; two weeks isn't realistic.", pt: "Contestei o prazo; duas semanas não é realista." }
    collocations: ["push back on X", "get pushback", "some pushback from the team"]
    pronunciation: "push bék"
    pitfalls: ["Não é \"empurrar\". Substantivo é \"pushback\", uma palavra."]
    register: neutral
    tags: [vocab.slack]
  - term: flaky
    meaning: "instável, que falha de forma intermitente"
    definition: unreliable; failing intermittently
    examples:
      - { en: "That test is flaky; it fails one run in five.", pt: "Esse teste é instável; falha uma rodada em cinco." }
    collocations: ["flaky test", "flaky pipeline", "flakiness"]
    pronunciation: "FLÊI-ki"
    pitfalls: ["Não confundir com \"fake\". \"flaky\" é sobre inconsistência, não sobre ser falso."]
    register: informal
    tags: [vocab.ci]
  - term: rollback
    meaning: voltar para a versão anterior depois de um deploy ruim
    definition: reverting to the previous version
    examples:
      - { en: "We did a rollback to 1.41 within five minutes.", pt: "Fizemos rollback para a 1.41 em cinco minutos." }
      - { en: "Roll back first, investigate later.", pt: "Primeiro volta a versão, depois investiga." }
    collocations: ["roll back (verbo)", "rollback plan", "automatic rollback"]
    pronunciation: "RÔUL-bék"
    pitfalls: ["Verbo em duas palavras (roll back); substantivo junto (rollback)."]
    register: neutral
    tags: [vocab.ci]
  - term: hotfix
    meaning: correção urgente aplicada direto em produção
    definition: an urgent fix deployed straight to production
    examples:
      - { en: "We shipped a hotfix for the login bug last night.", pt: "Subimos um hotfix para o bug de login ontem à noite." }
    collocations: ["ship a hotfix", "hotfix branch", "hotfix release"]
    pronunciation: "RÓT-fiks"
    pitfalls: ["Uma palavra só. Não é qualquer correção: é urgente e fora do ciclo normal."]
    register: neutral
    tags: [vocab.ci]
  - term: handover
    meaning: "passagem de contexto para quem assume (plantão, tarefa)"
    definition: the transfer of responsibility and context to someone else
    examples:
      - { en: "Here's the handover for tonight's on-call: two open alerts, one silenced.", pt: "Aqui está a passagem para o plantão de hoje: dois alertas abertos, um silenciado." }
    collocations: ["handover notes", "do a handover", "hand over (verbo)"]
    pronunciation: "RÉND-ôuver"
    pitfalls: ["\"hand over\" é o verbo; \"handover\" o substantivo. Nos EUA, \"handoff\" é sinônimo."]
    register: neutral
    tags: [vocab.incident]
  - term: on-call
    meaning: de plantão
    definition: responsible for responding to incidents during a period
    examples:
      - { en: "I'm on call this week, so ping me for anything urgent.", pt: "Estou de plantão esta semana; me chama para qualquer urgência." }
      - { en: "The on-call engineer acknowledged the page in two minutes.", pt: "O engenheiro de plantão reconheceu o alerta em dois minutos." }
    collocations: ["on-call rotation", "be on call", "on-call engineer"]
    pronunciation: "ón-cól"
    pitfalls: ["Sem hífen como predicado (\"I'm on call\"); com hífen como adjetivo (\"on-call engineer\")."]
    register: neutral
    tags: [vocab.incident]
  - term: parking lot
    meaning: lista de assuntos deixados para depois da reunião
    definition: a list of topics set aside to discuss later
    examples:
      - { en: "Let's put that in the parking lot and discuss after standup.", pt: "Vamos deixar isso para depois e discutir após o standup." }
    collocations: ["parking lot item", "put it in the parking lot"]
    pronunciation: "PÁR-king lót"
    pitfalls: ["Aqui não é estacionamento: é a pauta do \"depois\"."]
    register: neutral
    tags: [vocab.standup]
  - term: action item
    meaning: tarefa combinada em reunião, com dono e prazo
    definition: a task assigned to someone as a result of a meeting
    examples:
      - { en: "Action item: Marcos updates the runbook by Friday.", pt: "Ação combinada: Marcos atualiza o runbook até sexta." }
    collocations: ["assign an action item", "action items from the retro", "open action items"]
    pronunciation: "ÉK-chân ÁI-tem"
    pitfalls: ["Sempre com dono e prazo; sem isso é só uma ideia."]
    register: neutral
    tags: [vocab.standup]
  - term: nit
    meaning: "detalhe pequeno num code review, que não bloqueia a aprovação"
    definition: a minor, non-blocking review comment (from nitpick)
    examples:
      - { en: "Nit: rename tmp to something more descriptive.", pt: "Detalhe: renomeie tmp para algo mais descritivo." }
    collocations: ["nit:", "just a nit", "non-blocking nit"]
    pronunciation: "nit"
    pitfalls: ["Marca um comentário como opcional. Não use para problemas reais."]
    register: informal
    tags: [vocab.tickets-prs]
  - term: LGTM
    meaning: "\"looks good to me\": aprovado"
    definition: looks good to me — approval on a review
    examples:
      - { en: "LGTM, just fix the nit before merging.", pt: "Aprovado, só corrige o detalhe antes de mesclar." }
    collocations: ["LGTM!", "LGTM with one nit", "LGTM once CI is green"]
    pronunciation: "él-dji-tí-ém"
    pitfalls: ["Só quando você revisou de verdade; \"LGTM\" sem ler é má prática conhecida."]
    register: informal
    tags: [vocab.tickets-prs]
  - term: WIP
    meaning: "trabalho em andamento; ainda não é para revisar ou mesclar"
    definition: work in progress
    examples:
      - { en: "WIP: do not merge, still adding tests.", pt: "Em andamento: não mesclar, ainda adicionando testes." }
    collocations: ["WIP PR", "mark as WIP", "still WIP"]
    pronunciation: "uíp"
    pitfalls: ["Prefira o modo rascunho (draft PR) quando a ferramenta tiver; \"WIP\" no título é o fallback."]
    register: neutral
    tags: [vocab.tickets-prs]
  - term: quick question
    meaning: abertura para uma pergunta curta
    definition: a short question that should not take long
    examples:
      - { en: "Quick question: do we still need the legacy bucket?", pt: "Pergunta rápida: ainda precisamos do bucket antigo?" }
    collocations: ["quick question:", "one quick question", "quick q"]
    pronunciation: "kuík KUÉS-tchân"
    pitfalls: ["Nunca \"I have a doubt\" para perguntar: \"doubt\" é desconfiança."]
    register: neutral
    tags: [vocab.slack]
  - term: no worries
    meaning: "sem problema (resposta a desculpa ou agradecimento)"
    definition: it's fine; don't worry about it
    examples:
      - { en: "Sorry for the late reply. — No worries.", pt: "Desculpa a demora. — Sem problema." }
    collocations: ["no worries at all", "no worries, take your time"]
    pronunciation: "nou UÂ-riz"
    pitfalls: ["Resposta a \"sorry\" ou \"thanks\". \"No problem\" é equivalente."]
    register: informal
    tags: [vocab.slack]
  - term: my bad
    meaning: "foi erro meu (admissão rápida e informal)"
    definition: my mistake
    examples:
      - { en: "My bad, I pushed to the wrong branch.", pt: "Foi mal, fiz push na branch errada." }
    collocations: ["my bad!", "sorry, my bad"]
    pronunciation: "mai béd"
    pitfalls: ["Só informal. Em post-mortem ou e-mail, diga \"that was my mistake\"."]
    register: informal
    tags: [vocab.slack]
  - term: sounds good
    meaning: "combinado, está bom para mim"
    definition: I agree; that works for me
    examples:
      - { en: "Let's sync at 2 pm? — Sounds good.", pt: "Vamos alinhar às 14h? — Combinado." }
    collocations: ["sounds good to me", "sounds good, thanks"]
    pronunciation: "saundz gud"
    pitfalls: ["\"sounds good\", não \"sounds well\" (adjetivo, não advérbio)."]
    register: informal
    tags: [vocab.slack]
```

- [ ] **Step 7: Verifique**

Run: `pnpm content:build && pnpm test && pnpm typecheck`
Expected: `gerado src/generated/content.json (1 aula(s) com conteúdo)`; PASS (165 + 6 + 1 = 172). Se `crossValidate` acusar tag desconhecida, a tag está errada no YAML (todas as usadas — `vocab.slack`, `vocab.standup`, `vocab.ci`, `vocab.incident`, `vocab.tickets-prs` — existem em `content/tags.yaml`); corrija o YAML, não o teste.

- [ ] **Step 8: Commit**

```bash
git add content/glossary/daily.yaml shared/glossary.ts shared/schema.ts shared/content-loader.ts tests/glossary-content.test.ts tests/content-loader.test.ts
git commit -m "content(glossary): tema daily com 30 termos; schema, loader e busca do glossário"
```

---

### Task 6: Cliente — API, rotas, navegação e página de revisão

**Files:**
- Modify: `src/lib/api.ts`, `src/App.tsx`, `src/components/Layout.tsx`
- Create: `src/pages/Review.tsx`, `src/pages/Glossary.tsx` (placeholder, substituído na T7)

**Interfaces:**
- Consumes: rotas da T3; `GRADE_BUTTONS`, `previewIntervals`, `CardState`, `Maturity` (T1); `CardRow`, `CardCounts` (T2); `speak`, `isSpeechSynthesisSupported` (`src/lib/speech.ts`); `tagLabel` (`src/lib/content.ts`).
- Produces: `api.srsQueue(limit?)`, `api.srsReview(cardId, grade)`, `api.addCard(body)`; tipos reexportados `CardRow`, `CardCounts`, `Maturity`; rotas `/review` e `/glossary`; nav Painel · Trilha · Revisar · Glossário · Teste inicial.
- Sem teste automatizado (UI). Verificação: `pnpm typecheck && pnpm build && pnpm test`.

- [ ] **Step 1: `src/lib/api.ts`** — acrescente aos imports:

```ts
import type { CardCounts, CardRow } from "../../server/repo.ts";
import type { Maturity } from "../../shared/sm2.ts";
```

Na linha `export type { ... }`, acrescente `CardRow, CardCounts, Maturity`. No objeto `api`, depois de `heartbeat`:

```ts
  // SRS
  srsQueue: (limit = 50) => request<{ cards: CardRow[]; counts: CardCounts }>(`/api/srs/queue?limit=${limit}`),
  srsReview: (cardId: number, grade: number) => post<{ card: CardRow; maturity: Maturity; counts: CardCounts }>("/api/srs/review", { cardId, grade }),
  addCard: (body: { front: string; back: string; hint?: string; tag: string }) => post<{ inserted: boolean; id: number }>("/api/srs/cards", body),
```

- [ ] **Step 2: Rotas e navegação**

`src/App.tsx`: importe `Review` de `./pages/Review.tsx` e `Glossary` de `./pages/Glossary.tsx`; acrescente aos `children`, antes de `placement`:

```tsx
      { path: "review", element: <Review /> },
      { path: "glossary", element: <Glossary /> },
```

`src/components/Layout.tsx`, na `<nav>`, entre Trilha e Teste inicial:

```tsx
            <NavLink to="/review" className={linkClass}>Revisar</NavLink>
            <NavLink to="/glossary" className={linkClass}>Glossário</NavLink>
```

`src/pages/Glossary.tsx` (placeholder):

```tsx
export function Glossary() {
  return <p className="text-slate-500">Glossário: em construção.</p>;
}
```

- [ ] **Step 3: `src/pages/Review.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { GRADE_BUTTONS, previewIntervals, type CardState } from "../../shared/sm2.ts";
import { api, type CardCounts, type CardRow } from "../lib/api.ts";
import { tagLabel } from "../lib/content.ts";
import { isSpeechSynthesisSupported, speak } from "../lib/speech.ts";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";
import { ProgressBar } from "../components/ui/ProgressBar.tsx";

const intervalLabel = (days: number) => (days === 0 ? "agora" : days === 1 ? "em 1 dia" : `em ${days} dias`);
const sourceLabel = (lessonId: string) => (lessonId === "glossary" ? "Glossário" : `Aula ${lessonId}`);
const toState = (c: CardRow): CardState => ({ ease: c.ease, intervalDays: c.interval_days, reps: c.reps, lapses: c.lapses });

export function Review() {
  const [queue, setQueue] = useState<CardRow[] | null>(null);
  const [counts, setCounts] = useState<CardCounts | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [again, setAgain] = useState(0);
  const [done, setDone] = useState(0);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Busca a fila e zera a rodada. */
  const load = useCallback(() => {
    setQueue(null); setIndex(0); setRevealed(false); setAgain(0); setDone(0); setFinished(false); setError(null);
    api.srsQueue().then((r) => { setQueue(r.cards); setCounts(r.counts); }).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const current = queue && !finished ? queue[index] : undefined;
  const preview = current ? previewIntervals(toState(current)) : null;

  const grade = useCallback(async (g: number) => {
    if (!current || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await api.srsReview(current.id, g);
      setCounts(res.counts);
      if (g < 3) setAgain((n) => n + 1);
      setDone((n) => n + 1);
      setRevealed(false);
      if (index + 1 >= (queue?.length ?? 0)) setFinished(true);
      else setIndex((i) => i + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [current, busy, index, queue]);

  // Atalhos: Espaço/Enter mostra o verso; 1–4 dão a nota.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) { e.preventDefault(); setRevealed(true); return; }
      if (revealed && /^[1-4]$/.test(e.key)) { e.preventDefault(); void grade(GRADE_BUTTONS[Number(e.key) - 1]!.grade); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, revealed, grade]);

  const header = counts && (
    <p className="text-sm text-slate-600">
      {counts.dueNow} para revisar · novos {counts.new} · aprendendo {counts.learning} · maduros {counts.mature}
    </p>
  );

  if (error && !queue) return <p className="text-rose-700">Servidor não respondeu ({error}).</p>;
  if (!queue || !counts) return <p className="text-slate-500">Carregando fila…</p>;

  if (queue.length === 0 || finished) {
    const nothingYet = counts.total === 0;
    const remaining = counts.dueNow;
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Revisão</h1>
        {header}
        <Card>
          {finished && <p className="text-lg font-medium">Rodada concluída: {done} card(s), {again} errado(s).</p>}
          {nothingYet
            ? <p className="mt-2 text-slate-600">Nenhum card ainda. Conclua uma aula ou adicione termos do glossário.</p>
            : remaining > 0
              ? <p className="mt-2 text-slate-600">{remaining} card(s) ainda vencido(s) (os errados voltam para a fila).</p>
              : <p className="mt-2 text-slate-600">Fila vazia. Próximo card: {counts.nextDue ? new Date(counts.nextDue).toLocaleDateString("pt-BR") : "—"}.</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            {remaining > 0 && <Button onClick={load}>Revisar os vencidos ({remaining})</Button>}
            <Link to="/" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">Painel</Link>
            <Link to={nothingYet ? "/trilha" : "/glossary"} className="rounded-md px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">{nothingYet ? "Trilha" : "Glossário"}</Link>
          </div>
        </Card>
      </div>
    );
  }

  const card = current!;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Revisão</h1>
      {header}
      <ProgressBar value={done / queue.length} />
      <p className="text-xs text-slate-500">Card {index + 1} de {queue.length} · {sourceLabel(card.lesson_id)} · <Badge>{tagLabel(card.tag)}</Badge></p>
      <Card className="min-h-56">
        <p className="text-xs uppercase tracking-wide text-slate-500">Como você diria</p>
        <p className="mt-2 text-2xl">{card.front}</p>
        {revealed ? (
          <div className="mt-6 space-y-2 border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl font-medium text-indigo-800">{card.back}</p>
              {isSpeechSynthesisSupported() && <Button variant="ghost" onClick={() => { speak(card.back).catch(() => undefined); }}>▶ Ouvir</Button>}
            </div>
            {card.hint && <p className="text-sm text-slate-600">Dica: {card.hint}</p>}
          </div>
        ) : (
          <Button className="mt-6" onClick={() => setRevealed(true)}>Mostrar (Espaço)</Button>
        )}
      </Card>
      {revealed && preview && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADE_BUTTONS.map((b, i) => (
            <Button key={b.key} variant={b.key === "again" ? "secondary" : "primary"} disabled={busy} onClick={() => grade(b.grade)}>
              {b.label} <span className="text-xs opacity-80">· {intervalLabel(preview[b.key])} · {i + 1}</span>
            </Button>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-rose-700">Não foi possível salvar ({error}). Tente de novo.</p>}
    </div>
  );
}
```

- [ ] **Step 4: Verifique**

Run: `pnpm typecheck && pnpm build && pnpm test`
Expected: PASS (172 testes; build ok). `pnpm dev` + `curl -s http://localhost:5173/review | head -3` responde HTML.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts src/App.tsx src/components/Layout.tsx src/pages/Review.tsx src/pages/Glossary.tsx
git commit -m "feat(client): tela de revisão diária com SM-2, áudio e atalhos"
```

---

### Task 7: Cliente — glossário e card de SRS no painel

**Files:**
- Modify: `src/pages/Glossary.tsx` (substitui o placeholder), `src/pages/Dashboard.tsx`, `src/components/dashboard/WeeklyGoalCard.tsx`
- Create: `src/components/dashboard/SrsCard.tsx`

**Interfaces:**
- Consumes: `buildGlossary`, `matches`, `GlossaryItem` (T5); `api.addCard` (T6); `content`, `tagLabel`; `Dashboard.srs` (T4).
- Produces: página `/glossary`; `SrsCard({ srs })`; meta semanal sem a nota "disponível na E3".

- [ ] **Step 1: `src/pages/Glossary.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import { buildGlossary, matches, type GlossaryItem } from "../../shared/glossary.ts";
import { api } from "../lib/api.ts";
import { content, tagLabel } from "../lib/content.ts";
import { isSpeechSynthesisSupported, speak } from "../lib/speech.ts";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";

const ALL = buildGlossary(content);
const registerTone = { formal: "blue", neutral: "neutral", informal: "amber" } as const;
const registerLabel = { formal: "formal", neutral: "neutro", informal: "informal" } as const;
type AddState = "added" | "exists" | "error";

export function Glossary() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [source, setSource] = useState("all");
  const [added, setAdded] = useState<Record<string, AddState>>({});
  const tts = isSpeechSynthesisSupported();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 150);
    return () => window.clearTimeout(timer);
  }, [query]);

  const sources = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of ALL) byId.set(item.source.id, item.source.label);
    return [...byId.entries()];
  }, []);
  const items = useMemo(() => ALL.filter((i) => (source === "all" || i.source.id === source) && matches(i, debounced)), [debounced, source]);

  const say = (text: string) => { speak(text).catch(() => undefined); };
  const add = async (item: GlossaryItem) => {
    try {
      const res = await api.addCard({ front: item.meaning, back: item.term, ...(item.collocations[0] ? { hint: item.collocations[0] } : {}), tag: item.tags[0]! });
      setAdded((a) => ({ ...a, [item.key]: res.inserted ? "added" : "exists" }));
    } catch {
      setAdded((a) => ({ ...a, [item.key]: "error" }));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Glossário</h1>
        <p className="mt-1 text-sm text-slate-600">{ALL.length} termos: temas curados e vocabulário das aulas. Busca ignora acentos.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-full max-w-md rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          placeholder="Buscar termo, significado ou exemplo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar no glossário"
        />
        <span className="text-sm text-slate-500">{items.length} resultado(s)</span>
      </div>
      <div className="flex flex-wrap gap-1 text-xs">
        {[["all", "Todas as fontes"] as const, ...sources].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSource(id)} className={`rounded-full px-3 py-1 ${source === id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>
        ))}
      </div>

      {items.length === 0 && <p className="text-slate-500">Nenhum termo para "{debounced}".</p>}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.key}>
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{item.term}</h2>
                {tts && <button type="button" onClick={() => say(item.term)} className="text-indigo-700 hover:underline" aria-label={`Ouvir ${item.term}`}>▶</button>}
                <Badge tone={registerTone[item.register]}>{registerLabel[item.register]}</Badge>
                <span className="text-xs text-slate-500">{item.source.label}</span>
                {item.pronunciation && <span className="font-mono text-xs text-slate-500">{item.pronunciation}</span>}
              </div>
              <p className="mt-1 text-slate-800">{item.meaning}</p>
              {item.definition && <p className="text-sm text-slate-600">{item.definition}</p>}
              <ul className="mt-2 space-y-1 text-sm">
                {item.examples.map((ex, i) => (
                  <li key={i}>
                    <span className="text-slate-800">{ex.en}</span>
                    {tts && <button type="button" onClick={() => say(ex.en)} className="ml-2 text-indigo-700 hover:underline" aria-label="Ouvir exemplo">▶</button>}
                    {ex.pt && <span className="ml-2 text-slate-500">— {ex.pt}</span>}
                  </li>
                ))}
              </ul>
              {item.collocations.length > 0 && <p className="mt-2 text-sm text-slate-600"><span className="font-medium">Colocações:</span> {item.collocations.join(" · ")}</p>}
              {item.pitfalls.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-rose-800">{item.pitfalls.map((p, i) => <li key={i}>{p}</li>)}</ul>}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {item.tags.map((t) => <Badge key={t}>{tagLabel(t)}</Badge>)}
                <Button variant="secondary" className="ml-auto" disabled={added[item.key] === "added" || added[item.key] === "exists"} onClick={() => add(item)}>
                  {added[item.key] === "added" ? "Adicionado aos cards" : added[item.key] === "exists" ? "Já está nos cards" : added[item.key] === "error" ? "Erro, tente de novo" : "Adicionar aos cards"}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/dashboard/SrsCard.tsx`**

```tsx
import { useNavigate } from "react-router";
import type { Dashboard } from "../../lib/api.ts";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";

export function SrsCard({ srs }: { srs: Dashboard["srs"] }) {
  const navigate = useNavigate();
  const acc = srs.accuracy30d;
  return (
    <Card>
      <h2 className="font-medium">Cards</h2>
      <p className="mt-1 text-3xl font-semibold">{srs.dueNow} <span className="text-base font-normal text-slate-500">para revisar</span></p>
      <p className="text-sm text-slate-600">novos {srs.new} · aprendendo {srs.learning} · maduros {srs.mature} · total {srs.total}</p>
      <p className="text-sm text-slate-600">
        acerto 30 dias: {acc.value === null ? "—" : `${Math.round(acc.value * 100)}% (${acc.samples})`}
        {srs.dueNow === 0 && srs.nextDue ? ` · próximo: ${new Date(srs.nextDue).toLocaleDateString("pt-BR")}` : ""}
      </p>
      <Button className="mt-3" disabled={srs.dueNow === 0} onClick={() => navigate("/review")}>Revisar</Button>
    </Card>
  );
}
```

- [ ] **Step 3: Painel e meta**

`src/pages/Dashboard.tsx`: importe `SrsCard` de `../components/dashboard/SrsCard.tsx` e, no grid, logo depois de `<StreakCard streak={data.streak} />`, adicione `<SrsCard srs={data.srs} />`.

`src/components/dashboard/WeeklyGoalCard.tsx`: remova o campo `note` do tipo das `rows` e da linha de "Revisões" (fica `{ label: "Revisões", done: week.progress.reviews, target: week.goal.reviewsTarget }`), e no JSX da linha remova o trecho `{r.note && r.done === 0 ? <span ...>({r.note})</span> : null}` (o rótulo vira só `{r.label}`).

- [ ] **Step 4: Verifique**

Run: `pnpm typecheck && pnpm build && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Glossary.tsx src/components/dashboard/SrsCard.tsx src/pages/Dashboard.tsx src/components/dashboard/WeeklyGoalCard.tsx
git commit -m "feat(client): glossário com busca e áudio; card de SRS no painel"
```

---

### Task 8: Documentação e verificação no navegador

**Files:**
- Modify: `README.md`, `AGENTS.md`

Executada pelo controlador (subagentes não têm navegador). Defeito encontrado vira correção despachada, não patch direto.

- [ ] **Step 1: Documentação**

`AGENTS.md`: na frase de estado, `Estado atual: etapas E0–E3 entregues (motor de aula + aula M01-02 + teste inicial e painel + SRS e glossário). Próximas: E4 Claude API, E5 conteúdo do Nível 1, E6 adaptação.`; em "Estrutura", `content/` ganha `glossary/*.yaml (termos por tema)` e `shared/` ganha `sm2.ts, glossary.ts, local-date.ts` (ajuste a linha de `shared/` para listar: schemas zod, loader, detector de erros BR, scoring, comparação de fala, mini-markdown, SM-2, glossário, datas locais).

`README.md`, na linha "Páginas:", acrescente `` `/review` revisão diária dos cards (SM-2), `/glossary` glossário com busca e áudio ``.

- [ ] **Step 2: Verificação no Chrome** (`pnpm dev`)

1. `/` com o banco real: card "Cards" mostra 12 para revisar (os da M01-02, se a aula estiver concluída) ou 0 com "próximo".
2. `/review`: frente em PT; Espaço mostra o verso; ▶ toca o áudio; botões com prévia ("Bom · em 1 dia"); tecla 3 dá "Bom"; após todos, tela de fim; um card com "Errei" volta em "Revisar os vencidos (N)".
3. `/` de novo: contagens mudaram (aprendendo N), meta semanal "Revisões" conta.
4. `/glossary`: busca "aviso" acha "heads up"; "migracao" (sem acento) acha o item da aula; filtro por fonte; ▶ no termo e no exemplo; "Adicionar aos cards" → "Adicionado", segundo clique desabilitado; `/review` mostra o card novo.
5. `/lessons/M01-02` intacta; sem erros no console.
6. `pnpm content:build && pnpm typecheck && pnpm test && pnpm build` verdes.

- [ ] **Step 3: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: rotas de revisão e glossário; estado E3 entregue"
```
