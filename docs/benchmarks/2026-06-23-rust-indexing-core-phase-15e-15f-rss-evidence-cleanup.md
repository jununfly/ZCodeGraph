# Rust Indexing Core Phase 15E/15F RSS Evidence Cleanup

Date: 2026-06-23

## Decision

Decision: `consolidate-and-delete-process-artifacts`.

Phase 15E/15F RSS work has durable conclusions in the plans and this cleanup
artifact. The generated raw experiment files, experiment manifests, summary
drafts, and copied `dhat` heap report can be deleted after this consolidation.

## Phase 15E Consolidated Finding

Phase 15E built reusable heap-profiling infrastructure and ran a VS Code
matched-work stress profile with `dhat` enabled.

Reusable conclusion:

- `dhat-rs` heap profiling and summary generation were useful diagnostic
  tooling.
- SQLite write batching moved the VS Code matched-work RSS trend favorably.
- The profiled run was not a rollout-readiness signal because `dhat` changes
  runtime behavior and wall time.
- The RSS gate still did not close.

Key result:

| Evidence | Before | After |
| --- | ---: | ---: |
| VS Code matched-work RSS delta | +20.08% | -21.41% |

Interpretation: favorable trend, not a default-rollout greenlight.

## Phase 15F Consolidated Finding

Phase 15F reran production-like VS Code sparse matched-work smoke without the
`dhat` profiler and tried one bounded second candidate after lazy
normalization.

Reusable conclusion:

- Baseline: Rust wall time improved but RSS regressed.
- Lazy normalization: worth keeping; removes avoidable source copies and moved
  the single-run RSS delta from `+30.45%` to `-5.05%`.
- Borrowed-ID cleanup: no material RSS improvement; Rust peak RSS stayed around
  `38.2 MB`.
- The PRD RSS gate was still unmet; Phase 15F stopped instead of pivoting to a
  broad SQLite in-memory/final-flush rewrite.

Key production-like VS Code sparse results:

| Run | TS peak RSS | Rust peak RSS | RSS delta | Wall-time delta | Classification |
| --- | ---: | ---: | ---: | ---: | --- |
| Baseline | 29,376,512 | 38,322,176 | +30.45% | -22.31% | gate unmet |
| Lazy normalization | 40,255,488 | 38,223,872 | -5.05% | -23.20% | gate unmet |
| Borrowed-ID cleanup | 29,130,752 | 38,191,104 | +31.10% | -24.54% | gate unmet |

Rust profile trend:

| Run | parseExtractionMs | sqliteWriteMs | referenceResolutionMs | typescriptFinalizationMs |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 37,195 | 62,635 | 21,549 | 28,599 |
| Lazy normalization | 36,831 | 61,339 | 21,026 | 27,976 |
| Borrowed-ID cleanup | 35,736 | 61,108 | 21,111 | 28,099 |

## Deleted Process Artifact Classes

This cleanup deletes:

- Phase 15E copied `dhat` heap JSON/HTML evidence and generated rerun4
  raw/manifest/draft files;
- Phase 15F generated raw experiment files;
- Phase 15F generated experiment manifests;
- Phase 15F generated summary files;
- Phase 15F reduced smoke JSON.

## Durable Follow-On Artifacts

Keep these as the reusable decision trail:

- `docs/plans/2026-06-16-rust-indexing-core-phase-15e-rss-gate.md`
- `docs/plans/2026-06-17-rust-indexing-core-phase-15f-production-like-rss-gate-cleanup.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`

## Cleanup Boundary

This cleanup only removes local process evidence for the old RSS-gate
investigation. It does not remove the profiling implementation, tests, scripts,
or later architecture/performance decision artifacts.

