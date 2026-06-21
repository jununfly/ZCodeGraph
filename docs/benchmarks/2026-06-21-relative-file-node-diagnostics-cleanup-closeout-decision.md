# Relative File-Node Diagnostics Cleanup Closeout

Date: 2026-06-21

## Decision

Keep the diagnostics cleanup.

Rust-hybrid profile samples now preserve the existing fallback `reason` values
while adding privacy-safe `targetKind` and `targetExtension` metadata when a
relative import resolves to a real target path that does not have a code file
node.

The import-target taxonomy now uses that metadata to classify non-code targets
as actionable diagnostics categories:

- `nonCodeAssetTarget`
- `nonCodeConfigTarget`

This is a diagnostics-quality improvement, not a resolver behavior change and
not a performance claim.

## Scope Completed

- `file-node-not-found` remains the profile fallback reason.
- Profile samples can include:
  - `targetKind`
  - `targetExtension`
- Non-code asset/config targets remain unresolved and do not create graph
  edges.
- The taxonomy script remains backward compatible with older profile artifacts
  that do not contain target metadata.

## Deterministic Verification

Commands:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "emits bounded Rust import fallback samples"
npx vitest run __tests__/rust-import-target-taxonomy.test.ts
npm run build
```

Results:

- Passed.

Coverage:

- Rust profile samples preserve `reason: file-node-not-found`.
- Rust profile samples include `targetKind: asset` / `targetExtension: .css`.
- Rust profile samples include `targetKind: config` / `targetExtension: .json`.
- Profile samples remain source-content-free.
- Non-code targets do not get `imports` graph edges.
- Taxonomy profile mode classifies metadata-present asset/config samples as
  `nonCodeAssetTarget` / `nonCodeConfigTarget`.
- Metadata-absent profile samples still use the existing specifier heuristics.

## Current Repo Evidence

Artifacts:

- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-current.profile.json`
- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-current.measurement.json`
- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-current-taxonomy.json`
- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-current-taxonomy.md`

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-21-relative-file-node-diagnostics-current.profile.json \
  /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  scripts/targeted-profile-evidence.mjs \
  --out docs/benchmarks/2026-06-21-relative-file-node-diagnostics-current.measurement.json \
  --cwd . \
  -- /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

| Metric | Value |
| --- | ---: |
| `importPathAliasResolvedBySource.relative` | 645 |
| `importPathAliasFallbackBySource.relative` | 1 |
| `relative/file-node-not-found` sample count | 1 |
| taxonomy `nonCodeConfigTarget` | 1 |

Sample:

- `../package.json` from `__tests__/installer-isolation.test.ts` classified as
  `targetKind: config`, `targetExtension: .json`.

Measurement sidecar:

- Wall time: 31,339ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Interpretation:

- The current repo's remaining relative file-node residual is a non-code config
  target, not a code-target resolver blocker.

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifacts:

- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-vscode-sparse.measurement.json`
- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-vscode-sparse-taxonomy.json`
- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-vscode-sparse-taxonomy.md`

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-file-node-diagnostics-vscode-sparse.profile.json \
  /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/scripts/targeted-profile-evidence.mjs \
  --out /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-file-node-diagnostics-vscode-sparse.measurement.json \
  --cwd /private/tmp/codegraph-corpus/vscode-sparse \
  -- /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed:

| Metric | Value |
| --- | ---: |
| `importPathAliasResolvedBySource.relative` | 59,042 |
| `importPathAliasFallbackBySource.relative` | 5,180 |
| `relative/file-node-not-found` sample count | 309 |
| `relative/target-not-found` sample count | 4,871 |
| taxonomy `nonCodeAssetTarget` | 100 |
| taxonomy `supportedSourceSpecifier` | 100 |

Samples:

- `./actionbar.css` from
  `src/vs/base/browser/ui/actionbar/actionViewItems.ts` classified as
  `targetKind: asset`, `targetExtension: .css`.
- Repeated `../../../../nls.js` imports remain `target-not-found` samples. As
  recorded in the relative JS source specifier closeout, this appears tied to
  sparse checkout/corpus hydration because `src/vs/nls.*` is absent from the
  validated sparse checkout.

Measurement sidecar:

- Wall time: 882,966ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Interpretation:

- The `file-node-not-found` residual now has a clear non-code asset
  explanation in sampled VS Code sparse evidence.
- The remaining `target-not-found` / `supportedSourceSpecifier` samples are not
  solved by this diagnostics cleanup and should not be mixed with asset/config
  graph semantics.

## Closeout

This slice closes the relative `file-node-not-found` diagnostics cleanup.

The residual should be treated as:

- current repo: diagnostics-known non-code config boundary;
- VS Code sparse `file-node-not-found`: diagnostics-known non-code asset
  boundary in sampled evidence;
- VS Code sparse `target-not-found` / `nls.js`: separate supported-source or
  sparse-hydration follow-up candidate, not an asset/config resolver expansion.

Do not expand the graph to asset/config imports based on this evidence.
