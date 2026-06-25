# Rust-Hybrid Package Imports Edge-Write Ownership Plan

Date: 2026-06-25

Status: completed

Parent roadmap:

- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap-plan.md`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.json`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.md`

Roadmap node:

- `1-3-3-2-2-2-2-2-1. Package imports # repo-local file-level edge-write ownership`

## Goal

Move repo-local package imports (`#foo`) module/file dependency edge-write
ownership into the same Rust-owned guarded file import contract as relative
imports, paths aliases, declaration/runtime target rewrites, and package
self-name imports.

When existing Rust core package imports resolution produces a single repo-local
file target, the guarded module edge-write path should write the
`rust-finalization` `imports` edge to that file target. Uncertain or unsupported
package imports outcomes must fail closed and publish readable taxonomy.

This is not a full TypeScript or Node package resolution parity plan.

## Scope

In scope:

- nearest package boundary `package.json#imports` maps;
- package imports direct keys such as `#internal`;
- package imports pattern entries when existing Rust core resolution produces
  one repo-local file target;
- package imports condition objects when existing Rust core resolution produces
  one repo-local file target;
- reuse of the previous declaration/runtime rewrite when the resolved package
  imports target is a declaration file with exactly one runtime sibling;
- file-level `imports` edges with `edgeOrigin = rust-finalization`;
- public diagnostics under
  `finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports`;
- deterministic CLI graph/profile tests for:
  - a `#internal` direct-key happy path;
  - pattern or condition-object package imports with declaration/runtime reuse;
  - unsupported, missing, escaping, or file-node-missing fail-closed taxonomy;
- roadmap and plan closeout evidence.

Out of scope:

- external packages or `node_modules`;
- package self-name imports;
- full package exports/imports parity;
- default imports;
- namespace imports;
- type-only semantics;
- symbol-level usage edges;
- rootDirs;
- cleanup ownership migration;
- VS Code sparse smoke, Agent Sufficiency A/B, full scoreboard, release smoke.

## Decisions

### Main Target

Use this eighth slice for package imports (`#foo`) repo-local file-level
edge-write ownership.

This continues the module/file dependency ownership line after relative
imports, paths aliases, declaration/runtime target rewrites, and package
self-name imports. Default and namespace imports remain binding-level semantics
and are deliberately tracked as separate future sub-nodes.

### Package Imports Scope

Only support nearest package boundary `imports` maps when existing Rust core
resolution returns a repo-local file target.

Accepted examples:

- `import "#internal"` when `package.json#imports["#internal"]` resolves to one
  repo-local source file;
- `import "#features/foo"` when an imports pattern resolves to one repo-local
  source file;
- condition object imports entries when existing Rust core resolution resolves
  to one repo-local file target.

Fail-closed examples:

- external or `node_modules` targets;
- escaping package imports targets;
- unsupported or null imports targets;
- missing imports map entries;
- targets without a corresponding indexed file node;
- default or namespace binding-level semantics.

### Profile Shape

Reuse the existing module edge-write bucket:

```ts
moduleEdgeWrite: {
  owner: 'rust-core';
  mode: 'guarded-file-imports';
  packageImports: {
    mode: 'repo-local-file-targets-only';
    eligibleRefs: number;
    attemptedRefs: number;
    writtenEdges: number;
    skippedRefs: number;
    skipReasons: Record<string, number>;
    outcomeCounts: Record<string, number>;
  };
}
```

Existing raw `importPathAliasPackageImports*` profile fields remain resolution
diagnostics. The new `packageImports` child bucket describes edge-write
ownership.

### Rollout Mode

Directly connect the main path for Rust-resolved repo-local file targets.

Do not add a shadow-only mode, environment flag, or local config gate. If
existing Rust core package imports resolution produces a repo-local file target,
guarded edge-write may write the `rust-finalization` `imports` edge. Uncertain
outcomes remain fail-closed taxonomy.

### Declaration Targets

Reuse the existing declaration/runtime rewrite contract.

If package imports resolution lands on a declaration file with exactly one
runtime sibling, write the edge to the runtime file node. If there is no runtime
sibling, multiple runtime siblings, or no indexed runtime file node, skip
closed and record taxonomy rather than writing a misleading declaration edge.

### Roadmap Mapping

The broader parent node also mentions default and namespace imports. This plan
only completes:

- `1-3-3-2-2-2-2-2-1. Package imports # repo-local file-level edge-write ownership`

The following sibling nodes remain pending after this plan:

- `1-3-3-2-2-2-2-2-2. Default import edge-write ownership`
- `1-3-3-2-2-2-2-2-3. Namespace import edge-write ownership`

## Proposed Issues

1. #537: Add `moduleEdgeWrite.packageImports` profile contract diagnostics.
2. #538: Implement package imports direct/pattern/condition repo-local edge-write
   coverage.
3. #539: Add package imports fail-closed taxonomy and declaration/runtime closeout
   coverage.

## Acceptance Criteria

- `finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports` exists
  in profile artifacts.
- Repo-local package imports direct keys write file-level `rust-finalization`
  `imports` edges.
- Package imports pattern or condition-object entries resolved by Rust core can
  participate in the guarded file-level edge-write path.
- Declaration targets reached through package imports reuse the previous
  declaration/runtime runtime sibling rewrite contract.
- Unsupported, missing, escaping, or file-node-missing package imports outcomes
  fail closed and record public taxonomy.
- No external package, package self-name, default/namespace, type-only, symbol
  usage edge, rootDirs, or full package parity scope is added.
- Roadmap node `1-3-3-2-2-2-2-2-1` records closeout evidence after
  implementation.

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

Completed by #537-#539.

Implemented:

- added public
  `finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports`
  diagnostics;
- verified package imports direct keys write file-level `rust-finalization`
  `imports` edges to repo-local file nodes;
- verified package imports pattern entries and condition-object entries resolved
  by Rust core participate in file-level edge-write;
- verified declaration targets reached through package imports reuse the
  declaration/runtime unique runtime sibling rewrite contract;
- verified blocked, unsupported, missing-target, and escaping package imports
  outcomes fail closed and expose public taxonomy through
  `packageImports.skipReasons` and `packageImports.outcomeCounts`;
- updated roadmap node `1-3-3-2-2-2-2-2-1` as completed while keeping default
  import and namespace import sibling nodes pending.

Verification run:

- `npm run build`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "reports package imports module edge-write diagnostics"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "writes package imports direct keys"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "writes package imports pattern"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "reports package imports fail-closed"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "rewrites package imports declaration"`

Still out of scope:

- external packages and `node_modules`;
- package self-name imports;
- default imports and namespace imports;
- type-only semantics;
- symbol-level usage edges;
- rootDirs;
- full package parity;
- performance or VS Code sparse smoke.
