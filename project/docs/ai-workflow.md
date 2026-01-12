# PR Buddy — AI-assisted development notes

## Objective

Build an MVP focused on **consistent reviews** from diffs, with an OpenAPI contract, persistence, tests, docker-compose, and documentation, aligned with the rubric in `project/data.json`.

## How AI helped (examples)

- **Contract definition**: iterate on endpoints and schemas in `project/openapi.yaml` to support UI + history + policies + metrics.
- **Diff parsing**: generate an initial unified diff parser and harden it with unit tests (files/hunks/lines).
- **Heuristics**: brainstorm/iterate on patterns (risks, suggestions, nitpicks) with predictable outputs.
- **UX refinement**: structure the UI and centralize backend calls in a single module (`project/src/web/apiClient.js`).

## MCP (Model Context Protocol)

The goal of MCP here is to enable an “agentic workflow” (assistant with tools), mainly:

- **GitHub MCP**: fetch diffs and PR metadata programmatically, avoiding copy/paste.
- **Filesystem MCP**: read tests/config files from the target repo to provide extra context to the review.

Example config and best practices: `project/mcp/README.md`.

## Notas

- `heuristic` mode is deterministic and suitable for CI/offline.
- `openai` mode is optional and uses `OPENAI_API_KEY` to generate a review while keeping the same output schema.
