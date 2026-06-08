---
title: Integrations
description: Supported agents, and manual MCP setup.
---

The interactive installer auto-detects and configures each supported agent — wiring up the MCP server and writing its instructions file.

## Supported agents

- **Claude Code**
- **Cursor**
- **Codex CLI**
- **opencode**
- **Hermes Agent**
- **Gemini CLI**
- **Antigravity IDE**
- **Kiro**

Run `npx @jununfly/zcodegraph` and pick your agent(s); see [Installation](/ZCodeGraph/getting-started/installation/) for the non-interactive flags.

## Manual setup

If you'd rather wire it up yourself, install globally:

```bash
npm install -g @jununfly/zcodegraph
```

Add the MCP server to `~/.claude.json`:

```json
{
  "mcpServers": {
    "codegraph": {
      "type": "stdio",
      "command": "zcodegraph",
      "args": ["serve", "--mcp"]
    }
  }
}
```

Optionally auto-allow the read-only tools in `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "mcp__codegraph__zcodegraph_search",
      "mcp__codegraph__zcodegraph_callers",
      "mcp__codegraph__zcodegraph_callees",
      "mcp__codegraph__zcodegraph_impact",
      "mcp__codegraph__zcodegraph_node",
      "mcp__codegraph__zcodegraph_status",
      "mcp__codegraph__zcodegraph_files"
    ]
  }
}
```

:::tip
Cursor launches MCP subprocesses with the wrong working directory. The installer handles this for you by injecting a `--path` argument; if you wire Cursor up by hand, pass the project path explicitly.
:::
