# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-phase-15e-vscode-matched-work-stress-rerun4
Manifest: docs/benchmarks/2026-06-16-rust-indexing-core-phase-15e-vscode-matched-work-stress-rerun4.experiment.json
Classification: stress-only-targets-completed-with-nonblocking-failures

## Target matrix

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| vscode | stress | no | available | completed | completed | target-failed-performance-gate-unmet |

## Preflight summary

Experiment preflight: completed
Rust core: available (/private/tmp/zcodegraph-dhat-target/debug/zcodegraph-core)

## Rust graph work profiles

| Target | Effective profile | Source |
|---|---|---|
| vscode | matched-ts-js | experiment |

`full` runs the default Rust extraction scope. matched-ts-js controls the most obvious rerun5 cost drivers, including constant expansion, component detection, field/export extraction, and aggressive call extraction where currently supported, without post-hoc output trimming.

## Arm availability and graph stats

### vscode

- TypeScript: graph available; stats: {"fileCount":11098,"nodeCount":329355,"edgeCount":1512994,"nodeKinds":{"class":13204,"component":9,"constant":13580,"enum":1999,"enum_member":12799,"file":11098,"function":21411,"import":106827,"interface":13284,"method":123696,"property":6368,"route":1,"type_alias":4428,"variable":651},"edgeKinds":{"calls":592880,"contains":318058,"decorates":756,"extends":6286,"implements":4753,"imports":271051,"instantiates":54921,"references":264289},"dbSizeBytes":1057366016}
- Rust: graph available; stats: {"fileCount":11291,"nodeCount":308848,"edgeCount":553834,"nodeKinds":{"class":12680,"enum":1999,"file":11291,"function":40160,"import":107519,"interface":13438,"method":88931,"type_alias":4948,"variable":27882},"edgeKinds":{"calls":1031,"contains":297601,"imports":255202},"dbSizeBytes":466526208}

## GraphStats parity

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

- vscode: wallTimeDeltaPct=64.72096357527552, peakRssDeltaPct=-21.40740740740741

## Heap profiling

- vscode Rust heap report: `docs/benchmarks/phase-15e-rerun4/dhat-heap.json`
- vscode Rust heap summary HTML: `docs/benchmarks/phase-15e-rerun4/dhat-summary.html`
- Note: wall-time in this rerun includes `dhat` heap profiling overhead and is
  not a rollout-readiness wall-time signal.

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| vscode | typescript | 2631 | 215735 | 242667 | 74 | 461033 |
| vscode | rust | 2937 | 215032 | 541449 | 42 | 759418 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| vscode | sourceScanMs | 465 |
| vscode | parseExtractionMs | 423832 |
| vscode | sqliteWriteMs | 72772 |
| vscode | subprocessStartupHandoffMs | 5 |
| vscode | frameworkPostExtractMs | 43 |
| vscode | referenceResolutionMs | 22358 |
| vscode | dynamicDispatchSynthesisMs | 8337 |
| vscode | dbMaintenanceMs | 39 |
| vscode | typescriptFinalizationMs | 30808 |

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
