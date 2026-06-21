# Rust-Hybrid Type/Value/Namespace Collision Semantic Decision

Date: 2026-06-21

## Parent

- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Architecture/performance PRD issue: #295
- Resolver migration decision plan:
  `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- Resolver migration tracker: #296
- Optimization tracker: #165
- Previous closeout:
  `docs/benchmarks/2026-06-21-ts-overload-implementation-tie-break-closeout-decision.md`

## Context

The guarded TypeScript overload implementation tie-break is now implemented and
validated with deterministic current-repo and VS Code sparse evidence. That
slice resolved 3766 overload implementation refs on the VS Code sparse checkout
at commit `4a6e32fc1f0`.

After that route, the remaining capped candidate-multiple fallback sample shape
is dominated by `type-value-namespace-collision`:

- `type-value-namespace-collision`: 81
- `function-overload-signature`: 17
- `ambient-declaration-merge`: 2

The current taxonomy treats `type-value-namespace-collision` as one no-go class.
That is too coarse for the next resolver migration decision. Some cases may be
service-token-style runtime values paired with interfaces, while others may be
true TypeScript type/value/namespace ambiguity that should keep fallback.

## Goal

Classify TypeScript type/value/namespace collision candidate-multiple fallbacks
with bounded syntax metadata and deterministic corpus evidence, then decide
whether a safe next production routing slice exists.

This is a semantic decision and evidence slice. It must not change production
resolver behavior.

## Decision Frame

The evidence should classify collision samples into the smallest set of
decision-useful subtypes:

- `value-token-plus-interface`
- `class-plus-interface`
- `enum-or-namespace-plus-type`
- `type-alias-plus-value`
- `unknown-collision`

The decision artifact should use a three-state recommendation per relevant
subtype:

- `candidate-for-next-routing-slice`
- `needs-more-metadata`
- `no-go-keep-fallback`

`value-token-plus-interface` is a probable next production-routing candidate,
but this plan must not pre-decide that outcome. The corpus evidence should
decide whether it is safe enough to plan the next implementation slice.

## Source Metadata Boundary

The taxonomy tooling may read local corpus source files only to collect bounded
syntax metadata. Evidence artifacts must not include source snippets or source
lines.

Allowed source-derived metadata includes:

- import form:
  - `import-type`
  - `named-value-import`
  - `mixed-import`
  - `export-specifier`
  - `unknown`
- usage/context hint:
  - `decorator-token`
  - `constructor-parameter`
  - `runtime-expression`
  - `type-position`
  - `unknown`
- candidate shape:
  - `constant-interface`
  - `class-interface`
  - `enum-type`
  - `type-alias-value`
  - `other`

Artifacts may include sanitized paths, language, extension, line/column,
candidate kinds, counts, hashes if useful, and taxonomy labels. They must not
include source text.

## Non-Goals

- Do not change production resolver behavior.
- Do not add a production routing tie-break.
- Do not change SQLite schema.
- Do not change CLI, SDK, MCP, status, or doctor behavior.
- Do not update README metrics.
- Do not run agent A/B.
- Do not run multi-run performance benchmarking.
- Do not build a complete TypeScript symbol-space model.
- Do not resolve default imports, namespace imports, package imports, one-hop
  re-export, or multi-hop barrel chains.
- Do not automatically clone the VS Code sparse corpus.

## Validation

Required:

- deterministic fixtures for collision subtype classification;
- deterministic no-change coverage proving current resolver behavior keeps
  collision cases on fallback;
- taxonomy tooling that emits subtype counts and bounded syntax metadata without
  source snippets;
- current repo profile/taxonomy/decision evidence;
- VS Code sparse profile/taxonomy/decision evidence when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout;
- if VS Code sparse is unavailable, record a setup blocker rather than cloning;
- final closeout that decides whether any subtype is a safe next production
  routing candidate;
- tracker updates for #295, #296, and #165.

Expected VS Code sparse corpus:

- Path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Previously verified commit: `4a6e32fc1f0`

## Issue Sequence

1. Add type/value/namespace collision semantic fixtures.
2. Extend candidate-multiple taxonomy with collision subtypes.
3. Generate current repo and VS Code sparse collision evidence.
4. Write collision semantic decision closeout.
