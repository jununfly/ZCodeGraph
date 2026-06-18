# Rust-Hybrid Phase 2 Gin Smoke Evidence

## Context

Phase 2 adds Rust-owned Go extraction and a narrow Gin route-handler slice.

Plan:

- `docs/plans/2026-06-18-rust-hybrid-phase-2-go-extraction-v1.md`

Issues:

- #234
- #235
- #236
- #237
- #238

This is deterministic evidence only. It is not an agent A/B run and does not claim first-user release readiness.

## Corpus

Repository:

- `https://github.com/gin-gonic/examples`

Commit:

- `179495dfc053bc23b8ba6f9dc8554c904188d6b4`

Chosen smoke path:

- `/private/tmp/codegraph-corpus/gin-examples/upload-file/limit-bytes`

Reason:

- The full repository contains non-Go files such as GitHub workflow YAML. Phase 2 intentionally does not implement real TypeScript fallback writes, so the full repository still exercises the expected non-Go fail-fast boundary.
- The selected subdirectory is a real Gin example from the same public repository and contains a Go-only direct route-handler flow.

Corpus shape:

- Go files: 2
- Generated Go files skipped: 0
- Main route fixture: `r.POST("/upload", uploadHandler)`

## Commands

Clone:

```bash
git clone --depth 1 https://github.com/gin-gonic/examples.git /private/tmp/codegraph-corpus/gin-examples
git -C /private/tmp/codegraph-corpus/gin-examples rev-parse HEAD
```

Index:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js init --engine rust-hybrid
```

Status:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js status --json
```

Probe:

```bash
node -e "const {CodeGraph}=require('/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/index.js'); const cg=CodeGraph.openSync('/private/tmp/codegraph-corpus/gin-examples/upload-file/limit-bytes'); const routes=cg.getNodesByKind('route').map(n=>({id:n.id,name:n.name,kind:n.kind,language:n.language,filePath:n.filePath})); const handler=cg.searchNodes('uploadHandler').find(m=>m.node.kind==='function')?.node; const route=routes.find(r=>r.name==='POST /upload'); const edges=route?cg.getOutgoingEdges(route.id).map(e=>({kind:e.kind,target:e.target})):[]; const handlerCalls=handler?cg.getOutgoingEdges(handler.id).filter(e=>e.kind==='calls').length:0; console.log(JSON.stringify({routes, routeToUploadHandler: !!(route&&handler&&edges.some(e=>e.kind==='references'&&e.target===handler.id)), handlerCalls}, null, 2)); cg.close();"
```

## Results

Index result:

- `rust-hybrid` full index completed.
- Indexed files: 2
- Nodes: 19
- Edges: 24

Status result:

- `index.engine`: `rust-hybrid`
- `languages`: `["go"]`
- `index.hybrid.rustOwnedLanguages`: `["javascript","jsx","typescript","tsx","go"]`
- `index.hybrid.skippedGeneratedByLanguage`: `{}`

Probe result:

```json
{
  "routes": [
    {
      "name": "POST /upload",
      "kind": "route",
      "language": "go",
      "filePath": "main.go"
    }
  ],
  "routeToUploadHandler": true,
  "handlerCalls": 0
}
```

## Interpretation

The deterministic smoke proves:

- Ordinary Go files no longer fail fast under the default `rust-hybrid` path.
- Go is recorded as Rust-owned metadata.
- A direct Gin route node is created.
- The Gin route links to its handler function.

The selected real fixture does not contain a same-package helper call inside `uploadHandler`, so handler-to-helper evidence is not applicable for this corpus. Synthetic coverage in `__tests__/rust-index-engine-cli.test.ts` covers handler-to-helper and selector-method handler linkage.

## Known Gaps

- Full `gin-gonic/examples` repository still fails under `rust-hybrid` because non-Go fallback writes are intentionally not implemented in Phase 2.
- Anonymous route handlers are not claimed as handler-linkage coverage.
- `Any`, middleware semantics, helper factories, and deep nested groups are not claimed.
- Full Go import resolution and cross-package semantic resolution are not implemented.
- Agent A/B was not run.
- First-user release readiness is not claimed.
