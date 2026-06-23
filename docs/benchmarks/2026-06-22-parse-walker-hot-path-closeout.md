# Parse Walker Hot-Path Closeout

Date: 2026-06-22

## Parent

- Plan:
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Issues: #412, #413, #414, #415
- Optimization tracker: #165
- Parse/extraction diagnostic track: #224

## Decision

Plan 3 is complete with a **keep** decision.

The single bounded implementation candidate was:

- skip JS/TS extractor named-symbol and statement-reference checks for
  anonymous leaf syntax nodes.

This is not the repeated-text-extraction family already no-goed by #398. The
candidate targets walker branch/scan shape and preserves graph-visible output.

## Diagnostic Fields

The new artifact-only diagnostic field is `parseAstWalker`.

It records JS/TS Rust AST walker counts by syntax shape:

- `visits`;
- `namedSymbolChecks`;
- `statementRefChecks`;
- `childTraversals`.

The field is intentionally non-stable engineering evidence. It is not surfaced
through README, MCP tools, status, doctor, or release messaging.

Important caveat: collecting this diagnostic is not free. The benchmark script
opens it explicitly to choose and explain the candidate. Default indexing leaves
walker diagnostics off.

## Candidate Selection Evidence

Diagnostic-on artifact:

- `docs/benchmarks/2026-06-22-parse-walker-hot-path-after.profile.json`
- `docs/benchmarks/2026-06-22-parse-walker-hot-path-after.summary.json`
- `docs/benchmarks/2026-06-22-parse-walker-hot-path-after.summary.md`

The diagnostic artifact showed high-volume anonymous leaf shapes such as
punctuation tokens receiving visits in both the current repository and VS Code
sparse. The bounded candidate therefore skipped expensive extraction checks for
anonymous leaf nodes.

The diagnostic-on profile should not be used as the direct before/after
performance comparison because the diagnostic map itself adds measurable
overhead.

## Default-Path Performance Evidence

Default-path rust-core evidence keeps `parseAstWalker` off and therefore
measures the retained candidate without diagnostic overhead.

| Corpus | Commit | Baseline parseAstExtractionMs | Default after parseAstExtractionMs | Delta | Decision |
| --- | ---: | ---: | ---: | ---: | --- |
| zcodegraph | 71b6d74 | 482 | 418 | -13.3% | keep |
| vscode-sparse | 4a6e32fc1f0 | 9465 | 8216 | -13.2% | keep |

Artifacts:

- `docs/benchmarks/2026-06-21-parse-extraction-evidence.profile.json`
- `docs/benchmarks/2026-06-21-parse-extraction-evidence.summary.md`
- `docs/benchmarks/2026-06-22-parse-walker-hot-path-default-current-repo.rust-core.jsonl`
- `docs/benchmarks/2026-06-22-parse-walker-hot-path-default-vscode-sparse.rust-core.jsonl`

The zcodegraph commit differs from the 2026-06-21 baseline because this run was
performed after Plan 3 implementation changes. VS Code sparse remained pinned
to commit `4a6e32fc1f0`.

## Graph Parity And Fallback Result

The candidate preserves graph-visible output for a TSX fixture covering:

- source symbol nodes;
- ESM named import;
- function call reference;
- JSX component reference;
- final graph semantic edges.

Default indexing also has a guardrail proving `parseAstWalker` remains empty
when diagnostics are not explicitly enabled.

No resolver/finalization semantics changed. No fallback taxonomy behavior was
intentionally changed.

## RSS Result

RSS remained unavailable in this macOS sandboxed evidence run:

`RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

This is recorded in the profile artifact. The keep decision is based on
parse/extraction sub-buckets and graph parity, not RSS movement.

## Validation

Validation performed:

- `cargo test --package zcodegraph-core rust_index_skips_anonymous_leaf_checks_without_losing_js_graph_facts -- --nocapture`
- `cargo test --package zcodegraph-core rust_index_leaves_parse_walker_diagnostics_off_by_default -- --nocapture`
- `cargo test --package zcodegraph-core emits_machine_readable_result_json -- --nocapture`
- `npx vitest run __tests__/rust-index-profile.test.ts`
- `cargo build --package zcodegraph-core`
- `npm run build`
- targeted current repository rust-core profile
- targeted VS Code sparse rust-core profile

## Tracker Update

#165 should continue to the consolidated decision step.

#224 can treat Plan 3 as complete: the parse/extraction implementation slice
attempted one candidate, produced artifact-only walker diagnostics, retained a
bounded optimization, and recorded default-path trend evidence.

Next step: consolidated decision across resolver semantic, finalization tail,
and parse/extraction.
