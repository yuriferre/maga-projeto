# Trilha completa — níveis, módulos e aulas

Convenções:
- **Competências:** VOC (vocabulário), SPK (conversação), LIS (escuta), PRO (pronúncia), REA (leitura), WRI (escrita), CNF (confiança).
- Toda aula tem os 12 blocos (ver `03-exemplo-aula-M01-02.md`). Aulas marcadas **[SIM]** têm o bloco de conversação em modo roleplay estendido (15–20 min).
- **Critério de conclusão de módulo (padrão):** todas as aulas concluídas + avaliação de módulo (15 itens mistos + 1 escrita curta) ≥ 75%. Exceções indicadas.
- **Avaliação da evolução (padrão):** nota de módulo, taxa de erro nas tags do módulo antes × depois, rubrica das simulações, cards maduros no SRS. Exceções indicadas.

---

## Nível 0 — Diagnóstico (1 sessão, 40 min)

**Objetivo:** determinar nível de entrada (N1, N2 ou N3) e perfil inicial por competência e por tag.

| Bloco | Formato | Itens | Mede |
|---|---|---|---|
| Leitura | trecho de doc oficial (AWS IAM), log de erro de pipeline, issue de GitHub | 12 | REA, VOC |
| Vocabulário em contexto | frases de trabalho com lacuna, 4 opções | 10 | VOC |
| Gramática em contexto | frases de standup/Slack com erro para corrigir ou escolher | 10 | gram.*, br.* |
| Escuta | dois áudios (standup 40s; update de incidente 40s) | 6 | LIS |
| Escrita | mensagem no Slack pedindo ajuda com um erro de Terraform (60–100 palavras) | 1 | WRI (rubrica) |
| Fala (opcional) | ler 3 frases + responder "What did you work on yesterday?" | 4 | PRO, SPK |

**Saída:** nível sugerido, radar inicial, lista de tags fracas, e a primeira meta semanal preenchida.
**Regra de corte:** < 60% → N1; 60–80% e escrita ≥ 3 → N2; > 80% e escrita ≥ 4 → N3. Você pode ignorar a sugestão.

---

## Nível 1 — Foundation: "Sobreviver ao dia a dia" (30 aulas)

Perfil de saída: participa do daily, pede ajuda e esclarece sem travar, escreve no Slack com tom certo, lê logs e docs com método, explica um sistema simples, abre ticket e PR decentes.

### M01 · Daily standups (5 aulas)
- **Objetivo:** dar um update de 30–45 s claro, no tempo verbal certo, sem soar evasivo nem alarmista.
- **Competências:** SPK, VOC, LIS; gram.present-perfect, gram.by-until, gram.still-yet-already.
- **Pré-requisitos:** nenhum.
- **Aulas:**
  1. Anatomia de um standup: yesterday / today / blockers; frases-molde; o que não dizer
  2. Reportando progresso, atraso e bloqueio (present perfect × past simple; still/yet/already) — *exemplo completo no doc 03*
  3. Tempo e prazos: ETA, EOD, by × until, within, "should be done by", "aiming for"
  4. Bloqueios e dependências: "blocked on", "waiting on", "depends on", pedir ajuda em 1 frase
  5. **[SIM]** Standup completo com 3 personas + parking lot + follow-up no Slack
- **Conclusão:** padrão + gravação de update real ≥ 3/5.
- **Evolução:** duração média do update, % de expressões-alvo usadas, erros `br.since-present` e `br.until-by` tendendo a zero.

### M02 · Pedindo ajuda e esclarecimento (5 aulas)
- **Objetivo:** pedir ajuda, dizer que não entendeu e fazer perguntas técnicas precisas sem parecer despreparado nem rude.
- **Competências:** SPK, LIS, CNF; gram.modals-polite, gram.indirect-questions.
- **Pré-requisitos:** M01.1.
- **Aulas:**
  1. Pedidos educados e escaláveis: could / would you mind / when you get a chance / this is urgent
  2. Não entendi: "I'm not sure I follow", "Do you mean…?", "Just to confirm…", "Could you go over that again?"
  3. Pergunta técnica que recebe resposta: contexto → o que tentei → pergunta específica (formato para voz e para Slack)
  4. Interromper e retomar em reunião: "Sorry to jump in", "Going back to…", "Can I ask a quick question?"
  5. **[SIM]** Pair debugging por chamada: você pede ajuda com um erro de `kubectl` e conduz a conversa
- **Conclusão:** padrão + 3 perguntas técnicas escritas avaliadas ≥ 3/5 cada.

### M03 · Slack e Teams no dia a dia (5 aulas)
- **Objetivo:** escrever mensagens curtas com tom certo, responder e fechar threads, lidar com assíncrono e fusos.
- **Competências:** WRI, VOC, REA; registro formal/neutro/informal.
- **Pré-requisitos:** M01.1.
- **Aulas:**
  1. Tom e formato: "no hello", threads, quando marcar @alguém, emojis e reações
  2. Fórmulas que resolvem 80%: FYI, heads up, quick question, +1, TL;DR, "any objections?"
  3. Responder e fechar: acknowledging, "on it", "will do", "done ✅", "thanks for flagging", "sounds good"
  4. Assíncrono e fusos: "EOD my time", "I'll pick this up tomorrow morning", handoffs, avisos de ausência
  5. Escrita guiada: 10 mensagens reais (pedido, aviso, follow-up, escalada leve, desculpa por atraso)
- **Conclusão:** padrão + 10 mensagens corrigidas com média ≥ 3,5/5.
- **Evolução:** tamanho médio da mensagem caindo, erros de registro caindo.

### M04 · Lendo logs, erros e documentação (5 aulas)
- **Objetivo:** ler com método mensagens de erro, stack traces, READMEs e issues, e resumir o que leu em uma frase.
- **Competências:** REA, VOC.
- **Pré-requisitos:** nenhum.
- **Aulas:**
  1. Anatomia de mensagens de erro: expected/got, failed to, unable to, denied, timed out, refused, not found
  2. Stack traces e logs estruturados: verbos e padrões recorrentes; ler de baixo para cima
  3. READMEs e docs oficiais: skimming, headings, "prerequisites", "caveats", "deprecated", "breaking change"
  4. Issues e PRs no GitHub: reproduzir, comentar, "same here", "can confirm", "workaround", "+1 on this"
  5. Prática: 6 leituras reais (doc do Terraform, erro do Helm, issue do Argo CD, log do CloudWatch, changelog, RFC curta) com perguntas
- **Conclusão:** padrão + resumo de 1 frase para cada uma das 6 leituras avaliado.

### M05 · Descrevendo sistemas e fluxos (5 aulas)
- **Objetivo:** explicar uma arquitetura e um fluxo de requisição em voz alta, com verbos e preposições certos.
- **Competências:** SPK, VOC, PRO; gram.present-simple-process, gram.prepositions-infra.
- **Pré-requisitos:** M01.
- **Aulas:**
  1. Componentes e relações: "there is/are", "sits behind", "talks to", "is fronted by", "backed by"
  2. Fluxos: "the request goes through → hits → gets routed to → returns"; voz passiva útil
  3. Preposições e verbos de infraestrutura: on/in/at, "deploy to", "run on", "expose via", "listen on", "point to"
  4. Explicando um diagrama: signposting básico ("on the left", "this box here", "the arrow means")
  5. **[SIM]** Explicar sua arquitetura atual para um colega novo (com diagrama seu)
- **Conclusão:** padrão + explicação gravada de 2 min ≥ 3/5.

### M06 · Tickets, commits e PRs (5 aulas)
- **Objetivo:** escrever ticket, commit, PR e comentários básicos que outros conseguem agir sem perguntar.
- **Competências:** WRI, REA; gram.imperative.
- **Pré-requisitos:** M03, M04.
- **Aulas:**
  1. Ticket: título, contexto, steps to reproduce, expected × actual, ambiente
  2. Commit messages e títulos de PR: imperativo, escopo, convenções; o que não escrever
  3. PR description: what / why / how to test / risks
  4. Comentar e responder em PRs (básico): "good catch", "addressed", "PTAL", "nit:", "LGTM"
  5. Prática: 3 tickets + 2 PRs a partir de cenários (Terraform, pipeline, Helm chart)
- **Conclusão:** padrão + 5 textos avaliados ≥ 3,5/5.

### Avaliação de Nível 1
30 itens mistos (todas as tags do nível) + escrita (ticket completo) + simulação (standup + pedir ajuda). Aprovação: ≥ 75% e simulação ≥ 3/5. Compara radar com o teste inicial.

---

## Nível 2 — Professional: "Participar ativamente" (40 aulas)

Perfil de saída: contribui em refinamento e retro, dá e recebe feedback, faz e responde code review, explica um bug e sua correção, discute pipeline, IaC, containers e clouds, escreve e-mail e runbook.

### M07 · Planejamento, refinamento e estimativas (5 aulas)
- **Objetivo:** participar de refinamento: entender a história, levantar dúvidas, estimar com cautela e registrar riscos.
- **Competências:** SPK, LIS, VOC; gram.conditionals-real, gram.hedging.
- **Pré-requisitos:** M01, M02.
- **Aulas:**
  1. Vocabulário de backlog: story, epic, spike, acceptance criteria, definition of done, scope creep
  2. Estimando com cautela: "I'd say", "roughly", "ballpark", "it depends on", "give or take"
  3. Condicionais reais: "If we go with X, we'll need…", "unless", "as long as", "in case"
  4. Levantando dúvidas e riscos de escopo: "one thing that's not clear to me", "have we considered…?"
  5. **[SIM]** Refinamento de uma história de infraestrutura com PO e dev
- **Conclusão:** padrão + simulação ≥ 3/5.

### M08 · Retrospectivas e 1:1s (5 aulas)
- **Objetivo:** falar de problemas do time sem culpar, dar e receber feedback, conduzir um 1:1 com objetivo.
- **Competências:** SPK, CNF; gram.softeners, gram.would-like.
- **Pré-requisitos:** M02.
- **Aulas:**
  1. Retro: what went well / what didn't / action items — linguagem neutra e específica
  2. Dando feedback construtivo: "I noticed", "it would help if", "one thing I'd suggest"
  3. Recebendo feedback: "fair point", "I'll work on that", "can you give me an example?"
  4. 1:1 com gestor: prioridades, carga, carreira, "I'd like to get more exposure to…", "what would it take to…"
  5. **[SIM]** Retro + 1:1 (dois cenários curtos)

### M09 · Code review (5 aulas)
- **Objetivo:** sugerir, pedir mudanças e responder reviews com tom certo e vocabulário preciso.
- **Competências:** WRI, REA, VOC.
- **Pré-requisitos:** M06.
- **Aulas:**
  1. Sugerindo sem impor: "consider", "what do you think about", "nit:", "non-blocking", "optional"
  2. Pedindo mudanças: "this would break…", "could we…", "I'd rather we…"; severidade explícita
  3. Respondendo: concordar, discordar com motivo, "addressed in abc123", "I'll do that in a follow-up"
  4. Léxico de review: refactor, extract, inline, dead code, edge case, race condition, off-by-one
  5. Prática: revisar 3 PRs reais (módulo Terraform, script Python, YAML de pipeline) e responder a 3 reviews recebidos
- **Conclusão:** padrão + 6 comentários de review avaliados ≥ 3,5/5.

### M10 · Explicando problemas e soluções (5 aulas)
- **Objetivo:** narrar um problema, o que foi tentado, a causa e a solução, em voz e em texto.
- **Competências:** SPK, WRI; gram.past-narrative, gram.cause-effect.
- **Pré-requisitos:** M04, M05.
- **Aulas:**
  1. Narrativa de problema: symptom → context → what I tried → what I found
  2. Causa e efeito: "turned out", "because of", "which caused", "led to", "as a result"
  3. Verbos de troubleshooting: narrow down, rule out, reproduce, roll back, patch, bisect, work around
  4. Propondo solução com alternativas: "one option is… another would be…", "the quickest fix is…, the proper fix is…"
  5. **[SIM]** Explicar um bug e a correção numa thread e depois em voz para o time

### M11 · CI/CD e Infraestrutura como Código (5 aulas)
- **Objetivo:** discutir pipelines e IaC em conversa e em PR, descrever falhas e estratégias de rollout.
- **Competências:** VOC, SPK, WRI.
- **Pré-requisitos:** M06, M10.
- **Aulas:**
  1. Vocabulário de pipelines: stage, job, artifact, runner, trigger, flaky, gate, promote
  2. Descrevendo falhas de pipeline e como corrigiu (narrativa + verbos)
  3. Terraform/IaC em conversa: plan, apply, drift, state, module, "it wants to recreate the RDS instance"
  4. Estratégias: trunk-based, feature flags, blue/green, canary, rollback — comparar e recomendar
  5. **[SIM]** Revisão de mudança de pipeline + discussão de estratégia de rollout

### M12 · Containers e Kubernetes (5 aulas)
- **Objetivo:** descrever estados, fazer troubleshooting em voz alta e discutir recursos e escala.
- **Competências:** VOC, SPK, PRO.
- **Pré-requisitos:** M05, M10.
- **Aulas:**
  1. Vocabulário: image, pod, node, deployment, service, ingress, namespace, probe, sidecar
  2. Descrevendo estados: crash-looping, pending, evicted, OOMKilled, throttled, "stuck in ContainerCreating"
  3. Troubleshooting narrado: "let me describe the pod", "the liveness probe is failing", "I'll tail the logs"
  4. Recursos e escala: requests/limits, HPA, "we're over-provisioned", "it's getting throttled"
  5. **[SIM]** Incidente leve de K8s em pair com colega (você conduz)

### M13 · E-mails e documentação (5 aulas)
- **Objetivo:** escrever e-mails profissionais, README e runbook claros.
- **Competências:** WRI; gram.formal-register, gram.imperative.
- **Pré-requisitos:** M03, M06.
- **Aulas:**
  1. E-mail profissional: assunto, abertura, corpo, fechamento; formal × neutro; o que soa "traduzido"
  2. E-mails comuns: pedido, follow-up, agendamento, escalada, agradecimento, "gentle reminder"
  3. README e documentação: estrutura, imperativo, exemplos, "Note" / "Warning", evitar prosa
  4. Runbooks: pré-condições, passos numerados, verificação, rollback, quem chamar
  5. Prática: 1 e-mail de escalada + 1 runbook completo
- **Conclusão:** padrão + os 2 textos ≥ 4/5.

### M14 · Cloud providers: AWS, Azure, GCP (5 aulas)
- **Objetivo:** falar dos serviços dos três provedores, comparar e justificar escolhas, ler pricing e limites.
- **Competências:** VOC, REA, SPK.
- **Pré-requisitos:** M05.
- **Aulas:**
  1. Mapa de serviços e como se fala deles (compute, storage, networking, IAM) nos três provedores
  2. Termos que confundem: region/zone, managed/serverless, provisioned/on-demand, "spin up", "tear down"
  3. Comparando e justificando: "X is a better fit because…", "the trade-off is…"
  4. Lendo docs e pricing pages: quotas, limits, SLAs, "per-request", "tiered pricing"
  5. **[SIM]** Apresentar proposta de migração de um serviço para outro provedor

### Avaliação de Nível 2
30 itens + code review escrito (3 comentários) + e-mail de escalada + simulação de refinamento. Aprovação: ≥ 75%, escritas ≥ 3,5/5, simulação ≥ 3/5.

---

## Nível 3 — Incident-ready: "Liderar sob pressão" (30 aulas)

Perfil de saída: comunica incidente do primeiro alerta ao post-mortem, participa e conduz bridge, discute SLOs, segurança e custos com números.

### M15 · Comunicação de incidentes (5 aulas)
- **Objetivo:** escrever e falar atualizações de incidente para técnicos e não técnicos, com cadência e confiança.
- **Competências:** WRI, SPK; gram.present-continuous-perfect, gram.passive-status.
- **Pré-requisitos:** M10, M03.
- **Aulas:**
  1. Severidades e impacto: customer-facing, degraded, partial outage, blast radius, "affects roughly 20% of…"
  2. Primeira atualização: template (what / impact / current status / next update at)
  3. Atualizações periódicas: "we're still investigating", "we've identified", "mitigated", "monitoring"
  4. Stakeholders não técnicos: sem jargão, com confiança, sem prometer o que não sabe
  5. Encerrando: "resolved", "we'll follow up with a post-mortem by…", agradecimentos
- **Conclusão:** padrão + sequência de 4 atualizações escritas ≥ 4/5.

### M16 · Incident calls (bridges) (5 aulas)
- **Objetivo:** participar e conduzir uma bridge: pedir e dar informação, decidir, interromper e realinhar.
- **Competências:** SPK, LIS, CNF.
- **Pré-requisitos:** M15, M02.4.
- **Aulas:**
  1. Papéis e protocolo: incident commander, scribe, comms lead; abrir e estruturar a chamada
  2. Informação sob pressão: "can someone confirm…", "I'm seeing…", "what's the current state of…"
  3. Decidindo: "let's roll back", "I'd rather…", "hold off on…", "go ahead", "we need a decision on…"
  4. Interromper, corrigir e realinhar: "hang on", "let's stay on…", "we're going in circles"
  5. **[SIM]** Bridge de 15 min com 3 personas; você é o incident commander
- **Conclusão:** padrão + simulação ≥ 3/5.

### M17 · Post-mortems (5 aulas)
- **Objetivo:** escrever um post-mortem blameless completo.
- **Competências:** WRI; gram.passive-blameless, gram.timeline.
- **Pré-requisitos:** M15, M13.
- **Aulas:**
  1. Cultura blameless: linguagem que evita culpa ("the change" em vez de "John's change"), voz passiva útil
  2. Timeline: horários, timezones, verbos ("alerts fired", "was paged", "rolled back")
  3. Root cause e contributing factors: "the underlying cause", "exacerbated by", "went unnoticed because"
  4. Action items: owner, prazo, verbo de ação, prioridade; evitar itens vagos
  5. Prática: post-mortem completo a partir de um incidente dado (timeline crua fornecida)
- **Conclusão:** post-mortem ≥ 4/5.

### M18 · Observabilidade, SLOs e performance (5 aulas)
- **Objetivo:** descrever gráficos, SLOs e gargalos em voz e em texto.
- **Competências:** VOC, SPK; gram.describing-trends.
- **Pré-requisitos:** M12.
- **Aulas:**
  1. Metrics, logs, traces: vocabulário e verbos ("emit", "scrape", "sample", "correlate")
  2. Descrevendo gráficos: spiked, dropped, plateaued, flat, spiky, "p99 latency went from… to…"
  3. SLOs e error budget: "we're burning budget", "within SLO", "burn rate", "the SLI is…"
  4. Performance: bottleneck, throughput, saturation, "it's CPU-bound", "we're hitting connection limits"
  5. **[SIM]** Apresentar análise de degradação com gráfico para o time

### M19 · Segurança (5 aulas)
- **Objetivo:** reportar e discutir problemas de segurança com urgência proporcional e vocabulário preciso.
- **Competências:** VOC, WRI, SPK.
- **Pré-requisitos:** M15.
- **Aulas:**
  1. Vocabulário: vulnerability, CVE, exposure, least privilege, hardening, secret sprawl, lateral movement
  2. Reportando: urgência sem pânico, canal certo, o que incluir, o que não escrever em canal aberto
  3. Riscos e compliance: "this violates…", "we're required to…", audit, evidence, "compensating control"
  4. Respondendo a findings: remediação, aceitação de risco, prazo, "we'll track it under…"
  5. **[SIM]** Discutir um finding de pentest com o time e negociar prazo

### M20 · Custos e FinOps (5 aulas)
- **Objetivo:** falar de custo com números, justificar gasto e apresentar economia.
- **Competências:** SPK, VOC; gram.numbers-percentages.
- **Pré-requisitos:** M14.
- **Aulas:**
  1. Vocabulário: cost driver, right-sizing, reserved/savings plan, spot, egress, idle, "showback"
  2. Falando de números: percentuais, ordens de grandeza, "roughly a third", "a 40% increase month over month"
  3. Justificando gasto e apresentando economia: "this pays for itself in…", "the bulk of the cost is…"
  4. Trade-off custo × risco × esforço: "we could save X, but…"
  5. **[SIM]** Apresentar plano de redução de custo para gestor não técnico

### Avaliação de Nível 3
30 itens + post-mortem + sequência de updates + simulação de bridge. Aprovação: ≥ 75%, post-mortem ≥ 4/5, bridge ≥ 3/5.

---

## Nível 4 — Influence: "Influenciar e decidir" (29 aulas)

Perfil de saída: defende decisões, apresenta riscos, discorda sem atrito, apresenta e demonstra, escreve e revisa RFCs, navega diferenças culturais.

### M21 · Defendendo decisões técnicas (5 aulas)
- **Objetivo:** argumentar uma decisão com estrutura, lidar com pushback e admitir limites.
- **Competências:** SPK, WRI, CNF; gram.argument-connectors.
- **Pré-requisitos:** M10, M14.
- **Aulas:**
  1. Estrutura: context → options → decision → rationale → consequences
  2. ADRs: escrever e discutir; "we chose X over Y because…"
  3. Pushback: "that's a fair concern, however…", "I hear you, and…", "let me address that"
  4. Limites: "we don't know yet", "I'd want to validate that before committing", "I might be wrong about…"
  5. **[SIM]** Defender decisão em design review com 2 revisores céticos

### M22 · Riscos e trade-offs (5 aulas)
- **Objetivo:** apresentar riscos, trade-offs e mitigações de forma que ajude a decidir.
- **Competências:** SPK, WRI; gram.probability-modals.
- **Pré-requisitos:** M21.
- **Aulas:**
  1. Linguagem de risco: likelihood, impact, "there's a chance that", "worst case", "the exposure here is…"
  2. Trade-offs: "we're trading X for Y", "the downside is…", "on balance…"
  3. Mitigações e planos B: "to reduce that risk…", "if that happens, we…"
  4. Para decisão: recomendação clara + alternativas + o que você precisa de quem decide
  5. Prática: análise de risco escrita de uma migração de banco

### M23 · Discordando profissionalmente (5 aulas)
- **Objetivo:** discordar com o nível certo de diretude e buscar consenso.
- **Competências:** SPK, CNF, LIS.
- **Pré-requisitos:** M08, M21.
- **Aulas:**
  1. Escala de discordância: suave → direto; quando usar cada grau
  2. Fórmulas: "I see it differently", "I'd push back on…", "I'm not convinced that…", "I'm not sure that follows"
  3. Diferenças culturais: EUA, Reino Unido, Índia, Alemanha, Holanda — como cada um discorda, e como o Brasil soa para eles
  4. Consenso: "can we agree that…", "what would it take to…", "let's park that and…"
  5. **[SIM]** Debate técnico com colega insistente (monólito × microsserviços para um caso dado)

### M24 · Apresentações e demos (5 aulas)
- **Objetivo:** apresentar 5–10 min com estrutura, descrever slides/diagramas, fazer demo e lidar com Q&A.
- **Competências:** SPK, PRO, CNF.
- **Pré-requisitos:** M05, M18.
- **Aulas:**
  1. Estrutura e signposting: "I'll start with…", "moving on to…", "to wrap up…", "that brings me to…"
  2. Descrevendo diagramas e slides ao vivo; ritmo e pausas
  3. Demos: narrar enquanto executa; "while this runs…"; falhas ao vivo sem pânico
  4. Q&A: ganhar tempo, reformular, "good question", não saber a resposta com elegância
  5. **[SIM]** Apresentar 5 min sobre projeto seu (gravado, avaliado por rubrica)

### M25 · RFCs e design reviews (5 aulas)
- **Objetivo:** ler, escrever e revisar propostas técnicas.
- **Competências:** WRI, REA.
- **Pré-requisitos:** M21, M22.
- **Aulas:**
  1. Lendo RFCs: estrutura, "non-goals", "alternatives considered", "open questions"
  2. Escrevendo uma proposta técnica (1–2 páginas)
  3. Comentando propostas: perguntas de esclarecimento × objeções × sugestões
  4. Convergindo: resolver comentários, registrar decisão, "resolving this thread"
  5. Prática: escrever RFC curta + revisar RFC de colega (fornecida)
- **Conclusão:** RFC ≥ 4/5 + 5 comentários de review ≥ 3,5/5.

### M26 · Colaboração multicultural e small talk (4 aulas)
- **Objetivo:** abrir e fechar reuniões com naturalidade, entender idioms reais, reconhecer humor e sarcasmo.
- **Competências:** SPK, LIS, CNF.
- **Pré-requisitos:** M08.
- **Aulas:**
  1. Small talk profissional: início de reunião, sexta-feira, feriados, clima, "how's it going?" (e como responder)
  2. Cultura assíncrona e fusos: expectativas, "circle back", "take it offline", "let's sync"
  3. Idioms e phrasal verbs que aparecem de verdade (e os que evitar): "low-hanging fruit", "bandwidth", "loop in", "push back"
  4. Humor, ironia e sarcasmo: reconhecer, reagir, e quando não tentar

### Avaliação de Nível 4
RFC escrita + apresentação gravada 5 min + debate simulado. Aprovação: RFC ≥ 4/5, apresentação ≥ 3,5/5, debate ≥ 3/5.

---

## Nível 5 — Career: "Carreira internacional" (28 aulas)

Perfil de saída: passa por screening, entrevista comportamental e técnica em inglês, negocia oferta e faz onboarding sem depender de ninguém.

### M27 · Apresentação profissional e histórias de experiência (5 aulas)
- **Objetivo:** contar sua trajetória em 30 s, 2 min e em formato STAR, com impacto quantificado.
- **Competências:** SPK, CNF.
- **Pré-requisitos:** M10, M24.
- **Aulas:**
  1. Elevator pitch: 30 s, 60 s, 2 min — mesmas ideias, três tamanhos
  2. Cargos e responsabilidades: "I was responsible for", "I led", "I owned", "I partnered with"
  3. Quantificando impacto: números, antes/depois, "reduced deploy time from 40 min to 6"
  4. STAR para histórias técnicas: incidente, migração, redução de custo, conflito
  5. Prática: 5 histórias STAR do seu histórico real (gravadas e corrigidas)

### M28 · Conversas com recrutadores (4 aulas)
- **Objetivo:** conduzir um screening call e falar de expectativas com naturalidade.
- **Competências:** SPK, LIS.
- **Pré-requisitos:** M27.
- **Aulas:**
  1. Screening call: roteiro típico, perguntas frequentes, o que o recrutador quer ouvir
  2. Expectativas: salário ("I'm targeting…", "what's the range?"), remoto, disponibilidade, visto, notice period
  3. Perguntas para fazer ao recrutador (que mostram senioridade)
  4. **[SIM]** Screening call completo (20 min)

### M29 · Entrevistas comportamentais (5 aulas)
- **Objetivo:** responder perguntas comportamentais com estrutura, sinais de senioridade e sem decorar.
- **Competências:** SPK, CNF.
- **Pré-requisitos:** M27.
- **Aulas:**
  1. Perguntas clássicas: conflict, failure, ownership, ambiguity, "tell me about a time…"
  2. Respostas estruturadas sem decorar: esqueleto + detalhes reais
  3. Pontos fracos, gaps, mudanças de emprego, demissões — sem defensividade
  4. Sinais de senioridade na fala: trade-offs, "in hindsight", "what I'd do differently"
  5. **[SIM]** Entrevista comportamental 30 min

### M30 · Entrevistas técnicas e system design (6 aulas)
- **Objetivo:** pensar em voz alta, esclarecer requisitos e narrar design e troubleshooting em formato de entrevista.
- **Competências:** SPK, LIS, CNF.
- **Pré-requisitos:** M05, M12, M18, M21.
- **Aulas:**
  1. Pensar em voz alta: "let me think", "my first instinct is…", "let me clarify…", silêncio produtivo
  2. Esclarecendo requisitos antes de responder: escala, restrições, "what matters most here?"
  3. System design narrado: componentes, trade-offs, escala, "if traffic grows 10×…"
  4. Troubleshooting scenarios (SRE): "the site is slow — walk me through", "a deploy just went out and…"
  5. Perguntas de DevOps/Cloud em formato entrevista: IaC, CI/CD, K8s, observability, IAM
  6. **[SIM]** Entrevista técnica 45 min (design + troubleshooting)

### M31 · Ofertas e negociação (4 aulas)
- **Objetivo:** entender uma oferta e negociar com educação.
- **Competências:** SPK, REA, WRI.
- **Pré-requisitos:** M28.
- **Aulas:**
  1. Componentes de oferta: base, bonus, equity (RSU/options, vesting), benefits, PTO, sign-on
  2. Negociando: "I was hoping for…", "is there flexibility on…", "based on other conversations I'm having…"
  3. Aceitar, pedir tempo e recusar por escrito
  4. **[SIM]** Negociação de oferta

### M32 · Onboarding em empresa internacional (4 aulas)
- **Objetivo:** atravessar as primeiras semanas com iniciativa e sem medo de perguntar.
- **Competências:** SPK, WRI, CNF.
- **Pré-requisitos:** M26.
- **Aulas:**
  1. Primeiras semanas: se apresentar, mensagem de intro no Slack, perguntas sem medo
  2. Construindo relação: 1:1s de conhecimento, "coffee chat", "I'd love to learn how your team…"
  3. Pedindo contexto e documentação: "is there a doc for…", "who owns…", "what's the history behind…"
  4. **[SIM]** Primeira semana (3 cenários curtos)

### Avaliação de Nível 5
Entrevista simulada completa (screening 10 min + comportamental 15 min + técnica 20 min). Aprovação: ≥ 4/5.

---

## Tabela-resumo

| Nível | Módulos | Aulas | Simulações [SIM] | Semanas a 3 aulas/semana |
|---|---|---|---|---|
| 1 | 6 | 30 | 3 | 10 |
| 2 | 8 | 40 | 6 | 13–14 |
| 3 | 6 | 30 | 4 | 10 |
| 4 | 6 | 29 | 3 | 10 |
| 5 | 6 | 28 | 5 | 9–10 |
| **Total** | **32** | **157** | **21** | **~52** |
