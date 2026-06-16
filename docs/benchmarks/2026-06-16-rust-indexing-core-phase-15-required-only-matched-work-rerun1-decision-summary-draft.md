# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-phase-15-required-only-matched-work-local
Manifest: .workbuddy/phase15-required-only-matched-work.experiment.json
Classification: failed-required-performance-gate-unmet

## Target matrix

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| zcodegraph | required | yes | available | completed | completed | target-failed-performance-gate-unmet |
| excalidraw | required | yes | available | completed | completed | target-failed-performance-gate-unmet |

## Preflight summary

Experiment preflight: completed
Rust core: available (c:\workspace\github\jununfly\ZCodeGraph\target\debug\zcodegraph-core.exe)

## Rust graph work profiles

| Target | Effective profile | Source |
|---|---|---|
| zcodegraph | matched-ts-js | experiment |
| excalidraw | matched-ts-js | experiment |

`full` runs the default Rust extraction scope. matched-ts-js controls the most obvious rerun5 cost drivers, including constant expansion, component detection, field/export extraction, and aggressive call extraction where currently supported, without post-hoc output trimming.

## Arm availability and graph stats

### zcodegraph

- TypeScript: graph available; stats: {"fileCount":286,"nodeCount":4122,"edgeCount":17502,"nodeKinds":{"class":60,"constant":466,"file":286,"function":1082,"import":1190,"interface":165,"method":811,"property":2,"type_alias":35,"variable":25},"edgeKinds":{"calls":7543,"contains":3836,"extends":8,"implements":21,"imports":2890,"instantiates":410,"references":2794},"dbSizeBytes":17317888}
- Rust: graph available; stats: {"fileCount":286,"nodeCount":5869,"edgeCount":7869,"nodeKinds":{"class":59,"file":286,"function":2385,"import":1186,"interface":165,"method":721,"type_alias":38,"variable":1029},"edgeKinds":{"calls":1,"contains":5583,"imports":2285},"dbSizeBytes":6512640}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":627,"nodeCount":10281,"edgeCount":45018,"nodeKinds":{"class":77,"component":4,"constant":1007,"enum":3,"enum_member":39,"file":627,"function":1930,"import":4153,"interface":127,"method":1008,"property":776,"type_alias":471,"variable":59},"edgeKinds":{"calls":14605,"contains":9619,"extends":6,"implements":3,"imports":10955,"instantiates":3931,"references":5899},"dbSizeBytes":33214464}
- Rust: graph available; stats: {"fileCount":627,"nodeCount":10427,"edgeCount":19781,"nodeKinds":{"class":76,"enum":3,"file":627,"function":3111,"import":4153,"interface":127,"method":830,"type_alias":480,"variable":1020},"edgeKinds":{"calls":597,"contains":9800,"imports":9384},"dbSizeBytes":14782464}

## GraphStats parity

### zcodegraph graphStats parity

Totals: files 286 → 286 (0); nodes 4122 → 5869 (+1747); edges 17502 → 7869 (-9633).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 60 | 59 | -1 |
| constant | 466 | 0 | -466 |
| file | 286 | 286 | 0 |
| function | 1082 | 2385 | +1303 |
| import | 1190 | 1186 | -4 |
| interface | 165 | 165 | 0 |
| method | 811 | 721 | -90 |
| property | 2 | 0 | -2 |
| type_alias | 35 | 38 | +3 |
| variable | 25 | 1029 | +1004 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 7543 | 1 | -7542 |
| contains | 3836 | 5583 | +1747 |
| extends | 8 | 0 | -8 |
| implements | 21 | 0 | -21 |
| imports | 2890 | 2285 | -605 |
| instantiates | 410 | 0 | -410 |
| references | 2794 | 0 | -2794 |

### excalidraw graphStats parity

Totals: files 627 → 627 (0); nodes 10281 → 10427 (+146); edges 45018 → 19781 (-25237).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 77 | 76 | -1 |
| component | 4 | 0 | -4 |
| constant | 1007 | 0 | -1007 |
| enum | 3 | 3 | 0 |
| enum_member | 39 | 0 | -39 |
| file | 627 | 627 | 0 |
| function | 1930 | 3111 | +1181 |
| import | 4153 | 4153 | 0 |
| interface | 127 | 127 | 0 |
| method | 1008 | 830 | -178 |
| property | 776 | 0 | -776 |
| type_alias | 471 | 480 | +9 |
| variable | 59 | 1020 | +961 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 14605 | 597 | -14008 |
| contains | 9619 | 9800 | +181 |
| extends | 6 | 0 | -6 |
| implements | 3 | 0 | -3 |
| imports | 10955 | 9384 | -1571 |
| instantiates | 3931 | 0 | -3931 |
| references | 5899 | 0 | -5899 |

## Metrics

- zcodegraph: wallTimeDeltaPct=-14.947618533318932, peakRssDeltaPct=3.7457528797547033
- excalidraw: wallTimeDeltaPct=-21.985157699443413, peakRssDeltaPct=-8.709362564757114

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 178 | 4392 | 4688 | 74 | 9259 |
| zcodegraph | rust | 165 | 4395 | 3315 | 76 | 7875 |
| excalidraw | typescript | 367 | 11268 | 12081 | 80 | 23716 |
| excalidraw | rust | 349 | 11293 | 6860 | 79 | 18502 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| zcodegraph | sourceScanMs | 1 |
| zcodegraph | parseExtractionMs | 1317 |
| zcodegraph | sqliteWriteMs | 649 |
| zcodegraph | subprocessStartupHandoffMs | 35 |
| zcodegraph | frameworkPostExtractMs | 8 |
| zcodegraph | referenceResolutionMs | 199 |
| zcodegraph | dynamicDispatchSynthesisMs | 318 |
| zcodegraph | dbMaintenanceMs | 15 |
| zcodegraph | typescriptFinalizationMs | 543 |
| excalidraw | sourceScanMs | 4 |
| excalidraw | parseExtractionMs | 2139 |
| excalidraw | sqliteWriteMs | 1313 |
| excalidraw | subprocessStartupHandoffMs | 34 |
| excalidraw | frameworkPostExtractMs | 12 |
| excalidraw | referenceResolutionMs | 1741 |
| excalidraw | dynamicDispatchSynthesisMs | 428 |
| excalidraw | dbMaintenanceMs | 24 |
| excalidraw | typescriptFinalizationMs | 2207 |

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

## Full-profile vs matched-work interpretation

Prior full-profile rerun5 evidence: `docs/benchmarks/2026-06-16-rust-indexing-core-phase-14-required-only-rerun5.raw.json` classified the required-only run as `failed-required-performance-gate-unmet`.

Current matched-work evidence: `docs/benchmarks/2026-06-16-rust-indexing-core-phase-15-required-only-matched-work-rerun1.raw.json` also classifies the required-only run as `failed-required-performance-gate-unmet`, but the causal interpretation changes because Rust ran with `matched-ts-js` rather than the default full extraction scope.

| Target | Full-profile TS ms | Full-profile Rust ms | Full-profile wall delta | Matched-work TS ms | Matched-work Rust ms | Matched-work wall delta |
|---|---:|---:|---:|---:|---:|---:|
| zcodegraph | 9818 | 11072 | +12.77% | 9259 | 7875 | -14.95% |
| excalidraw | 25672 | 26408 | +2.87% | 23716 | 18502 | -21.99% |

Matched-work profile sharply reduced Rust graph output relative to the prior full-profile run while preserving graph availability and sufficiency:

| Target | Full-profile Rust nodes | Matched-work Rust nodes | Full-profile Rust edges | Matched-work Rust edges |
|---|---:|---:|---:|---:|
| zcodegraph | 14038 | 5869 | 30977 | 7869 |
| excalidraw | 20703 | 10427 | 55102 | 19781 |

This evidence supports the hypothesis that the previous raw A/B comparison was materially affected by Rust doing different graph work. It does not, by itself, redefine the original PRD performance gate. The original raw PRD gate remains unmet; matched-work evidence should be used as controlled-variable interpretation for maintainer review in #168.

## Rollout recommendation draft

Performance gate is not satisfied for required targets under the original raw PRD gate. Matched-work evidence improves the interpretation and shows Rust faster on wall time for the required targets under the `matched-ts-js` control profile, but this generated draft does not redefine the gate.
Rust default rollout readiness is not claimed by this generated draft.
