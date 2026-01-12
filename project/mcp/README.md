# MCP (Model Context Protocol) — suggested workflow

PR Buddy is designed to work well in an “agentic” setup, where an assistant can:

- fetch the diff of a PR (GitHub)
- read files from the target repo (filesystem)
- call the PR Buddy backend to create reviews and store results

## Typical setup (GitHub + filesystem)

Example configuration (adjust to your MCP client/assistant):

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "--root", "."]
    }
  }
}
```

## Example usage (workflow)

1. Use the GitHub MCP to fetch the PR diff.
2. (Optional) Use the filesystem MCP to read existing tests, configs, etc.
3. Send the diff to PR Buddy: `POST /api/reviews`.
4. Store/query history: `GET /api/reviews` + `GET /api/metrics`.

## Security

- Prefer tokens with the minimum required permissions.
- Restrict filesystem MCP roots to the target repo.
- Don't forward secrets to PR Buddy via diff.
