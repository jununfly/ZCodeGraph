# Rust-Hybrid Pre-Release Agent Sufficiency Spot-Check

Date: 2026-06-19

Related issues: #279, #280, #281

## Scope

This is a targeted first-user release spot-check for the default `rust-hybrid` path. It is not a full median-of-4 benchmark refresh.

The goal was to refresh README-facing TypeScript/JavaScript and Go sufficiency evidence with real Claude Code headless A/B runs:

- WITH: ZCodeGraph MCP server enabled against the freshly built local `dist/bin/zcodegraph.js`.
- WITHOUT: empty MCP config.
- Built-in Read, Bash/grep/find, and subagents were available in both arms.
- Repos were indexed with the current `rust-hybrid` default before the runs.

## Corpus

| Repo | Path | Commit | Index result |
|---|---|---|---|
| Excalidraw | `/private/tmp/codegraph-corpus/excalidraw` | `28a9b1711dc0625b8ab5d643dc871810ee13642f` | 641 files, 20,719 nodes, 53,345 edges, 14 TypeScript fallback files |
| Gin examples | `/private/tmp/codegraph-corpus/gin-examples` | `179495dfc053bc23b8ba6f9dc8554c904188d6b4` | 62 files, 589 nodes, 762 edges, 5 TypeScript fallback files |

Both indexes were built with:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node dist/bin/zcodegraph.js init --engine rust-hybrid
```

The local machine is on Node 26, so the unsafe-node warning appeared in stderr. `CODEGRAPH_ALLOW_UNSAFE_NODE=1` was set for these local validation runs.

## Validity Note

The first non-escalated Excalidraw A/B attempt failed before model execution with:

```text
API Error: Unable to connect to API (ConnectionRefused)
```

That run produced 0 tokens and 0 tool calls and is excluded from the metrics below. The same prompt was rerun with network access allowed and completed successfully.

## Results

| Repo | Prompt | Arm | Duration | Tool calls | CodeGraph calls | Read | Bash/Grep/Find | Cost | Tokens |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| Excalidraw | How does updating an element re-render the canvas on screen? | WITH | 61s | 7 | 5 | 2 | 0 | $1.725 | 397,153 |
| Excalidraw | same | WITHOUT | 222s | 54 | 0 | 22 | 31 | $2.048 | 164,854 |
| Gin examples | How does a request reach the upload handler for POST `/upload`? | WITH, before #281 | 29s | 5 | 1 | 3 | 1 | $0.838 | 165,808 |
| Gin examples | same | WITHOUT, before #281 | 26s | 4 | 0 | 1 | 3 | $0.710 | 149,810 |
| Gin examples | same | WITH, after #281 | 20s | 1 | 1 | 0 | 0 | $0.454 | 79,753 |
| Gin examples | same | WITHOUT, after #281 | 62s | 12 | 0 | 6 | 5 | $0.620 | 78,325 |
| Gin examples | How are Gin routes registered and connected to handlers in the examples? | WITH | 24s | 1 | 1 | 0 | 0 | $0.398 | 80,261 |
| Gin examples | same | WITHOUT | 78s | 28 | 0 | 23 | 4 | $0.663 | 81,139 |

## Interpretation

Excalidraw still shows the expected value pattern for a hard TS/React flow question:

- tool calls dropped from 54 to 7,
- Read/Bash fallback dropped from 53 to 2,
- wall time dropped from 222s to 61s.

This is not perfectly read-free; the model still read `StaticCanvas.tsx` twice after graph exploration.

Go/Gin after #281:

- The broad route-registration question is a clean sufficiency win: one `zcodegraph_explore`, zero Read/Grep fallback.
- The narrow `POST /upload` lookup became a clean sufficiency win after route-query hardening: one `zcodegraph_explore`, zero Read/Grep fallback.
- This remains targeted release-readiness evidence, not a broad Go/Gin benchmark replacement.

## README Wording Decision

README should not claim that current Go/Gin sufficiency is uniformly better. The accurate release-ready statement is:

- TS/JS flow sufficiency remains strong on the hard Excalidraw path, though not read-free.
- Go/Gin route lookup sufficiency is strong on the two targeted release-readiness prompts.
- This was a targeted pre-release spot-check, not a full benchmark replacement.

## Raw Artifacts

Raw JSONL logs are local-only under:

```text
/private/tmp/zcodegraph-pre-release-agent-sufficiency/
```

Used runs:

- `excalidraw-q1-r1-escalated/run-headless-with.jsonl`
- `excalidraw-q1-r1-escalated/run-headless-without.jsonl`
- `gin-q1-r1/run-headless-with.jsonl`
- `gin-q1-r1/run-headless-without.jsonl`
- `gin-q2-r1/run-headless-with.jsonl`
- `gin-q2-r1/run-headless-without.jsonl`
- `/private/tmp/zcodegraph-issue-281-gin-upload-r1/run-headless-with.jsonl`
- `/private/tmp/zcodegraph-issue-281-gin-upload-r1/run-headless-without.jsonl`

Excluded failed connectivity run:

- `excalidraw-q1-r1/run-headless-with.jsonl`
- `excalidraw-q1-r1/run-headless-without.jsonl`
