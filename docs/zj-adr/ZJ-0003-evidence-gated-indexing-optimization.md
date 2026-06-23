# ZJ-0003: Gate indexing performance changes with evidence artifacts

## Status

Accepted

## Context

Rust indexing and `rust-hybrid` performance work produced many plausible
optimization directions: SQLite write paths, parse/extraction, local reference
lookup, TypeScript finalization, candidate replay, edge writes, and cleanup.
Several candidates improved one bucket while leaving the end-to-end target
unchanged, and some diagnostic candidates were useful even when they were not
production optimization paths.

Supporting evidence:

- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- #165 post-release optimization tracker
- #301 historical benchmark decision ADR cleanup

## Decision

Indexing performance changes must be gated by local evidence artifacts before
they are treated as production direction.

The expected loop is:

- isolate the target bucket or architecture boundary;
- run a bounded before/after or diagnostic artifact;
- record graphStats, fallback taxonomy, sufficiency impact when relevant, RSS
  or unavailable reason, and the exact corpus/profile context;
- classify the outcome as keep, no-go, diagnostic-only, or prerequisite;
- keep GitHub issue operations outside the evidence tooling.

Weak, noisy, or negative results are valid outcomes when they improve the
decision map.

## Consequences

- Benchmark artifacts remain in `docs/benchmarks/` as supporting evidence.
- Durable architecture conclusions can be promoted into ADRs, but raw profiles,
  summaries, A/B closeouts, and smoke evidence should stay in `docs/benchmarks/`.
- Future optimization issues should not use intuition alone to select or keep a
  candidate when profile evidence is available.
- The evidence tooling may produce tracker-update drafts, but it must not call
  GitHub APIs, label issues, close issues, or require network access.

## Alternatives considered

### Continue hand-written optimization closeouts

Rejected. Hand-written comparisons made it too easy to overfit one artifact,
skip RSS or graphStats context, or continue patching the wrong bucket.

### Make the evidence tool manage GitHub issues

Rejected. Direct GitHub operations are part of the maintainer/agent workflow,
not the local performance-evidence contract.

