# Rust Language Indexing Plan 4: Cargo Workspace Package Frontier

Date: 2026-06-27

Branch: `codex/rust-language-semantic-support-prd`

Roadmap: `docs/plans/2026-06-26-rust-language-indexing-roadmap.json`

Roadmap scope: `1-4-4. Cargo workspace package and feature taxonomy frontier`

Previous plan: `docs/plans/2026-06-26-rust-language-indexing-plan-3-trait-impl-relationship-frontier.md`

## Goal

Make Rust-owned indexing understand enough Cargo package and workspace shape to
diagnose crate ownership and workspace-local dependency candidates.

Plan 2 connected repo-local Rust module paths inside a crate. Plan 3 added a
bounded trait/impl relationship frontier. Plan 4 adds the next base layer for
real Rust repositories: Cargo package metadata, workspace members, crate roots,
local path dependencies, and the taxonomy needed to tell whether a
`use crate_name::...` prefix is probably workspace-local, external, unresolved,
or deferred.

## Non-Goals

- Full Cargo resolver behavior.
- Feature resolution.
- `cfg` target selection.
- `build.rs` evaluation.
- Proc-macro expansion.
- Registry dependency resolution.
- Semver dependency graph exactness.
- Target-specific dependency exactness.
- Cross-package graph edge writes.
- Rust web framework route wiring.
- Macro coverage beyond taxonomy.

This plan must not make cross-crate semantic claims that require Cargo's full
resolver. It should make the boundary visible, not pretend the boundary is
solved.

## Design Boundary

Use Rust-owned indexing and diagnostics for this slice. Do not route `.rs`
same-language Cargo/workspace interpretation through the TypeScript indexer.

The slice should discover and classify:

- `Cargo.toml` package names;
- workspace members;
- workspace package roots;
- `lib` and `bin` crate roots;
- local path dependencies;
- file ownership by package and crate root where deterministic;
- `use crate_name::...` prefixes that can be classified as workspace-local
  candidates, external dependency candidates, unresolved candidates, or deferred
  cases.

Preferred output:

- deterministic diagnostics/profile fields first;
- no new public long-term API guarantee for diagnostic field stability;
- no graph edge writes across package boundaries;
- taxonomy that future plans can use to decide where full Cargo behavior is
  worth implementing.

## Graph Contract

Do not add new `EdgeKind` values in Plan 4.

Do not write cross-package `imports`, `references`, `exports`, or other graph
edges from Cargo package discovery in Plan 4.

Existing same-crate graph behavior must remain unchanged. Cargo/workspace
discovery should only add diagnostics and taxonomy in this plan. If a future
plan decides to write cross-package edges, it must do so after feature/cfg and
resolver exactness have their own bounded design.

## Taxonomy

Record deterministic taxonomy for at least:

- `cargo-package-detected`
- `cargo-workspace-detected`
- `cargo-workspace-member-detected`
- `cargo-lib-root-detected`
- `cargo-bin-root-detected`
- `cargo-local-path-dependency-detected`
- `rust-file-owned-by-package`
- `rust-file-owned-by-crate-root`
- `workspace-local-crate-candidate`
- `external-dependency-candidate`
- `unresolved-crate-candidate`
- `feature-resolution-deferred`
- `cfg-target-selection-deferred`
- `build-rs-deferred`
- `proc-macro-deferred`
- `registry-dependency-deferred`
- `semver-resolution-deferred`
- `target-specific-dependency-deferred`

The taxonomy can live in Rust core profile/evidence fields if that is the
lowest-risk surface. It does not need to become a stable user-facing API in this
plan.

## Validation Corpus

Use a compact synthetic Cargo workspace fixture for deterministic behavior:

```text
workspace-root/
  Cargo.toml
  crates/
    app/
      Cargo.toml
      src/main.rs
    core/
      Cargo.toml
      src/lib.rs
```

Expected diagnostic behavior:

- workspace root is detected;
- `app` and `core` are detected as workspace members;
- package names and crate roots are recorded;
- `app -> core` local path dependency is classified as workspace-local;
- `use core_crate::...` style prefixes are classified without writing graph
  edges across package boundaries;
- feature/cfg/build.rs/proc-macro/registry/semver cases are deferred taxonomy,
  not guessed behavior.

Primary real repository smoke:

- `/private/tmp/codegraph-corpus/mini-redis`
- remote: `git@github.com:tokio-rs/mini-redis.git`

If the synthetic fixture and mini-redis do not exercise enough workspace-local
behavior, add one reasonably sized GitHub Rust workspace repository as optional
validation. External corpus setup must not block the mainline slice.

Do not run stochastic agent A/B in Plan 4.

## Proposed Issues

### Issue 1: Cargo.toml package and workspace metadata taxonomy

Published issue: #578

Roadmap node: `1-4-4-1`

Acceptance:

- Rust-owned indexing parses package name metadata from relevant `Cargo.toml`
  files.
- Workspace roots and members are discovered for deterministic workspace
  fixtures.
- `lib` and `bin` crate roots are detected from Cargo metadata and conventional
  defaults.
- Local path dependencies are classified separately from registry dependencies.
- Deferred feature/cfg/build.rs/proc-macro/registry/semver cases are visible as
  taxonomy, not silently ignored.

### Issue 2: Rust file package and crate-root ownership diagnostics

Published issue: #579

Roadmap node: `1-4-4-2`

Acceptance:

- `.rs` files in a package are classified by package ownership when
  deterministic.
- Crate roots are classified as lib/bin roots where deterministic.
- Non-root module files inherit enough ownership context for diagnostics.
- Ambiguous or out-of-workspace files are classified as unresolved/deferred
  rather than guessed.
- Existing Rust graph output is unchanged except for diagnostics/profile data.

### Issue 3: Workspace-local crate candidate taxonomy

Published issue: #580

Roadmap node: `1-4-4-3`

Acceptance:

- `use crate_name::...` prefixes are classified as workspace-local candidates
  when they match discovered package/local path dependency metadata.
- External dependency candidates are classified separately.
- Unresolved candidates are visible.
- No cross-package graph edges are written.
- Tests cover workspace-local, external, unresolved, and deferred shapes.

### Issue 4: Cargo workspace smoke, optional real repo evidence, and closeout

Published issue: #581

Roadmap node: `1-4-4-4`

Acceptance:

- Synthetic workspace fixture validates package/workspace/member/root/local-path
  taxonomy deterministically.
- mini-redis indexes successfully with `rust-hybrid`.
- Evidence records file/node/edge counts, Cargo/workspace taxonomy, deferred
  signals, and RSS or unavailable reason.
- Optional real GitHub Rust workspace validation is included only if the local
  fixture and mini-redis leave an important blind spot.
- Evidence explicitly states that Plan 4 writes no cross-package graph edges.
- Roadmap node `1-4-4` is updated when the slice completes.

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
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/mini-redis --engine rust-hybrid --force --quiet
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node dist/bin/zcodegraph.js status /private/tmp/codegraph-corpus/mini-redis --json
```

RSS should be captured from a normal Terminal when possible:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 /usr/bin/time -l node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/mini-redis --engine rust-hybrid --force --quiet
```

If RSS is unavailable because the sandbox denies process/sysctl access, record
the exact unavailable reason in evidence.

## Completion Criteria

- Roadmap `1-4-4` can be marked completed.
- Plan 4 evidence explains supported Cargo/workspace discovery and deferred
  Cargo resolver areas.
- Deterministic synthetic fixtures prove package/workspace/member/root/local-path
  taxonomy.
- mini-redis smoke remains green.
- No cross-package graph edges are introduced by this plan.
- Follow-up roadmap nodes remain for feature/cfg/build.rs/proc-macro/full Cargo
  resolver work rather than being hidden inside this slice.
