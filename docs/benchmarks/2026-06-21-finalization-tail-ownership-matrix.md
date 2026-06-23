# Finalization Tail Ownership Matrix

Date: 2026-06-21

## Parent

- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Issue: #407
- Optimization tracker: #165
- ADR: `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- Current-state map:
  `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`

## Decision

This artifact converts the existing finalization architecture map into the
ownership matrix and public diagnostic contract required by the Finalization
Tail Boundary Plan.

The matrix is a boundary contract, not a production migration.

Broad disambiguation is not migrated by this plan.
Dynamic-dispatch synthesis is not migrated by this plan.

## Responsibility Matrix

| Responsibility | Current owner | Target posture | Diagnostic surface | Boundary decision |
| --- | --- | --- | --- | --- |
| Product shell orchestration | TypeScript-owned | TypeScript-owned | `indexed_with_engine`, final result metadata, engine profile merge | Keep TypeScript-owned. This is product lifecycle, not resolver migration. |
| TypeScript fallback append | TypeScript-owned | TypeScript-owned compatibility layer | `typescriptFallbackAppend.durationMs`, `typescriptFallbackAppend.fallbackFileCount`, `typescriptFallbackAppend.errorTaxonomy` | Keep TypeScript-owned until fallback extraction itself changes. Finalization must run after Rust and fallback writes. |
| Framework post-extract | TypeScript-owned | deferred | `frameworkPostExtractMs` | Keep TypeScript-owned for now. Define ordering and mutation contract in #408; do not migrate hooks to Rust in this plan. |
| Broad reference resolution | TypeScript-owned | Rust-owned long term | `referenceResolutionMs`, `importResolutionMs`, `nameMatchingMs`, `frameworkMatchingMs`, `perReferenceDisambiguationMs` | Do not migrate in this plan. Every-reference disambiguation semantics need separate parity evidence. |
| Candidate lookup/cache | protocol-owned in progress | protocol-owned / Rust-owned over time | `candidateProtocol`, `candidateLookupMs`, `sharedCandidateLookupMs`, `candidateLookupCacheHitMs`, `nameMatcherCandidateLookupDbMs` | Existing protocol work is the migration precedent. This plan references it but does not reopen candidate producer scope. |
| Import/export semantic slices | Rust-owned by validated slices plus TypeScript fallback | Rust-owned by independently validated slices | `boundaryProtocol.rustOwnedStages`, ESM/import fallback taxonomy artifacts | Keep incremental Rust ownership. Residual semantic buckets require separate plans. |
| Local exact references | Rust-owned by validated slices plus TypeScript fallback | Rust-owned by independently validated slices | `boundaryProtocol.rustOwnedStages`, local reference edge counts | Keep current Rust-owned slices; do not broaden local scope modelling here. |
| Edge materialization/write | TypeScript-owned tail mechanism | protocol-owned candidate | `edgeMaterializationMs`, `edgeMaterializationDbMs`, `edgeEndpointValidationDbMs`, `edgeInsertCount`, `edgeInsertSerializationMs`, `edgeInsertSerializedBytes`, `edgeWriteMs`, `edgeWriteDbMs` | Classify as a mechanical tail boundary in #409. It can move only after target selection is already decided. |
| Unresolved refs cleanup | TypeScript-owned tail mechanism | protocol-owned candidate | `unresolvedCleanupMs`, `unresolvedCleanupDbMs`, `resolvedCleanupMs`, `resolvedCleanupDbMs`, `resolvedCleanupRowCount`, `intentionallyUnresolvedCleanupMs`, `intentionallyUnresolvedCleanupDbMs`, `intentionallyUnresolvedCleanupRowCount` | Classify lifecycle and fail-closed deletion rules in #410 before any migration. |
| Dynamic-dispatch synthesis | TypeScript-owned | deferred | `dynamicDispatchSynthesisMs` | Deferred because partial coverage can regress agent sufficiency. Do not migrate by this plan. |
| Database maintenance | TypeScript-owned | TypeScript-owned or protocol-owned later | `dbMaintenanceMs` | Keep TypeScript-owned for now. It is downstream maintenance, not a semantic migration prerequisite. |
| Tail diagnostics/profile | mixed | protocol-owned contract | `boundaryProtocol`, `fallbackTaxonomy`, all finalization sub-buckets | Treat as a public artifact contract for future implementation evidence, without promising long-term API stability for every internal field. |

## Public Diagnostic Contract

The finalization tail must remain explainable through profile artifacts. The
required public contract for future implementation evidence is:

- `frameworkPostExtractMs` explains the pre-resolution framework mutation pass.
- `referenceResolutionMs` explains the broad TypeScript-owned resolver tail.
- `referenceResolutionBreakdown.importResolutionMs` explains import-resolution
  work that remains TypeScript-owned.
- `referenceResolutionBreakdown.nameMatchingMs` and
  `referenceResolutionBreakdown.perReferenceDisambiguationMs` explain
  disambiguation work that must not move without parity evidence.
- `referenceResolutionBreakdown.candidateProtocol` explains candidate lookup
  protocol behavior, including lookup counts, shape counts, cache hits,
  fallback reasons, and Rust producer diagnostics.
- `referenceResolutionBreakdown.edgeEndpointValidationDbMs`,
  `edgeWriteDbMs`, and `edgeInsertCount` explain edge write mechanics.
- `referenceResolutionBreakdown.resolvedCleanupRowCount` and
  `intentionallyUnresolvedCleanupRowCount` explain cleanup lifecycle progress.
- `dynamicDispatchSynthesisMs` explains the deferred dynamic-dispatch pass.
- `dbMaintenanceMs` explains post-resolution database maintenance.
- `boundaryProtocol` explains which stages are Rust-owned in the current run.
- `fallbackTaxonomy` explains which finalization responsibilities remain
  TypeScript-owned or intentionally unsupported by Rust.

## Missing Fields

No new production profile field is required to complete #407.

Known limits:

- The ownership matrix reuses existing evidence rather than running a new
  profile.
- RSS is not newly collected for this boundary artifact because this issue does
  not run a targeted profile.
- Framework post-extract mutation details are not fully encoded in the profile;
  #408 covers that boundary with a deterministic fixture and contract.
- Unresolved ref lifecycle categories need a more explicit contract before
  cleanup migration; #410 covers that.

## Deferred Boundaries

Deferred in this plan:

- broad reference disambiguation migration;
- dynamic-dispatch synthesis migration;
- framework post-extract Rust migration;
- package/runtime resolution expansion;
- default/namespace/type-only import semantic expansion;
- full scoreboard or agent A/B evidence.

These are not rejected forever. They require separate plans with parity,
fallback taxonomy, graphStats, and representative semantic evidence.

## Closeout Input

This artifact satisfies #407 and feeds the final Plan 2 closeout. The closeout
should reference it as the source of truth for the Finalization Tail Boundary
Plan responsibility matrix and diagnostic contract.
