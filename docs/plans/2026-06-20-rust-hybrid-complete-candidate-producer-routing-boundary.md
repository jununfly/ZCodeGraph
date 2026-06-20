# Rust-Hybrid Complete Candidate Producer Routing Boundary

Date: 2026-06-20

## Parent

- Architecture/performance PRD: `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Prior routing experiment: `docs/plans/2026-06-20-rust-hybrid-candidate-producer-main-path-routing-experiment.md`
- LowerName default-on no-go closeout:
  `docs/benchmarks/2026-06-20-rust-hybrid-lowername-default-on-routing-closeout-decision.md`

## Context

The candidate producer routing boundary has proven that Rust-produced candidate
sets can be compared against the TypeScript baseline and fail closed without
changing the resolved graph. The default-on LowerName trial also showed that
performance can regress badly if routing is promoted before the full boundary
and cost model are understood.

The next slice should stop exploring partial intermediate states and complete
the local-config experimental routing boundary for all existing candidate
protocol lookup shapes. Performance optimization is deliberately deferred until
the boundary is complete.

## Goal

Complete the Rust candidate producer routing boundary for all five candidate
lookup shapes:

- `ExactName`
- `KnownNamePresence`
- `LowerName`
- `QualifiedName`
- `FileNodes`

The boundary remains local-config experimental only:

```json
{
  "experimental": {
    "rustCandidateProducerRouting": true
  }
}
```

Missing config remains disabled. Invalid config remains fail-closed and
diagnostic-only.

## Non-Goals

- Do not enable routing by default.
- Do not change `--engine typescript`.
- Do not change `matchReference()`.
- Do not change final target selection, ranking, confidence, `resolvedBy`,
  framework behavior, or dynamic-dispatch synthesis.
- Do not change the SQLite schema.
- Do not add a new environment flag.
- Do not remove or migrate legacy environment flags.
- Do not optimize routing performance in this slice.
- Do not require performance improvement as a success gate.
- Do not update README or release notes.
- Do not run full scoreboard or agent A/B validation.

## Routing Contract

When local experimental routing is enabled:

- all five lookup shapes may be routed through the Rust candidate producer;
- all routed results are compared against the TypeScript baseline;
- successful routed results are cached through the existing candidate protocol
  caches;
- missing precomputed results may be served by synchronous single-key
  on-demand producer lookup;
- mismatch, missing result, node hydration miss, invalid config, or producer
  failure disables routing for the whole run and falls back to the TypeScript
  baseline;
- fail-closed routing must not fail indexing.

Rust candidate producer output remains candidate-only:

- candidate ids for `ExactName`, `LowerName`, `QualifiedName`, and `FileNodes`;
- boolean presence for `KnownNamePresence`;
- no final target, confidence, ranking, or `resolvedBy`.

## Precompute and On-Demand Strategy

This slice should complete the boundary rather than tune performance.

The implementation may precompute any low-risk lookup keys that are already
available before resolution, but correctness must not depend on perfect
precomputation. Any lookup shape that misses precomputed results must support
synchronous single-key on-demand producer lookup.

On-demand lookup is intentionally simple in this slice:

- no queueing;
- no sessionization;
- no batching optimization;
- no hot-path baseline optimization.

Those become later performance work once the complete boundary has evidence.

## Diagnostics

Profile and doctor diagnostics must show:

- whether routing was configured;
- whether routing remained active;
- the full routed shape set;
- lookup counts by shape;
- on-demand lookup counts by shape;
- on-demand cache hits;
- fail-closed reason;
- bounded mismatch samples;
- Rust producer lookup counts, payload bytes, subprocess time, and producer
  time.

Diagnostics are profile artifacts for development and troubleshooting, not a
stable public API.

## Acceptance Evidence

Required deterministic coverage:

- Rust producer returns correct candidate ids/presence for all five shapes.
- TypeScript candidate protocol can route all five shapes.
- All five shapes support on-demand single-key lookup.
- Successful on-demand results are cached.
- Mismatch, missing result, hydration miss, invalid config, and producer failure
  fail closed to TypeScript baseline.
- Graph stability passes with local-config routing enabled against a disabled
  control.
- Diagnostics expose active shapes, shape counts, on-demand counts, and
  fail-closed details.

Required targeted evidence:

- current-repo `rust-hybrid` targeted profile with local-config routing enabled;
- VS Code sparse targeted profile with local-config routing enabled;
- RSS or unavailable reason;
- fallback taxonomy and routing diagnostics in the closeout decision;
- closeout decision stating whether the complete local-config boundary is
  semantically keepable.

Performance results are recorded as input for later optimization, not as the
gate for this slice.

VS Code sparse setup rule:

- Use `/private/tmp/codegraph-corpus/vscode-sparse`.
- If it is missing, not a Git checkout, or not hydrated enough to contain
  `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`, mark the evidence
  as needs human setup.
- Do not clone a replacement corpus automatically.

## Issue Sequence

1. Complete producer protocol routing for all lookup shapes.
2. Complete Rust producer implementation and deterministic shape tests.
3. Add graph stability and diagnostics for the complete routing boundary.
4. Run targeted profile closeout for the complete routing boundary.
