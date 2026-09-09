# Contribuindo

Convenções de git e de trabalho com IA neste repositório. Sem CI remota: a verificação roda em hooks locais.

## Fluxo de branches

- `main` é a branch estável. Não receba commits diretos; tudo entra por PR.
- Crie uma branch por mudança: `feat/…`, `fix/…`, `content/…`, `docs/…`, `chore/…`.
- PRs pequenos e focados. Um PR de conteúdo cobre no máximo um módulo.

Proteção da `main` é uma configuração do GitHub, não do repositório. Sem GitHub Actions, o mínimo recomendado é exigir PR e proibir force-push:

```bash
gh api -X PUT repos/yuriferre/maga-projeto/branches/main/protection \
  -f required_status_checks=null -f enforce_admins=false \
  -f required_pull_request_reviews[required_approving_review_count]=0 \
  -f restrictions=null -F allow_force_pushes=false -F allow_deletions=false
```

## Commits

Formato [Conventional Commits](https://www.conventionalcommits.org/), verificado pelo hook `commit-msg`:

```
<tipo>(<escopo opcional>): <descrição no imperativo, até 72 caracteres>

<corpo opcional: o porquê, não o como>
```

| Tipo | Uso |
|---|---|
| `feat` | funcionalidade nova |
| `fix` | correção de bug |
| `content` | aulas, trilha, catálogo de erros (conteúdo educacional) |
| `docs` | documentação |
| `test` | testes |
| `refactor`, `perf`, `style`, `build`, `chore`, `revert` | o usual |

Exemplos: `content(M01): adiciona aula M01-03 sobre prazos e ETA`, `fix(server): sanitiza parâmetro days em /api/tags/stats`.

Commits feitos com ajuda de IA levam o trailer `Co-Authored-By` do assistente.

## Hooks locais (substituem a CI)

`pnpm install` executa o script `prepare`, que aponta `core.hooksPath` para `.githooks/`:

| Hook | Faz |
|---|---|
| `pre-commit` | bloqueia segredos e `.env`/`data/*.sqlite`; valida `content/` se mudou; `typecheck` se houve código |
| `commit-msg` | exige Conventional Commits |
| `pre-push` | `pnpm test` e `pnpm build` completos |

Para pular em emergência: `git commit --no-verify` (e explique no PR).

## Antes de abrir o PR

```bash
pnpm content:build && pnpm test && pnpm typecheck
```

Preencha o template de PR. Conteúdo educacional novo passa por leitura humana: a IA gera, uma pessoa aprova frase a frase.

## Segredos e dados locais

- `.env` nunca é versionado; use `.env.example` como modelo.
- `data/progress.sqlite` é o progresso do aluno; fica fora do git. Apague o arquivo para recomeçar.
- Chave da Claude API: `ANTHROPIC_API_KEY` no `.env` ou `ant auth login`.

## Trabalho com IA

- As instruções para agentes estão em `AGENTS.md` (canônico) e `CLAUDE.md` (específico do Claude Code, importa o primeiro). Mantenha-os atualizados quando uma convenção mudar.
- Mudança relevante segue: spec em `docs/planejamento/` → plano em `docs/superpowers/plans/` → implementação em tarefas pequenas com testes → revisão por tarefa → revisão final.
- Decisões que desviam do plano são registradas (o quê, por quê, custo se errado) e aparecem no PR.
- Permissões pré-aprovadas do Claude Code ficam em `.claude/settings.json`; preferências pessoais em `.claude/settings.local.json` (ignorado).
