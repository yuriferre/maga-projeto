## O que muda

<!-- Uma ou duas frases. Se for conteúdo de aula, diga qual aula/módulo. -->

## Por quê

<!-- Motivação, link para o plano ou spec em docs/ quando existir. -->

## Como testar

```bash
pnpm content:build && pnpm test && pnpm typecheck
pnpm dev   # e o passo manual, se houver UI
```

## Checklist

- [ ] `pnpm test`, `pnpm typecheck` e `pnpm content:validate` verdes localmente
- [ ] Conteúdo educacional novo revisado por uma pessoa (não só gerado)
- [ ] Sem segredos, sem `.env`, sem `data/*.sqlite`
- [ ] Docs atualizadas quando o comportamento mudou (README, AGENTS.md, docs/)
- [ ] Commits no formato Conventional Commits
