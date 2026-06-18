# Rust-Hybrid Phase 3 Gin Examples Smoke Evidence

## Summary

Phase 3 validates that the default `rust-hybrid` full-index path can complete a mixed-language real Go repository by writing Rust-owned files first, appending TypeScript fallback files, and running one TypeScript shell finalization pass.

Result: pass.

## Environment

- Date: 2026-06-18
- Host: macOS development machine
- Node: 26.0.0 with `CODEGRAPH_ALLOW_UNSAFE_NODE=1` for local smoke only
- Rust core: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core`
- ZCodeGraph CLI: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js`

## Repository

- Repository: `https://github.com/gin-gonic/examples.git`
- Local path: `/private/tmp/codegraph-corpus/gin-examples`
- Commit: `179495dfc053bc23b8ba6f9dc8554c904188d6b4`
- Full repository file count on disk at smoke time: 166

## Commands

```bash
npm run build
cargo build --package zcodegraph-core
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_RUST_CORE_BINARY=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core \
  node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/gin-examples --force --quiet

CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  status /private/tmp/codegraph-corpus/gin-examples --json
```

The index command exited `0`. The Node 26 safety banner was printed because the local smoke used an explicit override; it did not block execution.

## Status Evidence

Status JSON after the full index reported:

```json
{
  "fileCount": 62,
  "nodeCount": 565,
  "edgeCount": 762,
  "languages": ["go", "javascript", "yaml"],
  "index": {
    "engine": "rust-hybrid",
    "engineVersion": "0.1.0",
    "hybrid": {
      "phase": "phase-3-typescript-fallback-writes",
      "engineByLanguage": {
        "yaml": "typescript",
        "go": "rust",
        "javascript": "rust"
      },
      "engineByFileCount": {
        "typescript": 5,
        "rust": 57
      },
      "fallbackByLanguage": {
        "yaml": 5
      },
      "fallbackFileCount": 5,
      "fallbackState": "degraded",
      "fallbackReasonTaxonomy": {
        "language-level-typescript-fallback": 5
      },
      "pendingFallbacks": ["rust-owned-parse-gap"],
      "skippedGeneratedByLanguage": {
        "go": 2
      }
    }
  }
}
```

This proves:

- Go files are assigned to Rust.
- JavaScript files are assigned to Rust-owned indexing.
- YAML files are appended through TypeScript fallback.
- Generated Go files are counted in status metadata.
- Mixed-language fallback is visible as degraded rather than hidden.

## Route-To-Handler Probe

Probe target:

- Route: `POST /book`
- File: `form-binding/main.go`
- Handler: `bookingHandler`

Probe result:

```json
{
  "ok": true,
  "route": {
    "name": "POST /book",
    "kind": "route",
    "filePath": "form-binding/main.go",
    "line": 18
  },
  "handler": {
    "name": "bookingHandler",
    "kind": "function",
    "filePath": "form-binding/main.go",
    "line": 22
  },
  "referenceEdge": {
    "kind": "references",
    "metadata": {
      "confidence": 0.9,
      "resolvedBy": "exact-match"
    }
  }
}
```

The deterministic Go route-to-handler slice still passes after mixed-language fallback append.

## Known Gaps

- Rust-owned per-file parse/extraction fallback to TypeScript remains pending.
- SDK defaults and SDK engine options remain out of scope.
- Doctor diagnostic bundles remain out of scope.
- README and release messaging remain out of scope.
- Performance gates remain out of scope for this phase.
- First-user release readiness is not claimed by this evidence.
