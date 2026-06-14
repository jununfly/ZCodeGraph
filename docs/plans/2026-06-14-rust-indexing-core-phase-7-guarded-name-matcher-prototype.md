# Rust Indexing Core Phase 7 Guarded Name Matcher Prototype Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on:

- [Rust Indexing Core Phase 6 JS/TS Completeness Plan](2026-06-14-rust-indexing-core-phase-6-js-ts-completeness.md)
- [Rust Indexing Core Phase 6 Results And Decision](../benchmarks/2026-06-14-rust-indexing-core-phase-6-results-and-decision.md)
- [Rust End-To-End Graph Pipeline Feasibility Decision](../design/2026-06-14-rust-end-to-end-graph-pipeline-feasibility.md)

## Goal

Phase 7 is a guarded Rust-assisted name matcher prototype.

The goal is to replace the actual ReferenceResolver name-matching subpath for a
bounded JS/TS/JSX/TSX subset behind an explicit opt-in flag, while preserving
the TypeScript resolver orchestration, candidate lookup, graph mutation,
framework resolvers, dynamic-dispatch synthesizers, MCP tools, Explore
planning, and Explore rendering.

Rust remains opt-in. TypeScript remains the default resolver path unless a
later plan explicitly promotes the guarded Rust matcher. Phase 7 does not claim
default rollout readiness.

## Current Evidence

The PRD chose a narrow Rust indexing core vertical slice and explicitly kept
ReferenceResolver, framework resolvers, dynamic-dispatch synthesizers, MCP, and
Explore in TypeScript for the first migration stage.

Phase 5 showed that the remaining large-target blocker is TypeScript
finalization, especially `referenceResolutionMs`, with `nameMatchingMs`,
`databaseAccessMs`, and `perReferenceDisambiguationMs` as important subpaths.

Phase 6 improved JS/TS Rust extraction completeness and classified the next
step as `ready for end-to-end prototype`, but not default rollout. The
feasibility decision selected `prototype-first`, with `name matcher only` as
the first candidate migration boundary.

## Non-Goals

- Do not make Rust the default resolver or default index engine.
- Do not claim default rollout readiness.
- Do not change SQLite schema.
- Do not migrate ReferenceResolver orchestration wholesale.
- Do not migrate import resolution, framework resolvers, dynamic-dispatch
  synthesizers, graph traversal, MCP tools, Explore planning, or Explore
  rendering to Rust.
- Do not let Rust write edges or delete unresolved references.
- Do not let Rust query project SQLite directly in Phase 7.
- Do not expand Rust language coverage beyond JavaScript, TypeScript, JSX, and
  TSX.
- Do not improve matcher semantics in Phase 7. This phase is a
  behavior-preserving port of the existing matcher heuristics.
- Do not require Rust to beat TypeScript end-to-end.
- Do not require RSS improvement, only RSS evidence or an unavailable reason.
- Do not require release/npm/package smoke unless packaging, CLI/status, Rust
  binary discovery, or release-bundle paths are changed.

## Hard Constraints

- Rust remains opt-in.
- Phase 7 uses a guarded actual resolver path, not shadow-only mode.
- TypeScript performs candidate lookup and passes candidate facts to Rust.
- Rust receives a narrow batch protocol and returns only matcher decisions and
  diagnostics.
- TypeScript remains responsible for edge writes and unresolved-reference
  cleanup.
- Per-reference disambiguation semantics must not change.
- Existing matcher heuristics must be ported behavior-preservingly.
- Unsupported, ambiguous, erroring, or semantic-mismatching Rust results must
  fall back to the TypeScript matcher in the default guarded mode.
- A strict development mode may fail on semantic mismatch, but unguarded Rust
  matcher output is not a Phase 7 product path.
- Batch subprocess is allowed; per-reference subprocess is not allowed.
- A long-running Rust matcher daemon is out of scope.

## Narrow Protocol

Phase 7 may add a narrow TypeScript-to-Rust batch protocol.

TypeScript sends:

- unresolved reference facts;
- exact-name, qualified-name, lower-name, and other candidate sets already
  selected by the TypeScript resolver context;
- file and language context required by the existing matcher heuristics;
- the minimal node facts required for behavior-preserving disambiguation.

Rust returns:

- `targetNodeId | null`;
- `confidence`;
- `resolvedBy`;
- `fallbackReason?`;
- per-batch and per-reference timing diagnostics.

Rust must not:

- query SQLite directly;
- write graph edges;
- delete unresolved references;
- invoke import, framework, dynamic synthesis, MCP, or Explore code.

## Matcher Coverage Strategy

Phase 7's end goal is complete matcher coverage within the narrow candidate
protocol boundary. Implementation should still proceed as tracer bullets:

1. Exact-name and qualified-name matcher path.
2. Method/member and path-proximity disambiguation.
3. File-path, partial-qualified, lower-name, and remaining matcher branches
   that do not require expanding the boundary.
4. Full guarded matcher coverage gate and fallback taxonomy.

If a matcher branch requires importing a broader resolver responsibility, that
branch must stay in TypeScript and record a fallback reason.

## Metrics

Primary metrics:

- `nameMatchingMs`;
- `perReferenceDisambiguationMs`;
- `rustMatcherHandledRefs / rustMatcherEligibleRefs`.

Required Rust matcher diagnostics:

- `rustMatcherMs`;
- `rustMatcherStartupMs`;
- `rustMatcherSerializationMs`;
- `rustMatcherEligibleRefs`;
- `rustMatcherHandledRefs`;
- `rustMatcherFallbackRefs`;
- `rustMatcherSemanticMismatchRefs`;
- fallback reason taxonomy.

Secondary metrics:

- `referenceResolutionMs`;
- `candidateLookupMs`;
- `databaseAccessMs`;
- Rust engine wall time;
- RSS or `rssUnavailableReason`.

Safety metrics:

- semantic mismatch count;
- fallback count by reason;
- resolved edge count delta;
- unresolved reference count delta;
- deterministic sufficiency Read/Grep fallback signals.

## Validation Matrix

### Semantic Equivalence

Targeted semantic snapshots must compare Rust-enabled guarded matcher output
against the TypeScript matcher baseline. Resolved edges and unresolved
references must not change unless a later explicit resolver-semantics issue
allows it.

### Agent Sufficiency

Representative Explore sufficiency prompts must stay green. A faster matcher
that increases deterministic Read/Grep fallback risk is a regression.

### Performance Attribution

Reduced fixtures are the inner loop for performance and semantic debugging.
They must show whether Rust matcher handling, fallback, startup, and
serialization costs explain the trend.

### Large Target

Phase 7 requires one final profile and one final sufficiency smoke validated on a large VS Code JS/TS sparse checkout.

The large-target gate records trend evidence. It does not require end-to-end
Rust to beat TypeScript and does not authorize default rollout.

### RSS

RSS improvement is not required. RSS or `rssUnavailableReason` must be recorded.
Material RSS regression should be explained and tracked, but RSS alone should
not fail Phase 7 unless it causes runtime instability.

### Packaging And Release

Release/npm/package smoke is not a default Phase 7 gate. It becomes required
only if implementation changes packaging, CLI engine selection, status
diagnostics, Rust binary discovery, or release-bundle layout.

## Success Classification

Phase 7 ends with exactly one classification:

- `promote to guarded resolver path`: Rust matcher semantics are equivalent,
  fallback and mismatch rates are controlled, reduced fixture trends improve,
  VS Code sparse sufficiency stays green, and large-target evidence supports
  keeping or expanding the guarded path.
- `continue matcher prototype`: semantics are mostly controlled, but coverage,
  startup/serialization overhead, branch support, or memory/runtime evidence
  blocks promotion.
- `abandon Rust matcher`: behavior-preserving Rust matcher cost or complexity
  is not justified compared with TypeScript resolver/data-model optimization.
- `regressed`: semantic snapshots, Agent Sufficiency, runtime stability, wall
  time, RSS, or maintainability regresses.

Phase 7 cannot pass by claiming default rollout readiness. It passes by
answering whether a guarded Rust matcher path should be promoted, continued, or
abandoned.

## Issue Sequence

### 1. Phase 7 Plan And Guardrails

- Write this Phase 7 plan.
- Add focused documentation tests that protect the Phase 7 positioning:
  guarded actual resolver path, Rust remains opt-in, narrow protocol, no schema
  change, no default rollout, and validation on a large VS Code JS/TS sparse
  checkout.
- Create a Phase 7 tracker issue.

### 2. Narrow Protocol And Exact/Qualified Tracer Bullet

- Add the TypeScript-to-Rust batch protocol behind an opt-in flag.
- Implement exact-name and qualified-name matcher support as the first
  behavior-preserving Rust matcher slice.
- Add semantic snapshot tests and unsupported fallback tests.
- Do not change graph mutation semantics.

### 3. Complete Matcher Branches Within The Narrow Boundary

- Port remaining matcher branches that fit the narrow candidate protocol:
  method/member, path proximity, partial-qualified, file-path, lower-name, and
  related existing heuristics.
- Keep import, framework, dynamic synthesis, and broader resolver behavior in
  TypeScript.
- Record fallback reasons for branches outside the boundary.

### 4. Guarded Actual Resolver Integration

- Wire the guarded Rust matcher into the actual resolver path under an opt-in
  flag.
- Add fallback behavior for unsupported, ambiguous, error, and semantic
  mismatch outcomes.
- Add counters for handled refs, eligible refs, fallback refs, mismatch refs,
  and fallback reasons.
- Verify that default TypeScript resolver behavior remains unchanged.

### 5. Benchmark Attribution And Reduced Fixture Optimization

- Add durable profile buckets for Rust matcher startup, serialization, matcher
  execution, handled refs, fallback refs, mismatch refs, and coverage.
- Run reduced fixture profiles to judge whether Rust matcher work moves the
  intended subpaths.
- Keep evidence trend-based; do not require end-to-end TypeScript defeat.

### 6. Large-Target Closeout Decision

- Run one final large VS Code JS/TS sparse-checkout profile.
- Run one final large VS Code JS/TS sparse-checkout sufficiency smoke.
- Record raw artifacts and a Phase 7 results-and-decision document.
- Classify Phase 7 as `promote to guarded resolver path`, `continue matcher
  prototype`, `abandon Rust matcher`, or `regressed`.

### 7. Tracker

- Track the six implementation issues.
- Link final artifacts and classification.

## Local Validation

Minimum validation for Phase 7 documentation-only work:

```bash
npx vitest run __tests__/rust-phase7-plan-doc.test.ts
git diff --check
```

Minimum validation for Phase 7 implementation work:

```bash
npm run build
npx vitest run __tests__/resolution.test.ts
npx vitest run __tests__/rust-index-profile.test.ts
```

Implementation issues must additionally run targeted semantic snapshot tests,
Rust matcher tests, focused profile tests, and any final large-target profile
or sufficiency smoke required by their acceptance criteria.

## Agent Handoff Notes

- Keep Phase 7 scoped to a guarded Rust-assisted name matcher.
- Preserve the actual resolver path only through the guarded opt-in integration.
- Preserve per-reference disambiguation semantics.
- Keep candidate lookup in TypeScript.
- Keep graph mutation in TypeScript.
- Use fallback instead of semantic drift.
- Do not turn prototype evidence into a default rollout claim.
