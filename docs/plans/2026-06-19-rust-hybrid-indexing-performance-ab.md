# Rust-Hybrid Indexing Performance A/B Plan

## Parent

- Long-running performance tracker: #165
- Existing parse-extraction profiling candidate: #224
- First-user release PRD:
  `docs/prds/2026-06-18-rust-hybrid-first-user-release.md`

## Context

The first-user `rust-hybrid` path is usable enough to keep moving without a
strict performance release gate, but indexing speed and resource use still
matter for first-user trust. Previous work improved diagnostic quality and made
fallback understandable. This plan is a bounded performance pass for the
default `rust-hybrid` indexing path.

The goal is not to restart the broader Rust-indexing optimization program or to
prove that Rust beats the TypeScript indexer end-to-end in one pass. The goal is
to run one disciplined A/B loop that produces credible trend evidence and a
clear next decision.

## Goal

Measure and, if justified, improve `rust-hybrid` default-path full indexing
wall-clock time while keeping memory behavior trustworthy.

The plan should answer:

- Where does current `rust-hybrid` indexing time go on the source checkout path?
- Is there one bounded production-code optimization candidate worth trying now?
- Does that candidate improve wall-clock time on representative corpora?
- Does RSS remain stable, or is an unavailable memory measurement explained?
- Should the candidate be kept, rolled back, or recorded as no-go?

## Corpora

Use exactly these source-path corpora:

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

- RSS / memory stability, or a clear unavailable reason when RSS cannot be
  captured reliably.

Diagnostic buckets:

- `parseExtractionMs`
- SQLite write time / database write bucket
- TypeScript finalization
- fallback append / fallback accounting

These buckets are for diagnosis and candidate selection. They are not separate
release gates.

## Non-Goals

- Do not optimize TypeScript-only standalone indexing.
- Do not require Rust to beat the TypeScript indexer end-to-end.
- Do not run the full benchmark scoreboard.
- Do not run agent sufficiency A/B.
- Do not add a new language, framework, or user-facing feature.
- Do not broaden #224 into the whole plan unless the baseline evidence points
  there.
- Do not update README by default.
- Do not run packaged/release smoke unless the selected candidate touches CLI
  launcher, packaging, status, doctor, or release-path code.

## Decisions

### One Bounded Candidate Only

This plan must try at most one production-code optimization candidate. The
candidate is selected from baseline evidence, not from prior intuition alone.
If no credible candidate appears, record a no-go decision instead of forcing a
change.

### Production Code Changes Are Allowed

Production-code changes are allowed only for the selected bounded candidate.
Do not mix multiple optimizations into one issue. Add targeted tests for the
changed behavior.

If production code changes, update `CHANGELOG.md` under `## [Unreleased]` with
a user-facing note. README updates are not required by default.

### Evidence Beats Success Theater

The pass is complete if it produces a credible baseline, one bounded attempt,
and a defensible keep / rollback / no-go decision. A measured non-improvement
is acceptable if the evidence is usable for future work.

### Trackers Stay Canonical

Use #165 as the long-running performance parent. Reference #224 as the existing
parse-extraction profiling candidate, but do not assume #224 is the selected
candidate before the baseline profile.

## Issue Sequence

1. Baseline profile and candidate selection.
2. Implement one bounded optimization candidate.
3. After-profile decision and tracker updates.

## Acceptance

- Baseline profiles are recorded for the current repo and the VS Code sparse
  checkout, or the VS Code path is explicitly marked as needing human setup.
- Baseline evidence includes wall-clock time, RSS or unavailable reason, and
  the agreed diagnostic buckets.
- Exactly one candidate is selected, or the plan records no-go.
- The implementation issue changes only the selected candidate and includes
  targeted tests.
- After-profile evidence compares baseline vs after on both corpora where
  available.
- The final decision says keep, rollback, or no-go.
- #165 is updated with the outcome.
- #224 is updated only if the evidence confirms or rejects the parse-extraction
  path as the next candidate.
