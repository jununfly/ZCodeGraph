# TypeScript Overload Implementation Tie-Break Closeout

Date: 2026-06-21

## Scope

This closeout covers the bounded TypeScript overload implementation tie-break
from `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`.

The change is production routing for Rust ESM named import/export resolution,
default enabled only when a candidate-multiple set has exactly one safe
TypeScript implementation declaration.

## Decision

Keep guarded overload implementation routing enabled.

The VS Code sparse evidence shows the mechanism works on a large real TypeScript
corpus: the tie-break resolved 3766 import or imported-usage refs through
`rust-esm-named-import-export-overload-implementation`, while the remaining
candidate-multiple sample distribution shifted away from overload signatures.

This is not a performance claim. No agent A/B and no multi-run benchmark were
run. The evidence is deterministic profile/taxonomy evidence only.

## Evidence

### Current repo

Artifacts:

- Profile: `docs/benchmarks/2026-06-21-ts-overload-implementation-current.profile.json`
- Taxonomy: `docs/benchmarks/2026-06-21-ts-overload-implementation-current-taxonomy.json`
- Decision: `docs/benchmarks/2026-06-21-ts-overload-implementation-current-decision.md`

Result:

- Candidate-multiple samples inspected: 0
- Overload implementation resolved refs: 0
- Interpretation: current repo has no direct export candidate-multiple samples
  for this slice, so it is useful as a deterministic no-regression run but not
  as positive corpus evidence.

### VS Code sparse checkout

Corpus:

- Path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifacts:

- Profile: `docs/benchmarks/2026-06-21-ts-overload-implementation-vscode-sparse.profile.json`
- Taxonomy: `docs/benchmarks/2026-06-21-ts-overload-implementation-vscode-sparse-taxonomy.json`
- Decision: `docs/benchmarks/2026-06-21-ts-overload-implementation-vscode-sparse-decision.md`

Result after routing:

- Candidate-multiple samples inspected: 100
- `function-overload-signature`: 17
- `type-value-namespace-collision`: 81
- `ambient-declaration-merge`: 2
- Overload implementation resolved refs: 3766

Before/after comparison against the prior metadata-only artifact
`docs/benchmarks/2026-06-21-ts-implementation-declaration-vscode-sparse-taxonomy.json`:

- `function-overload-signature`: 85 -> 17 among capped remaining samples
- `type-value-namespace-collision`: 13 -> 81 among capped remaining samples
- `ambient-declaration-merge`: 2 -> 2 among capped remaining samples

Interpretation: the guarded overload implementation route reduced the sampled
overload-signature fallback class, and exposed type/value/namespace collision as
the next dominant remaining candidate-multiple subtype. Because samples are
capped, the subtype percentages describe the remaining sampled fallback shape,
not absolute corpus-wide totals.

## Guard Boundaries

The route remains intentionally narrow:

- target file must not be `.d.ts`, `.d.mts`, or `.d.cts`;
- candidates must be same-file function candidates;
- candidate metadata must expose implementation identity through `hasBody=true`
  or `declarationForm=implementation`;
- exactly one candidate may be the implementation declaration;
- import edges and imported usage edges must target that same implementation
  candidate;
- edge metadata must use
  `resolvedBy: "rust-esm-named-import-export-overload-implementation"`.

## No-Go Boundaries

Keep fallback for:

- ambient-only overload/signature sets;
- declaration-file overload/signature sets;
- no-implementation overload/signature sets;
- type/value/namespace collisions;
- unknown or unavailable implementation metadata;
- one-hop re-export;
- default imports;
- namespace imports;
- package/runtime imports;
- multi-hop barrel chains.

## Next Recommendation

Do not broaden overload implementation routing.

The next resolver migration slice should investigate the remaining
`type-value-namespace-collision` candidate-multiple class as its own bounded
semantic decision, with separate fixtures and evidence. That class has different
risk than overload implementation selection and should not be hidden inside this
route.
