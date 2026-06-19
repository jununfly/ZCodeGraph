# Rust-Hybrid Indexing Performance A/B Baseline

Date: 2026-06-19

Plan: `docs/plans/2026-06-19-rust-hybrid-indexing-performance-ab.md`

Issues: #287, #288, #289, #290

## Scope

This baseline covers only the `rust-hybrid` source-path full-index flow. It does not run the full benchmark scoreboard, packaged smoke, release workflow, or agent sufficiency A/B.

## Environment

- CLI: local built `dist/bin/zcodegraph.js`
- Rust core: local `target/debug/zcodegraph-core`
- Node: 26.0.0 with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`
- Guard env: `CODEGRAPH_NO_DAEMON=1`, `CODEGRAPH_NO_RELAUNCH=1`
- RSS source: `/usr/bin/time -l`

## Corpora

| Corpus | Path | Git checkout | Revision |
| --- | --- | --- | --- |
| ZCodeGraph | `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph` | yes | current working tree |
| VS Code sparse | `/private/tmp/codegraph-corpus/vscode-sparse` | yes | `4ac5322601c6985aba4cd9349c23f4ef22dc3e65` |

## Commands

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-zcodegraph.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph --force --quiet --engine rust-hybrid
```

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-vscode-sparse.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

## Results

| Corpus | Wall-clock | Peak RSS | Profile artifact |
| --- | ---: | ---: | --- |
| ZCodeGraph | 5.40s | 343,949,312 bytes | `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-zcodegraph.profile.json` |
| VS Code sparse | 356.06s | 2,384,166,912 bytes | `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-vscode-sparse.profile.json` |

## Diagnostic Buckets

| Corpus | parseExtractionMs | rust sqliteWriteMs | TS fallback append ms | TS finalization ms | Finalize referenceResolutionMs | Finalize dynamicDispatchSynthesisMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ZCodeGraph | 1,193 | 1,187 | 133 | 925 | 487 | 378 |
| VS Code sparse | 40,233 | 124,488 | 1,150 | 125,673 | 108,499 | 14,379 |

VS Code sparse reference-resolution sub-buckets:

| Bucket | ms |
| --- | ---: |
| nameMatchingMs | 51,573 |
| databaseAccessMs | 43,759 |
| perReferenceDisambiguationMs | 46,431 |
| edgeWriteDbMs | 21,662 |
| unresolvedCleanupDbMs | 18,489 |
| candidateLookupMs | 7,337 |

## Candidate Selection

Selected bounded candidate for #288:

Move Rust core extraction writes from per-file SQLite transactions to one run-level bulk transaction for the source extraction phase.

Reasoning:

- The largest Rust-owned bucket on VS Code sparse is `sqliteWriteMs` at 124,488ms.
- The current Rust core write path commits one transaction per indexed file while FTS triggers are already suspended and rebuilt after bulk writing.
- The candidate does not alter parser coverage, symbol semantics, reference disambiguation, fallback policy, or user-facing default behavior.
- The expected effect is a reduced `rustCore.sqliteWriteMs` and full-index wall-clock, with RSS recorded as a guardrail.

Non-selected candidates:

- Parse extraction optimization (#224): `parseExtractionMs` is significant but smaller than the write bucket on the large corpus in this pass.
- TypeScript finalization/name matcher migration: larger semantic surface and not suitable as the single bounded candidate for this A/B slice.
- Reference cleanup rowid deletion: already present on the batched resolver path, so it is not a valid new optimization attempt.

Decision for #287: proceed to #288 with the single bulk-transaction Rust write candidate.
