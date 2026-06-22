# Rust-native extensionless file target closeout

Date: 2026-06-22

Scope: Roadmap Tree `1-5. File target semantics`, specifically
`1-5-2-2. extensionless candidate order + mts/cts inclusion`.

## Decision

Status: complete for the bounded extensionless file target semantics slice.

Rust-owned repo-local file target resolution now uses the same extensionless
candidate order for file targets and directory `index.*` targets:

1. `.ts`
2. `.tsx`
3. `.mts`
4. `.cts`
5. `.d.ts`
6. `.d.mts`
7. `.d.cts`
8. `.js`
9. `.jsx`
10. `.mjs`
11. `.cjs`

The behavior is shared by repo-local resolver entry paths that already produce
a local base path, including relative imports, tsconfig/jsconfig paths,
workspace package imports, package self-name imports, and package `imports`.

## Boundaries

This closeout does not complete `1-5. File target semantics` as a whole.

Still open:

- `1-5-4. declaration/runtime target relationship`

Explicitly out of scope:

- full TypeScript module resolution
- package `main`, package `type`, package manager, or `node_modules` expansion
- changing explicit `.js`, `.mjs`, or `.cjs` runtime extension pairing
- adding extensionless config/data/asset candidates such as `.json`

## Deterministic Evidence

New Rust tests:

- `rust_resolves_extensionless_mts_cts_and_directory_index_targets`
- `rust_prefers_extensionless_source_candidate_order_before_js_family`
- `rust_shares_extensionless_file_targets_across_repo_local_resolver_paths`
- `rust_does_not_expand_extensionless_config_data_targets_into_graph_edges`

Verification commands:

- `cargo fmt`
- `cargo test -p zcodegraph-core`
- `npx vitest run __tests__/ts-module-resolution-oracle.test.ts`
- `npm run build`
- `cargo build -p zcodegraph-core`
- `git diff --check`

## Current Repo Smoke

Artifacts:

- Profile:
  `docs/benchmarks/2026-06-22-extensionless-file-target-current.profile.json`
- Oracle JSON:
  `docs/benchmarks/2026-06-22-extensionless-file-target-current-oracle.json`
- Oracle summary:
  `docs/benchmarks/2026-06-22-extensionless-file-target-current-oracle.md`

Observed:

- Files: 4 JavaScript, 305 TypeScript
- `importPathAliasResolvedRefs`: 665
- `importPathAliasFallbackRefs`: 2626
- `importPathAliasResolvedBySource.relative`: 648
- `importPathAliasFallbackBySource.relative`: 1
- Oracle rows inspected: 336
- Oracle parity: `match = 336`

## VS Code Sparse Smoke

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifacts:

- Profile:
  `docs/benchmarks/2026-06-22-extensionless-file-target-vscode-sparse.profile.json`
- Oracle JSON:
  `docs/benchmarks/2026-06-22-extensionless-file-target-vscode-sparse-oracle.json`
- Oracle summary:
  `docs/benchmarks/2026-06-22-extensionless-file-target-vscode-sparse-oracle.md`

Observed:

- Files: 33 JavaScript, 5747 TypeScript
- `importPathAliasResolvedRefs`: 59042
- `importPathAliasFallbackRefs`: 111387
- `importPathAliasResolvedBySource.relative`: 59042
- `importPathAliasFallbackBySource.relative`: 5180
- Oracle rows inspected: 300
- Oracle parity: `match = 200`, `mismatch = 100`

The VS Code sparse mismatch bucket is `package/runtime unresolved no-go
taxonomy`, not the extensionless repo-local file target candidate order covered
by this slice.

## Roadmap Update

- `1-5-2. extension pairing`: complete
- `1-5-2-2. extensionless candidate order + mts/cts inclusion`: complete
- `1-5. File target semantics`: still partial because `1-5-4` remains open
