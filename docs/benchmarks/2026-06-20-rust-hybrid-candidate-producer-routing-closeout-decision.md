# Rust-hybrid candidate producer routing closeout decision

Date: 2026-06-20

Related:

- `docs/plans/2026-06-20-rust-hybrid-candidate-producer-main-path-routing-experiment.md`
- `docs/benchmarks/2026-06-20-rust-candidate-producer-routing-zcodegraph.profile.json`
- `docs/benchmarks/2026-06-20-rust-candidate-producer-routing-vscode-sparse.profile.json`
- #321
- #322
- #323
- #324
- #295
- #165

## Decision

Keep the experimental Rust candidate producer routing slice behind local config.

The experiment is narrow enough to keep:

- default off;
- enabled only by `.zcodegraph/config.json`;
- routed shapes limited to `ExactName` and `KnownNamePresence`;
- TypeScript baseline comparison remains active;
- any mismatch or producer failure fails closed to TypeScript baseline for the run.

Do not broaden the experiment yet. The next migration decision should still
treat final target selection and reference disambiguation as TypeScript-owned
until a separate resolver-migration slice proves otherwise.

## Implementation Summary

The routing experiment now:

- reads `experimental.rustCandidateProducerRouting` from local project config;
- reports concise status JSON at
  `rust.experimental.candidateProducerRouting.enabled/source`;
- precomputes a bare unresolved-reference key universe before resolution;
- batch-runs the Rust candidate producer once for `ExactName` and
  `KnownNamePresence`;
- hydrates Rust ids through TypeScript-side node lookup;
- routes only precomputed exact-name and known-name presence lookups;
- leaves derived receiver/member/tail known-name checks on the TypeScript path;
- records profile diagnostics for configured state, active state, active
  shapes, fallback reason, mismatch count, and bounded mismatch samples.

## Guard Evidence

Automated tests cover:

- local config parsing and status JSON for missing, true, false, invalid JSON,
  and non-boolean values;
- key-universe collection excluding dotted, colon/namespace, path-like, and
  duplicate reference names;
- provider routing for `ExactName` and `KnownNamePresence`;
- provider fail-closed fallback on candidate id mismatch;
- CLI graph stability for routing disabled, routing enabled, and invalid local
  config.

Commands run:

```bash
npx vitest run __tests__/candidate-protocol.test.ts
npx vitest run __tests__/candidate-protocol.test.ts __tests__/status-json.test.ts __tests__/rust-index-engine-cli.test.ts -t "candidate producer|experimental Rust candidate producer routing|status --json reports experimental"
npm run build
```

## Profile Evidence

### Current Repo

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-20-rust-candidate-producer-routing-zcodegraph.profile.json node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Result:

- profile artifact:
  `docs/benchmarks/2026-06-20-rust-candidate-producer-routing-zcodegraph.profile.json`;
- wall time: 4.67s;
- maximum resident set size: 367804416;
- TypeScript finalization: 1198ms;
- reference resolution: 749ms;
- candidate lookup: 31ms;
- database access: 276ms;
- routing configured: true;
- routing source: `local-config`;
- routing active: true;
- active shapes: `ExactName`, `KnownNamePresence`;
- fallback reason: none;
- mismatch count: 0;
- producer lookups: 628;
- producer candidate count: 459;
- producer payload bytes: 31205.

Fallback taxonomy remained dominated by known TypeScript-owned finalization
work:

- `binding-level-symbol-disambiguation-not-yet-rust-owned`: 1518;
- `unsupported-import-form-not-yet-rust-owned`: 44;
- `unresolved-file-level-import-target`: 14.

### VS Code Sparse Checkout

Setup check:

- `/private/tmp/codegraph-corpus/vscode-sparse` exists;
- it is a Git checkout;
- it contains `src/vs/workbench`, `src/vs/platform`, and `src/vs/base`.

Command:

```bash
/usr/bin/time -l env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 ZCODEGRAPH_INDEX_PROFILE_OUT=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-20-rust-candidate-producer-routing-vscode-sparse.profile.json node /Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/dist/bin/zcodegraph.js index /private/tmp/codegraph-corpus/vscode-sparse --force --quiet --engine rust-hybrid
```

Result:

- profile artifact:
  `docs/benchmarks/2026-06-20-rust-candidate-producer-routing-vscode-sparse.profile.json`;
- wall time: 149.27s;
- maximum resident set size: 2468626432;
- TypeScript finalization: 72518ms;
- reference resolution: 65473ms;
- candidate lookup: 2400ms;
- database access: 21838ms;
- routing configured: true;
- routing source: `local-config`;
- routing active: true;
- active shapes: `ExactName`, `KnownNamePresence`;
- fallback reason: none;
- mismatch count: 0;
- producer lookups: 230;
- producer candidate count: 1077;
- producer payload bytes: 12641.

Fallback taxonomy remained dominated by known TypeScript-owned finalization
work:

- `binding-level-symbol-disambiguation-not-yet-rust-owned`: 105919;
- `unsupported-import-form-not-yet-rust-owned`: 35;
- `unresolved-file-level-import-target`: 64429.

## Caveats

Both profile commands printed the existing unsupported Node 26 warning. The
runs were intentionally allowed with `CODEGRAPH_ALLOW_UNSAFE_NODE=1` for local
targeted evidence. This warning is environment evidence, not a routing failure.

This closeout does not claim performance improvement. It only establishes a
safe, observable main-path routing experiment with graph-stability evidence and
clean routing diagnostics.

## Follow-Up

Continue resolver migration through dedicated slices. Candidate producer routing
can stay available as an experimental local config while the architecture work
migrates finalization/reference-resolution ownership deliberately.
