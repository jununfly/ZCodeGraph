# ESM Named Symbol Ready-For-Agent Closeout

Date: 2026-06-23

## Scope

Closed the ready-for-agent implementation and policy slices under reopened
roadmap node `1-7-2. ESM named symbol edges`.

Completed:

```text
[x] 1-7-2-3-1. import local alias usage edge (#464)
[x] 1-7-2-4-1. type-only no-value-edge policy (#466)
[x] 1-7-2-5-1. default import to direct default export (#468)
[x] 1-7-2-6-1. repo-local package-resolved named symbol edges (#472)
```

Remaining human semantic boundary work:

```text
[ ] 1-7-2-3-2. export alias surface modeling decision (#465)
[ ] 1-7-2-5-2. default re-export surface semantics (#467)
[ ] 1-7-2-5-3. namespace import module/file dependency policy (#470)
[ ] 1-7-2-5-4. namespace export/re-export surface semantics (#469)
[ ] 1-7-2-6-2. node_modules/third-party package indexing boundary (#471)
```

## Implemented

- Named import local aliases now resolve local usage references back to the
  imported source symbol:

  ```ts
  import { beta as localBeta } from "./source";
  localBeta();
  ```

- Type-only named imports and exports remain taxonomy-visible but do not write
  value graph symbol edges.
- Direct default imports now resolve to direct repo-local default-exported
  function/class symbols:

  ```ts
  import localRun from "./source";
  localRun();
  ```

- Repo-local package-resolved named imports are covered by deterministic
  fixtures for package self-name/package imports targets. External package and
  runtime bindings remain fallback/no-go taxonomy.

## Excluded

- Export alias surface name modeling.
- Default re-export surface semantics.
- Namespace import member semantics.
- Namespace export/re-export surface semantics.
- Third-party package or `node_modules` symbol indexing.
- Future type graph semantics.

## Evidence

Targeted Rust core tests:

```text
cargo test -p zcodegraph-core rust_index_preserves_js_ts_import_export_binding_refs_for_text_reuse
cargo test -p zcodegraph-core rust_index_writes_guarded_default_import_to_direct_default_export_edges
cargo test -p zcodegraph-core rust_index_writes_guarded_repo_local_package_named_symbol_edges
```

Full verification:

```text
cargo test -p zcodegraph-core
npm run build
cargo build -p zcodegraph-core
```

Current repo profile smoke:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-23-esm-named-symbol-ready-agent-current-repo.profile.json \
node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
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

The Node 26 warning appeared during the smoke and was bypassed with
`CODEGRAPH_ALLOW_UNSAFE_NODE=1`, as expected for this local environment.

## Decision

The ready-for-agent implementation path for the reopened `1-7-2` node is
complete once the verification commands above pass.

`1-7-2` itself remains open until the ready-for-human semantic boundary issues
have durable decisions or no-go/deferred conclusions.
