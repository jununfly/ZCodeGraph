# Rust Indexing Core Phase 12 Supported Runtime Sufficiency Completion

Parent PRD: [Rust Indexing Core Vertical Slice](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)

## Background

Phase 11 fixed the VS Code `VS-1` sufficiency smoke evidence pipeline: large-target runs now produce staged, machine-readable JSON instead of silent empty output. The corrected exact VS Code target is valid, but the real smoke did not reach TypeScript-vs-Rust comparison because it ran under Node.js 26 and stopped during TypeScript indexing with `unsupported-runtime`.

Phase 12 consumes the Phase 11 harness under a supported runtime. Its purpose is to advance the evidence from `unsupported-runtime` to an actual sufficiency comparison, or to a deeper, stage-specific blocker.

## Goal

Run the corrected exact VS Code `VS-1` sufficiency smoke under Node.js 22 and produce a machine-readable artifact that reaches the comparison stage, or records a deeper unavailable stage than `unsupported-runtime`.

The goal is evidence completion, not rollout readiness.

## Baseline Target

From Phase 12 onward, the VS Code sufficiency baseline is the exact target:

- Local path: `/private/tmp/codegraph-corpus/vscode-sparse`
- Expected commit: `4ac5322601c6985aba4cd9349c23f4ef22dc3e65`
- Required sparse patterns:
  - `.github`
  - `build`
  - `extensions`
  - `scripts`
  - `src`
  - `test`
- Required `VS-1` tokens:
  - `AbstractExtensionService`
  - `_createExtensionHostManager`
  - `_doCreateExtensionHostManager`
  - `ExtensionHostManager`
  - `start`
  - `ExtensionHostMain`
  - `MainThreadExtensionService`

Phase 10 drift-target wording is historical only. New Phase 12 artifacts and docs should not describe the baseline as a drift target.

## Scope

In scope:

- Human confirmation of a Node.js 22 runtime or Node 22 binary path.
- Re-running the exact target validator as a hard gate before smoke.
- One bounded full source smoke under Node 22.
- At most one bounded second attempt if the first attempt fails before comparison.
- Recording stage elapsedMs, command provenance, runtime, artifact status, and follow-up classification.
- Writing a Phase 12 results-and-decision document.

Out of scope:

- Resolver changes.
- Matcher changes.
- Explore planner or renderer changes.
- Rust extraction semantics changes.
- Rust performance optimization.
- Changing default rollout status.
- Rewriting Phase 11 historical results.
- Re-running Node 26 as a comparison.

Harness bug fixes are allowed only if the Node 22 run exposes a clear Phase 11 harness bug, such as missing artifacts, incorrect prompt filtering, or wrong stage taxonomy. Do not add new harness modes in Phase 12.

## Node 22 HITL Gate

Phase 12 starts with a HITL gate. The maintainer must provide one of:

- `node -v` showing `v22.x`, with that `node` first on PATH for the run; or
- an explicit Node 22 binary path to use for the smoke command.

The agent must not install Node 22 or change the user's global Node runtime as part of this phase.

If Node 22 is not available, Phase 12 stops at the HITL gate and records that no supported-runtime smoke was attempted.

## Validator Hard Gate

Before any smoke attempt, run:

```bash
node scripts/phase10-vs1-target-validator.mjs \
  --repo /private/tmp/codegraph-corpus/vscode-sparse \
  --out docs/benchmarks/2026-06-15-rust-indexing-core-phase-12-vs1-target-validation.raw.json
```

The smoke must not run unless the validator reports:

- `commitMatchesExpected: true`
- `missingSymbols: []`
- `sufficiencySmokeAllowed: true`

If validation fails, write the validator artifact and classify Phase 12 as blocked by `validator-failed`.

## Smoke Attempts

Attempt 1:

- Run the corrected exact target `VS-1` smoke under Node 22.
- Use the Phase 11 harness options: `--prompt-id VS-1`, `--timeout-ms`, and `--out`.
- Save a raw artifact under `docs/benchmarks`.

Attempt 2:

- Allowed only if Attempt 1 fails before comparison.
- Must change exactly one explicit variable:
  - increase timeout; or
  - use reuse-indexed pair mode; or
  - rerun only the failed stage if the harness supports that without adding a new mode.
- Must record why that variable was chosen.

No further attempts are allowed in Phase 12. Do not keep rerunning until a favorable result appears.

## Success Criteria

Phase 12 succeeds if it produces one of:

- A comparison-stage artifact with TypeScript and Rust `VS-1` results, including Flow section, `flowConnected`, missing expected symbols, deterministic Read/Grep fallback risk, and Rust-specific regression status; or
- A deeper unavailable artifact than Phase 11, such as `typescript-index-timeout`, `rust-index-timeout`, `explore-timeout`, or `process-error`, with stage elapsedMs and stderr tail.

Phase 12 does not require the TypeScript-vs-Rust comparison to pass.

Phase 12 fails if the only result remains `unsupported-runtime` after a Node 22 runtime was supposedly confirmed.

## Results Document

Write a Phase 12 results-and-decision document under `docs/benchmarks` or `docs/design`.

It must include:

- Link to Phase 11 results.
- Node 22 runtime confirmation.
- Exact target validator artifact.
- Attempt 1 raw artifact.
- Attempt 2 raw artifact if used.
- Final classification.
- Follow-up direction.
- Explicit statement that Phase 12 does not change Rust matcher opt-in/default status or default rollout readiness.

## Issue Sequence

1. HITL: confirm Node.js 22 runtime or binary path.
2. AFK: exact target validator hard gate and smoke Attempt 1.
3. AFK: bounded second attempt if Attempt 1 fails before comparison.
4. AFK: Phase 12 results-and-decision document and tracker closeout.
