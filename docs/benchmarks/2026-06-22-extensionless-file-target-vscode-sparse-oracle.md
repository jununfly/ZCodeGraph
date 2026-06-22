# TypeScript Module Resolution Oracle

Generated: 2026-06-22T15:10:50.085Z

## Source

- Project: `/private/tmp/codegraph-corpus/vscode-sparse`
- Profile: `docs/benchmarks/2026-06-22-extensionless-file-target-vscode-sparse.profile.json`
- Data source: `rustCore.moduleResolutionShadowSamples`
- tsconfig/jsconfig: not found, NodeNext defaults used
- Production runtime behavior changed: false
- TypeScript runtime dependency added: false
- Source content included: false

## Summary

- Rows inspected: 300
- Recommended total slice count: 4

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-runtime-builtin-boundary` | 100 |
| `ts-unresolved-package-runtime` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 200 |
| `mismatch` | 100 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- Node/runtime builtin boundary taxonomy
- package/runtime unresolved no-go taxonomy

## Examples

| Delta | Parity | Specifier | TS kind | TS path | File |
| --- | --- | --- | --- | --- | --- |
| `ts-resolves-repo-local-rust-fallback` | `match` | `./dom.js` | `repo-local-source` | `src/vs/base/browser/dom.ts` | `src/vs/base/browser/animatedValue.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `./dom.js` | `repo-local-source` | `src/vs/base/browser/dom.ts` | `src/vs/base/browser/animatedValue.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../common/observable.js` | `repo-local-source` | `src/vs/base/common/observable.ts` | `src/vs/base/browser/animatedValue.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../common/observable.js` | `repo-local-source` | `src/vs/base/common/observable.ts` | `src/vs/base/browser/animatedValue.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../common/observable.js` | `repo-local-source` | `src/vs/base/common/observable.ts` | `src/vs/base/browser/animatedValue.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `./window.js` | `repo-local-source` | `src/vs/base/browser/window.ts` | `src/vs/base/browser/broadcast.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `./window.js` | `repo-local-source` | `src/vs/base/browser/window.ts` | `src/vs/base/browser/broadcast.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../common/errors.js` | `repo-local-source` | `src/vs/base/common/errors.ts` | `src/vs/base/browser/broadcast.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../common/errors.js` | `repo-local-source` | `src/vs/base/common/errors.ts` | `src/vs/base/browser/broadcast.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../common/event.js` | `repo-local-source` | `src/vs/base/common/event.ts` | `src/vs/base/browser/broadcast.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../common/event.js` | `repo-local-source` | `src/vs/base/common/event.ts` | `src/vs/base/browser/broadcast.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../common/lifecycle.js` | `repo-local-source` | `src/vs/base/common/lifecycle.ts` | `src/vs/base/browser/broadcast.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../common/lifecycle.js` | `repo-local-source` | `src/vs/base/common/lifecycle.ts` | `src/vs/base/browser/broadcast.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../common/lifecycle.js` | `repo-local-source` | `src/vs/base/common/lifecycle.ts` | `src/vs/base/browser/broadcast.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `./window.js` | `repo-local-source` | `src/vs/base/browser/window.ts` | `src/vs/base/browser/browser.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `./window.js` | `repo-local-source` | `src/vs/base/browser/window.ts` | `src/vs/base/browser/browser.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `./window.js` | `repo-local-source` | `src/vs/base/browser/window.ts` | `src/vs/base/browser/browser.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../common/event.js` | `repo-local-source` | `src/vs/base/common/event.ts` | `src/vs/base/browser/browser.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `../common/event.js` | `repo-local-source` | `src/vs/base/common/event.ts` | `src/vs/base/browser/browser.ts:0` |
| `ts-resolves-repo-local-rust-fallback` | `match` | `./browser.js` | `repo-local-source` | `src/vs/base/browser/browser.ts` | `src/vs/base/browser/canIUse.ts:0` |

