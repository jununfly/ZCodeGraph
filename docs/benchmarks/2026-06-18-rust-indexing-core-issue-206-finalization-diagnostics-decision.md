# Issue #206 Finalization Diagnostics Decision

Date: 2026-06-18

## Decision

#206 completed the diagnostic slice for the VS Code sparse TypeScript finalization `databaseAccessMs` + `nameMatchingMs` cluster.

Selected next candidate: #207, a follow-up design/prototype issue for semantic-equivalent per-reference disambiguation work. Do not directly optimize matcher behavior yet.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

## Artifacts

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-23-rust-indexing-core-issue-optimization-evidence-cleanup.md`
- Prior comparison: `docs/benchmarks/2026-06-17-rust-indexing-core-issue-205-vscode-finalization-profile-selection.md`

## Run Context

| Field | Value |
|---|---:|
| Generated at | 2026-06-17T16:26:34.905Z |
| Node | v22.21.1 |
| OS | Darwin 25.5.0 arm64 |
| VS Code sparse commit | 4ac5322601c6985aba4cd9349c23f4ef22dc3e65 |
| VS Code sparse dirty | false |
| Copied files per arm | 11518 |
| Rust graph work profile | full |
| Rust SQLite write mode | final-flush |
| Experiment classification | stress-only-targets-completed-with-nonblocking-failures |
| Target classification | target-failed-performance-gate-unmet |

## Top-Level Result

| Metric | TypeScript | Rust |
|---|---:|---:|
| Total elapsed ms | 455709 | 567944 |
| Index ms | 234579 | 349211 |
| Peak RSS bytes | 44810240 | 46071808 |
| graphStats ms | 66 | 78 |

Sufficiency: passed.

Performance gate: unavailable / unmet. The post-PRD optimization gate remains open.

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

## Finalization Diagnostics

Single-run qualitative comparison only. #206 adds new public profile diagnostic fields for benchmark artifacts; they are not user-facing API and not an MCP contract.

| Segment | #206 ms | #205 ms | Notes |
|---|---:|---:|---|
| referenceResolutionMs | 85127 | 85884 | flat/down |
| importResolutionMs | 9477 | 9976 | flat/down |
| nameMatchingMs | 34539 | 34332 | flat |
| frameworkMatchingMs | 872 | 827 | flat |
| databaseAccessMs | 37875 | 38376 | flat/down |
| cacheWarmupDbMs | 271 | n/a | new #206 diagnostic |
| refHydrationDbMs | 51 | n/a | new #206 diagnostic |
| cacheWarmupMs | 322 | 389 | flat/down |
| unresolvedReadMs | 993 | 998 | flat |
| unresolvedReadDbMs | 993 | n/a | new #206 diagnostic |
| candidateLookupMs | 4129 | 4137 | flat |
| sharedCandidateLookupMs | 1258 | 1279 | flat |
| candidateLookupCacheHitMs | 471 | 416 | flat |
| nameMatcherCandidateLookupDbMs | 3669 | n/a | new #206 diagnostic |
| perReferenceDisambiguationMs | 31666 | 31472 | flat |
| edgeMaterializationMs | 259 | 263 | flat |
| edgeMaterializationDbMs | 259 | n/a | new #206 diagnostic |
| edgeWriteMs | 20167 | 20466 | flat/down |
| edgeWriteDbMs | 20167 | n/a | new #206 diagnostic |
| unresolvedCleanupMs | 16135 | 16260 | flat |
| unresolvedCleanupDbMs | 16135 | n/a | new #206 diagnostic |
| dynamicDispatchSynthesisMs | 9374 | 9422 | flat |
| dbMaintenanceMs | 114 | 108 | flat |

## Interpretation

The broad `databaseAccessMs` bucket is now separable enough to avoid guessing. Its largest DB subpaths are:

| DB subpath | #206 ms |
|---|---:|
| edgeWriteDbMs | 20167 |
| unresolvedCleanupDbMs | 16135 |
| nameMatcherCandidateLookupDbMs | 3669 |
| unresolvedReadDbMs | 993 |
| cacheWarmupDbMs | 271 |
| edgeMaterializationDbMs | 259 |
| refHydrationDbMs | 51 |

However, the largest single semantic subpath remains `perReferenceDisambiguationMs` at 31666ms. Because this path determines each reference's candidate choice, it is not safe to turn #206 directly into an implementation optimization.

`edgeWriteDbMs` and `unresolvedCleanupDbMs` are meaningful runner-up DB write paths, but they are not the selected next candidate because #206 shows the name-matcher disambiguation work is still the largest individual decision path.

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

## Next Candidate

Open #207 for semantic-equivalent per-reference disambiguation design/prototype.

Required constraints for that issue:

- Preserve every per-reference disambiguation semantic.
- Do not change SQLite schema.
- Do not directly replace the name matcher.
- Evaluate candidate reuse, batching, or cache-key design only if the output for each reference remains identical.
- Use focused fixtures for equivalence checks.
- End with one bounded A/B implementation recommendation, or explicitly stop.

This keeps the post-PRD optimization work data-driven without hiding a semantic change inside a performance issue.
