# Rust Trait Generic Dispatch Residual Taxonomy Decision

Date: 2026-06-27

## Scope

This is an explore-only slice for `1-5-2. Trait generic and dispatch residuals` in the Rust language indexing roadmap.

The goal is to classify the residual semantic frontier around Rust trait/impl extraction and finalization before adding more graph edges.

## Non-goals

- Do not implement new trait dispatch behavior in this slice.
- Do not attempt Rust type inference.
- Do not resolve `dyn Trait` or trait object calls.
- Do not model associated type or generic bound semantics.
- Do not use rustc or cargo metadata as an oracle yet.
- Do not run agent A/B or performance gates.

## Current Implementation Facts

Rust core currently records trait/impl taxonomy while walking Rust AST:

- `trait-definition`
- `trait-method-declaration`
- `trait-impl`
- `inherent-impl`
- `impl-method`
- `generic-impl-deferred`
- `blanket-impl-deferred`
- `where-clause-deferred`
- `cross-crate-trait-deferred`
- `cfg-impl-deferred`

Rust core also records `RustTraitImplFact` for `impl Trait for Type` headers and writes bounded graph edges before SQLite insertion:

- `Type implements Trait` is written only when both type and trait have unique same-file candidates.
- `ImplType.method references Trait.method` is written only when a unique same-file trait method declaration matches the impl method leaf name.

This is intentionally narrow and does not perform dispatch resolution.

## Residual Taxonomy By Edge-Write Correctness Risk

### Safe-ish Exploit Candidates

These are candidates for bounded implementation because they can be guarded with existing AST facts and repo-local graph data:

- Same-file trait impl edge guard hardening.
- Same-file impl-method to trait-method edge guard hardening.
- Diagnostics for attempted/written/skipped trait impl edge writes.
- Taxonomy for ambiguous same-file type or trait candidates.
- Taxonomy for trait method declaration ambiguity.

### Needs Guard

These may become implementation slices only if every write is fail-closed:

- Cross-file repo-local trait/type pairing.
- Generic impl headers where a concrete type can still be uniquely identified.
- `where` clauses that are present but not required for the specific edge.
- Visibility interaction for cross-module trait/type declarations.
- Duplicate trait or type names across modules.

### Needs Oracle / Research

These should not write value graph edges without a stronger semantic oracle:

- `dyn Trait` dispatch.
- Trait object method calls.
- Associated types.
- Generic bound resolution.
- Blanket impl applicability.
- Method resolution across inherent impls, trait impls, deref, and autoderef.
- Full coherence and specialization semantics.

### Defer / No-go Taxonomy

These remain diagnostic-only for the current roadmap pass:

- Cross-crate trait exactness.
- Macro-generated trait, impl, or method declarations.
- `cfg` and feature-dependent impl availability.
- rustc-compatible privacy and coherence.

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
  "durationMs": 90,
  "rustTraitImplTaxonomyCounts": {
    "cfg-impl-deferred": 7,
    "cross-crate-trait-deferred": 5,
    "impl-method": 109,
    "inherent-impl": 12,
    "trait-impl": 25,
    "where-clause-deferred": 1
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
  rust-finalization imports: 23

trait-related semantic edges:
  implements: 0
  references: 0
```

Interpretation:

- The real repo has enough trait/impl surface to justify a guard-hardening slice.
- Existing graph writes are conservative: mini-redis does not currently produce trait semantic edges.
- Taxonomy already exposes deferred categories that should remain fail-closed until a stronger guard or oracle exists.

## Recommended Next Bounded Implementation

Next slice: `Rust trait impl edge guard v1 plus taxonomy hardening`.

Target behavior:

- Keep existing same-file unique-candidate trait edges.
- Add explicit attempted/written/skipped diagnostics for trait impl edge writes.
- Fail closed for generic, blanket, where-clause, cross-crate, cfg-affected, ambiguous, or unsupported cases unless a low-risk unique repo-local candidate is proven.
- Preserve current non-goals: no dyn dispatch, no generic inference, no associated type resolution, no rustc oracle.

## Decision

`1-5-2. Trait generic and dispatch residuals` is ready to close as an explore slice.

The next implementation should harden existing trait impl edge writes before expanding dispatch coverage. This follows the same correctness pattern as the module visibility guard: prevent wrong edges first, then consider missing-edge expansion.
