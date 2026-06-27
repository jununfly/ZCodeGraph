# Rust Cargo Cfg Diagnostics Hardening Evidence

Date: 2026-06-27

## Scope

This closes the `Cargo/cfg diagnostics hardening v1` implementation slice under `1-5-4. Cargo package feature and cfg conditional semantics`.

Issues:

- #602 Rust Cargo/cfg diagnostics baseline fixture
- #603 Rust repo-local package ownership and condition taxonomy hardening
- #604 Rust conditional semantic edge suppression diagnostics
- #605 Rust Cargo/cfg diagnostics fixture smoke and closeout evidence

## Implementation Summary

Rust core now exposes two dedicated Cargo/cfg diagnostic surfaces in result JSON/profile output:

- `rustCargoConditionSourceCounts`
- `rustCargoConditionalSemanticSuppressionCounts`

The condition-source diagnostics classify parser-visible conditional Rust source without evaluating active build configuration:

- `cfg-feature-gated-item`
- `cfg-target-gated-item`
- `cfg-test-only-item`
- `cfg-doc-only-item`
- `cfg-attr-affected-item`
- `cfg-affected-item`
- `conditionally-present-rust-item`

The suppression diagnostics summarize graph writes that are intentionally skipped because conditional semantics would make an unconditional graph edge unsafe:

- `trait-impl-edge-suppressed-cfg-affected`
- `trait-method-reference-suppressed-cfg-affected`

Cargo workspace diagnostics also count target-specific dependency selection from the workspace root manifest, not only package manifests.

## Non-goals Preserved

- No active `cfg` evaluation.
- No feature unification.
- No target triple exactness.
- No Cargo resolver v1/v2 compatibility work.
- No Cargo metadata integration.
- No external dependency graph expansion.
- No generated source loading.
- No build script execution.
- No feature-aware graph edge writing.

## Deterministic Fixture

Test:

```bash
cargo test -p zcodegraph-core rust_core_reports_cargo_cfg_condition_sources_and_suppression_diagnostics -- --nocapture
```

Result:

```text
test tests::rust_core_reports_cargo_cfg_condition_sources_and_suppression_diagnostics ... ok
```

The fixture covers:

- workspace package ownership
- lib/bin crate-root ownership
- registry dependency deferred taxonomy
- workspace-root target-specific dependency taxonomy
- `cfg(feature = "...")`
- `cfg(target_os = "...")`
- `cfg(test)`
- `cfg(doc)`
- `cfg_attr(...)`
- generated/build-script no-go taxonomy
- cfg-affected trait impl edge suppression
- cfg-affected trait method reference suppression

## Rust Core Test Sweep

Command:

```bash
cargo test -p zcodegraph-core rust_core_ -- --nocapture
```

Result:

```text
test result: ok. 16 passed; 0 failed; 0 ignored; 81 filtered out
```

## mini-redis Smoke

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
  "durationMs": 108,
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
  "rustCargoConditionSourceCounts": {
    "cfg-affected-item": 6,
    "cfg-feature-gated-item": 6,
    "conditionally-present-rust-item": 6
  },
  "rustCargoConditionalSemanticSuppressionCounts": {}
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

- mini-redis indexing still succeeds with the new diagnostics.
- The graph remains conservative: no feature-aware or cfg-evaluated edges were added.
- mini-redis has cfg-feature source but no cfg-affected trait edge suppression in the current source shape, so the suppression map is empty for this corpus.
- The deterministic fixture covers the suppression path directly.

## Decision

Status: ready for next bounded slice.

`Cargo/cfg diagnostics hardening v1` is complete. It improves diagnostic precision for Cargo/cfg semantic boundaries without changing default user graph behavior or claiming active Cargo compatibility.

This does not greenlight full Cargo resolution. Future work that needs active cfg or feature semantics still requires an explicit oracle/research decision.
