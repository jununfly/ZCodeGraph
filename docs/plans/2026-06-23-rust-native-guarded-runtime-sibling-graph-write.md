# Rust-Native Guarded Runtime Sibling Graph Write

Date: 2026-06-23

## Parent

- Issue: #461
- Optimization tracker: #165
- TypeScript module resolution roadmap:
  `docs/plans/2026-06-22-rust-native-typescript-module-resolution-roadmap.md`
- Declaration target diagnostics:
  `docs/plans/2026-06-22-rust-native-declaration-target-relationship-diagnostics.md`
- Safe pairing decision contract:
  `docs/plans/2026-06-23-rust-native-safe-runtime-sibling-pairing-decision-contract.md`
- Roadmap node:
  `1-5-4-3. guarded runtime sibling graph write`

## Decision

This plan completes the bounded declaration/runtime target relationship by
connecting eligible runtime sibling pairing decisions to file-level import graph
writing.

The graph behavior should change only for declaration targets whose profile
decision is `eligibleSingleRuntimeSibling`.

Eligible declaration imports should write the file-level import edge to the
runtime sibling target. Blocked or unsupported declaration targets must continue
to write to the declaration target, or fail closed if required file nodes are
missing.

## Scope

Implement guarded graph write behavior for file-level import edges only.

Required behavior:

- default enabled;
- only `eligibleSingleRuntimeSibling` can rewrite a declaration target to its
  runtime sibling;
- eligible rewrites write only the runtime sibling edge, not an additional
  declaration edge;
- blocked decisions keep the declaration target;
- missing file nodes fail closed;
- no SQLite schema changes;
- no MCP/API changes;
- no ESM named symbol edge changes;
- no export or re-export edge changes.

## Edge Target Rules

For a file-level import whose module resolution target is a declaration file:

- `eligibleSingleRuntimeSibling`:
  - write the import edge to the runtime sibling file node;
  - do not also write an import edge to the declaration file node.
- `blockedNoRuntimeSibling`:
  - keep the declaration file target.
- `blockedMultipleRuntimeSiblings`:
  - keep the declaration file target.
- `blockedExternalOrPackageBoundary`:
  - keep the declaration file target.
- `blockedUnsupportedDeclarationShape`:
  - keep the declaration file target.
- runtime sibling file node missing:
  - fail closed and keep the declaration file target;
  - record a skipped reason.

The declaration file node remains indexed when it is part of the source set.
This plan only changes the file-level import edge target for eligible cases.

## Profile Diagnostics

Reuse existing module resolution guarded edge write totals and add
declaration/runtime specific counts:

```text
moduleResolutionDeclarationRuntimeEdgeWriteAttemptedRefs
moduleResolutionDeclarationRuntimeEdgeWriteWrittenRefs
moduleResolutionDeclarationRuntimeEdgeWriteSkippedRefs
moduleResolutionDeclarationRuntimeEdgeWriteSkippedCounts
```

Suggested skipped taxonomy:

- `pairing-not-eligible`
- `runtime-file-node-missing`
- `declaration-file-node-missing`
- `source-file-node-missing`
- `unsupported-declaration-shape`

These fields are profile artifact diagnostics. They are not stable public API.

## Non-Goals

This plan must not:

- write both declaration and runtime import edges for an eligible target;
- rewrite named import symbol edges;
- rewrite export or re-export edges;
- dynamically create missing file nodes;
- change SQLite schema;
- add MCP/API fields;
- follow package maps, declaration maps, source maps, `typesVersions`, generated
  declaration roots, or `node_modules`;
- run full benchmark loops, release smoke, or agent A/B validation.

## Verification

Required verification:

- deterministic fixture: eligible declaration target writes a file-level import
  edge to the runtime sibling;
- deterministic fixture: no runtime sibling keeps the declaration target;
- deterministic fixture: multiple runtime siblings keep the declaration target;
- deterministic fixture: cross-package-boundary sibling keeps the declaration
  target;
- deterministic fixture: missing runtime file node fails closed and keeps the
  declaration target;
- profile JSON exposes declaration/runtime edge-write counts;
- current repo targeted profile smoke records attempted/written/skipped
  distribution.

VS Code sparse smoke is not a hard gate because previous declaration-target
evidence on that corpus had zero declaration relationship hits.

## Roadmap Completion

After implementation:

```text
[x] 1-5. File target semantics
├─ [x] 1-5-1. extension substitution
├─ [x] 1-5-2. extension pairing
├─ [x] 1-5-3. directory/index lookup
└─ [x] 1-5-4. declaration/runtime target relationship
   ├─ [x] 1-5-4-1. declaration target relationship diagnostics
   ├─ [x] 1-5-4-2. safe runtime sibling pairing decision contract
   └─ [x] 1-5-4-3. guarded runtime sibling graph write
```

`1. Main subtree` remains partial because `1-6` and `1-7` still have open
items.
