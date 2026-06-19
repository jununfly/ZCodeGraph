# Rust-Hybrid Wall-Clock A/B v2 After Profile

Date: 2026-06-19

Plan: `docs/plans/2026-06-19-rust-hybrid-default-indexing-wall-clock-ab.md`

Issues: #292, #293, #294

Baseline: `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline.md`

## Candidate Tried

The single bounded candidate selected by #291 was implemented:

Rust core extraction now reuses one tree-sitter parser per source language
during a full-index run instead of constructing and configuring a fresh parser
for every file.

This does not change parser grammar selection, extracted graph semantics,
TypeScript fallback behavior, reference disambiguation, or default user
behavior.

## Validation

Targeted and regression tests:

```bash
cargo test --package zcodegraph-core rust_index_extracts_mixed_languages_with_reused_parsers
cargo test --package zcodegraph-core
```

Result: 26 passed.

Build checks:

```bash
npm run build
cargo build --package zcodegraph-core
```

Result: both passed.

No packaged/release smoke was run because this change does not touch CLI
launcher, packaging, status, doctor, or release workflow paths. No agent
sufficiency A/B was run because graph semantics and indexed results are not
intended to change.

## After Commands

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after-zcodegraph.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph --force --quiet --engine rust-hybrid
```

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after-vscode-sparse.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

## Wall-Clock And RSS

| Corpus | Baseline wall-clock | After wall-clock | Trend | Baseline RSS | After RSS | Trend |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ZCodeGraph | 4.88s | 4.76s | -2.46% | 319,930,368 bytes | 342,900,736 bytes | +7.18% |
| VS Code sparse | 295.14s | 286.66s | -2.87% | 2,321,973,248 bytes | 2,178,482,176 bytes | -6.18% |

## Profile Comparison

| Corpus | Bucket | Baseline ms | After ms | Trend |
| --- | --- | ---: | ---: | ---: |
| ZCodeGraph | rustCore.parseExtractionMs | 1,213 | 1,166 | -3.87% |
| ZCodeGraph | rustCore.sqliteWriteMs | 653 | 582 | -10.87% |
| ZCodeGraph | rustCore.localExactReferenceResolutionMs | 520 | 515 | -0.96% |
| ZCodeGraph | typescriptFallbackAppend.durationMs | 136 | 134 | -1.47% |
| ZCodeGraph | typescriptFinalizationMs | 894 | 909 | +1.68% |
| VS Code sparse | rustCore.parseExtractionMs | 40,052 | 39,996 | -0.14% |
| VS Code sparse | rustCore.sqliteWriteMs | 54,061 | 50,132 | -7.27% |
| VS Code sparse | rustCore.localExactReferenceResolutionMs | 37,304 | 36,829 | -1.27% |
| VS Code sparse | typescriptFallbackAppend.durationMs | 1,101 | 1,148 | +4.27% |
| VS Code sparse | typescriptFinalizationMs | 126,363 | 122,274 | -3.24% |

VS Code sparse finalization sub-buckets:

| Bucket | Baseline ms | After ms | Trend |
| --- | ---: | ---: | ---: |
| referenceResolutionMs | 109,635 | 104,426 | -4.75% |
| nameMatchingMs | 50,990 | 50,606 | -0.75% |
| databaseAccessMs | 45,404 | 41,213 | -9.23% |
| perReferenceDisambiguationMs | 45,450 | 45,806 | +0.78% |
| edgeWriteDbMs | 21,728 | 20,504 | -5.63% |
| unresolvedCleanupDbMs | 19,413 | 17,201 | -11.39% |
| dynamicDispatchSynthesisMs | 13,846 | 14,696 | +6.14% |

## Decision

Decision: keep, with low confidence that this specific candidate materially
improves `parseExtractionMs`.

Why keep:

- The change is narrow and semantics-preserving.
- Targeted mixed-language extraction and the full Rust core test suite passed.
- Full-index wall-clock improved on both corpora.
- VS Code sparse RSS improved.

Why the performance conclusion is modest:

- The candidate targeted parser setup overhead inside `parseExtractionMs`, but
  VS Code sparse `parseExtractionMs` only moved from 40,052ms to 39,996ms.
- Most of the VS Code wall-clock movement came from other buckets
  (`sqliteWriteMs`, TypeScript finalization, and finalization database buckets),
  which may include ordinary run-to-run variance.
- This candidate should not be treated as closing #224.

Remaining bottleneck:

The large-corpus end-to-end run is still dominated by TypeScript finalization
and reference-resolution work (`typescriptFinalizationMs` 122,274ms,
`referenceResolutionMs` 104,426ms). Among Rust-owned buckets,
`parseExtractionMs` remains visible and needs more actionable sub-bucket
profiling before another parse/extraction optimization is chosen.

Next recommendation:

- Keep #224 open.
- Reframe #224 toward parse/extraction sub-bucket diagnostics rather than
  assuming parser setup was the meaningful cost.
- For #165, continue treating TypeScript finalization/reference-resolution as
  the largest end-to-end blocker, but require a narrow low-semantic-risk
  candidate before implementing there.
