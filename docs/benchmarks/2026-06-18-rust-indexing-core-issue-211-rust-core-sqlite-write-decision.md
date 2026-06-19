# Issue #211 Rust Core Graph-Write A/B Decision

## Scope

This issue tested one bounded implementation candidate from #210: reduce Rust-owned graph-write time measured by `rustCore.sqliteWriteMs`.

No Rust default rollout readiness is claimed.

Architecture records:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

## Implementation

The Rust core now suspends node FTS triggers during fresh bulk graph writes, writes the extracted graph, rebuilds `nodes_fts` once from the completed `nodes` table, and restores the triggers before the index is finalized.

This does not change the database schema or graph semantics. It changes when FTS maintenance happens during a fresh Rust-produced index.

## Reduced Fixture A/B

Representative reduced fixture:

- 80 TypeScript files
- 500 exported functions per file
- 40080 Rust-created nodes
- `sqliteWriteMode=final-flush`

| Run | sqliteWriteMs | parseExtractionMs | durationMs |
|---|---:|---:|---:|
| Before | 2313 | 945 | 3355 |
| After | 1628 | 906 | 2659 |

Reduced-fixture result: `sqliteWriteMs` improved by about 30%.

The regression test also verifies that the final `nodes_fts` row count equals the final `nodes` row count after the rebuild.

## Final After Scoreboard

- Manifest: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-after.experiment.json`
- Raw artifact: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-after.raw.json`
- Generated summary: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-after-summary.md`
- Before artifact: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-210-post-209-scoreboard.raw.json`

| Target | Sufficiency | Rust graphStats | Before sqliteWriteMs | After sqliteWriteMs | Delta | Before Rust ms | After Rust ms | Rust wall delta |
|---|---|---|---:|---:|---:|---:|---:|---:|
| ZCodeGraph | passed | unchanged | 1356 | 1038 | -23.45% | 7649 | 7579 | -0.92% |
| Excalidraw | passed | unchanged | 2411 | 1831 | -24.06% | 14979 | 14020 | -6.40% |
| VS Code sparse | passed | unchanged | 133042 | 126307 | -5.06% | 570731 | 577634 | +1.21% |

Experiment classification remains `failed-required-performance-gate-unmet`.

## Interpretation

The candidate is valid and safe to keep:

- It improves the targeted `rustCore.sqliteWriteMs` bucket on all three measured corpora.
- It preserves graphStats parity for Rust outputs.
- It preserves sufficiency across ZCodeGraph, Excalidraw, and VS Code sparse.

The candidate is not enough to satisfy the broader required performance gate:

- ZCodeGraph and Excalidraw still fail required performance.
- VS Code sparse improves in the targeted bucket but not in total Rust wall time in this single after run.
- Remaining large buckets include Rust core `localExactReferenceResolutionMs`, Rust core `parseExtractionMs`, TypeScript finalization reference resolution, and finalization DB work.

## Recommendation

Close #211 as completed because the bounded candidate was implemented, verified, and measured.

Keep #165 open. The next performance issue should select a different dominant bucket rather than continuing this exact FTS-trigger candidate. Based on this run, the strongest remaining Rust-owned candidate is `localExactReferenceResolutionMs` on VS Code sparse, with explicit graphStats/sufficiency parity checks.

#185 remains unchanged because this issue did not touch packaging, CLI status, release, or npm smoke paths.
