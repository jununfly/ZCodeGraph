# Rust Language Indexing Plan 5: Macro Taxonomy Frontier

Date: 2026-06-27

Branch: `codex/rust-language-semantic-support-prd`

Roadmap: `docs/plans/2026-06-26-rust-language-indexing-roadmap.json`

Roadmap scope: `1-4-3. Rust macro coverage taxonomy frontier`

Previous plan: `docs/plans/2026-06-27-rust-language-indexing-plan-4-cargo-workspace-package-frontier.md`

## Goal

Make Rust-owned indexing expose macro-related syntax and macro-affected
semantic boundaries as deterministic diagnostics.

Plans 1-4 established Rust-owned baseline extraction, repo-local module
resolution, trait/impl structural relationships, and Cargo workspace/package
taxonomy. Plan 5 maps the macro frontier so later Rust web framework route
wiring can make bounded decisions instead of guessing through macro-expanded
code that CodeGraph does not see.

## Non-Goals

- Macro expansion.
- Proc-macro execution.
- Compiler-grade Rust macro resolution.
- New `NodeKind` values for macros.
- New graph nodes for macro definitions or invocations.
- Graph edges from macro invocations to macro definitions.
- Graph edges for macro-generated functions, impls, modules, routes, or calls.
- Rust web framework route wiring.
- Attribute route extraction for Rocket, Actix, Axum, or similar frameworks.
- Feature or `cfg` target exactness.

Plan 5 is diagnostics-only. It should make macro influence visible and fail
closed around unsupported macro-expanded semantics.

## Design Boundary

Use Rust-owned extraction/profile diagnostics for this slice. Do not route `.rs`
same-language macro semantics through the TypeScript indexer.

The slice should classify:

- `macro_rules!` definitions;
- function-like macro invocations such as `foo!()`, `println!()`, and `vec![]`;
- derive attributes such as `#[derive(Debug, Clone)]`;
- attribute macros such as `#[tokio::main]`, `#[get("/")]`, and `#[route(...)]`;
- `cfg` and `cfg_attr` attributes;
- macro-affected semantic regions near `impl`, `trait`, `mod`, and route-like
  functions as deferred taxonomy.

Preferred output:

- deterministic profile/result JSON taxonomy;
- no public long-term API stability promise for the exact diagnostic field
  names beyond their use as profile artifacts;
- no graph write behavior change;
- enough taxonomy for the next route-wiring plan to choose bounded supported
  shapes.

## Graph Contract

Do not add new `NodeKind` or `EdgeKind` values in Plan 5.

Do not write macro definition nodes, macro invocation nodes, macro invocation
edges, or macro-generated semantic edges.

Existing Rust graph output must remain unchanged except for profile/result JSON
diagnostics. If a future plan decides to write macro-aware edges, it must do so
after a separate resolver design, not as a side effect of this taxonomy slice.

## Taxonomy

Record deterministic taxonomy for at least:

- `macro-rules-definition`
- `function-like-macro-invocation`
- `derive-attribute`
- `attribute-macro`
- `cfg-attribute`
- `cfg-attr-attribute`
- `macro-affected-impl-deferred`
- `macro-affected-trait-deferred`
- `macro-affected-mod-deferred`
- `macro-affected-route-like-function-deferred`
- `proc-macro-deferred`
- `macro-generated-semantics-deferred`

The taxonomy can live in Rust core profile/result JSON diagnostics if that is
the lowest-risk surface.

## Validation Corpus

Use a compact synthetic fixture for deterministic behavior:

```rust
macro_rules! make_handler {
    () => {};
}

#[derive(Debug, Clone)]
struct Service;

#[cfg(feature = "server")]
mod server;

#[cfg_attr(feature = "server", tokio::main)]
fn main() {
    println!("hello");
    make_handler!();
}

#[get("/health")]
fn health() {}
```

Expected diagnostic behavior:

- macro definition is counted;
- function-like macro invocations are counted;
- derive attributes are counted;
- attribute macros are counted;
- `cfg` and `cfg_attr` are counted;
- route-like attribute/function shapes are classified as deferred taxonomy;
- no macro graph nodes or edges are written.

Primary real repository smoke:

- `/private/tmp/codegraph-corpus/mini-redis`
- remote: `git@github.com:tokio-rs/mini-redis.git`

Optional macro-rich validation:

- Prefer a reasonably sized local checkout such as `dtolnay/async-trait` or
  `BurntSushi/ripgrep`.
- This optional repo must not block Plan 5 completion if it is unavailable.

Do not run stochastic agent A/B in Plan 5.

## Proposed Issues

### Issue 1: Rust macro syntax taxonomy extraction

Published issue: #582

Roadmap node: `1-4-3-1`

Acceptance:

- Rust-owned indexing records taxonomy for `macro_rules!` definitions.
- Rust-owned indexing records taxonomy for function-like macro invocations.
- Rust-owned indexing records taxonomy for derive attributes.
- Rust-owned indexing records taxonomy for attribute macros.
- Rust-owned indexing records taxonomy for `cfg` and `cfg_attr` attributes.
- Tests cover each syntax shape with deterministic synthetic Rust fixtures.

### Issue 2: Macro-affected semantic region guardrail

Published issue: #583

Roadmap node: `1-4-3-2`

Acceptance:

- Macro-affected `impl`, `trait`, `mod`, and route-like function regions are
  classified as deferred taxonomy when the extractor cannot safely see expanded
  semantics.
- The slice does not write macro-generated impl, route, module, call, import, or
  reference edges.
- Existing same-crate Rust graph behavior remains stable for non-macro code.
- Tests verify that macro-adjacent shapes fail closed rather than producing
  guessed semantic edges.

### Issue 3: Rust macro diagnostics profile and result JSON surface

Published issue: #584

Roadmap node: `1-4-3-3`

Acceptance:

- Macro taxonomy is visible in Rust core profile/result JSON.
- The diagnostic field is clearly named as Rust macro taxonomy.
- The field is absent or empty when no Rust macro syntax is seen.
- Existing profile/result JSON fields remain backward-compatible.

### Issue 4: Rust macro taxonomy smoke, optional repo evidence, and closeout

Published issue: #585

Roadmap node: `1-4-3-4`

Acceptance:

- Synthetic macro fixture validates all required taxonomy categories
  deterministically.
- mini-redis indexes successfully with Rust-owned indexing.
- Evidence records file/node/edge counts, macro taxonomy, deferred signals, and
  RSS or unavailable reason.
- Optional macro-rich repo validation is included only if a local checkout is
  available.
- Evidence explicitly states that Plan 5 writes no macro graph nodes or edges.
- Roadmap node `1-4-3` is updated when the slice completes.

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
cargo run --quiet --package zcodegraph-core -- index \
  --project-path /private/tmp/codegraph-corpus/mini-redis \
  --index-path /private/tmp/codegraph-corpus/mini-redis/.zcodegraph/zcodegraph.db \
  --engine rust \
  --force
```

RSS should be captured from a normal Terminal when possible:

```bash
/usr/bin/time -l target/debug/zcodegraph-core index \
  --project-path /private/tmp/codegraph-corpus/mini-redis \
  --index-path /private/tmp/codegraph-corpus/mini-redis/.zcodegraph/zcodegraph.db \
  --engine rust \
  --force
```

If RSS is unavailable because the sandbox denies process/sysctl access, record
the exact unavailable reason in evidence.

## Completion Criteria

- Roadmap `1-4-3` can be marked completed.
- Plan 5 evidence explains supported macro taxonomy and deferred macro-expanded
  semantics.
- Deterministic synthetic fixtures prove all required taxonomy categories.
- mini-redis smoke remains green.
- No macro graph nodes or edges are introduced by this plan.
- Follow-up roadmap node `1-4-5` remains responsible for Rust web framework
  route wiring candidates.
