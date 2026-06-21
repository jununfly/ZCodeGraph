# Parse Extraction Evidence Summary

Source profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-parse-ast-extraction-optimization-after.profile.json`

## Corpus Summary

| Corpus | Commit | parseExtractionMs | Dominant parse bucket | Dominant ms | Rust peak RSS bytes | Readiness |
|---|---:|---:|---|---:|---:|---|
| zcodegraph | 78d2799 | 1179 | parseAstExtractionMs | 485 | unavailable: RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM) | ready |
| vscode-sparse | 4a6e32fc1f0 | 23157 | parseAstExtractionMs | 9436 | unavailable: RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM) | ready |

## Per-Language Parse Distribution

| Corpus | Language | Files | parseExtractionMs | treeSitterMs | astExtractionMs |
|---|---|---:|---:|---:|---:|
| zcodegraph | javascript | 4 | 6 | 2 | 2 |
| zcodegraph | typescript | 303 | 1173 | 422 | 483 |
| vscode-sparse | javascript | 33 | 206 | 116 | 74 |
| vscode-sparse | typescript | 5747 | 22951 | 7922 | 9362 |

## Decision Sufficiency

- zcodegraph: ready
- vscode-sparse: ready
