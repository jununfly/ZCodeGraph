# Rust-hybrid finalization cleanup diagnostics and batching closeout

Date: 2026-06-20

Related:

- `docs/plans/2026-06-20-rust-hybrid-finalization-cleanup-diagnostics-and-batching.md`
- `docs/benchmarks/2026-06-20-finalization-cleanup-current.profile.json`
- `docs/benchmarks/2026-06-20-finalization-cleanup-vscode-sparse.profile.json`
- #326
- #327
- #328
- #329
- #295
- #165

## Decision

Keep the finalization write/cleanup diagnostics.

Treat the bounded resolved cleanup batching optimization as **no-go as a
standalone performance lever**. The implementation is graph-stable and gives
better observability, but the targeted VS Code sparse profile does not show a
credible cleanup-bucket improvement versus the previous routing evidence.

Do not broaden this slice into edge-write ownership, intentionally unresolved
cleanup optimization, Rust subprocess cleanup, or schema changes.

## What Changed

- Split finalization write/cleanup profile diagnostics into:
  - `edgeEndpointValidationDbMs`;
  - `edgeInsertCount`;
  - `resolvedCleanupMs`;
  - `resolvedCleanupDbMs`;
  - `resolvedCleanupRowCount`;
  - `intentionallyUnresolvedCleanupMs`;
  - `intentionallyUnresolvedCleanupDbMs`;
  - `intentionallyUnresolvedCleanupRowCount`.
- Preserved existing high-level fields:
  - `edgeMaterializationMs`;
  - `edgeMaterializationDbMs`;
  - `edgeWriteMs`;
  - `edgeWriteDbMs`;
  - `unresolvedCleanupMs`;
  - `unresolvedCleanupDbMs`;
  - `databaseAccessMs`.
- Added cleanup contract tests for:
  - non-batched resolved cleanup leaving unresolved refs in place;
  - batched cleanup deleting resolved and intentionally unresolved terminal refs;
  - rowid chunk boundaries.
- Attempted a bounded resolved cleanup optimization using compact rowid ranges
  for resolved-reference cleanup only.

## Deterministic Validation

Commands:

```bash
npm run build
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "writes a Rust-produced index and profile"
npx vitest run __tests__/resolution.test.ts -t "unresolved cleanup contract"
npx vitest run __tests__/access-models.test.ts -t "unresolved-reference row ids"
```

Result:

- profile-shape test passed;
- cleanup contract tests passed;
- rowid/range delete tests passed;
- TypeScript build passed.

## Current Repo Evidence

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-finalization-cleanup-current.profile.json node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Result:

- profile artifact:
  `docs/benchmarks/2026-06-20-finalization-cleanup-current.profile.json`;
- wall time: 4.51s;
- maximum resident set size: 348782592;
- peak memory footprint: 296807088;
- TypeScript finalization: 916ms;
- reference resolution: 501ms;
- database access: 278ms;
- edge endpoint validation: 12ms;
- edge insert: 89ms;
- edge insert count: 11930;
- total unresolved cleanup: 140ms;
- resolved cleanup: 91ms;
- resolved cleanup row count: 11930;
- intentionally unresolved cleanup: 49ms;
- intentionally unresolved cleanup row count: 25656;
- fallback taxonomy total: 1580.

## VS Code Sparse Evidence

Setup:

- `/private/tmp/codegraph-corpus/vscode-sparse`;
- validated as a Git checkout;
- contains `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`.

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-20-finalization-cleanup-vscode-sparse.profile.json node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Result:

- profile artifact:
  `docs/benchmarks/2026-06-20-finalization-cleanup-vscode-sparse.profile.json`;
- wall time: 136.39s;
- maximum resident set size: 1671512064;
- peak memory footprint: 2221294400;
- TypeScript finalization: 58236ms;
- reference resolution: 50904ms;
- database access: 23438ms;
- edge endpoint validation: 695ms;
- edge insert: 11888ms;
- edge insert count: 533309;
- total unresolved cleanup: 9902ms;
- resolved cleanup: 7899ms;
- resolved cleanup row count: 533309;
- intentionally unresolved cleanup: 2003ms;
- intentionally unresolved cleanup row count: 157342;
- fallback taxonomy total: 170387.

## Interpretation

The new diagnostics are useful. They show that cleanup is material, and that
resolved cleanup is the dominant cleanup component on VS Code sparse:

- resolved cleanup: 7899ms;
- intentionally unresolved cleanup: 2003ms;
- total cleanup: 9902ms.

However, the bounded rowid-range cleanup optimization is not a clear standalone
win. The previous VS Code sparse routing profile recorded `unresolvedCleanupMs`
at 9108ms, while this run recorded 9902ms. Cross-run noise and other profile
differences mean this is not a strict regression claim, but it is enough to
avoid treating resolved cleanup batching as the next high-confidence lever.

The larger remaining buckets are still:

- `databaseAccessMs`: 23438ms;
- `perReferenceDisambiguationMs`: 18826ms;
- `edgeWriteMs`: 11888ms;
- `unresolvedCleanupMs`: 9902ms.

That points to a broader finalization ownership/write-path decision rather than
more cleanup-only SQL tweaks.

## Caveats

Both targeted profile commands printed the existing Node 26 unsupported runtime
warning. The runs used `CODEGRAPH_ALLOW_UNSAFE_NODE=1` for local evidence. This
is environment evidence, not a cleanup-specific failure.

This closeout does not claim release-level performance improvement. It records
a bounded optimization attempt and a clearer diagnostic basis for the next
architecture decision.

## Follow-Up

Recommended next direction:

- keep the diagnostics;
- do not continue cleanup-only batching as the main performance strategy;
- decide whether the next slice should target edge write ownership/protocol or
  broader per-reference disambiguation execution.
