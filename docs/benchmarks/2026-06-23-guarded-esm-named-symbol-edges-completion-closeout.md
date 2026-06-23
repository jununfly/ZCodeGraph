# Guarded ESM Named Symbol Edges Completion Closeout

Date: 2026-06-23

## Scope

Completed roadmap node `1-7-2. ESM named symbol edges` by adding the missing
direct named export guarded write path.

This follows the earlier direct named import guarded write slice and closes the
remaining sub-node:

```text
[x] 1-7-2. ESM named symbol edges
  [x] 1-7-2-1. direct named import guarded write
  [x] 1-7-2-2. direct named export guarded write (#463)
```

`1-7. Guarded graph writing` remains partial because one-hop re-export edges
and rollback/no-go policy are separate nodes.

## Implemented

- Added Rust-owned direct named export symbol edge writes for forms such as:

  ```ts
  export { foo } from "./source";
  export { foo as publicFoo, Bar } from "./source";
  ```

- Export symbol edges are written from the `export` node to the target symbol:

  ```text
  export node ("./source") --exports--> source symbol
  ```

- Alias exports intentionally resolve to the left-side source symbol name. This
  slice does not model exported alias surface semantics.
- Type-only export bindings are not written as symbol edges and remain
  taxonomy-visible as `type-only-export`.
- One-hop re-export/barrel traversal remains out of scope for this node and is
  classified as `export-edge-one-hop-out-of-scope`.
- The edge-write diagnostics reuse the existing
  `esmNamedImportExportEdgeWrite*` profile fields. Export skipped samples use
  `referenceKind: "exports"`.

## Evidence

Rust core:

```text
cargo test -p zcodegraph-core
```

Result:

```text
73 passed
```

Build:

```text
npm run build
cargo build -p zcodegraph-core
```

Current-repo rust-hybrid profile smoke:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-23-guarded-esm-named-symbol-edges-completion-current-repo.profile.json \
node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed edge-write distribution:

```json
{
  "attempted": 688,
  "written": 688,
  "skipped": 0,
  "skippedCounts": {},
  "sampleCap": {
    "perBucket": 100,
    "total": 2000,
    "truncated": false
  }
}
```

Observed fallback taxonomy included:

```json
{
  "direct-export-candidate-zero": 65,
  "export-edge-one-hop-out-of-scope": 11,
  "export-target-file-not-found": 68,
  "type-only-import": 228
}
```

The Node 26 warning appeared during the smoke and was bypassed with
`CODEGRAPH_ALLOW_UNSAFE_NODE=1`, as expected for this local environment.

## Decision

`1-7-2. ESM named symbol edges` is complete for bounded direct named
import/export guarded graph writing.

The next guarded graph-writing work should continue at `1-7-3. one-hop
re-export edges` or `1-7-4. rollback/no-go when parity is weak`, not reopen the
direct named import/export edge-write slice unless a regression is found.
