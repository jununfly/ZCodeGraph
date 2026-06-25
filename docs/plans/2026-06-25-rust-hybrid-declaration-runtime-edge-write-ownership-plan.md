# Rust-Hybrid Declaration Runtime Edge-Write Ownership Plan

Date: 2026-06-25

Status: completed

Parent roadmap:

- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap-plan.md`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.json`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.md`

Roadmap node:

- `1-3-3-2-2-2. Future package/default/namespace/declaration-runtime edge-write ownership`

## Goal

Move one more bounded piece of module/file dependency edge-write ownership into
the Rust-owned path: when a repo-local file-level import resolves to a
declaration file and there is exactly one high-confidence runtime sibling, write
the `rust-finalization` `imports` edge to the runtime file node.

This is a narrow main-path implementation slice. It should not expand into full
TypeScript declaration/runtime semantics, package resolution, default imports,
namespace imports, or symbol-level usage edge ownership.

## Scope

In scope:

- repo-local `.d.ts` module target to a single runtime sibling;
- file-level `imports` edge rewrite from declaration target to runtime file
  target;
- `edgeOrigin = rust-finalization`;
- public diagnostics under
  `finalize.referenceResolutionBreakdown.moduleEdgeWrite.declarationRuntime`;
- deterministic CLI graph/profile tests for:
  - unique runtime sibling rewrite;
  - multi-candidate fail-closed skip;
  - missing runtime sibling fail-closed skip;
- roadmap and plan closeout evidence.

Out of scope:

- rootDirs;
- package self-name, package imports, or package exports;
- node_modules, symlink, or `typesVersions` semantics;
- default imports;
- namespace imports;
- type-only semantics;
- symbol-level usage edges;
- cleanup ownership migration;
- VS Code sparse smoke, Agent Sufficiency A/B, full scoreboard, release smoke.

## Decisions

### Main Target

Use the sixth slice for declaration/runtime edge-write ownership.

The previous module/file dependency guarded edge-write contract made file-level
Rust finalization imports visible and testable. This slice continues that line
by handling one high-confidence declaration target rewrite before expanding
package/default/namespace semantics.

### Pairing Scope

Only support repo-local `.d.ts` target to a single runtime sibling.

Accepted examples:

- `dep.d.ts` -> `dep.ts`
- `dep.d.ts` -> `dep.tsx`
- `dep.d.ts` -> `dep.js`
- `dep.d.ts` -> `dep.jsx`
- `dep.d.ts` -> `dep.mts`
- `dep.d.ts` -> `dep.cts`

Fail-closed examples:

- no runtime sibling;
- multiple runtime siblings;
- package/typeVersions/node_modules/symlink semantics;
- broader TypeScript moduleResolution behavior.

### Profile Shape

Reuse the existing module edge-write bucket:

```ts
moduleEdgeWrite: {
  owner: 'rust-core';
  mode: 'guarded-file-imports';
  declarationRuntime: {
    mode: 'single-runtime-sibling-only';
    eligibleRefs: number;
    rewrittenEdges: number;
    skippedRefs: number;
    skipReasons: Record<string, number>;
  };
}
```

Do not add a separate top-level `declarationRuntimeEdgeWrite` bucket.

### Rollout Mode

Directly connect the main path for high-confidence cases.

When the declaration target has exactly one runtime sibling, write the
file-level `imports` edge to the runtime file node. Otherwise, fail closed and
record skip taxonomy. Do not add a local config flag or shadow-only mode for
this narrow slice.

### Verification

Use three deterministic CLI graph/profile tests:

1. Happy path: a declaration target with one runtime sibling writes the
   `rust-finalization` `imports` edge to the runtime file node, not the
   declaration file node.
2. Multi-candidate fail-closed: a declaration target with multiple runtime
   siblings does not choose one arbitrarily and records skip taxonomy.
3. Missing sibling fail-closed: a declaration target with no runtime sibling
   does not invent a runtime edge and records skip taxonomy.

## Proposed Issues

1. #531: Add `moduleEdgeWrite.declarationRuntime` profile contract diagnostics.
2. #532: Implement unique runtime sibling main-path module edge rewrite.
3. #533: Add multi-candidate and missing-sibling fail-closed skip coverage and
   closeout evidence.

## Acceptance Criteria

- `finalize.referenceResolutionBreakdown.moduleEdgeWrite.declarationRuntime`
  exists in profile artifacts.
- Unique repo-local declaration target runtime sibling cases write
  `rust-finalization` `imports` edges to the runtime file node.
- Declaration file targets are not used when a unique runtime sibling rewrite
  is applicable.
- Multi-candidate and missing-sibling cases fail closed and record public skip
  taxonomy.
- No package/default/namespace/rootDirs/typeVersions/node_modules/symlink or
  symbol usage edge scope is added.
- Roadmap node `1-3-3-2-2-2` records closeout evidence after implementation.

## Verification

Required:

- `npm run build`;
- deterministic `rust-hybrid` CLI/profile tests;
- graph assertions for file-level `imports` edges;
- roadmap validation;
- `git diff --check`.

Not required:

- VS Code sparse smoke;
- Agent Sufficiency A/B;
- full scoreboard;
- release or packaged smoke.

## Closeout

Completed by #531-#533.

Implemented:

- added public
  `finalize.referenceResolutionBreakdown.moduleEdgeWrite.declarationRuntime`
  diagnostics;
- verified the high-confidence main path where a repo-local declaration target
  with exactly one runtime sibling writes the `rust-finalization` `imports`
  edge to the runtime file node, not the declaration file node;
- improved declaration/runtime skip taxonomy so uncertain cases report specific
  public reasons instead of the previous generic `pairing-not-eligible`;
- verified multi-candidate and missing-sibling declaration targets fail closed
  and do not choose an arbitrary runtime sibling;
- updated roadmap node `1-3-3-2-2-2` with a completed child node for this
  bounded declaration/runtime slice and a pending child node for future
  package/default/namespace edge-write ownership.

Verification run:

- `npm run build`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "reports declaration/runtime module edge-write diagnostics"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "rewrites declaration module imports"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "fail-closed declaration/runtime skip taxonomy"`
- `cargo test -p zcodegraph-core rust_index_emits_declaration_target_relationship_diagnostics`
- `cargo test -p zcodegraph-core declaration_runtime_edge_write_fails_closed_when_runtime_file_node_is_missing`

Still out of scope:

- rootDirs;
- package self-name, package imports, and package exports;
- node_modules, symlink, and `typesVersions` semantics;
- default imports and namespace imports;
- type-only semantics;
- symbol-level usage edges;
- cleanup ownership migration;
- performance, VS Code sparse, Agent Sufficiency, scoreboard, or release smoke.
