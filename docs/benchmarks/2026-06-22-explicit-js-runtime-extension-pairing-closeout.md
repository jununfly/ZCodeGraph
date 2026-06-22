# Explicit JS runtime extension pairing closeout

Issue: #446

## Summary

This slice completed Rust-native moduleResolution pairing for explicit
JavaScript runtime extensions that commonly point at TypeScript source files
in TS-style projects.

Implemented mappings:

- `.js` -> `.ts`, `.tsx`, `.js`
- `.jsx` -> `.tsx`, `.jsx`
- `.mjs` -> `.mts`, `.mjs`
- `.cjs` -> `.cts`, `.cjs`

The mapping is used by the shared file-target candidate path, so it applies to
relative imports, paths/rootDirs candidates, workspace package candidates, and
package self-name / exports / imports candidates when those paths resolve to
repo-local file targets.

## In Scope

- explicit runtime extension source pairing;
- `.mts` and `.cts` source scanning through the TypeScript grammar;
- deterministic Rust core fixtures for relative, paths alias, and package map
  targets;
- current-repository profile and TypeScript oracle smoke evidence.

## Out Of Scope

- extensionless candidate order;
- `.d.ts` declaration pairing;
- declaration/runtime target relationship;
- package resolution beyond the repo-local candidates already supported;
- VS Code sparse checkout smoke.

## Deterministic Fixture Coverage

`cargo test -p zcodegraph-core` covers:

- relative `./dep.js` resolving to `src/dep.ts` before `src/dep.js`;
- relative `./view.jsx` resolving to `src/view.tsx`;
- relative `./module.mjs` resolving to `src/module.mts`;
- relative `./common.cjs` resolving to `src/common.cts`;
- paths alias `@lib/alias.js` resolving to `src/lib/alias.ts`;
- fallback to runtime `.js` when no TypeScript pair exists;
- package self-name / exports target `./src/features/feature.js` resolving to
  `src/features/feature.ts`.

## Current Repository Smoke

Profile artifact:

- `docs/benchmarks/2026-06-22-explicit-js-runtime-extension-pairing-current.profile.json`

TypeScript oracle artifacts:

- `docs/benchmarks/2026-06-22-explicit-js-runtime-extension-pairing-current-oracle.json`
- `docs/benchmarks/2026-06-22-explicit-js-runtime-extension-pairing-current-oracle.md`

Profile summary:

- `importPathAliasResolvedRefs`: 662
- `importPathAliasFallbackRefs`: 2601
- resolved by source: relative 645, tsconfig paths 17
- guarded edge writes: attempted 663, written 662, skipped 1
- skipped reason: `file-node-not-found` 1

Oracle summary:

- rows inspected: 336
- parity statuses: `match` 336
- resolved kinds: third-party package 100, node runtime builtin 100,
  repo-local source 100, repo-local paths alias 36

## Decision

Close #446 as complete. The explicit runtime extension pairing slice is now
implemented and covered by deterministic tests plus current-repository profile
and oracle smoke evidence.

Keep the broader Roadmap Tree parent nodes partial:

- `1-5. File target semantics` remains partial.
- `1-5-2. extension pairing` remains partial.
- `1-5-2-2. extensionless candidate order + mts/cts inclusion` remains open.
- `1-5-4. declaration/runtime target relationship` remains open.
