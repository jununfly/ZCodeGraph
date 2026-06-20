# Import Fallback Profile Samples Closeout

Date: 2026-06-21

## Decision

Keep the Rust import fallback profile samples diagnostic.

The new profile artifact solves the prior data-source gap: Rust core profile
counters can now be explained before TypeScript finalization cleanup removes
`unresolved_refs` from the final database.

The next bounded burndown category is selected:

- **relative `.js` source specifier from TypeScript files resolving to supported
  TS/TSX/JS/JSX source candidates**

This is a low-risk code-target category because the samples are source-file
specifier shapes, not assets, package resolution, bundler loader semantics, or
symbol disambiguation. It should be handled as a separate implementation slice.

## Scope Completed

- Rust core profile now emits:
  - `importPathAliasFallbackSampleCounts`
  - `importPathAliasFallbackSamples`
  - `importPathAliasFallbackSampleCap`
- Samples are capped at:
  - 100 per `(sourceKind, reason)` bucket
  - 2,000 total
- Samples include only:
  - `sourceKind`
  - `reason`
  - `referenceName`
  - `filePath`
  - `language`
  - `line`
  - `col`
- `scripts/rust-import-target-taxonomy.mjs` now supports:
  - `--db`
  - `--repo`
  - `--profile`
- No resolver semantics changed.
- No graph edges changed intentionally.
- No SQLite schema, `status`, `doctor`, README, or public API changed.

## Deterministic Evidence

Commands:

```bash
cargo test -p zcodegraph-core import_fallback
cargo test -p zcodegraph-core emits_machine_readable_result_json
npx vitest run __tests__/rust-import-target-taxonomy.test.ts
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "emits bounded Rust import fallback samples"
```

Results:

- Passed.

The tests prove:

- full fallback counts are preserved even when samples are capped;
- sample cap metadata is emitted;
- profile JSON includes empty sample fields when no fallbacks exist;
- a real Rust index emits samples for relative target misses;
- taxonomy `--profile` mode classifies Rust core profile samples;
- taxonomy `--db` mode remains intact;
- samples do not include source content fields.

## Current Repo Evidence

Profile artifact:

- `docs/benchmarks/2026-06-21-import-fallback-samples-current.profile.json`

Taxonomy artifacts:

- `docs/benchmarks/2026-06-21-import-fallback-samples-current-taxonomy.json`
- `docs/benchmarks/2026-06-21-import-fallback-samples-current-taxonomy.md`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-21-import-fallback-samples-current.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 31.18s.
- RSS: unavailable. `/usr/bin/time -l` returned
  `time: sysctl kern.clockrate: Operation not permitted`.
- Sample counts:
  - `binding/binding-level-symbol-disambiguation`: 2,477
  - `relative/file-node-not-found`: 1
  - `relative/target-not-found`: 8
  - `unsupported/unsupported-import-form`: 49
- Sample cap:
  - `perBucket`: 100
  - `total`: 2,000
  - `truncated`: true
- Relative taxonomy:
  - `supportedSourceSpecifier`: 8
  - `assetLikeTarget`: 1

Current repo examples show `.ts` files importing relative `.js` source
specifiers such as:

- `../../src/index.js`
- `./scoring.js`
- `./types.js`
- `./explore-types.js`

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Profile artifact:

- `docs/benchmarks/2026-06-21-import-fallback-samples-vscode-sparse.profile.json`

Taxonomy artifacts:

- `docs/benchmarks/2026-06-21-import-fallback-samples-vscode-sparse-taxonomy.json`
- `docs/benchmarks/2026-06-21-import-fallback-samples-vscode-sparse-taxonomy.md`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-import-fallback-samples-vscode-sparse.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 650.94s.
- RSS: unavailable. `/usr/bin/time -l` returned
  `time: sysctl kern.clockrate: Operation not permitted`.
- Sample counts:
  - `binding/binding-level-symbol-disambiguation`: 105,920
  - `relative/file-node-not-found`: 309
  - `relative/target-not-found`: 63,882
  - `unsupported/unsupported-import-form`: 273
- Sample cap:
  - `perBucket`: 100
  - `total`: 2,000
  - `truncated`: true
- Relative taxonomy over sampled rows:
  - `supportedSourceSpecifier`: 100
  - `assetLikeTarget`: 100

VS Code sparse examples show the same source-specifier pattern at scale:

- `./dom.js`
- `../common/observable.js`
- `./window.js`
- `../common/errors.js`
- `../common/event.js`

It also shows a separate asset class, especially `.css` imports:

- `./actionbar.css`
- `./aria.css`
- `./button.css`
- `./contextview.css`

Asset imports remain explicitly out of scope for graph edge creation.

## Interpretation

The prior final-DB taxonomy no-go was caused by the wrong sampling layer. The
new profile samples capture the needed metadata before cleanup and make the
large relative gap explainable.

The strongest next candidate is the `.js` source specifier pattern. VS Code and
the current repo both contain TypeScript files that import relative `.js`
specifiers while the repository source files are TypeScript. Rust currently
treats explicit `.js` as a literal extension and does not try the corresponding
`.ts`/`.tsx` candidates.

This candidate is bounded and code-target only. It must still reject asset
imports and must not expand into package `exports`, bundler loader semantics,
dynamic imports, sparse-checkout missing files, or symbol disambiguation.

## Next Recommended Slice

Implement a bounded Rust resolver burndown for relative `.js` source specifiers
from JS/TS files:

- when a relative import explicitly ends in `.js`, `.mjs`, or `.cjs`;
- and the literal file does not exist;
- try supported TypeScript/JavaScript source candidates such as `.ts`, `.tsx`,
  `.mts`, `.cts`, `.js`, and `.jsx` using the existing file-node validation path;
- do not apply this to assets or non-code extensions;
- keep diagnostics showing movement in `relative/target-not-found` and
  `supportedSourceSpecifier`;
- validate with deterministic fixtures plus current-repo and VS Code sparse
  targeted profile/taxonomy evidence.
