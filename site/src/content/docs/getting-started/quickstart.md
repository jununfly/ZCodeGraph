---
title: Get Started
description: Get up and running with ZCodeGraph in seconds.
---

Get up and running with ZCodeGraph in seconds.

## Install the CLI

```bash
npm install -g @jununfly/zcodegraph
```

## Wire up your agent

```bash
zcodegraph install
```

The installer auto-configures your agent(s) — Claude Code, Cursor, Codex CLI, opencode, Hermes Agent, Gemini CLI, Antigravity IDE, Kiro.

## Index Projects

```bash
cd your-project
zcodegraph index
```

That's it — `index` creates the `.zcodegraph/` store automatically on first run and builds the graph. Your agent will use ZCodeGraph tools automatically when a `.zcodegraph/` directory exists.

Next: build [Your First Graph](/ZCodeGraph/getting-started/your-first-graph/), or see the full [Installation](/ZCodeGraph/getting-started/installation/) options.
