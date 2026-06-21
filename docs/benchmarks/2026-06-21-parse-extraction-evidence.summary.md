# Parse Extraction Evidence Summary

Source profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-parse-extraction-evidence.profile.json`

## Corpus Summary

| Corpus | Commit | parseExtractionMs | Dominant parse bucket | Dominant ms | Rust peak RSS bytes | Readiness |
|---|---:|---:|---|---:|---:|---|
| zcodegraph | e3b9395 | 1174 | parseAstExtractionMs | 482 | unavailable: RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM) | ready |
| vscode-sparse | 4a6e32fc1f0 | 23298 | parseAstExtractionMs | 9465 | unavailable: RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM) | ready |

## Per-Language Parse Distribution

| Corpus | Language | Files | parseExtractionMs | treeSitterMs | astExtractionMs |
|---|---|---:|---:|---:|---:|
| zcodegraph | javascript | 4 | 6 | 2 | 2 |
| zcodegraph | typescript | 303 | 1168 | 419 | 480 |
| vscode-sparse | javascript | 33 | 210 | 117 | 75 |
| vscode-sparse | typescript | 5747 | 23088 | 7925 | 9390 |

## Decision Sufficiency

- zcodegraph: ready
- vscode-sparse: ready
