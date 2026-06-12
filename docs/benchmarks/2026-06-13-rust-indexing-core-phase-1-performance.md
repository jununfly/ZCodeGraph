# Rust Indexing Core Phase 1 Performance Gate

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
Parent plan: [Rust Indexing Core Phase 1 Plan](../plans/2026-06-12-rust-indexing-core-phase-1.md)
Issue: [#57](https://github.com/jununfly/ZCodeGraph/issues/57)

## Summary

The Rust Phase 1 indexer passes the hard gate on peak RSS for both measured
repositories, but it is slower than the TypeScript indexer in this slice.

The gate is: Rust must be at least 25% faster or use at least 30% less peak RSS,
with the other metric not significantly worse. These runs pass on memory
reduction and fail on wall-clock time. Keep the Rust path opt-in and treat
wall-clock performance as a Phase 2 optimization target before any default
rollout decision.

## Method

- Runner: `scripts/rust-index-benchmark.mjs`
- Command:

```bash
npm run build
cargo build --package zcodegraph-core
/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  scripts/rust-index-benchmark.mjs \
  --repo zcodegraph=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph \
  --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw
```

- Each repository was copied to temporary directories before indexing.
- The copied benchmark slice includes Phase 1 JS/TS files (`.js`, `.jsx`,
  `.ts`, `.tsx`) plus JS/TS config files (`package.json`, `tsconfig.json`,
  `jsconfig.json`).
- Each run used `zcodegraph init`, then measured `zcodegraph index --force
  --quiet`.
- Peak RSS was sampled from the CLI process tree during indexing.
- Raw JSON was written to `/tmp/zcodegraph-rust-index-benchmark-57.json`.

## Environment

| Field | Value |
|---|---|
| Generated | 2026-06-12T18:39:28.918Z |
| Node | v24.14.0 |
| Rust | rustc 1.95.0 (59807616e 2026-04-14) |
| Cargo | cargo 1.95.0 (f2d3ce0bd 2026-03-21) |
| OS | Darwin 25.5.0 arm64 |
| CPU | Apple M5, 10 cores |
| Memory | 16 GiB |

## Results

| Repo | Commit | Slice files | Engine | Wall time | Peak RSS |
|---|---:|---:|---|---:|---:|
| ZCodeGraph | fc50081 | 246 | TypeScript | 1.73s | 1.44 GiB |
| ZCodeGraph | fc50081 | 246 | Rust | 6.85s | 206.30 MiB |
| Excalidraw | a83ac488 | 648 | TypeScript | 5.00s | 3.67 GiB |
| Excalidraw | a83ac488 | 648 | Rust | 13.34s | 334.70 MiB |

## Gate Decision

| Repo | Wall-time change | Peak-RSS reduction | Gate |
|---|---:|---:|---|
| ZCodeGraph | 296.8% slower | 86.0% lower | Memory gate passes; speed failure documented |
| Excalidraw | 166.5% slower | 91.1% lower | Memory gate passes; speed failure documented |

The benchmark script exits non-zero when a measured repository fails both hard
gate alternatives. This run passed with `gateFailures=[]`.

## Interpretation

- The Rust path strongly validates the memory-control motivation.
- The Rust path does not yet validate the indexing-speed motivation.
- The large TypeScript peak RSS likely includes Node, WASM grammar loading, and
  parse worker memory. The Rust subprocess keeps that path out of the hot
  extraction loop.
- The Rust wall-clock loss is acceptable for Phase 1 only because the hard gate
  was explicitly `speed OR memory`. Before expanding scope or considering a
  default rollout, investigate Rust extraction throughput, subprocess handoff
  overhead, SQLite write batching, and the TypeScript finalization cost that
  still runs after Rust extraction.
