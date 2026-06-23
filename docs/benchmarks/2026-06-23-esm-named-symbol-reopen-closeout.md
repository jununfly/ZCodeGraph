# ESM Named Symbol Reopen Closeout

Date: 2026-06-23

Roadmap node: `1-7-2. ESM named symbol edges`

## Scope

Closed the reopened `1-7-2` node for bounded repo-local value graph semantics.

Completed implementation and policy issues:

```text
[x] #464 import local alias usage edge
[x] #466 type-only no-value-edge policy
[x] #468 default import to direct default export
[x] #472 repo-local package-resolved named symbol edges
[x] #473 default re-export implementation
[x] #474 namespace export file-level dependency fixture
```

Completed semantic boundary decisions:

```text
[x] #465 export alias surface modeling decision
[x] #467 default re-export surface semantics
[x] #469 namespace export/re-export surface semantics
[x] #470 namespace import module/file dependency policy
[x] #471 node_modules/third-party package indexing boundary
```

## Decisions

- Graph edges target source/implementation symbols, not first-class exported
  surface alias nodes.
- Type-only import/export bindings do not write value graph symbol edges.
- Default imports and bounded default re-exports resolve to direct repo-local
  default-exported implementation symbols.
- Namespace import/export forms stay at file/module dependency semantics in
  this closeout; member-level namespace symbol resolution is deferred.
- Repo-local package-resolved named symbols are in scope; external
  package/runtime/builtin symbols and `node_modules` indexing are out of scope.

## Deferred

- Future type graph semantics.
- First-class export surface graph modeling.
- Namespace member-level symbol resolution.
- Third-party package / `node_modules` symbol indexing.

These remain outside the bounded `1-7-2` closeout and should be promoted
through separate plans if needed.

## Evidence

Rust core:

```text
cargo test -p zcodegraph-core

Result: passed, 79 tests.
```

Build:

```text
npm run build
cargo build -p zcodegraph-core

Result: passed.
```

Current repo rust-hybrid profile smoke:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-23-esm-named-symbol-reopen-current-repo.profile.json \
node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid

Result: passed. The local Node 26 warning was bypassed with
CODEGRAPH_ALLOW_UNSAFE_NODE=1, as expected for this environment.
```

Observed current-repo ESM named import/export profile:

```json
{
  "resolved": 2518,
  "fallback": 2031,
  "oneHop": 293,
  "edgeWrite": {
    "attempted": 715,
    "written": 715,
    "skipped": 0,
    "skippedCounts": {}
  },
  "fallbackCounts": {
    "direct-default-export-candidate-zero": 23,
    "direct-export-candidate-zero": 65,
    "export-target-file-not-found": 68,
    "import-edge-target-not-found": 8,
    "package-or-runtime-binding": 1310,
    "type-only-import": 232,
    "unsupported-import-shape": 325
  },
  "fallbackSampleCap": {
    "perBucket": 100,
    "total": 2000,
    "truncated": true
  }
}
```

## Decision

`1-7-2. ESM named symbol edges` is complete for bounded repo-local value graph
semantics.
