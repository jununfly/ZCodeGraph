# Unresolved Refs Lifecycle Contract

Date: 2026-06-21

## Parent

- Plan: `docs/plans/2026-06-21-rust-hybrid-finalization-tail-boundary-plan.md`
- Issue: #410
- Ownership matrix:
  `docs/benchmarks/2026-06-21-finalization-tail-ownership-matrix.md`
- Cleanup boundary:
  `docs/benchmarks/2026-06-21-edge-write-cleanup-ownership-boundary.md`

## Decision

Unresolved reference cleanup cannot migrate safely until unresolved refs have a
clear lifecycle taxonomy and fail-closed cleanup rules.

No broad disambiguation migration is introduced by this contract.

## Lifecycle Taxonomy

Unresolved refs may be in one of these lifecycle states:

| State | Meaning | Cleanup posture |
| --- | --- | --- |
| created | Emitted by extraction, Rust-owned slices, or TypeScript fallback append and not yet processed by finalization. | Must remain until a resolver or classifier handles it. |
| resolved | A resolver selected a target and the corresponding edge was persisted. | May be deleted only after edge write succeeds. |
| intentionally unresolved | A resolver or classifier decided the ref is intentionally unsupported, external, package/runtime, or otherwise not a graph edge. | May be deleted only after the reason is counted in fallback taxonomy or diagnostic evidence. |
| unsupported | The ref belongs to a known unsupported shape that should remain explainable to future diagnostics. | Must not be silently deleted without a taxonomy reason. |
| stale | The ref points at graph facts removed or superseded by sync/index replacement. | May be deleted only by a lifecycle-aware stale cleanup path, not by semantic migration code. |

## Fail-Closed Cleanup Contract

Future cleanup code must fail closed:

- resolved refs must not be deleted before edge write commits;
- intentionally unresolved refs must not be deleted before their reason is
  recorded;
- unsupported refs must not be deleted without fallback taxonomy visibility;
- stale refs must not be deleted by a resolver migration unless the migration
  owns stale detection;
- unknown refs must remain in `unresolved_refs` when classification is missing;
- cleanup must stop or fall back to the current TypeScript cleanup path when
  lifecycle categories cannot be reconstructed.

In short: refs that are not proven resolved or intentionally unresolved must
not be deleted.

## Rust-Hybrid Interaction

Rust-owned slices:

- may resolve selected refs before TypeScript broad finalization;
- may leave unsupported refs for TypeScript finalization;
- must make Rust-owned resolved stages visible through `boundaryProtocol`;
- must preserve fallback evidence for refs they do not own.

TypeScript fallback append:

- may create additional unresolved refs after Rust core indexing;
- must run before finalization cleanup;
- must not cause cleanup to treat Rust-owned unresolved refs as stale simply
  because they were created by a different engine.

TypeScript reference resolution:

- remains the broad owner of unresolved ref processing in this plan;
- may delete resolved and intentionally unresolved refs after batching;
- records cleanup movement through row-count and timing profile fields.

## Visibility Contract

The lifecycle must remain visible through:

- `fallbackTaxonomy.entries[]`;
- `boundaryProtocol.rustOwnedStages`;
- `resolvedCleanupRowCount`;
- `intentionallyUnresolvedCleanupRowCount`;
- `unresolvedCleanupMs`;
- `unresolvedCleanupDbMs`;
- issue-specific taxonomy artifacts when a semantic fallback family is being
  burned down.

Future implementation slices may add more diagnostic buckets, but #410 does
not require new production profile fields.

## No-Go Conditions

Do not migrate unresolved refs cleanup when:

- lifecycle state cannot be reconstructed from available graph/profile facts;
- cleanup would delete unknown refs;
- fallback taxonomy would lose unsupported-shape evidence;
- Rust-owned slices and TypeScript fallback append disagree about ownership;
- graphStats movement cannot be explained;
- the migration depends on changing target selection or disambiguation rules.

## Closeout Input

This artifact satisfies #410 and feeds the Finalization Tail Boundary Plan
closeout. It defines the lifecycle categories and fail-closed deletion rules
that future cleanup migration must preserve.
