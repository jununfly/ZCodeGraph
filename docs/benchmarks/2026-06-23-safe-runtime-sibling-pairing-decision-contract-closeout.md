# Safe Runtime Sibling Pairing Decision Contract Closeout

Date: 2026-06-23

## Scope

Issue: #460

Roadmap node:

```text
1-5-4-2. safe runtime sibling pairing decision contract
```

This slice adds profile-only pairing decisions for TypeScript declaration
targets. It does not change graph edge targets and does not implement guarded
runtime sibling graph writes.

## Implementation Summary

Declaration target relationship diagnostics now include a `pairingDecision`
object for declaration target samples.

Eligible decisions include a repo-relative `runtimeTarget`:

```json
{
  "status": "eligibleSingleRuntimeSibling",
  "runtimeTarget": "src/foo.ts",
  "reason": "same-package-single-runtime-sibling"
}
```

Blocked decisions omit `runtimeTarget`:

```json
{
  "status": "blockedNoRuntimeSibling",
  "reason": "no-runtime-sibling"
}
```

Pairing decision aggregate counts are exposed under:

```text
moduleResolutionDeclarationRuntimePairingDecisionCounts
```

The eligibility rule is conservative:

- exactly one repo-local same-basename runtime sibling;
- source file, declaration target, and runtime sibling share the same nearest
  `package.json` boundary;
- if no package boundary exists, project root is the boundary;
- no package maps, declaration maps, source maps, `typesVersions`, generated
  declaration roots, or `node_modules` are followed.

## Evidence

### Deterministic Tests

Command:

```text
cargo test -p zcodegraph-core declaration_target_relationship
```

Result: pass.

Coverage:

- eligible single same-package runtime sibling;
- blocked no runtime sibling;
- blocked multiple runtime siblings;
- blocked cross-package-boundary sibling;
- profile sample `pairingDecision` output;
- aggregate pairing decision counts;
- graph behavior remains declaration-target preserving.

Related regression command:

```text
cargo test -p zcodegraph-core module_resolution
```

Result: pass.

### Current Repo Profile Smoke

Command:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-23-safe-runtime-sibling-pairing-current-repo.profile.json node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Artifact:

```text
docs/benchmarks/2026-06-23-safe-runtime-sibling-pairing-current-repo.profile.json
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
  "pairingDecisionSampleCount": 36
}
```

Interpretation: current repo declaration targets have explicit blocked pairing
decisions because no runtime sibling candidates exist. This is useful trend
evidence and avoids pretending runtime graph writes are safe here.

## Decision

Keep.

`1-5-4-2` is complete. The parent node remains partial because graph behavior
has not changed.

Remaining roadmap work:

```text
1-5-4-3. guarded runtime sibling graph write
```

That later slice must decide whether eligible pairing decisions are strong
enough to write graph edges to runtime sibling targets.
