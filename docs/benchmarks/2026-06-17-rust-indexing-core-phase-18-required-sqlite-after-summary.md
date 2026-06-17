# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-phase-18-required-sqlite-after
Manifest: docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-required-sqlite-after.experiment.json
Classification: failed-required-performance-gate-unmet

## Target matrix

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| zcodegraph | required | yes | available | completed | completed | target-failed-performance-gate-unmet |
| excalidraw | required | yes | available | completed | completed | target-failed-performance-gate-unmet |

## Preflight summary

Experiment preflight: completed
Rust core: available (/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core)

## Rust graph work profiles

| Target | Effective profile | Source |
|---|---|---|
| zcodegraph | full | experiment |
| excalidraw | full | experiment |

`full` runs the default Rust extraction scope. matched-ts-js controls the most obvious rerun5 cost drivers, including constant expansion, component detection, field/export extraction, and aggressive call extraction where currently supported, without post-hoc output trimming.

## Rust SQLite write modes

| Target | Effective mode | Source |
|---|---|---|
| zcodegraph | final-flush | experiment |
| excalidraw | final-flush | experiment |

`final-flush` is the production Rust opt-in write path. `disk` remains a debug escape hatch, and `memory-final-flush` remains an explicit experimental prototype that does not claim production rollout readiness.

## Arm availability and graph stats

### zcodegraph

- TypeScript: graph available; stats: {"fileCount":290,"nodeCount":4169,"edgeCount":17626,"nodeKinds":{"class":60,"constant":470,"file":290,"function":1097,"import":1201,"interface":165,"method":811,"property":2,"type_alias":35,"variable":38},"edgeKinds":{"calls":7606,"contains":3879,"extends":8,"implements":21,"imports":2908,"instantiates":410,"references":2794},"dbSizeBytes":17289216}
- Rust: graph available; stats: {"fileCount":290,"nodeCount":14215,"edgeCount":31338,"nodeKinds":{"class":59,"constant":7983,"export":50,"field":233,"file":290,"function":2401,"import":1197,"interface":165,"method":721,"type_alias":38,"variable":1078},"edgeKinds":{"calls":14674,"contains":13925,"exports":186,"imports":2372,"instantiates":181},"dbSizeBytes":24256512}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":34,"nodeCount":2360,"edgeCount":7204,"nodeKinds":{"class":11,"constant":297,"file":34,"function":532,"import":757,"interface":11,"method":388,"property":208,"type_alias":105,"variable":17},"edgeKinds":{"calls":2729,"contains":2326,"imports":1175,"instantiates":95,"references":879},"dbSizeBytes":11526144}
- Rust: graph available; stats: {"fileCount":34,"nodeCount":6352,"edgeCount":12100,"nodeKinds":{"class":11,"component":158,"constant":3525,"field":81,"file":34,"function":851,"import":757,"interface":11,"method":364,"type_alias":106,"variable":454},"edgeKinds":{"calls":4432,"contains":6318,"exports":140,"imports":1146,"instantiates":36,"references":28},"dbSizeBytes":13647872}

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

## Metrics

- zcodegraph: wallTimeDeltaPct=25.60376148749733, peakRssDeltaPct=0.36827195467422097
- excalidraw: wallTimeDeltaPct=13.577260356818869, peakRssDeltaPct=-4.217036828788305

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 73 | 2235 | 2370 | 45 | 4679 |
| zcodegraph | rust | 34 | 2188 | 3655 | 43 | 5877 |
| excalidraw | typescript | 27 | 1599 | 1681 | 41 | 3307 |
| excalidraw | rust | 10 | 1588 | 2158 | 44 | 3756 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| zcodegraph | sourceScanMs | 0 |
| zcodegraph | parseExtractionMs | 1019 |
| zcodegraph | sqliteWriteMs | 1296 |
| zcodegraph | subprocessStartupHandoffMs | 3 |
| zcodegraph | frameworkPostExtractMs | 3 |
| zcodegraph | referenceResolutionMs | 525 |
| zcodegraph | dynamicDispatchSynthesisMs | 325 |
| zcodegraph | dbMaintenanceMs | 5 |
| zcodegraph | typescriptFinalizationMs | 859 |
| excalidraw | sourceScanMs | 0 |
| excalidraw | parseExtractionMs | 789 |
| excalidraw | sqliteWriteMs | 519 |
| excalidraw | subprocessStartupHandoffMs | 3 |
| excalidraw | frameworkPostExtractMs | 3 |
| excalidraw | referenceResolutionMs | 289 |
| excalidraw | dynamicDispatchSynthesisMs | 336 |
| excalidraw | dbMaintenanceMs | 4 |
| excalidraw | typescriptFinalizationMs | 633 |

## Full-profile end-to-end segments

| Target | Segment | Duration ms | Status |
|---|---|---:|---|
| zcodegraph | Rust source scan | 0 | measured |
| zcodegraph | Rust parse extraction | 1019 | measured |
| zcodegraph | Rust SQLite write | 1296 | measured |
| zcodegraph | Rust subprocess startup/handoff | 3 | measured |
| zcodegraph | TypeScript finalization | 859 | measured |
| zcodegraph | Reference resolution | 525 | measured |
| zcodegraph | Dynamic-dispatch synthesis | 325 | measured |
| zcodegraph | DB maintenance | 5 | measured |
| zcodegraph | graphStats measurement | 43 | measured |
| zcodegraph | sufficiency measurement | unavailable | unavailable |
| excalidraw | Rust source scan | 0 | measured |
| excalidraw | Rust parse extraction | 789 | measured |
| excalidraw | Rust SQLite write | 519 | measured |
| excalidraw | Rust subprocess startup/handoff | 3 | measured |
| excalidraw | TypeScript finalization | 633 | measured |
| excalidraw | Reference resolution | 289 | measured |
| excalidraw | Dynamic-dispatch synthesis | 336 | measured |
| excalidraw | DB maintenance | 4 | measured |
| excalidraw | graphStats measurement | 44 | measured |
| excalidraw | sufficiency measurement | unavailable | unavailable |

## Gates

- zcodegraph: sufficiency=passed; performance=unavailable
- excalidraw: sufficiency=passed; performance=unavailable

## Regressions

- zcodegraph: none recorded
- excalidraw: none recorded

## Classifications

- zcodegraph: target-failed-performance-gate-unmet
- excalidraw: target-failed-performance-gate-unmet
- experiment: failed-required-performance-gate-unmet

## Rollout recommendation draft

Performance gate is not satisfied for required targets whose TypeScript and Rust arms both completed.
Rust default rollout readiness is not claimed by this generated draft.
