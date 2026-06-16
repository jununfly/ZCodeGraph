# Rust Indexing Core Phase 15F: Production-Like RSS Gate Cleanup

## Scope

Phase 15F follows up the Phase 15E RSS gate with a narrower production-like run shape:

- Use the supported bundled Node runtime, not the local Node 26 runtime.
- Use a non-`dhat` Rust core binary.
- Run the VS Code sparse checkout matched-work profile as a completed two-arm comparison.
- Try lazy TypeScript/JavaScript normalization first.
- If the lazy normalization result is insufficient, try exactly one bounded second candidate: `visit_js_node` borrowed-ID cleanup.

This phase does not claim Rust default indexer readiness or full-profile rollout readiness.

## Target

- Corpus: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Dirty state: `true`, expected `.zcodegraph/` working directory noise
- Runtime: `/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`
- Node version: `v24.14.0`
- Rust core: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core`
- Rust graph work profile: `matched-ts-js`

## Issues

- #174: production-like VS Code RSS baseline
- #175: lazy TypeScript normalization allocation cleanup
- #176: production-like after-smoke and bounded second-candidate decision
- #177: Phase 15F tracker
- Parent blockers: #49, #165

## Implementation Summary

The lazy normalization slice changes `normalize_source_for_parser` to return borrowed input when no parser compatibility rewrite is needed. JavaScript and JSX sources now stay borrowed. TypeScript and TSX sources use a single lazy normalization pass that only allocates after the first rewrite and handles import type query normalization plus contextual keyword normalization in the same buffer.

The bounded second candidate changes the `visit_js_node` traversal path so the current child source ID is borrowed unless a newly extracted symbol changes the scope. This avoids one hot-path clone but intentionally does not change extraction semantics or graph shape.

## Validation Artifacts

| Run | Raw artifact | Summary artifact |
|---|---|---|
| Baseline | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-15f-production-like-vscode-baseline.raw.json` | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-15f-production-like-vscode-baseline-summary.md` |
| Lazy normalization after-smoke | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-15f-lazy-normalization-vscode-after.raw.json` | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-15f-lazy-normalization-vscode-after-summary.md` |
| Borrowed-ID after-smoke | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-15f-borrowed-id-vscode-after.raw.json` | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-15f-borrowed-id-vscode-after-summary.md` |
| Reduced smoke | `docs/benchmarks/2026-06-17-rust-indexing-core-phase-15f-lazy-normalization-reduced-smoke.json` | n/a |

## Production-Like VS Code Results

Each row is a completed TypeScript vs Rust comparison on the same sparse checkout shape. These are single smoke runs, so they are trend evidence rather than a statistically stable benchmark.

| Run | TS peak RSS | Rust peak RSS | RSS delta | Wall-time delta | TS elapsed | Rust elapsed | Classification |
|---|---:|---:|---:|---:|---:|---:|---|
| Baseline | 29,376,512 | 38,322,176 | +30.45% | -22.31% | 457,697 ms | 355,602 ms | `target-failed-performance-gate-unmet` |
| Lazy normalization | 40,255,488 | 38,223,872 | -5.05% | -23.20% | 461,307 ms | 354,297 ms | `target-failed-performance-gate-unmet` |
| Borrowed-ID cleanup | 29,130,752 | 38,191,104 | +31.10% | -24.54% | 466,592 ms | 352,075 ms | `target-failed-performance-gate-unmet` |

## Rust Profile Trend

| Run | parseExtractionMs | sqliteWriteMs | referenceResolutionMs | typescriptFinalizationMs |
|---|---:|---:|---:|---:|
| Baseline | 37,195 | 62,635 | 21,549 | 28,599 |
| Lazy normalization | 36,831 | 61,339 | 21,026 | 27,976 |
| Borrowed-ID cleanup | 35,736 | 61,108 | 21,111 | 28,099 |

## Decision

Final #176 result: `stop-and-reassess-before-in-memory-pivot`.

Lazy normalization is worth keeping because it removes avoidable source copies without changing parser semantics and the production-like smoke moved the RSS delta from `+30.45%` to `-5.05%`. The comparison is not strong enough to claim the `<= -30%` RSS gate because TypeScript arm RSS varied materially between single runs.

The bounded `visit_js_node` borrowed-ID candidate did not materially lower Rust peak RSS: Rust moved from `38,223,872` bytes to `38,191,104` bytes, while the comparison delta returned to `+31.10%` because the TypeScript arm returned to its lower RSS band. This candidate does not close the RSS gate.

Phase 15F stops here. The next optimization should be planned as a separate issue rather than expanding #176 into SQLite in-memory/final-flush work.

## Tracker Status

- #174: complete, baseline artifact captured with supported Node, non-`dhat` Rust core, both arms completed, and dirty sparse checkout state recorded.
- #175: complete, lazy normalization implemented and covered by focused Rust tests plus reduced smoke.
- #176: complete, lazy after-smoke and one bounded second candidate after-smoke recorded; RSS gate remains unmet.
- #177: complete as a tracker once #49 and #165 are updated with this result.

## Out Of Scope

- No default Rust indexer readiness claim.
- No full-profile rollout readiness claim.
- No additional Phase 15F optimization candidate beyond borrowed-ID cleanup.
- No SQLite in-memory/final-flush pivot in this issue sequence.
