# TypeScript Module Resolution Oracle

Generated: 2026-06-22T06:08:50.967Z

## Source

- Project: `.`
- Profile: `docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json`
- Data source: `rustCore.esmNamedImportExportFallbackSamples filtered to package/runtime reasons`
- tsconfig/jsconfig: `tsconfig.json`
- Production runtime behavior changed: false
- TypeScript runtime dependency added: false
- Source content included: false

## Summary

- Rows inspected: 100
- Recommended total slice count: 3

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-third-party-boundary` | 74 |
| `ts-runtime-builtin-boundary` | 26 |

### Recommended Slice Goals

- third-party package boundary taxonomy
- Node/runtime builtin boundary taxonomy

## Examples

| Delta | Specifier | TS kind | TS path | File |
| --- | --- | --- | --- | --- |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:16` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:16` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:16` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:16` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:16` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/access-models.test.ts:16` |
| `ts-runtime-builtin-boundary` | `fs` | `node-runtime-builtin` |  | `__tests__/access-models.test.ts:17` |
| `ts-runtime-builtin-boundary` | `path` | `node-runtime-builtin` |  | `__tests__/access-models.test.ts:18` |
| `ts-runtime-builtin-boundary` | `os` | `node-runtime-builtin` |  | `__tests__/access-models.test.ts:19` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:27` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:27` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:27` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:27` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:27` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:27` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/adaptive-explore-sizing.test.ts:27` |
| `ts-runtime-builtin-boundary` | `fs` | `node-runtime-builtin` |  | `__tests__/adaptive-explore-sizing.test.ts:28` |
| `ts-runtime-builtin-boundary` | `path` | `node-runtime-builtin` |  | `__tests__/adaptive-explore-sizing.test.ts:29` |
| `ts-runtime-builtin-boundary` | `os` | `node-runtime-builtin` |  | `__tests__/adaptive-explore-sizing.test.ts:30` |
| `ts-resolves-third-party-boundary` | `vitest` | `third-party-package` | `node_modules/vitest/dist/index.d.ts` | `__tests__/agent-eval-probes.test.ts:1` |

