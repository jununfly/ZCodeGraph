# Rust-Native Module Resolution Shadow Foundation Closeout

Date: 2026-06-22

## Scope

This closeout covers the first implementation slice from:

- `docs/plans/2026-06-22-rust-native-typescript-module-resolution-roadmap.md`
- #436
- #437
- #438
- #439

The slice implemented a Rust-native TypeScript moduleResolution diagnostics
foundation. It did not claim full TypeScript moduleResolution completion.

## Decision

Keep.

The Rust core now emits shadow-only moduleResolution decision records in the
index profile. The records are typed, bounded, privacy-safe, and can be
compared against the TypeScript compiler API oracle as evidence tooling.

Default graph behavior did not change:

- no moduleResolution shadow edges are written;
- no default node or edge schema change was introduced;
- no TypeScript runtime dependency was added to production Rust indexing;
- no `node_modules` graph expansion was added.

## Implemented

- Rust profile fields:
  - `moduleResolutionShadowDecisionRefs`
  - `moduleResolutionShadowDecisionCounts`
  - `moduleResolutionShadowParityCounts`
  - `moduleResolutionShadowSamples`
  - `moduleResolutionShadowSampleCap`
- Rust typed records:
  - `ModuleResolutionCompilerOptionsSummary`
  - `ModuleResolutionRequest`
  - `ModuleResolutionDecisionRecord`
- Shadow decision categories:
  - `relative`
  - `tsconfigPaths`
  - `workspacePackage`
  - `conventionalAlias`
  - `nodeRuntimeBuiltin`
  - `packageOrRuntime`
  - `binding`
  - `unsupported`
- TypeScript compiler API oracle support for
  `rustCore.moduleResolutionShadowSamples`.
- Parity statuses in oracle artifacts:
  - `match`
  - `mismatch`
  - `no-oracle`
  - `unknown`

## Current Repo Evidence

Generated profile, evidence, status, and oracle artifacts were absorbed into:

- `docs/benchmarks/2026-06-23-rust-native-module-resolution-oracle-profile-cleanup.md`

Rust profile summary:

| Field | Value |
| --- | ---: |
| `moduleResolutionShadowDecisionRefs` | 2894 |
| sampled decisions | 336 |
| `relative` | 1516 |
| `tsconfigPaths` | 36 |
| `nodeRuntimeBuiltin` | 573 |
| `packageOrRuntime` | 769 |

Oracle summary:

| Field | Value |
| --- | ---: |
| rows inspected | 336 |
| parity `match` | 336 |
| parity `mismatch` | 0 |

RSS:

- unavailable reason:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`

Status:

- current repo status was readable after indexing;
- current repo index engine: `rust-hybrid`;
- current repo status reports TypeScript fallback for non-Rust-owned supported
  files, which is pre-existing rust-hybrid behavior and not changed by this
  slice.

## VS Code Sparse Evidence

Generated evidence and status artifacts were absorbed into:

- `docs/benchmarks/2026-06-23-rust-native-module-resolution-oracle-profile-cleanup.md`

The checkout existed at:

```text
/private/tmp/codegraph-corpus/vscode-sparse
```

The bounded profile smoke was attempted but did not complete inside the local
evidence window. It was manually interrupted and recorded as unavailable rather
than treated as passing.

Status remained readable for the existing VS Code sparse index. That status
reflects the previously available index, not a completed profile from this
slice.

## Validation

Commands:

```bash
cargo test -p zcodegraph-core
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
npm run build
cargo build -p zcodegraph-core
```

Targeted profile/status:

Targeted profile/status commands are represented by the consolidated cleanup
artifact above.

## Lessons

The first oracle run exposed a diagnostic-quality bug: non-import binding
references were being treated as package specifiers. The implementation was
fixed to skip binding-shaped refs when no import/export line module specifier
can be recovered. This is exactly why the shadow-only foundation should exist
before graph-writing behavior.

The Rust profile still records `parityStatus: "unknown"` because production
Rust does not call the TypeScript oracle. The external oracle artifact is the
source of parity evidence for now.

## Next Exploit Slice

Recommended next main-subtree slice:

```text
repo-local package/self-name moduleResolution slice
```

Reason:

- current repo oracle saw repo-local source/package decisions in the sampled
  set;
- the roadmap identifies repo-local package/self-name resolution as part of the
  main sufficiency path;
- this is still repo-local and does not require `node_modules` graph expansion.

Secondary follow-ups:

- add distinct statement-level counts beside per-reference counts if sample
  duplication becomes noisy;
- add bounded VS Code sparse rerun on a Node 22 environment or a longer
  evidence window;
- keep third-party package and Node runtime builtin work as boundary taxonomy
  unless a later plan promotes graph-writing behavior.
