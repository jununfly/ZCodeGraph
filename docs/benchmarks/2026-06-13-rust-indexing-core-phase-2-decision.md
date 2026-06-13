# Rust Indexing Core Phase 2 Stop/Continue Decision

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
Parent plan: [Rust Indexing Core Phase 2 Packaging, CI, and Performance Hardening](../plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md)
Phase 2 results: [Rust Indexing Core Phase 2 Results](../benchmarks/2026-06-13-rust-indexing-core-phase-2-results.md)
Issue: [#69](https://github.com/jununfly/ZCodeGraph/issues/69)

## Decision

Continue the Rust indexing work into the next phase, but keep Rust opt-in.

Prepare a default-rollout plan: no. The default TypeScript indexer remains the
default for `zcodegraph index`, npm/npx, MCP hosts, and release bundles. The
Rust JS/TS indexing path is now packageable and continuously verifiable, but it
is not ready to become the default engine.

## Evidence Summary

### Packaging Status

Phase 2 satisfies the six-target Rust binary packaging contract:

| Release target | Bundle path | Status |
|---|---|---|
| `darwin-arm64` | `bin/zcodegraph-core` | Covered |
| `darwin-x64` | `bin/zcodegraph-core` | Covered |
| `linux-x64` | `bin/zcodegraph-core` | Covered |
| `linux-arm64` | `bin/zcodegraph-core` | Covered |
| `win32-x64` | `bin/zcodegraph-core.exe` | Covered |
| `win32-arm64` | `bin/zcodegraph-core.exe` | Covered |

The release workflow builds one `zcodegraph-core` artifact per target, release
bundles require the matching binary, and npm platform packages preserve the
binary from the bundle path.

### npm/npx And Default TypeScript Safety

npm/npx users do not compile Rust locally. Published packages carry prebuilt
Rust binaries through optional platform packages; source development remains
explicit via `cargo build --package zcodegraph-core`.

Default TypeScript indexing remains safe:

- `zcodegraph index` without `--engine rust` still uses the TypeScript indexer.
- Missing Rust binaries fail only the explicit Rust path.
- Explicit Rust failures preserve the previous active index.
- No `postinstall` Rust compilation path was added.

### CI Coverage

CI coverage now includes Rust build/test coverage, Rust CLI integration tests on
macOS, Linux, and Windows, default TypeScript path checks without a Rust binary,
packaged Rust path checks, and release-workflow artifact completeness checks.
There are no remaining platform gaps for the six Phase 2 release targets.

### Benchmark, Profile, And Agent Sufficiency

The Phase 2 benchmark/profile/Agent Sufficiency rerun covered ZCodeGraph and
Excalidraw.

| Repo | Rust wall-clock | Rust peak RSS | Agent Sufficiency |
|---|---:|---:|---|
| ZCodeGraph | 44.4% slower | 39.2% lower | No Rust regression |
| Excalidraw | 18.7% slower | 51.6% lower | No Rust regression |

The <100% slower stretch goal was met on both repositories. The profile shows
the #67 SQLite write batching optimization removed the prior extreme SQLite
write bottleneck. The largest remaining measured Excalidraw phase is
TypeScript finalization.

## Blockers Before Default Rollout

- The Rust path still covers only the Phase 1 JavaScript, TypeScript, JSX, and
  TSX slice; it is not a whole-product replacement for the TypeScript indexer.
- The path has deterministic parity and sufficiency evidence for the target
  slice, but default rollout needs broader release-cycle confidence after the
  six prebuilt binaries ship and are consumed by real npm/npx users.
- TypeScript finalization remains part of the Rust path and is now the largest
  measured Excalidraw phase.
- The default engine should not change until a separate default-rollout plan
  defines blast radius, rollback, telemetry/diagnostics, and release criteria.

## Outcome

Phase 2 is complete for packaging, CI, profiler, first optimization, benchmark,
and deterministic Agent Sufficiency validation.

Keep Rust opt-in. Do not change the default engine in this phase. The next plan
should continue hardening the Rust path behind explicit `--engine rust` before
any default-rollout preparation.
