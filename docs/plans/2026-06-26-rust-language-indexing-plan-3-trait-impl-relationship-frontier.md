# Rust Language Indexing Plan 3: Trait/Impl Relationship Frontier

Date: 2026-06-26

Branch: `codex/rust-language-semantic-support-prd`

Roadmap: `docs/plans/2026-06-26-rust-language-indexing-roadmap.json`

Roadmap scope: `1-4-2. Rust trait definition to impl relationship frontier`

Previous plan: `docs/plans/2026-06-26-rust-language-indexing-plan-2-repo-local-module-resolution.md`

## Goal

Make Rust-owned `.rs` indexing expose the bounded structural relationship
between trait definitions, impl blocks, and impl methods.

Plan 2 connected repo-local Rust module paths to concrete files. Plan 3 uses
that connected file graph as the next base layer and adds enough Rust trait/impl
structure for agents to understand where a trait is defined, which type
implements it, and which impl method corresponds to a trait method declaration.

## Non-Goals

- Dynamic trait dispatch.
- Generic bound resolution.
- Blanket impl exactness.
- `where` clause exactness.
- Macro-expanded impls.
- Cross-crate trait resolution.
- Cargo package/dependency semantics.
- Feature or `cfg`-specific impl selection.

Those remain frontier topics under the broader Rust semantic roadmap. This plan
must not pretend to solve full Rust trait semantics.

## Design Boundary

Use Rust-owned extraction/finalization for this slice. Do not route `.rs`
same-language trait/impl semantics through the TypeScript resolver.

The slice should collect and classify:

- trait definitions;
- trait method declarations;
- inherent impl blocks: `impl Type { ... }`;
- trait impl blocks: `impl Trait for Type { ... }`;
- impl method bodies;
- unsupported forms such as generic, `where`, blanket, macro, `cfg`, and
  cross-crate shapes.

Preferred output:

- taxonomy first, so unsupported cases are visible and bounded;
- high-confidence structural edges only;
- no guessed trait dispatch edges.

## Edge Contract

Do not add new `EdgeKind` values in Plan 3.

Use existing edge kinds:

- `contains`: existing containment from trait/type/file to extracted methods.
- `implements`: `Type` node -> `Trait` node for high-confidence
  `impl Trait for Type`.
- `references`: impl method -> matching trait method declaration when the match
  is unique.

No edge should be written when the target trait, type, or trait method is
missing, ambiguous, macro-generated, cross-crate-only, or otherwise outside the
bounded resolver.

## Fallback Taxonomy

Record deterministic fallback taxonomy for at least:

- `missing-trait-node`
- `missing-type-node`
- `ambiguous-trait-node`
- `ambiguous-type-node`
- `missing-trait-method`
- `ambiguous-trait-method`
- `generic-impl-deferred`
- `where-clause-deferred`
- `blanket-impl-deferred`
- `macro-impl-deferred`
- `cfg-impl-deferred`
- `cross-crate-trait-deferred`

The taxonomy can start in Rust core profile/evidence fields if that is the
lowest-risk surface. It does not need to become a long-term public API in this
plan.

## Validation Corpus

Use compact synthetic fixtures for exact behavior:

```rust
trait Worker {
    fn run(&self);
}

struct Service;

impl Worker for Service {
    fn run(&self) {}
}
```

Expected graph behavior:

- `Service` implements `Worker`.
- The impl method `Service.run` references the trait method declaration
  `Worker.run` when the match is unique.
- Missing or ambiguous trait/method matches do not produce guessed edges.

Primary real repository smoke:

- `/private/tmp/codegraph-corpus/mini-redis`
- remote: `git@github.com:tokio-rs/mini-redis.git`

If mini-redis has limited trait/impl coverage, record that honestly in evidence
instead of switching corpora mid-slice.

Do not run stochastic agent A/B in Plan 3.

## Proposed Issues

### Issue 1: Rust trait and impl extraction taxonomy

Published issue: #574

Roadmap node: `1-4-2-1`

Acceptance:

- Rust-owned indexing classifies trait definitions, trait method declarations,
  inherent impls, trait impls, and impl methods.
- Unsupported trait/impl shapes are recorded as deterministic taxonomy.
- Synthetic tests cover simple trait, inherent impl, trait impl, and deferred
  generic/where/blanket-shaped examples.

### Issue 2: Rust Type implements Trait structural edge

Published issue: #575

Roadmap node: `1-4-2-2`

Acceptance:

- `impl Trait for Type` writes a high-confidence `implements` edge from the
  `Type` node to the `Trait` node when both are uniquely resolved.
- Missing or ambiguous type/trait candidates do not produce guessed edges.
- Synthetic tests cover same-file and repo-local resolved-file cases when
  available through existing module resolution.

### Issue 3: Rust impl method to trait method declaration bounded reference

Published issue: #576

Roadmap node: `1-4-2-3`

Acceptance:

- An impl method writes a `references` edge to the matching trait method
  declaration only when the trait relation and method name are uniquely
  resolved.
- Inherent impl methods do not write trait method declaration references.
- Ambiguous, missing, macro, generic, `where`, blanket, and cross-crate cases
  remain taxonomy only.

### Issue 4: Rust trait impl mini-redis smoke and evidence

Published issue: #577

Roadmap node: `1-4-2-4`

Acceptance:

- mini-redis indexes successfully with `rust-hybrid`.
- Evidence records file/node/edge counts, trait/impl taxonomy, fallback/deferred
  signals, and RSS or unavailable reason.
- Evidence states whether mini-redis exercised the new trait/impl edges or only
  served as a no-regression smoke.
- Roadmap node `1-4-2` is updated when the slice completes.

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

- Roadmap `1-4-2` can be marked completed.
- Plan 3 evidence explains which Rust trait/impl forms are supported and which
  forms remain deferred.
- Deterministic synthetic fixtures prove `implements` and bounded method
  `references` edges.
- mini-redis smoke passes without introducing same-language `.rs` fallback to
  the TypeScript resolver.
- No new `EdgeKind` values are added.
