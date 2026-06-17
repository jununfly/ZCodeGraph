# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-phase-16-sqlite-memory-final-flush-candidate
Manifest: docs/benchmarks/2026-06-17-rust-indexing-core-phase-16-sqlite-memory-final-flush-candidate.experiment.json
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
| zcodegraph | memory-final-flush | experiment |
| excalidraw | memory-final-flush | experiment |
| vscode | memory-final-flush | experiment |

`disk` is the default active-index write path. `memory-final-flush` is an explicit experimental prototype for Phase 16 architecture reassessment and does not claim production rollout readiness.

## Arm availability and graph stats

### zcodegraph

- TypeScript: graph available; stats: {"fileCount":290,"nodeCount":4169,"edgeCount":17617,"nodeKinds":{"class":60,"constant":470,"file":290,"function":1097,"import":1201,"interface":165,"method":811,"property":2,"type_alias":35,"variable":38},"edgeKinds":{"calls":7597,"contains":3879,"extends":8,"implements":21,"imports":2908,"instantiates":410,"references":2794},"dbSizeBytes":17252352}
- Rust: graph available; stats: {"fileCount":290,"nodeCount":5949,"edgeCount":7957,"nodeKinds":{"class":59,"file":290,"function":2401,"import":1197,"interface":165,"method":721,"type_alias":38,"variable":1078},"edgeKinds":{"calls":1,"contains":5659,"imports":2297},"dbSizeBytes":6291456}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":34,"nodeCount":2360,"edgeCount":7204,"nodeKinds":{"class":11,"constant":297,"file":34,"function":532,"import":757,"interface":11,"method":388,"property":208,"type_alias":105,"variable":17},"edgeKinds":{"calls":2729,"contains":2326,"imports":1175,"instantiates":95,"references":879},"dbSizeBytes":11526144}
- Rust: graph available; stats: {"fileCount":34,"nodeCount":2630,"edgeCount":3755,"nodeKinds":{"class":11,"file":34,"function":890,"import":757,"interface":11,"method":364,"type_alias":106,"variable":457},"edgeKinds":{"calls":68,"contains":2596,"imports":1091},"dbSizeBytes":3559424}

### vscode

- TypeScript: graph available; stats: {"fileCount":11098,"nodeCount":329355,"edgeCount":1512994,"nodeKinds":{"class":13204,"component":9,"constant":13580,"enum":1999,"enum_member":12799,"file":11098,"function":21411,"import":106827,"interface":13284,"method":123696,"property":6368,"route":1,"type_alias":4428,"variable":651},"edgeKinds":{"calls":592880,"contains":318058,"decorates":756,"extends":6286,"implements":4753,"imports":271051,"instantiates":54921,"references":264289},"dbSizeBytes":1057366016}
- Rust: graph available; stats: {"fileCount":11291,"nodeCount":308848,"edgeCount":553834,"nodeKinds":{"class":12680,"enum":1999,"file":11291,"function":40160,"import":107519,"interface":13438,"method":88931,"type_alias":4948,"variable":27882},"edgeKinds":{"calls":1031,"contains":297601,"imports":255202},"dbSizeBytes":438521856}

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

- zcodegraph: wallTimeDeltaPct=-5.644768856447689, peakRssDeltaPct=10.21638879035119
- excalidraw: wallTimeDeltaPct=-5.779612575420769, peakRssDeltaPct=10.510732790525537
- vscode: wallTimeDeltaPct=-31.11852146097719, peakRssDeltaPct=1.6867469879518073

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 68 | 2063 | 1979 | 19 | 4110 |
| zcodegraph | rust | 34 | 1893 | 1950 | 19 | 3878 |
| excalidraw | typescript | 26 | 1623 | 1500 | 19 | 3149 |
| excalidraw | rust | 8 | 1457 | 1502 | 18 | 2967 |
| vscode | typescript | 2520 | 210682 | 265108 | 218 | 478310 |
| vscode | rust | 3066 | 226200 | 100200 | 46 | 329467 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| zcodegraph | sourceScanMs | 0 |
| zcodegraph | parseExtractionMs | 902 |
| zcodegraph | sqliteWriteMs | 219 |
| zcodegraph | subprocessStartupHandoffMs | 3 |
| zcodegraph | frameworkPostExtractMs | 3 |
| zcodegraph | referenceResolutionMs | 124 |
| zcodegraph | dynamicDispatchSynthesisMs | 311 |
| zcodegraph | dbMaintenanceMs | 3 |
| zcodegraph | typescriptFinalizationMs | 441 |
| excalidraw | sourceScanMs | 0 |
| excalidraw | parseExtractionMs | 747 |
| excalidraw | sqliteWriteMs | 226 |
| excalidraw | subprocessStartupHandoffMs | 3 |
| excalidraw | frameworkPostExtractMs | 2 |
| excalidraw | referenceResolutionMs | 77 |
| excalidraw | dynamicDispatchSynthesisMs | 313 |
| excalidraw | dbMaintenanceMs | 4 |
| excalidraw | typescriptFinalizationMs | 396 |
| vscode | sourceScanMs | 92 |
| vscode | parseExtractionMs | 36706 |
| vscode | sqliteWriteMs | 22774 |
| vscode | subprocessStartupHandoffMs | 3 |
| vscode | frameworkPostExtractMs | 41 |
| vscode | referenceResolutionMs | 20373 |
| vscode | dynamicDispatchSynthesisMs | 8458 |
| vscode | dbMaintenanceMs | 84 |
| vscode | typescriptFinalizationMs | 28959 |

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
