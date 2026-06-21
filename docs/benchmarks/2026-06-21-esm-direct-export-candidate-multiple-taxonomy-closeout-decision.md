# ESM Direct Export Candidate-Multiple Taxonomy Closeout

Date: 2026-06-21

## Decision

Keep the ESM direct export candidate-multiple taxonomy.

This slice adds a DB-backed, privacy-safe classifier for direct export
candidate-multiple fallback samples. It does not change resolver behavior,
candidate selection, graph edges, database schema, public CLI behavior, or MCP
output.

The next resolver slice should **not** immediately add a candidate-multiple
tie-break. The VS Code sparse taxonomy points at function overload/signature
patterns as the dominant sampled subtype, which needs a prerequisite semantic
decision before routing any candidate into the main path.

## Scope Completed

- Added `scripts/rust-esm-candidate-multiple-taxonomy.mjs`.
- Added deterministic fixture coverage for:
  - `interface-class-merge`
  - `function-overload-signature`
  - `type-value-namespace-collision`
  - `duplicate-extraction`
  - unavailable DB metadata
- The classifier reads:
  - Rust profile fallback samples;
  - SQLite node metadata for candidate rows.
- The classifier does not read source files.
- Artifacts do not include source snippets, source lines, export-list text,
  candidate source, or full source content.

## Deterministic Verification

Commands:

```bash
npx vitest run __tests__/rust-esm-candidate-multiple-taxonomy.test.ts
npx vitest run __tests__/rust-esm-fallback-taxonomy.test.ts __tests__/rust-esm-candidate-multiple-taxonomy.test.ts
```

Results:

- Passed.

## Current Repo Evidence

Artifacts:

- `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-current-taxonomy.json`
- `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-current-taxonomy.md`
- `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-current-taxonomy.measurement.json`

Inputs:

- Profile:
  `docs/benchmarks/2026-06-21-esm-direct-export-burndown-current.profile.json`
- Database:
  `.zcodegraph/zcodegraph.db`

Observed:

| Metric | Value |
| --- | ---: |
| Rows inspected | 0 |

Summary:

- No direct export candidate-multiple samples were present in the current repo
  profile.
- This makes the current repo useful only as an artifact-stability check for
  this slice.

Measurement sidecar:

- Wall time: 51ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifacts:

- `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.json`
- `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.md`
- `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.measurement.json`

Inputs:

- Profile:
  `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
- Database:
  `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`

Important scope note:

- The taxonomy classifies bounded profile samples, not the full raw
  `direct-export-candidate-multiple` population.
- The profile reported `direct-export-candidate-multiple`: 16,384.
- The classifier inspected 100 capped direct export candidate-multiple samples.

Sampled subtype distribution:

| Subtype | Count | Decision posture |
| --- | ---: | --- |
| `function-overload-signature` | 85 | prerequisite-first |
| `type-value-namespace-collision` | 13 | no-go-keep-fallback |
| `ambient-declaration-merge` | 2 | prerequisite-first |

Measurement sidecar:

- Wall time: 453ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

## Tie-Break Decision

Do not implement a candidate-multiple resolver tie-break as the immediate next
slice.

Bounded tie-break candidates found in this evidence:

- None in the VS Code sparse sampled taxonomy.

Prerequisite-first subtypes:

- `function-overload-signature`
- `ambient-declaration-merge`

No-go subtypes:

- `type-value-namespace-collision`

Reasoning:

- Function overload/signature rows dominate the sample. Selecting one candidate
  requires deciding whether import references should target overload
  signatures, implementation declarations, or some synthesized canonical
  declaration. That is a TypeScript semantic decision, not a safe metadata-only
  tie-break.
- Type/value namespace collisions must remain fallback unless the resolver has
  enough reference-context information to distinguish type-position and
  value-position use.
- The sampled taxonomy did not show duplicate extraction as a meaningful
  immediate win.

## Closeout

This slice should close as completed.

Recommended next slice:

```text
TypeScript overload/signature candidate-multiple semantic decision.
```

Suggested boundary for that slice:

- inspect function overload/signature candidate metadata more deeply;
- decide whether imported value usage should point to implementation
  declarations, overload signatures, or stay unresolved;
- keep type/value namespace collisions out of scope;
- do not route any candidate without deterministic fixtures proving the target
  semantics.

No-go:

- Do not add broad source-order or pick-first tie-break behavior.
- Do not resolve type/value namespace collisions without reference-context
  semantics.
- Do not claim performance improvement from this taxonomy slice.
