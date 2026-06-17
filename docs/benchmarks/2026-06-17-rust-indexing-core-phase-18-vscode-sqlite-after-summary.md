# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-phase-18-vscode-sqlite-after
Manifest: docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-vscode-sqlite-after.experiment.json
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

- TypeScript: graph available; stats: {"fileCount":11098,"nodeCount":329355,"edgeCount":1512994,"nodeKinds":{"class":13204,"component":9,"constant":13580,"enum":1999,"enum_member":12799,"file":11098,"function":21411,"import":106827,"interface":13284,"method":123696,"property":6368,"route":1,"type_alias":4428,"variable":651},"edgeKinds":{"calls":592880,"contains":318058,"decorates":756,"extends":6286,"implements":4753,"imports":271051,"instantiates":54921,"references":264289},"dbSizeBytes":1057370112}
- Rust: graph available; stats: {"fileCount":11291,"nodeCount":561906,"edgeCount":1678102,"nodeKinds":{"class":12680,"component":202,"constant":208276,"enum":1999,"export":1012,"field":43691,"file":11291,"function":40037,"import":107519,"interface":13438,"method":88931,"type_alias":4948,"variable":27882},"edgeKinds":{"calls":796396,"contains":550659,"exports":7466,"imports":264378,"instantiates":57462,"references":1741},"dbSizeBytes":1171955712}

## GraphStats parity

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

- vscode: wallTimeDeltaPct=11.913712335897287, peakRssDeltaPct=-4.8997772828507795

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| vscode | typescript | 2776 | 246708 | 286537 | 237 | 536021 |
| vscode | rust | 2827 | 246445 | 350609 | 179 | 599881 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| vscode | sourceScanMs | 93 |
| vscode | parseExtractionMs | 43607 |
| vscode | sqliteWriteMs | 153186 |
| vscode | subprocessStartupHandoffMs | 3 |
| vscode | frameworkPostExtractMs | 48 |
| vscode | referenceResolutionMs | 127909 |
| vscode | dynamicDispatchSynthesisMs | 11125 |
| vscode | dbMaintenanceMs | 2237 |
| vscode | typescriptFinalizationMs | 141442 |

## Full-profile end-to-end segments

| Target | Segment | Duration ms | Status |
|---|---|---:|---|
| vscode | Rust source scan | 93 | measured |
| vscode | Rust parse extraction | 43607 | measured |
| vscode | Rust SQLite write | 153186 | measured |
| vscode | Rust subprocess startup/handoff | 3 | measured |
| vscode | TypeScript finalization | 141442 | measured |
| vscode | Reference resolution | 127909 | measured |
| vscode | Dynamic-dispatch synthesis | 11125 | measured |
| vscode | DB maintenance | 2237 | measured |
| vscode | graphStats measurement | 179 | measured |
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
