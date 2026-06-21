# Parse Extraction Evidence Decision Closeout

Date: 2026-06-21

## Scope

This closes #224 Plan 2. The work was evidence-only: no parse/extraction
optimization, graph semantic change, SQLite schema change, MCP change, CLI
behavior change, README metric update, full scoreboard, or agent A/B was
performed.

## Evidence Artifacts

- Profile artifact:
  `docs/benchmarks/2026-06-21-parse-extraction-evidence.profile.json`
- Summary JSON:
  `docs/benchmarks/2026-06-21-parse-extraction-evidence.summary.json`
- Summary Markdown:
  `docs/benchmarks/2026-06-21-parse-extraction-evidence.summary.md`
- Profile contract closeout:
  `docs/benchmarks/2026-06-21-parse-extraction-profile-contract-closeout.md`

## Corpus Coverage

| Corpus | Commit | parseExtractionMs | Dominant parse bucket | Dominant ms | Rust RSS |
|---|---:|---:|---|---:|---|
| zcodegraph | e3b9395 | 1174 | parseAstExtractionMs | 482 | unavailable |
| vscode-sparse | 4a6e32fc1f0 | 23298 | parseAstExtractionMs | 9465 | unavailable |

VS Code evidence used the existing Git checkout at
`/private/tmp/codegraph-corpus/vscode-sparse`. No clone was performed.

## RSS Result

Targeted RSS sampling was repaired narrowly for evidence tooling:

- Linux-style procfs sampling remains the preferred non-process-list path.
- A command-level sampler is covered by tests for hosts where a time-compatible
  wrapper is usable.
- The actual macOS sandboxed evidence run could not capture RSS because
  process-list access was blocked:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

This is an explicit artifact field, not a silent omission. It is sufficient for
#224 because the parse/extraction sub-bucket decision does not depend on RSS
being available in this sandbox.

## Decision

#224 is complete. The dominant parse/extraction evidence points to
`parseAstExtractionMs` on both the current repo and the validated VS Code sparse
checkout.

The single selected next step is #398:

- try one bounded Rust parse AST extraction optimization candidate;
- keep graph semantics unchanged;
- do not combine it with Tree-sitter parser optimization;
- conclude with either improvement evidence or a no-go reason.

No additional #224 follow-up issue is required.
