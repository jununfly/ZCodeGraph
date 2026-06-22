# TypeScript Module Resolution Oracle

Generated: 2026-06-22T12:58:13.973Z

## Source

- Project: `.`
- Profile: `docs/benchmarks/2026-06-22-package-map-condition-set-current.profile.json`
- Data source: `rustCore.moduleResolutionShadowSamples`
- tsconfig/jsconfig: `tsconfig.json`
- Production runtime behavior changed: false
- TypeScript runtime dependency added: false
- Source content included: false

## Summary

- Rows inspected: 336
- Recommended total slice count: 5

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-paths-alias` | 36 |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-resolves-third-party-boundary` | 100 |
| `ts-runtime-builtin-boundary` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 336 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- paths/rootDirs parity slice + oracle taxonomy correction
- third-party package boundary taxonomy
- Node/runtime builtin boundary taxonomy

## Examples

| Delta | Parity | Specifier | TS kind | TS path | File |
| --- | --- | --- | --- | --- | --- |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:0` |
| `ts-runtime-builtin-boundary` | `match` | `fs` | `node-runtime-builtin` |  | `__tests__/access-models.test.ts:0` |
| `ts-runtime-builtin-boundary` | `match` | `path` | `node-runtime-builtin` |  | `__tests__/access-models.test.ts:0` |
| `ts-runtime-builtin-boundary` | `match` | `os` | `node-runtime-builtin` |  | `__tests__/access-models.test.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../src/db` | `repo-local-source` | `src/db/index.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../src/db` | `repo-local-source` | `src/db/index.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../src/db/queries` | `repo-local-source` | `src/db/queries.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../src/db/queries` | `repo-local-source` | `src/db/queries.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../src/db/access-models` | `repo-local-source` | `src/db/access-models.ts` | `__tests__/access-models.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:0` |
| `ts-resolves-third-party-boundary` | `match` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:0` |

