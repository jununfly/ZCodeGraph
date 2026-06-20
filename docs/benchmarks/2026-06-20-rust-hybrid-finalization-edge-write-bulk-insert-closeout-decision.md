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
