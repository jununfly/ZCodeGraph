# Relative Import Target Taxonomy Decision

Date: 2026-06-21

## Decision

Do not choose a bounded production burndown from the current VS Code sparse
database.

The taxonomy script is keepable as an internal benchmark diagnostic, but the
available VS Code sparse `.zcodegraph` database is a post-finalization database:
`unresolved_refs` is empty after cleanup. That means it cannot sample the
relative import target misses reported by the Rust core profile.

This is a data-source no-go, not evidence that no low-risk relative import
category exists.

## Artifacts

- Plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- VS Code sparse taxonomy before profile rerun:
  `docs/benchmarks/2026-06-21-relative-import-target-taxonomy-vscode-sparse.json`
- VS Code sparse taxonomy after profile rerun:
  `docs/benchmarks/2026-06-21-relative-import-target-taxonomy-vscode-sparse-after-profile.json`
- Current repo taxonomy:
  `docs/benchmarks/2026-06-21-relative-import-target-taxonomy-current-repo.json`

## Corpus Validation

The VS Code sparse corpus was present at:

- `/private/tmp/codegraph-corpus/vscode-sparse`

Validated:

- Git checkout: yes
- Commit: `4a6e32fc1f0`
- `src/vs/workbench`: present
- `src/vs/platform`: present
- `src/vs/base`: present
- `.zcodegraph/zcodegraph.db`: present

## Taxonomy Results

The taxonomy script reads only database metadata from `unresolved_refs`:

- `reference_name`
- `file_path`
- `language`
- `line`
- `col`

It does not read source files.

Observed:

| Artifact | Relative unresolved JS/TS imports | Categories |
| --- | ---: | --- |
| Current repo final DB | 0 | none |
| VS Code sparse final DB before profile rerun | 0 | none |
| VS Code sparse final DB after profile rerun | 0 | none |

The profile still reports Rust core relative import target fallback, but those
fallback rows are not preserved in the final `unresolved_refs` table after
TypeScript finalization and cleanup.

## Category Choice

No bounded category was selected.

Rejected production changes in this slice:

- asset imports;
- bundler loader semantics;
- package `exports` / `main`;
- sparse-checkout missing files;
- dynamic/template imports;
- symbol-level disambiguation;
- speculative query/hash stripping without a sampled low-risk target set.

## Follow-Up

If we still want to burn down relative import targets, the next slice should
capture unresolved import target metadata at the Rust-core/profile boundary
before TypeScript finalization cleanup, or add a dedicated profile artifact that
samples the relevant fallback rows without exposing source text.
