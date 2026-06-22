# Guarded ESM Named Symbol Edge Write Closeout

Date: 2026-06-23

## Scope

Implemented guarded graph writing for Rust-owned direct ESM named import symbol
edges.

The guard runs after the existing resolver selects a target symbol candidate.
It does not change candidate lookup or disambiguation semantics. Per edge, it
fails closed when the selected target is weak and continues indexing.

## Implemented

- Added profile artifact diagnostics:
  - `esmNamedImportExportEdgeWriteAttemptedRefs`
  - `esmNamedImportExportEdgeWriteWrittenRefs`
  - `esmNamedImportExportEdgeWriteSkippedRefs`
  - `esmNamedImportExportEdgeWriteSkippedCounts`
  - `esmNamedImportExportEdgeWriteSkippedSamples`
  - `esmNamedImportExportEdgeWriteSkippedSampleCap`
- Added guarded write checks for:
  - missing target node;
  - target file mismatch;
  - unsupported candidate shape;
  - selected node kind mismatch.
- Routed direct named import symbol edge writes through the guard for:
  - direct export candidates;
  - overload implementation tie-breaks;
  - value-token interface tie-breaks.

## Explicit Gap

Direct named export edge writes are not completed in this slice.

The current Rust finalization path consumes `imports` unresolved refs. Direct
named exports such as `export { foo } from "./source"` are still stored as
`exports` unresolved refs for text reuse and are not routed through this symbol
edge-write path. The roadmap now tracks this as:

```text
[-] 1-7-2. ESM named symbol edges
  [x] 1-7-2-1. direct named import guarded write
  [ ] 1-7-2-2. direct named export guarded write (#463)
```

This avoids redefining `1-7-2` as complete before the export path exists.

## Evidence

Focused Rust core tests:

```text
cargo test -p zcodegraph-core
```

Result:

```text
71 passed
```

Build:

```text
npm run build
cargo build -p zcodegraph-core
```

Current-repo rust-hybrid profile smoke:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-23-guarded-esm-named-symbol-edge-write-current-repo.profile.json \
node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed profile distribution:

```json
{
  "attempted": 635,
  "written": 635,
  "skipped": 0,
  "skippedCounts": {},
  "sampleCap": {
    "perBucket": 100,
    "total": 2000,
    "truncated": false
  }
}
```

The Node 26 warning appeared during the smoke and was bypassed with
`CODEGRAPH_ALLOW_UNSAFE_NODE=1`, as expected for this local environment.

## Decision

This slice is sufficient for `1-7-2-1. direct named import guarded write`.

It is not sufficient to mark the parent `1-7-2. ESM named symbol edges` complete
because direct named export edge writes remain a separate implementation path.
