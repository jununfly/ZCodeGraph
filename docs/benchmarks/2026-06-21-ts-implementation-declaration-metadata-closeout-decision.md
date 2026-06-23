# TypeScript Implementation-Declaration Metadata Closeout Decision

Date: 2026-06-21

## Inputs

- Plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Current repo profile:
  `docs/benchmarks/2026-06-21-ts-implementation-declaration-current.profile.json`
- Current repo taxonomy:
  `docs/benchmarks/2026-06-21-ts-implementation-declaration-current-taxonomy.json`
- Current repo decision:
  `docs/benchmarks/2026-06-21-ts-implementation-declaration-current-decision.md`
- VS Code sparse profile:
  `docs/benchmarks/2026-06-21-ts-implementation-declaration-vscode-sparse.profile.json`
- VS Code sparse taxonomy:
  `docs/benchmarks/2026-06-21-ts-implementation-declaration-vscode-sparse-taxonomy.json`
- VS Code sparse decision:
  `docs/benchmarks/2026-06-21-ts-implementation-declaration-vscode-sparse-decision.md`
- VS Code sparse checkout:
  `/private/tmp/codegraph-corpus/vscode-sparse`
- VS Code sparse commit:
  `4a6e32fc1f0`

## What Changed

Rust ESM named import/export candidate-multiple diagnostics now expose
implementation-declaration metadata for candidate line ranges:

- `hasBody`
- `declarationForm`
- `metadataSource`

The metadata is diagnostic-only. It is not persisted in SQLite schema, is not
encoded into user-facing node fields, and is not consumed by production resolver
routing in this slice.

## Evidence

Current repo evidence produced no direct export candidate-multiple samples, so
it is not sufficient to judge overload/signature tie-break readiness.

VS Code sparse evidence inspected 100 capped candidate-multiple samples:

- `function-overload-signature`: 85
- `type-value-namespace-collision`: 13
- `ambient-declaration-merge`: 2

The enriched VS Code sparse decision found:

- overload/signature samples with exactly one implementation marker: 7
- ambient-only or no-implementation samples: 2
- type/value namespace collision examples: 10

## Privacy

The taxonomy and decision scripts do not read source files. The Rust profile
diagnostic enrichment may read target files for bounded line/range inference,
but artifacts record only classification fields and line ranges. They do not
record source snippets, source lines, or inferred source text.

## Decision

The metadata prerequisite is satisfied for a bounded next slice: production
resolver behavior may attempt a guarded overload/signature candidate-multiple
tie-break only when all safe prerequisites hold.

Safe prerequisites:

- all candidates are in the same resolved target file;
- all candidates are runtime/value compatible function declarations;
- candidate metadata exposes `hasBody=true` or
  `declarationForm=implementation`;
- exactly one candidate is marked as the implementation declaration;
- target file is not a `.d.ts` declaration file.

## No-Go Rules

- Ambient-only overload/signature sets keep fallback.
- `.d.ts` overload/signature sets keep fallback.
- No-implementation overload/signature sets keep fallback.
- Type/value/namespace collisions keep fallback.
- Unknown or unavailable declaration metadata keeps fallback.

## Recommendation

Next implementation slice: implement a bounded production resolver tie-break for
TypeScript overload/signature candidate-multiple cases, guarded by the safe
prerequisites above. Do not broaden into type/value namespace collision,
ambient-only declarations, `.d.ts` declarations, default imports, namespace
imports, package resolution, or multi-hop re-export semantics.
