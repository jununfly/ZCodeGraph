# Rust Indexing Core Phase 20 Decision

## Scope

This record covers Phase 20 issues #199-#202 after adding two Rust-owned finalization slices:

- `import-path-alias-resolution`
- `local-exact-reference-resolution`

This is not a Rust default rollout decision and does not close the post-PRD performance/RSS optimization targets in #165 or #193.

## Implementation Evidence

Rust now writes finalization edges directly into the existing SQLite schema without adding a persistent schema migration.

The implemented slices are:

- JS/TS relative and root `tsconfig.json` / `jsconfig.json` `compilerOptions.paths` file-level import resolution.
- Same-file exact callable reference resolution for unambiguous `calls` and `instantiates` references.

Unsupported resolver behavior remains explicit fallback:

- imported binding to exported symbol disambiguation,
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
- `CODEGRAPH_ALLOW_UNSAFE_NODE=1 node scripts/rust-indexing-experiment.mjs --experiment docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.experiment.json --out docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.raw.json --summary-out docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.md`

The validation used Node `v26.0.0` with `CODEGRAPH_ALLOW_UNSAFE_NODE=1` because no Node 22 binary was available in this shell. Treat the run as Phase 20 smoke evidence, not rollout-readiness evidence.

## Required Target Results

Required-only validation completed for ZCodeGraph and Excalidraw.

| Target | TS wall ms | Rust wall ms | TS peak RSS | Rust peak RSS | Rust-owned stages | Sufficiency |
|---|---:|---:|---:|---:|---|---|
| zcodegraph | 4967 | 7762 | 58228736 | 58425344 | source-scan, parse-extraction, graph-write, import-path-alias-resolution, local-exact-reference-resolution | passed |
| excalidraw | 3427 | 4952 | 57671680 | 56410112 | source-scan, parse-extraction, graph-write, import-path-alias-resolution, local-exact-reference-resolution | passed |

Both Rust arms produced active indexes readable by the TypeScript shell and graphStats collection.

## Fallback Taxonomy

Fallback is visible and non-zero.

| Target | Total fallback | Main remaining categories |
|---|---:|---|
| zcodegraph | 2384 | binding-level symbol disambiguation, unsupported import forms, unresolved file-level imports, TypeScript-owned finalization stages |
| excalidraw | 2429 | binding-level symbol disambiguation, unsupported import forms, unresolved file-level imports, TypeScript-owned finalization stages |

The fallback taxonomy artifact is `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.md`.

## VS Code Sparse

The broad Phase 20 manifest includes VS Code sparse at `/private/tmp/codegraph-corpus/vscode-sparse`, but the full three-target smoke did not complete in a bounded local run and was interrupted. The stress target remains unavailable for this decision with reason: local broad smoke timeout under Node 26 override.

Manifest kept for rerun:

- `docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-completion.experiment.json`

## Decision

Phase 20 is not complete as an end-to-end Rust indexing data-production migration.

What is complete:

- #199 import/path-alias file-level slice is implemented and covered by public `--engine rust` integration behavior.
- #200 has one bounded expansion beyond import/path-alias: same-file exact callable reference resolution.
- #201 has explicit fallback taxonomy evidence for required targets.

What remains:

- Binding-level import/export symbol disambiguation is still not Rust-owned.
- Broad JS/TS reference resolution remains hybrid.
- Framework post-extract finalization, dynamic-dispatch synthesis, and DB maintenance remain TypeScript-owned.
- VS Code sparse Phase 20 smoke still needs a bounded rerun on a supported Node environment.

#202 should remain open until the remaining Rust-owned finalization work is completed and VS Code sparse has a completed run or a more durable unavailable reason.

No Rust default rollout readiness is claimed.
