# ZCodeGraph 0.10.0 Current-State Metrics

Date: 2026-06-26

Status: release current-state evidence for README, not a full agent A/B campaign.

## Methodology

- Indexing uses the default `rust-hybrid` path.
- Current repo was run three times and reports the median wall time; external corpora were run once.
- Deterministic sufficiency probes call `zcodegraph_explore` directly and check for required evidence strings. They do not measure stochastic agent behavior, Read/Grep counts, or with/without ZCodeGraph deltas.
- RSS is recorded when available; otherwise the artifact records the unavailable reason.
- VS Code is a sparse checkout, not the full repository, and is labeled as such everywhere.
- Local source-path commands ran under Node 26 with `CODEGRAPH_ALLOW_UNSAFE_NODE=1`; release users should use the bundled runtime or supported embedding runtimes.
- Metrics were collected on release-candidate code commit `741fe86`; the follow-up README/docs-only refresh does not change indexing behavior.

## Indexing Snapshot

| Corpus | Commit | Scope | Wall | Files | Nodes | Edges | Fallback | RSS |
|---|---:|---|---:|---:|---:|---:|---|---|
| ZCodeGraph repo | 741fe86 | TS/JS + Rust/YAML | 7.73s | 354 | 16,978 | 40,207 | degraded; 5 files | command RSS sampling did not report maximum resident set size |
| Zustand | a1f685c | TypeScript/JavaScript | 656ms | 63 | 1,435 | 2,845 | degraded; 14 files | command RSS sampling did not report maximum resident set size |
| Gin examples | 9a79092 | Go/Gin | 326ms | 62 | 565 | 762 | degraded; 5 files | command RSS sampling did not report maximum resident set size |
| Excalidraw | 2a82821e | TypeScript/React | 13.0s | 652 | 20,947 | 53,867 | degraded; 14 files | command RSS sampling did not report maximum resident set size |
| VS Code sparse checkout (sparse) | 09c18fe5c5d | TypeScript/JavaScript | 518.4s | 11,951 | 582,781 | 1,657,053 | degraded; 214 files | direct recovery run was not wrapped by RSS sampler |

## Profile Buckets

| Corpus | Rust parse/extract | Rust SQLite write | TypeScript finalization | Reference resolution | Dynamic dispatch | DB maintenance |
|---|---:|---:|---:|---:|---:|---:|
| ZCodeGraph repo | 1.30s | 728ms | 2.94s | 2.22s | 639ms | 4ms |
| Zustand | 103ms | 45ms | 216ms | 186ms | 17ms | 3ms |
| Gin examples | 42ms | 12ms | 30ms | 19ms | 6ms | 2ms |
| Excalidraw | 1.76s | 1.05s | 5.13s | 4.61s | 426ms | 9ms |
| VS Code sparse checkout (sparse) | 41.3s | 58.1s | 162.5s | 141.1s | 17.8s | 1.03s |

## Deterministic Sufficiency Probes

| Corpus | Query target | Result | Required evidence |
|---|---|---|---|
| Zustand | `zcodegraph_explore` evidence smoke | passed | `createStore`, `setState` |
| Gin examples | `zcodegraph_explore` evidence smoke | passed | `POST /upload`, `uploadHandler` |
| Excalidraw | `zcodegraph_explore` evidence smoke | passed | `mutateElement`, `triggerUpdate`, `triggerRender`, `StaticCanvas`, `renderStaticScene` |
| VS Code sparse checkout (sparse) | `zcodegraph_explore` evidence smoke | passed | `createWorkbench`, `Workbench`, `lifecycleService` |

## Language Ownership Snapshot

The default user path is `rust-hybrid`. Rust-owned languages in this build are JavaScript, JSX, TypeScript, TSX, Go, and Python. Other supported languages are indexed through TypeScript fallback inside the hybrid run and are reported in status/doctor metadata.

## Caveats

- This is current-state release evidence, not a new full performance benchmark campaign.
- Deterministic probes do not replace agent A/B measurements.
- All measured corpora report `degraded` hybrid status when non-Rust-owned supported files are appended through TypeScript fallback, or when Rust-owned parse gaps are diagnosed. This is expected under the current ownership boundary.
- RSS was unavailable for these local command-wrapper runs; the specific unavailable reason is recorded per corpus.
- VS Code sparse completed only via a direct `index --quiet --profile-out` recovery run because the generic baseline runner terminated the initial `init` run during progress-spinner output capture. The recovered index and profile are included here.

## Raw Artifacts

- `docs/benchmarks/2026-06-26-zcodegraph-0-10-0-current-state-result.json`
- `docs/benchmarks/2026-06-26-zcodegraph-0-10-0-current-state-summary.json`
- `docs/benchmarks/tmp-2026-06-26-zcodegraph-0-10-0-current-state-result/`
- `docs/benchmarks/tmp-2026-06-26-zcodegraph-0-10-0-current-state-probes/`
- `docs/benchmarks/tmp-2026-06-26-zcodegraph-0-10-0-current-state-status/`
