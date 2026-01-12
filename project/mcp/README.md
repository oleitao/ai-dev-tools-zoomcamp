# MCP (Model Context Protocol) — workflow sugerido

O PR Buddy foi desenhado para funcionar bem num setup “agentic”, onde um assistente consegue:

- obter o diff de um PR (GitHub)
- ler ficheiros do repo alvo (filesystem)
- chamar o backend do PR Buddy para criar reviews e armazenar resultados

## Setup típico (GitHub + filesystem)

Exemplo de configuração (ajustar ao cliente/assistente que usa MCP):

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

## Exemplo de uso (workflow)

1. Usar o MCP de GitHub para obter o diff do PR.
2. (Opcional) Usar o MCP filesystem para ler testes existentes, configs, etc.
3. Enviar o diff para o PR Buddy: `POST /api/reviews`.
4. Guardar/consultar histórico: `GET /api/reviews` + `GET /api/metrics`.

## Segurança

- Preferir tokens com permissões mínimas necessárias.
- Limitar roots do filesystem MCP ao repo alvo.
- Não reenviar segredos para o PR Buddy via diff.

