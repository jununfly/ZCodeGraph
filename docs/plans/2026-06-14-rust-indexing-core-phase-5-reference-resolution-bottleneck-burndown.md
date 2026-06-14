# Rust Indexing Core Phase 5 Reference Resolution Bottleneck Burndown Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on: [Rust Indexing Core Phase 4 Default Rollout Readiness Plan](2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md)

Phase 4 results and decision: [Rust Indexing Core Phase 4 Results And Decision](../benchmarks/2026-06-13-rust-indexing-core-phase-4-results-and-decision.md)

Tracker issue: [#95](https://github.com/jununfly/ZCodeGraph/issues/95)

Primary blocker issue: [#94](https://github.com/jununfly/ZCodeGraph/issues/94)

## Goal

Phase 5 reduces the remaining TypeScript finalization blocker that prevents a
Rust default rollout, starting with reference-resolution name matching and
unresolved-reference cleanup.

Phase 5 is a targeted blocker-reduction phase, not a default-rollout readiness
phase. Rust remains opt-in. The TypeScript indexer remains the default for
`zcodegraph index`, npm/npx users, MCP hosts, release bundles, and install
flows unless a later default-rollout plan explicitly changes that.

Phase 5 may produce a later default-rollout plan only if reference-resolution
cost is materially reduced, Agent Sufficiency stays green, and the final
decision classifies the Branch A blocker as resolved.

## Current Evidence

Phase 4 completed as Branch B: continue opt-in hardening. Branch A/default
rollout was not chosen.

The large-target evidence was validated on a large VS Code JS/TS sparse
checkout. It showed that the dominant blocker is TypeScript finalization,
specifically `referenceResolutionMs`, not Rust parse extraction.

The #87 investigation split `referenceResolutionMs` and identified
`databaseAccessMs` as the largest subpath in the VS Code sparse-checkout
profile. The #91 bounded optimization added public DB sub-buckets and attempted
edge-materialization and unresolved-cleanup optimizations, but it did not reduce
the large-target blocker enough to change the decision. The #91 after-profile
left `databaseAccessMs` and `nameMatchingMs` as the clearest remaining targets.

The next planned slice is #94: reduce repeated candidate lookup with grouped
name matching and replace unresolved-reference cleanup by text tuple with
rowid-based cleanup.

## Non-Goals

- Do not make Rust the default index engine.
- Do not write or execute a default-rollout plan during Phase 5 unless the
  Phase 5 decision first classifies the blocker as resolved.
- Do not expand Rust language coverage beyond JavaScript, TypeScript, JSX, and
  TSX.
- Do not migrate ReferenceResolver, framework resolvers, dynamic-dispatch
  synthesizers, Explore planning, or Explore rendering to Rust.
- Do not change graph semantics, edge kinds, node coverage, unresolved-reference
  behavior, or Agent Sufficiency behavior to win speed.
- Do not drop ambiguous references, skip per-reference disambiguation, or reduce
  candidate sets in a way that changes resolver behavior.
- Do not change the SQLite schema for unresolved-reference cleanup.
- Do not require release/npm/package smoke by default unless Phase 5 changes
  packaging, CLI engine selection, status diagnostics, Rust binary discovery, or
  release-bundle layout.
- Do not require multi-run benchmark statistics, end-to-end Rust over TypeScript
  wins, or zero parse errors as Phase 5 gates.

## Hard Constraints

- Grouped name matching may share candidate lookup across equivalent references,
  but each reference must still run the same per-reference disambiguation
  semantics as before.
- The default grouping key starts with `referenceName`, `referenceKind`, and
  `language`. If scope or context is required to preserve semantics, the group
  key must include that dimension rather than weakening resolution.
- Unresolved-reference cleanup should use SQLite `rowid` as an internal query
  projection and delete identity. It must not add a schema column or bump schema
  version.
- Any optimization must preserve import resolution, framework resolution,
  dynamic-dispatch synthesis, edge kind selection, target selection, and
  unresolved-reference retention behavior.
- Agent Sufficiency is a hard guardrail. Faster indexing that increases generic
  Read/Grep fallback risk is a regression.
- Every implementation issue must include aligned tests and benchmark/profile
  evidence sufficient to judge the trend.

## Required Profile Sub-Buckets

Phase 5 must make the reference-resolution cost breakdown public enough to judge
whether grouped lookup and cleanup changes worked.

The exact names can follow the local profiling style, but the profile artifact
must distinguish these concepts:

- shared candidate lookup;
- per-reference disambiguation;
- candidate lookup cache hit or reuse time, if represented separately;
- unresolved-reference batch reads;
- edge materialization;
- edge writes;
- unresolved-reference cleanup;
- total name matching;
- total database access;
- total reference resolution.

The raw JSON artifacts and human-readable summaries must expose enough of these
sub-buckets to classify the Phase 5 result without relying on ad hoc logs.

## Validation Matrix

### Reduced Fixture

Reduced fixture validation is required for the inner loop.

The fixture should create repeated unresolved references that stress repeated
candidate lookup and cleanup pressure. It must record before/after evidence
showing whether grouped candidate lookup and rowid cleanup improve the intended
sub-buckets.

### Hard-Gate Repo Smoke

ZCodeGraph, Excalidraw, and Zustand remain the hard-gate smoke repositories.

Phase 5 does not require full multi-run benchmarks on these repositories, but it
must run enough targeted tests, parity checks, or Agent Sufficiency guardrails to
show graph semantics and sufficiency did not regress.

### Large Target Final Validation

Phase 5 requires one final VS Code JS/TS sparse-checkout after-profile and one
Explore sufficiency smoke after the primary #94 work and any allowed second
candidate.

The large-target evidence must keep the downgraded wording:

> validated on a large VS Code JS/TS sparse checkout

It must not claim validation on full VS Code unless full VS Code is actually
used. It must not require zero parse errors.

### Conditional Packaging Smoke

Release/npm/package smoke is not a default Phase 5 gate. It becomes required
only if a Phase 5 issue changes packaging, CLI engine selection, status
diagnostics, Rust binary discovery, or release-bundle layout.

## Success Classification

Phase 5 ends with exactly one classification:

- `resolved`: `referenceResolutionMs` is no longer the large-target dominant
  bottleneck, Agent Sufficiency stays green, graph semantics are preserved, and
  the remaining Rust-vs-TypeScript large-target gap is close enough to support a
  later default-rollout plan.
- `reduced but still blocking`: at least one target sub-bucket, such as
  `nameMatchingMs`, `databaseAccessMs`, or unresolved cleanup, drops by at least
  15% with no sufficiency or semantics regression, but Branch A/default rollout
  remains blocked.
- `still unresolved`: the target sub-buckets do not drop by at least 15%, or the
  after-profile does not provide enough rollout confidence.
- `regressed`: graph semantics, Agent Sufficiency, wall-clock, RSS, packaging
  safety, or maintainability regresses. The change must be reverted or
  quarantined before continuing.

Phase 5 does not pass by claiming end-to-end Rust is faster than TypeScript. It
passes by producing trustworthy blocker-reduction evidence and an honest
stop/continue decision.

## Issue Sequence

### 1. Phase 5 Plan And Doc Guardrails

- Write this Phase 5 plan.
- Add focused documentation tests that protect the Phase 5 positioning:
  targeted blocker reduction, Rust remains opt-in, no default-rollout claim, and
  validation on a large VS Code JS/TS sparse checkout.
- Create a Phase 5 tracker issue.

### 2. Reference-Resolution Profile Sub-Buckets

- Extend public profile output so reference-resolution cost can be interpreted.
- Distinguish shared candidate lookup, per-reference disambiguation,
  unresolved-reference reads, edge writes, cleanup, total name matching, total
  database access, and total reference resolution as far as the implementation
  can measure them.
- Add tests for profile JSON shape and summary rendering.
- Do not optimize resolver behavior in this issue beyond instrumentation needed
  to make the next issue measurable.

### 3. Grouped Name Matching And Rowid Cleanup

- Implement #94.
- Group unresolved references enough to share candidate lookup across equivalent
  `referenceName`, `referenceKind`, and `language` groups while preserving
  per-reference disambiguation semantics.
- Expose internal unresolved-reference `rowid` in batch reads and delete
  processed unresolved-reference rows by row identity.
- Do not change SQLite schema or unresolved-reference semantics.
- Use reduced fixture before/after evidence for quick iteration.
- Run hard-gate repo smoke.
- Run one final VS Code JS/TS sparse-checkout after-profile and Explore
  sufficiency smoke.
- Classify #94 as `resolved`, `reduced but still blocking`, `still unresolved`,
  or `regressed` before deciding whether to continue.

### 4. Optional Bounded Second Candidate

This issue exists only if #94 is `reduced but still blocking` and the
after-profile clearly identifies one largest remaining actionable sub-bucket.

- The second candidate must be one bounded issue.
- It must start with a written hypothesis.
- It must use a reduced fixture for quick iteration.
- It must preserve graph semantics and Agent Sufficiency.
- It must end with one final VS Code JS/TS sparse-checkout after-profile and
  Explore sufficiency smoke.
- If #94 is `resolved`, `still unresolved`, or `regressed`, skip this issue and
  move directly to the Phase 5 decision.

### 5. Phase 5 Results And Decision

- Write `docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-results-and-decision.md`.
- Record reduced fixture evidence, hard-gate smoke results, VS Code
  sparse-checkout profile, sufficiency smoke, profile sub-bucket interpretation,
  and raw artifact locations.
- Classify Phase 5 as `resolved`, `reduced but still blocking`,
  `still unresolved`, or `regressed`.
- State whether Branch A/default rollout remains blocked.
- If the blocker is resolved, authorize a later default-rollout plan rather than
  changing the default engine directly.
- If the blocker remains, name the next bottleneck or architectural decision.
- Update this plan's execution status section.
- Lightly link Phase 4 historical docs to the Phase 5 follow-up if needed, but
  do not rewrite Phase 4's Branch B decision.

## Phase 5 Execution Status

| Plan item | Status | Evidence |
|---|---|---|
| Phase 5 plan and tracker | Completed | This plan, [#95](https://github.com/jununfly/ZCodeGraph/issues/95) |
| Reference-resolution profile sub-buckets | Completed | [#96](https://github.com/jununfly/ZCodeGraph/issues/96); profiler artifacts expose `candidateLookupMs`, `candidateLookupCacheHitMs`, `perReferenceDisambiguationMs`, `unresolvedReadMs`, `edgeWriteMs`, `unresolvedCleanupMs`, `nameMatchingMs`, `databaseAccessMs`, and `referenceResolutionMs` |
| Grouped name matching and rowid cleanup | Pending | [#94](https://github.com/jununfly/ZCodeGraph/issues/94) |
| Optional bounded second candidate | Conditional | Created only after #94 if evidence requires it |
| Phase 5 results and decision | Pending | Future results document |

## Local Validation

Minimum validation for Phase 5 documentation-only work:

```bash
npx vitest run __tests__/rust-phase4-*.test.ts
git diff --check
```

Minimum validation for Phase 5 implementation work:

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-parity.test.ts
npx vitest run __tests__/rust-phase3-validation.test.ts __tests__/rust-failure-safety-matrix.test.ts
node scripts/rust-sufficiency-guardrail.mjs
```

Implementation issues must additionally run their reduced fixture
before/after, hard-gate smoke, and the final VS Code JS/TS sparse-checkout
profile plus Explore sufficiency smoke required by this plan.

## Agent Handoff Notes

- Start with profile visibility. Do not optimize against a sub-bucket that is
  not visible in durable artifacts.
- Treat #94 as the primary Phase 5 implementation slice.
- Preserve resolver semantics. Shared lookup is allowed; weakened
  disambiguation is not.
- Keep Rust opt-in. Do not claim default rollout readiness from partial
  blocker-reduction evidence.
- Stop after one bounded second candidate at most.
- Record a decision even if the result is negative or unresolved.
