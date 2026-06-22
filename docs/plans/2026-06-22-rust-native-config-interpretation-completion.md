# Rust-Native TypeScript Module Resolution: Config Interpretation Completion

Date: 2026-06-22

## Parent

- Roadmap:
  `docs/plans/2026-06-22-rust-native-typescript-module-resolution-roadmap.md`
- Roadmap node:
  `1-2. Config interpretation`

## Goal

Complete the Roadmap Tree node `1-2. Config interpretation` for the
Rust-native TypeScript moduleResolution path.

Completion here means a bounded, repo-local, moduleResolution-focused config
interpreter. It does not mean reimplementing the full TypeScript compiler
config loader.

## Current State

Roadmap status before this plan:

- `[x] 1-2-1. tsconfig/jsconfig discovery`
- `[ ] 1-2-2. extends/default handling`
- `[ ] 1-2-3. moduleResolution modes`
- `[x] 1-2-4. baseUrl/paths`
- `[-] 1-2-5. rootDirs`

The Rust path currently discovers root-level `tsconfig.json` / `jsconfig.json`,
summarizes selected `compilerOptions`, and resolves baseUrl/paths plus a
bounded rootDirs relative-import slice. It does not yet interpret repo-local
`extends` chains, derive default moduleResolution values, or make
moduleResolution modes affect behavior in a principled way.

## Scope

This plan owns:

- repo-local JSON config `extends` chains;
- moduleResolution-related `compilerOptions` merge semantics;
- default values for the small set of options consumed by the Rust resolver;
- moduleResolution mode recognition and mode-aware package-map taxonomy;
- inherited-path basis for baseUrl, paths, and rootDirs;
- rootDirs completion for repo-local relative import parity;
- closeout evidence and Roadmap Tree update for `1-2`.

This plan does not own:

- npm package `extends`;
- full TypeScript config loading;
- project references;
- include/exclude/files semantics;
- extensionless candidate order;
- declaration/runtime target relationship;
- node_modules graph expansion;
- package resolution beyond the repo-local package maps already supported;
- production use of the TypeScript compiler API.

## Decisions

### Extends/default handling

Support repo-local JSON config `extends` chains:

- relative path extends;
- absolute path extends when the resolved path stays repo-local;
- `.json` suffix completion;
- directory target completion to `tsconfig.json`.

Do not support npm package extends in this plan. Those should be reported as an
explicit no-go / unsupported taxonomy rather than silently treated as parsed.

Merge only the moduleResolution-related fields consumed by the Rust resolver:

- `moduleResolution`;
- `module`;
- `baseUrl`;
- `paths`;
- `rootDirs`;
- `allowJs`;
- `resolveJsonModule`.

The child config overrides the base config for scalar fields. For path-bearing
fields, each path is interpreted relative to the config file where that field
was declared.

### Path basis

`baseUrl`, `paths` targets, and `rootDirs` are interpreted relative to the
directory of the config file that declares them.

The Rust implementation may store normalized internal paths for resolution, but
profile and decision artifacts should remain readable and should not imply
that every path came from the project root.

### moduleResolution modes

Recognize:

- `classic`;
- `node10`;
- `node16`;
- `nodenext`;
- `bundler`.

If `moduleResolution` is omitted, derive a bounded default from `module`.
`node16` / `nodenext` module values should default to the corresponding
moduleResolution mode; otherwise default to `node10`. The decision/profile
surface should distinguish explicit and defaulted moduleResolution values.

Mode-aware behavior in this plan is intentionally narrow:

- package `exports` / `imports` condition set and unsupported taxonomy may vary
  by moduleResolution mode;
- `classic` should fail closed for package maps and report unsupported/no-go
  taxonomy;
- already verified file candidate order must not be rearranged as part of this
  node.

### rootDirs

Complete rootDirs for repo-local relative import parity:

- when the source file is under any configured rootDir, relative imports may
  target the same virtual-relative path under another rootDir;
- inherited rootDirs use the path basis of the config file where they were
  declared;
- diagnostics distinguish resolved, target-not-found, and config-out-of-scope
  outcomes.

## Validation Contract

Each implementation slice must include deterministic Rust fixture tests for
positive and fallback/no-go behavior.

Closeout must include:

- `cargo test -p zcodegraph-core`;
- `npx vitest run __tests__/ts-module-resolution-oracle.test.ts`;
- `npm run build`;
- current-repository rust-hybrid profile artifact;
- current-repository TypeScript oracle smoke artifact;
- a closeout decision under `docs/benchmarks/`;
- Roadmap Tree status update for `1-2`.

VS Code sparse checkout smoke is not required for this plan.

## Issue Sequence

### 1. Repo-local extends/default handling

Implement repo-local config `extends` chains and bounded default handling for
the moduleResolution-related compilerOptions fields.

This is the foundation for the later mode and rootDirs slices because it
establishes the merged config model and path basis.

### 2. moduleResolution mode-aware subset

Make moduleResolution modes visible and behaviorally meaningful only for the
repo-local package-map condition/taxonomy subset.

This slice should not reorder file target candidates or attempt full
TypeScript compiler parity.

### 3. rootDirs inherited config completion

Complete rootDirs relative-import parity when rootDirs come from the merged
config chain and keep diagnostics explainable.

### 4. Config interpretation closeout

Run the required current-repo evidence, write the closeout decision, and update
the Roadmap Tree so `1-2. Config interpretation` accurately reflects the final
state.
