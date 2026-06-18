# Rust-Hybrid Phase 4 Decision

## Decision

Phase 4 is accepted as the diagnostic bundle v1 slice for the CLI `rust-hybrid` full-index path.

The implementation now persists `last-run` and `last-failure` diagnostic records, exposes `zcodegraph doctor --engine rust-hybrid --bundle --last-run|--last-failure`, creates local directory bundles, excludes source and plaintext file paths by default, and prints targeted doctor hints for degraded and failed `rust-hybrid` runs.

This decision does not claim first-user release readiness.

## Evidence

- Build: `npm run build`
- Targeted smoke: `npx vitest run __tests__/rust-hybrid-doctor.test.ts __tests__/rust-index-engine-cli.test.ts __tests__/status-json.test.ts`
- Result: 58 passed
- Smoke evidence: `docs/benchmarks/2026-06-18-rust-hybrid-phase-4-diagnostic-bundle-smoke-evidence.md`

## Accepted Behavior

- Completed `rust-hybrid` runs write `.zcodegraph/diagnostics/last-run.json`.
- Process-level `rust-hybrid` failures write `.zcodegraph/diagnostics/last-failure.json`.
- `doctor --engine rust-hybrid --bundle --last-run` creates a local directory bundle.
- `doctor --engine rust-hybrid --bundle --last-failure` creates a local directory bundle.
- `--last-run` and `--last-failure` are mutually exclusive.
- Missing records fail with an actionable error.
- `--include-source-slice` fails explicitly because source slices are unsupported in bundle v1.
- Bundles include manifest, status, graph stats, profile or unavailable reason, corpus fingerprint, per-file diagnostics, replay manifest, and privacy summary.
- Run records and bundles include RSS unavailable reason when RSS was not collected.
- Git metadata is limited to low-risk fields and degrades to a taxonomy reason when unavailable.
- Default bundles exclude source code and plaintext file paths.
- Non-quiet degraded `rust-hybrid` output points users to `doctor --engine rust-hybrid --bundle --last-run`.
- Non-quiet process/system failure output points users to `doctor --engine rust-hybrid --bundle --last-failure`.
- Quiet mode remains quiet except for run-record persistence.

## Out Of Scope

- Packaged or release-like doctor smoke.
- README or release messaging.
- Source slices.
- Automatic diagnostic upload.
- Zip or tar archive generation.
- High-precision RSS sampling.
- Rust-owned per-file parse/extraction fallback to TypeScript.
- SDK default behavior or SDK engine options.
- Full agent A/B.
- First-user release readiness.

## Follow-Up

#225 remains the parent diagnostic bundle tracker for broader Rust indexing diagnostic feedback. Phase 4 satisfies the `rust-hybrid` local bundle v1 slice, but later release work still needs packaged/release-like validation before user-facing release messaging.
