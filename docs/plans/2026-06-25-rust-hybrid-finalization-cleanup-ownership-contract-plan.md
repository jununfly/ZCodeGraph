# Rust-Hybrid Finalization Cleanup Ownership Contract Plan

Date: 2026-06-25

Status: completed

Parent roadmap:

- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap-plan.md`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.json`
- `docs/plans/2026-06-24-rust-hybrid-indexing-ownership-roadmap.md`

Roadmap node:

- `1-3-3-2. Remaining cleanup and broader edge-write ownership slices`

Tracking issues:

- #525: cleanup ownership profile diagnostics;
- #526: deterministic CLI/DB cleanup ownership contract tests;
- #527: closeout, roadmap evidence, and deferred follow-up capture.

## Goal

Make finalization cleanup ownership explicit and verifiable before expanding
broader Rust-owned edge-write behavior.

This slice is contract-only. It must not migrate cleanup into Rust core, change
which references are deleted, or broaden reference-resolution semantics. Its
job is to make the current cleanup boundary readable and testable: Rust core may
clean references it resolves during Rust-owned passes, while TypeScript
finalization owns terminal cleanup for its resolved and intentionally-unresolved
batch decisions.

## Scope

In scope:

- public profile diagnostics under
  `finalize.referenceResolutionBreakdown.cleanupOwnership`;
- deterministic `rust-hybrid` CLI profile tests using `--profile-out`;
- DB-observable cleanup contract tests around final `unresolved_refs` state;
- documentation of the current owner boundary and retained evidence semantics;
- roadmap and issue closeout evidence.

Out of scope:

- migrating resolved cleanup into Rust core;
- migrating intentionally-unresolved cleanup into Rust core;
- changing Rust core deletion behavior;
- changing TypeScript finalization deletion behavior;
- broader edge-write ownership expansion;
- per-source cleanup taxonomy beyond the narrow contract bucket;
- VS Code sparse smoke, Agent Sufficiency A/B, or full scoreboard evidence.

## Decisions

### Main Target

Use this fourth slice for finalization cleanup ownership rather than broader
edge-write expansion or performance work.

Cleanup ownership should be made explicit before more graph output routes
through Rust-owned paths. Otherwise, later edge-write work can accidentally
create confusing `unresolved_refs` deletion or retention semantics.

### Execution Mode

Use contract and diagnostics first.

Do not migrate cleanup into Rust core in this slice. Rust core already removes
the references it owns during Rust-owned resolution. TypeScript finalization
continues to own terminal cleanup for references it resolves or intentionally
marks terminal-unresolved during batched finalization.

### Verification Boundary

Use public CLI profile plus DB-observable contract tests.

The core verification path should run `zcodegraph index --engine rust-hybrid
--profile-out ...` on deterministic fixtures, then assert both public profile
fields and final `unresolved_refs` behavior. Do not require VS Code sparse
smoke or Agent Sufficiency evidence for this narrow slice.

### Profile Shape

Add a narrow bucket:

```ts
cleanupOwnership: {
  owner: 'typescript-finalization';
  mode: 'contract-only';
  resolvedTerminalRefs: number;
  intentionallyUnresolvedTerminalRefs: number;
  retainedRefs: number;
  rustCorePrecleanedRefs: number | null;
  notes: string[];
}
```

`rustCorePrecleanedRefs` should be `null` unless the implementation has a
reliable public value to report. Do not infer a number just to fill the field.

## Proposed Issues

1. #525: Add `cleanupOwnership` profile contract diagnostics.
2. #526: Add deterministic cleanup ownership CLI/DB contract tests.
3. #527: Close out the finalization cleanup ownership slice and update roadmap
   evidence.

## Acceptance Criteria

- `finalize.referenceResolutionBreakdown.cleanupOwnership` exists in profile
  artifacts.
- The bucket reports owner, mode, resolved terminal refs,
  intentionally-unresolved terminal refs, retained refs, rust-core precleaned
  refs or `null`, and notes.
- Deterministic tests verify the cleanup contract through the public CLI profile
  and observable database state.
- The implementation does not migrate cleanup into Rust core or change current
  deletion behavior.
- Roadmap node `1-3-3-2` records closeout evidence while preserving broader
  edge-write ownership as future work if still incomplete.

## Verification

Required:

- deterministic `rust-hybrid` CLI/profile tests;
- DB-observable cleanup contract tests;
- `npm run build`;
- `git diff --check`;
- roadmap validation.

Not required:

- VS Code sparse smoke;
- Agent Sufficiency A/B;
- full scoreboard;
- release or packaged smoke.

## Closeout Evidence

Completed issues:

- #525 added `finalize.referenceResolutionBreakdown.cleanupOwnership`.
- #526 added deterministic CLI/profile and DB-observable cleanup contract
  coverage.
- #527 updated this closeout evidence and the roadmap.

Implemented contract:

- `cleanupOwnership.owner` is `typescript-finalization`.
- `cleanupOwnership.mode` is `contract-only`.
- `resolvedTerminalRefs` mirrors `resolvedCleanupRowCount`.
- `intentionallyUnresolvedTerminalRefs` mirrors
  `intentionallyUnresolvedCleanupRowCount`.
- `retainedRefs` reports the final observable `unresolved_refs` count after
  finalization cleanup.
- `rustCorePrecleanedRefs` is `null` because this slice does not expose a
  reliable public Rust pre-cleaned count.

Non-goals preserved:

- No cleanup behavior was migrated into Rust core.
- No TypeScript finalization deletion behavior was changed.
- Broader edge-write ownership remains future work under the parent roadmap
  area.

Verification run:

- `npm run build`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "cleanup ownership"`
