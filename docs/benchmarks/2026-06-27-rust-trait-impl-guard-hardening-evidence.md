# Rust Trait Impl Guard Hardening Evidence

Date: 2026-06-27

## Scope

This implements and validates `Rust trait impl edge guard v1 plus taxonomy hardening`, tracked by #594-#597.

Included:

- Diagnostics baseline for Rust trait impl semantic edge writes.
- Fail-closed guard for `Type implements Trait` edges.
- Fail-closed guard for impl-method to trait-method declaration `references` edges.
- Result/profile JSON taxonomy for attempted, written, and skipped edge writes.
- Deterministic fixtures and mini-redis smoke evidence.

Not included:

- `dyn Trait` dispatch.
- Rust generic inference.
- Associated type resolution.
- rustc or cargo metadata oracle.
- Macro expansion or cfg feature evaluation.
- Cross-crate trait exactness.

## Deterministic Fixtures

Command:

```bash
cargo test -p zcodegraph-core rust_core_ -- --nocapture
```

Result: passed, 15 Rust core tests.

New fixture coverage:

- `rust_core_reports_trait_impl_edge_write_diagnostics_without_changing_safe_edges`
  - Safe same-file `impl Worker for Service` still writes `Service implements Worker`.
  - Safe same-file `Service.run references Worker.run` still writes.
  - Result JSON exposes `rustTraitImplEdgeWriteCounts`.
  - Result JSON exposes `rustTraitMethodReferenceEdgeWriteCounts`.

- `rust_core_fails_closed_for_unsupported_trait_impl_edges`
  - Safe impl writes.
  - Generic impl skips.
  - Blanket impl skips.
  - Where-clause impl skips.
  - Cfg-affected impl skips.
  - Cross-crate trait impl skips.
  - Skipped cases do not write `implements` or trait-method `references` edges.

- `rust_core_skips_trait_method_reference_when_trait_method_declaration_is_missing`
  - `implements` can still write for a safe trait/type pair.
  - Missing trait method declaration does not write a method reference edge.
  - Missing trait method candidate is recorded as taxonomy.

## Full Core Regression

Command:

```bash
cargo test -p zcodegraph-core
```

Result: passed, 96 tests.

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
  "durationMs": 89,
  "rustTraitImplTaxonomyCounts": {
    "cfg-impl-deferred": 7,
    "cross-crate-trait-deferred": 5,
    "impl-method": 109,
    "inherent-impl": 12,
    "trait-impl": 25,
    "where-clause-deferred": 1
  },
  "rustTraitImplEdgeWriteCounts": {
    "trait-impl-edge-attempted": 14,
    "trait-impl-edge-skipped": 14,
    "trait-impl-edge-skipped-cross-crate-trait": 5,
    "trait-impl-edge-skipped-trait-candidate-not-unique": 9
  },
  "rustTraitMethodReferenceEdgeWriteCounts": {
    "trait-method-reference-attempted": 24,
    "trait-method-reference-skipped": 24,
    "trait-method-reference-skipped-cross-crate-trait": 24
  }
}
```

SQLite graph summary:

```text
edges:
  contains: 292
  rust-finalization imports: 23

rust trait semantic edges:
  implements/references: 0

nodes:
  enum: 6
  enum_member: 24
  file: 28
  function: 40
  import: 82
  method: 109
  struct: 26
  type_alias: 5
```

## Decision

The Rust trait impl guard hardening slice is complete.

Existing safe same-file trait impl edges still write, while unsupported generic, blanket, where-clause, cfg-affected, cross-crate, ambiguous, and missing method cases fail closed with deterministic taxonomy.

mini-redis remains conservative: current trait-related semantic writes are skipped rather than guessed, which matches the release principle that wrong graph edges are worse than missing graph edges.
