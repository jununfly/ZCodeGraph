# ADR governance decision backlog

> Date: 2026-11-06
>
> Status: Resolved by Human consensus (Q33–Q47 and Q48–Q53, all recommendations accepted).
> The 2026-11-06 batches were document-only; no implementation authorization.
> 2026-11-07 update: the two harness-script defects were fixed in a separate
> `feat` batch, and the `1-8` roadmap nodes received structural budgets.
>
> Scope: Items that the 2026-11-06 ADR Reference Hygiene batch must **not** auto-fix.
>
> Source: full read-only ADR audit covering 14 ADRs, `docs/README.md`, `docs/methods/semantic-retrieval-evaluation-v2.md`, and current `src/`; re-verified against `main` at `84dbe4d`.

## Audit baseline

The audit found **35 non-VALID references**: 17 UPDATE, 5 DELETE_REFERENCE, 13 HUMAN_DECISION, and 0 ARCHIVE_ADR. The first consensus batch applied the mechanical updates and removed stale references, plus README date/count/authority-id, methods v2 §4 gate split, and 5 baseline registrations. It did **not** change source code, create `ZJ-0015`, or implement any runtime arm switch.

## Items resolved by the first consensus batch

- `docs/README.md`: Last reviewed, Contract count 17→18, full authority IDs for 18 contracts and 13 methods, and 5 missing baseline registrations.
- `docs/methods/semantic-retrieval-evaluation-v2.md`: §4 states ADR-0014's G-entry / G-ship split while preserving all thresholds; §5 was revised by ADR-0015 to a task-level randomization primary test with a task-cluster bootstrap interval.
- Mechanical ADR updates: `.zcodegraph/`, `docs/decisions/`, retired `docs/benchmarks/` notes, ADR-0007 `pending` fourth state, ADR-0009 DDL/status/index names/queue metadata, ADR-0010 exact fastembed pin and loader references, ADR-0012 superseded productization references, ADR-0013 v1→v2 cross-reference, ADR-0014 method cross-reference.

## Evidence gathered for this round

- **Remote verification (2026-11-06, `gh api repos/jununfly/ZCodeGraph/issues/{n}` and `/pulls/{n}`)**: `#165`, `#296`, `#301`, `#679`, `#680`, `#682` are real closed issues; `PR #683` and `PR #684` are real closed PRs with `merged=true` (both 2026-07-13). Titles match the ADR descriptions. The earlier "no local data / UNKNOWN" marking is therefore retired; unknown was never treated as absence.
- **One wording discrepancy**: `#165` is titled "Post-PRD optimization tracker for Rust indexing performance"; ADR-0003 said "post-release".
- **ADR-0011 required verification**: `## Required verification` lists 8 items; item 7 requires real Windows/Linux/macOS native-process tests and explicitly says mock tests are not platform evidence. CI run `42222821050` (PR #697) passed the file-lock and native-process guardrail steps on `ubuntu-latest`, `macos-15`, and `windows-2025`. This demonstrates the existing guardrails pass on three platforms; it does **not** establish completion of ADR-0011's Required verification.
- **Nine frontmatter placeholders**: ADR-0001–0009 all carried the same generic `bounded-question` template. `docs/README.md:75–83` already records a specific question for each; ADR-0010/0011 show the target format.
- **Name check**: `semantic_search` does not exist in `src/`. The actual MCP tool is `zcodegraph_search`, which calls `CodeGraph.enqueueEmbeddingReadRepair` from the query path. `ZJ-0015` and `ZCG_RETRIEVAL_ARM` are confirmed absent.
- **Second evidence round (Q48)**: read-only re-examination of ADR-0011 showed §1 and §3 are also unimplemented on the index-write lock path. Full evidence is in `2026-11-06-adr-0011-implementation-gap.md` in this directory.

## Decisions (Q33–Q47, all recommendations accepted)

| # | Item | Decision | Status |
|---:|---|---|---|
| 1 | ADR-0001–0009 `bounded-question` placeholders | Replace all nine with the exact questions from `docs/README.md:75–83`; ADR and README stay consistent. | Closed · applied |
| 2 | ADR-0002 `#296` / `#301` | Reclassify VALID after remote verification; keep ADR text unchanged. | Closed |
| 3 | ADR-0003 `#165` | Reclassify VALID and correct `post-release` → `Post-PRD`. | Closed · applied |
| 4 | ADR-0006 `#679` / `PR #683` | Reclassify VALID; PR confirmed merged; keep ADR text unchanged. | Closed |
| 5 | ADR-0007 `#680` / `#682` / `PR #684` | Reclassify VALID; PR confirmed merged; keep ADR text unchanged. | Closed |
| 6 | ADR-0008 harness `init` calls | Add an implementation-status note naming both scripts; document-layer item closed, implementation gap registered below. Decision text stays intact. **2026-11-07:** the implementation gap was fixed in a separate `feat` batch (see below). | Closed · note applied · gap fixed |
| 7 | ADR-0009 `semantic_search` | Rename to `zcodegraph_search` in all four occurrences and add a note that the real trigger is asynchronous `enqueueEmbeddingReadRepair`, not synchronous embed. | Closed · applied |
| 8 | ADR-0011 §4 `unlock` | **Reclassified in Q48–Q53.** The original "implement §4 / withdraw §4" framing was retired: read-only evidence showed the whole ADR is an unimplemented design. Add a whole-design implementation-status note; no code, no new ADR, no implementation project. | Closed · reclassified |
| 9 | ADR-0011 Status | Keep `implementation and platform verification pending` unchanged; record the three-platform CI evidence as insufficient for §Required verification. | Closed |
| 10 | ADR-0012 D5 `D4` / `D1` / `1-2-10` | Keep all labels; annotate that `D4`/`D1` are internal Decision cross-references and `1-2-10` is a historical roadmap label with no current `docs/plans/` node. | Closed · note applied |
| 11 | ADR-0013 D5 / ADR-0014 D2 / methods v2 §5 paired bootstrap | **Satisfied by ADR-0015 (Accepted 2026-11-06):** all 8 edit points were revised together by a new accepted ADR, not by text cleanup; G-ship thresholds and all retained clauses unchanged. | Closed · satisfied |
| 12 | `ZCG_RETRIEVAL_ARM` runtime switch | Keep unimplemented; this is an execution prerequisite, not a stale reference. | Closed · deferred |
| 13 | 8 sealed-ledger `unknownCriteria` / `has-gaps` | Retain as an explicit, accepted evidence limitation; do not auto-close. | Closed |

Result: **13 items closed.** #8 was closed under its inaccurate name after reclassification; a separately named, still-OPEN whole-design debt item is recorded below. **Net open items: 1.**

## Deferred implementation gaps

Q33=A and Q50=A restricted the **2026-11-06 governance batches** to `docs/` and this backlog. The table records real defects; each fix requires a separate `feat` batch with its own review. Status as of 2026-11-07:

| Gap | Evidence | Status |
|---|---|---|
| `init` still called by harness scripts | `scripts/agent-eval/audit.sh:61`, `scripts/add-lang/bench.sh:45` | **Fixed 2026-11-07** in a separate `feat` batch: both indexing steps now run `index --force` after wiping the store, relying on `index` to bootstrap implicitly. ADR-0008's implementation-status note was updated in the same batch. No `init` alias or shim was added. |
| `unlock` still deletes the lock file | `src/bin/zcodegraph.ts:2082` (`fs.unlinkSync`), `:2083` success message | **Still open.** Surface symptom of the whole-design debt: the §1/§3 OS-lock prerequisites are absent on the index-lock path. Not a standalone fix. |
| Old delete semantics still asserted | `tests/security.test.ts:69` | **Still open by design.** Faithfully describes shipped behavior. Must **not** be changed alone (Q51=A); replace only together with the full implementation. |

The 2026-11-06 governance batches modified no `src/`, `scripts/`, or `tests/` file. The 2026-11-07 separate `feat` batch touched only the two harness scripts above; `src/`, `tests/`, and the ADR-0011 whole-design debt are untouched.

## Reclassification and open debt (Q48–Q53)

Item #8 was closed under its inaccurate name after read-only evidence showed that ADR-0011 §1 and §3 are also unimplemented on `.zcodegraph/zcodegraph.lock`; §4 cannot be implemented alone because its diagnostics and `--force` require an already-acquired OS lock. Evidence, the 8-item verification gap (0 fully covered, 7 partial, 1 with corresponding tests), and both impact surfaces are recorded in `2026-11-06-adr-0011-implementation-gap.md` in this directory.

**New OPEN item: ADR-0011 whole-design implementation debt.** Two paths remain available, and neither was chosen in this round:

1. Implement the whole ADR — native cross-platform Adapter, §1–§5, all 8 Required verification items, and real three-platform evidence — in a dedicated `feat` program.
2. File a new accepted ADR that supersedes ADR-0011 and describes the shipped PID-only implementation together with its risks.

Until one is approved: ADR-0011 must not be described as implemented; `tests/security.test.ts:69` must not be changed on its own; and no `unlock` behavior change may be folded into a docs-only batch. Any future work uses its own batch with strict feat/chore separation (Q50=A).

## Boundary

This backlog is a governance aid, not an ADR, contract, method, or release input. It must not be registered in `docs/README.md`. Decisions recorded here authorize document edits only; no item above constitutes implementation approval.
