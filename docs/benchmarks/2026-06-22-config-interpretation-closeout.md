# Rust-native config interpretation closeout

Issues: #447, #448, #449, #450

## Summary

This slice completed Roadmap node `1-2. Config interpretation` for the
Rust-native TypeScript moduleResolution path.

Completed behavior:

- repo-local JSON `extends` chains;
- relative repo-local extends with `.json` completion;
- repo-local absolute extends;
- directory extends to `tsconfig.json`;
- cycle/depth protection;
- resolver-owned `compilerOptions` merge;
- declaring-config path basis for path-bearing fields;
- defaulted moduleResolution mode from `module`;
- machine-readable `explicit` / `defaulted` mode source in profile and shadow
  samples;
- mode-aware package-map taxonomy for `classic`, `node10`, `node16`,
  `nodenext`, and `bundler`;
- `classic` fail-closed behavior for package `exports` / `imports`;
- inherited rootDirs relative-import behavior;
- rootDirs fallback taxonomy for target-not-found and config-out-of-scope.

## Scope Boundaries

This closeout does not claim full TypeScript compiler config parity.

Intentionally out of scope:

- npm package `extends`;
- full `include` / `exclude` / `files` / `references` config loading;
- full project references;
- production use of the TypeScript compiler API;
- `node_modules` graph expansion;
- extensionless candidate order;
- `.d.ts` declaration pairing;
- declaration/runtime target relationship;
- package resolution beyond the repo-local package maps already supported.

## Deterministic Coverage

`cargo test -p zcodegraph-core` covers:

- inherited paths alias resolution with declaring-config path basis;
- child `compilerOptions` override behavior;
- unsupported package extends failing closed without loading `node_modules`;
- explicit moduleResolution mode source reporting;
- defaulted moduleResolution mode source reporting;
- `classic` package-map fail-closed behavior;
- inherited rootDirs path basis;
- rootDirs target-not-found taxonomy;
- rootDirs config-out-of-scope taxonomy;
- existing relative, paths alias, package maps, explicit runtime extension
  pairing, and guarded edge-write behavior.

## Current Repository Evidence

Profile artifact:

- `docs/benchmarks/2026-06-22-config-interpretation-current.profile.json`

TypeScript oracle artifacts:

- `docs/benchmarks/2026-06-22-config-interpretation-current-oracle.json`
- `docs/benchmarks/2026-06-22-config-interpretation-current-oracle.md`

Profile summary:

- `moduleResolutionEffectiveModeSource`: `defaulted`
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

## Validation

Commands run:

- `cargo test -p zcodegraph-core`
- `npx vitest run __tests__/ts-module-resolution-oracle.test.ts`
- `npm run build`
- `cargo build -p zcodegraph-core`
- current-repository `rust-hybrid` profile smoke with
  `ZCODEGRAPH_RUST_CORE_BINARY=target/debug/zcodegraph-core`
- current-repository TypeScript oracle smoke

VS Code sparse checkout smoke was not required for this closeout.

## Decision

Close #447, #448, #449, and #450 as complete.

Roadmap node `1-2. Config interpretation` is complete within the bounded
Rust-native moduleResolution scope defined by
`docs/plans/2026-06-22-rust-native-config-interpretation-completion.md`.

Remaining work belongs to other Roadmap nodes, especially file target
semantics, declaration/runtime target relationship, package condition
completion, and guarded symbol-level graph writing.
