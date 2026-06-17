# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-phase-17-scoreboard-full
Manifest: docs/benchmarks/2026-06-17-rust-indexing-core-phase-17-scoreboard-full.experiment.json
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

- TypeScript: graph available; stats: {"fileCount":290,"nodeCount":4169,"edgeCount":17626,"nodeKinds":{"class":60,"constant":470,"file":290,"function":1097,"import":1201,"interface":165,"method":811,"property":2,"type_alias":35,"variable":38},"edgeKinds":{"calls":7606,"contains":3879,"extends":8,"implements":21,"imports":2908,"instantiates":410,"references":2794},"dbSizeBytes":17281024}
- Rust: graph available; stats: {"fileCount":290,"nodeCount":14215,"edgeCount":31338,"nodeKinds":{"class":59,"constant":7983,"export":50,"field":233,"file":290,"function":2401,"import":1197,"interface":165,"method":721,"type_alias":38,"variable":1078},"edgeKinds":{"calls":14674,"contains":13925,"exports":186,"imports":2372,"instantiates":181},"dbSizeBytes":24256512}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":34,"nodeCount":2360,"edgeCount":7204,"nodeKinds":{"class":11,"constant":297,"file":34,"function":532,"import":757,"interface":11,"method":388,"property":208,"type_alias":105,"variable":17},"edgeKinds":{"calls":2729,"contains":2326,"imports":1175,"instantiates":95,"references":879},"dbSizeBytes":11526144}
- Rust: graph available; stats: {"fileCount":34,"nodeCount":6352,"edgeCount":12100,"nodeKinds":{"class":11,"component":158,"constant":3525,"field":81,"file":34,"function":851,"import":757,"interface":11,"method":364,"type_alias":106,"variable":454},"edgeKinds":{"calls":4432,"contains":6318,"exports":140,"imports":1146,"instantiates":36,"references":28},"dbSizeBytes":13647872}

### vscode

- TypeScript: graph available; stats: {"fileCount":11098,"nodeCount":329355,"edgeCount":1512994,"nodeKinds":{"class":13204,"component":9,"constant":13580,"enum":1999,"enum_member":12799,"file":11098,"function":21411,"import":106827,"interface":13284,"method":123696,"property":6368,"route":1,"type_alias":4428,"variable":651},"edgeKinds":{"calls":592880,"contains":318058,"decorates":756,"extends":6286,"implements":4753,"imports":271051,"instantiates":54921,"references":264289},"dbSizeBytes":1057370112}
- Rust: graph available; stats: {"fileCount":11291,"nodeCount":561906,"edgeCount":1678102,"nodeKinds":{"class":12680,"component":202,"constant":208276,"enum":1999,"export":1012,"field":43691,"file":11291,"function":40037,"import":107519,"interface":13438,"method":88931,"type_alias":4948,"variable":27882},"edgeKinds":{"calls":796396,"contains":550659,"exports":7466,"imports":264378,"instantiates":57462,"references":1741},"dbSizeBytes":1171955712}

## GraphStats parity

### zcodegraph graphStats parity

Totals: files 290 → 290 (0); nodes 4169 → 14215 (+10046); edges 17626 → 31338 (+13712).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 60 | 59 | -1 |
| constant | 470 | 7983 | +7513 |
| export | 0 | 50 | +50 |
| field | 0 | 233 | +233 |
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
| calls | 7606 | 14674 | +7068 |
| contains | 3879 | 13925 | +10046 |
| exports | 0 | 186 | +186 |
| extends | 8 | 0 | -8 |
| implements | 21 | 0 | -21 |
| imports | 2908 | 2372 | -536 |
| instantiates | 410 | 181 | -229 |
| references | 2794 | 0 | -2794 |

### excalidraw graphStats parity

Totals: files 34 → 34 (0); nodes 2360 → 6352 (+3992); edges 7204 → 12100 (+4896).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 11 | 11 | 0 |
| component | 0 | 158 | +158 |
| constant | 297 | 3525 | +3228 |
| field | 0 | 81 | +81 |
| file | 34 | 34 | 0 |
| function | 532 | 851 | +319 |
| import | 757 | 757 | 0 |
| interface | 11 | 11 | 0 |
| method | 388 | 364 | -24 |
| property | 208 | 0 | -208 |
| type_alias | 105 | 106 | +1 |
| variable | 17 | 454 | +437 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 2729 | 4432 | +1703 |
| contains | 2326 | 6318 | +3992 |
| exports | 0 | 140 | +140 |
| imports | 1175 | 1146 | -29 |
| instantiates | 95 | 36 | -59 |
| references | 879 | 28 | -851 |

### vscode graphStats parity

Totals: files 11098 → 11291 (+193); nodes 329355 → 561906 (+232551); edges 1512994 → 1678102 (+165108).

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
| calls | 592880 | 796396 | +203516 |
| contains | 318058 | 550659 | +232601 |
| decorates | 756 | 0 | -756 |
| exports | 0 | 7466 | +7466 |
| extends | 6286 | 0 | -6286 |
| implements | 4753 | 0 | -4753 |
| imports | 271051 | 264378 | -6673 |
| instantiates | 54921 | 57462 | +2541 |
| references | 264289 | 1741 | -262548 |

## Metrics

- zcodegraph: wallTimeDeltaPct=28.794866653298577, peakRssDeltaPct=0.30985915492957744
- excalidraw: wallTimeDeltaPct=16.87098657326328, peakRssDeltaPct=-4.532736429770566
- vscode: wallTimeDeltaPct=13.03178743979369, peakRssDeltaPct=-1.477832512315271

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 73 | 2357 | 2557 | 46 | 4987 |
| zcodegraph | rust | 33 | 2244 | 4146 | 46 | 6423 |
| excalidraw | typescript | 28 | 1674 | 1724 | 44 | 3426 |
| excalidraw | rust | 9 | 1649 | 2346 | 45 | 4004 |
| vscode | typescript | 2769 | 246010 | 287502 | 232 | 536281 |
| vscode | rust | 2795 | 250712 | 352660 | 179 | 606168 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| zcodegraph | sourceScanMs | 0 |
| zcodegraph | parseExtractionMs | 1069 |
| zcodegraph | sqliteWriteMs | 1693 |
| zcodegraph | subprocessStartupHandoffMs | 3 |
| zcodegraph | frameworkPostExtractMs | 4 |
| zcodegraph | referenceResolutionMs | 543 |
| zcodegraph | dynamicDispatchSynthesisMs | 337 |
| zcodegraph | dbMaintenanceMs | 5 |
| zcodegraph | typescriptFinalizationMs | 889 |
| excalidraw | sourceScanMs | 0 |
| excalidraw | parseExtractionMs | 814 |
| excalidraw | sqliteWriteMs | 667 |
| excalidraw | subprocessStartupHandoffMs | 2 |
| excalidraw | frameworkPostExtractMs | 3 |
| excalidraw | referenceResolutionMs | 289 |
| excalidraw | dynamicDispatchSynthesisMs | 344 |
| excalidraw | dbMaintenanceMs | 4 |
| excalidraw | typescriptFinalizationMs | 640 |
| vscode | sourceScanMs | 90 |
| vscode | parseExtractionMs | 43904 |
| vscode | sqliteWriteMs | 160722 |
| vscode | subprocessStartupHandoffMs | 3 |
| vscode | frameworkPostExtractMs | 50 |
| vscode | referenceResolutionMs | 124152 |
| vscode | dynamicDispatchSynthesisMs | 10336 |
| vscode | dbMaintenanceMs | 860 |
| vscode | typescriptFinalizationMs | 135598 |

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
