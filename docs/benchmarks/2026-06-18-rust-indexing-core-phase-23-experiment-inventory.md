# Rust Indexing Core Phase 23 Experiment Inventory

## Scope

This inventory classifies performance-related Rust indexing paths after Phase 22. It exists to make the next #165 optimization step easier to choose and safer to execute.

No Rust default rollout readiness is claimed. #165 remains open.

## Categories

- `production path`: part of the normal implementation or normal opt-in Rust path.
- `retained diagnostic`: useful for profile artifacts, semantic verification, or candidate analysis, but not a default production optimization contract.
- `dead candidate`: evidence should remain in benchmark docs, but the path should not guide runtime behavior unless it is materially reframed.

## Inventory

| Entry | Category | Owner | Why it exists | Default behavior impact | Future #165 use | Cleanup or documentation needed |
|---|---|---|---|---|---|---|
| Rust opt-in `final-flush` SQLite write mode | production path | Phase 17 / #183-#187 | Provides the normal Rust opt-in failure-safe write path while preserving active-index safety. | Yes, for `--engine rust`; TypeScript default remains unchanged. | Baseline path for future Rust optimization evidence. | Keep. Treat `disk` as debug and `memory-final-flush` as explicit prototype only. |
| Rust `disk` SQLite write mode | retained diagnostic | Phase 16 / #178-#182 | Keeps a simple debug/escape-hatch write path for A/B and failure isolation. | No unless explicitly selected. | Useful as a controlled comparison path. | Keep documented as debug/diagnostic, not rollout path. |
| Rust `memory-final-flush` SQLite write mode | retained diagnostic | Phase 16 / #178-#182 | Prototype that demonstrated write-path potential without becoming the production default. | No unless explicitly selected. | Useful only if a future architecture issue reopens final-flush design. | Keep isolated behind explicit mode; do not use as default evidence without naming it. |
| Rust core FTS-trigger suspension and rebuild during fresh bulk write | production path | #211 | Reduces graph-write cost by rebuilding `nodes_fts` once after fresh bulk writes. | Yes, inside Rust opt-in indexing. | Already implemented; future graph-write work must target a different mechanism. | Keep with existing Rust core test coverage. |
| Rust core local exact reference lookup cache | production path | #216 | Reuses same-file local exact candidate lookups while preserving per-reference disambiguation semantics. | Yes, inside Rust opt-in indexing. | Already implemented; future work should not repeat this candidate. | Keep with resolved/fallback count tests. |
| Finalization/reference-resolution diagnostic profile buckets | retained diagnostic | #206 | Splits broad finalization DB/name-matching cost into decision-oriented sub-buckets. | No user behavior impact; affects profile artifacts. | Primary input for future candidate ranking. | Keep as benchmark/profile diagnostics; do not treat fields as long-term public API without promotion. |
| Candidate replay / semantic-equivalence verifier | retained diagnostic | #207 / #208 | Proves candidate-set replay can be semantically checked without making replay authoritative. | No by default; only active with explicit diagnostic env. | Useful for validating future grouped/disambiguation candidates. | Keep isolated as diagnostic. Do not promote as a production performance path unless duplicate baseline work is removed. |
| TypeScript finalization edge-write-only candidate | dead candidate | #209 | Tested endpoint-validated edge insertion as a narrow finalization DB optimization. | The safe endpoint-validated write helper may remain, but the narrow candidate should not be selected again as-is. | No, unless reframed to target materialization plus write together. | Evidence remains in `docs/benchmarks/`; future ranking must exclude the exact edge-write-only hypothesis. |
| Candidate replay as production optimization | dead candidate | #208 | Measured as semantically useful but not a favorable performance implementation path because it duplicated baseline work. | None. | No, unless materially reframed to avoid duplicate work. | Evidence remains in `docs/benchmarks/`; retain only diagnostic verifier. |
| FTS-trigger bulk write as next candidate | dead candidate | #211 | Already implemented and measured. | N/A as a future candidate. | No, unless a different graph-write mechanism is proposed. | Keep implementation; exclude the same candidate from ranking. |
| Evidence comparison/ranking/decision generator | retained diagnostic | Phase 22 / #213-#217 / #219 | Standardizes before/after comparisons, candidate ranking, and decision drafts. | No user behavior impact. | Required entry point for future #165 candidate selection. | Keep local-only. Generated output must state no GitHub/network side effects and no Rust default rollout readiness claim. |
| Empty-corpus validation in experiment harness | retained diagnostic | #210 | Prevents invalid empty corpora from masquerading as successful evidence. | No user behavior impact. | Required for trustworthy scoreboards and smoke artifacts. | Keep; only allow empty corpora with explicit manifest escape hatch. |
| #185 environment validation reserve | retained diagnostic | #185 | Tracks environment validation that does not block current Rust optimization progress. | No. | Only relevant if packaging, CLI, status, release, or npm smoke paths are touched. | Do not update unless those paths are actually touched. |

## Cleanup Decision for Phase 23

The Phase 23 production-boundary cleanup should not remove core Rust production paths. The useful cleanup target is the benchmark/evidence contract:

- keep the evidence tool local-only,
- make RSS unavailable reasons first-class in generated output,
- make the generated contract explicit,
- keep excluded candidate directions visible in ranking output,
- leave default indexing, SQLite schema, MCP behavior, installer, packaging, release, status, and npm smoke paths unchanged.

## Next-Candidate Input

The latest Phase 22 decision says `parseExtractionMs` is the next highest Rust-owned ranked bucket, but that should be confirmed against the latest artifact pair before opening a bounded optimization issue.

Recommended next #165 step after Phase 23: create one profiling issue for `parseExtractionMs` if the cleaned evidence output still ranks it first, rather than jumping directly into implementation.
