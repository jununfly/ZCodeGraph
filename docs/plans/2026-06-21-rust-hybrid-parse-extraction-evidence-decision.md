# Rust-Hybrid Parse Extraction Evidence Decision

Date: 2026-06-21

## Parent

- Parse/extraction diagnostic issue: #224
- Optimization tracker: #165
- Plan 1 profile contract:
  `docs/plans/2026-06-21-rust-hybrid-parse-extraction-profile-contract.md`
- Plan 1 closeout:
  `docs/benchmarks/2026-06-21-parse-extraction-profile-contract-closeout.md`

## Context

Plan 1 added Rust core parse/extraction profile sub-buckets:

- `parseSourceReadMs`
- `parseNormalizationMs`
- `parseParserSetupMs`
- `parseTreeSitterMs`
- `parseAstExtractionMs`
- `parseErrorHandlingMs`
- `parseByLanguage`

#224 now needs evidence, not another optimization guess. Plan 2 uses those
fields to run targeted current-repo and VS Code sparse profile evidence, then
closes #224 with exactly one next step.

## Goal

Use `parseExtractionMs` sub-buckets to run targeted current-repo and VS Code
sparse evidence, fix targeted RSS sampling enough for those artifacts, then
close #224 with exactly one next step.

## Decision Boundary

Plan 2 is evidence-only. It must not implement a parse/extraction performance
optimization.

Allowed:

- evidence/profile tooling;
- targeted RSS sampling fixes needed for these artifacts;
- benchmark and decision artifacts;
- small diagnostic repairs if Plan 1 profile fields are unusable.

Not allowed:

- Rust parse/extraction optimization;
- graph semantic changes;
- SQLite schema changes;
- CLI, SDK, MCP, status, or doctor behavior changes;
- README metric updates;
- full scoreboard;
- agent A/B.

## RSS Boundary

RSS is required for Plan 2 artifacts, but the fix must stay narrow.

Allowed RSS work:

- make targeted CLI source-path RSS capture usable for current repo and VS Code
  sparse profile evidence;
- avoid known-bad process-list or `ps`-dependent approaches when possible;
- record `rssUnavailableReason` only after an attempted targeted fix still
  cannot capture RSS.

Not allowed RSS work:

- full cross-platform resource monitoring framework;
- daemon/runtime lifecycle changes;
- doctor/status UX changes;
- full scoreboard resource tooling.

## Evidence Scope

Required corpus scope:

- current repo targeted profile evidence;
- VS Code sparse targeted profile evidence when
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout.

If VS Code sparse is unavailable, do not clone. Record a setup blocker or
unavailable reason.

Do not run Excalidraw, Gin, the README matrix, full scoreboard, or agent A/B in
this plan.

## Closeout Contract

Plan 2 must close #224.

The closeout must choose exactly one next step:

- one bounded parse/extraction optimization candidate;
- one no-go reason;
- or one narrower profiling issue.

If a bounded optimization candidate exists, create exactly one successor
implementation issue or plan under #165. That successor is Plan 3 and is not a
#224 completion blocker.

## Issue Sequence

1. Fix targeted RSS sampling for parse evidence.
2. Add parse extraction evidence summarizer.
3. Run current repo and VS Code sparse parse evidence.
4. Write #224 parse extraction decision closeout.
