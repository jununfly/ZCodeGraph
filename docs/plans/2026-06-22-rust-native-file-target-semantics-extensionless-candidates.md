# Rust-Native File Target Semantics: Extensionless Candidates

Date: 2026-06-22

## Parent Context

- Roadmap Tree:
  `docs/plans/2026-06-22-rust-native-typescript-module-resolution-roadmap.md`
- Target node:
  `1-5. File target semantics`
- This plan completes:
  `1-5-2-2. extensionless candidate order + mts/cts inclusion`

## Goal

Complete the bounded Rust-native extensionless file target candidate semantics
for repo-local JS/TS module resolution.

When a repo-local resolver path has already mapped an import specifier to an
extensionless file target, Rust should try a TypeScript/source-sufficiency-first
candidate order that includes modern ESM/CommonJS TypeScript extensions.

## Current State

Already complete:

- `1-5-1. extension substitution`
- `1-5-2-1. explicit JS runtime extension -> TS source pairing`
- `1-5-3. directory/index lookup`

Still incomplete and explicitly out of scope for this plan:

- `1-5-4. declaration/runtime target relationship`

The current Rust candidate order for extensionless file targets is narrower
than the Roadmap target. It includes `.ts`, `.tsx`, `.d.ts`, `.js`, and `.jsx`,
but does not include `.mts`, `.cts`, `.d.mts`, `.d.cts`, `.mjs`, or `.cjs`.

## Decisions

### Candidate Order

For extensionless file targets, use this order:

1. `.ts`
2. `.tsx`
3. `.mts`
4. `.cts`
5. `.d.ts`
6. `.d.mts`
7. `.d.cts`
8. `.js`
9. `.jsx`
10. `.mjs`
11. `.cjs`

For directory targets, use the same order under `index.*`:

1. `index.ts`
2. `index.tsx`
3. `index.mts`
4. `index.cts`
5. `index.d.ts`
6. `index.d.mts`
7. `index.d.cts`
8. `index.js`
9. `index.jsx`
10. `index.mjs`
11. `index.cjs`

### Resolver Entry Paths

Apply this shared file target semantics to all repo-local file target paths that
already call the Rust file candidate resolver:

- relative imports
- tsconfig/jsconfig `paths`
- conventional aliases
- workspace package imports
- package self-name imports
- package `imports`

This does not expand into `node_modules`. It only affects repo-local file target
candidate selection after an earlier resolver step has already produced a
repo-local base path.

### Explicit Runtime Extension Pairing

Do not change explicit runtime extension pair behavior in this plan.

Examples intentionally left as-is:

- explicit `.js` specifier fallback behavior
- explicit `.mjs` specifier fallback behavior
- explicit `.cjs` specifier fallback behavior

That behavior was handled by a prior bounded slice and should not be reopened
while completing extensionless candidate order.

### Config/Data Files

Do not add `.json`, `.jsonc`, `.yaml`, `.yml`, `.toml`, or asset/data formats to
extensionless candidate search.

Those files may remain classified by diagnostics, but this plan must not turn
extensionless config/data targets into graph edge candidates.

### Declaration Targets

Declaration files remain valid file candidates in the order above.

This plan does not decide whether a declaration target should be paired with,
redirected to, or supplemented by a runtime implementation target. That remains
`1-5-4. declaration/runtime target relationship`.

## Non-Goals

- Do not implement full TypeScript module resolution.
- Do not implement package `main`, package `type`, or package manager
  resolution.
- Do not add `node_modules` graph expansion.
- Do not change explicit runtime extension pair semantics.
- Do not add config/data/asset extensionless candidates.
- Do not change SQLite schema.
- Do not change public CLI, SDK, MCP, status, doctor, README, or release docs.
- Do not require performance improvement.

## Validation

Required deterministic Rust coverage:

- extensionless file candidate order selects `.ts`, `.tsx`, `.mts`, `.cts`,
  declarations, then JS-family files in the documented order.
- directory `index.*` candidate order follows the same order.
- all repo-local resolver entry paths share the same file target semantics.
- extensionless config/data targets are not resolved to graph edges.
- explicit runtime extension pair behavior is unchanged.

Required smoke/evidence:

- current repo rust-hybrid profile.
- current repo TypeScript module resolution oracle smoke.
- VS Code sparse rust-hybrid profile and TypeScript oracle smoke.

VS Code sparse rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough for the existing
  sparse-corpus smoke, mark the closeout as `needs-human-setup`.
- Do not clone a replacement corpus automatically.

Closeout requirements:

- write a benchmark/decision closeout artifact;
- update the Roadmap Tree:
  - mark `1-5-2-2` complete;
  - keep `1-5` partial because `1-5-4` remains incomplete;
- add a user-facing CHANGELOG entry if production behavior changes.

## Issue Sequence

1. Rust extensionless file candidate order.
2. Shared file target semantics across repo-local resolver entry paths.
3. No config/data candidate expansion.
4. Closeout evidence and Roadmap update.
