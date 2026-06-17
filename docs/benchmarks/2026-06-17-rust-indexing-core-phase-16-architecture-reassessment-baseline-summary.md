# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-phase-16-architecture-reassessment-baseline
Manifest: docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-architecture-reassessment-baseline.experiment.json
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
| zcodegraph | matched-ts-js | experiment |
| excalidraw | matched-ts-js | experiment |
| vscode | matched-ts-js | experiment |

`full` runs the default Rust extraction scope. matched-ts-js controls the most obvious rerun5 cost drivers, including constant expansion, component detection, field/export extraction, and aggressive call extraction where currently supported, without post-hoc output trimming.

## Rust SQLite write modes

| Target | Effective mode | Source |
|---|---|---|
| zcodegraph | disk | experiment |
| excalidraw | disk | experiment |
| vscode | disk | experiment |

`disk` is the default active-index write path. `memory-final-flush` is an explicit experimental prototype for Phase 16 architecture reassessment and does not claim production rollout readiness.

## Arm availability and graph stats

### zcodegraph

- TypeScript: graph available; stats: {"fileCount":290,"nodeCount":4169,"edgeCount":17617,"nodeKinds":{"class":60,"constant":470,"file":290,"function":1097,"import":1201,"interface":165,"method":811,"property":2,"type_alias":35,"variable":38},"edgeKinds":{"calls":7597,"contains":3879,"extends":8,"implements":21,"imports":2908,"instantiates":410,"references":2794},"dbSizeBytes":17252352}
- Rust: graph available; stats: {"fileCount":290,"nodeCount":5949,"edgeCount":7957,"nodeKinds":{"class":59,"file":290,"function":2401,"import":1197,"interface":165,"method":721,"type_alias":38,"variable":1078},"edgeKinds":{"calls":1,"contains":5659,"imports":2297},"dbSizeBytes":6606848}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":34,"nodeCount":2360,"edgeCount":7204,"nodeKinds":{"class":11,"constant":297,"file":34,"function":532,"import":757,"interface":11,"method":388,"property":208,"type_alias":105,"variable":17},"edgeKinds":{"calls":2729,"contains":2326,"imports":1175,"instantiates":95,"references":879},"dbSizeBytes":11526144}
- Rust: graph available; stats: {"fileCount":34,"nodeCount":2630,"edgeCount":3755,"nodeKinds":{"class":11,"file":34,"function":890,"import":757,"interface":11,"method":364,"type_alias":106,"variable":457},"edgeKinds":{"calls":68,"contains":2596,"imports":1091},"dbSizeBytes":3702784}

### vscode

- TypeScript: graph available; stats: {"fileCount":11098,"nodeCount":329355,"edgeCount":1512994,"nodeKinds":{"class":13204,"component":9,"constant":13580,"enum":1999,"enum_member":12799,"file":11098,"function":21411,"import":106827,"interface":13284,"method":123696,"property":6368,"route":1,"type_alias":4428,"variable":651},"edgeKinds":{"calls":592880,"contains":318058,"decorates":756,"extends":6286,"implements":4753,"imports":271051,"instantiates":54921,"references":264289},"dbSizeBytes":1057366016}
- Rust: graph available; stats: {"fileCount":11291,"nodeCount":308848,"edgeCount":553834,"nodeKinds":{"class":12680,"enum":1999,"file":11291,"function":40160,"import":107519,"interface":13438,"method":88931,"type_alias":4948,"variable":27882},"edgeKinds":{"calls":1031,"contains":297601,"imports":255202},"dbSizeBytes":466526208}

## GraphStats parity

### zcodegraph graphStats parity

Totals: files 290 → 290 (0); nodes 4169 → 5949 (+1780); edges 17617 → 7957 (-9660).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 60 | 59 | -1 |
| constant | 470 | 0 | -470 |
| file | 290 | 290 | 0 |
| function | 1097 | 2401 | +1304 |
| import | 1201 | 1197 | -4 |
| interface | 165 | 165 | 0 |
| method | 811 | 721 | -90 |
| property | 2 | 0 | -2 |
| type_alias | 35 | 38 | +3 |
| variable | 38 | 1078 | +1040 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 7597 | 1 | -7596 |
| contains | 3879 | 5659 | +1780 |
| extends | 8 | 0 | -8 |
| implements | 21 | 0 | -21 |
| imports | 2908 | 2297 | -611 |
| instantiates | 410 | 0 | -410 |
| references | 2794 | 0 | -2794 |

### excalidraw graphStats parity

Totals: files 34 → 34 (0); nodes 2360 → 2630 (+270); edges 7204 → 3755 (-3449).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 11 | 11 | 0 |
| constant | 297 | 0 | -297 |
| file | 34 | 34 | 0 |
| function | 532 | 890 | +358 |
| import | 757 | 757 | 0 |
| interface | 11 | 11 | 0 |
| method | 388 | 364 | -24 |
| property | 208 | 0 | -208 |
| type_alias | 105 | 106 | +1 |
| variable | 17 | 457 | +440 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 2729 | 68 | -2661 |
| contains | 2326 | 2596 | +270 |
| imports | 1175 | 1091 | -84 |
| instantiates | 95 | 0 | -95 |
| references | 879 | 0 | -879 |

### vscode graphStats parity

Totals: files 11098 → 11291 (+193); nodes 329355 → 308848 (-20507); edges 1512994 → 553834 (-959160).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 13204 | 12680 | -524 |
| component | 9 | 0 | -9 |
| constant | 13580 | 0 | -13580 |
| enum | 1999 | 1999 | 0 |
| enum_member | 12799 | 0 | -12799 |
| file | 11098 | 11291 | +193 |
| function | 21411 | 40160 | +18749 |
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
| calls | 592880 | 1031 | -591849 |
| contains | 318058 | 297601 | -20457 |
| decorates | 756 | 0 | -756 |
| extends | 6286 | 0 | -6286 |
| implements | 4753 | 0 | -4753 |
| imports | 271051 | 255202 | -15849 |
| instantiates | 54921 | 0 | -54921 |
| references | 264289 | 0 | -264289 |

## Metrics

- zcodegraph: wallTimeDeltaPct=-8.16552334587298, peakRssDeltaPct=5.19959745051996
- excalidraw: wallTimeDeltaPct=-8.3264405845051, peakRssDeltaPct=7.500901550667148
- vscode: wallTimeDeltaPct=-23.592072863674034, peakRssDeltaPct=29.96688741721854

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 76 | 2040 | 2403 | 22 | 4519 |
| zcodegraph | rust | 38 | 1869 | 2243 | 21 | 4150 |
| excalidraw | typescript | 28 | 1678 | 1921 | 25 | 3627 |
| excalidraw | rust | 11 | 1714 | 1600 | 19 | 3325 |
| vscode | typescript | 2729 | 231602 | 270061 | 166 | 504394 |
| vscode | rust | 2918 | 230091 | 152388 | 48 | 385397 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| zcodegraph | sourceScanMs | 0 |
| zcodegraph | parseExtractionMs | 913 |
| zcodegraph | sqliteWriteMs | 462 |
| zcodegraph | subprocessStartupHandoffMs | 3 |
| zcodegraph | frameworkPostExtractMs | 3 |
| zcodegraph | referenceResolutionMs | 116 |
| zcodegraph | dynamicDispatchSynthesisMs | 323 |
| zcodegraph | dbMaintenanceMs | 5 |
| zcodegraph | typescriptFinalizationMs | 448 |
| excalidraw | sourceScanMs | 0 |
| excalidraw | parseExtractionMs | 769 |
| excalidraw | sqliteWriteMs | 304 |
| excalidraw | subprocessStartupHandoffMs | 3 |
| excalidraw | frameworkPostExtractMs | 2 |
| excalidraw | referenceResolutionMs | 80 |
| excalidraw | dynamicDispatchSynthesisMs | 315 |
| excalidraw | dbMaintenanceMs | 3 |
| excalidraw | typescriptFinalizationMs | 400 |
| vscode | sourceScanMs | 93 |
| vscode | parseExtractionMs | 40557 |
| vscode | sqliteWriteMs | 66317 |
| vscode | subprocessStartupHandoffMs | 4 |
| vscode | frameworkPostExtractMs | 44 |
| vscode | referenceResolutionMs | 24620 |
| vscode | dynamicDispatchSynthesisMs | 8577 |
| vscode | dbMaintenanceMs | 80 |
| vscode | typescriptFinalizationMs | 33344 |

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
