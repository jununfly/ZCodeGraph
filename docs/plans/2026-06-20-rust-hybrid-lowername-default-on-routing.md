# Rust-Hybrid LowerName Default-On Candidate Producer Routing

Date: 2026-06-20

## Parent

- Architecture/performance PRD: `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Prior routing experiment: `docs/plans/2026-06-20-rust-hybrid-candidate-producer-main-path-routing-experiment.md`
- Prior routing closeout: `docs/benchmarks/2026-06-20-rust-hybrid-candidate-producer-routing-closeout-decision.md`
- LowerName shadow closeout: `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-lowername-closeout-decision.md`

## Context

The current Rust candidate producer has validated shadow coverage for
`ExactName`, `KnownNamePresence`, and `LowerName`. The previous main-path
routing slice safely routed only `ExactName` and `KnownNamePresence` behind
local experimental config. LowerName remains validated but not yet used as a
main-path candidate source.

The next useful resolver-migration slice is to route LowerName more completely:
not merely by adding it to a narrow precomputed key universe, but by serving the
actual `LowerName` lookups that the TypeScript resolver emits through
`matchFuzzy()`. The final disambiguation semantics remain TypeScript-owned.

## Goal

Make Rust candidate producer routing default-on for the `rust-hybrid` indexing
path, with routed shapes:

- `ExactName`
- `KnownNamePresence`
- `LowerName`

LowerName must support synchronous single-key on-demand producer lookup for
resolver-emitted `LowerName` requests that were not precomputed.

The implementation must preserve the current resolved graph by failing closed
to the TypeScript baseline on any routing uncertainty.

## Non-Goals

- Do not enable routing for `--engine typescript`.
- Do not route `QualifiedName` or `FileNodes`.
- Do not migrate `matchReference`.
- Do not change final target selection, ranking, confidence, `resolvedBy`,
  language gates, framework decisions, or dynamic-dispatch synthesis.
- Do not introduce queueing or batching for on-demand LowerName lookup.
- Do not add an environment flag.
- Do not clean up legacy experimental environment flags.
- Do not update README or release notes.
- Do not run full scoreboard or agent A/B validation.
- Do not make the local config a stable public API.

## Default-On Contract

For `rust-hybrid`:

- missing `.zcodegraph/config.json` means routing is enabled by default;
- `experimental.rustCandidateProducerRouting: true` keeps routing enabled and
  records `source: "local-config"`;
- `experimental.rustCandidateProducerRouting: false` disables routing and
  records `source: "local-config"`;
- invalid JSON or a non-boolean value disables routing, records
  `source: "invalid-local-config"`, and includes the invalid reason;
- invalid local config must not interrupt indexing.

For `typescript`:

- routing stays disabled;
- TypeScript engine behavior is unchanged.

## Routing Semantics

The candidate provider remains the routing boundary. `ReferenceResolver` and
`matchReference()` should keep using the existing candidate protocol calls.

The routed shapes are:

- `ExactName`
- `KnownNamePresence`
- `LowerName`

LowerName routing must support:

- precomputed producer results when available;
- synchronous single-key on-demand Rust producer lookup when the resolver asks
  for a LowerName key that was not precomputed;
- caching of successful on-demand results so repeated LowerName keys do not
  rerun the producer;
- TypeScript baseline comparison for every routed LowerName result.

Any of the following must disable candidate producer routing for the whole run
and fall back to the TypeScript baseline:

- Rust producer process failure;
- invalid producer response;
- missing Rust result for a routed lookup;
- candidate id mismatch;
- known-name presence mismatch;
- node hydration miss;
- invalid local config.

Fail-closed routing must not fail the index run. It must preserve the TypeScript
baseline graph and record diagnostics explaining why routing stopped.

## Diagnostics

Profile and doctor diagnostics must answer:

- Was routing enabled by default, local config, or disabled by local config?
- Was routing active at the end of the run?
- Which shapes were routed?
- Did LowerName use on-demand lookup?
- How many on-demand LowerName lookups were attempted?
- How many on-demand LowerName lookups were served from cache?
- Did routing fail closed?
- What fallback reason and mismatch samples explain fail-closed behavior?

Status JSON should stay concise. It may expose enabled/source state, but it
should not promise a stable config API.

## Acceptance Evidence

Required deterministic coverage:

- missing local config defaults routing on for `rust-hybrid`;
- local `false` disables routing;
- local `true` enables routing;
- invalid local config disables routing and records a reason;
- routed shapes diagnostics include `ExactName`, `KnownNamePresence`, and
  `LowerName`;
- on-demand LowerName success path returns the Rust-produced candidates;
- repeated same LowerName key does not rerun the producer;
- on-demand LowerName mismatch fails closed to the TypeScript baseline;
- on-demand LowerName producer failure fails closed to the TypeScript baseline;
- default-on rust-hybrid graph stability guard passes against a routing-disabled
  control.

Required targeted evidence:

- current-repo `rust-hybrid` targeted profile with default-on routing;
- VS Code sparse targeted profile with default-on routing;
- RSS or unavailable reason;
- fallback taxonomy and routing diagnostics in the closeout decision;
- closeout decision: `keep`, `no-go`, or `prerequisite`.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark the evidence
  as needs human setup.
- Do not clone a replacement corpus automatically.

## Issue Sequence

1. Make rust-hybrid candidate producer routing default-on with local config kill
   switch.
2. Route LowerName through Rust producer with synchronous on-demand lookup and
   fail-closed fallback.
3. Add default-on graph stability and diagnostics coverage.
4. Run current-repo and VS Code sparse targeted profile closeout.
