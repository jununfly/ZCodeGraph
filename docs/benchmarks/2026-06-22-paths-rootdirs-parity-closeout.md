# Paths/RootDirs Parity Slice Closeout

Date: 2026-06-22

## Scope

This closeout covers #440:

```text
paths/rootDirs parity slice + oracle taxonomy correction
```

This is a child slice under the broader package self-name repo-local route. It
does not complete package self-name resolution, package `exports`, package
`imports`, or full TypeScript moduleResolution.

## Decision

Keep.

The slice corrected the TypeScript oracle taxonomy and added a narrow Rust
`rootDirs` relative-import lookup. It keeps `paths` alias behavior separate
from package self-name behavior, which prevents future implementation work from
using the wrong evidence bucket.

## Implemented

- Oracle taxonomy now classifies repo-local bare `paths` alias hits as
  `repo-local-paths-alias`.
- Oracle recommendation now routes those rows to
  `paths/rootDirs parity slice + oracle taxonomy correction`.
- Rust import target resolution now supports a narrow `rootDirs` lookup:
  when a relative import is missing in the source file's own root, Rust tries
  configured sibling `rootDirs` with the same virtual relative path.
- Rust profile JSON now exposes `rootDirs` under:
  - `importPathAliasResolvedBySource.rootDirs`
  - `importPathAliasFallbackBySource.rootDirs`
- Roadmap checkbox state was updated for this child slice.

## Not Implemented

- package self-name graph-writing behavior;
- package `exports` / `imports`;
- `node_modules` graph expansion;
- full `moduleResolution` mode semantics;
- full `rootDirs` parity for every TypeScript edge case.

## Evidence

Artifacts:

- `docs/benchmarks/2026-06-22-paths-rootdirs-parity-current.profile.json`
- `docs/benchmarks/2026-06-22-paths-rootdirs-parity-current.evidence.json`
- `docs/benchmarks/2026-06-22-paths-rootdirs-parity-current.status.json`
- `docs/benchmarks/2026-06-22-paths-rootdirs-parity-current-oracle.json`
- `docs/benchmarks/2026-06-22-paths-rootdirs-parity-current-oracle.md`

Current repo oracle summary:

| Field | Value |
| --- | ---: |
| rows inspected | 336 |
| parity `match` | 336 |
| `repo-local-paths-alias` | 36 |
| `repo-local-source` | 100 |
| `third-party-package` | 100 |
| `node-runtime-builtin` | 100 |

Current repo Rust profile summary:

| Field | Value |
| --- | ---: |
| `moduleResolutionShadowDecisionRefs` | 2894 |
| `tsconfigPaths` shadow decisions | 36 |
| `rootDirs` resolved refs | 0 |
| `rootDirs` fallback refs | 0 |

The current repo has no `rootDirs` hits. RootDirs behavior is covered by a
deterministic Rust integration fixture instead.

RSS:

- unavailable reason:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`

## Validation

Commands:

```bash
cargo test -p zcodegraph-core
npx vitest run __tests__/ts-module-resolution-oracle.test.ts
npm run build
cargo build -p zcodegraph-core
```

Targeted current repo evidence:

```bash
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
ZCODEGRAPH_RUST_CORE_BINARY=target/debug/zcodegraph-core \
ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-22-paths-rootdirs-parity-current.profile.json \
node scripts/targeted-profile-evidence.mjs \
  --out docs/benchmarks/2026-06-22-paths-rootdirs-parity-current.evidence.json \
  --cwd . -- node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid

node scripts/ts-module-resolution-oracle.mjs \
  --project . \
  --profile docs/benchmarks/2026-06-22-paths-rootdirs-parity-current.profile.json \
  --out-dir docs/benchmarks \
  --prefix 2026-06-22-paths-rootdirs-parity-current-oracle
```

## Next

Return to the parent route:

```text
package self-name repo-local slice
```

The next slice should use fixtures where package self-name or package subpath
resolution is actually selected by TypeScript, not `paths` alias evidence.
