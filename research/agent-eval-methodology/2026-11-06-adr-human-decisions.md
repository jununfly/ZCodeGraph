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

**New OPEN item: ADR-0011 whole-design implementation debt.** Two paths were available at the time, and neither was chosen in that round:

> **Reviewed 2026-11-07 · P3 status quo · triggers: code/contract change, real lock failure, a formal P1/P2 proposal, or a governance-action fallback.** The path decision and full trigger set are recorded in the section below. This item remains **OPEN**; "P3" means the debt is deliberately not resolved, not that it is closed.

1. Implement the whole ADR — native cross-platform Adapter, §1–§5, all 8 Required verification items, and real three-platform evidence — in a dedicated `feat` program.
2. File a new accepted ADR that supersedes ADR-0011 and describes the shipped PID-only implementation together with its risks.

Until one is approved: ADR-0011 must not be described as implemented; `tests/security.test.ts:69` must not be changed on its own; and no `unlock` behavior change may be folded into a docs-only batch. Any future work uses its own batch with strict feat/chore separation (Q50=A).

## First-round consensus (2026-11-07, Q65–Q72)

Human explicitly confirmed consensus on the eight public prerequisites for choosing a path. **No path had been selected in that round** (a path was selected later the same day — see the next section). This OPEN item was, and remains, **OPEN**, and roadmap node `1-8-1` was, and remains, `pending` with an append-only decision recording this round. The candidate set was extended from two to three:

1. **P1** — implement the whole ADR (native cross-platform Adapter, §1–§5, all 8 Required verification items, real three-platform evidence) in a dedicated `feat` program. Requires a named concurrency/security reviewer before implementation; the name is deferred.
2. **P2** — a new accepted ADR that supersedes ADR-0011 and describes the shipped PID-only implementation as an **accepted existing fact together with its risks**, not as a bug to fix.
3. **P3** — keep the status quo, **but only with explicit re-review triggers**; an indefinite open item without triggers is not a valid form of this option.

Locked constraints: Q51=A (`tests/security.test.ts:69` must not be changed alone; no `unlock` behavior change in a docs-only batch; no "implemented" claim before all 8 verification items have evidence); Q70=A (isolated from `e9: 1-8-2 -> 1-4 blocks`, from 1-4, and from ZJ-0015 execution prerequisites; `1-8-1` and `1-8-2` stay parallel); Q68=A (Human is the sole approver); Scope gate = Product execution but this round is discussion-only; strict feat/chore separation; no automatic commit/push.

New read-only evidence for this round: `docs/contracts/cli-p1-modularity-and-explore-v1.md:320` forbids weakening the P0 lock or DB replacement barrier and `:317` places `unlock` last in the migration slices; `ZJ-CONTEXT.md` carries three glossary entries written in ADR-0011's design state; `src/bin/zcodegraph.ts:2065` still advertises delete-to-recover; `tests/security.test.ts` is not referenced by `ci.yml`; the 8 verification items remain 0 fully covered / 7 partial / 1 with corresponding tests.

**At the time of recording, the second-round frontier — the path choice itself and each path's downstream costs — had not been asked yet.** It was asked and settled later the same day; see the next section. Recording this round authorized no implementation, no new ADR, and no change to `src/`, `tests/`, or `docs/README.md`.

## Path decision (2026-11-07, Q73–Q83)

Human accepted all recommendations and explicitly confirmed consensus. **Selected path: P3 — keep the status quo, with explicit re-review triggers.** This is a decision *not to resolve* the debt now; it is not a resolution. ADR-0011 remains an accepted design, `zcodegraph.lock` remains the PID-only implementation, the 8 Required verification items remain 0 fully covered, this backlog item remains **OPEN**, and roadmap node `1-8-1` remains `pending` (status, budget, and edges unchanged).

Locked terms:

| Q | Term |
|---|---|
| 73 | P3 selected; P1 (whole-ADR `feat` program) and P2 (new accepted superseding ADR) are not selected. |
| 74 | Any future work uses its own batch with strict feat/chore separation, no unrelated governance items, no automatic commit/push. |
| 75 | Even after a path is selected, entering implementation or creating a new ADR requires a **second, explicit Human approval**. |
| 76 | If a future P1 cannot complete all 8 verification items within its hard budget, or a future P2 risk argument fails, fall back to P3 and keep this item OPEN; never silently lower the "implemented" bar. |
| 77 | Event-driven triggers **plus** a periodic fallback, so "never triggered" cannot become indefinite drift. |
| 78 | The fallback is bound to existing governance actions, not a calendar number. |
| 79 | Four mandatory re-open events: **(a)** any change to index-write-lock code or contracts; **(b)** a real concurrency-write, lock-loss, or stale-delete failure or user report; **(c)** a formal proposal of P1 or P2; **(d)** a governance-action fallback hit — each roadmap review, each new or revised accepted ADR, each index-lock-related contract change. |
| 80 | Record only in this backlog and as an append-only decision on `1-8-1`; do **not** mark the node completed or change its budget/edges. |
| 81 | Do not write review triggers into ADR-0011, a new contract, a new ADR, or `docs/README.md`. They are process governance, not specification. |
| 82 | Until a trigger fires and the path decision is reopened, `unlock`, `tests/security.test.ts:69`, `FileLock`, `ProjectLock`, and CLI help text are **frozen**. Any "small fix" must return to this grill first. |
| 83 | Two gates: this landing was authorized by an explicit "consensus confirmed"; no automatic commit/push afterwards. |

This round changed no `src/`, `scripts/`, `tests/`, ADR, contract, or `docs/README.md` file, and created no ADR. The design-tree frontier is empty.

## Authorization to enter implementation (2026-11-07, post-P3)

Human selected option C in the follow-up round and explicitly confirmed it is the **second approval required by Q75**. This fires re-review event (c) — a formal P1 proposal — and moves the path from P3 (status quo) to **P1 (whole-ADR implementation)**. Q73 is superseded by this later Human decision. Q51, Q68, Q70, Q71, Q74, Q76, Q77–Q79, Q80–Q82 (as process constraints), and Q83 remain in force. The P3 clause that froze `unlock`, `tests/security.test.ts:69`, `FileLock`, `ProjectLock`, and CLI help text is lifted **only for work inside this P1 program**; it is not a general unfreeze and no "small fix" outside the program is authorized.

Recorded as an append-only decision on `1-8-1`. The node stays `pending`, budget `0/2`, no children, no new edges; `e9` and `1-4 blocked=True` are unchanged. ADR-0011's implementation-status note is unchanged because the design is still not implemented.

### Hard gates still OPEN before any behavior-changing code lands

| Gate | Source | Status |
|---|---|---|
| Named concurrency/security reviewer before P1 implementation | Q68 | **OPEN** — the name was deferred in the first consensus round and has not been supplied |
| Hard budget freeze for P1, plus fallback-to-P3 if the 8 items cannot be completed inside it | Q76 | **OPEN** — scope proposed below; numeric budget not yet frozen |
| Native Adapter shared by Node and Rust | ADR-0011 §3: "No new runtime dependency is approved by this document alone" | **OPEN** — an architecture decision, not settled by Q75 |
| All 8 Required verification items with evidence before any "implemented" claim | Q51 / Q71 | **OPEN** |
| Real Windows / Linux / macOS native-process evidence (item 7) | ADR-0011 `## Required verification` | **OPEN** — needs CI, not local Windows |

### Batch 1 (2026-11-07): additive, reviewable, zero behavior change

- `crates/zcodegraph-core/src/replacement_gate.rs`: `try_lock` is now crate-visible and `try_unlock` was added (`flock LOCK_UN` on Unix, `fs2::FileExt::unlock` on Windows), so the index path reuses the **same verified platform Adapter** as the replacement gate rather than inventing a second primitive.
- New `crates/zcodegraph-core/src/index_write_lock.rs`: stable `zcodegraph.lock` rendezvous lease with path validation (no symlink / directory / store escape), non-blocking exclusive OS lock, bounded diagnostic metadata rewritten in place through the locked handle, release on the acquired handle, **no unlink on `Drop`**, and inspect-only `diagnose()` mapping to §4's behavior matrix. Unit tests cover exclusion, stable-file persistence, repeated acquire/release, malformed legacy metadata, invalid paths, and diagnosis states.
- The module is **not wired** into `ProjectLock` or TypeScript `FileLock`, and none of the five previously frozen assets was modified. `cargo check --package zcodegraph-core --all-targets` passes; the module's unit tests run under the existing `cargo test` CI step on all three platforms.
- **New platform evidence (Windows):** a real `cargo test` run found that `fs2`'s exclusive `LockFileEx` locks the whole file, so a second handle's read is rejected with `ERROR_LOCK_VIOLATION` (33) while a lease is held. ADR-0011 §4 requires `unlock` to report diagnostics for an active OS writer; those diagnostics **cannot** be read back from the rendezvous file itself. The finding is pinned as a conformance test (`windows_exclusive_lease_pins_sharing_mode_semantics`) and is an explicit input to the open Adapter decision — it is exactly the sharing-mode / byte-range behavior ADR-0011 §3 says must be pinned rather than assumed.

Why wiring must be a separate batch: TypeScript has no native file-lock API and no N-API/FFI bridge to the Rust core (no `proper-lockfile`, `fs-ext`, or addon in `package.json`). Changing only the Rust side would leave `FileLock` deleting the PID-only lock file that the new Rust lease uses as its **stable rendezvous** — a real cross-language regression, not a cleanup. The shared Adapter (a new Node native addon, or a supervised Rust lock-holder process reusing `process_supervision` and the `*-fixture.rs` bins) must be chosen and reviewed first.

### 8 Required verification items → evidence after Batch 1

| # | Item | After Batch 1 | Still required |
|---:|---|---|---|
| 1 | TS/TS, Rust/Rust, TS/Rust, hybrid exclusion beyond 2 min | same-handle exclusion unit test only | real process-level pairs, suspended-writer case |
| 2 | Kill/crash releases through OS, no file deletion | `Drop` never unlinks; handle-close release by construction | real SIGKILL / crash fixtures |
| 3 | Parent death with live delegate + descendant | not started | Job Object / PDEATHSIG / supervisor wiring + all four distinct scenarios |
| 4 | Nested TS helpers borrow one lease; coverage of clear/staging/promotion/finalization/enqueue | not started | §2 operation-lease refactor across `src/index.ts` call sites |
| 5 | Stable file on normal release, repeated acquire, surfaced unlock errors, no cross-process effect | covered by unit tests + `release()` result | cross-process confirmation |
| 6 | Legacy/malformed/missing/symlink/directory/escape/permissions/unsupported/Adapter failure; force cannot override | malformed, directory, file-store, symlink (unix), diagnosis states covered | permissions, unsupported filesystem, Adapter failure, `unlock --force` |
| 7 | Real three-platform native process tests | module compiles and unit tests run in CI on all three platforms | enforced child/descendant lifetime, supervision-channel closure, sharing mode, crash cleanup |
| 8 | Embedding worker separate from index lease; drain/close or generation protocol | not started | old-handle writes + queue rebuild evidence |

**Status: 0 of 8 fully covered.** Per Q76, if the hard budget cannot cover all 8, the program falls back to P3 and this item stays OPEN; the "implemented" bar is never lowered.

## ZJ-0015 execution prerequisites: authorization and pre-registration (2026-11-07, separate batch)

Option C also grants the **new Human authorization** required by `1-8-2`, with the explicit condition that pre-registration and a hard budget freeze happen **before** any implementation. This batch is strictly isolated from the ADR-0011 P1 batch (Q70): `e9` unchanged, `1-4` unchanged and still blocked, `1-8-1` / `1-8-2` remain parallel, product default stays OFF, v3 holdout stays frozen, G-ship 90%/95% and all safety gates unchanged, the 8 `unknownCriteria` and `has-gaps` retained. Approval covers the protocol, not results.

Pre-registration fields to freeze before execution (these are field definitions, not invented values):

| Field | State |
|---|---|
| Official N, total cost, hard budget ceiling | **to be frozen by Human before the pilot**; `5–8×4×3` is pilot only, `40×4` is not an argued budget |
| Primary test | task-level two-sided sign-flip randomization; **Task Cluster is the sole independent inference cluster**, trials must not inflate N; `k=6` full permutation first; task-cluster bootstrap gives a 95% interval only |
| MDE | 1.5, already frozen |
| Arms | A/C/S; S uses the same candidates, content, count and payload, differing only by the fixed-seed ordering permutation; S is diagnostic only |
| Correctness non-inferiority value, task-set composition, task freshness | **to be pre-registered**, not assumed |
| Named operators / reviewers | **to be pre-registered** |

Execution prerequisites that must be built only after the above is frozen: `ZCG_RETRIEVAL_ARM` (default OFF), S serialization, configuration fingerprint assertion, arm-blinded double review (raw agreement ≥90%), immutable run manifest, credential-free one-shot read-only snapshot isolation, fixed-seed statistics unit tests, independent task set, and a baseline under `DES-baseline-agent-sufficiency-v1` because arm switching changes MCP ranking. Then the pilot, then the formal run.

**After this batch, all five prerequisites and the pilot remain unstarted.** This batch is a pre-registration and budget-freeze record only; it is not an execution start.

## Boundary

This backlog is a governance aid, not an ADR, contract, method, or release input. It must not be registered in `docs/README.md`. Decisions recorded here authorize document edits only; no item above constitutes implementation approval.
