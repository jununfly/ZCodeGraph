# Rust Indexing Core Phase 18: Full-Profile Bottleneck Segmentation And First Bounded A/B

## Parent

- PRD tracker: [#49](https://github.com/jununfly/ZCodeGraph/issues/49)
- Open performance gate blocker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Phase 17 decision: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-validation-and-decision.md`

## Context

Phase 17 completed the production `final-flush` default for explicit Rust indexing and produced matched/full scoreboard evidence. Rust remains opt-in. TypeScript remains the product default.

The Phase 17 gate state is:

- PRD required-target performance gate: failed.
- Agent Sufficiency smoke: passed in both `matched-ts-js` and `full` profiles.
- Default rollout readiness: not claimed.
- #165 remains open.
- #185 remains open as retained Linux Docker focused validation coverage, but it is a system-environment validation item and does not block current project progress.

The key Phase 17 performance signal is that `matched-ts-js` is not enough to close the required gate, and `full` profile exposes larger end-to-end costs:

- ZCodeGraph full: TypeScript 4,987 ms, Rust 6,423 ms.
- Excalidraw full: TypeScript 3,426 ms, Rust 4,004 ms.
- VS Code sparse full: TypeScript 536,281 ms, Rust 606,168 ms.
- VS Code sparse full Rust core `sqliteWriteMs`: 160,722 ms.
- VS Code sparse full TypeScript finalization: 135,598 ms, including 124,152 ms of reference resolution.

Phase 18 changes the mode from forward feature completion to result-oriented convergence: segment the full profile end-to-end path, pick the largest eligible segment, and run one bounded A/B optimization with decision-grade evidence.

## Goal

Produce a full-profile end-to-end bottleneck map and attempt one bounded A/B optimization against the first selected segment: Rust full-profile SQLite write volume / transaction path.

The phase succeeds if it produces trustworthy trend evidence and a clear next blocker decision. It does not need to close the PRD gate.

## Non-Goals

- Do not make Rust the default product indexer.
- Do not claim default rollout readiness.
- Do not change the SQLite schema.
- Do not migrate or rewrite ReferenceResolver.
- Do not implement a TypeScript finalization/reference-resolution optimization in this phase.
- Do not change MCP tools, Explore rendering, installer behavior, release flow, or packaging architecture.
- Do not require multi-run benchmark proof.
- Do not close #165 unless the PRD required-target gate actually passes.

## Decisions

### Primary axis

Phase 18 chooses full-profile end-to-end bottleneck segmentation plus one bounded A/B optimization.

It is not a general completeness phase. Completeness work can resume after the project has a clearer model for how full-profile work affects the required performance gate.

### First A/B candidate

The first implementation candidate is Rust full-profile SQLite write volume / transaction path.

Allowed changes include:

- Rust write ordering.
- Batching.
- Prepared statement reuse.
- Transaction scope.
- SQLite PRAGMA choices local to the Rust staging database.
- Index creation timing.
- Temporary staging database build strategy.

Disallowed changes include:

- `schema.sql` changes.
- Persistent schema migration.
- Field removal or semantic changes.
- Edge meaning changes.
- MCP or TypeScript query contract changes.

If the investigation shows that the schema itself is the limiting factor, Phase 18 should record a schema-bound blocker and create follow-up work rather than changing the schema in this phase.

### Resolver/finalization boundary

Phase 18 must measure TypeScript finalization/reference resolution as a segment, but it must not implement resolver optimization.

If the SQLite A/B does not produce enough improvement, the correct outcome is a decision that the next largest blocker is TypeScript finalization/reference resolution, plus a follow-up issue. Mixing SQLite and resolver implementation in one phase would make the A/B evidence hard to interpret.

### Validation scale

Use three validation layers:

1. Reduced fixture inner loop.
2. Required targets: ZCodeGraph and Excalidraw full profile before/after.
3. Stress target: VS Code sparse full profile final after, or a concrete unavailable reason.

Do not require multiple benchmark runs. Record this as trend evidence, not statistical proof.

Every validation artifact must record RSS, or a specific unavailable reason.

Agent Sufficiency must not regress.

## Issue Sequence

### 18.1 Full-profile segmentation harness

Add or refine artifact output so the full-profile scoreboard clearly separates:

- Rust source scan / parse extraction.
- Rust SQLite write.
- Rust subprocess startup/handoff.
- TypeScript finalization.
- Reference resolution and its public sub-buckets.
- Dynamic-dispatch synthesis.
- DB maintenance.
- graphStats/sufficiency measurement overhead.

Type: AFK

Blocked by: none

### 18.2 Reduced SQLite write-path A/B candidate

Use a representative reduced full-profile fixture to try one bounded Rust SQLite write-path optimization. The issue must produce before/after evidence and preserve graphStats and sufficiency smoke.

Type: AFK

Blocked by: 18.1

### 18.3 Required-target full-profile A/B

Run full-profile before/after on ZCodeGraph and Excalidraw. Report wall time, RSS, graphStats parity, sufficiency, and segment deltas.

Type: AFK

Blocked by: 18.2

### 18.4 VS Code sparse final after and decision evidence

Run one VS Code sparse full-profile final-after validation, or record a concrete unavailable reason. Compare against the Phase 17 full-profile baseline and the Phase 18 required-target evidence.

Type: AFK

Blocked by: 18.3

### 18.5 Tracker and next blocker

Record the final Phase 18 decision:

- whether the SQLite A/B should be kept,
- whether #165 remains open,
- whether the next largest blocker is Rust write volume, TypeScript finalization/reference resolution, schema-bound design, or something else,
- which follow-up issue should own the next result-oriented slice.

Type: HITL for final decision wording; AFK for artifact collection and draft decision.

Blocked by: 18.4

## Acceptance Criteria

- Full-profile segmentation table exists and is grounded in actual artifacts.
- One bounded Rust SQLite write-path A/B is attempted.
- No SQLite schema change is made.
- No resolver/finalization optimization is implemented in this phase.
- Reduced fixture before/after evidence is recorded.
- ZCodeGraph and Excalidraw full-profile before/after evidence is recorded.
- VS Code sparse full-profile final-after evidence is recorded, or unavailable reason is explicit.
- RSS is recorded or unavailable reason is explicit.
- graphStats and sufficiency are recorded for relevant runs.
- Required gate state is stated as pass, fail, or inconclusive with reason.
- #165 is kept open unless the PRD required-target gate actually passes.
- The next largest blocker is named with enough specificity to create the next issue sequence.

## Expected Artifacts

- Phase 18 reduced A/B raw and summary artifacts under `docs/benchmarks/`.
- Phase 18 required-target raw and summary artifacts under `docs/benchmarks/`.
- Phase 18 VS Code sparse final-after artifact or unavailable note under `docs/benchmarks/`.
- Phase 18 decision record under `docs/benchmarks/`.
- GitHub issue sequence and tracker linked from #49 and #165.

## Stop Conditions

Stop and write a decision instead of continuing implementation if:

- The first SQLite A/B candidate does not produce a meaningful segment improvement on the reduced fixture.
- The candidate improves SQLite write time but regresses graphStats or sufficiency.
- The candidate requires schema changes to show value.
- Required targets show no meaningful direction after the bounded A/B.
- The largest blocker clearly moves to TypeScript finalization/reference resolution.
