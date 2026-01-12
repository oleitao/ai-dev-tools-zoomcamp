# PR Buddy — agente que revê Pull Requests

## Problema

Code reviews em Pull Requests tendem a ser **lentos**, **inconsistentes** e dependentes da disponibilidade do reviewer. Isso aumenta o lead time e deixa escapar problemas comuns: riscos (segurança/impacto), qualidade de código, ausência de testes, e detalhes (“nitpicks”) que acumulam dívida técnica.

## Solução (MVP)

O **PR Buddy** recebe um **diff** (ou uma **URL de PR do GitHub**) e devolve:

- **Resumo final**: risco global, highlights, testes em falta e checklist.
- **Comentários por ficheiro**: riscos, sugestões, nitpicks e “missing tests”.
- **Políticas**: regras simples (ex.: falhar se houver mudanças em código sem testes).
- **Métricas**: contagem de reviews, distribuição de risco e frequência de missing-tests.

O motor atual usa **heurísticas determinísticas** (sem chamadas externas). A arquitetura suporta evoluir para LLMs e integração GitHub.

## Arquitetura

Ver `project/docs/architecture.md`.

## Tecnologias

- **Backend/API**: Node.js (HTTP server, sem framework) — `project/src/`
- **Frontend**: SPA estática (HTML/CSS/JS, ES Modules) — `project/src/web/`
- **DB**:
  - SQLite por default via `node:sqlite` (sem dependências externas)
  - Postgres suportado via `pg` (opcional)
- **Contrato de API**: OpenAPI 3 — `project/openapi.yaml`
- **Testes**: `node --test` (unit + integration) — `project/tests/`
- **Containerização**: Dockerfile + docker-compose — `project/Dockerfile`, `project/docker-compose.yml`
- **CI/CD**: GitHub Actions — `.github/workflows/pr-buddy.yml`

## API (OpenAPI)

- Especificação: `project/openapi.yaml`
- Endpoint servida pelo backend: `GET /api/openapi.yaml`

## Como correr (local)

Pré-requisitos: Node.js `>=22`.

```bash
cd project
cp .env.example .env
npm test
npm run dev
```

Abrir: `http://127.0.0.1:3000`

## Base de dados (SQLite / Postgres)

Por default usa SQLite:

- `DATABASE_URL=sqlite:./data/pr-buddy.sqlite`

Para Postgres (opcional):

```bash
cd project
npm install pg
docker compose --profile postgres up -d postgres
export DATABASE_URL="postgres://prbuddy:prbuddy@localhost:5432/prbuddy"
npm run dev
```

## Provider LLM (OpenAI) — opcional

O modo `openai` usa `OPENAI_API_KEY` e `OPENAI_MODEL` para gerar o review via API (mantendo o mesmo schema de output).

- Sem key, o backend devolve `400 openai_api_key_missing`.
- Recomenda-se manter `heuristic` como default para desenvolvimento offline e CI.

## Testes

- Unit tests: `node --test tests/unit`
- Integration tests (workflow + DB): `node --test tests/integration`
- Tudo: `npm test`

## Docker

```bash
cd project
docker compose up --build
```

Abrir: `http://localhost:3000`

## CI/CD (GitHub Actions)

Workflow: `.github/workflows/pr-buddy.yml`

- `test`: corre `npm test` em `project/` com Node.js 22
- `deploy` (opcional): dispara um deploy hook no Render quando existe `RENDER_DEPLOY_HOOK_URL` (GitHub Secret)

## Deploy

Deploy “blueprint” (Render, via Docker):

- Criar um serviço “Web Service” a partir do repositório e selecionar **Docker**
- Definir variáveis:
  - `HOST=0.0.0.0`
  - `PORT=3000`
  - `DATABASE_URL=sqlite:./data/pr-buddy.sqlite` (ou Postgres)
- Para SQLite com persistência, configurar um **Disk** montado em `/app/data`
- (Opcional) adicionar Postgres e configurar `DATABASE_URL` + `npm install pg` no build (ou incluir como dependência)
- Para auto-deploy via CI:
  - criar um **Deploy Hook** no Render
  - adicionar o URL como GitHub Secret `RENDER_DEPLOY_HOOK_URL`

URL/Proof: adicionar aqui após deploy.

## Desenvolvimento assistido por IA + MCP

Durante o desenvolvimento, o PR Buddy foi estruturado para suportar um workflow “agentic”:

- **Ferramentas de IA**: Codex/assistentes para iterar sobre contrato OpenAPI, parsing de diff, e heurísticas.
- **MCP (Model Context Protocol)**: configuração sugerida para ligar a um servidor MCP de GitHub + filesystem para:
  - obter diffs de PRs diretamente do GitHub
  - navegar o repo alvo e recolher contexto extra (ficheiros, testes, configs)

Detalhes e exemplo de configuração: `project/mcp/README.md`.
Notas de desenvolvimento (prompts/decisões): `project/docs/ai-workflow.md`.

## Estrutura do projeto

- `project/openapi.yaml` — contrato da API
- `project/src/server.js` — entrypoint do backend
- `project/src/app.js` — router + handlers
- `project/src/review/` — parsing/análise/políticas
- `project/src/db/` — SQLite/Postgres
- `project/src/web/` — frontend
- `project/tests/` — unit + integration tests

Rubrica (onde está cada item): `project/docs/rubric-mapping.md`.

## Roadmap (extensões fortes)

- Integração GitHub (webhook) + publicação automática de comentários/check-runs
- “Políticas” blocking (bloquear merge se faltar teste)
- Avaliação automática da qualidade do review (comparar com reviews humanos)
- Dashboard com métricas (tipos de erros, tempo poupado, hotspots por repo)
