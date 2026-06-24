# Rust-Hybrid Guarded Direct Named Import Usage Edge-Write Plan

Date: 2026-06-25

Status: ready-for-agent

Parent roadmap:

- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap-plan.md`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.json`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.md`

Roadmap node:

- `1-3-3-1. Guarded direct named import usage edge-write slice`

Tracking issues:

- #522: guarded edge-write implementation;
- #523: profile diagnostics, skip taxonomy, and parity coverage;
- #524: closeout, roadmap evidence, and deferred follow-up capture.

## Goal

Move one narrow reference-disambiguation path from shadow evidence toward
guarded main-path graph writing.

This slice writes only imported symbol usage edges for direct named value ESM
imports when the target is uniquely resolved and the write passes fail-closed
guards. It must not broaden resolver semantics, replace existing TypeScript
owned edges, or expand into package/default/namespace/re-export/module
resolution work.

## Scope

In scope:

- direct named value ESM imports such as `import { foo } from './x'`;
- imported symbol usage references, such as `foo()` or value references to the
  imported binding;
- repo-local relative imports and currently supported path-alias targets;
- unique exported-symbol target lookup in the resolved target file;
- guarded `rust-finalization` usage edge writes;
- endpoint validation, duplicate-safe behavior, and skip taxonomy;
- profile diagnostics under
  `finalize.referenceResolutionBreakdown.guardedEdgeWrite`;
- deterministic CLI/profile and graph parity tests.

Out of scope:

- default imports or exports;
- namespace imports;
- type-only imports;
- barrel or re-export chains;
- package resolution;
- file-level binding dependency edges;
- LowerName/FileNodes broad resolver routing;
- cleanup ownership migration;
- replacing existing TypeScript-owned graph output;
- Agent Sufficiency A/B or real-repo smoke evidence.

## Decisions

### Execution Mode

Use direct main-path write with fail-closed guards.

Do not add another shadow-only middle state. The previous semantic replay slice
already produced diagnostic evidence. This slice should prove that one narrow
per-reference semantic path can write guarded `rust-finalization` edges.

### Edge Kind

Write only imported symbol usage edges.

Do not write file-level binding dependency edges in this slice. Those belong to
module/file dependency ownership work, not this reference-disambiguation slice.

### Allowed Graph Output Change

Allow guarded additive `rust-finalization` usage edges with target parity.

Do not replace existing TypeScript-owned edges. If an equivalent edge already
exists, the write must be duplicate-safe. If the edge was previously missing,
the new edge may be strictly additive.

### Skip Taxonomy

Use medium-grained skip taxonomy:

- `unsupported-import-shape`;
- `type-only-import`;
- `import-target-unresolved`;
- `export-symbol-missing`;
- `multiple-export-candidates`;
- `usage-ref-missing`;
- `endpoint-invalid`;
- `duplicate-equivalent-edge`;
- `non-repo-local-target`.

Avoid ultra-fine module-resolution taxonomy in this slice.

### Profile Diagnostics

Add `finalize.referenceResolutionBreakdown.guardedEdgeWrite` with:

- `eligibleRefs`;
- `attemptedRefs`;
- `writtenEdges`;
- `skippedRefs`;
- `skipReasons`;
- `skipSamples`;
- `edgeKindCounts`.

Keep this bucket beside `semanticReplay` so the migration chain is readable:
shadow replay proves a target can be reconstructed; guarded edge-write proves a
subset can safely enter graph output.

## Acceptance Criteria

- Direct named value import usage edges can be written as guarded
  `rust-finalization` edges.
- Unsupported import forms fail closed and report skip taxonomy.
- Duplicate/equivalent edges do not create semantic duplication.
- Existing TypeScript-owned graph output is not replaced by this slice.
- Profile artifacts expose the `guardedEdgeWrite` diagnostic bucket.
- Tests cover at least one written direct named value import usage edge and at
  least one skipped path.
- Roadmap node `1-3-3-1` is updated with closeout notes, while parent `1-3-3`
  remains open for cleanup and broader edge-write ownership slices.

## Verification

Required:

- deterministic CLI/profile tests;
- graph parity or graph-shape tests for written and skipped paths;
- targeted rust-hybrid CLI tests;
- `npm run build`;
- `git diff --check`.

Not required:

- Agent Sufficiency A/B;
- VS Code sparse or other real-repo smoke;
- full scoreboard.
