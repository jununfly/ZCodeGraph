# Rust Indexing Core Issue-Level Optimization Evidence Cleanup

Date: 2026-06-23

## Decision

Decision: `consolidate-and-delete-process-artifacts`.

Issue-level optimization decisions from #193, #205, #206, #208, #209, #210,
and #211 remain as durable decision artifacts. Their generated raw experiment
files, manifests, and generated summaries can be deleted after this cleanup.

## Consolidated Issue Map

| Issue | Durable decision artifact | Cleanup interpretation |
| --- | --- | --- |
| #193 | `docs/benchmarks/2026-06-17-rust-indexing-core-issue-193-cleanup-ab.md` | Cleanup A/B evidence was useful but did not resolve the larger performance target. |
| #205 | `docs/benchmarks/2026-06-17-rust-indexing-core-issue-205-vscode-finalization-profile-selection.md` | Selected #206 as the next diagnostic/design issue for TypeScript finalization. |
| #206 | `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-finalization-diagnostics-decision.md` | Finalization diagnostics identified `databaseAccessMs` + `nameMatchingMs` as the cluster to reason about. |
| #208 | `docs/benchmarks/2026-06-18-rust-indexing-core-issue-208-candidate-replay-ab-decision.md` | Candidate replay A/B did not become the main standalone optimization direction. |
| #209 | `docs/benchmarks/2026-06-18-rust-indexing-core-issue-209-edge-write-batching-decision.md` | Edge-write batching preserved the diagnostic trail but did not close the broader gate alone. |
| #210 | `docs/benchmarks/2026-06-18-rust-indexing-core-issue-210-post-209-scoreboard-decision.md` | Post-#209 scoreboard showed the remaining performance gate was still unmet. |
| #211 | `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-decision.md` | Rust core SQLite write optimization became durable evidence for staged SQLite write paths. |

## Deleted Process Artifact Classes

This cleanup deletes:

- issue-level generated `.experiment.json` files;
- issue-level generated `.raw.json` files;
- issue-level generated `*-summary.md` files.

## Durable Follow-On Artifacts

Keep these as the reusable architecture/performance trail:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-optimization-big-picture-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`

## Cleanup Boundary

This cleanup does not delete the durable issue decision documents themselves.
It only removes generated process evidence whose reusable facts are captured in
those decision documents and in the ADRs above.

