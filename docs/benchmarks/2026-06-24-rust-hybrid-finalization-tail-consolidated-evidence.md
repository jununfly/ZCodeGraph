# Rust-Hybrid Finalization Tail Consolidated Evidence

Date: 2026-06-24

Status: consolidated archive

Consolidates finalization-tail ownership, framework post-extract boundaries, edge-write cleanup, unresolved refs lifecycle, and Plan A rowid-range evidence.

This file replaces the issue-scoped process artifacts listed below. The source files were deleted after their useful decisions, taxonomy, and evidence context were consolidated here.

## Historical Source Files Merged And Deleted

- 2026-06-21-edge-write-cleanup-ownership-boundary.md
- 2026-06-21-finalization-tail-boundary-closeout.md
- 2026-06-21-finalization-tail-ownership-matrix.md
- 2026-06-21-framework-post-extract-boundary-contract.md
- 2026-06-21-unresolved-refs-lifecycle-contract.md
- 2026-06-22-finalization-tail-plan-a-candidate-selection.md
- 2026-06-22-finalization-tail-plan-a-closeout-decision.md
- 2026-06-22-finalization-tail-rowid-range-evidence.md
- 2026-06-22-guarded-edge-write-closeout.md
- 2026-06-22-guarded-edge-write-current-oracle.md

## Consolidated Contents

## 1. 2026-06-21-edge-write-cleanup-ownership-boundary.md

# Edge Write And Cleanup Ownership Boundary

Date: 2026-06-21

## Parent

- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Issue: #409
- Ownership matrix:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`

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

## 2. 2026-06-21-finalization-tail-boundary-closeout.md

# Finalization Tail Boundary Closeout

Date: 2026-06-21

## Parent

- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Tracker: #411
- Issues: #407, #408, #409, #410
- Optimization tracker: #165

## Decision

Finalization Tail Boundary Plan completed.

#165 remains open as the durable post-release optimization tracker, but this
closeout moves #165 into implementation-sequence mode for the finalization tail.
Future work should proceed through bounded implementation issues and escalate
architecture only when implementation evidence exposes a new boundary problem.

## Completed Boundary Results

### #407 Ownership Matrix And Diagnostic Contract

Artifact:

- `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`

Result:

- finalization tail responsibilities are classified;
- public diagnostic/profile fields are mapped to the responsibilities they
  explain;
- no new production profile field is required to complete the boundary plan;
- broad disambiguation and dynamic-dispatch synthesis are explicitly not
  migrated by the boundary plan.

### #408 Framework Post-Extract Boundary

Artifact:

- `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`

Result:

- framework post-extract remains TypeScript-owned and deferred for migration;
- the ordering contract is extraction/fallback append -> post-extract ->
  reference resolution -> dynamic-dispatch synthesis -> maintenance;
- deterministic fixture coverage proves the final graph exposes the
  post-extract NestJS RouterModule route prefix before the graph is consumed.

### #409 Edge Write And Cleanup Boundary

Artifact:

- `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`

Result:

- target selection is separated from edge materialization, endpoint validation,
  edge write, and cleanup mechanics;
- future write/cleanup migration requires graph parity, edge-origin parity,
  profile attribution, and fail-closed rollback;
- no semantic routing or every-reference disambiguation behavior changes.

### #410 Unresolved Refs Lifecycle

Artifact:

- `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`

Result:

- unresolved refs lifecycle states are defined: created, resolved,
  intentionally unresolved, unsupported, and stale;
- cleanup must fail closed when lifecycle state is unknown;
- unsupported/fallback evidence must not be silently deleted;
- Rust-owned slices, TypeScript fallback append, and TypeScript reference
  resolution interactions are documented.

## Deferred Boundaries

Dynamic-dispatch synthesis remains deferred because partial migration can
regress agent sufficiency.

Broad disambiguation remains deferred because every-reference target selection
requires separate parity and replay evidence.

Framework post-extract Rust migration remains deferred. The boundary is now
tested and documented, but hooks are not moved in this plan.

## Validation

Validation performed:

- `npx vitest run __tests__/finalization-tail-boundary-doc.test.ts`
- `npx vitest run __tests__/frameworks-integration.test.ts -t "applies RouterModule prefixes before the final graph is consumed"`

No new targeted profile was required. RSS was not newly collected because this
plan reused existing evidence and added deterministic boundary artifacts rather
than running new performance evidence.

## #165 State Transition

The finalization tail is no longer an open-ended architecture question.

#165 should now use implementation-sequence mode for this area:

1. Pick a bounded implementation issue from the completed boundary map.
2. Preserve every-reference disambiguation semantics unless a separate
   architecture decision changes them.
3. Require graphStats, fallback taxonomy, and profile evidence for production
   migration work.
4. Escalate only when implementation evidence exposes a new ownership,
   diagnostic, or semantic boundary problem.

This closeout does not close #165.

## 3. 2026-06-21-finalization-tail-ownership-matrix.md

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

## 4. 2026-06-21-framework-post-extract-boundary-contract.md

# Framework Post-Extract Boundary Contract

Date: 2026-06-21

## Parent

- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Issue: #408
- Ownership matrix:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`

## Decision

Framework post-extract remains TypeScript-owned and deferred for migration.

This boundary is part of the finalization tail because it mutates graph facts
after extraction and before reference resolution. It is not moved to Rust in
this plan.

## Boundary Contract

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

## Ordering Contract

The ordering is:

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

## Deterministic Fixture

Fixture:

- `__tests__/frameworks-integration.test.ts`
  `NestJS end-to-end framework post-extract boundary > applies RouterModule prefixes before the final graph is consumed`

The fixture indexes a small NestJS project through the public `CodeGraph`
interface. It proves the final graph exposes `GET /admin/users/:id`, not the
pre-post-extract `GET /users/:id`, and that the route still references the
handler method.

This protects the public boundary rather than the private NestJS helper.

## Migration Gate

Before any framework post-extract hook can move to Rust or protocol ownership,
the migration plan must provide:

- deterministic fixture parity for the hook;
- graphStats before/after;
- route/node id stability evidence when nodes are updated;
- fallback taxonomy or no-op reason for unsupported framework forms;
- representative real-repo smoke when the hook affects route or flow
  sufficiency;
- explicit confirmation that dynamic-dispatch synthesis is not accidentally
  bundled into the same migration.

No hook should migrate if it requires changing every-reference disambiguation
semantics or broad framework coverage in the same slice.

## Closeout Input

This artifact satisfies the framework post-extract boundary portion of the
Finalization Tail Boundary Plan. The final closeout should classify framework
post-extract as deferred migration candidate with a tested TypeScript-owned
boundary contract.

## 5. 2026-06-21-unresolved-refs-lifecycle-contract.md

# Unresolved Refs Lifecycle Contract

Date: 2026-06-21

## Parent

- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Issue: #410
- Ownership matrix:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`
- Cleanup boundary:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`

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

## 6. 2026-06-22-finalization-tail-plan-a-candidate-selection.md

# Finalization Tail Plan A Candidate Selection

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Issues: #416, #417, #418, #419
- Boundary:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`
- Lifecycle contract:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`

## Selected Candidate

Plan A selects **intentionally-unresolved cleanup rowid-range mechanics**.

The selected candidate changes the batched finalization cleanup helper for
intentionally-unresolved refs so it uses the same rowid-range deletion helper
already used by resolved refs.

This is a finalization-tail mechanics candidate because it only changes how
terminal unresolved-ref rows are deleted after reference resolution has already
classified them as unresolved for this pass.

## Why This Candidate

Rejected first candidates:

- Edge write batching was already covered by
  `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`.
- Resolved cleanup rowid-range mechanics already exists on the batched resolved
  cleanup path.
- Semantic target selection, framework post-extract migration, and
  dynamic-dispatch migration are out of scope for Plan A.

Selected first candidate:

- intentionally-unresolved cleanup still used direct rowid-list deletion;
- the rowid-range helper already exists, has deterministic DB coverage, and is
  schema-preserving;
- the change is bounded to cleanup mechanics and can be tested without changing
  target ids, edge kinds, confidence, or resolved-by semantics.

## Semantic Boundary

Out of scope:

- whether a reference resolves;
- which target node id is selected;
- edge kind semantics;
- confidence and resolved-by semantics;
- framework post-extract ordering;
- dynamic-dispatch synthesis;
- SQLite schema changes.

The implementation must preserve fallback taxonomy visibility. Unknown,
unsupported, or stale refs must not be deleted by this candidate unless the
existing TypeScript finalization pass already classified them as terminal for
the current batch.

## Baseline Fields

The targeted evidence must record:

- `edgeMaterializationMs`
- `edgeWriteMs`
- `edgeWriteDbMs`
- `unresolvedCleanupMs`
- `unresolvedCleanupDbMs`
- `resolvedCleanupMs`
- `resolvedCleanupDbMs`
- `resolvedCleanupRowCount`
- `intentionallyUnresolvedCleanupMs`
- `intentionallyUnresolvedCleanupDbMs`
- `intentionallyUnresolvedCleanupRowCount`
- fallback taxonomy entries
- graphStats or graph-visible parity summary
- RSS or unavailable reason

Historical baseline evidence shows intentionally-unresolved cleanup can be a
visible part of the VS Code sparse finalization tail, for example:

- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
  recorded `intentionallyUnresolvedCleanupMs: 2345` and
  `intentionallyUnresolvedCleanupRowCount: 155983`.
- `docs/benchmarks/2026-06-21-parse-ast-extraction-optimization-after.profile.json`
  recorded `intentionallyUnresolvedCleanupMs: 2230` and
  `intentionallyUnresolvedCleanupRowCount: 155983`.

## Gates

`keep`:

- deterministic cleanup contract confirms intentionally-unresolved rowids use
  the rowid-range cleanup helper;
- graphStats and fallback taxonomy remain explainable;
- targeted current-repo and VS Code sparse evidence show the cleanup sub-bucket
  is preserved or trends favorably;
- no semantic target selection behavior changes.

`no-go`:

- the change is safe but profile evidence shows no credible trend and no useful
  simplification;
- cleanup behavior becomes harder to explain than the previous direct rowid
  deletion path.

`needs-architecture`:

- implementation requires schema changes;
- implementation requires target selection changes;
- lifecycle categories cannot be reconstructed safely;
- profile evidence cannot distinguish cleanup movement from unrelated
  finalization work.

## 7. 2026-06-22-finalization-tail-plan-a-closeout-decision.md

# Finalization Tail Plan A Closeout Decision

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Issues: #416, #417, #418, #419
- Candidate selection:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`
- Evidence:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`

## Candidate

Plan A implemented **intentionally-unresolved cleanup rowid-range mechanics**.

The batched finalization cleanup path now uses the existing rowid-range helper
for both resolved refs and intentionally-unresolved refs.

## Decision

Decision: `keep`.

Keep the change because it is a narrow finalization-tail mechanics improvement:

- no semantic target selection behavior changes;
- no schema changes;
- no framework post-extract or dynamic-dispatch migration;
- deterministic cleanup coverage confirms terminal cleanup behavior and helper
  selection;
- targeted current-repo and VS Code sparse evidence preserve fallback taxonomy
  visibility and graph-readable indexes.

The performance conclusion is deliberately modest. The candidate does not prove
a large standalone speedup. Its value is consistency and cleanup-boundary
simplification, with a safe mechanics improvement in a visible tail sub-bucket.

## Validation

Commands:

```bash
npx vitest run __tests__/resolution.test.ts -t "batched persistence cleans resolved"
npx vitest run __tests__/db-perf.test.ts __tests__/access-models.test.ts
npm run build
```

Targeted profile artifacts:

- `docs/benchmarks/2026-06-22-finalization-tail-rowid-range-current.profile.json`
- `docs/benchmarks/2026-06-22-finalization-tail-rowid-range-vscode-sparse.profile.json`

Graph-readable status:

- current repository: `313` files, `16054` nodes, `34636` edges;
- VS Code sparse: `5780` files, `327425` nodes, `905484` edges.

RSS:

- current repository RSS unavailable because `/usr/bin/time -l` could not read
  `sysctl kern.clockrate` in the sandbox;
- VS Code sparse RSS unavailable because the targeted CLI profile did not
  enable a process-tree RSS sampler.

## Gate Review

| Gate | Result |
| --- | --- |
| Exactly one mechanics candidate | Passed |
| Semantic target selection unchanged | Passed |
| SQLite schema unchanged | Passed |
| Deterministic parity test | Passed |
| Current repo targeted profile | Passed |
| VS Code sparse targeted profile | Passed |
| Fallback taxonomy recorded | Passed |
| RSS or unavailable reason recorded | Passed |

## Next Route

Proceed to **Plan B: Resolver Semantic Residuals**.

Do not run another Plan A mechanics candidate by default. Plan A produced a
kept cleanup-boundary simplification, but evidence still shows the dominant
remaining work is resolver semantic/finalization behavior, not another isolated
cleanup mechanics tweak.

Plan B should stay within the existing guardrails:

- guarded semantic slices only;
- no broad disambiguation migration;
- no source-order or pick-first shortcut;
- graph parity and fallback taxonomy evidence for production changes.

## 8. 2026-06-22-finalization-tail-rowid-range-evidence.md

# Finalization Tail Rowid-Range Cleanup Evidence

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Candidate selection:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`
- Issues: #416, #417, #418, #419

## Candidate

The implemented candidate changes batched intentionally-unresolved cleanup to
use the existing rowid-range cleanup helper.

This preserves semantic target selection. References are still resolved or
left unresolved by the same TypeScript finalization logic before cleanup runs.
The change only affects how terminal intentionally-unresolved rows are deleted
from `unresolved_refs`.

## Deterministic Test Evidence

Command:

```bash
npx vitest run __tests__/resolution.test.ts -t "batched persistence cleans resolved"
```

Result:

- passed;
- verified resolved refs and intentionally-unresolved refs are both deleted;
- verified resolved cleanup row count remains `505`;
- verified intentionally-unresolved cleanup row count remains `1`;
- verified both terminal cleanup categories use rowid-range deletion instead of
  direct rowid-list deletion.

Additional related checks:

```bash
npx vitest run __tests__/db-perf.test.ts __tests__/access-models.test.ts
npm run build
```

Result:

- passed.

## Current Repository Evidence

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-22-finalization-tail-rowid-range-current.profile.json \
  node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Profile artifact:

- `docs/benchmarks/2026-06-22-finalization-tail-rowid-range-current.profile.json`

Graph status after run:

| Field | Value |
| --- | ---: |
| files | 313 |
| nodes | 16054 |
| edges | 34636 |
| backend | node-sqlite |
| engine | rust-hybrid |

Tail profile:

| Field | Value |
| --- | ---: |
| `typescriptFinalizationMs` | 30323 |
| `referenceResolutionMs` | 28981 |
| `edgeMaterializationMs` | 16 |
| `edgeWriteMs` | 98 |
| `edgeWriteDbMs` | 98 |
| `unresolvedCleanupMs` | 167 |
| `unresolvedCleanupDbMs` | 167 |
| `resolvedCleanupMs` | 103 |
| `resolvedCleanupDbMs` | 103 |
| `resolvedCleanupRowCount` | 13226 |
| `intentionallyUnresolvedCleanupMs` | 64 |
| `intentionallyUnresolvedCleanupDbMs` | 64 |
| `intentionallyUnresolvedCleanupRowCount` | 27350 |

Fallback taxonomy:

| Stage | Reason | Count |
| --- | --- | ---: |
| framework-post-extract | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | typescript-finalization-not-yet-migrated | 1 |
| dynamic-dispatch-synthesis | typescript-finalization-not-yet-migrated | 1 |
| db-maintenance | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | binding-level-symbol-disambiguation-not-yet-rust-owned | 1890 |
| reference-resolution | unsupported-import-form-not-yet-rust-owned | 44 |
| reference-resolution | unresolved-file-level-import-target | 6 |

RSS:

- unavailable reason:
  `/usr/bin/time -l` could not complete RSS reporting in this sandbox:
  `sysctl kern.clockrate: Operation not permitted`.

## VS Code Sparse Evidence

Checkout:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Git commit: `4a6e32fc1f0`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-22-finalization-tail-rowid-range-vscode-sparse.profile.json \
  node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Profile artifact:

- `docs/benchmarks/2026-06-22-finalization-tail-rowid-range-vscode-sparse.profile.json`

Graph status after run:

| Field | Value |
| --- | ---: |
| files | 5780 |
| nodes | 327425 |
| edges | 905484 |
| backend | node-sqlite |
| engine | rust-hybrid |

Tail profile:

| Field | Value |
| --- | ---: |
| `typescriptFinalizationMs` | 308756 |
| `referenceResolutionMs` | 269055 |
| `edgeMaterializationMs` | 444 |
| `edgeWriteMs` | 7281 |
| `edgeWriteDbMs` | 7281 |
| `unresolvedCleanupMs` | 7478 |
| `unresolvedCleanupDbMs` | 7478 |
| `resolvedCleanupMs` | 5146 |
| `resolvedCleanupDbMs` | 5146 |
| `resolvedCleanupRowCount` | 340512 |
| `intentionallyUnresolvedCleanupMs` | 2332 |
| `intentionallyUnresolvedCleanupDbMs` | 2332 |
| `intentionallyUnresolvedCleanupRowCount` | 155983 |

Fallback taxonomy:

| Stage | Reason | Count |
| --- | --- | ---: |
| framework-post-extract | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | typescript-finalization-not-yet-migrated | 1 |
| dynamic-dispatch-synthesis | typescript-finalization-not-yet-migrated | 1 |
| db-maintenance | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | binding-level-symbol-disambiguation-not-yet-rust-owned | 28909 |
| reference-resolution | unsupported-import-form-not-yet-rust-owned | 35 |
| reference-resolution | unresolved-file-level-import-target | 5418 |

RSS:

- unavailable reason:
  targeted CLI profile did not enable a process-tree RSS sampler for this run.
  RSS remains unavailable rather than inferred.

## Read

The implementation is behavior-preserving and makes resolved and
intentionally-unresolved terminal cleanup use the same rowid-range mechanics.

The performance trend is not strong enough to treat this as a major standalone
optimization. On VS Code sparse, intentionally-unresolved cleanup remains a
visible sub-bucket (`2332ms`) but the whole finalization profile is dominated by
reference-resolution candidate lookup and dynamic-dispatch synthesis. The value
of the candidate is primarily boundary simplification and keeping cleanup
mechanics consistent for later finalization-tail migration.

## 9. 2026-06-22-guarded-edge-write-closeout.md

# Guarded Edge-Write Closeout

Date: 2026-06-22

Issue: #445

Roadmap node: `3-13. guarded edge-write slice`

## Decision

Completed for Rust-native TypeScript moduleResolution file-level import edges.

This slice adds a centralized guard before writing file-level `imports` edges
from Rust finalization. The guard is deliberately scoped to moduleResolution
file targets:

- relative imports
- tsconfig `paths`
- conventional aliases
- workspace package imports
- `rootDirs`
- package self-name / package exports
- package imports `#...`

The runtime guard uses Rust-owned taxonomy and target checks only. It does not
depend on the TypeScript compiler oracle or any external parity artifact.

## Behavior

For each moduleResolution file-level target decision, the guard records:

- attempted edge-write decisions
- written edge-write decisions
- skipped edge-write decisions
- skipped reasons

Weak/no-go decisions skip only that edge and continue indexing. They do not
fail the full index.

Currently exposed profile fields:

- `moduleResolutionGuardedEdgeWriteAttemptedRefs`
- `moduleResolutionGuardedEdgeWriteWrittenRefs`
- `moduleResolutionGuardedEdgeWriteSkippedRefs`
- `moduleResolutionGuardedEdgeWriteSkippedCounts`

These are public diagnostic fields in profile artifacts, but they are narrow
diagnostics rather than a long-term stable API commitment.

## Evidence

Deterministic Rust fixture:

- `rust_guarded_file_import_edge_writes_record_write_and_skip_decisions`

The fixture covers:

- successful file-level import edge write
- missing target skip
- file-node-not-found skip
- continued indexing after skipped edges
- public profile diagnostics

Current-repo smoke artifacts:

- `docs/benchmarks/2026-06-22-guarded-edge-write-current.profile.json`
- `docs/benchmarks/2026-06-22-guarded-edge-write-current-oracle.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`

Current-repo profile summary:

- `moduleResolutionGuardedEdgeWriteAttemptedRefs`: 663
- `moduleResolutionGuardedEdgeWriteWrittenRefs`: 662
- `moduleResolutionGuardedEdgeWriteSkippedRefs`: 1
- `moduleResolutionGuardedEdgeWriteSkippedCounts`: `{ "file-node-not-found": 1 }`

Current-repo oracle summary:

- Rows inspected: 336
- Parity statuses: 336 `match`

## Roadmap Update

- `1-7-1. file-level imports edges`: complete
- `3-13. guarded edge-write slice`: complete
- `1-7. Guarded graph writing`: still partial
- `1-7-4. rollback/no-go when parity is weak`: still partial

## Non-Goals

This does not guard every Rust finalization edge type. Explicitly out of scope:

- ESM named symbol edges
- one-hop re-export edges
- local exact callable refs
- all-purpose finalization-edge policy platform
- production dependency on TypeScript compiler oracle parity
- full-index fail-fast on individual moduleResolution no-go decisions

## 10. 2026-06-22-guarded-edge-write-current-oracle.md

# TypeScript Module Resolution Oracle

Generated: 2026-06-22T10:59:34.040Z

## Source

- Project: `.`
- Profile: `docs/benchmarks/2026-06-22-guarded-edge-write-current.profile.json`
- Data source: `rustCore.moduleResolutionShadowSamples`
- tsconfig/jsconfig: `tsconfig.json`
- Production runtime behavior changed: false
- TypeScript runtime dependency added: false
- Source content included: false

## Summary

- Rows inspected: 336
- Recommended total slice count: 5

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-paths-alias` | 36 |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-resolves-third-party-boundary` | 100 |
| `ts-runtime-builtin-boundary` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 336 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- paths/rootDirs parity slice + oracle taxonomy correction
- third-party package boundary taxonomy
- Node/runtime builtin boundary taxonomy

## Examples

| Delta | Parity | Specifier | TS kind | TS path | File |
| --- | --- | --- | --- | --- | --- |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:0` |
| `ts-runtime-builtin-boundary` | `match` | `fs` | `node-runtime-builtin` |  | `__tests__/access-models.test.ts:0` |
| `ts-runtime-builtin-boundary` | `match` | `path` | `node-runtime-builtin` |  | `__tests__/access-models.test.ts:0` |
| `ts-runtime-builtin-boundary` | `match` | `os` | `node-runtime-builtin` |  | `__tests__/access-models.test.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../src/db` | `repo-local-source` | `src/db/index.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../src/db` | `repo-local-source` | `src/db/index.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../src/db/queries` | `repo-local-source` | `src/db/queries.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../src/db/queries` | `repo-local-source` | `src/db/queries.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../src/db/access-models` | `repo-local-source` | `src/db/access-models.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:0` |
