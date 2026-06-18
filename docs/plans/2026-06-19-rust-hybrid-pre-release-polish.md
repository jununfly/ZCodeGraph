# Rust-Hybrid Pre-Release Polish Plan

## Parent

- First-user release PRD: `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`
- Phase 8 plan: `docs/plans/2026-06-19-rust-hybrid-phase-8-first-user-release-readiness-closeout.md`
- Phase 8 decision: `docs/plans/2026-06-19-rust-hybrid-phase-8-decision.md`

## Context

Phase 8 accepted the first-user `rust-hybrid` release path as release-ready with explicit non-blockers under the then-current PRD boundary.

Before the actual first-user release, the API surface should be tightened so the product story is simpler and the release evidence matches the user-visible commands:

- primary setup should be `zcodegraph install` then `zcodegraph init`,
- `zcodegraph init -i` / `--index` should be removed instead of preserved as a deprecated no-op,
- `ZCODEGRAPH_INDEX_ENGINE` should no longer select the engine,
- explicit CLI flags should be the only user-facing engine override path,
- README Agent Sufficiency claims for TS/JS and Go should be refreshed with current `rust-hybrid` evidence rather than inherited from older benchmark text.

This plan does not reopen Phase 8. It narrowly supersedes the release-candidate surface area that changed after Phase 8: initialization command shape, env engine selection, and README metric claims.

## Goal

Produce a polished first-user release candidate for `rust-hybrid` with a cleaner CLI/API surface, aligned docs, refreshed TS/JS and Go Agent Sufficiency evidence, and a final pre-release closeout decision.

The plan should answer:

- Can first users initialize with `zcodegraph init` without learning historical `-i` behavior?
- Are engine overrides explicit and visible through `--engine` only?
- Does stale `ZCODEGRAPH_INDEX_ENGINE` usage fail clearly and point to the explicit flag?
- Do README, PRD, installer hints, MCP instructions, scripts, and tests teach the same product path?
- Do current TS/JS and Go Agent Sufficiency numbers support the README claims we publish?
- Does targeted release-candidate smoke still pass after the API cleanup?

## Non-Goals

- Do not implement #165 performance optimization.
- Do not require strict Rust-vs-TypeScript speed or RSS wins.
- Do not implement watch/sync `rust-hybrid` incremental semantics.
- Do not implement full Go module/package import resolution.
- Do not add gRPC/protobuf generated Go flow coverage.
- Do not add broad Go generic edge coverage.
- Do not change SQLite schema.
- Do not change MCP tool names or protocol.
- Do not rewrite installer, MCP server, or release workflow in Rust.
- Do not bump `package.json` version.
- Do not create git tags.
- Do not trigger the GitHub Release workflow.
- Do not run `npm publish`.

## Decisions

### Primary Command Is `zcodegraph init`

The first-user setup path should be:

```bash
zcodegraph install
zcodegraph init
```

`zcodegraph init` already builds the initial index. The historical `-i` / `--index` option now creates the wrong product memory and should be removed.

Expected behavior after removal:

```bash
zcodegraph init -i
```

fails through the normal CLI unknown-option behavior.

No compatibility bridge is required. The historical user base for this no-op flag is limited and the release has not yet been broadly exposed.

### Engine Selection Is Explicit CLI Flag Only

The default remains `rust-hybrid`.

Supported explicit overrides:

```bash
zcodegraph index --engine typescript
zcodegraph index --engine rust-hybrid
zcodegraph index --engine rust
```

`ZCODEGRAPH_INDEX_ENGINE` should no longer select the engine. If present for a command that resolves an index engine, the CLI should fail fast with a clear pointer to the explicit flag:

```text
ZCODEGRAPH_INDEX_ENGINE is no longer supported for selecting the index engine.
Use: zcodegraph index --engine typescript
```

The SDK already does not read `ZCODEGRAPH_INDEX_ENGINE`; preserve that boundary.

### PRD And Phase 8 Wording Need A Narrow Superseding Note

Update the PRD with a narrow note:

- Phase 8 remains valid for the evidence it collected.
- The release-candidate API surface changed after Phase 8.
- The new primary init command is `zcodegraph init`.
- Env engine selection is removed in favor of explicit `--engine`.
- Pre-release polish evidence supersedes Phase 8 only for command shape, env-selection behavior, README claim refresh, and final release-candidate decision.

Do not rewrite the PRD into a new product. Keep the change narrow and date-stamped.

### User-Facing Docs And Hints Must Converge

Update every user-facing first-run path that still teaches `zcodegraph init -i`:

- README main path,
- README troubleshooting,
- installer quick-start notes,
- MCP server instructions,
- worktree warning text,
- scripts and docs used as public guidance,
- package smoke labels/evidence wording where relevant.

Internal historical decision docs may remain as history. New release-candidate docs should not keep the old command shape as current guidance.

### CHANGELOG Is In Scope, Version Bump Is Out Of Scope

Add user-facing entries under `## [Unreleased]`.

The changelog should mention:

- `zcodegraph init` is now the clean first-user initialization command,
- engine selection now uses explicit `--engine` flags,
- stale env-based engine selection fails clearly,
- release-readiness docs and troubleshooting were refreshed.

Do not edit `package.json` or `package-lock.json` versions.

### Agent Sufficiency Refresh Is Required For README Claims

README TS/JS and Go Agent Sufficiency metrics must be backed by current evidence.

Run a bounded current `rust-hybrid` Agent Sufficiency refresh:

- TS/JS representative: Excalidraw by default.
- Go representative: Gin by default.
- Prompts: 2 flow prompts per repo.
- Runs: 2 runs per prompt per arm.
- Arms: WITH ZCodeGraph vs WITHOUT ZCodeGraph.

Record:

- Read/Grep fallback,
- tool calls,
- wall time,
- cost/tokens if the runner emits them,
- sufficiency interpretation,
- corpus path and commit,
- ZCodeGraph commit,
- unavailable reason if the agent A/B environment cannot run.

Do not run the full 7-repo scoreboard.

Do not use deterministic smoke as a substitute for README Agent Sufficiency metrics. If the agent A/B environment is unavailable, produce an evidence gap and block README metric replacement rather than inventing numbers.

README updates should be limited to the covered claims. Do not generalize Excalidraw/Gin results to all languages.

### Targeted Release-Candidate Smoke Is Required

After API cleanup and docs updates, run targeted release-candidate smoke:

```bash
npm run build
npm test
```

CLI source path:

- `zcodegraph init`,
- `zcodegraph index`,
- `zcodegraph status --json`,
- `zcodegraph doctor --engine rust-hybrid --bundle --last-run`,
- process/system failure path with `--last-failure`,
- `zcodegraph index --engine typescript`,
- stale `ZCODEGRAPH_INDEX_ENGINE=typescript zcodegraph index` fails clearly.

Packaged path:

- release-like packaged CLI discovers Rust core,
- release-like `zcodegraph init` default path works,
- explicit `zcodegraph index --engine rust-hybrid` works,
- stale env selection fails clearly,
- status hybrid metadata works,
- doctor last-run and last-failure bundles work,
- no release workflow, publish, tag, or registry contact is attempted.

Real Gin deterministic smoke may cite Phase 8 unless API/status/doctor/indexing changes require rerun. If this plan changes smoke harness or CLI command shape, rerun the affected smoke.

## Evidence Artifacts

Expected artifacts:

- API cleanup decision/evidence under `docs/benchmarks/`.
- Targeted release-candidate smoke evidence under `docs/benchmarks/`.
- Agent Sufficiency refresh raw artifacts and summary under `docs/benchmarks/`.
- Final pre-release closeout decision under `docs/plans/`.

The final decision should be one of:

1. **Accepted: release-ready**
   - API cleanup complete.
   - Docs and PRD aligned.
   - Targeted release-candidate smoke passes.
   - README metrics are backed by current TS/JS and Go Agent Sufficiency evidence.
   - No new release blocker remains.

2. **Accepted: release-ready with explicit non-blockers**
   - Release blockers pass.
   - Remaining gaps are explicitly classified as non-blockers, such as #165, watch/sync `rust-hybrid` incremental semantics, full Go resolver, or broader Go coverage.

3. **Blocked**
   - CLI API cleanup breaks first-user path.
   - Env removal cannot be made clear and testable.
   - Packaged smoke fails.
   - Agent Sufficiency refresh is unavailable and README metric claims cannot be honestly updated.
   - README/PRD/product messaging cannot be aligned without overclaiming.

## Issue Breakdown

### 1. API Surface Cleanup

Remove historical and hidden engine-selection surfaces.

Acceptance criteria:

- `zcodegraph init` remains the first-user initialization command and builds the initial index.
- `zcodegraph init -i` / `--index` is no longer accepted.
- CLI engine selection ignores SDK env behavior and only honors explicit `--engine`.
- `ZCODEGRAPH_INDEX_ENGINE` fails fast for CLI engine-selection commands with a clear pointer to `--engine`.
- SDK full-index calls continue not to read `ZCODEGRAPH_INDEX_ENGINE`.
- Targeted CLI tests cover default `rust-hybrid`, explicit `typescript`, explicit `rust-hybrid`, unknown `init -i`, and stale env fail-fast.

### 2. Docs, PRD, And Changelog Alignment

Align all release-candidate messaging with the cleaned API.

Acceptance criteria:

- PRD contains a narrow superseding note for command shape and env selection.
- README main path uses `zcodegraph init`, not `zcodegraph init -i`.
- README troubleshooting only documents `zcodegraph index --engine typescript` as the TypeScript escape hatch.
- Installer quick-start note uses `zcodegraph init`.
- MCP server instructions use `zcodegraph init`.
- Worktree warnings and public scripts/docs use `zcodegraph init` where they represent current user guidance.
- CHANGELOG `[Unreleased]` contains user-facing entries.
- No version bump is made.

### 3. Targeted Release-Candidate Smoke

Revalidate the first-user and packaged paths after API cleanup.

Acceptance criteria:

- `npm run build` passes.
- `npm test` passes.
- CLI source-path smoke passes for `init`, `index`, `status --json`, doctor last-run, doctor last-failure, and explicit TypeScript escape hatch.
- Stale `ZCODEGRAPH_INDEX_ENGINE` CLI usage fails clearly.
- Targeted packaged smoke passes with `init`, explicit `--engine rust-hybrid`, status, doctor last-run, doctor last-failure, and env fail-fast.
- No GitHub Release workflow, `npm publish`, tag push, or registry publish action is performed.
- Evidence is written under `docs/benchmarks/`.

### 4. TS/JS And Go Agent Sufficiency Refresh

Refresh README-backed Agent Sufficiency claims on current `rust-hybrid`.

Acceptance criteria:

- TS/JS representative repo is selected and recorded, defaulting to Excalidraw.
- Go representative repo is selected and recorded, defaulting to Gin.
- Each repo runs 2 flow prompts with 2 runs per prompt per arm, WITH vs WITHOUT ZCodeGraph.
- Read/Grep fallback, tool calls, wall time, and cost/tokens when available are recorded.
- Corpus commits and ZCodeGraph commit are recorded.
- README metrics are replaced only for claims covered by this evidence.
- If agent A/B cannot run, evidence records the unavailable reason and README metric replacement is blocked.
- Evidence is written under `docs/benchmarks/`.

### 5. Final Pre-Release Closeout Decision

Write the final pre-release decision.

Acceptance criteria:

- Decision cites API cleanup evidence, docs/PRD/CHANGELOG alignment, targeted smoke, packaged smoke, and Agent Sufficiency refresh.
- Decision classifies release-ready, release-ready with explicit non-blockers, or blocked.
- Decision lists explicit non-blockers, including #165 performance optimization unless it is separately completed.
- Decision does not claim release workflow execution, npm publish, tag creation, or version bump.
- Phase 8 is referenced as prior evidence, not reopened.
