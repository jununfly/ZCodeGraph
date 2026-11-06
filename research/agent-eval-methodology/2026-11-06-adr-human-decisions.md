# ADR governance decision backlog

> Date: 2026-11-06
>
> Status: Resolved by Human consensus (Q33–Q47, all recommendations accepted).
> Document-only batch; no implementation authorization.
>
> Scope: Items that the 2026-11-06 ADR Reference Hygiene batch must **not** auto-fix.
>
> Source: full read-only ADR audit covering 14 ADRs, `docs/README.md`, `docs/methods/semantic-retrieval-evaluation-v2.md`, and current `src/`; re-verified against `main` at `6b0bbfd`.

## Audit baseline

The audit found **35 non-VALID references**: 17 UPDATE, 5 DELETE_REFERENCE, 13 HUMAN_DECISION, and 0 ARCHIVE_ADR. The first consensus batch applied the mechanical updates and removed stale references, plus README date/count/authority-id, methods v2 §4 gate split, and 5 baseline registrations. It did **not** change source code, create `ZJ-0015`, or implement any runtime arm switch.

## Items resolved by the first consensus batch

- `docs/README.md`: Last reviewed, Contract count 17→18, full authority IDs for 18 contracts and 13 methods, and 5 missing baseline registrations.
- `docs/methods/semantic-retrieval-evaluation-v2.md`: §4 now states ADR-0014's G-entry / G-ship split while preserving all thresholds; §5 paired bootstrap remains until a separate accepted ADR.
- Mechanical ADR updates: `.zcodegraph/`, `docs/decisions/`, retired `docs/benchmarks/` notes, ADR-0007 `pending` fourth state, ADR-0009 DDL/status/index names/queue metadata, ADR-0010 exact fastembed pin and loader references, ADR-0012 superseded productization references, ADR-0013 v1→v2 cross-reference, ADR-0014 method cross-reference.

## Evidence gathered for this round

- **Remote verification (2026-11-06, `gh api repos/jununfly/ZCodeGraph/issues/{n}` and `/pulls/{n}`)**: `#165`, `#296`, `#301`, `#679`, `#680`, `#682` are real closed issues; `PR #683` and `PR #684` are real closed PRs with `merged=true` (both 2026-07-13). Titles match the ADR descriptions. The earlier "no local data / UNKNOWN" marking is therefore retired; unknown was never treated as absence.
- **One wording discrepancy**: `#165` is titled "Post-PRD optimization tracker for Rust indexing performance"; ADR-0003 said "post-release".
- **ADR-0011 required verification**: `## Required verification` lists 8 items; item 7 requires real Windows/Linux/macOS native-process tests and explicitly says mock tests are not platform evidence. CI run `42222821050` (PR #697, 2026-11-06) passed `Verify SQLite and file-lock guardrails` and `Verify real native process supervision, crash recovery, and replacement coordination` on `ubuntu-latest`, `macos-15`, and `windows-2025`. This demonstrates the existing guardrails pass on three platforms; it does **not** establish completion of ADR-0011's Required verification, because §4 is not implemented. The Status line stays as written.
- **Nine frontmatter placeholders**: ADR-0001–0009 all carried the same generic `bounded-question` template. `docs/README.md:75–83` already records a specific question for each; ADR-0010/0011 show the target format.
- **Name check**: `semantic_search` does not exist in `src/`. The actual MCP tool is `zcodegraph_search`, which calls `CodeGraph.enqueueEmbeddingReadRepair` from the query path. `ZJ-0015` and `ZCG_RETRIEVAL_ARM` are confirmed absent.

## Decisions (Q33–Q47, all recommendations accepted)

| # | Item | Decision | Status |
|---:|---|---|---|
| 1 | ADR-0001–0009 `bounded-question` placeholders | Replace all nine with the exact questions from `docs/README.md:75–83`; ADR and README stay consistent. | Closed · applied |
| 2 | ADR-0002 `#296` / `#301` | Reclassify VALID after remote verification; keep ADR text unchanged. | Closed |
| 3 | ADR-0003 `#165` | Reclassify VALID and correct `post-release` → `Post-PRD`. | Closed · applied |
| 4 | ADR-0006 `#679` / `PR #683` | Reclassify VALID; PR confirmed merged; keep ADR text unchanged. | Closed |
| 5 | ADR-0007 `#680` / `#682` / `PR #684` | Reclassify VALID; PR confirmed merged; keep ADR text unchanged. | Closed |
| 6 | ADR-0008 harness `init` calls | Add an implementation-status note naming both scripts; document-layer item closed, implementation gap registered below. Decision text stays intact. | Closed · note applied |
| 7 | ADR-0009 `semantic_search` | Rename to `zcodegraph_search` in all four occurrences and add a note that the real trigger is asynchronous `enqueueEmbeddingReadRepair`, not synchronous embed. | Closed · applied |
| 8 | ADR-0011 §4 `unlock` | Add an implementation-status note with both code/test references, but keep the item **OPEN**: a normative/implementation conflict cannot be closed by a note. Escalated below. | **OPEN** · note applied |
| 9 | ADR-0011 Status | Keep `implementation and platform verification pending` unchanged; record the three-platform CI evidence as insufficient for §Required verification. | Closed |
| 10 | ADR-0012 D5 `D4` / `D1` / `1-2-10` | Keep all labels; annotate that `D4`/`D1` are internal Decision cross-references and `1-2-10` is a historical roadmap label with no current `docs/plans/` node. | Closed · note applied |
| 11 | ADR-0013 D5 / ADR-0014 D2 / methods v2 §5 paired bootstrap | Keep all three in force; any change requires a new accepted `ZJ-0015`, not a text cleanup. | Closed · deferred |
| 12 | `ZCG_RETRIEVAL_ARM` runtime switch | Keep unimplemented; this is an execution prerequisite, not a stale reference. | Closed · deferred |
| 13 | 8 sealed-ledger `unknownCriteria` / `has-gaps` | Retain as an explicit, accepted evidence limitation; do not auto-close. | Closed |

Result: **12 closed, 1 OPEN (#8).**

## Deferred implementation gaps

Q33=A restricts this batch to `docs/` and this backlog. The following are real defects, recorded here, **not fixed** in this batch. Each requires a separate `feat` batch with its own review; owner and schedule are not assigned.

| Gap | Evidence | Why it matters |
|---|---|---|
| `init` still called by harness scripts | `scripts/agent-eval/audit.sh:61`, `scripts/add-lang/bench.sh:45` | `src/bin/zcodegraph.ts` no longer registers an `init` subcommand (ADR-0008), so both scripts fail at that step. |
| `unlock` still deletes the lock file | `src/bin/zcodegraph.ts:2082` (`fs.unlinkSync`), `:2083` success message | Directly contradicts ADR-0011 §4, which requires inspect-and-report with no deletion. |
| Old delete semantics still asserted | `tests/security.test.ts:69` | A future implementation of §4 must update this test; today it locks in the conflicting behavior. |

No `src/`, `scripts/`, or `tests/` file was modified by this governance batch.

## Open governance decision (#8)

ADR-0011 §4 is accepted but not implemented, and a test asserts the opposite behavior. This is a normative conflict, not documentation drift. Human must choose one of:

1. **Implement §4**: a `feat` batch that changes `unlock` to inspect-and-report, updates `tests/security.test.ts`, and supplies the platform evidence required by `## Required verification`.
2. **Withdraw §4**: a new accepted ADR that revises ADR-0011 to match current behavior, with explicit justification.

Until one is approved, ADR-0011 must not be described as implemented, and no `unlock` behavior change may be folded into a docs-only batch. This round deliberately did not choose between them.

## Boundary

This backlog is a governance aid, not an ADR, contract, method, or release input. It must not be registered in `docs/README.md`. Decisions recorded here authorize document edits only; no item above constitutes implementation approval.
