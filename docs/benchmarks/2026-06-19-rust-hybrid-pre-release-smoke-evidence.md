# Rust-Hybrid Pre-Release Smoke Evidence

Date: 2026-06-19

Related issues: #278, #280

## Scope

This is a targeted release-candidate smoke pass for the first-user `rust-hybrid` path. It does not run the full release workflow, create a tag, publish to npm, or contact the npm registry.

## Source CLI Smoke

Command shape:

```bash
node dist/bin/zcodegraph.js init
node dist/bin/zcodegraph.js index --force
node dist/bin/zcodegraph.js status --json
node dist/bin/zcodegraph.js doctor --engine rust-hybrid --bundle --last-run
node dist/bin/zcodegraph.js index --engine rust-hybrid --force
node dist/bin/zcodegraph.js index --engine typescript --force
ZCODEGRAPH_INDEX_ENGINE=typescript node dist/bin/zcodegraph.js index --force
```

Result:

- `init` default `rust-hybrid`: pass
- `index` default `rust-hybrid`: pass
- `status --json` after default indexing: pass
- `doctor --engine rust-hybrid --bundle --last-run`: pass
- explicit `--engine rust-hybrid`: pass
- explicit `--engine typescript`: pass
- stale `ZCODEGRAPH_INDEX_ENGINE=typescript`: fail-fast pass

The local machine uses Node 26, so each command printed the unsafe-node warning. `CODEGRAPH_ALLOW_UNSAFE_NODE=1` was set for local validation.

## Packaged Smoke

Local-only package preparation:

```bash
scripts/build-bundle.sh darwin-arm64
scripts/pack-npm.sh
tar -xzf release/zcodegraph-darwin-arm64.tar.gz -C /private/tmp/zcodegraph-pre-release-bundle
node scripts/rust-package-smoke.mjs \
  --bundle /private/tmp/zcodegraph-pre-release-bundle/zcodegraph-darwin-arm64 \
  --npm-root release/npm \
  --out /private/tmp/zcodegraph-pre-release-package-smoke
```

Result:

- publish attempted: false
- registry contact allowed: false
- gate failures: none
- 24/24 gates passed

Passed gates:

- `bundle-init-rust-hybrid`
- `bundle-default-rust-hybrid`
- `bundle-explicit-rust-hybrid`
- `bundle-env-engine-selection-fails`
- `bundle-status-hybrid-metadata`
- `bundle-degraded-fallback-taxonomy`
- `bundle-doctor-last-run`
- `bundle-missing-rust-binary`
- `bundle-doctor-last-failure`
- `bundle-launcher-path`
- `npm-init-rust-hybrid`
- `npm-default-rust-hybrid`
- `npm-explicit-rust-hybrid`
- `npm-env-engine-selection-fails`
- `npm-status-hybrid-metadata`
- `npm-degraded-fallback-taxonomy`
- `npm-doctor-last-run`
- `npm-missing-rust-binary`
- `npm-doctor-last-failure`
- `npm-optional-platform-rust-core`
- `npm-missing-optional-package`
- `npm-no-postinstall`
- `npm-no-local-rust-compilation`
- `npx-like-local-smoke`

## Artifacts

Package smoke artifacts:

```text
/private/tmp/zcodegraph-pre-release-package-smoke/
```

Summary files:

- `/private/tmp/zcodegraph-pre-release-package-smoke/summary.json`
- `/private/tmp/zcodegraph-pre-release-package-smoke/summary.md`

## Decision

#278 is complete. The first-user source and packaged smoke paths match the pre-release API polish requirements.
