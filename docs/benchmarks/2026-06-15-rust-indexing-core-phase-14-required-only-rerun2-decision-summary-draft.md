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

- TypeScript: graph available; stats: {"fileCount":286,"nodeCount":4119,"edgeCount":17466,"dbSizeBytes":17186816}
- Rust: graph available; stats: {"fileCount":286,"nodeCount":13984,"edgeCount":30863,"dbSizeBytes":23883776}

### excalidraw

- TypeScript: graph available; stats: {"fileCount":627,"nodeCount":10281,"edgeCount":45018,"dbSizeBytes":33214464}
- Rust: graph available; stats: {"fileCount":627,"nodeCount":20703,"edgeCount":55102,"dbSizeBytes":40177664}

## Metrics

- zcodegraph: wallTimeDeltaPct=12.347354138398913, peakRssDeltaPct=null
- excalidraw: wallTimeDeltaPct=4.518760195758564, peakRssDeltaPct=null

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
