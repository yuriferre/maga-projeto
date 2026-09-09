# Plano geral — Plataforma de Inglês para Tecnologia

Data: 2026-09-08 · Status: **aguardando aprovação** · Nada foi implementado.

Documentos relacionados:
- `02-trilha.md` — roteiro completo por níveis, módulos e aulas
- `03-exemplo-aula-M01-02.md` — aula completa de exemplo, no formato que será implementado

---

## 1. Diagnóstico da estrutura atual

| Item | Situação |
|---|---|
| Arquivos no projeto | Nenhum. Diretório criado em 2026-09-08, vazio. |
| Controle de versão | Não é repositório git. |
| Stack existente | Nenhuma. Não há arquitetura nem padrões a preservar. |
| Ambiente disponível | Node 25.9, npm 11, pnpm, bun, Python 3.14, uv. macOS. Chrome (necessário para reconhecimento de fala). |

Consequência: liberdade total de escolha técnica, com obrigação de manter a primeira versão simples. Toda decisão de arquitetura abaixo é proposta, não herança.

---

## 2. Perfil de aprendizagem proposto

**Quem:** profissional de TI (DevOps, Cloud, SRE, Platform, dev), falante nativo de português brasileiro. Já lê documentação, logs e código em inglês todos os dias. Precisa **produzir** inglês (falar e escrever) em situações profissionais com segurança.

**Hipótese de nível (a confirmar no teste inicial):** leitura B2, escrita B1, fala/escuta B1. Esse é o perfil típico de dev brasileiro: input forte, output travado. A trilha começa no Nível 1 assumindo isso, mas o teste inicial pode recomendar entrada no Nível 2.

**Objetivo mensurável em 12 meses:** conduzir standup, refinamento, incident call e entrevista técnica em inglês sem preparar frases antes; escrever post-mortem, RFC curta e e-mail de escalada sem revisão externa.

**Princípios metodológicos (aplicados em cada aula):**
1. **Chunks, não palavras.** Ensina-se "I'm blocked on X" como unidade, não "blocked" isolado.
2. **Output desde a primeira aula.** Toda aula exige falar (gravação) e escrever (texto corrigido). Sem output não há conclusão.
3. **Cenário real antes da explicação.** A gramática aparece só quando resolve um problema concreto do cenário (ex.: present perfect no standup).
4. **Registro explícito.** Cada expressão-chave vem marcada como formal / neutra / informal, com o que soa inadequado.
5. **Erros de brasileiro como conteúdo de primeira classe.** Catálogo de ~120 padrões (`I have a doubt`, `since` + presente, `actually` = atualmente, `until` × `by`, `pretend`, `assist`…), detectados automaticamente na escrita e na transcrição da fala.
6. **Revisão espaçada em dois níveis.** Flashcards (SM-2) para vocabulário e frases; warm-up de 5 itens no início de cada aula, escolhidos a partir das tags em que o aluno mais errou.
7. **Adaptação por tags.** Cada exercício carrega tags (competência, gramática, tema, erro BR). Erros alimentam estatísticas por tag, que definem o warm-up, a recomendação do dia e os exercícios extras.
8. **Sessões curtas.** Aula de 30–45 min. Meta padrão: 5 sessões/semana (3 aulas + 2 dias de revisão/simulação).

---

## 3. Roteiro (resumo — detalhe completo em `02-trilha.md`)

| Nível | Nome | Foco | Módulos | Aulas | Critério de saída |
|---|---|---|---|---|---|
| 0 | Diagnóstico | Teste de nível | — | 1 sessão (40 min) | Gera nível de entrada e perfil por competência |
| 1 | Foundation — "Sobreviver ao dia a dia" | Standup, pedir ajuda, Slack, ler logs/docs, descrever sistemas, tickets/PRs | M01–M06 | 30 | Avaliação de nível ≥ 75% + simulação de standup avaliada ≥ 3/5 |
| 2 | Professional — "Participar ativamente" | Refinamento, retro/1:1, code review, explicar problemas, CI/CD, IaC, K8s, e-mail/docs, clouds | M07–M14 | 40 | Avaliação ≥ 75% + code review escrito + simulação de refinamento |
| 3 | Incident-ready — "Liderar sob pressão" | Comunicação de incidente, bridges, post-mortem, observabilidade/SLO, segurança, FinOps | M15–M20 | 30 | Post-mortem escrito ≥ 4/5 + simulação de incident call ≥ 3/5 |
| 4 | Influence — "Influenciar e decidir" | Defender decisões, riscos/trade-offs, discordar, apresentar, RFCs, multicultural | M21–M26 | 29 | RFC escrita + apresentação gravada 5 min + debate simulado |
| 5 | Career — "Carreira internacional" | Pitch, recrutadores, entrevistas comportamentais e técnicas, ofertas, onboarding | M27–M32 | 28 | Entrevista simulada completa ≥ 4/5 |

Total: 32 módulos, 157 aulas. A 3 aulas/semana: ~52 semanas.

**Ordem não é rígida.** Níveis são sequenciais por padrão, mas módulos dentro de um nível podem ser feitos em qualquer ordem, e existe "modo urgência": pular para um módulo (ex.: M29 se houver entrevista marcada) com aviso de pré-requisitos não cumpridos.

---

## 4. Funcionalidades — MVP × futuro

### MVP (cada item com a justificativa de aprendizagem)

| # | Funcionalidade | Por que entra no MVP |
|---|---|---|
| 1 | Teste inicial de nível (leitura, vocabulário em contexto, gramática em contexto, escuta, escrita curta, fala opcional) | Sem ele o aluno começa fácil demais ou difícil demais. Define nível de entrada e tags fracas iniciais. |
| 2 | Trilha por níveis/módulos/aulas com progresso e gating leve | É a espinha dorsal. "Progressão clara" é requisito explícito. |
| 3 | Motor de aula com 12 blocos (objetivo, contexto, vocabulário, gramática, exemplos, diálogo, escuta, escrita, fala, quiz, correção, revisão) | É o produto. Cada bloco cobre uma competência do brief. |
| 4 | Exercícios interativos: múltipla escolha, lacuna, correção de erro, reordenar, traduzir, associar, texto livre | Sem interação não há medição. Sete tipos cobrem tudo que as aulas precisam. |
| 5 | Áudio via navegador: síntese de voz (Web Speech API) para diálogos/escuta; reconhecimento de fala (Chrome) para pronúncia e conversação | Escuta e pronúncia são obrigatórias. Zero dependência, zero custo. Limitação: avaliação de pronúncia é aproximada (transcrição × alvo). |
| 6 | Correção de escrita com explicação (Claude API) + fallback por regras (catálogo de erros BR + modelo de resposta) | Escrita livre não se corrige sozinha. Sem correção, o bloco de escrita vira autoavaliação. |
| 7 | Simulações de reunião/entrevista (roleplay com Claude API, texto ou voz, rubrica ao final) | Conversação precisa de interlocutor. É o que dá "confiança para trabalhar em equipes internacionais". |
| 8 | Flashcards com revisão espaçada (SM-2, sem dependência) alimentados pelas aulas | Retenção de vocabulário e chunks. Cada aula gera 10–15 cards. |
| 9 | Warm-up de revisão espaçada no início de cada aula, guiado pelas tags fracas | "Reapresente conteúdos importantes" e "adapte com base nos erros" — os dois requisitos numa só mecânica. |
| 10 | Glossário técnico contextualizado (termo, definição, frases reais, colocações, pronúncia, armadilhas) | Referência rápida no dia a dia; alimenta os flashcards. |
| 11 | Registro de progresso: por competência, por módulo, por tag; histórico de erros; streak | Requisito explícito. Base para adaptação. |
| 12 | Metas semanais (aulas, revisões, minutos) com painel | Mantém constância, que é o principal preditor de resultado. |
| 13 | Avaliação de módulo e de nível; checkpoint a cada 4 semanas comparando com o teste inicial | "Forma de avaliar a evolução" precisa de medida comparável ao longo do tempo. |
| 14 | Exportar/importar progresso (JSON) | Dados são de um único usuário, num único computador. Sem isso, um disco perdido apaga um ano de histórico. |

### Fica para depois (com o motivo)

| Funcionalidade | Motivo de adiar |
|---|---|
| Avaliação fonética detalhada (fonemas, entonação, waveform) | Exige serviço externo de pronúncia ou modelo local. A comparação transcrição × alvo já cobre 70% do valor. |
| Shadowing com gravação e comparação lado a lado | Útil, mas depende de gravação de áudio persistida; MVP usa só transcrição. |
| Importar vocabulário dos seus próprios PRs, logs e Slack | Muito valioso, mas é integração; depois que o motor estiver estável. |
| Modo "leitura de docs reais" com anotação e glossário inline | Depende de fetch de páginas e parsing. Nível 1 já tem leitura com textos embutidos. |
| Mock interview por voz em tempo real com interrupções | O roleplay por voz do MVP é turno a turno; tempo real exige streaming de áudio bidirecional. |
| Multiusuário, autenticação, mobile | Uso pessoal, local. Adicionar só se o projeto virar produto. |
| Relatórios em PDF / certificados | Cosmético. O painel resolve. |
| Geração automática de aulas novas via LLM dentro do app | Risco de conteúdo genérico. Conteúdo novo passa por geração assistida + revisão, fora do app. |

---

## 5. Modelo de acompanhamento da evolução

**Unidade de medida: a tentativa.** Cada resposta a exercício, cada escrita enviada e cada fala transcrita vira um registro com: aula, tipo, acerto/nota, tags, timestamp.

**Taxonomia de tags (fixa, ~150 tags):**
- `comp.vocabulary` `comp.speaking` `comp.listening` `comp.pronunciation` `comp.reading` `comp.writing` `comp.confidence`
- `gram.*` — ex.: `gram.present-perfect`, `gram.by-until`, `gram.conditionals`, `gram.passive`, `gram.modals-polite`
- `vocab.*` — ex.: `vocab.standup`, `vocab.k8s`, `vocab.incident`, `vocab.finops`
- `br.*` — erros típicos: `br.doubt`, `br.since-present`, `br.actually`, `br.pretend`, `br.until-by`, `br.explain-me`, `br.giving-error`
- `topic.*` — situação: `topic.daily`, `topic.code-review`, `topic.incident-call`, `topic.interview`

**Pontuações:**
- Exercício objetivo: 0/1.
- Escrita: rubrica 1–5 em 4 eixos (estrutura, gramática, naturalidade, adequação de registro) → média.
- Fala (modo sem LLM): % de expressões-alvo usadas, erros BR detectados, duração dentro do limite, fluência aproximada (palavras/min) → 1–5.
- Fala (roleplay com LLM): rubrica 1–5 em clareza, gramática, naturalidade, objetivo cumprido.
- Confiança: autoavaliação 1–5 após cada simulação, cruzada com a rubrica (mostra se a percepção acompanha o desempenho).

**Critérios de conclusão:**
- Aula: quiz ≥ 75% + escrita enviada com nota ≥ 3 + fala registrada ≥ 1 vez + cards adicionados ao SRS.
- Módulo: todas as aulas concluídas + avaliação de módulo (15 itens mistos + 1 escrita) ≥ 75%.
- Nível: avaliação de nível (30 itens + escrita + simulação) ≥ 75% e simulação ≥ 3/5.

**Painel:**
- Radar das 7 competências (média móvel de 30 dias).
- Heatmap de erros por tag (últimos 30 dias) → clique leva a exercícios extras da tag.
- Retenção SRS: cards novos / em aprendizado / maduros; taxa de acerto nas revisões.
- Streak e meta semanal (aulas, revisões, minutos).
- Linha do tempo: teste inicial → checkpoints de 4 semanas → avaliações de nível, no mesmo formato, para comparação direta.

**Adaptação (regras simples, sem ML):**
- Tag fraca = taxa de erro > 40% nas últimas 20 tentativas, ou ≥ 3 erros nos últimos 7 dias.
- Warm-up da aula: 3 itens de tags fracas + 2 itens de revisão por tempo (aulas de 3, 7 e 21 dias atrás).
- Recomendação diária no painel: "revisar tag X" ou "refazer exercícios de aula Y" antes de avançar, quando houver ≥ 2 tags fracas ligadas à próxima aula.
- Roleplay recebe as tags fracas no prompt para provocar exatamente essas situações.

---

## 6. Estrutura de dados

### Conteúdo (arquivos YAML versionados, validados por schema no build)

```
content/
  levels.yaml                # níveis e módulos: id, título, objetivo, competências, pré-requisitos, aulas, critério
  modules/M01/
    module.yaml              # metadados + avaliação de módulo
    lessons/M01-01.yaml … M01-05.yaml
  placement/placement.yaml   # teste inicial
  glossary/*.yaml            # termos por tema
  br-errors.yaml             # catálogo de erros BR: padrão (regex), correção, explicação, tag
  tags.yaml                  # taxonomia fechada de tags
```

**Schema de aula (campos principais):**

```
id, module, order, title, objective, durationMin, competencies[], tags[], prerequisites[]
context:     { scenario (markdown), roles[] }
vocabulary:  [{ term, meaning, example, translation, note, register }]
grammar?:    { title, explanation (markdown), examples[] }
examples:    [{ en, pt, context }]
variations:  [{ idea, items: [{ register, text, adequate, note }] }]
brErrors:    [{ wrong, right, why, tag }]
dialogue:    { title, lines: [{ speaker, text, note? }] }
listening:   { lines: [{ speaker, text }], questions: Exercise[] }
writing:     { prompt, constraints[], rubric[], model, tags[] }
speaking:    { modeA: { prompt, maxSeconds, targetPhrases[] }, modeB?: { persona, goals[], followUps[], rubric[] } }
quiz:        Exercise[]
review:      { count, preferTags[] }
srsCards:    [{ front, back, hint?, tag }]
completion:  { quizMin, writingMin, speakingRequired }
```

**Tipos de exercício:** `multiple_choice`, `fill_blank`, `error_correction`, `reorder`, `translate`, `match`, `free_text`. Cada um com `id`, `prompt`, `answer` (ou `accepted[]`), `explanation`, `tags[]`.

### Progresso (SQLite local, um arquivo em `data/`, ignorado pelo git)

```
attempts            (id, lesson_id, exercise_id, type, correct, answer, score, tags_json, ts)
lesson_progress     (lesson_id, status, score, started_at, completed_at)
writing_submissions (id, lesson_id, text, feedback_json, score, ts)
speaking_sessions   (id, lesson_id, mode, transcript, metrics_json, score, self_confidence, ts)
srs_cards           (id, lesson_id, front, back, tag, ease, interval_days, due, reps, lapses)
srs_reviews         (id, card_id, grade, ts)
assessments         (id, kind [placement|module|level|checkpoint], ref, score_json, ts)
weekly_goals        (week_start, lessons_target, reviews_target, minutes_target)
study_sessions      (id, started_at, ended_at, lesson_id?)
settings            (key, value)
```

Estatísticas por tag são calculadas por consulta sobre `attempts` (não há tabela redundante).

---

## 7. Arquitetura e stack

### Opções consideradas

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| **A (recomendada)** | Vite + React + TypeScript no front; servidor mínimo em Hono (Node) com SQLite nativo (`node:sqlite`, sem dependência nativa) e proxy para a Claude API; conteúdo em YAML validado com zod | Leve, um único repositório, chave da API fica no servidor (`.env`), progresso em SQLite consultável por scripts e pelo Claude Code para gerar exercícios adaptados | Dois processos em dev (Vite + servidor), resolvido com um único `pnpm dev` |
| B | Next.js (App Router) com rotas de API + SQLite | Um processo só, convenções prontas | Framework maior do que o problema pede; SSR não é necessário |
| C | SPA estática pura, progresso em IndexedDB, Claude API chamada do navegador | Zero servidor | Chave da API no navegador; progresso preso ao browser, invisível para scripts e para o Claude Code; sem consultas SQL |
| D | Backend Python (FastAPI) + front HTMX | Aproveita Python | Exercícios interativos e áudio exigem JS de qualquer forma; dois ecossistemas |

**Recomendação: A.** Motivo decisivo: o progresso em SQLite local permite que o próprio Claude Code leia seus erros e gere exercícios/aulas sob medida fora do app, sem construir um gerador dentro do app.

### Dependências (todas justificadas)

| Pacote | Uso |
|---|---|
| react, react-dom, react-router | UI e navegação |
| vite, typescript | build |
| tailwindcss | estilo sem CSS artesanal |
| hono, @hono/node-server | API local (~10 rotas) |
| @anthropic-ai/sdk | correção de escrita e roleplay |
| zod | validação de conteúdo e das respostas da API |
| yaml | parse do conteúdo |
| vitest | testes (SM-2, validador, detector de erros BR, rotas) |

Sem ORM (SQL direto em ~10 tabelas), sem biblioteca de SRS (SM-2 tem 40 linhas), sem gerenciador de estado global (React Query não é necessário para um usuário local; `fetch` + hooks bastam).

### Uso da Claude API

- Modelo: `claude-opus-5` (padrão), configurável em `settings`. Thinking adaptativo, `effort: medium` para correção e `low` para turnos de roleplay (respostas curtas e rápidas).
- Credencial: `ANTHROPIC_API_KEY` no `.env` do servidor, ou perfil do `ant auth login` (o SDK resolve sozinho).
- Fluxos: (1) correção de escrita → saída estruturada (JSON com erros, correções, explicações, tags, notas de rubrica); (2) roleplay → conversa multi-turno com persona e objetivos, avaliação final estruturada; (3) avaliação de escrita em testes de módulo/nível.
- Prompt caching no system prompt (rubricas + catálogo de erros BR são estáveis).
- Fallback sem chave: escrita recebe detector de erros BR por regex + modelo de resposta + checklist; fala fica só no modo A (transcrição × alvo).

**Estimativa de custo (Opus 5, $5/$25 por milhão de tokens):**

| Ação | Tokens aprox. | Custo |
|---|---|---|
| Correção de uma escrita | 3k entrada / 1k saída | ~$0,04 |
| Roleplay de 10 turnos | 25k entrada acumulada / 4k saída | ~$0,23 |
| Semana típica (3 escritas + 2 roleplays) | — | ~$0,60 |
| Mês | — | ~$2,50 |

Trocar para `claude-sonnet-5` reduz para ~40% disso, à sua escolha.

### Áudio

- **Síntese:** `speechSynthesis` do navegador. Vozes en-US/en-GB nativas do macOS (Samantha, Daniel). Velocidade ajustável (0.8× para iniciantes).
- **Reconhecimento:** `SpeechRecognition` (Chrome, `lang: en-US`). Transcrição comparada com a frase-alvo por similaridade de palavras; palavras divergentes são destacadas para repetição. Para conversação, a transcrição vai para o LLM.
- Limitação aceita: não avalia fonemas. Documentado no app.

---

## 8. Plano de implementação em etapas

| Etapa | Entrega | Critério de aceite | Sessões estimadas |
|---|---|---|---|
| **E0 — Fundações** | Scaffold (Vite+React+TS, Hono, SQLite), schema zod + validador de conteúdo, aula M01-02 em YAML renderizada ponta a ponta com quiz e progresso salvo | `pnpm dev` sobe tudo; abrir aula, responder quiz, recarregar e ver progresso persistido; `pnpm validate` passa | 1 |
| **E1 — Motor de aula** | Os 7 tipos de exercício, os 12 blocos, TTS/STT, warm-up de revisão, critério de conclusão, navegação nível → módulo → aula | Aula completa jogável sem LLM; testes do motor de exercícios e do SM-2 | 2 |
| **E2 — Diagnóstico e painel** | Teste inicial, recomendação de nível de entrada, painel v1 (radar, heatmap de tags, streak), metas semanais | Fazer o teste, ver nível sugerido e perfil; painel reflete tentativas | 1–2 |
| **E3 — SRS e glossário** | Flashcards SM-2, tela de revisão diária, glossário com busca e áudio | Cards das aulas concluídas aparecem para revisão nas datas certas | 1 |
| **E4 — Claude API** | Correção de escrita estruturada, roleplay (texto e voz), rubricas, avaliação de módulo/nível, fallback sem chave, custo por sessão exibido | Escrita da M01-02 corrigida com explicações e tags; roleplay de standup com nota final | 2 |
| **E5 — Conteúdo Nível 1** | 30 aulas (M01–M06) + avaliações de módulo + avaliação de nível + glossário do nível + catálogo de erros BR completo | Cada lote de 5 aulas passa no validador e na checklist de qualidade (nada genérico, todo erro BR verificado, diálogos plausíveis, traduções revisadas) | 4–6 |
| **E6 — Adaptação e checkpoints** | Tags fracas → warm-up e recomendação; checkpoint de 4 semanas; export/import | Errar de propósito uma tag e ver o warm-up seguinte refletir; exportar e importar sem perda | 1 |
| E7+ | Níveis 2, 3, 4, 5 (um por etapa), com a mesma checklist de qualidade | — | 5–7 cada |

**MVP = E0 a E6.** Ordem pensada para você usar o app a partir de E1 com a aula de exemplo, e a partir de E5 com o Nível 1 inteiro.

**Processo de produção de conteúdo (E5 em diante):** para cada módulo, gero as aulas em lote a partir do roteiro, valido com o schema, e faço revisão de qualidade com checklist fixa antes de considerar pronto. Aulas nunca entram com texto placeholder.

---

## 9. Arquivos a criar (MVP)

```
projeto-ingles/
├── package.json  tsconfig.json  vite.config.ts  tailwind.config.ts  .env.example  .gitignore
├── README.md
├── content/                       # ver seção 6
│   ├── levels.yaml  tags.yaml  br-errors.yaml
│   ├── placement/placement.yaml
│   ├── glossary/{daily,infra,incident}.yaml
│   └── modules/M01…M06/{module.yaml, lessons/*.yaml}
├── scripts/
│   ├── validate-content.ts        # zod sobre todo o content/
│   └── build-content.ts           # YAML → JSON em src/generated/
├── server/
│   ├── index.ts                   # Hono, porta 3001
│   ├── db.ts                      # node:sqlite, migrações em SQL
│   ├── routes/{progress,srs,assessments,ai,export}.ts
│   ├── ai/{client,prompts,correct-writing,roleplay,evaluate}.ts
│   ├── srs/sm2.ts
│   └── br-errors/detector.ts
├── src/
│   ├── main.tsx  App.tsx  routes.tsx
│   ├── pages/{Dashboard,Placement,Levels,Module,Lesson,Review,Glossary,Settings}.tsx
│   ├── components/lesson/{Context,Vocabulary,Grammar,Examples,Dialogue,Listening,Writing,Speaking,Quiz,Feedback,WarmUp}.tsx
│   ├── components/exercises/{MultipleChoice,FillBlank,ErrorCorrection,Reorder,Translate,Match,FreeText}.tsx
│   ├── components/ui/*            # botões, cards, barra de progresso
│   ├── lib/{api,speech,scoring,tags}.ts
│   └── generated/content.json     # gerado, ignorado pelo git
├── tests/{sm2,validator,br-detector,scoring,routes}.test.ts
├── data/                          # progress.sqlite (ignorado pelo git)
└── docs/planejamento/             # estes documentos
```

Nenhum arquivo será modificado (não existe nada). Tudo acima é criação.

---

## 10. Decisões assumidas (corrija o que estiver errado)

1. Nível de entrada presumido B1 em produção oral/escrita; o teste inicial decide.
2. Sotaque-alvo americano (vozes en-US); notas sobre variantes britânicas quando relevante.
3. Você tem (ou terá) credencial da Claude API; sem ela o app funciona com fallback.
4. Meta padrão: 5 sessões/semana de 30–45 min.
5. Uso pessoal, local, um único usuário. Sem autenticação.
6. Stack da opção A.
7. Sem urgência específica (ex.: entrevista marcada) que altere a ordem da trilha.
