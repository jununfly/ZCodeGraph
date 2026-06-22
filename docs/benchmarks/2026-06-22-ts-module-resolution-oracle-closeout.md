# TypeScript Module Resolution Oracle Closeout

Date: 2026-06-22

## Parent

- Issue: #431
- Part 2 tracker: #430
- Plan:
  `docs/plans/2026-06-22-rust-hybrid-import-file-resolver-completion-part2-typescript-module-resolution.md`

## Decision

Decision: `keep`.

The TypeScript compiler API oracle is implemented as benchmark/evidence tooling
only. It does not change production indexing behavior and does not move
`typescript` into runtime dependencies.

## Artifacts

Current repo:

- `docs/benchmarks/2026-06-22-ts-module-resolution-oracle-current.json`
- `docs/benchmarks/2026-06-22-ts-module-resolution-oracle-current.md`

VS Code sparse:

- `docs/benchmarks/2026-06-22-ts-module-resolution-oracle-vscode-sparse.json`
- `docs/benchmarks/2026-06-22-ts-module-resolution-oracle-vscode-sparse.md`
- Corpus: `/private/tmp/codegraph-corpus/vscode-sparse`

No automatic clone was attempted.

## Current Repo Findings

Rows inspected: 100.

| Delta bucket | Count |
| --- | ---: |
| `ts-resolves-third-party-boundary` | 74 |
| `ts-runtime-builtin-boundary` | 26 |

Recommended slice goals:

- third-party package boundary taxonomy;
- Node/runtime builtin boundary taxonomy.

Recommended total slice count from the oracle: 3.

Graph-readable status:

| Field | Value |
| --- | ---: |
| files | 313 |
| nodes | 16,054 |
| edges | 34,636 |

## VS Code Sparse Findings

Rows inspected: 100.

| Delta bucket | Count |
| --- | ---: |
| `ts-runtime-builtin-boundary` | 85 |
| `ts-unresolved-package-runtime` | 15 |

Recommended slice goals:

- Node/runtime builtin boundary taxonomy;
- package/runtime unresolved no-go taxonomy.

Recommended total slice count from the oracle: 3.

Graph-readable status:

| Field | Value |
| --- | ---: |
| files | 5,780 |
| nodes | 327,425 |
| edges | 905,484 |

## Privacy Boundary

The oracle artifacts include:

- repo-relative source file path;
- language;
- line/column;
- import specifier;
- Rust current fallback reason;
- TypeScript resolved kind/path;
- repo-local status;
- delta bucket;
- recommended implementation slice.

They do not include source content, source slices, full source lines, candidate
source text, or private absolute paths beyond the documented VS Code sparse
corpus root.

## Validation

Command:

```bash
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
```

Result:

- passed, 1 test.

## Closeout

#431 closes as `keep`.

The oracle did not select a repo-local package/self-name or package
`exports`/`imports` implementation bucket in the current sampled evidence.
That drives #432 and #433 to no-go unless later evidence expands the sample set.
