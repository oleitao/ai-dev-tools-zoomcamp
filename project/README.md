# PR Buddy — Pull Request review agent

## Problem

Pull Request code reviews tend to be **slow**, **inconsistent**, and dependent on reviewer availability. This increases lead time and lets common issues slip through: risk (security/impact), code quality, missing tests, and small “nitpicks” that accumulate technical debt.

## Solution (MVP)

**PR Buddy** takes a **diff** (or a **GitHub PR URL**) and returns:

- **Final summary**: overall risk, highlights, missing tests and a checklist.
- **Per-file comments**: risks, suggestions, nitpicks and “missing tests”.
- **Policies**: simple rules (e.g. fail when production code changes without tests).
- **Metrics**: review count, risk distribution and missing-tests frequency.

The current engine uses **deterministic heuristics** (no external calls). The architecture supports evolving to LLMs and GitHub integration.

## Screenshots

![PR Buddy web UI](images/app_web.png)

## Architecture

See `project/docs/architecture.md`.

## Technologies

- **Backend/API**: Node.js (HTTP server, no framework) — `project/src/`
- **Frontend**: static SPA (HTML/CSS/JS, ES Modules) — `project/src/web/`
- **DB**:
  - SQLite by default via `node:sqlite` (no external dependencies)
  - Postgres supported via `pg` (optional)
- **API contract**: OpenAPI 3 — `project/openapi.yaml`
- **Tests**: `node --test` (unit + integration) — `project/tests/`
- **Containerization**: Dockerfile + docker-compose — `project/Dockerfile`, `project/docker-compose.yml`
- **CI/CD**: GitHub Actions — `.github/workflows/pr-buddy.yml`

## API (OpenAPI)

- Spec: `project/openapi.yaml`
- Spec served by backend: `GET /api/openapi.yaml`

## Running locally

Prerequisites: Node.js `>=22`.

```bash
cd project
cp .env.example .env
npm test
npm run dev
```

Open: `http://127.0.0.1:3000`

## GitHub PR URLs

When using **GitHub PR URL** as the input source, PR Buddy must download the PR diff first:

- For **public** PRs, PR Buddy will try the unauthenticated `https://github.com/<org>/<repo>/pull/<n>.diff` endpoint.
- For **private** PRs (or restricted access), you must set `GITHUB_TOKEN` in `project/.env` (recommended).

## Database (SQLite / Postgres)

By default it uses SQLite:

- `DATABASE_URL=sqlite:./data/pr-buddy.sqlite`

For Postgres (optional):

```bash
cd project
npm install pg
docker compose --profile postgres up -d postgres
export DATABASE_URL="postgres://prbuddy:prbuddy@localhost:5432/prbuddy"
npm run dev
```

![Installing pg for Postgres support](images/npm_install_pg.png)

## LLM provider (OpenAI) — optional

`openai` mode uses `OPENAI_API_KEY` and `OPENAI_MODEL` to generate a review via API (keeping the same output schema).

- Without a key, the backend returns `400 openai_api_key_missing`.
- It's recommended to keep `heuristic` as the default for offline development and CI.

## Tests

- Unit tests: `node --test tests/unit`
- Integration tests (workflow + DB): `node --test tests/integration`
- All: `npm test`

![Running the test suite](images/npm_test.png)

## Docker

```bash
cd project
docker compose up --build
```

Open: `http://localhost:3000`

## CI/CD (GitHub Actions)

Workflow: `.github/workflows/pr-buddy.yml`

- `test`: runs `npm test` in `project/` with Node.js 22
- `deploy` (optional): triggers a Render deploy hook when `RENDER_DEPLOY_HOOK_URL` exists (GitHub Secret)

## Deploy

Deploy blueprint (Render, via Docker):

- Create a “Web Service” from the repo and select **Docker**
- Set env vars:
  - `HOST=0.0.0.0`
  - `PORT=3000`
  - `DATABASE_URL=sqlite:./data/pr-buddy.sqlite` (or Postgres)
- For SQLite persistence, configure a **Disk** mounted at `/app/data`
- (Optional) add Postgres and configure `DATABASE_URL` + `npm install pg` in the build (or include it as a dependency)
- For CI auto-deploy:
  - create a **Deploy Hook** in Render
  - add the hook URL as the GitHub Secret `RENDER_DEPLOY_HOOK_URL`

URL/Proof: add here after deployment.

## AI-assisted development + MCP

During development, PR Buddy was structured to support an “agentic” workflow:

- **AI tools**: Codex/assistants to iterate on the OpenAPI contract, diff parsing, and heuristics.
- **MCP (Model Context Protocol)**: suggested configuration to connect to GitHub + filesystem MCP servers to:
  - fetch PR diffs directly from GitHub
  - navigate the target repo and gather extra context (files, tests, configs)

Details and example configuration: `project/mcp/README.md`.
Development notes (prompts/decisions): `project/docs/ai-workflow.md`.

## Project structure

- `project/openapi.yaml` — API contract
- `project/src/server.js` — backend entrypoint
- `project/src/app.js` — router + handlers
- `project/src/review/` — parsing/analysis/policies
- `project/src/db/` — SQLite/Postgres
- `project/src/web/` — frontend
- `project/tests/` — unit + integration tests

Rubric mapping (where each item is): `project/docs/rubric-mapping.md`.

## Roadmap (strong extensions)

- GitHub integration (webhook) + automatic publishing of comments/check-runs
- Blocking policies (block merge when tests are missing)
- Automatic review quality evaluation (compare with human reviews)
- Metrics dashboard (error types, time saved, repo hotspots)
