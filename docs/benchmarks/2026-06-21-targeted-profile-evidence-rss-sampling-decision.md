# Targeted Profile Evidence RSS Sampling Decision

Date: 2026-06-21

## Decision

Keep the Node-based targeted profile evidence runner.

The runner replaces `/usr/bin/time -l` as the primary RSS mechanism for targeted
profile evidence. It samples the launched command's process tree with `ps -axo
pid,ppid,rss`, records `peakRssBytes` when available, and records
`rssUnavailableReason` when process-list access is blocked.

This fixes the repeated evidence problem where a successful profile command was
reported as failed because sandboxed `/usr/bin/time -l` could not read
`sysctl kern.clockrate`.

## Scope

Added:

- `scripts/process-tree-rss.mjs`
- `scripts/targeted-profile-evidence.mjs`
- `__tests__/targeted-profile-evidence.test.ts`

The change is limited to evidence tooling:

- no indexer behavior changed;
- no resolver semantics changed;
- no graph output changed;
- no product user-facing command changed.

## Usage

Example:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/example.profile.json \
  node scripts/targeted-profile-evidence.mjs \
  --out docs/benchmarks/example.measurement.json \
  --cwd . \
  -- node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

The profile itself is still written by `zcodegraph index` via
`ZCODEGRAPH_INDEX_PROFILE_OUT`. The wrapper writes a sidecar measurement JSON
with:

- command;
- status;
- exit code;
- wall-clock milliseconds;
- `peakRssBytes`;
- `rssUnavailableReason`;
- stdout/stderr byte counts.

## Deterministic Evidence

Command:

```bash
npx vitest run __tests__/targeted-profile-evidence.test.ts
```

Result:

- Passed.

The test forces RSS sampling to use a nonexistent `ps` command and proves that a
successful command still exits successfully while the sidecar records
`rssUnavailableReason`.

## Current Repo Smoke

Profile artifact:

- `docs/benchmarks/2026-06-21-targeted-profile-evidence-current.profile.json`

Measurement artifact:

- `docs/benchmarks/2026-06-21-targeted-profile-evidence-current.measurement.json`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-21-targeted-profile-evidence-current.profile.json \
  /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  scripts/targeted-profile-evidence.mjs \
  --out docs/benchmarks/2026-06-21-targeted-profile-evidence-current.measurement.json \
  --cwd . \
  -- /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

- Command status: completed.
- Exit code: 0.
- Wall time: 31,361ms.
- `peakRssBytes`: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

This is the intended fallback behavior: the profile command succeeds, and RSS
availability is represented as data instead of a failed evidence run.
