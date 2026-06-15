# Rust Indexing Core Phase 4 Reference-Resolution Optimization

Issue: [#91](https://github.com/jununfly/ZCodeGraph/issues/91)

Parent investigation: [Rust Indexing Core Phase 4 Reference Resolution Investigation](2026-06-13-rust-indexing-core-phase-4-reference-resolution-investigation.md)

Parent decision: [Rust Indexing Core Phase 4 Results And Decision](2026-06-13-rust-indexing-core-phase-4-results-and-decision.md)

## Scope

This issue attempted a bounded, data-driven optimization for the Phase 4
reference-resolution database-access bottleneck. It did not move
ReferenceResolver or graph finalization into Rust, did not change the default
TypeScript indexing path, and did not weaken Explore sufficiency.

Implemented changes:

- Added public reference-resolution DB sub-buckets:
  `cacheWarmupMs`, `unresolvedReadMs`, `edgeMaterializationMs`, `edgeWriteMs`,
  and `unresolvedCleanupMs`.
- Replaced per-edge node reads in edge materialization with batched
  node-kind lookup.
- Replaced per-reference unresolved cleanup deletes with chunked tuple deletes.

## Raw Artifacts And Durability

- VS Code after-profile raw JSON:
  [2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-profile.raw.json](2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-profile.raw.json)
- VS Code sufficiency raw JSON:
  [2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-sufficiency.raw.json](2026-06-14-rust-indexing-core-phase-4-reference-resolution-optimization-vscode-sufficiency.raw.json)
- Local target path: `/private/tmp/codegraph-corpus/vscode-sparse` (local-only provenance)

The repo-relative raw JSON files are durable checked-in evidence. The
`/private/tmp` target path records where the local sparse checkout existed when
the profile and sufficiency smoke ran; it may not exist on another machine.

## Before Source

The coarse large-target before source is the #87 focused profile on the same VS
Code JS/TS sparse checkout:

- `referenceResolutionMs`: 99,543ms
- `databaseAccessMs`: 50,614ms
- dominant reference-resolution subpath: `databaseAccessMs`

That profile predated the new DB sub-buckets, so it cannot show
`edgeMaterializationMs`, `edgeWriteMs`, or `unresolvedCleanupMs`. The #91
after-profile is therefore used to identify the remaining DB shape after the
bounded optimizations.

## VS Code After Profile

Profile date: `2026-06-14T02:45:27.507Z`

- Repository: `https://github.com/microsoft/vscode`
- Commit: `275e1b31`
- Local target: `/private/tmp/codegraph-corpus/vscode-sparse` (local-only provenance)
- Indexed files: 11,291
- Rust nodes/edges: 559,948 / 1,654,276
- TypeScript profile wall: 223.6s
- Rust profile wall: 257.8s
- Rust-core profile wall: 251.7s
- RSS: unavailable; local `ps` sampling returned `spawnSync ps EPERM`

Finalization subphases:

| Subphase | Time |
| --- | ---: |
| framework post-extract | 45ms |
| reference resolution | 118,464ms |
| dynamic dispatch synthesis | 8,761ms |
| DB maintenance | 223ms |

Reference-resolution breakdown:

| Subpath | Time |
| --- | ---: |
| `nameMatchingMs` | 53,205ms |
| `databaseAccessMs` | 53,038ms |
| `edgeWriteMs` | 25,940ms |
| `unresolvedCleanupMs` | 23,884ms |
| `importResolutionMs` | 10,111ms |
| `unresolvedReadMs` | 1,539ms |
| `cacheWarmupMs` | 1,282ms |
| `frameworkMatchingMs` | 1,161ms |
| `otherResolutionMs` | 547ms |
| `edgeMaterializationMs` | 394ms |

The batched edge-materialization lookup landed correctly, but the after-profile
shows that `edgeMaterializationMs` is not a meaningful large-target bottleneck.
The cleanup delete optimization also landed, but `unresolvedCleanupMs` remains a
large DB subpath. Overall `databaseAccessMs` did not meet the required 15%
improvement threshold versus the #87 coarse before profile.

## Sufficiency Smoke

Sufficiency date: `2026-06-14T02:54:13.999Z`

Prompt `VS-1` reported no regression for both TypeScript and Rust:

| Engine | Flow connected | Missing expected | Deterministic Read risk | Deterministic Grep risk | Classification |
| --- | --- | ---: | ---: | ---: | --- |
| TypeScript | yes | 0 | 0 | 0 | no regression |
| Rust | yes | 0 | 0 | 0 | no regression |

## Blocker Classification

Status: `still unresolved`.

The optimization attempts were bounded and preserved sufficiency, but they did
not reduce the large-target `databaseAccessMs` enough to call the #87 blocker
reduced or resolved. The after-profile also shows that `nameMatchingMs` is now
approximately tied with the aggregate DB bucket as the dominant
reference-resolution subpath.

Recommended next blockers:

- optimize reference-resolution name matching on the VS Code sparse checkout;
- split `edgeWriteMs` and `unresolvedCleanupMs` further if DB writes remain a
  blocker after name matching is addressed;
- keep Rust JS/TS indexing opt-in until a later profile reduces
  `referenceResolutionMs` without Explore sufficiency regression.
