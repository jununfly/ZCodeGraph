# Rust-Hybrid Parse AST Extraction Bounded Optimization

Date: 2026-06-21

## Parent

- Optimization tracker: #165
- Completed diagnostic: #224
- Plan 3 issue: #398
- Plan 2 closeout:
  `docs/benchmarks/2026-06-21-parse-extraction-evidence-decision-closeout.md`
- Plan 2 evidence summary:
  `docs/benchmarks/2026-06-21-parse-extraction-evidence.summary.md`

## Context

Plan 2 evidence identified `parseAstExtractionMs` as the dominant Rust
parse/extraction sub-bucket on both the current repo and the validated VS Code
sparse checkout:

| Corpus | Commit | parseExtractionMs | Dominant parse bucket | Dominant ms |
|---|---:|---:|---|---:|
| zcodegraph | e3b9395 | 1174 | parseAstExtractionMs | 482 |
| vscode-sparse | 4a6e32fc1f0 | 23298 | parseAstExtractionMs | 9465 |

#398 is the single Plan 3 successor chosen by the #224 closeout. It must try
exactly one bounded Rust parse AST extraction optimization candidate and
conclude with either improvement evidence or a no-go reason.

## Goal

Complete #398 by trying one bounded optimization candidate in the Rust JS/TS
AST extraction walker, then record before/after evidence and update #165.

## Chosen Candidate

Reduce repeated JS/TS AST text extraction in the Rust walker, focused on:

- repeated `utf8_text()` extraction for symbol names already available in the
  same local decision;
- repeated full-node text scans for `import_statement` and `export_statement`
  binding extraction;
- small internal helper shape changes when they reduce repeated text extraction.

This candidate is deliberately narrow. It targets `parseAstExtractionMs`
without changing graph semantics.

## Decision Boundary

Allowed:

- private Rust helper shape changes inside AST extraction;
- local reuse of extracted symbol names or statement text;
- targeted contract/parity tests that prove output semantics stay stable;
- targeted before/after profile evidence for current repo;
- one VS Code sparse after-profile smoke when the existing checkout is
  available at `/private/tmp/codegraph-corpus/vscode-sparse`.

Not allowed:

- a second optimization candidate in #398;
- Tree-sitter parser optimization;
- recursive-to-iterative walker rewrite;
- resolver, finalization, SQLite, CLI, MCP, SDK, README, or release behavior
  changes;
- graph semantic changes;
- SQLite schema changes;
- full scoreboard;
- agent A/B.

## Validation

Required:

- targeted tests for graph/output parity around import/export extraction and
  symbol candidate handling;
- `cargo test --package zcodegraph-core` targeted tests for affected Rust core
  behavior;
- `npm run build` if TypeScript-facing scripts or profile tooling are touched;
- before/after current-repo targeted profile evidence;
- one VS Code sparse targeted profile smoke if
  `/private/tmp/codegraph-corpus/vscode-sparse` exists and is a Git checkout.

RSS is not required to become available. Evidence must record either RSS or
`rssUnavailableReason`.

## Closeout Contract

#398 closes only when:

- the single candidate has been implemented or rejected as a no-go;
- before/after evidence is recorded;
- graph semantics are shown stable by tests/parity checks;
- #165 is updated with the result.

If the candidate is ineffective, #398 closes with a no-go conclusion. A future
candidate can be proposed under #165, but it must not be implemented in #398.

## Issue Sequence

1. Add graph parity and candidate contract tests for AST extraction optimization.
2. Reduce repeated JS/TS import/export text extraction in the Rust AST walker.
3. Run targeted before/after current repo and VS Code sparse profile evidence.
4. Write #398 closeout and update #165.
