# ZJ-0002: Move finalization and reference resolution toward Rust ownership

## Status

Accepted

## Context

The `rust-hybrid` index path already uses Rust for source scanning,
parse/extraction, graph writes, and several narrow reference-resolution slices,
but the largest remaining end-to-end cost is still the TypeScript-owned
finalization/reference-resolution tail. Benchmark evidence shows that local
SQLite/write-path optimizations can help, while repeated local A/B patches do
not resolve the architectural boundary between Rust-owned graph facts and the
TypeScript product shell.

Supporting evidence:

- `docs/benchmarks/2026-06-19-rust-hybrid-optimization-big-picture-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`
- `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- #296 resolver migration decision plan
- #301 historical benchmark decision ADR migration cleanup

## Decision

Move ZCodeGraph toward **Rust-owned finalization/reference-resolution with a
narrow protocol boundary to the TypeScript product shell**.

The TypeScript shell remains responsible for product orchestration: CLI/SDK
lifecycle, fallback planning, status/doctor packaging, MCP surfaces, and
compatibility glue. It should not remain the long-term owner of high-volume
resolver database work once that work has a validated Rust-owned or
protocol-owned boundary.

The first migration slice is **candidate lookup/cache protocol**. This slice
may change how candidate sets are collected, cached, transported, and measured,
but it must not migrate or alter every-reference disambiguation decisions.

Disambiguation execution remains TypeScript-owned until candidate availability
equivalence, replay diagnostics, fallback taxonomy, graphStats, profile
evidence, and representative corpus evidence are strong enough to justify a
separate migration plan.

Framework post-extract and dynamic-dispatch synthesis remain in the long-term
migration target, but they are deferred and must be split by framework or
mechanism. They must not be bundled into the first candidate lookup/cache
slice.

## Consequences

- Resolver migration is treated as an architecture program, not another bounded
  performance patch.
- Benchmark artifacts remain supporting evidence; durable ownership decisions
  belong in `docs/zj-adr/`.
- `docs/benchmarks/` should continue to hold raw profiles, A/B results,
  current-state maps, and closeout evidence.
- The first implementation slice must preserve existing graph semantics and
  user-visible behavior.
- Future agents should not "complete" this decision by moving broad
  disambiguation, framework synthesis, or dynamic-dispatch synthesis in the
  same slice as candidate lookup/cache.

## Alternatives considered

### Keep finalization/reference resolution TypeScript-owned and optimize DB access locally

Rejected as the long-term direction. It may still be useful for bounded
fallback optimizations, but it preserves the architectural tail that current
profiles identify as the dominant remaining bottleneck.

### Migrate broad disambiguation directly to Rust

Rejected as the first slice. It targets the real long-term direction, but it
mixes performance optimization with graph semantic migration before candidate
equivalence and replay evidence are strong enough.

### Move all benchmark decisions into ADRs

Rejected. Most benchmark documents are experiment evidence, not durable
architecture decisions. #301 tracks a separate cleanup to promote only
architecture-level benchmark decisions into ADRs and update references.

