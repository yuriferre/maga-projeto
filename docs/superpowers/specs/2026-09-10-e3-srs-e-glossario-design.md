# E3 — SRS e glossário: desenho

Data: 2026-09-10. Origem: `docs/planejamento/01-plano-geral.md` (seções 2 princípio 6, 4 itens 8 e 10, 5 "Retenção SRS", 6 tabelas `srs_cards`/`srs_reviews`, 8 linha E3), `docs/planejamento/03-exemplo-aula-M01-02.md` (cards da aula). Estado de partida: E0–E2 entregues (`main` 94e18ae).

## 1. Objetivo

1. **Flashcards com SM-2**: os cards que cada aula já insere em `srs_cards` ao ser concluída passam a ter agenda de revisão espaçada (SM-2 clássico, sem dependência).
2. **Tela de revisão diária** em `/review`: fila dos cards vencidos, frente (português) → verso (inglês) com áudio, quatro botões de nota, atalhos de teclado, contadores.
3. **Glossário** em `/glossary`: entradas curadas em `content/glossary/*.yaml` (primeiro tema: `daily.yaml`, ~25 termos de standup e Slack) somadas ao `vocabulary` de toda aula com conteúdo; busca sem acento, filtro por fonte, áudio no termo e nos exemplos, botão para virar card.
4. **Painel**: card "Cards" (vencidos agora, novos/aprendendo/maduros, acerto em 30 dias); a meta semanal de revisões passa a contar de verdade.

Critério de aceite do plano geral: "cards das aulas concluídas aparecem para revisão nas datas certas".

## 2. Fora do escopo

- Limite diário de cards novos ou de revisões (um usuário; a fila mostra tudo que venceu).
- Modo de digitar a resposta antes de virar o card (autoavaliação é o padrão SM-2; fica como ideia para E6).
- Glossários `infra` e `incident` (E5, junto com o conteúdo do Nível 1).
- Edição de cards pela interface; export/import (E6).
- Migração de banco: `srs_cards` e `srs_reviews` já existem com as colunas necessárias.

## 3. Decisões

| Decisão | Por quê | Custo se errado |
|---|---|---|
| SM-2 em `shared/sm2.ts`, puro; o servidor aplica e grava | Spec: "sem biblioteca de SRS (SM-2 tem 40 linhas)"; servidor é dono dos dados; testável em tabela | Nenhum |
| Ease atualizada em toda resposta (clamp 1,3); nota < 3 zera reps e intervalo e soma lapso | Variante mais comum do SM-2; penaliza cards difíceis mesmo quando errados | Cards errados ficam com intervalos um pouco menores que no SM-2 literal |
| Nota < 3 vence agora (`due = now`); o cliente refaz a fila ao terminar a rodada e oferece "Revisar os errados (N)" | Comportamento Anki (relearn na sessão) sem regra de "10 minutos" | Nenhum |
| Nota ≥ 3 vence à meia-noite local de hoje + intervalo | Revisão é diária; o card aparece "no dia certo" a partir das 00:00 local, coerente com streak/semana da E2 | Nenhum |
| Quatro botões: Errei = 1, Difícil = 3, Bom = 4, Fácil = 5 | Escala 0–5 do SM-2 é ruim de usar; quatro botões é o padrão de mercado | Notas 0 e 2 nunca são usadas |
| Maturidade: novo (reps 0), aprendendo (intervalo < 21 d), maduro (≥ 21 d) | Corte de 21 dias é o do Anki, citado no plano geral | Nenhum |
| Cards vindos do glossário usam `lesson_id = 'glossary'`; `unique (lesson_id, front)` evita duplicata | Reusa tabela e índice; conclusão de aula (`countCards` por `lesson_id`) não é afetada | Nenhum |
| Glossário curado no bundle + vocabulário das aulas fundido no cliente | Bundle é estático; busca de ~100 itens não precisa de servidor | Se o glossário crescer para milhares de itens, mover a busca para o servidor |
| Sem migração | Tabelas prontas desde a E0 | Nenhum |

## 4. SM-2 (`shared/sm2.ts`)

```
type CardState = { ease: number; intervalDays: number; reps: number; lapses: number };
type Sm2Result = CardState & { due: string };   // due ISO
sm2(state: CardState, grade: 0–5, nowIso: string): Sm2Result
```

- `ease' = max(1.3, ease + 0.1 − (5 − grade) × (0.08 + (5 − grade) × 0.02))`, para qualquer nota.
- `grade < 3`: `reps = 0`, `intervalDays = 0`, `lapses + 1`, `due = nowIso`.
- `grade ≥ 3`: `reps + 1`; `intervalDays = 1` se `reps' = 1`, `6` se `reps' = 2`, senão `round(intervalDays × ease')` (mínimo 1); `due = localDayStart(addDays(localDate(nowIso), intervalDays))`.
- `previewIntervals(state)`: intervalos que cada um dos quatro botões daria (para a prévia "em 6 dias"). Puro, sem data.
- Estado inicial dos cards criados pela aula: `ease 2.5, intervalDays 0, reps 0, due = created_at` (já é assim).
- `maturity(state)`: `"new" | "learning" | "mature"` pela regra da seção 3.

`localDayStart(date: string): string` (ISO da meia-noite local de `YYYY-MM-DD`) vive em `shared/local-date.ts`, junto de `localDate`/`addDays` (movidos de `server/time.ts`, que os reexporta), para que `shared/sm2.ts` continue puro.

## 5. Servidor

### 5.1 Repositório (`server/repo.ts`)

```
export type CardRow = { id, lesson_id, front, back, hint: string | null, tag, ease, interval_days, due, reps, lapses, created_at };
dueCards(db, nowIso, limit): CardRow[]              // due <= now, order by due asc, id asc
getCard(db, id): CardRow | undefined
applyReview(db, id, next: Sm2Result, nowIso): void    // update srs_cards + insert srs_reviews (grade, ts) na mesma transação
cardCounts(db, nowIso): { new, learning, mature, dueNow, total, nextDue: string | null }
reviewAccuracy(db, sinceIso): RadarSample             // grade >= 3 / total; null sem amostras
insertGlossaryCard(db, card: { front, back, hint?, tag }, nowIso): { inserted: boolean; id: number }
```

`applyReview` recebe a nota junto com `next` (assinatura: `applyReview(db, id, grade, next, nowIso)`).

### 5.2 Rotas (`server/app.ts`, sub-router `/api/srs`)

- `GET /api/srs/queue?limit=` (limite 1–200, padrão 50) → `{ cards: CardRow[], counts: cardCounts }`.
- `POST /api/srs/review` `{ cardId: int ≥ 1, grade: int 0–5 }` (zod) → 404 se o card não existe; senão aplica `sm2(state, grade, now())`, grava, devolve `{ card: CardRow, maturity, counts }`.
- `POST /api/srs/cards` `{ front ≥1 (trim), back ≥1 (trim), hint?: string ≥1 (trim), tag ≥3 }` (zod) → `insertGlossaryCard` → `{ inserted, id }` (200 nas duas situações; `inserted: false` = já existia).
- `GET /api/dashboard` ganha `srs: { new, learning, mature, dueNow, total, nextDue, accuracy30d: RadarSample }`. `week.progress.reviews` já conta `srs_reviews`.

Regras vigentes: todo POST validado com zod, SQL parametrizado, timestamps só de `now()`.

## 6. Glossário

### 6.1 Conteúdo (`content/glossary/daily.yaml`)

```
id: daily
title: "Dia a dia: standup e Slack"
entries:
  - term: heads up
    meaning: aviso rápido de algo que vai acontecer ou mudar
    definition: a short advance warning
    examples:
      - { en: "Heads up: the deploy window moved to 3 pm.", pt: "Aviso: a janela de deploy mudou para 15h." }
    collocations: ["quick heads up", "just a heads up", "heads up that…"]
    pronunciation: "HEDZ-up"
    pitfalls: ["Sem hífen quando é substantivo em mensagem informal; não é pergunta."]
    register: informal
    tags: [vocab.slack]
```

~25 entradas: heads up, FYI, TL;DR, on it, will do, ETA, EOD, blocker, blocked on, waiting on, pair with, ping, loop in, follow up, circle back, push back, flaky, rollback, hotfix, handover, on-call, parking lot, action item, nit, LGTM, WIP, quick question, no worries, my bad, sounds good. Cada uma com significado em português, definição curta em inglês, 1–2 exemplos reais (com tradução), colocações, pronúncia aproximada para brasileiro, armadilhas (calques e confusões típicas) e registro. Sem conteúdo genérico; revisão humana item a item no PR.

### 6.2 Schema e loader

`shared/schema.ts`:

```
GlossaryEntrySchema = { term ≥1, meaning ≥1, definition?: string, examples: [{ en ≥1, pt?: string }] ≥1, collocations: string[] default [], pronunciation?: string, pitfalls: string[] default [], register: Register default "neutral", tags: string[] ≥1 }
GlossaryFileSchema = { id: /^[a-z][a-z0-9-]*$/, title ≥1, entries: GlossaryEntrySchema[] ≥1 }
ContentBundle.glossary: GlossaryFile[]
```

`shared/content-loader.ts`: lê `content/glossary/*.yaml` (ordenado; diretório pode não existir → `[]`); `crossValidate`: ids de arquivo únicos, `term` único por arquivo (sem caixa), tags existentes, `term` único no `vocabulary` de cada aula e `meaning` único no conjunto glossário + `vocabulary` de todas as aulas (a frente do card do glossário é o `meaning`).

### 6.3 Lógica pura (`shared/glossary.ts`) e página (`src/pages/Glossary.tsx`)

`GlossaryItem = { key, term, meaning, definition?, examples, collocations, pronunciation?, pitfalls, register, tags, source: { kind: "theme" | "lesson", id, label } }`.

- `buildGlossary(content)`: entradas dos temas (`source: theme`) + para cada aula com conteúdo, cada item de `vocabulary` → `{ term, meaning, examples: [{ en: example, pt: translation }], pitfalls: note ? [note] : [], register, tags: tags da aula que começam com "vocab." (ou ["comp.vocabulary"]), source: { kind: "lesson", id: lesson.id, label: "Aula M01-02" } }`. Ordenado por `term` (sem caixa).
- `normalize(s)`: NFD, remove diacríticos, minúsculas. `matches(item, query)` procura em `term`, `meaning`, `definition`, `examples[].en`, `examples[].pt`, `collocations`, `pitfalls`.
- Página: campo de busca (debounce 150 ms), chips de fonte ("Todas", cada tema, cada aula), contagem; lista com: termo (▶ TTS), badge de registro, significado, definição, exemplos (▶ cada um; tradução em cinza), colocações, pronúncia, armadilhas; botão "Adicionar aos cards" → `POST /api/srs/cards { front: meaning, back: term, hint: first collocation?, tag: tags[0] }` → "adicionado" / "já estava nos cards". Estado vazio: "Nenhum termo para '<busca>'."

## 7. Página de revisão (`src/pages/Review.tsx`)

- Monta: `GET /api/srs/queue`. Cabeçalho: "N para revisar · novos X · aprendendo Y · maduros Z".
- Card: frente (PT) grande; botão "Mostrar" (Espaço/Enter). Verso: EN + dica + ▶ (TTS `speak(back)`), tag rotulada, fonte (aula ou glossário). Quatro botões com prévia: "Errei · agora", "Difícil · em 1 d", "Bom · em 6 d", "Fácil · em 15 d" (teclas 1–4). Ao clicar: `POST /api/srs/review`, avança; erro de rede mostra mensagem e mantém o card.
- Barra de progresso da rodada; contador "errei" local.
- Fim da rodada: usa o `counts` da última resposta de `/review` (equivalente a refazer o `GET /api/srs/queue`, porque o card errado fica com `due` = instante da revisão); se sobraram cards vencidos (os errados), botão "Revisar os vencidos (N)"; senão "Fila vazia. Próximo card: <data local>" (ou "nenhum card ainda: conclua uma aula") + links Painel / Glossário.
- Sem cards no banco: estado vazio com link para a trilha.

## 8. Painel e navegação

- `src/components/dashboard/SrsCard.tsx`: "Cards para revisar: N" (botão → `/review`, desabilitado com 0), "novos/aprendendo/maduros", "acerto 30 d: 87 % (n)", "próximo: <data>".
- `WeeklyGoalCard`: remove a nota "disponível na E3".
- `Layout`: Painel · Trilha · Revisar · Glossário · Teste inicial. Rotas `/review` e `/glossary` em `App.tsx`.
- `api.ts`: `srsQueue(limit?)`, `srsReview(cardId, grade)`, `addCard(body)`; tipo `CardRow` via `import type`.

## 9. Testes (vitest, sem mocks)

- `tests/sm2.test.ts`: tabela — notas 1/3/4/5 a partir do estado inicial (intervalos 0/1/1/1 e ease 1,96/2,36/2,5/2,6), segunda revisão (6 d), terceira (`round(6 × ease)`), clamp 1,3, lapso zera reps e intervalo e soma lapse, `due` à meia-noite local, `previewIntervals`, `maturity` nas bordas (20/21 dias).
- `tests/repo.test.ts`: `dueCards` (ordem, filtro por `now`, limite), `applyReview` grava card e review na mesma transação, `cardCounts` (contagens e `nextDue`), `reviewAccuracy` (janela, null), `insertGlossaryCard` (dedupe).
- `tests/srs-routes.test.ts`: fila vazia; concluir M01-02 (via rotas existentes) → 12 cards vencidos; `review` com nota 4 tira o card da fila e ele volta na data certa (relógio injetado avança dias); nota 1 mantém o card na fila seguinte; 404 card inexistente; 400 corpo inválido; `POST /api/srs/cards` insere uma vez.
- `tests/dashboard.test.ts`: `srs` vazio e com cards/reviews.
- `tests/glossary-content.test.ts`: `daily.yaml` ≥ 20 entradas, termos únicos, tags existentes, cada entrada com ≥ 1 exemplo e significado; `crossValidate` limpo; `buildGlossary` produz entradas do tema + as 16 do `vocabulary` da M01-02 com `source.kind = "lesson"`; `normalize`/`matches` ignoram acento e caixa e procuram em exemplos e colocações.
- `tests/content-loader.test.ts`: bundle carrega `glossary` com 1 tema.

`buildGlossary`, `normalize` e `matches` ficam em `shared/glossary.ts` (puro) para serem testados; a página só os consome.

UI no Chrome ao final: concluir a aula (ou usar os cards já existentes), revisar com as quatro notas, ver o card voltar ao errar, glossário com busca/áudio/adicionar, painel com o card de SRS.

## 10. Estrutura de arquivos

```
shared/sm2.ts                                   novo
shared/glossary.ts                              novo: buildGlossary, normalize, matches
shared/schema.ts                                GlossaryEntrySchema, GlossaryFileSchema, ContentBundle.glossary
shared/content-loader.ts                        lê content/glossary/*.yaml; crossValidate
content/glossary/daily.yaml                     novo
server/time.ts                                  localDayStart
server/repo.ts                                  CardRow, dueCards, getCard, applyReview, cardCounts, reviewAccuracy, insertGlossaryCard
server/app.ts                                   sub-router /api/srs
server/dashboard.ts                             srs
src/lib/api.ts                                  srsQueue, srsReview, addCard
src/App.tsx, src/components/Layout.tsx          rotas e nav
src/pages/Review.tsx, src/pages/Glossary.tsx    novas
src/components/dashboard/SrsCard.tsx            novo
src/components/dashboard/WeeklyGoalCard.tsx     remove nota E3
src/pages/Dashboard.tsx                         inclui SrsCard
tests/sm2.test.ts, tests/srs-routes.test.ts, tests/glossary-content.test.ts   novos; repo/dashboard/content-loader ampliados
README.md, AGENTS.md                            rotas e estado
```

## 11. Riscos

- **TTS de termos curtos** ("nit", "WIP") pode soar estranho. Aceito: o botão do termo fala o termo; cada exemplo tem botão próprio, que é o áudio útil.
- **Conteúdo do glossário** é a maior autoria da etapa; revisão humana obrigatória.
- **Fila grande** após muitas aulas: limite 50 por rodada e "Continuar" refaz a fila.
