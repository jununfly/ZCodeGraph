# Rust Macro Cfg Diagnostic Hardening Evidence

Date: 2026-06-27

## Scope

This implements and validates `Macro/cfg diagnostic hardening v1`, tracked by #598-#601.

Included:

- Clearer macro/cfg result/profile taxonomy.
- Macro-affected parsed item taxonomy for `impl`, `trait`, `mod`, and route-like functions.
- Generated-code no-go taxonomy for detectable `include!`, `OUT_DIR`, and `build.rs` patterns.
- Deterministic fixture coverage.
- mini-redis smoke evidence.

Not included:

- Macro expansion.
- cfg expression evaluation.
- Generated source loading.
- build script execution.
- Default graph write changes.
- Agent A/B or performance gates.

## Deterministic Fixtures

Command:

```bash
cargo test -p zcodegraph-core rust_core_ -- --nocapture
```

Result: passed, 15 Rust core tests.

Primary fixture:

- `rust_core_classifies_macro_taxonomy_without_writing_macro_graph_edges`

Covered behavior:

- Baseline macro/cfg taxonomy is exposed through `rustMacroTaxonomyCounts`.
- `#[cfg]` and `#[cfg_attr]` record `conditionally-present-ast-deferred`.
- Attribute/macro affected `impl`, `trait`, `mod`, and route-like functions record affected-item taxonomy.
- Function-like macro invocations record `opaque-macro-invocation-deferred`.
- Derive/proc/function-like macro patterns record `macro-generated-missing-item-deferred`.
- `include!`, `OUT_DIR`, and `build.rs` record generated-code no-go taxonomy.
- SQLite confirms no generated macro semantic edges or route nodes are written by the diagnostic slice.

## Full Core Regression

Command:

```bash
cargo test -p zcodegraph-core
```

Result: passed, 96 tests.

## mini-redis Deterministic Smoke

Corpus: `/private/tmp/codegraph-corpus/mini-redis`

Command:

```bash
rm -rf /private/tmp/codegraph-corpus/mini-redis/.zcodegraph
target/debug/zcodegraph-core index \
  --project-path /private/tmp/codegraph-corpus/mini-redis \
  --index-path /private/tmp/codegraph-corpus/mini-redis/.zcodegraph/zcodegraph.db \
  --force
```

Result:

```json
{
  "success": true,
  "filesIndexed": 28,
  "filesSkipped": 0,
  "filesErrored": 0,
  "nodesCreated": 320,
  "edgesCreated": 315,
  "durationMs": 109,
  "rustMacroTaxonomyCounts": {
    "attribute-macro": 41,
    "cfg-attribute": 6,
    "conditionally-present-ast-deferred": 6,
    "derive-attribute": 27,
    "function-like-macro-invocation": 125,
    "macro-generated-missing-item-deferred": 193,
    "macro-generated-semantics-deferred": 193,
    "opaque-macro-invocation-deferred": 125,
    "proc-macro-deferred": 41
  }
}
```

SQLite graph summary:

```text
edges:
  contains: 292
  rust-finalization imports: 23

generated macro semantic edges:
  implements/references/calls: 0
  route nodes: 0

nodes:
  enum: 6
  enum_member: 24
  file: 28
  function: 40
  import: 82
  method: 109
  struct: 26
  type_alias: 5
```

## Decision

The macro/cfg diagnostic hardening slice is complete.

The Rust core now surfaces macro/cfg risk more explicitly while keeping graph writes conservative. The next step, if any, should still avoid cfg-aware filtering or macro expansion until the Cargo feature/cfg semantic frontier is mapped.
