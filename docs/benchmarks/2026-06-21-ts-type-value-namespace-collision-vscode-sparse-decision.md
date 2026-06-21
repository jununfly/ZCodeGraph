# Type/Value/Namespace Collision Semantic Decision - VS Code Sparse

Generated: 2026-06-21T11:10:00.000Z

## Inputs

- Taxonomy: `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-vscode-sparse-taxonomy.json`
- Profile: `docs/benchmarks/2026-06-21-ts-overload-implementation-vscode-sparse.profile.json`
- Database: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- Source root: `/private/tmp/codegraph-corpus/vscode-sparse`
- VS Code sparse commit: `4a6e32fc1f0`
- Source files read for bounded syntax metadata: 23
- Resolver behavior changed: false
- Performance claim: none

## Evidence

- Rows inspected: 100
- `value-token-plus-interface`: 81
- `function-overload-signature`: 17
- `ambient-declaration-merge`: 2
- Overload implementation resolved refs from previous slice: 3766

`value-token-plus-interface` is the dominant remaining collision subtype. In
the capped sample, all 81 collision samples have:

- import form: `named-value-import`
- candidate shape: `constant-interface`

Bounded usage/context hints for those 81 samples:

- `decorator-token`: 63
- `type-position`: 7
- `unknown`: 11

Artifacts do not include source snippets or source lines.

## Decision

`value-token-plus-interface` is a candidate for the next production routing
slice.

That next slice must be separate from this PRD closeout and must keep strict
guards:

- candidate shape is exactly `constant-interface`;
- import form is `named-value-import`;
- target candidates are in the same resolved target file;
- runtime/value edges target the value token candidate, not the interface;
- type-only imports keep fallback;
- unknown context keeps fallback until usage metadata is sufficient.

## No-Go Boundaries

Keep fallback for:

- `class-plus-interface`;
- `type-alias-plus-value`;
- `enum-or-namespace-plus-type`;
- `unknown-collision`;
- default imports;
- namespace imports;
- package imports;
- one-hop re-export;
- multi-hop barrel chains.

No production resolver behavior changed in this decision slice.
