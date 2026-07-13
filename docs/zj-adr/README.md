# ZJ ADR Index

Durable architecture decisions live here. Benchmark evidence, raw profiles,
smoke results, and A/B closeouts stay out of ADRs unless they produce a
long-lived decision that meets the ADR bar.

## Accepted ADRs

- `ZJ-0001-agent-sufficiency-as-architecture-north-star.md` — use Agent
  Sufficiency as the architecture north star.
- `ZJ-0002-rust-owned-finalization-reference-resolution.md` — move
  finalization/reference resolution toward Rust ownership with a narrow
  TypeScript product-shell protocol.
- `ZJ-0003-evidence-gated-indexing-optimization.md` — gate indexing performance
  changes with local evidence artifacts.
- `ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md` — use staged
  SQLite write paths for Rust indexing.
- `ZJ-0005-separate-durable-decisions-from-process-artifacts.md` — keep
  durable decisions separate from temporary benchmark/process artifacts.
- `ZJ-0006-lazy-sqlite-corruption-recovery.md` — lazy SQLite corruption
  detection and reopen for MCP daemon stale-handle recovery.
- `ZJ-0007-three-tier-fallback-health-state.md` — three-tier fallback health
  state (healthy/partial/degraded) to distinguish expected fallbacks from
  unexpected gaps.

## Supporting Evidence

Use `docs/benchmarks/` for durable benchmark artifacts:

- `baseline-*` files that define a repeatable standard and method;
- `*-result.*` files that record one complete run against a baseline;
- `tmp-*` files for temporary implementation-time measurements and
  issue-scoped keep/no-go notes that are not expected to outlive their tracker.

Promote a benchmark decision into an ADR only when it is hard to reverse,
surprising without context, and the result of a real trade-off.

Process-only artifacts that are useful only as issue or plan evidence should
prefer the lifecycle and scope of that issue, plan, or tracker. Once their useful
facts are absorbed by an ADR, PRD, roadmap, plan, or baseline/result artifact,
they should be consolidated and deleted rather than becoming a parallel source
of truth.
