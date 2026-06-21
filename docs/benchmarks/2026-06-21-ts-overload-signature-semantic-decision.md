# TypeScript Overload/Signature Semantic Decision

Generated: 2026-06-21T08:33:57.344Z

## Inputs

- Taxonomy: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.json`
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
- Database: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- VS Code sparse commit: `4a6e32fc1f0`
- Source files read: none
- Resolver behavior changed: false
- Performance claim: none

## Decision

- Import edge target: runtime/value ESM named import edges should target the implementation declaration only when exactly one clear implementation declaration exists.
- Imported usage edge target: imported runtime/value usage edges should target the same implementation declaration selected for the import edge.
- Overload signature rule: overload signatures without implementation bodies are not runtime implementation targets.
- Metadata sufficiency: insufficient-missing-implementation-declaration-marker.
- Recommended next slice: add implementation-declaration metadata before changing resolver behavior.

## No-Go Rules

- ambient-only overload/signature sets keep fallback.
- .d.ts overload/signature sets keep fallback.
- no-implementation overload/signature sets keep fallback.
- type/value/namespace collisions keep fallback.

## Safe Tie-Break Prerequisites

- all candidates are in the same resolved target file.
- all candidates are runtime/value compatible function declarations.
- candidate metadata exposes hasBody=true or declarationForm=implementation.
- exactly one candidate is marked as the implementation declaration.
- target file is not a .d.ts declaration file.

## Fixture Coverage

- Overload signatures plus one implementation: 0
- Ambient-only or no implementation: 12
- .d.ts overload set: 0
- Type/value namespace collision: 10

## Parallel Tooling

- #375: RSS sampling tooling follow-up; not a blocker for this semantic decision.
