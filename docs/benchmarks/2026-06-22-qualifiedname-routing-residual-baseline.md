# QualifiedName Routing Residual Baseline

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-22-rust-hybrid-qualifiedname-routing-semantic-residual-audit.md`
- Issue: #420

## Baseline Decision

`QualifiedName` candidate-producer routing is already implemented as a guarded
on-demand routing shape. PlanB-1 should audit it as a resolver semantic
residual rather than reimplementing routing.

This baseline is evidence-only by default. Production code may change only if
the audit cannot be completed with current diagnostics or deterministic tests.

## Current Routing Surface

The candidate protocol currently has these routing surfaces:

- pre-collected Rust candidate producer lookups:
  - `ExactName`
  - `KnownNamePresence`
  - `LowerName`
- on-demand Rust candidate producer node lookups:
  - `LowerName`
  - `QualifiedName`
  - `FileNodes`
- routed exact-name lookup:
  - `ExactName`

`QualifiedName` is routed through the on-demand node lookup path. If routing is
active and the lookup misses the local cache, the provider asks the Rust
candidate producer for one `QualifiedName` key, hydrates returned node ids, and
compares the returned id set against the TypeScript baseline lookup before
serving it.

## Fail-Closed Contract

`QualifiedName` routing must fail closed to the TypeScript baseline when any of
these occur:

- local config disables candidate-producer routing;
- index path is missing;
- Rust producer fails;
- Rust producer returns invalid or incomplete data;
- Rust result for the requested `QualifiedName` is missing;
- returned node ids cannot be hydrated;
- Rust candidate id set differs from the TypeScript baseline candidate id set.

When fail-closed behavior triggers, the resolver must preserve TypeScript
target selection semantics.

## Diagnostics Contract

The audit must record:

- `candidateProtocol.rustCandidateProducer.routing.configured`
- `candidateProtocol.rustCandidateProducer.routing.source`
- `candidateProtocol.rustCandidateProducer.routing.active`
- `candidateProtocol.rustCandidateProducer.routing.activeShapes`
- `candidateProtocol.rustCandidateProducer.routing.fallbackReason`
- `candidateProtocol.rustCandidateProducer.routing.mismatchCount`
- `candidateProtocol.rustCandidateProducer.routing.mismatchSamples`
- `candidateProtocol.rustCandidateProducer.routing.onDemandLookupCount`
- `candidateProtocol.rustCandidateProducer.routing.onDemandLookupShapeCounts.QualifiedName`
- fallback taxonomy entries
- graph-readable status or unavailable reason
- RSS or unavailable reason

## Out Of Scope

This audit must not change:

- whether a reference resolves;
- which target node id is selected;
- edge kind semantics;
- confidence semantics;
- `resolvedBy` semantics;
- package resolution;
- framework post-extract behavior;
- dynamic-dispatch synthesis;
- SQLite schema;
- source-order, pick-first, or broad disambiguation behavior.

## Gates

`keep`:

- `QualifiedName` routing is exercised, or evidence shows it is cleanly
  irrelevant for the current targets;
- mismatch count is zero or fully explainable through fail-closed behavior;
- fallback taxonomy stays visible and explainable;
- graph-readable status is preserved;
- no resolver semantic behavior changes are needed.

`no-go`:

- `QualifiedName` routing is safe but not useful enough to count as a meaningful
  residual slice;
- shape usage is too rare or unrelated to the remaining residuals;
- diagnostics are sufficient to make that call without architecture work.

`needs-architecture`:

- current diagnostics cannot prove parity;
- the shape needs broader disambiguation, package resolution, or source-order
  tie-break behavior;
- fail-closed behavior cannot distinguish safe mismatch from a missing protocol
  contract.

## Baseline Read

Prior complete-routing boundary evidence already showed `QualifiedName`
on-demand routing can run safely behind local config:

- current repo: `onDemandLookupShapeCounts.QualifiedName = 320`, mismatch `0`;
- VS Code sparse: `onDemandLookupShapeCounts.QualifiedName = 445`, mismatch `0`.

PlanB-1 still requires fresh targeted evidence because the goal is to decide
whether `QualifiedName` should count as a kept resolver semantic residual slice
in the post-PlanA route.

