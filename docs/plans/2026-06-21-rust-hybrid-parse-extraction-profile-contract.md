# Rust-Hybrid Parse Extraction Profile Contract

Date: 2026-06-21

## Parent

- Parse/extraction diagnostic issue: #224
- Optimization tracker: #165
- Closed architecture/performance PRD: #295

## Context

#224 remains open as the parse/extraction diagnostic lane after #295 closed.
Previous performance evidence kept a low-risk parser reuse candidate, but it did
not materially move large-corpus `rustCore.parseExtractionMs`.

The next useful step is not another parse optimization. The next useful step is
to split `parseExtractionMs` into actionable diagnostic sub-buckets so #224 can
choose one next bounded optimization candidate, record no-go, or request a
narrower profiling issue.

This plan is Plan 1 of the #224 closure path. It only defines and populates the
profile contract. Plan 2 will run current/VS Code sparse evidence and write the
#224 decision. Plan 3, if needed, will be a separate implementation issue created
from the #224 closeout.

## Goal

Expose enough Rust core parse/extraction profile detail to explain what
`parseExtractionMs` contains, without changing default indexing behavior.

## Profile Contract

Add diagnostic profile fields under the Rust core profile artifact. These fields
are profile artifact diagnostics only and do not promise long-term public API
stability.

Target sub-buckets:

- `parseSourceReadMs`
- `parseNormalizationMs`
- `parseParserSetupMs`
- `parseTreeSitterMs`
- `parseAstExtractionMs`
- `parseErrorHandlingMs`
- `parseByLanguage`

The exact names may change during implementation if the existing Rust core
structure has a more precise local vocabulary, but the final fields must still
separate:

- source/content loading or preparation;
- TypeScript/JavaScript normalization;
- parser setup or language selection;
- tree-sitter parse work;
- AST walk/extraction work;
- parse/error-gap handling;
- per-language distribution.

## Non-Goals

- Do not implement a performance optimization.
- Do not run VS Code sparse in this plan.
- Do not run a full scoreboard.
- Do not run agent A/B.
- Do not change SQLite schema.
- Do not change CLI, SDK, MCP, status, or doctor behavior except for carrying
  the existing profile artifact fields through normal profile output.
- Do not change default user-visible indexing behavior.
- Do not claim readiness, speedup, or performance improvement.
- Do not update README metrics.

## Validation

Required:

- deterministic Rust core tests for default/zero profile fields;
- deterministic result/profile JSON tests proving the new fields are emitted;
- tests or fixture smoke proving sub-buckets are populated on a reduced parse
  fixture;
- non-negative timing assertions;
- a documented relationship between `parseExtractionMs` and the sub-buckets,
  without requiring exact equality if timing overhead or nested timers make exact
  sums misleading;
- `cargo test -p zcodegraph-core`;
- targeted Vitest coverage if TypeScript profile propagation code changes;
- `npm run build`;
- `git diff --check`.

## Closure

This plan does not close #224. It enables Plan 2:

1. run targeted current repo profile evidence;
2. run VS Code sparse profile evidence if the human-provided corpus exists;
3. record RSS or unavailable reason;
4. write the #224 parse extraction evidence decision;
5. either close #224 with no-go/narrower profiling, or create one successor
   bounded optimization issue.

## Issue Sequence

1. Add Rust parseExtractionMs sub-bucket profile fields.
2. Populate parse source/normalization/parser/AST extraction timings.
3. Expose parse sub-buckets in result/profile artifacts and tests.
4. Add reduced fixture smoke for parse sub-bucket diagnostics.
