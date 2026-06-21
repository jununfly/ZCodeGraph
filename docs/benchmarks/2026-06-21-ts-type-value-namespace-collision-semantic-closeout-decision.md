# Type/Value/Namespace Collision Semantic Closeout

Date: 2026-06-21

## Scope

This closeout covers the final semantic-decision slice under #295:

- #386 Add type/value/namespace collision semantic fixtures
- #387 Extend candidate-multiple taxonomy with type/value/namespace collision subtypes
- #388 Generate type/value/namespace collision evidence on current repo and VS Code sparse
- #389 Write type/value/namespace collision semantic decision closeout

The slice does not change production resolver behavior.

## Decision

`value-token-plus-interface` should become the next production routing
candidate, but not under #295.

The next implementation plan should be separate and should route only the
guarded service-token-style shape:

- candidate shape is exactly `constant-interface`;
- import form is `named-value-import`;
- target candidates are in the same resolved target file;
- runtime/value edges target the value token candidate, not the interface;
- type-only imports keep fallback;
- unknown context keeps fallback until usage metadata is sufficient.

## Evidence

Current repo:

- Taxonomy: `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-current-taxonomy.json`
- Decision: `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-current-decision.md`
- Result: no direct export candidate-multiple samples; useful as deterministic
  no-regression/tooling evidence only.

VS Code sparse:

- Corpus: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`
- Taxonomy: `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-vscode-sparse-taxonomy.json`
- Decision: `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-vscode-sparse-decision.md`

VS Code sparse result:

- Rows inspected: 100
- `value-token-plus-interface`: 81
- `function-overload-signature`: 17
- `ambient-declaration-merge`: 2
- Source files read for bounded syntax metadata: 23

For the 81 `value-token-plus-interface` samples:

- import form: `named-value-import` = 81
- candidate shape: `constant-interface` = 81
- usage/context hints:
  - `decorator-token` = 63
  - `type-position` = 7
  - `unknown` = 11

## No-Go Boundaries

Keep fallback for:

- `class-plus-interface`;
- `type-alias-plus-value`;
- `enum-or-namespace-plus-type`;
- `unknown-collision`;
- type-only imports;
- default imports;
- namespace imports;
- package imports;
- one-hop re-export;
- multi-hop barrel chains.

## PRD Boundary

This is the final evidence slice under #295. The evidence identifies a plausible
successor implementation candidate, but #295 should not expand into that
implementation.

After this closeout, #295 should close with successor work moved out to a new
plan or tracker.
