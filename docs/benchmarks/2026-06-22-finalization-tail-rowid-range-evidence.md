# Finalization Tail Rowid-Range Cleanup Evidence

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Candidate selection:
  `docs/benchmarks/2026-06-22-finalization-tail-plan-a-candidate-selection.md`
- Issues: #416, #417, #418, #419

## Candidate

The implemented candidate changes batched intentionally-unresolved cleanup to
use the existing rowid-range cleanup helper.

This preserves semantic target selection. References are still resolved or
left unresolved by the same TypeScript finalization logic before cleanup runs.
The change only affects how terminal intentionally-unresolved rows are deleted
from `unresolved_refs`.

## Deterministic Test Evidence

Command:

```bash
npx vitest run __tests__/resolution.test.ts -t "batched persistence cleans resolved"
```

Result:

- passed;
- verified resolved refs and intentionally-unresolved refs are both deleted;
- verified resolved cleanup row count remains `505`;
- verified intentionally-unresolved cleanup row count remains `1`;
- verified both terminal cleanup categories use rowid-range deletion instead of
  direct rowid-list deletion.

Additional related checks:

```bash
npx vitest run __tests__/db-perf.test.ts __tests__/access-models.test.ts
npm run build
```

Result:

- passed.

## Current Repository Evidence

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-22-finalization-tail-rowid-range-current.profile.json \
  node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Profile artifact:

- `docs/benchmarks/2026-06-22-finalization-tail-rowid-range-current.profile.json`

Graph status after run:

| Field | Value |
| --- | ---: |
| files | 313 |
| nodes | 16054 |
| edges | 34636 |
| backend | node-sqlite |
| engine | rust-hybrid |

Tail profile:

| Field | Value |
| --- | ---: |
| `typescriptFinalizationMs` | 30323 |
| `referenceResolutionMs` | 28981 |
| `edgeMaterializationMs` | 16 |
| `edgeWriteMs` | 98 |
| `edgeWriteDbMs` | 98 |
| `unresolvedCleanupMs` | 167 |
| `unresolvedCleanupDbMs` | 167 |
| `resolvedCleanupMs` | 103 |
| `resolvedCleanupDbMs` | 103 |
| `resolvedCleanupRowCount` | 13226 |
| `intentionallyUnresolvedCleanupMs` | 64 |
| `intentionallyUnresolvedCleanupDbMs` | 64 |
| `intentionallyUnresolvedCleanupRowCount` | 27350 |

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

- unavailable reason:
  `/usr/bin/time -l` could not complete RSS reporting in this sandbox:
  `sysctl kern.clockrate: Operation not permitted`.

## VS Code Sparse Evidence

Checkout:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Git commit: `4a6e32fc1f0`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-22-finalization-tail-rowid-range-vscode-sparse.profile.json \
  node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Profile artifact:

- `docs/benchmarks/2026-06-22-finalization-tail-rowid-range-vscode-sparse.profile.json`

Graph status after run:

| Field | Value |
| --- | ---: |
| files | 5780 |
| nodes | 327425 |
| edges | 905484 |
| backend | node-sqlite |
| engine | rust-hybrid |

Tail profile:

| Field | Value |
| --- | ---: |
| `typescriptFinalizationMs` | 308756 |
| `referenceResolutionMs` | 269055 |
| `edgeMaterializationMs` | 444 |
| `edgeWriteMs` | 7281 |
| `edgeWriteDbMs` | 7281 |
| `unresolvedCleanupMs` | 7478 |
| `unresolvedCleanupDbMs` | 7478 |
| `resolvedCleanupMs` | 5146 |
| `resolvedCleanupDbMs` | 5146 |
| `resolvedCleanupRowCount` | 340512 |
| `intentionallyUnresolvedCleanupMs` | 2332 |
| `intentionallyUnresolvedCleanupDbMs` | 2332 |
| `intentionallyUnresolvedCleanupRowCount` | 155983 |

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

- unavailable reason:
  targeted CLI profile did not enable a process-tree RSS sampler for this run.
  RSS remains unavailable rather than inferred.

## Read

The implementation is behavior-preserving and makes resolved and
intentionally-unresolved terminal cleanup use the same rowid-range mechanics.

The performance trend is not strong enough to treat this as a major standalone
optimization. On VS Code sparse, intentionally-unresolved cleanup remains a
visible sub-bucket (`2332ms`) but the whole finalization profile is dominated by
reference-resolution candidate lookup and dynamic-dispatch synthesis. The value
of the candidate is primarily boundary simplification and keeping cleanup
mechanics consistent for later finalization-tail migration.

