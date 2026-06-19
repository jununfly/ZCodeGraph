# Rust-Hybrid Resolver Migration Decision Plan

## Parent

- Architecture/performance PRD: `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Parent PRD issue: #295
- Plan tracking issue: #296
- Optimization tracker: #165
- Parse/extraction diagnostic track: #224
- Big-picture decision: `docs/benchmarks/2026-06-19-rust-hybrid-optimization-big-picture-decision.md`

## Context

The `rust-hybrid` default path now has a clear split:

```text
TypeScript product shell
  -> Rust core source indexing
  -> TypeScript fallback append
  -> TypeScript finalization/reference resolution
  -> status / doctor / MCP / diagnostics
```

Recent optimization evidence shows that low-level SQLite/write-path work can
produce real wins, but the largest remaining end-to-end cost sits in the
TypeScript-owned finalization/reference-resolution tail. Continuing to optimize
that tail as isolated local patches risks hiding the real architecture problem:
the hybrid boundary may be forcing repeated candidate hydration, repeated
database lookup, and fragmented diagnostics across the Rust core and TypeScript
shell.

Before executing the architecture/performance PRD, create an independent
resolver migration decision plan. This plan is a prerequisite to #295's
architecture phase. It should decide how to approach full migration, not
directly implement the full migration.

## Goal

Define the migration route from the current TypeScript-owned
finalization/reference-resolution tail toward:

```text
Rust-owned finalization/reference-resolution
  with a narrow protocol boundary to the TypeScript product shell
```

The long-term target is to migrate the entire finalization/reference-resolution
chain out of the TypeScript tail, in multiple independently validated plans.
The first decision-plan outcome is a full migration blueprint plus the first
implementation-plan slice.

The first implementation slice is:

```text
candidate lookup/cache protocol
```

This first slice should move candidate collection/cache and lookup hydration
toward a protocol-owned or Rust-owned boundary. It must not migrate the
every-reference disambiguation decision.

## Non-Goals

- Do not implement the full resolver migration in this plan.
- Do not migrate broad disambiguation semantics in the first slice.
- Do not change every-reference disambiguation semantics.
- Do not migrate framework or dynamic-dispatch synthesis as the first slice.
- Do not rewrite the TypeScript product shell.
- Do not change the SQLite schema by default.
- Do not change user-facing CLI, SDK, MCP, status, or doctor behavior.
- Do not run a new large-corpus profile during this plan unless existing
  evidence is insufficient to make the first-slice decision.
- Do not update README metrics.
- Do not run a full scoreboard or agent A/B campaign for the plan document.

## Target Architecture

The desired end state is not "everything becomes Rust." It is a narrower split:

- Rust owns finalization/reference-resolution execution.
- Rust owns or protocolizes reusable candidate lookup and edge-emission
  mechanics.
- Rust emits profile sub-buckets that explain finalization work as one
  continuous indexing pipeline.
- TypeScript remains the product shell for CLI/SDK lifecycle, fallback planning,
  status/doctor packaging, MCP surfaces, and compatibility glue.
- The protocol boundary passes stable graph facts, fallback taxonomy,
  diagnostic profile data, and health information.
- The TypeScript shell should not keep doing high-volume resolver database work
  after the relevant responsibility has migrated.

## Migration Domains

The full migration should be split into multiple future plans or phases.

### 1. Candidate Lookup / Cache Protocol

First slice.

Responsibilities:

- collect candidate sets in batch;
- avoid repeated database hydration for the same names, files, scopes, and
  languages;
- expose lookup counts, cache hit/miss counts, hydration time, and candidate set
  size diagnostics;
- feed the existing TypeScript disambiguation decision without changing its
  semantics.

Expected first-slice output:

- a narrow protocol shape or cache contract;
- deterministic tests that prove candidate availability is equivalent;
- before/after profile evidence;
- VS Code sparse targeted profile during implementation;
- graphStats, fallback taxonomy, and RSS or unavailable reason.

No-go condition:

- If candidate lookup/cache does not reduce repeated database hydration or make
  finalization cost more explainable, do not keep extending this slice as a
  performance strategy. Escalate to the next likely bottleneck.

### 2. Disambiguation Execution

Later slice.

Responsibilities:

- preserve every-reference disambiguation semantics;
- port ranking and tie-breaking rules only after parity fixtures exist;
- keep ambiguous and fallback taxonomy behavior stable;
- provide replayable equivalence evidence.

Risks:

- broad semantic surface;
- agent sufficiency regressions from subtly different edge choices;
- large fixture burden.

### 3. Import / Export Resolution

Later slice.

Responsibilities:

- relative import resolution;
- paths alias resolution;
- ESM named import/export direct binding;
- one-hop direct re-export/barrel behavior;
- mixed Rust-owned and TypeScript fallback graph interactions.

Risks:

- package-resolution scope creep;
- file-level fallback interactions;
- accidental default/namespace/type-only expansion.

### 4. Local Exact References

Later slice.

Responsibilities:

- same-file and local-scope exact reference edges;
- candidate reuse across repeated local references;
- profile visibility for resolved and fallback references.

Risks:

- scope modelling differences between TS and Rust;
- accidental changes to ambiguous local names.

### 5. Cleanup / Edge-Write / DB Maintenance

Later slice, or a fallback first implementation if candidate cache is no-go.

Responsibilities:

- unresolved-reference cleanup;
- edge-write batching and validation;
- final database maintenance currently attributed to TypeScript finalization;
- profile buckets that distinguish lookup cost from write/cleanup cost.

Risks:

- write-path changes can hide semantic regressions if graphStats are weak;
- SQLite tuning can look fast on one corpus and noisy elsewhere.

### 6. Framework Post-Extract

Later slice.

Responsibilities:

- framework route/reference edges;
- language and framework specific post-extract facts;
- route-handler sufficiency preservation.

Risks:

- high framework coupling;
- direct impact on agent sufficiency;
- requires real repo smoke when semantics change.

### 7. Dynamic-Dispatch Synthesis

Later slice.

Responsibilities:

- callback/observer edges;
- EventEmitter-style edges;
- React render and JSX child edges;
- framework-specific dynamic flow bridges.

Risks:

- partial coverage can be worse than none;
- high sufficiency risk;
- requires end-to-end flow evidence.

### 8. Diagnostics / Profile / Status Contract

Cross-cutting slice.

Responsibilities:

- continuous Rust-side and TypeScript-shell profile story;
- fallback taxonomy preservation;
- graphStats and health reporting;
- doctor bundle visibility;
- no-source diagnostic privacy defaults.

Risks:

- diagnostic drift can make later performance decisions untrustworthy;
- exposing too much internal API can create stability expectations.

## Required Architecture Questions

The decision plan must answer:

1. Which finalization/reference-resolution responsibilities are still
   TypeScript-owned today?
2. Which responsibilities are candidates for Rust ownership?
3. Which responsibilities should become protocol-owned first?
4. What graph facts does TypeScript currently hydrate repeatedly?
5. Which repeated candidate lookups can be cached without changing
   disambiguation semantics?
6. What candidate cache key is stable enough for name, file, scope, language,
   and fallback interactions?
7. How does the cache interact with TypeScript fallback files appended after
   Rust core indexing?
8. What diagnostics prove that candidate lookup/cache changed the intended
   cost, rather than merely moving time between buckets?
9. What parity fixtures are required before disambiguation execution can move?
10. Which framework and dynamic-dispatch responsibilities must stay out of the
    first slice?
11. What no-go evidence would stop candidate cache from being treated as the
    right first migration path?

## Testing And Evidence Strategy

Plan-stage evidence:

- cite existing profile and benchmark artifacts;
- inspect current TypeScript finalization/reference-resolution structure;
- map existing profile buckets to migration domains;
- do not require a fresh VS Code sparse run unless existing evidence is
  insufficient to choose the first slice.

First implementation slice evidence:

- deterministic unit/integration tests at the highest practical seam;
- candidate equivalence tests proving the cache does not change availability;
- graphStats and fallback taxonomy comparison;
- before/after profile artifact;
- VS Code sparse targeted profile;
- RSS or unavailable reason;
- no agent A/B by default because disambiguation semantics should not change.

Agent A/B becomes required only if a later slice changes graph semantics,
language coverage, or sufficiency claims.

## Execution Order

1. Write architecture map for current TypeScript finalization/reference
   resolution.
2. Classify every migration domain by ownership target, risk, and prerequisite
   evidence.
3. Define the candidate lookup/cache protocol boundary.
4. Define first-slice implementation acceptance criteria.
5. Define no-go criteria and fallback next candidates.
6. Update #295 with the decision output.
7. Only after this plan is accepted, split implementation issues for the first
   slice.

## Success Criteria

This plan is complete when it produces:

- a clear target architecture;
- a full migration domain map;
- a first-slice implementation plan for candidate lookup/cache protocol;
- a statement that disambiguation decision semantics remain TypeScript-owned in
  the first slice;
- required parity, fallback, graphStats, profile, and RSS evidence criteria;
- no-go criteria for candidate lookup/cache;
- an update to #295 explaining how the architecture/performance PRD should
  consume this plan.

The success criterion is not "resolver migration has started." The success
criterion is that resolver migration has a route that can be judged, split, and
validated without blurring architecture decisions into local performance
patches.
