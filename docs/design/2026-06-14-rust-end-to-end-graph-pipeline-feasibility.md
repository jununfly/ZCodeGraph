# Rust End-To-End Graph Pipeline Feasibility Decision

Date: 2026-06-14

Decision: `prototype-first`.

Rust remains opt-in. Phase 6 does not implement the end-to-end Rust graph pipeline.
This decision records whether a later plan should prototype a narrower Rust
graph-production boundary after JS/TS Rust indexing completeness work.

## Context

The Rust indexing core vertical slice currently moves JS/TS/JSX/TSX parse and
initial SQLite index writing into Rust while keeping the TypeScript product
shell responsible for reference resolution, framework resolvers,
dynamic-dispatch synthesizers, graph traversal, MCP tools, Explore planning,
and Explore rendering.

Phase 5 showed that the remaining large-target blocker is not Rust parse
extraction. The final Phase 5 evidence was validated on a large VS Code JS/TS sparse checkout and still showed `referenceResolutionMs` as the dominant
TypeScript finalization subphase. The largest subpaths were `nameMatchingMs`,
`databaseAccessMs`, and `perReferenceDisambiguationMs`.

Phase 6 issue #100 and #101 improved JS/TS Rust extraction completeness for:

- TypeScript enum symbol extraction.
- HOF-wrapped class-field method detection and the resulting method-sourced
  call edges.

These slices improve the confidence that Rust can produce the initial JS/TS
semantic facts expected by the existing TypeScript shell, but they do not change
the Phase 5 conclusion: default rollout remains blocked until the graph
production bottleneck is addressed.

## Decision

The next end-to-end Rust graph pipeline step should be `prototype-first`, not
`go` and not `no-go`.

Reasons:

- `go` would be too broad. Migrating ReferenceResolver, framework resolvers,
  name matching, dynamic synthesis, and Explore-facing graph semantics all at
  once would create a high Agent Sufficiency regression risk.
- `no-go` would be premature. Phase 5 made the bottleneck visible, and Phase 6
  completeness work is reducing extraction parity uncertainty.
- A bounded prototype can test whether moving a narrow graph-production boundary
  to Rust gives clearer performance attribution without committing to a full
  migration.

## Candidate Migration Boundaries

Preferred prototype order:

1. `name matcher only`: prototype the name matching and candidate scoring path
   against the same inputs and outputs as the TypeScript resolver. This targets
   the dominant `nameMatchingMs` and `perReferenceDisambiguationMs` evidence
   while keeping framework and dynamic-dispatch behavior in TypeScript.
2. `reference resolver only`: only consider this if the name-matcher prototype
   shows a clear semantic and performance path. This boundary is larger because
   imports, framework claims, language gates, and edge-kind choices become part
   of the migrated surface.
3. `dynamic synthesizers later`: defer dynamic-dispatch synthesis migration
   until static reference resolution has a proven Rust boundary. Synthesizers
   are Agent Sufficiency-sensitive and should not be moved as part of the first
   prototype.

Rejected for the next plan:

- Full end-to-end Rust graph pipeline migration in one phase.
- Default rollout readiness.
- Expanding Rust language coverage beyond JavaScript, TypeScript, JSX, and TSX
  as a proxy for solving the JS/TS graph-production bottleneck.

## Prototype Requirements

A future prototype plan should:

- Keep Rust opt-in.
- Preserve graph semantics and Agent Sufficiency.
- Use semantic snapshots rather than byte-identical database parity.
- Define an explicit TypeScript/Rust boundary with stable inputs and outputs.
- Compare the prototype on reduced fixtures and at least one large VS Code JS/TS
  sparse-checkout profile.
- Report whether `nameMatchingMs`, `perReferenceDisambiguationMs`, and total
  `referenceResolutionMs` move enough to justify a larger migration.

## Stop Conditions

Stop or return to TypeScript resolver optimization if:

- The prototype requires weakening per-reference disambiguation semantics.
- Agent Sufficiency regresses.
- The prototype cannot produce comparable semantic snapshots.
- Large-target trend evidence does not improve the dominant finalization
  subpaths enough to justify the added maintenance boundary.
