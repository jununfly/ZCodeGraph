# Rust Language Indexing Plan 7 Visibility Guard Evidence

Date: 2026-06-27

## Scope

Plan 7 implemented a bounded Rust module visibility wrong-edge guard for repo-local same-crate scoped symbol edges.

Included:

- Coarse Rust symbol visibility persistence in `nodes.visibility`.
- Cross-module scoped symbol edge guard before `rust-finalization` writes.
- Fail-closed taxonomy for private, unknown, and unsupported visibility.
- Deterministic fixture coverage for public, `pub(crate)`, `pub(super)`, private, `pub(in ...)`, and missing target cases.
- Real mini-redis indexing smoke.

Not included:

- `pub use` expansion.
- External crate semantics.
- Macro or cfg generated module semantics.
- Full rustc privacy compatibility.
- `pub(in path)` exact path reasoning.

## Deterministic Fixture Contract

Test:

```bash
cargo test -p zcodegraph-core rust_core_guards_cross_module_scoped_symbol_edges_by_visibility -- --nocapture
```

Result: passed.

Fixture behavior:

- `helper::public_fn()` writes a `calls` edge to `public_fn`.
- `helper::crate_fn()` writes a `calls` edge to `crate_fn`.
- `parent::child::super_fn()` writes a `calls` edge to `super_fn`.
- `helper::private_fn()` remains unresolved and records `visibility-private-cross-module-skipped`.
- `helper::pub_in_fn()` remains unresolved and records `visibility-pub-in-deferred-skipped`.
- `helper::unknown_fn()` remains unresolved and records `visibility-unknown-deferred-skipped`.

Fixture profile counts:

```json
{
  "rustVisibilityTaxonomyCounts": {
    "visibility-pub": 3,
    "visibility-pub-crate": 1,
    "visibility-pub-super": 1,
    "visibility-private": 1,
    "visibility-pub-in-deferred": 1
  },
  "rustVisibilityGuardTaxonomyCounts": {
    "visibility-guard-attempted": 6,
    "visibility-guard-written": 3,
    "visibility-private-cross-module-skipped": 1,
    "visibility-unknown-deferred-skipped": 1,
    "visibility-pub-in-deferred-skipped": 1
  }
}
```

## Full Core Regression

Command:

```bash
cargo test -p zcodegraph-core
```

Result: passed, 93 tests.

## Real Repo Smoke

Corpus: `/private/tmp/codegraph-corpus/mini-redis`

Command:

```bash
rm -rf /private/tmp/codegraph-corpus/mini-redis/.zcodegraph
cargo build -p zcodegraph-core
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
  "rustVisibilityTaxonomyCounts": {
    "visibility-private": 99,
    "visibility-pub": 62,
    "visibility-pub-crate": 49
  },
  "rustVisibilityGuardTaxonomyCounts": {
    "visibility-unknown-deferred-skipped": 3
  }
}
```

SQLite summary:

```text
edges:
  contains: 292
  rust-finalization imports: 23

unresolved_refs:
  rust calls: 942
  rust imports: 613
  rust references: 86

rust symbol visibility:
  private: 75
  pub: 62
  pub(crate): 49
```

## Decision

Plan 7 is complete for the bounded wrong-edge guard.

The implementation now prevents the Rust scoped symbol resolver from writing cross-module symbol edges unless coarse visibility allows it. Unsupported or unknown cases remain unresolved with diagnostic taxonomy, which is the intended fail-closed behavior for this slice.

Remaining semantic frontier items stay out of this slice: `pub use` expansion, external crates, macro/cfg generated modules, full rustc privacy, and exact `pub(in path)` reasoning.
