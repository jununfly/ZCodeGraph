# Parse AST Extraction Optimization Closeout

Date: 2026-06-21

## Scope

This closes #398 Plan 3. The work tried exactly one bounded Rust parse AST
extraction optimization candidate:

- reuse locally extracted JS/TS symbol names instead of extracting the same
  name text again during node materialization;
- reuse import/export statement text inside statement reference extraction;
- avoid intermediate `String` allocation for import/export binding names before
  `push_ref` stores the reference.

No second candidate was implemented. The work did not change Tree-sitter
parser behavior, resolver/finalization behavior, SQLite schema, CLI/MCP/SDK
behavior, README metrics, graph semantics, or release positioning.

## Artifacts

- Plan:
  `docs/plans/2026-06-21-rust-hybrid-parse-ast-extraction-bounded-optimization.md`
- Baseline profile:
  `docs/benchmarks/2026-06-21-parse-extraction-evidence.profile.json`
- Baseline summary:
  `docs/benchmarks/2026-06-21-parse-extraction-evidence.summary.md`
- After profile:
  `docs/benchmarks/2026-06-21-parse-ast-extraction-optimization-after.profile.json`
- After summary:
  `docs/benchmarks/2026-06-21-parse-ast-extraction-optimization-after.summary.md`

## Result

| Corpus | parseExtractionMs before | parseExtractionMs after | parseAstExtractionMs before | parseAstExtractionMs after | Conclusion |
|---|---:|---:|---:|---:|---|
| zcodegraph | 1174 | 1179 | 482 | 485 | neutral/noisy no-go |
| vscode-sparse | 23298 | 23157 | 9465 | 9436 | neutral/noisy no-go |

The VS Code sparse run showed a small `parseAstExtractionMs` decrease
(-0.31%), while the current repo showed a small increase (+0.62%). This is not
a credible improvement signal for the candidate.

RSS remained unavailable in this macOS sandbox and was recorded explicitly as:

`RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

## Semantics Guardrail

The implementation added targeted graph-visible parity coverage for JS/TS
import/export extraction and symbol output. The test checks:

- source symbol nodes remain present;
- unresolved import/export/call references remain compatible after
  finalization;
- resolved imports edges still point to the expected file and symbol targets;
- language attribution remains stable.

## Decision

#398 is complete with a **neutral/noisy no-go** conclusion.

This bounded repeated-text-extraction candidate is safe and small, but it did
not produce enough `parseAstExtractionMs` improvement to justify more work in
the same direction inside #398.

Recommended #165 follow-up: do not continue this exact micro-optimization
family as the next performance bet. If parse/extraction remains the next area,
choose a different candidate with a larger expected effect, such as a targeted
AST walker hot-path profiling slice or a separate Tree-sitter/parser candidate.
