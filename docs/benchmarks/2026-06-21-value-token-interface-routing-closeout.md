# Value Token Interface Routing Closeout

Date: 2026-06-21

## Parent

- Plan: `docs/plans/2026-06-21-rust-hybrid-value-token-interface-routing.md`
- Issues: #403, #404, #405, #406
- Tracker: #165
- Predecessor decision:
  `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-semantic-closeout-decision.md`

## Decision

Conclusion: `keep-with-caveat`.

The guarded routing mechanism is safe enough to keep because deterministic
fixtures prove the intended semantics and VS Code sparse produces Rust-owned
`rust-esm-value-token-interface` edges for the service-token pattern.

The caveat is important: this does not close the whole
`value-token-plus-interface` bucket. The residual capped taxonomy sample still
contains many `value-token-plus-interface` fallbacks, mostly contexts that this
plan intentionally left as fallback. The next plan should not treat this slice
as a completed burndown of the collision family.

## What Changed

Rust ESM named import/export finalization now routes exactly this guarded shape:

- import form is named value import;
- direct export lookup returns exactly one `constant` and one `interface`;
- the source file has visible runtime usage, including an imported-symbol usage
  reference or decorator-token syntax such as `@IService`;
- the import edge targets the value token candidate;
- imported-symbol usage edges target the value token candidate when usage refs
  exist.

The route remains fail-closed for:

- `import type`;
- mixed `type` specifiers in a named import list;
- default imports;
- namespace imports;
- package/runtime imports;
- re-export/barrel chains;
- unknown usage context;
- type-position-only usage.

## Evidence

Artifacts:

- Profile summary:
  `docs/benchmarks/2026-06-21-value-token-interface-routing.profile.json`
- Current repo taxonomy:
  `docs/benchmarks/2026-06-21-value-token-interface-current-taxonomy.md`
- VS Code sparse taxonomy:
  `docs/benchmarks/2026-06-21-value-token-interface-vscode-sparse-taxonomy.md`

Deterministic fixture:

- `__tests__/rust-index-engine-cli.test.ts`
  `routes guarded value-token plus interface imports only when value usage is visible`
- Covers JSX-style value usage, decorator-token usage, `import type`, named
  import with type-position-only usage, and unknown usage.

Current repo targeted evidence:

- Source: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph`
- Files: 307
- Nodes: 15,663
- Edges: 33,436
- `rust-esm-value-token-interface` edges: 0
- Residual direct-export candidate-multiple taxonomy rows inspected: 0

VS Code sparse targeted evidence:

- Source: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`
- Files: 5,780
- Nodes: 327,425
- Edges: 905,484
- `rust-esm-value-token-interface` edges: 10,235
- Residual direct-export candidate-multiple taxonomy rows inspected: 100
- Residual subtype counts:
  - `value-token-plus-interface`: 80
  - `function-overload-signature`: 17
  - `ambient-declaration-merge`: 3

RSS:

- Direct CLI profile evidence did not collect RSS.
- The comparison profile path remains sandbox-limited for RSS because process
  list access is unavailable in this environment.

## Interpretation

This slice validates the mechanism, not a full bucket burndown.

The useful part is that the guarded service-token route generates many
Rust-owned value-token import edges on the large VS Code sparse checkout without
changing default/type-only/namespace/package/re-export behavior. The safety
guard is also covered by fixture assertions that type-position-only usage keeps
fallback.

The noisy part is the residual capped taxonomy: after routing, the first 100
candidate-multiple fallback samples still show `value-token-plus-interface` as
the largest subtype. That means this plan should not be used to claim the
collision family is solved. The remaining samples need a separate decision:
either add richer usage context for more service-token cases, or move to the
next planned tail-boundary work instead.

## Follow-Up

Update #165 with this closeout and continue to the TypeScript
finalization/reference-resolution tail boundary plan.
