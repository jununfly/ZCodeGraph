# Guarded One-Hop Re-Export Edges Closeout

Date: 2026-06-23

## Scope

Completed roadmap node `1-7-3. one-hop re-export edges` for the bounded
repo-local named re-export slice.

Implemented sub-nodes:

```text
[x] 1-7-3. one-hop re-export edges (bounded repo-local named re-export)
  [x] 1-7-3-1. import-through-barrel guarded write
  [x] 1-7-3-2. export-through-barrel guarded write
```

Deferred sub-nodes remain explicit in the roadmap:

```text
[ ] 1-7-3-3. export star re-export semantics
[ ] 1-7-3-4. default re-export semantics
[ ] 1-7-3-5. namespace re-export semantics
[ ] 1-7-3-6. package/node_modules re-export semantics
[ ] 1-7-3-7. multi-hop re-export semantics
```

## Implemented

- Import-through-barrel guarded writes now resolve bounded repo-local named
  one-hop re-exports to the leaf exported symbol.
- Export-through-barrel guarded writes now resolve bounded repo-local named
  one-hop re-exports to the leaf exported symbol.
- One-hop candidate rows carry their leaf file path so the guarded writer can
  validate the actual target file instead of the barrel file.
- Export-side one-hop resolutions are reflected in
  `esmOneHopReexportResolvedRefs`.
- The slice remains intentionally bounded to one repo-local named re-export hop.

## Excluded

- `export * from` semantics;
- default re-export semantics;
- namespace re-export semantics;
- package or `node_modules` re-export semantics;
- multi-hop re-export chains;
- exported alias surface semantics beyond the left-side source symbol name;
- type-only expansion.

## Evidence

Rust core:

```text
cargo test -p zcodegraph-core
```

Result:

```text
75 passed
```

Build:

```text
npm run build
cargo build -p zcodegraph-core
```

Current-repo rust-hybrid profile smoke:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-23-guarded-one-hop-reexport-edges-current-repo.profile.json \
node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed edge-write distribution:

```json
{
  "attempted": 715,
  "written": 715,
  "skipped": 0,
  "skippedCounts": {},
  "sampleCap": {
    "perBucket": 100,
    "total": 2000,
    "truncated": false
  }
}
```

Observed one-hop re-export resolutions:

```json
{
  "esmOneHopReexportResolvedRefs": 294
}
```

Observed fallback taxonomy included:

```json
{
  "direct-export-candidate-zero": 65,
  "export-target-file-not-found": 68,
  "import-edge-target-not-found": 7,
  "package-or-runtime-binding": 1307,
  "type-only-import": 228,
  "unsupported-import-shape": 329
}
```

The Node 26 warning appeared during the smoke and was bypassed with
`CODEGRAPH_ALLOW_UNSAFE_NODE=1`, as expected for this local environment.

## Decision

`1-7-3. one-hop re-export edges` is complete for bounded repo-local named
import-through-barrel and export-through-barrel guarded graph writing.

The next guarded graph-writing work should continue at `1-7-4. rollback/no-go
when parity is weak`, or move to an explicit deferred sub-node if one of the
remaining re-export semantic gaps is promoted.
