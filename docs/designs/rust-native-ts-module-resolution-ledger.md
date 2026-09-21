# Rust-Native TypeScript Module Resolution — Decision Ledger

> Decision ledger distilled 2026-09-21 from the 3,097-line
> `...-rust-native-typescript-module-resolution-consolidated-evidence.md`
> (append-merge of the 2026-06-22 config/paths/package/self-name closeout
> decisions and current-oracle snapshots). Decisions, scope boundaries,
> taxonomy, and roadmap updates retained; oracle example tables and smoke logs
> dropped (git history).
>
> doc-kind: design · authority: supporting.

This ledger records which moduleResolution shapes Rust owns (relative imports,
tsconfig paths/rootDirs, conventional aliases, package self-name/exports,
workspace and `#...` imports), which were explicit no-go, and the shadow/oracle
foundation that later guarded edge-write slices built on.

## Historical Source Files Merged And Deleted
- 2026-06-22-config-interpretation-closeout.md
- 2026-06-22-config-interpretation-current-oracle.md
- 2026-06-22-declaration-target-relationship-diagnostics-closeout.md
- 2026-06-22-explicit-js-runtime-extension-pairing-closeout.md
- 2026-06-22-explicit-js-runtime-extension-pairing-current-oracle.md
- 2026-06-22-extensionless-file-target-closeout.md
- 2026-06-22-extensionless-file-target-current-oracle.md
- 2026-06-22-extensionless-file-target-vscode-sparse-oracle.md
- 2026-06-22-file-level-import-target-part1-closeout.md
- 2026-06-22-node-runtime-third-party-boundary-taxonomy-closeout.md
- 2026-06-22-package-exports-imports-repo-local-no-go.md
- 2026-06-22-package-imports-closeout.md
- 2026-06-22-package-imports-current-oracle.md
- 2026-06-22-package-map-condition-set-closeout.md
- 2026-06-22-package-map-condition-set-current-oracle.md
- 2026-06-22-package-self-name-closeout.md
- 2026-06-22-package-self-name-current-oracle.md
- 2026-06-22-paths-rootdirs-parity-closeout.md
- 2026-06-22-paths-rootdirs-parity-current-oracle.md
- 2026-06-22-pattern-nested-package-exports-closeout.md
- 2026-06-22-pattern-nested-package-exports-current-oracle.md
- 2026-06-22-repo-local-package-self-name-resolution-no-go.md
- 2026-06-22-rust-native-module-resolution-shadow-foundation-closeout.md
- 2026-06-22-simple-package-exports-closeout.md
- 2026-06-22-simple-package-exports-current-oracle.md
- 2026-06-22-ts-module-resolution-oracle-closeout.md
- 2026-06-22-typescript-module-resolution-part2-closeout.md
- 2026-06-23-guarded-runtime-sibling-graph-write-closeout.md
- 2026-06-23-rust-native-module-resolution-oracle-profile-cleanup.md
- 2026-06-23-rust-native-typescript-module-resolution-roadmap-mapping-closeout.md
- 2026-06-23-safe-runtime-sibling-pairing-decision-contract-closeout.md
- 2026-06-23-third-party-package-indexing-boundary-decision.md

### 1. 2026-06-22-config-interpretation-closeout.md

**Summary**

This slice completed Roadmap node `1-2. Config interpretation` for the
Rust-native TypeScript moduleResolution path.

Completed behavior:

- repo-local JSON `extends` chains;
- relative repo-local extends with `.json` completion;
- repo-local absolute extends;
- directory extends to `tsconfig.json`;
- cycle/depth protection;
- resolver-owned `compilerOptions` merge;
- declaring-config path basis for path-bearing fields;
- defaulted moduleResolution mode from `module`;
- machine-readable `explicit` / `defaulted` mode source in profile and shadow
  samples;
- mode-aware package-map taxonomy for `classic`, `node10`, `node16`,
  `nodenext`, and `bundler`;
- `classic` fail-closed behavior for package `exports` / `imports`;
- inherited rootDirs relative-import behavior;
- rootDirs fallback taxonomy for target-not-found and config-out-of-scope.

**Scope Boundaries**

This closeout does not claim full TypeScript compiler config parity.

Intentionally out of scope:

- npm package `extends`;
- full `include` / `exclude` / `files` / `references` config loading;
- full project references;
- production use of the TypeScript compiler API;
- `node_modules` graph expansion;
- extensionless candidate order;
- `.d.ts` declaration pairing;
- declaration/runtime target relationship;
- package resolution beyond the repo-local package maps already supported.

**Deterministic Coverage**

`cargo test -p zcodegraph-core` covers:

- inherited paths alias resolution with declaring-config path basis;
- child `compilerOptions` override behavior;
- unsupported package extends failing closed without loading `node_modules`;
- explicit moduleResolution mode source reporting;
- defaulted moduleResolution mode source reporting;
- `classic` package-map fail-closed behavior;
- inherited rootDirs path basis;
- rootDirs target-not-found taxonomy;
- rootDirs config-out-of-scope taxonomy;
- existing relative, paths alias, package maps, explicit runtime extension
  pairing, and guarded edge-write behavior.

**Validation**

Commands run:

- `cargo test -p zcodegraph-core`
- `npx vitest run __tests__/ts-module-resolution-oracle.test.ts`
- `npm run build`
- `cargo build -p zcodegraph-core`
- current-repository `rust-hybrid` profile smoke with
  `ZCODEGRAPH_RUST_CORE_BINARY=target/debug/zcodegraph-core`
- current-repository TypeScript oracle smoke

VS Code sparse checkout smoke was not required for this closeout.

**Decision**

Close #447, #448, #449, and #450 as complete.

Roadmap node `1-2. Config interpretation` is complete within the bounded
Rust-native moduleResolution scope defined by
`docs/plans/2026-06-22-rust-native-config-interpretation-completion.md`.

Remaining work belongs to other Roadmap nodes, especially file target
semantics, declaration/runtime target relationship, package condition
completion, and guarded symbol-level graph writing.

### 2. 2026-06-22-config-interpretation-current-oracle.md

**Summary**

- Rows inspected: 336
- Recommended total slice count: 5

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-paths-alias` | 36 |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-resolves-third-party-boundary` | 100 |
| `ts-runtime-builtin-boundary` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 336 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- paths/rootDirs parity slice + oracle taxonomy correction
- third-party package boundary taxonomy
- Node/runtime builtin boundary taxonomy

### 3. 2026-06-22-declaration-target-relationship-diagnostics-closeout.md

**Scope**

Issue: #459

Roadmap node:

```text
1-5-4-1. declaration target relationship diagnostics
```

This slice adds profile diagnostics for TypeScript declaration targets resolved
by Rust-native module resolution. It does not change default graph edge targets
and does not implement runtime sibling pairing.

**Implementation Summary**

Profile module resolution samples can now include a
`declarationTargetRelationship` object when the resolved path is a TypeScript
declaration file.

The diagnostic is intentionally narrow and profile-artifact-only:

- `targetKind`
- `runtimeSiblingStatus`
- capped repo-relative `runtimeSiblingCandidates`
- `candidateCount`
- `truncated`

Aggregate counts are exposed under:

```text
moduleResolutionDeclarationTargetRelationshipCounts
```

The taxonomy is:

- `noRuntimeSibling`
- `singleRuntimeSibling`
- `multipleRuntimeSiblings`
- `skippedExternalOrPackageBoundary`

Runtime sibling inference is restricted to repo-local same-basename sibling
files. It does not follow package maps, declaration maps, source maps,
`typesVersions`, generated declaration roots, or `node_modules`.

**Decision**

Keep.

The slice produces useful declaration/runtime relationship evidence without
changing graph behavior. `1-5-4-1` is complete.

`1-5-4. declaration/runtime target relationship` remains partial. The remaining
work is:

```text
1-5-4-2. safe runtime sibling pairing decision/implementation
```

That future work must decide whether and how a declaration target may be safely
paired with a runtime sibling. This closeout does not claim that behavior.

### 4. 2026-06-22-explicit-js-runtime-extension-pairing-closeout.md

**Summary**

This slice completed Rust-native moduleResolution pairing for explicit
JavaScript runtime extensions that commonly point at TypeScript source files
in TS-style projects.

Implemented mappings:

- `.js` -> `.ts`, `.tsx`, `.js`
- `.jsx` -> `.tsx`, `.jsx`
- `.mjs` -> `.mts`, `.mjs`
- `.cjs` -> `.cts`, `.cjs`

The mapping is used by the shared file-target candidate path, so it applies to
relative imports, paths/rootDirs candidates, workspace package candidates, and
package self-name / exports / imports candidates when those paths resolve to
repo-local file targets.

**In Scope**

- explicit runtime extension source pairing;
- `.mts` and `.cts` source scanning through the TypeScript grammar;
- deterministic Rust core fixtures for relative, paths alias, and package map
  targets;
- current-repository profile and TypeScript oracle smoke evidence.

**Out Of Scope**

- extensionless candidate order;
- `.d.ts` declaration pairing;
- declaration/runtime target relationship;
- package resolution beyond the repo-local candidates already supported;
- VS Code sparse checkout smoke.

**Deterministic Fixture Coverage**

`cargo test -p zcodegraph-core` covers:

- relative `./dep.js` resolving to `src/dep.ts` before `src/dep.js`;
- relative `./view.jsx` resolving to `src/view.tsx`;
- relative `./module.mjs` resolving to `src/module.mts`;
- relative `./common.cjs` resolving to `src/common.cts`;
- paths alias `@lib/alias.js` resolving to `src/lib/alias.ts`;
- fallback to runtime `.js` when no TypeScript pair exists;
- package self-name / exports target `./src/features/feature.js` resolving to
  `src/features/feature.ts`.

**Decision**

Close #446 as complete. The explicit runtime extension pairing slice is now
implemented and covered by deterministic tests plus current-repository profile
and oracle smoke evidence.

Keep the broader Roadmap Tree parent nodes partial:

- `1-5. File target semantics` remains partial.
- `1-5-2. extension pairing` remains partial.
- `1-5-2-2. extensionless candidate order + mts/cts inclusion` remains open.
- `1-5-4. declaration/runtime target relationship` remains open.

### 5. 2026-06-22-explicit-js-runtime-extension-pairing-current-oracle.md

**Summary**

- Rows inspected: 336
- Recommended total slice count: 5

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-paths-alias` | 36 |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-resolves-third-party-boundary` | 100 |
| `ts-runtime-builtin-boundary` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 336 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- paths/rootDirs parity slice + oracle taxonomy correction
- third-party package boundary taxonomy
- Node/runtime builtin boundary taxonomy

### 6. 2026-06-22-extensionless-file-target-closeout.md

**Decision**

Status: complete for the bounded extensionless file target semantics slice.

Rust-owned repo-local file target resolution now uses the same extensionless
candidate order for file targets and directory `index.*` targets:

1. `.ts`
2. `.tsx`
3. `.mts`
4. `.cts`
5. `.d.ts`
6. `.d.mts`
7. `.d.cts`
8. `.js`
9. `.jsx`
10. `.mjs`
11. `.cjs`

The behavior is shared by repo-local resolver entry paths that already produce
a local base path, including relative imports, tsconfig/jsconfig paths,
workspace package imports, package self-name imports, and package `imports`.

**Deterministic Evidence**

New Rust tests:

- `rust_resolves_extensionless_mts_cts_and_directory_index_targets`
- `rust_prefers_extensionless_source_candidate_order_before_js_family`
- `rust_shares_extensionless_file_targets_across_repo_local_resolver_paths`
- `rust_does_not_expand_extensionless_config_data_targets_into_graph_edges`

Verification commands:

- `cargo fmt`
- `cargo test -p zcodegraph-core`
- `npx vitest run __tests__/ts-module-resolution-oracle.test.ts`
- `npm run build`
- `cargo build -p zcodegraph-core`
- `git diff --check`

**Roadmap Update**

- `1-5-2. extension pairing`: complete
- `1-5-2-2. extensionless candidate order + mts/cts inclusion`: complete
- `1-5. File target semantics`: still partial because `1-5-4` remains open

### 7. 2026-06-22-extensionless-file-target-current-oracle.md

**Summary**

- Rows inspected: 336
- Recommended total slice count: 5

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-paths-alias` | 36 |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-resolves-third-party-boundary` | 100 |
| `ts-runtime-builtin-boundary` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 336 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- paths/rootDirs parity slice + oracle taxonomy correction
- third-party package boundary taxonomy
- Node/runtime builtin boundary taxonomy

### 8. 2026-06-22-extensionless-file-target-vscode-sparse-oracle.md

**Summary**

- Rows inspected: 300
- Recommended total slice count: 4

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-runtime-builtin-boundary` | 100 |
| `ts-unresolved-package-runtime` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 200 |
| `mismatch` | 100 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- Node/runtime builtin boundary taxonomy
- package/runtime unresolved no-go taxonomy

### 9. 2026-06-22-file-level-import-target-part1-closeout.md

**Decision**

Decision: `no-go`.

The selected repo-local file-level import target category is:

```text
relative/file-node-not-found and relative/target-not-found
```

No additional production resolver behavior is changed in this slice.

**Why No-Go**

The existing Rust-owned resolver already supports repo-local relative source
imports and tsconfig/jsconfig paths aliases in deterministic fixtures.

The remaining VS Code sparse file-target residuals are visible in profile
sample counts, but the previous burndown found that the final SQLite database
does not retain enough pre-cleanup unresolved import rows to safely choose a
bounded production behavior change from aggregate counters alone.

That means changing path normalization, query/hash stripping, extension
fallback, or any file-node selection behavior here would be speculative.

**Deterministic Fixture Coverage**

Positive coverage exists in
`__tests__/rust-index-engine-cli.test.ts`:

- `resolves JS/TS relative and paths-alias imports as Rust-owned file-level edges`

Fallback/no-go evidence exists in:

- `__tests__/rust-import-target-taxonomy.test.ts`
- `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

The fallback classifier separates query/hash targets, asset-like targets,
extensionless/index candidates, declaration targets, and ignored non-relative
forms without reading source slices.

**Part 2 Boundary**

Package/runtime imports remain out of scope. This slice does not add package
resolution, Node/runtime builtin handling, `node_modules`, package
`exports`/`imports`, or full TypeScript `moduleResolution`.

**Closeout**

#425 closes as `no-go`.

Recommended prerequisite before revisiting this residual:

```text
preserve a pre-cleanup, privacy-safe unresolved file-target diagnostic sample
```

Without that prerequisite, repo-local file-target changes would risk changing
semantic behavior without a replayable reason.

### 10. 2026-06-22-node-runtime-third-party-boundary-taxonomy-closeout.md

**Decision**

Decision: `keep`.

The TypeScript module-resolution oracle provides the package/runtime boundary
taxonomy needed for this slice without adding production third-party package
resolution or `node_modules` graph expansion.

**Taxonomy**

Implemented taxonomy buckets:

| Bucket | Meaning |
| --- | --- |
| `ts-runtime-builtin-boundary` | TypeScript treats the specifier as a Node/runtime builtin |
| `ts-resolves-third-party-boundary` | TypeScript resolves the specifier to an external package target |
| `ts-unresolved-package-runtime` | TypeScript cannot resolve the sampled package/runtime specifier |
| `ts-resolves-repo-local-rust-fallback` | TypeScript resolves to repo-local source, making it a potential implementation candidate |

Resolved kind examples:

| Kind | Meaning |
| --- | --- |
| `node-runtime-builtin` | runtime builtin such as `node:fs` |
| `third-party-package` | external package root |
| `third-party-package-subpath` | external package subpath |
| `repo-local-package` | repo-local package/self-name target |
| `repo-local-package-subpath` | repo-local package subpath target |
| `unresolved` | unresolved by the TypeScript compiler API |

**Deterministic Coverage**

Command:

```bash
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
```

Result:

- passed, 1 test.

The fixture covers:

- Node/runtime builtin;
- third-party package;
- third-party package subpath;
- repo-local package/self-name;
- repo-local package subpath;
- unresolved package/runtime fallback;
- privacy boundary excluding source content.

**Boundary**

No default third-party package or `node_modules` deep resolution is added.

No production resolver behavior changes were required for this slice. The
taxonomy is produced as benchmark/evidence artifact data.

**Closeout**

#434 closes as `keep`.

Remaining third-party and runtime boundaries should not be treated as repo-local
graph gaps. Future implementation work should focus only on repo-local buckets
selected by oracle evidence.

### 11. 2026-06-22-package-exports-imports-repo-local-no-go.md

**Decision**

Decision: `no-go`.

The selected package `exports`/`imports` bucket is:

```text
none - oracle did not find sampled package/runtime residuals that TypeScript
resolved through package exports/imports to repo-local source targets
```

No production resolver behavior changed.

**Deterministic Coverage**

Command:

```bash
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
```

Result:

- passed, 1 test.

The fixture covers package `exports`-style repo-local self-name and subpath
imports, plus third-party package subpath and unresolved fallback cases.

**Boundary**

This slice does not introduce:

- `node_modules` graph expansion;
- TypeScript runtime dependency;
- SQLite schema changes;
- broad disambiguation;
- source-order or pick-first target selection.

**Closeout**

#433 closes as `no-go`.

Recommended route if this bucket is needed later:

```text
rerun the oracle on a corpus or sample set with known repo-local package exports
residuals, then select a bounded implementation slice
```

### 12. 2026-06-22-package-imports-closeout.md

**Decision**

Completed for the repo-local graph sufficiency scope.

Rust-owned TypeScript module resolution now handles `#...` package imports by
using the nearest package boundary for the source file:

- the source file's nearest ancestor `package.json#imports` is used;
- repo root `imports` is not used for files inside a nested package when that
  nested package has its own boundary;
- successful targets write `rust-finalization` file-level `imports` edges.

The bounded package map behavior mirrors the completed package `exports` slice:

- exact keys
- single-`*` pattern keys and targets
- exact-over-pattern priority
- longest pattern prefix priority
- condition objects up to two levels
- condition priority: `import -> types -> default -> first string leaf`
- `null` blocking entries as `importsBlocked`
- arrays as fail-closed `importsUnsupported`

Targets must stay inside the source file's package boundary. Cross-package
targets fail closed as `importsTargetEscapesPackage`; absolute/out-of-repo
targets fail closed as `importsTargetEscapesRepo`.

**Roadmap Update**

- `3-8. package imports "#" repo-local slice`: complete
- `1-4-2. imports "#" entries`: complete
- `1-4. Package exports/imports for repo-local targets`: still partial
- `1-4-3. condition set handling for repo-local source`: still partial

**Non-Goals**

This does not claim full TypeScript or Node module resolution. Explicitly out of
scope:

- `node_modules` expansion
- `typesVersions`
- symlink, pnpm virtual store, or package-manager-specific behavior
- full condition matrix semantics
- declaration/runtime target relationship
- ESM named symbol edge resolution
- guarded edge-write rollout decisions beyond file-level import edges for this
  bounded slice

### 13. 2026-06-22-package-imports-current-oracle.md

**Summary**

- Rows inspected: 336
- Recommended total slice count: 5

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-paths-alias` | 36 |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-resolves-third-party-boundary` | 100 |
| `ts-runtime-builtin-boundary` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 336 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- paths/rootDirs parity slice + oracle taxonomy correction
- third-party package boundary taxonomy
- Node/runtime builtin boundary taxonomy

### 14. 2026-06-22-package-map-condition-set-closeout.md

**Decision**

Status: complete for the bounded repo-local package map condition set slice.

Rust-owned repo-local package `exports` and `imports` resolution now uses a
shared condition selection helper with this order:

1. `types`
2. runtime condition: `import` or `require`
3. `node`
4. `compilerOptions.customConditions` in config order
5. `default`

The implementation remains intentionally bounded:

- no `node_modules` graph expansion
- no full Node or TypeScript resolver replacement
- no declaration-to-runtime target pairing beyond resolving the selected file
- package map behavior is still repo-local only

**Roadmap Update**

- `1-4. Package exports/imports for repo-local targets`: complete
- `1-4-3. condition set handling for repo-local source`: complete

Remaining related work is outside this slice:

- `1-5-4. declaration target semantics`: decide whether and how `types`
  declarations should relate to runtime implementation targets.

### 15. 2026-06-22-package-map-condition-set-current-oracle.md

**Summary**

- Rows inspected: 336
- Recommended total slice count: 5

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-paths-alias` | 36 |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-resolves-third-party-boundary` | 100 |
| `ts-runtime-builtin-boundary` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 336 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- paths/rootDirs parity slice + oracle taxonomy correction
- third-party package boundary taxonomy
- Node/runtime builtin boundary taxonomy

### 16. 2026-06-22-package-self-name-closeout.md

**Decision**

Outcome: keep.

The slice implemented bounded repo-local package self-name resolution in the
Rust-owned TypeScript moduleResolution path.

Implemented:

- repo-local `package.json` name discovery for valid in-repo package roots,
- root self-name import lookup: `@repo/pkg` -> `<packageRoot>/index`,
- self-name subpath lookup: `@repo/pkg/foo` -> `<packageRoot>/foo`,
- reuse of existing extension substitution and directory/index lookup,
- fail-closed duplicate package name handling,
- `packageSelfName` profile source bucket,
- `packageSelfName` outcome counts for `resolvedRootIndex`,
  `resolvedSubpath`, `ambiguousName`, `missingPackageName`, and
  `missingTarget`,
- TypeScript oracle recommendation alignment for package self-name root and
  subpath evidence.

Not implemented:

- package `exports`,
- package `imports`,
- `node_modules` graph expansion,
- package entry fields such as `main`, `module`, or `types`,
- ESM named symbol edge writing,
- full TypeScript moduleResolution completion.

**Deterministic Coverage**

Rust core fixtures cover:

- package self-name root import resolving to package-root `index`,
- package self-name subpath import resolving package-root-relative targets,
- duplicate package names failing closed as `ambiguousName`,
- package self-name target misses reported as `missingTarget`,
- same-scope package name misses reported as `missingPackageName`,
- `paths` alias taxonomy staying separate from `packageSelfName`.

TypeScript oracle fixtures cover:

- package self-name root taxonomy,
- package self-name subpath taxonomy,
- `paths` alias taxonomy staying separate from package self-name taxonomy.

**Roadmap Update**

Updated:

- `1-3. Repo-local package resolution` -> complete
- `1-3-1. package self-name imports` -> complete
- `1-3-3. package subpath imports landing in repo source` -> complete
- `3-5. package self-name repo-local slice` -> complete
- added and completed `3-5-2. package.json name repo-local self/subpath slice`

Remaining adjacent work stays separate:

- `3-7. package exports repo-local slice`
- `3-8. package imports "#" repo-local slice`
- `3-13. guarded edge-write slice`

### 17. 2026-06-22-package-self-name-current-oracle.md

**Summary**

- Rows inspected: 336
- Recommended total slice count: 5

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-paths-alias` | 36 |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-resolves-third-party-boundary` | 100 |
| `ts-runtime-builtin-boundary` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 336 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- paths/rootDirs parity slice + oracle taxonomy correction
- third-party package boundary taxonomy
- Node/runtime builtin boundary taxonomy

### 18. 2026-06-22-paths-rootdirs-parity-closeout.md

**Scope**

This closeout covers #440:

```text
paths/rootDirs parity slice + oracle taxonomy correction
```

This is a child slice under the broader package self-name repo-local route. It
does not complete package self-name resolution, package `exports`, package
`imports`, or full TypeScript moduleResolution.

**Decision**

Keep.

The slice corrected the TypeScript oracle taxonomy and added a narrow Rust
`rootDirs` relative-import lookup. It keeps `paths` alias behavior separate
from package self-name behavior, which prevents future implementation work from
using the wrong evidence bucket.

**Implemented**

- Oracle taxonomy now classifies repo-local bare `paths` alias hits as
  `repo-local-paths-alias`.
- Oracle recommendation now routes those rows to
  `paths/rootDirs parity slice + oracle taxonomy correction`.
- Rust import target resolution now supports a narrow `rootDirs` lookup:
  when a relative import is missing in the source file's own root, Rust tries
  configured sibling `rootDirs` with the same virtual relative path.
- Rust profile JSON now exposes `rootDirs` under:
  - `importPathAliasResolvedBySource.rootDirs`
  - `importPathAliasFallbackBySource.rootDirs`
- Roadmap checkbox state was updated for this child slice.

**Not Implemented**

- package self-name graph-writing behavior;
- package `exports` / `imports`;
- `node_modules` graph expansion;
- full `moduleResolution` mode semantics;
- full `rootDirs` parity for every TypeScript edge case.

**Validation**

Commands:

```bash
cargo test -p zcodegraph-core
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
npm run build
cargo build -p zcodegraph-core
```

Targeted current repo evidence:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_RUST_CORE_BINARY=target/debug/zcodegraph-core \
ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-22-paths-rootdirs-parity-current.profile.json \
node scripts/targeted-profile-evidence.mjs \
  --out docs/benchmarks/2026-06-22-paths-rootdirs-parity-current.evidence.json \
  --cwd . -- node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid

node scripts/ts-module-resolution-oracle.mjs \
  --project . \
  --profile docs/benchmarks/2026-06-22-paths-rootdirs-parity-current.profile.json \
  --out-dir docs/benchmarks \
  --prefix 2026-06-22-paths-rootdirs-parity-current-oracle
```

**Next**

Return to the parent route:

```text
package self-name repo-local slice
```

The next slice should use fixtures where package self-name or package subpath
resolution is actually selected by TypeScript, not `paths` alias evidence.

### 19. 2026-06-22-paths-rootdirs-parity-current-oracle.md

**Summary**

- Rows inspected: 336
- Recommended total slice count: 5

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-paths-alias` | 36 |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-resolves-third-party-boundary` | 100 |
| `ts-runtime-builtin-boundary` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 336 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- paths/rootDirs parity slice + oracle taxonomy correction
- third-party package boundary taxonomy
- Node/runtime builtin boundary taxonomy

### 20. 2026-06-22-pattern-nested-package-exports-closeout.md

**Decision**

Completed for the repo-local graph sufficiency scope.

Rust-owned TypeScript module resolution now handles repo-local package `exports`
entries for:

- exact export keys before pattern keys
- single-`*` pattern keys with single-`*` target substitution
- longest pattern prefix priority, preserving insertion order for equal priority
- condition objects up to two levels with bounded priority:
  `import -> types -> default -> first string leaf`
- `null` blocking exports as fail-closed `exportsBlocked`
- `.d.ts` export targets as file-level graph targets

Arrays remain intentionally unsupported and fail closed as `exportsUnsupported`.

**Non-Goals**

This does not claim full TypeScript or Node module resolution. Explicitly out of
scope:

- package imports `#...`
- `node_modules` expansion
- `typesVersions`
- symlink, pnpm virtual store, or package-manager-specific behavior
- full condition matrix semantics
- array export target fallback semantics
- declaration/runtime target relationship
- ESM named symbol edge resolution
- guarded edge-write rollout decisions

### 21. 2026-06-22-pattern-nested-package-exports-current-oracle.md

**Summary**

- Rows inspected: 336
- Recommended total slice count: 5

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-paths-alias` | 36 |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-resolves-third-party-boundary` | 100 |
| `ts-runtime-builtin-boundary` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 336 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- paths/rootDirs parity slice + oracle taxonomy correction
- third-party package boundary taxonomy
- Node/runtime builtin boundary taxonomy

### 22. 2026-06-22-repo-local-package-self-name-resolution-no-go.md

**Decision**

Decision: `no-go`.

The selected oracle bucket is:

```text
none - oracle did not find sampled package/runtime residuals that TypeScript
resolved to repo-local package/self-name source targets
```

No production resolver behavior changed.

**Deterministic Coverage**

The oracle script has deterministic fixture coverage proving it can identify
repo-local package/self-name and package subpath targets when they exist:

```bash
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
```

Result:

- passed, 1 test.

**Boundary**

This no-go does not mean repo-local package/self-name resolution is unnecessary.
It means this plan's sampled package/runtime residuals did not justify a
production behavior change for that bucket.

Disallowed behavior remains disallowed:

- no TypeScript runtime dependency;
- no `node_modules` scan;
- no SQLite schema change;
- no source-order or pick-first target selection.

**Closeout**

#432 closes as `no-go`.

Recommended route if this bucket matters later:

```text
expand the oracle input beyond capped Rust fallback samples or use a corpus with
known repo-local package self-name imports, then rerun selection
```

### 23. 2026-06-22-rust-native-module-resolution-shadow-foundation-closeout.md

**Scope**

This closeout covers the first implementation slice from:

- `docs/plans/2026-06-22-rust-native-typescript-module-resolution-roadmap.md`
- #436
- #437
- #438
- #439

The slice implemented a Rust-native TypeScript moduleResolution diagnostics
foundation. It did not claim full TypeScript moduleResolution completion.

**Decision**

Keep.

The Rust core now emits shadow-only moduleResolution decision records in the
index profile. The records are typed, bounded, privacy-safe, and can be
compared against the TypeScript compiler API oracle as evidence tooling.

Default graph behavior did not change:

- no moduleResolution shadow edges are written;
- no default node or edge schema change was introduced;
- no TypeScript runtime dependency was added to production Rust indexing;
- no `node_modules` graph expansion was added.

**Implemented**

- Rust profile fields:
  - `moduleResolutionShadowDecisionRefs`
  - `moduleResolutionShadowDecisionCounts`
  - `moduleResolutionShadowParityCounts`
  - `moduleResolutionShadowSamples`
  - `moduleResolutionShadowSampleCap`
- Rust typed records:
  - `ModuleResolutionCompilerOptionsSummary`
  - `ModuleResolutionRequest`
  - `ModuleResolutionDecisionRecord`
- Shadow decision categories:
  - `relative`
  - `tsconfigPaths`
  - `workspacePackage`
  - `conventionalAlias`
  - `nodeRuntimeBuiltin`
  - `packageOrRuntime`
  - `binding`
  - `unsupported`
- TypeScript compiler API oracle support for
  `rustCore.moduleResolutionShadowSamples`.
- Parity statuses in oracle artifacts:
  - `match`
  - `mismatch`
  - `no-oracle`
  - `unknown`

**Current Repo Evidence**

Generated profile, evidence, status, and oracle artifacts were absorbed into:

- `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md`

Rust profile summary:

| Field | Value |
| --- | ---: |
| `moduleResolutionShadowDecisionRefs` | 2894 |
| sampled decisions | 336 |
| `relative` | 1516 |
| `tsconfigPaths` | 36 |
| `nodeRuntimeBuiltin` | 573 |
| `packageOrRuntime` | 769 |

Oracle summary:

| Field | Value |
| --- | ---: |
| rows inspected | 336 |
| parity `match` | 336 |
| parity `mismatch` | 0 |

RSS:

- unavailable reason:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`

Status:

- current repo status was readable after indexing;
- current repo index engine: `rust-hybrid`;
- current repo status reports TypeScript fallback for non-Rust-owned supported
  files, which is pre-existing rust-hybrid behavior and not changed by this
  slice.

**Validation**

Commands:

```bash
cargo test -p zcodegraph-core
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
npm run build
cargo build -p zcodegraph-core
```

Targeted profile/status:

Targeted profile/status commands are represented by the consolidated cleanup
artifact above.

**Lessons**

The first oracle run exposed a diagnostic-quality bug: non-import binding
references were being treated as package specifiers. The implementation was
fixed to skip binding-shaped refs when no import/export line module specifier
can be recovered. This is exactly why the shadow-only foundation should exist
before graph-writing behavior.

The Rust profile still records `parityStatus: "unknown"` because production
Rust does not call the TypeScript oracle. The external oracle artifact is the
source of parity evidence for now.

**Next Exploit Slice**

Recommended next main-subtree slice:

```text
repo-local package/self-name moduleResolution slice
```

Reason:

- current repo oracle saw repo-local source/package decisions in the sampled
  set;
- the roadmap identifies repo-local package/self-name resolution as part of the
  main sufficiency path;
- this is still repo-local and does not require `node_modules` graph expansion.

Secondary follow-ups:

- add distinct statement-level counts beside per-reference counts if sample
  duplication becomes noisy;
- add bounded VS Code sparse rerun on a Node 22 environment or a longer
  evidence window;
- keep third-party package and Node runtime builtin work as boundary taxonomy
  unless a later plan promotes graph-writing behavior.

### 24. 2026-06-22-simple-package-exports-closeout.md

**Decision**

Outcome: keep.

The slice implemented a bounded package `exports` resolver for repo-local
package self-name imports in the Rust-owned TypeScript moduleResolution path.

Implemented:

- package self-name root imports resolving through simple `exports` string
  targets,
- package self-name root and subpath imports resolving through simple
  `exports` object entries,
- simple condition object selection with priority `import` -> `types` ->
  `default` -> first string leaf,
- `.d.ts` exports targets as repo-local file-level targets,
- simple missing export keys falling back to the existing package-root lookup,
- unsupported arrays, wildcard patterns, deep/non-string condition values, and
  repo-escaping targets failing closed,
- diagnostics for `exportsResolved`, `rootFallbackResolved`, `exportsMissing`,
  `exportsUnsupported`, and `exportsTargetEscapesRepo`,
- TypeScript oracle recommendation routing for package self-name evidence
  covered by root package `exports`.

Not implemented:

- full package `exports`,
- package `imports`,
- wildcard or pattern exports,
- arrays,
- full condition matrix,
- `node_modules` graph expansion,
- package entry fields such as `main`, `module`, or `types` outside `exports`
  condition targets,
- declaration/runtime target relationship,
- ESM named symbol edge writing,
- full TypeScript moduleResolution completion.

**Deterministic Coverage**

Rust core fixtures cover:

- root string/object exports targets,
- subpath exports targets,
- condition object priority including `.d.ts` target selection,
- simple export key missing with package-root fallback,
- unsupported array exports failing closed,
- unsupported pattern exports failing closed,
- repo-escaping exports targets failing closed,
- existing package self-name behavior when no `exports` exists.

TypeScript oracle fixtures cover:

- package self-name root evidence covered by `exports`,
- package self-name subpath evidence covered by `exports`,
- `paths` alias taxonomy staying separate from package self-name and exports
  taxonomy.

**Roadmap Update**

Updated:

- added and completed
  `3-7-1. simple exports string/object repo-local target slice`,
- `3-7. package exports repo-local slice` -> partial,
- `1-4. Package exports/imports for repo-local targets` -> partial,
- `1-4-1. exports "." and subpath entries` -> partial,
- `1-4-3. condition set handling for repo-local source` -> partial.

Remaining adjacent work stays separate:

- full package `exports`,
- `3-8. package imports "#" repo-local slice`,
- `1-5-4. declaration/runtime target relationship`,
- `3-13. guarded edge-write slice`.

### 25. 2026-06-22-simple-package-exports-current-oracle.md

**Summary**

- Rows inspected: 336
- Recommended total slice count: 5

### Delta Buckets

| Bucket | Count |
| --- | ---: |
| `ts-resolves-repo-local-paths-alias` | 36 |
| `ts-resolves-repo-local-rust-fallback` | 100 |
| `ts-resolves-third-party-boundary` | 100 |
| `ts-runtime-builtin-boundary` | 100 |

### Parity Statuses

| Status | Count |
| --- | ---: |
| `match` | 336 |

### Recommended Slice Goals

- repo-local package/self-name resolution
- paths/rootDirs parity slice + oracle taxonomy correction
- third-party package boundary taxonomy
- Node/runtime builtin boundary taxonomy

### 26. 2026-06-22-ts-module-resolution-oracle-closeout.md

**Decision**

Decision: `keep`.

The TypeScript compiler API oracle is implemented as benchmark/evidence tooling
only. It does not change production indexing behavior and does not move
`typescript` into runtime dependencies.

**Artifacts**

Generated oracle artifacts were absorbed into:

- `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md`

VS Code sparse corpus: `/private/tmp/codegraph-corpus/vscode-sparse`

No automatic clone was attempted.

**Privacy Boundary**

The oracle artifacts include:

- repo-relative source file path;
- language;
- line/column;
- import specifier;
- Rust current fallback reason;
- TypeScript resolved kind/path;
- repo-local status;
- delta bucket;
- recommended implementation slice.

They do not include source content, source slices, full source lines, candidate
source text, or private absolute paths beyond the documented VS Code sparse
corpus root.

**Validation**

Command:

```bash
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
```

Result:

- passed, 1 test.

**Closeout**

#431 closes as `keep`.

The oracle did not select a repo-local package/self-name or package
`exports`/`imports` implementation bucket in the current sampled evidence.
That drives #432 and #433 to no-go unless later evidence expands the sample set.

### 27. 2026-06-22-typescript-module-resolution-part2-closeout.md

**Decision**

Decision: `complete-with-no-go-implementation-slices`.

This Part 2 plan completed the TypeScript module-resolution oracle and boundary
taxonomy work. It did not implement repo-local package/self-name or package
`exports`/`imports` production behavior because the oracle did not select a
safe repo-local bucket from the sampled evidence.

This closeout does not claim full TypeScript `moduleResolution` completion.

**Slice Decisions**

| Issue | Slice | Decision | Artifact |
| --- | --- | --- | --- |
| #431 | TypeScript moduleResolution oracle diagnostic map | keep | `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md` |
| #432 | oracle-selected repo-local package self-name resolution | no-go | `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md` |
| #433 | oracle-selected package exports/imports repo-local slice | no-go | `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md` |
| #434 | Node/runtime and third-party package boundary taxonomy | keep | `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md` |

**Remaining Residual Classification**

### Closed / Keep

| Residual | Decision |
| --- | --- |
| TypeScript compiler API oracle for sampled package/runtime fallbacks | keep |
| Node/runtime builtin boundary taxonomy | keep |
| third-party package boundary taxonomy | keep |
| third-party package subpath boundary taxonomy | keep |
| package/runtime unresolved no-go taxonomy | keep |

### No-Go In This Plan

| Residual | Reason |
| --- | --- |
| repo-local package/self-name implementation | oracle sampled no repo-local package/self-name residuals |
| package `exports`/`imports` repo-local implementation | oracle sampled no repo-local exports/imports residuals |

### Handoff To Next Plan

| Residual | Next route |
| --- | --- |
| full TypeScript `moduleResolution` completion | needs broader oracle sampling or a corpus with known repo-local package residuals |
| package `exports`/`imports` implementation | rerun oracle on selected corpus/samples before implementation |
| package self-name implementation | rerun oracle on selected corpus/samples before implementation |
| third-party package deep resolution | explicit product decision required; default remains no `node_modules` graph expansion |

**Next Plan Recommendation**

Recommended next plan:

```text
TypeScript moduleResolution targeted corpus expansion
```

Purpose:

- choose or construct a corpus with known repo-local package self-name and
  package `exports`/`imports` imports;
- expand oracle sampling beyond capped package/runtime fallback samples only
  for that corpus;
- select a bounded implementation slice only when TypeScript resolves to
  repo-local source and Rust currently falls back.

Do not proceed directly to a production resolver rewrite without that evidence.

**Validation**

Command:

```bash
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
```

Result:

- passed, 1 test.

Additional check:

```bash
git diff --check
```

Result:

- passed.

### 28. 2026-06-23-guarded-runtime-sibling-graph-write-closeout.md

**Scope**

Issue: #461

Roadmap node:

```text
1-5-4-3. guarded runtime sibling graph write
```

This slice completes the bounded `1-5. File target semantics` route for
repo-local declaration/runtime target relationship handling.

**Implementation Summary**

File-level import graph writing now consumes declaration/runtime pairing
decisions.

Behavior:

- `eligibleSingleRuntimeSibling` rewrites the file-level import edge to the
  runtime sibling file node;
- eligible rewrites write only the runtime sibling edge, not both declaration
  and runtime edges;
- blocked pairing decisions keep the declaration target;
- missing declaration/runtime file nodes fail closed and record skipped
  diagnostics;
- ESM named symbol edges, export edges, re-export edges, SQLite schema, and
  MCP/API behavior are unchanged.

Declaration/runtime specific edge-write diagnostics are exposed in profile
artifacts:

```text
moduleResolutionDeclarationRuntimeEdgeWriteAttemptedRefs
moduleResolutionDeclarationRuntimeEdgeWriteWrittenRefs
moduleResolutionDeclarationRuntimeEdgeWriteSkippedRefs
moduleResolutionDeclarationRuntimeEdgeWriteSkippedCounts
```

**Decision**

Keep.

`1-5-4-3` is complete. Because `1-5-1`, `1-5-2`, `1-5-3`, and `1-5-4` are now
complete, `1-5. File target semantics` is complete under its bounded repo-local
file-target scope.

This does not complete the main subtree. `1-6` parity confidence and `1-7`
guarded graph writing still have open items.

### 29. 2026-06-23-rust-native-module-resolution-oracle-profile-cleanup.md

**Decision**

Decision: `consolidate-and-delete-process-artifacts`.

Durable decisions remain in:

- `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md`
- `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md`
- `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md`
- `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md`

Generated oracle JSON/Markdown, profile JSON, status JSON, and targeted
evidence JSON artifacts can be deleted after this cleanup because the reusable
facts are captured by the closeout documents and summarized here.

**Deleted Process Artifact Classes**

This cleanup deletes:

- Rust module-resolution profile JSON;
- Rust targeted evidence/status JSON;
- Rust oracle JSON/Markdown;
- TypeScript oracle JSON/Markdown.

**Cleanup Boundary**

This cleanup does not delete the durable closeout documents or the roadmap
document. It also does not claim full TypeScript `moduleResolution` completion.
The semantic-frontier todolist remains the source of future planning work.

### 30. 2026-06-23-rust-native-typescript-module-resolution-roadmap-mapping-closeout.md

**Decision**

Decision: `mainline-bounded-complete-with-semantic-frontier-todolist`.

The current roadmap-mapped campaign has converged for the bounded repo-local
graph sufficiency path:

- Rust-native module-resolution request/decision/profile architecture exists.
- Config interpretation covers the repo-local compiler-option surface used by
  the bounded resolver.
- Repo-local package self-name, workspace package, package exports/imports,
  paths/rootDirs, extension substitution, directory/index lookup, and safe
  declaration/runtime pairing have bounded implementation coverage.
- Guarded graph writing covers file-level import edges, bounded ESM named
  symbol edges, bounded default/namespace decisions, bounded repo-local package
  named symbol edges, and bounded one-hop named re-export edges.
- Parity/oracle evidence exists for current repo and VS Code sparse where
  available; the VS Code sparse bounded profile unavailable reason is recorded
  rather than hidden.

This closeout does not claim full TypeScript `moduleResolution`. The remaining
work is now intentionally grouped as semantic-frontier todolist items, not as
unfinished work inside the current bounded mainline campaign.

**Current Roadmap State**

| Subtree | Status | Interpretation |
| --- | --- | --- |
| `1. Main subtree: repo-local graph sufficiency path` | complete | Bounded repo-local architecture and graph-writing route is done. |
| `2. Explore subtree: semantic frontier` | deferred todolist | Known complexity map for future planning, not the current implementation queue. |
| `3. Exploit slices: bounded implementation work` | complete | The bounded implementation slices mapped from this campaign have landed. |

The root roadmap remains open because full TypeScript module-resolution parity
requires explicit semantic-frontier decisions. That is a product/architecture
choice for the next round, not a hidden failure of the current bounded route.

**Todolist For Next Round**

### A. Semantic Frontier Decision Pack

Classify each `2.x` node before implementation:

- `2-1. full node_modules graph expansion`
- `2-2. third-party package symbol indexing`
- `2-3. typesVersions`
- `2-4. Classic and Node10 legacy exactness`
- `2-5. symlink/preserveSymlinks/pnpm virtual store behavior`
- `2-6. custom loaders and bundler plugins`
- `2-7. JSON/CSS/assets/custom non-code modules`
- `2-8. type-only vs runtime target divergence`
- `2-9. package manager specific edge cases`
- `2-10. advanced declaration/runtime semantics beyond repo-local same-basename
  pairing`

Recommended classifications:

- `defer/no-go`: keep taxonomy only.
- `promote-to-mainline`: make it part of the next product/architecture target.
- `split-to-exploit-slices`: turn into bounded implementation issues.
- `needs-oracle/research`: add fixtures or TS oracle evidence before touching
  production code.

### B. Re-Export Semantic Gaps

The bounded `1-7-3` route completed named one-hop repo-local re-export graph
writing. The following remain future semantic-frontier work:

- `export * from` re-export semantics;
- default re-export chains beyond the bounded direct form;
- namespace re-export member semantics;
- package or `node_modules` re-export semantics;
- multi-hop re-export chains.

These should not be reopened inside the bounded `1-7-3` closeout. Promote them
as explicit future slices if they become product-critical.

### C. Type Graph Semantics

Current value-graph semantics intentionally do not write type-only value graph
edges. Future work should decide whether a separate type graph is useful before
adding type-only import/export relationships.

### D. Large-Corpus Evidence Hygiene

Keep the existing rule:

- use `/private/tmp/codegraph-corpus/vscode-sparse` when it already exists and
  is a Git checkout;
- do not automatically clone large corpora;
- if bounded VS Code sparse evidence cannot complete, record an unavailable
  reason instead of fabricating parity confidence.

The current VS Code sparse bounded profile evidence for this roadmap has an
unavailable reason recorded in:

```text
docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md
```

**Next Recommended Plan**

Recommended next plan:

```text
TypeScript Module Resolution Semantic Frontier Decision Pack
```

Goal:

- decide which semantic-frontier nodes are product-relevant;
- choose a small number of bounded exploit slices for the next implementation
  round;
- keep `node_modules`, package-manager, loader, and type-graph expansion out of
  production code until each has a clear product reason and verification route.

### 31. 2026-06-23-safe-runtime-sibling-pairing-decision-contract-closeout.md

**Scope**

Issue: #460

Roadmap node:

```text
1-5-4-2. safe runtime sibling pairing decision contract
```

This slice adds profile-only pairing decisions for TypeScript declaration
targets. It does not change graph edge targets and does not implement guarded
runtime sibling graph writes.

**Implementation Summary**

Declaration target relationship diagnostics now include a `pairingDecision`
object for declaration target samples.

Eligible decisions include a repo-relative `runtimeTarget`:

```json
{
  "status": "eligibleSingleRuntimeSibling",
  "runtimeTarget": "src/foo.ts",
  "reason": "same-package-single-runtime-sibling"
}
```

Blocked decisions omit `runtimeTarget`:

```json
{
  "status": "blockedNoRuntimeSibling",
  "reason": "no-runtime-sibling"
}
```

Pairing decision aggregate counts are exposed under:

```text
moduleResolutionDeclarationRuntimePairingDecisionCounts
```

The eligibility rule is conservative:

- exactly one repo-local same-basename runtime sibling;
- source file, declaration target, and runtime sibling share the same nearest
  `package.json` boundary;
- if no package boundary exists, project root is the boundary;
- no package maps, declaration maps, source maps, `typesVersions`, generated
  declaration roots, or `node_modules` are followed.

**Decision**

Keep.

`1-5-4-2` is complete. The parent node remains partial because graph behavior
has not changed.

Remaining roadmap work:

```text
1-5-4-3. guarded runtime sibling graph write
```

That later slice must decide whether eligible pairing decisions are strong
enough to write graph edges to runtime sibling targets.

### 32. 2026-06-23-third-party-package-indexing-boundary-decision.md

**Decision**

`1-7-2` does not include `node_modules` expansion or third-party package symbol
indexing.

External package, runtime, and builtin imports such as:

```ts
import { map } from "lodash";
import { readFile } from "node:fs";
```

remain taxonomy-visible no-go cases for the current bounded repo-local value
graph semantics.

No package/module node, third-party symbol node, or `node_modules` graph is
introduced by this closeout.

**Rationale**

- Third-party package symbol indexing belongs to the Roadmap explore subtree,
  not the repo-local graph sufficiency main subtree.
- Implementing it correctly requires broader decisions for package manager
  layout, conditional exports, `typesVersions`, symlinks, pnpm virtual stores,
  and third-party declaration/runtime relationships.
- A package metadata middle layer would still add new graph semantics without
  solving source-level symbol sufficiency.
- The safer bounded behavior is to preserve accurate taxonomy and avoid guessed
  edges.

**Roadmap Impact**

`1-7-2-6-2. node_modules/third-party package indexing boundary (#471)` can be
marked complete as a boundary decision.

Full node_modules / third-party package symbol indexing remains deferred in the
explore subtree.
