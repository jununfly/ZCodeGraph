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
