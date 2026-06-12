# Explore Sufficiency Results Compact — 2026-06-12

## Correspondence

This compact result file corresponds to
`docs/benchmarks/explore-sufficiency-2026-06-11.md`.

## Source Inputs

- Raw logs: `/tmp/zcodegraph-sufficiency/`
- Summary table: `/tmp/zcodegraph-sufficiency/summary.md`
- Structured data: `/tmp/zcodegraph-sufficiency/summary.json`
- Generated summary timestamp: `2026-06-12T05:10:07.547Z`

Raw logs remain outside the repository. This file keeps only the compact
decision-useful data.

## Matrix Shape

- Repos: ZCodeGraph, Excalidraw, Django
- Prompts: 3 per repo
- Runs: 2 per prompt per arm
- Arms: WITH ZCodeGraph, WITHOUT ZCodeGraph
- Total headless runs: 36

## Overall Result

| Arm | Runs | Duration | Cost | Tools | CodeGraph | Read | Grep/Bash |
|---|---:|---:|---:|---:|---:|---:|---:|
| WITH | 18 | 764s | $19.106 | 68 | 66 | 2 | 0 |
| WITHOUT | 18 | 1506s | $23.210 | 262 | 0 | 127 | 125 |

Observed displacement in this matrix:

- Generic Read calls: 127 -> 2.
- Generic Grep/Bash search calls: 125 -> 0.
- Total tool calls: 262 -> 68.
- Duration: 1506s -> 764s.
- Cost: $23.210 -> $19.106.

## Repo Rollups

| Repo | Arm | Runs | Duration | Cost | Tools | CodeGraph | Read | Grep/Bash | Flow yes | Flow no |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ZCodeGraph | WITH | 6 | 284s | $9.000 | 25 | 25 | 0 | 0 | 3 | 3 |
| ZCodeGraph | WITHOUT | 6 | 568s | $11.396 | 94 | 0 | 49 | 42 | 0 | 0 |
| Excalidraw | WITH | 6 | 247s | $5.711 | 30 | 28 | 2 | 0 | 6 | 0 |
| Excalidraw | WITHOUT | 6 | 610s | $5.053 | 129 | 0 | 56 | 67 | 0 | 0 |
| Django | WITH | 6 | 233s | $4.395 | 13 | 13 | 0 | 0 | 6 | 0 |
| Django | WITHOUT | 6 | 328s | $6.761 | 39 | 0 | 22 | 16 | 0 | 0 |

## Key Findings

- ZCodeGraph self-queries displaced all generic Read/Grep calls, but only 3 of
  6 WITH runs reported connected flow. This is a flow-section quality signal,
  not a generic fallback regression.
- Excalidraw displaced nearly all generic Read/Grep calls. The only WITH-arm
  generic reads were two `App.tsx` fallback reads: `EX-1 run1` and `EX-2 run1`.
  This residual was converted into a follow-up issue.
- Django had the cleanest WITH-arm behavior: all 6 runs connected flow and used
  zero generic Read/Grep calls.
- WITHOUT arms consistently recovered expected answer evidence through generic
  Read/Grep-style tools, so those calls are classified as fallback for this
  flow-only matrix.

## Fallback Classification

The prompt set contained flow questions only; there were no edit-prep or
verification tasks. Generic Read/Grep-style calls are therefore classified as
expected answer-evidence recovery unless called out below.

Exceptions and notes:

- `excalidraw EX-1 run1 WITH`: 1 fallback read of `App.tsx`.
- `excalidraw EX-2 run1 WITH`: 1 fallback read of `App.tsx`.
- All other WITH-arm generic Read/Grep counts were zero.
- WITHOUT-arm generic Read/Grep calls are fallback evidence recovery by design
  because the arm had no CodeGraph tools.

## Follow-Up Signals

- Track the Excalidraw `App.tsx` fallback reads as a scoped sufficiency
  improvement.
- Investigate ZCodeGraph self-query flow-section misses where WITH runs
  answered without generic fallback but `flow_connected` was false.
- Keep Django query/compiler prompts as a positive control for future Explore
  Answer planner changes.

## Files Not Embedded

This compact file intentionally omits:

- Per-run JSONL transcripts.
- Full generic Read/Grep call listings.
- Full `summary.json` payload.

Those remain recoverable from `/tmp/zcodegraph-sufficiency/` during the local
session, while this repository record stays small and reviewable.
