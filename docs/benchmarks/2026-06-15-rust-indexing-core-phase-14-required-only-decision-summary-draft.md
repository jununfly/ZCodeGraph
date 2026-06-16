# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-phase-14-required-only-local
Manifest: .workbuddy/phase14-required-only.experiment.json
Classification: failed-required-target-unavailable

## Target matrix

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| zcodegraph | required | yes | available | completed | skipped | target-failed-arm-unavailable |
| excalidraw | required | yes | unavailable (missing-target-path) | skipped | skipped | target-failed-preflight |

## Preflight summary

Experiment preflight: completed
Rust core: unavailable (c:\workspace\github\jununfly\ZCodeGraph\target\debug\zcodegraph-core.exe)

## Arm availability and graph stats

### zcodegraph

- TypeScript: graph available; stats: {"fileCount":286,"nodeCount":4119,"edgeCount":17463,"dbSizeBytes":17170432}
- Rust: graph unavailable; stats: null

### excalidraw

- TypeScript: graph unavailable; stats: null
- Rust: graph unavailable; stats: null

## Metrics

- zcodegraph: wallTimeDeltaPct=null, peakRssDeltaPct=null
- excalidraw: wallTimeDeltaPct=null, peakRssDeltaPct=null

## Gates

- zcodegraph: sufficiency=unavailable; performance=unavailable
- excalidraw: sufficiency=unavailable; performance=unavailable

## Regressions

- zcodegraph: none recorded
- excalidraw: none recorded

## Classifications

- zcodegraph: target-failed-arm-unavailable
- excalidraw: target-failed-preflight
- experiment: failed-required-target-unavailable

## Rollout recommendation draft

Rust default rollout readiness is not claimed by this generated draft.
