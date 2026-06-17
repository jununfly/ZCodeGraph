# Rust Indexing Core Phase 20 Required-Only Validation Summary

Experiment: rust-indexing-core-phase-20-required-only
Manifest: docs/benchmarks/2026-06-17-rust-indexing-core-phase-20-required-only.experiment.json
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

- TypeScript: graph available; stats: {"fileCount":290,"nodeCount":4173,"edgeCount":17654,"nodeKinds":{"class":60,"constant":470,"file":290,"function":1098,"import":1201,"interface":165,"method":814,"property":2,"type_alias":35,"variable":38},"edgeKinds":{"calls":7624,"contains":3883,"extends":8,"implements":21,"imports":2909,"instantiates":414,"references":2795},"dbSizeBytes":17309696}
- Rust: graph available; stats: {"fileCount":290,"nodeCount":14268,"edgeCount":30033,"nodeKinds":{"class":59,"constant":8018,"export":50,"field":233,"file":290,"function":2416,"import":1197,"interface":165,"method":724,"type_alias":38,"variable":1078},"edgeKinds":{"calls":13337,"contains":13978,"exports":186,"imports":2363,"instantiates":169},"dbSizeBytes":25874432}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":34,"nodeCount":2360,"edgeCount":7204,"nodeKinds":{"class":11,"constant":297,"file":34,"function":532,"import":757,"interface":11,"method":388,"property":208,"type_alias":105,"variable":17},"edgeKinds":{"calls":2729,"contains":2326,"imports":1175,"instantiates":95,"references":879},"dbSizeBytes":11526144}
- Rust: graph available; stats: {"fileCount":34,"nodeCount":6352,"edgeCount":11537,"nodeKinds":{"class":11,"component":158,"constant":3525,"field":81,"file":34,"function":851,"import":757,"interface":11,"method":364,"type_alias":106,"variable":454},"edgeKinds":{"calls":3875,"contains":6318,"exports":140,"imports":1141,"instantiates":35,"references":28},"dbSizeBytes":13946880}

## GraphStats parity

### zcodegraph graphStats parity

Totals: files 290 → 290 (0); nodes 4173 → 14268 (+10095); edges 17654 → 30033 (+12379).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 60 | 59 | -1 |
| constant | 470 | 8018 | +7548 |
| export | 0 | 50 | +50 |
| field | 0 | 233 | +233 |
| file | 290 | 290 | 0 |
| function | 1098 | 2416 | +1318 |
| import | 1201 | 1197 | -4 |
| interface | 165 | 165 | 0 |
| method | 814 | 724 | -90 |
| property | 2 | 0 | -2 |
| type_alias | 35 | 38 | +3 |
| variable | 38 | 1078 | +1040 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 7624 | 13337 | +5713 |
| contains | 3883 | 13978 | +10095 |
| exports | 0 | 186 | +186 |
| extends | 8 | 0 | -8 |
| implements | 21 | 0 | -21 |
| imports | 2909 | 2363 | -546 |
| instantiates | 414 | 169 | -245 |
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

- zcodegraph: wallTimeDeltaPct=66.30570595585172, peakRssDeltaPct=7.539536594336154
- excalidraw: wallTimeDeltaPct=50.84955205437133, peakRssDeltaPct=0

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 90 | 2210 | 2502 | 21 | 4802 |
| zcodegraph | rust | 34 | 2162 | 5790 | 25 | 7986 |
| excalidraw | typescript | 27 | 1573 | 1637 | 21 | 3237 |
| excalidraw | rust | 10 | 1582 | 3291 | 21 | 4883 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| zcodegraph | sourceScanMs | 0 |
| zcodegraph | parseExtractionMs | 1085 |
| zcodegraph | sqliteWriteMs | 1441 |
| zcodegraph | importPathAliasResolutionMs | 92 |
| zcodegraph | importPathAliasResolvedRefs | 616 |
| zcodegraph | importPathAliasFallbackRefs | 2380 |
| zcodegraph | importPathAliasBindingFallbackRefs | 2322 |
| zcodegraph | importPathAliasUnsupportedFallbackRefs | 49 |
| zcodegraph | importPathAliasUnresolvedFallbackRefs | 9 |
| zcodegraph | esmNamedImportExportResolutionMs | 364 |
| zcodegraph | esmNamedImportExportResolvedRefs | 2520 |
| zcodegraph | esmNamedImportExportFallbackRefs | 1460 |
| zcodegraph | localExactReferenceResolutionMs | 1574 |
| zcodegraph | localExactReferenceResolvedRefs | 3579 |
| zcodegraph | localExactReferenceFallbackRefs | 28789 |
| zcodegraph | subprocessStartupHandoffMs | 3 |
| zcodegraph | frameworkPostExtractMs | 4 |
| zcodegraph | referenceResolutionMs | 403 |
| zcodegraph | dynamicDispatchSynthesisMs | 333 |
| zcodegraph | dbMaintenanceMs | 5 |
| zcodegraph | typescriptFinalizationMs | 784 |
| excalidraw | sourceScanMs | 0 |
| excalidraw | parseExtractionMs | 823 |
| excalidraw | sqliteWriteMs | 544 |
| excalidraw | importPathAliasResolutionMs | 18 |
| excalidraw | importPathAliasResolvedRefs | 46 |
| excalidraw | importPathAliasFallbackRefs | 2425 |
| excalidraw | importPathAliasBindingFallbackRefs | 1734 |
| excalidraw | importPathAliasUnsupportedFallbackRefs | 221 |
| excalidraw | importPathAliasUnresolvedFallbackRefs | 470 |
| excalidraw | esmNamedImportExportResolutionMs | 55 |
| excalidraw | esmNamedImportExportResolvedRefs | 30 |
| excalidraw | esmNamedImportExportFallbackRefs | 1705 |
| excalidraw | localExactReferenceResolutionMs | 1060 |
| excalidraw | localExactReferenceResolvedRefs | 2092 |
| excalidraw | localExactReferenceFallbackRefs | 16213 |
| excalidraw | subprocessStartupHandoffMs | 3 |
| excalidraw | frameworkPostExtractMs | 3 |
| excalidraw | referenceResolutionMs | 250 |
| excalidraw | dynamicDispatchSynthesisMs | 335 |
| excalidraw | dbMaintenanceMs | 7 |
| excalidraw | typescriptFinalizationMs | 618 |

## Rust finalization boundary

| Target | Protocol version | Product shell | Rust-owned stages | Fallback count |
|---|---:|---|---|---:|
| zcodegraph | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, local-exact-reference-resolution | 1522 |
| excalidraw | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, esm-named-import-export-resolution, local-exact-reference-resolution | 2400 |

## Rust finalization fallback taxonomy

| Target | Stage | Classification | Reason | Count |
|---|---|---|---|---:|
| zcodegraph | framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 1460 |
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
| zcodegraph | Rust parse extraction | 1085 | measured |
| zcodegraph | Rust SQLite write | 1441 | measured |
| zcodegraph | Rust subprocess startup/handoff | 3 | measured |
| zcodegraph | TypeScript finalization | 784 | measured |
| zcodegraph | Reference resolution | 403 | measured |
| zcodegraph | Dynamic-dispatch synthesis | 333 | measured |
| zcodegraph | DB maintenance | 5 | measured |
| zcodegraph | graphStats measurement | 25 | measured |
| zcodegraph | sufficiency measurement | unavailable | unavailable |
| excalidraw | Rust source scan | 0 | measured |
| excalidraw | Rust parse extraction | 823 | measured |
| excalidraw | Rust SQLite write | 544 | measured |
| excalidraw | Rust subprocess startup/handoff | 3 | measured |
| excalidraw | TypeScript finalization | 618 | measured |
| excalidraw | Reference resolution | 250 | measured |
| excalidraw | Dynamic-dispatch synthesis | 335 | measured |
| excalidraw | DB maintenance | 7 | measured |
| excalidraw | graphStats measurement | 21 | measured |
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
