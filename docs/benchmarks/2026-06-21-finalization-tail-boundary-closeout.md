# Finalization Tail Boundary Closeout

Date: 2026-06-21

## Parent

- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Tracker: #411
- Issues: #407, #408, #409, #410
- Optimization tracker: #165

## Decision

Finalization Tail Boundary Plan completed.

#165 remains open as the durable post-release optimization tracker, but this
closeout moves #165 into implementation-sequence mode for the finalization tail.
Future work should proceed through bounded implementation issues and escalate
architecture only when implementation evidence exposes a new boundary problem.

## Completed Boundary Results

### #407 Ownership Matrix And Diagnostic Contract

Artifact:

- `docs/benchmarks/2026-06-21-finalization-tail-ownership-matrix.md`

Result:

- finalization tail responsibilities are classified;
- public diagnostic/profile fields are mapped to the responsibilities they
  explain;
- no new production profile field is required to complete the boundary plan;
- broad disambiguation and dynamic-dispatch synthesis are explicitly not
  migrated by the boundary plan.

### #408 Framework Post-Extract Boundary

Artifact:

- `docs/benchmarks/2026-06-21-framework-post-extract-boundary-contract.md`

Result:

- framework post-extract remains TypeScript-owned and deferred for migration;
- the ordering contract is extraction/fallback append -> post-extract ->
  reference resolution -> dynamic-dispatch synthesis -> maintenance;
- deterministic fixture coverage proves the final graph exposes the
  post-extract NestJS RouterModule route prefix before the graph is consumed.

### #409 Edge Write And Cleanup Boundary

Artifact:

- `docs/benchmarks/2026-06-21-edge-write-cleanup-ownership-boundary.md`

Result:

- target selection is separated from edge materialization, endpoint validation,
  edge write, and cleanup mechanics;
- future write/cleanup migration requires graph parity, edge-origin parity,
  profile attribution, and fail-closed rollback;
- no semantic routing or every-reference disambiguation behavior changes.

### #410 Unresolved Refs Lifecycle

Artifact:

- `docs/benchmarks/2026-06-21-unresolved-refs-lifecycle-contract.md`

Result:

- unresolved refs lifecycle states are defined: created, resolved,
  intentionally unresolved, unsupported, and stale;
- cleanup must fail closed when lifecycle state is unknown;
- unsupported/fallback evidence must not be silently deleted;
- Rust-owned slices, TypeScript fallback append, and TypeScript reference
  resolution interactions are documented.

## Deferred Boundaries

Dynamic-dispatch synthesis remains deferred because partial migration can
regress agent sufficiency.

Broad disambiguation remains deferred because every-reference target selection
requires separate parity and replay evidence.

Framework post-extract Rust migration remains deferred. The boundary is now
tested and documented, but hooks are not moved in this plan.

## Validation

Validation performed:

- `npx vitest run __tests__/finalization-tail-boundary-doc.test.ts`
- `npx vitest run __tests__/frameworks-integration.test.ts -t "applies RouterModule prefixes before the final graph is consumed"`

No new targeted profile was required. RSS was not newly collected because this
plan reused existing evidence and added deterministic boundary artifacts rather
than running new performance evidence.

## #165 State Transition

The finalization tail is no longer an open-ended architecture question.

#165 should now use implementation-sequence mode for this area:

1. Pick a bounded implementation issue from the completed boundary map.
2. Preserve every-reference disambiguation semantics unless a separate
   architecture decision changes them.
3. Require graphStats, fallback taxonomy, and profile evidence for production
   migration work.
4. Escalate only when implementation evidence exposes a new ownership,
   diagnostic, or semantic boundary problem.

This closeout does not close #165.
