# Avaliação de Nível 4 — Influence

Spec (`docs/planejamento/02-trilha.md`): "RFC escrita +
apresentação gravada 5 min + debate simulado. Aprovação:
RFC ≥ 4/5, apresentação ≥ 3,5/5, debate ≥ 3/5."

## Resultado

- `content/levels/level-4.yaml`: **30 itens** cobrindo as
  **51 tags** `gram/br/vocab` de M21–M26 — 20 correções
  duplas carregam os 39 `br.*`; 9 MC + 1 match + 1
  fill_blank cobrem os 7 `gram.*` e 6 `vocab.*`. Gabarito
  MC balanceado (máx 4/índice).
- **Escrita** (110–140 palavras): a RFC da migração de
  cache — proposta em 3 frases, "the ask" com prazo,
  alternativa morta com razão, open question, risco +
  mitigação no condicional real. `writingMin: 4` honra
  "RFC ≥ 4/5".
- **Fala** (até 5 min, 27 frases-alvo): apresentação
  com signposting + debate com pushback respondido.
  `speakingMin: 3.5` honra "apresentação ≥ 3,5/5".
- 4 testes de fluxo L4 em `tests/level-assessment.test.ts`
  (elegibilidade 6 módulos, 409 prematuro, fluxo completo
  com `writingScore: 4`, 409 duplicado).

## Validação

- 1423/1423 testes · typecheck e build limpos
- API na cópia (`progress-test.sqlite`): elegível 6/6 →
  `finish` prematuro 409 → ref inválida 400 → **30/30**
  itens → escrita 4 → fala 4,5 → **aprovado**
  (`level|L4`) → segundo `finish` 409

## Desvios

- **Debate simulado**: a spec pedia três entregas com três
  notas (RFC ≥4, apresentação ≥3,5, debate ≥3). O motor tem
  uma escrita e uma fala — o debate virou a segunda metade
  da gravação (pushback respondido com "that's a fair
  concern", "disagree and commit"), coberta pelo
  `speakingMin: 3.5`. Custo: o debate não tem nota própria.
