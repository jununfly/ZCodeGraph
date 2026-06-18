# Rust-Hybrid Phase 8 Real Gin Smoke Evidence

## Summary

Current-main real Gin deterministic smoke passed with a degraded-but-explainable `rust-hybrid` run.

This is a deterministic smoke only. It is not a multi-round agent A/B run and does not claim performance completion.

## Environment

- Date: 2026-06-19 local time
- Host: macOS development machine
- Package version: `0.9.9`
- CLI runtime used for smoke: local `node dist/bin/zcodegraph.js`
- Node warning observed: host `node` reports `26.0.0`; the smoke set `CODEGRAPH_ALLOW_UNSAFE_NODE=1` for local validation.
- Source build command: `npm run build`

## Corpus

Repository:

- `https://github.com/gin-gonic/examples`

Source clone:

- `/private/tmp/codegraph-corpus/gin-examples`

Commit:

- `179495dfc053bc23b8ba6f9dc8554c904188d6b4`

Smoke copy:

- `/private/tmp/zcodegraph-phase8-gin-smoke-Qcr3zT/gin-examples`

The smoke copy excluded `.git` and any existing `.zcodegraph` directory so the run exercised a fresh first-user full index.

## Commands

Build:

```bash
npm run build
```

Copy corpus:

```bash
tmpdir=$(mktemp -d /private/tmp/zcodegraph-phase8-gin-smoke-XXXXXX)
mkdir -p "$tmpdir/gin-examples"
rsync -a --exclude .git --exclude .zcodegraph \
  /private/tmp/codegraph-corpus/gin-examples/ "$tmpdir/gin-examples/"
```

Index:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node dist/bin/zcodegraph.js init /private/tmp/zcodegraph-phase8-gin-smoke-Qcr3zT/gin-examples -i
```

Status:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node dist/bin/zcodegraph.js status /private/tmp/zcodegraph-phase8-gin-smoke-Qcr3zT/gin-examples --json
```

Doctor:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node dist/bin/zcodegraph.js doctor /private/tmp/zcodegraph-phase8-gin-smoke-Qcr3zT/gin-examples \
  --engine rust-hybrid --bundle --last-run
```

Deterministic route/handler probe:

```bash
node -e "const {CodeGraph}=require('./dist/index.js'); const cg=CodeGraph.openSync('/private/tmp/zcodegraph-phase8-gin-smoke-Qcr3zT/gin-examples'); const routes=cg.getNodesByKind('route').filter(n=>n.filePath==='upload-file/limit-bytes/main.go').map(n=>({id:n.id,name:n.name,filePath:n.filePath})); const handlers=cg.searchNodes('uploadHandler').map(m=>m.node).filter(n=>n.kind==='function').map(n=>({id:n.id,name:n.name,filePath:n.filePath})); const route=routes.find(r=>r.name==='POST /upload'); const handler=handlers.find(h=>h.filePath==='upload-file/limit-bytes/main.go'); const edges=route?cg.getOutgoingEdges(route.id).map(e=>({kind:e.kind,target:e.target,provenance:e.provenance ?? null})):[]; console.log(JSON.stringify({routes, handlers, selectedRoute:route, selectedHandler:handler, edges, referencesSelectedHandler:!!(route&&handler&&edges.some(e=>e.kind==='references'&&e.target===handler.id))}, null, 2)); cg.close();"
```

## Results

Index result:

- Completed full `init -i`.
- CLI summary: `Indexed 62 files`.
- CLI summary: `589 nodes, 762 edges in 136ms`.
- CLI summary: `Rust-hybrid appended 5 TypeScript fallback files`.
- CLI summary: `Fallback health: degraded`.
- Outer `/usr/bin/time -l` returned a non-zero status after the command because sandboxed `sysctl kern.clockrate` failed. The CLI run itself completed and printed `Done`.

Timing:

- Wall time from `/usr/bin/time -l`: `0.39 real`.
- CLI indexing time: `136ms`.
- Peak RSS: unavailable.
- RSS unavailable reason: `/usr/bin/time -l` could not read `sysctl kern.clockrate` in this sandbox and did not emit maximum resident set size.

Status excerpt:

```json
{
  "initialized": true,
  "version": "0.9.9",
  "fileCount": 62,
  "nodeCount": 565,
  "edgeCount": 762,
  "languages": ["go", "javascript", "yaml"],
  "index": {
    "engine": "rust-hybrid",
    "engineVersion": "0.1.0",
    "hybrid": {
      "rustOwnedLanguages": ["javascript", "jsx", "typescript", "tsx", "go"],
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
      "skippedGeneratedByLanguage": {
        "go": 2
      }
    }
  }
}
```

Doctor result:

```text
Created diagnostic bundle:
.zcodegraph/diagnostics/bundles/2026-06-18T17-39-15-309Z-last-run
```

Route/handler probe result:

```json
{
  "routes": [
    {
      "name": "POST /upload",
      "filePath": "upload-file/limit-bytes/main.go"
    }
  ],
  "handlers": [
    {
      "name": "uploadHandler",
      "filePath": "upload-file/limit-bytes/main.go"
    }
  ],
  "referencesSelectedHandler": true
}
```

Additional graph readability probe:

- Route nodes found across the real repository: `67`.
- Sample route names include `GET /ace-example`, `GET /`, `GET /ping`, `GET /foo`, and `POST /upload`.
- Graph stats from SDK probe: `565` nodes, `762` edges, `62` files.

## Interpretation

The real Gin smoke satisfies the Phase 8 release gate:

- Full-repository `rust-hybrid` indexing completes on a real Gin examples repo.
- Go is handled by Rust.
- Non-Rust-owned YAML files fall back to TypeScript and are classified as `language-level-typescript-fallback`.
- Generated Go skips are visible in status and do not block the run.
- `doctor --engine rust-hybrid --bundle --last-run` produces a local diagnostic bundle.
- A deterministic Gin route in `upload-file/limit-bytes/main.go` resolves to its handler.

The degraded state is expected for this mixed repository because YAML fallback is supported and explainable. It is not a release blocker.

## Known Non-Blockers

- The run used local source build output, not a published package.
- The host Node version warning is an environment detail for this smoke; packaged smoke separately validates the bundled runtime path.
- RSS was unavailable for this run due to sandboxed `/usr/bin/time -l` behavior.
- Full Go module import resolution, gRPC/protobuf generated flows, and broad Go generics remain out of scope for the first-user release.
