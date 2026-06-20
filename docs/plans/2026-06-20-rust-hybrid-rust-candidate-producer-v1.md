# Rust-hybrid Rust candidate producer v1

Date: 2026-06-20

Parent context:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-protocol-closeout-decision.md`
- #295 architecture/performance PRD
- #296 resolver migration decision plan
- #302-#306 candidate lookup/cache protocol implementation slice

## Decision

Implement the next resolver-migration slice as **Rust candidate producer v1**
covering only:

- `ExactName`
- `KnownNamePresence`

The producer must run in **shadow / double-read mode only**. It must not feed
the resolver main path, change candidate availability used for final
resolution, or alter any every-reference disambiguation semantics.

## Why This Slice

The previous candidate protocol slice established a TypeScript in-process
boundary and validated candidate availability at scale:

- current ZCodeGraph repo: 74,240 comparisons, 0 mismatches;
- VS Code sparse checkout: 1,609,764 comparisons, 0 mismatches.

That proves the TypeScript-side protocol boundary is stable enough to support
the next question:

> Can Rust produce high-volume candidate facts for the simplest lookup shapes
> without drifting from the TypeScript baseline?

`ExactName` and `KnownNamePresence` are the right first Rust producer shapes
because they dominate lookup volume and have the least semantic ambiguity:

- VS Code sparse `ExactName`: 760,610 lookups;
- VS Code sparse `KnownNamePresence`: 747,544 lookups.

This gives a meaningful Rust-ownership signal without crossing into ranking,
confidence, import semantics, framework synthesis, or dynamic dispatch.

## Scope

### In Scope

- Define a narrow Rust candidate producer protocol for `ExactName` and
  `KnownNamePresence`.
- Produce Rust candidate ids or facts for exact-name lookup from the unified
  SQLite graph.
- Produce Rust known-name presence answers from the unified SQLite graph.
- Compare Rust producer output against the TypeScript candidate protocol
  baseline in shadow mode.
- Add mismatch taxonomy and bounded samples for producer drift.
- Expose producer diagnostics in rust-hybrid profile artifacts.
- Run deterministic fixture coverage and targeted current-repo / VS Code sparse
  profile evidence.
- Close out with keep / no-go / prerequisite.

### Out of Scope

- Routing Rust producer output into final resolver decisions.
- Migrating `matchReference`.
- Changing final target selection.
- Changing confidence, ranking, `resolvedBy`, language gates, framework
  decisions, or dynamic-dispatch synthesis.
- Supporting `LowerName`, `QualifiedName`, or `FileNodes`.
- Adding package resolution, framework lookup, scope tree lookup, import chain
  semantics, default import semantics, namespace import semantics, or type-only
  semantics.
- Agent A/B.
- README or user-facing performance claims.

## Protocol Boundary

The producer reads or receives enough data to answer two lookup shapes over the
unified graph after:

1. Rust core graph write.
2. TypeScript fallback append.
3. Before or during TypeScript finalization reference resolution.

The protocol must preserve mixed graph behavior:

- Rust-owned files may reference TypeScript fallback files.
- TypeScript fallback files may reference Rust-owned files.
- Lookup output must not filter by indexing engine ownership.

The TypeScript resolver remains the final consumer and final disambiguation
owner. Rust producer output is compared, measured, and recorded only.

## Diagnostics

Add a profile artifact section for the Rust candidate producer. Suggested
fields:

- `enabled`
- `shadowMode`
- `producerMs`
- `serializationMs`
- `lookupCount`
- `lookupShapeCounts`
- `comparedCount`
- `mismatchCount`
- `mismatchReasons`
- `mismatchSamples`
- `candidateCount`
- `payloadBytes`
- `disabledReason`

Diagnostics are profile artifact fields only. They are not MCP output and do
not promise a long-term stable public API.

## Equivalence Rules

Equivalence compares candidate availability, not final resolver decisions.

For `ExactName`, compare:

- candidate node id set;
- candidate count;
- empty candidate set behavior.

For `KnownNamePresence`, compare:

- present vs absent;
- missing-name behavior;
- empty graph behavior if applicable.

Ordering is not semantic unless implementation evidence shows the current
resolver depends on it. If ordering turns out to matter, document it and do
not route producer output into the main path in this slice.

Mismatch samples must be capped.

## Acceptance Evidence

Required:

- deterministic fixture tests for `ExactName` present / multiple candidates /
  missing;
- deterministic fixture tests for `KnownNamePresence` present / missing;
- mixed Rust-owned + TypeScript fallback fixture;
- public graph guard showing graphStats and resolved edge shape do not drift
  because Rust producer output is not used for final resolution;
- profile artifact diagnostics test;
- current-repo targeted profile;
- VS Code sparse targeted profile using `/private/tmp/codegraph-corpus/vscode-sparse`;
- RSS or unavailable reason;
- fallback taxonomy comparison.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark the evidence
  as needs human setup.
- Do not clone a replacement corpus automatically.

## No-Go Criteria

Stop this direction or mark it prerequisite if:

- deterministic fixture equivalence is not stable;
- VS Code sparse shows producer mismatches;
- mismatch taxonomy points to path normalization, DB schema gaps, fallback
  append timing, or candidate fact shape gaps that must be solved first;
- implementing producer parity requires changing disambiguation semantics;
- producer diagnostics cannot be separated from existing candidate protocol
  timing;
- the only way to make it useful is to route Rust output into final decisions
  before shadow equivalence is clean.

## Issue Sequence

1. Define Rust candidate producer protocol for `ExactName` and
   `KnownNamePresence`.
2. Implement Rust shadow producer for `ExactName`.
3. Implement Rust shadow producer for `KnownNamePresence`.
4. Expose Rust producer diagnostics in rust-hybrid profiles.
5. Run targeted evidence and close out the producer decision.

The sequence is intentionally narrow. It is the first Rust producer step toward
Rust-owned finalization/reference-resolution, not the migration of
disambiguation itself.
