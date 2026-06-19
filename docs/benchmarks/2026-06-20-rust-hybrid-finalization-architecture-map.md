# Rust-Hybrid Finalization / Reference Resolution Architecture Map

Date: 2026-06-20

Issue: #297

Parent plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`

Related trackers:

- #296 resolver migration decision plan
- #295 architecture/performance PRD
- #165 post-release optimization tracker
- #224 parse/extraction diagnostic track

Architecture record:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`

## Purpose

This artifact maps the current TypeScript-owned finalization/reference
resolution tail in the `rust-hybrid` full-index path.

It is intentionally a current-state map, not an implementation proposal. Its
job is to make the existing pipeline, profile buckets, suspected repeated
hydration/lookup costs, and diagnostic gaps visible enough for the next
ownership-classification decision.

## Current End-To-End Pipeline

The current `rust-hybrid` full-index path is:

```text
CLI / SDK
  -> TypeScript product shell
  -> external Rust core indexer
       source scan
       parse/extraction
       Rust-owned graph writes
       Rust-owned import/path/local resolution slices
  -> reopen TypeScript CodeGraph instance
  -> TypeScript fallback append
       TypeScript indexes fallback files into the same graph
       finalization is deliberately not run yet
  -> TypeScript finalization
       framework post-extract
       reference resolution
       dynamic-dispatch synthesis
       database maintenance
       rust-hybrid metadata/profile/status fields
  -> active index consumed by CLI/MCP/SDK
```

The important boundary is after Rust core writes and TypeScript fallback append.
At that point the TypeScript shell reopens the graph and still owns the
finalization tail.

## Current TypeScript-Owned Responsibilities

### Product Shell Orchestration

The TypeScript shell owns the full-index lifecycle around Rust:

- close the active database before invoking the external Rust core;
- invoke the Rust indexer;
- reopen the database through the TypeScript `CodeGraph` API;
- plan and append TypeScript fallback files for `rust-hybrid`;
- run finalization once over the unified graph;
- stamp rust-hybrid metadata;
- combine Rust, fallback, and finalization profile fields.

This is product-shell work and is not the immediate resolver migration target.

### TypeScript Fallback Append

`rust-hybrid` fallback append indexes selected fallback files through the
existing TypeScript extraction path. It intentionally does not clear Rust-owned
data and does not run finalization. Finalization runs once after Rust and
fallback writes both complete.

Profile surface:

- `typescriptFallbackAppend.durationMs`
- `typescriptFallbackAppend.fallbackFileCount`
- `typescriptFallbackAppend.errorTaxonomy`

### Framework Post-Extract

Finalization begins by initializing the resolver and running framework
post-extract hooks. Framework post-extract can update nodes after extraction,
then clears resolver caches so downstream resolution sees fresh graph state.

Profile surface:

- `finalize.frameworkPostExtractMs`

Migration note:

Framework post-extract is coupled to framework-specific semantics and should
not be folded into the first candidate lookup/cache slice.

### Reference Resolution

Reference resolution is still TypeScript-owned for the broad pass. It reads
unresolved references in batches, warms lightweight caches, hydrates references
into resolver-local shapes, resolves each reference, writes edges, deletes
processed unresolved rows, and records detailed timings.

Resolution order for each reference:

1. built-in / external skip;
2. known-name prefilter;
3. import-shape escape for re-export/import cases;
4. framework claims check;
5. JVM import direct resolution;
6. Razor using resolution;
7. framework resolver attempts;
8. import-based resolution;
9. guarded name matcher;
10. highest-confidence candidate selection.

Profile surface:

- `finalize.referenceResolutionMs`
- `finalize.referenceResolutionBreakdown.importResolutionMs`
- `finalize.referenceResolutionBreakdown.nameMatchingMs`
- `finalize.referenceResolutionBreakdown.frameworkMatchingMs`
- `finalize.referenceResolutionBreakdown.databaseAccessMs`
- `finalize.referenceResolutionBreakdown.cacheWarmupDbMs`
- `finalize.referenceResolutionBreakdown.refHydrationDbMs`
- `finalize.referenceResolutionBreakdown.unresolvedReadDbMs`
- `finalize.referenceResolutionBreakdown.candidateLookupMs`
- `finalize.referenceResolutionBreakdown.sharedCandidateLookupMs`
- `finalize.referenceResolutionBreakdown.candidateLookupCacheHitMs`
- `finalize.referenceResolutionBreakdown.nameMatcherCandidateLookupDbMs`
- `finalize.referenceResolutionBreakdown.perReferenceDisambiguationMs`
- `finalize.referenceResolutionBreakdown.edgeMaterializationDbMs`
- `finalize.referenceResolutionBreakdown.edgeWriteDbMs`
- `finalize.referenceResolutionBreakdown.unresolvedCleanupDbMs`

### Candidate Lookup And Cache

The resolver currently uses several TypeScript-side bounded caches:

- file-to-nodes cache;
- exact-name cache;
- lower-name cache;
- qualified-name cache;
- import mapping cache;
- re-export cache;
- known file path set;
- known symbol name set.

The resolver also prewarms grouped name-matching candidates when the same
`referenceName/referenceKind/language` group appears more than once.

Candidate lookup diagnostics already exist, but the cache is still internal to
the TypeScript resolver and is not a narrow TS/Rust protocol. Candidate facts
are not yet a durable Rust-owned or protocol-owned boundary.

This is the most relevant current surface for the planned first migration
slice.

### Guarded Rust Name Matcher And Replay Diagnostics

The resolver has existing Rust matcher and candidate replay diagnostics, but
they are used under the TypeScript resolver's control. The TypeScript pass can:

- collect references eligible for Rust name-matcher evaluation;
- run a Rust name-matcher batch;
- verify the Rust result against the TypeScript decision;
- record semantic mismatches and fallback reasons;
- compare candidate replay output when enabled.

Profile surface:

- `rustMatcherMs`
- `rustMatcherStartupMs`
- `rustMatcherSerializationMs`
- `rustMatcherCandidateMaterializationMs`
- `rustMatcherSubprocessMs`
- `rustMatcherTsVerificationMs`
- `rustMatcherEligibleRefs`
- `rustMatcherHandledRefs`
- `rustMatcherFallbackRefs`
- `rustMatcherSemanticMismatchRefs`
- `candidateReplayEligibleRefs`
- `candidateReplayComparedRefs`
- `candidateReplayEquivalentRefs`
- `candidateReplayMismatchRefs`

Migration note:

These fields are useful precedent for parity/replay evidence. They do not mean
disambiguation execution is already migrated.

### Edge Materialization / Edge Write

Resolved references are materialized into graph edges after disambiguation.
This step re-checks endpoint node kinds in bulk and then writes validated edges
inside a transaction.

Profile surface:

- `edgeMaterializationMs`
- `edgeMaterializationDbMs`
- `edgeWriteMs`
- `edgeWriteDbMs`

### Unresolved Cleanup

The batched resolver deletes both resolved and intentionally-unresolved refs
after each batch so subsequent offset-zero batch reads make progress and the
pass cannot loop forever on the same rows.

Profile surface:

- `unresolvedCleanupMs`
- `unresolvedCleanupDbMs`

### Dynamic-Dispatch Synthesis

After batched reference resolution persists base edges, the resolver runs
dynamic-dispatch synthesis best-effort. It is additive and ignored on failure.

Profile surface:

- `dynamicDispatchSynthesisMs`

Migration note:

This is high sufficiency risk. Partial dynamic-dispatch coverage can be worse
than no coverage, so it should stay out of the first candidate lookup/cache
slice.

### Database Maintenance

After reference resolution, the TypeScript finalization path runs database
maintenance.

Profile surface:

- `dbMaintenanceMs`

## Rust-Owned Work Already Visible At The Boundary

The finalization profile reports a `boundaryProtocol` object with:

- `version`;
- `productShell: "typescript"`;
- `rustOwnedStages`.

The Rust-owned stage list always includes:

- `source-scan`;
- `parse-extraction`;
- `graph-write`.

It can also include Rust-owned reference-resolution slices when the graph shows
those edges:

- `import-path-alias-resolution`;
- `esm-named-import-export-resolution`;
- `esm-one-hop-reexport-resolution`;
- `local-exact-reference-resolution`.

This means the current code already recognizes a staged migration boundary.
However, broad TypeScript finalization/reference resolution still runs after
those Rust-owned slices.

## Existing Evidence

No new large-corpus profile was run for this map. The current evidence is
enough for the mapping task.

### Rust Core Write Optimization

Artifact:

`docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after.md`

VS Code sparse after-profile highlights:

| Bucket | After |
| --- | ---: |
| `typescriptFinalizationMs` | 126,161ms |
| `referenceResolutionMs` | 108,595ms |
| `nameMatchingMs` | 52,131ms |
| `databaseAccessMs` | 43,324ms |
| `edgeWriteDbMs` | 21,408ms |
| `unresolvedCleanupDbMs` | 18,382ms |
| `dynamicDispatchSynthesisMs` | 14,475ms |

Interpretation:

The Rust SQLite write optimization moved the Rust write bucket strongly, but
the TypeScript finalization tail stayed essentially flat. That supports
treating finalization/reference resolution as a separate bottleneck.

### Parser Reuse Optimization

Artifact:

`docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after.md`

VS Code sparse after-profile highlights:

| Bucket | After |
| --- | ---: |
| `typescriptFinalizationMs` | 122,274ms |
| `referenceResolutionMs` | 104,426ms |
| `nameMatchingMs` | 50,606ms |
| `databaseAccessMs` | 41,213ms |
| `perReferenceDisambiguationMs` | 45,806ms |
| `edgeWriteDbMs` | 20,504ms |
| `unresolvedCleanupDbMs` | 17,201ms |
| `dynamicDispatchSynthesisMs` | 14,696ms |

Interpretation:

The finalization tail remains the largest visible end-to-end blocker. Both
database access and per-reference disambiguation are large enough that the next
decision should not assume all cost is DB lookup or all cost is ranking logic.

## Suspected Repeated Hydration / Lookup Costs

The table below separates facts from hypotheses.

| Suspect | Evidence strength | Why it matters |
| --- | --- | --- |
| Unresolved ref batch reads and hydration | Strong that it exists; unknown optimization value | Batched resolution reads unresolved refs from DB, maps them into resolver-local objects, and records `unresolvedReadDbMs` / `refHydrationDbMs`. |
| Name candidate lookup through DB-backed caches | Strong that it exists; medium as first-slice candidate | Name, lower-name, qualified-name, and file-node lookups use SQLite queries behind TypeScript caches and are measured by `candidateLookupMs`, `candidateLookupCacheHitMs`, and `nameMatcherCandidateLookupDbMs`. |
| Repeated same-name candidate lookup | Medium | The resolver already has grouped prewarming for repeated `referenceName/referenceKind/language`, which indicates this pattern was important enough to optimize locally. |
| Per-reference disambiguation cost | Strong that it is large; not safely movable in first slice | VS Code sparse shows `perReferenceDisambiguationMs` around 45.8s in the v2 after-profile. Moving this changes semantics unless parity work exists first. |
| Edge materialization/write DB work | Strong that it exists; not first-slice target | `edgeWriteDbMs` remains visible, but this is downstream of disambiguation and is less directly tied to candidate lookup/cache protocol. |
| Unresolved cleanup DB work | Strong that it exists; not first-slice target | `unresolvedCleanupDbMs` remains visible, but it is cleanup/maintenance rather than candidate lookup. |
| Dynamic-dispatch synthesis | Strong that it exists; high sufficiency risk | `dynamicDispatchSynthesisMs` is visible, but partial migration can regress agent sufficiency. |

## Diagnostic Gaps For The Next Slice

The current profile is useful, but the candidate lookup/cache protocol needs
more specific implementation evidence:

- count of candidate lookup calls by lookup shape;
- cache hit/miss counts by lookup shape;
- candidate set size distribution;
- hydration time separated from ranking/disambiguation time;
- explicit relation between candidate cache movement and `databaseAccessMs`;
- equivalence evidence that candidate availability did not change;
- graphStats and fallback taxonomy before/after.

The current fields already point in this direction, especially
`candidateLookupMs`, `candidateLookupCacheHitMs`,
`nameMatcherCandidateLookupDbMs`, and `perReferenceDisambiguationMs`, but they
do not yet define a durable TS/Rust protocol boundary.

## Guardrail

This mapping slice does not change production behavior and does not recommend a
semantic shortcut.

Every-reference disambiguation semantics must remain unchanged for the first
candidate lookup/cache slice. The first slice may change how candidate sets are
collected, cached, measured, or transported. It must not change how the final
target is selected for a reference.

## Input To #298

The next ownership-classification discussion should start from this split:

| Domain | Current owner | First-slice suitability |
| --- | --- | --- |
| Product shell orchestration | TypeScript | Keep TypeScript-owned |
| TypeScript fallback append | TypeScript | Keep TypeScript-owned |
| Framework post-extract | TypeScript | Not first slice |
| Candidate lookup/cache | TypeScript internal caches | Best first migration slice |
| Disambiguation decision | TypeScript | Do not move in first slice |
| Import/export resolution tail | Mixed Rust-owned slices + TypeScript broad pass | Later slice |
| Local exact references | Mixed Rust-owned slice + TypeScript broad pass | Later slice |
| Edge materialization/write | TypeScript | Later or fallback slice |
| Unresolved cleanup | TypeScript | Later or fallback slice |
| Dynamic-dispatch synthesis | TypeScript | Later high-risk slice |
| Diagnostics/profile/status contract | Mixed | Cross-cutting requirement |
