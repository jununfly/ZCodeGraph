# Rust Indexing Core Phase 23: Optimization Architecture Cleanup

## Parent

- Post-PRD optimization tracker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Phase 23 tracker: [#218](https://github.com/jununfly/ZCodeGraph/issues/218)
- Phase 22 evidence pipeline decision: `docs/benchmarks/2026-06-18-rust-indexing-core-phase-22-decision.md`
- Original PRD: `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md`

## Published Issues

- [#219](https://github.com/jununfly/ZCodeGraph/issues/219) - Phase 23.1: Clean up evidence pipeline contract
- [#220](https://github.com/jununfly/ZCodeGraph/issues/220) - Phase 23.2: Inventory performance experiment candidates
- [#221](https://github.com/jununfly/ZCodeGraph/issues/221) - Phase 23.3: Clean up performance production boundaries
- [#222](https://github.com/jununfly/ZCodeGraph/issues/222) - Phase 23.4: Run targeted optimization cleanup smoke
- [#223](https://github.com/jununfly/ZCodeGraph/issues/223) - Phase 23.5: Decide next post-PRD optimization step

## Context

The Rust indexing PRD has completed its opt-in vertical slice. Rust remains opt-in. TypeScript remains the product default. No Rust default rollout readiness is claimed.

The post-PRD optimization tracker remains open because the deeper target is still unmet: Rust indexing should become at least 25% faster than TypeScript or at least 30% lower peak RSS on required targets, with the other metric not significantly worse.

Recent optimization work produced useful targeted improvements, but it also exposed a process and architecture problem:

- Some individual buckets improve while end-to-end wall time remains flat or regresses on large stress targets.
- Candidate outcomes are scattered across issue comments, benchmark artifacts, retained flags, production paths, and diagnostic-only code.
- The benchmark/evidence path is now central to decision-making, but its contract and candidate lifecycle need to be tightened before another round of optimization.
- Continuing isolated performance issues now risks stacking patches without improving the ability to choose the right next candidate.

Phase 23 is therefore a technical-debt governance phase for the Rust indexing optimization architecture. Its goal is not to produce a performance win directly. Its goal is to make the next #165 optimization iteration faster, clearer, and more likely to target the real blocker.

## Goal

Clean up the Rust indexing performance optimization architecture so the next post-PRD candidate can be selected and evaluated with less ambiguity.

After this phase, the project should have:

1. A clearer evidence pipeline contract for comparing raw artifacts and generating decision drafts.
2. An inventory of performance-related experiment paths and flags, classified as production path, retained diagnostic, or dead candidate.
3. Cleaner production-code boundaries around performance profile/reporting, Rust core graph-write/finalization helpers, and TypeScript orchestration seams touched by previous optimization phases.
4. Targeted validation showing that sufficiency, artifact generation, profile fields, RSS diagnostics, and basic Rust indexing behavior remain intact.
5. A concrete next-candidate decision for #165, or an explicit no-go/profiling recommendation.

## Non-Goals

- Do not make Rust the default indexer.
- Do not claim Rust default rollout readiness.
- Do not close #165.
- Do not require the post-PRD performance target to pass.
- Do not pursue performance improvement as a Phase 23 pass condition.
- Do not run a full VS Code sparse scoreboard by default.
- Do not change default user-visible indexing behavior.
- Do not change MCP behavior.
- Do not change persistent SQLite schema.
- Do not change installer, packaging, release, status, or npm smoke paths.
- Do not add GitHub API integration to benchmark/evidence tooling.
- Do not auto-create, auto-comment, auto-label, or auto-close GitHub issues from tooling.
- Do not turn this into general repository-wide cleanup.
- Do not start an unrelated new feature.

## Decisions

### Choose technical debt governance before another direct optimization

The next direction should be technical debt governance, not another immediate performance candidate and not new feature work.

This is not a pause on #165. It is a control phase to make the next #165 candidate selection more reliable.

### Optimize for the next optimization loop

The primary objective is to make the next performance optimization faster and more accurate.

Long-term maintainability matters, but it is secondary. Phase 23 should prioritize debt that directly affects:

- profile interpretation,
- artifact comparison,
- candidate ranking,
- experiment flag lifecycle,
- Rust/TypeScript performance boundary clarity,
- sufficiency and graphStats trust,
- next-candidate selection.

### Production code can change, but behavior cannot

Phase 23 may modify production code when that makes boundaries clearer or diagnostics more trustworthy.

Allowed production-code changes:

- refactor performance/profile helpers,
- consolidate duplicated diagnostic plumbing,
- clarify Rust core profile/reporting structures,
- isolate retained diagnostic paths from production hot-path logic,
- simplify finalization or graph-write helper boundaries without changing behavior,
- remove dead candidate code from runtime paths when evidence shows it has no continuing diagnostic value.

Not allowed:

- changing default indexing behavior,
- changing graph semantics,
- changing resolver semantics,
- changing SQLite schema,
- changing MCP output or tool behavior,
- making performance improvement the reason to accept the phase.

### Classify experiment paths instead of deleting blindly

Performance-related flags and candidate code must be classified before removal or retention.

Categories:

- `production path`: a candidate that is now part of the normal implementation and should be kept, named clearly, and tested as normal behavior.
- `retained diagnostic`: a path that is not a production optimization but remains useful for profile artifacts, semantic verification, or candidate analysis. It should be isolated, named as diagnostic, and documented as not a stable public API unless separately promoted.
- `dead candidate`: a path that has no continuing implementation or diagnostic value. Evidence should remain in `docs/benchmarks/`, but runtime code and confusing flags should be removed or retired.

Closing this phase does not require deleting many things. It requires that future agents can tell why each retained performance path exists and whether it may be used for the next optimization.

### Evidence/tooling first, production cleanup second

The order matters:

1. Stabilize the evidence pipeline contract.
2. Inventory and classify experiment/candidate paths.
3. Clean up production-code boundaries using that inventory.
4. Validate with targeted tests and smoke/profile only.
5. Select the next #165 candidate or no-go.

The evidence pipeline is now the entry point for post-PRD optimization. If its artifact contract, RSS/unavailable handling, ranking, decision draft, and empty-corpus/status language are unclear, later production changes become harder to judge.

### Default validation is targeted smoke/profile, not full scoreboard

Phase 23 should not run a full VS Code sparse scoreboard by default.

Default validation:

- unit/integration tests for touched tooling,
- Rust core tests if Rust performance code is touched,
- targeted fixture smoke for evidence comparison/ranking/decision generation,
- targeted smoke/profile when Rust core profile/reporting or TypeScript orchestration paths are touched,
- RSS recorded or an unavailable reason recorded,
- sufficiency checked when the touched path can affect index/read/explore behavior.

Run a full VS Code sparse scoreboard only if the cleanup changes final-evidence semantics or materially changes behavior in a way targeted smoke/profile cannot cover.

### Phase 23 must select the next #165 step

Phase 23 must end with a next-candidate decision.

Allowed decisions:

- create or recommend one bounded optimization candidate,
- create or recommend one profiling issue if evidence is insufficient,
- identify an architecture blocker that must be handled before more performance work,
- explicitly no-go direct optimization until a named diagnostic gap is closed.

The decision must not be vague. It should say what #165 should do next and why.

### #165 remains open

Phase 23 should update #165 with the completed governance result and next step, but it should not close #165.

The post-PRD optimization gate remains the responsibility of #165 until separate evidence proves the deeper target is met or the maintainer explicitly changes the target.

## Issue Sequence

### 23.1 Evidence pipeline contract cleanup

Tighten the benchmark/evidence tooling contract introduced in Phase 22.

Scope:

- consolidate duplicated artifact parsing and comparison helpers,
- make comparison/ranking/decision draft output easier to reuse,
- normalize target status, required/stress classification, empty-corpus status, sufficiency, graphStats parity, wall time, RSS, and unavailable reasons,
- keep rollout-readiness disclaimers explicit,
- keep the tool local-only with no GitHub/network behavior,
- avoid adding new benchmark dimensions unless they directly support candidate selection.

Type: AFK

Blocked by: none

Validation:

- fixture tests for artifact parsing and comparison output,
- fixture tests for ranking and decision draft output,
- smoke generation using existing Phase 22 artifacts,
- no full VS Code sparse scoreboard.

### 23.2 Experiment and candidate inventory

Create an inventory of performance-related production paths, diagnostic paths, experiment flags, and dead candidates.

The inventory should classify at least the recent optimization line:

- final-flush / SQLite write-mode paths,
- Rust core graph-write and FTS rebuild paths,
- finalization/reference-resolution diagnostic fields,
- candidate replay or equivalence diagnostics,
- edge materialization/write candidates,
- local exact reference lookup cache,
- evidence pipeline scripts and generated artifacts,
- any retained environment validation item that is relevant to interpreting optimization work.

For each entry, record:

- category: production path, retained diagnostic, or dead candidate,
- owning issue or artifact,
- why it exists,
- whether it can affect default behavior,
- whether it can be used for future #165 optimization,
- what cleanup or documentation is needed.

Type: AFK

Blocked by: 23.1

Validation:

- inventory document committed under `docs/benchmarks/` or `docs/design/`,
- inventory references the relevant issue/artifact numbers,
- #185 remains untouched unless packaging/CLI/status/release/npm smoke paths are actually touched.

### 23.3 Production boundary cleanup for performance paths

Use the inventory to make narrow production-code cleanup changes in performance-related paths.

Allowed areas:

- Rust core profile/reporting structures,
- Rust core graph-write or finalization helper boundaries touched by prior optimization phases,
- TypeScript Rust indexing orchestration profile handling,
- benchmark runner profile/artifact handling,
- retained diagnostic isolation,
- removal of dead candidate runtime paths when evidence supports removal.

Constraints:

- no default behavior change,
- no graph semantic change,
- no resolver semantic change,
- no SQLite schema change,
- no MCP behavior change,
- no installer, packaging, release, status, or npm smoke path changes,
- no performance claim as a pass condition.

Type: AFK; HITL if cleanup would remove a diagnostic path whose future value is ambiguous.

Blocked by: 23.2

Validation:

- targeted TypeScript tests for touched orchestration/tooling,
- `cargo test -p zcodegraph-core` if Rust core is touched,
- `cargo fmt -p zcodegraph-core --check` if Rust core is touched,
- build if TypeScript production paths are touched.

### 23.4 Targeted smoke/profile validation

Validate that Phase 23 cleanup preserved the evidence loop and basic Rust indexing behavior.

Required validation:

- evidence comparison/ranking/decision fixture tests pass,
- targeted smoke/profile produces valid artifacts after cleanup,
- RSS is recorded or an unavailable reason is recorded,
- sufficiency is checked if touched paths can affect index/read/explore behavior,
- graphStats or an equivalent semantic parity signal is recorded when the smoke writes an index,
- no Rust default rollout readiness is claimed.

Default: do not run a full VS Code sparse scoreboard.

Run a full VS Code sparse scoreboard only if 23.3 changes final-evidence semantics or behavior in a way targeted smoke/profile cannot validate.

Type: AFK

Blocked by: 23.3

### 23.5 Next-candidate decision and #165 update

Write the Phase 23 closeout decision and update #165 manually.

The closeout must include:

- what evidence/tooling contract changed,
- what inventory entries were classified,
- what production cleanup was performed,
- what validation ran,
- whether RSS was recorded or why unavailable,
- whether sufficiency was checked or why not applicable,
- what the next #165 step is,
- explicit statement that #165 remains open,
- explicit statement that Rust default rollout readiness is not claimed.

The next step must be one of:

- one bounded optimization candidate,
- one profiling issue,
- one architecture blocker,
- no-go direct optimization until a named diagnostic gap is closed.

Type: HITL for final next-candidate choice if evidence points to multiple plausible directions; otherwise AFK.

Blocked by: 23.4

### 23.6 Phase 23 tracker

Track the phase sequence and guardrails.

The tracker should link the five implementation issues and keep the phase scoped to optimization architecture cleanup.

It should not replace #165. It should report back to #165 when complete.

Type: AFK

Blocked by: none

## Acceptance Criteria

- The Phase 23 evidence pipeline contract is cleaned up and tested.
- A performance experiment/candidate inventory exists.
- Inventory entries are classified as production path, retained diagnostic, or dead candidate.
- Retained diagnostics are named and isolated clearly enough that they are not mistaken for default behavior.
- Dead candidates are removed from runtime paths or explicitly justified as retained diagnostics.
- Production-code cleanup, if any, stays within performance-related boundaries.
- Default user-visible indexing behavior is unchanged.
- SQLite schema is unchanged.
- MCP behavior is unchanged.
- Installer, packaging, release, status, and npm smoke paths are unchanged unless explicitly brought into scope by a separate decision.
- Targeted smoke/profile evidence confirms artifact generation and diagnostic continuity.
- RSS is recorded or an unavailable reason is recorded.
- Sufficiency is checked when relevant.
- A next-candidate decision for #165 is produced.
- #165 is updated manually and remains open.
- No Rust default rollout readiness is claimed.

## Expected Artifacts

- Updated evidence pipeline tool/tests, if cleanup requires code changes.
- Experiment/candidate inventory document.
- Production boundary cleanup diff, if justified by the inventory.
- Targeted smoke/profile artifact or documented smoke output.
- Phase 23 closeout decision under `docs/benchmarks/`.
- Manual #165 tracker update.

## Stop Conditions

Stop and write a decision instead of continuing if:

- The cleanup would change default indexing behavior.
- The cleanup requires changing SQLite schema.
- The cleanup would change MCP behavior.
- The cleanup starts depending on GitHub/network integration inside evidence tooling.
- Candidate classification cannot separate production paths from diagnostics.
- A retained diagnostic is too ambiguous to keep without maintainer input.
- Targeted smoke/profile cannot produce trustworthy artifacts.
- The phase expands into unrelated repository-wide cleanup.
- The phase starts implying Rust default rollout readiness.
