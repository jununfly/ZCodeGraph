# Rust Language Indexing Plan 4 Evidence: Cargo Workspace Package Frontier

Date: 2026-06-27

Branch: `codex/rust-language-semantic-support-prd`

Plan: `docs/plans/2026-06-27-rust-language-indexing-plan-4-cargo-workspace-package-frontier.md`

Roadmap scope: `1-4-4. Cargo workspace package and feature taxonomy frontier`

Issues: #578, #579, #580, #581

## Decision

Plan 4 is complete as a bounded Cargo workspace/package diagnostics slice.

The implementation adds Rust-owned Cargo/workspace taxonomy to the index
profile and result JSON, including package/workspace detection, crate-root
ownership, local path dependency classification, external/unresolved crate
candidate classification, and deferred Cargo resolver areas.

This plan intentionally writes no cross-package graph edges.

## Synthetic Workspace Fixture

Covered by:

```bash
cargo test --package zcodegraph-core rust_core_classifies_cargo_workspace_package_metadata_taxonomy
```

Result:

- Passed.
- Detected one workspace root.
- Detected two workspace members.
- Detected two packages.
- Detected one lib root and two bin roots in metadata taxonomy.
- Classified one local path dependency.
- Classified registry dependencies as deferred.
- Classified `use core_crate::...` as a workspace-local crate candidate.
- Classified `use serde::...` as an external dependency candidate.
- Verified no graph edge was written from `crates/app/*` to `crates/core/*`.

The fixture covers the deterministic behavior that mini-redis does not exercise:
workspace members and local path dependencies.

## mini-redis Smoke

Corpus:

- `/private/tmp/codegraph-corpus/mini-redis`
- remote: `git@github.com:tokio-rs/mini-redis.git`

Command:

```bash
cargo run --quiet --package zcodegraph-core -- index \
  --project-path /private/tmp/codegraph-corpus/mini-redis \
  --index-path /private/tmp/codegraph-corpus/mini-redis/.zcodegraph/zcodegraph.db \
  --engine rust \
  --force
```

Result:

- success: true
- files indexed: 28
- files errored: 0
- nodes created: 320
- edges created: 315
- duration: 106 ms

Cargo/workspace taxonomy:

```json
{
  "cargo-bin-root-detected": 2,
  "cargo-lib-root-detected": 1,
  "cargo-package-detected": 1,
  "feature-resolution-deferred": 1,
  "registry-dependency-deferred": 13,
  "rust-file-owned-by-crate-root": 3,
  "rust-file-owned-by-package": 28
}
```

Crate candidate taxonomy:

```json
{
  "external-dependency-candidate": 50,
  "unresolved-crate-candidate": 49
}
```

mini-redis is a single-package Rust repo, so it does not exercise workspace-local
path dependencies. That behavior is covered by the synthetic workspace fixture.

## RSS Evidence

Command:

```bash
/usr/bin/time -l target/debug/zcodegraph-core index \
  --project-path /private/tmp/codegraph-corpus/mini-redis \
  --index-path /private/tmp/codegraph-corpus/mini-redis/.zcodegraph/zcodegraph.db \
  --engine rust \
  --force
```

Result:

- wall time: 0.10 s
- user time: 0.08 s
- sys time: 0.01 s
- maximum resident set size: 9,617,408 bytes
- peak memory footprint: 4,718,928 bytes

RSS was available in this run.

## CLI rust-hybrid Note

The local CLI smoke path was attempted with:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/mini-redis \
  --engine rust-hybrid --force --quiet
```

The local shell is using Node.js 26.0.0 and the CLI printed the unsupported
Node version banner before indexing. This is recorded as a local environment
gate for the CLI smoke, not as a Plan 4 Cargo/workspace taxonomy failure.

The Rust core smoke above validates the Rust-owned diagnostics added in this
plan.

## Validation Commands

```bash
cargo test --package zcodegraph-core
npm run build
```

Results:

- `cargo test --package zcodegraph-core`: 90 passed.
- `npm run build`: passed.

## Closeout

Plan 4 completes the bounded Cargo workspace/package frontier:

- #578: package/workspace metadata taxonomy implemented.
- #579: Rust file package/crate-root ownership diagnostics implemented.
- #580: workspace-local/external/unresolved crate candidate taxonomy implemented.
- #581: synthetic workspace and mini-redis evidence recorded.

Deferred by design:

- full Cargo resolver behavior;
- feature resolution;
- `cfg` target selection;
- `build.rs` evaluation;
- proc-macro expansion;
- registry dependency resolution;
- semver dependency graph exactness;
- target-specific dependency exactness;
- cross-package graph edge writes.
