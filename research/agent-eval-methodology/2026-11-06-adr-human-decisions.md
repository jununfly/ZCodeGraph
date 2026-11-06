# ADR governance decision backlog

> Date: 2026-11-06
>
> Status: Human decisions only; no implementation authorization.
>
> Scope: Items that the 2026-11-06 ADR Reference Hygiene batch must **not** auto-fix.
>
> Source: full read-only ADR audit covering 14 ADRs, `docs/README.md`, `docs/methods/semantic-retrieval-evaluation-v2.md`, and current `src/`.

## Audit baseline

The audit found **35 non-VALID references**: 17 UPDATE, 5 DELETE_REFERENCE, 13 HUMAN_DECISION, and 0 ARCHIVE_ADR. The consensus batch applied the mechanical updates and removed stale references, plus README date/count/authority-id, methods v2 §4 gate split, and 5 baseline registrations. It did **not** change source code, create `ZJ-0015`, or implement any runtime arm switch.

## Items resolved by explicit consensus in this batch

- `docs/README.md`: Last reviewed, Contract count 17→18, full authority IDs for 18 contracts and 13 methods, and 5 missing baseline registrations.
- `docs/methods/semantic-retrieval-evaluation-v2.md`: §4 now states ADR-0014's G-entry / G-ship split while preserving all thresholds; §5 paired bootstrap remains until a separate accepted ADR.
- Mechanical ADR updates: `.zcodegraph/`, `docs/decisions/`, retired `docs/benchmarks/` notes, ADR-0007 `pending` fourth state, ADR-0009 DDL/status/index names/queue metadata, ADR-0010 exact fastembed pin and loader references, ADR-0012 superseded productization references, ADR-0013 v1→v2 cross-reference, ADR-0014 method cross-reference.

## Human decisions still deferred

| # | Item | Why it is not auto-fixed | Current disposition |
|---:|---|---|---|
| 1 | ADR-0001–0009 frontmatter `bounded-question` template placeholders | 9 ADRs use the same generic placeholder while `docs/README.md` records specific questions; replacing them changes durable entity metadata. | Defer; needs Human wording review. |
| 2 | ADR-0002 issue `#296` / `#301` references | No local issue/PR data; unknown is not absence. | Defer; retain with UNKNOWN marking. |
| 3 | ADR-0003 `#165 post-release optimization tracker` | No local issue data. | Defer; retain with UNKNOWN marking. |
| 4 | ADR-0006 `Issue #679` / `PR #683` | #679 appears in a code comment; #683 cannot be verified locally. | Defer; retain with UNKNOWN marking. |
| 5 | ADR-0007 `Issue #680` / `#682` / `PR #684` | No local issue/PR data. | Defer; retain with UNKNOWN marking. |
| 6 | ADR-0008 claims all init+index harnesses migrated, but `scripts/agent-eval/audit.sh` and `scripts/add-lang/bench.sh` still call `init` | Could be an ADR implementation gap or stale scripts; deciding either way changes normative/implementation alignment. | Defer; Human decides fix ADR or scripts. |
| 7 | ADR-0009 `MCP semantic_search read-repair` | Tool name not observed in `src/`; queue/read-repair APIs exist. UNKNOWN is not absence. | Defer; Human decides rename, note, or remove. |
| 8 | ADR-0011 §4 says `unlock` is diagnosis, not deletion; `src/bin/zcodegraph.ts` still unlinks the lock file | Normative decision and code disagree; auto-editing either side would silently change behavior. | Defer; Human decides implement ADR or amend ADR. |
| 9 | ADR-0011 Status says implementation/platform verification pending while CI has related verification | Verification completeness is a Human judgment. | Defer; Human decides status update. |
| 10 | ADR-0012 D5 mainline labels `D4` / `D1` / `1-2-10` not found in current roadmap | Historical roadmap references may be intentionally preserved or should be archived; no local evidence to decide. | Defer; retain with UNKNOWN marking. |
| 11 | ADR-0014 D2 paired bootstrap protocol vs future ZRA-Paired v1 | Changing ADR-0013 D5 / ADR-0014 D2 / methods v2 §5 requires a new accepted ADR (`ZJ-0015`), not a text cleanup. | Deferred to future ADR; no ZJ-0015 created. |
| 12 | `ZCG_RETRIEVAL_ARM` / equivalent runtime retrieval arm switch | ADR-0014 implies a read-only opt-in prototype, but the switch is not implemented; this is an execution prerequisite, not a stale reference. | Deferred; no runtime implementation started. |
| 13 | 8 sealed-ledger `unknownCriteria` and remaining has-gaps items | They are evidence limitations, not documentation defects; Human accepted them as explicit risk rather than auto-closing. | Retained as `has-gaps`. |

## Boundary

This backlog is a governance aid, not an ADR, contract, method, or release input. It must not be registered in `docs/README.md`. No item above is approved or implemented by its presence here.
