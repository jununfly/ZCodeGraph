# Issue #205 VS Code Sparse Finalization Profile Selection

Date: 2026-06-17

## Decision

Run completed on current `main` against the validated VS Code JS/TS sparse checkout at `/private/tmp/codegraph-corpus/vscode-sparse`.

Selected next candidate: #206, a diagnostic/design issue for the remaining TypeScript finalization `databaseAccessMs` + `nameMatchingMs` cluster. Do not start a direct name-matcher implementation from this evidence alone.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

## Artifacts

- Manifest: `docs/benchmarks/2026-06-17-rust-indexing-core-issue-205-vscode-finalization-profile.experiment.json`
- Raw artifact: `docs/benchmarks/2026-06-17-rust-indexing-core-issue-205-vscode-finalization-profile.raw.json`
- Generated summary: `docs/benchmarks/2026-06-17-rust-indexing-core-issue-205-vscode-finalization-profile-summary.md`
- Historical comparison profile: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-vscode-sqlite-after.raw.json`

## Run Context

| Field | Value |
|---|---:|
| Generated at | 2026-06-17T15:39:08.808Z |
| Node | v22.21.1 |
| OS | Darwin 25.5.0 arm64 |
| VS Code sparse commit | 4ac5322601c6985aba4cd9349c23f4ef22dc3e65 |
| Rust graph work profile | full |
| Rust SQLite write mode | final-flush |
| Experiment classification | stress-only-targets-completed-with-nonblocking-failures |
| Target classification | target-failed-performance-gate-unmet |

## Top-Level Result

| Metric | TypeScript | Rust |
|---|---:|---:|
| Total elapsed ms | 454674 | 572005 |
| Index ms | 235072 | 355898 |
| Peak RSS bytes | 49725440 | 43417600 |
| graphStats ms | 67 | 75 |

Sufficiency: passed.

Performance gate: unavailable / unmet. Rust remains slower end-to-end on this stress target, with the largest Rust-over-TypeScript wall-time delta in `index`.

## Rust Finalization Subsegments

| Segment | Current ms | Phase 18 ms | Direction |
|---|---:|---:|---|
| referenceResolutionMs | 85884 | 127909 | down |
| importResolutionMs | 9976 | 10029 | flat |
| nameMatchingMs | 34332 | 54645 | down |
| frameworkMatchingMs | 827 | 1270 | down |
| databaseAccessMs | 38376 | 57706 | down |
| unresolvedReadMs | 998 | 2442 | down |
| candidateLookupMs | 4137 | 8456 | down |
| sharedCandidateLookupMs | 1279 | 2949 | down |
| perReferenceDisambiguationMs | 31472 | 49133 | down |
| edgeMaterializationMs | 263 | 400 | down |
| edgeWriteMs | 20466 | 29293 | down |
| unresolvedCleanupMs | 16260 | 24231 | down |
| dynamicDispatchSynthesisMs | 9422 | 11125 | down |
| dbMaintenanceMs | 108 | 2237 | down |

Qualitative comparison only: this is a fresh single-run current-main profile, not a multi-run benchmark claim. The main trend is positive across finalization subsegments after the Phase 18 and #193 work, but the remaining large cluster is still broad database access plus name matching / per-reference disambiguation.

## Rust Core Segments

| Segment | Current ms |
|---|---:|
| sourceScanMs | 81 |
| parseExtractionMs | 39032 |
| sqliteWriteMs | 138150 |
| importPathAliasResolutionMs | 6160 |
| esmNamedImportExportResolutionMs | 13131 |
| localExactReferenceResolutionMs | 48582 |
| subprocessStartupHandoffMs | 13 |
| typescriptFinalizationMs | 98673 |

## Graph Stats

| Metric | TypeScript | Rust |
|---|---:|---:|
| fileCount | 11098 | 11291 |
| nodeCount | 329355 | 561906 |
| edgeCount | 1512994 | 1626117 |
| dbSizeBytes | 1057366016 | 1216704512 |

Rust edge kinds:

| Edge kind | Count |
|---|---:|
| calls | 747730 |
| contains | 550659 |
| exports | 7466 |
| imports | 264603 |
| instantiates | 54324 |
| references | 1335 |

## Fallback Taxonomy

| Stage | Classification | Reason | Count |
|---|---|---|---:|
| framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 149517 |
| reference-resolution | known-unsupported | unsupported-import-form-not-yet-rust-owned | 554 |
| reference-resolution | known-unsupported | unresolved-file-level-import-target | 81783 |

Total fallbacks: 231858.

## Candidate Selection

`databaseAccessMs` is the largest current finalization subsegment at 38376ms, and `nameMatchingMs` is close behind at 34332ms. `perReferenceDisambiguationMs` accounts for most of name matching at 31472ms. `edgeWriteMs` and `unresolvedCleanupMs` are still meaningful, but they are no longer the clearest first candidate after #193.

#206 should be diagnostic/design rather than implementation:

- Split the broad `databaseAccessMs` bucket around the name-matching path so future A/B work can distinguish candidate reads, per-reference lookups, edge writes, and cleanup.
- Preserve every per-reference disambiguation semantic.
- Do not change SQLite schema.
- Do not change matcher behavior.
- End with exactly one bounded implementation recommendation, or a stop recommendation.

This fits #205's rule for a remaining dominant name-matching cluster: diagnose first, then decide. It also avoids over-claiming from one stress-target run.
