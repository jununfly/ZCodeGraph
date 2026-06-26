# Rust language indexing Plan 3 evidence

Date: 2026-06-26

Plan: `docs/plans/2026-06-26-rust-language-indexing-plan-3-trait-impl-relationship-frontier.md`

Scope: bounded Rust trait/impl relationship frontier for Rust-owned indexing.

## Deterministic unit coverage

Command:

```bash
cargo test --package zcodegraph-core rust_core_ -- --nocapture
```

Result: pass.

Covered behaviors:

- Rust-owned indexing records trait/impl taxonomy for trait definitions, trait
  method declarations, inherent impls, trait impls, impl methods, generic impls,
  where-clause impls, blanket impls, and cross-crate trait impls.
- `impl Trait for Type` writes a high-confidence `implements` edge from the
  unique local type node to the unique local trait node.
- An impl method writes a bounded `references` edge to the matching trait method
  declaration when the trait relation and method name are unique.
- Inherent impl methods do not write trait method declaration references.
- No new `EdgeKind` values were added.

Full Rust core suite:

```bash
cargo test --package zcodegraph-core
```

Result: pass, 89 tests.

## mini-redis smoke

Corpus: `/private/tmp/codegraph-corpus/mini-redis`

Remote: `git@github.com:tokio-rs/mini-redis.git`

Commands:

```bash
npm run build
cargo build --package zcodegraph-core
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/mini-redis --engine rust-hybrid --force --quiet
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js status /private/tmp/codegraph-corpus/mini-redis --json
```

Result: pass.

Observed status:

- `fileCount`: 29
- `nodeCount`: 320
- `edgeCount`: 517
- Rust-owned files: 28
- TypeScript fallback files: 1 YAML file
- `fallbackState`: `degraded`
- `fallbackReasonTaxonomy`: `language-level-typescript-fallback: 1`
- `databasePath`: `/private/tmp/codegraph-corpus/mini-redis/.zcodegraph/zcodegraph.db`

Observed graph facts:

- Rust `struct` nodes: 26
- Rust `method` nodes: 109
- Rust `trait` nodes: 0
- `rust-module-path` file edges: 23
- `implements` edges: 0
- trait-method `references` edges: 0

Interpretation: mini-redis is a no-regression smoke for this slice. It does not
exercise the new trait/impl edges because the indexed corpus has no Rust trait
nodes.

## RSS

RSS unavailable in the current sandbox: `/usr/bin/time -l` exits non-zero
because `sysctl kern.clockrate` is denied by the sandbox.

Observed output:

```text
0.41 real         0.35 user         0.06 sys
time: sysctl kern.clockrate: Operation not permitted
```

## Decision

Plan 3 is complete for the bounded trait/impl relationship frontier. Rust-owned
indexing now exposes deterministic taxonomy plus high-confidence structural
edges for local trait impl fixtures, while leaving dynamic trait dispatch,
generic bound resolution, blanket impl exactness, macro expansion, `cfg`, and
blanket impl exactness, macro expansion, `cfg`, and cross-crate semantics
deferred.
