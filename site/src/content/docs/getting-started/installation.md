---
title: Installation
description: Install ZCodeGraph and configure your AI coding agents.
---

## 1. Install the CLI

```bash
npm install -g @jununfly/zcodegraph
```

This puts `zcodegraph` on your `PATH` so agents can launch the MCP server.

## 2. Wire up your agent(s)

```bash
zcodegraph install
```

The installer will:

- Ask which agent(s) to configure — auto-detecting installed ones from **Claude Code**, **Cursor**, **Codex CLI**, **opencode**, **Hermes Agent**, **Gemini CLI**, **Antigravity IDE**, and **Kiro**.
- Ask whether configs apply to all your projects or just this one.
- Write each chosen agent's MCP server config and inject agent-facing guidance where that target supports it.
- Set up auto-allow permissions when Claude Code is one of the targets.
- Initialize your current project (local installs only).

## Non-interactive (scripting / CI)

```bash
zcodegraph install --yes                              # auto-detect agents, install global
zcodegraph install --target=cursor,claude --yes       # explicit target list
zcodegraph install --target=auto --location=local     # detected agents, project-local
zcodegraph install --print-config codex               # print snippet, no file writes
```

| Flag | Values | Default |
|---|---|---|
| `--target` | `auto`, `all`, `none`, or csv (`claude,cursor,…`) | prompt |
| `--location` | `global`, `local` | prompt |
| `--yes` | (boolean) | prompt every step |
| `--no-permissions` | (boolean) skip Claude auto-allow list | permissions on |
| `--print-config <id>` | dump snippet for one agent and exit | — |

## 3. Restart your agent

Restart your agent (Claude Code / Cursor / Codex CLI / opencode / Hermes Agent / Gemini CLI / Antigravity IDE / Kiro) for the MCP server to load.

## 4. Initialize projects

```bash
cd your-project
zcodegraph init -i
```

This builds the per-project knowledge graph index and wires up any project-local agent surfaces, so a single global `zcodegraph install` works in every project you open.

## Supported platforms

Every release ships a self-contained build (bundled Node runtime — nothing to compile) for all three desktop OSes, on both x64 and arm64:

| Platform | Architectures | Install |
|---|---|---|
| Windows | x64, arm64 | PowerShell installer or npm |
| macOS | x64, arm64 | shell installer or npm |
| Linux | x64, arm64 | shell installer or npm |

## Uninstall

Changed your mind? One command removes ZCodeGraph from every agent it configured:

```bash
zcodegraph uninstall
```

This reverses the installer — stripping ZCodeGraph's MCP server config, instructions, and permissions from each configured agent. Your project indexes (`.codegraph/`) are left untouched; remove those per-project with `zcodegraph uninit`. Use `--target` to remove from specific agents, or `--yes` to run non-interactively.
