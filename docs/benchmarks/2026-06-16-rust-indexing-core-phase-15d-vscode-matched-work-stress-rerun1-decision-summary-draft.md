# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-phase-15d-vscode-matched-work-stress-local
Manifest: .workbuddy/phase15d-vscode-matched-work-stress.experiment.json
Classification: failed-required-arm-unavailable

## Target matrix

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| vscode | stress | no | available | failed | failed | target-failed-arm-unavailable |

## Preflight summary

Experiment preflight: completed
Rust core: available (c:\workspace\github\jununfly\ZCodeGraph\target\debug\zcodegraph-core.exe)

## Rust graph work profiles

| Target | Effective profile | Source |
|---|---|---|
| vscode | matched-ts-js | experiment |

`full` runs the default Rust extraction scope. matched-ts-js controls the most obvious rerun5 cost drivers, including constant expansion, component detection, field/export extraction, and aggressive call extraction where currently supported, without post-hoc output trimming.

## Arm availability and graph stats

### vscode

- TypeScript: graph unavailable; stats: null
- Rust: graph unavailable; stats: null

## GraphStats parity

### vscode graphStats parity

GraphStats parity unavailable because one or both arms did not produce graph stats.

## Metrics

- vscode: wallTimeDeltaPct=null, peakRssDeltaPct=null

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| vscode | typescript | n/a | n/a | n/a | n/a | 0 |
| vscode | rust | n/a | n/a | n/a | n/a | 0 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| vscode | n/a | n/a |

## Gates

- vscode: sufficiency=unavailable; performance=unavailable

## Regressions

- vscode: none recorded

## Classifications

- vscode: target-failed-arm-unavailable
- experiment: failed-required-arm-unavailable

## Rollout recommendation draft

Rust default rollout readiness is not claimed by this generated draft.
