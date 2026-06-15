# Rust Indexing Core Phase 4 Readiness Refresh

Parent issue: [#79](https://github.com/jununfly/ZCodeGraph/issues/79)

Parent plan: [Rust Indexing Core Phase 4 Default Rollout Readiness Plan](../plans/2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md)

## Summary

Phase 4 readiness refresh keeps the Rust JS/TS indexing path opt-in while
rechecking the non-performance gates: package smoke, CI artifact contract,
failure safety, diagnostics, and default TypeScript safety.

This refresh does not make Rust the default engine.

## Raw Artifacts And Durability

- Package smoke: `/tmp/zcodegraph-rust-phase4-readiness/package-smoke/summary.json` (local-only provenance)
- Failure-safety matrix:
  `/tmp/zcodegraph-rust-phase4-readiness/failure-safety-matrix/summary.json` (local-only provenance)

The `/tmp` raw artifact paths record where the original local runs wrote their
machine-readable outputs. They may not exist outside that machine or after
cleanup. This checked-in document is the durable source of truth for the Phase 4
readiness refresh summary when those local-only raw artifacts are unavailable.

## Package Smoke

Generated at: `2026-06-13T13:17:00.064Z`

| Gate | Status |
|---|---|
| Bundle default TypeScript indexing | pass |
| Bundle explicit Rust indexing | pass |
| Bundle missing Rust binary fails safely | pass |
| Bundle launcher path preserved | pass |
| npm default TypeScript indexing | pass |
| npm explicit Rust indexing | pass |
| npm optional platform Rust core present | pass |
| npm missing optional package fails clearly | pass |
| npm has no postinstall | pass |
| npm does not mention local Rust compilation | pass |
| npx-like local smoke | pass |

Package smoke was local-only: it did not publish packages, create releases,
push tags, or contact the public npm registry.

## Failure-Safety Matrix

Generated at: `2026-06-13T13:17:08.657Z`

| Case | Status |
|---|---|
| `missing-binary` | pass |
| `nonzero-before-index` | pass |
| `malformed-stdout-json` | pass |
| `crash-after-temp-db` | pass |
| `partial-temp-db-then-fail` | pass |
| `lock-contention` | pass |
| `stale-lock-recovery` | pass |
| `packaged-binary-removed` | pass |

Every matrix case preserved the previous TypeScript-produced active index,
avoided activating a partial Rust index, included an actionable next step, and
left default TypeScript indexing working afterward.

## Automated Coverage

Targeted validation run:

```bash
npx vitest run \
  __tests__/rust-phase3-validation.test.ts \
  __tests__/rust-package-smoke.test.ts \
  __tests__/rust-failure-safety-matrix.test.ts \
  __tests__/ci-rust-packaged-path.test.ts \
  __tests__/status-json.test.ts
```

Result: 5 test files passed, 19 tests passed.

The validation summary now exposes a `phase4Readiness` object and a human
readable "Phase 4 Readiness" table so package smoke, failure safety,
diagnostics, default TypeScript smoke, Rust smoke, and CI artifact contract
coverage are visible from the top-level artifact.
