---
doc-kind: decision
authority: primary
authority-id: ADR-0011
bounded-question: "How is index-write mutual exclusion held across Rust and TypeScript, released after crashes, and diagnosed without unsafe lock-file reclamation?"
date: 2026-10-30
---
# ZJ-0011: OS-backed index-write locking and conservative recovery

## Status

Accepted design, revised after adversarial review; implementation and platform
verification pending.

This revision supersedes the earlier in-conversation proposal to reclaim
PID/heartbeat lock files with rename or hard-link quarantine. No such protocol
was implemented.

## Context

TypeScript `FileLock` treats a lock older than two minutes as stale even when
its PID is alive. CLI `unlock` deletes it unconditionally. Rust `ProjectLock`
has an independent PID-only implementation and unconditionally removes its
path on Drop. Rust-hybrid releases its child lock before TypeScript
fallback/finalization. The write lock therefore does not cover the complete
index lifetime.

The earlier proposed remedy—ownerToken, 5-second heartbeat, 30-second lease,
and quarantine reclamation—was rejected by design review:

1. A quarantine token identifies a lock record, not the canonical pathname at
   the later unlink. Two reclaimers can both validate old record A; one removes
   A, B acquires the canonical path, then the other unlinks B. Neither
   read-then-unlink nor hard-link-then-compare-then-unlink makes that atomic.
2. Parent-process death does not prove a delegated Rust child writer died.
3. A PID or heartbeat cannot fence an old writer's already-open SQLite handle.
4. Old TypeScript/Rust binaries do not honor a new record format and can remove
   it.

Windows experiments cannot make a non-atomic algorithm correct. A successful
experiment only establishes whether a particular primitive is implementable.

## Decision

### 1. Use OS mutual exclusion, not lock-file existence

`.zcodegraph/zcodegraph.lock` is a **stable rendezvous file**, not a mutex whose
existence must be deleted. Normal release never deletes it. Each writer opens
the real project-local regular file and attempts a non-blocking OS-backed
exclusive byte-range/file lock. Only a holder of that OS lock may write the
index. Read-only queries and SQLite WAL readers are not blocked by this
coordination lock.

The OS lock belongs to the acquired handle/lock description. Release closes or
unlocks that same handle. Process/handle termination releases it through the
OS. There is no stale-by-age deletion, PID-based reclamation, heartbeat file,
quarantine directory, compare-then-unlock release, or automatic forced
recovery. An active lock remains held even when its owner is suspended for
more than any diagnostic interval.

The project directory, rendezvous path, and its resolved parent are validated
before acquisition. It must not follow symlinks, accept a directory, escape the
real project store, or open an arbitrary alternate path. The same handle and
validation policy apply to standalone Rust, TypeScript, and delegated writers.

The lock file may contain bounded diagnostic metadata (protocol version,
ownerToken, PID/hostname, process-start identity, acquiredAt), but this content
is never authoritative for mutual exclusion or automatic death detection. An
unknown or malformed record does not permit bypassing the OS lock. Token and
PID are not presented as fencing credentials. Metadata repair rewrites bounded
contents through the already-locked handle in place. It must never unlink,
rename over, or otherwise replace the rendezvous file or its directory entry
while any lock handle is held. Replacing the file object would let another
writer lock a different object at the same pathname.

### 2. One operation lease covers every delegated writer

The outer index operation acquires the OS lock before any destructive clear,
temporary DB replacement, staged write, promotion, TypeScript fallback,
post-extract, reference resolution/finalization, metadata write, maintenance,
or embedding enqueue belonging to that operation. `index --force` means
rebuild; it is unrelated to `unlock --force` and never bypasses acquisition.

The lease is an operation-scoped capability, not a property of one
`CodeGraph`/`FileLock` object. All nested TypeScript helpers, additional
`CodeGraph` instances, `indexFiles`/`indexFallbackFiles`, finalization paths,
and Rust children borrow the same lease. Borrowers must not independently
acquire or release it. Only the outer operation owner releases it after every
delegated writer has stopped and its DB handles are closed.

Rust-hybrid uses the selected **single-parent lock owner + borrowed Rust lease
+ OS-enforced child lifetime** model. The parent retains the sole OS lock
handle for the entire child lifetime; the child receives an
externally-held-lock mode and an operation-scoped capability, not a lock handle
or fencing credential. It must never acquire, delete, release, or unlock the
parent's lock independently.

The process-supervision Module must prove that every delegated Rust writer,
including its descendants that can write, terminates when the parent terminates
normally or abnormally. A supervision channel plus child-side exit monitoring
is required; checking a parent PID after death is not enforcement. Candidate
platform Adapters are a Windows Job Object with kill-on-job-close configured
before child start, Linux parent-death signaling with a post-spawn parent race
check and monitored channel, and a macOS supervisor with equivalent channel-EOF
and process-group termination semantics. These are candidate mechanisms, not
portable claims: each requires real-process verification of SIGKILL, crashes,
races, and descendant behavior.

If parent death can leave an unobserved Rust writer, or the platform cannot
prove enforced child termination, acquisition fails before any write. There is
no automatic recovery based on a parent PID. Normal completion awaits child
exit and DB-handle closure before TypeScript finalization and final release.

The asynchronous embedding worker does **not** borrow the index-write lease or
delay its normal release. The index lease covers synchronous enqueue performed
by the same outer operation, including `index --with-embeddings`; that enqueue
must not be moved to an unguarded step after the lease is released.

ADR-0009's queue transactions and claim ownership coordinate writes only within
one database generation. They do not make an independent worker connection
safe across destructive clear or active-DB replacement. Before enabling those
operations, implementation must define and verify either worker drain/close
before replacement or an explicit database-generation cancellation/reopen and
queue-rebuild protocol. Until then, background embedding concurrent with
rebuild/replacement is unsupported and must fail closed before replacement;
ADR-0009 alone is not evidence of coordination. This ADR does not claim that
the queue heartbeat is process fencing.

### 3. Cross-platform Module and fail-closed gate

A single lock-policy Module defines acquisition, lease borrowing, ownership,
completion, and release outcomes. Small platform Adapters provide:

- safe regular-file opening without link traversal;
- non-blocking exclusive lock, unlock, and close;
- enforced child lifetime and supervision-channel Adapters for borrowed leases;
- deterministic process-level test fixtures.

Node has no built-in general file-lock API across all supported platforms.
The implementation must therefore use a small, reviewed native Adapter shared
by Node and Rust, or an equivalently verified mechanism. A Node-only package
that does not cover the standalone Rust writer is insufficient. No new
runtime dependency is approved by this document alone.

On Unix the implementation may use an `flock`-compatible whole-file lock or
another explicitly verified primitive. Windows may use `LockFileEx` with
`LOCKFILE_EXCLUSIVE_LOCK | LOCKFILE_FAIL_IMMEDIATELY` and matching
`UnlockFileEx`, or an equivalent native primitive. These are candidate
Adapters, not untested claims of equivalence. Byte-range length, handle
inheritance, sharing mode, lock ownership, close semantics, and interactions
with separate processes must be pinned in shared conformance tests.

If no verified exclusive-lock Adapter is available on a platform or backing
filesystem, index acquisition fails **before any write**. It must not fall
back to PID-only files, create-if-absent, best-effort locks, or an unlocked
write. The lock is supported only on local filesystems with demonstrated OS
lock semantics; unsupported network/virtual filesystems fail closed.

### 4. `unlock` becomes diagnosis, not deletion

`unlock [path]` is retained for CLI compatibility but no longer removes a live
lock record. Its ordinary behavior is:

- no initialized project or invalid path: fail with exit 1;
- valid rendezvous file with no current OS writer: report `not-locked`, leave
  the stable file in place, exit 0;
- active OS writer: report non-sensitive available diagnostics and exit 1;
- malformed/legacy metadata with no current OS writer: report the diagnosis,
  leave the file in place, and permit a new protocol acquisition to repair or
  rewrite metadata in place through the locked handle;
- inaccessible/unknown lock state: fail closed with exit 1.

No lock-file deletion is needed to recover from process termination. Users do
not need to remove a zero-length or stale-looking stable lock file. The help
text and documentation must explain this change from delete-to-recover to
inspect-and-report.

`unlock --force` is constrained by the newly confirmed force semantics:

- it **cannot** override an active OS writer and exits 1;
- it may clear/reset legacy or malformed diagnostic metadata only after the
  same command has acquired the OS lock and verified that no writer is active;
- it never deletes the rendezvous file, database, or arbitrary path, and never
  unlocks or closes another process's handle;
- it cannot be called internally by `index`, `sync`, hooks, MCP, or automatic
  recovery.

Force is thus a metadata repair option, not a mutual-exclusion bypass. There
is intentionally no command that forcibly detaches an active OS lock. If an
operator terminates a writer externally, OS handle cleanup is the recovery
mechanism; index validation/rebuild remains available if the terminated write
left an incomplete operation.

> **Implementation status (2026-11-06):** This ADR is an accepted design, not
> an implemented protocol. §1 (OS-backed stable rendezvous lock on
> `.zcodegraph/zcodegraph.lock`) and §3 (small native cross-platform Adapter)
> are not implemented on the index-write lock path; the observed `flock` /
> `fs2` / Windows Job Object support belongs to the separate
> embedding-replacement gate. The index lock is still the PID-only TypeScript
> `FileLock` (`src/utils.ts`) and Rust `ProjectLock`
> (`crates/zcodegraph-core/src/lib.rs`), both of which delete the lock file on
> release or stale recovery.
>
> §4 depends on those prerequisites: its diagnostics and constrained `--force`
> require a command that has already acquired the OS lock and verified that no
> active writer exists. `src/bin/zcodegraph.ts` (`unlock [path]`) therefore
> still calls `fs.unlinkSync` and reports "Removed lock file", and
> `tests/security.test.ts` asserts the shipped delete-to-recover behavior.
> That test must not be changed on its own: it describes the implementation
> that actually ships.
>
> None of the 8 items in `## Required verification` is fully covered, and
> several existing assertions contradict items 2 and 5. The decision above
> remains accepted and unchanged. The gap is implementation debt for the whole
> design, not a §4-only conflict. Do not describe this ADR as implemented
> until all 8 items have evidence.

### 5. Mixed-version compatibility is explicit, not assumed

Old binaries use lock-file creation/unlink and do not honor the new OS lock.
Concurrent old/new writers are unsupported. The release must state the minimum
lock-safe version, coordinate TypeScript and Rust binary upgrades, and provide
an upgrade diagnostic when legacy records/old writer behavior are detected.
It must not silently unlink a legacy lock while an old writer may be active.

The stable lock path helps old/new diagnosis but does not itself make a rolling
mixed-version deployment safe. A requirement to support such deployment would
need a separate compatibility protocol and real old/new concurrency evidence.

## Behavior matrix

| State | Acquisition | `unlock` | `--force` |
| --- | --- | --- | --- |
| OS lock free, valid/empty metadata | Acquire and write | `not-locked`, exit 0 | Optional metadata reset while locked |
| Active OS writer | Refuse, no writes | Refuse, exit 1 | Refuse, exit 1 |
| Process exited | OS releases; next acquire allowed | Reports free; no deletion | No special bypass needed |
| Legacy/malformed metadata, OS lock free | Acquire first, then repair | Diagnose, no deletion | Repair while locked |
| Unknown lock/filesystem/platform state | Refuse before writes | Refuse | Refuse |
| Unsupported OS lock Adapter | Refuse before writes | Diagnose unsupported | No fallback |

## Required verification

All tests use isolated fixture projects, never a developer's real index.

1. Process-level TypeScript/TypeScript, Rust/Rust, TypeScript/Rust, and
   Rust-hybrid/other-writer exclusion for longer than the legacy two-minute
   threshold. Assert no second writer enters while the first is stopped or
   suspended.
2. Process kill/crash and abnormal handle termination release through the OS;
   a new writer succeeds without deleting the rendezvous file.
3. Deterministic parent death with a live attempted Rust delegate and a
   descendant writer. The parent retains the only OS lock handle; enforced
   supervision must terminate the delegate and every writing descendant before
   another writer can enter. SIGKILL, process crash, parent-exit races, and
   supervision-channel failure are distinct required scenarios.
4. Nested TypeScript fallback/index helpers borrow rather than reacquire or
   release. Lock coverage includes clear/rebuild, staging, promotion,
   finalization, metadata, and synchronous enqueue.
5. Normal release leaves the stable file; repeated acquire/release works;
   unlock/close errors are surfaced; release cannot affect another process.
6. Legacy/malformed records, missing file, no lock, active lock, symlink,
   directory, path escape, permissions, unsupported filesystem, and Adapter
   failure. Force cannot override an active OS lock.
7. Real Windows, Linux, and macOS native process tests: enforced child and
   descendant lifetime, supervision-channel closure, sharing mode,
   lock/unlock/close, crash cleanup, and unsupported state behavior. Mock tests
   are not platform evidence.
8. Background embedding worker tests do not assert index-lock mutual exclusion
   over its independent DB connection. Before enabling rebuild/replacement,
   separately verify the selected drain/close or database-generation
   cancellation/reopen protocol, including old-handle writes and queue rebuild.

## Consequences

### Positive

- Lock validity is owned by the OS rather than inferred from file age or PID.
- Crash recovery does not require deleting a lock record or racing reclaimers.
- One capability covers the complete Rust/TypeScript structural index
  operation, including its synchronous enqueue.
- Active writers cannot be evicted by `unlock --force`.
- Stable lock files remove the normal release/replacement race by design.

### Costs and residual risk

- A small native cross-platform Adapter and its packaging/signing/testing are
  required. This is more substantial than editing `src/utils.ts`.
- Platform-specific handle and child semantics need real evidence before
  support is enabled.
- Old/new mixed writers remain unsafe without coordinated upgrades.
- OS locking is not a transaction rollback or a database-level fencing epoch.
  Operators must still validate/rebuild after externally killing a writer.
- Background embedding queue claims remain a separate, lease-based protocol.
  Its interaction with database replacement requires a verified drain or
  generation protocol and is a release-blocking dependency for that path.

## Alternatives rejected

- **PID/heartbeat with rename or hard-link quarantine:** non-atomic claim and
  unlink can delete a replacement; parent death does not cover delegates.
- **Keep heartbeat but treat expiry as death:** evicts live suspended writers.
- **Only fix TypeScript:** leaves Rust, nested helpers, rebuild, and
  finalization outside mutual exclusion.
- **Use SQLite busy timeout as the project writer lock:** serializes individual
  DB transactions, not the complete staged-index/finalization operation.
- **Silently support old/new rolling writers:** old implementations do not
  honor the OS protocol and can unlink the rendezvous file.
