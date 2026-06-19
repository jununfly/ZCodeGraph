# Rust-Hybrid Indexing Performance A/B After Profile

Date: 2026-06-19

Plan: `docs/plans/2026-06-19-rust-hybrid-indexing-performance-ab.md`

Issues: #288, #289, #290

Baseline: `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline.md`

## Candidate Tried

The single bounded candidate selected by #287 was implemented:

Rust core source extraction now writes all per-file facts through one run-level SQLite transaction instead of opening and committing one transaction per indexed file. Parser coverage, extracted graph facts, TypeScript fallback behavior, Rust/TypeScript ownership boundaries, and user-facing defaults are unchanged.

## Validation

Targeted tests:

```bash
cargo test --package zcodegraph-core
```

Result: 25 passed.

Build checks:

```bash
npm run build
cargo build --package zcodegraph-core
```

Result: both passed.

No packaged/release smoke was run because this change does not touch CLI launcher, packaging, status, doctor, or release workflow paths.

## After Commands

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after-zcodegraph.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph --force --quiet --engine rust-hybrid
```

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after-vscode-sparse.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

## Wall-Clock And RSS

| Corpus | Baseline wall-clock | After wall-clock | Trend | Baseline RSS | After RSS | Trend |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ZCodeGraph | 5.40s | 4.95s | -8.33% | 343,949,312 bytes | 335,200,256 bytes | -2.54% |
| VS Code sparse | 356.06s | 296.93s | -16.61% | 2,384,166,912 bytes | 2,197,028,864 bytes | -7.85% |

## Profile Comparison

| Corpus | Bucket | Baseline ms | After ms | Trend |
| --- | --- | ---: | ---: | ---: |
| ZCodeGraph | rustCore.parseExtractionMs | 1,193 | 1,184 | -0.75% |
| ZCodeGraph | rustCore.sqliteWriteMs | 1,187 | 603 | -49.20% |
| ZCodeGraph | typescriptFallbackAppend.durationMs | 133 | 139 | +4.51% |
| ZCodeGraph | typescriptFinalizationMs | 925 | 951 | +2.81% |
| VS Code sparse | rustCore.parseExtractionMs | 40,233 | 40,452 | +0.54% |
| VS Code sparse | rustCore.sqliteWriteMs | 124,488 | 54,887 | -55.91% |
| VS Code sparse | typescriptFallbackAppend.durationMs | 1,150 | 1,187 | +3.22% |
| VS Code sparse | typescriptFinalizationMs | 125,673 | 126,161 | +0.39% |

VS Code sparse TypeScript finalization sub-buckets stayed essentially flat, which is expected because this candidate only targeted Rust core extraction writes:

| Bucket | Baseline ms | After ms | Trend |
| --- | ---: | ---: | ---: |
| referenceResolutionMs | 108,499 | 108,595 | +0.09% |
| nameMatchingMs | 51,573 | 52,131 | +1.08% |
| databaseAccessMs | 43,759 | 43,324 | -0.99% |
| edgeWriteDbMs | 21,662 | 21,408 | -1.17% |
| unresolvedCleanupDbMs | 18,489 | 18,382 | -0.58% |
| dynamicDispatchSynthesisMs | 14,379 | 14,475 | +0.67% |

## Decision

Decision: keep.

Why:

- The selected bucket moved in the expected direction on both corpora.
- The large-corpus total wall-clock improved by 16.61%.
- The large-corpus Rust-owned SQLite write bucket improved by 55.91%.
- RSS did not regress; both corpora reported slightly lower peak RSS under `/usr/bin/time -l`.
- TypeScript finalization stayed flat, so the trend points specifically at the selected candidate rather than unrelated behavior changes.

Remaining bottleneck:

This does not solve the overall indexing target alone. After the change, the VS Code sparse run is still dominated by TypeScript finalization and reference-resolution work (`typescriptFinalizationMs` 126,161ms, `referenceResolutionMs` 108,595ms). Continue tracking deeper long-run performance work in #165. The parse-extraction candidate #224 remains valid but was not the best first candidate in this A/B slice.
