# Rust Direct Named Import Binding Residual Burndown Plan

## Roadmap mapping

- Parent roadmap: `docs/plans/2026-06-27-rust-indexing-debt-to-rust-migration-roadmap.json`
- Node: `1-6-4. Burn down one high-confidence TypeScript resolver residual`
- Tracking issue: #666

## Decision

Burn down one high-confidence resolver residual: `binding-level-symbol-disambiguation-not-yet-rust-owned`.

The narrow exploit is direct named import binding resolution for single value-symbol targets. This is intentionally smaller than full binding-level disambiguation.

## Scope

Positive case:

- Source is JS/TS/JSX/TSX.
- Import form is direct named import, for example `import { foo } from "./mod"`.
- Rust already resolves the module specifier to a repo-local file target.
- The target file contains exactly one compatible value symbol named `foo`.
- Rust writes a guarded `imports` edge from the source binding/import node to the target value symbol.
- Edge uses `edgeOrigin: "rust-finalization"` and existing ESM named import/export metadata.

Fail-closed cases:

- multiple value-symbol candidates
- missing target value symbol
- re-export/barrel-only target
- default imports
- type-only imports
- namespace imports
- CommonJS interop
- ambiguous target file

## Non-goals

- Do not implement full binding-level symbol disambiguation.
- Do not change TypeScript resolver behavior.
- Do not introduce a new edge kind.
- Do not write `calls` or `references` edges for import bindings.
- Do not run a large-corpus benchmark as the required gate.

## Verification

- Positive fixture proves `binding-level-symbol-disambiguation` fallback decreases.
- Positive fixture proves Rust finalization writes an `imports` edge to the target value symbol.
- Positive fixture proves `esmNamedImportExportResolvedRefs` and guarded edge-write written counts increase.
- Ambiguous fixture proves fail-closed behavior with explicit skip/fallback reason and no graph edge write.
- Graph stats may only change by the expected edge delta.

## Outcome

Implemented as a regression-locked burn-down slice.

The existing Rust ESM named import/export resolver already handles the narrow
direct named import case. The completed work pins that behavior with CLI
fixtures:

- Positive direct named import fixture: Rust core still records the earlier
  binding-level import fallback candidate, then ESM named resolution resolves
  the binding, writes a guarded `rust-finalization` `imports` edge to the
  target value symbol, and removes the final
  `binding-level-symbol-disambiguation-not-yet-rust-owned` taxonomy entry.
- Ambiguous direct named import fixture: duplicate value candidates produce
  `direct-export-candidate-multiple`, write no Rust finalization symbol edge,
  and keep the binding-level residual visible for TypeScript fallback.

Important boundary note: existing ESM named guarded edge-write semantics use
the unresolved reference owner as the edge source; in current JS/TS extraction
that is the source file node. This plan intentionally preserved that semantics
instead of introducing a new binding/import-node edge shape.
