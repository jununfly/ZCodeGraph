# Rust Indexing Core Phase 4 Profile Baseline

Parent issue: [#78](https://github.com/jununfly/ZCodeGraph/issues/78)

Parent plan: [Rust Indexing Core Phase 4 Default Rollout Readiness Plan](../plans/2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md)

## Summary

Phase 4 profiling now records comparable TypeScript and Rust wall-clock/RSS
evidence plus Rust-path finalization subphases. This baseline is the input for
the Phase 4 data-driven optimization trial.

Raw artifact:

- `/tmp/zcodegraph-rust-phase4-profile-baseline.json`

Generated at: `2026-06-13T13:09:24.779Z`

Toolchain:

- Node: `v26.0.0`
- Platform: `darwin arm64`
- Rust: `rustc 1.95.0 (59807616e 2026-04-14)`
- Cargo: `cargo 1.95.0 (f2d3ce0bd 2026-03-21)`
- OS: `Darwin 25.5.0 arm64`
- CPU: `Apple M5`

## Results

| Repo | Commit | Files | TypeScript wall | TypeScript RSS | Rust wall | Rust RSS | Dominant finalization subphase |
|---|---:|---:|---:|---:|---:|---:|---|
| ZCodeGraph | `16c1071` | 269 | 2023 ms | 360,529,920 bytes | 2890 ms | 221,020,160 bytes | `dynamicDispatchSynthesisMs` |
| Excalidraw | `a83ac488` | 648 | 5292 ms | 552,730,624 bytes | 6271 ms | 303,022,080 bytes | `dynamicDispatchSynthesisMs` |
| Zustand | `566b5bf` | 53 | 377 ms | 457,818,112 bytes | 404 ms | 92,880,896 bytes | `dynamicDispatchSynthesisMs` |

## Finalization Subphases

| Repo | Framework post-extract | Reference resolution | Dynamic-dispatch synthesis | DB maintenance |
|---|---:|---:|---:|---:|
| ZCodeGraph | 3 ms | 0 ms | 647 ms | 5 ms |
| Excalidraw | 7 ms | 0 ms | 2312 ms | 8 ms |
| Zustand | 1 ms | 0 ms | 73 ms | 3 ms |

## Notes

- RSS sampling requires access to local process information. In the sandboxed
  development environment, the profiler reports a machine-readable
  `rssUnavailableReason`; the baseline above was collected outside that sandbox
  so `peakRssBytes` is valid for all three hard-gate repositories.
- This baseline does not claim Rust is ready to become the default engine.
  Rust remains opt-in while Phase 4 gathers optimization and rollout-readiness
  evidence.
