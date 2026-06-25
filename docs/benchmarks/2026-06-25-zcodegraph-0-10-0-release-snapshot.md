# ZCodeGraph 0.10.0 Release Snapshot

Date: 2026-06-25

Status: release snapshot, partial corpus coverage

This artifact records the current `rust-hybrid` release-readiness snapshot for
0.10.0. It is not a full benchmark campaign and should not be used as a broad
performance claim. The machine-readable result is
`docs/benchmarks/2026-06-25-zcodegraph-0-10-0-release-snapshot-result.json`.

## Scope

Baseline: `baseline-indexing-performance-v1`

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 node scripts/rust-hybrid-baseline.mjs \
  --out docs/benchmarks/2026-06-25-zcodegraph-0-10-0-release-snapshot-result.json \
  --repo current-repo=. --runs 3 \
  --repo ts-js-zustand=/private/tmp/codegraph-corpus/zustand \
  --repo go-gin=/private/tmp/codegraph-corpus/gin-examples \
  --repo ts-react-excalidraw=/private/tmp/codegraph-corpus/excalidraw \
  --timeout-ms 600000
```

The local shell is running Node `v26.0.0`, which the CLI intentionally warns
about. The snapshot used `CODEGRAPH_ALLOW_UNSAFE_NODE=1` so the local source
build could be measured. This is a local validation caveat, not a bundled
runtime release caveat.

## Result Classification

`baseline-partial-needs-human-setup`

The current repository was measured successfully. The representative external
corpora were present as directories under `/private/tmp/codegraph-corpus/`, but
were not Git checkouts, so they were recorded as `needs-human-setup`. The agent
did not re-clone them.

## Current Repository

Repository: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph`

Commit: `9bdf50e`

Runs: 3 requested, 3 completed

| Metric | Value |
|---|---:|
| Median wall time | 7607 ms |
| Wall time runs | 7586 ms, 7607 ms, 7731 ms |
| Median peak RSS | unavailable |
| RSS unavailable reason | `command RSS sampling did not report maximum resident set size` |
| RSS unavailable kind | `command-wrapper-no-rss` |

The profile artifacts were complete for all three runs. The CLI exit code was
`1` for each current-repo run because this source checkout still reports a
degraded `rust-hybrid` index for non-Rust-owned fallback files. The graph and
profile evidence were still written and usable.

Latest graph stats:

| Field | Value |
|---|---:|
| Files | 354 |
| Nodes | 16978 |
| Edges | 40207 |
| DB size | 34770944 bytes |

Languages observed: `javascript`, `json`, `rust`, `typescript`, `yaml`.

Hybrid status:

| Field | Value |
|---|---|
| Engine | `rust-hybrid` |
| Engine version | `0.1.0` |
| Fallback state | `degraded` |
| Rust-owned languages | `javascript`, `jsx`, `typescript`, `tsx`, `go`, `python` |
| Fallback file count | 5 |
| Fallback by language | `yaml: 3`, `rust: 2` |
| Fallback taxonomy | `language-level-typescript-fallback: 5` |

Profile bucket medians:

| Bucket | Median |
|---|---:|
| Rust parse/extraction | 1217 ms |
| Rust SQLite write | 704 ms |
| TypeScript finalization | 2832 ms |
| Reference resolution | 2178 ms |
| Reference-resolution database access | 352 ms |

Profile fallback taxonomy:

| Reason | Count |
|---|---:|
| `binding-level-symbol-disambiguation-not-yet-rust-owned` | 2430 |
| `unsupported-import-form-not-yet-rust-owned` | 50 |
| `unresolved-file-level-import-target` | 5 |
| `typescript-finalization-not-yet-migrated` | 4 |

## External Corpus Setup

| Corpus | Path | Status | Reason |
|---|---|---|---|
| TypeScript/JavaScript Zustand | `/private/tmp/codegraph-corpus/zustand` | `needs-human-setup` | Directory was not a Git checkout. |
| Go/Gin examples | `/private/tmp/codegraph-corpus/gin-examples` | `needs-human-setup` | Directory was not a Git checkout. |
| TypeScript/React Excalidraw | `/private/tmp/codegraph-corpus/excalidraw` | `needs-human-setup` | Directory was not a Git checkout. |

## Release Interpretation

The snapshot supports a 0.10.0 README statement that the current source build
can index the ZCodeGraph repository with the default `rust-hybrid` path and
produces usable graph/profile/status evidence. It does not support a new broad
performance claim across representative TypeScript/JavaScript and Go/Gin
corpora until those corpora are restored as Git checkouts and rerun.

