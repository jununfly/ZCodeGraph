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
