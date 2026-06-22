# Rust-Native TypeScript Module Resolution: Package Map Condition Set Completion

Date: 2026-06-22

## Parent

- Roadmap:
  `docs/plans/2026-06-22-rust-native-typescript-module-resolution-roadmap.md`
- Roadmap node:
  `1-4. Package exports/imports for repo-local targets`

## Goal

Complete Roadmap node `1-4. Package exports/imports for repo-local targets`
by finishing bounded condition-set handling for repo-local package
`exports` / `imports`.

Completion here means repo-local graph sufficiency for package maps. It does
not mean reimplementing Node.js or TypeScript package resolution in full.

## Current State

Roadmap status before this plan:

- `[x] 1-4-1. exports "." and subpath entries`
- `[x] 1-4-2. imports "#" entries`
- `[-] 1-4-3. condition set handling for repo-local source`
- `[x] 1-4-4. no node_modules graph expansion by default`

The Rust path already supports repo-local package self-name imports, package
`exports`, package `imports`, exact entries, subpath entries, patterns, nested
condition objects, and fail-closed behavior for unsupported package map shapes.

The remaining gap is that condition selection is still too simple. It has a
mode-aware entry point, but the effective order is not yet rich enough for
modern TypeScript package maps or custom conditions.

## Scope

This plan owns:

- a single shared condition selection helper for package `exports` and
  package `imports`;
- exact key, pattern key, and nested condition object behavior using the same
  helper;
- `compilerOptions.customConditions` for repo-local package maps;
- mode/import-kind aware condition order;
- ESM import/export-from versus CJS `require()` condition selection when the
  Rust extracted reference can reliably identify it;
- condition diagnostics that explain the effective condition set and matched
  condition;
- current-repository profile/oracle evidence and Roadmap closeout.

This plan does not own:

- node_modules graph expansion;
- npm package graph traversal;
- package manager specific condition behavior;
- full Node.js runtime resolution parity;
- full TypeScript compiler resolver parity;
- package `typesVersions`;
- browser/development/production custom environment semantics beyond
  configured `customConditions`;
- declaration/runtime target relationship;
- extensionless file candidate order.

## Decisions

### Condition Selection Strategy

Use TypeScript/source-sufficiency-first ordering for repo-local package maps:

1. `types`;
2. import-kind/runtime condition:
   - `import` for ESM import/export-from;
   - `require` for CommonJS `require()`;
   - `import` for unknown import kinds;
3. `node`;
4. `compilerOptions.customConditions` in config order;
5. `default`.

The goal is graph usefulness for agents, not runtime execution parity. The
Rust path should prefer source/type entries when they are repo-local and let
existing guarded file-target behavior decide whether a file node can be
written.

### customConditions

Support `compilerOptions.customConditions` from the resolved config model.

The custom conditions apply only to repo-local package `exports` / `imports`
resolution. They must not cause node_modules expansion or external package
graph traversal.

### Import Kind

Distinguish import kind only when existing Rust extraction can do so reliably:

- ESM static import and export-from use `import`;
- CommonJS `require()` uses `require`;
- unknown import references use `import` as the default.

This plan should not become a broad extractor rewrite. If a reference shape is
not reliably classified, it should remain explainable rather than guessed.

### `types` Targets

`types` can be preferred by condition order, but this plan does not solve
declaration/runtime target relationship.

If `types` selects a `.d.ts` target, existing file target resolution and guarded
edge-write behavior decide whether an edge is written. Any missing
implementation/source pairing remains under Roadmap node
`1-5-4. declaration/runtime target relationship`.

## Validation Contract

Every implementation issue must include deterministic Rust fixture coverage
for positive and fallback/no-go behavior.

Closeout must include:

- `cargo test -p zcodegraph-core`;
- `npx vitest run __tests__/ts-module-resolution-oracle.test.ts`;
- `npm run build`;
- current-repository rust-hybrid profile artifact;
- current-repository TypeScript oracle smoke artifact;
- a closeout decision under `docs/benchmarks/`;
- Roadmap Tree status update for `1-4`.

VS Code sparse checkout smoke is not required for this plan.

## Issue Sequence

### 1. Shared Condition Selection Helper

Unify package `exports` and package `imports` condition selection behind one
helper that covers exact keys, pattern keys, and nested condition objects.

The helper should report the effective condition set and the matched condition
for diagnostics.

### 2. customConditions for Repo-Local Package Maps

Read `compilerOptions.customConditions` from the resolved Rust config model and
apply those conditions to repo-local package `exports` / `imports`.

The behavior must remain repo-local only.

### 3. Import Kind Aware Condition Set

Use existing Rust-extracted import reference information to distinguish ESM
import/export-from from CJS `require()` when reliable, and select `import` or
`require` accordingly.

Unknown import kinds should default to `import` and stay explainable.

### 4. Package Map Condition Set Closeout

Run the required current-repository evidence, write a closeout decision, and
update the Roadmap Tree so `1-4. Package exports/imports for repo-local
targets` accurately reflects completion.
