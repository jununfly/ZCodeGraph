# Rust Indexing Core Phase 14 Decision Summary Draft

Experiment: rust-indexing-core-phase-18-reduced-sqlite-before
Manifest: docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-reduced-sqlite-before.experiment.json
Classification: failed-required-performance-gate-unmet

## Target matrix

| Target | Class | Required | Preflight | TypeScript arm | Rust arm | Classification |
|---|---|---:|---|---|---|---|
| phase18-reduced | required | yes | available | completed | completed | target-failed-performance-gate-unmet |

## Preflight summary

Experiment preflight: completed
Rust core: available (/private/tmp/zcodegraph-phase18-baseline-worktree/target/debug/zcodegraph-core)

## Rust graph work profiles

| Target | Effective profile | Source |
|---|---|---|
| phase18-reduced | full | experiment |

`full` runs the default Rust extraction scope. matched-ts-js controls the most obvious rerun5 cost drivers, including constant expansion, component detection, field/export extraction, and aggressive call extraction where currently supported, without post-hoc output trimming.

## Rust SQLite write modes

| Target | Effective mode | Source |
|---|---|---|
| phase18-reduced | final-flush | experiment |

`final-flush` is the production Rust opt-in write path. `disk` remains a debug escape hatch, and `memory-final-flush` remains an explicit experimental prototype that does not claim production rollout readiness.

## Arm availability and graph stats

### phase18-reduced

- TypeScript: graph available; stats: {"fileCount":120,"nodeCount":12360,"edgeCount":12480,"nodeKinds":{"constant":9720,"file":120,"function":2400,"import":120},"edgeKinds":{"contains":12240,"imports":240},"dbSizeBytes":10133504}
- Rust: graph available; stats: {"fileCount":120,"nodeCount":12360,"edgeCount":12480,"nodeKinds":{"constant":9720,"file":120,"function":2400,"import":120},"edgeKinds":{"contains":12240,"imports":240},"dbSizeBytes":10625024}

## GraphStats parity

### phase18-reduced graphStats parity

Totals: files 120 → 120 (0); nodes 12360 → 12360 (0); edges 12480 → 12480 (0).

Node kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| constant | 9720 | 9720 | 0 |
| file | 120 | 120 | 0 |
| function | 2400 | 2400 | 0 |
| import | 120 | 120 | 0 |

Edge kind deltas

| Kind | TypeScript | Rust | Delta |
|---|---:|---:|---:|
| contains | 12240 | 12240 | 0 |
| imports | 240 | 240 | 0 |

## Metrics

- phase18-reduced: wallTimeDeltaPct=14.983164983164984, peakRssDeltaPct=1.55061439438268

## Wall-time diagnostics

| Target | Arm | Source copy ms | Init ms | Index ms | Graph stats ms | Total ms |
|---|---|---:|---:|---:|---:|---:|
| phase18-reduced | typescript | 12 | 952 | 1412 | 44 | 2376 |
| phase18-reduced | rust | 11 | 919 | 1802 | 44 | 2732 |

## Rust index profile breakdown

| Target | Phase | Duration ms |
|---|---|---:|
| phase18-reduced | sourceScanMs | 0 |
| phase18-reduced | parseExtractionMs | 254 |
| phase18-reduced | sqliteWriteMs | 786 |
| phase18-reduced | subprocessStartupHandoffMs | 367 |
| phase18-reduced | frameworkPostExtractMs | 3 |
| phase18-reduced | referenceResolutionMs | 57 |
| phase18-reduced | dynamicDispatchSynthesisMs | 21 |
| phase18-reduced | dbMaintenanceMs | 5 |
| phase18-reduced | typescriptFinalizationMs | 87 |

## Full-profile end-to-end segments

| Target | Segment | Duration ms | Status |
|---|---|---:|---|
| phase18-reduced | Rust source scan | 0 | measured |
| phase18-reduced | Rust parse extraction | 254 | measured |
| phase18-reduced | Rust SQLite write | 786 | measured |
| phase18-reduced | Rust subprocess startup/handoff | 367 | measured |
| phase18-reduced | TypeScript finalization | 87 | measured |
| phase18-reduced | Reference resolution | 57 | measured |
| phase18-reduced | Dynamic-dispatch synthesis | 21 | measured |
| phase18-reduced | DB maintenance | 5 | measured |
| phase18-reduced | graphStats measurement | 44 | measured |
| phase18-reduced | sufficiency measurement | unavailable | unavailable |

## Gates

- phase18-reduced: sufficiency=passed; performance=unavailable

## Regressions

- phase18-reduced: none recorded

## Classifications

- phase18-reduced: target-failed-performance-gate-unmet
- experiment: failed-required-performance-gate-unmet

## Rollout recommendation draft

Performance gate is not satisfied for required targets whose TypeScript and Rust arms both completed.
Rust default rollout readiness is not claimed by this generated draft.
