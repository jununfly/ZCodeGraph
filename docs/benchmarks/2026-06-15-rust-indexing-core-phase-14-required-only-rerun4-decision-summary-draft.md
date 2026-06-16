# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-phase-14-required-only-local
Manifest: C:\workspace\github\jununfly\ZCodeGraph\.workbuddy\phase14-required-only.experiment.json
Classification: failed-required-performance-gate-unmet

## Target matrix

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| zcodegraph | required | yes | available | completed | completed | target-failed-performance-gate-unmet |
| excalidraw | required | yes | available | completed | completed | target-failed-performance-gate-unmet |

## Preflight summary

Experiment preflight: completed
Rust core: available (C:\workspace\github\jununfly\ZCodeGraph\target\debug\zcodegraph-core.exe)

## Arm availability and graph stats

### zcodegraph

- TypeScript: graph available; stats: {"fileCount":286,"nodeCount":4119,"edgeCount":17478,"nodeKinds":{"class":60,"constant":466,"file":286,"function":1079,"import":1190,"interface":165,"method":811,"property":2,"type_alias":35,"variable":25},"edgeKinds":{"calls":7524,"contains":3833,"extends":8,"implements":21,"imports":2890,"instantiates":410,"references":2792},"dbSizeBytes":17240064}
- Rust: graph available; stats: {"fileCount":286,"nodeCount":14023,"edgeCount":30948,"nodeKinds":{"class":59,"constant":7876,"export":50,"field":233,"file":286,"function":2381,"import":1186,"interface":165,"method":721,"type_alias":37,"variable":1029},"edgeKinds":{"calls":14484,"contains":13737,"exports":186,"imports":2360,"instantiates":181},"dbSizeBytes":23982080}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":627,"nodeCount":10281,"edgeCount":45018,"nodeKinds":{"class":77,"component":4,"constant":1007,"enum":3,"enum_member":39,"file":627,"function":1930,"import":4153,"interface":127,"method":1008,"property":776,"type_alias":471,"variable":59},"edgeKinds":{"calls":14605,"contains":9619,"extends":6,"implements":3,"imports":10955,"instantiates":3931,"references":5899},"dbSizeBytes":33214464}
- Rust: graph available; stats: {"fileCount":627,"nodeCount":20703,"edgeCount":55102,"nodeKinds":{"class":76,"component":556,"constant":9655,"enum":3,"export":158,"field":233,"file":627,"function":2791,"import":4153,"interface":127,"method":830,"type_alias":480,"variable":1014},"edgeKinds":{"calls":22409,"contains":20076,"exports":1040,"imports":10468,"instantiates":230,"references":879},"dbSizeBytes":40177664}

## GraphStats parity

### zcodegraph graphStats parity

Totals: files 286 → 286 (0); nodes 4119 → 14023 (+9904); edges 17478 → 30948 (+13470).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 60 | 59 | -1 |
| constant | 466 | 7876 | +7410 |
| export | 0 | 50 | +50 |
| field | 0 | 233 | +233 |
| file | 286 | 286 | 0 |
| function | 1079 | 2381 | +1302 |
| import | 1190 | 1186 | -4 |
| interface | 165 | 165 | 0 |
| method | 811 | 721 | -90 |
| property | 2 | 0 | -2 |
| type_alias | 35 | 37 | +2 |
| variable | 25 | 1029 | +1004 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 7524 | 14484 | +6960 |
| contains | 3833 | 13737 | +9904 |
| exports | 0 | 186 | +186 |
| extends | 8 | 0 | -8 |
| implements | 21 | 0 | -21 |
| imports | 2890 | 2360 | -530 |
| instantiates | 410 | 181 | -229 |
| references | 2792 | 0 | -2792 |

### excalidraw graphStats parity

Totals: files 627 → 627 (0); nodes 10281 → 20703 (+10422); edges 45018 → 55102 (+10084).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| class | 77 | 76 | -1 |
| component | 4 | 556 | +552 |
| constant | 1007 | 9655 | +8648 |
| enum | 3 | 3 | 0 |
| enum_member | 39 | 0 | -39 |
| export | 0 | 158 | +158 |
| field | 0 | 233 | +233 |
| file | 627 | 627 | 0 |
| function | 1930 | 2791 | +861 |
| import | 4153 | 4153 | 0 |
| interface | 127 | 127 | 0 |
| method | 1008 | 830 | -178 |
| property | 776 | 0 | -776 |
| type_alias | 471 | 480 | +9 |
| variable | 59 | 1014 | +955 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| calls | 14605 | 22409 | +7804 |
| contains | 9619 | 20076 | +10457 |
| exports | 0 | 1040 | +1040 |
| extends | 6 | 0 | -6 |
| implements | 3 | 0 | -3 |
| imports | 10955 | 10468 | -487 |
| instantiates | 3931 | 230 | -3701 |
| references | 5899 | 879 | -5020 |

## Metrics

- zcodegraph: wallTimeDeltaPct=12.155892360037116, peakRssDeltaPct=4.034606818571184
- excalidraw: wallTimeDeltaPct=4.958943809370472, peakRssDeltaPct=-9.669055970718317

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 209 | 4605 | 4885 | 71 | 9699 |
| zcodegraph | rust | 188 | 4626 | 6064 | 72 | 10878 |
| excalidraw | typescript | 448 | 11781 | 12615 | 74 | 24844 |
| excalidraw | rust | 481 | 11839 | 13756 | 77 | 26076 |

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
