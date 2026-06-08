---
title: CLI
description: Every ZCodeGraph command and the flags it accepts.
---

```bash
zcodegraph                         # Run interactive installer
zcodegraph install                 # Run installer (explicit)
zcodegraph uninstall               # Remove ZCodeGraph from your agents (inverse of install)
zcodegraph init [path]             # Initialize in a project (--index to also index)
zcodegraph uninit [path]           # Remove ZCodeGraph from a project (--force to skip prompt)
zcodegraph index [path]            # Full index (--force to re-index, --quiet for less output)
zcodegraph sync [path]             # Incremental update
zcodegraph status [path]           # Show statistics
zcodegraph query <search>          # Search symbols (--kind, --limit, --json)
zcodegraph files [path]            # Show file structure (--format, --filter, --max-depth, --json)
zcodegraph context <task>          # Build context for AI (--format, --max-nodes)
zcodegraph callers <symbol>        # Find what calls a function/method (--limit, --json)
zcodegraph callees <symbol>        # Find what a function/method calls (--limit, --json)
zcodegraph impact <symbol>         # Analyze what code is affected by changing a symbol (--depth, --json)
zcodegraph affected [files...]     # Find test files affected by changes
zcodegraph serve --mcp             # Start MCP server
```

## Query commands

`query`, `callers`, `callees`, and `impact` all accept `--json` for machine-readable output.

```bash
zcodegraph query UserService --kind class --limit 10
zcodegraph callers handleRequest --json
zcodegraph impact AuthMiddleware --depth 3
```

## affected

Traces import dependencies transitively to find which test files are affected by changed source files. See [Affected Tests in CI](/ZCodeGraph/guides/affected-tests/) for options and a CI example.
