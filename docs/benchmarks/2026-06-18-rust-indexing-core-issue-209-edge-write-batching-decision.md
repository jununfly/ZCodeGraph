# Issue #209 Edge Write Batching A/B Decision

Date: 2026-06-18

## Decision

#209 completed one bounded TypeScript finalization resolved-edge write A/B.

Decision: keep the implementation as a low-risk cleanup of the finalization write path, but do not continue optimizing this candidate as the next #165 path without a new hypothesis that improves `edgeMaterializationDbMs + edgeWriteDbMs` together.

The post-PRD optimization gate remains open. This record does not claim Rust default rollout readiness.

## What Changed

- Added a prevalidated edge batch writer for callers that have already checked edge endpoints against the current `nodes` table.
- Kept the existing safe `insertEdges()` behavior for general callers; it still validates endpoints before writing.
- Changed TypeScript finalization persistence to validate endpoints during edge materialization and then write through the prevalidated batch writer.
- Kept resolver, name-matcher, and per-reference disambiguation semantics unchanged.
- SQLite schema is unchanged.
- Rust/TypeScript ownership boundaries are unchanged.

## Artifacts

- Consolidated cleanup evidence: `docs/benchmarks/2026-06-23-rust-indexing-core-issue-optimization-evidence-cleanup.md`
- Prior VS Code comparison: `docs/benchmarks/2026-06-18-rust-indexing-core-issue-206-finalization-diagnostics-decision.md`

## Validation

Commands run:

- `npm run build`
- `npx vitest run __tests__/db-perf.test.ts __tests__/resolution.test.ts -t "prevalidated|edge materialization|insertEdges endpoint validation"`
- `npx vitest run __tests__/db-perf.test.ts __tests__/resolution.test.ts __tests__/rust-name-matcher.test.ts __tests__/rust-index-profile.test.ts __tests__/rust-index-engine-cli.test.ts`
- Generated experiment commands are represented by the consolidated cleanup artifact above.

Focused tests passed. The broader focused suite passed: 5 files, 118 tests.

## Required Target Evidence

The ZCodeGraph required-target A/B used the same source checkout for before and after:

- before source: `/private/tmp/zcodegraph-issue209-baseline`
- after source: `/private/tmp/zcodegraph-issue209-baseline`
- source commit: `147271ec36eef0befe344c18de0b65d20bf1d0b8`

Excalidraw was unavailable as useful required-target evidence in this local environment because `/private/tmp/codegraph-corpus/excalidraw` contained no working-tree source files; both arms copied 0 files and produced 0 graph nodes.

| ZCodeGraph metric | Before | After | Direction |
|---|---:|---:|---|
| Sufficiency | passed | passed | unchanged |
| Rust total elapsed ms | 8051 | 7604 | better |
| Rust peak RSS bytes | 52297728 | 52150272 | better |
| graphStats files | 288 | 288 | unchanged |
| graphStats nodes | 14270 | 14270 | unchanged |
| graphStats edges | 30083 | 30083 | unchanged |
| referenceResolutionMs | 352 | 362 | worse |
| edgeMaterializationDbMs | 2 | 10 | worse |
| edgeWriteDbMs | 60 | 53 | better |
| unresolvedCleanupDbMs | 117 | 121 | worse |

Interpretation: the targeted `edgeWriteDbMs` bucket improved on ZCodeGraph, while the endpoint validation work moved into `edgeMaterializationDbMs`. GraphStats and sufficiency stayed unchanged.

## VS Code Sparse Evidence

The final stress smoke ran on the validated VS Code sparse checkout:

- path: `/private/tmp/codegraph-corpus/vscode-sparse`
- commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- dirty: false
- copied files per arm: 11518
- sufficiency: passed

| VS Code metric | #206 prior | #209 after | Direction |
|---|---:|---:|---|
| Rust total elapsed ms | 567944 | 562847 | better |
| Rust peak RSS bytes | 46071808 | 45776896 | better |
| referenceResolutionMs | 85127 | 84645 | better |
| edgeMaterializationDbMs | 259 | 1052 | worse |
| edgeWriteDbMs | 20167 | 19273 | better |
| unresolvedCleanupDbMs | 16135 | 16051 | better |

Interpretation: VS Code shows the same shape as the focused target. `edgeWriteDbMs` improves, but most of that improvement is offset by endpoint validation moving into `edgeMaterializationDbMs`. The combined materialization plus write bucket is effectively flat.

## Keep Rationale

Keep this implementation because:

- it preserves graph semantics in focused integration coverage;
- it keeps the default `insertEdges()` endpoint validation contract for general callers;
- it removes duplicated endpoint validation from the finalization write call itself;
- it produces modest positive direction in the targeted `edgeWriteDbMs` bucket on ZCodeGraph and VS Code sparse;
- it does not change SQLite schema, resolver semantics, or Rust ownership.

Do not continue this exact candidate as the next #165 optimization path because:

- the improvement is mostly a bucket shift from `edgeWriteDbMs` to `edgeMaterializationDbMs`;
- required-target evidence is incomplete because Excalidraw is locally unavailable as a useful corpus;
- the post-PRD gate remains far from closed;
- the next optimization should evaluate combined segment cost, not a single shifted bucket.

## Follow-up Guidance

#165 should remain open. The next optimization selection should use fresh end-to-end evidence and treat `edgeMaterializationDbMs + edgeWriteDbMs` as a combined segment if it revisits finalization writes.

No Rust default rollout readiness is claimed.
