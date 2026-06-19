# First-User Diagnostic Trust Cleanup Evidence

Date: 2026-06-19

Related issues: #282, #283, #284, #285, #286

## Summary

The diagnostic trust cleanup resolved the observed Rust-owned TypeScript parse
gap on `__tests__/explore-planner.test.ts`, aligned recovered parse-gap
reporting across CLI and `.zcodegraph/errors.log`, and updated the unsupported
Node.js warning to point at the current repository.

The final source-path closeout still reports `rust-hybrid` as degraded on this
repository, but only because of expected non-Rust-owned language fallback:

- `yaml`: 3 files through TypeScript fallback
- `rust`: 2 files through TypeScript fallback
- no current Rust-owned parse-gap file diagnostics

## Targeted Validation

Build:

```bash
npm run build
```

Result: pass.

Rust regression tests:

```bash
cargo test --package zcodegraph-core rust_index_accepts_typescript_import_type_queries
cargo test --package zcodegraph-core normalization_allocates_once_when_typescript_rewrites_are_needed
```

Result: pass.

Targeted CLI and doctor tests:

```bash
npx vitest run \
  __tests__/node-version-check.test.ts \
  __tests__/rust-index-engine-cli.test.ts \
  __tests__/rust-hybrid-doctor.test.ts
```

Result:

- 3 files passed
- 64 tests passed

## #282 Real-File Reproduction

Before the fix, indexing a temp project containing only
`__tests__/explore-planner.test.ts` produced:

```json
{
  "filesErrored": 1,
  "errors": [
    {
      "message": "parse error",
      "severity": "warning",
      "filePath": "__tests__/explore-planner.test.ts",
      "language": "typescript",
      "code": "rust-owned-parse-gap",
      "writtenByRust": false
    }
  ]
}
```

After the fix, the same real-file check produced:

```json
{
  "filesIndexed": 1,
  "filesErrored": 0,
  "nodesCreated": 356,
  "edgesCreated": 406,
  "errors": []
}
```

The syntax gap was TypeScript `import("...")` type queries in contexts not
previously normalized by the Rust parser shim:

- `as unknown as import("../src/index").default`
- `(name: string) => import("../src/types").Node[]`

## #286 Source-Path Closeout

Commands:

```bash
rm -rf .zcodegraph
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js init
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js status --json
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js doctor --engine rust-hybrid --bundle --last-run
```

`init` result:

- `Indexed 301 files`
- `15,394 nodes`
- `32,716 edges`
- `Rust-hybrid appended 5 TypeScript fallback files`
- `Fallback health: degraded`
- no `could not be parsed` message

`status --json` agrees with the CLI summary:

```json
{
  "engine": "rust-hybrid",
  "fallbackFileCount": 5,
  "fallbackState": "degraded",
  "fallbackMessage": "TypeScript fallback appended 5 non-Rust-owned supported file(s).",
  "fallbackReasonTaxonomy": {
    "language-level-typescript-fallback": 5
  },
  "fallbackByLanguage": {
    "yaml": 3,
    "rust": 2
  }
}
```

Doctor bundle:

```text
.zcodegraph/diagnostics/bundles/2026-06-19T13-23-29-970Z-last-run
```

Privacy scan:

```bash
rg -n "(/Users|/private|bilibili|ZCodeGraph|__tests__/|src/|github.com/colbymchenry|TOKEN|SECRET|password|authorization)" \
  .zcodegraph/diagnostics/bundles/2026-06-19T13-23-29-970Z-last-run
```

Result: no matches.

Per-file diagnostics:

```json
{
  "errors": [],
  "fallbackSummary": {
    "fallbackFileCount": 5,
    "fallbackState": "degraded",
    "fallbackReasonTaxonomy": {
      "language-level-typescript-fallback": 5
    }
  }
}
```

## Remaining Notes

`pendingFallbacks` still lists `rust-owned-parse-gap` as a capability class in
hybrid metadata even when the current run has no per-file parse-gap errors.
This is mildly confusing, but it did not block this closeout because
`fallbackReasonTaxonomy` and per-file diagnostics correctly show that the
current degradation is only expected language-level fallback.
