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
