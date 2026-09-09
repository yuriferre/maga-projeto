# E2 — Diagnóstico e painel: desenho

Data: 2026-09-09. Origem: `docs/planejamento/01-plano-geral.md` (seções 4, 5, 6, 8), `docs/planejamento/02-trilha.md` (Nível 0 — Diagnóstico), `docs/planejamento/03-exemplo-aula-M01-02.md` (seção 13, warm-up com itens do placement). Estado de partida: E0 + E1 entregues (`docs/superpowers/plans/2026-09-08-fundacoes-motor-de-aula.md`).

## 1. Objetivo

Entregar a etapa E2 do plano geral:

1. **Teste inicial** (placement) jogável ponta a ponta no navegador, com os seis blocos da trilha Nível 0.
2. **Recomendação de nível de entrada** (N1, N2 ou N3) pela regra de corte da trilha, com perfil inicial por competência (radar) e por tag (tags fracas).
3. **Painel v1** na rota raiz: radar das 7 competências (janela de 30 dias), heatmap de erros por tag, streak, meta semanal e linha do tempo de avaliações.
4. **Metas semanais** (aulas, revisões, minutos) com edição no painel e minutos rastreados por sessões de estudo.

Critério de aceite do plano geral: "fazer o teste, ver nível sugerido e perfil; painel reflete tentativas".

## 2. Fora do escopo

- Correção de escrita por LLM e rubrica automática (E4). Até lá, a nota de escrita é a autoavaliação 1–5 guiada por rubrica e modelo.
- Roleplay, avaliação de módulo e de nível (E4/E5).
- Flashcards e tela de revisão (E3). O painel já conta `srs_reviews` da semana, que será 0 até a E3.
- Recomendação diária "revisar tag X antes de avançar", checkpoint de 4 semanas, export/import (E6).
- Clique no heatmap levando a exercícios extras da tag (depende de conteúdo do Nível 1, E5).
- Dependências novas. Radar e heatmap são SVG/HTML inline.

## 3. Decisões e abordagem

**Abordagem escolhida: placement como conteúdo próprio, respostas na tabela `attempts`.** Alternativas descartadas: tabela separada (duplicaria `tagStats`/warm-up) e placement como aula normal (`LessonSchema` obrigaria vocabulário, diálogo e cards placeholder, proibido pelo AGENTS.md).

Decisões registradas (o quê, por quê, custo se errado):

| Decisão | Por quê | Custo se errado |
|---|---|---|
| Respostas do teste vão para `attempts` com `lesson_id = 'placement'` e `block = 'placement'` | `tagStats`, `weakTags` e o warm-up passam a ver os erros do teste sem código novo; a spec exige que o teste defina as tags fracas iniciais | Migração que reconstrói `attempts` (SQLite não altera CHECK); reversível por nova migração |
| Nota de escrita do teste = autoavaliação 1–5 (modo `rules`) | Não há LLM antes da E4; `ruleBasedFeedback` já funciona assim nas aulas | Nível sugerido provisório; a E4 pode recalcular a partir do texto salvo em `writing_submissions` |
| Fala é opcional; sem ela, SPK/PRO/CNF ficam vazios no radar | Trilha diz "opcional"; STT só existe no Chrome | Nenhum: eixos vazios são explícitos no painel |
| Explicações e acertos ficam ocultos durante o teste, revelados no resultado | Diagnóstico não deve ensinar durante a medição (gramática repete padrões entre itens) | Nenhum: prop `feedback="deferred"` no `ExerciseList`, aulas continuam imediatas |
| Rota `/` passa a ser o painel; trilha vai para `/trilha` | Plano geral lista `Dashboard` como página principal; o painel é o ponto de entrada diário | Um redirecionamento a mais se o usuário preferir a trilha na raiz |
| Refazer o teste é permitido; vale a última avaliação; a linha do tempo guarda todas | Spec: "você pode ignorar a sugestão"; checkpoints futuros comparam com o teste inicial (primeiro registro) | Nenhum |
| Dia e semana usam o fuso local da máquina (`localtime` no SQLite, getters locais no JS) | Uso pessoal, um computador; streak em UTC quebraria à noite no Brasil | Se o app rodar em servidor remoto, streak muda de fuso; aceitável |
| Meta semanal padrão criada ao concluir o teste: 3 aulas, 5 revisões, 150 minutos | Trilha assume 3 aulas/semana; "primeira meta semanal preenchida" é saída do teste | Editável no painel |
| Warm-up passa a incluir itens do placement no pool | Exemplo de aula (seção 13) mostra itens do placement no warm-up; primeira aula não tem aula concluída para puxar | Nenhum: só entra quando existe avaliação de placement |

## 4. Conteúdo do teste

Arquivo: `content/placement/placement.yaml`. Autoria por IA, **revisão humana item a item antes do merge** (mesma regra da M01-02). Nada genérico: trechos, logs e frases plausíveis de trabalho real em DevOps/Cloud/SRE.

| Bloco | Itens | Formato | Tags obrigatórias | Mede |
|---|---|---|---|---|
| Leitura | 12 (3 trechos × 4) | `multiple_choice`, `fill_blank` | `comp.reading` em todos; `vocab.*` quando o item for lexical | REA, VOC |
| Vocabulário em contexto | 10 | `multiple_choice` com 4 opções | `comp.vocabulary` + `vocab.*` | VOC |
| Gramática em contexto | 10 | `error_correction`, `multiple_choice` | `gram.*` e/ou `br.*` | gram.\*, br.\* |
| Escuta | 6 (2 roteiros × 3) | `multiple_choice`, `fill_blank` | `comp.listening` | LIS |
| Escrita | 1 | prompt + restrições + rubrica + modelo | `comp.writing`, `topic.help`, `vocab.iac` | WRI |
| Fala (opcional) | 3 frases lidas + 1 pergunta | STT | `comp.pronunciation`, `comp.speaking` | PRO, SPK, CNF |

Trechos de leitura: (1) parágrafo de documentação oficial no estilo AWS IAM (políticas, princípio do menor privilégio), (2) log de erro de pipeline (falha de build/deploy com stack de mensagens), (3) issue de GitHub (bug report com reprodução e workaround). Roteiros de escuta: (1) standup de 3 pessoas, ~40 s, (2) update de incidente, ~40 s. Escrita: mensagem no Slack pedindo ajuda com um erro de Terraform (60–100 palavras). Fala: 3 frases de trabalho para ler em voz alta + "What did you work on yesterday?" com expressões-alvo e limite de 45 s.

Ids de exercício: `PL-r01…PL-r12`, `PL-v01…PL-v10`, `PL-g01…PL-g10`, `PL-l01…PL-l06`. Únicos no bundle inteiro (validado). Toda tag usada existe em `content/tags.yaml`; tags novas entram com `label` e `group`.

Regras de YAML do AGENTS.md valem (quotar `#`, `: `, aspas iniciais; mini-markdown limitado). Trechos de log/erro usam `format: pre` para renderização monoespaçada sem passar pelo mini-markdown.

## 5. Schema e loader (`shared/`)

`shared/schema.ts`:

- `BlockSchema` ganha `"placement"`.
- Extrai de `LessonSchema` dois sub-schemas reutilizáveis, sem mudar o formato das aulas: `WritingSpecSchema` (prompt, constraints, rubric, model, minWords, maxWords, tags) e `SpeakingModeASchema` (prompt, maxSeconds, targetPhrases, checklist).
- `PlacementSchema`:

```
id: "placement"
title, intro (markdown), durationMin
reading:    { passages: [{ id, title, source, format: markdown|pre (default markdown), text, questions: Exercise[] ≥1 }] ≥1 }
vocabulary: { intro?, questions: Exercise[] ≥1 }
grammar:    { intro?, questions: Exercise[] ≥1 }
listening:  { scripts: [{ id, title, lines: [{ speaker, text, note? }] ≥1, questions: Exercise[] ≥1 }] ≥1 }
writing:    WritingSpec
speaking:   { readAloud: string[] ≥1, modeA: SpeakingModeA }
```

- `ContentBundle` ganha `placement: Placement`.
- `placementExercises(p)` retorna todos os exercícios objetivos com o bloco lógico (`reading|vocabulary|grammar|listening`) — usado por servidor, cliente e validação.

`shared/content-loader.ts`: lê `content/placement/placement.yaml` (obrigatório); `crossValidate` verifica tags do placement (exercícios, escrita) e unicidade de ids de exercício em todo o bundle (aulas + placement). `scripts/build-content.ts` inclui o placement no JSON gerado sem mudança de código além do bundle.

Refatorações de assinatura (sem mudança de comportamento, testes existentes continuam valendo):

- `ruleBasedFeedback(text, spec: WritingSpec, patterns, selfScore?)` em vez de `Lesson`.
- `computeSpeakingMetrics(transcript, durationSec, spec: SpeakingModeA, patterns)` em vez de `Lesson`.
- `shared/speech-compare.ts` ganha `wordOverlap(transcript, target): number` (fração das palavras do alvo presentes na transcrição, com `expandContractions` + `tokenizeWords`), usado pela leitura em voz alta.

## 6. Banco (`server/db.ts`)

Migração índice 1, dentro da transação já existente em `migrate()`:

```sql
create table attempts_new (… mesmas colunas …, block text not null check (block in ('warmup','quiz','listening','writing','speaking','placement')), …);
insert into attempts_new select * from attempts;
drop table attempts;
alter table attempts_new rename to attempts;
create index idx_attempts_lesson_block on attempts(lesson_id, block);
create index idx_attempts_ts on attempts(ts);
```

Dados existentes preservados (testado abrindo um banco na versão 0 com linhas). `assessments`, `weekly_goals`, `study_sessions`, `srs_reviews` já existem e não mudam.

## 7. Servidor

### 7.1 Tentativas do teste

`POST /api/attempts` (zod já existente, `block` aceita `placement`):

- `lessonId === "placement"` → exige `block === "placement"` e `exerciseId` presente em `placementExercises(content.placement)`; senão 400.
- `lessonId` de aula → `block !== "placement"`; senão 400. Demais regras inalteradas.

### 7.2 Rotas do placement (`server/app.ts`, sub-router `/api/placement`)

- `GET /api/placement/state` → `{ latest: PlacementAssessment | null, run: { answered: string[], writing: WritingRow | null, speaking: SpeakingRow | null } }`. `PlacementAssessment = { id, ts, result: PlacementResult }` (linha de `assessments` com `score_json` já parseado). A rodada atual são as linhas com `lesson_id='placement'` e `ts > latest.ts` (ou todas se não há avaliação). `answered` lista os ids de exercício com pelo menos uma tentativa na rodada.
- `POST /api/placement/writing` `{ text: string ≥1, selfScore?: 1–5 }` → `ruleBasedFeedback(text, placement.writing, …)`; grava em `writing_submissions` com `lesson_id='placement'`. Resposta `{ id, feedback }`.
- `POST /api/placement/speaking` `{ readAloud: [{ target: string, transcript: string }], transcript: string ≥1, durationSec > 0, selfConfidence?: int 1–5 }` → `readAloudPct = média de wordOverlap(transcript, target)` (0–1); `metrics = computeSpeakingMetrics(transcript, durationSec, placement.speaking.modeA, brErrors)` estendido com `readAloudPct`; grava em `speaking_sessions` com `lesson_id='placement'`, `mode='A'`. Resposta `{ id, metrics }`.
- `POST /api/placement/finish` (sem corpo) → se faltam itens objetivos ou escrita na rodada atual, 409 `{ error, missing: { exercises: string[], writing: boolean } }`; senão calcula `PlacementResult`, grava em `assessments` (`kind='placement'`, `ref='placement'`, `score_json`), cria a meta da semana atual se não existir (3/5/150) e responde `{ assessment }`.

### 7.3 Cálculo (`server/placement.ts`, funções puras)

Entrada: exercícios do placement, últimas tentativas por exercício da rodada, última escrita, última fala. Saída:

```
PlacementResult {
  version: 1,
  itemCount, correct, pct,                       // objetivos (38 na spec; derivado do conteúdo)
  blocks: { reading, vocabulary, grammar, listening }: { correct, total, pct },
  writingScore: number | null,                  // autoavaliação 1–5
  speaking: { score, readAloudPct, selfConfidence: number | null } | null,
  level: 1 | 2 | 3,
  radar: { REA, VOC, LIS, WRI, SPK, PRO, CNF }: number | null,   // 0–1
  weakTags: string[],                           // erro ≥ 50% entre as tentativas do teste, ordem por erros desc
  items: [{ id, block, correct, answer: string | null }],   // última tentativa por exercício, para a revisão item a item
  finishedAt: string
}
```

Regra de corte (trilha Nível 0), aplicada nesta ordem:

1. `pct > 0.80` e `writingScore ≥ 4` → nível 3.
2. senão `pct ≥ 0.60` e `writingScore ≥ 3` → nível 2.
3. senão → nível 1.

Radar do teste: `REA = blocks.reading.pct`, `VOC = blocks.vocabulary.pct`, `LIS = blocks.listening.pct`, `WRI = writingScore/5`, `SPK = speaking.score/5`, `PRO = readAloudPct`, `CNF = selfConfidence/5`; `null` quando a fonte não existe. Gramática alimenta só tags e a nota total.

### 7.4 Painel (`server/dashboard.ts` + SQL em `server/repo.ts`)

`GET /api/dashboard?days=30` (mesma sanitização de `days` de `/api/tags/stats`) → 

```
{
  since,
  radar: { REA, VOC, LIS, WRI, SPK, PRO, CNF }: { value: number | null, samples: number },
  tags: { stats: TagStat[] (com label e group de tags.yaml), weak: string[] },
  streak: { current: number, best: number, activeToday: boolean },
  week: {
    weekStart: "YYYY-MM-DD",
    goal: { lessonsTarget, reviewsTarget, minutesTarget } | null,
    progress: { lessons, reviews, minutes }
  },
  placement: { latest: PlacementAssessment | null },
  timeline: [{ id, kind, ref, ts, summary: { level?, pct? } }]
}
```

Fontes do radar na janela (`ts ≥ since`):

| Eixo | Fonte | Valor |
|---|---|---|
| LIS | `attempts` com `block='listening'` ou tag `comp.listening` | acertos / tentativas |
| REA | `attempts` com tag `comp.reading` | acertos / tentativas |
| VOC | `attempts` com tag `comp.vocabulary` ou `vocab.*` | acertos / tentativas |
| WRI | `writing_submissions.score` não nulo | média / 5 |
| SPK | `speaking_sessions.score` | média / 5 |
| PRO | `speaking_sessions.metrics_json.readAloudPct` presente | média |
| CNF | `speaking_sessions.self_confidence` não nulo | média / 5 |

Sem amostra → `value: null`. Uma tentativa com várias tags conta uma vez por eixo.

Streak: dias de atividade = união de `date(ts,'localtime')` em `attempts`, `writing_submissions`, `speaking_sessions` e `date(started_at,'localtime')` em `study_sessions`. `current` = dias consecutivos terminando hoje ou ontem (se hoje ainda não teve atividade); `best` = maior sequência histórica.

Semana: `weekStart` = segunda-feira local da data de `now()`. `progress.lessons` = `lesson_progress.completed_at` na semana; `progress.reviews` = `srs_reviews.ts` na semana; `progress.minutes` = soma, em minutos inteiros, da interseção de cada `study_session` (`started_at`…`ended_at`) com a semana.

### 7.5 Metas e sessões de estudo

- `PUT /api/goals/week` `{ lessonsTarget: int 0–50, reviewsTarget: int 0–500, minutesTarget: int 0–3000 }` (zod) → upsert em `weekly_goals` para `weekStart` da semana atual. Resposta `{ weekStart, goal }`.
- `POST /api/study/heartbeat` `{ lessonId?: string }` (zod) → última sessão com `ended_at` a ≤ 120 s de `now()` é estendida (`ended_at = now`, `lesson_id` atualizado se veio); senão cria sessão (`started_at = ended_at = now`). Resposta `{ sessionId, resumed: boolean }`. Sessões nunca ficam abertas: cada heartbeat fecha o intervalo até o momento.

## 8. Warm-up (`server/warmup.ts`)

Pool passa a incluir `placementExercises(content.placement)` com `completedAt` = `ts` da última avaliação de placement, quando ela existe. A condição "sem aulas concluídas → `[]`" vira "pool vazio → `[]`". Seleção por tags fracas continua igual; os erros do placement já entram em `weakTags` via `tagStats`.

## 9. Cliente

### 9.1 Rotas e navegação

`src/App.tsx`: `/` → `Dashboard`, `/trilha` → `Levels`, `/modules/:id`, `/lessons/:id` (inalteradas), `/placement` → `Placement`. `Layout` mostra Painel · Trilha · Teste inicial e monta `useStudyHeartbeat()`.

Links existentes para `/` (trilha) em `Module.tsx`, `Lesson.tsx` e `Levels.tsx` passam a apontar para `/trilha`.

### 9.2 Sessão de estudo (`src/lib/useStudyHeartbeat.ts`)

Ao montar, envia heartbeat; repete a cada 60 s enquanto `document.visibilityState === "visible"`; ao voltar a ficar visível, envia imediatamente. Erros de rede são silenciosos (console).

### 9.3 Componentes generalizados

Sem mudança visual nas aulas; `Lesson.tsx` passa os novos props.

- `ExerciseList` e `ExerciseRunner`: prop `feedback?: "immediate" | "deferred"` (padrão `immediate`). Em `deferred`, após responder mostra só "Resposta registrada" e o botão de avançar; sem contagem de acertos nem tela de resultado (chama `onFinished` com o resumo). Prop `initialAnswered?: Set<string>` para pular itens já respondidos ao retomar.
- `Listening({ lessonId, block, lines, questions, feedback? })` em vez de `{ lesson }`.
- `Writing({ spec, fetchLatest, submit })` em vez de `{ lesson }`; `Lesson.tsx` passa `api.latestWriting(id)` e `api.submitWriting(id, …)`.
- `Speaking({ spec, submit, extraBefore? })` em vez de `{ lesson }`; recebe a função de envio para o placement injetar as leituras em voz alta.
- Novo `ReadAloud({ sentences, onChange })` (`src/components/placement/`): grava uma frase por vez com `startRecognition`, mostra transcrição e % de sobreposição local (`wordOverlap`), permite regravar.

### 9.4 Página do teste (`src/pages/Placement.tsx`)

Estados: `intro` → `reading` → `vocabulary` → `grammar` → `listening` → `writing` → `speaking` (pulável) → `result`. `Stepper` reutilizado. Ao montar, `api.placementState()`: se há `latest` e a rodada atual está vazia, abre direto em `result` com o botão "Refazer o teste" (que apenas leva a `intro`; a rodada nova é definida pelo servidor pelas datas). Se a rodada tem respostas, retoma no primeiro bloco incompleto com os itens já respondidos pulados.

Blocos objetivos usam `ExerciseList` com `lessonId="placement"`, `block="placement"`, `feedback="deferred"`. Leitura mostra o trecho (markdown ou `<pre>`) acima das perguntas. Escuta reutiliza `Listening` com o roteiro e TTS. Escrita reutiliza `Writing` com `api.placementLatestWriting` e `api.submitPlacementWriting`; a autoavaliação é obrigatória para concluir (sem nota, `finish` devolve 409 e a UI explica). Fala: `ReadAloud` + `Speaking` com `submit` que envia `readAloud` junto; botão "Pular fala".

`result`: nível sugerido com a regra aplicada em uma frase, tabela de blocos (acertos/total/%), radar (mesmo componente do painel), tags fracas com label, revisão item a item (prompt, sua resposta, esperada, explicação), aviso "nota de escrita é autoavaliação até a E4", meta semanal criada, botões "Ir para o painel" e "Ver a trilha".

### 9.5 Painel (`src/pages/Dashboard.tsx`)

Componentes em `src/components/dashboard/`:

- `PlacementCard`: sem avaliação → chamada para o teste (duração estimada, link); com avaliação → nível, data, % total, link para o resultado e "Refazer".
- `RadarChart({ axes: [{ key, label, value: number | null }] })`: SVG inline, 7 eixos, polígono preenchido, eixo sem dado marcado como vazio e listado abaixo ("sem dados: Pronúncia, Confiança").
- `TagHeatmap({ stats, weak })`: grade agrupada por `group` (gram, br, vocab, topic, comp); célula com label, `erros/tentativas`, cor por `errorRate` (5 faixas), borda destacada para tags fracas; tags sem tentativa na janela não aparecem.
- `StreakCard`: streak atual, melhor, "hoje ✓/—".
- `WeeklyGoalCard`: três barras (aulas, revisões, minutos) com `progresso/meta`, formulário inline para editar as três metas (`PUT /api/goals/week`); sem meta → botão "Definir meta" com os padrões preenchidos. Revisões exibem nota "disponível na E3" enquanto o total é 0 e não há cards.
- `Timeline`: lista de avaliações (por ora só placement), mais recente primeiro.

`useDashboard()` faz o fetch de `/api/dashboard` e expõe `reload()` para o card de metas.

`src/lib/api.ts` ganha: `placementState`, `submitPlacementWriting`, `placementLatestWriting`, `submitPlacementSpeaking`, `finishPlacement`, `dashboard(days)`, `setWeekGoal`, `heartbeat`. Tipos importados do servidor só com `import type`.

## 10. Testes (vitest, sem mocks)

- **Conteúdo**: carrega o YAML real; contagens 12/10/10/6 e 3 trechos/2 roteiros; toda tag existe; ids únicos no bundle; `wordOverlap` das frases de leitura consigo mesmas = 1; `content:validate` passa.
- **Schema**: `PlacementSchema` rejeita bloco sem questões e `format` inválido; `BlockSchema` aceita `placement`.
- **`server/placement.ts`**: tabela de corte cobrindo 59/60/80/81 % × escrita 2/3/4/5 e escrita ausente; radar com fala ausente; `weakTags` por limiar 50 %; blocos calculados só com a última tentativa por exercício.
- **Rotas**: `POST /api/attempts` aceita placement válido e rejeita (400) exercício inexistente, bloco errado e aula com bloco `placement`; fluxo respostas → escrita → fala → `finish` grava `assessments` e cria meta; `finish` incompleto → 409 com `missing`; `state` reflete rodada e retomada; refazer cria segunda avaliação e `state.latest` aponta para ela; `GET /api/placement/state` sem dados → `latest: null`.
- **Painel**: radar com dados mistos (aula + placement) e eixos nulos; streak com sequência, lacuna e "ontem"; semana com aula concluída e sessões atravessando a segunda-feira; heartbeat cria, estende e reabre sessão após 120 s; `PUT /api/goals/week` upsert e 400 em corpo inválido; `timeline` ordenada.
- **Migração**: banco na versão 0 com tentativas → `migrate` preserva linhas e aceita `block='placement'`.
- **Warm-up**: sem aula concluída mas com placement → itens do placement das tags fracas entram; sem placement e sem aula → `[]` (comportamento atual).
- **Refatorações**: testes existentes de `writing-feedback` e `speaking-metrics` passam com as novas assinaturas.

UI verificada no Chrome ao final: teste completo com fala, painel refletindo o resultado, edição de meta, streak após uma tentativa, heartbeat somando minutos.

## 11. Estrutura de arquivos (novos e alterados)

```
content/placement/placement.yaml                     novo
content/tags.yaml                                    tags novas, se o conteúdo precisar
shared/schema.ts                                     PlacementSchema, WritingSpecSchema, SpeakingModeASchema, Block+placement, placementExercises
shared/content-loader.ts                             carrega placement; crossValidate estendido
shared/speech-compare.ts                             wordOverlap
server/db.ts                                         migração 1
server/repo.ts                                       SQL: rodada do placement, assessments, goals, study_sessions, radar, streak, semana
server/placement.ts                                  novo: computePlacementResult, regra de corte, radar, tags fracas
server/dashboard.ts                                  novo: buildDashboard(db, content, now, days)
server/time.ts                                       novo: localDate, weekStart, minutesWithin
server/warmup.ts                                     pool com placement
server/writing-feedback.ts, server/speaking-metrics.ts  assinaturas por spec
server/app.ts                                        rotas /api/placement/*, /api/dashboard, /api/goals/week, /api/study/heartbeat
src/App.tsx, src/components/Layout.tsx               rotas e navegação
src/lib/api.ts, src/lib/useDashboard.ts, src/lib/useStudyHeartbeat.ts
src/pages/Dashboard.tsx, src/pages/Placement.tsx     novas
src/components/dashboard/{PlacementCard,RadarChart,TagHeatmap,StreakCard,WeeklyGoalCard,Timeline}.tsx
src/components/placement/{PassageView,ReadAloud,PlacementResult}.tsx
src/components/exercises/{ExerciseList,ExerciseRunner}.tsx   feedback deferred, initialAnswered
src/components/lesson/{Listening,Writing,Speaking}.tsx       props por spec
src/pages/{Lesson,Levels,Module}.tsx                 novos props e links /trilha
tests/{placement-content,placement,placement-routes,dashboard,migration}.test.ts  novos; warmup/app/schema ampliados
```

## 12. Riscos

- **Qualidade do conteúdo**: 38 itens + 2 roteiros + 1 prompt de escrita é o maior custo da etapa e depende da revisão humana. Mitigação: conteúdo é uma tarefa própria do plano, entregue em YAML validado, revisada antes de qualquer UI.
- **STT no Chrome** para leitura em voz alta pode transcrever mal nomes técnicos (`kubectl`, `IAM`). Mitigação: frases de leitura evitam siglas soletradas; `wordOverlap` tolera contrações; fala é opcional.
- **Fuso local** em SQLite depende da máquina. Aceito (uso pessoal).
- **Migração destrutiva por reconstrução** de `attempts`. Mitigação: transação, teste com dados, e `data/` é local do usuário (fazer cópia de `data/progress.sqlite` antes de rodar a versão nova é recomendado no PR).
