# Rust language indexing Plan 2 evidence

Date: 2026-06-26

Plan: `docs/plans/2026-06-26-rust-language-indexing-plan-2-repo-local-module-resolution.md`

Scope: repo-local Rust module path resolution for Rust-owned indexing.

## Deterministic unit coverage

Command:

```bash
cargo test --package zcodegraph-core rust_core_resolves_ -- --nocapture
```

Result: pass.

Covered behaviors:

- `mod foo;` and `pub mod foo;` resolve to repo-local `foo.rs` / `foo/mod.rs` file targets.
- `use crate::...`, `use self::...`, and `use super::...` resolve to repo-local file targets.
- Sibling qualified refs such as `helper::run()` and `helper::Thing` write file-level dependencies and high-confidence unique symbol edges in the synthetic fixture.
- Missing module targets do not create fallback file edges.

## mini-redis smoke

Corpus: `/private/tmp/codegraph-corpus/mini-redis`

Remote: `git@github.com:tokio-rs/mini-redis.git`

Commands:

```bash
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
- Rust unresolved imports after finalization: 0
- `rust-module-path` file edges: 23
- `fallbackState`: `degraded`
- `fallbackReasonTaxonomy`: `language-level-typescript-fallback: 1`

Sample `rust-module-path` edges:

- `src/clients/mod.rs -> src/clients/client.rs`
- `src/cmd/mod.rs -> src/cmd/get.rs`
- `src/cmd/mod.rs -> src/cmd/set.rs`
- `src/cmd/mod.rs -> src/cmd/subscribe.rs`

## RSS

RSS unavailable in the current sandbox: `/usr/bin/time -l` exits non-zero because `sysctl kern.clockrate` is denied by the sandbox.

Observed failure:

```text
time: sysctl kern.clockrate: Operation not permitted
```

## Decision

Plan 2 is complete for the bounded repo-local slice. Rust-owned indexing now resolves direct repo-local module declarations and simple module paths without invoking the TypeScript resolver for Rust files.

Remaining out of scope for later plans:

- Cargo package/dependency resolution.
- `#[path] mod` attributes.
- `pub use` chains and glob imports.
- Feature/cfg-aware module visibility.
- Trait dispatch and macro-expanded references.
