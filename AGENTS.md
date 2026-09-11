# Guia para agentes de IA

Instruções para qualquer assistente de código (Claude Code, Codex, Cursor, etc.) que trabalhe neste repositório. Humanos: leia também `CONTRIBUTING.md`.

## O projeto

Plataforma local de treinamento de inglês para profissionais de DevOps, Cloud e SRE, falantes de português. Uso pessoal, um usuário, sem autenticação. O planejamento completo está em `docs/planejamento/` (plano geral, trilha de 5 níveis e 32 módulos, aula de exemplo). Estado atual: etapas E0–E3 entregues (motor de aula + aula M01-02 + teste inicial e painel + SRS e glossário). A E4 (Claude API) está fora do roteiro por decisão do usuário (sem créditos de API): tudo segue por regras e heurísticas locais, sem LLM. Próximas: E5 conteúdo do Nível 1, E6 adaptação.

## Comandos

```bash
pnpm install            # também ativa os hooks de git (.githooks)
pnpm content:build      # valida content/ e gera src/generated/content.json (obrigatório antes de dev, typecheck e build)
pnpm dev                # servidor :3001 + cliente :5173
pnpm test               # vitest, tests/**/*.test.ts
pnpm typecheck          # tsc --noEmit
pnpm build              # content:build + typecheck + vite build
pnpm content:validate   # só valida
```

## Regras de código (não negociáveis)

- Node 25 executa `.ts` diretamente. Imports relativos em `server/`, `shared/` e `scripts/` levam extensão `.ts` explícita. Sem `enum`, `namespace` ou parameter properties (`erasableSyntaxOnly`).
- Dependências são fechadas: react, react-dom, react-router, hono, @hono/node-server, zod, yaml (+ vite, @vitejs/plugin-react, typescript, tailwindcss, @tailwindcss/vite, vitest, @types/*). Adicionar uma dependência exige justificativa no PR.
- `shared/` é puro (sem DOM, sem `node:` exceto em `content-loader.ts`). O cliente importa tipos do servidor só com `import type`.
- Texto de interface e comentários em português com acentos. Identificadores em inglês. Conteúdo educacional em inglês como escrito no conteúdo.
- SQL sempre parametrizado; toda rota POST validada com zod; timestamps ISO gerados no servidor e injetáveis nos testes.

## Estrutura

```
content/   YAML: levels.yaml (trilha), tags.yaml (taxonomia fechada), br-errors.yaml (regex), modules/Mxx/lessons/*.yaml, placement/placement.yaml (teste inicial), glossary/*.yaml (termos por tema)
shared/    schemas zod, loader, detector de erros BR, scoring, comparação de fala, mini-markdown, SM-2 (sm2.ts), glossário (glossary.ts), datas locais (local-date.ts)
server/    Hono + node:sqlite: app.ts (rotas), db.ts (migrações), repo.ts (SQL), placement.ts (resultado do teste), dashboard.ts (painel), time.ts (calendário local), serviços
src/       React: pages/, components/{ui,exercises,lesson}/, lib/{api,content,speech}.ts
tests/     vitest, sem jsdom: conteúdo real + banco :memory: + rotas via app.request
docs/      planejamento/ (spec), superpowers/plans/ (planos executáveis)
```

## Conteúdo (aulas em YAML)

- Toda tag usada precisa existir em `content/tags.yaml`; `pnpm content:validate` rejeita o resto.
- Quote qualquer escalar que contenha `#`, `: `, ou comece com aspas. Um ` #` sem aspas vira comentário e corta a frase.
- Campos em markdown (`context.scenario`, `grammar.explanation`, `writing.prompt`) usam só: parágrafos, `**negrito**`, `*itálico*` (sem aninhar negrito dentro), `` `código` ``, listas `- ` e tabelas com `|---|`.
- Regex do catálogo de erros são conservadoras: na dúvida, não detectar. Todo padrão novo entra com frases corretas que NÃO devem disparar no teste de guarda.
- Nunca gere conteúdo genérico ou placeholder. Cada aula segue o formato de `docs/planejamento/03-exemplo-aula-M01-02.md` e é revisada por uma pessoa.
- Depois de editar `content/`, rode `pnpm content:build`; o Vite não observa YAML.
- Trechos de log/erro no teste inicial usam `format: pre` (renderização monoespaçada, sem mini-markdown).

## Testes

- Testes verificam comportamento real: carregam o YAML de verdade, usam `openDb(":memory:")` e chamam rotas com `app.request`. Sem mocks de banco ou de conteúdo.
- Nunca altere um teste para fazê-lo passar; corrija o código ou explique por que a asserção estava errada.
- UI (React) não tem teste automatizado; mudanças de UI são verificadas no navegador (Chrome, que tem reconhecimento de fala).

## Processo de trabalho

1. Mudança relevante começa por um plano em `docs/superpowers/plans/` argumentado a partir da spec em `docs/planejamento/`.
2. Tarefas pequenas, cada uma com seus testes; revisão por tarefa antes da seguinte.
3. Verifique antes de afirmar: rode o comando e mostre a saída. "Deve passar" não conta.
4. Registre decisões que desviam do plano (o quê, por quê, custo se errado).

## Não faça

- `git push`, `git push --force` ou abrir PR sem o pedido explícito de uma pessoa.
- Commitar `.env`, `data/*.sqlite`, `src/generated/`, `dist/` ou `node_modules/`.
- Colar chaves de API em arquivos, prompts ou logs. A credencial da Claude API fica em `.env` ou no perfil do `ant auth login`.
- Trocar de modelo/editor sem verificar Unicode: já houve corrupção de aspas curvas (`‘ ’ “ ”`) em edições automáticas. Confira codepoints quando o arquivo tiver esses caracteres.
- Instalar GitHub Actions: a verificação roda nos hooks locais (`.githooks/`).
