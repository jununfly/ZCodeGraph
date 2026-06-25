# Rust-Hybrid First-User Performance Diagnostic Closeout Decision

Date: 2026-06-25

Roadmap node: `1-8-3. Bounded optimization execution`

Issues: #554, #555, #556

Result artifact:
`docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-diagnostic-result.json`

Profile artifacts:

- `docs/benchmarks/tmp-2026-06-25-rust-hybrid-first-user-performance-diagnostic-result/current-repo-run1.profile.json`
- `docs/benchmarks/tmp-2026-06-25-rust-hybrid-first-user-performance-diagnostic-result/current-repo-run2.profile.json`
- `docs/benchmarks/tmp-2026-06-25-rust-hybrid-first-user-performance-diagnostic-result/current-repo-run3.profile.json`

## Classification

`diagnostic-only`

The diagnostic runner summary now exposes the tail buckets required to route the
next bounded optimization. No production indexing semantics were changed.

## Command

```bash
node scripts/rust-hybrid-baseline.mjs \
  --out docs/benchmarks/2026-06-25-rust-hybrid-first-user-performance-diagnostic-result.json \
  --repo current-repo=. \
  --runs 3 \
  --repo vscode-sparse=/private/tmp/codegraph-corpus/vscode-sparse \
  --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw
```

ZCodeGraph commit: `03c4996`

## Corpus Status

| Corpus | Status | Runs | Note |
| --- | --- | ---: | --- |
| `current-repo` | completed | 3 | required diagnostic baseline |
| `vscode-sparse` | needs-human-setup | 0 | configured path is not a valid Git checkout |
| `excalidraw` | needs-human-setup | 0 | configured path is not a valid Git checkout |

## Current Repo Summary

Wall time:

- runs: `8359 ms`, `7573 ms`, `7684 ms`
- median: `7684 ms`
- variance: `120638`

RSS:

- unavailable
- unavailable kind: `command-wrapper-no-rss`
- reason: `command RSS sampling did not report maximum resident set size`

Graph stats classification: `stable`

- files: `380`
- nodes: `17218`
- edges: `40600`
- database size: `35381248` bytes

Fallback taxonomy classification: `stable`

- total fallback taxonomy count: `2645`
- dominant reason: `binding-level-symbol-disambiguation-not-yet-rust-owned`
  with count `2586`
- TypeScript fallback append remained `5` non-Rust-owned supported files

## Tail Bucket Ranking

High-level median buckets:

| Rank | Bucket | Median |
| --- | --- | ---: |
| 1 | TypeScript finalization | `2909 ms` |
| 2 | Reference resolution | `2222 ms` |
| 3 | Dynamic dispatch synthesis | `615 ms` |
| 4 | DB maintenance | `3 ms` |
| 5 | Framework post-extract | `6 ms` |

Reference-resolution diagnostic median buckets:

| Rank | Bucket | Median |
| --- | --- | ---: |
| 1 | database access | `422 ms` |
| 2 | unresolved cleanup | `215 ms` |
| 3 | edge write | `138 ms` |
| 4 | name matching | `121 ms` |
| 5 | resolved cleanup | `114 ms` |
| 6 | intentionally unresolved cleanup | `101 ms` |
| 7 | per-reference disambiguation | `91 ms` |
| 8 | import resolution | `72 ms` |
| 9 | framework matching | `69 ms` |
| 10 | unresolved read DB | `46 ms` |
| 11 | candidate lookup | `40 ms` |
| 12 | name-matcher candidate lookup DB | `25 ms` |

Notable counters:

- edge insert count: `16358`
- resolved cleanup row count: `16358`
- intentionally unresolved cleanup row count: `31569`
- candidate protocol lookup count: `110084` in the representative run
- candidate protocol FileNodes lookup source was partially unavailable with
  `batchUnavailableReason: not-prepared`
- rust candidate producer routing was disabled by local config in the
  representative run

## Selected Next Candidate

Selected candidate for the next bounded optimization slice:

`reference-resolution cleanup / edge-write path`

Reasoning:

- it stays inside the measured reference-resolution tail;
- it is a large enough cluster to be meaningful: unresolved cleanup, resolved
  cleanup, intentionally unresolved cleanup, and edge write together dominate
  the non-semantic sub-buckets after database access;
- it has clear graph parity guardrails: edge counts, fallback taxonomy, cleanup
  ownership diagnostics, and unresolved/intentionally unresolved row counts;
- it is narrower and safer than changing semantic disambiguation or dynamic
  dispatch synthesis first.

Explicitly not selected:

- `dynamic dispatch synthesis`: larger than individual cleanup buckets, but it
  touches Agent Sufficiency and synthesized-flow behavior, so it is not the
  first bounded performance candidate.
- `candidate lookup/cache`: visible but too small on this corpus to be the first
  candidate.
- `full TypeScript finalization / Rust resolver migration`: too broad for one
  bounded optimization issue.
- `Rust parse/extraction + SQLite write`: still a viable fallback route, but not
  the dominant tail after this diagnostic split.

## Next Slice Requirements

The next bounded optimization issue should:

- target only the reference-resolution cleanup / edge-write path;
- use current-repo as the required measured corpus;
- run VS Code sparse and Excalidraw only if their configured paths are valid Git
  checkouts;
- record wall time and RSS or unavailable reason;
- record graphStats and fallback taxonomy classifications;
- preserve cleanup taxonomy and intentionally unresolved evidence;
- require Agent Sufficiency only if the implementation changes graph semantics,
  resolver/finalization behavior, Explore/MCP output, language/framework
  extraction, or user-facing sufficiency claims.

## Decision

`1-8-3` is complete as a diagnostic-only execution slice.

The next bounded optimization route is `reference-resolution cleanup /
edge-write path`. It should be implemented as a separate bounded slice rather
than mixed with candidate lookup/cache, dynamic dispatch synthesis, or broader
resolver migration.
