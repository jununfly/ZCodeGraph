# ZJ-0004: Use staged SQLite write paths for Rust indexing

## Status

Accepted

## Context

Rust indexing writes large numbers of files, nodes, edges, and FTS rows into
SQLite. Early benchmark phases showed that graph-write cost could dominate
large-corpus indexing, while active-index safety and schema compatibility still
had to be preserved.

Supporting evidence:

- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-current-state-decision-pack.md`

## Decision

Use staged SQLite write paths for Rust indexing, with production behavior based
on a failure-safe final-flush path and bounded bulk-write mechanics.

The durable direction is:

- write into a staging database before promoting the active index;
- keep an explicit debug/escape path where useful;
- preserve the existing SQLite schema unless a separate ADR changes it;
- batch or defer expensive maintenance such as FTS updates when evidence shows
  that doing so preserves graph semantics and improves the intended write
  segment;
- treat write-path wins as production candidates only when graphStats,
  sufficiency, fallback taxonomy, and RSS evidence remain acceptable.

## Consequences

- SQLite write-path work is a proven optimization family rather than a
  speculative direction.
- Write-path changes still require bounded evidence because improvements can
  move one bucket without closing end-to-end performance targets.
- Active-index safety and schema stability remain more important than a faster
  but less explainable write path.
- TypeScript finalization/reference resolution remains a separate architecture
  problem and is not solved by write-path optimization.

## Alternatives considered

### Write directly to the active index for speed

Rejected. It weakens failure-safety and makes partial-write behavior harder to
reason about.

### Treat in-memory final-flush as the default production path immediately

Rejected. It was useful as an experiment, but the production path should remain
failure-safe and evidence-driven rather than adopting the highest-variance
prototype by default.
