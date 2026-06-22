# Resolver Semantic Residual Map

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-22-rust-hybrid-qualifiedname-routing-semantic-residual-audit.md`
- QualifiedName closeout:
  `docs/benchmarks/2026-06-22-qualifiedname-routing-residual-closeout-decision.md`
- Issue: #423

## Decision Context

PlanB-1 kept the existing guarded `QualifiedName` candidate-producer
on-demand routing residual. The keep decision is semantic-safety scoped and
local-config scoped. It does not claim default-path performance improvement and
does not authorize broad disambiguation migration.

## Residual Buckets

### Closed / Keep

| Residual | State | Notes |
| --- | --- | --- |
| `QualifiedName` candidate-producer on-demand routing | keep | Exercised on current repo and VS Code sparse with zero routing mismatches. |
| `LowerName` local-config routing | keep-with-caveat | Mechanism exists and fail-closes, but prior default-on attempt was no-go for default path due candidate lookup cost. |
| Complete local-config candidate producer routing boundary | keep | Shapes and diagnostics are semantically keepable behind local config. |

### Needs Slice

| Residual | Recommended treatment |
| --- | --- |
| `FileNodes` candidate-producer on-demand routing | Next slice. It is heavily exercised on VS Code sparse, but semantic ownership overlaps file-level/import resolver behavior and needs its own audit. |
| ESM/import-export residuals | Needs one or more guarded slices only when they reuse existing relative/path-alias resolver boundaries and do not add package resolution. |
| Binding-level symbol disambiguation fallback | Needs a guarded semantic slice because it remains a large fallback taxonomy bucket. |
| Unresolved file-level import targets | Needs a separate import/file-level residual slice; do not merge with `QualifiedName`. |
| Unsupported import forms | Needs taxonomy-driven slice or explicit no-go depending on prevalence and agent sufficiency impact. |

### Needs Architecture

| Residual | Reason |
| --- | --- |
| Broad disambiguation migration | Requires per-reference replay/parity evidence and cannot be handled by a simple routing-shape audit. |
| Source-order or pick-first tie-break behavior | Disallowed as a speed shortcut; needs explicit semantic decision if ever considered. |
| Overload/namespace/type-value generalization | Needs separate semantic design because it can change which target node id is selected. |
| Framework post-extract migration | Explicitly outside the candidate-producer routing slice and tied to final graph ordering. |
| Dynamic-dispatch synthesis migration | Partial migration can regress agent sufficiency; needs separate end-to-end flow evidence. |
| Package resolution expansion | Out of scope for this route unless a new architecture decision changes resolver boundaries. |

## Slice Estimate

Estimated remaining resolver semantic residual work:

- **3-4 additional slices** before this route can be considered complete.

Suggested sequence:

1. `FileNodes` routing semantic residual audit.
2. Import/file-level residual slice covering unresolved file-level import
   targets and supported ESM/import-export boundaries.
3. Binding-level symbol disambiguation fallback slice.
4. Optional taxonomy/no-go slice for unsupported import forms, if the previous
   slices do not absorb or downgrade it.

This estimate stays within the previously agreed 2-4 range. PlanB-1 evidence
pushes the estimate toward the upper half because `FileNodes` is heavily
exercised on VS Code sparse (`1247` on-demand lookups) and overlaps import/file
resolver semantics enough to deserve its own audit.

## Next Recommended Slice

Next slice: **FileNodes routing semantic residual audit**.

Why:

- it is already routed and diagnostic-visible;
- VS Code sparse exercised it heavily;
- it is the closest sibling to the kept `QualifiedName` slice;
- it has higher semantic boundary risk than `QualifiedName`, so doing it next
  should clarify whether routing-shape residuals can continue or whether the
  route must pivot to import/file-level architecture.

Guardrails for the next slice:

- evidence-only by default;
- no package resolution expansion;
- no import/export behavior change unless a narrow existing resolver boundary
  already owns it;
- graph-readable status and fallback taxonomy required;
- keep/no-go/needs-architecture closeout required.

## Non-Goals

- No PlanB-2 issues are created by this artifact.
- No production behavior change is proposed here.
- No full scoreboard or agent A/B is required here.

