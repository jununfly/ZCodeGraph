# ZCodeGraph 0.10.0 Targeted Agent A/B Smoke

Date: 2026-06-26

Status: targeted release smoke, not a replacement for the historical 7-repo
median-of-4 README benchmark.

## Methodology

- Agent: Claude Code headless, Opus, `--strict-mcp-config`.
- WITH arm: ZCodeGraph MCP server enabled through the installed `zcodegraph` 0.10.0 binary.
- WITHOUT arm: empty MCP config; built-in Read/Grep/Bash remained available.
- Runs: one run per arm per corpus.
- Corpora: the 0.10.0 current-state release corpora available under `/private/tmp/codegraph-corpus`.
- Interpretation: this smoke is good for detecting current release direction and obvious regressions. It is not statistically stable enough for a broad marketing claim.

## Results

| Corpus | Prompt | Time WITH -> WITHOUT | Cost WITH -> WITHOUT | Tools WITH -> WITHOUT | Read/Grep/Bash WITH -> WITHOUT | Result |
|---|---|---:|---:|---:|---:|---|
| Zustand | Store update and subscriber notification | 35s -> 34s (-2%) | $0.707 -> $0.742 (5%) | 4 -> 3 (-33%) | 1 -> 3 (67%) | mixed |
| Gin examples | `POST /upload` route to handler | 16s -> 44s (64%) | $0.303 -> $0.538 (44%) | 1 -> 15 (93%) | 0 -> 14 (100%) | strong win |
| Excalidraw | Element update to canvas re-render | 45s -> 224s (80%) | $1.027 -> $1.521 (32%) | 3 -> 55 (95%) | 0 -> 54 (100%) | strong win |
| VS Code sparse checkout | Workbench startup and lifecycle services | 119s -> 98s (-21%) | $1.517 -> $0.555 (-173%) | 9 -> 18 (50%) | 2 -> 17 (88%) | mixed: fewer tools, slower and costlier |

Average across these four one-run smoke cells:

- 51% fewer tool calls.
- 89% fewer Read/Grep/Bash fallback calls.
- 30% faster wall time on average, but unstable across repos.
- 23% higher cost on average, driven by the VS Code sparse run.

## Decision

Do not restore the old headline claim such as `16% cheaper / 58% fewer tool calls`
as a 0.10.0 release claim without rerunning the full historical 7-repo
median-of-4 benchmark.

For 0.10.0 README copy, the supported claim is narrower:

- targeted agent A/B smoke shows fewer tool calls and substantially fewer
  Read/Grep/Bash fallback calls on the current release corpora;
- cost and wall time are not stable enough in this n=1 smoke to claim broad
  savings;
- VS Code sparse is explicitly a sparse checkout and remains a mixed result.

## Machine Artifact

- `docs/benchmarks/2026-06-26-zcodegraph-0-10-0-targeted-agent-ab-summary.json`
