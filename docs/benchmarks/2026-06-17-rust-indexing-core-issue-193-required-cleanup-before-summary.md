# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-issue-193-required-cleanup-before
Manifest: docs/benchmarks/2026-06-17-rust-indexing-core-issue-193-required-cleanup-before.experiment.json
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

- TypeScript: graph available; stats: {"fileCount":290,"nodeCount":4174,"edgeCount":17662,"nodeKinds":{"class":60,"constant":470,"file":290,"function":1098,"import":1201,"interface":165,"method":815,"property":2,"type_alias":35,"variable":38},"edgeKinds":{"calls":7629,"contains":3884,"extends":8,"implements":21,"imports":2909,"instantiates":416,"references":2795},"dbSizeBytes":17342464}
- Rust: graph available; stats: {"fileCount":290,"nodeCount":14283,"edgeCount":30075,"nodeKinds":{"class":59,"constant":8026,"export":50,"field":233,"file":290,"function":2422,"import":1197,"interface":165,"method":725,"type_alias":38,"variable":1078},"edgeKinds":{"calls":13364,"contains":13993,"exports":186,"imports":2363,"instantiates":169},"dbSizeBytes":25931776}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":34,"nodeCount":2360,"edgeCount":7204,"nodeKinds":{"class":11,"constant":297,"file":34,"function":532,"import":757,"interface":11,"method":388,"property":208,"type_alias":105,"variable":17},"edgeKinds":{"calls":2729,"contains":2326,"imports":1175,"instantiates":95,"references":879},"dbSizeBytes":11526144}
- Rust: graph available; stats: {"fileCount":34,"nodeCount":6352,"edgeCount":11537,"nodeKinds":{"class":11,"component":158,"constant":3525,"field":81,"file":34,"function":851,"import":757,"interface":11,"method":364,"type_alias":106,"variable":454},"edgeKinds":{"calls":3875,"contains":6318,"exports":140,"imports":1141,"instantiates":35,"references":28},"dbSizeBytes":13946880}

## GraphStats parity

### zcodegraph graphStats parity

Totals: files 290 → 290 (0); nodes 4174 → 14283 (+10109); edges 17662 → 30075 (+12413).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 60 | 59 | -1 |
| constant | 470 | 8026 | +7556 |
| export | 0 | 50 | +50 |
| field | 0 | 233 | +233 |
| file | 290 | 290 | 0 |
| function | 1098 | 2422 | +1324 |
| import | 1201 | 1197 | -4 |
| interface | 165 | 165 | 0 |
| method | 815 | 725 | -90 |
| property | 2 | 0 | -2 |
| type_alias | 35 | 38 | +3 |
| variable | 38 | 1078 | +1040 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 7629 | 13364 | +5735 |
| contains | 3884 | 13993 | +10109 |
| exports | 0 | 186 | +186 |
| extends | 8 | 0 | -8 |
| implements | 21 | 0 | -21 |
| imports | 2909 | 2363 | -546 |
| instantiates | 416 | 169 | -247 |
| references | 2795 | 0 | -2795 |

### excalidraw graphStats parity

Totals: files 34 → 34 (0); nodes 2360 → 6352 (+3992); edges 7204 → 11537 (+4333).

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
| calls | 2729 | 3875 | +1146 |
| contains | 2326 | 6318 | +3992 |
| exports | 0 | 140 | +140 |
| imports | 1175 | 1141 | -34 |
| instantiates | 95 | 35 | -60 |
| references | 879 | 28 | -851 |

## Metrics

- zcodegraph: wallTimeDeltaPct=74.57627118644068, peakRssDeltaPct=0.3746487667811427
- excalidraw: wallTimeDeltaPct=53.95470955037742, peakRssDeltaPct=0

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 84 | 2085 | 2197 | 19 | 4366 |
| zcodegraph | rust | 33 | 2039 | 5550 | 20 | 7622 |
| excalidraw | typescript | 26 | 1503 | 1518 | 19 | 3047 |
| excalidraw | rust | 7 | 1486 | 3198 | 19 | 4691 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| zcodegraph | sourceScanMs | 0 |
| zcodegraph | parseExtractionMs | 1046 |
| zcodegraph | sqliteWriteMs | 1335 |
| zcodegraph | importPathAliasResolutionMs | 89 |
| zcodegraph | importPathAliasResolvedRefs | 616 |
| zcodegraph | importPathAliasFallbackRefs | 2380 |
| zcodegraph | importPathAliasBindingFallbackRefs | 2322 |
| zcodegraph | importPathAliasUnsupportedFallbackRefs | 49 |
| zcodegraph | importPathAliasUnresolvedFallbackRefs | 9 |
| zcodegraph | esmNamedImportExportResolutionMs | 391 |
| zcodegraph | esmNamedImportExportResolvedRefs | 2799 |
| zcodegraph | esmNamedImportExportFallbackRefs | 1445 |
| zcodegraph | esmOneHopReexportResolvedRefs | 279 |
| zcodegraph | localExactReferenceResolutionMs | 1525 |
| zcodegraph | localExactReferenceResolvedRefs | 3580 |
| zcodegraph | localExactReferenceFallbackRefs | 28594 |
| zcodegraph | subprocessStartupHandoffMs | 2 |
| zcodegraph | frameworkPostExtractMs | 4 |
| zcodegraph | referenceResolutionMs | 367 |
| zcodegraph | dynamicDispatchSynthesisMs | 318 |
| zcodegraph | dbMaintenanceMs | 5 |
| zcodegraph | typescriptFinalizationMs | 731 |
| excalidraw | sourceScanMs | 0 |
| excalidraw | parseExtractionMs | 789 |
| excalidraw | sqliteWriteMs | 521 |
| excalidraw | importPathAliasResolutionMs | 17 |
| excalidraw | importPathAliasResolvedRefs | 46 |
| excalidraw | importPathAliasFallbackRefs | 2425 |
| excalidraw | importPathAliasBindingFallbackRefs | 1734 |
| excalidraw | importPathAliasUnsupportedFallbackRefs | 221 |
| excalidraw | importPathAliasUnresolvedFallbackRefs | 470 |
| excalidraw | esmNamedImportExportResolutionMs | 116 |
| excalidraw | esmNamedImportExportResolvedRefs | 30 |
| excalidraw | esmNamedImportExportFallbackRefs | 1705 |
| excalidraw | esmOneHopReexportResolvedRefs | 0 |
| excalidraw | localExactReferenceResolutionMs | 1004 |
| excalidraw | localExactReferenceResolvedRefs | 2092 |
| excalidraw | localExactReferenceFallbackRefs | 16213 |
| excalidraw | subprocessStartupHandoffMs | 5 |
| excalidraw | frameworkPostExtractMs | 2 |
| excalidraw | referenceResolutionMs | 239 |
| excalidraw | dynamicDispatchSynthesisMs | 313 |
| excalidraw | dbMaintenanceMs | 6 |
| excalidraw | typescriptFinalizationMs | 583 |

## Rust finalization boundary

| Target | Protocol version | Product shell | Rust-owned stages | Fallback count |
|---|---:|---|---|---:|
| zcodegraph | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, esm-one-hop-reexport-resolution, local-exact-reference-resolution | 1507 |
| excalidraw | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, local-exact-reference-resolution | 2400 |

## Rust finalization fallback taxonomy

| Target | Stage | Classification | Reason | Count |
|---|---|---|---|---:|
| zcodegraph | framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 1445 |
| zcodegraph | reference-resolution | known-unsupported | unsupported-import-form-not-yet-rust-owned | 44 |
| zcodegraph | reference-resolution | known-unsupported | unresolved-file-level-import-target | 14 |
| excalidraw | framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 1705 |
| excalidraw | reference-resolution | known-unsupported | unsupported-import-form-not-yet-rust-owned | 6 |
| excalidraw | reference-resolution | known-unsupported | unresolved-file-level-import-target | 685 |

## Full-profile end-to-end segments

| Target | Segment | Duration ms | Status |
|---|---|---:|---|
| zcodegraph | Rust source scan | 0 | measured |
| zcodegraph | Rust parse extraction | 1046 | measured |
| zcodegraph | Rust SQLite write | 1335 | measured |
| zcodegraph | Rust subprocess startup/handoff | 2 | measured |
| zcodegraph | TypeScript finalization | 731 | measured |
| zcodegraph | Reference resolution | 367 | measured |
| zcodegraph | Dynamic-dispatch synthesis | 318 | measured |
| zcodegraph | DB maintenance | 5 | measured |
| zcodegraph | graphStats measurement | 20 | measured |
| zcodegraph | sufficiency measurement | unavailable | unavailable |
| excalidraw | Rust source scan | 0 | measured |
| excalidraw | Rust parse extraction | 789 | measured |
| excalidraw | Rust SQLite write | 521 | measured |
| excalidraw | Rust subprocess startup/handoff | 5 | measured |
| excalidraw | TypeScript finalization | 583 | measured |
| excalidraw | Reference resolution | 239 | measured |
| excalidraw | Dynamic-dispatch synthesis | 313 | measured |
| excalidraw | DB maintenance | 6 | measured |
| excalidraw | graphStats measurement | 19 | measured |
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
