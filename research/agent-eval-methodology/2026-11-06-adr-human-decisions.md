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
| `unlock` still deletes the lock file | pre-fix `src/bin/zcodegraph.ts:2082` (`fs.unlinkSync`), `:2083` success message | **Fixed 2026-11-07** by the separately authorized P1 batch 1 (PR #705, `4ffed66`): `unlock` now diagnoses via `index-lease --diagnose`, and `--force` repairs bounded metadata in place while holding the OS lock; the stable rendezvous file is never deleted. The ADR-0011 whole-design debt stays **OPEN** — §1/§3 OS-lock prerequisites are still absent on the index-write path, so `FileLock` / `ProjectLock` still delete their PID file. The evidence column records the original, now stale line numbers. |
| Old delete semantics still asserted | `tests/security.test.ts:69` | **Still open by design.** Faithfully describes shipped behavior. Must **not** be changed alone (Q51=A); replace only together with the full implementation. |

The 2026-11-06 governance batches modified no `src/`, `scripts/`, or `tests/` file. The 2026-11-07 separate `feat` batch touched only the two harness scripts above; `src/`, `tests/`, and the ADR-0011 whole-design debt are untouched by that batch. The `unlock` fix in the table above belongs to a different, later batch (P1 batch 1, PR #705); see `Fallback to P3`.

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

## Wiring program authorization (2026-11-07, Q68 / Q76 / §3 gates closed)

Human selected **A for all three** remaining hard gates in the follow-up round, recorded as an append-only decision on `1-8-1` (#5) and in `2026-11-07-p1-wiring-decision-package.md`:

| Gate | Decision |
|---|---|
| ADR-0011 §3 shared Adapter | **A — supervised Rust lease-holder.** Reuse `replacement-gate` / `process_supervision` / fixture infrastructure; zero new runtime dependency. Human explicitly accepts the §2 equivalence argument (Node borrows a lease owned by a supervised native descendant instead of holding the OS handle itself) and requires real SIGKILL / channel-EOF / descendant evidence for items 3 and 7. Path B (N-API addon) not selected. |
| Q68 named concurrency/security reviewer | **A — Human is the named reviewer.** The gate is closed; an AI agent must not self-assign. Every batch still returns to Human for approval. |
| Q76 hard budget | **A — 3 feat batches / 2 full three-platform CI reruns**, with zero new runtime dependency, product default OFF, no `1-4` unblock, and no weakening of the P0 lock / DB replacement barrier. If the 8 items cannot all be evidenced inside the budget, fall back to P3 and keep this item OPEN (Q76). |

Batch plan: (1) native `index-lease` helper + TS handle + §4 `unlock` diagnosis + process-level tests; (2) **atomic** cross-language switch of `FileLock` and `ProjectLock` plus the §2 single operation-lease refactor; (3) close all 8 Required verification items with three-platform evidence, then update ADR-0011's implementation-status note. Batches 1 and 2 must stay separate because changing only Rust would leave `FileLock` deleting the stable rendezvous file.

**Batch 1 (2026-11-07, working tree, not committed):** `crates/zcodegraph-core/src/main.rs` gains `index-lease` (`--project-path`, `--diagnose`, `--repair`); `IndexWriteLease` / `RendezvousState` become public exports; new `src/indexing/index-write-lease.ts` provides `acquireIndexWriteLease` / `diagnoseIndexWriteLease` / `repairIndexWriteLeaseMetadata` using the existing `findRustCoreCommand` + stdin-EOF supervision pattern; `src/bin/zcodegraph.ts` `unlock` becomes inspect-and-report (never `unlinkSync`, `--force` is metadata repair that cannot override an active writer); new `tests/index-write-lease.test.ts` with 6 real native-process tests joins the ci.yml three-platform file-lock guardrail. `FileLock`, `ProjectLock`, `tests/security.test.ts:69`, `ZJ-CONTEXT.md`, and the 13 `src/index.ts` lock call sites are **unchanged**.

Verification: `cargo check --all-targets` pass, `cargo test --lib index_write_lock` 6/6, `cargo build --bins` pass, `npm run build` pass, new suite 6/6, 9 regression suites 182 passed / 4 skipped. The Windows `ERROR_LOCK_VIOLATION` sharing-mode finding reproduced across processes and is now pinned by a conformance assertion; §4 diagnostics come from the helper's `--diagnose` channel, not the locked file.

**Conservative accounting:** items 2 and 5 now have real Windows process evidence, items 1 and 6 are partial, items 3/4/7/8 remain unstarted. **0 of 8 fully covered** — item 7 requires three-platform CI evidence (first budgeted CI rerun). The debt remains OPEN and ADR-0011 must not be described as implemented. `e9`, `1-4 blocked=True`, both 1-8 nodes `pending` / budget `0/2`, product default OFF, and all ZJ-0015 prerequisites are unchanged.

## Fallback to P3 (2026-11-07, Q76)

Human selected C1+C2. PR #705 (batch 1) merged as `e3db5c9`; the P1 program
falls back to **P3** under the Q76 rule, and this backlog item remains **OPEN**.
ADR-0011 is still an accepted design and must not be described as implemented.

### Trigger and budget accounting

| | |
|---|---|
| Q76 frozen hard budget | 3 feat batches / 2 full three-platform CI reruns |
| Used | batch 1 (`4ffed66` feat + `9901f35` chore, PR #705) and 1 CI rerun (`42367067011`, 5/5 success, `tests/index-write-lease.test.ts` 6/6 on windows-2025 / macos-15 / ubuntu-latest) |
| Remaining at fallback | 2 batches, 1 CI rerun |
| Why insufficient | batch 2 is blocked (below) and batch 3 must close all 8 verification items with their own three-platform evidence; at least three more submissions would be needed |

Q76 states that if a future P1 cannot complete all 8 verification items inside
its hard budget, the program falls back to P3 and keeps this item OPEN. That is
the condition reached here. The 8 items remain **0 fully covered**: items 2 and
5 have real Windows plus three-platform process evidence, 1 and 6 are partial,
3/4/7/8 are unstarted.

### Batch 2 blocker (root cause)

`tests/native-process-supervision.test.ts:162-169` reads `zcodegraph.lock` with
`readPid()` (`Number(trim)`) to obtain the writer PID, and the
`it.each(['parent-sigkill','channel-eof'])` case has **no platform skip** — it
is part of the ci.yml three-platform native-process guardrail. Once
`ProjectLock` moves to the OS-backed lease: (1) on Windows, `fs2`'s whole-file
exclusive `LockFileEx` makes a **cross-process** read fail with `EBUSY`
(already reproduced by batch 1's tests); (2) the metadata becomes bounded JSON
rather than a bare PID. The writer PID is used to assert descendant reaping
(Required verification item 3), so the assertion cannot simply be dropped.

This is the ADR-0011 §4 gap already pinned in batch 1: an active writer's
diagnostics cannot be read back from a whole-file-locked rendezvous file. Batch
1 recorded it as an open Adapter input; batch 2 collided with it. The
experimental batch 2 edits were reverted before any commit, so PR #705 stayed
exactly at batch 1 and no further CI rerun was consumed.

### Restart prerequisite (recorded, not authorized)

Any future P1 restart must first provide an **independent §4 diagnosis
channel**. Recommended option **A**: a sidecar or structured helper stdout
channel carrying non-sensitive owner PID / acquiredAt, with
`tests/native-process-supervision.test.ts` reading from that channel. Option B
(byte-range lock: lock only byte 0, metadata readable from offset 1) is higher
risk — it changes the shared `try_lock` primitive and metadata layout that
`replacement_gate.rs` also uses, re-opening three-platform conformance for the
already-verified embedding-replacement domain. Both are protocol/primitive
extensions requiring a **new Human authorization and a refrozen hard budget**
(recommended 4–5 batches / 3–4 CI reruns).

Useful finding retained for a restart: `indexExternalEngine` uses the Rust
writer's own `ProjectLock`, while Node's `FileLock` serves only pure-TypeScript
index paths; the two use the same OS lock but never hold it simultaneously, so
no new `--index-lease-externally-held` borrowing flag is needed.

### What stays on main

Batch 1 is kept: the `index-lease` native helper, public `IndexWriteLease`, the
TS handle, §4 `unlock` diagnosis / `--force` metadata repair, 6 real
native-process tests in the three-platform file-lock guardrail, and the Windows
sharing-mode conformance evidence. These are independently valid capabilities,
not evidence that ADR-0011 is implemented.

Unchanged by the fallback: `ProjectLock`, `FileLock`,
`tests/security.test.ts:69`, `ZJ-CONTEXT.md`, and the 13 `src/index.ts` lock
call sites. The P3 freeze applies again to these **remaining unswitched**
assets; `unlock` and the CLI help text are already shipped in their §4 form and
are not reverted. The four Q79 re-open events and the periodic
governance-action fallback remain in force.

**Documentation drift — resolved at the 2026-11-07 review:** ADR-0011's
`> Implementation status (2026-11-06)` note previously said `unlock` calls
`fs.unlinkSync`; that half became stale with PR #705 and was registered here as
pending the next review. The note's §4 paragraph has now been synced to describe
the shipped inspect-and-report behavior, the constrained `--force` metadata
repair, and the independent `index-lease --diagnose` / `--repair` channel. The
Context sentence claiming `unlock` "deletes it unconditionally" was also given
an explicit past-tense qualifier and a cross-reference to the status note,
removing the ADR's internal contradiction. The rest of the note (§1/§3
unwired, 0 of 8 verification items fully covered, "do not describe this ADR as
implemented") is unchanged and remains accurate. Q81 is respected: no review
triggers were written into the ADR — this edit corrects a factual
implementation-status statement only. The debt stays OPEN.

## P1 restart (2026-11-07, late): new Q75 approval, refrozen budget, R1 prerequisite

Human issued the short directive "重启 P1 接线程序，并先补齐 ADR §4 独立诊断通道（批次 ② 的前置）" and answered the two Human-only inputs in the follow-up. This is a **new, explicit Q75 second approval** for a restarted P1 program (the earlier 2026-11-07 approval was consumed by the P1 that fell back to P3 under Q76). It re-fires Q79(c), a formal P1 proposal, and moves the path from P3 back to **P1**. Q73 stays superseded. Q51, Q68, Q70, Q71, Q74, Q76, Q77–Q83 remain in force. The P3 freeze on `unlock`, `tests/security.test.ts:69`, `FileLock`, `ProjectLock`, and CLI help text is lifted **only inside this restarted program** and only for the batches listed below; it is not a general unfreeze.

| Human input | Decision |
|---|---|
| Q76 refrozen hard budget | **4 feat batches / 3 full three-platform CI reruns.** All batches keep zero new runtime dependency, product default OFF, no `1-4` unblock, and no weakening of the P0 lock / DB replacement barrier (`cli-p1-modularity-and-explore-v1.md:320`). If the 8 Required verification items cannot all be evidenced inside this ceiling, Q76 mandates falling back to P3 and keeping the debt OPEN. |
| R1 delivery boundary | **Local verification + governance registration only.** No branch, no PR, no commit/push, and **no CI rerun consumed** (3 of 3 remain). Three-platform evidence for the new channel is taken together with the first PR. |
| §4 channel shape | **A — independent diagnosis channel**: a stable, unlocked sidecar diagnostics file written by `IndexWriteLease`, exposed through structured `zcodegraph-core index-lease --diagnose-json` stdout and a TypeScript reader. Option B (byte-range lock) is not selected: it changes the shared `try_lock` primitive and metadata layout that `replacement_gate.rs` also uses. |
| Q68 named concurrency/security reviewer | **Unchanged: Human.** Every batch output returns to Human for approval; an AI agent must not self-assign. |

### Restarted batch plan (4 batches / 3 CI reruns)

| # | Content | Verification |
|---:|---|---|
| R1 | ADR-0011 §4 independent diagnosis channel (this round): sidecar + structured helper channel + TS reader + non-sensitive `unlock` active-writer diagnostics + real-process tests | Windows-local `cargo check` / `cargo test` / `tsc` / vitest; **no CI rerun** |
| R2 | **Atomic** cross-language switch of `FileLock` and `ProjectLock` to `IndexWriteLease`, including the swap of the two `readPid(zcodegraph.lock)` call sites in `tests/native-process-supervision.test.ts` and `tests/fixtures/supervised-index-owner.cjs` to the R1 channel; `tests/security.test.ts:69`, `ZJ-CONTEXT.md` glossary, CLI help | CI rerun 1 |
| R3 | §2 single operation-lease refactor (remove the nested `finalizeRustIndex` acquire; cover clear/staging/promotion/finalization/synchronous enqueue) plus evidence for items 1/3/4/6/8 | CI rerun 2 |
| R4 | close all 8 Required verification items with three-platform native-process evidence, then update ADR-0011's implementation-status note | CI rerun 3 |

R1 is a **prerequisite**, not a verification-item closure: 0 of 8 items are fully covered and the debt stays OPEN. ADR-0011 must not be described as implemented.

### R1 invariants (Q51 / Q80 / Q81 / §1)

- The sidecar is **never authoritative** for mutual exclusion or lock state. `IndexWriteLease::diagnose()` (a non-blocking OS-lock probe) remains the only state source; owner fields are exposed only when that probe reports `active-writer`, so a stale sidecar left by a SIGKILLed writer cannot be reported as a live owner.
- No changes to `FileLock`, `ProjectLock`, the 13 `src/index.ts` call sites, `tests/security.test.ts:69`, `ZJ-CONTEXT.md`, ADR-0011, `docs/README.md`, or `ci.yml`.
- No standalone change to the two supervision-test PID sources: that swap belongs to R2's atomic switch, so no supervision assertion is weakened in isolation.
- `unlock` keeps its shipped §4 semantics (inspect-and-report, `--force` metadata repair only, never deletes); only the active-writer branch gains non-sensitive owner fields.
- The new channel adds no runtime dependency and does not touch `replacement_gate.rs` or `try_lock`.

R1 verification results and the exact R2 call-site contract are recorded in `2026-11-07-p1-wiring-decision-package.md`. This section is a governance record; it does not by itself authorize any commit or push.

### R2 start (atomic cross-language switch; working tree, not committed)

R2 is authorized by the same carried Q75/Q76/Q68 terms from the P1 restart. It is the **2nd of 4 feat batches** and will consume **CI rerun 1** when its PR runs. Q68 reviewer remains Human.

**Scope landed in the working tree (not committed, no branch):**
- TS `FileLock` migrated to the native lease via new `src/indexing/file-lock.ts` (delegating to `acquireIndexWriteLease`); removed from `src/utils.ts` and re-exported from `src/index.ts` to avoid a `utils ↔ extraction ↔ rust-indexer ↔ index-write-lease` circular import; `src/index.ts` 13 call sites converted to async `acquire`/`release`/`withLock`.
- Rust `ProjectLock` cluster (struct/impl/`Drop`, `create_lock_file`, `remove_stale_lock`, three `pid_is_running` cfg variants) deleted from `crates/zcodegraph-core/src/lib.rs`; production call site uses `IndexWriteLease::acquire`; two obsolete `ProjectLock` unit tests removed; `index_write_lock.rs` header changed from "deliberately unwired / Stage 1" to "production, wired in R2" and `#![allow(dead_code)]` removed (`cargo check --all-targets` shows no dead-code warnings).
- Two `readPid(zcodegraph.lock)` swaps (`tests/native-process-supervision.test.ts:169` + `tests/fixtures/supervised-index-owner.cjs`) now read `readIndexWriteLeaseDiagnostics(projectRoot).owner.pid` after asserting `state === 'active-writer'`; supervisor PID still comes from the `supervised-index` spawn hook.
- `tests/security.test.ts` FileLock block rewritten to the async lease contract (stable file never deleted on release; same-process second acquire rejects; cross-process writer exit → OS release → re-acquire; idempotent `release`); its `FileLock` import corrected from `../src/utils` to `../src/index`.
- `ZJ-CONTEXT.md` glossary (lines 406–434) rewritten from design-state to implemented-state, dropping the §2 "parent retains sole OS lock / Rust children borrow" wording that was not built that way. CLI `unlock` help text already §4-aligned in R1; no change.

**Key finding (changes the R3 plan):** the planned §2 "single-operation lease / remove nested `finalizeRustIndex` acquire" refactor is a **no-op** — `indexExternalEngine` does not hold `FileLock` and calls `finalizeRustIndex` on a second `CodeGraph` instance whose `acquire` is sequential, not nested; `FileLock` and `ProjectLock` never hold the lock simultaneously. No `--index-lease-externally-held` borrowing flag is needed, and the §2 refactor was not implemented. R3 should therefore be re-scoped to item 1/3/4/6/8 evidence only (no refactor).

**Status:** R2 is in the working tree pending mechanical verification (task #13: `cargo test --lib`, `tsc`, full `vitest`, governance suites, `git diff --check`). It closes **no** Required verification item; 0 of 8 fully covered, debt OPEN, ADR-0011 must not be described as implemented. This section is a governance record; it does not by itself authorize any commit or push.

## 1-8-2 start: structural freeze only (2026-11-10)

Human selected **A + A**: freeze the hard-budget ceiling and pilot boundary first, defer official N until the pilot estimates variance; and do **not** start prerequisite-capability batch 1 until the freeze record has been reviewed. Recorded as decision #4 on `1-8-2` (`in_progress`, round 1/2, `render` refreshed).

This is a **structural freeze, not a numeric one**. Frozen: the statistical protocol (MDE=1.5; task-level two-sided sign-flip randomization; Task Cluster as the sole independent inference cluster with trials not inflating N; k=6 full permutation first; task-cluster bootstrap for a 95% interval only), the pilot boundary (`5-8 tasks x 4 trials x 3 arms`, for variance / audit agreement / order effects / missingness / cost only, never a product gate), and the D4 stop and inconclusive rules. Still **UNSET** and Human-only: the numeric hard budget ceiling, official N, total cost, correctness non-inferiority value, exact task-set composition and Task Freshness, named operators and reviewers. AI must not invent these. No implementation may start before the numeric ceiling is supplied and the freeze record is reviewed.

Nine prerequisites and the pilot remain at 0 started. All Q70 isolation and D3 invariants are unchanged: `e9` intact, `1-4` pending+blocked, `1-8-1` / `1-8-2` parallel, product default OFF, v3 holdout frozen, G-ship 90%/95% and all safety gates, the 8 `unknownCriteria` and `has-gaps`, Q68 reviewer=Human. This section is a governance record; it does not by itself authorize any commit, push, or implementation.

## 1-8-2 hard-budget ceiling frozen by delegated Human authority (2026-11-10)

Human delegated the unit and value decision to the AI's prior recommendation. Recorded as decision #5 on `1-8-2` and extracted into `MET-hard-budget-ceiling-pre-registration` sections 3, 4 and 7.

Frozen:

- Unit = `paired-run` = 1 Agent Task x 1 arm (A/C/S) x 1 trial.
- Counting rule: failed, timed-out, retried and fingerprint-rejected runs all count toward `consumed`; runs already executed under a task dropped by the D2 whole-task rule are not refunded; pilot and formal are separate ledgers with no transfer; each run is delimited by an immutable run-manifest entry.
- `pilot ceiling = 96 paired-runs` (D5 upper bound 8 tasks x 4 trials x 3 arms; 60 at 5 tasks), for variance / audit agreement / order effects / missingness / cost only.
- Primary ceiling unit = paired-run; money / wall-clock / token are reported observation signals with no threshold and no statistical gate.
- `formal ceiling = 0 paired-runs` until official N is pre-registered; afterwards it is derived as `N x k x 3` and frozen separately, and must not be raised after seeing results.
- `consumed(scope) >= ceiling(scope)` triggers the D4 stop and `inconclusive`.

Still UNSET (Human-only or post-pilot): official N, total cost, correctness non-inferiority value, exact task-set composition and Task Freshness, named operators/reviewers, and the numeric formal ceiling. ADR-0015 D5 defers official N and total cost to pilot / task-set design, and `40x4` is not an argued budget; inventing N now would contradict the delegated recommendation itself.

Unchanged: `e9`, `1-4` pending+blocked, `1-8-1` / `1-8-2` parallel, product default OFF, v3 holdout frozen, G-ship 90%/95% and all safety gates, the 8 `unknownCriteria` and `has-gaps`, Q68 reviewer=Human. Nine prerequisites and the pilot remain at 0 started. Prerequisite-capability batch 1 still requires Human review of this freeze record. This section is a governance record; it does not by itself authorize any commit, push, or implementation.

## Boundary

This backlog is a governance aid, not an ADR, contract, method, or release input. It must not be registered in `docs/README.md`. Decisions recorded here authorize document edits only; no item above constitutes implementation approval.
