# Rust-Hybrid Reference-Resolution Cleanup / Edge-Write Optimization Plan

Date: 2026-06-25

Roadmap node:
`1-8-5. Reference-resolution cleanup / edge-write bounded optimization`

## Goal

Attempt one bounded optimization in the measured reference-resolution cleanup /
edge-write cluster for the default `rust-hybrid` path.

The optimization hypothesis is narrow:

`Reduce repeated DB round trips in terminal unresolved-ref cleanup and edge-write work without changing graph semantics.`

## Inputs

- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-diagnostic-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-diagnostic-result.json`
- `docs/benchmarks/baseline-indexing-performance-v1.md`
- `docs/benchmarks/graph-semantics-guardrail-v1.md`
- `docs/benchmarks/baseline-agent-sufficiency-v1.md`

## Scope

Allowed:

- reference-resolution finalization helper changes;
- query helper changes for batch SQL, transaction boundaries, prepared
  statement reuse, or rowid-range cleanup;
- deterministic unit/integration tests around edge insertion and
  unresolved-reference cleanup behavior;
- benchmark runner/result/closeout documentation.

Forbidden:

- database schema or index changes;
- resolver target-selection semantics;
- edge/ref classification changes;
- fallback taxonomy behavior changes;
- extraction behavior changes;
- MCP or Explore output changes;
- dynamic dispatch synthesis changes;
- candidate lookup/cache optimization work.

## Candidate Boundary

This slice includes:

- `edgeWriteMs`
- `edgeWriteDbMs`
- `edgeInsertCount`
- `unresolvedCleanupMs`
- `unresolvedCleanupDbMs`
- `resolvedCleanupMs`
- `resolvedCleanupDbMs`
- `resolvedCleanupRowCount`
- `intentionallyUnresolvedCleanupMs`
- `intentionallyUnresolvedCleanupDbMs`
- `intentionallyUnresolvedCleanupRowCount`
- cleanup ownership diagnostics

This slice excludes:

- broader `databaseAccessMs`;
- candidate lookup/cache;
- semantic disambiguation;
- dynamic dispatch synthesis;
- Rust parse/extraction and SQLite write.

## Current Evidence

From the diagnostic closeout:

| Bucket | Median |
| --- | ---: |
| unresolved cleanup | `215 ms` |
| edge write | `138 ms` |
| resolved cleanup | `114 ms` |
| intentionally unresolved cleanup | `101 ms` |
| edge insert count | `16358` |
| resolved cleanup row count | `16358` |
| intentionally unresolved cleanup row count | `31569` |

The cluster is large enough to try one bounded optimization, but not large
enough to justify schema changes or broad resolver redesign.

## Verification Contract

Required:

- current-repo before/after baseline, 3 runs each;
- VS Code sparse and Excalidraw only if their configured paths are valid Git
  checkouts;
- wall time and RSS or unavailable reason;
- profile tail buckets before/after;
- graphStats classification;
- fallback taxonomy classification;
- cleanup ownership and unresolved/intentionally unresolved row-count evidence.

Success:

- at least one cleanup/edge-write sub-bucket shows a credible improvement trend;
- graphStats are stable or changed only in an expected, explained way;
- fallback taxonomy is stable or changed only in an expected, explained way;
- RSS is recorded or has a clear unavailable reason.

No-go:

- no credible cleanup/edge-write improvement appears;
- graphStats or fallback taxonomy moves unexpectedly;
- RSS is missing without an unavailable reason;
- the implementation requires schema, semantic resolver, or extraction changes;
- the optimization drifts into candidate lookup/cache, dynamic dispatch, or
  broad database access work.

Agent Sufficiency:

- not required if the implementation is graph-invisible and preserves resolver
  semantics, Explore/MCP output, extraction, and user-facing sufficiency claims;
- required if any of those boundaries move.

## Issue Breakdown

### 1. Lock cleanup / edge-write optimization plan and contract

Write and commit this plan, update roadmap node `1-8-5`, and keep the
optimization contract narrow.

Acceptance:

- plan exists in `docs/plans/`;
- roadmap node `1-8-5` points to the plan;
- contract explicitly excludes schema, resolver semantics, extraction, dynamic
  dispatch, and candidate lookup/cache;
- no production code change is included in this planning issue.

### 2. Implement one cleanup / edge-write DB round-trip optimization

Use TDD to implement exactly one bounded optimization candidate under this
plan. The implementation must preserve graph-visible behavior.

Acceptance:

- deterministic tests cover the optimized behavior through public or existing
  helper interfaces;
- graph-visible row shape, edge kind, edge origin, metadata, cleanup ownership,
  and fallback taxonomy behavior are preserved;
- implementation stays within reference-resolution finalization/query helper
  code;
- no database schema or resolver semantic changes are included.

### 3. Measure and close out cleanup / edge-write optimization

Run the required before/after evidence and write a durable closeout.

Acceptance:

- current-repo before/after baseline has 3 runs per side;
- valid real repo corpora run once, invalid/missing corpora record
  `needs-human-setup`;
- closeout records wall time, RSS or unavailable reason, tail bucket movement,
  graphStats classification, fallback taxonomy classification, and final
  classification: `keep`, `no-go`, `diagnostic-only`, or `needs-human-review`;
- roadmap node `1-8-5` is updated with the result.

## Non-Goals

- Do not claim plan-level 10% performance success unless the evidence actually
  supports it.
- Do not optimize multiple unrelated candidates in one issue.
- Do not treat row-count reduction as success unless graph semantics and
  fallback taxonomy prove it is expected and safe.
- Do not require VS Code sparse or Excalidraw when their configured paths are
  not valid Git checkouts.
