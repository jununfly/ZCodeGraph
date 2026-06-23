# Import/File Completion Map And Fallback Taxonomy Baseline

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Issue: #424
- Plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- PlanB closeout:
  `docs/benchmarks/2026-06-22-resolver-semantic-planb-final-closeout.md`

## Decision

Decision: `keep-baseline`.

Part 1 is bounded to repo-local source import/file resolver completion.
Package/runtime resolver work is explicitly assigned to Part 2 and is not
treated as solved by this baseline.

The first implementation/closeout target is:

```text
repo-local file-level import target fallback
```

Rationale:

- it is the direct owner of unresolved repo-local file target taxonomy;
- it explains how FileNodes/source-file fallback should be read;
- it is prerequisite context for direct ESM named import/export and one-hop
  barrel behavior;
- existing evidence already separates repo-local target gaps from package,
  unsupported, type-only, and broad binding-disambiguation boundaries.

## Boundary Map

| Bucket | Part | Current handling |
| --- | --- | --- |
| relative source imports | Part 1 | supported, with residual target-not-found/file-node-not-found taxonomy |
| tsconfig/jsconfig paths aliases | Part 1 | supported in current repo fixtures; no VS Code sparse paths-alias hits in current evidence |
| same-file export specifiers | Part 1 | supported for exactly-one local declaration candidates |
| direct ESM named import/export | Part 1 | supported for bounded repo-local source targets |
| one-hop direct re-export/barrel | Part 1 | supported for bounded repo-local final leaf targets |
| FileNodes/source-file fallback | Part 1 | mechanically safe, semantically tied to file/import resolver closeout |
| package imports | Part 2 | not solved by Part 1 |
| Node/runtime builtins | Part 2 | not solved by Part 1 |
| package `exports`/`imports` | Part 2 | not solved by Part 1 |
| `node_modules` package graph | Part 2 | not solved by Part 1 |
| TypeScript full `moduleResolution` | Part 2 | not solved by Part 1 |
| default/namespace/type-only imports | outside Part 1 by default | remains fallback unless separately approved |
| broad disambiguation/source-order tie-break | disallowed | no source-order or pick-first behavior |

## Baseline Evidence

Current repo profile:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json`

VS Code sparse profile:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json`
- Corpus: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit recorded by prior evidence: `4a6e32fc1f0`

No new VS Code sparse clone was attempted.

## Current Repo Taxonomy

Rust-core file/import target profile:

| Metric | Count |
| --- | ---: |
| `importPathAliasResolvedRefs` | 662 |
| `importPathAliasResolvedBySource.relative` | 645 |
| `importPathAliasResolvedBySource.tsconfigPaths` | 17 |
| `importPathAliasFallbackRefs` | 2,591 |
| `importPathAliasFallbackBySource.relative` | 1 |
| `importPathAliasFallbackBySource.binding` | 2,541 |
| `importPathAliasFallbackBySource.unsupported` | 49 |

Fallback sample counts:

| Reason | Count | Baseline bucket |
| --- | ---: | --- |
| `relative/file-node-not-found` | 1 | repo-local residual |
| `binding/binding-level-symbol-disambiguation` | 2,541 | resolver semantic residual, not file-target Part 1 |
| `unsupported/unsupported-import-form` | 49 | unsupported import form |

ESM named import/export taxonomy:

| Reason | Count | Baseline bucket |
| --- | ---: | --- |
| `direct-export-candidate-zero` | 49 | repo-local direct named residual |
| `import-edge-target-not-found` | 7 | repo-local file/import residual |
| `package-or-runtime-binding` | 1,277 | Part 2 |
| `type-only-import` | 228 | outside Part 1 by default |
| `unsupported-import-shape` | 329 | unsupported |

Candidate protocol routing:

| Field | Value |
| --- | --- |
| active shapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| routing fallback reason | null |
| routing mismatch count | 0 |
| `onDemandLookupShapeCounts.FileNodes` | 32 |

## VS Code Sparse Taxonomy

Rust-core file/import target profile:

| Metric | Count |
| --- | ---: |
| `importPathAliasResolvedRefs` | 59,042 |
| `importPathAliasResolvedBySource.relative` | 59,042 |
| `importPathAliasResolvedBySource.tsconfigPaths` | 0 |
| `importPathAliasFallbackRefs` | 111,373 |
| `importPathAliasFallbackBySource.relative` | 5,180 |
| `importPathAliasFallbackBySource.binding` | 105,920 |
| `importPathAliasFallbackBySource.unsupported` | 273 |

Fallback sample counts:

| Reason | Count | Baseline bucket |
| --- | ---: | --- |
| `relative/file-node-not-found` | 309 | repo-local residual |
| `relative/target-not-found` | 4,871 | repo-local residual |
| `binding/binding-level-symbol-disambiguation` | 105,920 | resolver semantic residual, not file-target Part 1 |
| `unsupported/unsupported-import-form` | 273 | unsupported import form |

ESM named import/export taxonomy:

| Reason | Count | Baseline bucket |
| --- | ---: | --- |
| `direct-export-candidate-multiple` | 5,254 | needs semantic decision |
| `direct-export-candidate-zero` | 10,864 | repo-local direct named residual |
| `same-file-export-specifier-candidate-zero` | 58 | repo-local direct named residual |
| `import-edge-target-not-found` | 5,783 | repo-local file/import residual |
| `reexport-leaf-candidate-zero` | 123 | repo-local one-hop residual |
| `reexport-leaf-candidate-multiple` | 20 | needs semantic decision |
| `package-or-runtime-binding` | 1,965 | Part 2 |
| `type-only-import` | 2,759 | outside Part 1 by default |
| `unsupported-import-shape` | 2,083 | unsupported |

Candidate protocol routing:

| Field | Value |
| --- | --- |
| active shapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| routing fallback reason | null |
| routing mismatch count | 0 |
| `onDemandLookupShapeCounts.FileNodes` | 1,247 |

## RSS

RSS was not re-sampled for this baseline. The reused targeted profile family has
existing measurement sidecars that record RSS as unavailable due sandboxed
process-list access, for example:

```text
RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)
```

## Closeout

This baseline satisfies #424:

- Part 1 versus Part 2 is frozen;
- package/runtime resolution is explicitly Part 2;
- current repo and VS Code sparse evidence are recorded from existing targeted
  profiles;
- fallback taxonomy separates repo-local, package/runtime, unsupported, and
  unknown/needs-architecture buckets;
- the first target is repo-local file-level import target fallback.
