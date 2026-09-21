<!--
doc-kind: design
authority: supporting
authority-id: DES-parse-extraction-ledger
distilled-from: docs/benchmarks/2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md
distill-date: 2026-09-21
-->

# Parse / Extraction Optimization Decision Ledger

> Distilled 2026-09-21 from the 559-line consolidated evidence archive
> `2026-06-24-rust-hybrid-parse-extraction-consolidated-evidence.md` (itself an
> append-concatenation of eight 2026-06-21/22 issue-scoped process artifacts).
> This ledger keeps only the **durable decisions, taxonomy, and bounded
> optimization protocol** for the Rust-owned parse/extraction hot path. Dropped:
> duplicate per-language profile tables, per-machine profile paths, raw
> command logs, and repeated summary boilerplate. Raw measurements remain in
> git history and in the `.profile.json` artifacts referenced below.

## Scope

This ledger covers the 2026-06-21/22 evidence-gated parse/extraction work:
profiling the dominant parse sub-bucket, one **no-go** micro-optimization
(#398 repeated-text-extraction), the profile-evidence contract, the RSS
sampling decision, and one **keep** bounded AST-walker hot-path optimization
(Plan 3). It does not cover Tree-sitter parser optimization (explicitly kept
separate) or resolver/finalization decisions (see
`rust-hybrid-optimization-decision-ledger.md`).

## Source Files (process artifacts merged, then deleted)

The consolidated archive merged these eight issue-scoped files; their durable
content is captured in the per-artifact blocks below:

1. `2026-06-21-parse-ast-extraction-optimization-after.summary.md`
2. `2026-06-21-parse-ast-extraction-optimization-closeout.md` (#398 Plan 3)
3. `2026-06-21-parse-extraction-evidence-decision-closeout.md` (#224 Plan 2)
4. `2026-06-21-parse-extraction-evidence.summary.md`
5. `2026-06-21-parse-extraction-profile-contract-closeout.md`
6. `2026-06-21-targeted-profile-evidence-rss-sampling-decision.md`
7. `2026-06-22-parse-walker-hot-path-after.summary.md`
8. `2026-06-22-parse-walker-hot-path-closeout.md` (#165 Plan 3)

Related trackers: #224 (parse/extraction diagnostic track), #398 (bounded AST
extraction candidate), #165 (overall post-release optimization tracker).

## Dominant-bucket finding (#224, evidence-only)

On both corpora the dominant parse/extraction sub-bucket was
`parseAstExtractionMs` (AST extraction, not Tree-sitter parsing or graph
walking):

| Corpus | parseExtractionMs | Dominant bucket | Dominant ms |
|---|---:|---|---:|
| zcodegraph | ~1,174–1,179 | parseAstExtractionMs | ~482–485 |
| vscode-sparse | ~23,157–23,298 | parseAstExtractionMs | ~9,436–9,465 |

**Decision (#224 complete, evidence-only):** the next move was a single bounded
Rust parse-AST extraction candidate under explicit guardrails —

- try exactly one bounded Rust parse AST extraction optimization candidate;
- keep graph semantics unchanged;
- do **not** combine it with a Tree-sitter parser optimization;
- conclude with either improvement evidence or a no-go reason.

No additional #224 follow-up issue was required. RSS was unavailable in the
macOS sandboxed evidence run (`spawnSync ps EPERM`); this is an explicit
artifact field, not a silent omission, and the parse/extraction sub-bucket
decision does not depend on RSS.

## Decision #398 — repeated-text-extraction candidate: no-go

**Verdict: neutral/noisy no-go.** The bounded repeated-text-extraction
candidate was safe and small but produced no reliable `parseAstExtractionMs`
improvement:

| Corpus | parseExtractionMs before→after | parseAstExtractionMs before→after | Conclusion |
|---|---|---|---|
| zcodegraph | 1174 → 1179 | 482 → 485 | neutral/noisy no-go |
| vscode-sparse | 23298 → 23157 | 9465 → 9436 | neutral/noisy no-go |

**Follow-up rule:** do not continue this exact repeated-text micro-optimization
family as the next performance bet. If parse/extraction remains the target
area, choose a candidate with a larger expected effect — e.g. a targeted AST
walker hot-path slice (which became the keep decision below) or a separate
Tree-sitter/parser candidate.

**Semantics guardrail (kept regardless of verdict):** the work added targeted
graph-visible parity coverage for JS/TS import/export extraction and symbol
output — source symbol nodes stay present; unresolved import/export/call
references stay compatible after finalization; resolved import edges still
point to the expected file and symbol targets; language attribution stays
stable.

## Profile-evidence contract (#224 profile contract closeout)

Established the durable targeted profile contract for parse/extraction
evidence. No performance optimization was implemented by the contract itself;
it defines how evidence is captured (targeted profile runner, explicit corpus
and commit identity, sub-bucket breakdown, RSS as an explicit field). The
contract requires one bounded candidate and one no-go/keep reason per pass and
forbids mixing unrelated optimization directions.

## RSS sampling decision — keep the Node-based targeted runner

**Decision: keep the Node-based targeted profile evidence runner.** The
targeted RSS sampler was repaired narrowly for evidence tooling:

- Linux-style procfs sampling is the preferred non-process-list path.
- A command-level sampler is covered by tests for hosts where a time-compatible
  wrapper is usable.
- On macOS-sandboxed runs, process-list access is blocked, so RSS is recorded
  with the exact unavailable reason rather than omitted.

## Decision #165 Plan 3 — parse AST walker hot-path: keep

**Verdict: keep.** A single bounded AST-walker hot-path candidate (distinct
from the #398 repeated-text-extraction family) skipped expensive extraction
checks on nodes that never need them. Default-path `rust-core` evidence keeps
`parseAstWalker` off; the optimization applies on the bounded path:

| Corpus | Baseline parseAstExtractionMs | After parseAstExtractionMs | Delta | Decision |
|---|---:|---:|---:|---|
| zcodegraph | 482 | 418 | −13.3% | keep |
| vscode-sparse | 9465 | 8216 | −13.2% | keep |

The keep decision is based on default-path trend evidence plus graph-parity and
fallback verification (RSS recorded in the profile artifact). Graph parity and
fallback behavior were verified unchanged. Tracker direction: #165 proceeds to
the consolidated decision across resolver-semantic, finalization-tail, and
parse/extraction slices rather than opening another parse micro-candidate.

## Durable rules carried forward

1. Parse/extraction optimization is evidence-gated: one bounded candidate,
   unchanged graph semantics, explicit keep/no-go verdict per pass.
2. Do not mix a parse-AST candidate with a Tree-sitter/parser candidate in the
   same pass.
3. `parseAstExtractionMs` was the identified dominant sub-bucket on TS-heavy
   corpora; walker hot-path work produced a real ~13% gain, repeated-text
   extraction did not.
4. RSS is an explicit evidence field with its unavailable reason — never a
   silent gap — and a sub-bucket decision need not block on RSS when the
   sandbox denies process-list access.
