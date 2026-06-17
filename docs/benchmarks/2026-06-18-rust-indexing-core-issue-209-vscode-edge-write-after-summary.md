# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-issue-209-vscode-edge-write-after
Manifest: docs/benchmarks/2026-06-18-rust-indexing-core-issue-209-vscode-edge-write-after.experiment.json
Classification: stress-only-targets-completed-with-nonblocking-failures

## Target matrix

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| vscode | stress | no | available | completed | completed | target-failed-performance-gate-unmet |

## Preflight summary

Experiment preflight: completed
Rust core: available (/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core)

## Rust graph work profiles

| Target | Effective profile | Source |
|---|---|---|
| vscode | full | experiment |

`full` runs the default Rust extraction scope. matched-ts-js controls the most obvious rerun5 cost drivers, including constant expansion, component detection, field/export extraction, and aggressive call extraction where currently supported, without post-hoc output trimming.

## Rust SQLite write modes

| Target | Effective mode | Source |
|---|---|---|
| vscode | final-flush | experiment |

`final-flush` is the production Rust opt-in write path. `disk` remains a debug escape hatch, and `memory-final-flush` remains an explicit experimental prototype that does not claim production rollout readiness.

## Arm availability and graph stats

### vscode

- TypeScript: graph available; stats: {"fileCount":11098,"nodeCount":329355,"edgeCount":1512994,"nodeKinds":{"class":13204,"component":9,"constant":13580,"enum":1999,"enum_member":12799,"file":11098,"function":21411,"import":106827,"interface":13284,"method":123696,"property":6368,"route":1,"type_alias":4428,"variable":651},"edgeKinds":{"calls":592880,"contains":318058,"decorates":756,"extends":6286,"implements":4753,"imports":271051,"instantiates":54921,"references":264289},"dbSizeBytes":1057366016}
- Rust: graph available; stats: {"fileCount":11291,"nodeCount":561906,"edgeCount":1626117,"nodeKinds":{"class":12680,"component":202,"constant":208276,"enum":1999,"export":1012,"field":43691,"file":11291,"function":40037,"import":107519,"interface":13438,"method":88931,"type_alias":4948,"variable":27882},"edgeKinds":{"calls":747730,"contains":550659,"exports":7466,"imports":264603,"instantiates":54324,"references":1335},"dbSizeBytes":1216704512}

## GraphStats parity

### vscode graphStats parity

Totals: files 11098 → 11291 (+193); nodes 329355 → 561906 (+232551); edges 1512994 → 1626117 (+113123).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 13204 | 12680 | -524 |
| component | 9 | 202 | +193 |
| constant | 13580 | 208276 | +194696 |
| enum | 1999 | 1999 | 0 |
| enum_member | 12799 | 0 | -12799 |
| export | 0 | 1012 | +1012 |
| field | 0 | 43691 | +43691 |
| file | 11098 | 11291 | +193 |
| function | 21411 | 40037 | +18626 |
| import | 106827 | 107519 | +692 |
| interface | 13284 | 13438 | +154 |
| method | 123696 | 88931 | -34765 |
| property | 6368 | 0 | -6368 |
| route | 1 | 0 | -1 |
| type_alias | 4428 | 4948 | +520 |
| variable | 651 | 27882 | +27231 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 592880 | 747730 | +154850 |
| contains | 318058 | 550659 | +232601 |
| decorates | 756 | 0 | -756 |
| exports | 0 | 7466 | +7466 |
| extends | 6286 | 0 | -6286 |
| implements | 4753 | 0 | -4753 |
| imports | 271051 | 264603 | -6448 |
| instantiates | 54921 | 54324 | -597 |
| references | 264289 | 1335 | -262954 |

## Metrics

- vscode: wallTimeDeltaPct=23.433525149564026, peakRssDeltaPct=-12.441240990285177

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| vscode | typescript | 2784 | 217857 | 235351 | 77 | 455992 |
| vscode | rust | 2658 | 212275 | 347914 | 77 | 562847 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| vscode | sourceScanMs | 80 |
| vscode | parseExtractionMs | 38754 |
| vscode | sqliteWriteMs | 131569 |
| vscode | importPathAliasResolutionMs | 5887 |
| vscode | importPathAliasResolvedRefs | 19766 |
| vscode | importPathAliasFallbackRefs | 251282 |
| vscode | importPathAliasBindingFallbackRefs | 168945 |
| vscode | importPathAliasUnsupportedFallbackRefs | 2416 |
| vscode | importPathAliasUnresolvedFallbackRefs | 79921 |
| vscode | esmNamedImportExportResolutionMs | 13149 |
| vscode | esmNamedImportExportResolvedRefs | 42601 |
| vscode | esmNamedImportExportFallbackRefs | 149517 |
| vscode | esmOneHopReexportResolvedRefs | 559 |
| vscode | localExactReferenceResolutionMs | 49040 |
| vscode | localExactReferenceResolvedRefs | 152103 |
| vscode | localExactReferenceFallbackRefs | 734619 |
| vscode | subprocessStartupHandoffMs | 3 |
| vscode | frameworkPostExtractMs | 49 |
| vscode | referenceResolutionMs | 84645 |
| vscode | dynamicDispatchSynthesisMs | 9262 |
| vscode | dbMaintenanceMs | 113 |
| vscode | typescriptFinalizationMs | 97426 |

## Rust finalization boundary

| Target | Protocol version | Product shell | Rust-owned stages | Fallback count |
|---|---:|---|---|---:|
| vscode | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, esm-one-hop-reexport-resolution, local-exact-reference-resolution | 231858 |

## Rust finalization fallback taxonomy

| Target | Stage | Classification | Reason | Count |
|---|---|---|---|---:|
| vscode | framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| vscode | reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| vscode | dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| vscode | db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| vscode | reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 149517 |
| vscode | reference-resolution | known-unsupported | unsupported-import-form-not-yet-rust-owned | 554 |
| vscode | reference-resolution | known-unsupported | unresolved-file-level-import-target | 81783 |

## Full-profile end-to-end segments

| Target | Segment | Duration ms | Status |
|---|---|---:|---|
| vscode | Rust source scan | 80 | measured |
| vscode | Rust parse extraction | 38754 | measured |
| vscode | Rust SQLite write | 131569 | measured |
| vscode | Rust subprocess startup/handoff | 3 | measured |
| vscode | TypeScript finalization | 97426 | measured |
| vscode | Reference resolution | 84645 | measured |
| vscode | Dynamic-dispatch synthesis | 9262 | measured |
| vscode | DB maintenance | 113 | measured |
| vscode | graphStats measurement | 77 | measured |
| vscode | sufficiency measurement | unavailable | unavailable |

## Gates

- vscode: sufficiency=passed; performance=unavailable

## Regressions

- vscode: none recorded

## Classifications

- vscode: target-failed-performance-gate-unmet
- experiment: stress-only-targets-completed-with-nonblocking-failures

## Rollout recommendation draft

No required targets are present; stress targets are diagnostic and do not claim rollout readiness.
Rust default rollout readiness is not claimed by this generated draft.
