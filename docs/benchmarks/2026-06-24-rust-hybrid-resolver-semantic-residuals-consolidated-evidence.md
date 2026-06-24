# Rust-Hybrid Resolver Semantic Residuals Consolidated Evidence

Date: 2026-06-24

Status: consolidated archive

Consolidates ESM named/export fallback diagnostics, direct export burndown, relative import/file-node taxonomy, TypeScript overload/type-value residuals, value-token interface routing, QualifiedName/FileNodes audits, and guarded ESM graph-writing closeouts not owned by moduleResolution or finalization-tail packages.

This file replaces the issue-scoped process artifacts listed below. The source files were deleted after their useful decisions, taxonomy, and evidence context were consolidated here.

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

## Consolidated Contents

## 1. 2026-06-21-esm-direct-export-burndown-current-taxonomy.md

# ESM Named Binding Fallback Taxonomy
Generated: 2026-06-21T07:29:11.097Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-direct-export-burndown-current.profile.json`
- Data source: `rustCore.esmNamedImportExportFallbackSamples`
- Source files read: none
- Database opened: false
## Summary
- Rows inspected: 356
- Candidate next slice: investigate unsupported import shapes (329 reported)
## Reasons
| Reason group | Count |
| --- | ---: |
| directExportCandidateGap | 49 |
| importEdgeTargetGap | 7 |
| packageOrRuntimeBoundary | 1233 |
| typeOnlyBoundary | 228 |
| unsupportedImportShape | 329 |

## Candidate next slice

investigate unsupported import shapes (329 reported)

## Examples

### directExportCandidateGap

- `drupalResolver` from `__tests__/drupal.test.ts` (typescript:14:0) -> `src/resolution/frameworks/drupal.ts` candidates=0 via direct-export
- `fabricViewResolver` from `__tests__/fabric-view.test.ts` (typescript:6:0) -> `src/resolution/frameworks/fabric.ts` candidates=0 via direct-export
- `expressResolver` from `__tests__/frameworks.test.ts` (typescript:224:0) -> `src/resolution/frameworks/express.ts` candidates=0 via direct-export
- `nestjsResolver` from `__tests__/frameworks.test.ts` (typescript:250:0) -> `src/resolution/frameworks/nestjs.ts` candidates=0 via direct-export
- `railsResolver` from `__tests__/frameworks.test.ts` (typescript:820:0) -> `src/resolution/frameworks/ruby.ts` candidates=0 via direct-export
- `springResolver` from `__tests__/frameworks.test.ts` (typescript:837:0) -> `src/resolution/frameworks/java.ts` candidates=0 via direct-export
- `playResolver` from `__tests__/frameworks.test.ts` (typescript:883:0) -> `src/resolution/frameworks/play.ts` candidates=0 via direct-export
- `goResolver` from `__tests__/frameworks.test.ts` (typescript:922:0) -> `src/resolution/frameworks/go.ts` candidates=0 via direct-export
- `rustResolver` from `__tests__/frameworks.test.ts` (typescript:947:0) -> `src/resolution/frameworks/rust.ts` candidates=0 via direct-export
- `vaporResolver` from `__tests__/frameworks.test.ts` (typescript:1326:0) -> `src/resolution/frameworks/swift.ts` candidates=0 via direct-export

### importEdgeTargetGap

- `flaskResolver` from `__tests__/frameworks.test.ts` (typescript:100:0)
- `fastapiResolver` from `__tests__/frameworks.test.ts` (typescript:100:0)
- `DEFAULT_PARSE_TIMEOUT_MS` from `src/extraction/parse-executor-worker.ts` (typescript:20:0)
- `DEFAULT_WORKER_RECYCLE_INTERVAL` from `src/extraction/parse-executor-worker.ts` (typescript:20:0)
- `fs` from `src/mcp/tools.ts` (typescript:25:0)
- `existsSync` from `src/mcp/tools.ts` (typescript:25:0)
- `wrapFrameworkResolver` from `src/resolution/frameworks/index.ts` (typescript:14:0)

### packageOrRuntimeBoundary

- `vitest` from `__tests__/access-models.test.ts` (typescript:16:0)
- `describe` from `__tests__/access-models.test.ts` (typescript:16:0)
- `it` from `__tests__/access-models.test.ts` (typescript:16:0)
- `expect` from `__tests__/access-models.test.ts` (typescript:16:0)
- `beforeEach` from `__tests__/access-models.test.ts` (typescript:16:0)
- `afterEach` from `__tests__/access-models.test.ts` (typescript:16:0)
- `fs` from `__tests__/access-models.test.ts` (typescript:17:0)
- `path` from `__tests__/access-models.test.ts` (typescript:18:0)
- `os` from `__tests__/access-models.test.ts` (typescript:19:0)
- `vitest` from `__tests__/adaptive-explore-sizing.test.ts` (typescript:27:0)

### typeOnlyBoundary

- `AgentAccessModel` from `__tests__/access-models.test.ts` (typescript:22:0)
- `MaintenanceAccessModel` from `__tests__/access-models.test.ts` (typescript:22:0)
- `ResolutionAccessModel` from `__tests__/access-models.test.ts` (typescript:22:0)
- `StatusAccessModel` from `__tests__/access-models.test.ts` (typescript:22:0)
- `QueryBuilder` from `__tests__/callback-synthesizer-language-gating.test.ts` (typescript:3:0)
- `ResolutionContext` from `__tests__/callback-synthesizer-language-gating.test.ts` (typescript:4:0)
- `RustCandidateProducerLookup` from `__tests__/candidate-protocol.test.ts` (typescript:8:0)
- `CommandContext` from `__tests__/command-context.test.ts` (typescript:21:0)
- `CommandOutput` from `__tests__/command-context.test.ts` (typescript:21:0)
- `CommandError` from `__tests__/command-context.test.ts` (typescript:21:0)

### unsupportedImportShape

- `CandidateProtocolProvider` from `__tests__/candidate-protocol.test.ts` (typescript:2:0) -> `src/resolution/candidate-protocol.ts`
- `collectCandidateProducerRoutingLookups` from `__tests__/candidate-protocol.test.ts` (typescript:2:0) -> `src/resolution/candidate-protocol.ts`
- `createTestContext` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `createProcessContext` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `TestExit` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `writeCommandOutput` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `writeCommandErrors` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `resolveProjectPath` from `__tests__/command-helpers.test.ts` (typescript:11:0) -> `src/cli/command-helpers.ts`
- `isProjectInitialized` from `__tests__/command-helpers.test.ts` (typescript:11:0) -> `src/cli/command-helpers.ts`
- `requireInitialized` from `__tests__/command-helpers.test.ts` (typescript:11:0) -> `src/cli/command-helpers.ts`

## 2. 2026-06-21-esm-direct-export-burndown-vscode-sparse-taxonomy.md

# ESM Named Binding Fallback Taxonomy
Generated: 2026-06-21T07:36:52.436Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
- Data source: `rustCore.esmNamedImportExportFallbackSamples`
- Source files read: none
- Database opened: false
## Summary
- Rows inspected: 778
- Candidate next slice: investigate direct export candidate gaps (27306 reported)
## Reasons
| Reason group | Count |
| --- | ---: |
| directExportCandidateGap | 27306 |
| importEdgeTargetGap | 5783 |
| packageOrRuntimeBoundary | 1965 |
| reexportCandidateGap | 143 |
| typeOnlyBoundary | 2759 |
| unsupportedImportShape | 2083 |

## Candidate next slice

investigate direct export candidate gaps (27306 reported)

## Examples

### directExportCandidateGap

- `IReader` from `src/vs/base/browser/animatedValue.ts` (typescript:7:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export
- `observableSignal` from `src/vs/base/browser/animatedValue.ts` (typescript:7:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export
- `addDisposableListener` from `src/vs/base/browser/dnd.ts` (typescript:6:0) -> `src/vs/base/browser/dom.ts` candidates=4 via direct-export
- `BrowserFeatures` from `src/vs/base/browser/dom.ts` (typescript:7:0) -> `src/vs/base/browser/canIUse.ts` candidates=0 via direct-export
- `KeyCode` from `src/vs/base/browser/dom.ts` (typescript:13:0) -> `src/vs/base/common/keyCodes.ts` candidates=0 via direct-export
- `IObservable` from `src/vs/base/browser/dom.ts` (typescript:21:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export
- `derived` from `src/vs/base/browser/dom.ts` (typescript:21:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export
- `derivedOpts` from `src/vs/base/browser/dom.ts` (typescript:21:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export
- `IReader` from `src/vs/base/browser/dom.ts` (typescript:21:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export
- `observableValue` from `src/vs/base/browser/dom.ts` (typescript:21:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export

### importEdgeTargetGap

- `convertTagToPlaintext` from `src/vs/base/browser/markdownRenderer.ts` (typescript:22:0)
- `localize` from `src/vs/base/browser/ui/button/button.ts` (typescript:23:0)
- `localize` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:7:0)
- `localize` from `src/vs/base/browser/ui/hover/hoverWidget.ts` (typescript:12:0)
- `localize` from `src/vs/base/browser/ui/icons/iconSelectBox.ts` (typescript:14:0)
- `localize` from `src/vs/base/browser/ui/keybindingLabel/keybindingLabel.ts` (typescript:16:0)
- `localize` from `src/vs/base/browser/ui/progressbar/progressbar.ts` (typescript:11:0)
- `localize` from `src/vs/base/browser/ui/selectBox/selectBoxCustom.ts` (typescript:6:0)
- `localize` from `src/vs/base/browser/ui/splitview/paneview.ts` (typescript:19:0)
- `localize` from `src/vs/base/browser/ui/tree/abstractTree.ts` (typescript:36:0)

### packageOrRuntimeBoundary

- `TrustedTypePolicy` from `src/vs/base/browser/dompurify/dompurify.d.ts` (typescript:3:0)
- `TrustedTypesWindow` from `src/vs/base/browser/dompurify/dompurify.d.ts` (typescript:3:0)
- `TrustedHTML` from `src/vs/base/browser/dompurify/dompurify.d.ts` (typescript:3:0)
- `crypto` from `src/vs/base/node/crypto.ts` (typescript:6:0)
- `fs` from `src/vs/base/node/crypto.ts` (typescript:7:0)
- `os` from `src/vs/base/node/id.ts` (typescript:6:0)
- `networkInterfaces` from `src/vs/base/node/id.ts` (typescript:6:0)
- `os` from `src/vs/base/node/macAddress.ts` (typescript:6:0)
- `networkInterfaces` from `src/vs/base/node/macAddress.ts` (typescript:6:0)
- `fs` from `src/vs/base/node/nls.ts` (typescript:7:0)

### reexportCandidateGap

- `AnchorAlignment` from `src/vs/base/browser/contextmenu.ts` (typescript:9:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `AnchorAxisAlignment` from `src/vs/base/browser/contextmenu.ts` (typescript:9:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `Orientation` from `src/vs/base/browser/ui/centered/centeredViewLayout.ts` (typescript:9:0) -> `src/vs/base/browser/ui/splitview/splitview.ts` candidates=0 via one-hop-reexport
- `AnchorAlignment` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:10:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `AnchorAlignment` from `src/vs/base/browser/ui/dropdown/dropdownActionViewItem.ts` (typescript:19:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `AnchorAlignment` from `src/vs/base/browser/ui/inputbox/inputBox.ts` (typescript:13:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `AnchorPosition` from `src/vs/base/browser/ui/selectBox/selectBoxCustom.ts` (typescript:19:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `Orientation` from `src/vs/base/browser/ui/table/tableWidget.ts` (typescript:12:0) -> `src/vs/base/browser/ui/splitview/splitview.ts` candidates=0 via one-hop-reexport
- `AnchorAlignment` from `src/vs/base/browser/ui/toolbar/toolbar.ts` (typescript:9:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `Orientation` from `src/vs/base/test/browser/ui/grid/grid.test.ts` (typescript:7:0) -> `src/vs/base/browser/ui/grid/grid.ts` candidates=0 via one-hop-reexport

### typeOnlyBoundary

- `IJSONSchemaSnippet` from `src/vs/base/browser/fonts.ts` (typescript:7:0)
- `IManagedHover` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:22:0)
- `IManagedHoverContent` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:22:0)
- `IManagedHover` from `src/vs/base/browser/ui/button/button.ts` (typescript:24:0)
- `IManagedHover` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:11:0)
- `IActionViewItemProvider` from `src/vs/base/browser/ui/findinput/findInput.ts` (typescript:17:0)
- `IHoverLifecycleOptions` from `src/vs/base/browser/ui/findinput/findInput.ts` (typescript:22:0)
- `SplitView` from `src/vs/base/browser/ui/grid/grid.ts` (typescript:12:0)
- `AutoSizing` from `src/vs/base/browser/ui/grid/grid.ts` (typescript:12:0)
- `IManagedHover` from `src/vs/base/browser/ui/highlightedlabel/highlightedLabel.ts` (typescript:7:0)

### unsupportedImportShape

- `Event` from `src/vs/base/browser/event.ts` (typescript:7:0) -> `src/vs/base/common/event.ts`
- `basename` from `src/vs/base/browser/markdownRenderer.ts` (typescript:16:0) -> `src/vs/base/common/path.ts`
- `Event` from `src/vs/base/browser/touch.ts` (typescript:9:0) -> `src/vs/base/common/event.ts`
- `EventType` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:9:0) -> `src/vs/base/browser/touch.ts`
- `EventType` from `src/vs/base/browser/ui/button/button.ts` (typescript:10:0) -> `src/vs/base/browser/touch.ts`
- `Event` from `src/vs/base/browser/ui/button/button.ts` (typescript:17:0) -> `src/vs/base/common/event.ts`
- `IView` from `src/vs/base/browser/ui/centered/centeredViewLayout.ts` (typescript:9:0) -> `src/vs/base/browser/ui/splitview/splitview.ts`
- `EventType` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:9:0) -> `src/vs/base/browser/touch.ts`
- `IMessage` from `src/vs/base/browser/ui/findinput/findInput.ts` (typescript:12:0) -> `src/vs/base/browser/ui/inputbox/inputBox.ts`
- `IMessage` from `src/vs/base/browser/ui/findinput/replaceInput.ts` (typescript:12:0) -> `src/vs/base/browser/ui/inputbox/inputBox.ts`

## 3. 2026-06-21-esm-direct-export-candidate-gap-burndown-closeout-decision.md

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

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifacts:

- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.measurement.json`
- `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse-taxonomy.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

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

## 4. 2026-06-21-esm-direct-export-candidate-multiple-current-taxonomy.md

# ESM Direct Export Candidate-Multiple Taxonomy
Generated: 2026-06-21T08:04:41.404Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-direct-export-burndown-current.profile.json`
- Database: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/.zcodegraph/zcodegraph.db`
- Source files read: none
- Database opened: true
- Sample source unavailable: No direct export candidate-multiple samples found
## Summary
- Rows inspected: 0
- Largest subtype: none
- Recommended next slice: no samples available
## Subtypes
| Subtype | Count | Decision |
| --- | ---: | --- |

## Decision

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: none
- No-go subtypes: none

## Examples

## 5. 2026-06-21-esm-direct-export-candidate-multiple-taxonomy-closeout-decision.md

# ESM Direct Export Candidate-Multiple Taxonomy Closeout

Date: 2026-06-21

## Decision

Keep the ESM direct export candidate-multiple taxonomy.

This slice adds a DB-backed, privacy-safe classifier for direct export
candidate-multiple fallback samples. It does not change resolver behavior,
candidate selection, graph edges, database schema, public CLI behavior, or MCP
output.

The next resolver slice should **not** immediately add a candidate-multiple
tie-break. The VS Code sparse taxonomy points at function overload/signature
patterns as the dominant sampled subtype, which needs a prerequisite semantic
decision before routing any candidate into the main path.

## Scope Completed

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

## Deterministic Verification

Commands:

```bash
npx vitest run __tests__/rust-esm-candidate-multiple-taxonomy.test.ts
npx vitest run __tests__/rust-esm-fallback-taxonomy.test.ts __tests__/rust-esm-candidate-multiple-taxonomy.test.ts
```

Results:

- Passed.

## Current Repo Evidence

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

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifacts:

- `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`
- `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.measurement.json`

Inputs:

- Profile:
  `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
- Database:
  `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`

Important scope note:

- The taxonomy classifies bounded profile samples, not the full raw
  `direct-export-candidate-multiple` population.
- The profile reported `direct-export-candidate-multiple`: 16,384.
- The classifier inspected 100 capped direct export candidate-multiple samples.

Sampled subtype distribution:

| Subtype | Count | Decision posture |
| --- | ---: | --- |
| `function-overload-signature` | 85 | prerequisite-first |
| `type-value-namespace-collision` | 13 | no-go-keep-fallback |
| `ambient-declaration-merge` | 2 | prerequisite-first |

Measurement sidecar:

- Wall time: 453ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

## Tie-Break Decision

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

## Closeout

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

## 6. 2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.md

# ESM Direct Export Candidate-Multiple Taxonomy
Generated: 2026-06-21T08:04:41.805Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
- Database: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- Source files read: none
- Database opened: true
## Summary
- Rows inspected: 100
- Largest subtype: function-overload-signature
- Recommended next slice: resolve prerequisite for function-overload-signature before tie-break
## Subtypes
| Subtype | Count | Decision |
| --- | ---: | --- |
| ambient-declaration-merge | 2 | prerequisite-first |
| function-overload-signature | 85 | prerequisite-first |
| type-value-namespace-collision | 13 | no-go-keep-fallback |

## Decision

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: ambient-declaration-merge, function-overload-signature
- No-go subtypes: type-value-namespace-collision

## Examples

### ambient-declaration-merge

- `isAbsolute` from `src/vs/base/common/extpath.ts` (typescript:7:0) -> `src/vs/base/common/path.ts` kinds=variable|constant
- `relativePath` from `src/vs/base/test/common/resources.test.ts` (typescript:9:0) -> `src/vs/base/common/resources.ts` kinds=constant

### function-overload-signature

- `addDisposableListener` from `src/vs/base/browser/dnd.ts` (typescript:6:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `addDisposableListener` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:8:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/actionbar/actionbar.ts` (typescript:14:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/breadcrumbs/breadcrumbsWidget.ts` (typescript:13:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `addDisposableListener` from `src/vs/base/browser/ui/button/button.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `append` from `src/vs/base/browser/ui/countBadge/countBadge.ts` (typescript:6:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `addDisposableListener` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:8:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `mnemonicButtonLabel` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:18:0) -> `src/vs/base/common/labels.ts` kinds=function
- `addDisposableListener` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `append` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function

### type-value-namespace-collision

- `IAccessibilityService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:11:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface
- `IConfigurationService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:12:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface
- `IContextKeyService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:13:0) -> `src/vs/platform/contextkey/common/contextkey.ts` kinds=constant|interface
- `ILayoutService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:14:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface
- `IConfigurationService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:10:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface
- `IContextKeyService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:12:0) -> `src/vs/platform/contextkey/common/contextkey.ts` kinds=constant|interface
- `ILayoutService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:14:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface
- `IAccessibilityService` from `src/vs/platform/accessibility/test/common/testAccessibilityService.ts` (typescript:7:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface
- `IAccessibilityService` from `src/vs/platform/accessibilitySignal/browser/accessibilitySignalService.ts` (typescript:14:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface
- `IConfigurationService` from `src/vs/platform/accessibilitySignal/browser/accessibilitySignalService.ts` (typescript:15:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface

## 7. 2026-06-21-esm-named-binding-fallback-diagnostics-map-closeout-decision.md

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

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifacts:

- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-vscode-sparse.measurement.json`
- `docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-vscode-sparse-taxonomy.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

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

## 8. 2026-06-21-esm-named-fallback-diagnostics-current-taxonomy.md

# ESM Named Binding Fallback Taxonomy
Generated: 2026-06-21T02:08:31.803Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-current.profile.json`
- Data source: `rustCore.esmNamedImportExportFallbackSamples`
- Source files read: none
- Database opened: false
## Summary
- Rows inspected: 379
- Candidate next slice: investigate unsupported import shapes (329 reported)
## Reasons
| Reason group | Count |
| --- | ---: |
| directExportCandidateGap | 72 |
| importEdgeTargetGap | 7 |
| packageOrRuntimeBoundary | 1233 |
| typeOnlyBoundary | 228 |
| unsupportedImportShape | 329 |

## Candidate next slice

investigate unsupported import shapes (329 reported)

## Examples

### directExportCandidateGap

- `initGrammars` from `__tests__/drupal.test.ts` (typescript:13:0) -> `src/extraction/grammars.ts` candidates=0 via direct-export
- `loadAllGrammars` from `__tests__/drupal.test.ts` (typescript:13:0) -> `src/extraction/grammars.ts` candidates=0 via direct-export
- `drupalResolver` from `__tests__/drupal.test.ts` (typescript:14:0) -> `src/resolution/frameworks/drupal.ts` candidates=0 via direct-export
- `plan` from `__tests__/explore-planner.test.ts` (typescript:6:0) -> `src/mcp/explore-planner.ts` candidates=0 via direct-export
- `initGrammars` from `__tests__/extraction.test.ts` (typescript:13:0) -> `src/extraction/grammars.ts` candidates=0 via direct-export
- `loadAllGrammars` from `__tests__/extraction.test.ts` (typescript:13:0) -> `src/extraction/grammars.ts` candidates=0 via direct-export
- `fabricViewResolver` from `__tests__/fabric-view.test.ts` (typescript:6:0) -> `src/resolution/frameworks/fabric.ts` candidates=0 via direct-export
- `initGrammars` from `__tests__/frameworks-integration.test.ts` (typescript:6:0) -> `src/extraction/grammars.ts` candidates=0 via direct-export
- `loadAllGrammars` from `__tests__/frameworks-integration.test.ts` (typescript:6:0) -> `src/extraction/grammars.ts` candidates=0 via direct-export
- `expressResolver` from `__tests__/frameworks.test.ts` (typescript:224:0) -> `src/resolution/frameworks/express.ts` candidates=0 via direct-export

### importEdgeTargetGap

- `flaskResolver` from `__tests__/frameworks.test.ts` (typescript:100:0)
- `fastapiResolver` from `__tests__/frameworks.test.ts` (typescript:100:0)
- `DEFAULT_PARSE_TIMEOUT_MS` from `src/extraction/parse-executor-worker.ts` (typescript:20:0)
- `DEFAULT_WORKER_RECYCLE_INTERVAL` from `src/extraction/parse-executor-worker.ts` (typescript:20:0)
- `fs` from `src/mcp/tools.ts` (typescript:25:0)
- `existsSync` from `src/mcp/tools.ts` (typescript:25:0)
- `wrapFrameworkResolver` from `src/resolution/frameworks/index.ts` (typescript:14:0)

### packageOrRuntimeBoundary

- `vitest` from `__tests__/access-models.test.ts` (typescript:16:0)
- `describe` from `__tests__/access-models.test.ts` (typescript:16:0)
- `it` from `__tests__/access-models.test.ts` (typescript:16:0)
- `expect` from `__tests__/access-models.test.ts` (typescript:16:0)
- `beforeEach` from `__tests__/access-models.test.ts` (typescript:16:0)
- `afterEach` from `__tests__/access-models.test.ts` (typescript:16:0)
- `fs` from `__tests__/access-models.test.ts` (typescript:17:0)
- `path` from `__tests__/access-models.test.ts` (typescript:18:0)
- `os` from `__tests__/access-models.test.ts` (typescript:19:0)
- `vitest` from `__tests__/adaptive-explore-sizing.test.ts` (typescript:27:0)

### typeOnlyBoundary

- `AgentAccessModel` from `__tests__/access-models.test.ts` (typescript:22:0)
- `MaintenanceAccessModel` from `__tests__/access-models.test.ts` (typescript:22:0)
- `ResolutionAccessModel` from `__tests__/access-models.test.ts` (typescript:22:0)
- `StatusAccessModel` from `__tests__/access-models.test.ts` (typescript:22:0)
- `QueryBuilder` from `__tests__/callback-synthesizer-language-gating.test.ts` (typescript:3:0)
- `ResolutionContext` from `__tests__/callback-synthesizer-language-gating.test.ts` (typescript:4:0)
- `RustCandidateProducerLookup` from `__tests__/candidate-protocol.test.ts` (typescript:8:0)
- `CommandContext` from `__tests__/command-context.test.ts` (typescript:21:0)
- `CommandOutput` from `__tests__/command-context.test.ts` (typescript:21:0)
- `CommandError` from `__tests__/command-context.test.ts` (typescript:21:0)

### unsupportedImportShape

- `CandidateProtocolProvider` from `__tests__/candidate-protocol.test.ts` (typescript:2:0) -> `src/resolution/candidate-protocol.ts`
- `collectCandidateProducerRoutingLookups` from `__tests__/candidate-protocol.test.ts` (typescript:2:0) -> `src/resolution/candidate-protocol.ts`
- `createTestContext` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `createProcessContext` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `TestExit` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `writeCommandOutput` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `writeCommandErrors` from `__tests__/command-context.test.ts` (typescript:14:0) -> `src/cli/command-context.ts`
- `resolveProjectPath` from `__tests__/command-helpers.test.ts` (typescript:11:0) -> `src/cli/command-helpers.ts`
- `isProjectInitialized` from `__tests__/command-helpers.test.ts` (typescript:11:0) -> `src/cli/command-helpers.ts`
- `requireInitialized` from `__tests__/command-helpers.test.ts` (typescript:11:0) -> `src/cli/command-helpers.ts`

## 9. 2026-06-21-esm-named-fallback-diagnostics-vscode-sparse-taxonomy.md

# ESM Named Binding Fallback Taxonomy
Generated: 2026-06-21T02:08:31.810Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-named-fallback-diagnostics-vscode-sparse.profile.json`
- Data source: `rustCore.esmNamedImportExportFallbackSamples`
- Source files read: none
- Database opened: false
## Summary
- Rows inspected: 720
- Candidate next slice: investigate direct export candidate gaps (29584 reported)
## Reasons
| Reason group | Count |
| --- | ---: |
| directExportCandidateGap | 29584 |
| importEdgeTargetGap | 5783 |
| packageOrRuntimeBoundary | 1965 |
| reexportCandidateGap | 143 |
| typeOnlyBoundary | 2759 |
| unsupportedImportShape | 2083 |

## Candidate next slice

investigate direct export candidate gaps (29584 reported)

## Examples

### directExportCandidateGap

- `IReader` from `src/vs/base/browser/animatedValue.ts` (typescript:7:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export
- `observableSignal` from `src/vs/base/browser/animatedValue.ts` (typescript:7:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export
- `Disposable` from `src/vs/base/browser/broadcast.ts` (typescript:9:0) -> `src/vs/base/common/lifecycle.ts` candidates=0 via direct-export
- `ResolvedKeybinding` from `src/vs/base/browser/contextmenu.ts` (typescript:11:0) -> `src/vs/base/common/keybindings.ts` candidates=0 via direct-export
- `Disposable` from `src/vs/base/browser/dnd.ts` (typescript:7:0) -> `src/vs/base/common/lifecycle.ts` candidates=0 via direct-export
- `BrowserFeatures` from `src/vs/base/browser/dom.ts` (typescript:7:0) -> `src/vs/base/browser/canIUse.ts` candidates=0 via direct-export
- `AbstractIdleValue` from `src/vs/base/browser/dom.ts` (typescript:10:0) -> `src/vs/base/common/async.ts` candidates=0 via direct-export
- `KeyCode` from `src/vs/base/browser/dom.ts` (typescript:13:0) -> `src/vs/base/common/keyCodes.ts` candidates=0 via direct-export
- `Disposable` from `src/vs/base/browser/dom.ts` (typescript:14:0) -> `src/vs/base/common/lifecycle.ts` candidates=0 via direct-export
- `IObservable` from `src/vs/base/browser/dom.ts` (typescript:21:0) -> `src/vs/base/common/observable.ts` candidates=0 via direct-export

### importEdgeTargetGap

- `convertTagToPlaintext` from `src/vs/base/browser/markdownRenderer.ts` (typescript:22:0)
- `localize` from `src/vs/base/browser/ui/button/button.ts` (typescript:23:0)
- `localize` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:7:0)
- `localize` from `src/vs/base/browser/ui/hover/hoverWidget.ts` (typescript:12:0)
- `localize` from `src/vs/base/browser/ui/icons/iconSelectBox.ts` (typescript:14:0)
- `localize` from `src/vs/base/browser/ui/keybindingLabel/keybindingLabel.ts` (typescript:16:0)
- `localize` from `src/vs/base/browser/ui/progressbar/progressbar.ts` (typescript:11:0)
- `localize` from `src/vs/base/browser/ui/selectBox/selectBoxCustom.ts` (typescript:6:0)
- `localize` from `src/vs/base/browser/ui/splitview/paneview.ts` (typescript:19:0)
- `localize` from `src/vs/base/browser/ui/tree/abstractTree.ts` (typescript:36:0)

### packageOrRuntimeBoundary

- `TrustedTypePolicy` from `src/vs/base/browser/dompurify/dompurify.d.ts` (typescript:3:0)
- `TrustedTypesWindow` from `src/vs/base/browser/dompurify/dompurify.d.ts` (typescript:3:0)
- `TrustedHTML` from `src/vs/base/browser/dompurify/dompurify.d.ts` (typescript:3:0)
- `crypto` from `src/vs/base/node/crypto.ts` (typescript:6:0)
- `fs` from `src/vs/base/node/crypto.ts` (typescript:7:0)
- `os` from `src/vs/base/node/id.ts` (typescript:6:0)
- `networkInterfaces` from `src/vs/base/node/id.ts` (typescript:6:0)
- `os` from `src/vs/base/node/macAddress.ts` (typescript:6:0)
- `networkInterfaces` from `src/vs/base/node/macAddress.ts` (typescript:6:0)
- `fs` from `src/vs/base/node/nls.ts` (typescript:7:0)

### reexportCandidateGap

- `AnchorAlignment` from `src/vs/base/browser/contextmenu.ts` (typescript:9:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `AnchorAxisAlignment` from `src/vs/base/browser/contextmenu.ts` (typescript:9:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `Orientation` from `src/vs/base/browser/ui/centered/centeredViewLayout.ts` (typescript:9:0) -> `src/vs/base/browser/ui/splitview/splitview.ts` candidates=0 via one-hop-reexport
- `AnchorAlignment` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:10:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `AnchorAlignment` from `src/vs/base/browser/ui/dropdown/dropdownActionViewItem.ts` (typescript:19:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `AnchorAlignment` from `src/vs/base/browser/ui/inputbox/inputBox.ts` (typescript:13:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `AnchorPosition` from `src/vs/base/browser/ui/selectBox/selectBoxCustom.ts` (typescript:19:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `Orientation` from `src/vs/base/browser/ui/table/tableWidget.ts` (typescript:12:0) -> `src/vs/base/browser/ui/splitview/splitview.ts` candidates=0 via one-hop-reexport
- `AnchorAlignment` from `src/vs/base/browser/ui/toolbar/toolbar.ts` (typescript:9:0) -> `src/vs/base/browser/ui/contextview/contextview.ts` candidates=0 via one-hop-reexport
- `Orientation` from `src/vs/base/test/browser/ui/grid/grid.test.ts` (typescript:7:0) -> `src/vs/base/browser/ui/grid/grid.ts` candidates=0 via one-hop-reexport

### typeOnlyBoundary

- `IJSONSchemaSnippet` from `src/vs/base/browser/fonts.ts` (typescript:7:0)
- `IManagedHover` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:22:0)
- `IManagedHoverContent` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:22:0)
- `IManagedHover` from `src/vs/base/browser/ui/button/button.ts` (typescript:24:0)
- `IManagedHover` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:11:0)
- `IActionViewItemProvider` from `src/vs/base/browser/ui/findinput/findInput.ts` (typescript:17:0)
- `IHoverLifecycleOptions` from `src/vs/base/browser/ui/findinput/findInput.ts` (typescript:22:0)
- `SplitView` from `src/vs/base/browser/ui/grid/grid.ts` (typescript:12:0)
- `AutoSizing` from `src/vs/base/browser/ui/grid/grid.ts` (typescript:12:0)
- `IManagedHover` from `src/vs/base/browser/ui/highlightedlabel/highlightedLabel.ts` (typescript:7:0)

### unsupportedImportShape

- `Event` from `src/vs/base/browser/event.ts` (typescript:7:0) -> `src/vs/base/common/event.ts`
- `basename` from `src/vs/base/browser/markdownRenderer.ts` (typescript:16:0) -> `src/vs/base/common/path.ts`
- `Event` from `src/vs/base/browser/touch.ts` (typescript:9:0) -> `src/vs/base/common/event.ts`
- `EventType` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:9:0) -> `src/vs/base/browser/touch.ts`
- `EventType` from `src/vs/base/browser/ui/button/button.ts` (typescript:10:0) -> `src/vs/base/browser/touch.ts`
- `Event` from `src/vs/base/browser/ui/button/button.ts` (typescript:17:0) -> `src/vs/base/common/event.ts`
- `IView` from `src/vs/base/browser/ui/centered/centeredViewLayout.ts` (typescript:9:0) -> `src/vs/base/browser/ui/splitview/splitview.ts`
- `EventType` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:9:0) -> `src/vs/base/browser/touch.ts`
- `IMessage` from `src/vs/base/browser/ui/findinput/findInput.ts` (typescript:12:0) -> `src/vs/base/browser/ui/inputbox/inputBox.ts`
- `IMessage` from `src/vs/base/browser/ui/findinput/replaceInput.ts` (typescript:12:0) -> `src/vs/base/browser/ui/inputbox/inputBox.ts`

## 10. 2026-06-21-import-fallback-profile-samples-closeout-decision.md

# Import Fallback Profile Samples Closeout

Date: 2026-06-21

## Decision

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

## Scope Completed

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

## Deterministic Evidence

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

## Current Repo Evidence

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

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Profile artifact:

- `docs/benchmarks/2026-06-21-import-fallback-samples-vscode-sparse.profile.json`

Taxonomy artifacts:

- `docs/benchmarks/2026-06-21-import-fallback-samples-vscode-sparse-taxonomy.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-import-fallback-samples-vscode-sparse.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 650.94s.
- RSS: unavailable. `/usr/bin/time -l` returned
  `time: sysctl kern.clockrate: Operation not permitted`.
- Sample counts:
  - `binding/binding-level-symbol-disambiguation`: 105,920
  - `relative/file-node-not-found`: 309
  - `relative/target-not-found`: 63,882
  - `unsupported/unsupported-import-form`: 273
- Sample cap:
  - `perBucket`: 100
  - `total`: 2,000
  - `truncated`: true
- Relative taxonomy over sampled rows:
  - `supportedSourceSpecifier`: 100
  - `assetLikeTarget`: 100

VS Code sparse examples show the same source-specifier pattern at scale:

- `./dom.js`
- `../common/observable.js`
- `./window.js`
- `../common/errors.js`
- `../common/event.js`

It also shows a separate asset class, especially `.css` imports:

- `./actionbar.css`
- `./aria.css`
- `./button.css`
- `./contextview.css`

Asset imports remain explicitly out of scope for graph edge creation.

## Interpretation

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

## Next Recommended Slice

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

## 11. 2026-06-21-import-fallback-samples-current-taxonomy.md

# Relative Import Target Taxonomy
Generated: 2026-06-20T17:01:55.966Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-import-fallback-samples-current.profile.json`
- Data source: `rustCore.importPathAliasFallbackSamples`
- Source files read: none
## Summary
- Rows inspected: 158
- Relative unresolved JS/TS imports: 9
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 149
## Categories
| Category | Count |
| --- | ---: |
| assetLikeTarget | 1 |
| supportedSourceSpecifier | 8 |

## Examples

### assetLikeTarget

- `../package.json` from `__tests__/installer-isolation.test.ts` (typescript:5:0)

### supportedSourceSpecifier

- `../../src/index.js` from `__tests__/evaluation/runner.ts` (typescript:4:0)
- `./scoring.js` from `__tests__/evaluation/runner.ts` (typescript:5:0)
- `./test-cases.js` from `__tests__/evaluation/runner.ts` (typescript:6:0)
- `./types.js` from `__tests__/evaluation/runner.ts` (typescript:7:0)
- `./types.js` from `__tests__/evaluation/scoring.ts` (typescript:1:0)
- `./types.js` from `__tests__/evaluation/test-cases.ts` (typescript:1:0)
- `../../src/types.js` from `__tests__/evaluation/types.ts` (typescript:1:0)
- `./explore-types.js` from `src/mcp/tools.ts` (typescript:31:0)

## 12. 2026-06-21-import-fallback-samples-vscode-sparse-taxonomy.md

# Relative Import Target Taxonomy
Generated: 2026-06-20T17:13:20.896Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-import-fallback-samples-vscode-sparse.profile.json`
- Data source: `rustCore.importPathAliasFallbackSamples`
- Source files read: none
## Summary
- Rows inspected: 400
- Relative unresolved JS/TS imports: 200
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 200
## Categories
| Category | Count |
| --- | ---: |
| assetLikeTarget | 100 |
| supportedSourceSpecifier | 100 |

## Examples

### assetLikeTarget

- `./actionbar.css` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:20:0)
- `./actionbar.css` from `src/vs/base/browser/ui/actionbar/actionbar.ts` (typescript:16:0)
- `./aria.css` from `src/vs/base/browser/ui/aria/aria.ts` (typescript:7:0)
- `./breadcrumbsWidget.css` from `src/vs/base/browser/ui/breadcrumbs/breadcrumbsWidget.ts` (typescript:15:0)
- `./button.css` from `src/vs/base/browser/ui/button/button.ts` (typescript:22:0)
- `./codicon/codicon.css` from `src/vs/base/browser/ui/codicons/codiconStyles.ts` (typescript:6:0)
- `./codicon/codicon-modifiers.css` from `src/vs/base/browser/ui/codicons/codiconStyles.ts` (typescript:7:0)
- `./contextview.css` from `src/vs/base/browser/ui/contextview/contextview.ts` (typescript:13:0)
- `./countBadge.css` from `src/vs/base/browser/ui/countBadge/countBadge.ts` (typescript:8:0)
- `./dialog.css` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:6:0)

### supportedSourceSpecifier

- `./dom.js` from `src/vs/base/browser/animatedValue.ts` (typescript:6:0)
- `../common/observable.js` from `src/vs/base/browser/animatedValue.ts` (typescript:7:0)
- `./window.js` from `src/vs/base/browser/broadcast.ts` (typescript:6:0)
- `../common/errors.js` from `src/vs/base/browser/broadcast.ts` (typescript:7:0)
- `../common/event.js` from `src/vs/base/browser/broadcast.ts` (typescript:8:0)
- `../common/lifecycle.js` from `src/vs/base/browser/broadcast.ts` (typescript:9:0)
- `./window.js` from `src/vs/base/browser/browser.ts` (typescript:6:0)
- `../common/event.js` from `src/vs/base/browser/browser.ts` (typescript:7:0)
- `./browser.js` from `src/vs/base/browser/canIUse.ts` (typescript:6:0)
- `./window.js` from `src/vs/base/browser/canIUse.ts` (typescript:7:0)

## 13. 2026-06-21-relative-file-node-diagnostics-cleanup-closeout-decision.md

# Relative File-Node Diagnostics Cleanup Closeout

Date: 2026-06-21

## Decision

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

## Scope Completed

- `file-node-not-found` remains the profile fallback reason.
- Profile samples can include:
  - `targetKind`
  - `targetExtension`
- Non-code asset/config targets remain unresolved and do not create graph
  edges.
- The taxonomy script remains backward compatible with older profile artifacts
  that do not contain target metadata.

## Deterministic Verification

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

## Current Repo Evidence

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

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifacts:

- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-vscode-sparse.measurement.json`
- `docs/benchmarks/2026-06-21-relative-file-node-diagnostics-vscode-sparse-taxonomy.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

Command:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-file-node-diagnostics-vscode-sparse.profile.json \
  /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/scripts/targeted-profile-evidence.mjs \
  --out /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-file-node-diagnostics-vscode-sparse.measurement.json \
  --cwd /private/tmp/codegraph-corpus/vscode-sparse \
  -- /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed:

| Metric | Value |
| --- | ---: |
| `importPathAliasResolvedBySource.relative` | 59,042 |
| `importPathAliasFallbackBySource.relative` | 5,180 |
| `relative/file-node-not-found` sample count | 309 |
| `relative/target-not-found` sample count | 4,871 |
| taxonomy `nonCodeAssetTarget` | 100 |
| taxonomy `supportedSourceSpecifier` | 100 |

Samples:

- `./actionbar.css` from
  `src/vs/base/browser/ui/actionbar/actionViewItems.ts` classified as
  `targetKind: asset`, `targetExtension: .css`.
- Repeated `../../../../nls.js` imports remain `target-not-found` samples. As
  recorded in the relative JS source specifier closeout, this appears tied to
  sparse checkout/corpus hydration because `src/vs/nls.*` is absent from the
  validated sparse checkout.

Measurement sidecar:

- Wall time: 882,966ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Interpretation:

- The `file-node-not-found` residual now has a clear non-code asset
  explanation in sampled VS Code sparse evidence.
- The remaining `target-not-found` / `supportedSourceSpecifier` samples are not
  solved by this diagnostics cleanup and should not be mixed with asset/config
  graph semantics.

## Closeout

This slice closes the relative `file-node-not-found` diagnostics cleanup.

The residual should be treated as:

- current repo: diagnostics-known non-code config boundary;
- VS Code sparse `file-node-not-found`: diagnostics-known non-code asset
  boundary in sampled evidence;
- VS Code sparse `target-not-found` / `nls.js`: separate supported-source or
  sparse-hydration follow-up candidate, not an asset/config resolver expansion.

Do not expand the graph to asset/config imports based on this evidence.

## 14. 2026-06-21-relative-file-node-diagnostics-current-taxonomy.md

# Relative Import Target Taxonomy
Generated: 2026-06-21T00:31:31.784Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-file-node-diagnostics-current.profile.json`
- Data source: `rustCore.importPathAliasFallbackSamples`
- Source files read: none
## Summary
- Rows inspected: 150
- Relative unresolved JS/TS imports: 1
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 149
## Categories
| Category | Count |
| --- | ---: |
| nonCodeConfigTarget | 1 |

## Examples

### nonCodeConfigTarget

- `../package.json` from `__tests__/installer-isolation.test.ts` (typescript:5:0)

## 15. 2026-06-21-relative-file-node-diagnostics-vscode-sparse-taxonomy.md

# Relative Import Target Taxonomy
Generated: 2026-06-21T00:46:40.395Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-file-node-diagnostics-vscode-sparse.profile.json`
- Data source: `rustCore.importPathAliasFallbackSamples`
- Source files read: none
## Summary
- Rows inspected: 400
- Relative unresolved JS/TS imports: 200
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 200
## Categories
| Category | Count |
| --- | ---: |
| nonCodeAssetTarget | 100 |
| supportedSourceSpecifier | 100 |

## Examples

### nonCodeAssetTarget

- `./actionbar.css` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:20:0)
- `./actionbar.css` from `src/vs/base/browser/ui/actionbar/actionbar.ts` (typescript:16:0)
- `./aria.css` from `src/vs/base/browser/ui/aria/aria.ts` (typescript:7:0)
- `./breadcrumbsWidget.css` from `src/vs/base/browser/ui/breadcrumbs/breadcrumbsWidget.ts` (typescript:15:0)
- `./button.css` from `src/vs/base/browser/ui/button/button.ts` (typescript:22:0)
- `./codicon/codicon.css` from `src/vs/base/browser/ui/codicons/codiconStyles.ts` (typescript:6:0)
- `./codicon/codicon-modifiers.css` from `src/vs/base/browser/ui/codicons/codiconStyles.ts` (typescript:7:0)
- `./contextview.css` from `src/vs/base/browser/ui/contextview/contextview.ts` (typescript:13:0)
- `./countBadge.css` from `src/vs/base/browser/ui/countBadge/countBadge.ts` (typescript:8:0)
- `./dialog.css` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:6:0)

### supportedSourceSpecifier

- `../../../../nls.js` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:21:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/button/button.ts` (typescript:23:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:7:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/dropdown/dropdownActionViewItem.ts` (typescript:6:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/findinput/findInput.ts` (typescript:19:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/findinput/findInputToggles.ts` (typescript:8:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/findinput/replaceInput.ts` (typescript:18:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/hover/hoverWidget.ts` (typescript:12:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/icons/iconSelectBox.ts` (typescript:14:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/inputbox/inputBox.ts` (typescript:23:0)

## 16. 2026-06-21-relative-import-target-burndown-closeout-decision.md

# Relative Import Target Burndown Closeout

Date: 2026-06-21

## Decision

Close this slice as no-go for production resolver changes.

The internal taxonomy diagnostic is keepable, and the targeted profiles confirm
the existing rust-hybrid path still completes. However, the final SQLite DB does
not retain the relative import target miss rows needed to choose a safe bounded
fix. Implementing query/hash stripping, path normalization changes, or any other
relative import behavior from profile counters alone would be speculative.

## Scope Completed

- Added `scripts/rust-import-target-taxonomy.mjs`.
- Added deterministic coverage for classifying relative unresolved JS/TS import
  rows from DB metadata.
- Generated current-repo and VS Code sparse taxonomy artifacts.
- Ran current-repo targeted rust-hybrid profile.
- Ran VS Code sparse targeted rust-hybrid profile.
- Recorded no-go for the bounded implementation slice.

No production resolver behavior changed.

## Deterministic Evidence

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

## Current Repo Profile

Artifact:

- `docs/benchmarks/2026-06-21-relative-import-target-burndown-current.profile.json`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-21-relative-import-target-burndown-current.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 30.97s.
- RSS: unavailable. `/usr/bin/time -l` returned
  `time: sysctl kern.clockrate: Operation not permitted`.
- `importPathAliasResolvedRefs`: 654.
- `importPathAliasFallbackRefs`: 2,535.
- `importPathAliasBindingFallbackRefs`: 2,477.
- `importPathAliasUnsupportedFallbackRefs`: 49.
- `importPathAliasUnresolvedFallbackRefs`: 9.
- `importPathAliasFallbackBySource.relative`: 9.
- Final DB taxonomy relative unresolved JS/TS imports: 0.

Reference-resolution fallback taxonomy:

- `binding-level-symbol-disambiguation-not-yet-rust-owned`: 1,530.
- `unsupported-import-form-not-yet-rust-owned`: 44.
- `unresolved-file-level-import-target`: 14.

## VS Code Sparse Profile

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifact:

- `docs/benchmarks/2026-06-21-relative-import-target-burndown-vscode-sparse.profile.json`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-import-target-burndown-vscode-sparse.profile.json \
  /usr/bin/time -l /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed:

- Wall time from `/usr/bin/time`: 637.22s.
- RSS: unavailable. `/usr/bin/time -l` returned
  `time: sysctl kern.clockrate: Operation not permitted`.
- `importPathAliasResolvedRefs`: 31.
- `importPathAliasFallbackRefs`: 170,384.
- `importPathAliasBindingFallbackRefs`: 105,920.
- `importPathAliasUnsupportedFallbackRefs`: 273.
- `importPathAliasUnresolvedFallbackRefs`: 64,191.
- `importPathAliasFallbackBySource.relative`: 64,191.
- Final DB taxonomy relative unresolved JS/TS imports: 0.

Reference-resolution fallback taxonomy:

- `binding-level-symbol-disambiguation-not-yet-rust-owned`: 105,919.
- `unsupported-import-form-not-yet-rust-owned`: 35.
- `unresolved-file-level-import-target`: 64,429.

## Interpretation

The profile counters still show a large Rust-core relative import target gap.
The taxonomy script cannot classify that gap from the final DB because
TypeScript finalization cleanup removes the unresolved rows.

That makes the bounded implementation issue intentionally close as no-op/no-go.
This protects resolver semantics: we should not infer a production fix from
aggregate counters alone.

## Next Recommended Move

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

## 17. 2026-06-21-relative-import-target-taxonomy-current-repo.md

# Relative Import Target Taxonomy

Generated: 2026-06-20T16:26:14.713Z

## Source

- DB: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/.zcodegraph/zcodegraph.db`
- Data source: `unresolved_refs` metadata only
- Source files read: none

## Summary

- Rows inspected: 1979
- Relative unresolved JS/TS imports: 0
- Ignored non-import references: 1905
- Ignored unsupported languages: 0
- Ignored non-relative imports: 74

## Categories

| Category | Count |
| --- | ---: |

## Examples

## 18. 2026-06-21-relative-import-target-taxonomy-decision.md

# Relative Import Target Taxonomy Decision

Date: 2026-06-21

## Decision

Do not choose a bounded production burndown from the current VS Code sparse
database.

The taxonomy script is keepable as an internal benchmark diagnostic, but the
available VS Code sparse `.zcodegraph` database is a post-finalization database:
`unresolved_refs` is empty after cleanup. That means it cannot sample the
relative import target misses reported by the Rust core profile.

This is a data-source no-go, not evidence that no low-risk relative import
category exists.

## Artifacts

- Plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- VS Code sparse taxonomy before profile rerun:
  `docs/benchmarks/2026-06-21-relative-import-target-taxonomy-vscode-sparse.json`
- VS Code sparse taxonomy after profile rerun:
  `docs/benchmarks/2026-06-21-relative-import-target-taxonomy-vscode-sparse-after-profile.json`
- Current repo taxonomy:
  `docs/benchmarks/2026-06-21-relative-import-target-taxonomy-current-repo.json`

## Corpus Validation

The VS Code sparse corpus was present at:

- `/private/tmp/codegraph-corpus/vscode-sparse`

Validated:

- Git checkout: yes
- Commit: `4a6e32fc1f0`
- `src/vs/workbench`: present
- `src/vs/platform`: present
- `src/vs/base`: present
- `.zcodegraph/zcodegraph.db`: present

## Taxonomy Results

The taxonomy script reads only database metadata from `unresolved_refs`:

- `reference_name`
- `file_path`
- `language`
- `line`
- `col`

It does not read source files.

Observed:

| Artifact | Relative unresolved JS/TS imports | Categories |
| --- | ---: | --- |
| Current repo final DB | 0 | none |
| VS Code sparse final DB before profile rerun | 0 | none |
| VS Code sparse final DB after profile rerun | 0 | none |

The profile still reports Rust core relative import target fallback, but those
fallback rows are not preserved in the final `unresolved_refs` table after
TypeScript finalization and cleanup.

## Category Choice

No bounded category was selected.

Rejected production changes in this slice:

- asset imports;
- bundler loader semantics;
- package `exports` / `main`;
- sparse-checkout missing files;
- dynamic/template imports;
- symbol-level disambiguation;
- speculative query/hash stripping without a sampled low-risk target set.

## Follow-Up

If we still want to burn down relative import targets, the next slice should
capture unresolved import target metadata at the Rust-core/profile boundary
before TypeScript finalization cleanup, or add a dedicated profile artifact that
samples the relevant fallback rows without exposing source text.

## 19. 2026-06-21-relative-import-target-taxonomy-vscode-sparse-after-profile.md

# Relative Import Target Taxonomy

Generated: 2026-06-20T16:38:57.562Z

## Source

- DB: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- Data source: `unresolved_refs` metadata only
- Source files read: none

## Summary

- Rows inspected: 0
- Relative unresolved JS/TS imports: 0
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 0

## Categories

| Category | Count |
| --- | ---: |

## Examples

## 20. 2026-06-21-relative-import-target-taxonomy-vscode-sparse.md

# Relative Import Target Taxonomy

Generated: 2026-06-20T16:25:22.760Z

## Source

- DB: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- Data source: `unresolved_refs` metadata only
- Source files read: none

## Summary

- Rows inspected: 0
- Relative unresolved JS/TS imports: 0
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 0

## Categories

| Category | Count |
| --- | ---: |

## Examples

## 21. 2026-06-21-relative-js-source-fallback-current-after-taxonomy.md

# Relative Import Target Taxonomy
Generated: 2026-06-20T17:39:52.628Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-js-source-fallback-current-after.profile.json`
- Data source: `rustCore.importPathAliasFallbackSamples`
- Source files read: none
## Summary
- Rows inspected: 150
- Relative unresolved JS/TS imports: 1
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 149
## Categories
| Category | Count |
| --- | ---: |
| assetLikeTarget | 1 |

## Examples

### assetLikeTarget

- `../package.json` from `__tests__/installer-isolation.test.ts` (typescript:5:0)

## 22. 2026-06-21-relative-js-source-fallback-vscode-sparse-after-taxonomy.md

# Relative Import Target Taxonomy
Generated: 2026-06-20T17:47:55.349Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-js-source-fallback-vscode-sparse-after.profile.json`
- Data source: `rustCore.importPathAliasFallbackSamples`
- Source files read: none
## Summary
- Rows inspected: 400
- Relative unresolved JS/TS imports: 200
- Ignored non-import references: 0
- Ignored unsupported languages: 0
- Ignored non-relative imports: 200
## Categories
| Category | Count |
| --- | ---: |
| assetLikeTarget | 100 |
| supportedSourceSpecifier | 100 |

## Examples

### assetLikeTarget

- `./actionbar.css` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:20:0)
- `./actionbar.css` from `src/vs/base/browser/ui/actionbar/actionbar.ts` (typescript:16:0)
- `./aria.css` from `src/vs/base/browser/ui/aria/aria.ts` (typescript:7:0)
- `./breadcrumbsWidget.css` from `src/vs/base/browser/ui/breadcrumbs/breadcrumbsWidget.ts` (typescript:15:0)
- `./button.css` from `src/vs/base/browser/ui/button/button.ts` (typescript:22:0)
- `./codicon/codicon.css` from `src/vs/base/browser/ui/codicons/codiconStyles.ts` (typescript:6:0)
- `./codicon/codicon-modifiers.css` from `src/vs/base/browser/ui/codicons/codiconStyles.ts` (typescript:7:0)
- `./contextview.css` from `src/vs/base/browser/ui/contextview/contextview.ts` (typescript:13:0)
- `./countBadge.css` from `src/vs/base/browser/ui/countBadge/countBadge.ts` (typescript:8:0)
- `./dialog.css` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:6:0)

### supportedSourceSpecifier

- `../../../../nls.js` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:21:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/button/button.ts` (typescript:23:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:7:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/dropdown/dropdownActionViewItem.ts` (typescript:6:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/findinput/findInput.ts` (typescript:19:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/findinput/findInputToggles.ts` (typescript:8:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/findinput/replaceInput.ts` (typescript:18:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/hover/hoverWidget.ts` (typescript:12:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/icons/iconSelectBox.ts` (typescript:14:0)
- `../../../../nls.js` from `src/vs/base/browser/ui/inputbox/inputBox.ts` (typescript:23:0)

## 23. 2026-06-21-relative-js-source-specifier-burndown-closeout-decision.md

# Relative JS Source Specifier Burndown Closeout

Date: 2026-06-21

## Decision

Keep the relative JS source specifier fallback.

The implementation reduces the Rust relative import target gap on both the
current repo and the VS Code sparse checkout while preserving the intended
semantic boundary:

- only relative imports changed;
- literal `.js` targets still win when present;
- alias/workspace/package paths did not opt into the fallback;
- asset imports stayed unresolved and out of the graph.

This is a feature-completeness keep decision, not a performance claim.

## Scope Completed

Rust relative import resolution now handles explicit JS runtime specifiers as a
source-file fallback when the literal file is absent:

- `.js` -> `.ts`, `.tsx`, `.mts`, `.cts`, `.jsx`
- `.mjs` -> `.mts`, `.ts`, `.tsx`, `.js`
- `.cjs` -> `.cts`, `.ts`, `.tsx`, `.js`

The fallback is only used by the relative import path. Alias, tsconfig path,
conventional alias, workspace package, package import, asset import, dynamic
import, and symbol-level behavior were not intentionally changed.

## Deterministic Evidence

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

## Current Repo Evidence

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

## VS Code Sparse Evidence

Corpus:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Before artifacts reused from the import fallback samples closeout:

- `docs/benchmarks/2026-06-21-import-fallback-samples-vscode-sparse.profile.json`
- `docs/benchmarks/2026-06-21-import-fallback-samples-vscode-sparse-taxonomy.json`

After artifacts:

- `docs/benchmarks/2026-06-21-relative-js-source-fallback-vscode-sparse-after.profile.json`
- `docs/benchmarks/2026-06-21-relative-js-source-fallback-vscode-sparse-after-taxonomy.json`
- `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`
- `docs/benchmarks/2026-06-21-relative-js-source-fallback-vscode-sparse-after.measurement.json`

After command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-js-source-fallback-vscode-sparse-after.profile.json \
  /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/scripts/targeted-profile-evidence.mjs \
  --out /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-relative-js-source-fallback-vscode-sparse-after.measurement.json \
  --cwd /private/tmp/codegraph-corpus/vscode-sparse \
  -- /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Observed movement:

| Metric | Before | After |
| --- | ---: | ---: |
| `importPathAliasResolvedBySource.relative` | 31 | 59,042 |
| `importPathAliasFallbackBySource.relative` | 64,191 | 5,180 |
| `relative/target-not-found` samples count | 63,882 | 4,871 |
| `relative/file-node-not-found` samples count | 309 | 309 |
| `unresolved-file-level-import-target` fallback taxonomy | 64,429 | 5,418 |
| taxonomy `supportedSourceSpecifier` sample bucket | 100 | 100 |
| taxonomy `assetLikeTarget` sample bucket | 100 | 100 |

Measurement sidecar:

- Wall time: 445,460ms.
- RSS: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

Interpretation:

- The main relative `.js` source specifier class moved substantially.
- Remaining `supportedSourceSpecifier` samples are dominated by repeated
  `nls.js` imports. The sparse checkout used for this evidence does not contain
  `src/vs/nls.*`, so this residual appears to be a corpus hydration/sparse
  checkout boundary, not a same-basename source fallback bug.
- Asset imports remain visible and intentionally unresolved.

## Next Recommended Move

Do not continue expanding file-target resolution into asset or package semantics.

Two reasonable next moves remain:

1. Investigate the residual `relative/file-node-not-found` bucket. It is small
   but semantically different from `target-not-found`, and may expose extraction,
   indexing inclusion, or sparse-checkout hydration issues.
2. Return to binding-level symbol disambiguation, which remains the largest
   known resolver migration gap.

Recommended next slice: inspect `relative/file-node-not-found` with profile
samples before choosing another production resolver change.

## 24. 2026-06-21-ts-implementation-declaration-current-decision.md

# TypeScript Overload/Signature Semantic Decision

Generated: 2026-06-21T09:20:43.682Z

## Inputs

- Taxonomy: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-implementation-declaration-current-taxonomy.json`
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-implementation-declaration-current.profile.json`
- Database: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/.zcodegraph/zcodegraph.db`
- VS Code sparse commit: `current-aaba106`
- Source files read: none
- Resolver behavior changed: false
- Performance claim: none

## Decision

- Import edge target: runtime/value ESM named import edges should target the implementation declaration only when exactly one clear implementation declaration exists.
- Imported usage edge target: imported runtime/value usage edges should target the same implementation declaration selected for the import edge.
- Overload signature rule: overload signatures without implementation bodies are not runtime implementation targets.
- Metadata sufficiency: insufficient-missing-implementation-declaration-marker.
- Recommended next slice: add implementation-declaration metadata before changing resolver behavior.

## No-Go Rules

- ambient-only overload/signature sets keep fallback.
- .d.ts overload/signature sets keep fallback.
- no-implementation overload/signature sets keep fallback.
- type/value/namespace collisions keep fallback.

## Safe Tie-Break Prerequisites

- all candidates are in the same resolved target file.
- all candidates are runtime/value compatible function declarations.
- candidate metadata exposes hasBody=true or declarationForm=implementation.
- exactly one candidate is marked as the implementation declaration.
- target file is not a .d.ts declaration file.

## Fixture Coverage

- Overload signatures plus one implementation: 0
- Ambient-only or no implementation: 0
- .d.ts overload set: 0
- Type/value namespace collision: 0

## Parallel Tooling

- #375: RSS sampling tooling follow-up; not a blocker for this semantic decision.

## 25. 2026-06-21-ts-implementation-declaration-current-taxonomy.md

# ESM Direct Export Candidate-Multiple Taxonomy
Generated: 2026-06-21T09:20:43.636Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-implementation-declaration-current.profile.json`
- Database: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/.zcodegraph/zcodegraph.db`
- Source files read: none
- Database opened: true
- Sample source unavailable: No direct export candidate-multiple samples found
## Summary
- Rows inspected: 0
- Largest subtype: none
- Recommended next slice: no samples available
## Subtypes
| Subtype | Count | Decision |
| --- | ---: | --- |

## Decision

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: none
- No-go subtypes: none

## Examples

## 26. 2026-06-21-ts-implementation-declaration-metadata-closeout-decision.md

# TypeScript Implementation-Declaration Metadata Closeout Decision

Date: 2026-06-21

## Inputs

- Plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Current repo profile:
  `docs/benchmarks/2026-06-21-ts-implementation-declaration-current.profile.json`
- Current repo taxonomy:
  `docs/benchmarks/2026-06-21-ts-implementation-declaration-current-taxonomy.json`
- Current repo decision:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- VS Code sparse profile:
  `docs/benchmarks/2026-06-21-ts-implementation-declaration-vscode-sparse.profile.json`
- VS Code sparse taxonomy:
  `docs/benchmarks/2026-06-21-ts-implementation-declaration-vscode-sparse-taxonomy.json`
- VS Code sparse decision:
  `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`
- VS Code sparse checkout:
  `/private/tmp/codegraph-corpus/vscode-sparse`
- VS Code sparse commit:
  `4a6e32fc1f0`

## What Changed

Rust ESM named import/export candidate-multiple diagnostics now expose
implementation-declaration metadata for candidate line ranges:

- `hasBody`
- `declarationForm`
- `metadataSource`

The metadata is diagnostic-only. It is not persisted in SQLite schema, is not
encoded into user-facing node fields, and is not consumed by production resolver
routing in this slice.

## Evidence

Current repo evidence produced no direct export candidate-multiple samples, so
it is not sufficient to judge overload/signature tie-break readiness.

VS Code sparse evidence inspected 100 capped candidate-multiple samples:

- `function-overload-signature`: 85
- `type-value-namespace-collision`: 13
- `ambient-declaration-merge`: 2

The enriched VS Code sparse decision found:

- overload/signature samples with exactly one implementation marker: 7
- ambient-only or no-implementation samples: 2
- type/value namespace collision examples: 10

## Privacy

The taxonomy and decision scripts do not read source files. The Rust profile
diagnostic enrichment may read target files for bounded line/range inference,
but artifacts record only classification fields and line ranges. They do not
record source snippets, source lines, or inferred source text.

## Decision

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

## No-Go Rules

- Ambient-only overload/signature sets keep fallback.
- `.d.ts` overload/signature sets keep fallback.
- No-implementation overload/signature sets keep fallback.
- Type/value/namespace collisions keep fallback.
- Unknown or unavailable declaration metadata keeps fallback.

## Recommendation

Next implementation slice: implement a bounded production resolver tie-break for
TypeScript overload/signature candidate-multiple cases, guarded by the safe
prerequisites above. Do not broaden into type/value namespace collision,
ambient-only declarations, `.d.ts` declarations, default imports, namespace
imports, package resolution, or multi-hop re-export semantics.

## 27. 2026-06-21-ts-implementation-declaration-vscode-sparse-decision.md

# TypeScript Overload/Signature Semantic Decision

Generated: 2026-06-21T09:28:51.308Z

## Inputs

- Taxonomy: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-implementation-declaration-vscode-sparse-taxonomy.json`
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-implementation-declaration-vscode-sparse.profile.json`
- Database: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- VS Code sparse commit: `4a6e32fc1f0`
- Source files read: none
- Resolver behavior changed: false
- Performance claim: none

## Decision

- Import edge target: runtime/value ESM named import edges should target the implementation declaration only when exactly one clear implementation declaration exists.
- Imported usage edge target: imported runtime/value usage edges should target the same implementation declaration selected for the import edge.
- Overload signature rule: overload signatures without implementation bodies are not runtime implementation targets.
- Metadata sufficiency: sufficient-when-exactly-one-implementation-marker-exists.
- Recommended next slice: implement a bounded candidate-multiple tie-break guarded by the safe prerequisites.

## No-Go Rules

- ambient-only overload/signature sets keep fallback.
- .d.ts overload/signature sets keep fallback.
- no-implementation overload/signature sets keep fallback.
- type/value/namespace collisions keep fallback.

## Safe Tie-Break Prerequisites

- all candidates are in the same resolved target file.
- all candidates are runtime/value compatible function declarations.
- candidate metadata exposes hasBody=true or declarationForm=implementation.
- exactly one candidate is marked as the implementation declaration.
- target file is not a .d.ts declaration file.

## Fixture Coverage

- Overload signatures plus one implementation: 7
- Ambient-only or no implementation: 2
- .d.ts overload set: 0
- Type/value namespace collision: 10

## Parallel Tooling

- #375: RSS sampling tooling follow-up; not a blocker for this semantic decision.

## 28. 2026-06-21-ts-implementation-declaration-vscode-sparse-taxonomy.md

# ESM Direct Export Candidate-Multiple Taxonomy
Generated: 2026-06-21T09:28:51.261Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-implementation-declaration-vscode-sparse.profile.json`
- Database: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- Source files read: none
- Database opened: true
## Summary
- Rows inspected: 100
- Largest subtype: function-overload-signature
- Recommended next slice: resolve prerequisite for function-overload-signature before tie-break
## Subtypes
| Subtype | Count | Decision |
| --- | ---: | --- |
| ambient-declaration-merge | 2 | prerequisite-first |
| function-overload-signature | 85 | prerequisite-first |
| type-value-namespace-collision | 13 | no-go-keep-fallback |

## Decision

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: ambient-declaration-merge, function-overload-signature
- No-go subtypes: type-value-namespace-collision

## Examples

### ambient-declaration-merge

- `isAbsolute` from `src/vs/base/common/extpath.ts` (typescript:7:0) -> `src/vs/base/common/path.ts` kinds=variable|constant
- `relativePath` from `src/vs/base/test/common/resources.test.ts` (typescript:9:0) -> `src/vs/base/common/resources.ts` kinds=constant

### function-overload-signature

- `addDisposableListener` from `src/vs/base/browser/dnd.ts` (typescript:6:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `addDisposableListener` from `src/vs/base/browser/ui/actionbar/actionViewItems.ts` (typescript:8:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/actionbar/actionbar.ts` (typescript:14:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/breadcrumbs/breadcrumbsWidget.ts` (typescript:13:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `addDisposableListener` from `src/vs/base/browser/ui/button/button.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `append` from `src/vs/base/browser/ui/countBadge/countBadge.ts` (typescript:6:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `addDisposableListener` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:8:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `mnemonicButtonLabel` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:18:0) -> `src/vs/base/common/labels.ts` kinds=function
- `addDisposableListener` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `append` from `src/vs/base/browser/ui/dropdown/dropdown.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function

### type-value-namespace-collision

- `IAccessibilityService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:11:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface
- `IConfigurationService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:12:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface
- `IContextKeyService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:13:0) -> `src/vs/platform/contextkey/common/contextkey.ts` kinds=constant|interface
- `ILayoutService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:14:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface
- `IConfigurationService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:10:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface
- `IContextKeyService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:12:0) -> `src/vs/platform/contextkey/common/contextkey.ts` kinds=constant|interface
- `ILayoutService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:14:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface
- `IAccessibilityService` from `src/vs/platform/accessibility/test/common/testAccessibilityService.ts` (typescript:7:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface
- `IAccessibilityService` from `src/vs/platform/accessibilitySignal/browser/accessibilitySignalService.ts` (typescript:14:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface
- `IConfigurationService` from `src/vs/platform/accessibilitySignal/browser/accessibilitySignalService.ts` (typescript:15:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface

## 29. 2026-06-21-ts-overload-implementation-current-decision.md

# TypeScript Overload/Signature Semantic Decision

Generated: 2026-06-21T10:12:02.522Z

## Inputs

- Taxonomy: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-overload-implementation-current-taxonomy.json`
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-overload-implementation-current.profile.json`
- Database: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/.zcodegraph/zcodegraph.db`
- VS Code sparse commit: `current-86a855e`
- Source files read: none
- Resolver behavior changed: false
- Performance claim: none

## Decision

- Import edge target: runtime/value ESM named import edges should target the implementation declaration only when exactly one clear implementation declaration exists.
- Imported usage edge target: imported runtime/value usage edges should target the same implementation declaration selected for the import edge.
- Overload signature rule: overload signatures without implementation bodies are not runtime implementation targets.
- Metadata sufficiency: insufficient-missing-implementation-declaration-marker.
- Overload implementation resolved refs: 0.
- Recommended next slice: add implementation-declaration metadata before changing resolver behavior.

## No-Go Rules

- ambient-only overload/signature sets keep fallback.
- .d.ts overload/signature sets keep fallback.
- no-implementation overload/signature sets keep fallback.
- type/value/namespace collisions keep fallback.

## Safe Tie-Break Prerequisites

- all candidates are in the same resolved target file.
- all candidates are runtime/value compatible function declarations.
- candidate metadata exposes hasBody=true or declarationForm=implementation.
- exactly one candidate is marked as the implementation declaration.
- target file is not a .d.ts declaration file.

## Fixture Coverage

- Overload signatures plus one implementation: 0
- Ambient-only or no implementation: 0
- .d.ts overload set: 0
- Type/value namespace collision: 0

## Parallel Tooling

- #375: RSS sampling tooling follow-up; not a blocker for this semantic decision.

## 30. 2026-06-21-ts-overload-implementation-current-taxonomy.md

# ESM Direct Export Candidate-Multiple Taxonomy
Generated: 2026-06-21T10:03:20.184Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-overload-implementation-current.profile.json`
- Database: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/.zcodegraph/zcodegraph.db`
- Source files read: none
- Database opened: true
- Sample source unavailable: No direct export candidate-multiple samples found
## Summary
- Rows inspected: 0
- Largest subtype: none
- Recommended next slice: no samples available
- Overload implementation resolved refs: 0
## Subtypes
| Subtype | Count | Decision |
| --- | ---: | --- |

## Decision

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: none
- No-go subtypes: none

## Examples

## 31. 2026-06-21-ts-overload-implementation-tie-break-closeout-decision.md

# TypeScript Overload Implementation Tie-Break Closeout

Date: 2026-06-21

## Scope

This closeout covers the bounded TypeScript overload implementation tie-break
from `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`.

The change is production routing for Rust ESM named import/export resolution,
default enabled only when a candidate-multiple set has exactly one safe
TypeScript implementation declaration.

## Decision

Keep guarded overload implementation routing enabled.

The VS Code sparse evidence shows the mechanism works on a large real TypeScript
corpus: the tie-break resolved 3766 import or imported-usage refs through
`rust-esm-named-import-export-overload-implementation`, while the remaining
candidate-multiple sample distribution shifted away from overload signatures.

This is not a performance claim. No agent A/B and no multi-run benchmark were
run. The evidence is deterministic profile/taxonomy evidence only.

## Evidence

### Current repo

Artifacts:

- Profile: `docs/benchmarks/2026-06-21-ts-overload-implementation-current.profile.json`
- Taxonomy: `docs/benchmarks/2026-06-21-ts-overload-implementation-current-taxonomy.json`
- Decision: `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

Result:

- Candidate-multiple samples inspected: 0
- Overload implementation resolved refs: 0
- Interpretation: current repo has no direct export candidate-multiple samples
  for this slice, so it is useful as a deterministic no-regression run but not
  as positive corpus evidence.

### VS Code sparse checkout

Corpus:

- Path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`

Artifacts:

- Profile: `docs/benchmarks/2026-06-21-ts-overload-implementation-vscode-sparse.profile.json`
- Taxonomy: `docs/benchmarks/2026-06-21-ts-overload-implementation-vscode-sparse-taxonomy.json`
- Decision: `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

Result after routing:

- Candidate-multiple samples inspected: 100
- `function-overload-signature`: 17
- `type-value-namespace-collision`: 81
- `ambient-declaration-merge`: 2
- Overload implementation resolved refs: 3766

Before/after comparison against the prior metadata-only artifact
`docs/benchmarks/2026-06-21-ts-implementation-declaration-vscode-sparse-taxonomy.json`:

- `function-overload-signature`: 85 -> 17 among capped remaining samples
- `type-value-namespace-collision`: 13 -> 81 among capped remaining samples
- `ambient-declaration-merge`: 2 -> 2 among capped remaining samples

Interpretation: the guarded overload implementation route reduced the sampled
overload-signature fallback class, and exposed type/value/namespace collision as
the next dominant remaining candidate-multiple subtype. Because samples are
capped, the subtype percentages describe the remaining sampled fallback shape,
not absolute corpus-wide totals.

## Guard Boundaries

The route remains intentionally narrow:

- target file must not be `.d.ts`, `.d.mts`, or `.d.cts`;
- candidates must be same-file function candidates;
- candidate metadata must expose implementation identity through `hasBody=true`
  or `declarationForm=implementation`;
- exactly one candidate may be the implementation declaration;
- import edges and imported usage edges must target that same implementation
  candidate;
- edge metadata must use
  `resolvedBy: "rust-esm-named-import-export-overload-implementation"`.

## No-Go Boundaries

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

## Next Recommendation

Do not broaden overload implementation routing.

The next resolver migration slice should investigate the remaining
`type-value-namespace-collision` candidate-multiple class as its own bounded
semantic decision, with separate fixtures and evidence. That class has different
risk than overload implementation selection and should not be hidden inside this
route.

## 32. 2026-06-21-ts-overload-implementation-vscode-sparse-decision.md

# TypeScript Overload/Signature Semantic Decision

Generated: 2026-06-21T10:12:02.567Z

## Inputs

- Taxonomy: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-overload-implementation-vscode-sparse-taxonomy.json`
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-overload-implementation-vscode-sparse.profile.json`
- Database: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- VS Code sparse commit: `4a6e32fc1f0`
- Source files read: none
- Resolver behavior changed: false
- Performance claim: none

## Decision

- Import edge target: runtime/value ESM named import edges should target the implementation declaration only when exactly one clear implementation declaration exists.
- Imported usage edge target: imported runtime/value usage edges should target the same implementation declaration selected for the import edge.
- Overload signature rule: overload signatures without implementation bodies are not runtime implementation targets.
- Metadata sufficiency: sufficient-when-exactly-one-implementation-marker-exists.
- Overload implementation resolved refs: 3766.
- Recommended next slice: keep guarded overload implementation routing enabled and investigate remaining candidate-multiple subtypes.

## No-Go Rules

- ambient-only overload/signature sets keep fallback.
- .d.ts overload/signature sets keep fallback.
- no-implementation overload/signature sets keep fallback.
- type/value/namespace collisions keep fallback.

## Safe Tie-Break Prerequisites

- all candidates are in the same resolved target file.
- all candidates are runtime/value compatible function declarations.
- candidate metadata exposes hasBody=true or declarationForm=implementation.
- exactly one candidate is marked as the implementation declaration.
- target file is not a .d.ts declaration file.

## Fixture Coverage

- Overload signatures plus one implementation: 0
- Ambient-only or no implementation: 2
- .d.ts overload set: 0
- Type/value namespace collision: 10

## Parallel Tooling

- #375: RSS sampling tooling follow-up; not a blocker for this semantic decision.

## 33. 2026-06-21-ts-overload-implementation-vscode-sparse-taxonomy.md

# ESM Direct Export Candidate-Multiple Taxonomy
Generated: 2026-06-21T10:11:25.027Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-overload-implementation-vscode-sparse.profile.json`
- Database: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- Source files read: none
- Database opened: true
## Summary
- Rows inspected: 100
- Largest subtype: type-value-namespace-collision
- Recommended next slice: keep fallback for dominant subtype: type-value-namespace-collision
- Overload implementation resolved refs: 3766
## Subtypes
| Subtype | Count | Decision |
| --- | ---: | --- |
| ambient-declaration-merge | 2 | prerequisite-first |
| function-overload-signature | 17 | prerequisite-first |
| type-value-namespace-collision | 81 | no-go-keep-fallback |

## Decision

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: ambient-declaration-merge, function-overload-signature
- No-go subtypes: type-value-namespace-collision

## Examples

### ambient-declaration-merge

- `isAbsolute` from `src/vs/base/common/extpath.ts` (typescript:7:0) -> `src/vs/base/common/path.ts` kinds=variable|constant
- `relativePath` from `src/vs/base/test/common/resources.test.ts` (typescript:9:0) -> `src/vs/base/common/resources.ts` kinds=constant

### function-overload-signature

- `dispose` from `src/vs/base/browser/ui/actionbar/actionbar.ts` (typescript:14:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/breadcrumbs/breadcrumbsWidget.ts` (typescript:13:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `mnemonicButtonLabel` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:18:0) -> `src/vs/base/common/labels.ts` kinds=function
- `h` from `src/vs/base/browser/ui/dropdown/dropdownActionViewItem.ts` (typescript:15:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/list/listWidget.ts` (typescript:23:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/menu/menubar.ts` (typescript:20:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `h` from `src/vs/base/browser/ui/pixelSpinner/pixelSpinner.ts` (typescript:6:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/scrollbar/scrollableElement.ts` (typescript:17:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/splitview/splitview.ts` (typescript:13:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `h` from `src/vs/base/browser/ui/tree/abstractTree.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function

### type-value-namespace-collision

- `IAccessibilityService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:11:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface
- `IConfigurationService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:12:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface
- `IContextKeyService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:13:0) -> `src/vs/platform/contextkey/common/contextkey.ts` kinds=constant|interface
- `ILayoutService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:14:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface
- `IConfigurationService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:10:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface
- `IContextKeyService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:12:0) -> `src/vs/platform/contextkey/common/contextkey.ts` kinds=constant|interface
- `ILayoutService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:14:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface
- `IAccessibilityService` from `src/vs/platform/accessibility/test/common/testAccessibilityService.ts` (typescript:7:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface
- `IAccessibilityService` from `src/vs/platform/accessibilitySignal/browser/accessibilitySignalService.ts` (typescript:14:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface
- `IConfigurationService` from `src/vs/platform/accessibilitySignal/browser/accessibilitySignalService.ts` (typescript:15:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface

## 34. 2026-06-21-ts-overload-signature-semantic-closeout-decision.md

# TypeScript Overload/Signature Semantic Closeout Decision

Date: 2026-06-21

## Inputs

- Plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Semantic decision artifact:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Semantic decision JSON:
  `docs/benchmarks/2026-06-21-ts-overload-signature-semantic-decision.json`
- Fixture coverage:
  `__tests__/ts-overload-signature-semantic-decision.test.ts`
- VS Code sparse taxonomy:
  `docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.json`
- VS Code sparse profile:
  `docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
- VS Code sparse DB:
  `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- VS Code sparse commit:
  `4a6e32fc1f0`
- Parallel RSS tooling follow-up:
  #375

## Decision

Runtime/value ESM named import edges should target the TypeScript function
implementation declaration only when there is exactly one clear implementation
declaration. Imported runtime/value usage edges should target the same
implementation declaration selected for the import edge.

Overload signatures are not runtime implementation targets. A source-order or
pick-first tie-break is rejected.

## Safe Tie-Break Prerequisites

- All candidates are in the same resolved target file.
- All candidates are runtime/value compatible function declarations.
- Candidate metadata exposes `hasBody=true` or
  `declarationForm=implementation`.
- Exactly one candidate is marked as the implementation declaration.
- Target file is not a `.d.ts` declaration file.

## No-Go Rules

- Ambient-only overload/signature sets keep fallback.
- `.d.ts` overload/signature sets keep fallback.
- No-implementation overload/signature sets keep fallback.
- Type/value/namespace collisions keep fallback.

## Metadata Sufficiency

Current VS Code sparse taxonomy/profile artifacts are insufficient for a
production resolver behavior change because candidate metadata records line
ranges and kinds but does not reliably distinguish overload signatures from the
implementation declaration.

Required metadata for the next implementation slice:

- `hasBody`, or
- `declarationForm` with an `implementation` value.

No source files were read for this decision, and no performance improvement is
claimed.

## #375 Relationship

#375 is a parallel tooling follow-up for RSS sampling without `ps` process-list
access. It improves diagnostic reliability but does not block this
overload/signature semantic decision.

## Recommendation

Next implementation slice: add implementation-declaration metadata to Rust
TypeScript extraction/profile diagnostics before changing candidate-multiple
resolver behavior. After that metadata exists, implement a bounded
candidate-multiple tie-break guarded by the safe prerequisites above.

## 35. 2026-06-21-ts-overload-signature-semantic-decision.md

# TypeScript Overload/Signature Semantic Decision

Generated: 2026-06-21T08:33:57.344Z

## Inputs

- Taxonomy: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-direct-export-candidate-multiple-vscode-sparse-taxonomy.json`
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-esm-direct-export-burndown-vscode-sparse.profile.json`
- Database: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- VS Code sparse commit: `4a6e32fc1f0`
- Source files read: none
- Resolver behavior changed: false
- Performance claim: none

## Decision

- Import edge target: runtime/value ESM named import edges should target the implementation declaration only when exactly one clear implementation declaration exists.
- Imported usage edge target: imported runtime/value usage edges should target the same implementation declaration selected for the import edge.
- Overload signature rule: overload signatures without implementation bodies are not runtime implementation targets.
- Metadata sufficiency: insufficient-missing-implementation-declaration-marker.
- Recommended next slice: add implementation-declaration metadata before changing resolver behavior.

## No-Go Rules

- ambient-only overload/signature sets keep fallback.
- .d.ts overload/signature sets keep fallback.
- no-implementation overload/signature sets keep fallback.
- type/value/namespace collisions keep fallback.

## Safe Tie-Break Prerequisites

- all candidates are in the same resolved target file.
- all candidates are runtime/value compatible function declarations.
- candidate metadata exposes hasBody=true or declarationForm=implementation.
- exactly one candidate is marked as the implementation declaration.
- target file is not a .d.ts declaration file.

## Fixture Coverage

- Overload signatures plus one implementation: 0
- Ambient-only or no implementation: 12
- .d.ts overload set: 0
- Type/value namespace collision: 10

## Parallel Tooling

- #375: RSS sampling tooling follow-up; not a blocker for this semantic decision.

## 36. 2026-06-21-ts-type-value-namespace-collision-current-decision.md

# Type/Value/Namespace Collision Semantic Decision - Current Repo

Generated: 2026-06-21T11:10:00.000Z

## Inputs

- Taxonomy: `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-current-taxonomy.json`
- Profile: `docs/benchmarks/2026-06-21-ts-overload-implementation-current.profile.json`
- Database: `.zcodegraph/zcodegraph.db`
- Source files read: 0
- Resolver behavior changed: false
- Performance claim: none

## Decision

The current repo has no direct export candidate-multiple samples for this
semantic decision slice. Treat this run as deterministic no-regression and
tooling evidence only.

Positive subtype evidence comes from the VS Code sparse checkout decision.

## 37. 2026-06-21-ts-type-value-namespace-collision-current-taxonomy.md

# ESM Direct Export Candidate-Multiple Taxonomy
Generated: 2026-06-21T11:03:49.369Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-overload-implementation-current.profile.json`
- Database: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/.zcodegraph/zcodegraph.db`
- Source root: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph`
- Source files read for bounded syntax metadata: 0
- Database opened: true
- Sample source unavailable: No direct export candidate-multiple samples found
## Summary
- Rows inspected: 0
- Largest subtype: none
- Recommended next slice: no samples available
- Overload implementation resolved refs: 0
## Subtypes
| Subtype | Count | Decision |
| --- | ---: | --- |

## Decision

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: none
- No-go subtypes: none

## Collision Subtypes

| Collision subtype | Count | Recommendation |
| --- | ---: | --- |

## Examples

## 38. 2026-06-21-ts-type-value-namespace-collision-semantic-closeout-decision.md

# Type/Value/Namespace Collision Semantic Closeout

Date: 2026-06-21

## Scope

This closeout covers the final semantic-decision slice under #295:

- #386 Add type/value/namespace collision semantic fixtures
- #387 Extend candidate-multiple taxonomy with type/value/namespace collision subtypes
- #388 Generate type/value/namespace collision evidence on current repo and VS Code sparse
- #389 Write type/value/namespace collision semantic decision closeout

The slice does not change production resolver behavior.

## Decision

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

## Evidence

Current repo:

- Taxonomy: `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-current-taxonomy.json`
- Decision: `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Result: no direct export candidate-multiple samples; useful as deterministic
  no-regression/tooling evidence only.

VS Code sparse:

- Corpus: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`
- Taxonomy: `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-vscode-sparse-taxonomy.json`
- Decision: `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

VS Code sparse result:

- Rows inspected: 100
- `value-token-plus-interface`: 81
- `function-overload-signature`: 17
- `ambient-declaration-merge`: 2
- Source files read for bounded syntax metadata: 23

For the 81 `value-token-plus-interface` samples:

- import form: `named-value-import` = 81
- candidate shape: `constant-interface` = 81
- usage/context hints:
  - `decorator-token` = 63
  - `type-position` = 7
  - `unknown` = 11

## No-Go Boundaries

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

## PRD Boundary

This is the final evidence slice under #295. The evidence identifies a plausible
successor implementation candidate, but #295 should not expand into that
implementation.

After this closeout, #295 should close with successor work moved out to a new
plan or tracker.

## 39. 2026-06-21-ts-type-value-namespace-collision-vscode-sparse-decision.md

# Type/Value/Namespace Collision Semantic Decision - VS Code Sparse

Generated: 2026-06-21T11:10:00.000Z

## Inputs

- Taxonomy: `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-vscode-sparse-taxonomy.json`
- Profile: `docs/benchmarks/2026-06-21-ts-overload-implementation-vscode-sparse.profile.json`
- Database: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- Source root: `/private/tmp/codegraph-corpus/vscode-sparse`
- VS Code sparse commit: `4a6e32fc1f0`
- Source files read for bounded syntax metadata: 23
- Resolver behavior changed: false
- Performance claim: none

## Evidence

- Rows inspected: 100
- `value-token-plus-interface`: 81
- `function-overload-signature`: 17
- `ambient-declaration-merge`: 2
- Overload implementation resolved refs from previous slice: 3766

`value-token-plus-interface` is the dominant remaining collision subtype. In
the capped sample, all 81 collision samples have:

- import form: `named-value-import`
- candidate shape: `constant-interface`

Bounded usage/context hints for those 81 samples:

- `decorator-token`: 63
- `type-position`: 7
- `unknown`: 11

Artifacts do not include source snippets or source lines.

## Decision

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

## No-Go Boundaries

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

## 40. 2026-06-21-ts-type-value-namespace-collision-vscode-sparse-taxonomy.md

# ESM Direct Export Candidate-Multiple Taxonomy
Generated: 2026-06-21T11:03:50.060Z
## Source
- Profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-ts-overload-implementation-vscode-sparse.profile.json`
- Database: `/private/tmp/codegraph-corpus/vscode-sparse/.zcodegraph/zcodegraph.db`
- Source root: `/private/tmp/codegraph-corpus/vscode-sparse`
- Source files read for bounded syntax metadata: 23
- Database opened: true
## Summary
- Rows inspected: 100
- Largest subtype: value-token-plus-interface
- Recommended next slice: candidate for next routing slice: value-token-plus-interface
- Overload implementation resolved refs: 3766
## Subtypes
| Subtype | Count | Decision |
| --- | ---: | --- |
| ambient-declaration-merge | 2 | prerequisite-first |
| function-overload-signature | 17 | prerequisite-first |
| value-token-plus-interface | 81 | needs-more-metadata |

## Decision

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: ambient-declaration-merge, function-overload-signature
- No-go subtypes: none

## Collision Subtypes

| Collision subtype | Count | Recommendation |
| --- | ---: | --- |
| value-token-plus-interface | 81 | candidate-for-next-routing-slice |

## Examples

### ambient-declaration-merge

- `isAbsolute` from `src/vs/base/common/extpath.ts` (typescript:7:0) -> `src/vs/base/common/path.ts` kinds=variable|constant
- `relativePath` from `src/vs/base/test/common/resources.test.ts` (typescript:9:0) -> `src/vs/base/common/resources.ts` kinds=constant

### function-overload-signature

- `dispose` from `src/vs/base/browser/ui/actionbar/actionbar.ts` (typescript:14:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/breadcrumbs/breadcrumbsWidget.ts` (typescript:13:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `mnemonicButtonLabel` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:18:0) -> `src/vs/base/common/labels.ts` kinds=function
- `h` from `src/vs/base/browser/ui/dropdown/dropdownActionViewItem.ts` (typescript:15:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/list/listWidget.ts` (typescript:23:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/menu/menubar.ts` (typescript:20:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `h` from `src/vs/base/browser/ui/pixelSpinner/pixelSpinner.ts` (typescript:6:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/scrollbar/scrollableElement.ts` (typescript:17:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/splitview/splitview.ts` (typescript:13:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `h` from `src/vs/base/browser/ui/tree/abstractTree.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function

### value-token-plus-interface

- `IAccessibilityService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:11:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface import=named-value-import context=type-position shape=constant-interface
- `IConfigurationService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:12:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface import=named-value-import context=decorator-token shape=constant-interface
- `IContextKeyService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:13:0) -> `src/vs/platform/contextkey/common/contextkey.ts` kinds=constant|interface import=named-value-import context=decorator-token shape=constant-interface
- `ILayoutService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:14:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface import=named-value-import context=decorator-token shape=constant-interface
- `IConfigurationService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:10:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `IContextKeyService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:12:0) -> `src/vs/platform/contextkey/common/contextkey.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `ILayoutService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:14:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `IAccessibilityService` from `src/vs/platform/accessibility/test/common/testAccessibilityService.ts` (typescript:7:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface import=named-value-import context=type-position shape=constant-interface
- `IAccessibilityService` from `src/vs/platform/accessibilitySignal/browser/accessibilitySignalService.ts` (typescript:14:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface import=named-value-import context=decorator-token shape=constant-interface
- `IConfigurationService` from `src/vs/platform/accessibilitySignal/browser/accessibilitySignalService.ts` (typescript:15:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface import=named-value-import context=decorator-token shape=constant-interface

## 41. 2026-06-21-value-token-interface-current-taxonomy.md

# ESM Direct Export Candidate-Multiple Taxonomy
Generated: 2026-06-21T14:41:45.452Z
## Source
- Profile: `/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-zcodegraph-rust-profile-uB52ia/.zcodegraph/value-token-interface-rust-profile.json`
- Database: `/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-zcodegraph-rust-profile-uB52ia/.zcodegraph/zcodegraph.db`
- Source root: `/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-zcodegraph-rust-profile-uB52ia`
- Source files read for bounded syntax metadata: 0
- Database opened: true
- Sample source unavailable: No direct export candidate-multiple samples found
## Summary
- Rows inspected: 0
- Largest subtype: none
- Recommended next slice: no samples available
- Overload implementation resolved refs: 0
## Subtypes
| Subtype | Count | Decision |
| --- | ---: | --- |

## Decision

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: none
- No-go subtypes: none

## Collision Subtypes

| Collision subtype | Count | Recommendation |
| --- | ---: | --- |

## Examples

## 42. 2026-06-21-value-token-interface-routing-closeout.md

# Value Token Interface Routing Closeout

Date: 2026-06-21

## Parent

- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Issues: #403, #404, #405, #406
- Tracker: #165
- Predecessor decision:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Decision

Conclusion: `keep-with-caveat`.

The guarded routing mechanism is safe enough to keep because deterministic
fixtures prove the intended semantics and VS Code sparse produces Rust-owned
`rust-esm-value-token-interface` edges for the service-token pattern.

The caveat is important: this does not close the whole
`value-token-plus-interface` bucket. The residual capped taxonomy sample still
contains many `value-token-plus-interface` fallbacks, mostly contexts that this
plan intentionally left as fallback. The next plan should not treat this slice
as a completed burndown of the collision family.

## What Changed

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

## Evidence

Artifacts:

- Profile summary:
  `docs/benchmarks/2026-06-21-value-token-interface-routing.profile.json`
- Current repo taxonomy:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- VS Code sparse taxonomy:
  `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

Deterministic fixture:

- `__tests__/rust-index-engine-cli.test.ts`
  `routes guarded value-token plus interface imports only when value usage is visible`
- Covers JSX-style value usage, decorator-token usage, `import type`, named
  import with type-position-only usage, and unknown usage.

Current repo targeted evidence:

- Source: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph`
- Files: 307
- Nodes: 15,663
- Edges: 33,436
- `rust-esm-value-token-interface` edges: 0
- Residual direct-export candidate-multiple taxonomy rows inspected: 0

VS Code sparse targeted evidence:

- Source: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit: `4a6e32fc1f0`
- Files: 5,780
- Nodes: 327,425
- Edges: 905,484
- `rust-esm-value-token-interface` edges: 10,235
- Residual direct-export candidate-multiple taxonomy rows inspected: 100
- Residual subtype counts:
  - `value-token-plus-interface`: 80
  - `function-overload-signature`: 17
  - `ambient-declaration-merge`: 3

RSS:

- Direct CLI profile evidence did not collect RSS.
- The comparison profile path remains sandbox-limited for RSS because process
  list access is unavailable in this environment.

## Interpretation

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

## Follow-Up

Update #165 with this closeout and continue to the TypeScript
finalization/reference-resolution tail boundary plan.

## 43. 2026-06-21-value-token-interface-vscode-sparse-taxonomy.md

# ESM Direct Export Candidate-Multiple Taxonomy
Generated: 2026-06-21T14:41:47.857Z
## Source
- Profile: `/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-sparse-rust-profile-TxJ39s/.zcodegraph/value-token-interface-rust-profile.json`
- Database: `/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-sparse-rust-profile-TxJ39s/.zcodegraph/zcodegraph.db`
- Source root: `/var/folders/bk/25klw83n5wn38lj2m3wbr9fc0000gn/T/zcodegraph-rust-profile-vscode-sparse-rust-profile-TxJ39s`
- Source files read for bounded syntax metadata: 24
- Database opened: true
## Summary
- Rows inspected: 100
- Largest subtype: value-token-plus-interface
- Recommended next slice: candidate for next routing slice: value-token-plus-interface
- Overload implementation resolved refs: 3766
## Subtypes
| Subtype | Count | Decision |
| --- | ---: | --- |
| ambient-declaration-merge | 3 | prerequisite-first |
| function-overload-signature | 17 | prerequisite-first |
| value-token-plus-interface | 80 | needs-more-metadata |

## Decision

- Bounded tie-break candidates: none
- Prerequisite-first subtypes: ambient-declaration-merge, function-overload-signature
- No-go subtypes: none

## Collision Subtypes

| Collision subtype | Count | Recommendation |
| --- | ---: | --- |
| value-token-plus-interface | 80 | candidate-for-next-routing-slice |

## Examples

### ambient-declaration-merge

- `isAbsolute` from `src/vs/base/common/extpath.ts` (typescript:7:0) -> `src/vs/base/common/path.ts` kinds=variable|constant
- `relativePath` from `src/vs/base/test/common/resources.test.ts` (typescript:9:0) -> `src/vs/base/common/resources.ts` kinds=constant
- `relativePath` from `src/vs/platform/agentHost/node/agentHostFileCompletionProvider.ts` (typescript:10:0) -> `src/vs/base/common/resources.ts` kinds=constant

### function-overload-signature

- `dispose` from `src/vs/base/browser/ui/actionbar/actionbar.ts` (typescript:14:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/breadcrumbs/breadcrumbsWidget.ts` (typescript:13:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `mnemonicButtonLabel` from `src/vs/base/browser/ui/dialog/dialog.ts` (typescript:18:0) -> `src/vs/base/common/labels.ts` kinds=function
- `h` from `src/vs/base/browser/ui/dropdown/dropdownActionViewItem.ts` (typescript:15:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/list/listWidget.ts` (typescript:23:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/menu/menubar.ts` (typescript:20:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `h` from `src/vs/base/browser/ui/pixelSpinner/pixelSpinner.ts` (typescript:6:0) -> `src/vs/base/browser/dom.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/scrollbar/scrollableElement.ts` (typescript:17:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `dispose` from `src/vs/base/browser/ui/splitview/splitview.ts` (typescript:13:0) -> `src/vs/base/common/lifecycle.ts` kinds=function
- `h` from `src/vs/base/browser/ui/tree/abstractTree.ts` (typescript:7:0) -> `src/vs/base/browser/dom.ts` kinds=function

### value-token-plus-interface

- `IAccessibilityService` from `src/vs/platform/accessibility/browser/accessibilityService.ts` (typescript:11:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface import=named-value-import context=type-position shape=constant-interface
- `IConfigurationService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:10:0) -> `src/vs/platform/configuration/common/configuration.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `IContextKeyService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:12:0) -> `src/vs/platform/contextkey/common/contextkey.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `ILayoutService` from `src/vs/platform/accessibility/test/browser/accessibilityService.test.ts` (typescript:14:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `IAccessibilityService` from `src/vs/platform/accessibility/test/common/testAccessibilityService.ts` (typescript:7:0) -> `src/vs/platform/accessibility/common/accessibility.ts` kinds=constant|interface import=named-value-import context=type-position shape=constant-interface
- `IContextViewService` from `src/vs/platform/actionWidget/test/browser/actionList.test.ts` (typescript:13:0) -> `src/vs/platform/contextview/browser/contextView.ts` kinds=constant|interface import=named-value-import context=type-position shape=constant-interface
- `IHoverService` from `src/vs/platform/actionWidget/test/browser/actionList.test.ts` (typescript:14:0) -> `src/vs/platform/hover/browser/hover.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `IKeybindingService` from `src/vs/platform/actionWidget/test/browser/actionList.test.ts` (typescript:18:0) -> `src/vs/platform/keybinding/common/keybinding.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface
- `ILayoutService` from `src/vs/platform/actionWidget/test/browser/actionList.test.ts` (typescript:19:0) -> `src/vs/platform/layout/browser/layoutService.ts` kinds=constant|interface import=named-value-import context=type-position shape=constant-interface
- `IOpenerService` from `src/vs/platform/actionWidget/test/browser/actionList.test.ts` (typescript:20:0) -> `src/vs/platform/opener/common/opener.ts` kinds=constant|interface import=named-value-import context=unknown shape=constant-interface

## 44. 2026-06-22-direct-esm-named-import-export-part1-closeout.md

# Direct ESM Named Import/Export Part 1 Closeout

Date: 2026-06-22

## Parent

- Issue: #426
- Baseline: `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Prior direct export closeouts:
  - `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
  - `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Decision

Decision: `keep`.

The selected direct named binding residual is:

```text
repo-local direct ESM named import/export where the target file has exactly one
matching exported declaration or same-file export-specifier declaration
```

This behavior is already implemented and covered by deterministic fixtures. No
new production behavior is required for #426.

## Implemented Scope

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

## Deterministic Fixture Coverage

Coverage exists in `__tests__/rust-index-engine-cli.test.ts`:

- direct ESM named imports;
- paths-alias ESM named imports;
- declaration-style ESM named exports with TypeScript modifiers;
- same-file ESM export specifiers;
- bounded ESM named binding fallback samples.

Fallback taxonomy coverage exists in:

- `__tests__/rust-esm-fallback-taxonomy.test.ts`
- `__tests__/rust-esm-candidate-multiple-taxonomy.test.ts`

## Evidence

Current repo after the direct export burndown:

| Field | Count |
| --- | ---: |
| `esmNamedImportExportResolvedRefs` | 2,454 |
| `esmNamedImportExportFallbackRefs` | 1,846 |
| `direct-export-candidate-zero` | 49 |
| `package-or-runtime-binding` | 1,233 |
| `type-only-import` | 228 |
| `unsupported-import-shape` | 329 |

VS Code sparse after the direct export burndown:

| Field | Count |
| --- | ---: |
| `esmNamedImportExportResolvedRefs` | 121,566 |
| `esmNamedImportExportFallbackRefs` | 40,039 |
| `direct-export-candidate-multiple` | 16,384 |
| `direct-export-candidate-zero` | 10,864 |
| `same-file-export-specifier-candidate-zero` | 58 |
| `package-or-runtime-binding` | 1,965 |
| `type-only-import` | 2,759 |
| `unsupported-import-shape` | 2,083 |

## Interpretation

The bounded direct named path is keepable.

The largest remaining direct named residual is not a simple missing file-level
lookup. VS Code sparse is dominated by candidate-multiple and candidate-zero
cases. Candidate-multiple requires a separate semantic decision for overloads,
ambient declarations, and type/value namespace collisions. Candidate-zero
requires better evidence about why the declaration is absent before changing
selection behavior.

## Part 2 Boundary

Package/runtime bindings are explicitly Part 2. #426 does not solve package
imports, runtime builtins, package `exports`/`imports`, `node_modules`, or full
TypeScript `moduleResolution`.

## Closeout

#426 closes as `keep` for the bounded direct named import/export behavior.

Residuals:

- direct candidate-multiple: `needs-architecture`;
- direct candidate-zero: `no-go` until a narrower diagnostic identifies a safe
  implementation target;
- package/runtime binding: `handoff-to-Part2`.

## 45. 2026-06-22-filenodes-routing-residual-audit.md

# FileNodes Routing Residual Audit

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- PlanB-1 plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- QualifiedName evidence:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Residual map:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Decision

Decision: `handoff-to-import-file-plan`.

`FileNodes` candidate-producer on-demand routing is mechanically safe in the
available evidence, but it should not be closed as an independent resolver
semantic residual inside PlanB.

The shape belongs with the next route: **Import/File-Level Resolver Completion
Plan**.

## Evidence Source

This audit reuses the PlanB-1 targeted profile artifacts:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json`
- `docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json`

No additional VS Code sparse profile was run. The reused artifacts already
exercised the same candidate-producer routing stack, local-config state,
fallback taxonomy, and graph-readable status required for this audit.

## Current Repository Read

Routing diagnostics:

| Field | Value |
| --- | --- |
| routing active | true |
| active shapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| fallback reason | null |
| mismatch count | 0 |
| `onDemandLookupShapeCounts.FileNodes` | 32 |

Fallback taxonomy:

| Reason | Count |
| --- | ---: |
| binding-level-symbol-disambiguation-not-yet-rust-owned | 1890 |
| unsupported-import-form-not-yet-rust-owned | 44 |
| unresolved-file-level-import-target | 6 |

Graph-readable status after the reused profile:

| Field | Value |
| --- | ---: |
| files | 313 |
| nodes | 16054 |
| edges | 34636 |

## VS Code Sparse Read

Checkout:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Git commit: `4a6e32fc1f0`

Routing diagnostics:

| Field | Value |
| --- | --- |
| routing active | true |
| active shapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| fallback reason | null |
| mismatch count | 0 |
| `onDemandLookupShapeCounts.FileNodes` | 1247 |

Fallback taxonomy:

| Reason | Count |
| --- | ---: |
| binding-level-symbol-disambiguation-not-yet-rust-owned | 28909 |
| unsupported-import-form-not-yet-rust-owned | 35 |
| unresolved-file-level-import-target | 5418 |

Graph-readable status after the reused profile:

| Field | Value |
| --- | ---: |
| files | 5780 |
| nodes | 327425 |
| edges | 905484 |

## Interpretation

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

## Boundary

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

## Handoff

Next route:

- **Import/File-Level Resolver Completion Plan**

That route should own:

- `FileNodes` handoff;
- unresolved file-level import target taxonomy;
- supported ESM/import-export residuals;
- relative/path-alias import target boundaries;
- source-file fallback interactions.

That route should still exclude package resolution unless separately approved.

## 46. 2026-06-22-import-file-completion-map-baseline.md

# Import/File Completion Map And Fallback Taxonomy Baseline

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Issue: #424
- Plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- PlanB closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Decision

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

## Boundary Map

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

## Baseline Evidence

Current repo profile:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json`

VS Code sparse profile:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json`
- Corpus: `/private/tmp/codegraph-corpus/vscode-sparse`
- Commit recorded by prior evidence: `4a6e32fc1f0`

No new VS Code sparse clone was attempted.

## Current Repo Taxonomy

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

## VS Code Sparse Taxonomy

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

## RSS

RSS was not re-sampled for this baseline. The reused targeted profile family has
existing measurement sidecars that record RSS as unavailable due sandboxed
process-list access, for example:

```text
RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)
```

## Closeout

This baseline satisfies #424:

- Part 1 versus Part 2 is frozen;
- package/runtime resolution is explicitly Part 2;
- current repo and VS Code sparse evidence are recorded from existing targeted
  profiles;
- fallback taxonomy separates repo-local, package/runtime, unsupported, and
  unknown/needs-architecture buckets;
- the first target is repo-local file-level import target fallback.

## 47. 2026-06-22-import-file-resolver-completion-part1-final-closeout.md

# Import/File Resolver Completion Part 1 Final Closeout

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Issue: #429
- Plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`

## Decision

Decision: `complete-with-Part2-handoff`.

Import/File-Level Resolver Completion Plan Part 1 is complete for repo-local
source import/file resolver scope.

Package/runtime resolution is not solved by Part 1. It is handed to Part 2.

## Slice Decisions

| Issue | Slice | Decision | Artifact |
| --- | --- | --- | --- |
| #424 | completion map and fallback taxonomy baseline | keep-baseline | `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md` |
| #425 | repo-local file-level import target burndown | no-go | `docs/benchmarks/2026-06-24-rust-native-typescript-module-resolution-consolidated-evidence.md` |
| #426 | direct ESM named import/export residual burndown | keep | `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md` |
| #427 | one-hop barrel re-export residual burndown | keep | `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md` |
| #428 | source-file fallback and FileNodes integration | keep | `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md` |

## Final Classification

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

## Part 2 Tracker

Part 2 tracker:

```text
#430
```

Part 2 must be a separate plan/issue route. Part 1 does not silently solve,
dismiss, or permanently exclude package/runtime resolution.

## Validation

Targeted deterministic validation for Part 1:

```bash
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "resolves JS/TS relative and paths-alias imports as Rust-owned file-level edges|resolves paths-alias ESM named imports to exported target-file symbols as Rust-owned edges|resolves one-hop ESM named re-exports to final leaf symbols as Rust-owned edges|resolves paths-alias one-hop ESM named re-exports to final leaf symbols as Rust-owned edges|emits bounded ESM named binding fallback samples in the profile artifact"
npx vitest run __tests__/rust-esm-fallback-taxonomy.test.ts __tests__/rust-esm-candidate-multiple-taxonomy.test.ts __tests__/rust-import-target-taxonomy.test.ts
```

## Tracker Update

#165 should read this route as complete for Part 1.

Next route:

```text
Import/File-Level Resolver Completion Plan Part 2: package/runtime resolver
completion
```

## 48. 2026-06-22-one-hop-barrel-reexport-part1-closeout.md

# One-Hop Barrel Re-Export Part 1 Closeout

Date: 2026-06-22

## Parent

- Issue: #427
- Baseline: `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Related closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Decision

Decision: `keep`.

The selected one-hop residual category is:

```text
repo-local one-hop direct re-export where the barrel specifier resolves to a
repo-local source file and the leaf file has exactly one matching exported
symbol
```

The behavior is already implemented and covered. It writes edges to the final
leaf exported symbol, not to the barrel export node.

## Implemented Scope

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

## Deterministic Fixture Coverage

Coverage exists in `__tests__/rust-index-engine-cli.test.ts`:

- `resolves one-hop ESM named re-exports to final leaf symbols as Rust-owned edges`
- `resolves paths-alias one-hop ESM named re-exports to final leaf symbols as Rust-owned edges`
- `emits bounded ESM named binding fallback samples in the profile artifact`

The fallback test covers:

- `reexport-specifier-target-not-found`;
- `reexport-leaf-candidate-zero`;
- package/runtime binding fallback.

## Evidence

Current repo:

| Field | Count |
| --- | ---: |
| `esmOneHopReexportResolvedRefs` | 283 |
| `reexportCandidateGap` | 0 in sampled taxonomy |

VS Code sparse:

| Field | Count |
| --- | ---: |
| `esmOneHopReexportResolvedRefs` | 439 |
| `reexport-leaf-candidate-zero` | 123 |
| `reexport-leaf-candidate-multiple` | 20 |

## Interpretation

The bounded one-hop direct barrel behavior is keepable.

The remaining one-hop residual is not safe to broaden here:

- candidate-zero needs proof that extraction, file-target resolution, or export
  discovery missed a specific supported declaration shape;
- candidate-multiple needs semantic target-selection rules and must not use
  source-order or pick-first behavior;
- multi-hop chains remain outside Part 1 by default.

## Part 2 Boundary

Package/runtime re-exports remain Part 2 or unsupported taxonomy. This slice
does not add package imports, Node/runtime builtins, package `exports`/`imports`,
`node_modules`, or full TypeScript `moduleResolution`.

## Closeout

#427 closes as `keep` for bounded repo-local one-hop direct re-export behavior.

Residuals:

- one-hop leaf candidate-zero: `no-go` without narrower extraction/target
  evidence;
- one-hop leaf candidate-multiple: `needs-architecture`;
- package/runtime re-export: `handoff-to-Part2`;
- multi-hop barrel chain: outside Part 1 unless separately approved.

## 49. 2026-06-22-qualifiedname-routing-residual-baseline.md

# QualifiedName Routing Residual Baseline

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Issue: #420

## Baseline Decision

`QualifiedName` candidate-producer routing is already implemented as a guarded
on-demand routing shape. PlanB-1 should audit it as a resolver semantic
residual rather than reimplementing routing.

This baseline is evidence-only by default. Production code may change only if
the audit cannot be completed with current diagnostics or deterministic tests.

## Current Routing Surface

The candidate protocol currently has these routing surfaces:

- pre-collected Rust candidate producer lookups:
  - `ExactName`
  - `KnownNamePresence`
  - `LowerName`
- on-demand Rust candidate producer node lookups:
  - `LowerName`
  - `QualifiedName`
  - `FileNodes`
- routed exact-name lookup:
  - `ExactName`

`QualifiedName` is routed through the on-demand node lookup path. If routing is
active and the lookup misses the local cache, the provider asks the Rust
candidate producer for one `QualifiedName` key, hydrates returned node ids, and
compares the returned id set against the TypeScript baseline lookup before
serving it.

## Fail-Closed Contract

`QualifiedName` routing must fail closed to the TypeScript baseline when any of
these occur:

- local config disables candidate-producer routing;
- index path is missing;
- Rust producer fails;
- Rust producer returns invalid or incomplete data;
- Rust result for the requested `QualifiedName` is missing;
- returned node ids cannot be hydrated;
- Rust candidate id set differs from the TypeScript baseline candidate id set.

When fail-closed behavior triggers, the resolver must preserve TypeScript
target selection semantics.

## Diagnostics Contract

The audit must record:

- `candidateProtocol.rustCandidateProducer.routing.configured`
- `candidateProtocol.rustCandidateProducer.routing.source`
- `candidateProtocol.rustCandidateProducer.routing.active`
- `candidateProtocol.rustCandidateProducer.routing.activeShapes`
- `candidateProtocol.rustCandidateProducer.routing.fallbackReason`
- `candidateProtocol.rustCandidateProducer.routing.mismatchCount`
- `candidateProtocol.rustCandidateProducer.routing.mismatchSamples`
- `candidateProtocol.rustCandidateProducer.routing.onDemandLookupCount`
- `candidateProtocol.rustCandidateProducer.routing.onDemandLookupShapeCounts.QualifiedName`
- fallback taxonomy entries
- graph-readable status or unavailable reason
- RSS or unavailable reason

## Out Of Scope

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

## Gates

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

## Baseline Read

Prior complete-routing boundary evidence already showed `QualifiedName`
on-demand routing can run safely behind local config:

- current repo: `onDemandLookupShapeCounts.QualifiedName = 320`, mismatch `0`;
- VS Code sparse: `onDemandLookupShapeCounts.QualifiedName = 445`, mismatch `0`.

PlanB-1 still requires fresh targeted evidence because the goal is to decide
whether `QualifiedName` should count as a kept resolver semantic residual slice
in the post-PlanA route.

## 50. 2026-06-22-qualifiedname-routing-residual-closeout-decision.md

# QualifiedName Routing Residual Closeout Decision

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Baseline:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Evidence:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Issues: #420, #421, #422

## Decision

Decision: `keep`.

`QualifiedName` candidate-producer on-demand routing is safe to count as a kept
resolver semantic residual slice behind the existing local-config experimental
routing gate.

This decision does not make candidate-producer routing a stable public API and
does not claim a performance win.

## Why Keep

The targeted evidence shows:

- current repository exercised 21 on-demand `QualifiedName` routed lookups;
- VS Code sparse exercised 40 on-demand `QualifiedName` routed lookups;
- routing was active on both targets;
- active shapes included `QualifiedName`;
- routing fallback reason was null on both targets;
- routing mismatch count was zero on both targets;
- graph-readable rust-hybrid status was preserved on both targets;
- fallback taxonomy remained visible and explainable.

No production code change was needed to make the decision.

## Semantic Boundary

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

## Validation

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

## Caveats

- Runs used targeted profile/smoke only, not a full scoreboard.
- No agent A/B was run.
- RSS was unavailable because these targeted CLI runs did not enable a
  process-tree RSS sampler.
- Host Node emitted the existing unsafe Node warning and completed under
  `CODEGRAPH_ALLOW_UNSAFE_NODE=1`.

## #165 Update

#165 should treat `QualifiedName` routing as closed/keep for the resolver
semantic residual map.

The next routing-shaped residual should not be another `QualifiedName` slice.
The remaining useful route is to decide whether `FileNodes` is a semantic slice
or whether it belongs with import/file-level resolver residuals.

## 51. 2026-06-22-qualifiedname-routing-residual-evidence.md

# QualifiedName Routing Residual Evidence

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Baseline:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Issue: #421

## Scope

This artifact records targeted evidence for the `QualifiedName`
candidate-producer on-demand routing semantic residual.

No production code was changed for this evidence run. No full scoreboard or
agent A/B was run.

## Current Repository

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json \
  node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Profile artifact:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json`

Graph-readable status after run:

| Field | Value |
| --- | ---: |
| files | 313 |
| nodes | 16054 |
| edges | 34636 |
| backend | node-sqlite |
| engine | rust-hybrid |

Reference-resolution profile:

| Field | Value |
| --- | ---: |
| `typescriptFinalizationMs` | 31023 |
| `referenceResolutionMs` | 29695 |
| `candidateLookupMs` | 26336 |
| `nameMatcherCandidateLookupDbMs` | 26328 |
| `perReferenceDisambiguationMs` | 97 |

Routing diagnostics:

| Field | Value |
| --- | --- |
| configured | true |
| source | local-config |
| active | true |
| activeShapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| fallbackReason | null |
| mismatchCount | 0 |
| mismatchSamples | empty |
| onDemandLookupCount | 74 |
| `onDemandLookupShapeCounts.QualifiedName` | 21 |

Fallback taxonomy:

| Stage | Reason | Count |
| --- | --- | ---: |
| framework-post-extract | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | typescript-finalization-not-yet-migrated | 1 |
| dynamic-dispatch-synthesis | typescript-finalization-not-yet-migrated | 1 |
| db-maintenance | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | binding-level-symbol-disambiguation-not-yet-rust-owned | 1890 |
| reference-resolution | unsupported-import-form-not-yet-rust-owned | 44 |
| reference-resolution | unresolved-file-level-import-target | 6 |

RSS:

- unavailable reason: this targeted CLI profile did not enable a process-tree
  RSS sampler. RSS is recorded as unavailable rather than inferred.

## VS Code Sparse

Checkout:

- `/private/tmp/codegraph-corpus/vscode-sparse`
- Git commit: `4a6e32fc1f0`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json \
  node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js \
  index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Profile artifact:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json`

Graph-readable status after run:

| Field | Value |
| --- | ---: |
| files | 5780 |
| nodes | 327425 |
| edges | 905484 |
| backend | node-sqlite |
| engine | rust-hybrid |

Reference-resolution profile:

| Field | Value |
| --- | ---: |
| `typescriptFinalizationMs` | 316860 |
| `referenceResolutionMs` | 274337 |
| `candidateLookupMs` | 221856 |
| `nameMatcherCandidateLookupDbMs` | 221482 |
| `perReferenceDisambiguationMs` | 14560 |

Routing diagnostics:

| Field | Value |
| --- | --- |
| configured | true |
| source | local-config |
| active | true |
| activeShapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| fallbackReason | null |
| mismatchCount | 0 |
| mismatchSamples | empty |
| onDemandLookupCount | 1308 |
| `onDemandLookupShapeCounts.QualifiedName` | 40 |

Fallback taxonomy:

| Stage | Reason | Count |
| --- | --- | ---: |
| framework-post-extract | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | typescript-finalization-not-yet-migrated | 1 |
| dynamic-dispatch-synthesis | typescript-finalization-not-yet-migrated | 1 |
| db-maintenance | typescript-finalization-not-yet-migrated | 1 |
| reference-resolution | binding-level-symbol-disambiguation-not-yet-rust-owned | 28909 |
| reference-resolution | unsupported-import-form-not-yet-rust-owned | 35 |
| reference-resolution | unresolved-file-level-import-target | 5418 |

RSS:

- unavailable reason: this targeted CLI profile did not enable a process-tree
  RSS sampler. RSS is recorded as unavailable rather than inferred.

## Read

`QualifiedName` routing is exercised on both targets:

- current repository: 21 on-demand `QualifiedName` routed lookups;
- VS Code sparse: 40 on-demand `QualifiedName` routed lookups.

Both targets report:

- routing active;
- all expected active shapes visible;
- no routing fallback reason;
- zero routing mismatches;
- graph-readable rust-hybrid status after indexing.

This is enough to decide the `QualifiedName` residual without adding production
behavior. The evidence does not claim a performance improvement. The dominant
remaining profile fields are still broader candidate lookup and TypeScript
finalization/reference-resolution work.

## 52. 2026-06-22-resolver-semantic-planb-final-closeout.md

# Resolver Semantic PlanB Final Closeout

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- QualifiedName plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- QualifiedName closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- FileNodes audit:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Residual map:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Decision

PlanB is complete.

PlanB completed the resolver semantic residual routing-shape route by:

- keeping `QualifiedName` candidate-producer on-demand routing as a guarded
  semantic residual slice;
- auditing `FileNodes` candidate-producer on-demand routing and handing it off
  to the import/file-level resolver route;
- freezing what does and does not count as a PlanB resolver semantic residual;
- classifying known residuals into final buckets.

No production code was changed in the PlanB closeout.

## Residual Definition Freeze

PlanB owns:

- candidate lookup/routing shape parity against the TypeScript baseline;
- local-config candidate-producer routing safety;
- evidence-only semantic residual decisions for already-routed shapes;
- fallback taxonomy classification when it determines whether a routing shape
  is safe to keep, no-go, or hand off.

PlanB does not own:

- package resolution;
- framework post-extract migration;
- dynamic-dispatch synthesis migration;
- broad overload/namespace/type-value disambiguation;
- source-order or pick-first target selection;
- performance-only candidate lookup optimization;
- full import/file-level resolver completion.

Boundary rule:

- if a residual requires changing which target node id is selected, it is no
  longer a PlanB evidence-only routing slice and must move to an architecture
  or dedicated resolver-completion plan.

## Final Residual Classification

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

## FileNodes Result

FileNodes evidence reused the PlanB-1 targeted profile artifacts:

- current repository: `onDemandLookupShapeCounts.FileNodes = 32`;
- VS Code sparse: `onDemandLookupShapeCounts.FileNodes = 1247`;
- routing fallback reason: null;
- routing mismatch count: 0;
- graph-readable status: preserved.

Decision: `handoff-to-import-file-plan`.

Rationale:

- FileNodes routing is mechanically safe in the available evidence;
- its usage is high enough to matter;
- its semantic interpretation overlaps unresolved file-level import targets,
  relative/path-alias import target lookup, supported ESM/import-export
  residuals, and source-file fallback behavior;
- treating it as independently kept in PlanB would hide the next real boundary.

## Next Route

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

## Validation

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

## Tracker Update

#165 should now read PlanB as complete.

Future work should not add more PlanB routing-shape issues by default. The next
work item should be a new Import/File-Level Resolver Completion Plan, unless a
new architecture decision changes the route.

## 53. 2026-06-22-resolver-semantic-residual-map.md

# Resolver Semantic Residual Map

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- QualifiedName closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- Issue: #423

## Decision Context

PlanB-1 kept the existing guarded `QualifiedName` candidate-producer
on-demand routing residual. The keep decision is semantic-safety scoped and
local-config scoped. It does not claim default-path performance improvement and
does not authorize broad disambiguation migration.

## Residual Buckets

### Closed / Keep

| Residual | State | Notes |
| --- | --- | --- |
| `QualifiedName` candidate-producer on-demand routing | keep | Exercised on current repo and VS Code sparse with zero routing mismatches. |
| `LowerName` local-config routing | keep-with-caveat | Mechanism exists and fail-closes, but prior default-on attempt was no-go for default path due candidate lookup cost. |
| Complete local-config candidate producer routing boundary | keep | Shapes and diagnostics are semantically keepable behind local config. |

### Needs Slice

| Residual | Recommended treatment |
| --- | --- |
| `FileNodes` candidate-producer on-demand routing | Next slice. It is heavily exercised on VS Code sparse, but semantic ownership overlaps file-level/import resolver behavior and needs its own audit. |
| ESM/import-export residuals | Needs one or more guarded slices only when they reuse existing relative/path-alias resolver boundaries and do not add package resolution. |
| Binding-level symbol disambiguation fallback | Needs a guarded semantic slice because it remains a large fallback taxonomy bucket. |
| Unresolved file-level import targets | Needs a separate import/file-level residual slice; do not merge with `QualifiedName`. |
| Unsupported import forms | Needs taxonomy-driven slice or explicit no-go depending on prevalence and agent sufficiency impact. |

### Needs Architecture

| Residual | Reason |
| --- | --- |
| Broad disambiguation migration | Requires per-reference replay/parity evidence and cannot be handled by a simple routing-shape audit. |
| Source-order or pick-first tie-break behavior | Disallowed as a speed shortcut; needs explicit semantic decision if ever considered. |
| Overload/namespace/type-value generalization | Needs separate semantic design because it can change which target node id is selected. |
| Framework post-extract migration | Explicitly outside the candidate-producer routing slice and tied to final graph ordering. |
| Dynamic-dispatch synthesis migration | Partial migration can regress agent sufficiency; needs separate end-to-end flow evidence. |
| Package resolution expansion | Out of scope for this route unless a new architecture decision changes resolver boundaries. |

## Slice Estimate

Estimated remaining resolver semantic residual work:

- **3-4 additional slices** before this route can be considered complete.

Suggested sequence:

1. `FileNodes` routing semantic residual audit.
2. Import/file-level residual slice covering unresolved file-level import
   targets and supported ESM/import-export boundaries.
3. Binding-level symbol disambiguation fallback slice.
4. Optional taxonomy/no-go slice for unsupported import forms, if the previous
   slices do not absorb or downgrade it.

This estimate stays within the previously agreed 2-4 range. PlanB-1 evidence
pushes the estimate toward the upper half because `FileNodes` is heavily
exercised on VS Code sparse (`1247` on-demand lookups) and overlaps import/file
resolver semantics enough to deserve its own audit.

## Next Recommended Slice

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

## Non-Goals

- No PlanB-2 issues are created by this artifact.
- No production behavior change is proposed here.
- No full scoreboard or agent A/B is required here.

## 54. 2026-06-22-source-file-filenodes-part1-closeout.md

# Source-File Fallback And FileNodes Part 1 Closeout

Date: 2026-06-22

## Parent

- Issue: #428
- Baseline: `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`
- FileNodes audit:
  `docs/benchmarks/2026-06-24-rust-hybrid-resolver-semantic-residuals-consolidated-evidence.md`

## Decision

Decision: `keep`.

FileNodes/source-file fallback is safe to keep as a routed lookup shape, but it
does not independently solve unresolved file-level import targets.

## Evidence

This closeout reuses the PlanB targeted profile artifacts:

- `docs/benchmarks/2026-06-22-qualifiedname-routing-current.profile.json`
- `docs/benchmarks/2026-06-22-qualifiedname-routing-vscode-sparse.profile.json`

No new VS Code sparse clone was attempted.

Current repo candidate protocol:

| Field | Value |
| --- | --- |
| active shapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| routing fallback reason | null |
| routing mismatch count | 0 |
| `onDemandLookupShapeCounts.FileNodes` | 32 |
| total `lookupShapeCounts.FileNodes` | 1,135 |

VS Code sparse candidate protocol:

| Field | Value |
| --- | --- |
| active shapes | ExactName, KnownNamePresence, LowerName, QualifiedName, FileNodes |
| routing fallback reason | null |
| routing mismatch count | 0 |
| `onDemandLookupShapeCounts.FileNodes` | 1,247 |
| total `lookupShapeCounts.FileNodes` | 1,515 |

## Interaction With File-Level Import Target Taxonomy

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

## RSS

RSS was not re-sampled for this closeout. Existing measurement sidecars for the
same evidence family record RSS as unavailable because process-list access is
sandboxed.

## Boundary

No package resolution expansion is introduced.

This closeout does not change:

- package imports;
- Node/runtime builtins;
- package `exports`/`imports`;
- `node_modules`;
- TypeScript full `moduleResolution`;
- target selection semantics;
- source-order or pick-first behavior.

## Closeout

#428 closes as `keep` for FileNodes/source-file fallback routing.

The unresolved file-level import target interaction remains classified by #425:

- `relative/file-node-not-found`: no-go until narrower pre-cleanup diagnostics;
- `relative/target-not-found`: no-go until narrower pre-cleanup diagnostics.

## 55. 2026-06-23-default-reexport-surface-semantics-decision.md

# Default Re-Export Surface Semantics Decision

Date: 2026-06-23

Issue: #467

## Decision

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

## Rationale

- This matches the export alias decision in #465: source/implementation symbols
  are the graph targets because they are what agents need to inspect.
- Creating separate surface nodes would require a broader export surface graph
  design touching query rendering, traversal, and impact semantics.
- Default re-export implementation is useful and bounded, but should be handled
  as a follow-up ready-for-agent issue rather than hidden inside the decision
  issue.

## Follow-Up

Create a ready-for-agent implementation issue for:

```text
Resolve default re-exports to leaf default-exported implementation symbols.
```

## Roadmap Impact

`1-7-2-5-2. default re-export surface semantics (#467)` can be marked complete
as a semantic decision.

The follow-up implementation should be added as a separate sub-node under
`1-7-2-5` and does not require schema changes.

## 56. 2026-06-23-esm-named-symbol-ready-agent-closeout.md

# ESM Named Symbol Ready-For-Agent Closeout

Date: 2026-06-23

## Scope

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

## Implemented

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

## Excluded

- Export alias surface name modeling.
- Default re-export surface semantics.
- Namespace import member semantics.
- Namespace export/re-export surface semantics.
- Third-party package or `node_modules` symbol indexing.
- Future type graph semantics.

## Evidence

Targeted Rust core tests:

```text
cargo test -p zcodegraph-core rust_index_preserves_js_ts_import_export_binding_refs_for_text_reuse
cargo test -p zcodegraph-core rust_index_writes_guarded_default_import_to_direct_default_export_edges
cargo test -p zcodegraph-core rust_index_writes_guarded_repo_local_package_named_symbol_edges
```

Full verification:

```text
cargo test -p zcodegraph-core
npm run build
cargo build -p zcodegraph-core
```

Current repo profile smoke:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-23-esm-named-symbol-ready-agent-current-repo.profile.json \
node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed current-repo ESM named import/export profile:

```json
{
  "resolved": 2518,
  "fallback": 2031,
  "oneHop": 293,
  "edgeWrite": {
    "attempted": 715,
    "written": 715,
    "skipped": 0,
    "skippedCounts": {}
  },
  "fallbackCounts": {
    "direct-default-export-candidate-zero": 23,
    "direct-export-candidate-zero": 65,
    "export-target-file-not-found": 68,
    "import-edge-target-not-found": 8,
    "package-or-runtime-binding": 1310,
    "type-only-import": 232,
    "unsupported-import-shape": 325
  },
  "fallbackSampleCap": {
    "perBucket": 100,
    "total": 2000,
    "truncated": true
  }
}
```

The Node 26 warning appeared during the smoke and was bypassed with
`CODEGRAPH_ALLOW_UNSAFE_NODE=1`, as expected for this local environment.

## Decision

The ready-for-agent implementation path for the reopened `1-7-2` node is
complete once the verification commands above pass.

`1-7-2` itself remains open until the ready-for-human semantic boundary issues
have durable decisions or no-go/deferred conclusions.

## 57. 2026-06-23-esm-named-symbol-reopen-closeout.md

# ESM Named Symbol Reopen Closeout

Date: 2026-06-23

Roadmap node: `1-7-2. ESM named symbol edges`

## Scope

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

## Decisions

- Graph edges target source/implementation symbols, not first-class exported
  surface alias nodes.
- Type-only import/export bindings do not write value graph symbol edges.
- Default imports and bounded default re-exports resolve to direct repo-local
  default-exported implementation symbols.
- Namespace import/export forms stay at file/module dependency semantics in
  this closeout; member-level namespace symbol resolution is deferred.
- Repo-local package-resolved named symbols are in scope; external
  package/runtime/builtin symbols and `node_modules` indexing are out of scope.

## Deferred

- Future type graph semantics.
- First-class export surface graph modeling.
- Namespace member-level symbol resolution.
- Third-party package / `node_modules` symbol indexing.

These remain outside the bounded `1-7-2` closeout and should be promoted
through separate plans if needed.

## Evidence

Rust core:

```text
cargo test -p zcodegraph-core

Result: passed, 79 tests.
```

Build:

```text
npm run build
cargo build -p zcodegraph-core

Result: passed.
```

Current repo rust-hybrid profile smoke:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-23-esm-named-symbol-reopen-current-repo.profile.json \
node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid

Result: passed. The local Node 26 warning was bypassed with
CODEGRAPH_ALLOW_UNSAFE_NODE=1, as expected for this environment.
```

Observed current-repo ESM named import/export profile:

```json
{
  "resolved": 2518,
  "fallback": 2031,
  "oneHop": 293,
  "edgeWrite": {
    "attempted": 715,
    "written": 715,
    "skipped": 0,
    "skippedCounts": {}
  },
  "fallbackCounts": {
    "direct-default-export-candidate-zero": 23,
    "direct-export-candidate-zero": 65,
    "export-target-file-not-found": 68,
    "import-edge-target-not-found": 8,
    "package-or-runtime-binding": 1310,
    "type-only-import": 232,
    "unsupported-import-shape": 325
  },
  "fallbackSampleCap": {
    "perBucket": 100,
    "total": 2000,
    "truncated": true
  }
}
```

## Decision

`1-7-2. ESM named symbol edges` is complete for bounded repo-local value graph
semantics.

## 58. 2026-06-23-export-alias-surface-modeling-decision.md

# Export Alias Surface Modeling Decision

Date: 2026-06-23

Issue: #465

## Decision

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

## Rationale

- The current graph behavior takes the agent to the implementation symbol.
- A first-class alias surface node would introduce a broader
  surface-symbol-to-implementation-symbol model that affects query rendering,
  impact traversal, and future default/namespace re-export semantics.
- That broader export surface model should be designed separately instead of
  folded into guarded named symbol edge writing.

## Roadmap Impact

`1-7-2-3-2. export alias surface modeling decision (#465)` can be marked
complete as a bounded decision.

Full first-class export surface modeling remains deferred and should be promoted
through a separate plan if needed.

## 59. 2026-06-23-guarded-esm-named-symbol-edge-write-closeout.md

# Guarded ESM Named Symbol Edge Write Closeout

Date: 2026-06-23

## Scope

Implemented guarded graph writing for Rust-owned direct ESM named import symbol
edges.

The guard runs after the existing resolver selects a target symbol candidate.
It does not change candidate lookup or disambiguation semantics. Per edge, it
fails closed when the selected target is weak and continues indexing.

## Implemented

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

## Explicit Gap

Direct named export edge writes are not completed in this slice.

The current Rust finalization path consumes `imports` unresolved refs. Direct
named exports such as `export { foo } from "./source"` are still stored as
`exports` unresolved refs for text reuse and are not routed through this symbol
edge-write path. The roadmap now tracks this as:

```text
[-] 1-7-2. ESM named symbol edges
  [x] 1-7-2-1. direct named import guarded write
  [ ] 1-7-2-2. direct named export guarded write (#463)
```

This avoids redefining `1-7-2` as complete before the export path exists.

## Evidence

Focused Rust core tests:

```text
cargo test -p zcodegraph-core
```

Result:

```text
71 passed
```

Build:

```text
npm run build
cargo build -p zcodegraph-core
```

Current-repo rust-hybrid profile smoke:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-23-guarded-esm-named-symbol-edge-write-current-repo.profile.json \
node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed profile distribution:

```json
{
  "attempted": 635,
  "written": 635,
  "skipped": 0,
  "skippedCounts": {},
  "sampleCap": {
    "perBucket": 100,
    "total": 2000,
    "truncated": false
  }
}
```

The Node 26 warning appeared during the smoke and was bypassed with
`CODEGRAPH_ALLOW_UNSAFE_NODE=1`, as expected for this local environment.

## Decision

This slice is sufficient for `1-7-2-1. direct named import guarded write`.

It is not sufficient to mark the parent `1-7-2. ESM named symbol edges` complete
because direct named export edge writes remain a separate implementation path.

## 60. 2026-06-23-guarded-esm-named-symbol-edges-completion-closeout.md

# Guarded ESM Named Symbol Edges Completion Closeout

Date: 2026-06-23

## Scope

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

## Implemented

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

## Evidence

Rust core:

```text
cargo test -p zcodegraph-core
```

Result:

```text
73 passed
```

Build:

```text
npm run build
cargo build -p zcodegraph-core
```

Current-repo rust-hybrid profile smoke:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-23-guarded-esm-named-symbol-edges-completion-current-repo.profile.json \
node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed edge-write distribution:

```json
{
  "attempted": 688,
  "written": 688,
  "skipped": 0,
  "skippedCounts": {},
  "sampleCap": {
    "perBucket": 100,
    "total": 2000,
    "truncated": false
  }
}
```

Observed fallback taxonomy included:

```json
{
  "direct-export-candidate-zero": 65,
  "export-edge-one-hop-out-of-scope": 11,
  "export-target-file-not-found": 68,
  "type-only-import": 228
}
```

The Node 26 warning appeared during the smoke and was bypassed with
`CODEGRAPH_ALLOW_UNSAFE_NODE=1`, as expected for this local environment.

## Decision

`1-7-2. ESM named symbol edges` is complete for bounded direct named
import/export guarded graph writing.

The next guarded graph-writing work should continue at `1-7-3. one-hop
re-export edges` or `1-7-4. rollback/no-go when parity is weak`, not reopen the
direct named import/export edge-write slice unless a regression is found.

## 61. 2026-06-23-guarded-one-hop-reexport-edges-closeout.md

# Guarded One-Hop Re-Export Edges Closeout

Date: 2026-06-23

## Scope

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

## Implemented

- Import-through-barrel guarded writes now resolve bounded repo-local named
  one-hop re-exports to the leaf exported symbol.
- Export-through-barrel guarded writes now resolve bounded repo-local named
  one-hop re-exports to the leaf exported symbol.
- One-hop candidate rows carry their leaf file path so the guarded writer can
  validate the actual target file instead of the barrel file.
- Export-side one-hop resolutions are reflected in
  `esmOneHopReexportResolvedRefs`.
- The slice remains intentionally bounded to one repo-local named re-export hop.

## Excluded

- `export * from` semantics;
- default re-export semantics;
- namespace re-export semantics;
- package or `node_modules` re-export semantics;
- multi-hop re-export chains;
- exported alias surface semantics beyond the left-side source symbol name;
- type-only expansion.

## Evidence

Rust core:

```text
cargo test -p zcodegraph-core
```

Result:

```text
75 passed
```

Build:

```text
npm run build
cargo build -p zcodegraph-core
```

Current-repo rust-hybrid profile smoke:

```text
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-23-guarded-one-hop-reexport-edges-current-repo.profile.json \
node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed edge-write distribution:

```json
{
  "attempted": 715,
  "written": 715,
  "skipped": 0,
  "skippedCounts": {},
  "sampleCap": {
    "perBucket": 100,
    "total": 2000,
    "truncated": false
  }
}
```

Observed one-hop re-export resolutions:

```json
{
  "esmOneHopReexportResolvedRefs": 294
}
```

Observed fallback taxonomy included:

```json
{
  "direct-export-candidate-zero": 65,
  "export-target-file-not-found": 68,
  "import-edge-target-not-found": 7,
  "package-or-runtime-binding": 1307,
  "type-only-import": 228,
  "unsupported-import-shape": 329
}
```

The Node 26 warning appeared during the smoke and was bypassed with
`CODEGRAPH_ALLOW_UNSAFE_NODE=1`, as expected for this local environment.

## Decision

`1-7-3. one-hop re-export edges` is complete for bounded repo-local named
import-through-barrel and export-through-barrel guarded graph writing.

The next guarded graph-writing work should continue at `1-7-4. rollback/no-go
when parity is weak`, or move to an explicit deferred sub-node if one of the
remaining re-export semantic gaps is promoted.

## 62. 2026-06-23-namespace-export-surface-semantics-decision.md

# Namespace Export Surface Semantics Decision

Date: 2026-06-23

Issue: #469

## Decision

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

## Rationale

- A namespace export exposes a module object surface, not one named source
  symbol.
- This matches the namespace import policy in #470.
- First-class namespace surface nodes would require a broader export surface
  graph design touching traversal, rendering, and impact semantics.
- A file/module dependency edge is useful and bounded, while guessed member
  symbol edges would be too broad for `1-7-2`.

## Follow-Up

Create a ready-for-agent implementation issue to fixture-lock file/module
dependency behavior for `export * as NS from "./source"`.

## Roadmap Impact

`1-7-2-5-5. namespace export/re-export surface semantics (#469)` can be marked
complete as a semantic decision.

First-class namespace surface modeling and member-level namespace resolution
remain deferred.

## 63. 2026-06-23-namespace-import-module-dependency-policy-decision.md

# Namespace Import Module Dependency Policy Decision

Date: 2026-06-23

Issue: #470

## Decision

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

## Rationale

- A namespace import binds a module object, not one named exported symbol.
- The file-level dependency edge preserves useful graph sufficiency without
  guessing member targets.
- Member-level namespace resolution requires a broader export/member resolver,
  including alias/default/re-export interactions, and should be promoted through
  a separate plan if needed.
- No schema change is required for the bounded policy.

## Roadmap Impact

`1-7-2-5-4. namespace import module/file dependency policy (#470)` can be
marked complete as a semantic policy decision.

Member-level namespace symbol resolution remains deferred.
