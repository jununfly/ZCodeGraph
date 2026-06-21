# ESM Direct Export Candidate Gap Burndown Closeout

Date: 2026-06-21

## Decision

Keep the ESM direct export candidate gap burndown.

This slice expanded Rust-owned ESM named binding resolution for bounded direct
export candidate availability:

- declaration-style direct exports with TypeScript modifiers now resolve when a
  target symbol exists;
- same-file `export { Name }` resolves only when the target file has exactly
  one local declaration candidate;
- same-file export specifier fallback now has its own raw taxonomy reasons.

The slice does not change default, namespace, package/runtime, type-only, or
multi-hop re-export semantics. It does not add broad multi-candidate tie-break
behavior.

## Scope Completed

- Added deterministic fixture coverage for declaration-style direct exports:
  - `export async function`
  - `export abstract class`
  - `export declare function`
  - typed `export const`
  - `export var`
- Added deterministic fixture coverage for same-file `export { Name }`.
- Preserved fallback for same-file multiple candidates and aliases.
- Expanded Rust extraction for `abstract_class_declaration` and
  `function_signature` so direct declarations can become candidate symbols.
- Added taxonomy mapping for:
  - `same-file-export-specifier-candidate-zero`
  - `same-file-export-specifier-candidate-multiple`

Profile samples remain privacy-safe. They do not contain source snippets,
source lines, export-list text, candidate names, or candidate source.

## Deterministic Verification

Commands:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "declaration-style ESM named exports|same-file ESM export specifiers|emits bounded ESM named binding fallback samples|resolves one-hop ESM named re-exports|resolves paths-alias one-hop ESM named re-exports|resolves direct ESM named imports"
npx vitest run __tests__/rust-esm-fallback-taxonomy.test.ts
cargo test -p zcodegraph-core
npm run build
```

Results:

- Passed.

## Current Repo Evidence

Artifacts:

- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-current.profile.json`
- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-current.measurement.json`
- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-current-taxonomy.json`
- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-current-taxonomy.md`

Observed:

| Metric | Before | After |
| --- | ---: | ---: |
| `esmNamedImportExportResolvedRefs` | 2,381 | 2,454 |
| `esmNamedImportExportFallbackRefs` | 1,869 | 1,846 |
| `esmOneHopReexportResolvedRefs` | 283 | 283 |
| `directExportCandidateGap` | 72 | 49 |

After taxonomy:

| Reason group | Count |
| --- | ---: |
| `packageOrRuntimeBoundary` | 1,233 |
| `unsupportedImportShape` | 329 |
| `typeOnlyBoundary` | 228 |
| `directExportCandidateGap` | 49 |
| `importEdgeTargetGap` | 7 |

Measurement sidecar:

- Wall time: 30,615ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Interpretation:

- The current repo remains dominated by package/runtime and unsupported import
  shape boundaries.
- It is useful as a regression fixture, but it should not drive the next
  implementation slice.

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifacts:

- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.measurement.json`
- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse-taxonomy.json`
- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse-taxonomy.md`

Observed:

| Metric | Before | After |
| --- | ---: | ---: |
| `esmNamedImportExportResolvedRefs` | 121,209 | 121,566 |
| `esmNamedImportExportFallbackRefs` | 42,317 | 40,039 |
| `esmOneHopReexportResolvedRefs` | 439 | 439 |
| `directExportCandidateGap` | 29,584 | 27,306 |

Direct export candidate raw reasons after:

- `direct-export-candidate-multiple`: 16,384
- `direct-export-candidate-zero`: 10,864
- `same-file-export-specifier-candidate-zero`: 58

After taxonomy:

| Reason group | Count |
| --- | ---: |
| `directExportCandidateGap` | 27,306 |
| `importEdgeTargetGap` | 5,783 |
| `typeOnlyBoundary` | 2,759 |
| `unsupportedImportShape` | 2,083 |
| `packageOrRuntimeBoundary` | 1,965 |
| `reexportCandidateGap` | 143 |

Measurement sidecar:

- Wall time: 440,633ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Interpretation:

- This was an effective bounded burndown slice: VS Code sparse direct export
  candidate gap dropped by 2,278 reported fallbacks.
- The movement is not a complete fix. Candidate-zero dropped materially, while
  candidate-multiple is now the larger raw reason.
- That pattern is expected for this slice: extracting and recognizing more
  direct declarations can convert some previously missing candidates into
  multiple-candidate cases. The resolver still correctly refuses broad
  tie-break behavior.

## Closeout

This slice should close as completed.

Recommended next implementation candidate:

```text
Direct export candidate-multiple taxonomy and bounded tie-break decision.
```

Suggested boundary for the next slice:

- inspect why candidate-multiple dominates on VS Code sparse;
- distinguish duplicate declarations, interface/class merges, overloads,
  ambient declarations, and extraction duplicates;
- only route a candidate-multiple case if a semantics-preserving rule is
  obvious and covered by deterministic fixtures;
- otherwise keep fallback and document no-go.

No-go:

- Do not expand default imports, namespace imports, package resolution, or
  type-only semantics based on this evidence.
- Do not add broad "pick first" or source-order tie-break behavior for multiple
  candidates.
