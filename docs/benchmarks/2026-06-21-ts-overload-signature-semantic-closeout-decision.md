# TypeScript Overload/Signature Semantic Closeout Decision

Date: 2026-06-21

## Inputs

- Plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Semantic decision artifact:
  `docs/benchmarks/2026-06-21-ts-overload-signature-semantic-decision.md`
- Semantic decision JSON:
  `docs/benchmarks/2026-06-21-ts-overload-signature-semantic-decision.json`
- Fixture coverage:
  `__tests__/ts-overload-signature-semantic-decision.test.ts`
- VS Code sparse taxonomy:
  `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.json`
- VS Code sparse profile:
  `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
- VS Code sparse DB:
  `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- VS Code sparse commit:
  `4a6e32fc1f0`
- Parallel RSS tooling follow-up:
  #375

## Decision

Runtime/value ESM named import edges should target the TypeScript function
implementation declaration only when there is exactly one clear implementation
declaration. Imported runtime/value usage edges should target the same
implementation declaration selected for the import edge.

Overload signatures are not runtime implementation targets. A source-order or
pick-first tie-break is rejected.

## Safe Tie-Break Prerequisites

- All candidates are in the same resolved target file.
- All candidates are runtime/value compatible function declarations.
- Candidate metadata exposes `hasBody=true` or
  `declarationForm=implementation`.
- Exactly one candidate is marked as the implementation declaration.
- Target file is not a `.d.ts` declaration file.

## No-Go Rules

- Ambient-only overload/signature sets keep fallback.
- `.d.ts` overload/signature sets keep fallback.
- No-implementation overload/signature sets keep fallback.
- Type/value/namespace collisions keep fallback.

## Metadata Sufficiency

Current VS Code sparse taxonomy/profile artifacts are insufficient for a
production resolver behavior change because candidate metadata records line
ranges and kinds but does not reliably distinguish overload signatures from the
implementation declaration.

Required metadata for the next implementation slice:

- `hasBody`, or
- `declarationForm` with an `implementation` value.

No source files were read for this decision, and no performance improvement is
claimed.

## #375 Relationship

#375 is a parallel tooling follow-up for RSS sampling without `ps` process-list
access. It improves diagnostic reliability but does not block this
overload/signature semantic decision.

## Recommendation

Next implementation slice: add implementation-declaration metadata to Rust
TypeScript extraction/profile diagnostics before changing candidate-multiple
resolver behavior. After that metadata exists, implement a bounded
candidate-multiple tie-break guarded by the safe prerequisites above.
