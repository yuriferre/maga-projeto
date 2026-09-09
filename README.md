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
Depois de editar qualquer arquivo em `content/`, rode `pnpm content:build` de novo — o Vite não observa os YAML, e `pnpm typecheck` também depende do JSON gerado.

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

## Como usar uma aula
1. Abra a trilha, escolha o módulo e a aula.
2. Siga os blocos na ordem (ou pule pelo stepper). Áudio usa a voz do sistema; a fala usa o reconhecimento do Chrome.
3. Para concluir: quiz ≥ 75%, escrita enviada e avaliada (≥ 3/5), uma gravação de fala. Os cards da aula entram no SRS na conclusão.
4. O progresso fica em `data/progress.sqlite`. Apague o arquivo para recomeçar do zero.

## Estado atual (etapas E0–E1)
- Conteúdo: aula M01-02 completa; demais aulas listadas como "em breve".
- Correção de escrita e fala em modo por regras (sem IA). A integração com a Claude API entra na etapa E4.

## Contribuindo
Convenções de branches, commits, hooks e trabalho com IA em `CONTRIBUTING.md`. Instruções para agentes de IA em `AGENTS.md`.
