# QualifiedName Routing Residual Closeout Decision

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Baseline:
  `docs/benchmarks/2026-06-22-qualifiedname-routing-residual-baseline.md`
- Evidence:
  `docs/benchmarks/2026-06-22-qualifiedname-routing-residual-evidence.md`
- Issues: #420, #421, #422

## Decision

Decision: `keep`.

`QualifiedName` candidate-producer on-demand routing is safe to count as a kept
resolver semantic residual slice behind the existing local-config experimental
routing gate.

This decision does not make candidate-producer routing a stable public API and
does not claim a performance win.

## Why Keep

The targeted evidence shows:

- current repository exercised 21 on-demand `QualifiedName` routed lookups;
- VS Code sparse exercised 40 on-demand `QualifiedName` routed lookups;
- routing was active on both targets;
- active shapes included `QualifiedName`;
- routing fallback reason was null on both targets;
- routing mismatch count was zero on both targets;
- graph-readable rust-hybrid status was preserved on both targets;
- fallback taxonomy remained visible and explainable.

No production code change was needed to make the decision.

## Semantic Boundary

Unchanged:

- reference target selection;
- edge kind semantics;
- confidence semantics;
- `resolvedBy` semantics;
- package resolution;
- framework post-extract behavior;
- dynamic-dispatch synthesis;
- SQLite schema;
- broad disambiguation behavior.

The keep decision is specifically about the existing guarded `QualifiedName`
routing shape and its diagnostics. It does not authorize source-order,
pick-first, overload, namespace, or type/value tie-break behavior.

## Validation

Targeted profile artifacts:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json`
- `docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json`

Additional deterministic validation:

```bash
npx vitest run __tests__/candidate-protocol.test.ts
```

Expected validation role:

- confirms routed shape behavior remains fail-closed;
- confirms diagnostics surface routed shapes and mismatch/fallback state.

## Caveats

- Runs used targeted profile/smoke only, not a full scoreboard.
- No agent A/B was run.
- RSS was unavailable because these targeted CLI runs did not enable a
  process-tree RSS sampler.
- Host Node emitted the existing unsafe Node warning and completed under
  `CODEGRAPH_ALLOW_UNSAFE_NODE=1`.

## #165 Update

#165 should treat `QualifiedName` routing as closed/keep for the resolver
semantic residual map.

The next routing-shaped residual should not be another `QualifiedName` slice.
The remaining useful route is to decide whether `FileNodes` is a semantic slice
or whether it belongs with import/file-level resolver residuals.

