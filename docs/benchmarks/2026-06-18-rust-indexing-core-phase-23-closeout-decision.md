# Rust Indexing Core Phase 23 Closeout Decision

## Scope

Phase 23 cleaned up the Rust indexing optimization evidence contract, classified recent performance experiment paths, performed narrow benchmark/evidence boundary cleanup, and selected the next #165 step.

No Rust default rollout readiness is claimed. #165 remains open.

Architecture record:

- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`

## Evidence Contract Cleanup

The evidence generator now emits an explicit `Evidence Contract` section in comparison output.

The contract records:

- local-only scope with no GitHub or network side effects,
- target status fields: required/stress classification, empty-corpus status, sufficiency, and Rust graphStats parity,
- Rust arm wall-time comparison semantics,
- RSS bytes or unavailable reason,
- Rust-owned profile buckets, TypeScript finalization total, and numeric finalization breakdown fields,
- rollout-readiness disclaimer.

The RSS table now includes unavailable-reason columns instead of only rendering `n/a` when RSS is absent.

## Inventory Classification

Inventory artifact:

- `docs/benchmarks/2026-06-18-rust-indexing-core-phase-23-experiment-inventory.md`

Classification summary:

- Production paths: Rust opt-in `final-flush`, Rust core FTS-trigger suspension/rebuild, Rust core local exact reference lookup cache.
- Retained diagnostics: `disk` and `memory-final-flush` write modes, finalization/reference-resolution profile buckets, candidate replay/equivalence verifier, evidence generator, empty-corpus validation, #185 environment validation reserve.
- Dead candidates: candidate replay as a production optimization, TypeScript finalization edge-write-only as originally framed, FTS-trigger bulk write as a future repeated candidate.

The inventory keeps evidence in `docs/benchmarks/` while making it clear which paths are production behavior, diagnostic-only, or no longer valid as future candidate framing.

## Production Boundary Cleanup

The implementation cleanup stayed on the benchmark/evidence boundary:

- RSS unavailable reasons are now normalized into the generated evidence row.
- The generated comparison contract is explicit and reusable.
- Candidate exclusion remains visible in ranking output.

No default indexing behavior changed.

Unchanged:

- SQLite schema.
- MCP behavior.
- Installer, packaging, release, status, and npm smoke paths.
- Rust core graph semantics.
- Resolver semantics.

Rust core production paths were not refactored in this phase because the inventory did not identify a safe cleanup that would improve diagnostic clarity without risking behavior churn.

## Validation

Commands run:

- `npx vitest run __tests__/rust-indexing-evidence.test.ts`
- `npx vitest run __tests__/rust-indexing-evidence.test.ts __tests__/rust-indexing-experiment.test.ts`
- `npm run build`

Targeted smoke/profile artifacts generated from existing Phase 22 evidence:

- `docs/benchmarks/2026-06-18-rust-indexing-core-phase-23-targeted-evidence-smoke-comparison.md`
- `docs/benchmarks/2026-06-18-rust-indexing-core-phase-23-targeted-evidence-smoke-decision-draft.md`

Smoke source artifacts:

- Before: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-after.raw.json`
- After: `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-issue-216-local-exact-after.raw.json`

Smoke result:

| Target | Sufficiency | Rust graphStats | RSS result |
|---|---|---|---|
| ZCodeGraph | passed | changed | recorded |
| Excalidraw | passed | unchanged | recorded |
| VS Code sparse | passed | unchanged | recorded |

ZCodeGraph graphStats changed because the Phase 22 local working-tree corpus changed between the #211 and #216 artifacts. This was already documented in the Phase 22 decision as corpus drift, not a semantic claim. Excalidraw and VS Code sparse were clean external corpora and remained unchanged.

A full VS Code sparse scoreboard was not run. The Phase 23 plan explicitly defaults to targeted smoke/profile unless cleanup changes final-evidence semantics or default behavior.

## Next #165 Step

Recommended next step: [#224](https://github.com/jununfly/ZCodeGraph/issues/224), one profiling issue for `parseExtractionMs`.

Rationale:

- The cleaned Phase 23 smoke comparison ranks `parseExtractionMs` as the top Rust-owned bucket after Phase 22.
- The bucket is large on VS Code sparse and visible on required targets.
- Phase 23 did not run a fresh full scoreboard, so jumping directly to implementation would overstate confidence.
- A profiling issue should first split `parseExtractionMs` into actionable parser/extraction subsegments and confirm whether the cost is implementation-owned, grammar/parser-owned, source-shape-driven, or orchestration-driven.

The next issue should be diagnostic/profiling first, not a bounded optimization implementation issue.

## Tracker Update Draft

- Phase 23 is complete.
- Evidence output now includes an explicit local-only contract and RSS unavailable-reason columns.
- Performance experiment paths are classified as production path, retained diagnostic, or dead candidate.
- Production cleanup stayed on the evidence/benchmark boundary and did not change default indexing behavior.
- Targeted smoke/profile generated valid artifacts from existing Phase 22 evidence.
- RSS was recorded in the smoke artifacts.
- Sufficiency passed on all compared targets.
- Excalidraw and VS Code sparse graphStats were unchanged; ZCodeGraph changed due already-documented local corpus drift.
- Next #165 step: #224, one `parseExtractionMs` profiling issue.
- #165 remains open.
- Rust default rollout readiness is not claimed.
