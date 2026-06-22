# TypeScript Module Resolution Oracle

Generated: 2026-06-22T06:08:52.402Z

## Source

- Project: `/private/tmp/codegraph-corpus/vscode-sparse`
- Profile: `docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json`
- Data source: `rustCore.esmNamedImportExportFallbackSamples filtered to package/runtime reasons`
- tsconfig/jsconfig: not found, NodeNext defaults used
- Production runtime behavior changed: false
- TypeScript runtime dependency added: false
- Source content included: false

## Summary

- Rows inspected: 100
- Recommended total slice count: 3

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-runtime-builtin-boundary` | 85 |
| `ts-unresolved-package-runtime` | 15 |

### Recommended Slice Goals

- Node/runtime builtin boundary taxonomy
- package/runtime unresolved no-go taxonomy

## Examples

| Delta | Specifier | TS kind | TS path | File |
| --- | --- | --- | --- | --- |
| `ts-unresolved-package-runtime` | `trusted-types/lib/index.js` | `unresolved` |  | `src/vs/base/browser/dompurify/dompurify.d.ts:3` |
| `ts-unresolved-package-runtime` | `trusted-types/lib/index.js` | `unresolved` |  | `src/vs/base/browser/dompurify/dompurify.d.ts:3` |
| `ts-unresolved-package-runtime` | `trusted-types/lib/index.js` | `unresolved` |  | `src/vs/base/browser/dompurify/dompurify.d.ts:3` |
| `ts-runtime-builtin-boundary` | `crypto` | `node-runtime-builtin` |  | `src/vs/base/node/crypto.ts:6` |
| `ts-runtime-builtin-boundary` | `fs` | `node-runtime-builtin` |  | `src/vs/base/node/crypto.ts:7` |
| `ts-runtime-builtin-boundary` | `os` | `node-runtime-builtin` |  | `src/vs/base/node/id.ts:6` |
| `ts-runtime-builtin-boundary` | `os` | `node-runtime-builtin` |  | `src/vs/base/node/id.ts:6` |
| `ts-runtime-builtin-boundary` | `os` | `node-runtime-builtin` |  | `src/vs/base/node/macAddress.ts:6` |
| `ts-runtime-builtin-boundary` | `os` | `node-runtime-builtin` |  | `src/vs/base/node/macAddress.ts:6` |
| `ts-runtime-builtin-boundary` | `fs` | `node-runtime-builtin` |  | `src/vs/base/node/nls.ts:7` |
| `ts-runtime-builtin-boundary` | `fs` | `node-runtime-builtin` |  | `src/vs/base/node/nls.ts:7` |
| `ts-runtime-builtin-boundary` | `stream` | `node-runtime-builtin` |  | `src/vs/base/node/nodeStreams.ts:5` |
| `ts-runtime-builtin-boundary` | `stream` | `node-runtime-builtin` |  | `src/vs/base/node/nodeStreams.ts:5` |
| `ts-runtime-builtin-boundary` | `fs` | `node-runtime-builtin` |  | `src/vs/base/node/osDisplayProtocolInfo.ts:6` |
| `ts-runtime-builtin-boundary` | `fs` | `node-runtime-builtin` |  | `src/vs/base/node/osDisplayProtocolInfo.ts:6` |
| `ts-runtime-builtin-boundary` | `fs` | `node-runtime-builtin` |  | `src/vs/base/node/osDisplayProtocolInfo.ts:6` |
| `ts-runtime-builtin-boundary` | `fs` | `node-runtime-builtin` |  | `src/vs/base/node/osReleaseInfo.ts:6` |
| `ts-runtime-builtin-boundary` | `fs` | `node-runtime-builtin` |  | `src/vs/base/node/osReleaseInfo.ts:6` |
| `ts-runtime-builtin-boundary` | `fs` | `node-runtime-builtin` |  | `src/vs/base/node/osReleaseInfo.ts:6` |
| `ts-runtime-builtin-boundary` | `readline` | `node-runtime-builtin` |  | `src/vs/base/node/osReleaseInfo.ts:7` |

