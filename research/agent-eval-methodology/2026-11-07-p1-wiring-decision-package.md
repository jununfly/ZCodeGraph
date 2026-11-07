# P1 wiring decision package (2026-11-07)

> Status: **settled 2026-11-07 — Human selected A for all three inputs.**
> Batch 1 is implemented in the working tree (not committed). The conclusion is
> also recorded as an append-only decision on `1-8-1` and in
> `2026-11-06-adr-human-decisions.md`. This file is a research aid and is not
> registered in `docs/README.md`.

## Context

Human selected option C (2026-11-07), satisfying Q75 and moving ADR-0011 from
P3 to P1. Batch 1 landed on `main` as merge commit `b8eacf6` (PR #704): an
additive, unwired `index_write_lock.rs` stable-rendezvous lease plus a shared
`try_lock` / `try_unlock` platform Adapter. ADR-0011 is still an accepted
design; the 8 Required verification items are 0 fully covered.

Four gates remain OPEN: named concurrency/security reviewer (Q68), hard budget
(Q76), shared native Adapter choice (ADR-0011 §3), and item 7's real three-platform
evidence (CI only).

## Read-only evidence for the Adapter choice

| | Path A — supervised Rust lease-holder (recommended) | Path B — Node N-API addon |
|---|---|---|
| New dependency | **None** (`fs2` / `libc` / `windows-sys` already present) | New `cdylib` crate + `napi-rs`/`neon`, per-platform prebuilt `.node` packages |
| Reusable production pattern | `src/embedding/replacement-gate.ts:101-155` `NativeReplacementLease`; `src/indexing/rust-indexer.ts:345-395` `runRustIndexerBorrowingGate`; `process_supervision.rs` Job Object / process-group / stdin-EOF; `scripted-index-fixture.rs:83-91` hold-until-EOF | None. No `napi`/`neon`/`node-gyp`/`cdylib`/`.node` anywhere in the repo |
| Three-platform coverage | `ci.yml:83-94` guardrails already run the same model on ubuntu / macos-15 / windows-2025 | Would need new addon build + load steps on all three runners |
| Release impact | `cargo build --bins` already covers a new subcommand of the existing `zcodegraph-core` bin | `release.yml` 6-target matrix, `build-bundle.sh`, `rust-core-artifact-contract.mjs`, npm `files`, Authenticode / notarization — all new |
| Standalone Rust writer | Covered: same `index_write_lock.rs` Adapter | **Not covered**; a second lock implementation would be needed |
| ADR-0011 §3 fit | `equivalently verified mechanism`; shared Adapter; fail-closed | Conflicts with "Node-only package insufficient" and "No new runtime dependency is approved by this document alone" |

**Honest caveat for Path A.** ADR-0011 §2 says the parent retains the *sole* OS
lock handle. In Path A, Node does not hold that handle itself; it spawns a Rust
lease-holder that owns the handle, supervised by `process.once('exit')` +
stdin EOF. This is a process-boundary-equivalent implementation, not the literal
wording. Human must explicitly accept that equivalence argument (and require
real SIGKILL / channel-EOF / descendant evidence, verification items 3 and 7).
Path B matches the wording but does not provide the borrowed-lease supervision
channel that §2 also mandates.

**Recommendation: Path A.** Zero new runtime dependency, smallest delta, reuses
the already CI-verified single-parent-owner model by promoting it from the
`embedding-replacement.*.lock` domain to `zcodegraph.lock`.

## Three Human inputs to freeze

1. **Q68 named concurrency/security reviewer.** Q68 states Human is the sole
   approver and the name was deferred. It must be supplied before any `feat`
   batch. An AI agent must not self-assign this role.
2. **Q76 hard budget.** Define the P1 program ceiling in verifiable units
   (`feat` batches + full three-platform CI reruns), with all variants keeping:
   zero new runtime dependency, no change to product default OFF, no `1-4`
   unblock, no weakening of the P0 lock / DB replacement barrier
   (`cli-p1-modularity-and-explore-v1.md:320`). If the 8 verification items
   cannot all be evidenced inside the budget, Q76 mandates falling back to P3
   and keeping the debt OPEN.
3. **Adapter choice.** Path A / Path B / defer pending a written equivalence
   argument. Choosing B additionally requires a separate approval for a new
   runtime dependency.

## Wiring scope (identical for both paths)

- `src/utils.ts:201-311` `FileLock` — replace PID-only acquire/release with a
  borrowed native lease handle, or delete once all callers migrate.
- `src/index.ts` — 4 `acquire()` + 8 `release()` call sites (`:1044, 1263, 1354,
  1917` / `:970, 984, 1117, 1235, 1273, 1415, 2501, 2960`), plus 3
  `acquireExclusiveReplacementGate` sites (`:1127, 2930, 2958`), the nested
  acquire inside `finalizeRustIndex:1917` (forbidden by §2), DB lifecycle
  `closeDatabaseForExternalIndex:1233` / `reopenDatabaseAfterExternalIndex:1239`,
  and synchronous enqueue timing. Target: one operation lease covering
  clear/rebuild/staging/promotion/finalization/metadata/enqueue.
- `crates/zcodegraph-core/src/lib.rs:17125-17229` `ProjectLock` — replace
  PID-only `create_new` + `Drop` removal with `IndexWriteLease`; update its
  production call at `:1405` and the two existing unit tests.
- `src/bin/zcodegraph.ts:2060-2088` `unlock` — delete semantics to
  inspect-and-report per §4 (`not-locked` / active writer / malformed /
  fail-closed), `--force` as metadata repair only; update help text at `:2065`.
- `tests/security.test.ts:69` — replace the stale-delete assertion together
  with the full implementation (Q51=A forbids changing it alone).
- `ZJ-CONTEXT.md:406-434` — three glossary entries currently written in design
  state; align only after implementation is real.
- `ci.yml` — add the new process-level tests to the file-lock / native-process
  guardrails; `cargo test` already runs `index_write_lock.rs` unit tests on all
  three platforms.

**Windows conformance finding already pinned:** `fs2` exclusive `LockFileEx`
locks the whole file, so §4 diagnostics cannot be read from the rendezvous file
while a writer holds the lease (`ERROR_LOCK_VIOLATION`, os error 33). Path A's
lease-holder must expose diagnostics over its stdout/supervision channel or a
dedicated byte range — not by reading the locked file.

## 8 verification items → work packages

| # | Work package | Evidence source |
|---:|---|---|
| 1 | TS/TS, Rust/Rust, TS/Rust, hybrid exclusion beyond 2 min; suspended writer | new process-level tests, 3 OS |
| 2 | SIGKILL / crash releases through OS without deleting the file | new process-level tests, 3 OS |
| 3 | Parent death with live delegate + descendant; SIGKILL / crash / exit race / channel failure | `supervised-writer-fixture` + new cases, 3 OS |
| 4 | Nested TS helpers borrow, never reacquire/release; full operation coverage | §2 refactor + targeted unit tests |
| 5 | Stable file on release, repeated acquire, surfaced unlock errors | unit tests (partly in Batch 1) + cross-process |
| 6 | Legacy/malformed/missing/symlink/directory/escape/permissions/unsupported/Adapter failure; force cannot override | unit + process tests |
| 7 | Real Windows / Linux / macOS native-process behavior | CI only (`ci.yml` guardrails) |
| 8 | Embedding worker separate from index lease; drain/close or generation protocol | separate tests incl. old-handle writes + queue rebuild |

"Implemented" is claimable only when all 8 have evidence (Q51/Q71).

## Settlement (2026-11-07)

| Input | Human decision |
|---|---|
| ADR-0011 §3 shared Adapter | **A — supervised Rust lease-holder.** Zero new runtime dependency; Human explicitly accepts the §2 equivalence argument (Node borrows a lease owned by a supervised native descendant rather than holding the OS handle itself) and requires real SIGKILL / channel-EOF / descendant evidence for items 3 and 7. Path B was not selected. |
| Q68 named concurrency/security reviewer | **A — Human serves as the named reviewer.** Q68's gate is closed; an AI agent must not self-assign. Every batch output still returns to Human for approval. |
| Q76 hard budget | **A — 3 feat batches / 2 full three-platform CI reruns.** All variants keep zero new runtime dependency, product default OFF, no `1-4` unblock, and no weakening of the P0 lock / DB replacement barrier. If the 8 items cannot all be evidenced inside this budget, fall back to P3 and keep the debt OPEN. |

### Batch plan inside the frozen budget

1. **Batch 1 (this round)** — native `index-lease` helper (Rust `main.rs`), public
   `IndexWriteLease` / `RendezvousState` exports, TS `index-write-lease.ts`
   handle, §4 `unlock` diagnosis + `--force` metadata repair, real process-level
   tests, and the ci.yml file-lock guardrail. `FileLock` / `ProjectLock` and the
   13 `src/index.ts` call sites are deliberately untouched.
2. **Batch 2** — atomic cross-language switch of `FileLock` **and** `ProjectLock`
   to the lease, plus the §2 single operation-lease refactor (remove the nested
   `finalizeRustIndex` acquire, cover clear/staging/promotion/finalization/
   synchronous enqueue), `tests/security.test.ts:69`, `ZJ-CONTEXT.md` glossary,
   and CLI help. Both sides must switch together: changing only Rust would leave
   `FileLock` deleting the stable rendezvous file.
3. **Batch 3** — close all 8 Required verification items with real three-platform
   native-process evidence, then update ADR-0011's implementation-status note.
   Claiming "implemented" before this is forbidden (Q51/Q71).

### Batch 1 evidence (Windows local, 2026-11-07)

- `cargo check --all-targets` pass; `cargo test --lib index_write_lock` 6/6;
  `cargo build --bins` produced the new `index-lease` subcommand.
- New `tests/index-write-lease.test.ts`: **6/6 real native-process tests** —
  cross-process exclusion + `active-writer` diagnosis, stable file on normal
  release + repeated acquire, SIGKILL release without deletion + successful
  re-acquire, `--force` in-place metadata repair, `unlock` diagnosis / active
  writer fail-closed / `--force` cannot override, and a sharing-mode conformance
  assertion. Added to the ci.yml three-platform file-lock guardrail.
- The Windows `ERROR_LOCK_VIOLATION` finding reproduced across processes: a
  second handle cannot read the rendezvous file while the lease is held. The
  test suite now pins this explicitly, and the CLI gets diagnostics from the
  helper's `--diagnose` channel instead of the locked file.

**Conservative verification accounting:** items 2 and 5 now have real Windows
process evidence; items 1 and 6 are partially covered; items 3, 4, 7, 8 remain
unstarted. **None is yet "fully covered"** because item 7 requires three-platform
CI evidence, which consumes the first of the two budgeted CI reruns. The debt
stays OPEN and ADR-0011 must not be described as implemented.

## Fallback to P3 (2026-11-07, Q76)

> Status: **P1 falls back to P3; the debt stays OPEN.** PR #705 (batch 1)
> merged as `e3db5c9`. Human selected C1+C2. This section is a research record
> and does not authorize any implementation.

### Budget arithmetic that forced the fallback

| | |
|---|---|
| Frozen budget | 3 feat batches / 2 full three-platform CI reruns |
| Used | batch 1 + 1 CI rerun (`42367067011`, 5/5, new suite 6/6 on all three runners) |
| Remaining | 2 batches / 1 CI rerun |
| Still required | batch 2 (blocked) + batch 3 (all 8 verification items and their three-platform evidence) |

At least three further submissions would be needed. Q76 explicitly says that
when a P1 cannot complete all 8 verification items inside its hard budget, the
program falls back to P3 and keeps the item OPEN. **0 of 8 fully covered.**

### Batch 2 blocker — evidence and fix paths

`tests/native-process-supervision.test.ts:162-169` obtains the writer PID by
reading the lock file with `readPid()` = `Number(trim)`, inside an
`it.each(['parent-sigkill','channel-eof'])` case with no platform skip (ci.yml
three-platform native-process guardrail). With an OS-backed lease:

1. Windows whole-file `LockFileEx` rejects a **cross-process** read with
   `EBUSY` (reproduced in batch 1: the main process reading the helper's locked
   rendezvous file).
2. Metadata is bounded JSON, not a bare PID number.
3. The writer PID is required to assert descendant reaping (item 3), so the
   assertion cannot be removed without weakening verification.

This is the §4 diagnosis gap pinned in batch 1's conformance test: active-writer
diagnostics cannot be read from a whole-file-locked rendezvous file.

| Fix path | Description | Assessment |
|---|---|---|
| **A (recommended if restarted)** | Independent §4 diagnosis channel — sidecar file or structured helper stdout carrying non-sensitive owner PID / acquiredAt; the supervision test reads from that channel | Additive, leaves the shared `try_lock` primitive and the replacement-gate domain untouched; matches §4's "available diagnostics" wording, which never required reading the lock file |
| B | Byte-range lock: Windows `LockFileEx` locks only byte 0; metadata from offset 1 stays readable cross-process; Unix `flock` is advisory and already permits reads | Needs a `Win32_Storage_FileSystem` feature, a new platform primitive, and a metadata-layout change; re-opens three-platform conformance for the shared `replacement_gate.rs` path — materially larger blast radius |

Both are protocol/primitive extensions needing a new Human authorization and a
refrozen budget (recommended 4–5 batches / 3–4 CI reruns). **Neither is
authorized by this fallback.**

### Design finding worth keeping

`indexExternalEngine` runs the Rust writer with its own `ProjectLock`; Node's
`FileLock` serves only the pure-TypeScript index paths (`indexAll` non-rust,
`indexFiles`, `sync`, `finalizeRustIndex`). Both use the same OS lock but never
hold it at the same time, so batch 2 does **not** need a new
`--index-lease-externally-held` borrowing flag. The experimental batch 2 edits
(Rust `ProjectLock` swap, async `FileLock`, 4 `await` call sites) compiled
locally but were reverted before any commit; PR #705 stayed at batch 1 only.

### Documentation drift — resolved at the 2026-11-07 review

ADR-0011's `> Implementation status (2026-11-06)` note previously said `unlock`
calls `fs.unlinkSync`. That half became stale with PR #705 and was recorded here
as pending the next review. The note's §4 paragraph has now been synced to
describe the shipped inspect-and-report behavior, the constrained `--force`
metadata repair, and the independent `index-lease --diagnose` / `--repair`
channel. The Context sentence claiming `unlock` "deletes it unconditionally"
was also given an explicit past-tense qualifier and a cross-reference to the
status note, removing the ADR's internal contradiction. The rest (§1/§3
unwired, 0 of 8 verification items fully covered, "do not describe this ADR as
implemented") is unchanged and still accurate. Q81 is respected: no review
triggers were written into the ADR; this edit corrects a factual
implementation-status statement only. The debt stays OPEN.
