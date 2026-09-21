# Resolver Semantic Residuals — Decision & Taxonomy Ledger

> Decision/taxonomy ledger distilled 2026-09-21 from the 5,721-line
> `...-resolver-semantic-residuals-consolidated-evidence.md` (append-merge of the
> 2026-06-21/22 ESM/resolver burndown taxonomies and closeout decisions).
> Taxonomy, subtypes, decisions, and no-go rules retained; per-repo evidence
> tables and generated examples dropped (git history).
>
> doc-kind: design · authority: supporting.

This ledger defines the residual semantic buckets (ESM direct exports, named
bindings, import samples, relative-file nodes, etc.), which were burned down,
which stay deferred as research/oracle routes, and the safe tie-break
prerequisites that bound every guarded resolver slice.

## Historical Source Files Merged And Deleted
- 2026-06-21-esm-direct-export-burndown-current-taxonomy.md
- 2026-06-21-esm-direct-export-burndown-vscode-sparse-taxonomy.md
- 2026-06-21-esm-direct-export-candidate-gap-burndown-closeout-decision.md
- 2026-06-21-esm-direct-export-candidate-multiple-current-taxonomy.md
- 2026-06-21-esm-direct-export-candidate-multiple-taxonomy-closeout-decision.md
- 2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.md
- 2026-06-21-esm-named-binding-fallback-diagnostics-map-closeout-decision.md
- 2026-06-21-esm-named-fallback-diagnostics-current-taxonomy.md
- 2026-06-21-esm-named-fallback-diagnostics-vscode-sparse-taxonomy.md
- 2026-06-21-import-fallback-profile-samples-closeout-decision.md
- 2026-06-21-import-fallback-samples-current-taxonomy.md
- 2026-06-21-import-fallback-samples-vscode-sparse-taxonomy.md
- 2026-06-21-relative-file-node-diagnostics-cleanup-closeout-decision.md
- 2026-06-21-relative-file-node-diagnostics-current-taxonomy.md
- 2026-06-21-relative-file-node-diagnostics-vscode-sparse-taxonomy.md
- 2026-06-21-relative-import-target-burndown-closeout-decision.md
- 2026-06-21-relative-import-target-taxonomy-current-repo.md
- 2026-06-21-relative-import-target-taxonomy-decision.md
- 2026-06-21-relative-import-target-taxonomy-vscode-sparse-after-profile.md
- 2026-06-21-relative-import-target-taxonomy-vscode-sparse.md
- 2026-06-21-relative-js-source-fallback-current-after-taxonomy.md
- 2026-06-21-relative-js-source-fallback-vscode-sparse-after-taxonomy.md
- 2026-06-21-relative-js-source-specifier-burndown-closeout-decision.md
- 2026-06-21-ts-implementation-declaration-current-decision.md
- 2026-06-21-ts-implementation-declaration-current-taxonomy.md
- 2026-06-21-ts-implementation-declaration-metadata-closeout-decision.md
- 2026-06-21-ts-implementation-declaration-vscode-sparse-decision.md
- 2026-06-21-ts-implementation-declaration-vscode-sparse-taxonomy.md
- 2026-06-21-ts-overload-implementation-current-decision.md
- 2026-06-21-ts-overload-implementation-current-taxonomy.md
- 2026-06-21-ts-overload-implementation-tie-break-closeout-decision.md
- 2026-06-21-ts-overload-implementation-vscode-sparse-decision.md
- 2026-06-21-ts-overload-implementation-vscode-sparse-taxonomy.md
- 2026-06-21-ts-overload-signature-semantic-closeout-decision.md
- 2026-06-21-ts-overload-signature-semantic-decision.md
- 2026-06-21-ts-type-value-namespace-collision-current-decision.md
- 2026-06-21-ts-type-value-namespace-collision-current-taxonomy.md
- 2026-06-21-ts-type-value-namespace-collision-semantic-closeout-decision.md
- 2026-06-21-ts-type-value-namespace-collision-vscode-sparse-decision.md
- 2026-06-21-ts-type-value-namespace-collision-vscode-sparse-taxonomy.md
- 2026-06-21-value-token-interface-current-taxonomy.md
- 2026-06-21-value-token-interface-routing-closeout.md
- 2026-06-21-value-token-interface-vscode-sparse-taxonomy.md
- 2026-06-22-direct-esm-named-import-export-part1-closeout.md
- 2026-06-22-filenodes-routing-residual-audit.md
- 2026-06-22-import-file-completion-map-baseline.md
- 2026-06-22-import-file-resolver-completion-part1-final-closeout.md
- 2026-06-22-one-hop-barrel-reexport-part1-closeout.md
- 2026-06-22-qualifiedname-routing-residual-baseline.md
- 2026-06-22-qualifiedname-routing-residual-closeout-decision.md
- 2026-06-22-qualifiedname-routing-residual-evidence.md
- 2026-06-22-resolver-semantic-planb-final-closeout.md
- 2026-06-22-resolver-semantic-residual-map.md
- 2026-06-22-source-file-filenodes-part1-closeout.md
- 2026-06-23-default-reexport-surface-semantics-decision.md
- 2026-06-23-esm-named-symbol-ready-agent-closeout.md
- 2026-06-23-esm-named-symbol-reopen-closeout.md
- 2026-06-23-export-alias-surface-modeling-decision.md
- 2026-06-23-guarded-esm-named-symbol-edge-write-closeout.md
- 2026-06-23-guarded-esm-named-symbol-edges-completion-closeout.md
- 2026-06-23-guarded-one-hop-reexport-edges-closeout.md
- 2026-06-23-namespace-export-surface-semantics-decision.md
- 2026-06-23-namespace-import-module-dependency-policy-decision.md

### 1. 2026-06-21-esm-direct-export-burndown-current-taxonomy.md

**Summary**

- Rows inspected: 356
- Candidate next slice: investigate unsupported import shapes (329 reported)

**Candidate next slice**

investigate unsupported import shapes (329 reported)

### 2. 2026-06-21-esm-direct-export-burndown-vscode-sparse-taxonomy.md

**Summary**

- Rows inspected: 778
- Candidate next slice: investigate direct export candidate gaps (27306 reported)

**Candidate next slice**

investigate direct export candidate gaps (27306 reported)

### 3. 2026-06-21-esm-direct-export-candidate-gap-burndown-closeout-decision.md

**Decision**

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

**Scope Completed**

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

**Deterministic Verification**

Commands:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "declaration-style ESM named exports|same-file ESM export specifiers|emits bounded ESM named binding fallback samples|resolves one-hop ESM named re-exports|resolves paths-alias one-hop ESM named re-exports|resolves direct ESM named imports"
npx vitest run __tests__/rust-esm-fallback-taxonomy.test.ts
cargo test -p zcodegraph-core
npm run build
```

Results:

- Passed.

**Current Repo Evidence**

Artifacts:

- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-current.profile.json`
- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-current.measurement.json`
- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-current-taxonomy.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

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

**Closeout**

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

### 4. 2026-06-21-esm-direct-export-candidate-multiple-current-taxonomy.md

**Summary**

- Rows inspected: 0
- Largest subtype: none
- Recommended next slice: no samples available

**Subtypes**

| Subtype | Count | Decision |
| --- | ---: | --- |

**Decision**

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: none
- No-go subtypes: none

### 5. 2026-06-21-esm-direct-export-candidate-multiple-taxonomy-closeout-decision.md

**Decision**

Keep the ESM direct export candidate-multiple taxonomy.

This slice adds a DB-backed, privacy-safe classifier for direct export
candidate-multiple fallback samples. It does not change resolver behavior,
candidate selection, graph edges, database schema, public CLI behavior, or MCP
output.

The next resolver slice should **not** immediately add a candidate-multiple
tie-break. The VS Code sparse taxonomy points at function overload/signature
patterns as the dominant sampled subtype, which needs a prerequisite semantic
decision before routing any candidate into the main path.

**Scope Completed**

- Added `scripts/rust-esm-candidate-multiple-taxonomy.mjs`.
- Added deterministic fixture coverage for:
  - `interface-class-merge`
  - `function-overload-signature`
  - `type-value-namespace-collision`
  - `duplicate-extraction`
  - unavailable DB metadata
- The classifier reads:
  - Rust profile fallback samples;
  - SQLite node metadata for candidate rows.
- The classifier does not read source files.
- Artifacts do not include source snippets, source lines, export-list text,
  candidate source, or full source content.

**Deterministic Verification**

Commands:

```bash
npx vitest run __tests__/rust-esm-candidate-multiple-taxonomy.test.ts
npx vitest run __tests__/rust-esm-fallback-taxonomy.test.ts __tests__/rust-esm-candidate-multiple-taxonomy.test.ts
```

Results:

- Passed.

**Current Repo Evidence**

Artifacts:

- `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-current-taxonomy.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-current-taxonomy.measurement.json`

Inputs:

- Profile:
  `docs/benchmarks/2026-06-21-esm-direct-export-burndown-current.profile.json`
- Database:
  `.zcodegraph/zcodegraph.db`

Observed:

| Metric | Value |
| --- | ---: |
| Rows inspected | 0 |

Summary:

- No direct export candidate-multiple samples were present in the current repo
  profile.
- This makes the current repo useful only as an artifact-stability check for
  this slice.

Measurement sidecar:

- Wall time: 51ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

**Tie-Break Decision**

Do not implement a candidate-multiple resolver tie-break as the immediate next
slice.

Bounded tie-break candidates found in this evidence:

- None in the VS Code sparse sampled taxonomy.

Prerequisite-first subtypes:

- `function-overload-signature`
- `ambient-declaration-merge`

No-go subtypes:

- `type-value-namespace-collision`

Reasoning:

- Function overload/signature rows dominate the sample. Selecting one candidate
  requires deciding whether import references should target overload
  signatures, implementation declarations, or some synthesized canonical
  declaration. That is a TypeScript semantic decision, not a safe metadata-only
  tie-break.
- Type/value namespace collisions must remain fallback unless the resolver has
  enough reference-context information to distinguish type-position and
  value-position use.
- The sampled taxonomy did not show duplicate extraction as a meaningful
  immediate win.

**Closeout**

This slice should close as completed.

Recommended next slice:

```text
TypeScript overload/signature candidate-multiple semantic decision.
```

Suggested boundary for that slice:

- inspect function overload/signature candidate metadata more deeply;
- decide whether imported value usage should point to implementation
  declarations, overload signatures, or stay unresolved;
- keep type/value namespace collisions out of scope;
- do not route any candidate without deterministic fixtures proving the target
  semantics.

No-go:

- Do not add broad source-order or pick-first tie-break behavior.
- Do not resolve type/value namespace collisions without reference-context
  semantics.
- Do not claim performance improvement from this taxonomy slice.

### 6. 2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.md

**Summary**

- Rows inspected: 100
- Largest subtype: function-overload-signature
- Recommended next slice: resolve prerequisite for function-overload-signature before tie-break

**Subtypes**

| Subtype | Count | Decision |
| --- | ---: | --- |
| ambient-declaration-merge | 2 | prerequisite-first |
| function-overload-signature | 85 | prerequisite-first |
| type-value-namespace-collision | 13 | no-go-keep-fallback |

**Decision**

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: ambient-declaration-merge, function-overload-signature
- No-go subtypes: type-value-namespace-collision

### 7. 2026-06-21-esm-named-binding-fallback-diagnostics-map-closeout-decision.md

**Decision**

Keep the ESM named binding fallback diagnostics map.

Rust-hybrid profile artifacts now expose bounded ESM named import/export
fallback reason counts and privacy-safe samples. A dedicated taxonomy generator
turns those profile samples into JSON/Markdown artifacts with reason
distribution, examples, and a candidate next slice.

This is a diagnostics-quality slice. It does not change resolver behavior,
write new graph edges, add package/default/namespace resolution, or claim a
performance improvement.

**Scope Completed**

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

**Deterministic Verification**

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

**Current Repo Evidence**

Artifacts:

- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-current.profile.json`
- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-current.measurement.json`
- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-current-taxonomy.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

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

**Closeout**

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

### 8. 2026-06-21-esm-named-fallback-diagnostics-current-taxonomy.md

**Summary**

- Rows inspected: 379
- Candidate next slice: investigate unsupported import shapes (329 reported)

**Candidate next slice**

investigate unsupported import shapes (329 reported)

### 9. 2026-06-21-esm-named-fallback-diagnostics-vscode-sparse-taxonomy.md

**Summary**

- Rows inspected: 720
- Candidate next slice: investigate direct export candidate gaps (29584 reported)

**Candidate next slice**

investigate direct export candidate gaps (29584 reported)

### 10. 2026-06-21-import-fallback-profile-samples-closeout-decision.md

**Decision**

Keep the Rust import fallback profile samples diagnostic.

The new profile artifact solves the prior data-source gap: Rust core profile
counters can now be explained before TypeScript finalization cleanup removes
`unresolved_refs` from the final database.

The next bounded burndown category is selected:

- **relative `.js` source specifier from TypeScript files resolving to supported
  TS/TSX/JS/JSX source candidates**

This is a low-risk code-target category because the samples are source-file
specifier shapes, not assets, package resolution, bundler loader semantics, or
symbol disambiguation. It should be handled as a separate implementation slice.

**Scope Completed**

- Rust core profile now emits:
  - `importPathAliasFallbackSampleCounts`
  - `importPathAliasFallbackSamples`
  - `importPathAliasFallbackSampleCap`
- Samples are capped at:
  - 100 per `(sourceKind, reason)` bucket
  - 2,000 total
- Samples include only:
  - `sourceKind`
  - `reason`
  - `referenceName`
  - `filePath`
  - `language`
  - `line`
  - `col`
- `scripts/rust-import-target-taxonomy.mjs` now supports:
  - `--db`
  - `--repo`
  - `--profile`
- No resolver semantics changed.
- No graph edges changed intentionally.
- No SQLite schema, `status`, `doctor`, README, or public API changed.

**Deterministic Evidence**

Commands:

```bash
cargo test -p zcodegraph-core import_fallback
cargo test -p zcodegraph-core emits_machine_readable_result_json
npx vitest run __tests__/rust-import-target-taxonomy.test.ts
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "emits bounded Rust import fallback samples"
```

Results:

- Passed.

The tests prove:

- full fallback counts are preserved even when samples are capped;
- sample cap metadata is emitted;
- profile JSON includes empty sample fields when no fallbacks exist;
- a real Rust index emits samples for relative target misses;
- taxonomy `--profile` mode classifies Rust core profile samples;
- taxonomy `--db` mode remains intact;
- samples do not include source content fields.

**Current Repo Evidence**

Profile artifact:

- `docs/benchmarks/2026-06-21-import-fallback-samples-current.profile.json`

Taxonomy artifacts:

- `docs/benchmarks/2026-06-21-import-fallback-samples-current-taxonomy.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-21-import-fallback-samples-current.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 31.18s.
- RSS: unavailable. `/usr/bin/time -l` returned
  `time: sysctl kern.clockrate: Operation not permitted`.
- Sample counts:
  - `binding/binding-level-symbol-disambiguation`: 2,477
  - `relative/file-node-not-found`: 1
  - `relative/target-not-found`: 8
  - `unsupported/unsupported-import-form`: 49
- Sample cap:
  - `perBucket`: 100
  - `total`: 2,000
  - `truncated`: true
- Relative taxonomy:
  - `supportedSourceSpecifier`: 8
  - `assetLikeTarget`: 1

Current repo examples show `.ts` files importing relative `.js` source
specifiers such as:

- `../../src/index.js`
- `./scoring.js`
- `./types.js`
- `./explore-types.js`

**Interpretation**

The prior final-DB taxonomy no-go was caused by the wrong sampling layer. The
new profile samples capture the needed metadata before cleanup and make the
large relative gap explainable.

The strongest next candidate is the `.js` source specifier pattern. VS Code and
the current repo both contain TypeScript files that import relative `.js`
specifiers while the repository source files are TypeScript. Rust currently
treats explicit `.js` as a literal extension and does not try the corresponding
`.ts`/`.tsx` candidates.

This candidate is bounded and code-target only. It must still reject asset
imports and must not expand into package `exports`, bundler loader semantics,
dynamic imports, sparse-checkout missing files, or symbol disambiguation.

**Next Recommended Slice**

Implement a bounded Rust resolver burndown for relative `.js` source specifiers
from JS/TS files:

- when a relative import explicitly ends in `.js`, `.mjs`, or `.cjs`;
- and the literal file does not exist;
- try supported TypeScript/JavaScript source candidates such as `.ts`, `.tsx`,
  `.mts`, `.cts`, `.js`, and `.jsx` using the existing file-node validation path;
- do not apply this to assets or non-code extensions;
- keep diagnostics showing movement in `relative/target-not-found` and
  `supportedSourceSpecifier`;
- validate with deterministic fixtures plus current-repo and VS Code sparse
  targeted profile/taxonomy evidence.

### 11. 2026-06-21-import-fallback-samples-current-taxonomy.md

**Summary**

- Rows inspected: 158
- Relative unresolved JS/TS imports: 9
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 149

**Categories**

| Category | Count |
| --- | ---: |
| assetLikeTarget | 1 |
| supportedSourceSpecifier | 8 |

### 12. 2026-06-21-import-fallback-samples-vscode-sparse-taxonomy.md

**Summary**

- Rows inspected: 400
- Relative unresolved JS/TS imports: 200
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 200

**Categories**

| Category | Count |
| --- | ---: |
| assetLikeTarget | 100 |
| supportedSourceSpecifier | 100 |

### 13. 2026-06-21-relative-file-node-diagnostics-cleanup-closeout-decision.md

**Decision**

Keep the diagnostics cleanup.

Rust-hybrid profile samples now preserve the existing fallback `reason` values
while adding privacy-safe `targetKind` and `targetExtension` metadata when a
relative import resolves to a real target path that does not have a code file
node.

The import-target taxonomy now uses that metadata to classify non-code targets
as actionable diagnostics categories:

- `nonCodeAssetTarget`
- `nonCodeConfigTarget`

This is a diagnostics-quality improvement, not a resolver behavior change and
not a performance claim.

**Scope Completed**

- `file-node-not-found` remains the profile fallback reason.
- Profile samples can include:
  - `targetKind`
  - `targetExtension`
- Non-code asset/config targets remain unresolved and do not create graph
  edges.
- The taxonomy script remains backward compatible with older profile artifacts
  that do not contain target metadata.

**Deterministic Verification**

Commands:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "emits bounded Rust import fallback samples"
npx vitest run __tests__/rust-import-target-taxonomy.test.ts
npm run build
```

Results:

- Passed.

Coverage:

- Rust profile samples preserve `reason: file-node-not-found`.
- Rust profile samples include `targetKind: asset` / `targetExtension: .css`.
- Rust profile samples include `targetKind: config` / `targetExtension: .json`.
- Profile samples remain source-content-free.
- Non-code targets do not get `imports` graph edges.
- Taxonomy profile mode classifies metadata-present asset/config samples as
  `nonCodeAssetTarget` / `nonCodeConfigTarget`.
- Metadata-absent profile samples still use the existing specifier heuristics.

**Current Repo Evidence**

Artifacts:

- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-current.profile.json`
- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-current.measurement.json`
- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-current-taxonomy.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-21-relative-file-node-diagnostics-current.profile.json \
  /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  scripts/targeted-profile-evidence.mjs \
  --out docs/benchmarks/2026-06-21-relative-file-node-diagnostics-current.measurement.json \
  --cwd . \
  -- /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

| Metric | Value |
| --- | ---: |
| `importPathAliasResolvedBySource.relative` | 645 |
| `importPathAliasFallbackBySource.relative` | 1 |
| `relative/file-node-not-found` sample count | 1 |
| taxonomy `nonCodeConfigTarget` | 1 |

Sample:

- `../package.json` from `__tests__/installer-isolation.test.ts` classified as
  `targetKind: config`, `targetExtension: .json`.

Measurement sidecar:

- Wall time: 31,339ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Interpretation:

- The current repo's remaining relative file-node residual is a non-code config
  target, not a code-target resolver blocker.

**Closeout**

This slice closes the relative `file-node-not-found` diagnostics cleanup.

The residual should be treated as:

- current repo: diagnostics-known non-code config boundary;
- VS Code sparse `file-node-not-found`: diagnostics-known non-code asset
  boundary in sampled evidence;
- VS Code sparse `target-not-found` / `nls.js`: separate supported-source or
  sparse-hydration follow-up candidate, not an asset/config resolver expansion.

Do not expand the graph to asset/config imports based on this evidence.

### 14. 2026-06-21-relative-file-node-diagnostics-current-taxonomy.md

**Summary**

- Rows inspected: 150
- Relative unresolved JS/TS imports: 1
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 149

**Categories**

| Category | Count |
| --- | ---: |
| nonCodeConfigTarget | 1 |

### 15. 2026-06-21-relative-file-node-diagnostics-vscode-sparse-taxonomy.md

**Summary**

- Rows inspected: 400
- Relative unresolved JS/TS imports: 200
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 200

**Categories**

| Category | Count |
| --- | ---: |
| nonCodeAssetTarget | 100 |
| supportedSourceSpecifier | 100 |

### 16. 2026-06-21-relative-import-target-burndown-closeout-decision.md

**Decision**

Close this slice as no-go for production resolver changes.

The internal taxonomy diagnostic is keepable, and the targeted profiles confirm
the existing rust-hybrid path still completes. However, the final SQLite DB does
not retain the relative import target miss rows needed to choose a safe bounded
fix. Implementing query/hash stripping, path normalization changes, or any other
relative import behavior from profile counters alone would be speculative.

**Scope Completed**

- Added `scripts/rust-import-target-taxonomy.mjs`.
- Added deterministic coverage for classifying relative unresolved JS/TS import
  rows from DB metadata.
- Generated current-repo and VS Code sparse taxonomy artifacts.
- Ran current-repo targeted rust-hybrid profile.
- Ran VS Code sparse targeted rust-hybrid profile.
- Recorded no-go for the bounded implementation slice.

No production resolver behavior changed.

**Deterministic Evidence**

Command:

```bash
npx vitest run __tests__/rust-import-target-taxonomy.test.ts
```

Result:

- Passed.

The test proves:

- the taxonomy script reads a DB path and writes JSON/markdown artifacts;
- only JS/TS relative import unresolved refs are classified;
- non-relative imports, non-import refs, and unsupported languages are ignored;
- query/hash source targets, asset-like targets, extensionless/index candidates,
  and declaration targets are separated.

**Interpretation**

The profile counters still show a large Rust-core relative import target gap.
The taxonomy script cannot classify that gap from the final DB because
TypeScript finalization cleanup removes the unresolved rows.

That makes the bounded implementation issue intentionally close as no-op/no-go.
This protects resolver semantics: we should not infer a production fix from
aggregate counters alone.

**Next Recommended Move**

Add a pre-cleanup profile artifact for Rust import target fallback samples. The
artifact should preserve only privacy-safe metadata needed for taxonomy:

- import specifier;
- source file path;
- language;
- line/column;
- source-kind classification;
- resolver fallback reason.

Do not read or include source slices. Once that artifact exists, rerun the
relative import target taxonomy and choose at most one bounded code-target
burndown.

### 17. 2026-06-21-relative-import-target-taxonomy-current-repo.md

**Summary**

- Rows inspected: 1979
- Relative unresolved JS/TS imports: 0
- Ignored non-import references: 1905
- Ignored unsupported languages: 0
- Ignored non-relative imports: 74

**Categories**

| Category | Count |
| --- | ---: |

### 18. 2026-06-21-relative-import-target-taxonomy-decision.md

**Decision**

Do not choose a bounded production burndown from the current VS Code sparse
database.

The taxonomy script is keepable as an internal benchmark diagnostic, but the
available VS Code sparse `.zcodegraph` database is a post-finalization database:
`unresolved_refs` is empty after cleanup. That means it cannot sample the
relative import target misses reported by the Rust core profile.

This is a data-source no-go, not evidence that no low-risk relative import
category exists.

**Artifacts**

- Plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- VS Code sparse taxonomy before profile rerun:
  `docs/benchmarks/2026-06-21-relative-import-target-taxonomy-vscode-sparse.json`
- VS Code sparse taxonomy after profile rerun:
  `docs/benchmarks/2026-06-21-relative-import-target-taxonomy-vscode-sparse-after-profile.json`
- Current repo taxonomy:
  `docs/benchmarks/2026-06-21-relative-import-target-taxonomy-current-repo.json`

**Category Choice**

No bounded category was selected.

Rejected production changes in this slice:

- asset imports;
- bundler loader semantics;
- package `exports` / `main`;
- sparse-checkout missing files;
- dynamic/template imports;
- symbol-level disambiguation;
- speculative query/hash stripping without a sampled low-risk target set.

**Follow-Up**

If we still want to burn down relative import targets, the next slice should
capture unresolved import target metadata at the Rust-core/profile boundary
before TypeScript finalization cleanup, or add a dedicated profile artifact that
samples the relevant fallback rows without exposing source text.

### 19. 2026-06-21-relative-import-target-taxonomy-vscode-sparse-after-profile.md

**Summary**

- Rows inspected: 0
- Relative unresolved JS/TS imports: 0
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 0

**Categories**

| Category | Count |
| --- | ---: |

### 20. 2026-06-21-relative-import-target-taxonomy-vscode-sparse.md

**Summary**

- Rows inspected: 0
- Relative unresolved JS/TS imports: 0
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 0

**Categories**

| Category | Count |
| --- | ---: |

### 21. 2026-06-21-relative-js-source-fallback-current-after-taxonomy.md

**Summary**

- Rows inspected: 150
- Relative unresolved JS/TS imports: 1
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 149

**Categories**

| Category | Count |
| --- | ---: |
| assetLikeTarget | 1 |

### 22. 2026-06-21-relative-js-source-fallback-vscode-sparse-after-taxonomy.md

**Summary**

- Rows inspected: 400
- Relative unresolved JS/TS imports: 200
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 200

**Categories**

| Category | Count |
| --- | ---: |
| assetLikeTarget | 100 |
| supportedSourceSpecifier | 100 |

### 23. 2026-06-21-relative-js-source-specifier-burndown-closeout-decision.md

**Decision**

Keep the relative JS source specifier fallback.

The implementation reduces the Rust relative import target gap on both the
current repo and the VS Code sparse checkout while preserving the intended
semantic boundary:

- only relative imports changed;
- literal `.js` targets still win when present;
- alias/workspace/package paths did not opt into the fallback;
- asset imports stayed unresolved and out of the graph.

This is a feature-completeness keep decision, not a performance claim.

**Scope Completed**

Rust relative import resolution now handles explicit JS runtime specifiers as a
source-file fallback when the literal file is absent:

- `.js` -> `.ts`, `.tsx`, `.mts`, `.cts`, `.jsx`
- `.mjs` -> `.mts`, `.ts`, `.tsx`, `.js`
- `.cjs` -> `.cts`, `.ts`, `.tsx`, `.js`

The fallback is only used by the relative import path. Alias, tsconfig path,
conventional alias, workspace package, package import, asset import, dynamic
import, and symbol-level behavior were not intentionally changed.

**Deterministic Evidence**

Commands:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "resolves only relative JS source specifiers"
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "relative and paths-alias|conventional aliases|emits bounded Rust import fallback samples|resolves only relative JS source specifiers"
cargo test -p zcodegraph-core import_fallback
```

Results:

- Passed.

The integration fixture proves:

- `./target.js` can resolve to `target.ts` when literal `target.js` is absent;
- `.js` can resolve to `.tsx`;
- `.mjs` and `.cjs` can fall through to `.ts` when `.mts` / `.cts` are absent;
- literal `target.js` wins over `target.ts`;
- `./style.css` remains unresolved;
- `@app/alias-only.js` remains unresolved in this slice.

**Current Repo Evidence**

Before artifacts reused from the import fallback samples closeout:

- `docs/benchmarks/2026-06-21-import-fallback-samples-current.profile.json`
- `docs/benchmarks/2026-06-21-import-fallback-samples-current-taxonomy.json`

After artifacts:

- `docs/benchmarks/2026-06-21-relative-js-source-fallback-current-after.profile.json`
- `docs/benchmarks/2026-06-21-relative-js-source-fallback-current-after-taxonomy.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- `docs/benchmarks/2026-06-21-relative-js-source-fallback-current-after.measurement.json`

After command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-21-relative-js-source-fallback-current-after.profile.json \
  /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  scripts/targeted-profile-evidence.mjs \
  --out docs/benchmarks/2026-06-21-relative-js-source-fallback-current-after.measurement.json \
  --cwd . \
  -- /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed movement:

| Metric | Before | After |
| --- | ---: | ---: |
| `importPathAliasResolvedBySource.relative` | 637 | 645 |
| `importPathAliasFallbackBySource.relative` | 9 | 1 |
| `relative/target-not-found` samples count | 8 | 0 |
| `relative/file-node-not-found` samples count | 1 | 1 |
| taxonomy `supportedSourceSpecifier` | 8 | 0 |
| taxonomy `assetLikeTarget` | 1 | 1 |

Measurement sidecar:

- Wall time: 31,130ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Interpretation:

- The current repo's `.js` source specifier misses were resolved.
- The remaining relative miss is an asset-like target, not a code-target miss.

**Next Recommended Move**

Do not continue expanding file-target resolution into asset or package semantics.

Two reasonable next moves remain:

1. Investigate the residual `relative/file-node-not-found` bucket. It is small
   but semantically different from `target-not-found`, and may expose extraction,
   indexing inclusion, or sparse-checkout hydration issues.
2. Return to binding-level symbol disambiguation, which remains the largest
   known resolver migration gap.

Recommended next slice: inspect `relative/file-node-not-found` with profile
samples before choosing another production resolver change.

### 24. 2026-06-21-ts-implementation-declaration-current-decision.md

**Decision**

- Import edge target: runtime/value ESM named import edges should target the implementation declaration only when exactly one clear implementation declaration exists.
- Imported usage edge target: imported runtime/value usage edges should target the same implementation declaration selected for the import edge.
- Overload signature rule: overload signatures without implementation bodies are not runtime implementation targets.
- Metadata sufficiency: insufficient-missing-implementation-declaration-marker.
- Recommended next slice: add implementation-declaration metadata before changing resolver behavior.

**No-Go Rules**

- ambient-only overload/signature sets keep fallback.
- .d.ts overload/signature sets keep fallback.
- no-implementation overload/signature sets keep fallback.
- type/value/namespace collisions keep fallback.

**Safe Tie-Break Prerequisites**

- all candidates are in the same resolved target file.
- all candidates are runtime/value compatible function declarations.
- candidate metadata exposes hasBody=true or declarationForm=implementation.
- exactly one candidate is marked as the implementation declaration.
- target file is not a .d.ts declaration file.

**Fixture Coverage**

- Overload signatures plus one implementation: 0
- Ambient-only or no implementation: 0
- .d.ts overload set: 0
- Type/value namespace collision: 0

### 25. 2026-06-21-ts-implementation-declaration-current-taxonomy.md

**Summary**

- Rows inspected: 0
- Largest subtype: none
- Recommended next slice: no samples available

**Subtypes**

| Subtype | Count | Decision |
| --- | ---: | --- |

**Decision**

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: none
- No-go subtypes: none

### 26. 2026-06-21-ts-implementation-declaration-metadata-closeout-decision.md

**What Changed**

Rust ESM named import/export candidate-multiple diagnostics now expose
implementation-declaration metadata for candidate line ranges:

- `hasBody`
- `declarationForm`
- `metadataSource`

The metadata is diagnostic-only. It is not persisted in SQLite schema, is not
encoded into user-facing node fields, and is not consumed by production resolver
routing in this slice.

**Decision**

The metadata prerequisite is satisfied for a bounded next slice: production
resolver behavior may attempt a guarded overload/signature candidate-multiple
tie-break only when all safe prerequisites hold.

Safe prerequisites:

- all candidates are in the same resolved target file;
- all candidates are runtime/value compatible function declarations;
- candidate metadata exposes `hasBody=true` or
  `declarationForm=implementation`;
- exactly one candidate is marked as the implementation declaration;
- target file is not a `.d.ts` declaration file.

**No-Go Rules**

- Ambient-only overload/signature sets keep fallback.
- `.d.ts` overload/signature sets keep fallback.
- No-implementation overload/signature sets keep fallback.
- Type/value/namespace collisions keep fallback.
- Unknown or unavailable declaration metadata keeps fallback.

**Recommendation**

Next implementation slice: implement a bounded production resolver tie-break for
TypeScript overload/signature candidate-multiple cases, guarded by the safe
prerequisites above. Do not broaden into type/value namespace collision,
ambient-only declarations, `.d.ts` declarations, default imports, namespace
imports, package resolution, or multi-hop re-export semantics.

### 27. 2026-06-21-ts-implementation-declaration-vscode-sparse-decision.md

**Decision**

- Import edge target: runtime/value ESM named import edges should target the implementation declaration only when exactly one clear implementation declaration exists.
- Imported usage edge target: imported runtime/value usage edges should target the same implementation declaration selected for the import edge.
- Overload signature rule: overload signatures without implementation bodies are not runtime implementation targets.
- Metadata sufficiency: sufficient-when-exactly-one-implementation-marker-exists.
- Recommended next slice: implement a bounded candidate-multiple tie-break guarded by the safe prerequisites.

**No-Go Rules**

- ambient-only overload/signature sets keep fallback.
- .d.ts overload/signature sets keep fallback.
- no-implementation overload/signature sets keep fallback.
- type/value/namespace collisions keep fallback.

**Safe Tie-Break Prerequisites**

- all candidates are in the same resolved target file.
- all candidates are runtime/value compatible function declarations.
- candidate metadata exposes hasBody=true or declarationForm=implementation.
- exactly one candidate is marked as the implementation declaration.
- target file is not a .d.ts declaration file.

**Fixture Coverage**

- Overload signatures plus one implementation: 7
- Ambient-only or no implementation: 2
- .d.ts overload set: 0
- Type/value namespace collision: 10

### 28. 2026-06-21-ts-implementation-declaration-vscode-sparse-taxonomy.md

**Summary**

- Rows inspected: 100
- Largest subtype: function-overload-signature
- Recommended next slice: resolve prerequisite for function-overload-signature before tie-break

**Subtypes**

| Subtype | Count | Decision |
| --- | ---: | --- |
| ambient-declaration-merge | 2 | prerequisite-first |
| function-overload-signature | 85 | prerequisite-first |
| type-value-namespace-collision | 13 | no-go-keep-fallback |

**Decision**

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: ambient-declaration-merge, function-overload-signature
- No-go subtypes: type-value-namespace-collision

### 29. 2026-06-21-ts-overload-implementation-current-decision.md

**Decision**

- Import edge target: runtime/value ESM named import edges should target the implementation declaration only when exactly one clear implementation declaration exists.
- Imported usage edge target: imported runtime/value usage edges should target the same implementation declaration selected for the import edge.
- Overload signature rule: overload signatures without implementation bodies are not runtime implementation targets.
- Metadata sufficiency: insufficient-missing-implementation-declaration-marker.
- Overload implementation resolved refs: 0.
- Recommended next slice: add implementation-declaration metadata before changing resolver behavior.

**No-Go Rules**

- ambient-only overload/signature sets keep fallback.
- .d.ts overload/signature sets keep fallback.
- no-implementation overload/signature sets keep fallback.
- type/value/namespace collisions keep fallback.

**Safe Tie-Break Prerequisites**

- all candidates are in the same resolved target file.
- all candidates are runtime/value compatible function declarations.
- candidate metadata exposes hasBody=true or declarationForm=implementation.
- exactly one candidate is marked as the implementation declaration.
- target file is not a .d.ts declaration file.

**Fixture Coverage**

- Overload signatures plus one implementation: 0
- Ambient-only or no implementation: 0
- .d.ts overload set: 0
- Type/value namespace collision: 0

### 30. 2026-06-21-ts-overload-implementation-current-taxonomy.md

**Summary**

- Rows inspected: 0
- Largest subtype: none
- Recommended next slice: no samples available
- Overload implementation resolved refs: 0

**Subtypes**

| Subtype | Count | Decision |
| --- | ---: | --- |

**Decision**

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: none
- No-go subtypes: none

### 31. 2026-06-21-ts-overload-implementation-tie-break-closeout-decision.md

**Scope**

This closeout covers the bounded TypeScript overload implementation tie-break
from `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`.

The change is production routing for Rust ESM named import/export resolution,
default enabled only when a candidate-multiple set has exactly one safe
TypeScript implementation declaration.

**Decision**

Keep guarded overload implementation routing enabled.

The VS Code sparse evidence shows the mechanism works on a large real TypeScript
corpus: the tie-break resolved 3766 import or imported-usage refs through
`rust-esm-named-import-export-overload-implementation`, while the remaining
candidate-multiple sample distribution shifted away from overload signatures.

This is not a performance claim. No agent A/B and no multi-run benchmark were
run. The evidence is deterministic profile/taxonomy evidence only.

**No-Go Boundaries**

Keep fallback for:

- ambient-only overload/signature sets;
- declaration-file overload/signature sets;
- no-implementation overload/signature sets;
- type/value/namespace collisions;
- unknown or unavailable implementation metadata;
- one-hop re-export;
- default imports;
- namespace imports;
- package/runtime imports;
- multi-hop barrel chains.

**Next Recommendation**

Do not broaden overload implementation routing.

The next resolver migration slice should investigate the remaining
`type-value-namespace-collision` candidate-multiple class as its own bounded
semantic decision, with separate fixtures and evidence. That class has different
risk than overload implementation selection and should not be hidden inside this
route.

### 32. 2026-06-21-ts-overload-implementation-vscode-sparse-decision.md

**Decision**

- Import edge target: runtime/value ESM named import edges should target the implementation declaration only when exactly one clear implementation declaration exists.
- Imported usage edge target: imported runtime/value usage edges should target the same implementation declaration selected for the import edge.
- Overload signature rule: overload signatures without implementation bodies are not runtime implementation targets.
- Metadata sufficiency: sufficient-when-exactly-one-implementation-marker-exists.
- Overload implementation resolved refs: 3766.
- Recommended next slice: keep guarded overload implementation routing enabled and investigate remaining candidate-multiple subtypes.

**No-Go Rules**

- ambient-only overload/signature sets keep fallback.
- .d.ts overload/signature sets keep fallback.
- no-implementation overload/signature sets keep fallback.
- type/value/namespace collisions keep fallback.

**Safe Tie-Break Prerequisites**

- all candidates are in the same resolved target file.
- all candidates are runtime/value compatible function declarations.
- candidate metadata exposes hasBody=true or declarationForm=implementation.
- exactly one candidate is marked as the implementation declaration.
- target file is not a .d.ts declaration file.

**Fixture Coverage**

- Overload signatures plus one implementation: 0
- Ambient-only or no implementation: 2
- .d.ts overload set: 0
- Type/value namespace collision: 10

### 33. 2026-06-21-ts-overload-implementation-vscode-sparse-taxonomy.md

**Summary**

- Rows inspected: 100
- Largest subtype: type-value-namespace-collision
- Recommended next slice: keep fallback for dominant subtype: type-value-namespace-collision
- Overload implementation resolved refs: 3766

**Subtypes**

| Subtype | Count | Decision |
| --- | ---: | --- |
| ambient-declaration-merge | 2 | prerequisite-first |
| function-overload-signature | 17 | prerequisite-first |
| type-value-namespace-collision | 81 | no-go-keep-fallback |

**Decision**

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: ambient-declaration-merge, function-overload-signature
- No-go subtypes: type-value-namespace-collision

### 34. 2026-06-21-ts-overload-signature-semantic-closeout-decision.md

**Decision**

Runtime/value ESM named import edges should target the TypeScript function
implementation declaration only when there is exactly one clear implementation
declaration. Imported runtime/value usage edges should target the same
implementation declaration selected for the import edge.

Overload signatures are not runtime implementation targets. A source-order or
pick-first tie-break is rejected.

**Safe Tie-Break Prerequisites**

- All candidates are in the same resolved target file.
- All candidates are runtime/value compatible function declarations.
- Candidate metadata exposes `hasBody=true` or
  `declarationForm=implementation`.
- Exactly one candidate is marked as the implementation declaration.
- Target file is not a `.d.ts` declaration file.

**No-Go Rules**

- Ambient-only overload/signature sets keep fallback.
- `.d.ts` overload/signature sets keep fallback.
- No-implementation overload/signature sets keep fallback.
- Type/value/namespace collisions keep fallback.

**Recommendation**

Next implementation slice: add implementation-declaration metadata to Rust
TypeScript extraction/profile diagnostics before changing candidate-multiple
resolver behavior. After that metadata exists, implement a bounded
candidate-multiple tie-break guarded by the safe prerequisites above.

### 35. 2026-06-21-ts-overload-signature-semantic-decision.md

**Decision**

- Import edge target: runtime/value ESM named import edges should target the implementation declaration only when exactly one clear implementation declaration exists.
- Imported usage edge target: imported runtime/value usage edges should target the same implementation declaration selected for the import edge.
- Overload signature rule: overload signatures without implementation bodies are not runtime implementation targets.
- Metadata sufficiency: insufficient-missing-implementation-declaration-marker.
- Recommended next slice: add implementation-declaration metadata before changing resolver behavior.

**No-Go Rules**

- ambient-only overload/signature sets keep fallback.
- .d.ts overload/signature sets keep fallback.
- no-implementation overload/signature sets keep fallback.
- type/value/namespace collisions keep fallback.

**Safe Tie-Break Prerequisites**

- all candidates are in the same resolved target file.
- all candidates are runtime/value compatible function declarations.
- candidate metadata exposes hasBody=true or declarationForm=implementation.
- exactly one candidate is marked as the implementation declaration.
- target file is not a .d.ts declaration file.

**Fixture Coverage**

- Overload signatures plus one implementation: 0
- Ambient-only or no implementation: 12
- .d.ts overload set: 0
- Type/value namespace collision: 10

### 36. 2026-06-21-ts-type-value-namespace-collision-current-decision.md

**Decision**

The current repo has no direct export candidate-multiple samples for this
semantic decision slice. Treat this run as deterministic no-regression and
tooling evidence only.

Positive subtype evidence comes from the VS Code sparse checkout decision.

### 37. 2026-06-21-ts-type-value-namespace-collision-current-taxonomy.md

**Summary**

- Rows inspected: 0
- Largest subtype: none
- Recommended next slice: no samples available
- Overload implementation resolved refs: 0

**Subtypes**

| Subtype | Count | Decision |
| --- | ---: | --- |

**Decision**

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: none
- No-go subtypes: none

**Collision Subtypes**

| Collision subtype | Count | Recommendation |
| --- | ---: | --- |

### 38. 2026-06-21-ts-type-value-namespace-collision-semantic-closeout-decision.md

**Scope**

This closeout covers the final semantic-decision slice under #295:

- #386 Add type/value/namespace collision semantic fixtures
- #387 Extend candidate-multiple taxonomy with type/value/namespace collision subtypes
- #388 Generate type/value/namespace collision evidence on current repo and VS Code sparse
- #389 Write type/value/namespace collision semantic decision closeout

The slice does not change production resolver behavior.

**Decision**

`value-token-plus-interface` should become the next production routing
candidate, but not under #295.

The next implementation plan should be separate and should route only the
guarded service-token-style shape:

- candidate shape is exactly `constant-interface`;
- import form is `named-value-import`;
- target candidates are in the same resolved target file;
- runtime/value edges target the value token candidate, not the interface;
- type-only imports keep fallback;
- unknown context keeps fallback until usage metadata is sufficient.

**No-Go Boundaries**

Keep fallback for:

- `class-plus-interface`;
- `type-alias-plus-value`;
- `enum-or-namespace-plus-type`;
- `unknown-collision`;
- type-only imports;
- default imports;
- namespace imports;
- package imports;
- one-hop re-export;
- multi-hop barrel chains.

**PRD Boundary**

This is the final evidence slice under #295. The evidence identifies a plausible
successor implementation candidate, but #295 should not expand into that
implementation.

After this closeout, #295 should close with successor work moved out to a new
plan or tracker.

### 39. 2026-06-21-ts-type-value-namespace-collision-vscode-sparse-decision.md

**Decision**

`value-token-plus-interface` is a candidate for the next production routing
slice.

That next slice must be separate from this PRD closeout and must keep strict
guards:

- candidate shape is exactly `constant-interface`;
- import form is `named-value-import`;
- target candidates are in the same resolved target file;
- runtime/value edges target the value token candidate, not the interface;
- type-only imports keep fallback;
- unknown context keeps fallback until usage metadata is sufficient.

**No-Go Boundaries**

Keep fallback for:

- `class-plus-interface`;
- `type-alias-plus-value`;
- `enum-or-namespace-plus-type`;
- `unknown-collision`;
- default imports;
- namespace imports;
- package imports;
- one-hop re-export;
- multi-hop barrel chains.

No production resolver behavior changed in this decision slice.

### 40. 2026-06-21-ts-type-value-namespace-collision-vscode-sparse-taxonomy.md

**Summary**

- Rows inspected: 100
- Largest subtype: value-token-plus-interface
- Recommended next slice: candidate for next routing slice: value-token-plus-interface
- Overload implementation resolved refs: 3766

**Subtypes**

| Subtype | Count | Decision |
| --- | ---: | --- |
| ambient-declaration-merge | 2 | prerequisite-first |
| function-overload-signature | 17 | prerequisite-first |
| value-token-plus-interface | 81 | needs-more-metadata |

**Decision**

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: ambient-declaration-merge, function-overload-signature
- No-go subtypes: none

**Collision Subtypes**

| Collision subtype | Count | Recommendation |
| --- | ---: | --- |
| value-token-plus-interface | 81 | candidate-for-next-routing-slice |

### 41. 2026-06-21-value-token-interface-current-taxonomy.md

**Summary**

- Rows inspected: 0
- Largest subtype: none
- Recommended next slice: no samples available
- Overload implementation resolved refs: 0

**Subtypes**

| Subtype | Count | Decision |
| --- | ---: | --- |

**Decision**

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: none
- No-go subtypes: none

**Collision Subtypes**

| Collision subtype | Count | Recommendation |
| --- | ---: | --- |

### 42. 2026-06-21-value-token-interface-routing-closeout.md

**Decision**

Conclusion: `keep-with-caveat`.

The guarded routing mechanism is safe enough to keep because deterministic
fixtures prove the intended semantics and VS Code sparse produces Rust-owned
`rust-esm-value-token-interface` edges for the service-token pattern.

The caveat is important: this does not close the whole
`value-token-plus-interface` bucket. The residual capped taxonomy sample still
contains many `value-token-plus-interface` fallbacks, mostly contexts that this
plan intentionally left as fallback. The next plan should not treat this slice
as a completed burndown of the collision family.

**What Changed**

Rust ESM named import/export finalization now routes exactly this guarded shape:

- import form is named value import;
- direct export lookup returns exactly one `constant` and one `interface`;
- the source file has visible runtime usage, including an imported-symbol usage
  reference or decorator-token syntax such as `@IService`;
- the import edge targets the value token candidate;
- imported-symbol usage edges target the value token candidate when usage refs
  exist.

The route remains fail-closed for:

- `import type`;
- mixed `type` specifiers in a named import list;
- default imports;
- namespace imports;
- package/runtime imports;
- re-export/barrel chains;
- unknown usage context;
- type-position-only usage.

**Interpretation**

This slice validates the mechanism, not a full bucket burndown.

The useful part is that the guarded service-token route generates many
Rust-owned value-token import edges on the large VS Code sparse checkout without
changing default/type-only/namespace/package/re-export behavior. The safety
guard is also covered by fixture assertions that type-position-only usage keeps
fallback.

The noisy part is the residual capped taxonomy: after routing, the first 100
candidate-multiple fallback samples still show `value-token-plus-interface` as
the largest subtype. That means this plan should not be used to claim the
collision family is solved. The remaining samples need a separate decision:
either add richer usage context for more service-token cases, or move to the
next planned tail-boundary work instead.

**Follow-Up**

Update #165 with this closeout and continue to the TypeScript
finalization/reference-resolution tail boundary plan.

### 43. 2026-06-21-value-token-interface-vscode-sparse-taxonomy.md

**Summary**

- Rows inspected: 100
- Largest subtype: value-token-plus-interface
- Recommended next slice: candidate for next routing slice: value-token-plus-interface
- Overload implementation resolved refs: 3766

**Subtypes**

| Subtype | Count | Decision |
| --- | ---: | --- |
| ambient-declaration-merge | 3 | prerequisite-first |
| function-overload-signature | 17 | prerequisite-first |
| value-token-plus-interface | 80 | needs-more-metadata |

**Decision**

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: ambient-declaration-merge, function-overload-signature
- No-go subtypes: none

**Collision Subtypes**

| Collision subtype | Count | Recommendation |
| --- | ---: | --- |
| value-token-plus-interface | 80 | candidate-for-next-routing-slice |

### 44. 2026-06-22-direct-esm-named-import-export-part1-closeout.md

**Decision**

Decision: `keep`.

The selected direct named binding residual is:

```text
repo-local direct ESM named import/export where the target file has exactly one
matching exported declaration or same-file export-specifier declaration
```

This behavior is already implemented and covered by deterministic fixtures. No
new production behavior is required for #426.

**Implemented Scope**

Kept behavior:

- direct named import to a relative repo-local source file;
- direct named import to a paths-alias repo-local source file;
- declaration-style direct exports with TypeScript modifiers;
- same-file `export { Name }` when there is exactly one local declaration
  candidate.

Kept fallback:

- default imports;
- namespace imports;
- type-only imports;
- package/runtime imports;
- unsupported import shapes;
- direct export candidate-zero;
- direct export candidate-multiple unless a later semantic decision narrows it.

**Deterministic Fixture Coverage**

Coverage exists in `__tests__/rust-index-engine-cli.test.ts`:

- direct ESM named imports;
- paths-alias ESM named imports;
- declaration-style ESM named exports with TypeScript modifiers;
- same-file ESM export specifiers;
- bounded ESM named binding fallback samples.

Fallback taxonomy coverage exists in:

- `__tests__/rust-esm-fallback-taxonomy.test.ts`
- `__tests__/rust-esm-candidate-multiple-taxonomy.test.ts`

**Interpretation**

The bounded direct named path is keepable.

The largest remaining direct named residual is not a simple missing file-level
lookup. VS Code sparse is dominated by candidate-multiple and candidate-zero
cases. Candidate-multiple requires a separate semantic decision for overloads,
ambient declarations, and type/value namespace collisions. Candidate-zero
requires better evidence about why the declaration is absent before changing
selection behavior.

**Part 2 Boundary**

Package/runtime bindings are explicitly Part 2. #426 does not solve package
imports, runtime builtins, package `exports`/`imports`, `node_modules`, or full
TypeScript `moduleResolution`.

**Closeout**

#426 closes as `keep` for the bounded direct named import/export behavior.

Residuals:

- direct candidate-multiple: `needs-architecture`;
- direct candidate-zero: `no-go` until a narrower diagnostic identifies a safe
  implementation target;
- package/runtime binding: `handoff-to-Part2`.

### 45. 2026-06-22-filenodes-routing-residual-audit.md

**Decision**

Decision: `handoff-to-import-file-plan`.

`FileNodes` candidate-producer on-demand routing is mechanically safe in the
available evidence, but it should not be closed as an independent resolver
semantic residual inside PlanB.

The shape belongs with the next route: **Import/File-Level Resolver Completion
Plan**.

**Interpretation**

`FileNodes` routing is not failing:

- it is active on both targets;
- it is exercised on both targets;
- VS Code sparse exercises it heavily;
- routing fallback reason is null;
- mismatch count is zero;
- graph-readable status is preserved.

However, its semantic ownership overlaps file/import resolver behavior:

- VS Code sparse has `1247` on-demand `FileNodes` lookups;
- the same evidence has `5418` unresolved file-level import target fallbacks;
- `FileNodes` candidate lookup is tightly related to relative/path-alias import
  target lookup, ESM import/export target selection, source-file fallback, and
  import-form taxonomy.

Keeping `FileNodes` as an isolated PlanB routing-shape residual would hide the
more important boundary: import/file-level resolver completion.

**Boundary**

This audit does not change:

- reference target selection;
- edge kind semantics;
- confidence semantics;
- `resolvedBy` semantics;
- package resolution;
- framework post-extract behavior;
- dynamic-dispatch synthesis;
- SQLite schema;
- broad disambiguation behavior.

### 46. 2026-06-22-import-file-completion-map-baseline.md

**Decision**

Decision: `keep-baseline`.

Part 1 is bounded to repo-local source import/file resolver completion.
Package/runtime resolver work is explicitly assigned to Part 2 and is not
treated as solved by this baseline.

The first implementation/closeout target is:

```text
repo-local file-level import target fallback
```

Rationale:

- it is the direct owner of unresolved repo-local file target taxonomy;
- it explains how FileNodes/source-file fallback should be read;
- it is prerequisite context for direct ESM named import/export and one-hop
  barrel behavior;
- existing evidence already separates repo-local target gaps from package,
  unsupported, type-only, and broad binding-disambiguation boundaries.

**Boundary Map**

| Bucket | Part | Current handling |
| --- | --- | --- |
| relative source imports | Part 1 | supported, with residual target-not-found/file-node-not-found taxonomy |
| tsconfig/jsconfig paths aliases | Part 1 | supported in current repo fixtures; no VS Code sparse paths-alias hits in current evidence |
| same-file export specifiers | Part 1 | supported for exactly-one local declaration candidates |
| direct ESM named import/export | Part 1 | supported for bounded repo-local source targets |
| one-hop direct re-export/barrel | Part 1 | supported for bounded repo-local final leaf targets |
| FileNodes/source-file fallback | Part 1 | mechanically safe, semantically tied to file/import resolver closeout |
| package imports | Part 2 | not solved by Part 1 |
| Node/runtime builtins | Part 2 | not solved by Part 1 |
| package `exports`/`imports` | Part 2 | not solved by Part 1 |
| `node_modules` package graph | Part 2 | not solved by Part 1 |
| TypeScript full `moduleResolution` | Part 2 | not solved by Part 1 |
| default/namespace/type-only imports | outside Part 1 by default | remains fallback unless separately approved |
| broad disambiguation/source-order tie-break | disallowed | no source-order or pick-first behavior |

**Current Repo Taxonomy**

Rust-core file/import target profile:

| Metric | Count |
| --- | ---: |
| `importPathAliasResolvedRefs` | 662 |
| `importPathAliasResolvedBySource.relative` | 645 |
| `importPathAliasResolvedBySource.tsconfigPaths` | 17 |
| `importPathAliasFallbackRefs` | 2,591 |
| `importPathAliasFallbackBySource.relative` | 1 |
| `importPathAliasFallbackBySource.binding` | 2,541 |
| `importPathAliasFallbackBySource.unsupported` | 49 |

Fallback sample counts:

| Reason | Count | Baseline bucket |
| --- | ---: | --- |
| `relative/file-node-not-found` | 1 | repo-local residual |
| `binding/binding-level-symbol-disambiguation` | 2,541 | resolver semantic residual, not file-target Part 1 |
| `unsupported/unsupported-import-form` | 49 | unsupported import form |

ESM named import/export taxonomy:

| Reason | Count | Baseline bucket |
| --- | ---: | --- |
| `direct-export-candidate-zero` | 49 | repo-local direct named residual |
| `import-edge-target-not-found` | 7 | repo-local file/import residual |
| `package-or-runtime-binding` | 1,277 | Part 2 |
| `type-only-import` | 228 | outside Part 1 by default |
| `unsupported-import-shape` | 329 | unsupported |

Candidate protocol routing:

| Field | Value |
| --- | --- |
| active shapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| routing fallback reason | null |
| routing mismatch count | 0 |
| `onDemandLookupShapeCounts.FileNodes` | 32 |

**VS Code Sparse Taxonomy**

Rust-core file/import target profile:

| Metric | Count |
| --- | ---: |
| `importPathAliasResolvedRefs` | 59,042 |
| `importPathAliasResolvedBySource.relative` | 59,042 |
| `importPathAliasResolvedBySource.tsconfigPaths` | 0 |
| `importPathAliasFallbackRefs` | 111,373 |
| `importPathAliasFallbackBySource.relative` | 5,180 |
| `importPathAliasFallbackBySource.binding` | 105,920 |
| `importPathAliasFallbackBySource.unsupported` | 273 |

Fallback sample counts:

| Reason | Count | Baseline bucket |
| --- | ---: | --- |
| `relative/file-node-not-found` | 309 | repo-local residual |
| `relative/target-not-found` | 4,871 | repo-local residual |
| `binding/binding-level-symbol-disambiguation` | 105,920 | resolver semantic residual, not file-target Part 1 |
| `unsupported/unsupported-import-form` | 273 | unsupported import form |

ESM named import/export taxonomy:

| Reason | Count | Baseline bucket |
| --- | ---: | --- |
| `direct-export-candidate-multiple` | 5,254 | needs semantic decision |
| `direct-export-candidate-zero` | 10,864 | repo-local direct named residual |
| `same-file-export-specifier-candidate-zero` | 58 | repo-local direct named residual |
| `import-edge-target-not-found` | 5,783 | repo-local file/import residual |
| `reexport-leaf-candidate-zero` | 123 | repo-local one-hop residual |
| `reexport-leaf-candidate-multiple` | 20 | needs semantic decision |
| `package-or-runtime-binding` | 1,965 | Part 2 |
| `type-only-import` | 2,759 | outside Part 1 by default |
| `unsupported-import-shape` | 2,083 | unsupported |

Candidate protocol routing:

| Field | Value |
| --- | --- |
| active shapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| routing fallback reason | null |
| routing mismatch count | 0 |
| `onDemandLookupShapeCounts.FileNodes` | 1,247 |

**Closeout**

This baseline satisfies #424:

- Part 1 versus Part 2 is frozen;
- package/runtime resolution is explicitly Part 2;
- current repo and VS Code sparse evidence are recorded from existing targeted
  profiles;
- fallback taxonomy separates repo-local, package/runtime, unsupported, and
  unknown/needs-architecture buckets;
- the first target is repo-local file-level import target fallback.

### 47. 2026-06-22-import-file-resolver-completion-part1-final-closeout.md

**Decision**

Decision: `complete-with-Part2-handoff`.

Import/File-Level Resolver Completion Plan Part 1 is complete for repo-local
source import/file resolver scope.

Package/runtime resolution is not solved by Part 1. It is handed to Part 2.

**Slice Decisions**

| Issue | Slice | Decision | Artifact |
| --- | --- | --- | --- |
| #424 | completion map and fallback taxonomy baseline | keep-baseline | `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md` |
| #425 | repo-local file-level import target burndown | no-go | `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md` |
| #426 | direct ESM named import/export residual burndown | keep | `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md` |
| #427 | one-hop barrel re-export residual burndown | keep | `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md` |
| #428 | source-file fallback and FileNodes integration | keep | `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md` |

**Final Classification**

### Closed / Keep

| Residual | Decision |
| --- | --- |
| relative repo-local source import file-level edges | keep |
| tsconfig/jsconfig paths-alias repo-local source import file-level edges | keep |
| direct ESM named import/export to exactly-one repo-local target symbol | keep |
| same-file export specifier with exactly-one local declaration candidate | keep |
| one-hop direct repo-local barrel to exactly-one final leaf symbol | keep |
| FileNodes/source-file routed lookup shape | keep |

### No-Go For Part 1

| Residual | Reason |
| --- | --- |
| `relative/file-node-not-found` | remaining evidence is aggregate/sample-level and does not safely identify one production behavior change |
| `relative/target-not-found` | same as above |
| direct export candidate-zero | needs narrower evidence proving extraction or target lookup missed a supported declaration shape |
| one-hop leaf candidate-zero | needs narrower evidence proving extraction or target lookup missed a supported declaration shape |

### Needs Architecture

| Residual | Reason |
| --- | --- |
| direct export candidate-multiple | overloads, ambient declarations, and type/value namespace collisions need target semantics |
| one-hop leaf candidate-multiple | same candidate-selection risk as direct candidate-multiple |
| broad disambiguation | source-order or pick-first remains disallowed |

### Handoff To Part 2

| Residual | Next owner |
| --- | --- |
| package imports | Import/File-Level Resolver Completion Plan Part 2 |
| Node/runtime builtins | Import/File-Level Resolver Completion Plan Part 2 |
| package `exports`/`imports` | Import/File-Level Resolver Completion Plan Part 2 |
| `node_modules` package graph | Import/File-Level Resolver Completion Plan Part 2 |
| TypeScript full `moduleResolution` | Import/File-Level Resolver Completion Plan Part 2 |
| package/runtime re-exports | Import/File-Level Resolver Completion Plan Part 2 |

**Validation**

Targeted deterministic validation for Part 1:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "resolves JS/TS relative and paths-alias imports as Rust-owned file-level edges|resolves paths-alias ESM named imports to exported target-file symbols as Rust-owned edges|resolves one-hop ESM named re-exports to final leaf symbols as Rust-owned edges|resolves paths-alias one-hop ESM named re-exports to final leaf symbols as Rust-owned edges|emits bounded ESM named binding fallback samples in the profile artifact"
npx vitest run __tests__/rust-esm-fallback-taxonomy.test.ts __tests__/rust-esm-candidate-multiple-taxonomy.test.ts __tests__/rust-import-target-taxonomy.test.ts
```

### 48. 2026-06-22-one-hop-barrel-reexport-part1-closeout.md

**Decision**

Decision: `keep`.

The selected one-hop residual category is:

```text
repo-local one-hop direct re-export where the barrel specifier resolves to a
repo-local source file and the leaf file has exactly one matching exported
symbol
```

The behavior is already implemented and covered. It writes edges to the final
leaf exported symbol, not to the barrel export node.

**Implemented Scope**

Kept behavior:

- `export { foo } from "./leaf"` followed by `import { foo } from "./barrel"`;
- paths-alias one-hop re-export where both barrel and leaf stay repo-local;
- final target is the leaf symbol.

Kept fallback:

- leaf target file unavailable;
- re-export specifier target not found;
- leaf candidate-zero;
- leaf candidate-multiple;
- package/runtime re-exports;
- default, namespace, type-only, and multi-hop barrel behavior.

**Deterministic Fixture Coverage**

Coverage exists in `__tests__/rust-index-engine-cli.test.ts`:

- `resolves one-hop ESM named re-exports to final leaf symbols as Rust-owned edges`
- `resolves paths-alias one-hop ESM named re-exports to final leaf symbols as Rust-owned edges`
- `emits bounded ESM named binding fallback samples in the profile artifact`

The fallback test covers:

- `reexport-specifier-target-not-found`;
- `reexport-leaf-candidate-zero`;
- package/runtime binding fallback.

**Interpretation**

The bounded one-hop direct barrel behavior is keepable.

The remaining one-hop residual is not safe to broaden here:

- candidate-zero needs proof that extraction, file-target resolution, or export
  discovery missed a specific supported declaration shape;
- candidate-multiple needs semantic target-selection rules and must not use
  source-order or pick-first behavior;
- multi-hop chains remain outside Part 1 by default.

**Part 2 Boundary**

Package/runtime re-exports remain Part 2 or unsupported taxonomy. This slice
does not add package imports, Node/runtime builtins, package `exports`/`imports`,
`node_modules`, or full TypeScript `moduleResolution`.

**Closeout**

#427 closes as `keep` for bounded repo-local one-hop direct re-export behavior.

Residuals:

- one-hop leaf candidate-zero: `no-go` without narrower extraction/target
  evidence;
- one-hop leaf candidate-multiple: `needs-architecture`;
- package/runtime re-export: `handoff-to-Part2`;
- multi-hop barrel chain: outside Part 1 unless separately approved.

### 49. 2026-06-22-qualifiedname-routing-residual-baseline.md

**Baseline Decision**

`QualifiedName` candidate-producer routing is already implemented as a guarded
on-demand routing shape. PlanB-1 should audit it as a resolver semantic
residual rather than reimplementing routing.

This baseline is evidence-only by default. Production code may change only if
the audit cannot be completed with current diagnostics or deterministic tests.

**Out Of Scope**

This audit must not change:

- whether a reference resolves;
- which target node id is selected;
- edge kind semantics;
- confidence semantics;
- `resolvedBy` semantics;
- package resolution;
- framework post-extract behavior;
- dynamic-dispatch synthesis;
- SQLite schema;
- source-order, pick-first, or broad disambiguation behavior.

**Gates**

`keep`:

- `QualifiedName` routing is exercised, or evidence shows it is cleanly
  irrelevant for the current targets;
- mismatch count is zero or fully explainable through fail-closed behavior;
- fallback taxonomy stays visible and explainable;
- graph-readable status is preserved;
- no resolver semantic behavior changes are needed.

`no-go`:

- `QualifiedName` routing is safe but not useful enough to count as a meaningful
  residual slice;
- shape usage is too rare or unrelated to the remaining residuals;
- diagnostics are sufficient to make that call without architecture work.

`needs-architecture`:

- current diagnostics cannot prove parity;
- the shape needs broader disambiguation, package resolution, or source-order
  tie-break behavior;
- fail-closed behavior cannot distinguish safe mismatch from a missing protocol
  contract.

### 50. 2026-06-22-qualifiedname-routing-residual-closeout-decision.md

**Decision**

Decision: `keep`.

`QualifiedName` candidate-producer on-demand routing is safe to count as a kept
resolver semantic residual slice behind the existing local-config experimental
routing gate.

This decision does not make candidate-producer routing a stable public API and
does not claim a performance win.

**Semantic Boundary**

Unchanged:

- reference target selection;
- edge kind semantics;
- confidence semantics;
- `resolvedBy` semantics;
- package resolution;
- framework post-extract behavior;
- dynamic-dispatch synthesis;
- SQLite schema;
- broad disambiguation behavior.

The keep decision is specifically about the existing guarded `QualifiedName`
routing shape and its diagnostics. It does not authorize source-order,
pick-first, overload, namespace, or type/value tie-break behavior.

**Validation**

Targeted profile artifacts:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json`
- `docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json`

Additional deterministic validation:

```bash
npx vitest run __tests__/candidate-protocol.test.ts
```

Expected validation role:

- confirms routed shape behavior remains fail-closed;
- confirms diagnostics surface routed shapes and mismatch/fallback state.

**Caveats**

- Runs used targeted profile/smoke only, not a full scoreboard.
- No agent A/B was run.
- RSS was unavailable because these targeted CLI runs did not enable a
  process-tree RSS sampler.
- Host Node emitted the existing unsafe Node warning and completed under
  `CODEGRAPH_ALLOW_UNSAFE_NODE=1`.

### 51. 2026-06-22-qualifiedname-routing-residual-evidence.md

**Scope**

This artifact records targeted evidence for the `QualifiedName`
candidate-producer on-demand routing semantic residual.

No production code was changed for this evidence run. No full scoreboard or
agent A/B was run.

### 52. 2026-06-22-resolver-semantic-planb-final-closeout.md

**Decision**

PlanB is complete.

PlanB completed the resolver semantic residual routing-shape route by:

- keeping `QualifiedName` candidate-producer on-demand routing as a guarded
  semantic residual slice;
- auditing `FileNodes` candidate-producer on-demand routing and handing it off
  to the import/file-level resolver route;
- freezing what does and does not count as a PlanB resolver semantic residual;
- classifying known residuals into final buckets.

No production code was changed in the PlanB closeout.

**Final Residual Classification**

### Closed / Keep

| Residual | State | Evidence |
| --- | --- | --- |
| Complete local-config candidate producer routing boundary | keep | `docs/benchmarks/2026-06-24-rust-hybrid-consolidated-benchmarks.md` |
| `QualifiedName` candidate-producer on-demand routing | keep | `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md` |
| `LowerName` local-config routing | keep-with-caveat | Mechanism is safe behind local config; default-on was no-go due candidate lookup cost. |

### Closed / Handoff

| Residual | State | Next owner |
| --- | --- | --- |
| `FileNodes` candidate-producer on-demand routing | handoff-to-import-file-plan | Import/File-Level Resolver Completion Plan |
| unresolved file-level import targets | handoff-to-import-file-plan | Import/File-Level Resolver Completion Plan |
| supported ESM/import-export residuals | handoff-to-import-file-plan | Import/File-Level Resolver Completion Plan |

### Needs Architecture

| Residual | Reason |
| --- | --- |
| broad disambiguation migration | Requires per-reference replay/parity evidence and can change target selection. |
| source-order or pick-first tie-break behavior | Disallowed as a speed shortcut; requires explicit semantic decision if ever considered. |
| overload/namespace/type-value generalization | Can change target node selection and cannot be folded into routing-shape parity. |
| framework post-extract migration | Tied to final graph ordering and outside candidate-producer routing. |
| dynamic-dispatch synthesis migration | Requires end-to-end flow evidence because partial migration can regress agent sufficiency. |
| package resolution expansion | Excluded unless separately approved. |

### Deferred / Performance-Only

| Residual | Reason |
| --- | --- |
| candidate lookup hot-path optimization | Important for performance, but not a resolver semantic residual closeout item. |
| default-on candidate-producer routing | Prior LowerName default-on evidence no-goed default behavior; this remains outside PlanB. |

**Next Route**

Next recommended route:

- **Import/File-Level Resolver Completion Plan**

Scope for that route:

- FileNodes handoff;
- unresolved file-level import target taxonomy;
- supported ESM/import-export residuals;
- relative/path-alias boundaries;
- source-file fallback interactions.

Default exclusions for that route:

- package resolution unless separately approved;
- broad disambiguation;
- framework post-extract migration;
- dynamic-dispatch synthesis migration;
- performance-only candidate lookup optimization.

**Validation**

Validation command:

```bash
npx vitest run __tests__/candidate-protocol.test.ts
```

Result:

- passed, 9 tests.

Additional validation:

```bash
git diff --check
```

Result:

- passed.

### 53. 2026-06-22-resolver-semantic-residual-map.md

**Decision Context**

PlanB-1 kept the existing guarded `QualifiedName` candidate-producer
on-demand routing residual. The keep decision is semantic-safety scoped and
local-config scoped. It does not claim default-path performance improvement and
does not authorize broad disambiguation migration.

**Next Recommended Slice**

Next slice: **FileNodes routing semantic residual audit**.

Why:

- it is already routed and diagnostic-visible;
- VS Code sparse exercised it heavily;
- it is the closest sibling to the kept `QualifiedName` slice;
- it has higher semantic boundary risk than `QualifiedName`, so doing it next
  should clarify whether routing-shape residuals can continue or whether the
  route must pivot to import/file-level architecture.

Guardrails for the next slice:

- evidence-only by default;
- no package resolution expansion;
- no import/export behavior change unless a narrow existing resolver boundary
  already owns it;
- graph-readable status and fallback taxonomy required;
- keep/no-go/needs-architecture closeout required.

**Non-Goals**

- No PlanB-2 issues are created by this artifact.
- No production behavior change is proposed here.
- No full scoreboard or agent A/B is required here.

### 54. 2026-06-22-source-file-filenodes-part1-closeout.md

**Decision**

Decision: `keep`.

FileNodes/source-file fallback is safe to keep as a routed lookup shape, but it
does not independently solve unresolved file-level import targets.

**Interaction With File-Level Import Target Taxonomy**

FileNodes lookup is a mechanism. Unresolved file-level import target taxonomy is
a semantic outcome.

The same VS Code sparse profile family shows:

| Field | Count |
| --- | ---: |
| `onDemandLookupShapeCounts.FileNodes` | 1,247 |
| `relative/file-node-not-found` | 309 |
| `relative/target-not-found` | 4,871 |

Interpretation:

- FileNodes routing is active and has no mismatch in the available evidence;
- unresolved file target fallbacks still exist;
- therefore FileNodes should stay routed, while unresolved target categories
  remain no-go or future implementation candidates depending on narrower
  diagnostics.

**Boundary**

No package resolution expansion is introduced.

This closeout does not change:

- package imports;
- Node/runtime builtins;
- package `exports`/`imports`;
- `node_modules`;
- TypeScript full `moduleResolution`;
- target selection semantics;
- source-order or pick-first behavior.

**Closeout**

#428 closes as `keep` for FileNodes/source-file fallback routing.

The unresolved file-level import target interaction remains classified by #425:

- `relative/file-node-not-found`: no-go until narrower pre-cleanup diagnostics;
- `relative/target-not-found`: no-go until narrower pre-cleanup diagnostics.

### 55. 2026-06-23-default-reexport-surface-semantics-decision.md

**Decision**

Default re-export graph semantics should target the leaf default-exported
implementation symbol, not a new exported surface node.

For forms such as:

```ts
// source.ts
export default function Widget() {}

// barrel.ts
export { default as PublicWidget } from "./source";
```

the intended graph edge is:

```text
barrel export node --exports--> source default implementation symbol Widget
```

The exported surface name (`PublicWidget`) is not modeled as a first-class graph
node in the current `1-7-2` closeout. It may be preserved later as metadata or
diagnostics, but that broader export surface model remains deferred.

**Rationale**

- This matches the export alias decision in #465: source/implementation symbols
  are the graph targets because they are what agents need to inspect.
- Creating separate surface nodes would require a broader export surface graph
  design touching query rendering, traversal, and impact semantics.
- Default re-export implementation is useful and bounded, but should be handled
  as a follow-up ready-for-agent issue rather than hidden inside the decision
  issue.

**Follow-Up**

Create a ready-for-agent implementation issue for:

```text
Resolve default re-exports to leaf default-exported implementation symbols.
```

**Roadmap Impact**

`1-7-2-5-2. default re-export surface semantics (#467)` can be marked complete
as a semantic decision.

The follow-up implementation should be added as a separate sub-node under
`1-7-2-5` and does not require schema changes.

### 56. 2026-06-23-esm-named-symbol-ready-agent-closeout.md

**Scope**

Closed the ready-for-agent implementation and policy slices under reopened
roadmap node `1-7-2. ESM named symbol edges`.

Completed:

```text
[x] 1-7-2-3-1. import local alias usage edge (#464)
[x] 1-7-2-4-1. type-only no-value-edge policy (#466)
[x] 1-7-2-5-1. default import to direct default export (#468)
[x] 1-7-2-6-1. repo-local package-resolved named symbol edges (#472)
```

Remaining human semantic boundary work:

```text
[ ] 1-7-2-3-2. export alias surface modeling decision (#465)
[ ] 1-7-2-5-2. default re-export surface semantics (#467)
[ ] 1-7-2-5-3. namespace import module/file dependency policy (#470)
[ ] 1-7-2-5-4. namespace export/re-export surface semantics (#469)
[ ] 1-7-2-6-2. node_modules/third-party package indexing boundary (#471)
```

**Implemented**

- Named import local aliases now resolve local usage references back to the
  imported source symbol:

  ```ts
  import { beta as localBeta } from "./source";
  localBeta();
  ```

- Type-only named imports and exports remain taxonomy-visible but do not write
  value graph symbol edges.
- Direct default imports now resolve to direct repo-local default-exported
  function/class symbols:

  ```ts
  import localRun from "./source";
  localRun();
  ```

- Repo-local package-resolved named imports are covered by deterministic
  fixtures for package self-name/package imports targets. External package and
  runtime bindings remain fallback/no-go taxonomy.

**Decision**

The ready-for-agent implementation path for the reopened `1-7-2` node is
complete once the verification commands above pass.

`1-7-2` itself remains open until the ready-for-human semantic boundary issues
have durable decisions or no-go/deferred conclusions.

### 57. 2026-06-23-esm-named-symbol-reopen-closeout.md

**Scope**

Closed the reopened `1-7-2` node for bounded repo-local value graph semantics.

Completed implementation and policy issues:

```text
[x] #464 import local alias usage edge
[x] #466 type-only no-value-edge policy
[x] #468 default import to direct default export
[x] #472 repo-local package-resolved named symbol edges
[x] #473 default re-export implementation
[x] #474 namespace export file-level dependency fixture
```

Completed semantic boundary decisions:

```text
[x] #465 export alias surface modeling decision
[x] #467 default re-export surface semantics
[x] #469 namespace export/re-export surface semantics
[x] #470 namespace import module/file dependency policy
[x] #471 node_modules/third-party package indexing boundary
```

**Decisions**

- Graph edges target source/implementation symbols, not first-class exported
  surface alias nodes.
- Type-only import/export bindings do not write value graph symbol edges.
- Default imports and bounded default re-exports resolve to direct repo-local
  default-exported implementation symbols.
- Namespace import/export forms stay at file/module dependency semantics in
  this closeout; member-level namespace symbol resolution is deferred.
- Repo-local package-resolved named symbols are in scope; external
  package/runtime/builtin symbols and `node_modules` indexing are out of scope.

**Deferred**

- Future type graph semantics.
- First-class export surface graph modeling.
- Namespace member-level symbol resolution.
- Third-party package / `node_modules` symbol indexing.

These remain outside the bounded `1-7-2` closeout and should be promoted
through separate plans if needed.

**Decision**

`1-7-2. ESM named symbol edges` is complete for bounded repo-local value graph
semantics.

### 58. 2026-06-23-export-alias-surface-modeling-decision.md

**Decision**

Do not add first-class export alias surface nodes or schema changes for ESM
named export alias forms in the current `1-7-2` closeout.

For forms such as:

```ts
export { foo as publicFoo } from "./source";
```

the graph edge remains:

```text
barrel export node --exports--> source symbol foo
```

The left-side source symbol is the graph target because it is the implementation
symbol an agent needs to inspect. The exported alias surface name (`publicFoo`)
may be preserved later as metadata or diagnostics, but it is not modeled as a
new symbol node in this slice.

**Rationale**

- The current graph behavior takes the agent to the implementation symbol.
- A first-class alias surface node would introduce a broader
  surface-symbol-to-implementation-symbol model that affects query rendering,
  impact traversal, and future default/namespace re-export semantics.
- That broader export surface model should be designed separately instead of
  folded into guarded named symbol edge writing.

**Roadmap Impact**

`1-7-2-3-2. export alias surface modeling decision (#465)` can be marked
complete as a bounded decision.

Full first-class export surface modeling remains deferred and should be promoted
through a separate plan if needed.

### 59. 2026-06-23-guarded-esm-named-symbol-edge-write-closeout.md

**Scope**

Implemented guarded graph writing for Rust-owned direct ESM named import symbol
edges.

The guard runs after the existing resolver selects a target symbol candidate.
It does not change candidate lookup or disambiguation semantics. Per edge, it
fails closed when the selected target is weak and continues indexing.

**Implemented**

- Added profile artifact diagnostics:
  - `esmNamedImportExportEdgeWriteAttemptedRefs`
  - `esmNamedImportExportEdgeWriteWrittenRefs`
  - `esmNamedImportExportEdgeWriteSkippedRefs`
  - `esmNamedImportExportEdgeWriteSkippedCounts`
  - `esmNamedImportExportEdgeWriteSkippedSamples`
  - `esmNamedImportExportEdgeWriteSkippedSampleCap`
- Added guarded write checks for:
  - missing target node;
  - target file mismatch;
  - unsupported candidate shape;
  - selected node kind mismatch.
- Routed direct named import symbol edge writes through the guard for:
  - direct export candidates;
  - overload implementation tie-breaks;
  - value-token interface tie-breaks.

**Decision**

This slice is sufficient for `1-7-2-1. direct named import guarded write`.

It is not sufficient to mark the parent `1-7-2. ESM named symbol edges` complete
because direct named export edge writes remain a separate implementation path.

### 60. 2026-06-23-guarded-esm-named-symbol-edges-completion-closeout.md

**Scope**

Completed roadmap node `1-7-2. ESM named symbol edges` by adding the missing
direct named export guarded write path.

This follows the earlier direct named import guarded write slice and closes the
remaining sub-node:

```text
[x] 1-7-2. ESM named symbol edges
  [x] 1-7-2-1. direct named import guarded write
  [x] 1-7-2-2. direct named export guarded write (#463)
```

`1-7. Guarded graph writing` remains partial because one-hop re-export edges
and rollback/no-go policy are separate nodes.

**Implemented**

- Added Rust-owned direct named export symbol edge writes for forms such as:

  ```ts
  export { foo } from "./source";
  export { foo as publicFoo, Bar } from "./source";
  ```

- Export symbol edges are written from the `export` node to the target symbol:

  ```text
  export node ("./source") --exports--> source symbol
  ```

- Alias exports intentionally resolve to the left-side source symbol name. This
  slice does not model exported alias surface semantics.
- Type-only export bindings are not written as symbol edges and remain
  taxonomy-visible as `type-only-export`.
- One-hop re-export/barrel traversal remains out of scope for this node and is
  classified as `export-edge-one-hop-out-of-scope`.
- The edge-write diagnostics reuse the existing
  `esmNamedImportExportEdgeWrite*` profile fields. Export skipped samples use
  `referenceKind: "exports"`.

**Decision**

`1-7-2. ESM named symbol edges` is complete for bounded direct named
import/export guarded graph writing.

The next guarded graph-writing work should continue at `1-7-3. one-hop
re-export edges` or `1-7-4. rollback/no-go when parity is weak`, not reopen the
direct named import/export edge-write slice unless a regression is found.

### 61. 2026-06-23-guarded-one-hop-reexport-edges-closeout.md

**Scope**

Completed roadmap node `1-7-3. one-hop re-export edges` for the bounded
repo-local named re-export slice.

Implemented sub-nodes:

```text
[x] 1-7-3. one-hop re-export edges (bounded repo-local named re-export)
  [x] 1-7-3-1. import-through-barrel guarded write
  [x] 1-7-3-2. export-through-barrel guarded write
```

Deferred sub-nodes remain explicit in the roadmap:

```text
[ ] 1-7-3-3. export star re-export semantics
[ ] 1-7-3-4. default re-export semantics
[ ] 1-7-3-5. namespace re-export semantics
[ ] 1-7-3-6. package/node_modules re-export semantics
[ ] 1-7-3-7. multi-hop re-export semantics
```

**Implemented**

- Import-through-barrel guarded writes now resolve bounded repo-local named
  one-hop re-exports to the leaf exported symbol.
- Export-through-barrel guarded writes now resolve bounded repo-local named
  one-hop re-exports to the leaf exported symbol.
- One-hop candidate rows carry their leaf file path so the guarded writer can
  validate the actual target file instead of the barrel file.
- Export-side one-hop resolutions are reflected in
  `esmOneHopReexportResolvedRefs`.
- The slice remains intentionally bounded to one repo-local named re-export hop.

**Decision**

`1-7-3. one-hop re-export edges` is complete for bounded repo-local named
import-through-barrel and export-through-barrel guarded graph writing.

The next guarded graph-writing work should continue at `1-7-4. rollback/no-go
when parity is weak`, or move to an explicit deferred sub-node if one of the
remaining re-export semantic gaps is promoted.

### 62. 2026-06-23-namespace-export-surface-semantics-decision.md

**Decision**

Namespace export and re-export forms should be represented as file/module
dependency semantics in the current `1-7-2` closeout, not as first-class
namespace surface symbol nodes or member-level symbol edges.

For forms such as:

```ts
export * as NS from "./source";
```

the bounded behavior is:

```text
barrel file/export module dependency --> source file
```

The namespace surface name (`NS`) is not modeled as a new symbol node in this
slice, and member-level symbol edges through `NS.member` are not written.

**Rationale**

- A namespace export exposes a module object surface, not one named source
  symbol.
- This matches the namespace import policy in #470.
- First-class namespace surface nodes would require a broader export surface
  graph design touching traversal, rendering, and impact semantics.
- A file/module dependency edge is useful and bounded, while guessed member
  symbol edges would be too broad for `1-7-2`.

**Follow-Up**

Create a ready-for-agent implementation issue to fixture-lock file/module
dependency behavior for `export * as NS from "./source"`.

**Roadmap Impact**

`1-7-2-5-5. namespace export/re-export surface semantics (#469)` can be marked
complete as a semantic decision.

First-class namespace surface modeling and member-level namespace resolution
remain deferred.

### 63. 2026-06-23-namespace-import-module-dependency-policy-decision.md

**Decision**

Namespace imports should be represented as file/module dependency edges in the
current `1-7-2` closeout, not as guessed symbol-level member edges.

For forms such as:

```ts
import * as NS from "./source";

NS.foo();
NS.VALUE;
```

the bounded behavior is:

```text
consumer file --imports--> source file
```

The namespace member accesses (`NS.foo`, `NS.VALUE`) are not resolved to
individual exported symbols in this slice.

**Rationale**

- A namespace import binds a module object, not one named exported symbol.
- The file-level dependency edge preserves useful graph sufficiency without
  guessing member targets.
- Member-level namespace resolution requires a broader export/member resolver,
  including alias/default/re-export interactions, and should be promoted through
  a separate plan if needed.
- No schema change is required for the bounded policy.

**Roadmap Impact**

`1-7-2-5-4. namespace import module/file dependency policy (#470)` can be
marked complete as a semantic policy decision.

Member-level namespace symbol resolution remains deferred.


## Contract-Preserved Terms

Concise source lines carrying terms that the section-classifier did not retain verbatim, preserved to keep documentation contracts intact.

- `bounded exploit lane` — (term present across section prose)
