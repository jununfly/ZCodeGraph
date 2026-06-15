# Rust Indexing Core Phase 6 JS/TS Completeness Plan

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

Depends on: [Rust Indexing Core Phase 5 Reference Resolution Bottleneck Burndown Plan](2026-06-14-rust-indexing-core-phase-5-reference-resolution-bottleneck-burndown.md)

Phase 5 results and decision: [Rust Indexing Core Phase 5 Results And Decision](../benchmarks/2026-06-14-rust-indexing-core-phase-5-results-and-decision.md)

## Goal

Phase 6 is a JS/TS Rust indexing completeness phase.

The goal is to make the opt-in Rust indexing path more complete and trustworthy
for JavaScript, TypeScript, JSX, and TSX extraction while preserving the
TypeScript product shell. Phase 6 does not try to make Rust the default engine.
It does not migrate ReferenceResolver, framework resolvers, dynamic-dispatch
synthesizers, graph traversal, MCP tools, Explore planning, or Explore
rendering to Rust.

Rust remains opt-in. The TypeScript indexer remains the default for
`zcodegraph index`, npm/npx users, MCP hosts, release bundles, and install
flows unless a later default-rollout plan explicitly changes that.

Phase 6 also produces a Rust end-to-end graph pipeline feasibility decision.
That decision should answer whether the next planning step should be a
prototype for migrating more of the graph production pipeline to Rust, but Phase
6 itself does not implement that end-to-end migration.

## Current Evidence

The PRD chose a narrow Rust indexing core vertical slice: JavaScript,
TypeScript, JSX, and TSX extraction in Rust, with the TypeScript shell still
owning resolution, dynamic synthesis, Explore, MCP, installer behavior, and
release orchestration.

Phase 5 classified the reference-resolution blocker as `still unresolved`.
The large-target evidence was validated on a large VS Code JS/TS sparse
checkout. It showed that the remaining bottleneck is not Rust parse extraction;
it is TypeScript finalization, specifically `referenceResolutionMs`, with
`nameMatchingMs` and `perReferenceDisambiguationMs` as the clearest subpaths.

That evidence makes a default-rollout readiness plan premature. It also makes a
direct resolver rewrite premature. Phase 6 therefore focuses on finishing the
current Rust indexing slice and producing better evidence for whether an
end-to-end graph pipeline prototype is worth opening next.

## Non-Goals

- Do not make Rust the default index engine.
- Do not claim default rollout readiness.
- Do not expand Rust language coverage beyond JavaScript, TypeScript, JSX, and TSX.
- Do not migrate ReferenceResolver, name matching, framework resolvers,
  dynamic-dispatch synthesizers, graph traversal, MCP tools, Explore planning,
  or Explore rendering to Rust.
- Do not change graph semantics, edge kinds, unresolved-reference behavior, or
  Agent Sufficiency behavior to make metrics look better.
- Do not require Rust to beat TypeScript end-to-end in Phase 6.
- Do not require release/npm/package smoke by default unless a Phase 6 issue
  changes packaging, CLI engine selection, status diagnostics, Rust binary
  discovery, or release-bundle layout.
- Do not require zero parse errors on large real repositories.

## Scope

Phase 6 prioritizes:

1. Extraction semantic coverage.
2. Benchmark and diagnostic completeness.
3. Operational completeness.

The implementation order is A -> C -> B from the planning discussion:

- A: JS/TS/JSX/TSX Rust extraction coverage and semantic parity.
- C: diagnostics, benchmark attribution, snapshot comparison, and feasibility
  decision evidence.
- B: operational hardening for the opt-in Rust path.

## Hard Constraints

- Rust remains opt-in throughout Phase 6.
- The graph semantic schema remains stable. Phase 6 may add or extend durable
  diagnostic artifacts or metadata, but it must not change node, edge, or
  unresolved-reference semantics without a separate explicit migration
  decision.
- Any metadata addition must be non-disruptive for existing TypeScript readers.
- Agent Sufficiency must not regress.
- JS/TS semantic parity must not regress.
- A final large-target profile and sufficiency smoke are required, using the
  wording: validated on a large VS Code JS/TS sparse checkout.
- Completeness + minimum performance floor: Phase 6 does not require Rust to
  exceed TypeScript, but Rust engine wall time, `referenceResolutionMs`, and RSS
  should not regress materially, with a default investigation threshold of
  10-15% unless the issue records a concrete explanation and follow-up.

## Validation Matrix

### Semantic Coverage

Rust extraction coverage should be compared through semantic parity, not
byte-identical database output. The important facts are symbols, imports,
exports, calls, contains edges, unresolved references, components, class fields,
object-literal methods, and JS/TS/JSX/TSX file behavior that downstream
TypeScript resolution expects.

### Agent Sufficiency

Representative Explore sufficiency prompts must remain green. A faster or more
complete Rust index that increases generic Read/Grep fallback risk is a
regression.

### Large Target

Phase 6 requires one final profile and one final sufficiency smoke validated on
a large VS Code JS/TS sparse checkout.

The large-target gate records trend evidence. It does not require Rust to beat
TypeScript, and it does not authorize default rollout.

### Packaging And Release

Release/npm/package smoke is not a default Phase 6 gate. It becomes required
only for issues that change packaging, CLI engine selection, status diagnostics,
Rust binary discovery, or release-bundle layout.

## Success Classification

Phase 6 ends with exactly one classification:

- `ready for end-to-end prototype`: JS/TS Rust indexing completeness is strong
  enough, sufficiency stays green, operational risk is controlled, and the
  feasibility decision recommends a bounded Rust graph-pipeline prototype.
- `continue Rust indexing completeness`: the Rust indexing path improves, but
  coverage, diagnostics, or operational gaps remain before an end-to-end
  prototype is justified.
- `stop Rust expansion`: evidence shows that expanding Rust scope is not
  currently justified compared with improving the TypeScript resolver or other
  product work.
- `regressed`: semantic parity, Agent Sufficiency, failure safety, wall time,
  RSS, packaging safety, or maintainability regresses.

Phase 6 does not pass by claiming default rollout readiness. It passes by
making the opt-in JS/TS Rust indexing path more complete and by producing a
clear stop/continue/prototype decision.

## Issue Sequence

### 1. Phase 6 Plan And Doc Guardrails

- Write this Phase 6 plan.
- Add focused documentation tests that protect the Phase 6 positioning:
  JS/TS Rust indexing completeness, Rust remains opt-in, no default rollout
  claim, no Rust end-to-end graph migration during Phase 6, and validation on a
  large VS Code JS/TS sparse checkout.
- Create a Phase 6 tracker issue.

### 2. Extraction Semantic Coverage: Symbols And References

- Improve JS/TS/JSX/TSX Rust extraction coverage for symbol and reference facts
  that TypeScript downstream resolution expects.
- Focus on modules, exports, imports, unresolved references, class fields, and
  object-literal method facts where parity gaps are observable.
- Add semantic parity tests through public CLI/indexing seams.
- Do not change resolver semantics.

### 3. Extraction Semantic Coverage: Edges And Components

- Improve JS/TS/JSX/TSX Rust extraction coverage for graph-producing facts such
  as calls, contains edges, JSX/component facts, and edge prerequisites used by
  later TypeScript synthesis.
- Add semantic parity and sufficiency guardrails for the affected behavior.
- Do not migrate dynamic-dispatch synthesis to Rust in this phase.

### 4. Diagnostics, Benchmark Attribution, And Feasibility Decision

- Improve durable diagnostics and benchmark attribution enough to judge the
  Rust indexing path without ad hoc logs.
- Record final profile evidence, snapshot/parity interpretation, and sufficiency
  evidence.
- Write a Rust end-to-end graph pipeline feasibility decision that answers
  `go`, `no-go`, or `prototype-first`, and lists candidate migration boundaries
  such as name matcher only, reference resolver only, and dynamic synthesizers
  later.
- Do not implement the end-to-end Rust graph pipeline in this issue.

### 5. Operational Completeness Closeout

- Close operational gaps for the opt-in Rust indexing path that remain after the
  coverage and diagnostics slices.
- Run one final large VS Code JS/TS sparse-checkout profile and sufficiency
  smoke.
- Run package/release smoke only if the implementation changed packaging, CLI
  engine selection, status diagnostics, Rust binary discovery, or release-bundle
  layout.
- Write the Phase 6 results-and-decision document.
- Classify Phase 6 as `ready for end-to-end prototype`, `continue Rust indexing
  completeness`, `stop Rust expansion`, or `regressed`.

## Local Validation

Minimum validation for Phase 6 documentation-only work:

```bash
npx vitest run __tests__/rust-phase6-plan-doc.test.ts
git diff --check
```

Minimum validation for Phase 6 implementation work:

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-parity.test.ts
npx vitest run __tests__/rust-index-profile.test.ts
```

Implementation issues must additionally run their targeted parity/sufficiency
tests and any final large-target profile or sufficiency smoke required by their
acceptance criteria.

## Agent Handoff Notes

- Keep Phase 6 scoped to JS/TS/JSX/TSX Rust indexing completeness.
- Treat end-to-end Rust graph pipeline migration as a future feasibility
  decision, not an implementation task in Phase 6.
- Preserve graph semantics and Agent Sufficiency.
- Keep Rust opt-in.
- Do not turn large-target trend evidence into a default rollout claim.
