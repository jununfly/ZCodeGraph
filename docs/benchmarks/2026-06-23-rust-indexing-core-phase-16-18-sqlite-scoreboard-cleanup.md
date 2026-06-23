# Rust Indexing Core Phase 16-18 SQLite And Scoreboard Evidence Cleanup

Date: 2026-06-23

## Decision

Decision: `consolidate-and-delete-process-artifacts`.

Phase 16-18 durable conclusions remain in their result/decision documents.
Generated raw experiment files, experiment manifests, and generated summaries
can be deleted after this cleanup because their reusable facts are already
captured in the Phase 16, Phase 17, and Phase 18 decision artifacts.

## Consolidated Findings

### Phase 16

Decision: `productionize-sqlite-candidate`.

Reusable conclusion:

- `memory-final-flush` validated the SQLite write/finalization boundary as a
  productionization candidate.
- VS Code sparse stress showed a large `sqliteWriteMs` drop:
  `66,317 ms -> 22,774 ms`.
- Required-target gates still failed.
- The correct next step was a production-safe final-flush path, not rollout.

### Phase 17

Decision: keep `final-flush` as the default Rust opt-in write mode.

Reusable conclusion:

- Production `final-flush` became the default for explicit Rust indexing.
- `disk` remained a debug escape hatch; `memory-final-flush` stayed
  experimental.
- Agent sufficiency smoke passed.
- Required-target performance gates still failed.
- Full profile exposed larger Rust graph work and TypeScript
  finalization/reference-resolution as the next blocker.

### Phase 18

Decision: keep staging-database fast-write PRAGMAs.

Reusable conclusion:

- The bounded SQLite PRAGMA candidate improved the intended write segment.
- Reduced fixture `sqliteWriteMs`: `786 ms -> 549 ms`.
- Required target `sqliteWriteMs` improved:
  - zcodegraph: `1,693 ms -> 1,296 ms`;
  - excalidraw: `667 ms -> 519 ms`.
- VS Code sparse `sqliteWriteMs`: `160,722 ms -> 153,186 ms`.
- Full-profile wall-time gate still failed.
- TypeScript finalization/reference resolution remained the next major blocker.

## Deleted Process Artifact Classes

This cleanup deletes:

- Phase 16 baseline and candidate raw/manifest/summary files;
- Phase 16 reduced smoke JSON;
- Phase 17 matched/full scoreboard raw/manifest/summary files;
- Phase 18 reduced/required/VS Code raw/manifest/summary files.

## Durable Follow-On Artifacts

Keep these as the reusable decision trail:

- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-results-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`
- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

## Cleanup Boundary

This cleanup does not remove the durable decision artifacts, plans, ADRs, or
later optimization evidence. It only removes generated files whose reusable
facts are already summarized above and in the kept decision artifacts.

