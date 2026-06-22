# Node Runtime And Third-Party Boundary Taxonomy Closeout

Date: 2026-06-22

## Parent

- Issue: #434
- Oracle closeout:
  `docs/benchmarks/2026-06-22-ts-module-resolution-oracle-closeout.md`

## Decision

Decision: `keep`.

The TypeScript module-resolution oracle provides the package/runtime boundary
taxonomy needed for this slice without adding production third-party package
resolution or `node_modules` graph expansion.

## Taxonomy

Implemented taxonomy buckets:

| Bucket | Meaning |
| --- | --- |
| `ts-runtime-builtin-boundary` | TypeScript treats the specifier as a Node/runtime builtin |
| `ts-resolves-third-party-boundary` | TypeScript resolves the specifier to an external package target |
| `ts-unresolved-package-runtime` | TypeScript cannot resolve the sampled package/runtime specifier |
| `ts-resolves-repo-local-rust-fallback` | TypeScript resolves to repo-local source, making it a potential implementation candidate |

Resolved kind examples:

| Kind | Meaning |
| --- | --- |
| `node-runtime-builtin` | runtime builtin such as `node:fs` |
| `third-party-package` | external package root |
| `third-party-package-subpath` | external package subpath |
| `repo-local-package` | repo-local package/self-name target |
| `repo-local-package-subpath` | repo-local package subpath target |
| `unresolved` | unresolved by the TypeScript compiler API |

## Evidence

Current repo:

| Delta bucket | Count |
| --- | ---: |
| `ts-resolves-third-party-boundary` | 74 |
| `ts-runtime-builtin-boundary` | 26 |

VS Code sparse:

| Delta bucket | Count |
| --- | ---: |
| `ts-runtime-builtin-boundary` | 85 |
| `ts-unresolved-package-runtime` | 15 |

## Deterministic Coverage

Command:

```bash
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
```

Result:

- passed, 1 test.

The fixture covers:

- Node/runtime builtin;
- third-party package;
- third-party package subpath;
- repo-local package/self-name;
- repo-local package subpath;
- unresolved package/runtime fallback;
- privacy boundary excluding source content.

## Boundary

No default third-party package or `node_modules` deep resolution is added.

No production resolver behavior changes were required for this slice. The
taxonomy is produced as benchmark/evidence artifact data.

## Closeout

#434 closes as `keep`.

Remaining third-party and runtime boundaries should not be treated as repo-local
graph gaps. Future implementation work should focus only on repo-local buckets
selected by oracle evidence.
