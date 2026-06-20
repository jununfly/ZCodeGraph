# Relative Import Target Burndown Closeout

Date: 2026-06-21

## Decision

Close this slice as no-go for production resolver changes.

The internal taxonomy diagnostic is keepable, and the targeted profiles confirm
the existing rust-hybrid path still completes. However, the final SQLite DB does
not retain the relative import target miss rows needed to choose a safe bounded
fix. Implementing query/hash stripping, path normalization changes, or any other
relative import behavior from profile counters alone would be speculative.

## Scope Completed

- Added `scripts/rust-import-target-taxonomy.mjs`.
- Added deterministic coverage for classifying relative unresolved JS/TS import
  rows from DB metadata.
- Generated current-repo and VS Code sparse taxonomy artifacts.
- Ran current-repo targeted rust-hybrid profile.
- Ran VS Code sparse targeted rust-hybrid profile.
- Recorded no-go for the bounded implementation slice.

No production resolver behavior changed.

## Deterministic Evidence

Command:

```bash
npx vitest run __tests__/rust-import-target-taxonomy.test.ts
```

Result:

- Passed.

The test proves:

- the taxonomy script reads a DB path and writes JSON/markdown artifacts;
- only JS/TS relative import unresolved refs are classified;
- non-relative imports, non-import refs, and unsupported languages are ignored;
- query/hash source targets, asset-like targets, extensionless/index candidates,
  and declaration targets are separated.

## Current Repo Profile

Artifact:

- `docs/benchmarks/2026-06-21-relative-import-target-burndown-current.profile.json`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-21-relative-import-target-burndown-current.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 30.97s.
- RSS: unavailable. `/usr/bin/time -l` returned
  `time: sysctl kern.clockrate: Operation not permitted`.
- `importPathAliasResolvedRefs`: 654.
- `importPathAliasFallbackRefs`: 2,535.
- `importPathAliasBindingFallbackRefs`: 2,477.
- `importPathAliasUnsupportedFallbackRefs`: 49.
- `importPathAliasUnresolvedFallbackRefs`: 9.
- `importPathAliasFallbackBySource.relative`: 9.
- Final DB taxonomy relative unresolved JS/TS imports: 0.

Reference-resolution fallback taxonomy:

- `binding-level-symbol-disambiguation-not-yet-rust-owned`: 1,530.
- `unsupported-import-form-not-yet-rust-owned`: 44.
- `unresolved-file-level-import-target`: 14.

## VS Code Sparse Profile

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifact:

- `docs/benchmarks/2026-06-21-relative-import-target-burndown-vscode-sparse.profile.json`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-import-target-burndown-vscode-sparse.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 637.22s.
- RSS: unavailable. `/usr/bin/time -l` returned
  `time: sysctl kern.clockrate: Operation not permitted`.
- `importPathAliasResolvedRefs`: 31.
- `importPathAliasFallbackRefs`: 170,384.
- `importPathAliasBindingFallbackRefs`: 105,920.
- `importPathAliasUnsupportedFallbackRefs`: 273.
- `importPathAliasUnresolvedFallbackRefs`: 64,191.
- `importPathAliasFallbackBySource.relative`: 64,191.
- Final DB taxonomy relative unresolved JS/TS imports: 0.

Reference-resolution fallback taxonomy:

- `binding-level-symbol-disambiguation-not-yet-rust-owned`: 105,919.
- `unsupported-import-form-not-yet-rust-owned`: 35.
- `unresolved-file-level-import-target`: 64,429.

## Interpretation

The profile counters still show a large Rust-core relative import target gap.
The taxonomy script cannot classify that gap from the final DB because
TypeScript finalization cleanup removes the unresolved rows.

That makes the bounded implementation issue intentionally close as no-op/no-go.
This protects resolver semantics: we should not infer a production fix from
aggregate counters alone.

## Next Recommended Move

Add a pre-cleanup profile artifact for Rust import target fallback samples. The
artifact should preserve only privacy-safe metadata needed for taxonomy:

- import specifier;
- source file path;
- language;
- line/column;
- source-kind classification;
- resolver fallback reason.

Do not read or include source slices. Once that artifact exists, rerun the
relative import target taxonomy and choose at most one bounded code-target
burndown.
