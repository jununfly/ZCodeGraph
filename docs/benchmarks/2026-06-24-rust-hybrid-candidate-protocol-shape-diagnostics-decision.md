# Rust-Hybrid Candidate Protocol Shape Diagnostics Decision

Date: 2026-06-24

Issue:

- #514

Plan:

- `docs/plans/2026-06-24-rust-hybrid-comprehensive-performance-optimization-plan.md`

Baseline:

- `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-baseline-result.md`

Prior consolidated evidence:

- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Decision

Use the existing local-config Rust candidate producer routing boundary as the
bounded candidate protocol A/B subject for #515.

The selected shape set is:

- `LowerName`
- `QualifiedName`
- `FileNodes`

This does not authorize a full binding-level reference-resolution migration.
Final per-reference disambiguation remains TypeScript-owned for this roadmap
slice. Candidate producer routing may supply candidate sets, but the routed
sets must continue to be checked against the TypeScript baseline and fail
closed on mismatch, missing result, producer failure, or hydration miss.

## Shape-Level Read

| Shape | State for #515 | Reason |
|---|---|---|
| `LowerName` | include-with-caveat | Mechanism is implemented and guarded. Prior default-on evidence was not enough for a default behavior claim, but it remains useful inside an explicit bounded A/B. |
| `QualifiedName` | include | Prior residual evidence kept guarded on-demand routing with zero mismatches on current repo and VS Code sparse. |
| `FileNodes` | include-with-separate-accounting | Mechanically safe in prior evidence and heavily exercised on VS Code sparse, but semantically overlaps file-level/import resolver behavior. It must keep separate diagnostics and must not be blended into a generic candidate win. |

## Required Diagnostics For #515

The A/B issue must report these fields when available:

- routing configured/source/active/fallback reason;
- active routed shapes;
- `onDemandLookupCount`;
- `onDemandLookupShapeCounts.LowerName`;
- `onDemandLookupShapeCounts.QualifiedName`;
- `onDemandLookupShapeCounts.FileNodes`;
- `onDemandCacheHitCount`;
- mismatch count and bounded mismatch samples;
- graphStats or graph parity;
- fallback taxonomy;
- RSS or unavailable reason.

## Guardrails

- Do not change default user behavior.
- Do not change SQLite schema.
- Do not change reference target selection, confidence, `resolvedBy`, edge kind,
  dynamic-dispatch synthesis, framework post-extract behavior, package
  resolution, or broad disambiguation semantics.
- Do not claim Agent Sufficiency improvement unless a semantic guardrail run is
  explicitly added.

## Recommendation

Proceed to #515 with one bounded A/B:

- baseline: default `rust-hybrid` with candidate protocol enabled and local
  routing absent/disabled;
- candidate: default `rust-hybrid` plus local
  `experimental.rustCandidateProducerRouting: true`;
- evaluate current repo and VS Code sparse when available;
- decide `keep`, `no-go`, `defer`, or `next` from measured trend evidence.
