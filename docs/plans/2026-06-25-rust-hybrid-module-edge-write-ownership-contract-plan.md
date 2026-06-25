# Rust-Hybrid Module Edge-Write Ownership Contract Plan

Date: 2026-06-25

Status: completed

Parent roadmap:

- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap-plan.md`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.json`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.md`

Roadmap node:

- `1-3-3-2-2. Broader edge-write ownership follow-up slices`

Tracking issues:

- #528: `moduleEdgeWrite` profile diagnostics;
- #529: relative and paths-alias file-level graph tests;
- #530: missing-target fail-closed skip coverage and closeout evidence.

## Goal

Make Rust-owned module/file dependency edge-write ownership explicit and
verifiable for the already-supported repo-local module target slice.

This is a contract slice. It should expose diagnostics and deterministic graph
tests for Rust finalization file-level `imports` edges without expanding
resolver semantics into default imports, namespace imports, package resolution,
rootDirs, re-export chains, or symbol usage edges.

## Scope

In scope:

- repo-local relative file-level imports;
- repo-local tsconfig/jsconfig paths-alias file-level imports;
- `rust-finalization` file node to target file node `imports` edges;
- public profile diagnostics under
  `finalize.referenceResolutionBreakdown.moduleEdgeWrite`;
- deterministic CLI/profile and graph tests for relative and paths-alias file
  dependency edge writes;
- one deterministic missing-target fail-closed skip test;
- roadmap and plan closeout evidence.

Out of scope:

- rootDirs;
- package self-name, package imports, or package exports;
- default imports;
- namespace imports;
- type-only semantics;
- symbol-level usage edges;
- declaration/runtime target rewriting;
- cleanup ownership migration;
- VS Code sparse smoke, Agent Sufficiency A/B, full scoreboard, release smoke.

## Decisions

### Main Target

Use this fifth slice for module/file dependency guarded edge-write ownership.

Rust core already exposes raw `moduleResolutionGuardedEdgeWrite*` profile
fields and writes `rust-finalization` file-level `imports` edges. This slice
should turn that into a JS-facing contract and deterministic graph evidence
before expanding more semantic edge-write areas.

### Target Scope

Only cover relative and paths-alias file-level imports.

Do not expand rootDirs, package self-name, package imports, package exports,
default imports, namespace imports, or symbol-level semantics in this slice.

### Profile Shape

Add a separate bucket:

```ts
moduleEdgeWrite: {
  owner: 'rust-core';
  mode: 'guarded-file-imports';
  eligibleRefs: number;
  attemptedRefs: number;
  writtenEdges: number;
  skippedRefs: number;
  skipReasons: Record<string, number>;
  edgeKindCounts: { imports: number };
  supportedSources: ['relative', 'tsconfigPaths'];
  excludedSources: string[];
}
```

Keep this separate from `guardedEdgeWrite`, which covers ESM named
symbol/usage edges.

### Graph Verification

Use deterministic fixture tests for:

- relative import: source file node has a `rust-finalization` `imports` edge to
  the target file node;
- paths alias import: source file node has a `rust-finalization` `imports` edge
  to the aliased target file node.

Do not assert symbol usage edges in this slice.

### Skip Coverage

Include one missing-target fail-closed test.

The test should prove the public `moduleEdgeWrite.skipReasons` can explain a
guarded skip without expanding into package/rootDirs/default/namespace resolver
semantics.

## Proposed Issues

1. #528: Add `moduleEdgeWrite` profile contract diagnostics.
2. #529: Add relative and paths-alias module edge-write graph tests.
3. #530: Add missing-target fail-closed skip coverage and closeout roadmap
   evidence.

## Acceptance Criteria

- Profile artifacts include `finalize.referenceResolutionBreakdown.moduleEdgeWrite`.
- The bucket reports owner, mode, eligible/attempted/written/skipped counts,
  skip reasons, imports edge counts, supported sources, and excluded sources.
- Deterministic tests verify relative and paths-alias file-level `imports`
  edges with `edgeOrigin = rust-finalization`.
- Deterministic tests verify one missing-target fail-closed skip reason.
- No symbol usage, default, namespace, package, rootDirs, declaration/runtime,
  cleanup, or performance scope is added.
- Roadmap node `1-3-3-2-2` records closeout evidence after implementation.

## Verification

Required:

- deterministic `rust-hybrid` CLI/profile tests;
- graph assertions for file-level `imports` edges;
- `npm run build`;
- `git diff --check`;
- roadmap validation.

Not required:

- VS Code sparse smoke;
- Agent Sufficiency A/B;
- full scoreboard;
- release or packaged smoke.

## Closeout

Completed by #528-#530.

Implemented:

- added public `finalize.referenceResolutionBreakdown.moduleEdgeWrite`
  diagnostics mapped from Rust core `moduleResolutionGuardedEdgeWrite*`
  counters;
- verified relative and tsconfig paths-alias file-level `imports` edges are
  written with `edgeOrigin = rust-finalization`;
- verified fail-closed skip taxonomy for an unresolved paths target and a
  paths target that resolves to a non-code file, without writing those missing
  target imports as Rust finalization edges;
- updated roadmap node `1-3-3-2-2` with a completed child node for this
  bounded slice and a pending child node for future package/default/namespace
  and declaration/runtime edge-write ownership.

Verification run:

- `npm run build`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "module edge-write"`

Still out of scope:

- rootDirs;
- package self-name, package imports, and package exports;
- default imports and namespace imports;
- type-only semantics;
- symbol usage edge expansion;
- declaration/runtime target rewriting;
- cleanup ownership migration;
- performance or VS Code sparse smoke.
