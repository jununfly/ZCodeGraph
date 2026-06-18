# Rust-Hybrid Phase 5 Packaged Smoke Evidence

## Summary

Phase 5 validates that release-like packaged CLI and staged npm shim paths can run the first-user `rust-hybrid` workflow.

Result: pass.

## Environment

- Date: 2026-06-18
- Host: macOS development machine
- Target: `darwin-arm64`
- ZCodeGraph version: `0.9.9`
- Rust core artifact: `release/rust-core/zcodegraph-core-darwin-arm64/zcodegraph-core`
- Extracted bundle: `/private/tmp/zcodegraph-phase5-packaged-smoke/extracted/zcodegraph-darwin-arm64`
- Staged npm root: `release/npm`
- Smoke artifacts: `/private/tmp/zcodegraph-phase5-packaged-smoke/artifacts`

The first direct `scripts/build-bundle.sh darwin-arm64` attempt could not resolve `nodejs.org` from the sandbox. For this local-only smoke, `build-bundle.sh` was rerun with a temporary `curl` shim that produced the same Node archive directory shape using the local Node executable as a wrapper. This validates the packaged launcher, bundle layout, Rust core discovery, status, doctor, and npm shim paths without contacting public registries, publishing packages, triggering release workflows, or uploading diagnostics.

## Commands

```bash
npm run build
cargo build --release --package zcodegraph-core
mkdir -p release/rust-core/zcodegraph-core-darwin-arm64
cp target/release/zcodegraph-core release/rust-core/zcodegraph-core-darwin-arm64/zcodegraph-core

# Local-only Node runtime stand-in used because nodejs.org was unavailable
# from the sandbox during this run.
PATH=/private/tmp/zcodegraph-phase5-fakebin:$PATH scripts/build-bundle.sh darwin-arm64
scripts/pack-npm.sh

rm -rf /private/tmp/zcodegraph-phase5-packaged-smoke
mkdir -p /private/tmp/zcodegraph-phase5-packaged-smoke/extracted
mkdir -p /private/tmp/zcodegraph-phase5-packaged-smoke/artifacts
tar -xzf release/zcodegraph-darwin-arm64.tar.gz \
  -C /private/tmp/zcodegraph-phase5-packaged-smoke/extracted
node scripts/rust-package-smoke.mjs \
  --bundle /private/tmp/zcodegraph-phase5-packaged-smoke/extracted/zcodegraph-darwin-arm64 \
  --npm-root release/npm \
  --out /private/tmp/zcodegraph-phase5-packaged-smoke/artifacts
```

Targeted tests:

```bash
npx vitest run \
  __tests__/rust-package-smoke.test.ts \
  __tests__/ci-rust-packaged-path.test.ts \
  __tests__/rust-phase3-validation.test.ts
```

## Test Evidence

The targeted test run passed:

```text
Test Files  3 passed (3)
Tests       10 passed (10)
```

The build passed:

```text
npm run build
```

## Packaged Smoke Gates

All package smoke gates passed:

| Gate | Status |
|---|---|
| bundle-init-rust-hybrid | pass |
| bundle-default-rust-hybrid | pass |
| bundle-explicit-rust-hybrid | pass |
| bundle-status-hybrid-metadata | pass |
| bundle-degraded-fallback-taxonomy | pass |
| bundle-doctor-last-run | pass |
| bundle-missing-rust-binary | pass |
| bundle-doctor-last-failure | pass |
| bundle-launcher-path | pass |
| npm-init-rust-hybrid | pass |
| npm-default-rust-hybrid | pass |
| npm-explicit-rust-hybrid | pass |
| npm-status-hybrid-metadata | pass |
| npm-degraded-fallback-taxonomy | pass |
| npm-doctor-last-run | pass |
| npm-missing-rust-binary | pass |
| npm-doctor-last-failure | pass |
| npm-optional-platform-rust-core | pass |
| npm-missing-optional-package | pass |
| npm-no-postinstall | pass |
| npm-no-local-rust-compilation | pass |
| npx-like-local-smoke | pass |

`gateFailures` was empty.

## Bundle Evidence

The extracted bundle smoke validated:

- launcher path is `bin/zcodegraph`,
- Rust core path is `bin/zcodegraph-core`,
- `init -i` uses `rust-hybrid`,
- default `index` uses `rust-hybrid`,
- explicit `index --engine rust-hybrid` works,
- `status --json` exposes hybrid metadata,
- degraded fallback taxonomy is recorded,
- `doctor --engine rust-hybrid --bundle --last-run` creates a bundle,
- missing packaged Rust core fails safely,
- `doctor --engine rust-hybrid --bundle --last-failure` creates a bundle.

## Npm Shim Evidence

The staged npm smoke validated:

- platform package is `@jununfly/zcodegraph-darwin-arm64`,
- platform package supplies `bin/zcodegraph-core`,
- npm shim `init -i` uses `rust-hybrid`,
- npm shim default `index` uses `rust-hybrid`,
- npm shim explicit `index --engine rust-hybrid` works,
- npm shim `status --json` exposes hybrid metadata,
- npm shim degraded fallback taxonomy is recorded,
- npm shim `doctor --last-run` creates a bundle,
- npm shim missing Rust core failure path creates `doctor --last-failure`,
- missing optional platform package fails clearly,
- package metadata has no postinstall and no local Rust compilation requirement,
- npx-like local smoke works.

## Known Gaps

- This smoke did not use the official downloaded Node runtime because the sandbox could not resolve `nodejs.org`; release workflow should still validate official runtime download in CI/release infrastructure.
- Real Gin packaged smoke remains out of scope for Phase 5.
- README and release messaging remain out of scope.
- SDK default behavior and SDK engine options remain out of scope.
- Rust-owned per-file parse/extraction fallback remains a separate follow-up.
- No npm publish, GitHub Release workflow trigger, or tag push was performed.
- Final first-user release readiness is not claimed by this evidence alone.
