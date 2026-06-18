# Rust-Hybrid Phase 4 Diagnostic Bundle Smoke Evidence

## Summary

Phase 4 validates that `rust-hybrid` runs can produce privacy-preserving diagnostic bundle inputs for both degraded completed runs and process-level failures.

Result: pass.

## Environment

- Date: 2026-06-18
- Host: macOS development machine
- Node: 26.0.0 with `CODEGRAPH_ALLOW_UNSAFE_NODE=1` for local smoke only
- Rust core: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/target/debug/zcodegraph-core`
- ZCodeGraph CLI: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js`

## Commands

```bash
npm run build
npx vitest run __tests__/rust-hybrid-doctor.test.ts __tests__/rust-index-engine-cli.test.ts __tests__/status-json.test.ts
```

## Test Evidence

The targeted test run passed:

```text
Test Files  3 passed (3)
Tests       58 passed (58)
```

Covered suites:

- `__tests__/rust-hybrid-doctor.test.ts`
- `__tests__/rust-index-engine-cli.test.ts`
- `__tests__/status-json.test.ts`

## Degraded Last-Run Bundle

The smoke creates a source-checkout fixture containing TypeScript plus a non-Rust-owned Python file and runs `rust-hybrid` indexing with the real local Rust core.

Validated behavior:

- `.zcodegraph/diagnostics/last-run.json` is written.
- The run record reports `engine: "rust-hybrid"`, `kind: "last-run"`, `exitCode: 0`, `fallbackState: "degraded"`, and RSS unavailable reason.
- `zcodegraph doctor --engine rust-hybrid --bundle --last-run` exits successfully.
- The bundle contains `manifest.json`, `status.json`, `graph-stats.json`, `corpus-fingerprint.json`, `per-file-diagnostics.json`, `replay.md`, and `privacy.md`.
- `status.json` preserves hybrid fallback state.
- Bundle content excludes the fixture source needle and excludes plaintext temp paths.
- Corpus fingerprint and per-file diagnostics do not include plaintext file names.

## Forced Last-Failure Bundle

The smoke points `ZCODEGRAPH_RUST_CORE_BINARY` at a missing executable to force a Rust process-level failure.

Validated behavior:

- `.zcodegraph/diagnostics/last-failure.json` is written.
- The failure record reports `engine: "rust-hybrid"`, `kind: "last-failure"`, `exitCode: 1`, `previousIndexPreserved: true`, and RSS unavailable reason.
- The sanitized stderr tail includes the user-facing Rust engine failure.
- `zcodegraph doctor --engine rust-hybrid --bundle --last-failure` exits successfully.
- The bundle manifest records `source: "last-failure"`.
- Replay content references the failure source without leaking the temp project path.

## CLI Hint Evidence

The targeted CLI suite validates:

- Non-quiet degraded `rust-hybrid` output includes `zcodegraph doctor --engine rust-hybrid --bundle --last-run`.
- Non-quiet process-level `rust-hybrid` failure output includes `zcodegraph doctor --engine rust-hybrid --bundle --last-failure`.
- Quiet indexing remains quiet while still persisting diagnostic records.
- TypeScript escape hatch behavior remains unchanged.

## Privacy Evidence

The bundle v1 smoke asserts that default bundles exclude:

- source code,
- plaintext project paths,
- plaintext file names in corpus/per-file diagnostics,
- automatic upload behavior,
- source slices.

The smoke also asserts `--include-source-slice` exits non-zero with an explicit unsupported message.

## Known Gaps

- Packaged/release-like doctor smoke remains out of scope.
- README and release messaging remain out of scope.
- Source slices remain out of scope.
- RSS sampling remains out of scope; the bundle records an unavailable reason.
- Rust-owned per-file fallback remains out of scope.
- SDK behavior remains out of scope.
- First-user release readiness is not claimed by this evidence.
