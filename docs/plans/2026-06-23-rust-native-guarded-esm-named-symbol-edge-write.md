# Rust-Native Guarded ESM Named Symbol Edge Write

Date: 2026-06-23

## Parent

- Optimization tracker: #165
- TypeScript module resolution roadmap:
  `docs/plans/2026-06-22-rust-native-typescript-module-resolution-roadmap.md`
- Guarded file-level import edge closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`
- Roadmap node:
  `1-7-2. ESM named symbol edges`

## Decision

This plan adds guarded graph writing for the direct ESM named symbol edges
that are currently routed through Rust finalization.

The guard should protect the final edge-write step. It must not reimplement
resolver semantics. Resolver logic can continue to decide which target symbol
candidate should be written; the guard only verifies whether that target is
safe enough to persist as a graph edge.

## Scope

Guard direct ESM named symbol edge writes:

- named imports such as `import { foo } from "./mod"`;
- direct named exports such as `export { foo } from "./mod"` when they are
  routed through a Rust-owned symbol edge-write path.

Implementation discovery: the current Rust finalization path only consumes
`imports` unresolved refs. Direct named exports are still recorded as `exports`
refs for text reuse and are not yet processed by this edge-write path. This
plan therefore completes the direct named import guarded write and records the
direct named export guarded write as an explicit `1-7-2` sub-node rather than
silently redefining the parent. Follow-up: #463.

Out of scope for this slice:

- one-hop re-export / barrel traversal;
- default imports/exports;
- namespace imports/exports;
- type-only policy;
- multi-hop re-export chains;
- resolver semantic changes.

If implementation shows that the current code path cannot cleanly separate
direct named export from one-hop re-export, add explicit sub-nodes under
`1-7-2` rather than silently redefining the parent node.

## Guard Semantics

Guard target node eligibility before writing a direct ESM named symbol edge.

Eligible writes should require:

- target node exists;
- target node lives in the resolved module file or an already allowed
  declaration/runtime paired file;
- candidate is unique, or the existing resolver/tie-break has explicitly
  selected one;
- edge kind and source/target kinds are compatible with direct ESM named
  import/export semantics.

If the guard fails:

- skip that edge;
- continue indexing;
- record skipped diagnostics.

The index must not fail-fast because a single symbol edge is weak.

## Profile Diagnostics

Add direct ESM named edge-write diagnostics:

```text
esmNamedImportExportEdgeWriteAttemptedRefs
esmNamedImportExportEdgeWriteWrittenRefs
esmNamedImportExportEdgeWriteSkippedRefs
esmNamedImportExportEdgeWriteSkippedCounts
esmNamedImportExportEdgeWriteSkippedSamples
esmNamedImportExportEdgeWriteSkippedSampleCap
```

Skipped counts should be taxonomy-driven. Suggested reasons:

- `target-node-missing`
- `target-file-mismatch`
- `candidate-ambiguous`
- `unsupported-candidate-shape`
- `unsupported-reference-kind`
- `weak-resolution`

Skipped samples must be capped and privacy-safe:

- repo-relative paths only;
- no source text;
- no absolute paths;
- no uncapped per-edge traces.

Suggested sample shape:

```json
{
  "reason": "target-node-missing",
  "referenceKind": "imports",
  "referenceName": "foo",
  "sourceFile": "src/main.ts",
  "targetFilePath": "src/foo.ts",
  "candidateKind": "function",
  "candidateCount": 0
}
```

These are profile artifact diagnostics, not stable public API.

## Verification

Required verification:

- deterministic fixture: eligible direct named import writes the symbol edge;
- deterministic fixture: target node missing skips;
- deterministic fixture: ambiguous/multiple candidate skips unless an existing
  resolver tie-break explicitly selects a single target;
- deterministic fixture: unsupported shape skips;
- profile JSON exposes attempted/written/skipped counts, skipped counts,
  skipped samples, and sample cap;
- current repo targeted profile smoke records the distribution.

No VS Code sparse hard gate, full benchmark loop, release smoke, or agent A/B is
required for this slice.

## Roadmap Update

After implementation, mark only the completed sub-slice:

```text
[-] 1-7-2. ESM named symbol edges
  [x] 1-7-2-1. direct named import guarded write
  [ ] 1-7-2-2. direct named export guarded write (#463)
```

Keep:

```text
[-] 1-7. Guarded graph writing
[ ] 1-7-3. one-hop re-export edges
[-] 1-7-4. rollback/no-go when parity is weak
```
