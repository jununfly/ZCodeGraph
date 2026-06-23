# Edge Write And Cleanup Ownership Boundary

Date: 2026-06-21

## Parent

- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Issue: #409
- Ownership matrix:
  `docs/benchmarks/2026-06-21-finalization-tail-ownership-matrix.md`

## Decision

Edge materialization, endpoint validation, edge write, and cleanup are tail
mechanisms that can be evaluated separately from semantic target selection.
In this document, `edge materialization` is the mechanical conversion from a
resolved target decision into an edge row.

No semantic routing or every-reference disambiguation behavior is changed by
this boundary. Future migration may move mechanics only after reference target
selection has already produced the same target ids.

## Boundary Split

Semantic target selection owns:

- choosing whether a reference resolves;
- choosing the target node id;
- choosing edge kind;
- assigning confidence and resolved-by semantics;
- deciding whether a reference is intentionally unresolved.

Edge materialization and write own:

- converting resolved decisions into edge rows;
- endpoint validation;
- duplicate protection;
- edge insert batching;
- edge metadata serialization;
- transaction boundaries for write mechanics.

Cleanup owns:

- deleting resolved unresolved-ref rows after their edges have been persisted;
- deleting intentionally unresolved rows only after they are recorded as
  intentionally unresolved;
- preserving unsupported or stale refs when they remain needed as fallback
  evidence.

## Profile Contract

Future cleanup/write migration evidence must preserve and report:

- `edgeMaterializationMs`
- `edgeMaterializationDbMs`
- `edgeEndpointValidationDbMs`
- `edgeInsertCount`
- `edgeInsertSerializationMs`
- `edgeInsertSerializedBytes`
- `edgeWriteMs`
- `edgeWriteDbMs`
- `resolvedCleanupMs`
- `resolvedCleanupDbMs`
- `resolvedCleanupRowCount`
- `intentionallyUnresolvedCleanupMs`
- `intentionallyUnresolvedCleanupDbMs`
- `intentionallyUnresolvedCleanupRowCount`
- `unresolvedCleanupMs`
- `unresolvedCleanupDbMs`

These fields explain tail mechanics. They do not prove semantic equivalence by
themselves.

## Graph Parity Contract

Before any migrated edge write or cleanup path can be kept, evidence must
include:

- graphStats before/after;
- node count parity unless the migration explicitly documents a non-semantic
  cleanup difference;
- edge count parity by edge kind and edge origin;
- no unexpected fallback taxonomy movement;
- endpoint validation failure count or explicit unavailable reason;
- deterministic fixture coverage for empty batches and resolved/intentionally
  unresolved cleanup batches.

If graph parity fails, the migration must fail closed to the existing
TypeScript write/cleanup path.

## Migration Gate

This boundary is eligible for a future implementation slice when:

- semantic target selection remains TypeScript-owned or already-equivalent
  Rust-owned;
- edge rows can be reproduced without changing target ids;
- cleanup row categories are explicit enough to avoid deleting fallback
  evidence;
- profile artifacts can attribute movement to write/cleanup mechanics instead
  of hiding it inside `databaseAccessMs`;
- rollback is possible by keeping the existing TypeScript path.

## No-Go Conditions

Do not migrate write/cleanup mechanics if:

- the implementation needs to change target selection;
- unresolved refs cannot be classified before deletion;
- graphStats or edge-origin parity is not explainable;
- profile evidence cannot distinguish endpoint validation, edge write, and
  cleanup;
- the migration would bundle dynamic-dispatch synthesis or framework
  post-extract behavior.

## Closeout Input

This artifact satisfies #409 and feeds the Finalization Tail Boundary Plan
closeout. It classifies edge write and cleanup as separable tail mechanisms
whose migration is allowed only behind graph parity, profile, and fail-closed
cleanup contracts.
