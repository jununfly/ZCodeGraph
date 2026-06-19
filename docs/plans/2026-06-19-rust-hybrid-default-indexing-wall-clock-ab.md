# Rust-Hybrid Default Indexing Wall-Clock A/B Plan

## Parent

- Long-running performance tracker: #165
- Existing parse-extraction profiling candidate: #224
- Previous bounded A/B pass:
  `docs/plans/2026-06-19-rust-hybrid-indexing-performance-ab.md`
- First-user release PRD:
  `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`

## Context

The first-user `rust-hybrid` path is usable enough that strict performance
targets are no longer first-user release blockers, but full-index speed still
matters for trust. The previous bounded A/B pass kept a Rust core bulk
transaction candidate and materially reduced the Rust SQLite write bucket on
VS Code sparse. That changed the bottleneck shape: `parseExtractionMs` is now
more visible among Rust-owned buckets, while TypeScript finalization and
reference-resolution work remain large in the end-to-end profile.

This plan is a second disciplined wall-clock optimization loop for the
`rust-hybrid` default path. It should not expand into a general optimization
program, new feature work, language coverage, or technical-debt cleanup.

## Goal

Improve or credibly evaluate one next `rust-hybrid` default-path full-index
wall-clock candidate, with RSS as a guardrail.

The plan should answer:

- What is the current bottleneck shape after the prior Rust write-path
  optimization?
- Is #224 (`parseExtractionMs` profiling) the next best candidate, or does
  end-to-end evidence point to a different bounded candidate?
- Can one selected candidate be tried without changing default user behavior or
  reference-disambiguation semantics?
- Does the after-profile justify keep, rollback, or no-go?

## Corpora

Use source-path `rust-hybrid` full indexing on:

- Current repository:
  `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph`
- VS Code sparse checkout:
  `/private/tmp/codegraph-corpus/vscode-sparse`

The VS Code sparse checkout must already exist and be a Git checkout. If it is
missing or not a Git checkout, stop the VS Code portion and mark the issue as
needing human setup. Do not clone or replace the corpus from the agent.

## Metrics

Primary metric:

- full-index wall-clock time for the `rust-hybrid` default path.

Guardrail:

- peak RSS / memory stability, or a clear unavailable reason.

Diagnostic buckets:

- `rustCore.parseExtractionMs`
- `rustCore.sqliteWriteMs`
- `typescriptFinalizationMs`
- `finalize.referenceResolutionMs`
- public finalization sub-buckets when available
- `typescriptFallbackAppend.durationMs` and fallback file/error counts

## Candidate Rules

### Baseline First

Do not choose the implementation candidate before collecting the new baseline.
The baseline must compare the current repo and VS Code sparse against the latest
local build.

### Exactly One Bounded Candidate

Try at most one production-code candidate. If no credible candidate appears,
record a no-go decision instead of forcing implementation.

### #224 Is In Scope But Not Preselected

#224 is part of the candidate pool because `parseExtractionMs` may now be a
more visible Rust-owned bucket. However, the plan must not assume parse
extraction is the correct implementation target before the baseline. If the
largest controllable bottleneck is TypeScript finalization/reference
resolution, a narrow low-semantic-risk A/B is allowed.

### Semantic Guardrails

Do not change every-reference disambiguation semantics in this plan. If a
candidate touches finalization/reference resolution, keep it to low-semantic
risk mechanics such as diagnostics, batching, duplicate lookup removal, or write
path cleanup. Do not migrate resolver semantics or broaden language/framework
coverage here.

## Non-Goals

- Do not optimize TypeScript-only standalone indexing.
- Do not require Rust to beat the TypeScript indexer end-to-end.
- Do not run the full benchmark scoreboard.
- Do not run agent sufficiency A/B by default.
- Do not add a new language, framework, or user-facing feature.
- Do not update README by default.
- Do not change SQLite schema.
- Do not run packaged/release smoke unless the selected candidate touches CLI
  launcher, packaging, status, doctor, or release workflow paths.

## Documentation Rules

- Save baseline and after evidence under `docs/benchmarks/`.
- If production code changes, update `CHANGELOG.md` under `## [Unreleased]`
  with a user-facing note.
- Update #165 with the outcome.
- Update #224 only if the evidence confirms, rejects, or materially reframes
  the parse-extraction profiling candidate.

## Issue Sequence

1. #291 Baseline profile and candidate selection.
2. #292 Implement one bounded candidate.
3. #293 After-profile decision and tracker updates.
4. #294 Tracker for this plan.

## Acceptance

- Baseline profiles are recorded for the current repo and VS Code sparse, or
  the VS Code path is explicitly marked as needing human setup.
- Evidence includes wall-clock, RSS or unavailable reason, and the agreed
  diagnostic buckets.
- Exactly one candidate is selected, or the plan records no-go.
- The implementation issue changes only the selected candidate and includes
  targeted deterministic tests where production code changes.
- After-profile evidence compares baseline vs after on both corpora where
  available.
- Final decision says keep, rollback, or no-go.
- #165 is updated with the outcome.
- #224 is updated only if parse-extraction evidence is relevant.
