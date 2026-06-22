# Guarded Runtime Sibling Graph Write Closeout

Date: 2026-06-23

## Scope

Issue: #461

Roadmap node:

```text
1-5-4-3. guarded runtime sibling graph write
```

This slice completes the bounded `1-5. File target semantics` route for
repo-local declaration/runtime target relationship handling.

## Implementation Summary

File-level import graph writing now consumes declaration/runtime pairing
decisions.

Behavior:

- `eligibleSingleRuntimeSibling` rewrites the file-level import edge to the
  runtime sibling file node;
- eligible rewrites write only the runtime sibling edge, not both declaration
  and runtime edges;
- blocked pairing decisions keep the declaration target;
- missing declaration/runtime file nodes fail closed and record skipped
  diagnostics;
- ESM named symbol edges, export edges, re-export edges, SQLite schema, and
  MCP/API behavior are unchanged.

Declaration/runtime specific edge-write diagnostics are exposed in profile
artifacts:

```text
moduleResolutionDeclarationRuntimeEdgeWriteAttemptedRefs
moduleResolutionDeclarationRuntimeEdgeWriteWrittenRefs
moduleResolutionDeclarationRuntimeEdgeWriteSkippedRefs
moduleResolutionDeclarationRuntimeEdgeWriteSkippedCounts
```

## Evidence

### Deterministic Tests

Command:

```text
cargo test -p zcodegraph-core declaration_target_relationship
cargo test -p zcodegraph-core declaration_runtime
```

Result: pass.

Coverage:

- eligible declaration target writes the file-level import edge to the runtime
  sibling;
- blocked no-sibling declaration target keeps the declaration edge target;
- blocked multiple-runtime-sibling declaration target keeps the declaration
  edge target;
- blocked cross-package-boundary declaration target keeps the declaration edge
  target;
- missing runtime file node fails closed with `runtime-file-node-missing`;
- profile JSON exposes declaration/runtime edge-write counts.

Related regression command:

```text
cargo test -p zcodegraph-core module_resolution
```

Result: pass.

### Current Repo Profile Smoke

Command:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-23-guarded-runtime-sibling-graph-write-current-repo.profile.json node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Artifact:

```text
docs/benchmarks/2026-06-23-guarded-runtime-sibling-graph-write-current-repo.profile.json
```

Observed summary:

```json
{
  "moduleResolutionShadowDecisionRefs": 2922,
  "moduleResolutionDeclarationTargetRelationshipCounts": {
    "noRuntimeSibling": 36
  },
  "moduleResolutionDeclarationRuntimePairingDecisionCounts": {
    "blockedNoRuntimeSibling": 36
  },
  "moduleResolutionDeclarationRuntimeEdgeWrite": {
    "attempted": 17,
    "written": 0,
    "skipped": 17,
    "skippedCounts": {
      "pairing-not-eligible": 17
    }
  }
}
```

Interpretation: current repo has declaration targets but no eligible runtime
sibling writes. The graph-write path correctly fails closed.

## Decision

Keep.

`1-5-4-3` is complete. Because `1-5-1`, `1-5-2`, `1-5-3`, and `1-5-4` are now
complete, `1-5. File target semantics` is complete under its bounded repo-local
file-target scope.

This does not complete the main subtree. `1-6` parity confidence and `1-7`
guarded graph writing still have open items.
