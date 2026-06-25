# ZCodeGraph 0.10.0 Release-Critical Local Validation

Date: 2026-06-25

Status: pass with local environment caveats

This artifact records the local validation matrix for the 0.10.0 release
handoff. It does not publish npm packages, create tags, trigger the GitHub
Release workflow, or run the full cross-platform bundle matrix.

## Validation Matrix

| Gate | Result | Evidence |
|---|---|---|
| `npm test` | Pass | `123` test files passed; `1920` tests passed; `2` skipped. |
| `npm run build` | Pass | TypeScript build and asset copy completed. |
| Targeted packaged smoke | Pass | `npx vitest run __tests__/rust-package-smoke.test.ts __tests__/ci-rust-packaged-path.test.ts __tests__/build-bundle-rust-core.test.ts __tests__/pack-npm-rust-core.test.ts` passed: `4` files, `10` tests. |
| Local install/uninstall smoke | Pass | In a temporary `HOME`, `zcodegraph install --target codex --location global --yes` created `~/.codex/config.toml`; `zcodegraph uninstall --target codex --location global --yes` removed it. |
| Local init/index/status/doctor smoke | Pass | Temporary TS+Go project initialized, indexed with `rust-hybrid`, reported healthy status, and created a last-run diagnostic bundle. |
| Default `rust-hybrid` behavior | Pass | Temporary TS+Go project status showed `typescript` and `go` indexed by Rust, `fallbackFileCount: 0`, `fallbackState: healthy`. |
| `doctor --engine rust-hybrid --bundle --last-run` | Pass | Created `.zcodegraph/diagnostics/bundles/2026-06-25T16-18-04-412Z-last-run` in the temporary project. |

## Source CLI Smoke

The successful source-path smoke used this command shape in an isolated
temporary directory:

```bash
HOME=/private/tmp/zcodegraph-0-10-0-release-smoke.<id>/home \
CODEGRAPH_ALLOW_UNSAFE_NODE=1 \
CODEGRAPH_NO_DAEMON=1 \
CODEGRAPH_NO_RELAUNCH=1 \
node dist/bin/zcodegraph.js init /private/tmp/zcodegraph-0-10-0-release-smoke.<id>/project

HOME=/private/tmp/zcodegraph-0-10-0-release-smoke.<id>/home \
CODEGRAPH_ALLOW_UNSAFE_NODE=1 \
CODEGRAPH_NO_DAEMON=1 \
CODEGRAPH_NO_RELAUNCH=1 \
node dist/bin/zcodegraph.js index /private/tmp/zcodegraph-0-10-0-release-smoke.<id>/project \
  --engine rust-hybrid --force --quiet

HOME=/private/tmp/zcodegraph-0-10-0-release-smoke.<id>/home \
CODEGRAPH_ALLOW_UNSAFE_NODE=1 \
CODEGRAPH_NO_DAEMON=1 \
CODEGRAPH_NO_RELAUNCH=1 \
node dist/bin/zcodegraph.js status /private/tmp/zcodegraph-0-10-0-release-smoke.<id>/project --json

HOME=/private/tmp/zcodegraph-0-10-0-release-smoke.<id>/home \
CODEGRAPH_ALLOW_UNSAFE_NODE=1 \
CODEGRAPH_NO_DAEMON=1 \
CODEGRAPH_NO_RELAUNCH=1 \
node dist/bin/zcodegraph.js doctor /private/tmp/zcodegraph-0-10-0-release-smoke.<id>/project \
  --engine rust-hybrid --bundle --last-run
```

Status evidence from the successful smoke:

- `initialized: true`
- `version: 0.9.10`
- `fileCount: 2`
- `nodeCount: 5`
- `edgeCount: 3`
- `languages: go, typescript`
- `index.engine: rust-hybrid`
- `index.hybrid.engineByLanguage: typescript=rust, go=rust`
- `index.hybrid.fallbackState: healthy`
- `index.hybrid.fallbackFileCount: 0`

## Local Environment Caveats

The local shell uses Node `v26.0.0`. The CLI correctly warns that this runtime
is unsupported for ordinary users. Local source-path smoke used
`CODEGRAPH_ALLOW_UNSAFE_NODE=1` so the current build could be validated. The
targeted packaged smoke separately validates the bundled-runtime/package-shape
path without publishing.

One initial smoke attempt passed `zcodegraph init --quiet`; `init` does not
support `--quiet`, so that attempt was discarded and rerun with the real user
command.

## Production Changes

The only production change made during this validation is a fail-closed guard in
the semantic replay audit path when the query adapter does not provide
`getAllFiles`. This fixes a release-blocking test failure without changing the
default user-facing indexing behavior.

