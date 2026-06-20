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
