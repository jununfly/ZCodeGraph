# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-issue-211-rust-core-sqlite-write-after
Manifest: docs/benchmarks/2026-06-18-rust-indexing-core-issue-211-rust-core-sqlite-write-after.experiment.json
Classification: failed-required-performance-gate-unmet

## Target matrix

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| zcodegraph | required | yes | available | completed | completed | target-failed-performance-gate-unmet |
| excalidraw | required | yes | available | completed | completed | target-failed-performance-gate-unmet |
| vscode | stress | no | available | completed | completed | target-failed-performance-gate-unmet |

## Preflight summary

Experiment preflight: completed
Rust core: available (/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core)

## Rust graph work profiles

| Target | Effective profile | Source |
|---|---|---|
| zcodegraph | full | experiment |
| excalidraw | full | experiment |
| vscode | full | experiment |

`full` runs the default Rust extraction scope. matched-ts-js controls the most obvious rerun5 cost drivers, including constant expansion, component detection, field/export extraction, and aggressive call extraction where currently supported, without post-hoc output trimming.

## Rust SQLite write modes

| Target | Effective mode | Source |
|---|---|---|
| zcodegraph | final-flush | experiment |
| excalidraw | final-flush | experiment |
| vscode | final-flush | experiment |

`final-flush` is the production Rust opt-in write path. `disk` remains a debug escape hatch, and `memory-final-flush` remains an explicit experimental prototype that does not claim production rollout readiness.

## Arm availability and graph stats

### zcodegraph

- TypeScript: graph available; stats: {"fileCount":290,"nodeCount":4189,"edgeCount":17806,"nodeKinds":{"class":60,"constant":471,"file":290,"function":1104,"import":1204,"interface":167,"method":818,"property":2,"type_alias":35,"variable":38},"edgeKinds":{"calls":7703,"contains":3899,"extends":8,"implements":21,"imports":2920,"instantiates":418,"references":2837},"dbSizeBytes":17461248}
- Rust: graph available; stats: {"fileCount":290,"nodeCount":14369,"edgeCount":30256,"nodeKinds":{"class":59,"constant":8091,"export":50,"field":233,"file":290,"function":2431,"import":1200,"interface":167,"method":728,"type_alias":38,"variable":1082},"edgeKinds":{"calls":13446,"contains":14079,"exports":186,"imports":2374,"instantiates":171},"dbSizeBytes":26034176}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":627,"nodeCount":10283,"edgeCount":45017,"nodeKinds":{"class":77,"component":4,"constant":1008,"enum":3,"enum_member":39,"file":627,"function":1930,"import":4154,"interface":127,"method":1008,"property":776,"type_alias":471,"variable":59},"edgeKinds":{"calls":14597,"contains":9621,"extends":6,"implements":3,"imports":10957,"instantiates":3933,"references":5900},"dbSizeBytes":33202176}
- Rust: graph available; stats: {"fileCount":627,"nodeCount":20719,"edgeCount":53345,"nodeKinds":{"class":76,"component":560,"constant":9664,"enum":3,"export":158,"field":233,"file":627,"function":2792,"import":4154,"interface":127,"method":830,"type_alias":480,"variable":1015},"edgeKinds":{"calls":21061,"contains":20092,"exports":1040,"imports":10063,"instantiates":209,"references":880},"dbSizeBytes":41844736}

### vscode

- TypeScript: graph available; stats: {"fileCount":11098,"nodeCount":329355,"edgeCount":1512994,"nodeKinds":{"class":13204,"component":9,"constant":13580,"enum":1999,"enum_member":12799,"file":11098,"function":21411,"import":106827,"interface":13284,"method":123696,"property":6368,"route":1,"type_alias":4428,"variable":651},"edgeKinds":{"calls":592880,"contains":318058,"decorates":756,"extends":6286,"implements":4753,"imports":271051,"instantiates":54921,"references":264289},"dbSizeBytes":1057366016}
- Rust: graph available; stats: {"fileCount":11291,"nodeCount":561906,"edgeCount":1626117,"nodeKinds":{"class":12680,"component":202,"constant":208276,"enum":1999,"export":1012,"field":43691,"file":11291,"function":40037,"import":107519,"interface":13438,"method":88931,"type_alias":4948,"variable":27882},"edgeKinds":{"calls":747730,"contains":550659,"exports":7466,"imports":264603,"instantiates":54324,"references":1335},"dbSizeBytes":1216729088}

## Empty corpus validation

- zcodegraph: valid
- excalidraw: valid
- vscode: valid

## GraphStats parity

### zcodegraph graphStats parity

Totals: files 290 → 290 (0); nodes 4189 → 14369 (+10180); edges 17806 → 30256 (+12450).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 60 | 59 | -1 |
| constant | 471 | 8091 | +7620 |
| export | 0 | 50 | +50 |
| field | 0 | 233 | +233 |
| file | 290 | 290 | 0 |
| function | 1104 | 2431 | +1327 |
| import | 1204 | 1200 | -4 |
| interface | 167 | 167 | 0 |
| method | 818 | 728 | -90 |
| property | 2 | 0 | -2 |
| type_alias | 35 | 38 | +3 |
| variable | 38 | 1082 | +1044 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 7703 | 13446 | +5743 |
| contains | 3899 | 14079 | +10180 |
| exports | 0 | 186 | +186 |
| extends | 8 | 0 | -8 |
| implements | 21 | 0 | -21 |
| imports | 2920 | 2374 | -546 |
| instantiates | 418 | 171 | -247 |
| references | 2837 | 0 | -2837 |

### excalidraw graphStats parity

Totals: files 627 → 627 (0); nodes 10283 → 20719 (+10436); edges 45017 → 53345 (+8328).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 77 | 76 | -1 |
| component | 4 | 560 | +556 |
| constant | 1008 | 9664 | +8656 |
| enum | 3 | 3 | 0 |
| enum_member | 39 | 0 | -39 |
| export | 0 | 158 | +158 |
| field | 0 | 233 | +233 |
| file | 627 | 627 | 0 |
| function | 1930 | 2792 | +862 |
| import | 4154 | 4154 | 0 |
| interface | 127 | 127 | 0 |
| method | 1008 | 830 | -178 |
| property | 776 | 0 | -776 |
| type_alias | 471 | 480 | +9 |
| variable | 59 | 1015 | +956 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 14597 | 21061 | +6464 |
| contains | 9621 | 20092 | +10471 |
| exports | 0 | 1040 | +1040 |
| extends | 6 | 0 | -6 |
| implements | 3 | 0 | -3 |
| imports | 10957 | 10063 | -894 |
| instantiates | 3933 | 209 | -3724 |
| references | 5900 | 880 | -5020 |

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

- zcodegraph: wallTimeDeltaPct=71.93738656987296, peakRssDeltaPct=0.5952380952380952
- excalidraw: wallTimeDeltaPct=43.80962149964099, peakRssDeltaPct=0.6205398696866273
- vscode: wallTimeDeltaPct=20.066015793072914, peakRssDeltaPct=1.1183597390493942

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 51 | 2045 | 2312 | 20 | 4408 |
| zcodegraph | rust | 36 | 2013 | 5530 | 19 | 7579 |
| excalidraw | typescript | 129 | 4573 | 5047 | 19 | 9749 |
| excalidraw | rust | 66 | 4602 | 9352 | 20 | 14020 |
| vscode | typescript | 2717 | 215852 | 262528 | 157 | 481097 |
| vscode | rust | 2926 | 221083 | 353625 | 102 | 577634 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| zcodegraph | sourceScanMs | 1 |
| zcodegraph | parseExtractionMs | 1046 |
| zcodegraph | sqliteWriteMs | 1038 |
| zcodegraph | importPathAliasResolutionMs | 81 |
| zcodegraph | importPathAliasResolvedRefs | 619 |
| zcodegraph | importPathAliasFallbackRefs | 2388 |
| zcodegraph | importPathAliasBindingFallbackRefs | 2330 |
| zcodegraph | importPathAliasUnsupportedFallbackRefs | 49 |
| zcodegraph | importPathAliasUnresolvedFallbackRefs | 9 |
| zcodegraph | esmNamedImportExportResolutionMs | 394 |
| zcodegraph | esmNamedImportExportResolvedRefs | 2815 |
| zcodegraph | esmNamedImportExportFallbackRefs | 1447 |
| zcodegraph | esmOneHopReexportResolvedRefs | 279 |
| zcodegraph | localExactReferenceResolutionMs | 1532 |
| zcodegraph | localExactReferenceResolvedRefs | 3635 |
| zcodegraph | localExactReferenceFallbackRefs | 28736 |
| zcodegraph | subprocessStartupHandoffMs | 290 |
| zcodegraph | frameworkPostExtractMs | 3 |
| zcodegraph | referenceResolutionMs | 344 |
| zcodegraph | dynamicDispatchSynthesisMs | 323 |
| zcodegraph | dbMaintenanceMs | 10 |
| zcodegraph | typescriptFinalizationMs | 716 |
| excalidraw | sourceScanMs | 2 |
| excalidraw | parseExtractionMs | 1653 |
| excalidraw | sqliteWriteMs | 1831 |
| excalidraw | importPathAliasResolutionMs | 442 |
| excalidraw | importPathAliasResolvedRefs | 3317 |
| excalidraw | importPathAliasFallbackRefs | 7877 |
| excalidraw | importPathAliasBindingFallbackRefs | 7381 |
| excalidraw | importPathAliasUnsupportedFallbackRefs | 141 |
| excalidraw | importPathAliasUnresolvedFallbackRefs | 355 |
| excalidraw | esmNamedImportExportResolutionMs | 1187 |
| excalidraw | esmNamedImportExportResolvedRefs | 1061 |
| excalidraw | esmNamedImportExportFallbackRefs | 6726 |
| excalidraw | esmOneHopReexportResolvedRefs | 1 |
| excalidraw | localExactReferenceResolutionMs | 1565 |
| excalidraw | localExactReferenceResolvedRefs | 4279 |
| excalidraw | localExactReferenceFallbackRefs | 38072 |
| excalidraw | subprocessStartupHandoffMs | 2 |
| excalidraw | frameworkPostExtractMs | 6 |
| excalidraw | referenceResolutionMs | 1448 |
| excalidraw | dynamicDispatchSynthesisMs | 394 |
| excalidraw | dbMaintenanceMs | 6 |
| excalidraw | typescriptFinalizationMs | 1914 |
| vscode | sourceScanMs | 80 |
| vscode | parseExtractionMs | 42080 |
| vscode | sqliteWriteMs | 126307 |
| vscode | importPathAliasResolutionMs | 6293 |
| vscode | importPathAliasResolvedRefs | 19766 |
| vscode | importPathAliasFallbackRefs | 251282 |
| vscode | importPathAliasBindingFallbackRefs | 168945 |
| vscode | importPathAliasUnsupportedFallbackRefs | 2416 |
| vscode | importPathAliasUnresolvedFallbackRefs | 79921 |
| vscode | esmNamedImportExportResolutionMs | 14013 |
| vscode | esmNamedImportExportResolvedRefs | 42601 |
| vscode | esmNamedImportExportFallbackRefs | 149517 |
| vscode | esmOneHopReexportResolvedRefs | 559 |
| vscode | localExactReferenceResolutionMs | 50877 |
| vscode | localExactReferenceResolvedRefs | 152103 |
| vscode | localExactReferenceFallbackRefs | 734619 |
| vscode | subprocessStartupHandoffMs | 13 |
| vscode | frameworkPostExtractMs | 48 |
| vscode | referenceResolutionMs | 87979 |
| vscode | dynamicDispatchSynthesisMs | 9975 |
| vscode | dbMaintenanceMs | 968 |
| vscode | typescriptFinalizationMs | 101876 |

## Rust finalization boundary

| Target | Protocol version | Product shell | Rust-owned stages | Fallback count |
|---|---:|---|---|---:|
| zcodegraph | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, esm-one-hop-reexport-resolution, local-exact-reference-resolution | 1509 |
| excalidraw | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, esm-one-hop-reexport-resolution, local-exact-reference-resolution | 7226 |
| vscode | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, esm-one-hop-reexport-resolution, local-exact-reference-resolution | 231858 |

## Rust finalization fallback taxonomy

| Target | Stage | Classification | Reason | Count |
|---|---|---|---|---:|
| zcodegraph | framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 1447 |
| zcodegraph | reference-resolution | known-unsupported | unsupported-import-form-not-yet-rust-owned | 44 |
| zcodegraph | reference-resolution | known-unsupported | unresolved-file-level-import-target | 14 |
| excalidraw | framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 6726 |
| excalidraw | reference-resolution | known-unsupported | unsupported-import-form-not-yet-rust-owned | 69 |
| excalidraw | reference-resolution | known-unsupported | unresolved-file-level-import-target | 427 |
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
| zcodegraph | Rust source scan | 1 | measured |
| zcodegraph | Rust parse extraction | 1046 | measured |
| zcodegraph | Rust SQLite write | 1038 | measured |
| zcodegraph | Rust subprocess startup/handoff | 290 | measured |
| zcodegraph | TypeScript finalization | 716 | measured |
| zcodegraph | Reference resolution | 344 | measured |
| zcodegraph | Dynamic-dispatch synthesis | 323 | measured |
| zcodegraph | DB maintenance | 10 | measured |
| zcodegraph | graphStats measurement | 19 | measured |
| zcodegraph | sufficiency measurement | unavailable | unavailable |
| excalidraw | Rust source scan | 2 | measured |
| excalidraw | Rust parse extraction | 1653 | measured |
| excalidraw | Rust SQLite write | 1831 | measured |
| excalidraw | Rust subprocess startup/handoff | 2 | measured |
| excalidraw | TypeScript finalization | 1914 | measured |
| excalidraw | Reference resolution | 1448 | measured |
| excalidraw | Dynamic-dispatch synthesis | 394 | measured |
| excalidraw | DB maintenance | 6 | measured |
| excalidraw | graphStats measurement | 20 | measured |
| excalidraw | sufficiency measurement | unavailable | unavailable |
| vscode | Rust source scan | 80 | measured |
| vscode | Rust parse extraction | 42080 | measured |
| vscode | Rust SQLite write | 126307 | measured |
| vscode | Rust subprocess startup/handoff | 13 | measured |
| vscode | TypeScript finalization | 101876 | measured |
| vscode | Reference resolution | 87979 | measured |
| vscode | Dynamic-dispatch synthesis | 9975 | measured |
| vscode | DB maintenance | 968 | measured |
| vscode | graphStats measurement | 102 | measured |
| vscode | sufficiency measurement | unavailable | unavailable |

## Gates

- zcodegraph: sufficiency=passed; performance=unavailable
- excalidraw: sufficiency=passed; performance=unavailable
- vscode: sufficiency=passed; performance=unavailable

## Regressions

- zcodegraph: none recorded
- excalidraw: none recorded
- vscode: none recorded

## Classifications

- zcodegraph: target-failed-performance-gate-unmet
- excalidraw: target-failed-performance-gate-unmet
- vscode: target-failed-performance-gate-unmet
- experiment: failed-required-performance-gate-unmet

## Rollout recommendation draft

Performance gate is not satisfied for required targets whose TypeScript and Rust arms both completed.
Rust default rollout readiness is not claimed by this generated draft.
