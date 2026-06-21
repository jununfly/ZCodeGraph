# Rust-Hybrid Relative JS Source Specifier Burndown

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Import fallback profile samples plan:
  `docs/plans/2026-06-21-rust-hybrid-import-fallback-profile-samples.md`
- Import fallback profile samples closeout:
  `docs/benchmarks/2026-06-21-import-fallback-profile-samples-closeout-decision.md`

## Context

The import fallback profile samples slice proved that the large relative import
target gap is now explainable before TypeScript finalization cleanup.

VS Code sparse evidence:

- `relative/target-not-found`: 63,882
- `relative/file-node-not-found`: 309
- sampled relative taxonomy:
  - `supportedSourceSpecifier`: 100
  - `assetLikeTarget`: 100

Current repo evidence:

- `relative/target-not-found`: 8
- `relative/file-node-not-found`: 1
- sampled relative taxonomy:
  - `supportedSourceSpecifier`: 8
  - `assetLikeTarget`: 1

Both corpora show TypeScript files importing relative `.js` source specifiers,
for example:

- `./dom.js`
- `../common/observable.js`
- `../../src/index.js`
- `./types.js`

Rust currently treats an explicit `.js` extension literally. If `foo.js` does
not exist, it does not try `foo.ts` / `foo.tsx` / other source candidates.

## Goal

Implement a bounded Rust resolver burndown for relative `.js` source specifiers
from JS/TS files.

This should reduce code-target `relative/target-not-found` misses where a TS/JS
source file exists under the same basename, while preserving literal JS import
semantics and keeping asset imports out of the graph.

## Non-Goals

- Do not change alias, tsconfig path, conventional alias, workspace package, or
  package import behavior.
- Do not implement package `exports`, `main`, conditional exports, or npm
  package resolution.
- Do not model bundler loader semantics.
- Do not resolve `.css`, `.json`, `.wasm`, `.svg`, or other non-code asset
  imports into graph edges.
- Do not handle dynamic/template imports.
- Do not change binding-level symbol disambiguation.
- Do not change SQLite schema.
- Do not change `status`, `doctor`, README, or public API.
- Do not require wall-clock or RSS improvement.

## Resolver Behavior

Behavior change is limited to relative imports.

Rules:

1. Resolve literal paths first.
2. If the relative specifier explicitly ends in `.js`, `.mjs`, or `.cjs` and
   the literal target does not exist, try source-file candidates with the same
   basename.
3. Continue to require existing file-node validation before writing an edge.
4. Do not apply this fallback to alias/workspace/package imports.
5. Do not apply this fallback to asset or non-code extensions.

Candidate order:

- `.js` specifier:
  - literal `.js`
  - `.ts`
  - `.tsx`
  - `.mts`
  - `.cts`
  - `.jsx`
- `.mjs` specifier:
  - literal `.mjs`
  - `.mts`
  - `.ts`
  - `.tsx`
  - `.js`
- `.cjs` specifier:
  - literal `.cjs`
  - `.cts`
  - `.ts`
  - `.tsx`
  - `.js`

Literal target existence must win. If both `foo.js` and `foo.ts` exist,
`./foo.js` resolves to `foo.js`.

Implementation may use a shared helper for source-candidate generation, but only
the relative import path should opt into this behavior in this slice.

## Validation

Required deterministic coverage:

- `./target.js` resolves to `target.ts` when literal `target.js` is absent.
- `./target.js` resolves to literal `target.js` when that file exists, even if
  `target.ts` also exists.
- `.mjs` and `.cjs` source fallback order is covered.
- Asset imports such as `./style.css` remain unresolved and do not create graph
  edges.
- Alias/workspace/package behavior is unchanged.

Required evidence:

- Current repo before/after profile taxonomy evidence.
- VS Code sparse before/after profile taxonomy evidence.
- Evidence runs use `scripts/targeted-profile-evidence.mjs` so wall-clock and
  RSS/`rssUnavailableReason` are recorded in sidecar JSON.
- Closeout compares:
  - `relative/target-not-found`
  - `relative/file-node-not-found`
  - `importPathAliasFallbackBySource.relative`
  - `importPathAliasResolvedBySource.relative`
  - taxonomy `supportedSourceSpecifier`
  - taxonomy `assetLikeTarget`

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark evidence as
  needs human setup.
- Do not clone a replacement corpus automatically.

Performance numbers are evidence only. A keep/no-go decision should be based on
semantic correctness and fallback movement, not speed.

## Issue Sequence

1. Implement relative `.js` source fallback in the Rust resolver.
2. Run current repo before/after taxonomy evidence.
3. Run VS Code sparse before/after taxonomy evidence.
4. Write closeout decision and update trackers.
