# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-issue-209-required-edge-write-after
Manifest: docs/benchmarks/2026-06-18-rust-indexing-core-issue-209-required-edge-write-after.experiment.json
Classification: failed-required-performance-gate-unmet

## Target matrix

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| zcodegraph | required | yes | available | completed | completed | target-failed-performance-gate-unmet |
| excalidraw | required | yes | available | completed | completed | target-success-comparison-completed |

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

- TypeScript: graph available; stats: {"fileCount":288,"nodeCount":4159,"edgeCount":17724,"nodeKinds":{"class":60,"constant":471,"file":288,"function":1091,"import":1204,"interface":167,"method":816,"property":2,"type_alias":35,"variable":25},"edgeKinds":{"calls":7660,"contains":3871,"extends":8,"implements":21,"imports":2919,"instantiates":417,"references":2828},"dbSizeBytes":17362944}
- Rust: graph available; stats: {"fileCount":288,"nodeCount":14270,"edgeCount":30083,"nodeKinds":{"class":59,"constant":8061,"export":50,"field":233,"file":288,"function":2415,"import":1200,"interface":167,"method":726,"type_alias":38,"variable":1033},"edgeKinds":{"calls":13372,"contains":13982,"exports":186,"imports":2373,"instantiates":170},"dbSizeBytes":26001408}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":0,"nodeCount":0,"edgeCount":0,"nodeKinds":{},"edgeKinds":{},"dbSizeBytes":139264}
- Rust: graph available; stats: {"fileCount":0,"nodeCount":0,"edgeCount":0,"nodeKinds":{},"edgeKinds":{},"dbSizeBytes":139264}

## GraphStats parity

### zcodegraph graphStats parity

Totals: files 288 → 288 (0); nodes 4159 → 14270 (+10111); edges 17724 → 30083 (+12359).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 60 | 59 | -1 |
| constant | 471 | 8061 | +7590 |
| export | 0 | 50 | +50 |
| field | 0 | 233 | +233 |
| file | 288 | 288 | 0 |
| function | 1091 | 2415 | +1324 |
| import | 1204 | 1200 | -4 |
| interface | 167 | 167 | 0 |
| method | 816 | 726 | -90 |
| property | 2 | 0 | -2 |
| type_alias | 35 | 38 | +3 |
| variable | 25 | 1033 | +1008 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 7660 | 13372 | +5712 |
| contains | 3871 | 13982 | +10111 |
| exports | 0 | 186 | +186 |
| extends | 8 | 0 | -8 |
| implements | 21 | 0 | -21 |
| imports | 2919 | 2373 | -546 |
| instantiates | 417 | 170 | -247 |
| references | 2828 | 0 | -2828 |

### excalidraw graphStats parity

Totals: files 0 → 0 (0); nodes 0 → 0 (0); edges 0 → 0 (0).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| n/a | 0 | 0 | 0 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| n/a | 0 | 0 | 0 |

## Metrics

- zcodegraph: wallTimeDeltaPct=79.04403108076289, peakRssDeltaPct=0.4734848484848485
- excalidraw: wallTimeDeltaPct=-17.91044776119403, peakRssDeltaPct=0

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 33 | 2031 | 2183 | 20 | 4247 |
| zcodegraph | rust | 34 | 2055 | 5515 | 19 | 7604 |
| excalidraw | typescript | 2 | 134 | 132 | 19 | 268 |
| excalidraw | rust | 2 | 138 | 80 | 17 | 220 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| zcodegraph | sourceScanMs | 0 |
| zcodegraph | parseExtractionMs | 1033 |
| zcodegraph | sqliteWriteMs | 1326 |
| zcodegraph | importPathAliasResolutionMs | 90 |
| zcodegraph | importPathAliasResolvedRefs | 619 |
| zcodegraph | importPathAliasFallbackRefs | 2387 |
| zcodegraph | importPathAliasBindingFallbackRefs | 2329 |
| zcodegraph | importPathAliasUnsupportedFallbackRefs | 49 |
| zcodegraph | importPathAliasUnresolvedFallbackRefs | 9 |
| zcodegraph | esmNamedImportExportResolutionMs | 397 |
| zcodegraph | esmNamedImportExportResolvedRefs | 2813 |
| zcodegraph | esmNamedImportExportFallbackRefs | 1447 |
| zcodegraph | esmOneHopReexportResolvedRefs | 279 |
| zcodegraph | localExactReferenceResolutionMs | 1506 |
| zcodegraph | localExactReferenceResolvedRefs | 3601 |
| zcodegraph | localExactReferenceFallbackRefs | 28543 |
| zcodegraph | subprocessStartupHandoffMs | 2 |
| zcodegraph | frameworkPostExtractMs | 3 |
| zcodegraph | referenceResolutionMs | 362 |
| zcodegraph | dynamicDispatchSynthesisMs | 326 |
| zcodegraph | dbMaintenanceMs | 9 |
| zcodegraph | typescriptFinalizationMs | 739 |
| excalidraw | n/a | n/a |

## Rust finalization boundary

| Target | Protocol version | Product shell | Rust-owned stages | Fallback count |
|---|---:|---|---|---:|
| zcodegraph | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, esm-one-hop-reexport-resolution, local-exact-reference-resolution | 1509 |

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

## Full-profile end-to-end segments

| Target | Segment | Duration ms | Status |
|---|---|---:|---|
| zcodegraph | Rust source scan | 0 | measured |
| zcodegraph | Rust parse extraction | 1033 | measured |
| zcodegraph | Rust SQLite write | 1326 | measured |
| zcodegraph | Rust subprocess startup/handoff | 2 | measured |
| zcodegraph | TypeScript finalization | 739 | measured |
| zcodegraph | Reference resolution | 362 | measured |
| zcodegraph | Dynamic-dispatch synthesis | 326 | measured |
| zcodegraph | DB maintenance | 9 | measured |
| zcodegraph | graphStats measurement | 19 | measured |
| zcodegraph | sufficiency measurement | unavailable | unavailable |
| excalidraw | Rust source scan | unavailable | unavailable |
| excalidraw | Rust parse extraction | unavailable | unavailable |
| excalidraw | Rust SQLite write | unavailable | unavailable |
| excalidraw | Rust subprocess startup/handoff | unavailable | unavailable |
| excalidraw | TypeScript finalization | unavailable | unavailable |
| excalidraw | Reference resolution | unavailable | unavailable |
| excalidraw | Dynamic-dispatch synthesis | unavailable | unavailable |
| excalidraw | DB maintenance | unavailable | unavailable |
| excalidraw | graphStats measurement | 17 | measured |
| excalidraw | sufficiency measurement | unavailable | unavailable |

## Gates

- zcodegraph: sufficiency=passed; performance=unavailable
- excalidraw: sufficiency=passed; performance=passed

## Regressions

- zcodegraph: none recorded
- excalidraw: none recorded

## Classifications

- zcodegraph: target-failed-performance-gate-unmet
- excalidraw: target-success-comparison-completed
- experiment: failed-required-performance-gate-unmet

## Rollout recommendation draft

Performance gate is not satisfied for required targets whose TypeScript and Rust arms both completed.
Rust default rollout readiness is not claimed by this generated draft.
