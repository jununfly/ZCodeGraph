# Rust-Hybrid Resolver Migration Closeout Decision

Date: 2026-06-20

Issue: #300

Parent plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`

Parent issue: #296

Related:

- #295 architecture/performance PRD
- #165 post-release optimization tracker
- #297 current-state architecture map
- #298 ownership classification
- #299 candidate lookup/cache first-slice plan
- #301 historical benchmark decision ADR migration cleanup
- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`

## Decision

Accept the resolver migration decision plan.

The route is:

```text
Current:
  TypeScript-owned finalization/reference-resolution tail

Target:
  Rust-owned finalization/reference-resolution
    with a narrow protocol boundary to the TypeScript product shell

First implementation slice:
  in-process TypeScript candidate lookup/cache protocol boundary
```

The first slice should define and validate candidate facts, lookup shapes,
unified-graph materialization, diagnostics, and candidate availability
equivalence. It must not migrate or alter every-reference disambiguation
decisions.

## Completed Decision Artifacts

### #297 Current-State Map

Artifact:

`docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`

Result:

- mapped the current `rust-hybrid` pipeline from Rust core output through
  TypeScript fallback append and TypeScript finalization;
- identified TypeScript-owned responsibilities;
- cited existing profile evidence instead of running a new large-corpus
  benchmark;
- separated repeated hydration/lookup facts from hypotheses;
- preserved the semantic guardrail for disambiguation decisions.

### #298 Ownership Classification

Artifact:

`docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`

Result:

- accepted ADR ZJ-0002 as the long-term architecture direction;
- classified migration domains by ownership target;
- chose candidate lookup/cache as protocol-owned first and Rust-owned later if
  evidence supports it;
- kept disambiguation TypeScript-owned until parity/replay/profile evidence
  justifies a separate migration plan;
- deferred framework post-extract and dynamic-dispatch synthesis by
  framework/mechanism.

### #299 First-Slice Plan

Artifact:

`docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md`

Result:

- defined the first slice as an in-process TypeScript protocol boundary;
- defined candidate fact shape;
- defined lookup shapes: `ExactName`, `LowerName`, `QualifiedName`,
  `FileNodes`, and `KnownNamePresence`;
- required materialization over the unified graph after Rust writes and
  TypeScript fallback append;
- defined profile diagnostics;
- defined candidate availability equivalence, no-go criteria, and implementation
  evidence requirements.

## How #295 Should Consume This Plan

#295 should proceed with candidate lookup/cache protocol as its
architecture-backed implementation slice.

This means #295's implementation phase should not start with:

- full resolver migration;
- broad disambiguation migration;
- framework post-extract migration;
- dynamic-dispatch synthesis migration;
- package/default/namespace/type-only import resolver expansion.

Instead, #295 should create implementation issues for a narrow candidate
lookup/cache protocol boundary that preserves existing disambiguation semantics.

## Next Implementation Issues To Create

Do not treat this list as already-created scope. These are the recommended next
issues after accepting #296.

1. Implement an in-process candidate lookup/cache protocol boundary.
   - Define candidate fact shape and lookup shape types.
   - Materialize over the unified graph after fallback append.
   - Keep existing TypeScript disambiguation decisions unchanged.

2. Add candidate protocol diagnostics and profile artifact fields.
   - Add `candidateProtocol` diagnostics.
   - Compare against existing candidate lookup and database-access fields.
   - Keep fields as profile diagnostics, not a long-term public API contract.

3. Add candidate availability equivalence tests.
   - Double-read baseline vs protocol candidate availability.
   - Cover exact-name, lower-name, qualified-name, file-nodes, known-name
     presence, mixed Rust/TypeScript fallback graph, and empty candidate sets.

4. Run targeted implementation evidence.
   - Before/after profile artifact.
   - VS Code sparse targeted profile.
   - graphStats comparison.
   - fallback taxonomy comparison.
   - RSS or unavailable reason.

5. Close out candidate lookup/cache protocol with keep / no-go / prerequisite.
   - If effective, use it as the first migration step toward Rust-owned
     resolver execution.
   - If no-go, choose among cleanup/edge-write/DB maintenance, import/export
     tail, local exact references, or broad disambiguation planning based on
     evidence.

## Semantic Guardrail

The first implementation slice may change how candidate sets are collected,
cached, transported, measured, or diagnosed.

It must not change:

- final target selection;
- confidence calculation;
- `resolvedBy` semantics;
- ranking/tie-break semantics;
- framework synthetic decisions;
- dynamic-dispatch synthesis decisions.

Every-reference disambiguation remains TypeScript-owned until a later migration
plan satisfies the preconditions in the ownership decision artifact.

## Tracker Implication

- #296 can be accepted as complete after this closeout.
- #295 should consume the accepted first-slice plan.
- #165 should remain open because this is an architecture route and first-slice
  plan, not performance target closure.
- #301 remains open as a separate documentation cleanup for historical
  benchmark decision artifacts.

