# FileNodes Routing Residual Audit

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- PlanB-1 plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- QualifiedName evidence:
  `docs/benchmarks/2026-06-22-qualifiedname-routing-residual-evidence.md`
- Residual map:
  `docs/benchmarks/2026-06-22-resolver-semantic-residual-map.md`

## Decision

Decision: `handoff-to-import-file-plan`.

`FileNodes` candidate-producer on-demand routing is mechanically safe in the
available evidence, but it should not be closed as an independent resolver
semantic residual inside PlanB.

The shape belongs with the next route: **Import/File-Level Resolver Completion
Plan**.

## Evidence Source

This audit reuses the PlanB-1 targeted profile artifacts:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json`
- `docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json`

No additional VS Code sparse profile was run. The reused artifacts already
exercised the same candidate-producer routing stack, local-config state,
fallback taxonomy, and graph-readable status required for this audit.

## Current Repository Read

Routing diagnostics:

| Field | Value |
| --- | --- |
| routing active | true |
| active shapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| fallback reason | null |
| mismatch count | 0 |
| `onDemandLookupShapeCounts.FileNodes` | 32 |

Fallback taxonomy:

| Reason | Count |
| --- | ---: |
| binding-level-symbol-disambiguation-not-yet-rust-owned | 1890 |
| unsupported-import-form-not-yet-rust-owned | 44 |
| unresolved-file-level-import-target | 6 |

Graph-readable status after the reused profile:

| Field | Value |
| --- | ---: |
| files | 313 |
| nodes | 16054 |
| edges | 34636 |

## VS Code Sparse Read

Checkout:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Git commit: `4a6e32fc1f0`

Routing diagnostics:

| Field | Value |
| --- | --- |
| routing active | true |
| active shapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| fallback reason | null |
| mismatch count | 0 |
| `onDemandLookupShapeCounts.FileNodes` | 1247 |

Fallback taxonomy:

| Reason | Count |
| --- | ---: |
| binding-level-symbol-disambiguation-not-yet-rust-owned | 28909 |
| unsupported-import-form-not-yet-rust-owned | 35 |
| unresolved-file-level-import-target | 5418 |

Graph-readable status after the reused profile:

| Field | Value |
| --- | ---: |
| files | 5780 |
| nodes | 327425 |
| edges | 905484 |

## Interpretation

`FileNodes` routing is not failing:

- it is active on both targets;
- it is exercised on both targets;
- VS Code sparse exercises it heavily;
- routing fallback reason is null;
- mismatch count is zero;
- graph-readable status is preserved.

However, its semantic ownership overlaps file/import resolver behavior:

- VS Code sparse has `1247` on-demand `FileNodes` lookups;
- the same evidence has `5418` unresolved file-level import target fallbacks;
- `FileNodes` candidate lookup is tightly related to relative/path-alias import
  target lookup, ESM import/export target selection, source-file fallback, and
  import-form taxonomy.

Keeping `FileNodes` as an isolated PlanB routing-shape residual would hide the
more important boundary: import/file-level resolver completion.

## Boundary

This audit does not change:

- reference target selection;
- edge kind semantics;
- confidence semantics;
- `resolvedBy` semantics;
- package resolution;
- framework post-extract behavior;
- dynamic-dispatch synthesis;
- SQLite schema;
- broad disambiguation behavior.

## Handoff

Next route:

- **Import/File-Level Resolver Completion Plan**

That route should own:

- `FileNodes` handoff;
- unresolved file-level import target taxonomy;
- supported ESM/import-export residuals;
- relative/path-alias import target boundaries;
- source-file fallback interactions.

That route should still exclude package resolution unless separately approved.

