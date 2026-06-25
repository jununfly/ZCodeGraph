# Rust-Hybrid Package Self-Name Edge-Write Ownership Plan

Date: 2026-06-25

Status: completed

Parent roadmap:

- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap-plan.md`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.json`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.md`

Roadmap node:

- `1-3-3-2-2-2-2. Future package/default/namespace edge-write ownership`

## Goal

Move repo-local package self-name module/file dependency edge-write ownership
into the same Rust-owned contract as relative imports, paths aliases, and
declaration/runtime target rewrites.

When existing Rust core package self-name / package exports resolution produces
a single repo-local file target, the guarded module edge-write path should write
the `rust-finalization` `imports` edge to that file target. Uncertain or
unsupported package outcomes must fail closed and publish readable taxonomy.

This is not a full TypeScript or Node package resolution parity plan.

## Scope

In scope:

- repo-local package self-name root imports;
- repo-local package self-name direct subpath/export targets;
- package `exports` condition objects only when existing Rust core resolution
  produces one repo-local file target;
- reuse of the previous declaration/runtime rewrite when the resolved package
  target is a declaration file with exactly one runtime sibling;
- file-level `imports` edges with `edgeOrigin = rust-finalization`;
- public diagnostics under
  `finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageSelfName`;
- deterministic CLI graph/profile tests for:
  - package self-name root happy path;
  - package exports condition object with declaration/runtime reuse;
  - one unsupported/escaping/missing-target fail-closed package outcome;
- roadmap and plan closeout evidence.

Out of scope:

- package imports (`#foo`);
- external packages or `node_modules`;
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

Use the seventh slice for package self-name / package exports repo-local
file-level edge-write.

This continues the module/file dependency ownership line after relative imports,
paths aliases, and declaration/runtime target rewrites. Default and namespace
imports remain binding-level semantics and are deliberately deferred.

### Package Scope

Only support repo-local package self-name root plus direct subpath/export file
targets.

Accepted examples:

- `import "@repo/pkg"` where `@repo/pkg` is a repo-local package name;
- `import "@repo/pkg/subpath"` when the package resolution produces one
  repo-local file target;
- package `exports` condition objects when existing Rust core resolution
  resolves to one repo-local file target.

Fail-closed examples:

- external or `node_modules` packages;
- package imports such as `#foo`;
- unsupported, null, escaping, or missing package exports targets;
- broad TypeScript/Node parity cases.

### Package Exports Condition Objects

Include condition objects only through existing Rust core resolution.

If Rust core resolves a condition object to a single repo-local file target,
the guarded module edge-write path can write the file-level `imports` edge. If
the resolved target is a declaration file, reuse the previous
declaration/runtime rewrite contract. Do not expand new condition ordering or
parity semantics in this slice.

### Profile Shape

Reuse the existing module edge-write bucket:

```ts
moduleEdgeWrite: {
  owner: 'rust-core';
  mode: 'guarded-file-imports';
  packageSelfName: {
    mode: 'repo-local-file-targets-only';
    eligibleRefs: number;
    writtenEdges: number;
    skippedRefs: number;
    skipReasons: Record<string, number>;
    outcomeCounts: Record<string, number>;
  };
}
```

Existing raw `importPathAliasPackageSelfName*` profile fields remain resolution
diagnostics. The new `packageSelfName` child bucket describes edge-write
ownership.

### Rollout Mode

Directly connect the main path for Rust-resolved repo-local file targets.

Do not add a shadow-only mode or local config flag. If existing Rust core
package self-name/package exports resolution produces a repo-local file target,
guarded edge-write may write the `rust-finalization` `imports` edge. Uncertain
outcomes remain fail-closed taxonomy.

### Verification

Use three deterministic CLI graph/profile tests:

1. Package self-name root happy path: a repo-local package name import writes a
   `rust-finalization` `imports` edge to the package entry file node.
2. Package exports condition object plus declaration/runtime reuse: a package
   exports condition object resolves to a declaration target with one runtime
   sibling, and the edge writes to the runtime file node.
3. Fail-closed taxonomy: an unsupported, escaping, blocked, or missing package
   target does not write an incorrect edge and records a readable public
   package outcome.

## Proposed Issues

1. #534: Add `moduleEdgeWrite.packageSelfName` profile contract diagnostics.
2. #535: Implement package self-name root/direct target edge-write coverage.
3. #536: Add package exports condition object and fail-closed closeout coverage.

## Acceptance Criteria

- `finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageSelfName`
  exists in profile artifacts.
- Repo-local package self-name root/direct targets write file-level
  `rust-finalization` `imports` edges.
- Package exports condition objects resolved by Rust core can participate in
  the guarded file-level edge-write path.
- Declaration targets resolved through package exports reuse the previous
  declaration/runtime runtime sibling rewrite contract.
- Unsupported, escaping, blocked, or missing package outcomes fail closed and
  record public taxonomy.
- No package imports, external/node_modules, default/namespace, type-only,
  symbol usage edge, rootDirs, or full package parity scope is added.
- Roadmap node `1-3-3-2-2-2-2` records closeout evidence after implementation.

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

Completed by #534-#536.

Implemented:

- added public
  `finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageSelfName`
  diagnostics;
- verified repo-local package self-name root imports write file-level
  `rust-finalization` `imports` edges to package entry file nodes;
- verified package exports condition objects resolved by Rust core participate
  in file-level edge-write;
- verified declaration targets reached through package exports reuse the
  declaration/runtime runtime sibling rewrite contract;
- verified unsupported and blocked package exports outcomes fail closed and
  expose public taxonomy through `packageSelfName.skipReasons` and
  `packageSelfName.outcomeCounts`;
- updated roadmap node `1-3-3-2-2-2-2` with a completed child node for this
  package self-name slice and a pending child node for future package imports,
  default import, and namespace import edge-write ownership.

Verification run:

- `npm run build`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "reports package self-name module edge-write diagnostics"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "writes package self-name root imports"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "rewrites package exports declaration targets"`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "package self-name fail-closed taxonomy"`

Still out of scope:

- package imports (`#foo`);
- external packages and `node_modules`;
- full package exports/imports parity;
- default imports and namespace imports;
- type-only semantics;
- symbol-level usage edges;
- rootDirs;
- cleanup ownership migration;
- performance, VS Code sparse, Agent Sufficiency, scoreboard, or release smoke.
