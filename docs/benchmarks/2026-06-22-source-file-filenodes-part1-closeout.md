# Source-File Fallback And FileNodes Part 1 Closeout

Date: 2026-06-22

## Parent

- Issue: #428
- Baseline: `docs/benchmarks/2026-06-22-import-file-completion-map-baseline.md`
- FileNodes audit:
  `docs/benchmarks/2026-06-22-filenodes-routing-residual-audit.md`

## Decision

Decision: `keep`.

FileNodes/source-file fallback is safe to keep as a routed lookup shape, but it
does not independently solve unresolved file-level import targets.

## Evidence

This closeout reuses the PlanB targeted profile artifacts:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json`
- `docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json`

No new VS Code sparse clone was attempted.

Current repo candidate protocol:

| Field | Value |
| --- | --- |
| active shapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| routing fallback reason | null |
| routing mismatch count | 0 |
| `onDemandLookupShapeCounts.FileNodes` | 32 |
| total `lookupShapeCounts.FileNodes` | 1,135 |

VS Code sparse candidate protocol:

| Field | Value |
| --- | --- |
| active shapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| routing fallback reason | null |
| routing mismatch count | 0 |
| `onDemandLookupShapeCounts.FileNodes` | 1,247 |
| total `lookupShapeCounts.FileNodes` | 1,515 |

## Interaction With File-Level Import Target Taxonomy

FileNodes lookup is a mechanism. Unresolved file-level import target taxonomy is
a semantic outcome.

The same VS Code sparse profile family shows:

| Field | Count |
| --- | ---: |
| `onDemandLookupShapeCounts.FileNodes` | 1,247 |
| `relative/file-node-not-found` | 309 |
| `relative/target-not-found` | 4,871 |

Interpretation:

- FileNodes routing is active and has no mismatch in the available evidence;
- unresolved file target fallbacks still exist;
- therefore FileNodes should stay routed, while unresolved target categories
  remain no-go or future implementation candidates depending on narrower
  diagnostics.

## RSS

RSS was not re-sampled for this closeout. Existing measurement sidecars for the
same evidence family record RSS as unavailable because process-list access is
sandboxed.

## Boundary

No package resolution expansion is introduced.

This closeout does not change:

- package imports;
- Node/runtime builtins;
- package `exports`/`imports`;
- `node_modules`;
- TypeScript full `moduleResolution`;
- target selection semantics;
- source-order or pick-first behavior.

## Closeout

#428 closes as `keep` for FileNodes/source-file fallback routing.

The unresolved file-level import target interaction remains classified by #425:

- `relative/file-node-not-found`: no-go until narrower pre-cleanup diagnostics;
- `relative/target-not-found`: no-go until narrower pre-cleanup diagnostics.
