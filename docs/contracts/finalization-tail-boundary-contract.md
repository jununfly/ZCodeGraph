# Finalization Tail Boundary Contract

Date: 2026-06-21 (contracts) · consolidated as durable design 2026-09-21

## Scope

The finalization tail is everything that runs between graph write and the
finished index: TypeScript fallback append, framework post-extract, broad
reference resolution, candidate lookup, edge materialization/write, unresolved
refs cleanup, dynamic-dispatch synthesis, and database maintenance.

This document is the durable ownership and diagnostic contract for that tail,
distilled from the Finalization Tail Boundary Plan (issues #407–#411) and two
later implementation slices (Plan A rowid-range cleanup, #445 guarded
edge-write). It is a boundary contract, not a production migration: it fixes
who owns each responsibility today, what may move later, and what evidence any
future migration must produce.

Two boundaries are deliberately not moved by any of these contracts:

- Broad disambiguation is not migrated by this plan. Every-reference target
  selection needs separate parity and replay evidence.
- Dynamic-dispatch synthesis is not migrated by this plan. Partial coverage can
  regress agent sufficiency.

The high-level Phase 20 Rust/TypeScript seam lives in
[`rust-indexing-finalization-boundary.md`](rust-indexing-finalization-boundary.md);
this page defines the concrete tail responsibilities underneath it.

## Responsibility Matrix

| Responsibility | Current owner | Target posture | Diagnostic surface | Boundary decision |
| --- | --- | --- | --- | --- |
| Product shell orchestration | TypeScript-owned | TypeScript-owned | `indexed_with_engine`, final result metadata, engine profile merge | Keep TypeScript-owned. This is product lifecycle, not resolver migration. |
| TypeScript fallback append | TypeScript-owned | TypeScript-owned compatibility layer | `typescriptFallbackAppend.durationMs`, `typescriptFallbackAppend.fallbackFileCount`, `typescriptFallbackAppend.errorTaxonomy` | Keep TypeScript-owned until fallback extraction itself changes. Finalization must run after Rust and fallback writes. |
| Framework post-extract | TypeScript-owned | deferred | `frameworkPostExtractMs` | Keep TypeScript-owned for now. Ordering and mutation contract defined below; do not migrate hooks to Rust in this plan. |
| Broad reference resolution | TypeScript-owned | Rust-owned long term | `referenceResolutionMs`, `importResolutionMs`, `nameMatchingMs`, `frameworkMatchingMs`, `perReferenceDisambiguationMs` | Do not migrate in this plan. Every-reference disambiguation semantics need separate parity evidence. |
| Candidate lookup/cache | protocol-owned in progress | protocol-owned / Rust-owned over time | `candidateProtocol`, `candidateLookupMs`, `sharedCandidateLookupMs`, `candidateLookupCacheHitMs`, `nameMatcherCandidateLookupDbMs` | Existing protocol work is the migration precedent. This contract references it but does not reopen candidate producer scope. |
| Import/export semantic slices | Rust-owned by validated slices plus TypeScript fallback | Rust-owned by independently validated slices | `boundaryProtocol.rustOwnedStages`, ESM/import fallback taxonomy artifacts | Keep incremental Rust ownership. Residual semantic buckets require separate plans. |
| Local exact references | Rust-owned by validated slices plus TypeScript fallback | Rust-owned by independently validated slices | `boundaryProtocol.rustOwnedStages`, local reference edge counts | Keep current Rust-owned slices; do not broaden local scope modelling here. |
| Edge materialization/write | TypeScript-owned tail mechanism | protocol-owned candidate | `edgeMaterializationMs`, `edgeMaterializationDbMs`, `edgeEndpointValidationDbMs`, `edgeInsertCount`, `edgeInsertSerializationMs`, `edgeInsertSerializedBytes`, `edgeWriteMs`, `edgeWriteDbMs` | A mechanical tail boundary. It can move only after target selection is already decided. |
| Unresolved refs cleanup | TypeScript-owned tail mechanism | protocol-owned candidate | `unresolvedCleanupMs`, `unresolvedCleanupDbMs`, `resolvedCleanupMs`, `resolvedCleanupDbMs`, `resolvedCleanupRowCount`, `intentionallyUnresolvedCleanupMs`, `intentionallyUnresolvedCleanupDbMs`, `intentionallyUnresolvedCleanupRowCount` | Lifecycle and fail-closed deletion rules defined below before any migration. |
| Dynamic-dispatch synthesis | TypeScript-owned | deferred | `dynamicDispatchSynthesisMs` | Deferred because partial coverage can regress agent sufficiency. Do not migrate by this plan. |
| Database maintenance | TypeScript-owned | TypeScript-owned or protocol-owned later | `dbMaintenanceMs` | Keep TypeScript-owned for now. It is downstream maintenance, not a semantic migration prerequisite. |
| Tail diagnostics/profile | mixed | protocol-owned contract | `boundaryProtocol`, `fallbackTaxonomy`, all finalization sub-buckets | Public artifact contract for future implementation evidence; no long-term API stability promised for every internal field. |

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
- `referenceResolutionBreakdown.edgeEndpointValidationDbMs`, `edgeWriteDbMs`,
  and `edgeInsertCount` explain edge write mechanics.
- `referenceResolutionBreakdown.resolvedCleanupRowCount` and
  `intentionallyUnresolvedCleanupRowCount` explain cleanup lifecycle progress.
- `dynamicDispatchSynthesisMs` explains the deferred dynamic-dispatch pass.
- `dbMaintenanceMs` explains post-resolution database maintenance.
- `boundaryProtocol` explains which stages are Rust-owned in the current run.
- `fallbackTaxonomy` explains which finalization responsibilities remain
  TypeScript-owned or intentionally unsupported by Rust.

### Missing Fields

No new production profile field is required to satisfy this contract. Known
limits: the matrix reuses existing evidence rather than running a new profile;
RSS is not collected by boundary artifacts; framework post-extract mutation
detail is encoded by the deterministic fixture below rather than the profile;
unresolved ref lifecycle categories are governed by the explicit lifecycle
contract below.

### Deferred Boundaries

Deferred, not rejected — each needs its own plan with parity, fallback
taxonomy, graphStats, and representative semantic evidence:

- broad reference disambiguation migration;
- dynamic-dispatch synthesis migration;
- framework post-extract Rust migration;
- package/runtime resolution expansion;
- default/namespace/type-only import semantic expansion;
- full scoreboard or agent A/B evidence.

## Framework Post-Extract Boundary Contract

**Decision:** Framework post-extract remains TypeScript-owned and deferred for
migration. It mutates graph facts after extraction and before reference
resolution; it is not moved to Rust by this plan.

### Boundary Contract

Framework post-extract hooks may:

- read the complete indexed file list;
- read source files needed for cross-file framework declarations;
- inspect already-extracted nodes;
- update existing node names or metadata when a framework-level declaration
  changes the externally visible graph fact;
- preserve stable node ids when updating nodes so existing extracted edges stay
  valid;
- request resolver cache invalidation before and after mutation.

Framework post-extract hooks must not:

- change every-reference disambiguation semantics;
- delete unresolved references;
- create broad dynamic-dispatch edges;
- assume TypeScript fallback append has not run;
- depend on a partial graph that only contains the current file.

### Ordering Contract

```text
extraction / Rust graph write
  -> TypeScript fallback append when needed
  -> resolver initialize
  -> framework post-extract
  -> reference resolution
  -> dynamic-dispatch synthesis
  -> database maintenance
```

Framework post-extract must run before reference resolution because route,
controller, module, or framework-derived names can be consumed by downstream
resolution and agent-facing retrieval.

### Deterministic Fixture

`__tests__/frameworks-integration.test.ts` —
"NestJS end-to-end framework post-extract boundary > applies RouterModule
prefixes before the final graph is consumed". A small NestJS project indexed
through the public `CodeGraph` interface proves the final graph exposes
`GET /admin/users/:id` (not the pre-post-extract `GET /users/:id`) and that the
route still references the handler method. This protects the public boundary
rather than the private NestJS helper.

### Migration Gate

Before any framework post-extract hook moves to Rust or protocol ownership,
the migration plan must provide:

- deterministic fixture parity for the hook;
- graphStats before/after;
- route/node id stability evidence when nodes are updated;
- fallback taxonomy or no-op reason for unsupported framework forms;
- representative real-repo smoke when the hook affects route or flow
  sufficiency;
- explicit confirmation that dynamic-dispatch synthesis is not accidentally
  bundled into the same migration.

No hook migrates if it requires changing every-reference disambiguation
semantics or broad framework coverage in the same slice.

## Edge Write And Cleanup Ownership Boundary

**Decision (#409):** edge materialization, endpoint validation, edge write, and
cleanup are tail mechanisms separable from semantic target selection. "Edge
materialization" is the mechanical conversion of a resolved target decision
into an edge row. No semantic routing or every-reference disambiguation behavior is changed; future migration may move mechanics only after reference
target selection already produces the same target ids.

### Boundary Split

Semantic target selection owns: choosing whether a reference resolves; choosing
the target node id; choosing edge kind; assigning confidence and resolved-by
semantics; deciding whether a reference is intentionally unresolved.

Edge materialization and write own: converting resolved decisions into edge
rows; endpoint validation; duplicate protection; edge insert batching; edge
metadata serialization; transaction boundaries for write mechanics.

Cleanup owns: deleting resolved unresolved-ref rows after their edges persist;
deleting intentionally unresolved rows only after they are recorded as
intentionally unresolved; preserving unsupported or stale refs when they remain
needed as fallback evidence.

### Profile Contract

Future cleanup/write migration evidence must preserve and report:
`edgeMaterializationMs`, `edgeMaterializationDbMs`,
`edgeEndpointValidationDbMs`, `edgeInsertCount`, `edgeInsertSerializationMs`,
`edgeInsertSerializedBytes`, `edgeWriteMs`, `edgeWriteDbMs`,
`resolvedCleanupMs`, `resolvedCleanupDbMs`, `resolvedCleanupRowCount`,
`intentionallyUnresolvedCleanupMs`,
`intentionallyUnresolvedCleanupDbMs`,
`intentionallyUnresolvedCleanupRowCount`, `unresolvedCleanupMs`,
`unresolvedCleanupDbMs`. These explain tail mechanics; they do not prove
semantic equivalence by themselves.

### Graph Parity Contract

Before a migrated edge write or cleanup path can be kept, evidence must
include: graphStats before/after; node count parity unless a non-semantic
cleanup difference is explicitly documented; edge count parity by edge kind and
edge origin; no unexpected fallback taxonomy movement; endpoint validation
failure count or explicit unavailable reason; deterministic fixture coverage
for empty batches and resolved/intentionally-unresolved cleanup batches. If
graph parity fails, the migration must fail closed to the existing TypeScript
write/cleanup path.

### Migration Gate

Eligible for a future implementation slice when: semantic target selection
remains TypeScript-owned or already-equivalent Rust-owned; edge rows reproduce
without changing target ids; cleanup row categories are explicit enough to
avoid deleting fallback evidence; profile artifacts attribute movement to
write/cleanup mechanics instead of hiding it inside `databaseAccessMs`;
rollback is possible by keeping the existing TypeScript path.

### No-Go Conditions

Do not migrate write/cleanup mechanics if: the implementation needs to change
target selection; unresolved refs cannot be classified before deletion;
graphStats or edge-origin parity is not explainable; profile evidence cannot
distinguish endpoint validation, edge write, and cleanup; or the migration
would bundle dynamic-dispatch synthesis or framework post-extract behavior.

## Unresolved Refs Lifecycle Contract

**Decision (#410):** unresolved reference cleanup cannot migrate safely until
unresolved refs have a clear lifecycle taxonomy and fail-closed cleanup rules.
No broad disambiguation migration is introduced by this contract.

### Lifecycle Taxonomy

| State | Meaning | Cleanup posture |
| --- | --- | --- |
| created | Emitted by extraction, Rust-owned slices, or TypeScript fallback append and not yet processed by finalization. | Must remain until a resolver or classifier handles it. |
| resolved | A resolver selected a target and the corresponding edge was persisted. | May be deleted only after edge write succeeds. |
| intentionally unresolved | A resolver/classifier decided the ref is intentionally unsupported, external, package/runtime, or otherwise not a graph edge. | May be deleted only after the reason is counted in fallback taxonomy or diagnostic evidence. |
| unsupported | The ref belongs to a known unsupported shape that must stay explainable to future diagnostics. | Must not be silently deleted without a taxonomy reason. |
| stale | The ref points at graph facts removed or superseded by sync/index replacement. | May be deleted only by a lifecycle-aware stale cleanup path, not by semantic migration code. |

### Fail-Closed Cleanup Contract

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

In short: refs that are not proven resolved or intentionally unresolved
must not be deleted.

### Rust-Hybrid Interaction

Rust-owned slices may resolve selected refs before TypeScript broad
finalization, may leave unsupported refs for TypeScript finalization, must make
Rust-owned resolved stages visible through `boundaryProtocol`, and must
preserve fallback evidence for refs they do not own.

TypeScript fallback append may create additional unresolved refs after Rust
core indexing, must run before finalization cleanup, and must not cause cleanup
to treat Rust-owned unresolved refs as stale simply because they were created
by a different engine.

TypeScript reference resolution remains the broad owner of unresolved ref
processing under this contract, may delete resolved and intentionally
unresolved refs after batching, and records cleanup movement through row-count
and timing profile fields.

### Visibility Contract

The lifecycle must remain visible through: `fallbackTaxonomy.entries[]`;
`boundaryProtocol.rustOwnedStages`; `resolvedCleanupRowCount`;
`intentionallyUnresolvedCleanupRowCount`; `unresolvedCleanupMs`;
`unresolvedCleanupDbMs`; and issue-specific taxonomy artifacts when a semantic
fallback family is being burned down. Future slices may add diagnostic buckets;
no new production profile field is required by this contract.

### No-Go Conditions

Do not migrate unresolved refs cleanup when: lifecycle state cannot be
reconstructed from available graph/profile facts; cleanup would delete unknown
refs; fallback taxonomy would lose unsupported-shape evidence; Rust-owned
slices and TypeScript fallback append disagree about ownership; graphStats
movement cannot be explained; or the migration depends on changing target
selection or disambiguation rules.

## Decision Provenance

Finalization Tail Boundary Plan completed. It moved the finalization tail from
an open-ended architecture question (#165) into implementation-sequence mode:
pick a bounded implementation issue from the completed boundary map, preserve
every-reference disambiguation semantics unless a separate architecture
decision changes them, require graphStats/fallback taxonomy/profile evidence
for production migration, and escalate only when implementation evidence
exposes a new ownership, diagnostic, or semantic boundary problem.
**#165 remains open** as the durable post-release optimization tracker; this
contract does not close it.

Dynamic-dispatch synthesis remains deferred; Broad disambiguation remains deferred; framework post-extract Rust migration remains deferred (the boundary
is tested and documented, hooks were not moved).

Source artifacts whose normative content was consolidated here (process files,
deleted 2026-06-24 after extraction):

- `2026-06-21-finalization-tail-ownership-matrix.md` (#407)
- `2026-06-21-framework-post-extract-boundary-contract.md` (#408)
- `2026-06-21-edge-write-cleanup-ownership-boundary.md` (#409)
- `2026-06-21-unresolved-refs-lifecycle-contract.md` (#410)
- `2026-06-21-finalization-tail-boundary-closeout.md` (#411)

Two later implementation slices were kept on the strength of this contract and
left no durable process artifact: Plan A (#416–#419) unified resolved and
intentionally-unresolved terminal cleanup on the existing rowid-range deletion
helper (decision `keep`; mechanics-only, no semantic/schema change, verified by
`__tests__/resolution.test.ts` "batched persistence cleans resolved"); the #445
guarded edge-write slice added a fail-open per-edge guard for moduleResolution
file-level import edges (relative imports, tsconfig `paths`, conventional
aliases, workspace package imports, `rootDirs`, package self-name/exports,
`#...` package imports), with narrow diagnostics
`moduleResolutionGuardedEdgeWrite{Attempted,Written,Skipped}Refs` and
`...SkippedCounts`, and fixture
`rust_guarded_file_import_edge_writes_record_write_and_skip_decisions`. The
guard uses Rust-owned taxonomy only (no TypeScript compiler oracle at runtime),
skips only the weak edge and continues indexing, and does not cover ESM named
symbol edges, one-hop re-export edges, local exact callable refs, or a general
finalization-edge policy platform.