# Aula de exemplo — M01.2 · Reportando progresso, atraso e bloqueio no daily

Este documento mostra uma aula completa exatamente como será implementada (os 12 blocos). Instruções em português; conteúdo-alvo em inglês. No app, cada bloco é uma seção navegável; o áudio dos diálogos é gerado por síntese de voz; exercícios são interativos e registram tentativas com tags.

**Metadados**

| Campo | Valor |
|---|---|
| id | `M01-02` |
| Duração | 35–40 min |
| Competências | SPK (principal), VOC, LIS; gramática em contexto |
| Pré-requisito | M01.1 (estrutura yesterday / today / blockers) |
| Tags | `topic.daily` `gram.present-perfect` `gram.since-for` `gram.by-until` `gram.still-yet-already` `vocab.standup` `br.since-present` `br.doubt` `br.until-by` `br.giving-error` `comp.speaking` |
| Conclusão | quiz ≥ 6/8 · escrita enviada com nota ≥ 3/5 · fala registrada ≥ 1× · 12 cards no SRS |

---

## 1. Objetivo da aula

Ao final, você consegue dar um update de 30–45 segundos que diga **o que fez, o que vai fazer e onde está travado**, usando past simple e present perfect nos lugares certos, sinalizando atraso cedo e sem soar evasivo ("almost done, almost") nem alarmista ("everything is broken").

---

## 2. Contexto profissional real

Você é SRE num time distribuído (Brasil, Portugal, EUA). Daily às 10h BRT, 15 minutos, 7 pessoas, câmera ligada.

Ontem você começou a migrar o pipeline de deploy do serviço `payments-api` do Jenkins para GitHub Actions. Build e lint já funcionam. O job de testes de integração falha por timeout ao subir o container de Postgres no runner. Você já aumentou o timeout para 10 minutos e não resolveu. O prazo combinado com o time era hoje. Você também está esperando a Ana revisar um PR de Terraform desde ontem.

Você precisa dizer tudo isso em menos de um minuto, deixar claro que não está parado, avisar que pode atrasar e pedir ajuda sem transformar o daily em sessão de debugging.

---

## 3. Vocabulário e expressões essenciais

| # | Expressão | Quando usar | Exemplo | Nota |
|---|---|---|---|---|
| 1 | **I've been working on X** | atividade que começou antes e continua | I've been working on the payments-api pipeline migration. | Nunca "I'm working on X since yesterday". |
| 2 | **I got X done** / **I finished X** | tarefa concluída | I got the build and lint stages done. | "got done" é neutro e muito comum em standup. |
| 3 | **I'm still on X** | continua na mesma tarefa; neutro, não é desculpa | I'm still on the integration tests. | |
| 4 | **I'm blocked on X** | algo impede você de avançar | I'm blocked on the Postgres container timing out. | "blocked by" também existe, mas "blocked on" é mais usual para o problema em si. |
| 5 | **I'm waiting on X (from Y)** | dependência de alguém | I'm waiting on a review from Ana. | "waiting for" também é correto. Sem preposição é erro. |
| 6 | **It's taking longer than expected** | atraso sem drama | The integration tests are taking longer than expected. | Registro neutro, funciona em qualquer time. |
| 7 | **I should have it done by EOD** | previsão em que você confia | I should have it done by EOD. | "should" = confiança razoável. |
| 8 | **I'm aiming to have it done by…** | meta com risco | I'm aiming to have it done by tomorrow. | "aiming" avisa que pode não dar. |
| 9 | **This might slip (to tomorrow)** | avisar que o prazo pode escorregar | Heads up: this might slip to tomorrow. | "slip" é o verbo padrão para prazo que atrasa. |
| 10 | **I'll need another day on this** | pedir mais tempo | Realistically, I'll need another day on this. | "Realistically" suaviza e mostra maturidade. |
| 11 | **Heads up:** | aviso antecipado | Heads up: the deploy window may move. | Informal-neutro; ótimo para Slack e voz. |
| 12 | **It turned out (that)…** | descoberta depois de investigar | It turned out the runner doesn't have enough memory. | Substitui "I discovered that", que soa formal demais. |
| 13 | **I've tried X, but it didn't help** | mostrar o que já tentou | I've tried bumping the timeout, but it didn't help. | "bump" = aumentar (informal, comum em infra). |
| 14 | **Can someone pair with me on this after the call?** | pedir ajuda sem travar o daily | | "after the call" mantém o daily curto. |
| 15 | **No blockers** / **Nothing blocking me** | fechar o update | | Diga sempre, mesmo quando não há bloqueio. |
| 16 | **Quick one:** / **One more thing:** | introduzir item extra | Quick one: is anyone touching the RDS module this week? | |

---

## 4. Explicação gramatical (só o necessário)

### Past simple × present perfect × present perfect continuous no standup

| Forma | Uso no standup | Exemplo |
|---|---|---|
| Past simple | ação fechada num momento definido ("yesterday") | Yesterday I **fixed** the build stage. |
| Present perfect | resultado que importa **agora**, sem marcar quando | I**'ve fixed** the build stage. (está pronto, pode usar) |
| Present perfect continuous | atividade em andamento, começou antes e continua | I**'ve been working** on the migration since Monday. |

**Regra prática:** *yesterday* → past simple · estado atual → present perfect (simple ou continuous) · *today* → going to / will / aiming to.

**since / for exigem present perfect.** Em português "estou trabalhando nisso desde ontem" usa presente. Em inglês: *I've been working on this since yesterday* / *for two days*. "I'm working on this since yesterday" é o erro mais frequente de brasileiros no daily.

### still / yet / already

| Palavra | Posição | Frase | Sentido |
|---|---|---|---|
| still | antes do verbo principal, afirmativa | I'm **still** waiting on the review. | continua |
| yet | fim da frase, negativa ou pergunta | It hasn't been merged **yet**. / Is it merged **yet**? | ainda não |
| already | antes do verbo principal, afirmativa | It's **already** merged. | já |

### by × until

- **by** = prazo (até, no máximo): *I'll have it done **by** Friday.*
- **until** = duração (até, durante): *I'll be working on it **until** Friday.*
- "I will finish until Friday" está errado e soa estranho para nativos.

---

## 5. Exemplos naturais (com tradução e contexto)

| Inglês | Português | Contexto de uso |
|---|---|---|
| Yesterday I got the build and lint stages working. Today I'm on the integration tests. | Ontem fiz build e lint funcionarem. Hoje estou nos testes de integração. | Update normal, sem problema. |
| I'm still on the pipeline migration. The integration job keeps timing out when it spins up Postgres. | Ainda estou na migração. O job de integração fica dando timeout ao subir o Postgres. | Atraso com causa clara. "keeps + -ing" = acontece repetidamente. |
| I've tried bumping the timeout to ten minutes, but it didn't help, so I'm going to look at the runner's resources next. | Tentei aumentar o timeout para dez minutos, mas não ajudou, então vou olhar os recursos do runner. | Mostra que você não está parado e tem próximo passo. |
| Heads up: this might slip to tomorrow. I'll know more by lunchtime. | Aviso: pode escorregar para amanhã. Saberei mais até o almoço. | Gerenciar expectativa cedo, com data para nova informação. |
| I'm blocked on access to the staging cluster. I've asked in #platform-support but haven't heard back yet. | Estou bloqueado no acesso ao cluster de staging. Pedi no canal, mas ainda não responderam. | Bloqueio por terceiros, já com ação tomada. |
| No blockers on my side. Quick one: is anyone touching the Terraform for the RDS module this week? I'd rather not step on toes. | Sem bloqueios. Uma rápida: alguém mexendo no Terraform do RDS esta semana? Prefiro não atropelar ninguém. | Fechar update e coordenar. "step on toes" = pisar no trabalho de alguém. |
| Realistically, I'll need another day on this. | Sendo realista, vou precisar de mais um dia. | Pedir tempo com maturidade. |

### Variações da mesma ideia: "está atrasado"

| Registro | Frase | Adequada? |
|---|---|---|
| Neutro | It's taking longer than I expected. | Sim |
| Direto | I won't have this done today. | Sim |
| Com plano | This is going to slip a day; I'll have it done by tomorrow EOD. | Sim, a melhor |
| Informal (time próximo) | Still fighting the integration tests. | Sim, com colegas |
| Inadequada | Sorry, sorry, I'm so slow, I couldn't do it… | Não: autodepreciação sem informação |
| Inadequada | It's not my fault, the runner is bad. | Não: culpa sem dado, sem próximo passo |
| Inadequada | It's almost done, almost. | Não: evasivo; ninguém sabe o que significa |

### Registro: "estou bloqueado"

| Registro | Frase |
|---|---|
| Formal (e-mail ao gestor) | I'm currently unable to proceed due to a pending access request. |
| Neutro (daily) | I'm blocked on access to staging. |
| Informal (Slack com colega) | Still no staging access 😅 any idea who can unblock me? |

---

## 6. Erros comuns de brasileiros nesta situação

| Errado | Certo | Por quê | Tag |
|---|---|---|---|
| I'm working on this since yesterday. | I've been working on this since yesterday. | since/for pedem present perfect | `br.since-present` |
| I didn't finish yet. | I haven't finished yet. | "yet" pede present perfect | `gram.still-yet-already` |
| I have a doubt about the runner. | I have a question about the runner. / I'm not sure about… | "doubt" = desconfiança, não dúvida | `br.doubt` |
| I will finish it until Friday. | I'll have it done by Friday. | until = duração; by = prazo | `br.until-by` |
| Actually I finished it. (querendo dizer "atualmente") | I've finished it now. / It's done now. | actually = na verdade | `br.actually` |
| I'm waiting the review. | I'm waiting on/for the review. | o verbo exige preposição | `br.waiting-no-prep` |
| It's giving error. | It's throwing an error. / It's failing with a timeout. / It's timing out. | calque de "está dando erro" | `br.giving-error` |
| I pretend to finish today. | I intend to / I plan to finish today. | pretend = fingir | `br.pretend` |
| I'm doing the deploy today. (plano) | I'm going to deploy today. / I'll deploy today. | presente contínuo soa como "agora"; ok se está agendado | `gram.future-plans` |
| Can you explain me the runner setup? | Can you explain the runner setup to me? / Can you walk me through the runner setup? | explain não aceita objeto indireto direto | `br.explain-me` |
| I stayed until late to fix it. | I stayed late to fix it. | "until late" não existe | `br.until-late` |

---

## 7. Diálogo (áudio por síntese de voz, 4 vozes)

**Standup, 10:00 BRT. Sete pessoas; trecho com quatro.**

> **Priya (scrum master):** Morning everyone. Let's go around. Yuri, you're up.
>
> **Yuri:** Morning. Yesterday I got the build and lint stages of the payments-api pipeline working on GitHub Actions. I'm still on the integration tests — the job keeps timing out when it spins up the Postgres service container. I've tried bumping the timeout, but it didn't help, so today I'm going to check the runner's memory and try a smaller Postgres image. Heads up: this might slip to tomorrow. And I'm waiting on a review from Ana on the Terraform PR.
>
> **Ana:** Sorry, I'll get to it right after this.
>
> **Yuri:** No worries, thanks.
>
> **Priya:** Do you need a hand with the runner thing?
>
> **Yuri:** Actually, yeah. Marcos, could you pair with me for twenty minutes after the call? You set up the runners, right?
>
> **Marcos:** Sure, ping me.
>
> **Priya:** Great. Next — Ana?

**Notas do diálogo**
- "You're up" = é a sua vez. "Do you need a hand?" = precisa de ajuda?
- "Actually, yeah" aqui é o uso correto de *actually* (= na verdade, sim), diferente do erro "actually = atualmente".
- "Ping me" = me chama (no Slack). "No worries" = sem problema; resposta padrão para um pedido de desculpa pequeno.
- O update de Yuri tem 75 palavras e ~35 segundos. Cobre: feito / em andamento / tentativa / próximo passo / risco de prazo / dependência.

---

## 8. Exercício de compreensão auditiva

Ouça os três updates (áudio; pode repetir e reduzir a velocidade). Responda sem ler a transcrição. A transcrição só aparece depois de responder.

> **Ana:** Yesterday I finished the RDS module refactor and opened the PR. Today I'm picking up the alerting rules for the new cluster. No blockers, but I'll be out from 2 pm my time for a dentist appointment.
>
> **Marcos:** Still on the runner autoscaling. It turned out the scale-down policy was too aggressive, so we were killing runners mid-job. I've got a fix in review. Nothing blocking me, but I could use a second pair of eyes on the PR.
>
> **Priya:** Quick one from me: the release is moving to Thursday because of the pipeline migration. I'll update the ticket. Anything else for the parking lot?

| # | Pergunta | Opções | Resposta | Tag |
|---|---|---|---|---|
| 1 | Who is blocked? | a) Ana b) Marcos c) Nobody d) Priya | c | `comp.listening` |
| 2 | What caused Marcos's problem? | a) a timeout b) an aggressive scale-down policy c) low memory d) a flaky test | b | `comp.listening` `vocab.ci` |
| 3 | When is the release now? | (texto livre) | Thursday | `comp.listening` |
| 4 | What is Ana picking up today? | a) the RDS refactor b) alerting rules c) the runner autoscaling d) the release | b | `comp.listening` |
| 5 | "I could use a second pair of eyes" means… | a) I need two monitors b) I'd like someone to review it c) I'm tired d) I need glasses | b | `vocab.standup` |
| 6 | "I'll be out from 2 pm my time" — why "my time"? | a) she's the boss b) the team is in different time zones c) it's a typo d) she works part-time | b | `topic.async` |

---

## 9. Exercício de escrita

**Cenário:** Ontem você investigou alertas falsos de CPU no cluster de produção. Descobriu que o threshold estava em 60% em vez de 85%. Corrigiu via Terraform, mas o PR ainda não foi revisado. Hoje pretende validar em staging. Está dependendo de alguém do time de rede liberar uma regra de firewall pedida há dois dias.

**Tarefa:** escreva seu update de standup (60–90 palavras) para ser lido em voz alta.

**Obrigatório usar:** 1 present perfect · "it turned out" · "waiting on" · 1 previsão com "by".

**Rubrica (1–5 cada):** estrutura yesterday/today/blockers · tempos verbais · preposições e conectores · naturalidade e registro · concisão.

**Correção:** Claude API com saída estruturada (lista de erros com correção, explicação e tag; nota por eixo; versão reescrita). Sem chave de API: detector de erros BR por regras + modelo de resposta + checklist de autoavaliação.

**Modelo de resposta (mostrado após o envio):**

> Yesterday I looked into the false CPU alerts on the prod cluster. It turned out the threshold was set to 60% instead of 85%. I've fixed it in Terraform and the PR is up, but it hasn't been reviewed yet. Today I'm going to validate the change in staging. One blocker: I'm still waiting on the network team to open the firewall rule I requested on Monday — I'll chase it again after this. I should have everything merged by tomorrow EOD.

---

## 10. Atividade de conversação

**Modo A — sem LLM (sempre disponível).** Grave-se dando seu update de standup **real de hoje** em até 45 segundos (reconhecimento de fala do navegador). O app mostra a transcrição, marca as expressões-alvo que você usou (de 16, meta ≥ 4), sinaliza padrões de erro BR encontrados e mede duração e palavras por minuto. Checklist de autoavaliação: usei past simple para ontem? present perfect para o estado atual? disse o que já tentei? dei previsão com "by"? fechei com "no blockers" ou um pedido claro?

**Modo B — roleplay com Claude API.** Persona: Priya, scrum master, direta e simpática. Você dá o update do cenário da escrita (ou o seu real). Priya faz 2–3 follow-ups do tipo "What have you tried so far?", "When do you think it'll be ready?", "Do you need someone to chase the network team?". O roleplay termina com avaliação 1–5 em clareza, tempos verbais, naturalidade e concisão, mais 3 frases suas reescritas de forma mais natural. As tags fracas do seu histórico entram no prompt para Priya provocar exatamente esses pontos.

**Autoavaliação de confiança:** "Como você se sentiu dando esse update?" 1–5. Cruzado com a rubrica no painel.

---

## 11. Quiz (8 itens, ~3 min)

| # | Tipo | Item | Resposta | Tag |
|---|---|---|---|---|
| 1 | lacuna | I ___ (work) on this since Monday. | have been working | `gram.since-for` |
| 2 | escolha | I'll finish it (by / until) Friday. | by | `gram.by-until` |
| 3 | correção | I didn't finish yet. | I haven't finished yet. | `gram.still-yet-already` |
| 4 | escolha | Which one sounds evasive? a) "It's taking longer than expected; I'll need another day." b) "It's almost done, almost." | b | `topic.daily` |
| 5 | lacuna | I'm waiting ___ Ana's review. | on / for | `br.waiting-no-prep` |
| 6 | correção | I have a doubt about the runner. | I have a question about the runner. | `br.doubt` |
| 7 | tradução | "Está dando erro de timeout." | It's timing out. / It's failing with a timeout. | `br.giving-error` |
| 8 | reordenar | on / blocked / staging / to / access / I'm | I'm blocked on access to staging. | `vocab.standup` |

---

## 12. Correção comentada

Cada item do quiz, ao ser respondido, mostra a explicação curta:

1. *since* marca o ponto de início de algo que continua; isso é present perfect continuous. "I'm working since" é o calque mais comum do português.
2. *by* = prazo final. *until* diria que você vai ficar terminando durante toda a semana até sexta.
3. *yet* aparece com present perfect em negativas e perguntas. "didn't… yet" é compreensível, mas marca não-nativo.
4. "Almost done, almost" não dá informação: quanto falta, o que trava, quando fica pronto. A alternativa (a) diz o problema e o novo prazo.
5. *wait* pede preposição. *wait on* e *wait for* são intercambiáveis aqui; "waiting the review" está errado.
6. *doubt* é desconfiança ("I doubt it will work"). Dúvida no sentido de pergunta é *question*.
7. "Giving error" é tradução literal. Em inglês, erros são *thrown*, *raised*, ou o sistema *fails with*, *times out*, *crashes*.
8. Ordem fixa: sujeito + blocked on + o que bloqueia. "Access to staging" é a unidade.

A escrita recebe correção por item no formato **trecho → correção → por quê → tag**, e a versão reescrita completa. A fala (modo A) mostra a transcrição com as expressões-alvo em verde e os padrões de erro em amarelo, com a correção ao lado.

---

## 13. Revisão espaçada (warm-up, feito **antes** do bloco 1)

Cinco itens selecionados no momento em que a aula abre: três das tags em que você mais errou nos últimos 7 dias, dois da aula M01.1 e do teste inicial. Exemplo do que apareceria para um aluno que errou `gram.question-forms` no teste inicial:

1. (M01.1) Ordene as três partes de um update de standup. → yesterday / today / blockers
2. (M01.1) "What did you work on yesterday?" × "What are you working on?" — qual pergunta sobre agora? → a segunda
3. (placement, `gram.question-forms`) Corrija: "Why the pipeline failed?" → Why did the pipeline fail?
4. (M01.1) Complete: "I'm ___ the deploy today." (on / in / at) → on
5. (placement, `br.doubt`) "Any doubts?" no fim de uma apresentação → "Any questions?"

---

## Cards gerados para o SRS (12)

| Frente | Verso |
|---|---|
| estou trabalhando nisso desde ontem | I've been working on this since yesterday |
| ainda não terminei | I haven't finished yet |
| estou travado em X | I'm blocked on X |
| estou esperando a revisão da Ana | I'm waiting on a review from Ana |
| está demorando mais que o esperado | It's taking longer than expected |
| devo terminar até o fim do dia | I should have it done by EOD |
| isso pode atrasar para amanhã | This might slip to tomorrow |
| vou precisar de mais um dia | I'll need another day on this |
| descobri que… (depois de investigar) | It turned out (that)… |
| já tentei X, mas não ajudou | I've tried X, but it didn't help |
| alguém pode fazer pair comigo depois da call? | Can someone pair with me on this after the call? |
| tenho uma dúvida (pergunta) | I have a question (NÃO "doubt") |

---

## Como esta aula vira dados

- Arquivo: `content/modules/M01/lessons/M01-02.yaml`, validado pelo schema.
- Cada exercício acima tem `id`, `answer`/`accepted[]`, `explanation` e `tags[]`; toda resposta vira uma linha em `attempts`.
- A escrita vira `writing_submissions` com o JSON da correção; a fala vira `speaking_sessions` com transcrição e métricas.
- Os 12 cards entram em `srs_cards` na conclusão da aula.
- O critério de conclusão é avaliado por consulta ao banco, não por flag manual.
