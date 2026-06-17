# Rust Indexing Core Phase 16: Architecture Reassessment Before Further Rust Expansion

## Context

Phase 15F ended with `stop-and-reassess-before-in-memory-pivot`.

The Rust indexing core still satisfies important product constraints: it stays opt-in, preserves the TypeScript product shell, avoids the Node/WASM parser hot path for JS/TS parsing, and produces indexes readable by the existing MCP and Explore layers. However, the latest production-like VS Code sparse matched-work runs did not close the RSS gate:

| Run | TS peak RSS | Rust peak RSS | RSS delta | Wall-time delta | Classification |
|---|---:|---:|---:|---:|---|
| Phase 15F baseline | 29,376,512 | 38,322,176 | +30.45% | -22.31% | `target-failed-performance-gate-unmet` |
| Phase 15F lazy normalization | 40,255,488 | 38,223,872 | -5.05% | -23.20% | `target-failed-performance-gate-unmet` |
| Phase 15F borrowed-ID cleanup | 29,130,752 | 38,191,104 | +31.10% | -24.54% | `target-failed-performance-gate-unmet` |

This triggers the PRD's stop/continue clause: if the Rust slice fails the hard performance or memory gate, stop expanding Rust coverage and reassess whether the architecture boundary is wrong, the implementation is immature, or the migration is not justified.

## Goal

Phase 16 formally reassesses the current architecture boundary before further Rust expansion.

The phase validates one primary architecture candidate and one secondary boundary:

1. Primary: SQLite write/finalization boundary.
2. Secondary: subprocess/source-copy orchestration boundary.

The goal is not to claim default rollout readiness. The goal is to produce a defensible go/no-go decision for the next stage:

- productionize the SQLite candidate,
- investigate an orchestration blocker,
- or stop Rust expansion and reassess migration value.

## Non-Goals

- Do not make the Rust indexer default.
- Do not claim full-profile rollout readiness.
- Do not expand Rust language coverage beyond JS/TS/JSX/TSX.
- Do not migrate ReferenceResolver, framework resolvers, dynamic-dispatch synthesizers, MCP tools, or Explore rendering into Rust.
- Do not change the production SQLite schema.
- Do not change default active-index failure-safety or locking behavior for the prototype.
- Do not hide single-run evidence as a statistically stable benchmark.

## Architecture Hypotheses

### H1: SQLite write/finalization boundary is hiding Rust's benefit

The Rust core currently parses and writes SQLite directly, then the TypeScript shell continues finalization, reference resolution, dynamic-dispatch synthesis, and DB maintenance. Phase 15F profile evidence still showed a large Rust-side SQLite write block, around 61 seconds on the VS Code sparse matched-work runs.

Hypothesis: a temp/in-memory/final-flush SQLite prototype can reduce write churn enough to justify a production-safe follow-up.

### H2: Subprocess/source-copy orchestration is diluting end-to-end gains

The experiment runner copies source slices and measures init/subprocess handoff as part of the end-to-end run. Some of this may be experiment-only overhead; some may expose product-path overhead.

Hypothesis: a targeted audit can separate experiment harness cost from production CLI cost, and may reveal one low-risk candidate worth testing independently.

## Primary Candidate

Implement a SQLite temp/in-memory final-flush prototype behind an explicit experimental flag or manifest option.

Requirements:

- Default Rust indexing behavior stays unchanged.
- Prototype runs only under explicit experiment control.
- Active production index failure-safety remains unchanged.
- The final output must remain compatible with the existing production schema.
- Prototype-internal temp DBs, in-memory DBs, temporary tables, or backup/flush mechanics are allowed only as implementation details.
- The result must be measured against the same graph work profile and corpus shape.

This candidate answers whether the SQLite write/finalization boundary is worth productionizing. It does not need to be production-safe in Phase 16, but it must not put the normal active index path at risk.

## Secondary Boundary

Run a subprocess/source-copy orchestration audit after the SQLite candidate evidence.

Requirements:

- Audit is mandatory.
- Code change is conditional.
- At most one bounded orchestration/source-copy candidate may be implemented.
- A candidate is allowed only if the audit identifies a clear low-risk, independently attributable issue.
- Do not combine the orchestration candidate with the SQLite candidate in a single benchmark comparison.

Possible audit topics:

- source copy time and duplicate copy behavior,
- init timing split,
- Rust subprocess startup/handoff timing,
- experiment-runner-only overhead vs production CLI overhead,
- whether more public profile sub-buckets are needed to interpret the boundary.

## Target Matrix

Phase 16 keeps both PRD required targets and the VS Code sparse stress target, but they have different roles.

| Target | Role | Interpretation |
|---|---|---|
| ZCodeGraph | PRD required target | Used for PRD hard gate evidence. |
| Excalidraw | PRD required target | Used for PRD hard gate evidence. |
| VS Code sparse checkout | Stress/confidence target | Used for large-repo confidence and blocker interpretation; does not by itself claim rollout readiness. |

VS Code sparse checkout should continue using the previously fixed corpus shape unless a later plan explicitly updates it:

- Path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Dirty `.zcodegraph/` noise is acceptable only if recorded.

## Profile And Measurement Rules

- Main comparison profile: `matched-ts-js`.
- Full-profile rollout readiness is out of scope.
- Locked baseline manifest: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-architecture-reassessment-baseline.experiment.json`.
- SQLite candidate manifest: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-sqlite-memory-final-flush-candidate.experiment.json`.
- Experimental SQLite write mode field: `rust.sqliteWriteMode`.
- Supported SQLite write modes: `disk`, `memory-final-flush`.
- Each key candidate requires one completed production-like smoke on the relevant targets.
- Single-run results are trend evidence, not statistical proof.
- Every production-like smoke must record:
  - Node runtime and Rust core binary shape,
  - command and environment evidence,
  - peak RSS for both arms,
  - wall time for both arms,
  - `sourceCopy`, `init`, `index`, `graphStats`, and total timings,
  - Rust profile sub-buckets including `parseExtractionMs`, `sqliteWriteMs`, `typescriptFinalizationMs`, and reference-resolution timing,
  - graphStats and sufficiency status.

## Acceptance Criteria

Phase 16 is complete when:

- The architecture reassessment plan and experiment shape are documented.
- The SQLite temp/in-memory final-flush prototype is implemented behind an explicit experimental flag or manifest option.
- Reduced fixture validation proves the prototype can produce a readable graph without changing default behavior.
- Required targets and VS Code sparse stress target have completed candidate smoke evidence, or a documented unavailable reason.
- The orchestration/source-copy audit is complete.
- Any orchestration candidate, if attempted, is isolated from the SQLite candidate evidence and bounded to one low-risk change.
- The final decision states one of:
  - `productionize-sqlite-candidate`,
  - `investigate-orchestration-blocker`,
  - `stop-rust-expansion-and-reassess-migration-value`.

## Decision Rules

### SQLite candidate validated

If `sqliteWriteMs` clearly improves and end-to-end wall time does not regress while RSS does not significantly worsen, Phase 16 may conclude:

`productionize-sqlite-candidate`

This conclusion is valid even if the final PRD performance/RSS gate remains open. It means the architecture candidate is worth turning into a production-safe implementation in a later phase.

### SQLite candidate not validated

If the SQLite candidate does not materially improve write/finalization trend, complete the orchestration/source-copy audit. Only implement the bounded candidate if the audit identifies a clear, low-risk, attributable issue.

### No validated boundary

If neither SQLite write/finalization nor orchestration/source-copy evidence identifies a useful path, Phase 16 should conclude:

`stop-rust-expansion-and-reassess-migration-value`

That conclusion means the current Rust indexing boundary should not keep expanding without a broader architecture or product-value reassessment.

## Issue Plan

1. Phase 16.1: architecture reassessment baseline and experiment shape.
2. Phase 16.2: SQLite temp/in-memory final-flush prototype behind experimental flag.
3. Phase 16.3: required targets and VS Code sparse candidate smoke evidence.
4. Phase 16.4: orchestration/source-copy audit plus conditional bounded candidate.
5. Phase 16 tracker: final decision against PRD stop/continue criteria.
