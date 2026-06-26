# Rust Language Indexing Plan 2: Repo-Local Module Path Resolution

Date: 2026-06-26

Branch: `codex/rust-language-semantic-support-prd`

Roadmap: `docs/plans/2026-06-26-rust-language-indexing-roadmap.json`

Roadmap scope: `1-4-1. Rust repo-local module path resolution slice`

Previous plan: `docs/plans/2026-06-26-rust-language-indexing-plan-1-core-rs-baseline.md`

## Goal

Make Rust-owned `.rs` indexing connect repo-local module paths to concrete local
files, with high-confidence symbol edges only when the target is unique.

Plan 1 made Rust core own baseline `.rs` extraction. Plan 2 makes that baseline
useful across files by resolving common Rust module paths such as `mod foo;`,
`use crate::foo::Bar;`, `use self::foo::Bar;`, `use super::foo::Bar;`, and
sibling qualified references like `foo::bar()`.

## Non-Goals

- Cargo package/dependency resolution.
- Cargo feature or `cfg`-specific target selection.
- Macro expansion.
- Trait dispatch, trait coherence, or impl method dispatch.
- `pub use` re-export chains.
- Glob imports.
- Alias imports such as `use crate::foo::Bar as Baz`.
- `#[path = "..."] mod foo;` modules.

Those remain tracked under the broader Rust semantic graph roadmap.

## Design Boundary

Use Rust-owned extraction/finalization for this slice. Do not route `.rs`
same-language module semantics back through the TypeScript resolver.

The resolver should collect:

- module identity for each `.rs` file;
- crate root candidates from `src/lib.rs` and `src/main.rs`;
- `mod` and `pub mod` declarations;
- `crate::`, `self::`, and `super::` use paths;
- sibling qualified references such as `foo::bar()` and `foo::Type`.

Preferred output:

- file-level dependency edges are the primary contract;
- symbol-level `references` or `calls` edges are allowed only when the target
  symbol is high-confidence and unique;
- ambiguous or unsupported cases should be recorded as taxonomy rather than
  guessed.

## Target Path Forms

In scope:

- `mod foo;`
- `pub mod foo;`
- `use crate::foo::Bar;`
- `use self::foo::Bar;`
- `use super::foo::Bar;`
- `foo::bar()`
- `foo::Type`
- target files: `foo.rs`, `foo/mod.rs`
- crate roots: `src/lib.rs`, `src/main.rs`

Out of scope:

- `pub use ...` direct or chained re-exports;
- `use crate::foo::*`;
- `use crate::foo::Bar as Baz`;
- external crate imports;
- `#[path = "..."] mod foo;`;
- conditional `cfg` module variants.

## Validation Corpus

Primary real repository smoke:

- `/private/tmp/codegraph-corpus/mini-redis`
- remote: `git@github.com:tokio-rs/mini-redis.git`

Use compact synthetic fixtures for exact edge-boundary tests, then use
mini-redis for the real repo smoke and deterministic explore probe.

Do not use larger Rust corpora such as ripgrep or hyper in Plan 2 unless
mini-redis reveals an implementation blind spot that cannot be reproduced in a
small fixture.

## Proposed Issues

### Issue 1: Rust module identity and `mod` declaration target mapping

Published issue: #570

Roadmap node: `1-4-1-1`

Acceptance:

- Rust-owned indexing computes module identity for repo-local `.rs` files.
- `src/lib.rs` and `src/main.rs` act as crate roots.
- `mod foo;` and `pub mod foo;` resolve to `foo.rs` or `foo/mod.rs` relative to
  the declaring module directory.
- The implementation records deterministic taxonomy for missing, ambiguous, or
  unsupported module targets.
- Synthetic tests cover root modules, sibling modules, nested `mod.rs`, and
  missing targets.

### Issue 2: `crate/self/super` use path file-level dependencies

Published issue: #571

Roadmap node: `1-4-1-2`

Acceptance:

- `use crate::...`, `use self::...`, and `use super::...` resolve to repo-local
  target files when the path maps to a known module.
- The resolver writes file-level dependency edges from the importing file to
  the resolved target file.
- Unsupported forms such as glob imports, alias imports, external crates, and
  re-export chains remain diagnostic/taxonomy only.
- Synthetic tests cover root-relative, self-relative, and parent-relative paths.

### Issue 3: sibling qualified refs with file-level and unique symbol edges

Published issue: #572

Roadmap node: `1-4-1-3`

Acceptance:

- Qualified references such as `foo::bar()` and `foo::Type` resolve to a
  sibling module file when the module target is known.
- The resolver writes file-level dependency edges for high-confidence module
  targets.
- If the leaf symbol is unique in the resolved target file, the resolver may
  write symbol-level `calls` or `references` edges.
- Ambiguous leaf symbols do not produce guessed symbol edges and are recorded in
  taxonomy.
- Synthetic tests cover function calls and type references.

### Issue 4: mini-redis smoke, deterministic explore probe, and evidence

Published issue: #573

Roadmap node: `1-4-1-4`

Acceptance:

- mini-redis indexes successfully with `rust-hybrid`.
- Status/build metadata shows Rust files as Rust-owned.
- The evidence records file/node/edge counts, fallback/deferred taxonomy,
  status/doctor/profile signals, and RSS or unavailable reason.
- A deterministic `zcodegraph_explore` probe for a mini-redis module path
  question returns the expected repo-local files/symbols without relying on
  stochastic agent A/B.
- Existing Rust-owned JS/TS/Go/Python/Rust guardrails remain green.

## Validation Commands

Minimum targeted commands:

```bash
npm run build
cargo test --package zcodegraph-core
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/sdk-rust-hybrid.test.ts
npx vitest run __tests__/rust-hybrid-doctor.test.ts
```

mini-redis smoke:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js init /private/tmp/codegraph-corpus/mini-redis --engine rust-hybrid
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js status /private/tmp/codegraph-corpus/mini-redis --json
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js doctor /private/tmp/codegraph-corpus/mini-redis --engine rust-hybrid --bundle --last-run
```

RSS should be captured from a normal Terminal when possible:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 /usr/bin/time -l node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/mini-redis --engine rust-hybrid --force --quiet
```

## Completion Criteria

- Roadmap `1-4-1` can be marked completed.
- Plan 2 evidence explains what Rust module path forms are supported and which
  forms remain deferred.
- mini-redis smoke and deterministic explore probe pass.
- No same-language `.rs` fallback to the TypeScript resolver is introduced.
