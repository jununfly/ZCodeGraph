# Rust-Native TypeScript ModuleResolution Semantic Frontier Implementation Plan

Date: 2026-06-23

## Scope

This plan consolidates the semantic-frontier decision and the three completed
follow-up slices for Rust-native TypeScript-style `moduleResolution`.

The governed implementation is rust-indexing. TypeScript compiler behavior is
the oracle/reference point; the TypeScript indexer is not the implementation
being governed here.

Parent context:

- Optimization tracker: #165
- Import/file resolver Part 2 tracker: #430
- Prior roadmap closeout:
  `docs/benchmarks/2026-06-23-rust-native-typescript-module-resolution-roadmap-mapping-closeout.md`

## Decision

Decision: `semantic-frontier-classified-and-three-follow-up-slices-completed`.

The bounded repo-local graph sufficiency route is complete enough to avoid
expanding implementation by inertia. The remaining semantic frontier is
classified, evidence-backed, and split into narrow follow-up routes.

Completed sequence:

1. taxonomy-only cleanup slice;
2. oracle/research fixture pack;
3. JSON `resolveJsonModule` file-level dependency slice.

This plan is a semantic-boundary cleanup and implementation closeout, not a
performance greenlight.

## Classification Matrix

| Frontier | Classification | Decision |
| --- | --- | --- |
| full `node_modules` graph expansion | `defer/no-go` | Keep taxonomy only. Do not index third-party package source or write full `node_modules` graph edges by default. |
| third-party package symbol indexing | `defer/no-go` with future product switch | Keep external package taxonomy. Future symbol indexing requires an explicit user-facing product switch and separate PRD. |
| package manager edge cases | `needs-oracle/research` | Keep package-manager-specific boundary taxonomy. Promote only with dedicated fixtures and oracle evidence. |
| `typesVersions` | `needs-oracle/research` | Do not implement until oracle evidence shows agent-sufficiency impact beyond declaration/type target exactness. |
| Classic and Node10 legacy exactness | `defer/no-go` | Record moduleResolution mode and mismatch taxonomy, but do not chase historical exactness in the mainline Rust resolver. |
| symlink / `preserveSymlinks` / pnpm virtual store behavior | `needs-oracle/research` | Requires module-identity fixtures and oracle evidence before any bounded slice. |
| custom loaders and bundler plugins | `defer/no-go` | Keep bundler/custom-loader boundary taxonomy. Do not prioritize oracle or implementation. |
| JSON modules | `split-to-exploit-slices` | Completed bounded `resolveJsonModule` file-level dependency slice. |
| CSS/assets/custom non-code modules | `defer/no-go` | Keep non-code/bundler/asset boundary taxonomy only. |
| type-only versus runtime target divergence | `needs-oracle/research` | Do not write value graph edges. Future promotion requires separate type graph design. |
| advanced declaration/runtime semantics beyond repo-local same-basename pairing | `needs-oracle/research` with narrow exploit exit | Future narrow slice may cover high-confidence repo-local declaration-to-runtime pairing; otherwise keep divergence taxonomy. |

## Completed Slice 1: Taxonomy-Only Cleanup

Goal: make semantic-frontier boundaries visible and consistent without changing
graph behavior.

Implemented:

- Rust profile emits `moduleResolutionSemanticBoundaryCounts`, derived from
  existing Rust-native moduleResolution shadow decisions.
- TypeScript moduleResolution oracle rows include `semanticBoundary`.
- TypeScript moduleResolution oracle summaries and Markdown include
  semantic-boundary counts.

Stable diagnostic labels:

- `repo-local-source`
- `runtime-builtin-boundary`
- `external-package-boundary`
- `non-code-module-boundary`
- `legacy-module-resolution-boundary`
- `unsupported-import-form-boundary`
- `binding-boundary`
- `unclassified-boundary`

Decision: `keep`.

These labels are diagnostic artifact fields, not a long-term public API
guarantee.

Validation:

```bash
cargo test -p zcodegraph-core module_resolution_shadow
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
```

## Completed Slice 2: Oracle/Research Fixture Pack

Goal: gather deterministic evidence before promoting research-only frontiers
into Rust-native production resolver behavior.

Implemented:

- TypeScript oracle artifact fields:
  - `researchFrontiers`
  - `researchFrontier`
  - `researchDecision`
- Minimal fixtures for:
  - `typesVersions`;
  - symlink / `preserveSymlinks`;
  - type-only versus runtime target divergence;
  - declaration/runtime pairing.

Covered frontier decisions:

| Frontier | Fixture status | Decision |
| --- | --- | --- |
| `typesVersions` | Minimal TypeScript oracle fixture added | `keep-research` |
| symlink / `preserveSymlinks` | Minimal symlink package fixture added | `keep-research` |
| type-only versus runtime target divergence | Minimal type-only fixture added | `defer/no-go` unless a separate type graph exists |
| declaration/runtime pairing | Minimal declaration/runtime sibling fixture added | `keep-research` with future narrow exploit exit |

Decision: `oracle-research-fixtures-available-no-production-behavior-change`.

This slice is evidence-only. It does not change graph writing, expand
`node_modules`, index third-party package symbols, or write type-only
relationships into the value graph.

Validation:

```bash
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
```

## Completed Slice 3: JSON resolveJsonModule File-Level Dependency

Goal: implement the approved bounded exploit candidate from the semantic
frontier decision.

Implemented:

- extensionless repo-local JSON import target resolution when
  `resolveJsonModule` is true;
- explicit `.json` repo-local import target resolution when
  `resolveJsonModule` is true;
- lazy JSON file-node/file-row creation for matched JSON targets so guarded edge
  writing can target the JSON file;
- file-level `imports` edges to repo-local JSON files;
- TypeScript oracle taxonomy for `json-module-boundary`;
- TypeScript oracle recommended slice label:
  `JSON resolveJsonModule file-level dependency slice`.

Preserved:

- when `resolveJsonModule` is absent or false, extensionless JSON config/data
  targets are not expanded into graph edges;
- no JSON symbol graph;
- no `node_modules` graph expansion;
- no third-party package symbol indexing;
- no schema change.

Decision: `json-resolve-json-module-file-edge-implemented`.

Validation:

```bash
cargo test -p zcodegraph-core rust_resolves_json_module_imports_to_file_level_dependency_edges_when_enabled
cargo test -p zcodegraph-core rust_does_not_expand_extensionless_config_data_targets_into_graph_edges
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
npm run build
git diff --check
```

## Non-Goals

- Do not reopen full `node_modules` graph expansion.
- Do not index third-party package symbols by default.
- Do not chase Classic/Node10 exactness.
- Do not reproduce bundler/custom-loader plugin semantics.
- Do not write type-only relationships into the value graph.
- Do not treat declaration targets as runtime targets by default.
- Do not expand JSON support into a JSON symbol graph.

## Current Status

Status: completed.

The three planned follow-up candidates are complete. Future work should return
to the broader architecture/performance PRD rather than expanding this plan into
arbitrary non-code module handling.

## Tracker Guidance

#430 should continue to track the broader import/file resolver Part 2 route.
This plan narrows one semantic-frontier branch into the completed candidates
above.

#165 remains the architecture/performance tracker. The work here improves
semantic classification and one bounded JSON file-level dependency path; it does
not by itself prove broader architecture or performance readiness.
