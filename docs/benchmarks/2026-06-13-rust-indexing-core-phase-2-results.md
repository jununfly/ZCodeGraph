# Rust Indexing Core Phase 2 Results

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
Parent plan: [Rust Indexing Core Phase 2 Packaging, CI, and Performance Hardening](../plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md)
Issue: [#68](https://github.com/jununfly/ZCodeGraph/issues/68)

## Summary

The Phase 2 rerun passes the memory gate and meets the <100% slower stretch goal
on both target repositories after the #67 SQLite write batching optimization.
Agent Sufficiency guardrails reported no Rust-vs-TypeScript regressions.

Default rollout remains blocked pending the explicit Phase 2 stop/continue
decision in #69. The remaining risk is not the stretch goal; it is whether the
opt-in Rust path has enough coverage, repeatability, and release confidence to
be considered for a broader rollout.

Raw JSON was written locally under `/tmp/zcodegraph-phase2-68/`:

- `benchmark.json`
- `profile.json`
- `sufficiency.json`

## Method

Commands:

```bash
npm run build
cargo build --package zcodegraph-core
node scripts/rust-index-benchmark.mjs --repo zcodegraph=. --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw
node scripts/rust-index-profile.mjs --repo zcodegraph=. --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw
node scripts/rust-sufficiency-guardrail.mjs --repo zcodegraph=. --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw
```

`rust-index-benchmark.mjs` was run outside the sandbox so process-tree RSS
sampling via `ps` worked. The benchmark copied each repository to temporary
JS/TS slice directories before indexing. The guardrail uses deterministic
`zcodegraph_explore` fallback-risk signals, not stochastic Claude Code
Read/Grep tool calls.

Environment:

| Field | Value |
|---|---|
| Generated | 2026-06-13T07:44:35Z to 2026-06-13T07:45:34Z |
| Node | v26.0.0 |
| Rust | rustc 1.95.0 (59807616e 2026-04-14) |
| Cargo | cargo 1.95.0 (f2d3ce0bd 2026-03-21) |
| OS | Darwin 25.5.0 arm64 |
| CPU | Apple M5, 10 cores |

## Benchmark

| Repo | Commit | Slice files | TypeScript wall | Rust wall | Rust slowdown | TypeScript RSS | Rust RSS | RSS reduction | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| ZCodeGraph | 85decc7 | 254 | 1.99s | 2.87s | 44.4% slower | 359.39 MiB | 218.46 MiB | 39.2% lower | Pass |
| Excalidraw | a83ac488 | 648 | 5.27s | 6.26s | 18.7% slower | 546.78 MiB | 264.61 MiB | 51.6% lower | Pass |

The <100% slower stretch goal was met on both repositories.

## Profile

| Repo | Commit | Source scan | Parse/extraction | SQLite write | TypeScript finalization | Subprocess handoff |
|---|---:|---:|---:|---:|---:|---:|
| ZCodeGraph | 85decc7 | 0ms | 845ms | 993ms | 641ms | 3ms |
| Excalidraw | a83ac488 | 2ms | 1431ms | 1652ms | 2330ms | 2ms |

The #67 optimization removed SQLite write time as the extreme bottleneck seen
after #66. The largest remaining Excalidraw phase is TypeScript finalization.

## Agent Sufficiency

| Repo | Prompts | Rust regressions | Notes |
|---|---:|---:|---|
| ZCodeGraph | 3 | 0 | Rust matched TypeScript fallback-risk classification on all prompts; both paths still show graph-coverage residuals for these broad planner/indexing prompts. |
| Excalidraw | 3 | 0 | Rust matched TypeScript clean flow connectivity on all three React canvas prompts. |

The guardrail returned `regressions=[]`.

## Decision

The Phase 2 benchmark/profile/sufficiency rerun for #68 is complete:

- Benchmark results were rerun for ZCodeGraph and Excalidraw.
- Profiler output was recorded for ZCodeGraph and Excalidraw.
- Agent Sufficiency guardrails were rerun for ZCodeGraph and Excalidraw.
- The <100% slower stretch goal was met.
- No default-rollout decision is made here; default rollout remains blocked
  until #69 records the Phase 2 stop/continue decision.
