# Rust-Hybrid Phase 8 Packaged Smoke Recheck Evidence

## Summary

Current-main targeted packaged smoke passed.

The recheck validated the release-like bundle launcher, Rust core discovery, staged npm shim, default `rust-hybrid` indexing, explicit `rust-hybrid` indexing, hybrid status metadata, doctor last-run and last-failure bundles, and package-shape constraints. It did not run the GitHub Release workflow, publish npm packages, create tags, or upload diagnostics.

## Environment

- Date: 2026-06-19 local time
- Host: macOS development machine
- Target: `darwin-arm64`
- Package version: `0.9.9`
- Rust core artifact: `/private/tmp/zcodegraph-phase8-package-smoke/release/rust-core/zcodegraph-core-darwin-arm64/zcodegraph-core`
- Extracted bundle: `/private/tmp/zcodegraph-phase8-package-smoke/extracted/zcodegraph-darwin-arm64`
- Smoke artifacts: `/private/tmp/zcodegraph-phase8-package-smoke/artifacts`

The local sandbox did not use the official Node download path. As in Phase 5, a temporary local `curl` shim produced the expected Node archive directory shape with the local Node executable as a wrapper. This keeps the smoke local and deterministic while validating the package launcher, Rust core discovery, npm shim, status, doctor, and failure bundle paths.

## Commands

Build and targeted tests:

```bash
npm run build
npx vitest run \
  __tests__/rust-package-smoke.test.ts \
  __tests__/ci-rust-packaged-path.test.ts \
  __tests__/build-bundle-rust-core.test.ts \
  __tests__/pack-npm-rust-core.test.ts
```

Build current release-like bundle:

```bash
mkdir -p /private/tmp/zcodegraph-phase8-package-smoke/fakebin
mkdir -p /private/tmp/zcodegraph-phase8-package-smoke/release/rust-core/zcodegraph-core-darwin-arm64
cp target/release/zcodegraph-core \
  /private/tmp/zcodegraph-phase8-package-smoke/release/rust-core/zcodegraph-core-darwin-arm64/zcodegraph-core
PATH=/private/tmp/zcodegraph-phase8-package-smoke/fakebin:$PATH \
ZCODEGRAPH_RELEASE_DIR=/private/tmp/zcodegraph-phase8-package-smoke/release \
  scripts/build-bundle.sh darwin-arm64
```

Stage npm layout and run package smoke:

```bash
cp /private/tmp/zcodegraph-phase8-package-smoke/release/zcodegraph-darwin-arm64.tar.gz \
  release/zcodegraph-darwin-arm64.tar.gz
scripts/pack-npm.sh
mkdir -p /private/tmp/zcodegraph-phase8-package-smoke/extracted
tar -xzf /private/tmp/zcodegraph-phase8-package-smoke/release/zcodegraph-darwin-arm64.tar.gz \
  -C /private/tmp/zcodegraph-phase8-package-smoke/extracted
/usr/bin/time -p node scripts/rust-package-smoke.mjs \
  --bundle /private/tmp/zcodegraph-phase8-package-smoke/extracted/zcodegraph-darwin-arm64 \
  --npm-root release/npm \
  --out /private/tmp/zcodegraph-phase8-package-smoke/artifacts
```

## Results

Build result:

- `npm run build` passed.

Targeted tests:

```text
Test Files  4 passed (4)
Tests       10 passed (10)
```

Bundle build:

```text
[bundle] target=darwin-arm64 node=v24.16.0
[bundle] wrote /private/tmp/zcodegraph-phase8-package-smoke/release/zcodegraph-darwin-arm64.tar.gz (9.8M)
```

Npm staging:

```text
[pack-npm] @jununfly/zcodegraph-darwin-arm64@0.9.9
[pack-npm] @jununfly/zcodegraph@0.9.9 (1 platform packages in optionalDependencies)
```

Package smoke timing:

- Wall time: `5.65s`
- User time: `4.01s`
- System time: `0.90s`
- Peak RSS: unavailable.
- RSS unavailable reason: this smoke used `/usr/bin/time -p`, which reports wall/user/system time but not peak resident set size.

Package smoke summary:

```json
{
  "publishAttempted": false,
  "registryContactAllowed": false,
  "gateFailures": []
}
```

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

## Interpretation

The targeted packaged smoke satisfies the Phase 8 packaging release gate:

- Release-like bundle launcher finds the packaged Rust core.
- Release-like `init -i` uses `rust-hybrid`.
- Release-like default `index` uses `rust-hybrid`.
- Explicit `index --engine rust-hybrid` works.
- `status --json` exposes hybrid metadata.
- Degraded fallback taxonomy is recorded.
- Doctor last-run and last-failure bundles work.
- Staged npm shim finds the optional platform package and Rust core.
- The package shape has no postinstall and no local Rust compilation requirement.
- No publish, release workflow, tag push, or registry contact was attempted by the smoke script.

## Known Non-Blockers

- The local bundle used a deterministic Node runtime stand-in because this sandbox is not the release infrastructure.
- Real Gin packaged smoke remains out of scope; real Gin source-build smoke and targeted package smoke are separate Phase 8 gates.
- RSS was not available from this smoke command.
