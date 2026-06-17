# Rust Indexing Core Phase 20 Decision

## Scope

This record covers Phase 20 issues #199-#204 after adding four Rust-owned finalization slices:

- `import-path-alias-resolution`
- `esm-named-import-export-resolution`
- `esm-one-hop-reexport-resolution`
- `local-exact-reference-resolution`

This is not a Rust default rollout decision and does not close the post-PRD performance/RSS optimization targets in #165 or #193.

## Implementation Evidence

Rust now writes finalization edges directly into the existing SQLite schema without adding a persistent schema migration.

The implemented slices are:

- JS/TS relative and root `tsconfig.json` / `jsconfig.json` `compilerOptions.paths` file-level import resolution.
- Direct same-name ESM named import/export symbol disambiguation for already resolved relative and `paths` alias file targets.
- One-hop direct same-name ESM named re-export disambiguation for already resolved relative and `paths` alias file targets, with edges written to the leaf exported symbol.
- Same-file exact callable reference resolution for unambiguous `calls` and `instantiates` references.

Unsupported resolver behavior remains explicit fallback:

- imported binding forms outside direct same-name ESM named imports,
- re-export forms outside direct same-name one-hop ESM named re-exports,
- package/import forms outside the file-level relative/path-alias slice,
- unresolved file-level import targets,
- framework post-extract finalization,
- broader reference resolution,
- dynamic-dispatch synthesis,
- DB maintenance.

## Validation

Commands run:

- `cargo test --package zcodegraph-core`
- `npm run build`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "resolves JS/TS relative and paths-alias imports"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "same-file exact callable"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "direct ESM named imports"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "paths-alias ESM named imports"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "one-hop ESM named re-exports"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "paths-alias one-hop ESM named re-exports"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts`
- `/private/tmp/node-v22.21.1-darwin-arm64/bin/node scripts/rust-indexing-experiment.mjs --experiment docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.experiment.json --out docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.raw.json --summary-out docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.md`
- `/private/tmp/node-v22.21.1-darwin-arm64/bin/node scripts/rust-sufficiency-guardrail.mjs --repo vscode=/private/tmp/codegraph-corpus/vscode-sparse --prompts docs/benchmarks/2026-06-13-rust-indexing-core-phase-4-vscode-sufficiency-prompts.json --prompt-id VS-1 --timeout-ms 900000 --out docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-vscode-sparse-sufficiency.raw.json`

The latest required-target and VS Code sparse smoke artifacts used Node `v22.21.1`.

## Required Target Results

Required-only validation completed for ZCodeGraph and Excalidraw.

| Target | TS wall ms | Rust wall ms | TS peak RSS | Rust peak RSS | Rust-owned stages | Sufficiency |
|---|---:|---:|---:|---:|---|---|
| zcodegraph | 4768 | 8079 | 44560384 | 47910912 | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, esm-one-hop-reexport-resolution, local-exact-reference-resolution | passed |
| excalidraw | 3258 | 4959 | 48123904 | 48123904 | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, local-exact-reference-resolution | passed |

Both Rust arms produced active indexes readable by the TypeScript shell and graphStats collection.

## Fallback Taxonomy

Fallback is visible and non-zero.

| Target | Total fallback | Main remaining categories |
|---|---:|---|
| zcodegraph | 1507 | non-direct binding-level symbol disambiguation, unsupported import forms, unresolved file-level imports, TypeScript-owned finalization stages |
| excalidraw | 2400 | non-direct binding-level symbol disambiguation, unsupported import forms, unresolved file-level imports, TypeScript-owned finalization stages |

Issue #204 resolved 279 one-hop ESM named re-export references on ZCodeGraph and reduced its binding-level fallback from 1460 to 1445. Excalidraw had no matching one-hop direct named re-export hits in this required-only slice, so its binding-level fallback stayed at 1705.

The fallback taxonomy artifact is `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.md`.

Follow-up fallback audit: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-fallback-audit.md`.

## VS Code Sparse

The broad Phase 20 manifest includes VS Code sparse at `/private/tmp/codegraph-corpus/vscode-sparse`, but the full three-target smoke did not complete in a bounded local run and was interrupted. That broad run remains unavailable with reason: local broad smoke timeout under Node 26 override.

A bounded Node 22 sufficiency smoke completed afterward:

- Artifact: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-vscode-sparse-sufficiency.raw.json`
- Commit: `4ac53226`
- Copied files: 11518 per arm
- TypeScript index: 246553 ms
- Rust index: 441770 ms
- Explore analyze: 13910 ms
- Classification: `success-comparison-completed`
- Regression count: 0
- Default rollout readiness claimed: false

Manifest kept for rerun:

- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-completion.experiment.json`

## Decision

Phase 20 is not complete as an end-to-end Rust indexing data-production migration.

What is complete:

- #199 import/path-alias file-level slice is implemented and covered by public `--engine rust` integration behavior.
- #200 has one bounded expansion beyond import/path-alias: same-file exact callable reference resolution.
- #203 has one bounded symbol-level import expansion: direct same-name ESM named import/export resolution.
- #204 has one bounded re-export expansion: one-hop direct same-name ESM named re-export resolution for relative and existing `paths` alias targets.
- #201 has explicit fallback taxonomy evidence for required targets.

What remains:

- Binding-level import/export symbol disambiguation is partially Rust-owned; non-direct named import/export forms remain known-unsupported.
- Broad JS/TS reference resolution remains hybrid.
- Framework post-extract finalization, dynamic-dispatch synthesis, and DB maintenance remain TypeScript-owned.

Issue #202 should remain open until the remaining Rust-owned finalization work is completed and a final Phase 20 decision can say whether the non-zero known-unsupported fallback is acceptable or must be burned down first.

No Rust default rollout readiness is claimed.
