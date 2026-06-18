# Rust Indexing Core Phase 22: Evidence Pipeline and Optimization Loop

## Parent

- Post-PRD optimization tracker: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Empty-corpus evidence repair and next-candidate selection: [#210](https://github.com/jununfly/ZCodeGraph/issues/210)
- Rust core graph-write bounded A/B: [#211](https://github.com/jununfly/ZCodeGraph/issues/211)
- Original PRD: `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md`

## Context

The Rust indexing PRD has moved into post-PRD optimization. Rust remains opt-in. TypeScript remains the product default. No Rust default rollout readiness is claimed.

#210 and #211 showed two things at once:

- The required-target gate is improving in specific buckets, and the evidence is now more trustworthy.
- The optimization loop itself has become too manual: each candidate requires hand-written manifests, raw artifact inspection, before/after number extraction, decision-doc writing, and tracker updates.

Continuing one-off performance issues without improving this evidence pipeline risks slow iteration and inconsistent decisions. Starting unrelated new feature work would also leave the optimization loop more expensive than it needs to be.

Phase 22 is therefore a technical-debt governance phase for the performance optimization loop. It should make each future candidate easier to validate, compare, decide, and archive.

## Goal

Create a repeatable evidence pipeline for post-PRD Rust indexing optimization, then use it once on a bounded candidate and finish with a narrow architecture cleanup of the performance-related code touched by this phase.

After this phase, a future performance candidate should have a standard path:

1. Run or provide before/after experiment artifacts.
2. Generate a standard comparison markdown.
3. Rank the next candidate using explicit rules.
4. Generate a decision artifact draft.
5. Update #165 manually using a concise tracker-update section.
6. Keep or reject the implementation based on sufficiency, graphStats parity, target-bucket movement, and performance-gate status.

## Non-Goals

- Do not make Rust the default indexer.
- Do not claim Rust default rollout readiness.
- Do not require the required performance gate to pass in this phase.
- Do not add GitHub API integration to the tooling.
- Do not auto-create, auto-comment, auto-label, or auto-close GitHub issues.
- Do not change persistent SQLite schema.
- Do not change resolver semantics silently.
- Do not change MCP tool behavior.
- Do not change installer, packaging, release, or npm smoke paths.
- Do not do general repository-wide architecture cleanup.
- Do not turn this phase into an open-ended benchmark platform rewrite.

## Decisions

### Technical debt before the next isolated optimization

The next work should reduce the cost of validating and judging performance candidates before running another full candidate sequence.

This is not a pause on performance work. It is a way to make the next performance issue more disciplined and cheaper to evaluate.

### Evidence pipeline first

The first optimization target is the workflow, not Rust core internals.

The most expensive repeated work is currently:

- copying or adapting experiment manifests,
- extracting before/after numbers from raw JSON,
- checking sufficiency and graphStats parity,
- identifying the real target bucket,
- writing decision docs,
- updating #165 in a consistent style.

Phase 22 should turn these into repeatable artifacts before doing another implementation candidate.

### GitHub remains outside the tooling

Direct GitHub operations are part of the maintainer/agent workflow, not part of the evidence tooling.

The tooling may generate a tracker update draft, but it must not call GitHub APIs, run `gh`, close issues, edit labels, or require network access.

### Candidate choice is rule-driven, not pre-fixed

The default candidate after #211 is `localExactReferenceResolutionMs`, but Phase 22 should not hard-code it as the required implementation candidate before the comparison/ranking pipeline exists.

The new ranking output must confirm the candidate before the implementation issue starts.

Candidate ranking rules:

1. Prefer Rust-owned buckets before expanding TypeScript finalization dependence.
2. Exclude already-tested directions unless materially reframed:
   - #208 candidate replay verifier.
   - #209 TypeScript finalization edge-write-only hypothesis.
   - #211 FTS-trigger bulk-write optimization.
3. Prefer buckets visible on required targets and large on VS Code sparse.
4. Prefer candidates that allow bounded A/B on a reduced fixture.
5. Do not select candidates that require SQLite schema changes.
6. Do not select candidates that change resolver or graph semantics without a separate parity decision.

### Validation is tiered

Full VS Code sparse scoreboard should not run for every slice.

Tooling slices should use fixture raw artifacts and existing real artifacts. The implementation slice should use a reduced fixture for the inner loop and exactly one final after scoreboard across ZCodeGraph, Excalidraw, and VS Code sparse.

### Final cleanup is narrow

The architecture cleanup at the end is required, but scoped only to performance-related code touched by this phase.

Allowed cleanup:

- benchmark comparison tooling,
- decision artifact generation,
- Rust indexing profile field organization,
- Rust core performance helpers modified in this phase,
- duplication introduced by this phase,
- temporary scripts or unclear names introduced by this phase.

Not allowed:

- repo-wide cleanup,
- extraction/resolution architecture rewrite,
- database schema changes,
- MCP behavior changes,
- installer, packaging, release, or npm smoke changes,
- changes to graph semantics for elegance.

## Issue Sequence

### 22.1 Before/after experiment artifact comparison generator

Build a local tool that accepts a before raw experiment artifact and an after raw experiment artifact, then emits a standard markdown comparison.

The comparison must extract at least:

- target matrix,
- required vs stress classification,
- sufficiency status,
- graphStats parity status,
- wall time and wall delta,
- peak RSS and RSS delta or unavailable reason,
- Rust core profile buckets,
- TypeScript finalization total,
- finalization reference-resolution breakdown,
- empty-corpus validation status,
- experiment classification and rollout-readiness disclaimer.

Type: AFK

Blocked by: none

Validation:

- Unit/fixture tests with small synthetic artifacts.
- Smoke against #210 and #211 raw artifacts.
- No new VS Code sparse run required.

### 22.2 Candidate ranking and exclusion notes

Extend the comparison output with candidate ranking and exclusion notes.

The output should identify dominant buckets and produce a concise next-candidate recommendation or a pause recommendation. It must also explicitly list excluded candidates and why they are excluded.

The first default recommendation may be `localExactReferenceResolutionMs`, but only if the ranking rules still support it from the comparison data.

Type: AFK

Blocked by: 22.1

Validation:

- Fixture tests for ranking order.
- Fixture tests for exclusion of #208, #209, and #211 directions.
- Smoke against #210/#211 artifacts.
- No new VS Code sparse run required.

### 22.3 Decision artifact generator

Generate a standard decision document draft from the comparison output.

The draft must include:

- implementation or candidate scope,
- artifact links,
- before/after table,
- target bucket movement,
- graphStats parity result,
- sufficiency result,
- performance-gate status,
- RSS result or unavailable reason,
- keep/revert/pause recommendation,
- tracker update draft for #165,
- explicit statement that Rust default rollout readiness is not claimed.

The generated output is a local artifact. It must not update GitHub directly.

Type: AFK

Blocked by: 22.2

Validation:

- Snapshot-style fixture tests for decision markdown shape.
- Smoke generation from #210/#211 artifacts.
- No new VS Code sparse run required.

### 22.4 One bounded optimization using the new pipeline

Use the Phase 22 comparison and ranking pipeline to select exactly one bounded optimization candidate, then implement and measure it.

Default candidate: `localExactReferenceResolutionMs`, subject to confirmation by the new ranking output.

Requirements:

- Inner loop uses a representative reduced fixture.
- Final validation runs exactly one after scoreboard across:
  - ZCodeGraph required target,
  - Excalidraw required target,
  - VS Code sparse stress target.
- Use the new comparison generator and decision artifact generator for the final evidence.
- Preserve graphStats parity and sufficiency.
- Do not change SQLite schema.
- Do not change resolver semantics without an explicit parity decision.
- Do not claim Rust default rollout readiness.

Type: AFK for implementation and artifact draft; HITL if the ranking output recommends pausing or if the candidate requires semantic tradeoffs.

Blocked by: 22.3

### 22.5 Performance-related architecture cleanup

Clean up the evidence pipeline and performance-related code touched by Phase 22.

The cleanup should make the resulting design simpler and easier to extend for the next candidate. It should remove duplicated artifact parsing, unclear names, temporary structures, and phase-specific one-off code introduced during the phase.

This issue must stay narrow. It is not a license to redesign the whole indexing architecture.

Type: AFK

Blocked by: 22.4

Validation:

- Relevant unit/integration tests for touched tooling.
- Rust core tests if Rust performance code is touched.
- Targeted smoke only if cleanup touches benchmark runner or Rust performance paths.
- No default full VS Code sparse rerun unless cleanup changes final-evidence behavior.

## Acceptance Criteria

- A before/after raw artifact comparison tool exists and is tested.
- The comparison output includes wall time, RSS, sufficiency, graphStats parity, Rust core buckets, TypeScript finalization, finalization breakdown, empty-corpus validation, and classification.
- Candidate ranking rules are implemented or encoded in the generated output.
- Already-tested directions from #208, #209, and #211 are explicitly excluded unless materially reframed.
- A standard decision artifact draft can be generated from comparison output.
- The tooling does not call GitHub or require network access.
- One bounded optimization candidate is selected using the new pipeline.
- The bounded candidate has reduced-fixture evidence and one final after scoreboard across ZCodeGraph, Excalidraw, and VS Code sparse.
- GraphStats parity and sufficiency are preserved for the bounded candidate, or the issue stops with a decision artifact explaining why not.
- #165 receives a concise manual tracker update generated from the evidence.
- A final architecture cleanup removes phase-local redundancy in performance-related code.
- No Rust default rollout readiness is claimed.

## Expected Artifacts

- Comparison tool source and tests.
- Fixture raw artifacts for comparison/ranking tests.
- Generated comparison markdown for #210/#211 evidence.
- Candidate ranking output.
- Decision artifact draft generated by the new pipeline.
- Bounded optimization before/after evidence under `docs/benchmarks/`.
- Final Phase 22 decision artifact under `docs/benchmarks/`.
- Manual #165 tracker update comment generated from the final decision.

## Stop Conditions

Stop and write a decision instead of continuing if:

- The comparison/ranking tool needs GitHub integration to be useful.
- The ranking output cannot produce a clear next candidate or pause recommendation from #210/#211 evidence.
- The selected bounded candidate requires a SQLite schema change.
- The selected bounded candidate requires changing resolver semantics without a separate parity decision.
- The final after scoreboard cannot produce valid non-empty corpora for ZCodeGraph and Excalidraw.
- The cleanup work expands into unrelated architecture cleanup.
- The phase starts implying Rust default rollout readiness.
