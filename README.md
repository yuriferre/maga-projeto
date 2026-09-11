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

Páginas: `/` painel (radar, heatmap de tags, sequência, meta semanal), `/trilha` níveis e módulos, `/placement` teste inicial de nível, `/review` revisão diária dos cards (SM-2), `/glossary` glossário com busca e áudio, `/lessons/:id` aula, `/modules/:id/assessment` avaliação do módulo (liberada quando todas as aulas do módulo estão concluídas).

Ao atualizar de uma versão anterior, faça uma cópia de `data/progress.sqlite` antes do primeiro `pnpm dev` (`make backup-db`): as migrações 1 e 2 reconstroem a tabela `attempts`.

## Makefile e Docker

`make` (sem alvo) lista os atalhos. Três jeitos de subir:

| Modo | Comando | Onde abre | Quando usar |
|---|---|---|---|
| Local | `make dev` | http://localhost:5173 | dia a dia com hot reload; exige Node 25 e pnpm |
| Container de produção | `make docker-build && make up` | http://localhost:3001 | um processo serve API e UI compilada; banco persistido em `./data` |
| Container de desenvolvimento | `make dev-up` | http://localhost:5173 | hot reload sem instalar Node na máquina; código montado do host |

Outros alvos: `make check` (suíte + content + typecheck + build, o mesmo dos hooks), `make logs`, `make shell`, `make down`, `make backup-db` (cópia datada do SQLite), `make clean`, `make stop-dev` (encerra um `pnpm dev` esquecido: o `node --watch` reinicia o servidor se só o filho for morto, e a porta 3001 fica presa; `make up` avisa quando isso acontece).

A imagem usa `node:25-alpine`; o servidor serve `dist/` quando ele existe (`STATIC_DIR`), com fallback do SPA para `index.html`. Variáveis: `PORT` (3001), `DB_PATH` (`data/progress.sqlite`), `STATIC_DIR` (`dist`). Um `.env` na raiz é carregado pelo compose se existir. Fala e áudio continuam no Chrome do host, em qualquer modo.

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

## Estado atual (etapas E0–E3 + M01 completo)
- Conteúdo: módulo M01 completo (5 aulas + avaliação do módulo); demais aulas listadas como "em breve".
- Correção de escrita e fala em modo por regras (sem IA). A integração com a Claude API (E4) está fora do roteiro; tudo segue por regras e heurísticas locais.

## Contribuindo
Convenções de branches, commits, hooks e trabalho com IA em `CONTRIBUTING.md`. Instruções para agentes de IA em `AGENTS.md`.
