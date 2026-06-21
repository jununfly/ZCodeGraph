# Rust-Hybrid TypeScript Overload/Signature Semantic Decision

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Direct export candidate-multiple taxonomy:
  `docs/plans/2026-06-21-rust-hybrid-esm-direct-export-candidate-multiple-taxonomy.md`
- Direct export candidate-multiple closeout:
  `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-taxonomy-closeout-decision.md`
- Parallel tooling follow-up: #375

## Context

The direct export candidate-multiple taxonomy classified capped VS Code sparse
samples and found that `function-overload-signature` dominates the sampled
candidate-multiple surface:

- `function-overload-signature`: 85/100
- `type-value-namespace-collision`: 13/100
- `ambient-declaration-merge`: 2/100

The closeout explicitly rejected a broad source-order or pick-first tie-break.
Before routing any candidate-multiple case into the Rust resolver main path, we
need a semantic decision for TypeScript overload/signature sets.

## Goal

Decide the graph semantics for TypeScript overload/signature candidate-multiple
cases.

The default proposed semantic is:

- runtime/value named import edges should point to the implementation
  declaration when one clear implementation declaration exists;
- imported usage edges should also point to that implementation declaration;
- overload signatures without an implementation body should not be selected as
  runtime implementation targets.

This plan does not implement that behavior. It records the decision boundary
and determines whether existing metadata is sufficient for a future
implementation slice.

## Non-Goals

- Do not change resolver behavior.
- Do not add a candidate-multiple tie-break.
- Do not change extractor behavior.
- Do not add database schema fields.
- Do not read source file contents.
- Do not implement type/value namespace collision resolution.
- Do not implement default, namespace, package/runtime, type-only, or multi-hop
  re-export semantics.
- Do not run a new full VS Code sparse index.
- Do not claim performance improvement.

## Scope

### Semantic decision

Decide and document:

- import edge target semantics for overload/signature sets;
- imported usage edge target semantics for overload/signature sets;
- the safe tie-break prerequisites for implementation declaration selection;
- no-go behavior for ambient-only, `.d.ts`, and no-implementation overload
  sets;
- whether current candidate metadata is enough to distinguish implementation
  declarations from signatures.

### Evidence

Use existing artifacts from the candidate-multiple taxonomy:

- VS Code sparse profile:
  `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
- VS Code sparse candidate-multiple taxonomy:
  `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.json`
- VS Code sparse DB:
  `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`

VS Code sparse commit:

- `4a6e32fc1f0`

No new full index is required unless artifacts are missing or inconsistent. If
artifacts are missing, mark the issue as needing prerequisite evidence rather
than cloning or rerunning a large corpus automatically.

### #375 relationship

#375 tracks improving RSS sampling without `ps` process-list access. It is a
parallel tooling follow-up and does not block this semantic decision. Current
evidence may continue to record `rssUnavailableReason`.

## Validation

Required:

- fixture or artifact-level tests that encode the semantic decision for:
  - overload signatures plus one implementation declaration;
  - ambient-only / no implementation overload set;
  - `.d.ts` overload set;
  - type/value namespace collision as no-go.
- decision artifact that states whether existing metadata can support the
  future implementation.
- tracker updates for #295, #296, and #165.

## Issue Sequence

1. #376 Add overload/signature semantic decision fixtures.
2. #377 Write VS Code sparse sampled overload/signature decision artifact.
3. #378 Close out overload/signature semantic decision and tracker updates.
