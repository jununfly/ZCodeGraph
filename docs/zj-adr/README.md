# ZJ ADR Index

Durable architecture decisions live here. Benchmark evidence, raw profiles,
smoke results, and A/B closeouts remain in `docs/benchmarks/`.

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

## Supporting Evidence

Use `docs/benchmarks/` for:

- raw experiment artifacts;
- generated summaries;
- before/after A/B records;
- smoke evidence;
- current-state maps;
- issue or phase closeout decisions.

Promote a benchmark decision into an ADR only when it is hard to reverse,
surprising without context, and the result of a real trade-off.
