# Rust-Hybrid JS/TS File Import Target Parity Closeout

Date: 2026-06-20

## Decision

Keep the Rust JS/TS file-level import target parity slice.

The implementation improves feature completeness for conventional aliases and
workspace package subpaths, and it adds source-kind diagnostics that make the
remaining file-target gap easier to reason about. It does not materially reduce
the VS Code sparse `unresolved-file-level-import-target` gap because that corpus
did not exercise the newly added conventional-alias or workspace-package paths.

This is a semantic/diagnostic keep decision, not a performance win claim.

## Scope Verified

- Conventional aliases:
  - `@/`
  - `~/`
  - `@src/`
  - `src/`
  - `@app/`
  - `app/`
- Workspace package subpaths from:
  - root `package.json` `workspaces` array;
  - root `package.json` `workspaces.packages` array;
  - root `pnpm-workspace.yaml` `packages:` list.
- Longest package-name matching.
- Existing relative import behavior.
- Existing tsconfig/jsconfig paths behavior.
- Profile diagnostics:
  - `importPathAliasResolvedBySource`
  - `importPathAliasFallbackBySource`

No package `exports`, `main`, npm package resolution, `.svelte`/`.vue` target
extensions, or binding-level symbol disambiguation was added.

## Deterministic Evidence

- `cargo test rust_workspace_package_loader_handles_manifests_and_longest_match`
  - Passed.
- `cargo test rust_resolves_js_ts_alias_and_workspace_file_import_targets`
  - Passed.
- `cargo test emits_machine_readable_result_json`
  - Passed.
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "relative and paths-alias|conventional aliases and workspace package"`
  - Passed.
- `npm run build`
  - Passed.

The deterministic fixtures prove:

- conventional aliases resolve to Rust-owned file-level `imports` edges;
- package.json workspaces resolve to Rust-owned file-level `imports` edges;
- pnpm workspace packages resolve to Rust-owned file-level `imports` edges;
- existing relative and tsconfig/jsconfig path behavior remains covered;
- profile source-kind diagnostics are present.

## Current Repo Profile

Artifact:

- `docs/benchmarks/2026-06-20-js-ts-file-import-target-parity-current.profile.json`

Command used Node 24.14.0 from the Codex runtime to avoid the host Node 26
unsupported-version gate:

```bash
env CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-js-ts-file-import-target-parity-current.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 30.92s.
- RSS: unavailable. `/usr/bin/time -l` returned
  `time: sysctl kern.clockrate: Operation not permitted` in this sandbox before
  reporting max RSS.
- `importPathAliasResolvedRefs`: 654.
- `importPathAliasFallbackRefs`: 2,525.
- `importPathAliasBindingFallbackRefs`: 2,467.
- `importPathAliasUnsupportedFallbackRefs`: 49.
- `importPathAliasUnresolvedFallbackRefs`: 9.
- `importPathAliasResolvedBySource`:
  - `relative`: 637
  - `tsconfigPaths`: 17
  - `conventionalAlias`: 0
  - `workspacePackage`: 0
- `importPathAliasFallbackBySource`:
  - `relative`: 9
  - `tsconfigPaths`: 0
  - `conventionalAlias`: 0
  - `workspacePackage`: 0
  - `binding`: 2,467
  - `unsupported`: 49
  - `unresolved`: 9
- Reference-resolution fallback taxonomy:
  - `binding-level-symbol-disambiguation-not-yet-rust-owned`: 1,520
  - `unsupported-import-form-not-yet-rust-owned`: 44
  - `unresolved-file-level-import-target`: 14

Interpretation:

- The current repo does not exercise the new conventional alias or workspace
  package paths in a meaningful way.
- The new diagnostics are present and show that remaining file-target misses in
  this repo are relative-path misses.

## VS Code Sparse Profile

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Verified as a Git checkout containing `src/vs/workbench`, `src/vs/platform`,
  and `src/vs/base`.

Artifact:

- `docs/benchmarks/2026-06-20-js-ts-file-import-target-parity-vscode-sparse.profile.json`

Command:

```bash
env CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-20-js-ts-file-import-target-parity-vscode-sparse.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 648.28s.
- RSS: unavailable. `/usr/bin/time -l` returned
  `time: sysctl kern.clockrate: Operation not permitted` in this sandbox before
  reporting max RSS.
- `importPathAliasResolvedRefs`: 31.
- `importPathAliasFallbackRefs`: 170,384.
- `importPathAliasBindingFallbackRefs`: 105,920.
- `importPathAliasUnsupportedFallbackRefs`: 273.
- `importPathAliasUnresolvedFallbackRefs`: 64,191.
- `importPathAliasResolvedBySource`:
  - `relative`: 31
  - `tsconfigPaths`: 0
  - `conventionalAlias`: 0
  - `workspacePackage`: 0
- `importPathAliasFallbackBySource`:
  - `relative`: 64,191
  - `tsconfigPaths`: 0
  - `conventionalAlias`: 0
  - `workspacePackage`: 0
  - `binding`: 105,920
  - `unsupported`: 273
  - `unresolved`: 64,191
- Reference-resolution fallback taxonomy:
  - `binding-level-symbol-disambiguation-not-yet-rust-owned`: 105,919
  - `unsupported-import-form-not-yet-rust-owned`: 35
  - `unresolved-file-level-import-target`: 64,429

Interpretation:

- The VS Code sparse corpus did not exercise the newly added conventional alias
  or workspace package paths.
- The large file-target gap is now more specifically attributable to relative
  import target misses, not to conventional aliases or workspace package
  subpaths.
- This changes the next-step priority: do not keep expanding this slice toward
  package resolution; inspect the relative unresolved import target set or move
  to binding-level symbol disambiguation depending on whether the next goal is
  file-target completeness or resolver migration depth.

## Follow-Up

- Keep conventional alias and workspace package support because deterministic
  fixtures prove semantic parity for those TS resolver paths.
- Use the new source-kind diagnostics in future profile closeouts.
- If continuing file-target completeness, sample the `relative` unresolved
  target set before implementing another resolver expansion.
- If continuing resolver migration, return to binding-level import/export symbol
  disambiguation because it remains the largest known unsupported category.
