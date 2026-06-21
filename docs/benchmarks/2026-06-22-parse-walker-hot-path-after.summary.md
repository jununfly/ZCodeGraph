# Parse Extraction Evidence Summary

Source profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-22-parse-walker-hot-path-after.profile.json`

## Corpus Summary

| Corpus | Commit | parseExtractionMs | Dominant parse bucket | Dominant ms | Rust peak RSS bytes | Readiness |
|---|---:|---:|---|---:|---:|---|
| zcodegraph | 71b6d74 | 1717 | parseAstExtractionMs | 995 | unavailable: RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM) | ready |
| vscode-sparse | 4a6e32fc1f0 | 32964 | parseAstExtractionMs | 18891 | unavailable: RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM) | ready |

## Per-Language Parse Distribution

| Corpus | Language | Files | parseExtractionMs | treeSitterMs | astExtractionMs |
|---|---|---:|---:|---:|---:|
| zcodegraph | javascript | 4 | 8 | 2 | 6 |
| zcodegraph | typescript | 304 | 1709 | 431 | 989 |
| vscode-sparse | javascript | 33 | 290 | 116 | 158 |
| vscode-sparse | typescript | 5747 | 32674 | 7993 | 18733 |

## Decision Sufficiency

- zcodegraph: ready
- vscode-sparse: ready
