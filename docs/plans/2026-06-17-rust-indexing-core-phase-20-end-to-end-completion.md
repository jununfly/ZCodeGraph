# Rust Indexing Core Phase 20: End-to-End Completion

## Parent

- Completed PRD tracker: [#49](https://github.com/jununfly/ZCodeGraph/issues/49)
- Post-PRD optimization tracker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Deferred concrete optimization issue: [#193](https://github.com/jununfly/ZCodeGraph/issues/193)
- Phase 19 decision: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-19-decision.md`
- Original PRD: `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md`

## Context

Phase 19 closed the original Rust indexing core vertical slice PRD under the clarified completion gate. Rust remains opt-in. TypeScript remains the product default. No Rust default rollout readiness is claimed.

The remaining post-PRD optimization target is still open:

- Rust indexing should become at least 25% faster than TypeScript or at least 30% lower peak RSS, with the other metric not significantly worse.

However, the next plan intentionally changes strategy. Instead of continuing to optimize isolated segments while the indexing data-production chain is still hybrid, Phase 20 first completes Rust indexing end-to-end. After that, performance, RSS, and other metrics can be optimized against a complete Rust indexing baseline.

This is a new independent plan after the completed PRD, not a continuation of the PRD completion gate and not a default rollout plan.

## Goal

Complete the Rust indexing data-production chain end-to-end for the current JavaScript and TypeScript support scope.

For this plan, "end-to-end Rust indexing" means Rust owns the indexing data-production path:

- source scan,
- parse and extraction,
- graph write,
- finalization and reference-resolution work needed to produce a usable project index,
- index metadata,
- failure-safe active-index production.

The TypeScript product shell remains responsible for:

- CLI entry and engine selection,
- MCP server and tools,
- Explore planning and rendering,
- installer and release glue,
- product integration around the generated index.

Performance and RSS must be recorded as baseline evidence, but they are not the pass/fail gate for Phase 20.

## Non-Goals

- Do not make Rust the default product indexer.
- Do not claim default rollout readiness.
- Do not optimize for the post-PRD 25% faster / 30% lower RSS target in this phase.
- Do not rewrite CLI, MCP, Explore, installer, release flow, or npm packaging in Rust.
- Do not change MCP tool behavior or Explore output by default.
- Do not change the persistent SQLite schema by default.
- Do not change resolver or finalization semantics silently.
- Do not migrate non-JS/TS languages in this phase.
- Do not run a broad multi-repo framework validation campaign.

## Decisions

### Completeness before optimization

Phase 20 is a completeness phase. It should produce a complete Rust indexing baseline before the project returns to unified metric optimization.

Wall time and peak RSS must still be recorded for every validation run, but they are baseline data for later optimization, not a Phase 20 completion gate.

### Product-shell boundary

Rust should complete the indexing data-production chain. TypeScript remains the product integration layer.

This keeps the plan focused on indexing completeness while preserving compatibility with current CLI, MCP, Explore, installer, and release behavior.

### Resolver and finalization semantics

Resolver and finalization migration must be parity-first.

Rust must not silently change reference-resolution semantics. Differences must be classified before being accepted:

- `parity-bug`: Rust behavior differs from TypeScript and should be fixed.
- `intentional-improvement-candidate`: Rust exposes a better behavior, but it requires explicit decision before adoption.
- `known-unsupported`: behavior is not yet migrated and must be counted in fallback taxonomy.

Semantic parity and Agent Sufficiency matter more than byte-identical graphStats.

### First implementation slice

The first real migration slice is import and path-alias resolution.

Rationale:

- It is an entry layer for reference resolution.
- It has relatively clear inputs and outputs.
- It affects many downstream references.
- It is a good way to prove the Rust/TypeScript finalization boundary protocol without taking on the entire name matcher first.

NameMatcher, framework resolvers, and dynamic-dispatch synthesis are intentionally not the first slice.

### Transitional TypeScript fallback

Phase 20 may keep transitional TypeScript fallback while the Rust indexing chain is being completed.

Fallback is allowed only as a migration guard, not as the long-term architecture. Every fallback must have telemetry and taxonomy. The completion gate requires fallback count to be zero, or every remaining fallback to be explicitly classified as `known-unsupported`.

Silent fallback is not allowed.

### Validation scope

Phase 20 validation must include:

- ZCodeGraph required target.
- Excalidraw required target.
- VS Code sparse stress target.

Each target should have at least one full Rust indexing end-to-end run. Multi-run benchmark proof is not required because this plan is not a performance optimization gate.

Every validation run must record:

- wall time,
- peak RSS or unavailable reason,
- fallback taxonomy,
- graphStats,
- active-index readability by the TypeScript shell / MCP-compatible path,
- Agent Sufficiency.

### Relationship to #165 and #193

#165 remains the post-PRD optimization tracker.

#193 remains open but is deferred as the immediate optimization path until Phase 20 produces a complete Rust indexing baseline. After Phase 20, #193 should be re-evaluated against the new complete baseline and either resumed, rewritten, or superseded by a more accurate optimization slice.

## Issue Sequence

### 20.1 Rust/TypeScript finalization boundary protocol and parity harness

Define the narrow protocol for Rust-owned finalization/reference-resolution work to interoperate with the TypeScript shell. Add a parity harness that can compare Rust and TypeScript behavior through observable index output and sufficiency-relevant queries, not private implementation details.

The protocol should support migration by slices and must expose fallback taxonomy.

Type: AFK

Blocked by: none

### 20.2 Rust import/path-alias resolution vertical slice

Implement the first real Rust finalization/reference-resolution slice: import and path-alias resolution for the current JS/TS support scope.

The slice must use the Phase 20 boundary protocol, preserve TypeScript semantics, record fallback taxonomy, and keep TypeScript fallback available only as a migration guard.

Type: AFK

Blocked by: 20.1

### 20.3 Rust JS/TS reference-resolution and finalization expansion

Expand Rust-owned indexing finalization beyond the import/path-alias slice toward the complete JS/TS reference-resolution/finalization chain needed to produce a usable project index.

This issue should migrate behavior incrementally behind the same protocol and parity harness. It should classify every semantic difference as `parity-bug`, `intentional-improvement-candidate`, or `known-unsupported`.

Type: AFK

Blocked by: 20.2

### 20.4 Fallback taxonomy and elimination gate

Make transitional fallback explicit, measurable, and decision-ready.

The issue should produce a fallback taxonomy artifact and drive fallback count to zero where behavior is in scope. Any non-zero remaining fallback must be classified as `known-unsupported`, with a clear reason and follow-up path.

Type: AFK

Blocked by: 20.3

### 20.5 End-to-end validation and decision tracker

Run the Phase 20 validation matrix on ZCodeGraph, Excalidraw, and VS Code sparse. Record wall time, peak RSS or unavailable reason, fallback taxonomy, graphStats, active-index readability, and Agent Sufficiency.

Write the final Phase 20 decision:

- whether Rust indexing data production is end-to-end complete,
- what fallback or unsupported taxonomy remains,
- whether Agent Sufficiency regressed,
- what the baseline wall/RSS metrics are,
- how #165 and #193 should be redefined after the complete baseline,
- what optimization backlog should come next.

Type: HITL for final decision wording; AFK for validation and draft artifacts.

Blocked by: 20.4

## Acceptance Criteria

- Rust owns the JS/TS indexing data-production chain end-to-end for the Phase 20 scope.
- TypeScript shell, CLI, MCP, Explore, and installer remain the product integration layer.
- The Rust-produced active index is readable by the TypeScript shell and MCP-compatible graph path.
- Resolver/finalization migration is parity-first.
- Semantic differences are classified before acceptance.
- Transitional TypeScript fallback is measured and classified.
- Fallback count is zero, or all remaining fallback is explicitly `known-unsupported`.
- Agent Sufficiency does not regress on required targets.
- ZCodeGraph, Excalidraw, and VS Code sparse each have at least one validation run.
- Wall time and peak RSS are recorded or have explicit unavailable reasons.
- GraphStats are recorded.
- No MCP/Explore behavior change is required for the phase to pass.
- No persistent SQLite schema change is made unless a separate schema decision issue is created.
- No Rust default rollout readiness is claimed.
- #165 and #193 are re-evaluated against the complete Rust indexing baseline.

## Expected Artifacts

- Rust/TypeScript finalization boundary protocol notes.
- Parity harness tests and fixtures.
- Import/path-alias resolution migration evidence.
- Rust JS/TS finalization/reference-resolution expansion evidence.
- Fallback taxonomy artifact.
- Required-target validation artifacts under `docs/benchmarks/`.
- VS Code sparse validation artifact under `docs/benchmarks/`.
- Phase 20 decision record under `docs/benchmarks/`.
- GitHub issue sequence and tracker linked from #165 and #193.

## Stop Conditions

Stop and write a decision instead of continuing implementation if:

- The boundary protocol requires a persistent SQLite schema change.
- The first import/path-alias slice cannot preserve TypeScript semantics without broad resolver redesign.
- Agent Sufficiency regresses and the regression cannot be isolated to a known parity bug.
- Fallback taxonomy shows that most finalization work remains in TypeScript after the planned migration slice.
- Validation cannot produce active indexes readable by the TypeScript shell / MCP-compatible path.
- The work drifts into CLI/MCP/Explore/installer rewrite or default rollout readiness.
