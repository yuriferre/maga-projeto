@AGENTS.md

# Notas específicas para o Claude Code

- Antes de criar ou mudar funcionalidade, use a skill de brainstorming e apresente o plano; implemente só depois da aprovação.
- Implementação por tarefa com TDD; para planos com várias tarefas, use desenvolvimento dirigido por subagentes com revisão entre tarefas.
- Não use o modelo haiku como implementador neste repositório: ele corrompeu aspas Unicode em duas rodadas. Sonnet é o piso; revisão final com o modelo mais capaz disponível.
- Permissões pré-aprovadas para comandos de verificação estão em `.claude/settings.json`; preferências pessoais vão em `.claude/settings.local.json` (ignorado pelo git).
- Responda em português. Termos técnicos e identificadores ficam no original.
