# Rust-Hybrid Tail Diagnostic Bucket Contract

Date: 2026-06-25

Roadmap node: `1-8-2. Candidate selection and bounded optimization routing`

Issue: #552

Status: active for the next `1-8-3` execution slice

## Purpose

Define the diagnostic fields needed before choosing a bounded optimization
target for the `rust-hybrid` TypeScript finalization / reference-resolution
tail.

This contract is diagnostic-only. It does not authorize resolver, indexer,
database write, extractor, graph semantics, or fallback behavior changes.

## Inputs

- `docs/plans/2026-06-25-rust-hybrid-first-user-performance-candidate-routing-plan.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-result.json`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-closeout-decision.md`
- `docs/benchmarks/baseline-indexing-performance-v1.md`
- `docs/benchmarks/graph-semantics-guardrail-v1.md`
- `docs/benchmarks/baseline-agent-sufficiency-v1.md`

## Existing Durable Fields

These fields already exist in profile artifacts and must remain available:

- `typescriptFinalizationMs`
- `rustCore.sourceScanMs`
- `rustCore.parseExtractionMs`
- `rustCore.sqliteWriteMs`
- `rustCore.subprocessStartupHandoffMs`
- `finalize.frameworkPostExtractMs`
- `finalize.referenceResolutionMs`
- `finalize.dynamicDispatchSynthesisMs`
- `finalize.dbMaintenanceMs`
- `finalize.referenceResolutionBreakdown.importResolutionMs`
- `finalize.referenceResolutionBreakdown.nameMatchingMs`
- `finalize.referenceResolutionBreakdown.frameworkMatchingMs`
- `finalize.referenceResolutionBreakdown.databaseAccessMs`
- `finalize.referenceResolutionBreakdown.edgeWriteMs`
- `finalize.referenceResolutionBreakdown.unresolvedCleanupMs`
- `finalize.referenceResolutionBreakdown.resolvedCleanupMs`
- `finalize.fallbackTaxonomy`

The first-user baseline runner summary currently keeps a smaller subset of the
full profile. That is acceptable for baseline summaries, but `1-8-3` needs
additional tail fields to choose a bounded candidate without guessing.

## Required Tail Diagnostic Groups

### TypeScript finalization tail

Keep the existing high-level `typescriptFinalizationMs` field and report its
observable contributors:

- `finalize.frameworkPostExtractMs`
- `finalize.referenceResolutionMs`
- `finalize.dynamicDispatchSynthesisMs`
- `finalize.dbMaintenanceMs`

Interpretation rule:

- if `typescriptFinalizationMs` remains the largest bucket, route by the largest
  contributor inside `finalize`;
- if `finalize.referenceResolutionMs` is the dominant contributor, use the
  reference-resolution diagnostic groups below;
- if the sum of observable contributors does not explain the high-level
  `typescriptFinalizationMs`, classify the result as `diagnostic-gap` before
  selecting an optimization target.

### Reference-resolution lookup/cache

Report fields that explain candidate lookup, cache behavior, and TypeScript
verification work:

- `candidateLookupMs`
- `sharedCandidateLookupMs`
- `candidateLookupCacheHitMs`
- `nameMatcherCandidateLookupDbMs`
- `perReferenceDisambiguationMs`
- `candidateProtocol.lookupMs`
- `candidateProtocol.materializationMs`
- `candidateProtocol.lookupCount`
- `candidateProtocol.cacheHitCount`
- `candidateProtocol.cacheMissCount`
- `candidateProtocol.dbLookupCount`
- `candidateProtocol.lookupShapeCounts`
- `candidateProtocol.lookupShapeMs`
- `candidateProtocol.fileNodesLookup`
- `candidateProtocol.rustCandidateProducer.routing` when available

Interpretation rule:

- candidate lookup/cache is eligible for bounded optimization only when these
  fields show a material contribution and graph semantics remain unchanged;
- if candidate protocol is disabled or unavailable, record the disabled reason
  instead of silently omitting the group.

### Reference-resolution database and hydration

Report fields that explain DB access and unresolved-reference hydration:

- `databaseAccessMs`
- `cacheWarmupDbMs`
- `refHydrationDbMs`
- `unresolvedReadDbMs`
- `edgeMaterializationDbMs`
- `edgeEndpointValidationDbMs`

Interpretation rule:

- DB access/hydration is eligible for bounded optimization when it is a material
  contributor and can be changed without altering resolved targets or fallback
  taxonomy;
- if DB access is smaller than semantic disambiguation or cleanup work, do not
  route the first bounded optimization here.

### Edge write and cleanup

Report fields that explain graph writes and cleanup:

- `edgeMaterializationMs`
- `edgeWriteMs`
- `edgeWriteDbMs`
- `edgeInsertCount`
- `edgeInsertSerializationMs`
- `edgeInsertSerializedBytes`
- `unresolvedCleanupMs`
- `unresolvedCleanupDbMs`
- `resolvedCleanupMs`
- `resolvedCleanupDbMs`
- `resolvedCleanupRowCount`
- `intentionallyUnresolvedCleanupMs`
- `intentionallyUnresolvedCleanupDbMs`
- `intentionallyUnresolvedCleanupRowCount`
- `cleanupOwnership`
- `guardedEdgeWrite`
- `moduleEdgeWrite`

Interpretation rule:

- edge write or cleanup is eligible for bounded optimization only if graphStats
  and fallback taxonomy are stable or changed in an expected, explained way;
- cleanup must not hide unsupported or intentionally unresolved taxonomy.

### Semantic replay / matcher safety

Report fields that explain whether a candidate route can safely stay
graph-invisible:

- `semanticReplay`
- `candidateReplayEligibleRefs`
- `candidateReplayComparedRefs`
- `candidateReplayEquivalentRefs`
- `candidateReplayMismatchRefs`
- `candidateReplayMismatchReasons`
- `rustMatcherEligibleRefs`
- `rustMatcherHandledRefs`
- `rustMatcherFallbackRefs`
- `rustMatcherSemanticMismatchRefs`
- `rustMatcherFallbackReasons`

Interpretation rule:

- if semantic replay or matcher mismatch evidence is unavailable for a
  semantics-touching candidate, the candidate must route to Agent Sufficiency
  guardrails before it can be kept;
- if the candidate is graph-invisible, state why semantic replay is not
  triggered.

## Durable vs Issue-Scoped Evidence

Durable profile diagnostics:

- high-level phase buckets;
- reference-resolution timing sub-buckets;
- candidate protocol counters and shape summaries;
- guarded/module edge-write diagnostics;
- cleanup ownership diagnostics;
- fallback taxonomy.

Issue-scoped evidence:

- raw profile JSON snapshots from a single local experiment;
- stdout/stderr tails;
- temporary corpus setup notes;
- benchmark runner debug logs;
- intermediate A/B tables that do not become the final result or decision.

Checked-in temporary evidence must use a `tmp-` prefix. Durable result or
decision artifacts belong in `docs/benchmarks/`.

## Guardrails For Later Runs

`1-8-3` must record:

- wall time;
- RSS or an explicit unavailable reason;
- graphStats and classification;
- fallback taxonomy and classification;
- profile bucket movement;
- whether Agent Sufficiency is triggered.

Agent Sufficiency is not required for pure diagnostic/profile-field changes. It
is required if the candidate changes graph semantics, resolver/finalization
behavior, Explore output, MCP output, language/framework extraction, or a
user-facing sufficiency claim.

## No-Go Conditions

Do not select a bounded optimization candidate when:

- the dominant bucket remains too coarse to explain;
- required graphStats or fallback taxonomy evidence is unavailable;
- RSS is missing without an unavailable reason;
- the candidate requires graph semantics changes but lacks sufficiency
  guardrails;
- the candidate would mix unrelated optimization directions in one issue.

## Decision

The first `1-8-3` execution entrypoint should implement or expose this
diagnostic contract narrowly, then rerun the targeted current-repo baseline.
Only after that rerun should the project choose a concrete bounded optimization
candidate.
