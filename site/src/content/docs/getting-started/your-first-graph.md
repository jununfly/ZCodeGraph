---
title: Your First Graph
description: Build an index and run your first queries against it.
---

Once CodeGraph is installed, building and exploring a graph takes three commands.

## Index a project

```bash
cd your-project
zcodegraph index        # create the store on first run, then build the full index
```

`index` creates the `.zcodegraph/` directory and builds the full index in one step — there is no separate initialize command. Running it again on an existing project re-indexes any time:

```bash
zcodegraph index          # full (re)index; --force to force a rebuild
zcodegraph sync           # incremental update of changed files
```

## Check it worked

```bash
zcodegraph status
```

This reports the node/edge/file counts, the active SQLite backend, and the journal mode — a quick health check that the index is ready.

## Run a query

```bash
zcodegraph query UserService          # find symbols by name
zcodegraph callers handleRequest      # what calls a function
zcodegraph callees handleRequest      # what a function calls
zcodegraph impact AuthMiddleware      # what a change would affect
zcodegraph context "fix the login flow"   # build task-focused context
```

Each accepts `--json` for machine-readable output. See the full [CLI reference](/ZCodeGraph/reference/cli/).

## Hand it to your agent

With a `.codegraph/` directory present and an agent configured (see [Installation](/ZCodeGraph/getting-started/installation/)), your agent uses the [MCP tools](/ZCodeGraph/reference/mcp-server/) automatically — no extra step.
