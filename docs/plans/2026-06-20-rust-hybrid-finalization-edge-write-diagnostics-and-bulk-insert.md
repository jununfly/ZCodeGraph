# Rust-hybrid finalization edge-write diagnostics and bulk insert

Date: 2026-06-20

Parent context:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- `docs/plans/2026-06-20-rust-hybrid-finalization-cleanup-diagnostics-and-batching.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-cleanup-closeout-decision.md`
- #295 architecture/performance PRD
- #296 resolver migration decision plan
- #165 optimization tracker

## Decision

The next resolver-migration implementation slice should target finalization
edge-write diagnostics and a bounded TypeScript-side bulk insert optimization.

The previous cleanup slice established that the finalization write/cleanup tail
is material, but resolved cleanup batching is no-go as a standalone performance
lever. The latest VS Code sparse evidence still shows a large edge-write bucket:

- `edgeWriteMs`: 11888ms;
- `edgeInsertCount`: 533309;
- `edgeEndpointValidationDbMs`: 695ms;
- `databaseAccessMs`: 23438ms;
- `perReferenceDisambiguationMs`: 18826ms;
- `unresolvedCleanupMs`: 9902ms.

This slice should make edge-write work more explainable and attempt one narrow
optimization inside `insertValidatedEdges()`.

## Why This Slice

Per-reference disambiguation is larger than edge write, but it is semantic
core. Moving it requires broader parity fixtures and replay evidence. Edge write
is a lower-semantic-risk finalization tail: it persists already-resolved edges
and should preserve graph semantics exactly.

This slice therefore targets edge-write mechanics without changing ownership of
reference resolution decisions.

## Scope

### In Scope

- Add profile diagnostics for edge insert serialization and payload size.
- Preserve existing edge-write diagnostics:
  - `edgeWriteMs`;
  - `edgeWriteDbMs`;
  - `edgeInsertCount`.
- Add deterministic contract tests for edge insertion behavior.
- Implement one bounded optimization inside `insertValidatedEdges()`:
  - pre-serialize validated edges into SQLite row parameters;
  - prepare the insert statement once for the bulk path;
  - execute the row params inside a transaction;
  - preserve `INSERT OR IGNORE`.
- Run targeted current-repo and VS Code sparse after profiles.
- Compare after profiles against:
  - `docs/benchmarks/2026-06-20-finalization-cleanup-current.profile.json`;
  - `docs/benchmarks/2026-06-20-finalization-cleanup-vscode-sparse.profile.json`.
- Produce a closeout decision with one of:
  - `keep`;
  - `no-go`;
  - `prerequisite`.

### Out of Scope

- Do not change SQLite schema.
- Do not change `insertEdge()` behavior.
- Do not introduce Rust subprocess execution.
- Do not make edge write Rust-owned in this slice.
- Do not change reference disambiguation, ranking, confidence, `resolvedBy`,
  import resolution, framework resolution, or dynamic-dispatch synthesis.
- Do not change edge semantics, metadata shape, duplicate handling, or
  endpoint-validation responsibility.
- Do not implement multi-row giant `INSERT ... VALUES (...), (...)`.
- Do not update README metrics.
- Do not run full scoreboard or agent A/B.

## Diagnostics Contract

Profile diagnostics should answer:

- How many validated edges were passed to the insert path?
- How much time was spent serializing edge rows before database writes?
- How many serialized edge metadata bytes were produced?
- How much time was spent in database edge insert work?
- Did the high-level edge-write bucket remain compatible with prior profiles?

Required profile fields:

- `edgeInsertCount`;
- `edgeInsertSerializationMs`;
- `edgeInsertSerializedBytes`;
- `edgeWriteMs`;
- `edgeWriteDbMs`.

Optional profile field:

- `edgeInsertIgnoredCount`, only if it is available without extra query or
  material overhead.

## Bounded Optimization

The only optimization attempted in this plan is a pre-serialized bulk
`insertValidatedEdges()` path.

Constraints:

- `insertEdge()` remains unchanged for single-edge callers.
- `insertValidatedEdges()` may bypass `insertEdge()` internally.
- `insertEdges()` still validates endpoints and delegates to
  `insertValidatedEdges()`.
- `INSERT OR IGNORE` semantics must remain unchanged.
- persisted edge row shape must remain unchanged, including metadata,
  `resolvedBy`, line, column, and `edgeOrigin`.
- duplicate edge behavior must remain unchanged.
- invalid endpoint filtering remains the caller's responsibility for
  `insertValidatedEdges()`.

Do not use multi-row `INSERT` in this slice. It may be a future candidate, but
it adds parameter-count, chunking, metadata, and backend-behavior complexity
that is too broad for this bounded attempt.

## Implementation Slices

### 1. Add finalization edge-write profile diagnostics

Add edge-write serialization diagnostics and preserve existing high-level
profile fields.

Acceptance evidence:

- deterministic profile-shape test;
- existing profile consumers continue to pass;
- current fields remain present.

### 2. Add deterministic edge insert contract tests

Lock down edge insert behavior before changing the bulk path.

Acceptance evidence:

- `insertEdge()` still writes a single edge correctly;
- `insertValidatedEdges()` persists the same row shape as before;
- metadata and `resolvedBy` survive round-trip;
- duplicate edge behavior still follows `INSERT OR IGNORE`;
- `insertEdges()` still validates endpoints before delegating.

### 3. Implement pre-serialized bulk `insertValidatedEdges()` path

Change only the internal implementation of `insertValidatedEdges()`.

Acceptance evidence:

- edge insert contract tests pass;
- profile-shape test passes;
- no schema change;
- no graph semantic change.

### 4. Run targeted profile closeout

Run after profiles and compare them with the cleanup closeout baseline.

Acceptance evidence:

- current-repo after profile;
- VS Code sparse after profile using `/private/tmp/codegraph-corpus/vscode-sparse`
  if it is present, a Git checkout, and hydrated with `src/vs/workbench`,
  `src/vs/platform`, and `src/vs/base`;
- RSS or unavailable reason;
- graph stats;
- fallback taxonomy;
- edge-write diagnostics and timing context;
- closeout decision under `docs/benchmarks/`.

Do not clone a replacement VS Code corpus automatically if the required checkout
is missing or incomplete.

## Evidence Gate

Required:

- after profile for current repo;
- after profile for VS Code sparse;
- comparison against the cleanup closeout baseline;
- deterministic tests;
- graph stats and fallback taxonomy;
- RSS or unavailable reason.

Conditional:

- rerun before/baseline only if after evidence is ambiguous, suspicious, or
  shows a likely regression that needs same-build confirmation.

## No-Go Criteria

Stop treating pre-serialized bulk edge insert as a useful next lever if:

- edge write does not improve or become materially clearer;
- graph output changes;
- fallback taxonomy changes unexpectedly;
- persisted edge metadata changes;
- duplicate edge behavior changes;
- implementation pressure starts pulling in schema changes, multi-row INSERT,
  Rust subprocess ownership, or disambiguation changes.

## Expected Outcome

This plan should leave the project with clearer edge-write diagnostics and one
bounded bulk insert optimization attempt. A successful result can justify a
later write-path ownership/protocol plan. A no-go result should redirect the
resolver migration program toward broader per-reference disambiguation
execution or a more explicit Rust-owned finalization design.
