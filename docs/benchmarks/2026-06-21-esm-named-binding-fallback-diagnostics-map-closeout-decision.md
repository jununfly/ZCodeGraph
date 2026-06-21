# ESM Named Binding Fallback Diagnostics Map Closeout

Date: 2026-06-21

## Decision

Keep the ESM named binding fallback diagnostics map.

Rust-hybrid profile artifacts now expose bounded ESM named import/export
fallback reason counts and privacy-safe samples. A dedicated taxonomy generator
turns those profile samples into JSON/Markdown artifacts with reason
distribution, examples, and a candidate next slice.

This is a diagnostics-quality slice. It does not change resolver behavior,
write new graph edges, add package/default/namespace resolution, or claim a
performance improvement.

## Scope Completed

- Added Rust profile fields:
  - `esmNamedImportExportFallbackSampleCounts`
  - `esmNamedImportExportFallbackSamples`
  - `esmNamedImportExportFallbackSampleCap`
- Added bounded samples for ESM named fallback reasons.
- Added `scripts/rust-esm-fallback-taxonomy.mjs`.
- Generated current repo and VS Code sparse profile/taxonomy evidence.

Profile samples are intentionally privacy-safe. They include reference metadata,
optional target file path, optional candidate count, and attempted resolution
mode. They do not include source snippets, source lines, export-list text,
candidate names, or candidate source.

## Deterministic Verification

Commands:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "emits bounded ESM named binding fallback samples|resolves one-hop ESM named re-exports|resolves paths-alias one-hop ESM named re-exports"
npx vitest run __tests__/rust-esm-fallback-taxonomy.test.ts
cargo test -p zcodegraph-core import_fallback
npm run build
```

Results:

- Passed.

Coverage:

- Rust profile exposes bounded ESM named fallback counts/samples/cap.
- Samples cover type-only, package/runtime, direct export candidate, one-hop
  re-export candidate, and unsupported import-shape boundaries.
- Existing ESM named import/export success behavior still passes.
- Taxonomy generator reads profile metadata only and writes JSON/Markdown.
- Taxonomy generator reports missing samples without requiring source files or
  a database.

## Current Repo Evidence

Artifacts:

- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-current.profile.json`
- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-current.measurement.json`
- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-current-taxonomy.json`
- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-current-taxonomy.md`

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-current.profile.json \
  /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  scripts/targeted-profile-evidence.mjs \
  --out docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-current.measurement.json \
  --cwd . \
  -- /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

| Metric | Value |
| --- | ---: |
| `esmNamedImportExportResolvedRefs` | 2,381 |
| `esmNamedImportExportFallbackRefs` | 1,869 |
| `esmOneHopReexportResolvedRefs` | 283 |

Taxonomy:

| Reason group | Count |
| --- | ---: |
| `packageOrRuntimeBoundary` | 1,233 |
| `unsupportedImportShape` | 329 |
| `typeOnlyBoundary` | 228 |
| `directExportCandidateGap` | 72 |
| `importEdgeTargetGap` | 7 |

Measurement sidecar:

- Wall time: 30,778ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Interpretation:

- The current repo is dominated by package/runtime imports and unsupported
  import shapes from tests and internal tooling. It is useful as a regression
  fixture, but it should not be the main guide for the next Rust resolver
  implementation slice.

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifacts:

- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-vscode-sparse.measurement.json`
- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-vscode-sparse-taxonomy.json`
- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-vscode-sparse-taxonomy.md`

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-vscode-sparse.profile.json \
  /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/scripts/targeted-profile-evidence.mjs \
  --out /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-vscode-sparse.measurement.json \
  --cwd /private/tmp/codegraph-corpus/vscode-sparse \
  -- /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed:

| Metric | Value |
| --- | ---: |
| `esmNamedImportExportResolvedRefs` | 121,209 |
| `esmNamedImportExportFallbackRefs` | 42,317 |
| `esmOneHopReexportResolvedRefs` | 439 |

Taxonomy:

| Reason group | Count |
| --- | ---: |
| `directExportCandidateGap` | 29,584 |
| `importEdgeTargetGap` | 5,783 |
| `typeOnlyBoundary` | 2,759 |
| `unsupportedImportShape` | 2,083 |
| `packageOrRuntimeBoundary` | 1,965 |
| `reexportCandidateGap` | 143 |

Direct export candidate raw reasons:

- `direct-export-candidate-multiple`: 15,428
- `direct-export-candidate-zero`: 14,156

Examples:

- `IReader` from `src/vs/base/browser/animatedValue.ts` targeting
  `src/vs/base/common/observable.ts`, candidate count 0.
- `Disposable` from `src/vs/base/browser/broadcast.ts` targeting
  `src/vs/base/common/lifecycle.ts`, candidate count 0.
- Multiple-candidate samples are also present and capped in the taxonomy
  examples.

Measurement sidecar:

- Wall time: 431,336ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Interpretation:

- VS Code sparse makes the next implementation candidate clear:
  `directExportCandidateGap` dominates the ESM named fallback map.
- This does not mean package/default/namespace resolution should be expanded
  next. Those are visible, but smaller on the representative large corpus and
  have wider semantic blast radius.
- The direct export gap likely includes at least two subproblems:
  - export declaration recognition is too narrow for real TypeScript syntax
    such as modifiers or declaration forms;
  - multiple extracted candidates with the same exported name need a bounded,
    semantics-preserving tie-break or a stronger taxonomy before resolution.

## Closeout

This slice successfully opened the ESM named binding fallback map.

Recommended next implementation slice:

```text
Direct export candidate gap burndown for Rust ESM named binding resolution.
```

Suggested boundary for that slice:

- keep resolver behavior unchanged until tests prove a narrow case;
- start with direct export declaration recognition and direct candidate
  multiplicity diagnostics;
- do not include default imports, namespace imports, package resolution, or
  multi-hop re-export chains;
- rerun current repo and VS Code sparse targeted evidence after the change.

No-go:

- Do not pursue package/default/namespace work as the immediate next slice based
  on this evidence.
- Do not treat type-only imports as a graph-completeness blocker in this phase.
