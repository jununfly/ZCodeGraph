# Rust Cargo Feature Cfg Conditional Semantics Decision

Date: 2026-06-27

## Scope

This is an explore-only slice for `1-5-4. Cargo package feature and cfg conditional semantics` in the Rust language indexing roadmap.

The goal is to define the Cargo package, feature, and `cfg` semantic boundary that protects graph correctness before adding more Rust graph behavior.

## Non-goals

- Do not implement full Cargo resolution.
- Do not evaluate active `cfg` expressions.
- Do not decide whether a feature-gated item is enabled for the current build.
- Do not model feature unification, resolver v1/v2, dependency features, or target-specific dependency activation.
- Do not parse crates.io or external dependency source.
- Do not execute `cargo metadata`, `cargo build`, `build.rs`, proc macros, or generated-source steps.
- Do not read `OUT_DIR` or generated files.
- Do not run agent A/B or performance gates.

## Current Implementation Facts

Rust core already records Cargo workspace/package diagnostics from repo-local `Cargo.toml` files:

- `cargo-package-detected`
- `cargo-lib-root-detected`
- `cargo-bin-root-detected`
- `rust-file-owned-by-package`
- `rust-file-owned-by-crate-root`
- `feature-resolution-deferred`
- `registry-dependency-deferred`
- `cfg-target-selection-deferred`

Rust core also records crate candidate diagnostics:

- `external-dependency-candidate`
- `workspace-local-crate-candidate`
- `unresolved-crate-candidate`

Macro/cfg diagnostics already identify parser-visible conditional syntax:

- `cfg-attribute`
- `cfg-attr-attribute`
- `conditionally-present-ast-deferred`

Trait edge guards already fail closed on cfg-affected trait impl facts instead of writing conditional edges as unconditional graph truth.

## Decision Boundary

### Safe-ish Exploit Candidates

These are candidates for bounded implementation because they improve graph correctness diagnostics without requiring a Cargo oracle:

- Repo-local package ownership diagnostics for every indexed Rust file.
- Crate-root ownership diagnostics for `lib.rs`, `main.rs`, and bin targets.
- Condition source taxonomy for `#[cfg(...)]`, `#[cfg_attr(...)]`, feature-gated items, target-gated items, test-only items, and doc-only items.
- Explicit edge suppression reasons when a graph write is avoided because an item is conditionally present.
- Profile/result counters for package ownership and condition-source buckets.

### Needs Guard

These may become implementation slices only if every graph write fails closed:

- Workspace-local crate candidate classification.
- Same-workspace package import/reference edges where both package ownership and crate-root ownership are unique.
- Edges from parser-visible conditional items, if the condition is carried as diagnostic metadata and never treated as active-build truth.
- Target-specific source layout, only as taxonomy unless a deterministic target model is explicitly selected later.

### Needs Oracle / Research

These should not drive value graph edges without a stronger oracle:

- Active `cfg` evaluation.
- Cargo feature unification.
- Resolver v1/v2 compatibility.
- Optional dependency feature activation.
- Target triple exactness.
- Build-script-generated configuration.
- Proc-macro-generated symbols.
- rustc-compatible crate name, module, and conditional compilation semantics.

### Defer / No-go Taxonomy

These remain diagnostic-only for this roadmap pass:

- `build.rs`
- `OUT_DIR`
- generated source files not present in the repo source tree
- proc-macro expansion
- function-like macro expansion that produces items
- crates.io dependency graph expansion
- environment-specific Cargo behavior

## Graph Correctness Rule

The index may record parser-visible Rust items that are conditionally present, but graph writes must not silently promote conditional semantics into unconditional facts.

In practice:

- Package ownership can be used as a repo-local diagnostic and guard input.
- Feature/cfg syntax can be used as condition-source taxonomy.
- Conditional availability should suppress or annotate risky writes.
- The index should prefer a missing edge plus a precise taxonomy bucket over a wrong unconditional edge.

## mini-redis Deterministic Smoke

Corpus: `/private/tmp/codegraph-corpus/mini-redis`

Revision:

```text
3d93b42
```

Command:

```bash
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
  "durationMs": 92,
  "rustCargoWorkspaceTaxonomyCounts": {
    "cargo-bin-root-detected": 2,
    "cargo-lib-root-detected": 1,
    "cargo-package-detected": 1,
    "feature-resolution-deferred": 1,
    "registry-dependency-deferred": 13,
    "rust-file-owned-by-crate-root": 3,
    "rust-file-owned-by-package": 28
  },
  "rustCargoWorkspaceCrateCandidateCounts": {
    "external-dependency-candidate": 50,
    "unresolved-crate-candidate": 49
  },
  "rustMacroTaxonomyCounts": {
    "cfg-attribute": 6,
    "conditionally-present-ast-deferred": 6
  }
}
```

SQLite graph summary:

```text
nodes:
  enum: 6
  enum_member: 24
  file: 28
  function: 40
  import: 82
  method: 109
  struct: 26
  type_alias: 5

edges:
  contains: 292
  imports: 23
```

Interpretation:

- mini-redis has enough Cargo/package surface to validate package ownership taxonomy.
- The current implementation already exposes repo-local package ownership counts.
- External dependencies and unresolved crate candidates are still diagnostic, not value graph truth.
- `cfg` syntax is visible as conditional AST taxonomy, but no active cfg evaluation is attempted.

## Deterministic Fixture Requirement For Next Slice

The next implementation slice should add or harden fixture coverage for:

- `cfg(feature = "...")`
- `cfg(target_os = "...")`
- `cfg(test)`
- `cfg_attr(...)`
- workspace package ownership
- lib/bin crate-root ownership
- registry dependency deferred taxonomy
- generated/build-script no-go taxonomy

The fixture should assert result JSON/profile counters rather than relying on human inspection.

## Recommended Next Bounded Implementation

Next slice: `Cargo/cfg diagnostics hardening v1`.

Target behavior:

- Keep default graph writes conservative.
- Add or harden repo-local package/crate ownership diagnostics.
- Add condition source taxonomy for feature-gated, target-gated, test-only, and cfg_attr-affected source.
- Add explicit edge suppression reason buckets when conditional semantics prevent a safe write.
- Keep generated/build-script/proc-macro behavior as no-go taxonomy.
- Do not implement active cfg evaluation, feature unification, Cargo metadata integration, or external dependency graph expansion.

## Decision

`1-5-4. Cargo package feature and cfg conditional semantics` is ready to close as an explore slice.

The next implementation should improve diagnostics and fail-closed guard evidence before attempting any feature-aware graph writes. This keeps Rust indexing aligned with the rule that conditional Cargo semantics must not become unconditional graph facts.
