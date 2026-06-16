# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-phase-15-required-only-matched-work-local
Manifest: .workbuddy/phase15-required-only-matched-work.experiment.json
Classification: failed-required-arm-unavailable

## Target matrix

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| zcodegraph | required | yes | available | completed | failed | target-failed-arm-unavailable |
| excalidraw | required | yes | available | completed | failed | target-failed-arm-unavailable |

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
- Rust: graph unavailable; stats: null

### excalidraw

- TypeScript: graph available; stats: {"fileCount":627,"nodeCount":10281,"edgeCount":45018,"nodeKinds":{"class":77,"component":4,"constant":1007,"enum":3,"enum_member":39,"file":627,"function":1930,"import":4153,"interface":127,"method":1008,"property":776,"type_alias":471,"variable":59},"edgeKinds":{"calls":14605,"contains":9619,"extends":6,"implements":3,"imports":10955,"instantiates":3931,"references":5899},"dbSizeBytes":33214464}
- Rust: graph unavailable; stats: null

## GraphStats parity

### zcodegraph graphStats parity

GraphStats parity unavailable because one or both arms did not produce graph stats.

### excalidraw graphStats parity

GraphStats parity unavailable because one or both arms did not produce graph stats.

## Metrics

- zcodegraph: wallTimeDeltaPct=null, peakRssDeltaPct=null
- excalidraw: wallTimeDeltaPct=null, peakRssDeltaPct=null

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| zcodegraph | typescript | 220 | 4598 | 4897 | 73 | 9715 |
| zcodegraph | rust | 203 | 4589 | 4603 | 0 | 9395 |
| excalidraw | typescript | 812 | 12497 | 12897 | 77 | 26206 |
| excalidraw | rust | 439 | 11891 | 1989 | 0 | 14320 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| zcodegraph | n/a | n/a |
| excalidraw | n/a | n/a |

## Gates

- zcodegraph: sufficiency=unavailable; performance=unavailable
- excalidraw: sufficiency=unavailable; performance=unavailable

## Regressions

- zcodegraph: none recorded
- excalidraw: none recorded

## Classifications

- zcodegraph: target-failed-arm-unavailable
- excalidraw: target-failed-arm-unavailable
- experiment: failed-required-arm-unavailable

## Rollout recommendation draft

Rust default rollout readiness is not claimed by this generated draft.
