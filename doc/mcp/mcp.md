# MCP Integration

The vscode-designer extension is able to serve its tools via MCP.
This enables you to integrate axonivy-specific AI tools
into your preferred CLI or third-party harness like Claude or Copilot CLI.

## Enable the endpoint

The local MCP is not enabled by default. If you want to access
the AI tools, enable it by setting `axonivy.localMcp.enabled` to `true`.

```json
{
  "axonivy.localMcp.enabled": true,
  "axonivy.localMcp.host": "127.0.0.1",
  "axonivy.localMcp.port": 32140,
  "axonivy.localMcp.exposeAllTools": false
}
```

## Copilot CLI or Claude CLI configuration

Workspace [.mcp.json](./.mcp.json) example for direct native MCP usage from your harness:

```json
{
  "mcpServers": {
    "axonivy-designer": {
      "type": "http",
      "url": "http://127.0.0.1:32140/mcp",
      "tools": "*"
    }
  }
}
```

## Additional endpoint

1. `GET /health` returns a basic liveness response.

## Security notes

1. Keep `axonivy.localMcp.host` set to `127.0.0.1`.
2. Disable local RPC if external automation is not needed.
3. Treat tool invocation as privileged capability.
