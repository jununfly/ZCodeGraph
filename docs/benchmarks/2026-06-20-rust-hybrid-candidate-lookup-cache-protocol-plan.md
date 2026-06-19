# Rust-Hybrid Candidate Lookup/Cache Protocol Plan

Date: 2026-06-20

Issue: #299

Parent plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`

Related:

- #296 resolver migration decision plan
- #297 current-state architecture map
- #298 ownership classification
- #300 resolver migration decision closeout
- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`

## Decision

Define the first resolver-migration implementation slice as an **in-process
TypeScript candidate lookup/cache protocol boundary**.

This first slice should stabilize candidate facts, lookup shapes, diagnostics,
and equivalence tests before introducing a Rust producer. It must not migrate
or alter every-reference disambiguation decisions.

The first slice is a protocol boundary, not a Rust subprocess migration.

## Why In-Process First

The immediate goal is to move candidate lookup/cache from an internal
TypeScript resolver detail into a stable boundary that can be tested, profiled,
and later backed by Rust.

Starting in-process avoids mixing the protocol decision with:

- Rust subprocess serialization;
- Rust data-model drift;
- cache lifetime across process boundaries;
- mixed Rust-owned and TypeScript fallback graph consistency;
- premature migration of disambiguation semantics.

The in-process protocol must still be shaped as a future Rust-producer
contract.

## Candidate Fact Shape

The protocol should expose stable graph facts that the existing TypeScript
disambiguation logic can consume.

Minimum candidate fact:

- `nodeId`
- `name`
- `qualifiedName`
- `kind`
- `filePath`
- `language`
- `line`
- `column`
- `parentId` or owner identifier when available
- exported/imported signal when already available from graph facts
- `source` / provenance such as `graph-db`, `protocol-cache`, or later
  `rust-produced`

The candidate fact must not include:

- final confidence;
- `resolvedBy`;
- rank score;
- selected target;
- framework-specific synthetic decision;
- dynamic-dispatch result.

Those fields belong to disambiguation or synthesis, not candidate availability.

## Lookup Shapes

First-slice lookup support is limited to DB-backed candidate access that the
current resolver already performs.

Supported shapes:

1. `ExactName`
   - key: `{ name, languageFamily? }`
   - maps to exact-name candidate access.
2. `LowerName`
   - key: `{ lowerName, languageFamily? }`
   - maps to case-insensitive candidate access.
3. `QualifiedName`
   - key: `{ qualifiedName, languageFamily? }`
   - maps to exact qualified-name candidate access.
4. `FileNodes`
   - key: `{ filePath }`
   - maps to nodes in one file.
5. `KnownNamePresence`
   - key: `{ name }`
   - maps to known-name prefilter availability.

Out of first-slice scope:

- scope tree lookup;
- package resolution lookup;
- framework lookup;
- dynamic-dispatch lookup;
- import/re-export chain lookup.

These are resolver semantics, not candidate cache protocol v1.

## Unified Graph Boundary

Candidate materialization must happen after:

1. Rust core graph writes complete.
2. TypeScript fallback append completes.
3. Before TypeScript reference resolution starts.

The cache must be built over the unified SQLite graph, not only Rust-owned
files.

Rules:

- lookup keys must not filter by "Rust-owned file" or "TypeScript fallback
  file";
- candidate facts may carry provenance for diagnostics;
- provenance must not change disambiguation;
- if TypeScript fallback append fails, candidate protocol does not run and the
  existing failure path remains authoritative.

This keeps mixed-graph references valid in both directions: Rust-owned files can
reference fallback files and fallback files can reference Rust-owned files.

## Diagnostics

Diagnostics are public profile artifact fields only. They do not promise a
long-term stable API.

Add a `candidateProtocol` section with:

- `enabled`
- `materializationMs`
- `lookupMs`
- `lookupCount`
- `cacheHitCount`
- `cacheMissCount`
- `dbLookupCount`
- `candidateCount`
- `lookupShapeCounts`
- `lookupShapeMs`
- `equivalenceComparedCount`
- `equivalenceMismatchCount`
- `fallbackReasons`
- `disabledReason`

Compare these with existing finalization fields:

- `candidateLookupMs`
- `candidateLookupCacheHitMs`
- `nameMatcherCandidateLookupDbMs`
- `perReferenceDisambiguationMs`
- `databaseAccessMs`
- `refHydrationDbMs`

Do not expose:

- every candidate list in the profile;
- every reference's source slice;
- long-term stable protocol schema promises;
- agent-facing MCP output.

## Candidate Equivalence

Equivalence should use double-read comparison, not double-decision comparison.

Baseline:

- current resolver context reads candidates through existing DB/cache access.

Protocol:

- candidate protocol reads candidates through the materialized/cache boundary.

For the same lookup shape and key, compare candidate availability:

- candidate node id set;
- candidate count;
- lookup existence;
- empty candidate set behavior.

Order is not a semantic requirement unless the existing disambiguation logic is
shown to depend on order. If order is relevant, the implementation issue must
document and preserve that dependency explicitly.

Do not compare final resolved target in this first slice. Final target
selection remains the TypeScript disambiguation decision.

Mismatch samples should be capped so profile artifacts do not explode.

Required deterministic fixtures:

- same-name multiple candidates;
- lower-name lookup;
- qualified-name lookup;
- file nodes lookup;
- mixed Rust-owned and TypeScript fallback graph;
- missing name / empty candidate set.

## No-Go Criteria

Candidate lookup/cache protocol should stop as the first migration path if any
of these happen:

- deterministic candidate equivalence cannot pass consistently;
- the unified graph after fallback append cannot provide a stable cache
  boundary;
- profile output cannot distinguish candidate protocol cost from
  disambiguation cost;
- the protocol increases wall-clock or RSS without improving diagnostic
  clarity;
- VS Code sparse targeted profile shows no useful movement in
  `candidateLookupMs`, `nameMatcherCandidateLookupDbMs`, or
  `databaseAccessMs`;
- mismatch taxonomy shows the real problem is scope, package, framework, or
  dynamic-dispatch semantics rather than candidate lookup/cache;
- meaningful benefit requires changing every-reference disambiguation
  semantics.

Fallback paths after no-go:

1. cleanup / edge-write / DB maintenance slice;
2. import/export tail slice;
3. local exact references slice;
4. broad disambiguation migration plan only when evidence points there.

## Implementation Acceptance Criteria

The future implementation issue for this slice should require:

- deterministic candidate-equivalence tests;
- graphStats comparison;
- fallback taxonomy comparison;
- before/after profile artifact;
- VS Code sparse targeted profile;
- RSS or unavailable reason;
- no agent A/B by default because disambiguation semantics should not change.

Agent A/B becomes required only if a later implementation changes graph
semantics, language coverage, or user-facing sufficiency claims.

## Input To #300

#300 should close out #296 by recording:

- #297 current-state map is complete;
- #298 ownership classification is complete;
- #299 first-slice protocol plan is complete;
- next implementation issues should start with candidate lookup/cache protocol;
- disambiguation, framework post-extract, and dynamic-dispatch synthesis remain
  outside the first implementation slice.

