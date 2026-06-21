# Rust-Hybrid Finalization Tail Boundary Plan

Date: 2026-06-21

## Parent

- Optimization tracker: #165
- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- PRD closeout:
  `docs/benchmarks/2026-06-21-rust-hybrid-architecture-performance-prd-closeout.md`
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Architecture map:
  `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`
- ADR:
  `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- Previous #165 successor plan:
  `docs/plans/2026-06-21-rust-hybrid-value-token-interface-routing.md`
- Previous closeout:
  `docs/benchmarks/2026-06-21-value-token-interface-routing-closeout.md`

## Context

The first #165 successor plan validated one guarded semantic routing slice:
`value-token-plus-interface`. Its closeout was `keep-with-caveat`: the mechanism
is useful and produced Rust-owned edges on VS Code sparse, but it did not close
the whole collision family.

The next plan should not continue burning isolated fallback buckets by default.
The durable missing piece is the finalization tail boundary itself. The project
already has a current-state map from 2026-06-20, but it still needs an explicit
completion plan that turns the map into:

- a responsibility matrix;
- a diagnostic contract;
- migration/defer gates;
- a closeout artifact;
- a clear #165 state transition into implementation-sequence mode.

## Goal

Complete the Finalization Tail Boundary Plan.

Completion means the finalization/reference-resolution tail is explicitly
classified, the low-risk tail mechanisms have their boundary contracts defined,
framework post-extract has a deterministic pre-resolution contract, and #165 is
updated to stop asking open-ended architecture questions before implementation
work can continue.

This plan is a boundary closeout plan. It does not migrate broad resolver
semantics to Rust.

## Scope

In scope:

- finalization tail ownership matrix;
- public profile/diagnostic contract for the tail;
- framework post-extract boundary contract and deterministic fixture;
- edge write and cleanup ownership boundary;
- unresolved refs lifecycle taxonomy and fail-closed cleanup contract;
- closeout artifact under `docs/benchmarks/`;
- #165 update stating `Finalization Tail Boundary Plan completed`.

Out of scope:

- broad reference disambiguation migration;
- changing every-reference disambiguation semantics;
- moving dynamic-dispatch synthesis;
- moving framework post-extract to Rust;
- full scoreboard;
- agent A/B by default;
- README or release metric refresh;
- CLI, SDK, MCP, status, doctor, or package workflow changes unless a boundary
  test exposes an existing contract bug.

## Existing Evidence To Reuse

Default evidence source:

- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`
- `docs/benchmarks/2026-06-21-rust-hybrid-architecture-performance-prd-closeout.md`
- 2026-06-21 fallback/taxonomy closeouts under `docs/benchmarks/`
- latest #165 tracker comments

Do not run a new full benchmark for this plan by default.

A single targeted profile may be run only if writing the closeout exposes a
missing field required for the boundary contract. If VS Code sparse evidence is
needed, use `/private/tmp/codegraph-corpus/vscode-sparse` only when it exists
and is a Git checkout. Do not clone automatically.

## Responsibility Classification Target

The closeout must classify each tail responsibility:

| Responsibility | Current owner | Target posture | Plan 2 action |
| --- | --- | --- | --- |
| Product shell orchestration | TypeScript | TypeScript-owned | Document as out of resolver migration scope. |
| TypeScript fallback append | TypeScript | TypeScript-owned compatibility layer | Document interaction with finalization and next full-index behavior. |
| Framework post-extract | TypeScript | Deferred migration candidate | Define boundary contract and fixture; do not migrate. |
| Broad reference resolution | TypeScript | Long-term Rust-owned | Classify; do not migrate in this plan. |
| Candidate lookup/cache | Mixed protocol/Rust work already started | Protocol/Rust-owned over time | Reference existing work; do not reopen in this plan unless diagnostic gap is found. |
| Import/export semantic slices | Mixed | Rust-owned by independently validated slices | Classify completed and residual slices. |
| Local exact references | Mixed | Rust-owned by independently validated slices | Classify completed and residual slices. |
| Edge materialization/write | TypeScript tail | Protocol-owned or Rust-owned candidate | Define boundary and evidence gate. |
| Unresolved refs cleanup | TypeScript tail | Protocol-owned or Rust-owned candidate | Define lifecycle taxonomy and fail-closed contract. |
| Dynamic-dispatch synthesis | TypeScript | Deferred | Classify as deferred due to sufficiency risk. |
| DB maintenance | TypeScript tail | TypeScript-owned or protocol-owned later | Classify; no migration in this plan. |
| Tail diagnostics/profile | Mixed | Protocol contract | Define public diagnostic fields needed for later implementation. |

## Decisions Already Made

- Plan 2 is `Finalization Tail Boundary Plan`.
- Plan 2 must complete the boundary plan, not merely discuss it.
- The plan output is boundary closeout plus issue sequence, not production Rust
  migration.
- Dynamic-dispatch synthesis is classified but deferred.
- Framework post-extract is included in the issue sequence, but only as
  boundary contract plus deterministic fixture. It must not migrate to Rust in
  this plan.
- Existing evidence should be reused by default. A targeted profile is allowed
  only for a concrete missing field.
- After closeout, #165 moves into implementation-sequence mode. Future
  implementation issues may still escalate architecture problems, but Plan 2
  should not remain open-ended.

## Issue Sequence

### 1. Finalization Tail Diagnostic Contract And Ownership Matrix

Purpose:

- turn the current architecture map into a closeable ownership matrix;
- identify public profile fields that are required for later implementation
  evidence;
- classify each tail responsibility as TypeScript-owned, Rust-owned,
  protocol-owned, or deferred.

Acceptance criteria:

- ownership matrix exists in a decision artifact or closeout draft;
- diagnostic fields are listed by responsibility;
- missing fields are either explicitly not required or converted into bounded
  follow-up work;
- no production behavior changes.

### 2. Framework Post-Extract Boundary Contract And Fixture

Purpose:

- make framework post-extract visible as a pre-reference-resolution boundary;
- prove the ordering contract with deterministic fixture coverage;
- define the migration gate for any future Rust/protocol implementation.

Acceptance criteria:

- fixture demonstrates that framework post-extract must run before reference
  resolution when it changes graph facts consumed by resolution;
- contract documents what a framework post-extract hook may mutate;
- migration gate states what evidence would be required before moving a hook to
  Rust or protocol ownership;
- no framework post-extract hook is migrated to Rust in this plan.

### 3. Edge Write And Cleanup Ownership Boundary

Purpose:

- classify edge materialization/write and cleanup as tail mechanisms separate
  from disambiguation semantics;
- define what can move without changing target selection;
- define graph parity and profile evidence required before any migration.

Acceptance criteria:

- boundary document separates semantic target selection from edge write and
  cleanup mechanics;
- graphStats/parity requirements are explicit;
- profile fields for edge insert count, endpoint validation, write time,
  cleanup row counts, and cleanup time are mapped to the responsibility;
- no semantic routing behavior changes.

### 4. Unresolved Refs Lifecycle Taxonomy And Fail-Closed Cleanup Contract

Purpose:

- make unresolved reference lifecycle explicit across Rust-owned slices,
  TypeScript fallback append, reference resolution, intentionally unresolved
  refs, and cleanup;
- prevent future cleanup migration from deleting refs that should remain
  explainable fallback evidence.

Acceptance criteria:

- lifecycle taxonomy covers created, resolved, intentionally unresolved,
  unsupported, and stale refs;
- cleanup contract is fail-closed and explains what must not be deleted;
- deterministic tests or artifact checks prove the lifecycle categories are
  visible enough for future migration;
- no broad disambiguation migration.

## Closeout Contract

This plan is complete only when a closeout artifact is written under
`docs/benchmarks/` and #165 is updated.

The closeout must include:

- final responsibility matrix;
- diagnostic contract;
- framework post-extract boundary result;
- edge write/cleanup boundary result;
- unresolved refs lifecycle result;
- links to the four issue outcomes;
- explicit deferred list for dynamic-dispatch synthesis, broad
  disambiguation, and framework migration;
- statement: `Finalization Tail Boundary Plan completed`;
- #165 state transition: implementation-sequence mode.

The closeout must not claim that #165 is complete. #165 remains the durable
post-release optimization tracker.

## Validation

Default validation:

- deterministic unit/integration tests for any fixture or contract test added;
- artifact/markdown checks where existing patterns support them;
- `git diff --check`;
- targeted profile only if required by a concrete missing diagnostic field.

Not required by default:

- full scoreboard;
- agent A/B;
- package/release smoke;
- README metric refresh;
- real-repo framework smoke unless framework behavior is changed.

RSS:

- If a targeted profile is run, record RSS or `rssUnavailableReason`.
- If no targeted profile is run, the closeout should state that RSS was not
  newly collected because the plan reused existing evidence.

## Expected Outcome

After this plan:

- the finalization tail is no longer an open-ended architecture question;
- #165 can proceed through implementation-sequence issues;
- future agents can tell which tail responsibilities are ready for
  implementation and which are explicitly deferred;
- semantic migration remains gated by parity evidence instead of convenience.
