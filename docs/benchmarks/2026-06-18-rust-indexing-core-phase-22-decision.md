# Rust Indexing Core Phase 22 Decision

## Scope

Phase 22 built the local evidence pipeline for post-PRD Rust indexing optimization, used it to run one bounded optimization candidate, and performed a narrow cleanup of the new performance-evidence path.

No Rust default rollout readiness is claimed.

## Pipeline Artifacts

- Plan: `docs/plans/2026-06-18-rust-indexing-core-phase-22-evidence-pipeline-and-optimization-loop.md`
- Evidence tool: `scripts/rust-indexing-evidence.mjs`
- Tool tests: `__tests__/rust-indexing-evidence.test.ts`
- #210 -> #211 comparison: `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-issue-213-215-comparison.md`
- #210 -> #211 decision draft: `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-issue-213-215-decision-draft.md`

The evidence tool is local-only. It does not call GitHub, update issues, close issues, edit labels, or require network access.

## Candidate Selection

The Phase 22 ranking output selected `localExactReferenceResolutionMs` as the next bounded candidate after excluding already-tested directions:

- #208 candidate replay verifier.
- #209 TypeScript finalization edge-write-only.
- #211 FTS-trigger bulk write.

The selected optimization reuses same-file local exact candidate lookup results by `(file_path, reference_name, reference_kind)` and tracks existing Rust finalization edges in memory instead of querying SQLite for each reference. This preserves per-reference disambiguation semantics because every reference still checks whether its candidate set is uniquely resolvable.

## Reduced Fixture Evidence

Representative reduced fixture:

- 1 TypeScript file.
- 1 local helper function.
- 900 exported caller functions calling the helper.
- 900 resolved local exact references.

| Run | localExactReferenceResolutionMs | resolved refs | fallback refs | durationMs |
|---|---:|---:|---:|---:|
| Before | 233 | 900 | 0 | 272 |
| After | 66 | 900 | 0 | 124 |

The reduced fixture shows the target bucket moving in the intended direction without changing resolved/fallback counts.

## Final After Scoreboard

- Manifest: `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-issue-216-local-exact-after.experiment.json`
- Raw artifact: `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-issue-216-local-exact-after.raw.json`
- Generated summary: `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-issue-216-local-exact-after-summary.md`
- Comparison: `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-issue-216-local-exact-comparison.md`
- Generated decision draft: `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-issue-216-local-exact-decision-draft.md`

Comparison baseline: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-after.raw.json`.

| Target | Sufficiency | Rust graphStats | Before localExactMs | After localExactMs | Delta | Before Rust ms | After Rust ms | Rust wall delta |
|---|---|---|---:|---:|---:|---:|---:|---:|
| ZCodeGraph | passed | changed | 1532 | 484 | -68.41% | 7579 | 6747 | -10.98% |
| Excalidraw | passed | unchanged | 1565 | 720 | -53.99% | 14020 | 13427 | -4.23% |
| VS Code sparse | passed | unchanged | 50877 | 34485 | -32.22% | 577634 | 622492 | +7.77% |

ZCodeGraph graphStats changed because the local working tree target was dirty and this phase added source files before the final scoreboard. The source slice changed from the #211 artifact to the Phase 22 artifact. Excalidraw and VS Code sparse were clean fixed external corpora and preserved Rust graphStats.

## Decision

Keep the implementation.

Rationale:

- The selected target bucket improved on all three scoreboard targets.
- Excalidraw and VS Code sparse preserved Rust graphStats exactly.
- Sufficiency passed on all three targets.
- The reduced fixture preserved resolved/fallback counts.
- The implementation does not change SQLite schema.
- The implementation does not change resolver semantics; it reuses shared candidate lookup results and in-memory duplicate-edge tracking for the same decisions.

The broader required performance gate remains unmet:

- Required targets still classify as `target-failed-performance-gate-unmet`.
- VS Code sparse Rust wall time regressed in this single after run despite the targeted local exact bucket improvement.
- Remaining large buckets include parse extraction, SQLite write, TypeScript finalization, and finalization DB/name-matching work.

## Cleanup Result

The final cleanup kept Phase 22 scoped:

- Comparison, ranking, and decision draft generation live in one local evidence tool.
- Fixture tests cover comparison, ranking, exclusion notes, and decision draft output through the CLI.
- Non-numeric finalization breakdown fields are filtered out of markdown output instead of rendering noisy object strings.
- GitHub workflow remains outside the tool.

No repo-wide architecture cleanup was performed.

## Tracker Update Draft

- Phase 22 evidence pipeline is complete.
- #213 comparison generator, #214 candidate ranking, and #215 decision draft generation are implemented in `scripts/rust-indexing-evidence.mjs`.
- #216 selected and ran `localExactReferenceResolutionMs`; target bucket improved on ZCodeGraph, Excalidraw, and VS Code sparse.
- #217 cleanup removed noisy non-numeric breakdown output and kept the pipeline local-only.
- Required performance remains unmet.
- Rust default rollout readiness is not claimed.

## Next Recommendation

Keep #165 open.

The next post-Phase 22 optimization should use the new evidence tool rather than hand-written comparison tables. Based on the Phase 22 final comparison, `parseExtractionMs` is the next highest Rust-owned ranked bucket, but it should be confirmed against the latest artifact pair before creating the next implementation issue.
