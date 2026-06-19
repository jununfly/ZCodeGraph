# Issue #281 Gin Route-Query Sufficiency Hardening

Date: 2026-06-19

Related issues: #279, #280, #281

## Scope

This was a bounded pre-release hardening attempt for Go/Gin `METHOD path` lookup questions. It did not change the Rust Go extractor, Go module/package resolution, Gin middleware semantics, MCP tool names, or the release workflow.

## Change

`zcodegraph_explore` now recognizes HTTP `METHOD /path` query shapes as route lookup seeds. When a matching `route` node exists in the current graph, Explore seeds that route and its direct route-to-handler edge so the rendered answer includes an explicit `Route matches` section even on small-project budgets where the generic Relationships section is disabled.

## Deterministic Tool-Level Evidence

Test:

```bash
npx vitest run __tests__/gin-route-explore-sufficiency.test.ts
```

Result:

- pass

The test indexes a small Gin fixture through `rust-hybrid`, calls the public MCP handler `zcodegraph_explore`, and verifies that one Explore response includes:

- `POST /upload`,
- `uploadHandler`,
- the registration line `r.POST("/upload", uploadHandler)`,
- an explicit `Route matches` section with the route-to-handler relationship.

## Agent A/B Evidence

Prompt:

```text
How does a request reach the upload handler for POST /upload?
```

Command shape:

```bash
AGENT_EVAL_OUT=/private/tmp/zcodegraph-issue-281-gin-upload-r1 \
CG_BIN=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  bash scripts/agent-eval/run-all.sh \
  /private/tmp/codegraph-corpus/gin-examples \
  "How does a request reach the upload handler for POST /upload?" \
  headless
```

| Arm | Duration | Tool calls | CodeGraph calls | Read | Bash/Grep/Find | Cost | Tokens |
|---|---:|---:|---:|---:|---:|---:|---:|
| WITH ZCodeGraph | 20s | 1 | 1 | 0 | 0 | $0.454 | 79,753 |
| WITHOUT ZCodeGraph | 62s | 12 | 0 | 6 | 5 | $0.620 | 78,325 |

Comparison against the #279 pre-hardening run:

| Arm | Before #281 | After #281 |
|---|---|---|
| WITH ZCodeGraph | 29s · 5 tools · 3 Read · 1 Bash | 20s · 1 tool · 0 Read · 0 Bash |
| WITHOUT ZCodeGraph | 26s · 4 tools · 1 Read · 3 Bash | 62s · 12 tools · 6 Read · 5 Bash |

## Decision

Keep the bounded Explore route-query hardening.

The mechanism is now available and the real targeted A/B converted to a clean sufficiency win. This removes the specific #279 caveat that `POST /upload` still fell back to reading `main.go`.

This does not claim broad Go/Gin benchmark replacement or complete Go framework coverage. It only closes the release-prep gap for tested Gin route lookup questions.

## Raw Artifacts

```text
/private/tmp/zcodegraph-issue-281-gin-upload-r1/run-headless-with.jsonl
/private/tmp/zcodegraph-issue-281-gin-upload-r1/run-headless-without.jsonl
```
