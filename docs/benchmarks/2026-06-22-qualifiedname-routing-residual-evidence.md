# QualifiedName Routing Residual Evidence

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Baseline:
  `docs/benchmarks/2026-06-22-qualifiedname-routing-residual-baseline.md`
- Issue: #421

## Scope

This artifact records targeted evidence for the `QualifiedName`
candidate-producer on-demand routing semantic residual.

No production code was changed for this evidence run. No full scoreboard or
agent A/B was run.

## Current Repository

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json \
  node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Profile artifact:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json`

Graph-readable status after run:

| Field | Value |
| --- | ---: |
| files | 313 |
| nodes | 16054 |
| edges | 34636 |
| backend | node-sqlite |
| engine | rust-hybrid |

Reference-resolution profile:

| Field | Value |
| --- | ---: |
| `typescriptFinalizationMs` | 31023 |
| `referenceResolutionMs` | 29695 |
| `candidateLookupMs` | 26336 |
| `nameMatcherCandidateLookupDbMs` | 26328 |
| `perReferenceDisambiguationMs` | 97 |

Routing diagnostics:

| Field | Value |
| --- | --- |
| configured | true |
| source | local-config |
| active | true |
| activeShapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| fallbackReason | null |
| mismatchCount | 0 |
| mismatchSamples | empty |
| onDemandLookupCount | 74 |
| `onDemandLookupShapeCounts.QualifiedName` | 21 |

Fallback taxonomy:

| Stage | Reason | Count |
| --- | --- | ---: |
| framework-post-extract | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | typescript-finalization-not-yet-migrated | 1 |
| dynamic-dispatch-synthesis | typescript-finalization-not-yet-migrated | 1 |
| db-maintenance | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | binding-level-symbol-disambiguation-not-yet-rust-owned | 1890 |
| reference-resolution | unsupported-import-form-not-yet-rust-owned | 44 |
| reference-resolution | unresolved-file-level-import-target | 6 |

RSS:

- unavailable reason: this targeted CLI profile did not enable a process-tree
  RSS sampler. RSS is recorded as unavailable rather than inferred.

## VS Code Sparse

Checkout:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Git commit: `4a6e32fc1f0`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json \
  node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Profile artifact:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json`

Graph-readable status after run:

| Field | Value |
| --- | ---: |
| files | 5780 |
| nodes | 327425 |
| edges | 905484 |
| backend | node-sqlite |
| engine | rust-hybrid |

Reference-resolution profile:

| Field | Value |
| --- | ---: |
| `typescriptFinalizationMs` | 316860 |
| `referenceResolutionMs` | 274337 |
| `candidateLookupMs` | 221856 |
| `nameMatcherCandidateLookupDbMs` | 221482 |
| `perReferenceDisambiguationMs` | 14560 |

Routing diagnostics:

| Field | Value |
| --- | --- |
| configured | true |
| source | local-config |
| active | true |
| activeShapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| fallbackReason | null |
| mismatchCount | 0 |
| mismatchSamples | empty |
| onDemandLookupCount | 1308 |
| `onDemandLookupShapeCounts.QualifiedName` | 40 |

Fallback taxonomy:

| Stage | Reason | Count |
| --- | --- | ---: |
| framework-post-extract | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | typescript-finalization-not-yet-migrated | 1 |
| dynamic-dispatch-synthesis | typescript-finalization-not-yet-migrated | 1 |
| db-maintenance | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | binding-level-symbol-disambiguation-not-yet-rust-owned | 28909 |
| reference-resolution | unsupported-import-form-not-yet-rust-owned | 35 |
| reference-resolution | unresolved-file-level-import-target | 5418 |

RSS:

- unavailable reason: this targeted CLI profile did not enable a process-tree
  RSS sampler. RSS is recorded as unavailable rather than inferred.

## Read

`QualifiedName` routing is exercised on both targets:

- current repository: 21 on-demand `QualifiedName` routed lookups;
- VS Code sparse: 40 on-demand `QualifiedName` routed lookups.

Both targets report:

- routing active;
- all expected active shapes visible;
- no routing fallback reason;
- zero routing mismatches;
- graph-readable rust-hybrid status after indexing.

This is enough to decide the `QualifiedName` residual without adding production
behavior. The evidence does not claim a performance improvement. The dominant
remaining profile fields are still broader candidate lookup and TypeScript
finalization/reference-resolution work.

