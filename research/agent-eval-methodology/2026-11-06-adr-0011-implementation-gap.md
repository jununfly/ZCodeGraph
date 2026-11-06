# ADR-0011 implementation gap: evidence and reclassification

> Date: 2026-11-06
>
> Status: Read-only evidence record. Human decisions Q48–Q53 accepted (all recommendations).
>
> Baseline: `main` at `84dbe4d`. Method: repository-only reads plus `git` read commands; no files were modified during evidence collection.
>
> Scope: Re-examines governance item #8 after the earlier "implement §4 / withdraw §4" framing proved to rest on an incomplete picture.

## 1. Finding

**ADR-0011 is an accepted design, not an implemented protocol.** The conflict is not confined to §4 (`unlock` as diagnosis rather than deletion). §1 (OS-backed stable rendezvous lock) and §3 (small native cross-platform Adapter) are also unimplemented on the `.zcodegraph/zcodegraph.lock` index-write path. §4 depends on both, so "implement §4" in fact means "implement the whole ADR".

This record is a governance aid, not an ADR, contract, method, or release input. It must not be registered in `docs/README.md`.

## 2. Design state versus shipped state

| Layer | ADR-0011 design | Shipped implementation |
|---|---|---|
| Index lock | §1: `.zcodegraph/zcodegraph.lock` is a stable rendezvous file; writers hold an OS-backed exclusive byte-range/file lock; normal release never deletes it | TypeScript `FileLock` (`src/utils.ts:201-274`): PID + 2-minute stale timeout, `unlinkSync` on stale and on `release()` (`:232-233`, `:268`) |
| Rust writer | §1/§3: same OS lock semantics, shared Adapter | Rust `ProjectLock` (`crates/zcodegraph-core/src/lib.rs:17124-17228`): PID-only, `create_new`, `remove_stale_lock` → `fs::remove_file`, `Drop` → `fs::remove_file` |
| Native Adapter | §3: reviewed native Adapter shared by Node and Rust, `flock` / `LockFileEx` | Observed `flock` / `fs2` / Windows Job Object support belongs to `crates/zcodegraph-core/src/replacement_gate.rs` and `process_supervision.rs`, which operate on `embedding-replacement.*.lock` — a different domain, not the index lock |
| `unlock` | §4: inspect-and-report; constrained `--force` only after acquiring the OS lock and verifying no active writer | `src/bin/zcodegraph.ts:2063-2088`: unconditional `fs.unlinkSync`, help text "Remove a stale lock file", no `--force` branch, no OS-lock acquisition |

Terminology discipline: "not observed" in this record means the audit did not find it; it is not a claim of absence. The distinction matters for §3, whose absence is asserted as **observed absence of the primitive on the index-lock path**, while the alternative Adapter designs in `ZJ-0011:145-151` remain text-only.

## 3. Why §4 cannot be implemented alone

§4 requires the command to have already acquired the OS lock and verified that no writer is active (`ZJ-0011:165-167`, `:181-182`). That prerequisite does not exist on `zcodegraph.lock`. Implementing only the CLI surface would produce diagnostics with no way to distinguish "free" from "active OS writer", and a `--force` with no lock to verify against — that is, a change in behavior without the safety property the ADR was written to guarantee.

## 4. Impact of withdrawing §4

Withdrawing only §4 would contradict §1, which states "Normal release never deletes it" (`ZJ-0011:47-51`) and forbids stale-by-age deletion (`:56-59`), and §5's "must not silently unlink a legacy lock" (`:205-209`). A truthful withdrawal would therefore have to revise most of the ADR, not one section.

Text surface identified: roughly 20 passages inside ADR-0011 (frontmatter bounded-question, Status, Context, §1, §4, §5, behavior matrix, 3 of the 8 Required verification items, Consequences, Alternatives); `ZJ-CONTEXT.md:406-434` (three glossary entries); `docs/README.md:85`; `docs/contracts/rust-indexing-core-sqlite-contract.md:121-122`; `docs/contracts/cli-p1-modularity-and-explore-v1.md:139,155,317`; `docs/contracts/cli-p1-embedding-operations-v1.md:398-399`; CLI help text `src/bin/zcodegraph.ts:2065`; user hints `src/utils.ts:228,252`.

## 5. Required verification coverage gap

| # | ADR requirement | Observed evidence | Coverage |
|---:|---|---|---|
| 1 | Four process-level exclusion combinations, >2-minute threshold, suspended writer | `tests/concurrent-locking.test.ts` (WAL/PRAGMA), `tests/rust-index-engine-cli-failure-safety.test.ts:64-92` (PID placeholder), Rust `project_lock_rejects_a_second_writer` | Partial |
| 2 | Crash/kill releases through OS; new writer succeeds **without deleting** the rendezvous file | `tests/rust-index-engine-cli-failure-safety.test.ts:94-131` asserts the file disappears after retry — **opposite** to the requirement | Partial, semantics reversed |
| 3 | Parent death with live delegate and descendant writer; SIGKILL, crash, parent-exit race, channel failure as distinct scenarios | `tests/native-process-supervision.test.ts` (SIGKILL, channel-EOF) — bound to the embedding replacement gate/lease helper | Partial |
| 4 | Nested TS helpers borrow rather than reacquire; full index/queue coverage | `tests/embedding-replacement.test.ts` (clear, reopen, queue rebuild, fallback finalization) | Partial |
| 5 | Normal release leaves the stable file; repeated acquire/release; errors surfaced; no cross-process effect | `tests/security.test.ts:45-135` repeatedly asserts `existsSync === false` — **opposite** to the requirement | Partial, semantics reversed |
| 6 | Legacy/malformed, symlink, directory, path escape, permissions, unsupported filesystem, Adapter failure; force cannot override an active OS lock | `tests/security.test.ts`, `scripts/rust-failure-safety-matrix.mjs:183-213`, `replacement_gate.rs:19-65` (embedding domain) | Partial |
| 7 | Real Windows/Linux/macOS native-process tests; mocks are not platform evidence | `ci.yml` three-platform matrix plus `Verify real native process supervision...`; no sharing-mode / lock-unlock-close evidence for `zcodegraph.lock` | Partial |
| 8 | Embedding worker must not assert index-lock exclusion; verify drain/close or generation cancel/reopen with old-handle writes and queue rebuild | `tests/embedding-replacement.test.ts` `it(...)` titles cover old-handle writes, queue rebuild, reopen gating | Corresponding tests exist |

**0 of 8 fully covered; 7 partial; 1 with corresponding tests.** `tests/security.test.ts` is not referenced by `ci.yml`, and `package.json` `test` (`vitest run`) is not invoked by CI. Item 7's three-platform CI success therefore does not establish completion of this list — a conclusion already recorded in the governance backlog.

## 6. Decisions (Q48–Q53)

- **Q48=A**: #8 is redefined from "§4 normative conflict" to "gap between a whole accepted design and the shipped implementation". The earlier two-way framing is retired.
- **Q49=A**: Reclassify honestly and annotate the whole-ADR implementation status. **Do not** launch an implementation project for the full ADR, **do not** create a Superseded ADR, and **do not** change code.
- **Q50=A**: Any future work uses its own batch with strict feat/chore separation; all `src/` / `tests/` changes require a separate `feat` batch.
- **Q51=A**: Until all 8 Required verification items have evidence, ADR-0011 must not be described as implemented. `tests/security.test.ts:69` must **not** be changed on its own: it faithfully describes the shipped behavior and is a contract to be replaced together with the implementation.
- **Q52=A**: Close #8 under its inaccurate name; open a separate **OPEN** item, "ADR-0011 whole-design implementation debt".
- **Q53=A**: Write this record first, then apply the ADR annotation.

## 7. Boundaries

- No change to `src/`, `scripts/`, `tests/`, `docs/README.md` index, or roadmaps in this batch.
- ADR-0011 remains Accepted; its Status line (`implementation and platform verification pending`) stays as written.
- The `unlock` command keeps its current delete-to-recover behavior; `tests/security.test.ts` keeps its current assertions.
- The two deferred paths — implement the whole ADR (native Adapter, §1–§5, 8 verification items, three-platform evidence), or a new accepted ADR that supersedes it — remain available but **were not chosen** in this round. Starting either requires a fresh Human decision.
- G-ship thresholds, the frozen v3 holdout, product default (OFF), and roadmap 1-4 (pending + blocked) are unchanged.

## 8. Evidence index

- `docs/decisions/ZJ-0011-index-write-lock-lease-and-reclaim.md`: Status `:10-17`, §1 `:45-59`, §3 `:129-157`, §4 `:159-192`, §5 `:194-209`, behavior matrix `:215-224`, Required verification `:226-256`, Consequences `:249-272`.
- `src/bin/zcodegraph.ts:2063-2088`; `src/utils.ts:201-274,228,252`; `src/index.ts:800-816`.
- `crates/zcodegraph-core/src/lib.rs:1401-1404,17124-17228,23133-23169`; `crates/zcodegraph-core/src/replacement_gate.rs:7-161`; `crates/zcodegraph-core/src/process_supervision.rs:1-52`.
- `tests/security.test.ts:32-135`; `tests/rust-index-engine-cli-failure-safety.test.ts:64-131`; `tests/native-process-supervision.test.ts:48-196`; `tests/embedding-replacement.test.ts`; `scripts/rust-failure-safety-matrix.mjs:183-213`; `.github/workflows/ci.yml:83-94`.
