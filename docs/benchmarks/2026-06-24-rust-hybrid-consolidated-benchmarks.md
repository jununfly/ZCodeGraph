# Rust Hybrid Consolidated Benchmarks And Evidence

Date: 2026-06-24

This file mechanically consolidates the previous `*-rust-hybrid-*` files in this directory. The original per-phase/process files were removed after consolidation so this file is the single archive entry point for this historical workstream.

## 2026-06-25 Lifecycle Cleanup Addendum

This addendum absorbs later rust-hybrid process evidence after the
`Rust-Hybrid Indexing Completion And Performance Roadmap` closeout.

Cleanup rule:

- this file is the total benchmark/evidence entry point for rust-hybrid
  first-user and performance routing decisions;
- long-lived theme evidence remains separate when it is a useful knowledge
  entry point:
  - `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`
  - `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`
  - `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- raw result JSON, profile directories, generated experiment summaries, and
  issue-scoped closeout files are deleted once their durable facts are absorbed
  here or in the theme evidence files;
- baseline standards such as `baseline-indexing-performance-v1.md` remain
  separate because they define reusable measurement contracts rather than
  process evidence.

### Candidate Protocol And Comprehensive Performance Evidence

Candidate protocol routing, shape diagnostics, comprehensive performance
baseline, and comprehensive closeout artifacts were process evidence. Their
durable conclusion is:

- candidate protocol/routing diagnostics were useful for selecting bounded
  optimization targets but are not a standalone architecture decision;
- comprehensive performance evidence should be read through the later ownership
  roadmap and first-user performance closeout rather than as a current source
  of truth;
- performance optimization remains evidence-gated and should not become a
  parallel roadmap forest.

Absorbed files:

- `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-ab-result.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-result.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-routing-vscode-disabled-result.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-candidate-protocol-shape-diagnostics-decision.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-baseline-result.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-baseline-result.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-comprehensive-performance-closeout-decision.md`

### First-User Performance Closeout

The first-user performance execution subtree closed as `yellow`.

Durable conclusion:

- the subtree can close and should not keep spawning ad hoc performance
  optimization nodes;
- current-repo evidence has 3-run diagnostic and after-optimization coverage;
- the cleanup/edge-write bounded implementation is classified `keep`, but it is
  a narrow round-trip reduction rather than a broad performance win;
- graphStats and fallback taxonomy stayed stable enough for this closeout;
- RSS remained unavailable with an explicit unavailable reason;
- VS Code sparse and Excalidraw were `needs-human-setup` because their
  configured paths were not valid Git checkouts for the runner;
- next route is ownership/mainline work, with performance retained as a
  guardrail and bounded exploit lane only when a measured bottleneck appears.

Key current-repo medians:

| Metric | Before | After | Classification |
| --- | ---: | ---: | --- |
| wall time | `7684 ms` | `7639 ms` | stable / slight improvement |
| unresolved cleanup | `215 ms` | `196 ms` | improved |
| edge write | `138 ms` | `89 ms` | improved, not solely attributed |
| fallback taxonomy total | `2645` | `2645` | stable |
| edge count | `40600` | `40600` | stable |

Absorbed files and directories:

- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-baseline-result.json`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-candidate-routing-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-diagnostic-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-diagnostic-result.json`
- `docs/benchmarks/2026-06-25-rust-hybrid-cleanup-edge-write-optimization-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-cleanup-edge-write-optimization-result.json`
- `docs/benchmarks/tmp-2026-06-25-rust-hybrid-first-user-performance-baseline-result/`
- `docs/benchmarks/tmp-2026-06-25-rust-hybrid-first-user-performance-diagnostic-result/`
- `docs/benchmarks/tmp-2026-06-25-rust-hybrid-cleanup-edge-write-optimization-result/`

### Research And Diagnostic Contracts

Research/oracle-needed route closeout and tail diagnostic bucket contract
artifacts were absorbed as lifecycle decisions:

- research/oracle routes stay deferred or `needs-oracle/research` unless a
  future roadmap explicitly promotes them;
- diagnostic bucket contracts remain useful as profile-field expectations, but
  the current durable reference is this consolidated benchmark entry plus the
  relevant baseline standards.

Absorbed files:

- `docs/benchmarks/2026-06-25-rust-hybrid-research-oracle-needed-routes-closeout-decision.md`
- `docs/benchmarks/2026-06-25-rust-hybrid-tail-diagnostic-bucket-contract.md`

## Source Files

- `docs/benchmarks/2026-06-18-rust-hybrid-phase-2-gin-smoke-evidence.md`
- `docs/benchmarks/2026-06-18-rust-hybrid-phase-3-gin-examples-smoke-evidence.md`
- `docs/benchmarks/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-smoke-evidence.md`
- `docs/benchmarks/2026-06-18-rust-hybrid-phase-5-packaged-smoke-evidence.md`
- `docs/benchmarks/2026-06-18-rust-hybrid-phase-6-per-file-gap-fallback-evidence.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-issue-281-gin-route-query-sufficiency.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-optimization-big-picture-decision.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-phase-7-sdk-alignment-evidence.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-packaged-smoke-recheck-evidence.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-prd-gate-audit.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-real-gin-smoke-evidence.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-agent-sufficiency.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-api-cleanup-evidence.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-smoke-evidence.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after.md`
- `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-producer-routing-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-candidate-protocol-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-complete-candidate-producer-routing-boundary-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-cleanup-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-edge-write-bulk-insert-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-js-ts-file-import-target-parity-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-legacy-env-flag-config-audit.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-lowername-default-on-routing-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-complete-shape-coverage-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-lowername-closeout-decision.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`
- `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`

## Consolidated Contents

## 1. `docs/benchmarks/2026-06-18-rust-hybrid-phase-2-gin-smoke-evidence.md`

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

## 2. `docs/benchmarks/2026-06-18-rust-hybrid-phase-3-gin-examples-smoke-evidence.md`

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

## 3. `docs/benchmarks/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-smoke-evidence.md`

# Rust-Hybrid Phase 4 Diagnostic Bundle Smoke Evidence

## Summary

Phase 4 validates that `rust-hybrid` runs can produce privacy-preserving diagnostic bundle inputs for both degraded completed runs and process-level failures.

Result: pass.

## Environment

- Date: 2026-06-18
- Host: macOS development machine
- Node: 26.0.0 with `CODEGRAPH_ALLOW_UNSAFE_NODE=1` for local smoke only
- Rust core: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core`
- ZCodeGraph CLI: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js`

## Commands

```bash
npm run build
npx vitest run __tests__/rust-hybrid-doctor.test.ts __tests__/rust-index-engine-cli.test.ts __tests__/status-json.test.ts
```

## Test Evidence

The targeted test run passed:

```text
Test Files  3 passed (3)
Tests       58 passed (58)
```

Covered suites:

- `__tests__/rust-hybrid-doctor.test.ts`
- `__tests__/rust-index-engine-cli.test.ts`
- `__tests__/status-json.test.ts`

## Degraded Last-Run Bundle

The smoke creates a source-checkout fixture containing TypeScript plus a non-Rust-owned Python file and runs `rust-hybrid` indexing with the real local Rust core.

Validated behavior:

- `.zcodegraph/diagnostics/last-run.json` is written.
- The run record reports `engine: "rust-hybrid"`, `kind: "last-run"`, `exitCode: 0`, `fallbackState: "degraded"`, and RSS unavailable reason.
- `zcodegraph doctor --engine rust-hybrid --bundle --last-run` exits successfully.
- The bundle contains `manifest.json`, `status.json`, `graph-stats.json`, `corpus-fingerprint.json`, `per-file-diagnostics.json`, `replay.md`, and `privacy.md`.
- `status.json` preserves hybrid fallback state.
- Bundle content excludes the fixture source needle and excludes plaintext temp paths.
- Corpus fingerprint and per-file diagnostics do not include plaintext file names.

## Forced Last-Failure Bundle

The smoke points `ZCODEGRAPH_RUST_CORE_BINARY` at a missing executable to force a Rust process-level failure.

Validated behavior:

- `.zcodegraph/diagnostics/last-failure.json` is written.
- The failure record reports `engine: "rust-hybrid"`, `kind: "last-failure"`, `exitCode: 1`, `previousIndexPreserved: true`, and RSS unavailable reason.
- The sanitized stderr tail includes the user-facing Rust engine failure.
- `zcodegraph doctor --engine rust-hybrid --bundle --last-failure` exits successfully.
- The bundle manifest records `source: "last-failure"`.
- Replay content references the failure source without leaking the temp project path.

## CLI Hint Evidence

The targeted CLI suite validates:

- Non-quiet degraded `rust-hybrid` output includes `zcodegraph doctor --engine rust-hybrid --bundle --last-run`.
- Non-quiet process-level `rust-hybrid` failure output includes `zcodegraph doctor --engine rust-hybrid --bundle --last-failure`.
- Quiet indexing remains quiet while still persisting diagnostic records.
- TypeScript escape hatch behavior remains unchanged.

## Privacy Evidence

The bundle v1 smoke asserts that default bundles exclude:

- source code,
- plaintext project paths,
- plaintext file names in corpus/per-file diagnostics,
- automatic upload behavior,
- source slices.

The smoke also asserts `--include-source-slice` exits non-zero with an explicit unsupported message.

## Known Gaps

- Packaged/release-like doctor smoke remains out of scope.
- README and release messaging remain out of scope.
- Source slices remain out of scope.
- RSS sampling remains out of scope; the bundle records an unavailable reason.
- Rust-owned per-file fallback remains out of scope.
- SDK behavior remains out of scope.
- First-user release readiness is not claimed by this evidence.

## 4. `docs/benchmarks/2026-06-18-rust-hybrid-phase-5-packaged-smoke-evidence.md`

# Rust-Hybrid Phase 5 Packaged Smoke Evidence

## Summary

Phase 5 validates that release-like packaged CLI and staged npm shim paths can run the first-user `rust-hybrid` workflow.

Result: pass.

## Environment

- Date: 2026-06-18
- Host: macOS development machine
- Target: `darwin-arm64`
- ZCodeGraph version: `0.9.9`
- Rust core artifact: `release/rust-core/zcodegraph-core-darwin-arm64/zcodegraph-core`
- Extracted bundle: `/private/tmp/zcodegraph-phase5-packaged-smoke/extracted/zcodegraph-darwin-arm64`
- Staged npm root: `release/npm`
- Smoke artifacts: `/private/tmp/zcodegraph-phase5-packaged-smoke/artifacts`

The first direct `scripts/build-bundle.sh darwin-arm64` attempt could not resolve `nodejs.org` from the sandbox. For this local-only smoke, `build-bundle.sh` was rerun with a temporary `curl` shim that produced the same Node archive directory shape using the local Node executable as a wrapper. This validates the packaged launcher, bundle layout, Rust core discovery, status, doctor, and npm shim paths without contacting public registries, publishing packages, triggering release workflows, or uploading diagnostics.

## Commands

```bash
npm run build
cargo build --release --package zcodegraph-core
mkdir -p release/rust-core/zcodegraph-core-darwin-arm64
cp target/release/zcodegraph-core release/rust-core/zcodegraph-core-darwin-arm64/zcodegraph-core

# Local-only Node runtime stand-in used because nodejs.org was unavailable
# from the sandbox during this run.
PATH=/private/tmp/zcodegraph-phase5-fakebin:$PATH scripts/build-bundle.sh darwin-arm64
scripts/pack-npm.sh

rm -rf /private/tmp/zcodegraph-phase5-packaged-smoke
mkdir -p /private/tmp/zcodegraph-phase5-packaged-smoke/extracted
mkdir -p /private/tmp/zcodegraph-phase5-packaged-smoke/artifacts
tar -xzf release/zcodegraph-darwin-arm64.tar.gz \
  -C /private/tmp/zcodegraph-phase5-packaged-smoke/extracted
node scripts/rust-package-smoke.mjs \
  --bundle /private/tmp/zcodegraph-phase5-packaged-smoke/extracted/zcodegraph-darwin-arm64 \
  --npm-root release/npm \
  --out /private/tmp/zcodegraph-phase5-packaged-smoke/artifacts
```

Targeted tests:

```bash
npx vitest run \
  __tests__/rust-package-smoke.test.ts \
  __tests__/ci-rust-packaged-path.test.ts \
  __tests__/rust-phase3-validation.test.ts
```

## Test Evidence

The targeted test run passed:

```text
Test Files  3 passed (3)
Tests       10 passed (10)
```

The build passed:

```text
npm run build
```

## Packaged Smoke Gates

All package smoke gates passed:

| Gate | Status |
|---|---|
| bundle-init-rust-hybrid | pass |
| bundle-default-rust-hybrid | pass |
| bundle-explicit-rust-hybrid | pass |
| bundle-status-hybrid-metadata | pass |
| bundle-degraded-fallback-taxonomy | pass |
| bundle-doctor-last-run | pass |
| bundle-missing-rust-binary | pass |
| bundle-doctor-last-failure | pass |
| bundle-launcher-path | pass |
| npm-init-rust-hybrid | pass |
| npm-default-rust-hybrid | pass |
| npm-explicit-rust-hybrid | pass |
| npm-status-hybrid-metadata | pass |
| npm-degraded-fallback-taxonomy | pass |
| npm-doctor-last-run | pass |
| npm-missing-rust-binary | pass |
| npm-doctor-last-failure | pass |
| npm-optional-platform-rust-core | pass |
| npm-missing-optional-package | pass |
| npm-no-postinstall | pass |
| npm-no-local-rust-compilation | pass |
| npx-like-local-smoke | pass |

`gateFailures` was empty.

## Bundle Evidence

The extracted bundle smoke validated:

- launcher path is `bin/zcodegraph`,
- Rust core path is `bin/zcodegraph-core`,
- `init -i` uses `rust-hybrid`,
- default `index` uses `rust-hybrid`,
- explicit `index --engine rust-hybrid` works,
- `status --json` exposes hybrid metadata,
- degraded fallback taxonomy is recorded,
- `doctor --engine rust-hybrid --bundle --last-run` creates a bundle,
- missing packaged Rust core fails safely,
- `doctor --engine rust-hybrid --bundle --last-failure` creates a bundle.

## Npm Shim Evidence

The staged npm smoke validated:

- platform package is `@jununfly/zcodegraph-darwin-arm64`,
- platform package supplies `bin/zcodegraph-core`,
- npm shim `init -i` uses `rust-hybrid`,
- npm shim default `index` uses `rust-hybrid`,
- npm shim explicit `index --engine rust-hybrid` works,
- npm shim `status --json` exposes hybrid metadata,
- npm shim degraded fallback taxonomy is recorded,
- npm shim `doctor --last-run` creates a bundle,
- npm shim missing Rust core failure path creates `doctor --last-failure`,
- missing optional platform package fails clearly,
- package metadata has no postinstall and no local Rust compilation requirement,
- npx-like local smoke works.

## Known Gaps

- This smoke did not use the official downloaded Node runtime because the sandbox could not resolve `nodejs.org`; release workflow should still validate official runtime download in CI/release infrastructure.
- Real Gin packaged smoke remains out of scope for Phase 5.
- README and release messaging remain out of scope.
- SDK default behavior and SDK engine options remain out of scope.
- Rust-owned per-file parse/extraction fallback remains a separate follow-up.
- No npm publish, GitHub Release workflow trigger, or tag push was performed.
- Final first-user release readiness is not claimed by this evidence alone.

## 5. `docs/benchmarks/2026-06-18-rust-hybrid-phase-6-per-file-gap-fallback-evidence.md`

# Rust-Hybrid Phase 6 Per-File Gap Fallback Evidence

## Summary

Phase 6 implements Rust-owned per-file parse gap fallback for the CLI `rust-hybrid` path.

Result: pass.

## Environment

- Date: 2026-06-18
- Host: macOS development machine
- ZCodeGraph version: `0.9.9`
- Node runtime observed by local `node`: `26.0.0`
- Rust core path: `target/debug/zcodegraph-core`
- Real reduced fixture: `/private/tmp/zcodegraph-phase6-real-gap-attempt`
- Diagnostic bundle: `/private/tmp/zcodegraph-phase6-real-gap-attempt/.zcodegraph/diagnostics/bundles/2026-06-18T15-43-50-513Z-last-run`

Local CLI smoke commands were run with:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1
CODEGRAPH_NO_DAEMON=1
CODEGRAPH_NO_RELAUNCH=1
```

The Node 26 guard banner was printed during local CLI smoke. The command continued under the explicit unsafe override used by the existing test harness. This evidence does not validate Node 26 support.

## Commands

Builds:

```bash
npm run build
cargo build --package zcodegraph-core
```

Targeted tests:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-hybrid-doctor.test.ts
cargo test --package zcodegraph-core emits_structured_rust_owned_parse_gap_errors
```

Real reduced fixture:

```bash
mkdir -p /private/tmp/zcodegraph-phase6-real-gap-attempt
printf 'export function ok() { return 1; }\n' \
  > /private/tmp/zcodegraph-phase6-real-gap-attempt/ok.ts
printf 'export function broken( {\n' \
  > /private/tmp/zcodegraph-phase6-real-gap-attempt/broken.ts

env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node dist/bin/zcodegraph.js init \
  /private/tmp/zcodegraph-phase6-real-gap-attempt \
  --engine rust-hybrid

env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node dist/bin/zcodegraph.js status \
  /private/tmp/zcodegraph-phase6-real-gap-attempt \
  --json

env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node dist/bin/zcodegraph.js doctor \
  /private/tmp/zcodegraph-phase6-real-gap-attempt \
  --engine rust-hybrid \
  --bundle \
  --last-run
```

## Test Evidence

Targeted JS/CLI and doctor tests passed:

```text
Test Files  2 passed (2)
Tests       55 passed (55)
```

Targeted Rust core contract test passed:

```text
test tests::emits_structured_rust_owned_parse_gap_errors ... ok
```

Builds passed:

```text
npm run build
cargo build --package zcodegraph-core
```

## Fake-Core Evidence

The fake-core tracer validates the CLI contract without depending on a naturally occurring Rust parse gap:

- Rust process exits successfully.
- Rust result reports a warning-level per-file gap with `filePath`, `language`, `code`, `severity`, and `writtenByRust:false`.
- CLI appends the affected Rust-owned file through the existing TypeScript fallback append path.
- `status --json` reports:
  - `fallbackState: "degraded"`,
  - `fallbackByLanguage: { "typescript": 1 }`,
  - `fallbackFileCount: 1`,
  - `fallbackReasonTaxonomy: { "rust-owned-parse-gap": 1 }`,
  - `pendingFallbacks: []`.

The partial-write blocked tracer validates the unsafe boundary:

- Rust result reports a Rust-owned gap where `writtenByRust:true`.
- CLI does not append TypeScript fallback for that file.
- `status --json` reports `rust-owned-gap-with-partial-write-blocked`.

## Real Reduced Fixture Evidence

The real reduced fixture contains:

- `ok.ts`: valid TypeScript.
- `broken.ts`: malformed TypeScript that produces a Rust parse gap.

The real `rust-hybrid` run completed successfully and printed:

```text
Rust-hybrid appended 1 TypeScript fallback files
Fallback health: degraded
```

The final status reported:

```json
{
  "fallbackByLanguage": { "typescript": 1 },
  "fallbackFileCount": 1,
  "fallbackState": "degraded",
  "fallbackMessage": "Rust-owned gap fallback appended 1 file(s).",
  "fallbackReasonTaxonomy": { "rust-owned-parse-gap": 1 },
  "pendingFallbacks": []
}
```

The final diagnostic bundle `per-file-diagnostics.json` reported:

```json
{
  "errors": [
    {
      "pathHash": "f560abac70502a0d116437d23b8e75ff06abf9bd3b8dcba2ad5281deac2bdb35",
      "extension": ".ts",
      "language": "typescript",
      "code": "rust-owned-parse-gap",
      "severity": "warning",
      "message": "parse error"
    }
  ]
}
```

The bundle does not include source code or plaintext file paths in per-file diagnostics.

## Scope Boundaries

This evidence does not validate:

- SDK default behavior or SDK engine options,
- README or release messaging,
- full release-like packaged smoke,
- per-file graph replacement after partial Rust writes,
- performance or #165,
- final first-user release readiness.

## 6. `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after-vscode-sparse.profile.json`

```json
{
  "rustCore": {
    "sourceScanMs": 63,
    "parseExtractionMs": 40452,
    "sqliteWriteMs": 54887,
    "importPathAliasResolutionMs": 7423,
    "importPathAliasResolvedRefs": 19766,
    "importPathAliasFallbackRefs": 251282,
    "importPathAliasBindingFallbackRefs": 168945,
    "importPathAliasUnsupportedFallbackRefs": 2416,
    "importPathAliasUnresolvedFallbackRefs": 79921,
    "esmNamedImportExportResolutionMs": 16678,
    "esmNamedImportExportResolvedRefs": 42601,
    "esmNamedImportExportFallbackRefs": 149517,
    "esmOneHopReexportResolvedRefs": 559,
    "localExactReferenceResolutionMs": 37659,
    "localExactReferenceResolvedRefs": 152103,
    "localExactReferenceFallbackRefs": 734619,
    "subprocessStartupHandoffMs": 2
  },
  "typescriptFallbackAppend": {
    "durationMs": 1187,
    "fallbackFileCount": 317,
    "errorTaxonomy": {
      "read_error": 83,
      "size_exceeded": 1
    }
  },
  "finalize": {
    "frameworkPostExtractMs": 49,
    "referenceResolutionMs": 108595,
    "referenceResolutionBreakdown": {
      "importResolutionMs": 8248,
      "nameMatchingMs": 52131,
      "frameworkMatchingMs": 1472,
      "databaseAccessMs": 43324,
      "cacheWarmupDbMs": 424,
      "refHydrationDbMs": 59,
      "cacheWarmupMs": 483,
      "unresolvedReadMs": 1724,
      "unresolvedReadDbMs": 1724,
      "candidateLookupMs": 7125,
      "sharedCandidateLookupMs": 2186,
      "candidateLookupCacheHitMs": 446,
      "nameMatcherCandidateLookupDbMs": 6715,
      "perReferenceDisambiguationMs": 47189,
      "rustMatcherMs": 0,
      "rustMatcherStartupMs": 0,
      "rustMatcherSerializationMs": 0,
      "rustMatcherEligibleRefs": 0,
      "rustMatcherHandledRefs": 0,
      "rustMatcherFallbackRefs": 0,
      "rustMatcherSemanticMismatchRefs": 0,
      "rustMatcherSemanticMismatchSamples": [],
      "rustMatcherFallbackReasons": {},
      "rustMatcherCandidateMaterializationMs": 0,
      "rustMatcherSubprocessMs": 0,
      "rustMatcherTsVerificationMs": 0,
      "rustMatcherPayloadBytes": 0,
      "rustMatcherUniqueCandidateFacts": 0,
      "candidateReplayEligibleRefs": 0,
      "candidateReplayComparedRefs": 0,
      "candidateReplayEquivalentRefs": 0,
      "candidateReplayMismatchRefs": 0,
      "candidateReplayMismatchReasons": {},
      "candidateReplayMismatchSamples": [],
      "edgeMaterializationMs": 1328,
      "edgeMaterializationDbMs": 1328,
      "edgeWriteMs": 21408,
      "edgeWriteDbMs": 21408,
      "unresolvedCleanupMs": 18382,
      "unresolvedCleanupDbMs": 18382,
      "otherResolutionMs": 496
    },
    "dynamicDispatchSynthesisMs": 14475,
    "dbMaintenanceMs": 134,
    "boundaryProtocol": {
      "version": 1,
      "productShell": "typescript",
      "rustOwnedStages": [
        "source-scan",
        "parse-extraction",
        "graph-write",
        "import-path-alias-resolution",
        "esm-named-import-export-resolution",
        "esm-one-hop-reexport-resolution",
        "local-exact-reference-resolution"
      ]
    },
    "fallbackTaxonomy": {
      "totalFallbacks": 231858,
      "entries": [
        {
          "stage": "framework-post-extract",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "dynamic-dispatch-synthesis",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "db-maintenance",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "binding-level-symbol-disambiguation-not-yet-rust-owned",
          "count": 149517
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unsupported-import-form-not-yet-rust-owned",
          "count": 554
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unresolved-file-level-import-target",
          "count": 81783
        }
      ]
    }
  },
  "typescriptFinalizationMs": 126161
}
```

## 7. `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after-zcodegraph.profile.json`

```json
{
  "rustCore": {
    "sourceScanMs": 3,
    "parseExtractionMs": 1184,
    "sqliteWriteMs": 603,
    "importPathAliasResolutionMs": 84,
    "importPathAliasResolvedRefs": 639,
    "importPathAliasFallbackRefs": 2493,
    "importPathAliasBindingFallbackRefs": 2435,
    "importPathAliasUnsupportedFallbackRefs": 49,
    "importPathAliasUnresolvedFallbackRefs": 9,
    "esmNamedImportExportResolutionMs": 439,
    "esmNamedImportExportResolvedRefs": 3036,
    "esmNamedImportExportFallbackRefs": 1507,
    "esmOneHopReexportResolvedRefs": 287,
    "localExactReferenceResolutionMs": 532,
    "localExactReferenceResolvedRefs": 3893,
    "localExactReferenceFallbackRefs": 30774,
    "subprocessStartupHandoffMs": 410
  },
  "typescriptFallbackAppend": {
    "durationMs": 139,
    "fallbackFileCount": 5,
    "errorTaxonomy": {}
  },
  "finalize": {
    "frameworkPostExtractMs": 4,
    "referenceResolutionMs": 497,
    "referenceResolutionBreakdown": {
      "importResolutionMs": 55,
      "nameMatchingMs": 91,
      "frameworkMatchingMs": 51,
      "databaseAccessMs": 264,
      "cacheWarmupDbMs": 5,
      "refHydrationDbMs": 2,
      "cacheWarmupMs": 7,
      "unresolvedReadMs": 32,
      "unresolvedReadDbMs": 32,
      "candidateLookupMs": 25,
      "sharedCandidateLookupMs": 5,
      "candidateLookupCacheHitMs": 9,
      "nameMatcherCandidateLookupDbMs": 17,
      "perReferenceDisambiguationMs": 71,
      "rustMatcherMs": 0,
      "rustMatcherStartupMs": 0,
      "rustMatcherSerializationMs": 0,
      "rustMatcherEligibleRefs": 0,
      "rustMatcherHandledRefs": 0,
      "rustMatcherFallbackRefs": 0,
      "rustMatcherSemanticMismatchRefs": 0,
      "rustMatcherSemanticMismatchSamples": [],
      "rustMatcherFallbackReasons": {},
      "rustMatcherCandidateMaterializationMs": 0,
      "rustMatcherSubprocessMs": 0,
      "rustMatcherTsVerificationMs": 0,
      "rustMatcherPayloadBytes": 0,
      "rustMatcherUniqueCandidateFacts": 0,
      "candidateReplayEligibleRefs": 0,
      "candidateReplayComparedRefs": 0,
      "candidateReplayEquivalentRefs": 0,
      "candidateReplayMismatchRefs": 0,
      "candidateReplayMismatchReasons": {},
      "candidateReplayMismatchSamples": [],
      "edgeMaterializationMs": 16,
      "edgeMaterializationDbMs": 16,
      "edgeWriteMs": 61,
      "edgeWriteDbMs": 61,
      "unresolvedCleanupMs": 148,
      "unresolvedCleanupDbMs": 148,
      "otherResolutionMs": 12
    },
    "dynamicDispatchSynthesisMs": 391,
    "dbMaintenanceMs": 7,
    "boundaryProtocol": {
      "version": 1,
      "productShell": "typescript",
      "rustOwnedStages": [
        "source-scan",
        "parse-extraction",
        "graph-write",
        "import-path-alias-resolution",
        "esm-named-import-export-resolution",
        "esm-one-hop-reexport-resolution",
        "local-exact-reference-resolution"
      ]
    },
    "fallbackTaxonomy": {
      "totalFallbacks": 1569,
      "entries": [
        {
          "stage": "framework-post-extract",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "dynamic-dispatch-synthesis",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "db-maintenance",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "binding-level-symbol-disambiguation-not-yet-rust-owned",
          "count": 1507
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unsupported-import-form-not-yet-rust-owned",
          "count": 44
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unresolved-file-level-import-target",
          "count": 14
        }
      ]
    }
  },
  "typescriptFinalizationMs": 951
}
```

## 8. `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after.md`

# Rust-Hybrid Indexing Performance A/B After Profile

Date: 2026-06-19

Plan: `docs/plans/2026-06-19-rust-hybrid-indexing-performance-ab.md`

Issues: #288, #289, #290

Baseline: `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline.md`

## Candidate Tried

The single bounded candidate selected by #287 was implemented:

Rust core source extraction now writes all per-file facts through one run-level SQLite transaction instead of opening and committing one transaction per indexed file. Parser coverage, extracted graph facts, TypeScript fallback behavior, Rust/TypeScript ownership boundaries, and user-facing defaults are unchanged.

## Validation

Targeted tests:

```bash
cargo test --package zcodegraph-core
```

Result: 25 passed.

Build checks:

```bash
npm run build
cargo build --package zcodegraph-core
```

Result: both passed.

No packaged/release smoke was run because this change does not touch CLI launcher, packaging, status, doctor, or release workflow paths.

## After Commands

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after-zcodegraph.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph --force --quiet --engine rust-hybrid
```

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after-vscode-sparse.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

## Wall-Clock And RSS

| Corpus | Baseline wall-clock | After wall-clock | Trend | Baseline RSS | After RSS | Trend |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ZCodeGraph | 5.40s | 4.95s | -8.33% | 343,949,312 bytes | 335,200,256 bytes | -2.54% |
| VS Code sparse | 356.06s | 296.93s | -16.61% | 2,384,166,912 bytes | 2,197,028,864 bytes | -7.85% |

## Profile Comparison

| Corpus | Bucket | Baseline ms | After ms | Trend |
| --- | --- | ---: | ---: | ---: |
| ZCodeGraph | rustCore.parseExtractionMs | 1,193 | 1,184 | -0.75% |
| ZCodeGraph | rustCore.sqliteWriteMs | 1,187 | 603 | -49.20% |
| ZCodeGraph | typescriptFallbackAppend.durationMs | 133 | 139 | +4.51% |
| ZCodeGraph | typescriptFinalizationMs | 925 | 951 | +2.81% |
| VS Code sparse | rustCore.parseExtractionMs | 40,233 | 40,452 | +0.54% |
| VS Code sparse | rustCore.sqliteWriteMs | 124,488 | 54,887 | -55.91% |
| VS Code sparse | typescriptFallbackAppend.durationMs | 1,150 | 1,187 | +3.22% |
| VS Code sparse | typescriptFinalizationMs | 125,673 | 126,161 | +0.39% |

VS Code sparse TypeScript finalization sub-buckets stayed essentially flat, which is expected because this candidate only targeted Rust core extraction writes:

| Bucket | Baseline ms | After ms | Trend |
| --- | ---: | ---: | ---: |
| referenceResolutionMs | 108,499 | 108,595 | +0.09% |
| nameMatchingMs | 51,573 | 52,131 | +1.08% |
| databaseAccessMs | 43,759 | 43,324 | -0.99% |
| edgeWriteDbMs | 21,662 | 21,408 | -1.17% |
| unresolvedCleanupDbMs | 18,489 | 18,382 | -0.58% |
| dynamicDispatchSynthesisMs | 14,379 | 14,475 | +0.67% |

## Decision

Decision: keep.

Why:

- The selected bucket moved in the expected direction on both corpora.
- The large-corpus total wall-clock improved by 16.61%.
- The large-corpus Rust-owned SQLite write bucket improved by 55.91%.
- RSS did not regress; both corpora reported slightly lower peak RSS under `/usr/bin/time -l`.
- TypeScript finalization stayed flat, so the trend points specifically at the selected candidate rather than unrelated behavior changes.

Remaining bottleneck:

This does not solve the overall indexing target alone. After the change, the VS Code sparse run is still dominated by TypeScript finalization and reference-resolution work (`typescriptFinalizationMs` 126,161ms, `referenceResolutionMs` 108,595ms). Continue tracking deeper long-run performance work in #165. The parse-extraction candidate #224 remains valid but was not the best first candidate in this A/B slice.

## 9. `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-vscode-sparse.profile.json`

```json
{
  "rustCore": {
    "sourceScanMs": 62,
    "parseExtractionMs": 40233,
    "sqliteWriteMs": 124488,
    "importPathAliasResolutionMs": 6164,
    "importPathAliasResolvedRefs": 19766,
    "importPathAliasFallbackRefs": 251282,
    "importPathAliasBindingFallbackRefs": 168945,
    "importPathAliasUnsupportedFallbackRefs": 2416,
    "importPathAliasUnresolvedFallbackRefs": 79921,
    "esmNamedImportExportResolutionMs": 13294,
    "esmNamedImportExportResolvedRefs": 42601,
    "esmNamedImportExportFallbackRefs": 149517,
    "esmOneHopReexportResolvedRefs": 559,
    "localExactReferenceResolutionMs": 32494,
    "localExactReferenceResolvedRefs": 152103,
    "localExactReferenceFallbackRefs": 734619,
    "subprocessStartupHandoffMs": 3
  },
  "typescriptFallbackAppend": {
    "durationMs": 1150,
    "fallbackFileCount": 317,
    "errorTaxonomy": {
      "read_error": 83,
      "size_exceeded": 1
    }
  },
  "finalize": {
    "frameworkPostExtractMs": 50,
    "referenceResolutionMs": 108499,
    "referenceResolutionBreakdown": {
      "importResolutionMs": 8149,
      "nameMatchingMs": 51573,
      "frameworkMatchingMs": 1560,
      "databaseAccessMs": 43759,
      "cacheWarmupDbMs": 242,
      "refHydrationDbMs": 55,
      "cacheWarmupMs": 297,
      "unresolvedReadMs": 1923,
      "unresolvedReadDbMs": 1923,
      "candidateLookupMs": 7337,
      "sharedCandidateLookupMs": 2199,
      "candidateLookupCacheHitMs": 451,
      "nameMatcherCandidateLookupDbMs": 6917,
      "perReferenceDisambiguationMs": 46431,
      "rustMatcherMs": 0,
      "rustMatcherStartupMs": 0,
      "rustMatcherSerializationMs": 0,
      "rustMatcherEligibleRefs": 0,
      "rustMatcherHandledRefs": 0,
      "rustMatcherFallbackRefs": 0,
      "rustMatcherSemanticMismatchRefs": 0,
      "rustMatcherSemanticMismatchSamples": [],
      "rustMatcherFallbackReasons": {},
      "rustMatcherCandidateMaterializationMs": 0,
      "rustMatcherSubprocessMs": 0,
      "rustMatcherTsVerificationMs": 0,
      "rustMatcherPayloadBytes": 0,
      "rustMatcherUniqueCandidateFacts": 0,
      "candidateReplayEligibleRefs": 0,
      "candidateReplayComparedRefs": 0,
      "candidateReplayEquivalentRefs": 0,
      "candidateReplayMismatchRefs": 0,
      "candidateReplayMismatchReasons": {},
      "candidateReplayMismatchSamples": [],
      "edgeMaterializationMs": 1389,
      "edgeMaterializationDbMs": 1389,
      "edgeWriteMs": 21662,
      "edgeWriteDbMs": 21662,
      "unresolvedCleanupMs": 18489,
      "unresolvedCleanupDbMs": 18489,
      "otherResolutionMs": 473
    },
    "dynamicDispatchSynthesisMs": 14379,
    "dbMaintenanceMs": 186,
    "boundaryProtocol": {
      "version": 1,
      "productShell": "typescript",
      "rustOwnedStages": [
        "source-scan",
        "parse-extraction",
        "graph-write",
        "import-path-alias-resolution",
        "esm-named-import-export-resolution",
        "esm-one-hop-reexport-resolution",
        "local-exact-reference-resolution"
      ]
    },
    "fallbackTaxonomy": {
      "totalFallbacks": 231858,
      "entries": [
        {
          "stage": "framework-post-extract",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "dynamic-dispatch-synthesis",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "db-maintenance",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "binding-level-symbol-disambiguation-not-yet-rust-owned",
          "count": 149517
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unsupported-import-form-not-yet-rust-owned",
          "count": 554
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unresolved-file-level-import-target",
          "count": 81783
        }
      ]
    }
  },
  "typescriptFinalizationMs": 125673
}
```

## 10. `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-zcodegraph.profile.json`

```json
{
  "rustCore": {
    "sourceScanMs": 4,
    "parseExtractionMs": 1193,
    "sqliteWriteMs": 1187,
    "importPathAliasResolutionMs": 83,
    "importPathAliasResolvedRefs": 639,
    "importPathAliasFallbackRefs": 2493,
    "importPathAliasBindingFallbackRefs": 2435,
    "importPathAliasUnsupportedFallbackRefs": 49,
    "importPathAliasUnresolvedFallbackRefs": 9,
    "esmNamedImportExportResolutionMs": 437,
    "esmNamedImportExportResolvedRefs": 3036,
    "esmNamedImportExportFallbackRefs": 1507,
    "esmOneHopReexportResolvedRefs": 287,
    "localExactReferenceResolutionMs": 524,
    "localExactReferenceResolvedRefs": 3893,
    "localExactReferenceFallbackRefs": 30774,
    "subprocessStartupHandoffMs": 402
  },
  "typescriptFallbackAppend": {
    "durationMs": 133,
    "fallbackFileCount": 5,
    "errorTaxonomy": {}
  },
  "finalize": {
    "frameworkPostExtractMs": 4,
    "referenceResolutionMs": 487,
    "referenceResolutionBreakdown": {
      "importResolutionMs": 50,
      "nameMatchingMs": 88,
      "frameworkMatchingMs": 59,
      "databaseAccessMs": 262,
      "cacheWarmupDbMs": 3,
      "refHydrationDbMs": 0,
      "cacheWarmupMs": 3,
      "unresolvedReadMs": 33,
      "unresolvedReadDbMs": 33,
      "candidateLookupMs": 15,
      "sharedCandidateLookupMs": 4,
      "candidateLookupCacheHitMs": 2,
      "nameMatcherCandidateLookupDbMs": 13,
      "perReferenceDisambiguationMs": 77,
      "rustMatcherMs": 0,
      "rustMatcherStartupMs": 0,
      "rustMatcherSerializationMs": 0,
      "rustMatcherEligibleRefs": 0,
      "rustMatcherHandledRefs": 0,
      "rustMatcherFallbackRefs": 0,
      "rustMatcherSemanticMismatchRefs": 0,
      "rustMatcherSemanticMismatchSamples": [],
      "rustMatcherFallbackReasons": {},
      "rustMatcherCandidateMaterializationMs": 0,
      "rustMatcherSubprocessMs": 0,
      "rustMatcherTsVerificationMs": 0,
      "rustMatcherPayloadBytes": 0,
      "rustMatcherUniqueCandidateFacts": 0,
      "candidateReplayEligibleRefs": 0,
      "candidateReplayComparedRefs": 0,
      "candidateReplayEquivalentRefs": 0,
      "candidateReplayMismatchRefs": 0,
      "candidateReplayMismatchReasons": {},
      "candidateReplayMismatchSamples": [],
      "edgeMaterializationMs": 11,
      "edgeMaterializationDbMs": 11,
      "edgeWriteMs": 63,
      "edgeWriteDbMs": 63,
      "unresolvedCleanupMs": 152,
      "unresolvedCleanupDbMs": 152,
      "otherResolutionMs": 12
    },
    "dynamicDispatchSynthesisMs": 378,
    "dbMaintenanceMs": 7,
    "boundaryProtocol": {
      "version": 1,
      "productShell": "typescript",
      "rustOwnedStages": [
        "source-scan",
        "parse-extraction",
        "graph-write",
        "import-path-alias-resolution",
        "esm-named-import-export-resolution",
        "esm-one-hop-reexport-resolution",
        "local-exact-reference-resolution"
      ]
    },
    "fallbackTaxonomy": {
      "totalFallbacks": 1569,
      "entries": [
        {
          "stage": "framework-post-extract",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "dynamic-dispatch-synthesis",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "db-maintenance",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "binding-level-symbol-disambiguation-not-yet-rust-owned",
          "count": 1507
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unsupported-import-form-not-yet-rust-owned",
          "count": 44
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unresolved-file-level-import-target",
          "count": 14
        }
      ]
    }
  },
  "typescriptFinalizationMs": 925
}
```

## 11. `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline.md`

# Rust-Hybrid Indexing Performance A/B Baseline

Date: 2026-06-19

Plan: `docs/plans/2026-06-19-rust-hybrid-indexing-performance-ab.md`

Issues: #287, #288, #289, #290

## Scope

This baseline covers only the `rust-hybrid` source-path full-index flow. It does not run the full benchmark scoreboard, packaged smoke, release workflow, or agent sufficiency A/B.

## Environment

- CLI: local built `dist/bin/zcodegraph.js`
- Rust core: local `target/debug/zcodegraph-core`
- Node: 26.0.0 with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`
- Guard env: `CODEGRAPH_NO_DAEMON=1`, `CODEGRAPH_NO_RELAUNCH=1`
- RSS source: `/usr/bin/time -l`

## Corpora

| Corpus | Path | Git checkout | Revision |
| --- | --- | --- | --- |
| ZCodeGraph | `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph` | yes | current working tree |
| VS Code sparse | `/private/tmp/codegraph-corpus/vscode-sparse` | yes | `4ac5322601c6985aba4cd9349c23f4ef22dc3e65` |

## Commands

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-zcodegraph.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph --force --quiet --engine rust-hybrid
```

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-vscode-sparse.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

## Results

| Corpus | Wall-clock | Peak RSS | Profile artifact |
| --- | ---: | ---: | --- |
| ZCodeGraph | 5.40s | 343,949,312 bytes | `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-zcodegraph.profile.json` |
| VS Code sparse | 356.06s | 2,384,166,912 bytes | `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-baseline-vscode-sparse.profile.json` |

## Diagnostic Buckets

| Corpus | parseExtractionMs | rust sqliteWriteMs | TS fallback append ms | TS finalization ms | Finalize referenceResolutionMs | Finalize dynamicDispatchSynthesisMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ZCodeGraph | 1,193 | 1,187 | 133 | 925 | 487 | 378 |
| VS Code sparse | 40,233 | 124,488 | 1,150 | 125,673 | 108,499 | 14,379 |

VS Code sparse reference-resolution sub-buckets:

| Bucket | ms |
| --- | ---: |
| nameMatchingMs | 51,573 |
| databaseAccessMs | 43,759 |
| perReferenceDisambiguationMs | 46,431 |
| edgeWriteDbMs | 21,662 |
| unresolvedCleanupDbMs | 18,489 |
| candidateLookupMs | 7,337 |

## Candidate Selection

Selected bounded candidate for #288:

Move Rust core extraction writes from per-file SQLite transactions to one run-level bulk transaction for the source extraction phase.

Reasoning:

- The largest Rust-owned bucket on VS Code sparse is `sqliteWriteMs` at 124,488ms.
- The current Rust core write path commits one transaction per indexed file while FTS triggers are already suspended and rebuilt after bulk writing.
- The candidate does not alter parser coverage, symbol semantics, reference disambiguation, fallback policy, or user-facing default behavior.
- The expected effect is a reduced `rustCore.sqliteWriteMs` and full-index wall-clock, with RSS recorded as a guardrail.

Non-selected candidates:

- Parse extraction optimization (#224): `parseExtractionMs` is significant but smaller than the write bucket on the large corpus in this pass.
- TypeScript finalization/name matcher migration: larger semantic surface and not suitable as the single bounded candidate for this A/B slice.
- Reference cleanup rowid deletion: already present on the batched resolver path, so it is not a valid new optimization attempt.

Decision for #287: proceed to #288 with the single bulk-transaction Rust write candidate.

## 12. `docs/benchmarks/2026-06-19-rust-hybrid-issue-281-gin-route-query-sufficiency.md`

# Issue #281 Gin Route-Query Sufficiency Hardening

Date: 2026-06-19

Related issues: #279, #280, #281

## Scope

This was a bounded pre-release hardening attempt for Go/Gin `METHOD path` lookup questions. It did not change the Rust Go extractor, Go module/package resolution, Gin middleware semantics, MCP tool names, or the release workflow.

## Change

`zcodegraph_explore` now recognizes HTTP `METHOD /path` query shapes as route lookup seeds. When a matching `route` node exists in the current graph, Explore seeds that route and its direct route-to-handler edge so the rendered answer includes an explicit `Route matches` section even on small-project budgets where the generic Relationships section is disabled.

## Deterministic Tool-Level Evidence

Test:

```bash
npx vitest run __tests__/gin-route-explore-sufficiency.test.ts
```

Result:

- pass

The test indexes a small Gin fixture through `rust-hybrid`, calls the public MCP handler `zcodegraph_explore`, and verifies that one Explore response includes:

- `POST /upload`,
- `uploadHandler`,
- the registration line `r.POST("/upload", uploadHandler)`,
- an explicit `Route matches` section with the route-to-handler relationship.

## Agent A/B Evidence

Prompt:

```text
How does a request reach the upload handler for POST /upload?
```

Command shape:

```bash
AGENT_EVAL_OUT=/private/tmp/zcodegraph-issue-281-gin-upload-r1 \
CG_BIN=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  bash scripts/agent-eval/run-all.sh \
  /private/tmp/codegraph-corpus/gin-examples \
  "How does a request reach the upload handler for POST /upload?" \
  headless
```

| Arm | Duration | Tool calls | CodeGraph calls | Read | Bash/Grep/Find | Cost | Tokens |
|---|---:|---:|---:|---:|---:|---:|---:|
| WITH ZCodeGraph | 20s | 1 | 1 | 0 | 0 | $0.454 | 79,753 |
| WITHOUT ZCodeGraph | 62s | 12 | 0 | 6 | 5 | $0.620 | 78,325 |

Comparison against the #279 pre-hardening run:

| Arm | Before #281 | After #281 |
|---|---|---|
| WITH ZCodeGraph | 29s · 5 tools · 3 Read · 1 Bash | 20s · 1 tool · 0 Read · 0 Bash |
| WITHOUT ZCodeGraph | 26s · 4 tools · 1 Read · 3 Bash | 62s · 12 tools · 6 Read · 5 Bash |

## Decision

Keep the bounded Explore route-query hardening.

The mechanism is now available and the real targeted A/B converted to a clean sufficiency win. This removes the specific #279 caveat that `POST /upload` still fell back to reading `main.go`.

This does not claim broad Go/Gin benchmark replacement or complete Go framework coverage. It only closes the release-prep gap for tested Gin route lookup questions.

## Raw Artifacts

```text
/private/tmp/zcodegraph-issue-281-gin-upload-r1/run-headless-with.jsonl
/private/tmp/zcodegraph-issue-281-gin-upload-r1/run-headless-without.jsonl
```

## 13. `docs/benchmarks/2026-06-19-rust-hybrid-optimization-big-picture-decision.md`

# Rust-Hybrid Optimization Big-Picture Decision

Date: 2026-06-19

Parent tracker: #165

Architecture records:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/zj-adr/ZJ-0003-evidence-gated-indexing-optimization.md`
- `docs/zj-adr/ZJ-0004-use-staged-sqlite-write-paths-for-rust-indexing.md`

Related issues:

- #224 parse-extraction profiling candidate
- #287-#290 first rust-hybrid wall-clock A/B pass
- #291-#294 second rust-hybrid wall-clock A/B pass

## Decision

Stop treating the next optimization as another blind bounded A/B candidate.

Keep the proven production optimizations, preserve the diagnostic tooling, and
split the next work into two tracks:

1. #224 should become an actionable `parseExtractionMs` sub-bucket diagnostic
   issue before any further parse/extraction optimization is selected.
2. TypeScript finalization/reference resolution should be discussed as an
   architecture problem, not as the next small performance patch.

This does not close #165. It changes the next-step framing for #165 from
"find one more local optimization" to "separate proven production mechanics
from architectural bottlenecks."

## System Map

The `rust-hybrid` default full-index path is:

```text
CLI / SDK
  -> TypeScript product shell
  -> Rust core source indexing
       source scan
       JS/TS/Go parse + extraction
       SQLite graph writes
       Rust-owned import/path/local resolution
  -> TypeScript fallback append
  -> TypeScript finalization
       framework post-extract
       reference resolution
       dynamic-dispatch synthesis
       database maintenance
  -> profile / status / doctor / diagnostic bundle
```

Relevant modules:

- Rust source indexing and Rust-owned resolution:
  `crates/zcodegraph-core/src/lib.rs`
- TypeScript orchestration and index lifecycle:
  `src/index.ts`
- TypeScript finalization/reference resolution:
  `src/resolution/index.ts`
- Dynamic-dispatch synthesis:
  `src/resolution/callback-synthesizer.ts`
- Evidence tooling:
  `scripts/rust-indexing-evidence.mjs` and `docs/benchmarks/`

## Optimization Inventory

### Production-Keep: SQLite And Graph-Write Architecture

Status: keep as production direction.

Examples:

- production temp on-disk final-flush path;
- SQLite final-flush / temp DB replacement;
- FTS trigger suspension with one rebuild after bulk writes;
- run-level Rust extraction transaction;
- bounded SQLite write-path PRAGMA and batching work.

Evidence:

- Phase 16 selected SQLite final-flush as the architecture candidate:
  `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Phase 18 kept a bounded SQLite write-path candidate:
  `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- #211 kept the FTS trigger suspension / rebuild candidate:
  `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- #287-#290 kept run-level Rust extraction writes:
  `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after.md`

Interpretation:

This is the strongest proven optimization family. It improves real wall-clock
or write buckets without changing resolver semantics, language coverage, or
user-visible indexing behavior. Future write-path work should still require
baseline and after evidence, but this direction is no longer speculative.

### Production-Keep: Rust-Owned Lookup And Cleanup Mechanics

Status: keep, but avoid unbounded incremental patching.

Examples:

- local exact reference candidate lookup reuse;
- unresolved-reference cleanup batching;
- edge write validation-path cleanup where graph semantics stay unchanged.

Evidence:

- #193 cleanup batching:
  `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- #209 edge write batching:
  `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Phase 22 local exact reference optimization:
  `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

Interpretation:

These candidates are useful when evidence isolates a tight mechanical cost.
However, several of the remaining finalization sub-buckets overlap. Do not keep
stacking small cleanup patches unless a profile isolates a target and the
candidate avoids reference-disambiguation semantics.

### Diagnostic-Keep: Evidence Pipeline And Profile Fields

Status: keep and use as the default optimization gate.

Examples:

- before/after artifact comparison;
- standard decision artifact generation;
- candidate ranking/exclusion notes;
- RSS unavailable reason handling;
- finalization public profile sub-buckets;
- candidate replay equivalence diagnostics.

Evidence:

- Phase 22:
  `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- Phase 23:
  `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- #206 finalization diagnostics:
  `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
- #207/#208 semantic-equivalence diagnostics:
  `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
  and `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

Interpretation:

This work does not directly make indexing faster, but it makes optimization
decisions more trustworthy. It should remain the entry point before any new
performance implementation issue. A weak or noisy result is a valid output.

### Weak-Keep: Parser Reuse During Rust Extraction

Status: keep because it is low risk, but do not treat it as a meaningful parse
breakthrough.

Evidence:

- #291-#294:
  `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after.md`

Observed result:

- ZCodeGraph wall-clock: 4.88s -> 4.76s.
- VS Code sparse wall-clock: 295.14s -> 286.66s.
- VS Code sparse `rustCore.parseExtractionMs`: 40,052ms -> 39,996ms.

Interpretation:

The implementation is narrow and semantics-preserving, so it can remain. But it
did not materially move the large-corpus parse bucket. The result argues
against more intuition-driven parse micro-optimizations.

### Diagnostic-Next: #224 Parse Extraction Sub-Buckets

Status: next diagnostic issue, not direct optimization.

Current framing:

#224 should split `rustCore.parseExtractionMs` into actionable sub-buckets
before choosing another parse/extraction candidate. At minimum, the diagnostic
should separate:

- source read;
- TypeScript source normalization;
- tree-sitter parse;
- AST walk / extraction;
- per-language extractor cost;
- parser setup if still worth tracking.

Interpretation:

`parseExtractionMs` remains visible, but parser reuse showed that parser setup
was not a major large-corpus cost. The next parse issue should first identify
where time actually goes.

### Architecture-Level-Next: TypeScript Finalization / Reference Resolution

Status: architecture discussion required before more implementation.

Evidence pattern:

Across recent VS Code sparse profiles, the largest end-to-end bucket remains
TypeScript finalization/reference resolution:

- `typescriptFinalizationMs`;
- `finalize.referenceResolutionMs`;
- `nameMatchingMs`;
- `databaseAccessMs`;
- `perReferenceDisambiguationMs`;
- `edgeWriteDbMs`;
- `unresolvedCleanupDbMs`;
- `dynamicDispatchSynthesisMs`.

Recent examples:

- #287-#290 after profile:
  `docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after.md`
- #291-#294 after profile:
  `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after.md`
- #205/#206 finalization diagnostics:
  `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`
  and `docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md`

Decision:

Do not treat TypeScript finalization/reference resolution as the next bounded
micro-optimization by default. It should be re-opened as an architecture
problem because it sits at the hybrid boundary:

- Rust core produces graph facts and some Rust-owned resolution.
- TypeScript finalization still owns framework post-extract, broad reference
  resolution, dynamic-dispatch synthesis, and database cleanup.
- The largest remaining end-to-end costs live in that TypeScript-owned tail.

Questions for the architecture discussion:

- Which finalization responsibilities should remain in the TypeScript product
  shell, and which should move behind Rust-owned stages?
- Is the current boundary forcing duplicate data hydration or repeated DB
  access?
- Can we define a narrow protocol that preserves every-reference
  disambiguation semantics while reducing cross-boundary work?
- Should dynamic-dispatch synthesis stay TypeScript-owned, move to Rust, or be
  split by language/framework?
- What evidence would prove that a finalization architecture change preserves
  graph semantics, sufficiency, and diagnostic trust?

Guardrail:

Do not change every-reference disambiguation semantics as a performance patch.
Any finalization architecture plan must include explicit semantic parity,
fallback taxonomy, graphStats, and representative corpus evidence.

## Recommended Next Steps

1. Keep #165 open as the post-PRD optimization tracker.
2. Keep #224 open, but narrow it to parse/extraction sub-bucket diagnostics.
3. Create a new architecture discussion/plan for TypeScript
   finalization/reference resolution as the hybrid-boundary bottleneck.
4. Do not create another generic "one bounded A/B" performance issue until
   either #224 or the finalization architecture discussion selects a concrete
   candidate.

## Non-Decisions

- This does not claim Rust default rollout readiness.
- This does not claim the strict post-PRD performance target is met.
- This does not require full benchmark scoreboard work before the next
  diagnostic issue.
- This does not close #224.
- This does not prescribe a Rust rewrite of TypeScript finalization; it only
  says the topic is now architectural rather than a small patch.

## 14. `docs/benchmarks/2026-06-19-rust-hybrid-phase-7-sdk-alignment-evidence.md`

# Rust-Hybrid Phase 7 SDK Alignment Evidence

## Summary

Phase 7 aligns programmatic SDK full-index entry points with the CLI `rust-hybrid` default while preserving explicit engine selection.

Result: pass.

## Environment

- Date: 2026-06-19
- Host: macOS development machine
- ZCodeGraph version: `0.9.9`
- Node runtime observed by local `node`: `26.0.0`
- Rust core path: `target/debug/zcodegraph-core`

The local CLI-oriented tests may print the Node 26 guard banner when they spawn the built CLI. Existing test harness paths explicitly exercise that guarded environment. This evidence does not validate Node 26 support for users.

## Commands

Build:

```bash
npm run build
```

Targeted SDK and npm SDK shim tests:

```bash
npx vitest run __tests__/sdk-rust-hybrid.test.ts __tests__/npm-sdk.test.ts
```

Targeted CLI regression suite:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts
```

Full regression suite:

```bash
npm test
```

## Test Evidence

Build passed:

```text
npm run build
```

SDK and npm SDK shim tests passed:

```text
Test Files  2 passed (2)
Tests       13 passed (13)
```

CLI engine regression tests passed:

```text
Test Files  1 passed (1)
Tests       51 passed (51)
```

Full regression suite passed:

```text
Test Files  134 passed | 1 skipped (135)
Tests       1835 passed | 15 skipped (1850)
```

## Covered Behaviors

- SDK exports the shared `IndexEngine` type.
- `CodeGraph.init(projectPath, { index: true, engine: 'typescript' })` works as the explicit TypeScript escape hatch.
- `cg.indexAll({ engine: 'typescript' })` works and does not require Rust core discovery.
- `cg.indexAll({ engine: 'rust' })` works when Rust core is available.
- `CodeGraph.init(projectPath, { index: true })` defaults to `rust-hybrid`.
- `cg.indexAll()` defaults to `rust-hybrid`.
- SDK default full-index calls do not read `ZCODEGRAPH_INDEX_ENGINE`.
- Missing Rust core under SDK default `rust-hybrid` fails safely and preserves the previous index.
- SDK `rust-hybrid` appends language-level TypeScript fallback files into the unified graph.
- SDK `rust-hybrid` appends Rust-owned per-file parse gaps when Rust marks files unwritten and fallback-eligible.
- SDK `rust-hybrid` blocks fallback for possible partial Rust writes and records `rust-owned-gap-with-partial-write-blocked`.
- npm SDK shim remains a transparent re-export of the platform SDK contract.

## Regression Found During Validation

The targeted CLI suite caught a boundary regression after changing the SDK default: CLI `--engine typescript` paths still called SDK `indexAll()` without an explicit engine, so the SDK default redirected those paths to `rust-hybrid`.

The fix keeps CLI engine selection explicit by passing `engine: 'typescript'` when the CLI has already selected the TypeScript indexer. CLI behavior still owns `ZCODEGRAPH_INDEX_ENGINE`; SDK behavior remains explicit and does not read that environment variable.

The full regression suite also caught historical TypeScript baseline tests and experiment scripts that relied on the old SDK/CLI default. Those tests and scripts now explicitly request TypeScript when they are validating TypeScript extractor/resolver behavior or TypeScript-vs-Rust A/B arms. Phase 7-specific tests remain the only tests that intentionally exercise the new SDK default.

## Scope Boundaries

This evidence does not validate:

- README or release messaging,
- full release-like packaged smoke,
- real Gin packaged smoke,
- watch/sync `rust-hybrid` incremental semantics,
- performance optimization or #165,
- GitHub Release workflow trigger,
- npm publish,
- final first-user release readiness.

## 15. `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-packaged-smoke-recheck-evidence.md`

# Rust-Hybrid Phase 8 Packaged Smoke Recheck Evidence

## Summary

Current-main targeted packaged smoke passed.

The recheck validated the release-like bundle launcher, Rust core discovery, staged npm shim, default `rust-hybrid` indexing, explicit `rust-hybrid` indexing, hybrid status metadata, doctor last-run and last-failure bundles, and package-shape constraints. It did not run the GitHub Release workflow, publish npm packages, create tags, or upload diagnostics.

## Environment

- Date: 2026-06-19 local time
- Host: macOS development machine
- Target: `darwin-arm64`
- Package version: `0.9.9`
- Rust core artifact: `/private/tmp/zcodegraph-phase8-package-smoke/release/rust-core/zcodegraph-core-darwin-arm64/zcodegraph-core`
- Extracted bundle: `/private/tmp/zcodegraph-phase8-package-smoke/extracted/zcodegraph-darwin-arm64`
- Smoke artifacts: `/private/tmp/zcodegraph-phase8-package-smoke/artifacts`

The local sandbox did not use the official Node download path. As in Phase 5, a temporary local `curl` shim produced the expected Node archive directory shape with the local Node executable as a wrapper. This keeps the smoke local and deterministic while validating the package launcher, Rust core discovery, npm shim, status, doctor, and failure bundle paths.

## Commands

Build and targeted tests:

```bash
npm run build
npx vitest run \
  __tests__/rust-package-smoke.test.ts \
  __tests__/ci-rust-packaged-path.test.ts \
  __tests__/build-bundle-rust-core.test.ts \
  __tests__/pack-npm-rust-core.test.ts
```

Build current release-like bundle:

```bash
mkdir -p /private/tmp/zcodegraph-phase8-package-smoke/fakebin
mkdir -p /private/tmp/zcodegraph-phase8-package-smoke/release/rust-core/zcodegraph-core-darwin-arm64
cp target/release/zcodegraph-core \
  /private/tmp/zcodegraph-phase8-package-smoke/release/rust-core/zcodegraph-core-darwin-arm64/zcodegraph-core
PATH=/private/tmp/zcodegraph-phase8-package-smoke/fakebin:$PATH \
ZCODEGRAPH_RELEASE_DIR=/private/tmp/zcodegraph-phase8-package-smoke/release \
  scripts/build-bundle.sh darwin-arm64
```

Stage npm layout and run package smoke:

```bash
cp /private/tmp/zcodegraph-phase8-package-smoke/release/zcodegraph-darwin-arm64.tar.gz \
  release/zcodegraph-darwin-arm64.tar.gz
scripts/pack-npm.sh
mkdir -p /private/tmp/zcodegraph-phase8-package-smoke/extracted
tar -xzf /private/tmp/zcodegraph-phase8-package-smoke/release/zcodegraph-darwin-arm64.tar.gz \
  -C /private/tmp/zcodegraph-phase8-package-smoke/extracted
/usr/bin/time -p node scripts/rust-package-smoke.mjs \
  --bundle /private/tmp/zcodegraph-phase8-package-smoke/extracted/zcodegraph-darwin-arm64 \
  --npm-root release/npm \
  --out /private/tmp/zcodegraph-phase8-package-smoke/artifacts
```

## Results

Build result:

- `npm run build` passed.

Targeted tests:

```text
Test Files  4 passed (4)
Tests       10 passed (10)
```

Bundle build:

```text
[bundle] target=darwin-arm64 node=v24.16.0
[bundle] wrote /private/tmp/zcodegraph-phase8-package-smoke/release/zcodegraph-darwin-arm64.tar.gz (9.8M)
```

Npm staging:

```text
[pack-npm] @jununfly/zcodegraph-darwin-arm64@0.9.9
[pack-npm] @jununfly/zcodegraph@0.9.9 (1 platform packages in optionalDependencies)
```

Package smoke timing:

- Wall time: `5.65s`
- User time: `4.01s`
- System time: `0.90s`
- Peak RSS: unavailable.
- RSS unavailable reason: this smoke used `/usr/bin/time -p`, which reports wall/user/system time but not peak resident set size.

Package smoke summary:

```json
{
  "publishAttempted": false,
  "registryContactAllowed": false,
  "gateFailures": []
}
```

All package smoke gates passed:

| Gate | Status |
|---|---|
| bundle-init-rust-hybrid | pass |
| bundle-default-rust-hybrid | pass |
| bundle-explicit-rust-hybrid | pass |
| bundle-status-hybrid-metadata | pass |
| bundle-degraded-fallback-taxonomy | pass |
| bundle-doctor-last-run | pass |
| bundle-missing-rust-binary | pass |
| bundle-doctor-last-failure | pass |
| bundle-launcher-path | pass |
| npm-init-rust-hybrid | pass |
| npm-default-rust-hybrid | pass |
| npm-explicit-rust-hybrid | pass |
| npm-status-hybrid-metadata | pass |
| npm-degraded-fallback-taxonomy | pass |
| npm-doctor-last-run | pass |
| npm-missing-rust-binary | pass |
| npm-doctor-last-failure | pass |
| npm-optional-platform-rust-core | pass |
| npm-missing-optional-package | pass |
| npm-no-postinstall | pass |
| npm-no-local-rust-compilation | pass |
| npx-like-local-smoke | pass |

## Interpretation

The targeted packaged smoke satisfies the Phase 8 packaging release gate:

- Release-like bundle launcher finds the packaged Rust core.
- Release-like `init -i` uses `rust-hybrid`.
- Release-like default `index` uses `rust-hybrid`.
- Explicit `index --engine rust-hybrid` works.
- `status --json` exposes hybrid metadata.
- Degraded fallback taxonomy is recorded.
- Doctor last-run and last-failure bundles work.
- Staged npm shim finds the optional platform package and Rust core.
- The package shape has no postinstall and no local Rust compilation requirement.
- No publish, release workflow, tag push, or registry contact was attempted by the smoke script.

## Known Non-Blockers

- The local bundle used a deterministic Node runtime stand-in because this sandbox is not the release infrastructure.
- Real Gin packaged smoke remains out of scope; real Gin source-build smoke and targeted package smoke are separate Phase 8 gates.
- RSS was not available from this smoke command.

## 16. `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-prd-gate-audit.md`

# Rust-Hybrid Phase 8 PRD Gate Audit

## Context

Parent PRD:

- `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`

Phase 8 plan:

- `docs/plans/2026-06-19-rust-hybrid-phase-8-first-user-release-readiness-closeout.md`

This audit maps the first-user release PRD to current evidence before the final Phase 8 readiness decision. It does not claim release readiness by itself.

## Gate Matrix

| PRD gate | Status before Phase 8 smoke | Current evidence needed | Notes |
|---|---|---|---|
| `zcodegraph init -i` and `zcodegraph index` default to `rust-hybrid` | Pass | Confirm through packaged smoke | Phase 1 and Phase 7 decisions cover CLI and SDK full-index defaults. |
| Shared engine values support `typescript`, `rust`, and `rust-hybrid` | Pass | None | Phase 1 established the shared engine contract; Phase 7 aligned SDK full-index options. |
| TypeScript escape hatch remains available | Pass | README troubleshooting update | CLI and SDK support explicit `typescript`; user-facing docs still needed the troubleshooting path. |
| Rust process/system failures fail safely instead of whole-repo TS fallback | Pass | Packaged last-failure smoke | Phase 1 and Phase 5 validated fail-safe behavior; Phase 8 should rerun packaged last-failure bundle. |
| Rust-owned JS/TS/JSX/TSX/Go assignment is visible in status | Pass | Gin and package status excerpts | Phase 3 and Phase 7 cover mixed-language metadata; Phase 8 should cite current `status --json`. |
| Unsupported supported languages fall back to TypeScript per file | Pass | Gin fallback taxonomy and package degraded smoke | Phase 3 added language-level fallback into the unified graph. |
| Rust-owned parse/extraction gaps fall back per file when safe | Pass | None for release closeout | Phase 6 covered per-file parse gap fallback and doctor diagnostics. |
| Generated Go files may be skipped and counted | Pass | Gin status excerpt | Phase 2/3 implemented generated Go skips; Phase 8 real Gin smoke should confirm counts remain visible. |
| Go extraction v1 supports Gin route-handler sufficiency | Needs current evidence | Real Gin deterministic smoke | Phase 2 passed on a real Gin subdir. Phase 8 requires a current-main real Gin smoke. |
| Diagnostic bundles are local-only and source-free by default | Pass | Gin/package doctor bundle paths | Phase 4 implemented doctor bundles. Phase 8 should confirm last-run and last-failure paths still work. |
| First-user README primary path does not make users choose an engine | Needs doc update | README edit | Existing README already shows install/init but still had stale `init` wording and no rust-hybrid troubleshooting. |
| Release-like packaging works without publish/release/tag | Needs current evidence | Targeted packaged smoke | Phase 5 passed. Phase 8 should rerun current-main package smoke. |
| Performance #165 is not a blocker | Non-blocker | Record wall time/RSS or unavailable reason | PRD shifted strict performance targets out of release gating. Severe regressions can still block. |
| Watch/sync rust-hybrid incremental semantics | Non-blocker | None | First-user release requires full index; incremental rust-hybrid semantics remain follow-up. |
| Full Go module/package import resolver | Non-blocker | None | Explicit PRD non-goal for Go v1. |
| gRPC/protobuf generated Go flow coverage | Non-blocker | None | Explicit PRD non-goal; generated Go files can be skipped and counted. |
| Broader Go generics edge support | Non-blocker | None | Explicit PRD non-goal for first-user release. |

## Reused Evidence

- Phase 1 decision: `docs/plans/2026-06-18-rust-hybrid-phase-1-decision.md`
- Phase 2 Gin evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-2-gin-smoke-evidence.md`
- Phase 3 mixed-language evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-3-gin-examples-smoke-evidence.md`
- Phase 4 diagnostic bundle evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-smoke-evidence.md`
- Phase 5 packaged smoke evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-5-packaged-smoke-evidence.md`
- Phase 6 per-file fallback evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-6-per-file-gap-fallback-evidence.md`
- Phase 7 decision and evidence: `docs/plans/2026-06-19-rust-hybrid-phase-7-decision.md`, `docs/benchmarks/2026-06-19-rust-hybrid-phase-7-sdk-alignment-evidence.md`

## Harness Reuse

Existing deterministic harnesses are sufficient for Phase 8:

- `npm run build`
- `npx vitest run __tests__/rust-package-smoke.test.ts __tests__/ci-rust-packaged-path.test.ts __tests__/build-bundle-rust-core.test.ts __tests__/pack-npm-rust-core.test.ts`
- `scripts/build-bundle.sh darwin-arm64`
- `scripts/pack-npm.sh`
- `node scripts/rust-package-smoke.mjs --bundle <dir> --npm-root <dir> --out <dir>`
- CLI `status --json` and `doctor --engine rust-hybrid --bundle --last-run`
- A deterministic `dist/index.js` route/handler probe against the indexed Gin graph

No new production smoke helper was required for the closeout.

## Current Gaps To Close In Phase 8

- Run current-main real Gin deterministic smoke and record status, fallback taxonomy, doctor bundle, route-handler probe, wall time, and RSS or unavailable reason.
- Run current-main targeted packaged smoke and record gate summary, wall time, and RSS or unavailable reason.
- Update README first-user path and troubleshooting.
- Write the final three-state readiness decision.

## 17. `docs/benchmarks/2026-06-19-rust-hybrid-phase-8-real-gin-smoke-evidence.md`

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

## 18. `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-agent-sufficiency.md`

# Rust-Hybrid Pre-Release Agent Sufficiency Spot-Check

Date: 2026-06-19

Related issues: #279, #280, #281

## Scope

This is a targeted first-user release spot-check for the default `rust-hybrid` path. It is not a full median-of-4 benchmark refresh.

The goal was to refresh README-facing TypeScript/JavaScript and Go sufficiency evidence with real Claude Code headless A/B runs:

- WITH: ZCodeGraph MCP server enabled against the freshly built local `dist/bin/zcodegraph.js`.
- WITHOUT: empty MCP config.
- Built-in Read, Bash/grep/find, and subagents were available in both arms.
- Repos were indexed with the current `rust-hybrid` default before the runs.

## Corpus

| Repo | Path | Commit | Index result |
|---|---|---|---|
| Excalidraw | `/private/tmp/codegraph-corpus/excalidraw` | `28a9b1711dc0625b8ab5d643dc871810ee13642f` | 641 files, 20,719 nodes, 53,345 edges, 14 TypeScript fallback files |
| Gin examples | `/private/tmp/codegraph-corpus/gin-examples` | `179495dfc053bc23b8ba6f9dc8554c904188d6b4` | 62 files, 589 nodes, 762 edges, 5 TypeScript fallback files |

Both indexes were built with:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  node dist/bin/zcodegraph.js init --engine rust-hybrid
```

The local machine is on Node 26, so the unsafe-node warning appeared in stderr. `CODEGRAPH_ALLOW_UNSAFE_NODE=1` was set for these local validation runs.

## Validity Note

The first non-escalated Excalidraw A/B attempt failed before model execution with:

```text
API Error: Unable to connect to API (ConnectionRefused)
```

That run produced 0 tokens and 0 tool calls and is excluded from the metrics below. The same prompt was rerun with network access allowed and completed successfully.

## Results

| Repo | Prompt | Arm | Duration | Tool calls | CodeGraph calls | Read | Bash/Grep/Find | Cost | Tokens |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| Excalidraw | How does updating an element re-render the canvas on screen? | WITH | 61s | 7 | 5 | 2 | 0 | $1.725 | 397,153 |
| Excalidraw | same | WITHOUT | 222s | 54 | 0 | 22 | 31 | $2.048 | 164,854 |
| Gin examples | How does a request reach the upload handler for POST `/upload`? | WITH, before #281 | 29s | 5 | 1 | 3 | 1 | $0.838 | 165,808 |
| Gin examples | same | WITHOUT, before #281 | 26s | 4 | 0 | 1 | 3 | $0.710 | 149,810 |
| Gin examples | same | WITH, after #281 | 20s | 1 | 1 | 0 | 0 | $0.454 | 79,753 |
| Gin examples | same | WITHOUT, after #281 | 62s | 12 | 0 | 6 | 5 | $0.620 | 78,325 |
| Gin examples | How are Gin routes registered and connected to handlers in the examples? | WITH | 24s | 1 | 1 | 0 | 0 | $0.398 | 80,261 |
| Gin examples | same | WITHOUT | 78s | 28 | 0 | 23 | 4 | $0.663 | 81,139 |

## Interpretation

Excalidraw still shows the expected value pattern for a hard TS/React flow question:

- tool calls dropped from 54 to 7,
- Read/Bash fallback dropped from 53 to 2,
- wall time dropped from 222s to 61s.

This is not perfectly read-free; the model still read `StaticCanvas.tsx` twice after graph exploration.

Go/Gin after #281:

- The broad route-registration question is a clean sufficiency win: one `zcodegraph_explore`, zero Read/Grep fallback.
- The narrow `POST /upload` lookup became a clean sufficiency win after route-query hardening: one `zcodegraph_explore`, zero Read/Grep fallback.
- This remains targeted release-readiness evidence, not a broad Go/Gin benchmark replacement.

## README Wording Decision

README should not claim that current Go/Gin sufficiency is uniformly better. The accurate release-ready statement is:

- TS/JS flow sufficiency remains strong on the hard Excalidraw path, though not read-free.
- Go/Gin route lookup sufficiency is strong on the two targeted release-readiness prompts.
- This was a targeted pre-release spot-check, not a full benchmark replacement.

## Raw Artifacts

Raw JSONL logs are local-only under:

```text
/private/tmp/zcodegraph-pre-release-agent-sufficiency/
```

Used runs:

- `excalidraw-q1-r1-escalated/run-headless-with.jsonl`
- `excalidraw-q1-r1-escalated/run-headless-without.jsonl`
- `gin-q1-r1/run-headless-with.jsonl`
- `gin-q1-r1/run-headless-without.jsonl`
- `gin-q2-r1/run-headless-with.jsonl`
- `gin-q2-r1/run-headless-without.jsonl`
- `/private/tmp/zcodegraph-issue-281-gin-upload-r1/run-headless-with.jsonl`
- `/private/tmp/zcodegraph-issue-281-gin-upload-r1/run-headless-without.jsonl`

Excluded failed connectivity run:

- `excalidraw-q1-r1/run-headless-with.jsonl`
- `excalidraw-q1-r1/run-headless-without.jsonl`

## 19. `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-api-cleanup-evidence.md`

# Rust-Hybrid Pre-Release API Cleanup Evidence

Date: 2026-06-19

Related issues: #276, #277

## Scope

This evidence covers the pre-release API polish slice:

- `zcodegraph init` is the first-user initialization command.
- Historical `zcodegraph init -i` / `--index` support is removed.
- CLI index engine selection is explicit `--engine` only.
- `ZCODEGRAPH_INDEX_ENGINE=typescript` fails fast for CLI engine-selection paths and points users to `zcodegraph index --engine typescript`.
- SDK behavior remains option-driven and does not read the CLI env var.

## Implementation Summary

- Removed the `init -i` / `init --index` option from the CLI.
- Changed `resolveIndexEngine()` so stale `ZCODEGRAPH_INDEX_ENGINE` usage throws a clear error instead of selecting an engine.
- Kept default CLI engine resolution at `rust-hybrid`.
- Kept status Rust-core diagnostics defaulted to `rust-hybrid` without reading `ZCODEGRAPH_INDEX_ENGINE`.
- Updated user-facing docs and scripts from `zcodegraph init -i` to `zcodegraph init` where the reference was current guidance.
- Left old changelog history and explicit residue-regression tests untouched where they intentionally describe older behavior.

## Targeted Tests

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "environment|init --index"
npx vitest run __tests__/rust-index-engine-cli.test.ts __tests__/rust-package-smoke.test.ts __tests__/status-json.test.ts __tests__/identity-residue.test.ts
```

Result:

- Build passed.
- Targeted CLI tests passed.
- Four-file targeted regression suite passed: 72 tests.

## Behavior Verified

- `zcodegraph init` defaults to `rust-hybrid`.
- `zcodegraph init --index` is rejected by commander as an unknown option.
- `ZCODEGRAPH_INDEX_ENGINE=typescript zcodegraph index` fails fast with:

```text
ZCODEGRAPH_INDEX_ENGINE is no longer supported for selecting the index engine. Use: zcodegraph index --engine typescript
```

- `zcodegraph index --engine typescript` remains the explicit escape hatch.
- Status JSON configured-engine diagnostics no longer report env-selected TypeScript.

## Documentation Alignment

Updated current user-facing guidance in:

- `README.md`
- `src/installer/index.ts`
- `src/mcp/server-instructions.ts`
- `src/sync/worktree.ts`
- `scripts/add-lang/bench.sh`
- `scripts/agent-eval/audit.sh`
- `docs/designs/dynamic-dispatch-coverage-playbook.md`
- `docs/designs/callback-edge-synthesis.md`
- `docs/designs/architecture-roadmap-validation.md`
- `docs/SEARCH_QUALITY_LOOP.md`
- `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- `CHANGELOG.md`

## Decision

#276 and #277 are complete from an implementation and documentation perspective. The remaining validation belongs to #278 packaged smoke, #279 Agent Sufficiency refresh, and #280 closeout.

## 20. `docs/benchmarks/2026-06-19-rust-hybrid-pre-release-smoke-evidence.md`

# Rust-Hybrid Pre-Release Smoke Evidence

Date: 2026-06-19

Related issues: #278, #280

## Scope

This is a targeted release-candidate smoke pass for the first-user `rust-hybrid` path. It does not run the full release workflow, create a tag, publish to npm, or contact the npm registry.

## Source CLI Smoke

Command shape:

```bash
node dist/bin/zcodegraph.js init
node dist/bin/zcodegraph.js index --force
node dist/bin/zcodegraph.js status --json
node dist/bin/zcodegraph.js doctor --engine rust-hybrid --bundle --last-run
node dist/bin/zcodegraph.js index --engine rust-hybrid --force
node dist/bin/zcodegraph.js index --engine typescript --force
ZCODEGRAPH_INDEX_ENGINE=typescript node dist/bin/zcodegraph.js index --force
```

Result:

- `init` default `rust-hybrid`: pass
- `index` default `rust-hybrid`: pass
- `status --json` after default indexing: pass
- `doctor --engine rust-hybrid --bundle --last-run`: pass
- explicit `--engine rust-hybrid`: pass
- explicit `--engine typescript`: pass
- stale `ZCODEGRAPH_INDEX_ENGINE=typescript`: fail-fast pass

The local machine uses Node 26, so each command printed the unsafe-node warning. `CODEGRAPH_ALLOW_UNSAFE_NODE=1` was set for local validation.

## Packaged Smoke

Local-only package preparation:

```bash
scripts/build-bundle.sh darwin-arm64
scripts/pack-npm.sh
tar -xzf release/zcodegraph-darwin-arm64.tar.gz -C /private/tmp/zcodegraph-pre-release-bundle
node scripts/rust-package-smoke.mjs \
  --bundle /private/tmp/zcodegraph-pre-release-bundle/zcodegraph-darwin-arm64 \
  --npm-root release/npm \
  --out /private/tmp/zcodegraph-pre-release-package-smoke
```

Result:

- publish attempted: false
- registry contact allowed: false
- gate failures: none
- 24/24 gates passed

Passed gates:

- `bundle-init-rust-hybrid`
- `bundle-default-rust-hybrid`
- `bundle-explicit-rust-hybrid`
- `bundle-env-engine-selection-fails`
- `bundle-status-hybrid-metadata`
- `bundle-degraded-fallback-taxonomy`
- `bundle-doctor-last-run`
- `bundle-missing-rust-binary`
- `bundle-doctor-last-failure`
- `bundle-launcher-path`
- `npm-init-rust-hybrid`
- `npm-default-rust-hybrid`
- `npm-explicit-rust-hybrid`
- `npm-env-engine-selection-fails`
- `npm-status-hybrid-metadata`
- `npm-degraded-fallback-taxonomy`
- `npm-doctor-last-run`
- `npm-missing-rust-binary`
- `npm-doctor-last-failure`
- `npm-optional-platform-rust-core`
- `npm-missing-optional-package`
- `npm-no-postinstall`
- `npm-no-local-rust-compilation`
- `npx-like-local-smoke`

## Artifacts

Package smoke artifacts:

```text
/private/tmp/zcodegraph-pre-release-package-smoke/
```

Summary files:

- `/private/tmp/zcodegraph-pre-release-package-smoke/summary.json`
- `/private/tmp/zcodegraph-pre-release-package-smoke/summary.md`

## Decision

#278 is complete. The first-user source and packaged smoke paths match the pre-release API polish requirements.

## 21. `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after-vscode-sparse.profile.json`

```json
{
  "rustCore": {
    "sourceScanMs": 61,
    "parseExtractionMs": 39996,
    "sqliteWriteMs": 50132,
    "importPathAliasResolutionMs": 7304,
    "importPathAliasResolvedRefs": 19766,
    "importPathAliasFallbackRefs": 251282,
    "importPathAliasBindingFallbackRefs": 168945,
    "importPathAliasUnsupportedFallbackRefs": 2416,
    "importPathAliasUnresolvedFallbackRefs": 79921,
    "esmNamedImportExportResolutionMs": 16509,
    "esmNamedImportExportResolvedRefs": 42601,
    "esmNamedImportExportFallbackRefs": 149517,
    "esmOneHopReexportResolvedRefs": 559,
    "localExactReferenceResolutionMs": 36829,
    "localExactReferenceResolvedRefs": 152103,
    "localExactReferenceFallbackRefs": 734619,
    "subprocessStartupHandoffMs": 3
  },
  "typescriptFallbackAppend": {
    "durationMs": 1148,
    "fallbackFileCount": 317,
    "errorTaxonomy": {
      "read_error": 83,
      "size_exceeded": 1
    }
  },
  "finalize": {
    "frameworkPostExtractMs": 45,
    "referenceResolutionMs": 104426,
    "referenceResolutionBreakdown": {
      "importResolutionMs": 7866,
      "nameMatchingMs": 50606,
      "frameworkMatchingMs": 1458,
      "databaseAccessMs": 41213,
      "cacheWarmupDbMs": 450,
      "refHydrationDbMs": 56,
      "cacheWarmupMs": 506,
      "unresolvedReadMs": 1732,
      "unresolvedReadDbMs": 1732,
      "candidateLookupMs": 6869,
      "sharedCandidateLookupMs": 2071,
      "candidateLookupCacheHitMs": 446,
      "nameMatcherCandidateLookupDbMs": 6451,
      "perReferenceDisambiguationMs": 45806,
      "rustMatcherMs": 0,
      "rustMatcherStartupMs": 0,
      "rustMatcherSerializationMs": 0,
      "rustMatcherEligibleRefs": 0,
      "rustMatcherHandledRefs": 0,
      "rustMatcherFallbackRefs": 0,
      "rustMatcherSemanticMismatchRefs": 0,
      "rustMatcherSemanticMismatchSamples": [],
      "rustMatcherFallbackReasons": {},
      "rustMatcherCandidateMaterializationMs": 0,
      "rustMatcherSubprocessMs": 0,
      "rustMatcherTsVerificationMs": 0,
      "rustMatcherPayloadBytes": 0,
      "rustMatcherUniqueCandidateFacts": 0,
      "candidateReplayEligibleRefs": 0,
      "candidateReplayComparedRefs": 0,
      "candidateReplayEquivalentRefs": 0,
      "candidateReplayMismatchRefs": 0,
      "candidateReplayMismatchReasons": {},
      "candidateReplayMismatchSamples": [],
      "edgeMaterializationMs": 1271,
      "edgeMaterializationDbMs": 1271,
      "edgeWriteMs": 20504,
      "edgeWriteDbMs": 20504,
      "unresolvedCleanupMs": 17201,
      "unresolvedCleanupDbMs": 17201,
      "otherResolutionMs": 452
    },
    "dynamicDispatchSynthesisMs": 14696,
    "dbMaintenanceMs": 355,
    "boundaryProtocol": {
      "version": 1,
      "productShell": "typescript",
      "rustOwnedStages": [
        "source-scan",
        "parse-extraction",
        "graph-write",
        "import-path-alias-resolution",
        "esm-named-import-export-resolution",
        "esm-one-hop-reexport-resolution",
        "local-exact-reference-resolution"
      ]
    },
    "fallbackTaxonomy": {
      "totalFallbacks": 231858,
      "entries": [
        {
          "stage": "framework-post-extract",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "dynamic-dispatch-synthesis",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "db-maintenance",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "binding-level-symbol-disambiguation-not-yet-rust-owned",
          "count": 149517
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unsupported-import-form-not-yet-rust-owned",
          "count": 554
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unresolved-file-level-import-target",
          "count": 81783
        }
      ]
    }
  },
  "typescriptFinalizationMs": 122274
}
```

## 22. `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after-zcodegraph.profile.json`

```json
{
  "rustCore": {
    "sourceScanMs": 5,
    "parseExtractionMs": 1166,
    "sqliteWriteMs": 582,
    "importPathAliasResolutionMs": 82,
    "importPathAliasResolvedRefs": 639,
    "importPathAliasFallbackRefs": 2493,
    "importPathAliasBindingFallbackRefs": 2435,
    "importPathAliasUnsupportedFallbackRefs": 49,
    "importPathAliasUnresolvedFallbackRefs": 9,
    "esmNamedImportExportResolutionMs": 427,
    "esmNamedImportExportResolvedRefs": 3036,
    "esmNamedImportExportFallbackRefs": 1507,
    "esmOneHopReexportResolvedRefs": 287,
    "localExactReferenceResolutionMs": 515,
    "localExactReferenceResolvedRefs": 3893,
    "localExactReferenceFallbackRefs": 30774,
    "subprocessStartupHandoffMs": 418
  },
  "typescriptFallbackAppend": {
    "durationMs": 134,
    "fallbackFileCount": 5,
    "errorTaxonomy": {}
  },
  "finalize": {
    "frameworkPostExtractMs": 5,
    "referenceResolutionMs": 467,
    "referenceResolutionBreakdown": {
      "importResolutionMs": 54,
      "nameMatchingMs": 80,
      "frameworkMatchingMs": 57,
      "databaseAccessMs": 248,
      "cacheWarmupDbMs": 3,
      "refHydrationDbMs": 2,
      "cacheWarmupMs": 5,
      "unresolvedReadMs": 33,
      "unresolvedReadDbMs": 33,
      "candidateLookupMs": 18,
      "sharedCandidateLookupMs": 1,
      "candidateLookupCacheHitMs": 6,
      "nameMatcherCandidateLookupDbMs": 12,
      "perReferenceDisambiguationMs": 63,
      "rustMatcherMs": 0,
      "rustMatcherStartupMs": 0,
      "rustMatcherSerializationMs": 0,
      "rustMatcherEligibleRefs": 0,
      "rustMatcherHandledRefs": 0,
      "rustMatcherFallbackRefs": 0,
      "rustMatcherSemanticMismatchRefs": 0,
      "rustMatcherSemanticMismatchSamples": [],
      "rustMatcherFallbackReasons": {},
      "rustMatcherCandidateMaterializationMs": 0,
      "rustMatcherSubprocessMs": 0,
      "rustMatcherTsVerificationMs": 0,
      "rustMatcherPayloadBytes": 0,
      "rustMatcherUniqueCandidateFacts": 0,
      "candidateReplayEligibleRefs": 0,
      "candidateReplayComparedRefs": 0,
      "candidateReplayEquivalentRefs": 0,
      "candidateReplayMismatchRefs": 0,
      "candidateReplayMismatchReasons": {},
      "candidateReplayMismatchSamples": [],
      "edgeMaterializationMs": 12,
      "edgeMaterializationDbMs": 12,
      "edgeWriteMs": 60,
      "edgeWriteDbMs": 60,
      "unresolvedCleanupMs": 138,
      "unresolvedCleanupDbMs": 138,
      "otherResolutionMs": 8
    },
    "dynamicDispatchSynthesisMs": 383,
    "dbMaintenanceMs": 7,
    "boundaryProtocol": {
      "version": 1,
      "productShell": "typescript",
      "rustOwnedStages": [
        "source-scan",
        "parse-extraction",
        "graph-write",
        "import-path-alias-resolution",
        "esm-named-import-export-resolution",
        "esm-one-hop-reexport-resolution",
        "local-exact-reference-resolution"
      ]
    },
    "fallbackTaxonomy": {
      "totalFallbacks": 1569,
      "entries": [
        {
          "stage": "framework-post-extract",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "dynamic-dispatch-synthesis",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "db-maintenance",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "binding-level-symbol-disambiguation-not-yet-rust-owned",
          "count": 1507
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unsupported-import-form-not-yet-rust-owned",
          "count": 44
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unresolved-file-level-import-target",
          "count": 14
        }
      ]
    }
  },
  "typescriptFinalizationMs": 909
}
```

## 23. `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after.md`

# Rust-Hybrid Wall-Clock A/B v2 After Profile

Date: 2026-06-19

Plan: `docs/plans/2026-06-19-rust-hybrid-default-indexing-wall-clock-ab.md`

Issues: #292, #293, #294

Baseline: `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline.md`

## Candidate Tried

The single bounded candidate selected by #291 was implemented:

Rust core extraction now reuses one tree-sitter parser per source language
during a full-index run instead of constructing and configuring a fresh parser
for every file.

This does not change parser grammar selection, extracted graph semantics,
TypeScript fallback behavior, reference disambiguation, or default user
behavior.

## Validation

Targeted and regression tests:

```bash
cargo test --package zcodegraph-core rust_index_extracts_mixed_languages_with_reused_parsers
cargo test --package zcodegraph-core
```

Result: 26 passed.

Build checks:

```bash
npm run build
cargo build --package zcodegraph-core
```

Result: both passed.

No packaged/release smoke was run because this change does not touch CLI
launcher, packaging, status, doctor, or release workflow paths. No agent
sufficiency A/B was run because graph semantics and indexed results are not
intended to change.

## After Commands

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after-zcodegraph.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph --force --quiet --engine rust-hybrid
```

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after-vscode-sparse.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

## Wall-Clock And RSS

| Corpus | Baseline wall-clock | After wall-clock | Trend | Baseline RSS | After RSS | Trend |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ZCodeGraph | 4.88s | 4.76s | -2.46% | 319,930,368 bytes | 342,900,736 bytes | +7.18% |
| VS Code sparse | 295.14s | 286.66s | -2.87% | 2,321,973,248 bytes | 2,178,482,176 bytes | -6.18% |

## Profile Comparison

| Corpus | Bucket | Baseline ms | After ms | Trend |
| --- | --- | ---: | ---: | ---: |
| ZCodeGraph | rustCore.parseExtractionMs | 1,213 | 1,166 | -3.87% |
| ZCodeGraph | rustCore.sqliteWriteMs | 653 | 582 | -10.87% |
| ZCodeGraph | rustCore.localExactReferenceResolutionMs | 520 | 515 | -0.96% |
| ZCodeGraph | typescriptFallbackAppend.durationMs | 136 | 134 | -1.47% |
| ZCodeGraph | typescriptFinalizationMs | 894 | 909 | +1.68% |
| VS Code sparse | rustCore.parseExtractionMs | 40,052 | 39,996 | -0.14% |
| VS Code sparse | rustCore.sqliteWriteMs | 54,061 | 50,132 | -7.27% |
| VS Code sparse | rustCore.localExactReferenceResolutionMs | 37,304 | 36,829 | -1.27% |
| VS Code sparse | typescriptFallbackAppend.durationMs | 1,101 | 1,148 | +4.27% |
| VS Code sparse | typescriptFinalizationMs | 126,363 | 122,274 | -3.24% |

VS Code sparse finalization sub-buckets:

| Bucket | Baseline ms | After ms | Trend |
| --- | ---: | ---: | ---: |
| referenceResolutionMs | 109,635 | 104,426 | -4.75% |
| nameMatchingMs | 50,990 | 50,606 | -0.75% |
| databaseAccessMs | 45,404 | 41,213 | -9.23% |
| perReferenceDisambiguationMs | 45,450 | 45,806 | +0.78% |
| edgeWriteDbMs | 21,728 | 20,504 | -5.63% |
| unresolvedCleanupDbMs | 19,413 | 17,201 | -11.39% |
| dynamicDispatchSynthesisMs | 13,846 | 14,696 | +6.14% |

## Decision

Decision: keep, with low confidence that this specific candidate materially
improves `parseExtractionMs`.

Why keep:

- The change is narrow and semantics-preserving.
- Targeted mixed-language extraction and the full Rust core test suite passed.
- Full-index wall-clock improved on both corpora.
- VS Code sparse RSS improved.

Why the performance conclusion is modest:

- The candidate targeted parser setup overhead inside `parseExtractionMs`, but
  VS Code sparse `parseExtractionMs` only moved from 40,052ms to 39,996ms.
- Most of the VS Code wall-clock movement came from other buckets
  (`sqliteWriteMs`, TypeScript finalization, and finalization database buckets),
  which may include ordinary run-to-run variance.
- This candidate should not be treated as closing #224.

Remaining bottleneck:

The large-corpus end-to-end run is still dominated by TypeScript finalization
and reference-resolution work (`typescriptFinalizationMs` 122,274ms,
`referenceResolutionMs` 104,426ms). Among Rust-owned buckets,
`parseExtractionMs` remains visible and needs more actionable sub-bucket
profiling before another parse/extraction optimization is chosen.

Next recommendation:

- Keep #224 open.
- Reframe #224 toward parse/extraction sub-bucket diagnostics rather than
  assuming parser setup was the meaningful cost.
- For #165, continue treating TypeScript finalization/reference-resolution as
  the largest end-to-end blocker, but require a narrow low-semantic-risk
  candidate before implementing there.

## 24. `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-vscode-sparse.profile.json`

```json
{
  "rustCore": {
    "sourceScanMs": 69,
    "parseExtractionMs": 40052,
    "sqliteWriteMs": 54061,
    "importPathAliasResolutionMs": 7106,
    "importPathAliasResolvedRefs": 19766,
    "importPathAliasFallbackRefs": 251282,
    "importPathAliasBindingFallbackRefs": 168945,
    "importPathAliasUnsupportedFallbackRefs": 2416,
    "importPathAliasUnresolvedFallbackRefs": 79921,
    "esmNamedImportExportResolutionMs": 16639,
    "esmNamedImportExportResolvedRefs": 42601,
    "esmNamedImportExportFallbackRefs": 149517,
    "esmOneHopReexportResolvedRefs": 559,
    "localExactReferenceResolutionMs": 37304,
    "localExactReferenceResolvedRefs": 152103,
    "localExactReferenceFallbackRefs": 734619,
    "subprocessStartupHandoffMs": 3
  },
  "typescriptFallbackAppend": {
    "durationMs": 1101,
    "fallbackFileCount": 317,
    "errorTaxonomy": {
      "read_error": 83,
      "size_exceeded": 1
    }
  },
  "finalize": {
    "frameworkPostExtractMs": 47,
    "referenceResolutionMs": 109635,
    "referenceResolutionBreakdown": {
      "importResolutionMs": 7989,
      "nameMatchingMs": 50990,
      "frameworkMatchingMs": 1500,
      "databaseAccessMs": 45404,
      "cacheWarmupDbMs": 530,
      "refHydrationDbMs": 63,
      "cacheWarmupMs": 593,
      "unresolvedReadMs": 2187,
      "unresolvedReadDbMs": 2187,
      "candidateLookupMs": 8060,
      "sharedCandidateLookupMs": 2527,
      "candidateLookupCacheHitMs": 443,
      "nameMatcherCandidateLookupDbMs": 7646,
      "perReferenceDisambiguationMs": 45450,
      "rustMatcherMs": 0,
      "rustMatcherStartupMs": 0,
      "rustMatcherSerializationMs": 0,
      "rustMatcherEligibleRefs": 0,
      "rustMatcherHandledRefs": 0,
      "rustMatcherFallbackRefs": 0,
      "rustMatcherSemanticMismatchRefs": 0,
      "rustMatcherSemanticMismatchSamples": [],
      "rustMatcherFallbackReasons": {},
      "rustMatcherCandidateMaterializationMs": 0,
      "rustMatcherSubprocessMs": 0,
      "rustMatcherTsVerificationMs": 0,
      "rustMatcherPayloadBytes": 0,
      "rustMatcherUniqueCandidateFacts": 0,
      "candidateReplayEligibleRefs": 0,
      "candidateReplayComparedRefs": 0,
      "candidateReplayEquivalentRefs": 0,
      "candidateReplayMismatchRefs": 0,
      "candidateReplayMismatchReasons": {},
      "candidateReplayMismatchSamples": [],
      "edgeMaterializationMs": 1484,
      "edgeMaterializationDbMs": 1484,
      "edgeWriteMs": 21728,
      "edgeWriteDbMs": 21728,
      "unresolvedCleanupMs": 19413,
      "unresolvedCleanupDbMs": 19413,
      "otherResolutionMs": 461
    },
    "dynamicDispatchSynthesisMs": 13846,
    "dbMaintenanceMs": 198,
    "boundaryProtocol": {
      "version": 1,
      "productShell": "typescript",
      "rustOwnedStages": [
        "source-scan",
        "parse-extraction",
        "graph-write",
        "import-path-alias-resolution",
        "esm-named-import-export-resolution",
        "esm-one-hop-reexport-resolution",
        "local-exact-reference-resolution"
      ]
    },
    "fallbackTaxonomy": {
      "totalFallbacks": 231858,
      "entries": [
        {
          "stage": "framework-post-extract",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "dynamic-dispatch-synthesis",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "db-maintenance",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "binding-level-symbol-disambiguation-not-yet-rust-owned",
          "count": 149517
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unsupported-import-form-not-yet-rust-owned",
          "count": 554
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unresolved-file-level-import-target",
          "count": 81783
        }
      ]
    }
  },
  "typescriptFinalizationMs": 126363
}
```

## 25. `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-zcodegraph.profile.json`

```json
{
  "rustCore": {
    "sourceScanMs": 4,
    "parseExtractionMs": 1213,
    "sqliteWriteMs": 653,
    "importPathAliasResolutionMs": 83,
    "importPathAliasResolvedRefs": 639,
    "importPathAliasFallbackRefs": 2493,
    "importPathAliasBindingFallbackRefs": 2435,
    "importPathAliasUnsupportedFallbackRefs": 49,
    "importPathAliasUnresolvedFallbackRefs": 9,
    "esmNamedImportExportResolutionMs": 459,
    "esmNamedImportExportResolvedRefs": 3036,
    "esmNamedImportExportFallbackRefs": 1507,
    "esmOneHopReexportResolvedRefs": 287,
    "localExactReferenceResolutionMs": 520,
    "localExactReferenceResolvedRefs": 3893,
    "localExactReferenceFallbackRefs": 30774,
    "subprocessStartupHandoffMs": 405
  },
  "typescriptFallbackAppend": {
    "durationMs": 136,
    "fallbackFileCount": 5,
    "errorTaxonomy": {}
  },
  "finalize": {
    "frameworkPostExtractMs": 5,
    "referenceResolutionMs": 463,
    "referenceResolutionBreakdown": {
      "importResolutionMs": 53,
      "nameMatchingMs": 77,
      "frameworkMatchingMs": 62,
      "databaseAccessMs": 247,
      "cacheWarmupDbMs": 3,
      "refHydrationDbMs": 2,
      "cacheWarmupMs": 5,
      "unresolvedReadMs": 31,
      "unresolvedReadDbMs": 31,
      "candidateLookupMs": 18,
      "sharedCandidateLookupMs": 5,
      "candidateLookupCacheHitMs": 1,
      "nameMatcherCandidateLookupDbMs": 18,
      "perReferenceDisambiguationMs": 64,
      "rustMatcherMs": 0,
      "rustMatcherStartupMs": 0,
      "rustMatcherSerializationMs": 0,
      "rustMatcherEligibleRefs": 0,
      "rustMatcherHandledRefs": 0,
      "rustMatcherFallbackRefs": 0,
      "rustMatcherSemanticMismatchRefs": 0,
      "rustMatcherSemanticMismatchSamples": [],
      "rustMatcherFallbackReasons": {},
      "rustMatcherCandidateMaterializationMs": 0,
      "rustMatcherSubprocessMs": 0,
      "rustMatcherTsVerificationMs": 0,
      "rustMatcherPayloadBytes": 0,
      "rustMatcherUniqueCandidateFacts": 0,
      "candidateReplayEligibleRefs": 0,
      "candidateReplayComparedRefs": 0,
      "candidateReplayEquivalentRefs": 0,
      "candidateReplayMismatchRefs": 0,
      "candidateReplayMismatchReasons": {},
      "candidateReplayMismatchSamples": [],
      "edgeMaterializationMs": 12,
      "edgeMaterializationDbMs": 12,
      "edgeWriteMs": 62,
      "edgeWriteDbMs": 62,
      "unresolvedCleanupMs": 137,
      "unresolvedCleanupDbMs": 137,
      "otherResolutionMs": 7
    },
    "dynamicDispatchSynthesisMs": 375,
    "dbMaintenanceMs": 7,
    "boundaryProtocol": {
      "version": 1,
      "productShell": "typescript",
      "rustOwnedStages": [
        "source-scan",
        "parse-extraction",
        "graph-write",
        "import-path-alias-resolution",
        "esm-named-import-export-resolution",
        "esm-one-hop-reexport-resolution",
        "local-exact-reference-resolution"
      ]
    },
    "fallbackTaxonomy": {
      "totalFallbacks": 1569,
      "entries": [
        {
          "stage": "framework-post-extract",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "dynamic-dispatch-synthesis",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "db-maintenance",
          "classification": "known-unsupported",
          "reason": "typescript-finalization-not-yet-migrated",
          "count": 1
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "binding-level-symbol-disambiguation-not-yet-rust-owned",
          "count": 1507
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unsupported-import-form-not-yet-rust-owned",
          "count": 44
        },
        {
          "stage": "reference-resolution",
          "classification": "known-unsupported",
          "reason": "unresolved-file-level-import-target",
          "count": 14
        }
      ]
    }
  },
  "typescriptFinalizationMs": 894
}
```

## 26. `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline.md`

# Rust-Hybrid Wall-Clock A/B v2 Baseline

Date: 2026-06-19

Plan: `docs/plans/2026-06-19-rust-hybrid-default-indexing-wall-clock-ab.md`

Issues: #291, #292, #293, #294

## Scope

This baseline covers only source-path `rust-hybrid` full indexing. It does not
run the full benchmark scoreboard, packaged smoke, release workflow, or agent
sufficiency A/B.

## Environment

- CLI: local built `dist/bin/zcodegraph.js`
- Rust core: local `target/debug/zcodegraph-core`
- Node: 26.0.0 with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`
- Guard env: `CODEGRAPH_NO_DAEMON=1`, `CODEGRAPH_NO_RELAUNCH=1`
- RSS source: `/usr/bin/time -l`

## Corpora

| Corpus | Path | Git checkout | Revision |
| --- | --- | --- | --- |
| ZCodeGraph | `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph` | yes | current `main` |
| VS Code sparse | `/private/tmp/codegraph-corpus/vscode-sparse` | yes | `4ac5322601c6985aba4cd9349c23f4ef22dc3e65` |

## Commands

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-zcodegraph.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph --force --quiet --engine rust-hybrid
```

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-vscode-sparse.profile.json \
/usr/bin/time -l node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

## Results

| Corpus | Wall-clock | Peak RSS | Profile artifact |
| --- | ---: | ---: | --- |
| ZCodeGraph | 4.88s | 319,930,368 bytes | `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-zcodegraph.profile.json` |
| VS Code sparse | 295.14s | 2,321,973,248 bytes | `docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-baseline-vscode-sparse.profile.json` |

## Diagnostic Buckets

| Corpus | rustCore.parseExtractionMs | rustCore.sqliteWriteMs | typescriptFallbackAppend.durationMs | typescriptFinalizationMs | finalize.referenceResolutionMs | finalize.dynamicDispatchSynthesisMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ZCodeGraph | 1,213 | 653 | 136 | 894 | 463 | 375 |
| VS Code sparse | 40,052 | 54,061 | 1,101 | 126,363 | 109,635 | 13,846 |

VS Code sparse finalization sub-buckets:

| Bucket | ms |
| --- | ---: |
| nameMatchingMs | 50,990 |
| databaseAccessMs | 45,404 |
| perReferenceDisambiguationMs | 45,450 |
| edgeWriteDbMs | 21,728 |
| unresolvedCleanupDbMs | 19,413 |
| candidateLookupMs | 8,060 |

VS Code sparse Rust-owned sub-buckets:

| Bucket | ms |
| --- | ---: |
| sqliteWriteMs | 54,061 |
| parseExtractionMs | 40,052 |
| localExactReferenceResolutionMs | 37,304 |
| esmNamedImportExportResolutionMs | 16,639 |
| importPathAliasResolutionMs | 7,106 |

## Candidate Selection

Selected bounded candidate for #292:

Reuse one tree-sitter parser per source language during Rust core extraction
instead of constructing and configuring a new parser for every file.

Reasoning:

- The largest remaining end-to-end bucket is still TypeScript finalization, but
  the low-semantic-risk options there are less obvious from this baseline and
  can easily drift into reference-disambiguation semantics.
- `rustCore.parseExtractionMs` is now a visible Rust-owned bucket on VS Code
  sparse at 40,052ms.
- The current extraction loop constructs a new `Parser` and sets its language
  for every file. Reusing parsers by language is a bounded mechanical candidate
  that should not change extracted graph semantics.
- This partially reframes #224: parse extraction remains relevant, and this
  pass tries one narrow parse/extraction overhead candidate before opening
  broader parser/extractor subsegment work.

Non-selected candidates:

- TypeScript finalization/reference-resolution semantic migration: too broad
  for this plan and explicitly outside the disambiguation guardrail.
- Finalization database write/cleanup: still large, but recent passes already
  addressed several write/cleanup mechanics; this baseline does not isolate one
  lower-risk next write candidate.
- Another Rust SQLite write candidate: the prior pass already moved
  `sqliteWriteMs` materially, and the next obvious low-risk Rust-owned bucket is
  parse/extraction overhead.

Decision for #291: proceed to #292 with the single parser reuse candidate.

## 27. `docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md`

# Rust-Hybrid Candidate Lookup/Cache Protocol Plan

Date: 2026-06-20

Issue: #299

Parent plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`

Related:

- #296 resolver migration decision plan
- #297 current-state architecture map
- #298 ownership classification
- #300 resolver migration decision closeout
- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`

## Decision

Define the first resolver-migration implementation slice as an **in-process
TypeScript candidate lookup/cache protocol boundary**.

This first slice should stabilize candidate facts, lookup shapes, diagnostics,
and equivalence tests before introducing a Rust producer. It must not migrate
or alter every-reference disambiguation decisions.

The first slice is a protocol boundary, not a Rust subprocess migration.

## Why In-Process First

The immediate goal is to move candidate lookup/cache from an internal
TypeScript resolver detail into a stable boundary that can be tested, profiled,
and later backed by Rust.

Starting in-process avoids mixing the protocol decision with:

- Rust subprocess serialization;
- Rust data-model drift;
- cache lifetime across process boundaries;
- mixed Rust-owned and TypeScript fallback graph consistency;
- premature migration of disambiguation semantics.

The in-process protocol must still be shaped as a future Rust-producer
contract.

## Candidate Fact Shape

The protocol should expose stable graph facts that the existing TypeScript
disambiguation logic can consume.

Minimum candidate fact:

- `nodeId`
- `name`
- `qualifiedName`
- `kind`
- `filePath`
- `language`
- `line`
- `column`
- `parentId` or owner identifier when available
- exported/imported signal when already available from graph facts
- `source` / provenance such as `graph-db`, `protocol-cache`, or later
  `rust-produced`

The candidate fact must not include:

- final confidence;
- `resolvedBy`;
- rank score;
- selected target;
- framework-specific synthetic decision;
- dynamic-dispatch result.

Those fields belong to disambiguation or synthesis, not candidate availability.

## Lookup Shapes

First-slice lookup support is limited to DB-backed candidate access that the
current resolver already performs.

Supported shapes:

1. `ExactName`
   - key: `{ name, languageFamily? }`
   - maps to exact-name candidate access.
2. `LowerName`
   - key: `{ lowerName, languageFamily? }`
   - maps to case-insensitive candidate access.
3. `QualifiedName`
   - key: `{ qualifiedName, languageFamily? }`
   - maps to exact qualified-name candidate access.
4. `FileNodes`
   - key: `{ filePath }`
   - maps to nodes in one file.
5. `KnownNamePresence`
   - key: `{ name }`
   - maps to known-name prefilter availability.

Out of first-slice scope:

- scope tree lookup;
- package resolution lookup;
- framework lookup;
- dynamic-dispatch lookup;
- import/re-export chain lookup.

These are resolver semantics, not candidate cache protocol v1.

## Unified Graph Boundary

Candidate materialization must happen after:

1. Rust core graph writes complete.
2. TypeScript fallback append completes.
3. Before TypeScript reference resolution starts.

The cache must be built over the unified SQLite graph, not only Rust-owned
files.

Rules:

- lookup keys must not filter by "Rust-owned file" or "TypeScript fallback
  file";
- candidate facts may carry provenance for diagnostics;
- provenance must not change disambiguation;
- if TypeScript fallback append fails, candidate protocol does not run and the
  existing failure path remains authoritative.

This keeps mixed-graph references valid in both directions: Rust-owned files can
reference fallback files and fallback files can reference Rust-owned files.

## Diagnostics

Diagnostics are public profile artifact fields only. They do not promise a
long-term stable API.

Add a `candidateProtocol` section with:

- `enabled`
- `materializationMs`
- `lookupMs`
- `lookupCount`
- `cacheHitCount`
- `cacheMissCount`
- `dbLookupCount`
- `candidateCount`
- `lookupShapeCounts`
- `lookupShapeMs`
- `equivalenceComparedCount`
- `equivalenceMismatchCount`
- `fallbackReasons`
- `disabledReason`

Compare these with existing finalization fields:

- `candidateLookupMs`
- `candidateLookupCacheHitMs`
- `nameMatcherCandidateLookupDbMs`
- `perReferenceDisambiguationMs`
- `databaseAccessMs`
- `refHydrationDbMs`

Do not expose:

- every candidate list in the profile;
- every reference's source slice;
- long-term stable protocol schema promises;
- agent-facing MCP output.

## Candidate Equivalence

Equivalence should use double-read comparison, not double-decision comparison.

Baseline:

- current resolver context reads candidates through existing DB/cache access.

Protocol:

- candidate protocol reads candidates through the materialized/cache boundary.

For the same lookup shape and key, compare candidate availability:

- candidate node id set;
- candidate count;
- lookup existence;
- empty candidate set behavior.

Order is not a semantic requirement unless the existing disambiguation logic is
shown to depend on order. If order is relevant, the implementation issue must
document and preserve that dependency explicitly.

Do not compare final resolved target in this first slice. Final target
selection remains the TypeScript disambiguation decision.

Mismatch samples should be capped so profile artifacts do not explode.

Required deterministic fixtures:

- same-name multiple candidates;
- lower-name lookup;
- qualified-name lookup;
- file nodes lookup;
- mixed Rust-owned and TypeScript fallback graph;
- missing name / empty candidate set.

## No-Go Criteria

Candidate lookup/cache protocol should stop as the first migration path if any
of these happen:

- deterministic candidate equivalence cannot pass consistently;
- the unified graph after fallback append cannot provide a stable cache
  boundary;
- profile output cannot distinguish candidate protocol cost from
  disambiguation cost;
- the protocol increases wall-clock or RSS without improving diagnostic
  clarity;
- VS Code sparse targeted profile shows no useful movement in
  `candidateLookupMs`, `nameMatcherCandidateLookupDbMs`, or
  `databaseAccessMs`;
- mismatch taxonomy shows the real problem is scope, package, framework, or
  dynamic-dispatch semantics rather than candidate lookup/cache;
- meaningful benefit requires changing every-reference disambiguation
  semantics.

Fallback paths after no-go:

1. cleanup / edge-write / DB maintenance slice;
2. import/export tail slice;
3. local exact references slice;
4. broad disambiguation migration plan only when evidence points there.

## Implementation Acceptance Criteria

The future implementation issue for this slice should require:

- deterministic candidate-equivalence tests;
- graphStats comparison;
- fallback taxonomy comparison;
- before/after profile artifact;
- VS Code sparse targeted profile;
- RSS or unavailable reason;
- no agent A/B by default because disambiguation semantics should not change.

Agent A/B becomes required only if a later implementation changes graph
semantics, language coverage, or user-facing sufficiency claims.

## Input To #300

#300 should close out #296 by recording:

- #297 current-state map is complete;
- #298 ownership classification is complete;
- #299 first-slice protocol plan is complete;
- next implementation issues should start with candidate lookup/cache protocol;
- disambiguation, framework post-extract, and dynamic-dispatch synthesis remain
  outside the first implementation slice.

## 28. `docs/benchmarks/2026-06-20-rust-hybrid-candidate-producer-routing-closeout-decision.md`

# Rust-hybrid candidate producer routing closeout decision

Date: 2026-06-20

Related:

- `docs/plans/2026-06-20-rust-hybrid-candidate-producer-main-path-routing-experiment.md`
- `docs/benchmarks/2026-06-20-rust-candidate-producer-routing-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-20-rust-candidate-producer-routing-vscode-sparse.profile.json`
- #321
- #322
- #323
- #324
- #295
- #165

## Decision

Keep the experimental Rust candidate producer routing slice behind local config.

The experiment is narrow enough to keep:

- default off;
- enabled only by `.zcodegraph/config.json`;
- routed shapes limited to `ExactName` and `KnownNamePresence`;
- TypeScript baseline comparison remains active;
- any mismatch or producer failure fails closed to TypeScript baseline for the run.

Do not broaden the experiment yet. The next migration decision should still
treat final target selection and reference disambiguation as TypeScript-owned
until a separate resolver-migration slice proves otherwise.

## Implementation Summary

The routing experiment now:

- reads `experimental.rustCandidateProducerRouting` from local project config;
- reports concise status JSON at
  `rust.experimental.candidateProducerRouting.enabled/source`;
- precomputes a bare unresolved-reference key universe before resolution;
- batch-runs the Rust candidate producer once for `ExactName` and
  `KnownNamePresence`;
- hydrates Rust ids through TypeScript-side node lookup;
- routes only precomputed exact-name and known-name presence lookups;
- leaves derived receiver/member/tail known-name checks on the TypeScript path;
- records profile diagnostics for configured state, active state, active
  shapes, fallback reason, mismatch count, and bounded mismatch samples.

## Guard Evidence

Automated tests cover:

- local config parsing and status JSON for missing, true, false, invalid JSON,
  and non-boolean values;
- key-universe collection excluding dotted, colon/namespace, path-like, and
  duplicate reference names;
- provider routing for `ExactName` and `KnownNamePresence`;
- provider fail-closed fallback on candidate id mismatch;
- CLI graph stability for routing disabled, routing enabled, and invalid local
  config.

Commands run:

```bash
npx vitest run __tests__/candidate-protocol.test.ts
npx vitest run __tests__/candidate-protocol.test.ts __tests__/status-json.test.ts __tests__/rust-index-engine-cli.test.ts -t "candidate producer|experimental Rust candidate producer routing|status --json reports experimental"
npm run build
```

## Profile Evidence

### Current Repo

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-rust-candidate-producer-routing-zcodegraph.profile.json node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Result:

- profile artifact:
  `docs/benchmarks/2026-06-20-rust-candidate-producer-routing-zcodegraph.profile.json`;
- wall time: 4.67s;
- maximum resident set size: 367804416;
- TypeScript finalization: 1198ms;
- reference resolution: 749ms;
- candidate lookup: 31ms;
- database access: 276ms;
- routing configured: true;
- routing source: `local-config`;
- routing active: true;
- active shapes: `ExactName`, `KnownNamePresence`;
- fallback reason: none;
- mismatch count: 0;
- producer lookups: 628;
- producer candidate count: 459;
- producer payload bytes: 31205.

Fallback taxonomy remained dominated by known TypeScript-owned finalization
work:

- `binding-level-symbol-disambiguation-not-yet-rust-owned`: 1518;
- `unsupported-import-form-not-yet-rust-owned`: 44;
- `unresolved-file-level-import-target`: 14.

### VS Code Sparse Checkout

Setup check:

- `/private/tmp/codegraph-corpus/vscode-sparse` exists;
- it is a Git checkout;
- it contains `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`.

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-20-rust-candidate-producer-routing-vscode-sparse.profile.json node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Result:

- profile artifact:
  `docs/benchmarks/2026-06-20-rust-candidate-producer-routing-vscode-sparse.profile.json`;
- wall time: 149.27s;
- maximum resident set size: 2468626432;
- TypeScript finalization: 72518ms;
- reference resolution: 65473ms;
- candidate lookup: 2400ms;
- database access: 21838ms;
- routing configured: true;
- routing source: `local-config`;
- routing active: true;
- active shapes: `ExactName`, `KnownNamePresence`;
- fallback reason: none;
- mismatch count: 0;
- producer lookups: 230;
- producer candidate count: 1077;
- producer payload bytes: 12641.

Fallback taxonomy remained dominated by known TypeScript-owned finalization
work:

- `binding-level-symbol-disambiguation-not-yet-rust-owned`: 105919;
- `unsupported-import-form-not-yet-rust-owned`: 35;
- `unresolved-file-level-import-target`: 64429.

## Caveats

Both profile commands printed the existing unsupported Node 26 warning. The
runs were intentionally allowed with `CODEGRAPH_ALLOW_UNSAFE_NODE=1` for local
targeted evidence. This warning is environment evidence, not a routing failure.

This closeout does not claim performance improvement. It only establishes a
safe, observable main-path routing experiment with graph-stability evidence and
clean routing diagnostics.

## Follow-Up

Continue resolver migration through dedicated slices. Candidate producer routing
can stay available as an experimental local config while the architecture work
migrates finalization/reference-resolution ownership deliberately.

## 29. `docs/benchmarks/2026-06-20-rust-hybrid-candidate-protocol-closeout-decision.md`

# Rust-hybrid candidate lookup/cache protocol closeout decision

Date: 2026-06-20

Parent issues: #295, #296

Implementation issues: #302, #303, #304, #305, #306

## Decision

Keep the candidate lookup/cache protocol direction as the first implementation slice for resolver migration.

The slice is useful as a TypeScript in-process protocol boundary: it centralizes candidate lookup shapes, preserves current resolver semantics, and produces profile diagnostics that make later Rust producer or deeper resolver migration decisions testable. It is not yet a performance optimization and should not be presented as one.

## What changed

- Added a candidate fact and lookup protocol for `ExactName`, `LowerName`, `QualifiedName`, `FileNodes`, and `KnownNamePresence`.
- Routed existing resolver candidate reads through the protocol when `ZCODEGRAPH_CANDIDATE_PROTOCOL` is enabled.
- Preserved the disabled path with `ZCODEGRAPH_CANDIDATE_PROTOCOL=0`.
- Exposed `candidateProtocol` diagnostics in rust-hybrid `ZCODEGRAPH_INDEX_PROFILE_OUT` artifacts only.
- Added optional double-read equivalence mode with `ZCODEGRAPH_CANDIDATE_PROTOCOL_EQUIVALENCE=1`.

No every-reference disambiguation decision was migrated or changed. TypeScript remains the final resolver decision owner for this slice.

## Tests

- `npm run build`
- `npx vitest run __tests__/candidate-protocol.test.ts`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "candidate protocol"`

The public CLI guard uses a rust-hybrid per-file TypeScript fallback fixture so finalization goes through the TypeScript resolver, then compares protocol enabled vs disabled graph stats and resolved edge shape.

## Evidence artifacts

- `docs/benchmarks/2026-06-20-candidate-protocol-before-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-20-candidate-protocol-after-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-20-candidate-protocol-before-zcodegraph.status.json`
- `docs/benchmarks/2026-06-20-candidate-protocol-after-zcodegraph.status.json`

Commands:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_CANDIDATE_PROTOCOL=0 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-candidate-protocol-before-zcodegraph.profile.json \
  /usr/bin/time -l node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid

CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_CANDIDATE_PROTOCOL=1 ZCODEGRAPH_CANDIDATE_PROTOCOL_EQUIVALENCE=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-candidate-protocol-after-zcodegraph.profile.json \
  /usr/bin/time -l node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

## Targeted profile summary

Corpus: current ZCodeGraph repo.

Environment note: Node 26.0.0 was used with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`, so the run is acceptable for targeted trend evidence but not a release-grade performance benchmark.

| Metric | Before: protocol disabled | After: protocol enabled + equivalence |
| --- | ---: | ---: |
| Wall time | 4.23s | 4.73s |
| Max RSS | 323,846,144 bytes | 341,311,488 bytes |
| Peak memory footprint | 269,737,312 bytes | 289,237,200 bytes |
| `candidateLookupMs` | 19 | 401 |
| `nameMatcherCandidateLookupDbMs` | 16 | 36 |
| `databaseAccessMs` | 245 | 247 |
| `perReferenceDisambiguationMs` | 63 | 62 |
| `candidateProtocol.lookupCount` | 0 | 74,240 |
| `candidateProtocol.dbLookupCount` | 0 | 2,824 |
| `candidateProtocol.cacheHitCount` | 0 | 33,826 |
| `candidateProtocol.equivalenceComparedCount` | 0 | 74,240 |
| `candidateProtocol.equivalenceMismatchCount` | 0 | 0 |
| `candidateProtocol.candidateCount` | 0 | 10,579 |

Interpretation:

- Equivalence evidence is clean: 74,240 protocol lookups compared with 0 mismatches.
- The enabled run is slower because it intentionally double-reads every protocol lookup for equivalence. This is expected and should not be treated as a protocol performance result.
- `databaseAccessMs` and fallback taxonomy stayed effectively stable.

## Graph and fallback stability

Status graph stats:

| Metric | Before | After |
| --- | ---: | ---: |
| `fileCount` | 303 | 303 |
| `nodeCount` | 15,485 | 15,485 |
| `edgeCount` | 32,957 | 32,957 |

Fallback taxonomy total:

| Metric | Before | After |
| --- | ---: | ---: |
| `finalize.fallbackTaxonomy.totalFallbacks` | 1,575 | 1,575 |

The protocol slice did not change graph shape or fallback taxonomy on this targeted corpus.

## VS Code sparse status

Required corpus path: `/private/tmp/codegraph-corpus/vscode-sparse`.

Outcome: completed after human setup hydrated the sparse checkout.

Checkout:

- Git commit: `4a6e32fc1f0`
- Sparse paths: `src/vs/workbench`, `src/vs/platform`, `src/vs/base`
- Hydrated JS/TS files under `src/vs`: 5,780

Artifacts:

- `docs/benchmarks/2026-06-20-candidate-protocol-after-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-20-candidate-protocol-after-vscode-sparse.status.json`

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_CANDIDATE_PROTOCOL=1 ZCODEGRAPH_CANDIDATE_PROTOCOL_EQUIVALENCE=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-candidate-protocol-after-vscode-sparse.profile.json \
  /usr/bin/time -l node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

VS Code sparse profile summary:

| Metric | Value |
| --- | ---: |
| Wall time | 215.78s |
| Max RSS | 1,749,303,296 bytes |
| Peak memory footprint | 2,998,885,984 bytes |
| `fileCount` | 5,780 |
| `nodeCount` | 326,830 |
| `edgeCount` | 918,662 |
| Hybrid fallback files | 290 |
| Hybrid fallback state | degraded |
| `finalize.fallbackTaxonomy.totalFallbacks` | 170,387 |
| `candidateProtocol.lookupCount` | 1,609,764 |
| `candidateProtocol.dbLookupCount` | 93,474 |
| `candidateProtocol.cacheHitCount` | 768,746 |
| `candidateProtocol.equivalenceComparedCount` | 1,609,764 |
| `candidateProtocol.equivalenceMismatchCount` | 0 |
| `candidateProtocol.candidateCount` | 255,322 |
| `candidateLookupMs` | 78,958 |
| `nameMatcherCandidateLookupDbMs` | 3,456 |
| `databaseAccessMs` | 23,252 |
| `perReferenceDisambiguationMs` | 19,246 |

Interpretation:

- The VS Code sparse evidence is now valid and replayable from the hydrated Git checkout.
- Candidate protocol equivalence remained clean at large scale: 1,609,764 comparisons, 0 mismatches.
- The run used equivalence double-read mode, so the wall-clock and lookup timing values are diagnostic overhead measurements, not a keep/no-go performance comparison.
- The hybrid fallback state is degraded because 290 files still used TypeScript fallback; this does not invalidate the candidate protocol evidence because the protocol is intentionally over the unified graph after Rust writes and TypeScript fallback append.

## Closeout

Conclusion: keep.

Recommended next step: add a follow-up slice for a Rust producer or deeper resolver migration only after deciding whether the producer should emit candidate facts directly or whether TypeScript should continue to materialize facts from the unified SQLite graph. The current protocol is sufficient as the product-shell boundary for that decision.

Do not treat this slice as a speed win. Its value is decision quality: lookup shape vocabulary, graph-stability tests, profile diagnostics, and clean equivalence evidence.

## 30. `docs/benchmarks/2026-06-20-rust-hybrid-complete-candidate-producer-routing-boundary-closeout-decision.md`

# Rust Hybrid Complete Candidate Producer Routing Boundary Closeout

Date: 2026-06-20

## Decision

The complete local-config Rust candidate producer routing boundary is semantically keepable.

This does not make routing a default user behavior. It remains gated by the experimental local config:

```json
{ "experimental": { "rustCandidateProducerRouting": true } }
```

The closeout criterion is semantic safety and diagnostic visibility, not an end-to-end performance win.

## Scope Verified

- Routed lookup shapes: `ExactName`, `KnownNamePresence`, `LowerName`, `QualifiedName`, `FileNodes`.
- On-demand single-key node lookups: `LowerName`, `QualifiedName`, `FileNodes`.
- TypeScript baseline comparison remains active for routed node results.
- Fail-closed paths are covered for candidate mismatch, missing result, hydration miss, producer failure, and invalid local config.
- No resolver ranking, confidence, `resolvedBy`, framework behavior, dynamic-dispatch synthesis, or SQLite schema change was introduced.

## Evidence

### Deterministic Tests

- `npx vitest run __tests__/candidate-protocol.test.ts`
  - 9 tests passed.
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "resolved graph stable when Rust candidate producer routing"`
  - Graph stability passed with local-config routing enabled, disabled, and invalid.
- `cargo test candidate_producer`
  - 3 Rust producer tests passed.
- `npm run build`
  - TypeScript build passed.

### Current Repo Profile

Artifact:

- `docs/benchmarks/2026-06-20-complete-routing-boundary-current.profile.json`

Command used Node 24.14.0 from the Codex runtime to avoid the host Node 26 unsupported-version gate:

```bash
env CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-complete-routing-boundary-current.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 530.50s.
- RSS: unavailable. `/usr/bin/time -l` returned `time: sysctl kern.clockrate: Operation not permitted` in the sandbox before reporting max RSS.
- Routing configured: true.
- Routing active: true.
- Active shapes: `ExactName`, `KnownNamePresence`, `LowerName`, `QualifiedName`, `FileNodes`.
- Routing fallback reason: null.
- Routing mismatch count: 0.
- Candidate protocol lookup count: 75,756.
- Candidate protocol DB lookup count: 1,015.
- On-demand routed lookup count: 656.
- On-demand routed lookup shape counts:
  - `LowerName`: 304
  - `QualifiedName`: 320
  - `FileNodes`: 32
- Fallback taxonomy total: 1,582.
- Largest reference-resolution taxonomy entries:
  - `binding-level-symbol-disambiguation-not-yet-rust-owned`: 1,520
  - `unsupported-import-form-not-yet-rust-owned`: 44
  - `unresolved-file-level-import-target`: 14

### VS Code Sparse Profile

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Verified as a Git checkout containing `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`.

Artifact:

- `docs/benchmarks/2026-06-20-complete-routing-boundary-vscode-sparse.profile.json`

Command:

```bash
env CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-20-complete-routing-boundary-vscode-sparse.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 637.72s.
- RSS: unavailable. `/usr/bin/time -l` returned `time: sysctl kern.clockrate: Operation not permitted` in the sandbox before reporting max RSS.
- Routing configured: true.
- Routing active: true.
- Active shapes: `ExactName`, `KnownNamePresence`, `LowerName`, `QualifiedName`, `FileNodes`.
- Routing fallback reason: null.
- Routing mismatch count: 0.
- Candidate protocol lookup count: 1,609,764.
- Candidate protocol DB lookup count: 28,206.
- On-demand routed lookup count: 1,693.
- On-demand routed lookup shape counts:
  - `QualifiedName`: 445
  - `FileNodes`: 1,248
- Fallback taxonomy total: 170,387.
- Largest reference-resolution taxonomy entries:
  - `binding-level-symbol-disambiguation-not-yet-rust-owned`: 105,919
  - `unresolved-file-level-import-target`: 64,429
  - `unsupported-import-form-not-yet-rust-owned`: 35

## Interpretation

The complete routing boundary is safe to keep behind local config because it stays active on both a current-repo run and a large VS Code JS/TS sparse checkout, exposes all five shapes in diagnostics, and records no routing fallback or mismatch.

The performance profile is not a greenlight for default enablement. The VS Code sparse profile still shows `candidateLookupMs` and TypeScript finalization/reference-resolution as the dominant cost centers. Those are inputs for the resolver migration and architecture/performance PRD, not blockers for this local-config boundary.

## Follow-up Inputs

- Continue treating TypeScript finalization/reference-resolution as the architectural bottleneck for default-path performance.
- Use the fallback taxonomy to prioritize remaining Rust ownership:
  - binding-level symbol disambiguation;
  - unresolved file-level import targets;
  - unsupported import forms.
- Re-run RSS capture outside this sandbox if memory evidence becomes a release gate.

## 31. `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`

# Rust-Hybrid Finalization / Reference Resolution Architecture Map

Date: 2026-06-20

Issue: #297

Parent plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`

Related trackers:

- #296 resolver migration decision plan
- #295 architecture/performance PRD
- #165 post-release optimization tracker
- #224 parse/extraction diagnostic track

Architecture record:

- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`

## Purpose

This artifact maps the current TypeScript-owned finalization/reference
resolution tail in the `rust-hybrid` full-index path.

It is intentionally a current-state map, not an implementation proposal. Its
job is to make the existing pipeline, profile buckets, suspected repeated
hydration/lookup costs, and diagnostic gaps visible enough for the next
ownership-classification decision.

## Current End-To-End Pipeline

The current `rust-hybrid` full-index path is:

```text
CLI / SDK
  -> TypeScript product shell
  -> external Rust core indexer
       source scan
       parse/extraction
       Rust-owned graph writes
       Rust-owned import/path/local resolution slices
  -> reopen TypeScript CodeGraph instance
  -> TypeScript fallback append
       TypeScript indexes fallback files into the same graph
       finalization is deliberately not run yet
  -> TypeScript finalization
       framework post-extract
       reference resolution
       dynamic-dispatch synthesis
       database maintenance
       rust-hybrid metadata/profile/status fields
  -> active index consumed by CLI/MCP/SDK
```

The important boundary is after Rust core writes and TypeScript fallback append.
At that point the TypeScript shell reopens the graph and still owns the
finalization tail.

## Current TypeScript-Owned Responsibilities

### Product Shell Orchestration

The TypeScript shell owns the full-index lifecycle around Rust:

- close the active database before invoking the external Rust core;
- invoke the Rust indexer;
- reopen the database through the TypeScript `CodeGraph` API;
- plan and append TypeScript fallback files for `rust-hybrid`;
- run finalization once over the unified graph;
- stamp rust-hybrid metadata;
- combine Rust, fallback, and finalization profile fields.

This is product-shell work and is not the immediate resolver migration target.

### TypeScript Fallback Append

`rust-hybrid` fallback append indexes selected fallback files through the
existing TypeScript extraction path. It intentionally does not clear Rust-owned
data and does not run finalization. Finalization runs once after Rust and
fallback writes both complete.

Profile surface:

- `typescriptFallbackAppend.durationMs`
- `typescriptFallbackAppend.fallbackFileCount`
- `typescriptFallbackAppend.errorTaxonomy`

### Framework Post-Extract

Finalization begins by initializing the resolver and running framework
post-extract hooks. Framework post-extract can update nodes after extraction,
then clears resolver caches so downstream resolution sees fresh graph state.

Profile surface:

- `finalize.frameworkPostExtractMs`

Migration note:

Framework post-extract is coupled to framework-specific semantics and should
not be folded into the first candidate lookup/cache slice.

### Reference Resolution

Reference resolution is still TypeScript-owned for the broad pass. It reads
unresolved references in batches, warms lightweight caches, hydrates references
into resolver-local shapes, resolves each reference, writes edges, deletes
processed unresolved rows, and records detailed timings.

Resolution order for each reference:

1. built-in / external skip;
2. known-name prefilter;
3. import-shape escape for re-export/import cases;
4. framework claims check;
5. JVM import direct resolution;
6. Razor using resolution;
7. framework resolver attempts;
8. import-based resolution;
9. guarded name matcher;
10. highest-confidence candidate selection.

Profile surface:

- `finalize.referenceResolutionMs`
- `finalize.referenceResolutionBreakdown.importResolutionMs`
- `finalize.referenceResolutionBreakdown.nameMatchingMs`
- `finalize.referenceResolutionBreakdown.frameworkMatchingMs`
- `finalize.referenceResolutionBreakdown.databaseAccessMs`
- `finalize.referenceResolutionBreakdown.cacheWarmupDbMs`
- `finalize.referenceResolutionBreakdown.refHydrationDbMs`
- `finalize.referenceResolutionBreakdown.unresolvedReadDbMs`
- `finalize.referenceResolutionBreakdown.candidateLookupMs`
- `finalize.referenceResolutionBreakdown.sharedCandidateLookupMs`
- `finalize.referenceResolutionBreakdown.candidateLookupCacheHitMs`
- `finalize.referenceResolutionBreakdown.nameMatcherCandidateLookupDbMs`
- `finalize.referenceResolutionBreakdown.perReferenceDisambiguationMs`
- `finalize.referenceResolutionBreakdown.edgeMaterializationDbMs`
- `finalize.referenceResolutionBreakdown.edgeWriteDbMs`
- `finalize.referenceResolutionBreakdown.unresolvedCleanupDbMs`

### Candidate Lookup And Cache

The resolver currently uses several TypeScript-side bounded caches:

- file-to-nodes cache;
- exact-name cache;
- lower-name cache;
- qualified-name cache;
- import mapping cache;
- re-export cache;
- known file path set;
- known symbol name set.

The resolver also prewarms grouped name-matching candidates when the same
`referenceName/referenceKind/language` group appears more than once.

Candidate lookup diagnostics already exist, but the cache is still internal to
the TypeScript resolver and is not a narrow TS/Rust protocol. Candidate facts
are not yet a durable Rust-owned or protocol-owned boundary.

This is the most relevant current surface for the planned first migration
slice.

### Guarded Rust Name Matcher And Replay Diagnostics

The resolver has existing Rust matcher and candidate replay diagnostics, but
they are used under the TypeScript resolver's control. The TypeScript pass can:

- collect references eligible for Rust name-matcher evaluation;
- run a Rust name-matcher batch;
- verify the Rust result against the TypeScript decision;
- record semantic mismatches and fallback reasons;
- compare candidate replay output when enabled.

Profile surface:

- `rustMatcherMs`
- `rustMatcherStartupMs`
- `rustMatcherSerializationMs`
- `rustMatcherCandidateMaterializationMs`
- `rustMatcherSubprocessMs`
- `rustMatcherTsVerificationMs`
- `rustMatcherEligibleRefs`
- `rustMatcherHandledRefs`
- `rustMatcherFallbackRefs`
- `rustMatcherSemanticMismatchRefs`
- `candidateReplayEligibleRefs`
- `candidateReplayComparedRefs`
- `candidateReplayEquivalentRefs`
- `candidateReplayMismatchRefs`

Migration note:

These fields are useful precedent for parity/replay evidence. They do not mean
disambiguation execution is already migrated.

### Edge Materialization / Edge Write

Resolved references are materialized into graph edges after disambiguation.
This step re-checks endpoint node kinds in bulk and then writes validated edges
inside a transaction.

Profile surface:

- `edgeMaterializationMs`
- `edgeMaterializationDbMs`
- `edgeWriteMs`
- `edgeWriteDbMs`

### Unresolved Cleanup

The batched resolver deletes both resolved and intentionally-unresolved refs
after each batch so subsequent offset-zero batch reads make progress and the
pass cannot loop forever on the same rows.

Profile surface:

- `unresolvedCleanupMs`
- `unresolvedCleanupDbMs`

### Dynamic-Dispatch Synthesis

After batched reference resolution persists base edges, the resolver runs
dynamic-dispatch synthesis best-effort. It is additive and ignored on failure.

Profile surface:

- `dynamicDispatchSynthesisMs`

Migration note:

This is high sufficiency risk. Partial dynamic-dispatch coverage can be worse
than no coverage, so it should stay out of the first candidate lookup/cache
slice.

### Database Maintenance

After reference resolution, the TypeScript finalization path runs database
maintenance.

Profile surface:

- `dbMaintenanceMs`

## Rust-Owned Work Already Visible At The Boundary

The finalization profile reports a `boundaryProtocol` object with:

- `version`;
- `productShell: "typescript"`;
- `rustOwnedStages`.

The Rust-owned stage list always includes:

- `source-scan`;
- `parse-extraction`;
- `graph-write`.

It can also include Rust-owned reference-resolution slices when the graph shows
those edges:

- `import-path-alias-resolution`;
- `esm-named-import-export-resolution`;
- `esm-one-hop-reexport-resolution`;
- `local-exact-reference-resolution`.

This means the current code already recognizes a staged migration boundary.
However, broad TypeScript finalization/reference resolution still runs after
those Rust-owned slices.

## Existing Evidence

No new large-corpus profile was run for this map. The current evidence is
enough for the mapping task.

### Rust Core Write Optimization

Artifact:

`docs/benchmarks/2026-06-19-rust-hybrid-indexing-performance-ab-after.md`

VS Code sparse after-profile highlights:

| Bucket | After |
| --- | ---: |
| `typescriptFinalizationMs` | 126,161ms |
| `referenceResolutionMs` | 108,595ms |
| `nameMatchingMs` | 52,131ms |
| `databaseAccessMs` | 43,324ms |
| `edgeWriteDbMs` | 21,408ms |
| `unresolvedCleanupDbMs` | 18,382ms |
| `dynamicDispatchSynthesisMs` | 14,475ms |

Interpretation:

The Rust SQLite write optimization moved the Rust write bucket strongly, but
the TypeScript finalization tail stayed essentially flat. That supports
treating finalization/reference resolution as a separate bottleneck.

### Parser Reuse Optimization

Artifact:

`docs/benchmarks/2026-06-19-rust-hybrid-wall-clock-ab-v2-after.md`

VS Code sparse after-profile highlights:

| Bucket | After |
| --- | ---: |
| `typescriptFinalizationMs` | 122,274ms |
| `referenceResolutionMs` | 104,426ms |
| `nameMatchingMs` | 50,606ms |
| `databaseAccessMs` | 41,213ms |
| `perReferenceDisambiguationMs` | 45,806ms |
| `edgeWriteDbMs` | 20,504ms |
| `unresolvedCleanupDbMs` | 17,201ms |
| `dynamicDispatchSynthesisMs` | 14,696ms |

Interpretation:

The finalization tail remains the largest visible end-to-end blocker. Both
database access and per-reference disambiguation are large enough that the next
decision should not assume all cost is DB lookup or all cost is ranking logic.

## Suspected Repeated Hydration / Lookup Costs

The table below separates facts from hypotheses.

| Suspect | Evidence strength | Why it matters |
| --- | --- | --- |
| Unresolved ref batch reads and hydration | Strong that it exists; unknown optimization value | Batched resolution reads unresolved refs from DB, maps them into resolver-local objects, and records `unresolvedReadDbMs` / `refHydrationDbMs`. |
| Name candidate lookup through DB-backed caches | Strong that it exists; medium as first-slice candidate | Name, lower-name, qualified-name, and file-node lookups use SQLite queries behind TypeScript caches and are measured by `candidateLookupMs`, `candidateLookupCacheHitMs`, and `nameMatcherCandidateLookupDbMs`. |
| Repeated same-name candidate lookup | Medium | The resolver already has grouped prewarming for repeated `referenceName/referenceKind/language`, which indicates this pattern was important enough to optimize locally. |
| Per-reference disambiguation cost | Strong that it is large; not safely movable in first slice | VS Code sparse shows `perReferenceDisambiguationMs` around 45.8s in the v2 after-profile. Moving this changes semantics unless parity work exists first. |
| Edge materialization/write DB work | Strong that it exists; not first-slice target | `edgeWriteDbMs` remains visible, but this is downstream of disambiguation and is less directly tied to candidate lookup/cache protocol. |
| Unresolved cleanup DB work | Strong that it exists; not first-slice target | `unresolvedCleanupDbMs` remains visible, but it is cleanup/maintenance rather than candidate lookup. |
| Dynamic-dispatch synthesis | Strong that it exists; high sufficiency risk | `dynamicDispatchSynthesisMs` is visible, but partial migration can regress agent sufficiency. |

## Diagnostic Gaps For The Next Slice

The current profile is useful, but the candidate lookup/cache protocol needs
more specific implementation evidence:

- count of candidate lookup calls by lookup shape;
- cache hit/miss counts by lookup shape;
- candidate set size distribution;
- hydration time separated from ranking/disambiguation time;
- explicit relation between candidate cache movement and `databaseAccessMs`;
- equivalence evidence that candidate availability did not change;
- graphStats and fallback taxonomy before/after.

The current fields already point in this direction, especially
`candidateLookupMs`, `candidateLookupCacheHitMs`,
`nameMatcherCandidateLookupDbMs`, and `perReferenceDisambiguationMs`, but they
do not yet define a durable TS/Rust protocol boundary.

## Guardrail

This mapping slice does not change production behavior and does not recommend a
semantic shortcut.

Every-reference disambiguation semantics must remain unchanged for the first
candidate lookup/cache slice. The first slice may change how candidate sets are
collected, cached, measured, or transported. It must not change how the final
target is selected for a reference.

## Input To #298

The next ownership-classification discussion should start from this split:

| Domain | Current owner | First-slice suitability |
| --- | --- | --- |
| Product shell orchestration | TypeScript | Keep TypeScript-owned |
| TypeScript fallback append | TypeScript | Keep TypeScript-owned |
| Framework post-extract | TypeScript | Not first slice |
| Candidate lookup/cache | TypeScript internal caches | Best first migration slice |
| Disambiguation decision | TypeScript | Do not move in first slice |
| Import/export resolution tail | Mixed Rust-owned slices + TypeScript broad pass | Later slice |
| Local exact references | Mixed Rust-owned slice + TypeScript broad pass | Later slice |
| Edge materialization/write | TypeScript | Later or fallback slice |
| Unresolved cleanup | TypeScript | Later or fallback slice |
| Dynamic-dispatch synthesis | TypeScript | Later high-risk slice |
| Diagnostics/profile/status contract | Mixed | Cross-cutting requirement |

## 32. `docs/benchmarks/2026-06-20-rust-hybrid-finalization-cleanup-closeout-decision.md`

# Rust-hybrid finalization cleanup diagnostics and batching closeout

Date: 2026-06-20

Related:

- `docs/plans/2026-06-20-rust-hybrid-finalization-cleanup-diagnostics-and-batching.md`
- `docs/benchmarks/2026-06-20-finalization-cleanup-current.profile.json`
- `docs/benchmarks/2026-06-20-finalization-cleanup-vscode-sparse.profile.json`
- #326
- #327
- #328
- #329
- #295
- #165

## Decision

Keep the finalization write/cleanup diagnostics.

Treat the bounded resolved cleanup batching optimization as **no-go as a
standalone performance lever**. The implementation is graph-stable and gives
better observability, but the targeted VS Code sparse profile does not show a
credible cleanup-bucket improvement versus the previous routing evidence.

Do not broaden this slice into edge-write ownership, intentionally unresolved
cleanup optimization, Rust subprocess cleanup, or schema changes.

## What Changed

- Split finalization write/cleanup profile diagnostics into:
  - `edgeEndpointValidationDbMs`;
  - `edgeInsertCount`;
  - `resolvedCleanupMs`;
  - `resolvedCleanupDbMs`;
  - `resolvedCleanupRowCount`;
  - `intentionallyUnresolvedCleanupMs`;
  - `intentionallyUnresolvedCleanupDbMs`;
  - `intentionallyUnresolvedCleanupRowCount`.
- Preserved existing high-level fields:
  - `edgeMaterializationMs`;
  - `edgeMaterializationDbMs`;
  - `edgeWriteMs`;
  - `edgeWriteDbMs`;
  - `unresolvedCleanupMs`;
  - `unresolvedCleanupDbMs`;
  - `databaseAccessMs`.
- Added cleanup contract tests for:
  - non-batched resolved cleanup leaving unresolved refs in place;
  - batched cleanup deleting resolved and intentionally unresolved terminal refs;
  - rowid chunk boundaries.
- Attempted a bounded resolved cleanup optimization using compact rowid ranges
  for resolved-reference cleanup only.

## Deterministic Validation

Commands:

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "writes a Rust-produced index and profile"
npx vitest run __tests__/resolution.test.ts -t "unresolved cleanup contract"
npx vitest run __tests__/access-models.test.ts -t "unresolved-reference row ids"
```

Result:

- profile-shape test passed;
- cleanup contract tests passed;
- rowid/range delete tests passed;
- TypeScript build passed.

## Current Repo Evidence

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-finalization-cleanup-current.profile.json node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Result:

- profile artifact:
  `docs/benchmarks/2026-06-20-finalization-cleanup-current.profile.json`;
- wall time: 4.51s;
- maximum resident set size: 348782592;
- peak memory footprint: 296807088;
- TypeScript finalization: 916ms;
- reference resolution: 501ms;
- database access: 278ms;
- edge endpoint validation: 12ms;
- edge insert: 89ms;
- edge insert count: 11930;
- total unresolved cleanup: 140ms;
- resolved cleanup: 91ms;
- resolved cleanup row count: 11930;
- intentionally unresolved cleanup: 49ms;
- intentionally unresolved cleanup row count: 25656;
- fallback taxonomy total: 1580.

## VS Code Sparse Evidence

Setup:

- `/private/tmp/codegraph-corpus/vscode-sparse`;
- validated as a Git checkout;
- contains `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`.

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-20-finalization-cleanup-vscode-sparse.profile.json node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Result:

- profile artifact:
  `docs/benchmarks/2026-06-20-finalization-cleanup-vscode-sparse.profile.json`;
- wall time: 136.39s;
- maximum resident set size: 1671512064;
- peak memory footprint: 2221294400;
- TypeScript finalization: 58236ms;
- reference resolution: 50904ms;
- database access: 23438ms;
- edge endpoint validation: 695ms;
- edge insert: 11888ms;
- edge insert count: 533309;
- total unresolved cleanup: 9902ms;
- resolved cleanup: 7899ms;
- resolved cleanup row count: 533309;
- intentionally unresolved cleanup: 2003ms;
- intentionally unresolved cleanup row count: 157342;
- fallback taxonomy total: 170387.

## Interpretation

The new diagnostics are useful. They show that cleanup is material, and that
resolved cleanup is the dominant cleanup component on VS Code sparse:

- resolved cleanup: 7899ms;
- intentionally unresolved cleanup: 2003ms;
- total cleanup: 9902ms.

However, the bounded rowid-range cleanup optimization is not a clear standalone
win. The previous VS Code sparse routing profile recorded `unresolvedCleanupMs`
at 9108ms, while this run recorded 9902ms. Cross-run noise and other profile
differences mean this is not a strict regression claim, but it is enough to
avoid treating resolved cleanup batching as the next high-confidence lever.

The larger remaining buckets are still:

- `databaseAccessMs`: 23438ms;
- `perReferenceDisambiguationMs`: 18826ms;
- `edgeWriteMs`: 11888ms;
- `unresolvedCleanupMs`: 9902ms.

That points to a broader finalization ownership/write-path decision rather than
more cleanup-only SQL tweaks.

## Caveats

Both targeted profile commands printed the existing Node 26 unsupported runtime
warning. The runs used `CODEGRAPH_ALLOW_UNSAFE_NODE=1` for local evidence. This
is environment evidence, not a cleanup-specific failure.

This closeout does not claim release-level performance improvement. It records
a bounded optimization attempt and a clearer diagnostic basis for the next
architecture decision.

## Follow-Up

Recommended next direction:

- keep the diagnostics;
- do not continue cleanup-only batching as the main performance strategy;
- decide whether the next slice should target edge write ownership/protocol or
  broader per-reference disambiguation execution.

## 33. `docs/benchmarks/2026-06-20-rust-hybrid-finalization-edge-write-bulk-insert-closeout-decision.md`

# Rust-Hybrid Finalization Edge-Write Bulk Insert Closeout Decision

Date: 2026-06-20

## Scope

This artifact closes the bounded edge-write diagnostics and TypeScript-side `insertValidatedEdges()` bulk insert slice from:

- `docs/plans/2026-06-20-rust-hybrid-finalization-edge-write-diagnostics-and-bulk-insert.md`
- Issues #330, #331, #332, and #333

The implementation keeps the existing schema and finalization semantics intact. It does not change `insertEdge()`, does not introduce a multi-row SQL statement, and does not move edge writes into the Rust subprocess.

## Change

- Added public profile diagnostics for finalization edge insert work:
  - `edgeInsertSerializationMs`
  - `edgeInsertSerializedBytes`
- Changed `insertValidatedEdges()` to pre-serialize validated edges into SQLite row params once, prepare the insert statement once, and execute those rows inside one transaction.
- Preserved `INSERT OR IGNORE` and the existing validated-edge endpoint contract.
- Added deterministic DB contract coverage for validated edge row shape and empty-batch diagnostics.

## Evidence

### Current repo

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-edge-write-bulk-current.profile.json node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Artifacts:

- Baseline: `docs/benchmarks/2026-06-20-finalization-cleanup-current.profile.json`
- After: `docs/benchmarks/2026-06-20-edge-write-bulk-current.profile.json`

| Metric | Baseline | After |
| --- | ---: | ---: |
| `typescriptFinalizationMs` | 916 | 974 |
| `referenceResolutionMs` | 501 | 526 |
| `databaseAccessMs` | 278 | 288 |
| `edgeInsertCount` | 11930 | 11938 |
| `edgeWriteMs` | 89 | 91 |
| `edgeWriteDbMs` | 89 | 91 |
| `edgeInsertSerializationMs` | unavailable | 0 |
| `edgeInsertSerializedBytes` | unavailable | 1551957 |
| RSS | unavailable | 346406912 bytes |
| peak memory footprint | unavailable | 294480536 bytes |

### VS Code sparse checkout

Checkout:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- validated as a Git checkout with `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-20-edge-write-bulk-vscode-sparse.profile.json node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Artifacts:

- Baseline: `docs/benchmarks/2026-06-20-finalization-cleanup-vscode-sparse.profile.json`
- After: `docs/benchmarks/2026-06-20-edge-write-bulk-vscode-sparse.profile.json`

| Metric | Baseline | After |
| --- | ---: | ---: |
| `typescriptFinalizationMs` | 58236 | 57580 |
| `referenceResolutionMs` | 50904 | 49778 |
| `databaseAccessMs` | 23438 | 22960 |
| `edgeInsertCount` | 533309 | 533309 |
| `edgeWriteMs` | 11888 | 11745 |
| `edgeWriteDbMs` | 11888 | 11745 |
| `edgeInsertSerializationMs` | unavailable | 31 |
| `edgeInsertSerializedBytes` | unavailable | 68812174 |
| RSS | unavailable | 2235990016 bytes |
| peak memory footprint | unavailable | 2791004080 bytes |

## Decision

Decision: keep.

The change is behavior-preserving and improves profile observability. The bounded optimization shows a small favorable trend on the large VS Code sparse checkout, but the measured improvement is not large enough to treat TypeScript-side validated-edge pre-serialization as a major standalone performance lever.

This evidence supports keeping the simpler pre-serialized row path, but future performance work should continue to prioritize larger finalization bottlenecks such as candidate lookup, reference resolution/finalization architecture, and cleanup/write-path segmentation.

## Caveats

- Runs were targeted smoke/profile runs, not a full multi-run benchmark.
- The local environment used Node 26 with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`, so the CLI emitted the existing unsafe Node warning. The run completed successfully.
- RSS baseline was not available in the cleanup baseline artifacts, so RSS is recorded for the after runs only.

## 34. `docs/benchmarks/2026-06-20-rust-hybrid-js-ts-file-import-target-parity-closeout-decision.md`

# Rust-Hybrid JS/TS File Import Target Parity Closeout

Date: 2026-06-20

## Decision

Keep the Rust JS/TS file-level import target parity slice.

The implementation improves feature completeness for conventional aliases and
workspace package subpaths, and it adds source-kind diagnostics that make the
remaining file-target gap easier to reason about. It does not materially reduce
the VS Code sparse `unresolved-file-level-import-target` gap because that corpus
did not exercise the newly added conventional-alias or workspace-package paths.

This is a semantic/diagnostic keep decision, not a performance win claim.

## Scope Verified

- Conventional aliases:
  - `@/`
  - `~/`
  - `@src/`
  - `src/`
  - `@app/`
  - `app/`
- Workspace package subpaths from:
  - root `package.json` `workspaces` array;
  - root `package.json` `workspaces.packages` array;
  - root `pnpm-workspace.yaml` `packages:` list.
- Longest package-name matching.
- Existing relative import behavior.
- Existing tsconfig/jsconfig paths behavior.
- Profile diagnostics:
  - `importPathAliasResolvedBySource`
  - `importPathAliasFallbackBySource`

No package `exports`, `main`, npm package resolution, `.svelte`/`.vue` target
extensions, or binding-level symbol disambiguation was added.

## Deterministic Evidence

- `cargo test rust_workspace_package_loader_handles_manifests_and_longest_match`
  - Passed.
- `cargo test rust_resolves_js_ts_alias_and_workspace_file_import_targets`
  - Passed.
- `cargo test emits_machine_readable_result_json`
  - Passed.
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "relative and paths-alias|conventional aliases and workspace package"`
  - Passed.
- `npm run build`
  - Passed.

The deterministic fixtures prove:

- conventional aliases resolve to Rust-owned file-level `imports` edges;
- package.json workspaces resolve to Rust-owned file-level `imports` edges;
- pnpm workspace packages resolve to Rust-owned file-level `imports` edges;
- existing relative and tsconfig/jsconfig path behavior remains covered;
- profile source-kind diagnostics are present.

## Current Repo Profile

Artifact:

- `docs/benchmarks/2026-06-20-js-ts-file-import-target-parity-current.profile.json`

Command used Node 24.14.0 from the Codex runtime to avoid the host Node 26
unsupported-version gate:

```bash
env CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-js-ts-file-import-target-parity-current.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 30.92s.
- RSS: unavailable. `/usr/bin/time -l` returned
  `time: sysctl kern.clockrate: Operation not permitted` in this sandbox before
  reporting max RSS.
- `importPathAliasResolvedRefs`: 654.
- `importPathAliasFallbackRefs`: 2,525.
- `importPathAliasBindingFallbackRefs`: 2,467.
- `importPathAliasUnsupportedFallbackRefs`: 49.
- `importPathAliasUnresolvedFallbackRefs`: 9.
- `importPathAliasResolvedBySource`:
  - `relative`: 637
  - `tsconfigPaths`: 17
  - `conventionalAlias`: 0
  - `workspacePackage`: 0
- `importPathAliasFallbackBySource`:
  - `relative`: 9
  - `tsconfigPaths`: 0
  - `conventionalAlias`: 0
  - `workspacePackage`: 0
  - `binding`: 2,467
  - `unsupported`: 49
  - `unresolved`: 9
- Reference-resolution fallback taxonomy:
  - `binding-level-symbol-disambiguation-not-yet-rust-owned`: 1,520
  - `unsupported-import-form-not-yet-rust-owned`: 44
  - `unresolved-file-level-import-target`: 14

Interpretation:

- The current repo does not exercise the new conventional alias or workspace
  package paths in a meaningful way.
- The new diagnostics are present and show that remaining file-target misses in
  this repo are relative-path misses.

## VS Code Sparse Profile

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Verified as a Git checkout containing `src/vs/workbench`, `src/vs/platform`,
  and `src/vs/base`.

Artifact:

- `docs/benchmarks/2026-06-20-js-ts-file-import-target-parity-vscode-sparse.profile.json`

Command:

```bash
env CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-20-js-ts-file-import-target-parity-vscode-sparse.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 648.28s.
- RSS: unavailable. `/usr/bin/time -l` returned
  `time: sysctl kern.clockrate: Operation not permitted` in this sandbox before
  reporting max RSS.
- `importPathAliasResolvedRefs`: 31.
- `importPathAliasFallbackRefs`: 170,384.
- `importPathAliasBindingFallbackRefs`: 105,920.
- `importPathAliasUnsupportedFallbackRefs`: 273.
- `importPathAliasUnresolvedFallbackRefs`: 64,191.
- `importPathAliasResolvedBySource`:
  - `relative`: 31
  - `tsconfigPaths`: 0
  - `conventionalAlias`: 0
  - `workspacePackage`: 0
- `importPathAliasFallbackBySource`:
  - `relative`: 64,191
  - `tsconfigPaths`: 0
  - `conventionalAlias`: 0
  - `workspacePackage`: 0
  - `binding`: 105,920
  - `unsupported`: 273
  - `unresolved`: 64,191
- Reference-resolution fallback taxonomy:
  - `binding-level-symbol-disambiguation-not-yet-rust-owned`: 105,919
  - `unsupported-import-form-not-yet-rust-owned`: 35
  - `unresolved-file-level-import-target`: 64,429

Interpretation:

- The VS Code sparse corpus did not exercise the newly added conventional alias
  or workspace package paths.
- The large file-target gap is now more specifically attributable to relative
  import target misses, not to conventional aliases or workspace package
  subpaths.
- This changes the next-step priority: do not keep expanding this slice toward
  package resolution; inspect the relative unresolved import target set or move
  to binding-level symbol disambiguation depending on whether the next goal is
  file-target completeness or resolver migration depth.

## Follow-Up

- Keep conventional alias and workspace package support because deterministic
  fixtures prove semantic parity for those TS resolver paths.
- Use the new source-kind diagnostics in future profile closeouts.
- If continuing file-target completeness, sample the `relative` unresolved
  target set before implementing another resolver expansion.
- If continuing resolver migration, return to binding-level import/export symbol
  disambiguation because it remains the largest known unsupported category.

## 35. `docs/benchmarks/2026-06-20-rust-hybrid-legacy-env-flag-config-audit.md`

# Rust-hybrid legacy environment flag config audit

Date: 2026-06-20

Related:

- #325
- `docs/plans/2026-06-20-rust-hybrid-candidate-producer-main-path-routing-experiment.md`

## Decision

Do not migrate or remove legacy environment flags in the candidate producer
routing slice.

Use this audit to separate future config migration from flags that should remain
environment-only because they are diagnostic, test, packaging, or process
control mechanisms.

## Classification

| Flag family | Category | Recommendation |
| --- | --- | --- |
| `ZCODEGRAPH_CANDIDATE_PROTOCOL` | user/experimental behavior | Candidate for future local config migration. Keep for now because it guards the broader candidate protocol, not only Rust routing. |
| `ZCODEGRAPH_CANDIDATE_PROTOCOL_EQUIVALENCE` | diagnostic/equivalence behavior | Keep as diagnostic/dev control for now. It is useful for verification and should not become a user-facing stable config yet. |
| `ZCODEGRAPH_RUST_CANDIDATE_PRODUCER` | user/experimental behavior | Candidate for future local config migration or removal once local routing config fully replaces shadow-only activation. Keep for now to avoid changing existing benchmark scripts. |
| `ZCODEGRAPH_RUST_NAME_MATCHER` | user/experimental behavior | Candidate for future local config migration, but separate from candidate producer routing. |
| `ZCODEGRAPH_RUST_NAME_MATCHER_STRICT` | diagnostic/equivalence behavior | Keep as diagnostic/dev control until Rust name matcher ownership is settled. |
| `ZCODEGRAPH_NAME_MATCHER_REPLAY_AB` | diagnostic A/B behavior | Keep as diagnostic/dev control. It is explicitly for replay evidence, not default product behavior. |
| `ZCODEGRAPH_RUST_CORE_BINARY` | dev/test/packaging override | Keep as env. It is a toolchain and packaged-binary override, useful in tests and release validation. |
| `ZCODEGRAPH_RUST_CORE_ARTIFACT_DIR` | dev/test/packaging override | Keep as env. It belongs to bundle/release plumbing, not local project behavior. |
| `ZCODEGRAPH_INDEX_PROFILE_OUT` | diagnostic output | Keep as env. It is a one-shot output path for profile artifacts and should remain easy for scripts to set. |
| `ZCODEGRAPH_EXPERIMENT_*` | script-private experiment | Keep script-private. Do not migrate into product config. |
| `ZCODEGRAPH_PHASE3_*` | script-private experiment | Keep script-private. These are historical validation script controls. |
| `ZCODEGRAPH_INDEX_ENGINE` | already-deprecated user entrypoint | Keep fail-fast behavior. Do not reintroduce env-based engine selection. |
| `CODEGRAPH_ALLOW_UNSAFE_NODE` | process-control/runtime safety | Keep as env. It gates unsafe runtime override and should stay explicit per process. |
| `CODEGRAPH_NO_DAEMON` | process-control | Keep as env. It is a process-launch behavior used by tests, CI, and troubleshooting. |
| `CODEGRAPH_NO_RELAUNCH` | process-control | Keep as env. It controls runtime relaunch behavior and belongs outside project config. |
| `CODEGRAPH_WASM_RELAUNCHED` | process-control/internal guard | Keep internal env. It prevents relaunch loops. |
| `CODEGRAPH_HOST_PPID` | process-control/internal guard | Keep internal env. It supports process lifetime tracking. |
| `CODEGRAPH_MCP_TOOLS` | operator/runtime control | Keep as env. It is a deployment/operator allowlist, not per-project indexing behavior. |
| `CODEGRAPH_EXPLORE_LINENUMS` | diagnostic/output behavior | Keep as env unless explore output config becomes a broader product surface. |
| `CODEGRAPH_ADAPTIVE_EXPLORE` | experimental retrieval behavior | Candidate for future config discussion, but not part of Rust resolver migration. |
| `CODEGRAPH_INSTALL_DIR` | packaging/install override | Keep as env. It is npm SDK/install plumbing. |
| `CODEGRAPH_NO_DOWNLOAD` | packaging/install override | Keep as env. It is install/test plumbing. |

## Migration Boundary

Good local-config candidates are long-lived project behavior switches:

- candidate protocol activation;
- Rust name matcher activation;
- Rust candidate producer activation or routing.

Poor local-config candidates are process-scoped controls:

- unsafe Node override;
- daemon/relaunch controls;
- packaged binary overrides;
- one-shot profile output paths;
- script-only experiment knobs.

## Follow-Up Recommendation

Create a future technical-debt slice only when one of these becomes necessary:

1. Migrate user/experimental behavior flags into `.zcodegraph/config.json`.
2. Keep diagnostic, process-control, and packaging flags as environment
   variables.
3. Remove or fail-fast deprecated user entrypoints that conflict with the
   current product mental model.

No runtime behavior changed as part of this audit.

## 36. `docs/benchmarks/2026-06-20-rust-hybrid-lowername-default-on-routing-closeout-decision.md`

# Rust-Hybrid LowerName Default-On Routing Closeout Decision

Date: 2026-06-20

## Scope

This artifact closes the LowerName default-on routing implementation slice:

- Plan: `docs/plans/2026-06-20-rust-hybrid-lowername-default-on-routing.md`
- Issues: #334, #335, #336, #337
- Parent PRD: #295
- Optimization tracker: #165

## Implementation Summary

Implemented and validated:

- `LowerName` is now included in the Rust candidate producer routing shape set
  when candidate producer routing is locally enabled.
- Bare unresolved-reference routing precompute now includes:
  - `ExactName`
  - `KnownNamePresence`
  - `LowerName`
- Resolver-emitted `LowerName` lookups can use synchronous single-key
  on-demand Rust producer lookup when no precomputed result exists.
- Successful on-demand `LowerName` results are cached.
- Mismatch, missing result, node hydration miss, invalid config, or producer
  failure fails closed to the TypeScript baseline without failing indexing.
- Profile diagnostics now report routed shapes and on-demand LowerName counts.

Not kept:

- `rust-hybrid` default-on candidate producer routing.

The default-on behavior was implemented and profiled, but the targeted evidence
does not support shipping it as the default path. The final code keeps routing
behind the existing local experimental config.

## Evidence

### Current repo default-on trial

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-lowername-default-on-current.profile.json node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Artifact:

- `docs/benchmarks/2026-06-20-lowername-default-on-current.profile.json`

Result:

| Metric | Value |
| --- | ---: |
| wall time | 14.61s |
| maximum resident set size | 374538240 bytes |
| peak memory footprint | 323120752 bytes |
| `typescriptFinalizationMs` | 11097 |
| `referenceResolutionMs` | 10650 |
| `databaseAccessMs` | 290 |
| `candidateLookupMs` | 9848 |
| `perReferenceDisambiguationMs` | 78 |
| `edgeWriteMs` | 95 |
| routing source | `default-rust-hybrid` |
| routing active | true |
| active shapes | `ExactName`, `KnownNamePresence`, `LowerName` |
| fallback reason | none |
| mismatch count | 0 |
| on-demand LowerName lookups | 304 |
| on-demand cache hits | 0 |

### VS Code sparse default-on trial

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- validated as a Git checkout with `src/vs/workbench`, `src/vs/platform`, and
  `src/vs/base`

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-20-lowername-default-on-vscode-sparse.profile.json node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Artifact:

- `docs/benchmarks/2026-06-20-lowername-default-on-vscode-sparse.profile.json`

Result:

| Metric | Value |
| --- | ---: |
| wall time | 241.26s |
| maximum resident set size | 2102853632 bytes |
| peak memory footprint | 2363255760 bytes |
| `typescriptFinalizationMs` | 164829 |
| `referenceResolutionMs` | 157700 |
| `databaseAccessMs` | 23024 |
| `candidateLookupMs` | 85229 |
| `perReferenceDisambiguationMs` | 19708 |
| `edgeWriteMs` | 11865 |
| routing source | `default-rust-hybrid` |
| routing active | true |
| active shapes | `ExactName`, `KnownNamePresence`, `LowerName` |
| fallback reason | none |
| mismatch count | 0 |
| precomputed producer lookups | 345 |
| precomputed LowerName lookups | 115 |
| on-demand LowerName lookups | 0 |
| on-demand cache hits | 0 |

Comparison context:

- Prior VS Code sparse routing experiment with only `ExactName` and
  `KnownNamePresence` recorded wall time 149.27s and `candidateLookupMs` 2400.
- Prior VS Code sparse edge-write profile recorded wall time 134.54s and
  `candidateLookupMs` 2577.
- The LowerName default-on trial recorded wall time 241.26s and
  `candidateLookupMs` 85229.

## Decision

Decision: no-go for default-on LowerName routing.

The graph remained stable and the Rust producer did not report mismatches, but
the default-on trial introduced a large candidate lookup cost regression. The
regression is visible on both current repo and VS Code sparse evidence. This
does not meet the bar for changing the default `rust-hybrid` user path.

Keep the implementation only as an experimental local-config capability:

```json
{
  "experimental": {
    "rustCandidateProducerRouting": true
  }
}
```

The missing-config default remains disabled. Invalid local config remains
fail-closed and diagnostic-only.

## Follow-Up

Treat default-on LowerName routing as prerequisite work, not as an accepted
default-path optimization.

Before reconsidering default-on, a follow-up slice should explain and reduce
the `candidateLookupMs` regression. Plausible candidates:

- avoid repeated expensive TypeScript baseline verification in the hot path
  without weakening graph-stability evidence;
- batch or sessionize LowerName producer/baseline verification;
- move more of the LowerName equivalence check into a bounded preflight instead
  of per-lookup routing;
- keep LowerName routing local-config-only until the candidate lookup cost is
  back near the ExactName/KnownName routing profile.

## Caveats

- Runs were targeted smoke/profile runs, not full multi-run benchmarks.
- Both profile runs used Node 26 with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`, so the
  CLI emitted the existing unsafe Node warning. The runs completed
  successfully.

## 37. `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md`

# Rust-Hybrid Resolver Migration Closeout Decision

Date: 2026-06-20

Issue: #300

Parent plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`

Parent issue: #296

Related:

- #295 architecture/performance PRD
- #165 post-release optimization tracker
- #297 current-state architecture map
- #298 ownership classification
- #299 candidate lookup/cache first-slice plan
- #301 historical benchmark decision ADR migration cleanup
- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`

## Decision

Accept the resolver migration decision plan.

The route is:

```text
Current:
  TypeScript-owned finalization/reference-resolution tail

Target:
  Rust-owned finalization/reference-resolution
    with a narrow protocol boundary to the TypeScript product shell

First implementation slice:
  in-process TypeScript candidate lookup/cache protocol boundary
```

The first slice should define and validate candidate facts, lookup shapes,
unified-graph materialization, diagnostics, and candidate availability
equivalence. It must not migrate or alter every-reference disambiguation
decisions.

## Completed Decision Artifacts

### #297 Current-State Map

Artifact:

`docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`

Result:

- mapped the current `rust-hybrid` pipeline from Rust core output through
  TypeScript fallback append and TypeScript finalization;
- identified TypeScript-owned responsibilities;
- cited existing profile evidence instead of running a new large-corpus
  benchmark;
- separated repeated hydration/lookup facts from hypotheses;
- preserved the semantic guardrail for disambiguation decisions.

### #298 Ownership Classification

Artifact:

`docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`

Result:

- accepted ADR ZJ-0002 as the long-term architecture direction;
- classified migration domains by ownership target;
- chose candidate lookup/cache as protocol-owned first and Rust-owned later if
  evidence supports it;
- kept disambiguation TypeScript-owned until parity/replay/profile evidence
  justifies a separate migration plan;
- deferred framework post-extract and dynamic-dispatch synthesis by
  framework/mechanism.

### #299 First-Slice Plan

Artifact:

`docs/benchmarks/2026-06-20-rust-hybrid-candidate-lookup-cache-protocol-plan.md`

Result:

- defined the first slice as an in-process TypeScript protocol boundary;
- defined candidate fact shape;
- defined lookup shapes: `ExactName`, `LowerName`, `QualifiedName`,
  `FileNodes`, and `KnownNamePresence`;
- required materialization over the unified graph after Rust writes and
  TypeScript fallback append;
- defined profile diagnostics;
- defined candidate availability equivalence, no-go criteria, and implementation
  evidence requirements.

## How #295 Should Consume This Plan

#295 should proceed with candidate lookup/cache protocol as its
architecture-backed implementation slice.

This means #295's implementation phase should not start with:

- full resolver migration;
- broad disambiguation migration;
- framework post-extract migration;
- dynamic-dispatch synthesis migration;
- package/default/namespace/type-only import resolver expansion.

Instead, #295 should create implementation issues for a narrow candidate
lookup/cache protocol boundary that preserves existing disambiguation semantics.

## Next Implementation Issues To Create

Do not treat this list as already-created scope. These are the recommended next
issues after accepting #296.

1. Implement an in-process candidate lookup/cache protocol boundary.
   - Define candidate fact shape and lookup shape types.
   - Materialize over the unified graph after fallback append.
   - Keep existing TypeScript disambiguation decisions unchanged.

2. Add candidate protocol diagnostics and profile artifact fields.
   - Add `candidateProtocol` diagnostics.
   - Compare against existing candidate lookup and database-access fields.
   - Keep fields as profile diagnostics, not a long-term public API contract.

3. Add candidate availability equivalence tests.
   - Double-read baseline vs protocol candidate availability.
   - Cover exact-name, lower-name, qualified-name, file-nodes, known-name
     presence, mixed Rust/TypeScript fallback graph, and empty candidate sets.

4. Run targeted implementation evidence.
   - Before/after profile artifact.
   - VS Code sparse targeted profile.
   - graphStats comparison.
   - fallback taxonomy comparison.
   - RSS or unavailable reason.

5. Close out candidate lookup/cache protocol with keep / no-go / prerequisite.
   - If effective, use it as the first migration step toward Rust-owned
     resolver execution.
   - If no-go, choose among cleanup/edge-write/DB maintenance, import/export
     tail, local exact references, or broad disambiguation planning based on
     evidence.

## Semantic Guardrail

The first implementation slice may change how candidate sets are collected,
cached, transported, measured, or diagnosed.

It must not change:

- final target selection;
- confidence calculation;
- `resolvedBy` semantics;
- ranking/tie-break semantics;
- framework synthetic decisions;
- dynamic-dispatch synthesis decisions.

Every-reference disambiguation remains TypeScript-owned until a later migration
plan satisfies the preconditions in the ownership decision artifact.

## Tracker Implication

- #296 can be accepted as complete after this closeout.
- #295 should consume the accepted first-slice plan.
- #165 should remain open because this is an architecture route and first-slice
  plan, not performance target closure.
- #301 remains open as a separate documentation cleanup for historical
  benchmark decision artifacts.

## 38. `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`

# Rust-Hybrid Resolver Migration Ownership Decision

Date: 2026-06-20

Issue: #298

Parent plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`

Related:

- #296 resolver migration decision plan
- #297 current-state architecture map
- #299 candidate lookup/cache protocol first-slice plan
- #301 historical benchmark decision ADR migration cleanup
- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`

## Decision

Accept the long-term direction from ADR ZJ-0002:

```text
Rust-owned finalization/reference-resolution
  with a narrow protocol boundary to the TypeScript product shell
```

For the migration route, classify ownership by domain instead of treating
finalization/reference resolution as one indivisible rewrite.

The first implementation slice should be **candidate lookup/cache protocol**.
It should not migrate or alter every-reference disambiguation decisions.

## Ownership Classification

| Domain | Target ownership | First-slice status | Rationale |
| --- | --- | --- | --- |
| Product shell orchestration | TypeScript-owned | Out of first slice | CLI/SDK lifecycle, fallback planning, status/doctor packaging, MCP surfaces, and compatibility glue are product-shell responsibilities rather than resolver execution. |
| TypeScript fallback append | TypeScript-owned for now | Out of first slice | Fallback append serves unsupported or not-yet-Rust-owned files and should not be mixed into resolver migration. |
| Candidate lookup/cache | Protocol-owned first, Rust-owned later if evidence supports it | First slice | This is closest to repeated candidate hydration/lookup cost while preserving current disambiguation semantics. |
| Disambiguation decision | TypeScript-owned first, Rust-owned later | Explicitly excluded from first slice | This is the graph semantic core. It requires stronger parity/replay evidence before migration. |
| Import/export resolution tail | Rust-owned later | Later slice before broad disambiguation | Existing Rust-owned slices prove the direction, but package/default/namespace/type-only scope creep must be avoided. |
| Local exact references | Rust-owned later | Later slice before broad disambiguation | Existing Rust-owned local exact work makes this a plausible medium-risk migration domain, but scope parity still matters. |
| Cleanup / edge-write / DB maintenance | Rust-owned later; protocol-owned transition acceptable | Fallback implementation candidate | These are mechanical finalization tail costs. They are not the first choice, but can become the fallback slice if candidate lookup/cache is no-go. |
| Framework post-extract | Deferred; split by framework later | Out of first slice | Framework-specific semantics directly affect sufficiency and should be migrated one framework at a time. |
| Dynamic-dispatch synthesis | Deferred; split by mechanism later | Out of first slice | Partial dynamic-dispatch coverage can be worse than none. Migrate mechanism-by-mechanism with end-to-end flow evidence. |
| Diagnostics / profile / status contract | Protocol-owned | Cross-cutting requirement | The migrated path must remain explainable through profile buckets, fallback taxonomy, graphStats, and status/doctor artifacts. |

## Why Candidate Lookup/Cache Is Protocol-Owned First

The first slice should stabilize the contract for candidate facts before moving
semantic decisions.

Protocol-owned means:

- candidate set shape is explicitly defined;
- lookup keys account for name, file, scope, language, and fallback context;
- TypeScript can continue to perform disambiguation using the candidate set;
- Rust can later become the candidate producer if equivalence evidence supports
  it;
- diagnostics can distinguish candidate materialization, transport/cache,
  hit/miss behavior, TypeScript disambiguation, and downstream edge work.

Direct Rust ownership in the first slice is rejected because it risks combining
candidate generation, scope semantics, fallback graph consistency, TypeScript
verification, and performance optimization into one large semantic migration.

## Disambiguation Migration Preconditions

Disambiguation execution must remain TypeScript-owned until all of these are
true:

- candidate lookup/cache protocol can produce stable candidate sets;
- candidate availability equivalence tests pass;
- replay diagnostics can compare the TypeScript baseline with the
  protocol/Rust candidate source;
- fallback taxonomy remains stable;
- graphStats remain stable or every change is explained;
- representative corpus profile evidence shows the remaining bottleneck is
  still in per-reference disambiguation rather than candidate lookup/hydration;
- a separate migration plan states whether ranking/tie-break semantics are
  preserved or intentionally changed by an explicit architecture/product
  decision.

Until then, any optimization may change candidate collection, caching,
transport, and measurement, but not final target selection.

## Deferred Domains

Framework post-extract and dynamic-dispatch synthesis remain part of the
long-term migration target. They are deferred because they carry high Agent
Sufficiency risk.

Rules:

- framework post-extract must be split by framework;
- dynamic-dispatch synthesis must be split by mechanism;
- partial flow coverage must not be shipped as a hidden improvement;
- semantic movement in these domains may require deterministic flow evidence,
  real repo smoke, or agent A/B evidence depending on the surface touched.

## Migration Order

Default order:

1. Candidate lookup/cache protocol.
2. Import/export tail or local exact references, chosen by profile and parity
   evidence.
3. Cleanup / edge-write / DB maintenance if candidate cache is no-go or if DB
   write/cleanup remains dominant after the first slice.
4. Broad disambiguation execution.
5. Framework post-extract by framework.
6. Dynamic-dispatch synthesis by mechanism.

This order can change only through a later decision artifact that explains the
new evidence and trade-off.

## Guardrails

- Do not change default user behavior.
- Do not change every-reference disambiguation semantics in the first slice.
- Do not bundle framework or dynamic-dispatch migration into candidate
  lookup/cache.
- Do not claim performance target closure from this ownership decision.
- Do not move raw benchmark evidence into ADRs. ADRs record durable architecture
  decisions; benchmark artifacts remain supporting evidence.

## Input To #299

#299 should define the first-slice plan for candidate lookup/cache protocol.

It should answer:

- What is the candidate set shape?
- What is the candidate lookup key?
- How does the protocol represent file, scope, language, and fallback context?
- Which candidate facts stay TypeScript-produced in the first implementation,
  and which may become Rust-produced later?
- What diagnostics prove lookup/cache movement rather than bucket reshuffling?
- What candidate equivalence tests are required?
- What no-go evidence stops this path?
- What before/after profile, VS Code sparse targeted profile, graphStats,
  fallback taxonomy, and RSS evidence are required for implementation?

## 39. `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-closeout-decision.md`

# Rust-hybrid Rust candidate producer v1 closeout decision

Date: 2026-06-20

Parent issues: #295, #296

Implementation issues: #307, #308, #309, #310, #311

Plan: `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-v1.md`

## Decision

Keep the Rust candidate producer direction.

Rust candidate producer v1 is validated for shadow-mode candidate availability
over:

- `ExactName`
- `KnownNamePresence`

The producer remains shadow-only. It does not feed final resolver decisions and
does not change every-reference disambiguation semantics.

## What changed

- Added a Rust core `produce-candidates` command.
- Added a TypeScript Rust candidate producer runner.
- Added shadow comparison inside the candidate protocol provider.
- Added rust-hybrid profile diagnostics under
  `candidateProtocol.rustCandidateProducer`.
- Added deterministic Rust producer contract coverage.
- Added public CLI/profile tests proving diagnostics are present and graph
  output stays stable with producer shadow mode enabled.

## Out of scope preserved

This slice did not:

- route Rust producer output into final resolution;
- migrate `matchReference`;
- change target selection, confidence, ranking, or `resolvedBy`;
- implement `LowerName`, `QualifiedName`, or `FileNodes`;
- touch framework lookup or dynamic-dispatch synthesis;
- run agent A/B;
- update README or make performance claims.

## Verification

- `npm run build`
- `cargo test --package zcodegraph-core candidate_producer_returns_exact_name_and_presence_from_sqlite`
- `npx vitest run __tests__/candidate-protocol.test.ts`
- `npx vitest run __tests__/rust-index-engine-cli.test.ts -t "candidate protocol|Rust candidate producer"`
- `git diff --check`

## Evidence artifacts

- `docs/benchmarks/2026-06-20-rust-candidate-producer-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-20-rust-candidate-producer-zcodegraph.status.json`
- `docs/benchmarks/2026-06-20-rust-candidate-producer-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-20-rust-candidate-producer-vscode-sparse.status.json`

Environment note: Node 26.0.0 was used with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`, so
the runs are acceptable as targeted trend evidence but not release-grade
performance benchmarks.

## Current repo targeted profile

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_CANDIDATE_PROTOCOL=1 ZCODEGRAPH_RUST_CANDIDATE_PRODUCER=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-rust-candidate-producer-zcodegraph.profile.json \
  /usr/bin/time -l node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

| Metric | Value |
| --- | ---: |
| Wall time | 4.43s |
| Max RSS | 365,314,048 bytes |
| Peak memory footprint | 312,814,040 bytes |
| `fileCount` | 304 |
| `nodeCount` | 15,550 |
| `edgeCount` | 33,098 |
| Hybrid fallback files | 5 |
| Hybrid fallback state | degraded |
| `finalize.fallbackTaxonomy.totalFallbacks` | 1,577 |
| Producer lookup count | 5,085 |
| Producer `ExactName` lookups | 1,765 |
| Producer `KnownNamePresence` lookups | 3,320 |
| Producer compared count | 5,085 |
| Producer mismatch count | 0 |
| Producer candidate count | 4,380 |
| Producer payload bytes | 422,754 |
| Producer subprocess ms | 36 |
| `candidateLookupMs` | 27 |
| `nameMatcherCandidateLookupDbMs` | 17 |
| `databaseAccessMs` | 256 |
| `perReferenceDisambiguationMs` | 69 |

## VS Code sparse targeted profile

Corpus: `/private/tmp/codegraph-corpus/vscode-sparse`

Checkout:

- Git commit: `4a6e32fc1f0`
- Sparse paths: `src/vs/workbench`, `src/vs/platform`, `src/vs/base`
- Hydrated JS/TS files under `src/vs`: 5,780

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_CANDIDATE_PROTOCOL=1 ZCODEGRAPH_RUST_CANDIDATE_PRODUCER=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-rust-candidate-producer-vscode-sparse.profile.json \
  /usr/bin/time -l node dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

| Metric | Value |
| --- | ---: |
| Wall time | 130.97s |
| Max RSS | 2,209,972,224 bytes |
| Peak memory footprint | 2,578,807,088 bytes |
| `fileCount` | 5,780 |
| `nodeCount` | 326,830 |
| `edgeCount` | 918,662 |
| Hybrid fallback files | 290 |
| Hybrid fallback state | degraded |
| `finalize.fallbackTaxonomy.totalFallbacks` | 170,387 |
| Producer lookup count | 135,601 |
| Producer `ExactName` lookups | 48,500 |
| Producer `KnownNamePresence` lookups | 87,101 |
| Producer compared count | 135,601 |
| Producer mismatch count | 0 |
| Producer candidate count | 180,807 |
| Producer payload bytes | 12,331,255 |
| Producer subprocess ms | 1,181 |
| `candidateLookupMs` | 2,593 |
| `nameMatcherCandidateLookupDbMs` | 2,115 |
| `databaseAccessMs` | 21,581 |
| `perReferenceDisambiguationMs` | 18,636 |

## Interpretation

- Rust producer equivalence is clean on both targeted corpora.
- VS Code sparse compared 135,601 producer lookups with 0 mismatches.
- The producer can read the unified graph after Rust writes and TypeScript
  fallback append; the degraded fallback state does not invalidate the result.
- Graph shape remains stable by construction and by public graph guard because
  Rust producer output is shadow-only.
- The result supports continuing the Rust producer migration path, but it does
  not justify routing Rust output into final resolver decisions yet.

## Conclusion

Conclusion: keep.

Recommended next step: add another bounded Rust producer slice for one additional
candidate lookup shape, with `LowerName` as the likely next candidate because it
is high-volume and still candidate-availability oriented. Do not migrate
disambiguation or route producer output into the resolver main path until
multiple producer shapes have clean shadow evidence and a separate decision
accepts that semantic risk.

## 40. `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-complete-shape-coverage-closeout-decision.md`

# Rust-hybrid Rust candidate producer complete shape coverage closeout decision

Date: 2026-06-20

Related:

- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-complete-shape-coverage.md`
- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-v1.md`
- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-lowername.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-closeout-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-lowername-closeout-decision.md`
- #316
- #317
- #318
- #319
- #320

## Decision

Keep the complete Rust candidate producer shape coverage.

Rust candidate producer shape coverage is now complete for:

- `ExactName`
- `LowerName`
- `QualifiedName`
- `FileNodes`
- `KnownNamePresence`

Main-path routing remains a separate future decision. This slice does **not**
route Rust producer output into final resolver decisions. The TypeScript
resolver still owns final target selection, confidence, ranking, `resolvedBy`,
framework behavior, and every-reference disambiguation.

## What Changed

- Added `QualifiedName` and `FileNodes` to the Rust candidate producer
  protocol.
- Added Rust core exact qualified-name candidate id production over the unified
  SQLite graph.
- Added Rust core exact file-path node id production over the unified SQLite
  graph.
- Added TypeScript shadow comparison for `QualifiedName` and `FileNodes`
  against the existing candidate protocol baseline.
- Extended rust-hybrid profile diagnostics so all five producer lookup shapes
  are visible in `candidateProtocol.rustCandidateProducer.lookupShapeCounts`.
- Kept producer output shadow-only and verified graph stability.

## Deterministic Validation

Commands:

```bash
cargo test candidate_producer
npx vitest run __tests__/candidate-protocol.test.ts
npm run build && npx vitest run __tests__/rust-index-engine-cli.test.ts -t "Rust candidate producer shadow diagnostics|keeps resolved graph stable"
```

Results:

- Rust core candidate producer tests passed for exact-name, lower-name,
  qualified-name, file-nodes, and known-name presence.
- Candidate protocol tests passed.
- CLI profile diagnostics test passed.
- Graph stability guard passed with Rust candidate producer enabled and
  disabled.

The deterministic Rust core fixture covers:

- `QualifiedName` present lookup;
- `QualifiedName` multiple candidates;
- `QualifiedName` missing lookup;
- `FileNodes` present lookup;
- `FileNodes` multiple nodes in one file;
- `FileNodes` missing lookup.

The CLI profile fixture confirms the public profile artifact shape and mismatch
behavior without adding new diagnostic fields.

## Current Repo Evidence

Artifact:

- `docs/benchmarks/2026-06-20-rust-candidate-producer-complete-shapes-zcodegraph.profile.json`

Status snapshot:

- files: 304
- nodes: 15,567
- edges: 33,147
- fallback files: 5
- fallback taxonomy:
  - `language-level-typescript-fallback`: 5

Resource snapshot:

- wall time: 4.46s
- maximum resident set size: 366,444,544 bytes
- peak memory footprint: 314,518,024 bytes

Candidate protocol:

| Metric | Value |
|---|---:|
| Lookup count | 74,984 |
| `ExactName` lookups | 26,109 |
| `LowerName` lookups | 9,554 |
| `QualifiedName` lookups | 959 |
| `FileNodes` lookups | 483 |
| `KnownNamePresence` lookups | 37,879 |
| Candidate count | 10,655 |

Rust candidate producer:

| Metric | Value |
|---|---:|
| Producer lookups compared | 6,185 |
| Producer `ExactName` lookups | 1,768 |
| Producer `LowerName` lookups | 480 |
| Producer `QualifiedName` lookups | 496 |
| Producer `FileNodes` lookups | 106 |
| Producer `KnownNamePresence` lookups | 3,335 |
| Producer mismatch count | 0 |
| Candidate ids returned | 13,299 |
| Payload bytes | 502,585 |
| Producer time | 23ms |
| Subprocess time | 52ms |

Reference-resolution timing context:

| Metric | Value |
|---|---:|
| `candidateLookupMs` | 28ms |
| `nameMatcherCandidateLookupDbMs` | 19ms |
| `databaseAccessMs` | 259ms |
| `perReferenceDisambiguationMs` | 58ms |
| `refHydrationDbMs` | 3ms |

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- validated as a Git checkout with `src/vs/workbench`, `src/vs/platform`, and
  `src/vs/base`.

Artifact:

- `docs/benchmarks/2026-06-20-rust-candidate-producer-complete-shapes-vscode-sparse.profile.json`

Status snapshot:

- files: 5,780
- nodes: 326,830
- edges: 918,662
- fallback files: 290
- fallback taxonomy:
  - `language-level-typescript-fallback`: 286
  - `rust-owned-parse-gap`: 4
- skipped generated files:
  - TypeScript: 1

Resource snapshot:

- wall time: 136.01s
- maximum resident set size: 2,195,111,936 bytes
- peak memory footprint: 2,608,834,736 bytes

Candidate protocol:

| Metric | Value |
|---|---:|
| Lookup count | 1,609,764 |
| `ExactName` lookups | 760,610 |
| `LowerName` lookups | 30,869 |
| `QualifiedName` lookups | 69,233 |
| `FileNodes` lookups | 1,508 |
| `KnownNamePresence` lookups | 747,544 |
| Candidate count | 255,322 |

Rust candidate producer:

| Metric | Value |
|---|---:|
| Producer lookups compared | 156,348 |
| Producer `ExactName` lookups | 48,500 |
| Producer `LowerName` lookups | 4,665 |
| Producer `QualifiedName` lookups | 14,784 |
| Producer `FileNodes` lookups | 1,298 |
| Producer `KnownNamePresence` lookups | 87,101 |
| Producer mismatch count | 0 |
| Candidate ids returned | 335,953 |
| Payload bytes | 14,358,208 |
| Producer time | 783ms |
| Subprocess time | 1,506ms |

Reference-resolution timing context:

| Metric | Value |
|---|---:|
| `candidateLookupMs` | 2,660ms |
| `nameMatcherCandidateLookupDbMs` | 2,196ms |
| `databaseAccessMs` | 21,466ms |
| `perReferenceDisambiguationMs` | 18,696ms |
| `refHydrationDbMs` | 27ms |

## Interpretation

Complete producer shape coverage passes the same shadow-equivalence bar as the
previous producer slices:

- current repo: 6,185 producer lookups compared, 0 mismatches;
- VS Code sparse: 156,348 producer lookups compared, 0 mismatches.

The newly added shapes are non-zero in both targeted profiles:

- current repo: 496 `QualifiedName` and 106 `FileNodes` producer lookups;
- VS Code sparse: 14,784 `QualifiedName` and 1,298 `FileNodes` producer
  lookups.

This is enough to keep complete Rust candidate producer shape coverage as a
validated candidate availability boundary.

This is **not** enough to route Rust producer output into final resolver
decisions. The larger timing picture still shows that finalization and
reference-resolution cost is dominated by TypeScript-owned disambiguation and
database access, especially `perReferenceDisambiguationMs` on VS Code sparse.

## No-Go Checks

- Producer mismatches: none observed.
- Exact qualified-name parity required suffix/fuzzy semantics: no.
- Exact filePath parity required path normalization: no.
- Graph instability: not observed in the CLI graph guard.
- Main-path routing requirement: not required.
- Disambiguation changes: not made.
- Performance claim: not made.
- New diagnostics fields: not added.

## Next Step

Treat candidate producer shape coverage as complete.

The next decision should be a separate discussion about whether to:

1. keep collecting shadow evidence;
2. allow a narrow Rust producer main-path routing experiment; or
3. start a separate `matchReference` / disambiguation migration plan.

Do not implicitly start main-path routing from this closeout.

## 41. `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-lowername-closeout-decision.md`

# Rust-hybrid Rust candidate producer LowerName closeout decision

Date: 2026-06-20

Related:

- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-lowername.md`
- `docs/plans/2026-06-20-rust-hybrid-rust-candidate-producer-v1.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-rust-candidate-producer-closeout-decision.md`
- #312
- #313
- #314
- #315

## Decision

Keep the `LowerName` Rust candidate producer shape as a validated
shadow-only producer capability.

This does **not** route Rust producer output into final resolver decisions. The
TypeScript resolver still owns final target selection, confidence, ranking,
`resolvedBy`, framework behavior, and every-reference disambiguation.

## What Changed

- Added `LowerName` to the Rust candidate producer protocol.
- Added Rust core lower-name candidate id production over the unified SQLite
  graph.
- Added TypeScript shadow comparison for `LowerName` against the existing
  candidate protocol baseline.
- Extended rust-hybrid profile diagnostics so
  `candidateProtocol.rustCandidateProducer.lookupShapeCounts.LowerName` is
  visible independently.
- Kept producer output shadow-only and verified graph stability.

## Deterministic Validation

Commands:

```bash
cargo test candidate_producer
npx vitest run __tests__/candidate-protocol.test.ts
npm run build && npx vitest run __tests__/rust-index-engine-cli.test.ts -t "Rust candidate producer shadow diagnostics|keeps resolved graph stable"
```

Results:

- Rust core candidate producer tests passed for exact-name, known-name
  presence, and lower-name lookup.
- Candidate protocol tests passed.
- CLI profile diagnostics test passed.
- Graph stability guard passed with Rust candidate producer enabled and
  disabled.

The deterministic Rust core fixture covers:

- present lower-name lookup;
- case variants, such as `MixedCase` and `mixedcase`;
- multiple candidates with the same lower-name key;
- missing lower-name lookup.

The CLI profile fixture confirms the public profile artifact shape and mismatch
behavior. The fixture does not force a synthetic non-zero lower-name finalizer
lookup because doing so would require either product-only test hooks or a
less-representative resolver path. Non-zero lower-name producer coverage is
validated by the targeted current-repo and VS Code sparse evidence below.

## Current Repo Evidence

Artifact:

- `docs/benchmarks/2026-06-20-rust-candidate-producer-lowername-zcodegraph.profile.json`

Status snapshot:

- files: 304
- nodes: 15,556
- edges: 33,117
- fallback files: 5
- fallback taxonomy:
  - `language-level-typescript-fallback`: 5

Resource snapshot:

- wall time: 4.36s
- maximum resident set size: 367,067,136 bytes
- peak memory footprint: 315,042,912 bytes

Candidate protocol:

| Metric | Value |
|---|---:|
| Lookup count | 74,818 |
| `ExactName` lookups | 26,027 |
| `LowerName` lookups | 9,539 |
| `QualifiedName` lookups | 946 |
| `FileNodes` lookups | 483 |
| `KnownNamePresence` lookups | 37,823 |
| Candidate count | 10,644 |

Rust candidate producer:

| Metric | Value |
|---|---:|
| Producer lookups compared | 5,571 |
| Producer `ExactName` lookups | 1,766 |
| Producer `LowerName` lookups | 480 |
| Producer `KnownNamePresence` lookups | 3,325 |
| Producer mismatch count | 0 |
| Candidate ids returned | 4,673 |
| Payload bytes | 456,386 |
| Producer time | 19ms |
| Subprocess time | 41ms |

Reference-resolution timing context:

| Metric | Value |
|---|---:|
| `candidateLookupMs` | 30ms |
| `nameMatcherCandidateLookupDbMs` | 24ms |
| `databaseAccessMs` | 255ms |
| `perReferenceDisambiguationMs` | 65ms |
| `refHydrationDbMs` | 4ms |

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- validated as a Git checkout with `src/vs/workbench`, `src/vs/platform`, and
  `src/vs/base`.

Artifact:

- `docs/benchmarks/2026-06-20-rust-candidate-producer-lowername-vscode-sparse.profile.json`

Status snapshot:

- files: 5,780
- nodes: 326,830
- edges: 918,662
- fallback files: 290
- fallback taxonomy:
  - `language-level-typescript-fallback`: 286
  - `rust-owned-parse-gap`: 4
- skipped generated files:
  - TypeScript: 1

Resource snapshot:

- wall time: 133.77s
- maximum resident set size: 2,290,401,280 bytes
- peak memory footprint: 2,563,962,248 bytes

Candidate protocol:

| Metric | Value |
|---|---:|
| Lookup count | 1,609,764 |
| `ExactName` lookups | 760,610 |
| `LowerName` lookups | 30,869 |
| `QualifiedName` lookups | 69,233 |
| `FileNodes` lookups | 1,508 |
| `KnownNamePresence` lookups | 747,544 |
| Candidate count | 255,322 |

Rust candidate producer:

| Metric | Value |
|---|---:|
| Producer lookups compared | 140,266 |
| Producer `ExactName` lookups | 48,500 |
| Producer `LowerName` lookups | 4,665 |
| Producer `KnownNamePresence` lookups | 87,101 |
| Producer mismatch count | 0 |
| Candidate ids returned | 183,853 |
| Payload bytes | 12,829,787 |
| Producer time | 674ms |
| Subprocess time | 1,227ms |

Reference-resolution timing context:

| Metric | Value |
|---|---:|
| `candidateLookupMs` | 2,690ms |
| `nameMatcherCandidateLookupDbMs` | 2,235ms |
| `databaseAccessMs` | 21,530ms |
| `perReferenceDisambiguationMs` | 18,432ms |
| `refHydrationDbMs` | 25ms |

## Interpretation

`LowerName` passes the same shadow-equivalence bar as the v1 producer shapes:

- current repo: 480 `LowerName` producer lookups compared, 0 mismatches;
- VS Code sparse: 4,665 `LowerName` producer lookups compared, 0 mismatches.

This is enough to keep `LowerName` in the Rust candidate producer boundary as a
validated candidate availability shape.

This is **not** enough to route Rust producer output into final resolver
decisions. The larger timing picture still shows that finalization and
reference-resolution cost is dominated by TypeScript-owned disambiguation and
database access, especially `perReferenceDisambiguationMs` on VS Code sparse.

## No-Go Checks

- Producer mismatches: none observed.
- Case-folding mismatch: none observed in deterministic Rust fixture.
- Graph instability: not observed in the CLI graph guard.
- Main-path routing requirement: not required.
- Disambiguation changes: not made.
- Performance claim: not made.

## Next Step

Continue resolver migration in shadow-only slices. The next implementation
slice should still avoid main-path routing unless a separate decision explicitly
accepts that risk.

## 42. `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`

# Rust-Hybrid Architecture/Performance PRD Closeout

Date: 2026-06-21

## Scope

This closes the architecture/performance PRD:

- PRD: `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- PRD tracker: #295
- Overall optimization tracker: #165
- Resolver migration decision tracker: #296

## Decision

#295 is complete.

The PRD asked for architecture-aware performance work, decision quality, and
verifiable trend evidence. It did not require completing the full migration of
TypeScript finalization/reference resolution, and it did not require hitting a
strict final performance target.

## Completed Outcomes

### Architecture Boundary Decision

The resolver migration decision work mapped current TypeScript-owned
finalization/reference-resolution responsibilities and established the target
split:

- Rust owns finalization/reference-resolution execution over time.
- TypeScript remains the product shell for CLI/SDK lifecycle, fallback
  planning, status/doctor packaging, MCP surfaces, and compatibility glue.
- Diagnostics and profile artifacts remain a required protocol contract.

Relevant artifacts:

- `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md`

### Architecture-Backed Implementation Slices

The PRD required at least one architecture-backed implementation slice. The
work exceeded that requirement with multiple bounded slices, including:

- candidate producer/protocol work;
- finalization cleanup diagnostics and batching;
- finalization edge-write diagnostics and bulk insert;
- JS/TS file import target parity;
- ESM named binding fallback diagnostics;
- relative import target taxonomy and burndown;
- relative `.js` source specifier burndown;
- direct export candidate-multiple taxonomy;
- TypeScript implementation-declaration metadata;
- guarded TypeScript overload implementation routing.

The latest production routing slice resolved guarded TypeScript overload
implementation candidates and recorded deterministic evidence:

- `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

### Final Semantic Decision Slice

The final #295 slice classified the remaining dominant
type/value/namespace-collision fallback class:

- `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

VS Code sparse evidence at commit `4a6e32fc1f0` shows the capped remaining
collision samples are dominated by `value-token-plus-interface`:

- `value-token-plus-interface`: 81
- `function-overload-signature`: 17
- `ambient-declaration-merge`: 2

Decision: `value-token-plus-interface` is a plausible next production routing
candidate, but it belongs in a successor plan, not in #295.

## Explicit Non-Blockers

### #224 Parse/Extraction Diagnostics

#224 remains open as a sibling parse/extraction diagnostic track. It does not
block closing #295 because this PRD's executed mainline became the
TypeScript-finalization/reference-resolution architecture boundary.

Future performance work can pick up #224 without reopening #295.

### #165 Optimization Tracker

#165 remains open as the durable post-release optimization tracker. It should
continue to receive successor direction and future performance work, but it is
not closed by this PRD.

## Successor Work

Do not create more issues under #295.

Recommended successor direction:

1. Create a separate implementation plan for guarded
   `value-token-plus-interface` routing, if we choose to pursue it.
2. Keep #224 as the parse/extraction diagnostic lane.
3. Keep #165 as the top-level optimization map.

## Validation Boundary

This closeout makes no new performance claim.

The PRD produced deterministic profile/taxonomy evidence and production
learning, including no-go boundaries and successor candidates. It did not run a
full scoreboard or agent A/B campaign for the closeout.

## 43. `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md`

# Rust-Hybrid Architecture Performance Consolidated Decision

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Parse/extraction diagnostic track: #224
- Architecture/performance PRD: #295
- Resolver semantic closeouts:
  - `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
  - `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
  - `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
  - `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Finalization tail closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-finalization-tail-consolidated-evidence.md`
- Parse/extraction closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

## Decision

Proceed to the **finalization-tail implementation sequence**.

The architecture/performance decision cycle is complete. The next phase should
stop open-ended diagnosis and move into bounded implementation plans rooted in
the completed finalization tail boundary map.

This does not close #165. #165 remains the durable post-release optimization
tracker, but its role changes from exploration to implementation sequencing.

## Consolidated Read

### Resolver Semantic

Resolver semantic work produced guarded production routes and clear residual
boundaries:

- overload implementation routing is `keep`;
- value-token/interface routing is `keep-with-caveat`;
- type/value/namespace collision evidence identified service-token-style
  routes as useful but not a full bucket burndown;
- broad disambiguation remains unsafe to migrate without per-reference parity
  and replay evidence.

Interpretation:

- continue guarded semantic slices;
- do not broaden by source-order, pick-first, or speed-motivated shortcuts;
- resolver semantic residuals should be handled inside the finalization-tail
  implementation sequence, not as an unbounded fallback-bucket chase.

### Finalization Tail

The finalization tail boundary plan is complete:

- ownership matrix exists;
- diagnostic/profile fields are mapped;
- framework post-extract boundary is documented and tested;
- edge write/cleanup is separated from target selection;
- unresolved refs lifecycle taxonomy and fail-closed cleanup contract exist.

Interpretation:

- this is the best next implementation mainline;
- future work should pick bounded mechanisms from the boundary map;
- every production migration must bring graph parity, fallback taxonomy, and
  profile evidence.

### Parse/Extraction

Parse/extraction work produced a retained local optimization:

- artifact-only `parseAstWalker` diagnostics identify hot syntax shapes;
- diagnostics are explicitly off by default;
- one bounded candidate was retained: skip JS/TS extractor checks for anonymous
  leaf syntax nodes;
- default-path evidence showed `parseAstExtractionMs` moving from `482 -> 418`
  on zcodegraph and `9465 -> 8216` on VS Code sparse.

Interpretation:

- keep the candidate;
- do not immediately chain another parse/extraction candidate by default;
- any future parse/extraction work needs fresh evidence that parse/extraction
  is again the best system-level bet.

## Next Priority Order

1. Finalization-tail implementation sequence.
2. Resolver semantic residuals as guarded slices within that sequence.
3. Parse/extraction follow-up only when new profile evidence justifies it.

This ordering is based on system convergence, not single-bucket size. Parse
produced a useful local win, but finalization tail is the area where the
architecture boundary is now ready for implementation.

## Hard Guardrails

1. No open-ended benchmarking.
   Every optimization issue must declare its candidate, success standard, and
   no-go condition before implementation.

2. No semantic shortcut for speed.
   Do not change every-reference disambiguation semantics for performance.
   Resolver semantic changes must be guarded, fallback-safe, and evidence-backed.

3. Diagnostics must not tax the default path.
   Expensive diagnostics such as `parseAstWalker` must be default-off and
   explicitly enabled only by evidence/profile tooling.

4. Finalization implementation requires parity evidence.
   Tail implementation work must include graphStats, fallback taxonomy, profile
   evidence, and fail-closed behavior for edge write/cleanup or unresolved-ref
   lifecycle changes.

5. Parse/extraction follow-up requires new evidence.
   Plan 3's keep result does not automatically justify another parse
   optimization. Continue parse work only when current profiles point back to it
   as the best system-level bet.

## Tracker State

#165 remains open.

#165 should now be read as:

- architecture/performance decision cycle complete;
- next mainline is finalization-tail implementation sequence;
- resolver semantic residuals are guarded implementation slices;
- parse/extraction has a retained local win and is deferred until fresh
  evidence says otherwise.

#224 is complete as a parse/extraction diagnostic track. It produced the
dominant-bucket evidence, no-goed one small candidate, kept one walker candidate,
and should not remain the default place to append more parse bets.

#295 is complete for the architecture decision cycle. Implementation continues
under #165 rather than reopening broad PRD discovery.

## Non-Goals

- no new implementation issue is created by this decision;
- no full scoreboard is required by this decision;
- no README metric update is made by this decision;
- no release workflow or package workflow change is made by this decision;
- no claim is made that all performance goals are solved.

## Next Step

Prepare the next implementation plan around the finalization-tail boundary map.
That plan should pick one bounded finalization-tail mechanism, state its parity
and no-go gates, and keep semantic routing guarded.
