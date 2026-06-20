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
