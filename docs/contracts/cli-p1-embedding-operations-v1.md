---
doc-kind: contract
authority: primary
authority-id: DES-cli-p1-embedding-operations-v1
bounded-question: "What exact queue, JSON, concurrency, migration, and interruption guarantees govern embedding status, run, and retry-failed?"
version: v1
date: 2026-10-30
---
# CLI P1 Embedding Operations Contract v1

Status: approved design; implementation pending. This contract refines ADR-0009
for the foreground operational commands. It does not deliver semantic retrieval
and does not make database replacement safe merely by using queue transactions.

## Scope and common rules

The command surface is:

```text
zcodegraph embedding status [path] [--json] [--require-drained]
zcodegraph embedding run [path] [--json]
zcodegraph embedding retry-failed [path] [--json]
```

`run` and `retry-failed` require an initialized project,
`ZCG_ENABLE_EMBEDDING=1`, and dependency readiness. They consume the durable
queue without scanning source files, discovering index changes, enqueueing
current `files` rows, or starting/stopping an MCP server. `status` performs no
migration, recovery, enqueue, dequeue, model load, network request, or source
file read. The environment flag does not gate `status` and does not by itself
make it unhealthy.

All timestamps in JSON are integer Unix epoch milliseconds or `null`.
`projectPath` and dependency `path` values are absolute native paths; queue
`filePath` values are normalized project-relative paths with `/` separators.
JSON follows
`DES-cli-p0-output-git-range-v1`: one stdout document, diagnostics on stderr,
and `{error:{code,message}}` when evaluation/execution itself fails. A completed
health evaluation or a completed drain with item failures retains its result
object instead of using an error envelope.

Additional registered error codes are `embedding-disabled`,
`embedding-not-ready`, `embedding-runtime-failed`, and `operation-interrupted`.
Existing `project-not-initialized`, `index-unavailable`, and
`operation-failed` retain their P0 meanings. An interrupted command is the one
exception that emits its completed partial result with exit 130 rather than an
error envelope; a failure before a result can be assembled uses
`operation-interrupted` and exit 130.

## Queue snapshot and classification

A queue snapshot is one consistent SQLite read transaction. Counts, current
classification, claims, failures, schema version, and reasons derive from that
same snapshot. A new snapshot is taken for each scheduling decision and for the
final result; counters from different snapshots must not be combined.

For every `embedding_queue` row `q`, current means that a `files` row `f`
exists with `f.path = q.file_path AND f.content_hash = q.content_hash`.
Every other row is historical, including a queue row whose file has no current
`files` row. No disk hash is computed.

| JSON counter | Included rows |
| --- | --- |
| `queue.current.{pending,inProgress,done,failed}` | Current rows, grouped by their four durable statuses. |
| `queue.historical.{done,failed}` | Terminal historical rows only. |
| `queue.historicalUnfinished.{pending,inProgress,staleClaims}` | Nonterminal historical rows and the subset whose lease is expired. |
| `queue.staleClaims` | Current `in_progress` rows whose lease is expired. |

The separate `historicalUnfinished` object is required: an old content hash may
be pending or claimed when a new hash is indexed. Treating it as terminal
history or dropping it from diagnostics would hide work. It does not affect
current-hash health. Foreground drain nevertheless converges all nonterminal
rows, current or historical, because they are already-enqueued work.

A claim is stale only when `status = 'in_progress'` and
`observedAt - COALESCE(heartbeat_at, started_at) > 300000`. Equality is not
stale. Heartbeat freshness is a lease observation, never a process-liveness
claim. `workerEnabled` is the parsed environment opt-in state, not proof that
a worker exists.

## Status result

The JSON shape below is normative. All shown members are required except where
the type table explicitly marks a member optional. No success member contains
file contents. Arrays are bounded to 10 entries, sorted by the relevant event
time descending and then by `(filePath, contentHash)` ascending.

```ts
type EmbeddingStatusJson = {
  schemaVersion: 1;
  operation: 'status';
  projectPath: string;             // absolute path after CLI normalization
  indexSchemaVersion: number;
  migrationRequired: boolean;      // indexSchemaVersion < 8
  ready: boolean;                  // initialized project + all three dependencies
  healthy: boolean;
  drained: boolean;                // current pending + inProgress + failed === 0
  requireDrained: boolean;
  workerEnabled: boolean;
  dependencies: {
    fastembed: {
      ok: boolean;
      resolvedFrom?: 'default' | 'models-dir';
      error?: string;
    };
    vec0: { ok: boolean; path?: string; error?: string };
    model: { ok: boolean; path?: string };
  };
  queue: {
    current: { pending: number; inProgress: number; done: number; failed: number };
    historical: { done: number; failed: number };
    historicalUnfinished: { pending: number; inProgress: number; staleClaims: number };
    staleClaims: number;
    claims: Array<{
      filePath: string;
      contentHash: string;
      attempts: number;
      retryCount: number | null;   // null only on a pre-v8 read-only snapshot
      workerId: string | null;
      startedAt: number | null;
      heartbeatAt: number | null;
      stale: boolean;
    }>;                            // current in_progress rows only
    recentFailures: Array<{
      filePath: string;
      contentHash: string;
      attempts: number;
      retryCount: number | null;
      lastError: string | null;
      finishedAt: number | null;
    }>;                            // current failed rows only
  };
  reasons: Array<{
    code: 'fastembed-unavailable' | 'vec0-unavailable' | 'model-unavailable'
      | 'current-failed' | 'stale-claims' | 'pending' | 'active-claims';
    count: number;
  }>;
};
```

All counters are finite non-negative integers. `claims` uses `startedAt` for
ordering; `recentFailures` uses `finishedAt`, with null timestamps after all
non-null timestamps. `lastError` is the latest stored error, not an audit log.
For a supported pre-v8 database, `retryCount` is null; the read path must not
emulate a zero that would be mistaken for real history. Status and execution
resolve vec0 through the same environment-override, package-vendor, then
models-dir resolver as the worker. Every candidate, not only the explicit
override, must be a readable regular file before `vec0.ok` can be true; a
directory or unreadable package/models-dir candidate is not ready. Resolution
and file checks are allowed, but status never loads the extension. An invalid
explicit override is reported in `vec0.error` and cannot silently fall back to
another candidate.

The formulas are exact:

```text
ready = project is initialized AND fastembed.ok AND vec0.ok AND model.ok
healthy = ready AND current.failed = 0 AND staleClaims = 0
drained = current.pending + current.inProgress + current.failed = 0
default exit = healthy ? 0 : 1
--require-drained exit = (healthy AND drained) ? 0 : 1
```

`drained` is independent of readiness and historical rows. It deliberately
answers the current-index CI question, not whether the whole physical queue is
empty. `--require-drained` adds `pending` and `active-claims` reasons for
current work; default status omits those two reasons. Historical terminal and
historical unfinished rows, disabled scheduling, and migration availability do
not independently change `healthy`. A caller needing every physical task
converged uses `run` and checks `remaining`.

Readiness reasons appear in fixed order `fastembed-unavailable`,
`vec0-unavailable`, `model-unavailable`, followed by `current-failed`,
`stale-claims`, then drain-only `pending`, `active-claims`. Each reason's count
is respectively 1, the corresponding current failure/stale count, or current
pending/in-progress count. Zero-count reasons are omitted; therefore `reasons`
is empty for a healthy default evaluation even when `drained` is false.

A missing/unreadable database, missing core schema, newer unknown schema, or
malformed required rows fails evaluation with `index-unavailable`. Supported
older core schemas may be inspected read-only: pre-v6 has no embedding queue
and reports zero queue counters; v6/v7 report available claim/failure data with
unsupported newer columns represented as null. `migrationRequired` informs the
caller that `run`/`retry-failed` will migrate before writing. It is not a silent
migration and is not itself an unhealthy embedding result.

## Schema v8 and retry history

The next migration is schema **v8**, with `CURRENT_SCHEMA_VERSION = 8` and a
strictly ordered migration entry in the same implementation change:

```sql
ALTER TABLE embedding_queue
  ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
```

Fresh `schema.sql` includes the same column and default. The migration runner
executes each migration batch inside `BEGIN IMMEDIATE`; after acquiring that
write transaction and before every migration it re-reads the committed schema
version. A migration already applied by another process is skipped rather than
replaying its DDL. Migration lock conflicts use the same bounded DB busy/retry
semantics below and are not per-file failures. Every v8-capable queue
row reader includes `retry_count`; the version-aware pre-v8 inspection Adapter
uses `NULL AS retry_count` instead of querying a nonexistent column. The
migration description must state: old read-only
graph queries ignore the additive column; older queue implementations preserve
it because their inserts/updates name explicit columns; the new CLI may migrate
before queue writes; unknown/newer-schema behavior is not broadened by this
contract. No new queue index is introduced. The standard-corpus performance
baseline is updated only if measurement shows the contract's material-cost
threshold is crossed.

`attempts` counts actual claims, including the next manual claim.
`retry_count` counts successful human requeue transitions, not claims and not
watchdog recoveries. Only the latest error and latest terminal failure time are
retained; no audit table is added.

The explicit retry operation uses one `BEGIN IMMEDIATE` transaction. It selects
only current failed rows by joining `files` on both path and content hash, then
updates rows still in `failed` state:

```text
status       failed -> pending
attempts     previous value -> 3
retry_count  previous value -> previous value + 1
last_error   preserved
finished_at  preserved
model_version preserved
enqueued_at  preserved
started_at   -> NULL
worker_id    -> NULL
heartbeat_at -> NULL
```

`retried` is the number of rows actually transitioned by this transaction, not
the number initially observed before the transaction. The `status = 'failed'`
predicate prevents a racing claim from being reset. A second retry may be a
no-op when another process has already claimed or completed the item. The
transaction does not hold while loading a model, reading source, or embedding.

The first later claim performs the ordinary `attempts = attempts + 1`, so its
claimed value is 4. It also sets a new `started_at`, `worker_id`, and heartbeat
but still preserves the previous error and `finished_at` until a terminal
outcome. On done, `last_error` clears and `finished_at` becomes the success
time. On failure, the new error/time replace the latest failure fields;
`retry_count` never resets. A stale claim at attempts 4 follows the existing
`attempts >= 3` branch and becomes failed, never pending. Watchdog recovery
never increments `retry_count` and ordinary enqueue/read-repair never revives a
current failed row.

The legacy `enqueueEmbeddingBatch(..., {retryFailed:true})` behavior is not an
implementation of this transaction: it clears error history and resets attempts
to zero. It must not be reused unchanged for `retry-failed`.

### Single-current-vector invariant

`vec_embeddings` is keyed only by `file_path`; it is not a multi-generation
vector store. Therefore draining historical work must never overwrite a newer
vector:

1. A queue row already historical when selected for claim is finalized without
   calling the embedder and without touching `vec_embeddings`. It transitions
   to `done` with `last_error = NULL` and a terminal timestamp as a superseded
   queue item; this is bookkeeping, not evidence that its old hash was embedded.
2. A row current at claim can become historical while the batch runs. Its
   terminal transaction must re-check an exact
   `files(path = file_path, content_hash = claimed_hash)` row. If absent, it is
   finalized by the same superseded path and performs no vector DELETE/INSERT.
3. Only a still-current row may commit `done` together with its vector
   DELETE/INSERT in the same immediate transaction. The queue terminal update,
   current-hash check, and vector write succeed or roll back together. An owner
   mismatch returns no committed terminal count.
4. A still-current empty or unreadable source follows the existing successful
   skip outcome but must not leave an older vector behind: after owner and
   current-hash checks, its terminal immediate transaction commits queue `done`
   and DELETEs that path's old vector without an INSERT. If it has become
   historical, rule 2 applies instead and no vector is touched. Only a committed
   transition contributes to local succeeded.

Cold-start vec0 table creation is also concurrency-safe: creation is serialized
and rechecked under a write transaction, or uses an idempotent form whose
conflict path verifies the existing table contract. A competing creator that
successfully initializes the same table is not an initialization failure. This
initialization is part of the foreground and MCP verification matrix.

This applies to foreground and MCP workers, not only the new CLI. It prevents
an old-hash task finishing last from deleting a current vector while its queue
state misleadingly appears successful. The superseded transition must be
distinguishable in worker progress/diagnostic logs, but does not add a fifth
persisted queue status or change the public execution JSON. A future need to
retain multiple hash vectors requires a separately reviewed schema and query
contract.

## Foreground execution and counters

`retry-failed` first performs the transaction above and then enters exactly the
same foreground drain coordinator as `run`. With `retried = 0` it still drains
other already-enqueued work; this is not an early return. Both commands permit
transaction-level concurrency with other workers and never reset or complete a
claim owned by another live worker.

A successful terminal item is `done`; a failed terminal item is `failed`.
Empty/unreadable source handled as done by the existing worker counts as
succeeded. Every JSON execution result has this exact shape, with `retried`
required only for retry and `interrupted` present only after Ctrl+C:

```ts
type EmbeddingExecutionJson = {
  operation: 'run' | 'retry-failed';
  processed: number;       // succeeded + failed, this process only
  succeeded: number;       // this process's claims committed done
  failed: number;          // this process's claims committed failed
  remaining: number;       // final global pending + in_progress, all hashes
  retried?: number;        // retry-failed only, including zero
  interrupted?: true;      // Ctrl+C only
};
```

These are intentionally different units. `processed` is not the number of files
scanned, the number of rows initially pending, or a cross-worker total.
`remaining` is the only global work gauge and comes from the final durable
snapshot, not worker memory. A row processed by another process contributes to
neither `processed` nor `failed` here. Superseded bookkeeping committed by this
worker counts as succeeded because no old vector may be emitted. Item-level
details are obtained from `status`, not duplicated in the execution result.

Worker batch messages report actual committed `succeeded` and `failed` counts;
the coordinator adds each completed batch once into command-session totals.
Local `idle` and `progress` messages never overwrite/reset those totals and are
not additional terminal events. In particular, the current skipped-row and
catch paths that increment counters without checking `markEmbeddingDone` /
`markEmbeddingFailed`'s boolean result do not satisfy this contract. A failed
terminal update due to lost ownership is not counted locally and is surfaced
as a runtime error unless another owner has already committed the same item;
the final queue snapshot remains authoritative for remaining work.

Normal completion requires all of the following at one final queue snapshot:

1. this process is idle, with no uncommitted claimed batch;
2. global pending is zero;
3. global `in_progress` is zero.

The final snapshot is the linearization point. Work committed after it is a new
operation, not a reason to claim that this command permanently watches the
queue. Work arriving before that snapshot must be observed and drained.

The normal exit is 1 when this process failed at least one item **or** the final
snapshot contains any current failed row; otherwise it is 0. Thus pre-existing
current failures cannot make an otherwise idle `run` look successful, while
pre-existing historical terminal failures do not fail a new run. Historical and
superseded rows follow the bookkeeping path above and count as committed
succeeded, never per-item failed; an actual embedding failure is possible only
for an item whose current-hash check still passes. Empty work with no current
failure succeeds. Retry with no
current failed row reports `retried: 0` and may still succeed after draining
other work.

## Idle, leases, and stale recovery

All claim, retry, watchdog, and terminal queue/vector state transitions use a
real `BEGIN IMMEDIATE` storage transaction or a single-statement atomic
`UPDATE ... RETURNING`; the existing deferred `BEGIN` plus SELECT/UPDATE is not
sufficient under two WAL writers. Every worker/main connection sets a 5-second
SQLite busy timeout. A lock conflict has at most three immediate attempts with
bounded injected backoff; exhaustion is a DB operation failure, never a
per-item embedding failure. Tests must force competing connections to hold the
same pre-update snapshot, not rely on naturally sequential workers.

A worker's local `idle` message means only that its last claim returned no
rows. It is not proof of global completion. The coordinator responds as
follows:

| Final/scheduling observation | Action |
| --- | --- |
| Local idle and global pending/in-progress both zero | Complete using that snapshot. |
| Local idle and pending exists | Nudge the worker; if model initialization failed, fail fast instead of spinning. |
| Local idle and only another owner's live claim exists | Wait without claiming it; observe subsequent snapshots. |
| A claim is expired | Let the queue watchdog atomically fail it at attempts >=3 or re-pend it below 3, then continue draining. |

The coordinator schedules the next wake-up no later than the earliest observed
lease expiry. It must not busy-poll. The foreground worker's existing recovery
retry and the coordinator use the same 5-minute lease constant. A live claimant
can extend its lease, so there is no fixed run deadline. If pending rows cannot
be claimed because the first real fastembed/model/vec0 initialization failed,
the worker reports a distinct `initialization-failed` outcome (never ordinary
idle), and execution exits 1 with `embedding-runtime-failed`; affected
unclaimed rows stay pending and are not all stamped with the same environmental
error. Foreground run/retry and `--wait-embeddings` must not enable the existing
mass-fail-on-model-missing mode. Initialization failure after earlier committed
batches preserves those terminal states and counts for diagnostics.

Worker fatal errors abort scheduling, request cooperative batch shutdown, close
resources, and emit `embedding-runtime-failed` with exit 1. DB read/write/open
errors use `index-unavailable`; an otherwise unclassified orchestration failure
uses `operation-failed`. These errors are not converted into per-file failures
unless the worker actually committed those failures.

Public release of run/retry and the refactored wait path is **blocked** until
ADR-0011's separate replacement barrier is implemented: before any
clear/staging/promotion, the index owner must either observe a proven
cross-process drain/close of foreground and MCP embedding handles or use the
approved generation cancel/reopen protocol. Merely observing no `in_progress`
rows is not a barrier because an active worker may be between batches. Until
then the replacement path must reject an active worker before its first
destructive DB step, and the new commands must not be advertised as generally
available. This P1 contract does not pretend queue heartbeats solve replacement;
a replacement-barrier design and real-process verification are a release
precondition, not a later cleanup.

## Ctrl+C and resource ownership

The CLI Adapter owns `AbortController`/SIGINT translation. The application
coordinator receives an `AbortSignal`; queue and worker Modules do not install
process-global signal handlers.

On the first Ctrl+C the coordinator stops requesting new claims, allows the
already claimed batch (at most the existing batch size) to finish and commit,
stops heartbeats only after that batch closes, closes the worker, takes the
final snapshot through the existing DB handle, and then closes that handle. It
emits the execution result with
`interrupted: true` and exits 130, including when `remaining` is zero. It never
resets another worker's claims and never clears a queued item merely because
cancellation was requested. Repeated signals do not force-delete state or
terminate another process. An uncatchable kill can leave this process's claims
in progress; normal stale-lease recovery handles them later.

## Required verification

1. **Migration and cold start:** fresh v8 and v5/v6/v7 upgrades agree on
   `retry_count`; old explicit-column queue operations preserve it; read-only
   status does not change any DB/schema/WAL file or invoke migration. Two real
   processes starting run against one v7 fixture both pass migration and enter
   drain without replaying DDL. Two real workers starting against a cold DB
   both observe one valid vec table rather than reporting table-exists as an
   environment failure.
2. **Snapshot:** mixed current/historical rows in every status, orphan paths,
   exact stale threshold, disabled worker, readiness failures, and pre-v8 null
   retry history produce exact JSON and reasons. Assert `additionalProperties`
   are not silently introduced by golden comparisons.
3. **Retry transaction:** previous error/finish time survive pending and claim;
   attempts follow 3 -> 4; success clears error; failure replaces it; stale
   attempts-4 claims fail rather than re-pend; historical failures are never
   selected; racing retry/claim transitions cannot resurrect in-progress/done.
4. **Current-vector safety:** old/current hash claims finish in both orders;
   historical rows never touch vec; a row superseded after claim is rechecked
   in the terminal transaction and cannot DELETE/INSERT. H1 with a stored
   vector followed by current empty or unreadable H2 commits done and deletes
   H1's vector without inserting; a historical H2 does not touch vec. Assert
   the only stored vector is the current hash's content, including MCP as well
   as foreground.
5. **SQLite contention:** force two connections into the same deferred-snapshot
   interleaving and prove immediate/atomic claims avoid `BUSY_SNAPSHOT` item
   corruption; busy timeout/retry exhaustion is not marked as a file failure.
6. **Drain completion:** two real worker processes interleave claims; local idle
   with a foreign live claim waits; newly enqueued work before the final
   snapshot is consumed; the final result's local counters and global remaining
   are independently asserted. Batch terminal updates that lose ownership are
   counted once at most; idle/progress messages never inflate session totals.
7. **Failures/interruption:** first model/vec0 initialization failure is typed
   and leaves unclaimed rows pending rather than idle-spinning or mass-failing;
   environment failure after committed batches preserves their results; local
   and pre-existing current failure exit 1, historical terminal failure alone
   does not, and empty/retry-zero cases follow this contract. Ctrl+C after a
   claim commits only the active batch, stops heartbeat, closes the worker,
   snapshots through the open DB, closes the DB, and exits 130. No foreign
   claim is modified.
8. **CLI and release gate:** built-CLI stdout parses directly for every result
   and error; stderr carries progress/remediation; text and JSON have equivalent
   outcomes; status and execution use the same vec0 resolver and reject
   directory/unreadable candidates at every source, with an invalid explicit
   override diagnosed rather than bypassed; status never loads vec0 or
   the model. Run/retry E2E uses an isolated real fixture, and DB replacement
   remains a negative/fail-closed test until its separate protocol lands. The
   release gate proves an active foreground and an active MCP worker each block
   rebuild before any clear/staging/promotion, including a worker momentarily
   between batches; no command is released behind a mere documentation warning.

## Deferred

Permanent queue watching, a global deadline, automatic failed-item retry,
multi-error audit history, historical-row cleanup, semantic KNN/fusion, and the
DB generation cancel/reopen protocol are outside this contract.
