# Rust-hybrid Rust candidate producer LowerName

Date: 2026-06-20

Parent context:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-protocol-closeout-decision.md`
- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-v1.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-closeout-decision.md`
- #295 architecture/performance PRD
- #296 resolver migration decision plan
- #307-#311 Rust candidate producer v1 implementation slice

## Decision

Implement the next resolver-migration slice as **Rust candidate producer
LowerName** covering only:

- `LowerName`

The producer must run in **shadow / double-read mode only**. It must not feed
the resolver main path, change candidate availability used for final
resolution, or alter any every-reference disambiguation semantics.

## Why This Slice

Rust candidate producer v1 validated that Rust can produce `ExactName` and
`KnownNamePresence` facts without drifting from the TypeScript baseline:

- current ZCodeGraph repo: 5,085 producer lookups compared, 0 mismatches;
- VS Code sparse checkout: 135,601 producer lookups compared, 0 mismatches.

`LowerName` is the next useful candidate availability shape because it is still
lookup-oriented, not semantic disambiguation. It exercises case-folding and
normalization behavior that exact-name lookup does not cover, while avoiding
the heavier unresolved questions in `QualifiedName`, `FileNodes`, import-chain
resolution, framework synthesis, and final target ranking.

This slice should answer:

> Can Rust produce lower-name candidate facts from the unified graph with the
> same observable availability as the TypeScript resolver baseline?

## Scope

### In Scope

- Extend the Rust candidate producer protocol with a `LowerName` lookup shape.
- Produce Rust candidate ids for lower-name lookup from the unified SQLite
  graph.
- Match TypeScript `getNodesByLowerName` semantics, including multiple
  candidates and empty candidate behavior.
- Compare Rust producer output against the TypeScript candidate protocol
  baseline in shadow mode.
- Add or extend mismatch taxonomy for lower-name drift.
- Expose `LowerName` diagnostics separately from `ExactName` and
  `KnownNamePresence` in rust-hybrid profile artifacts.
- Run deterministic fixture coverage and targeted current-repo / VS Code sparse
  profile evidence.
- Close out with keep / no-go / prerequisite.

### Out of Scope

- Routing Rust producer output into final resolver decisions.
- Migrating `matchReference`.
- Changing final target selection.
- Changing confidence, ranking, `resolvedBy`, language gates, framework
  decisions, or dynamic-dispatch synthesis.
- Supporting `QualifiedName` or `FileNodes`.
- Adding package resolution, framework lookup, scope tree lookup, import chain
  semantics, default import semantics, namespace import semantics, re-export
  semantics, or type-only semantics.
- Agent A/B.
- README or user-facing performance claims.

## Protocol Boundary

The producer reads or receives enough data to answer lower-name lookup over the
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

Extend the existing Rust candidate producer profile artifact diagnostics so
`LowerName` is visible independently. Required diagnostics include:

- `lookupShapeCounts.LowerName`
- `comparedCount`
- `mismatchCount`
- `mismatchReasons`
- `mismatchSamples`
- producer timing fields already used by v1
- disabled or unavailable reason when the producer does not run

Diagnostics are profile artifact fields only. They are not MCP output and do
not promise a long-term stable public API.

## Equivalence Rules

Equivalence compares candidate availability, not final resolver decisions.

For `LowerName`, compare:

- candidate node id set;
- candidate count;
- empty candidate set behavior;
- behavior when multiple differently-cased names share the same lower-name key.

Ordering is not semantic unless implementation evidence shows the current
resolver depends on it. If ordering turns out to matter, document it and do
not route producer output into the main path in this slice.

Mismatch samples must be capped.

## Acceptance Evidence

Required:

- deterministic fixture tests for present lower-name lookup;
- deterministic fixture tests for case variants, such as `MixedCase` and
  `mixedcase`;
- deterministic fixture tests for multiple candidates with the same lower-name
  key;
- deterministic fixture tests for missing lower-name lookup;
- mixed Rust-owned + TypeScript fallback fixture;
- public graph guard showing graphStats and resolved edge shape do not drift
  because Rust producer output is not used for final resolution;
- profile artifact diagnostics test showing `lookupShapeCounts.LowerName`;
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
- current repo or VS Code sparse evidence shows producer mismatches;
- Rust/SQLite lower-name semantics drift from TypeScript string lower-name
  behavior in a way this slice cannot safely normalize;
- mismatch taxonomy points to path normalization, DB schema gaps, fallback
  append timing, or candidate fact shape gaps that must be solved first;
- implementing producer parity requires changing disambiguation semantics;
- producer diagnostics cannot be separated from existing candidate protocol
  timing;
- the only way to make it useful is to route Rust output into final decisions
  before shadow equivalence is clean.

## Issue Sequence

1. Extend Rust candidate producer protocol for `LowerName`.
2. Implement Rust shadow candidate producer for `LowerName`.
3. Validate `LowerName` producer diagnostics and graph stability.
4. Run targeted evidence and close out the `LowerName` producer decision.

The sequence is intentionally narrow. It expands Rust-owned candidate
availability coverage, but it is still not the migration of final
disambiguation itself.
