---
doc-kind: contract
authority: primary
authority-id: DES-cli-p1-modularity-explore-v1
bounded-question: "What module interfaces, dependency directions, resource ownership, and migration slices must the CLI and shared Explore blast-radius extraction preserve?"
version: v1
date: 2026-10-30
---
# CLI P1 Modularity and Shared Explore Contract v1

Status: approved design; implementation pending. This is a behavior-preserving
module boundary, not a second CLI framework or a universal graph repository.
P0 safety fixes remain independently landable before this refactor.

## Vocabulary and dependency direction

A **Module** owns one business capability and its policy. An **Interface** is
the callable and testable Seam between its caller and that policy; it includes
inputs, structured results, errors, and lifecycle, not merely a TypeScript type.
An **Implementation** fulfills that Interface. An **Adapter** translates a
transport or platform (Commander, stdio, MCP, SQLite, worker thread, process)
at the boundary.

Dependencies point inward:

```text
src/bin/zcodegraph.ts
  -> src/cli/program.ts
     -> src/cli/commands/* (Commander registration + thin Adapters)
        -> src/application/* | src/explore/*
        -> src/cli/renderers/*
        -> src/cli/runtime.ts (IO, errors, signals, resource scope)

src/mcp/tools.ts (MCP Adapter)
  -> src/explore/* and existing application/domain Modules

application/domain Modules
  -> narrow platform ports and existing CodeGraph/domain capabilities
  -x-> Commander, console, process.exit, CLI/MCP response formatting
```

There is no import from application/domain code into `src/bin`, `src/cli`, or
`src/mcp`. Existing `src/mcp/explore-planner.ts` and
`src/mcp/explore-renderer.ts` are **not merely renamed**: their behavior is
preserved while policy/I/O are separated as specified below. The planner's
budget import from `mcp/tools.ts` is removed, not carried into shared code.
Compatibility re-exports, if needed, are temporary and contain no policy. New
shared policy must not live under a transport directory.

## CLI Interfaces

The executable remains a small process bootstrap. It creates the runtime,
registers the program, awaits `parseAsync`, applies the returned exit code, and
flushes output. Command actions do not call `process.exit`, print through
`console`, or own global handlers. Commander's own help and usage behavior,
including exit 1, stays compatible.

The following Interfaces extend the **existing** `src/cli/command-context.ts`
Seam (`CommandContext`, `CommandResult`, `CommandOutput`, `CommandError`,
`OutputStream`, `writeCommandOutput`). P1 does not introduce a parallel CLI
runtime vocabulary. Existing fields and helper behavior remain until their
consumers migrate; new capabilities are added compatibly or through narrowly
scoped sibling ports, with obsolete exit-in-command paths removed in slice 6.

```ts
interface CliRuntime {
  readonly io: {
    stdout: OutputStream;
    stderr: OutputStream;
    readonly interactive: boolean;
  };
  readonly env: NodeJS.ProcessEnv;
  readonly cwd: string;
  readonly now: () => number;
  readonly signals: SignalAdapter;
  withResources<T>(run: (resources: ResourceScope) => Promise<T>): Promise<T>;
}

interface SignalAdapter {
  // Exactly one owner per foreground command; removal is deterministic.
  attach(onInterrupt: () => void): { dispose(): void };
}

interface ResourceScope {
  defer(dispose: () => void | Promise<void>): void;
  // LIFO, idempotent, awaited in both success and failure paths.
}

interface OperationCommandContext extends CommandContext {
  readonly io: CliRuntime['io'];
  readonly env: NodeJS.ProcessEnv;
  readonly now: () => number;
  readonly signal: AbortSignal;
  readonly resources: ResourceScope;
}

type CommandOutcome<T> = {
  body: T;
  exitCode: 0 | 1 | 130;
};

interface CommandAdapter<I, T> {
  execute(input: I, context: OperationCommandContext): Promise<CommandOutcome<T>>;
}
```

The existing `CommandResult` maps an outcome to `CommandOutput`; its numeric
exit code is narrowed at these new Adapters to 0/1/130. The existing optional
`CommandError.code` is required for machine failures at these boundaries, with
`cause` internal only and never blindly serialized. `CommandError` may be a
discriminated result or typed exception at the Module boundary; the CLI Adapter
alone maps it to P0's envelope or text remediation. Raw exceptions never become
success JSON. A completed health/queue execution is an ordinary
`CommandOutcome`, including non-passing exit 1 and interrupted exit 130.
Rendering does not determine the exit code. `createProcessContext` and
`writeCommandErrors` are migrated away from console/stdout diagnostics as part
of the consuming slice rather than retained as a second output route.

A renderer is a pure function `(body) => string`; it performs no DB, filesystem,
environment, subprocess, or process calls. JSON rendering uses the command's
registered object, `JSON.stringify`, and one trailing newline. Text and JSON
are alternative renderings of the same result, not separately computed command
flows. Progress uses an injected diagnostic sink and is suppressed on stdout
for JSON; long-lived interactive UI is confined to the Adapter.

### Directory allocation

| Location | Owns | Must not own |
| --- | --- | --- |
| `src/bin/zcodegraph.ts` | Node guards, process bootstrap, final exit | command business logic |
| `src/cli/program.ts` | Commander construction and metadata | query/index execution |
| `src/cli/commands/*.ts` | option parsing/validation, application call, renderer selection | graph traversal, queue SQL, Git construction |
| `src/cli/runtime.ts` | IO, signal and resource-scope Adapters | embedding/index policy |
| `src/cli/renderers/*.ts` | registered text/JSON shapes | process exits, retries, DB reads |
| `src/application/embedding.ts` | readiness composition, retry/drain coordination, result construction | stdout, Commander, SIGINT registration |
| `src/application/indexing.ts` | existing index/sync orchestration under the P0 lease | ANSI UI, process exit |
| `src/application/query.ts` | existing query/callers/callees/impact operations | Commander and JSON |
| `src/application/reports.ts` | affected/dead-code/health/churn composition | file/stdout transport |
| `src/application/lifecycle.ts` | install/uninstall/uninit/status/doctor/unlock composition | interactive prompts, process exit |
| `src/explore/*` | plan, blast radius, Markdown Explore Answer | MCP envelopes and CLI process behavior |

The `application/*` files may be split further when a vertical slice becomes
too large; they are not destinations for miscellaneous helpers. Installers may
retain existing implementation modules behind the application Interface rather
than being rewritten for symmetry.

### Resource and platform ports

Each operation owns its resources through one scope. Graph/DB handles, file
watchers, worker runners, subprocess delegates, timers, and signal attachments
are registered when acquired and disposed in LIFO order. An inner helper
borrows its caller's resource/lease; it does not close or reacquire it.
Foreground embedding closes its own worker, then takes its final snapshot and
closes its DB. Index lease release follows all Rust/TypeScript delegates and
embedding-enqueue work, as required by ADR-0011.

Read-only status uses a dedicated SQLite inspection Adapter with explicit
read-only opening and consistent read transactions; it must not call
`DatabaseConnection.open`, configure WAL, or run migrations. Retry/write paths
use a separate explicit migration/write Adapter. No production code bypasses
these ports by opening a second hidden connection merely to inspect completion.

Environment access is read once into command context or an operation-specific
options object. Clock and timers are injectable for lease/interruption tests.
Fastembed/vec0 remain worker/platform concerns and are never loaded by a
renderer or by status.

## Explore application composition

The shared Explore composition is a Module used by both CLI and MCP Adapters:

```ts
interface ExploreApplication {
  explore(
    graph: CodeGraph,
    query: string,
    options: { maxFiles?: number; runtime: ExploreRuntimeOptions },
  ): Promise<ExploreAnswer>;
}

type ExploreAnswer =
  | { kind: 'empty'; text: string }
  | { kind: 'answer'; markdown: string };

interface ExploreRuntimeOptions {
  adaptiveEnabled: boolean;
  lineNumbersEnabled: boolean;
  elidedMarkersEnabled: boolean;
  tightSmallProjectBudgetEnabled: boolean;
}

interface ExploreRenderModel {
  plan: ExplorePlan;
  flow: FlowSpine;
  blastRadius: string;
  // Materialized graph/source/stats evidence and normalized options required
  // by the existing formatting policy; exact internal fields are not public.
}

function renderExploreAnswer(model: ExploreRenderModel): string;
```

The default implementation performs only the existing sequence: plan, empty
check, budget-gated blast radius, materialize evidence/render model, render.
The CLI opens/closes its graph and writes `text`/`markdown`; MCP uses its
long-lived graph and wraps the same string in `ToolResult`. Neither Adapter
reimplements planning, blast-radius, evidence loading, or formatting policy.
This P1 composition does not add a new MCP tool, a JSON Explore mode, or new
planner/rendering semantics.

`ExploreRenderModel` is an internal completed-data contract, not a reason to
read the whole repository. The evidence Module preserves the existing bounded
candidate order and materializes no more source candidates than the existing
`maxFiles <= 20` loop could visit. It uses narrow graph/stats/source ports and
preserves current missing-file, read-error, registration-snippet, and stats
fallback behavior. Callback evidence, polymorphic/family lookups, named-node
and outgoing-edge lookups, source lines, project-size stats, and optional
registration snippets must be in the model before the pure renderer is called.
The renderer no longer receives `CodeGraph`, a filesystem root to read from,
or an environment object.

Move `getExploreOutputBudget` and `tightSmallProjectBudgetEnabled` policy to a
shared Explore budget Module. The budget Module receives
`tightSmallProjectBudgetEnabled` as data rather than reading the environment.
`src/mcp/tools.ts` may temporarily re-export the shared function without adding
policy. `ZCG_ADAPTIVE_EXPLORE`, `ZCG_EXPLORE_LINENUMS`,
`ZCG_EXPLORE_ELIDED_MARKERS`, and `ZCG_EXPLORE_TIGHT_SMALL_PROJECT` are parsed
exactly once per operation by the CLI/MCP Adapter into the required
`options.runtime` argument and passed through plan/evidence/render-model
composition. A long-lived MCP Application must not capture startup values for
later calls, and no shared Module reads them lazily partway through rendering.
Same-fixture comparisons pin all four settings, including two consecutive calls
on one MCP Application with changed runtime options.

This slice deliberately preserves the existing `maxFiles` acceptance domain:
the CLI Adapter retains decimal `parseInt` followed by its current lower clamp;
MCP passes its numeric value; the shared planner applies the current
`clamp(value, 1, 20)`. Fractional numeric input and the legacy NaN propagation
are not silently converted into new validation errors in this behavior-
preserving slice. Making `maxFiles` strictly finite/integer or rejecting legacy
strings requires a separate explicitly approved compatibility change and
golden-update rationale; it is not implied by the generic numeric-option
recommendation in the Composer Plan.

## Shared blast-radius Module

Create `src/explore/blast-radius.ts` for computation and
`src/explore/blast-radius-renderer.ts` for its Markdown section. Computation
returns data; it does not pre-format a string inside each transport.

```ts
interface ExploreCallerLookup {
  getCallers(nodeId: string): Array<{ node: Node }>;
}

interface ExploreBlastEntry {
  entryNode: Node;
  callerCount: number;          // unique caller nodes, not unique files
  callerFiles: string[];        // unique non-test paths, discovery order
  testFiles: string[];          // unique test paths, discovery order
}

interface ExploreBlastRadius {
  entries: ExploreBlastEntry[];
}

function buildExploreBlastRadius(
  graph: ExploreCallerLookup,
  subgraph: Subgraph,
): ExploreBlastRadius;

function renderExploreBlastRadius(result: ExploreBlastRadius): string;
```

The production implementation injects the existing shared `isTestFile`
predicate at module composition or imports that one canonical predicate; no
second pattern list is introduced. `ExploreCallerLookup` is deliberately
narrow. The full `CodeGraph` is structurally usable, while tests can supply a
small fake without constructing a DB.

Computation freezes the current behavior:

1. Select `subgraph.entryNodes`, resolve nodes from `subgraph.nodes`, keep the
   existing meaningful-kind set, and cap at the first 5 before caller lookup.
2. For each selected entry, call `getCallers` once. Preserve the existing
   per-entry skip if that lookup throws; do not turn one unavailable entry into
   a fabricated zero-caller result.
3. Deduplicate caller nodes by ID in returned order. `callerCount` counts those
   unique nodes. Skip the entry if there are none.
4. Normalize `\` to `/`, deduplicate caller file paths in discovery order, and
   partition with the canonical `isTestFile`. Do not add sorting.
5. Skip the whole Markdown section for no entries. The renderer uses the first
   4 non-test paths and first 4 test paths, existing `+N more`, singular/plural,
   no-covering-tests warning, heading, blank lines, and trailing newline
   exactly as before. The caps are Module constants, not CLI/MCP options.

`includeBlastRadius === false` bypasses the Module entirely and passes an empty
section into the render model. Otherwise the composition computes
`renderExploreBlastRadius(buildExploreBlastRadius(...))` before calling the
pure answer renderer. No file contents, extra callers, transitive impact
traversal, or new risk score are added. This module is distinct from
`affected`'s file-level transitive blast radius.

## Vertical migration order

Every slice is independently buildable and revertable. Moving code without
changing behavior is not evidence by itself; each slice adds its consumer seam
and golden tests in the same change.

| Order | Slice and exit condition |
| --- | --- |
| 0 | Land P0 Git/output and OS-lock fixes against current CLI where practical. Freeze command help and golden stdout/stderr/exit fixtures before moving orchestration. |
| 1 | Extract shared Explore budget/plan/evidence/render-model composition and blast-radius Module; make the answer renderer pure; migrate CLI and MCP to `ExploreApplication`. Require shared-payload equality, then delete both private copies. |
| 2 | Add embedding v8, retry/drain coordinator, status/read-only Adapter, and `status/run/retry-failed` CLI vertical slice. Keep index enqueue-only defaults and delegate `--wait-embeddings` to the same coordinator without changing its existing enqueue phase. |
| 3 | Migrate `query`, `files`, `callers`, `callees`, `impact`, and `affected` one command at a time. Reuse the P0 Git range Module; do not duplicate it in an application service. |
| 4 | Migrate read-only status/doctor/dead-code/health/churn/badge/visualize composition and renderers. Preserve each command's distinct output and file-write semantics. |
| 5 | Migrate index/sync and then lifecycle/install/unlock. These are last because bootstrap, interactive UI, native delegates, operation lease, replacement barriers, and process lifetime have the widest blast radius. |
| 6 | Remove compatibility forwarding and dead helpers only after all command goldens, built-CLI smoke, and full regression suites pass. Generate/check command metadata against the 23-product-command inventory without auto-rewriting docs. |

Slices 1 and 2 may be designed in parallel, but neither may weaken the P0 lock
or DB replacement barrier. A slice that only relocates a 500-line function into
an `application` file while leaving transport/global resource coupling is not a
completed modularization slice.

## Required verification and rollback

1. Unit-test application Modules with fake narrow ports, including typed
   failures and non-passing outcomes. Unit-test renderers independently with
   exact object/byte snapshots; no renderer may touch process or storage.
2. Before extraction, pin CLI and MCP Explore fixtures for no entries, no
   callers, caller/query failure, duplicate callers/files, >5 roots, >4 files,
   Windows separators, test/non-test partitions, all four runtime-option
   settings, missing/unreadable sources, callback registration fallback,
   unavailable stats, and legacy maxFiles edge cases. After extraction, assert
   the shared `ExploreAnswer.text`/`markdown` payload consumed by MCP is
   byte-identical to the payload selected by CLI. The CLI transport may append
   exactly its existing single console newline; compare that separately rather
   than requiring transport bytes to be identical. Assert the renderer has no
   graph/filesystem/environment/stats dependency and neither Adapter retains
   reimplemented planning, evidence, or blast-radius policy.
3. Spawn the built CLI for every migrated command and assert help, direct JSON
   parsing, text output, stderr, and exit codes. Resource-failure tests prove
   LIFO/idempotent cleanup and no signal-handler/listener leak across repeated
   invocations.
4. Run affected existing suites and TypeScript build after every vertical
   slice; run full Vitest and 23-command smoke before removing the final
   compatibility layer. Do not claim a performance improvement without a
   separately measured baseline.
5. Stop on golden drift, an unregistered output field, a new process exit in an
   application Module, resource leakage, or deleted negative safety coverage.
   Revert only the current slice's code/tests/docs; preserve prior approved
   slices and uncommitted work, and never roll back by deleting a real index.

## Deferred

Replacing Commander, a plugin command system, a universal repository/UoW
abstraction, automated publication of documentation, semantic-search changes,
and wholesale rewriting of indexing algorithms are not part of this contract.
