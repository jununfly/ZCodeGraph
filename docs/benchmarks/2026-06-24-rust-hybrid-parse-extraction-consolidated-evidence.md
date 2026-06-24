# Rust-Hybrid Parse And Extraction Consolidated Evidence

Date: 2026-06-24

Status: consolidated archive

Consolidates parse/extraction profile contracts, parse evidence decisions, bounded parse AST and walker optimization evidence, and related profile/RSS sampling notes.

This file replaces the issue-scoped process artifacts listed below. The source files were deleted after their useful decisions, taxonomy, and evidence context were consolidated here.

## Historical Source Files Merged And Deleted

- 2026-06-21-parse-ast-extraction-optimization-after.summary.md
- 2026-06-21-parse-ast-extraction-optimization-closeout.md
- 2026-06-21-parse-extraction-evidence-decision-closeout.md
- 2026-06-21-parse-extraction-evidence.summary.md
- 2026-06-21-parse-extraction-profile-contract-closeout.md
- 2026-06-21-targeted-profile-evidence-rss-sampling-decision.md
- 2026-06-22-parse-walker-hot-path-after.summary.md
- 2026-06-22-parse-walker-hot-path-closeout.md

## Consolidated Contents

## 1. 2026-06-21-parse-ast-extraction-optimization-after.summary.md

# Parse Extraction Evidence Summary

Source profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-parse-ast-extraction-optimization-after.profile.json`

## Corpus Summary

| Corpus | Commit | parseExtractionMs | Dominant parse bucket | Dominant ms | Rust peak RSS bytes | Readiness |
|---|---:|---:|---|---:|---:|---|
| zcodegraph | 78d2799 | 1179 | parseAstExtractionMs | 485 | unavailable: RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM) | ready |
| vscode-sparse | 4a6e32fc1f0 | 23157 | parseAstExtractionMs | 9436 | unavailable: RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM) | ready |

## Per-Language Parse Distribution

| Corpus | Language | Files | parseExtractionMs | treeSitterMs | astExtractionMs |
|---|---|---:|---:|---:|---:|
| zcodegraph | javascript | 4 | 6 | 2 | 2 |
| zcodegraph | typescript | 303 | 1173 | 422 | 483 |
| vscode-sparse | javascript | 33 | 206 | 116 | 74 |
| vscode-sparse | typescript | 5747 | 22951 | 7922 | 9362 |

## Decision Sufficiency

- zcodegraph: ready
- vscode-sparse: ready

## 2. 2026-06-21-parse-ast-extraction-optimization-closeout.md

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
  `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Baseline profile:
  `docs/benchmarks/2026-06-21-parse-extraction-evidence.profile.json`
- Baseline summary:
  `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`
- After profile:
  `docs/benchmarks/2026-06-21-parse-ast-extraction-optimization-after.profile.json`
- After summary:
  `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

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

## 3. 2026-06-21-parse-extraction-evidence-decision-closeout.md

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
  `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`
- Profile contract closeout:
  `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

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

## 4. 2026-06-21-parse-extraction-evidence.summary.md

# Parse Extraction Evidence Summary

Source profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-21-parse-extraction-evidence.profile.json`

## Corpus Summary

| Corpus | Commit | parseExtractionMs | Dominant parse bucket | Dominant ms | Rust peak RSS bytes | Readiness |
|---|---:|---:|---|---:|---:|---|
| zcodegraph | e3b9395 | 1174 | parseAstExtractionMs | 482 | unavailable: RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM) | ready |
| vscode-sparse | 4a6e32fc1f0 | 23298 | parseAstExtractionMs | 9465 | unavailable: RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM) | ready |

## Per-Language Parse Distribution

| Corpus | Language | Files | parseExtractionMs | treeSitterMs | astExtractionMs |
|---|---|---:|---:|---:|---:|
| zcodegraph | javascript | 4 | 6 | 2 | 2 |
| zcodegraph | typescript | 303 | 1168 | 419 | 480 |
| vscode-sparse | javascript | 33 | 210 | 117 | 75 |
| vscode-sparse | typescript | 5747 | 23088 | 7925 | 9390 |

## Decision Sufficiency

- zcodegraph: ready
- vscode-sparse: ready

## 5. 2026-06-21-parse-extraction-profile-contract-closeout.md

# Parse Extraction Profile Contract Closeout

Date: 2026-06-21

## Scope

This closes Plan 1 for #224:

- Plan: `docs/plans/2026-06-24-rust-hybrid-consolidated-plans.md`
- Issues: #390, #391, #392, #393

This plan only adds parse/extraction diagnostics. It does not optimize
parse/extraction and does not close #224.

## Implemented Profile Contract

Rust core profile artifacts now preserve the existing high-level
`parseExtractionMs` field and add diagnostic sub-buckets:

- `parseSourceReadMs`
- `parseNormalizationMs`
- `parseParserSetupMs`
- `parseTreeSitterMs`
- `parseAstExtractionMs`
- `parseErrorHandlingMs`
- `parseByLanguage`

`parseByLanguage` records per-language file count and the same sub-bucket shape.

These fields are profile artifact diagnostics for #224 evidence work. They are
not a long-term public API stability promise.

## Validation

Reduced fixture smoke:

- Rust core fixture indexes TypeScript and JavaScript files.
- Profile sub-buckets are non-negative.
- `parseByLanguage` includes `typescript` and `javascript`.
- Per-language file counts match indexed files.
- Existing `parseExtractionMs` remains present.

Artifact propagation smoke:

- CLI `ZCODEGRAPH_INDEX_PROFILE_OUT` profile includes the new `rustCore`
  sub-buckets.
- Existing status/index behavior remains unchanged.

Commands run:

```bash
cargo test -p zcodegraph-core
npx vitest run __tests__/rust-index-engine-cli.test.ts -t "writes a Rust-produced index and profile"
```

## Non-Changes

- No performance optimization was implemented.
- No SQLite schema changed.
- No MCP behavior changed.
- No default user-visible indexing behavior changed.
- No VS Code sparse run was performed in this plan.
- No agent A/B was run.

## Next Step

#224 remains open.

Plan 2 should use these fields to run targeted current-repo and VS Code sparse
profile evidence, record RSS or an unavailable reason, and decide exactly one
next step:

- one bounded parse/extraction optimization candidate;
- one no-go reason;
- or one narrower profiling issue.

## 6. 2026-06-21-targeted-profile-evidence-rss-sampling-decision.md

# Targeted Profile Evidence RSS Sampling Decision

Date: 2026-06-21

## Decision

Keep the Node-based targeted profile evidence runner.

The runner replaces `/usr/bin/time -l` as the primary RSS mechanism for targeted
profile evidence. It samples the launched command's process tree with `ps -axo
pid,ppid,rss`, records `peakRssBytes` when available, and records
`rssUnavailableReason` when process-list access is blocked.

This fixes the repeated evidence problem where a successful profile command was
reported as failed because sandboxed `/usr/bin/time -l` could not read
`sysctl kern.clockrate`.

## Scope

Added:

- `scripts/process-tree-rss.mjs`
- `scripts/targeted-profile-evidence.mjs`
- `__tests__/targeted-profile-evidence.test.ts`

The change is limited to evidence tooling:

- no indexer behavior changed;
- no resolver semantics changed;
- no graph output changed;
- no product user-facing command changed.

## Usage

Example:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/example.profile.json \
  node scripts/targeted-profile-evidence.mjs \
  --out docs/benchmarks/example.measurement.json \
  --cwd . \
  -- node dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

The profile itself is still written by `zcodegraph index` via
`ZCODEGRAPH_INDEX_PROFILE_OUT`. The wrapper writes a sidecar measurement JSON
with:

- command;
- status;
- exit code;
- wall-clock milliseconds;
- `peakRssBytes`;
- `rssUnavailableReason`;
- stdout/stderr byte counts.

## Deterministic Evidence

Command:

```bash
npx vitest run __tests__/targeted-profile-evidence.test.ts
```

Result:

- Passed.

The test forces RSS sampling to use a nonexistent `ps` command and proves that a
successful command still exits successfully while the sidecar records
`rssUnavailableReason`.

## Current Repo Smoke

Profile artifact:

- `docs/benchmarks/2026-06-21-targeted-profile-evidence-current.profile.json`

Measurement artifact:

- `docs/benchmarks/2026-06-21-targeted-profile-evidence-current.measurement.json`

Command:

```bash
env CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 \
  ZCODEGRAPH_INDEX_PROFILE_OUT=docs/benchmarks/2026-06-21-targeted-profile-evidence-current.profile.json \
  /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  scripts/targeted-profile-evidence.mjs \
  --out docs/benchmarks/2026-06-21-targeted-profile-evidence-current.measurement.json \
  --cwd . \
  -- /Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  dist/bin/zcodegraph.js index . --force --quiet --engine rust-hybrid
```

Observed:

- Command status: completed.
- Exit code: 0.
- Wall time: 31,361ms.
- `peakRssBytes`: unavailable.
- `rssUnavailableReason`:
  `RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM)`.

This is the intended fallback behavior: the profile command succeeds, and RSS
availability is represented as data instead of a failed evidence run.

## 7. 2026-06-22-parse-walker-hot-path-after.summary.md

# Parse Extraction Evidence Summary

Source profile: `/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph/docs/benchmarks/2026-06-22-parse-walker-hot-path-after.profile.json`

## Corpus Summary

| Corpus | Commit | parseExtractionMs | Dominant parse bucket | Dominant ms | Rust peak RSS bytes | Readiness |
|---|---:|---:|---|---:|---:|---|
| zcodegraph | 71b6d74 | 1717 | parseAstExtractionMs | 995 | unavailable: RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM) | ready |
| vscode-sparse | 4a6e32fc1f0 | 32964 | parseAstExtractionMs | 18891 | unavailable: RSS sampling unavailable: process-list access is sandboxed (spawnSync ps EPERM) | ready |

## Per-Language Parse Distribution

| Corpus | Language | Files | parseExtractionMs | treeSitterMs | astExtractionMs |
|---|---|---:|---:|---:|---:|
| zcodegraph | javascript | 4 | 8 | 2 | 6 |
| zcodegraph | typescript | 304 | 1709 | 431 | 989 |
| vscode-sparse | javascript | 33 | 290 | 116 | 158 |
| vscode-sparse | typescript | 5747 | 32674 | 7993 | 18733 |

## Decision Sufficiency

- zcodegraph: ready
- vscode-sparse: ready

## 8. 2026-06-22-parse-walker-hot-path-closeout.md

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
- `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`

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
- `docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md`
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
