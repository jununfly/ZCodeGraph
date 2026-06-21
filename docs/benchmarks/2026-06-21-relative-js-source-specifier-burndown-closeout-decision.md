# Relative JS Source Specifier Burndown Closeout

Date: 2026-06-21

## Decision

Keep the relative JS source specifier fallback.

The implementation reduces the Rust relative import target gap on both the
current repo and the VS Code sparse checkout while preserving the intended
semantic boundary:

- only relative imports changed;
- literal `.js` targets still win when present;
- alias/workspace/package paths did not opt into the fallback;
- asset imports stayed unresolved and out of the graph.

This is a feature-completeness keep decision, not a performance claim.

## Scope Completed

Rust relative import resolution now handles explicit JS runtime specifiers as a
source-file fallback when the literal file is absent:

- `.js` -> `.ts`, `.tsx`, `.mts`, `.cts`, `.jsx`
- `.mjs` -> `.mts`, `.ts`, `.tsx`, `.js`
- `.cjs` -> `.cts`, `.ts`, `.tsx`, `.js`

The fallback is only used by the relative import path. Alias, tsconfig path,
conventional alias, workspace package, package import, asset import, dynamic
import, and symbol-level behavior were not intentionally changed.

## Deterministic Evidence

Commands:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "resolves only relative JS source specifiers"
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "relative and paths-alias|conventional aliases|emits bounded Rust import fallback samples|resolves only relative JS source specifiers"
cargo test -p zcodegraph-core import_fallback
```

Results:

- Passed.

The integration fixture proves:

- `./target.js` can resolve to `target.ts` when literal `target.js` is absent;
- `.js` can resolve to `.tsx`;
- `.mjs` and `.cjs` can fall through to `.ts` when `.mts` / `.cts` are absent;
- literal `target.js` wins over `target.ts`;
- `./style.css` remains unresolved;
- `@app/alias-only.js` remains unresolved in this slice.

## Current Repo Evidence

Before artifacts reused from the import fallback samples closeout:

- `docs/benchmarks/2026-06-21-import-fallback-samples-current.profile.json`
- `docs/benchmarks/2026-06-21-import-fallback-samples-current-taxonomy.json`

After artifacts:

- `docs/benchmarks/2026-06-21-relative-js-source-fallback-current-after.profile.json`
- `docs/benchmarks/2026-06-21-relative-js-source-fallback-current-after-taxonomy.json`
- `docs/benchmarks/2026-06-21-relative-js-source-fallback-current-after-taxonomy.md`
- `docs/benchmarks/2026-06-21-relative-js-source-fallback-current-after.measurement.json`

After command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-21-relative-js-source-fallback-current-after.profile.json \
  /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  scripts/targeted-profile-evidence.mjs \
  --out docs/benchmarks/2026-06-21-relative-js-source-fallback-current-after.measurement.json \
  --cwd . \
  -- /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed movement:

| Metric | Before | After |
| --- | ---: | ---: |
| `importPathAliasResolvedBySource.relative` | 637 | 645 |
| `importPathAliasFallbackBySource.relative` | 9 | 1 |
| `relative/target-not-found` samples count | 8 | 0 |
| `relative/file-node-not-found` samples count | 1 | 1 |
| taxonomy `supportedSourceSpecifier` | 8 | 0 |
| taxonomy `assetLikeTarget` | 1 | 1 |

Measurement sidecar:

- Wall time: 31,130ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Interpretation:

- The current repo's `.js` source specifier misses were resolved.
- The remaining relative miss is an asset-like target, not a code-target miss.

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Before artifacts reused from the import fallback samples closeout:

- `docs/benchmarks/2026-06-21-import-fallback-samples-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-21-import-fallback-samples-vscode-sparse-taxonomy.json`

After artifacts:

- `docs/benchmarks/2026-06-21-relative-js-source-fallback-vscode-sparse-after.profile.json`
- `docs/benchmarks/2026-06-21-relative-js-source-fallback-vscode-sparse-after-taxonomy.json`
- `docs/benchmarks/2026-06-21-relative-js-source-fallback-vscode-sparse-after-taxonomy.md`
- `docs/benchmarks/2026-06-21-relative-js-source-fallback-vscode-sparse-after.measurement.json`

After command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-js-source-fallback-vscode-sparse-after.profile.json \
  /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/scripts/targeted-profile-evidence.mjs \
  --out /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-js-source-fallback-vscode-sparse-after.measurement.json \
  --cwd /private/tmp/codegraph-corpus/vscode-sparse \
  -- /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed movement:

| Metric | Before | After |
| --- | ---: | ---: |
| `importPathAliasResolvedBySource.relative` | 31 | 59,042 |
| `importPathAliasFallbackBySource.relative` | 64,191 | 5,180 |
| `relative/target-not-found` samples count | 63,882 | 4,871 |
| `relative/file-node-not-found` samples count | 309 | 309 |
| `unresolved-file-level-import-target` fallback taxonomy | 64,429 | 5,418 |
| taxonomy `supportedSourceSpecifier` sample bucket | 100 | 100 |
| taxonomy `assetLikeTarget` sample bucket | 100 | 100 |

Measurement sidecar:

- Wall time: 445,460ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Interpretation:

- The main relative `.js` source specifier class moved substantially.
- Remaining `supportedSourceSpecifier` samples are dominated by repeated
  `nls.js` imports. The sparse checkout used for this evidence does not contain
  `src/vs/nls.*`, so this residual appears to be a corpus hydration/sparse
  checkout boundary, not a same-basename source fallback bug.
- Asset imports remain visible and intentionally unresolved.

## Next Recommended Move

Do not continue expanding file-target resolution into asset or package semantics.

Two reasonable next moves remain:

1. Investigate the residual `relative/file-node-not-found` bucket. It is small
   but semantically different from `target-not-found`, and may expose extraction,
   indexing inclusion, or sparse-checkout hydration issues.
2. Return to binding-level symbol disambiguation, which remains the largest
   known resolver migration gap.

Recommended next slice: inspect `relative/file-node-not-found` with profile
samples before choosing another production resolver change.
