# Rust-Hybrid Parse Extraction Walker Hot-Path Plan

Date: 2026-06-22

## Parent

- Optimization tracker: #165
- Architecture/performance PRD:
  `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- Parse/extraction diagnostic track: #224
- #224 Plan 2 closeout:
  `docs/benchmarks/2026-06-21-parse-extraction-evidence-decision-closeout.md`
- Previous bounded parse optimization closeout:
  `docs/benchmarks/2026-06-21-parse-ast-extraction-optimization-closeout.md`
- Finalization tail boundary closeout:
  `docs/benchmarks/2026-06-21-finalization-tail-boundary-closeout.md`

## Context

#224 established that `parseAstExtractionMs` is the dominant parse/extraction
sub-bucket on both the current repository and the validated VS Code sparse
checkout.

The previous bounded parse optimization tried one repeated-text-extraction
candidate. It was safe, but the result was neutral/noisy no-go:

- current repository `parseAstExtractionMs`: `482 -> 485`;
- VS Code sparse `parseAstExtractionMs`: `9465 -> 9436`.

This means the next parse/extraction implementation slice should not continue
the same small string-allocation family. The next useful bet is to identify AST
walker hot paths and try one bounded implementation candidate with a larger
expected effect.

## Goal

Complete the parse/extraction implementation slice for the architecture and
performance PRD.

Completion means:

- AST walker hot-path diagnostics are available in profile/evidence artifacts;
- exactly one bounded walker optimization candidate is selected and attempted;
- graph semantics and default user behavior are preserved;
- current repository and VS Code sparse targeted profile evidence is recorded;
- the closeout records `keep`, `tentative keep`, `too noisy`, or `no-go`;
- the next step is a consolidated decision across resolver semantic,
  finalization tail, and parse/extraction work.

## Scope

In scope:

- JS/TS Rust parse/extraction walker hot-path diagnostics;
- artifact-only diagnostic fields for engineering evidence;
- one bounded implementation candidate selected from the diagnostics;
- deterministic graph-visible parity tests for the changed extraction surface;
- targeted rust-hybrid profile evidence on the current repository;
- targeted rust-hybrid profile evidence on
  `/private/tmp/codegraph-corpus/vscode-sparse` when it exists and is a Git
  checkout;
- closeout artifact under `docs/benchmarks/`;
- updates to #165 and #224 comments with the Plan 3 result.

Out of scope:

- Tree-sitter parser setup or parser reuse optimization;
- continuing the repeated-text-extraction micro-optimization family from #398;
- broad extractor rewrite;
- graph semantic changes;
- resolver or finalization changes;
- SQLite schema changes;
- CLI, SDK, MCP, status, doctor, packaging, README, or release workflow changes;
- full scoreboard by default;
- agent A/B by default.

## Diagnostic Posture

The walker diagnostics are artifact-only diagnostics.

They may appear in profile JSON or benchmark evidence artifacts, but they are
not a stable public API and should not be surfaced in README, MCP tool output,
or user-facing status/doctor output as part of this plan.

The diagnostics should be sufficient to select one candidate. They should not
turn into a broad profiling framework.

Useful diagnostic classes may include:

- extractor stage;
- syntax shape or node family;
- scan shape, such as direct child walk vs broader descendant walk;
- visit count or candidate count when that explains cost;
- elapsed time for the smallest reliable bucket available without excessive
  instrumentation overhead.

## Implementation Candidate Rules

The implementation candidate must be selected after diagnostics identify the
most suspicious walker hot path.

Acceptable candidates include narrow changes such as:

- replacing broad descendant scans with direct named-child traversal where the
  grammar shape is already known;
- avoiding repeated traversal of the same subtree inside one extraction pass;
- specializing a high-volume import/export/class/function extraction loop;
- splitting a hot branch so unsupported shapes exit earlier without changing
  emitted graph facts.

The candidate must not:

- change emitted node or edge semantics;
- reduce fallback taxonomy explainability;
- remove supported syntax coverage;
- change reference disambiguation or finalization behavior;
- broaden into parser or Tree-sitter runtime changes.

## Success Criteria

This plan does not require strict end-to-end performance gate closure.

The candidate is successful if it produces credible `parseAstExtractionMs`
improvement on the current repository or VS Code sparse without graph parity
regression. A result may be `tentative keep` when one corpus improves and the
other is neutral, but the closeout must explain noise and applicability.

The candidate is `no-go` when:

- `parseAstExtractionMs` is neutral or worse on both corpora;
- improvement is too small or noisy to justify the added code;
- diagnostics show the selected path is not a meaningful contributor;
- graph parity or fallback evidence regresses.

RSS must be recorded when available. If RSS remains unavailable in the sandbox,
the profile artifact or closeout must record the unavailable reason explicitly.

## Validation

Required validation:

- deterministic unit/integration tests for the diagnostic contract or profile
  artifact shape;
- graph-visible parity tests for any changed extraction behavior;
- targeted rust-hybrid profile on the current repository;
- targeted rust-hybrid profile on the VS Code sparse checkout when available;
- `git diff --check`.

VS Code sparse validation must use
`/private/tmp/codegraph-corpus/vscode-sparse` only when it exists and is a Git
checkout. Do not clone automatically. If unavailable, mark the evidence issue
as requiring human setup rather than fabricating substitute large-corpus
evidence.

Not required by default:

- full scoreboard;
- agent A/B;
- README metric update;
- CHANGELOG entry unless production code changes are retained;
- package or release smoke.

## Issue Sequence

### 1. AST Walker Hot-Path Artifact Diagnostics

Purpose:

- expose enough JS/TS Rust extractor walker hot-path information to pick one
  bounded implementation candidate;
- keep diagnostics artifact-only and non-stable;
- avoid changing default user behavior.

Acceptance criteria:

- profile or evidence artifact includes walker hot-path diagnostic fields;
- diagnostic fields are documented as artifact-only;
- deterministic tests cover the diagnostic shape;
- no extraction semantics change.

### 2. Bounded Walker Optimization Candidate

Purpose:

- use the diagnostics from issue 1 to choose one suspicious AST walker path;
- implement one bounded optimization candidate;
- preserve graph-visible output.

Acceptance criteria:

- exactly one candidate is implemented;
- the candidate is not the repeated-text-extraction family already no-goed by
  #398;
- graph-visible parity tests cover the changed extraction surface;
- resolver/finalization semantics remain unchanged.

### 3. Targeted Current Repo And VS Code Sparse Evidence

Purpose:

- produce before/after targeted profile evidence for the selected candidate;
- record current repository and VS Code sparse results;
- capture RSS or unavailable reason.

Acceptance criteria:

- current repository targeted profile evidence is recorded;
- VS Code sparse targeted profile evidence is recorded when the checkout is
  available;
- if VS Code sparse is unavailable, the issue records human setup needed and no
  automatic clone is performed;
- evidence includes parse sub-buckets, graphStats or parity summary, and RSS or
  unavailable reason.

### 4. Parse Extraction Plan 3 Closeout And Tracker Update

Purpose:

- close the parse/extraction implementation slice with a reviewable decision;
- update #165 and #224 with the result;
- hand off to consolidated decision.

Acceptance criteria:

- closeout artifact exists under `docs/benchmarks/`;
- closeout states `keep`, `tentative keep`, `too noisy`, or `no-go`;
- closeout links the plan, issues, evidence artifacts, and validation;
- #165 and #224 receive summary comments;
- closeout states that the next step is consolidated decision across resolver
  semantic, finalization tail, and parse/extraction.

## Closeout Contract

This plan is complete only when the closeout artifact exists and the trackers
are updated.

The closeout must include:

- selected diagnostic fields;
- selected implementation candidate and why it was chosen;
- before/after profile results for current repository and VS Code sparse, or
  the human setup reason if VS Code sparse was unavailable;
- graph parity and fallback taxonomy result;
- RSS result or unavailable reason;
- keep/no-go decision;
- explicit statement that this plan tried one parse/extraction candidate only;
- explicit handoff to the consolidated decision plan.
