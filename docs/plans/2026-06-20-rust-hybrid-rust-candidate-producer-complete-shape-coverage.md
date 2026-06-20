# Rust-hybrid Rust candidate producer complete shape coverage

Date: 2026-06-20

Parent context:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-protocol-closeout-decision.md`
- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-v1.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-closeout-decision.md`
- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-lowername.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-lowername-closeout-decision.md`
- #295 architecture/performance PRD
- #296 resolver migration decision plan
- #307-#315 Rust candidate producer implementation slices

## Decision

Implement the next resolver-migration slice as **Rust candidate producer
complete shape coverage** covering the remaining candidate lookup shapes:

- `QualifiedName`
- `FileNodes`

The producer must remain in **shadow / double-read mode only**. It must not
feed the resolver main path, change candidate availability used for final
resolution, or alter every-reference disambiguation semantics.

When this slice closes successfully, the closeout decision should state:

> Rust candidate producer shape coverage is complete. Main-path routing remains
> a separate future decision.

## Why This Slice

The previous producer slices validated shadow equivalence for:

- `ExactName`
- `KnownNamePresence`
- `LowerName`

The remaining candidate protocol lookup shapes are `QualifiedName` and
`FileNodes`. Completing them gives the resolver migration program a full
candidate availability boundary before considering higher-risk decisions such
as Rust producer main-path routing or `matchReference` migration.

VS Code sparse evidence from the LowerName closeout shows these shapes are
meaningful enough to validate on a large corpus:

- `QualifiedName`: 69,233 candidate protocol lookups;
- `FileNodes`: 1,508 candidate protocol lookups.

`QualifiedName` is the larger next availability shape. `FileNodes` is smaller
but completes the protocol surface and may expose payload-size or file-path
boundary risks that smaller fixtures do not reveal.

## Scope

### In Scope

- Extend the Rust candidate producer protocol with `QualifiedName` and
  `FileNodes`.
- Produce Rust candidate ids for exact qualified-name lookup from the unified
  SQLite graph.
- Produce Rust candidate ids for exact file-path node lookup from the unified
  SQLite graph.
- Compare Rust producer output against the TypeScript candidate protocol
  baseline in shadow mode.
- Reuse the existing Rust producer diagnostics fields:
  - `lookupShapeCounts`
  - `candidateCount`
  - `payloadBytes`
  - `comparedCount`
  - `mismatchCount`
  - `mismatchReasons`
  - `mismatchSamples`
  - `producerMs`
  - `serializationMs`
  - `subprocessMs`
- Run deterministic fixture coverage and targeted current-repo / VS Code sparse
  profile evidence.
- Close out with keep / no-go / prerequisite.

### Out of Scope

- Routing Rust producer output into final resolver decisions.
- Migrating `matchReference`.
- Changing final target selection.
- Changing confidence, ranking, `resolvedBy`, language gates, framework
  decisions, or dynamic-dispatch synthesis.
- Adding path normalization for `FileNodes`.
- Supporting relative/absolute path conversion, case-folding, symlink, or
  realpath behavior for `FileNodes`.
- Adding suffix/fuzzy qualified-name matching.
- Adding namespace fallback, import alias, package resolution, import-chain
  resolution, re-export semantics, default import semantics, namespace import
  semantics, or type-only semantics.
- Adding new profile artifact diagnostics fields.
- Optimizing producer transport, subprocess overhead, payload shape, or
  serialization.
- Agent A/B.
- README or user-facing performance claims.
- Automatically creating or entering a main-path routing decision plan.

## Shape Boundaries

### `QualifiedName`

`QualifiedName` is exact availability only:

- input: `qualifiedName`;
- Rust query semantics: exact `qualified_name = ?` over the unified graph;
- compare candidate node id set, candidate count, and empty behavior.

Do not add:

- suffix matching;
- fuzzy matching;
- namespace fallback;
- import alias resolution;
- package resolution;
- import-chain or re-export resolution.

### `FileNodes`

`FileNodes` is exact file-path availability only:

- input: `filePath`;
- Rust query semantics: exact `file_path = ?` over the unified graph;
- compare candidate node id set, candidate count, and empty behavior.

Do not add:

- file-path normalization;
- relative/absolute path conversion;
- case normalization;
- symlink or realpath handling;
- directory expansion.

Ordering is not semantic for either shape unless implementation evidence shows
the current resolver depends on it. If ordering turns out to matter, document
it and do not route producer output into the main path in this slice.

## Protocol Boundary

The producer reads or receives enough data to answer the remaining candidate
lookup shapes over the unified graph after:

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

Do not add new profile artifact diagnostics fields in this slice. Extend the
existing Rust candidate producer profile artifact so:

- `lookupShapeCounts.QualifiedName` is present;
- `lookupShapeCounts.FileNodes` is present;
- mismatch taxonomy can identify candidate set drift for either shape;
- mismatch samples remain capped.

Diagnostics are profile artifact fields only. They are not MCP output and do
not promise a long-term stable public API.

## Equivalence Rules

Equivalence compares candidate availability, not final resolver decisions.

For `QualifiedName`, compare:

- candidate node id set;
- candidate count;
- empty candidate set behavior.

For `FileNodes`, compare:

- candidate node id set;
- candidate count;
- empty candidate set behavior.

The closeout must not claim performance improvement from this shadow-only
slice. It may record timing context to support future decisions.

## Acceptance Evidence

Required:

- deterministic fixture tests for `QualifiedName` present / multiple
  candidates / missing;
- deterministic fixture tests for `FileNodes` present / multiple candidates /
  missing;
- mixed Rust-owned + TypeScript fallback fixture;
- public graph guard showing graphStats and resolved edge shape do not drift
  because Rust producer output is not used for final resolution;
- profile artifact diagnostics test showing `lookupShapeCounts.QualifiedName`
  and `lookupShapeCounts.FileNodes`;
- current-repo targeted profile;
- VS Code sparse targeted profile using `/private/tmp/codegraph-corpus/vscode-sparse`;
- RSS or unavailable reason;
- fallback taxonomy comparison;
- closeout decision stating whether complete producer shape coverage is keep /
  no-go / prerequisite.

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
- `QualifiedName` parity requires suffix, fuzzy, namespace, import, package, or
  re-export semantics;
- `FileNodes` parity requires path normalization beyond exact filePath lookup;
- implementing producer parity requires changing disambiguation semantics;
- producer diagnostics cannot distinguish all five candidate producer shapes
  using the existing diagnostics fields;
- payload size or subprocess behavior makes the producer unusable even in
  shadow mode;
- the only way to make the result useful is to route Rust output into final
  decisions before shadow equivalence is clean.

## Issue Sequence

1. Extend Rust candidate producer protocol for `QualifiedName` and `FileNodes`.
2. Implement Rust shadow producer for exact `QualifiedName` availability.
3. Implement Rust shadow producer for exact `FileNodes` availability.
4. Validate complete-shape diagnostics and graph stability.
5. Run targeted evidence and close out candidate producer coverage.

The sequence completes candidate producer shape coverage. It is still not the
migration of final disambiguation, nor approval for Rust producer main-path
routing.
