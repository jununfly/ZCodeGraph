# Declaration Target Relationship Diagnostics Closeout

Date: 2026-06-22

## Scope

Issue: #459

Roadmap node:

```text
1-5-4-1. declaration target relationship diagnostics
```

This slice adds profile diagnostics for TypeScript declaration targets resolved
by Rust-native module resolution. It does not change default graph edge targets
and does not implement runtime sibling pairing.

## Implementation Summary

Profile module resolution samples can now include a
`declarationTargetRelationship` object when the resolved path is a TypeScript
declaration file.

The diagnostic is intentionally narrow and profile-artifact-only:

- `targetKind`
- `runtimeSiblingStatus`
- capped repo-relative `runtimeSiblingCandidates`
- `candidateCount`
- `truncated`

Aggregate counts are exposed under:

```text
moduleResolutionDeclarationTargetRelationshipCounts
```

The taxonomy is:

- `noRuntimeSibling`
- `singleRuntimeSibling`
- `multipleRuntimeSiblings`
- `skippedExternalOrPackageBoundary`

Runtime sibling inference is restricted to repo-local same-basename sibling
files. It does not follow package maps, declaration maps, source maps,
`typesVersions`, generated declaration roots, or `node_modules`.

## Evidence

### Deterministic Tests

Command:

```text
cargo test -p zcodegraph-core declaration_target_relationship
```

Result: pass.

Coverage:

- `.d.ts` declaration target with no runtime sibling;
- `.d.mts` declaration target with one runtime sibling;
- `.d.cts` declaration target with multiple runtime siblings;
- profile sample diagnostics;
- aggregate counts;
- privacy-safe repo-relative candidates.

Related regression command:

```text
cargo test -p zcodegraph-core module_resolution
```

Result: pass.

### Current Repo Profile Smoke

Command:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-22-declaration-target-current-repo.profile.json node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Artifact:

```text
docs/benchmarks/2026-06-22-declaration-target-current-repo.profile.json
```

Observed summary:

```json
{
  "moduleResolutionShadowDecisionRefs": 2922,
  "moduleResolutionDeclarationTargetRelationshipCounts": {
    "noRuntimeSibling": 36
  },
  "declarationRelationshipSampleCount": 36
}
```

### VS Code Sparse Profile Smoke

Corpus:

```text
/private/tmp/codegraph-corpus/vscode-sparse
```

Command:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-22-declaration-target-vscode-sparse.profile.json node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Artifact:

```text
docs/benchmarks/2026-06-22-declaration-target-vscode-sparse.profile.json
```

Observed summary:

```json
{
  "moduleResolutionShadowDecisionRefs": 168840,
  "moduleResolutionDeclarationTargetRelationshipCounts": {},
  "declarationRelationshipSampleCount": 0
}
```

Interpretation: the VS Code sparse checkout smoke ran successfully and produced
module resolution profile diagnostics, but this corpus/profile run did not
contain declaration-target relationship hits. That is an acceptable result for
this diagnostics slice because deterministic fixtures and the current repo
profile prove the new fields and aggregate path.

## Decision

Keep.

The slice produces useful declaration/runtime relationship evidence without
changing graph behavior. `1-5-4-1` is complete.

`1-5-4. declaration/runtime target relationship` remains partial. The remaining
work is:

```text
1-5-4-2. safe runtime sibling pairing decision/implementation
```

That future work must decide whether and how a declaration target may be safely
paired with a runtime sibling. This closeout does not claim that behavior.
