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

- TypeScript: graph available; stats: {"fileCount":290,"nodeCount":4172,"edgeCount":17646,"nodeKinds":{"class":60,"constant":470,"file":290,"function":1098,"import":1201,"interface":165,"method":813,"property":2,"type_alias":35,"variable":38},"edgeKinds":{"calls":7619,"contains":3882,"extends":8,"implements":21,"imports":2909,"instantiates":412,"references":2795},"dbSizeBytes":17362944}
- Rust: graph available; stats: {"fileCount":290,"nodeCount":14253,"edgeCount":30507,"nodeKinds":{"class":59,"constant":8010,"export":50,"field":233,"file":290,"function":2410,"import":1197,"interface":165,"method":723,"type_alias":38,"variable":1078},"edgeKinds":{"calls":13814,"contains":13963,"exports":186,"imports":2363,"instantiates":181},"dbSizeBytes":25300992}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":34,"nodeCount":2360,"edgeCount":7204,"nodeKinds":{"class":11,"constant":297,"file":34,"function":532,"import":757,"interface":11,"method":388,"property":208,"type_alias":105,"variable":17},"edgeKinds":{"calls":2729,"contains":2326,"imports":1175,"instantiates":95,"references":879},"dbSizeBytes":11526144}
- Rust: graph available; stats: {"fileCount":34,"nodeCount":6352,"edgeCount":11537,"nodeKinds":{"class":11,"component":158,"constant":3525,"field":81,"file":34,"function":851,"import":757,"interface":11,"method":364,"type_alias":106,"variable":454},"edgeKinds":{"calls":3875,"contains":6318,"exports":140,"imports":1141,"instantiates":35,"references":28},"dbSizeBytes":13942784}

## GraphStats parity

### zcodegraph graphStats parity

Totals: files 290 → 290 (0); nodes 4172 → 14253 (+10081); edges 17646 → 30507 (+12861).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 60 | 59 | -1 |
| constant | 470 | 8010 | +7540 |
| export | 0 | 50 | +50 |
| field | 0 | 233 | +233 |
| file | 290 | 290 | 0 |
| function | 1098 | 2410 | +1312 |
| import | 1201 | 1197 | -4 |
| interface | 165 | 165 | 0 |
| method | 813 | 723 | -90 |
| property | 2 | 0 | -2 |
| type_alias | 35 | 38 | +3 |
| variable | 38 | 1078 | +1040 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 7619 | 13814 | +6195 |
| contains | 3882 | 13963 | +10081 |
| exports | 0 | 186 | +186 |
| extends | 8 | 0 | -8 |
| implements | 21 | 0 | -21 |
| imports | 2909 | 2363 | -546 |
| instantiates | 412 | 181 | -231 |
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

- zcodegraph: wallTimeDeltaPct=56.27139118179988, peakRssDeltaPct=0.3376477208778841
- excalidraw: wallTimeDeltaPct=44.49956229938722, peakRssDeltaPct=-2.1875

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 86 | 2380 | 2501 | 46 | 4967 |
| zcodegraph | rust | 34 | 2258 | 5470 | 48 | 7762 |
| excalidraw | typescript | 28 | 1681 | 1717 | 45 | 3427 |
| excalidraw | rust | 9 | 1689 | 3254 | 52 | 4952 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| zcodegraph | sourceScanMs | 0 |
| zcodegraph | parseExtractionMs | 1061 |
| zcodegraph | sqliteWriteMs | 1376 |
| zcodegraph | importPathAliasResolutionMs | 90 |
| zcodegraph | importPathAliasResolvedRefs | 616 |
| zcodegraph | importPathAliasFallbackRefs | 2380 |
| zcodegraph | importPathAliasBindingFallbackRefs | 2322 |
| zcodegraph | importPathAliasUnsupportedFallbackRefs | 49 |
| zcodegraph | importPathAliasUnresolvedFallbackRefs | 9 |
| zcodegraph | localExactReferenceResolutionMs | 1599 |
| zcodegraph | localExactReferenceResolvedRefs | 3582 |
| zcodegraph | localExactReferenceFallbackRefs | 30382 |
| zcodegraph | subprocessStartupHandoffMs | 3 |
| zcodegraph | frameworkPostExtractMs | 4 |
| zcodegraph | referenceResolutionMs | 455 |
| zcodegraph | dynamicDispatchSynthesisMs | 343 |
| zcodegraph | dbMaintenanceMs | 8 |
| zcodegraph | typescriptFinalizationMs | 856 |
| excalidraw | sourceScanMs | 0 |
| excalidraw | parseExtractionMs | 810 |
| excalidraw | sqliteWriteMs | 533 |
| excalidraw | importPathAliasResolutionMs | 19 |
| excalidraw | importPathAliasResolvedRefs | 46 |
| excalidraw | importPathAliasFallbackRefs | 2425 |
| excalidraw | importPathAliasBindingFallbackRefs | 1734 |
| excalidraw | importPathAliasUnsupportedFallbackRefs | 221 |
| excalidraw | importPathAliasUnresolvedFallbackRefs | 470 |
| excalidraw | localExactReferenceResolutionMs | 1018 |
| excalidraw | localExactReferenceResolvedRefs | 2092 |
| excalidraw | localExactReferenceFallbackRefs | 16214 |
| excalidraw | subprocessStartupHandoffMs | 3 |
| excalidraw | frameworkPostExtractMs | 4 |
| excalidraw | referenceResolutionMs | 260 |
| excalidraw | dynamicDispatchSynthesisMs | 358 |
| excalidraw | dbMaintenanceMs | 7 |
| excalidraw | typescriptFinalizationMs | 654 |

## Rust finalization boundary

| Target | Protocol version | Product shell | Rust-owned stages | Fallback count |
|---|---:|---|---|---:|
| zcodegraph | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, local-exact-reference-resolution | 2384 |
| excalidraw | 1 | typescript | source-scan, parse-extraction, graph-write, import-path-alias-resolution, local-exact-reference-resolution | 2429 |

## Rust finalization fallback taxonomy

| Target | Stage | Classification | Reason | Count |
|---|---|---|---|---:|
| zcodegraph | framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| zcodegraph | reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 2322 |
| zcodegraph | reference-resolution | known-unsupported | unsupported-import-form-not-yet-rust-owned | 44 |
| zcodegraph | reference-resolution | known-unsupported | unresolved-file-level-import-target | 14 |
| excalidraw | framework-post-extract | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | reference-resolution | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | dynamic-dispatch-synthesis | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | db-maintenance | known-unsupported | typescript-finalization-not-yet-migrated | 1 |
| excalidraw | reference-resolution | known-unsupported | binding-level-symbol-disambiguation-not-yet-rust-owned | 1734 |
| excalidraw | reference-resolution | known-unsupported | unsupported-import-form-not-yet-rust-owned | 6 |
| excalidraw | reference-resolution | known-unsupported | unresolved-file-level-import-target | 685 |

## Full-profile end-to-end segments

| Target | Segment | Duration ms | Status |
|---|---|---:|---|
| zcodegraph | Rust source scan | 0 | measured |
| zcodegraph | Rust parse extraction | 1061 | measured |
| zcodegraph | Rust SQLite write | 1376 | measured |
| zcodegraph | Rust subprocess startup/handoff | 3 | measured |
| zcodegraph | TypeScript finalization | 856 | measured |
| zcodegraph | Reference resolution | 455 | measured |
| zcodegraph | Dynamic-dispatch synthesis | 343 | measured |
| zcodegraph | DB maintenance | 8 | measured |
| zcodegraph | graphStats measurement | 48 | measured |
| zcodegraph | sufficiency measurement | unavailable | unavailable |
| excalidraw | Rust source scan | 0 | measured |
| excalidraw | Rust parse extraction | 810 | measured |
| excalidraw | Rust SQLite write | 533 | measured |
| excalidraw | Rust subprocess startup/handoff | 3 | measured |
| excalidraw | TypeScript finalization | 654 | measured |
| excalidraw | Reference resolution | 260 | measured |
| excalidraw | Dynamic-dispatch synthesis | 358 | measured |
| excalidraw | DB maintenance | 7 | measured |
| excalidraw | graphStats measurement | 52 | measured |
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
