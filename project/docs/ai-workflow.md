# PR Buddy — AI-assisted development notes

## Objetivo

Construir um MVP focado em **reviews consistentes** a partir de diffs, com um contrato OpenAPI, persistência, testes, docker-compose e documentação, alinhado com a rubrica em `project/data.json`.

## Como a IA ajudou (exemplos)

- **Definição de contrato**: iterar sobre endpoints e schemas do `project/openapi.yaml` para suportar UI + histórico + políticas + métricas.
- **Parsing do diff**: gerar uma versão inicial do parser de unified diff e depois endurecer com testes unitários (files/hunks/linhas).
- **Heurísticas**: brainstorm/iteração de padrões (riscos, sugestões, nitpicks) com outputs previsíveis.
- **Refino de UX**: organizar UI e centralizar chamadas ao backend num único módulo (`project/src/web/apiClient.js`).

## MCP (Model Context Protocol)

O objetivo do MCP aqui é facilitar o “agentic workflow” (assistente com ferramentas), principalmente:

- **GitHub MCP**: obter diffs e metadados de PRs de forma programática, evitando copy/paste.
- **Filesystem MCP**: ler ficheiros de testes/configs do repo alvo para dar contexto ao review.

Exemplo de configuração e boas práticas: `project/mcp/README.md`.

## Notas

- O modo `heuristic` é determinístico e adequado para CI/offline.
- O modo `openai` é opcional e usa `OPENAI_API_KEY` para gerar o review mantendo o mesmo schema de output.

