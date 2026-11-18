---
doc-kind: contract
authority: primary
authority-id: DES-universal-structural-explore-v1
bounded-question: "How must Explore compose and deliver auditable structural evidence across Flask, Django, Express, Gin, and Spring without repository-specific query policies?"
decided-by:
  - "1-9"
version: v1
date: 2026-11-18
---
# Universal Structural Explore Contract v1

Status: approved design; implementation and production admission pending.
This contract authorizes a redesign of Explore's evidence composition, not a
claim that the redesigned capability is implemented, correct, fast, or ready
for default use. Existing experiment defaults, evaluation budgets, and release
gates remain independently binding.

## Purpose and outcome

The product outcome is one existing `explore` capability that answers
structural/flow questions across languages and frameworks with enough source
and relationship evidence to avoid recovery through generic Read/Grep. The
five development repositories are Flask, Django, Express, Gin, and Spring
PetClinic at their separately reviewed fixed commits. They exercise different
boundaries; none may receive a query-specific implementation.

The optimization target is Agent Sufficiency, tool-call count, and wall-clock
latency, not minimum token consumption. A small response that omits a required
mechanism is a failure, not an optimization.

The design replaces this coupling:

```text
query -> file ranking -> renderer graph/filesystem reads -> final text cut
```

with:

```text
CLI / MCP Adapter
  -> shared ExploreApplication
     -> fixed read snapshot
     -> query anchors + bounded EvidenceGraph expansion
     -> typed traces + explicit residuals
     -> EvidenceRequirement ledger
     -> source materialization + global budget allocation
     -> completed ExploreRenderModel
  -> pure renderer -> one answer payload
```

No new MCP tool, graph query DSL, runtime LLM, remote reranker, or framework
query-rule pack is introduced.

## Module and external Interfaces

`ExploreApplication` is the only application Module consumed by CLI and MCP.
Its implementation hides anchor discovery, graph expansion, path composition,
source requirements, budget allocation, and diagnostics. These stages are not
public agent tools or transport responsibilities.

```ts
interface ExploreApplication {
  explore(
    graph: CodeGraph,
    query: string,
    options: ExploreOptions,
  ): Promise<ExploreResult>;
}

interface ExploreOptions {
  maxFiles?: number;
  runtime: ExploreRuntimeOptions;
  delivery: ExploreDeliveryOptions;
  signal?: AbortSignal;
}

interface ExploreRuntimeOptions {
  adaptiveEnabled: boolean;
  lineNumbersEnabled: boolean;
  elidedMarkersEnabled: boolean;
  tightSmallProjectBudgetEnabled: boolean;
}

interface ExploreDeliveryOptions {
  maxOutputUtf8Bytes: number;
  transportReservation: {
    utf8Bytes: number;
    minimumErrorUtf8Bytes: number;
  };
}

type ExploreResult =
  | ExploreAnswer
  | { kind: 'failed'; code: ExploreFailureCode; text: string };

type ExploreAnswer =
  | { kind: 'empty'; text: string; report: ExploreReport }
  | { kind: 'answer'; markdown: string; report: ExploreReport };

type ExploreFailureCode =
  | 'aborted'
  | 'invalid-input'
  | 'snapshot-lost'
  | 'graph-unavailable'
  | 'source-unavailable'
  | 'source-changed'
  | 'source-too-large'
  | 'budget-exhausted';

interface ExploreReport {
  status: 'complete' | 'partial' | 'no-evidence';
  snapshot: SnapshotIdentity;
  coverage: CoverageLedger;
  omissions: EvidenceGap[];
  diagnostics: ExploreDiagnostic[];
  workBudgetFingerprint: string;
}

function renderExploreAnswer(model: ExploreRenderModel): ExploreAnswer;
```

The current `explore` tool name and request identity remain. `maxFiles` is a
limit on detailed delivered files, not permission to stop discovering a path
through other files. A canonical file counts at most once; delivering any full
or signature-degraded source atom counts one detailed file, while an omitted
location/gap counts zero. Compatibility parsing at each transport remains
governed by the P1 migration slice; the new implementation must not silently
reinterpret legacy input while extraction is underway. Transport adapters parse
runtime options once per operation, own process/MCP envelopes and graph
lifetime, and never reimplement evidence policy.

The renderer receives only completed data. It cannot receive `CodeGraph`, a
project root used for reads, environment access, or a second source-selection
policy. Markdown is one projection of the render model. The report is internal
until a separate additive ToolResult/metadata compatibility review; exposing it
must not change the request identity, add a tool, or bypass the delivery cap.

The migration uses the P1 result and string-returning renderer in slice 1. Slice
2 adds an internal report without changing legacy composition. Slice 4 switches
to this complete result interface. Cancellation and failure codes at the new
boundary are explicit rather than bare exceptions: CLI preserves its existing
signal/exit-130 behavior, MCP maps operation cancellation to its protocol
lifecycle, and shutdown cancels only the affected operation before awaiting it.
Ports observe `signal` at phase and batch boundaries and around asynchronous
source reads; synchronous SQLite work is bounded rather than claimed to be
interruptible midway.

### Internal platform ports

Two real production adapters and their in-memory test counterparts justify
these internal seams. They are not exposed to agents:

```ts
interface ExploreGraphRead {
  openSnapshot(signal?: AbortSignal): Promise<ExploreReadSnapshot>;
}

interface ExploreReadSnapshot {
  readonly identity: SnapshotIdentity;
  searchAnchors(
    query: NormalizedQuery,
    signal?: AbortSignal,
  ): Promise<AnchorMatch[]>;
  nodes(
    ids: readonly string[],
    signal?: AbortSignal,
  ): Promise<GraphNode[]>;
  expand(
    requests: readonly ExpansionRequest[],
    signal?: AbortSignal,
  ): Promise<ExpansionResult[]>;
  close(): Promise<void>;
}

interface SnapshotIdentity {
  projectId: string;
  databaseGeneration: string;
  readViewId: string;
  schemaVersion: number;
}

interface ExploreSourceRead {
  acquire(
    requests: readonly SourceReadRequest[],
    signal?: AbortSignal,
  ): Promise<SourceAcquisition>;
}

interface SourceAcquisition {
  readAtom(atomId: string): Promise<SourceReadResult>;
  close(): Promise<void>;
}

interface SourceReadRequest {
  id: string;
  snapshot: SnapshotIdentity;
  path: string;
  expectedContentHash: string;
  atoms: readonly SourceAtomRequest[];
}

interface SourceAtomRequest {
  atomId: string;
  requirementIds: readonly string[];
  range: SourceRange;
}

type SourceReadResult =
  | {
      kind: 'ok';
      atomId: string;
      actualContentHash: string;
      atom: MaterializedAtom;
    }
  | {
      kind: 'error';
      atomId: string;
      error:
        | 'not-found'
        | 'unreadable'
        | 'outside-root'
        | 'too-large'
        | 'changed'
        | 'snapshot-lost'
        | 'aborted';
    };
```

`CodeGraph`/SQLite is the graph adapter; the root-confined local filesystem is
the source adapter. `openSnapshot` owns one consistent SQLite read view and all
node, edge, file and unresolved-reference reads belong to it. Reopen, database
replacement or read-view invalidation returns `snapshot-lost`; the adapter never
continues transparently against a new connection. The view closes in `finally`.
This is not a distributed graph/filesystem transaction: source freshness comes
from the fixed indexed identity plus per-file content-hash verification.

The graph port batches adjacency reads and exposes existing facts without
exposing SQL to policy. The source port enforces lexical and symlink-aware root
containment, acquires each canonical selected file at most once per operation,
and matches atoms by stable ID rather than completion order. `SourceAcquisition`
owns the verified immutable content/hash, permits overlapping atom requests to
share that acquisition, and closes in `finally`; its reads do not depend on
later budget winners. A logical-atom failure affects its linked requirements,
not unrelated valid atoms in the same file. `changed` forbids both new text at
old locations and presenting an indexed signature as current. Each failure
becomes `source-unavailable`, `source-changed` or `source-too-large`; with no
usable evidence it is a failure, not `no-evidence`. An indexed signature
fallback must carry that snapshot identity and degraded freshness provenance,
never current-source certainty. Content changes use `source-changed`;
`source-unavailable` covers not-found, unreadable and outside-root acquisition.
The acquisition reuses the indexing `hashContent` SHA-256 convention over
decoded source text, so byte-level output caps and content identity remain
separate concerns. With some verified evidence, atom failures retain their
specific requirement gaps and the answer is `partial`. With no usable evidence,
the operation is `failed`; the first error in canonical atom request order
supplies `source-changed`, `source-too-large`, `source-unavailable`,
`snapshot-lost` or `aborted` as the top-level code. No failure is relabelled
`no-evidence`. The outcome priority below also covers graph, budget and input
failures that cannot produce a usable answer.

## Evidence model

The common unit is an **Evidence Requirement**, not a ranked file. A requirement
is an anchor definition, a selected path node or relation, a
relationship/registration site, a condition/state/exception role, or explicitly
requested supporting context. Every requirement has a stable identity,
provenance, optional source obligation and returned/degraded/omitted
disposition.

Production query parsing creates normalized **Query Obligations** from explicit
symbols, endpoints, mechanism terms and requested relationships. These are not
framework-name rules and cannot invent unspecified source paths. Failure to
normalize a requested mechanism, branch or relationship creates a
`query-interpretation` gap and `partial`, never an artificially complete
subset. Development acceptance separately derives independently versioned
obligations from the Human-reviewed task specification; that oracle is not an
input to retrieval, ranking, selection or rendering. Closing only the
requirements the algorithm happened to select cannot establish completeness.

```ts
type EvidenceCertainty = 'observed' | 'resolved' | 'inferred' | 'ambiguous';

type EvidenceRole =
  | 'definition'
  | 'invocation-site'
  | 'registration-site'
  | 'scheduling-site'
  | 'condition'
  | 'state-mutation'
  | 'alternative-branch'
  | 'exception-branch'
  | 'external-terminal'
  | 'supporting';

interface QueryObligation {
  id: string;
  role: EvidenceRole;
  endpoint?: SymbolIdentity;
  required: boolean;
  requirementIds: string[];
  disposition: 'satisfied' | 'degraded' | 'unresolved' | 'omitted';
  gapId?: string;
}

interface EvidenceRelation {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  kind: EdgeKind;
  semantics:
    | 'direct-call'
    | 'conditional-branch'
    | 'registration'
    | 'scheduling'
    | 'potential-dispatch'
    | 'external-terminal'
    | 'non-execution';
  certainty: EvidenceCertainty;
  provenance: EdgeProvenance;
  site?: SourceLocation;
  residuals: ResidualRelation[];
}

interface EdgeProvenance {
  origin?: Edge['edgeOrigin'];
  resolver?: string;
  synthesizedBy?: string;
  registeredAt?: SourceLocation;
  source?: SourceLocation;
  candidates?: readonly SymbolIdentity[];
}

interface TracePath {
  id: string;
  status: 'connected' | 'partial';
  steps: TraceStep[];
  requiredRelationIds: string[];
}

interface TraceStep {
  relationId: string;
  semantics: EvidenceRelation['semantics'];
  guards: readonly SourceLocation[];
}

interface EvidenceRequirement {
  id: string;
  obligationIds: readonly string[];
  kind: 'anchor' | 'path-node' | 'path-relation' | 'relationship-site' | 'supporting';
  role: EvidenceRole;
  requirement: 'required' | 'supporting';
  relationId?: string;
  provenance: EdgeProvenance;
  source?: SourceLocation;
  atomId?: string;
  disposition: 'returned' | 'degraded' | 'omitted';
  reasonCode?: string;
  gapId?: string;
}

interface RenderedClaim {
  id: string;
  requirementIds: readonly string[];
  relationIds: readonly string[];
  modality: 'observed' | 'conditional' | 'potential' | 'ambiguous';
}

interface CoverageLedger {
  status: 'complete' | 'partial' | 'no-evidence';
  dispositions: Readonly<Record<string, EvidenceRequirement['disposition']>>;
  selectedRequirements: number;
  returnedRequirements: number;
  degradedRequirements: number;
  omittedRequirements: number;
  obligations: readonly QueryObligation[];
  gaps: EvidenceGap[];
  searchExhausted: boolean;
  selectedEvidencePreserved: boolean;
}
```

`SymbolIdentity` includes receiver/container, source location and, when
available, parameter types/arity so same-name methods and overloads are not
interchangeable. Every final semantic claim links to its requirement/relation
IDs; missing links fail development acceptance. Requirements sharing an atom
have separate dispositions but its bytes are allocated once.
`selectedEvidencePreserved` means no selected required requirement silently
disappeared; a supporting omission is recorded and does not by itself make it
false. For a required obligation, derive its disposition in this exact order:
missing links/unresolved evidence means `unresolved`; otherwise any `omitted`
means `omitted`; otherwise any `degraded` means `degraded`; otherwise all
`returned` means `satisfied`. For a supporting obligation, fully returned
evidence means `satisfied`; otherwise it is `degraded` or `omitted` with its
gap, and cannot make a required answer complete by substitution.

Result states are mutually exclusive and checked in this order:

1. An unrecoverable input/graph/source/snapshot/abort/budget failure with no
   usable answer is `failed`.
2. `empty`/`no-evidence` means no discovered anchor, no returned or degraded
   evidence, no required `query-interpretation` gap and no such failure.
3. `answer`/`complete` means every required query obligation is satisfied, all
   its required requirements are strictly `returned`, and no required gap
   exists. It may contain recorded supporting omissions.
4. Every other non-failed outcome, including an identified anchor whose
   evidence is entirely budget-omitted or a zero-anchor query-interpretation
   gap, is `answer`/`partial` with concrete machine-readable gaps.

The first implementation attempts to map existing `Node`, `Edge`, `FileRecord`,
`unresolved_refs`, and edge metadata without a parallel graph database. This is
a feasibility goal, not a guarantee that current facts suffice. Relation
identity is a deterministic composite of endpoints, kind/semantics, source
site, origin/resolver and candidate identity; collisions retain distinct site
and candidate identities rather than last-write-wins. The adapter normalizes
legacy metadata into `EdgeProvenance`; missing provenance stays unknown.

`observed` denotes a direct AST/source fact; `resolved` requires deterministic,
uniquely supported resolution, not merely a high confidence score; `inferred`
denotes an identified static heuristic; `ambiguous` retains alternatives. A
heuristic edge never becomes an observed runtime call by ranking highly.
`contains`, `imports`, and generic `references` can assist discovery but cannot
alone prove execution order. Registration/scheduling cannot be flattened into a
plain direct `calls` step. If discarded alternatives, registration provenance
or relation identity cannot be reconstructed from the fixed snapshot, the
adapter records a graph-semantics blocker. Any required resolver/index or
schema change is separately reviewed; it is not hidden in a query renderer.

Language/framework adapters remain at indexing and semantic enrichment seams.
They produce graph facts and residuals; they never see the prompt, rubric,
expected file list, task identity, or acceptance anchor list. Adding a
framework must not require adding query ranking, source selection, or renderer
logic. A missing graph fact is a graph-semantics blocker, not an invitation to
invent a query-time path. Only observed local control flow may be rendered as
an ordered local trace. Conditional paths retain guards; registration and
invocation remain separate; inferred/ambiguous or potential-dispatch paths say
`may reach`, never a globally actual execution order.

## Universal retrieval and trace policy

1. **Anchor discovery.** Resolve explicit symbols, qualified names, types,
   modules, routes, and file paths with bounded exact/structural searches.
   Retain a small representative set per query clue; do not let a global top-k
   eliminate an entire kind of anchor. Ordinary concepts may add candidates but
   cannot be presented as uniquely named endpoints. Ambiguity is retained.
2. **Bounded expansion.** Expand both directions from anchors through typed
   relations, including relations that lead to new files. Search prioritizes
   closing obligations between anchors and resolving dispatch/state boundaries,
   not general graph centrality. Seeds, visited nodes, adjacency operations,
   rounds, and source reads have fixed implementation ceilings.
3. **Trace composition.** Select deterministic paths that cover distinct
   anchors and mechanism roles. Preserve alternative bounded paths when their
   semantics differ. Do not reuse the existing callable-only, calls-only,
   longest-chain heuristic as the universal trace algorithm. Do not run an
   unconstrained all-pairs/Steiner search.
4. **Requirement closure.** Before selecting output, close every required
   query obligation through its definitions, invocation, registration and
   scheduling sites, relevant guards, state mutations and alternative/exception
   branches. Register every selected path node, path relation and source site.
   An unsatisfied obligation cannot be repaired by dropping it from selection.
   An edge with no usable site may remain a graph assertion, but its provenance
   and missing-site gap must be visible.
5. **Source materialization.** Read only source obligations and selected
   supporting evidence. Use exact indexed symbol/relationship spans and merge
   overlapping spans. Containers do not implicitly pull an entire class/file.
   Verify indexed content hash against the selected current content. Never
   attach changed source to old line numbers or call mixed snapshots complete.
6. **Residuals.** No path, search-limit, unresolved/ambiguous dispatch,
   external boundary, source unavailable/changed, and budget exclusion are
   different states. Search exhaustion is not path absence; an external
   terminal is not a missing local implementation.

The same algorithm and policy instance serves all five repositories. No branch
may inspect a repository/framework name to select a candidate, weight, required
file, trace, or budget exception.

```ts
interface ExploreWorkBudget {
  maxSeeds: number;
  maxUniqueVisitedNodes: number;
  maxAdjacencyRows: number;
  maxRounds: number;
  maxCanonicalSourceReads: number;
}
```

These limits are centralized immutable implementation configuration, not
transport knobs. Their values and fingerprint are reported; changing them is a
reviewed semantic change, not a way to force a fixture to pass. A repeated
request or cache hit does not consume another unique visit/read; every returned
adjacency row and new discovery round counts. Work exhaustion stops discovery,
preserves selected requirements, and adds a `search-limit` gap to each
unclosed obligation. It never deletes already selected evidence or declares
path absence. Ties use policy priority, normalized path, qualified symbol
identity and stable node/relation ID. Requirements, traces, gaps and atoms are
canonically reordered after asynchronous batches, so batch partitioning, cache
hits and completion order cannot change the answer.

## Output budget and lossless accounting

Search/work limits and delivery limits are separate. Search limits bound graph
work; they cannot retroactively delete an already selected requirement without
a gap. The delivery unit is **UTF-8 bytes**, not JavaScript UTF-16 length. The
cap covers the agent-visible transport text body: reserved worktree/staleness
notices, headers, flow, source fences, line numbers, serialized diagnostics and
omission notices, plus the optional single CLI newline. It excludes protocol
framing outside that body. Each adapter freezes its notices and supplies their
exact reservation before application allocation; notices cannot be appended
afterward without accounting. Application and transport both verify the final
composed cap. Any future structured content/metadata counts toward the same
declared transport budget. Each existing tier's `maxOutputChars` becomes an
equal-valued UTF-8 byte ceiling, which is conservative for non-ASCII text and
does not enlarge delivery capacity. Per-file character windows are migrated to
atom-level byte costs without granting additional total capacity.

The allocation arithmetic is:

```text
actualNoticeBytes <= transportReservation.utf8Bytes
applicationBodyAllowance =
  maxOutputUtf8Bytes
  - transportReservation.utf8Bytes
  - optionalCliNewlineBytes

actualComposedBytes =
  actualNoticeBytes + actualBodyBytes + optionalCliNewlineBytes
  <= maxOutputUtf8Bytes
```

The reservation is an allowance, not a requirement to pad the final notice.
`minimumErrorUtf8Bytes` is the complete minimum error envelope including its
notices, separators and CLI newline; it is not subtracted again as a second
notice reservation. The adapter freezes pending/worktree inputs and clock before
the application call and computes a safe reservation from that frozen state.
The final notice derives only from that state, even if the watcher later
changes.

Allocation order is:

1. compact trace and ambiguity/gap skeleton;
2. required anchor, path-node, and relationship-site source atoms;
3. alternatives needed to preserve material ambiguity;
4. supporting context such as secondary relationships and blast radius.

A required source atom is a complete meaningful symbol or registration range,
not an arbitrary text window. It may degrade to a complete signature plus exact
source location when the full atom cannot fit; this is `partial`, never
`complete`. If the signature cannot fit, it degrades as a whole to location
plus a gap; the signature is never sliced. An oversized single atom is
reported, not sliced. Multiple required files compete in one global allocator;
there is no necessary-file exception that later encounters a final hard
ceiling. Omission notices are allocated before the source they describe.

The renderer must not truncate the assembled answer to make it fit. Allocation
uses exact rendered UTF-8 size before return, and application/final-transport
postconditions verify the cap. A fixed minimal `budget-exhausted` outcome,
containing a stable code, bounded deterministic counts and a bounded number of
stable requirement/gap IDs, handles a cap too small for the minimum skeleton;
its own envelope is size-checked and it is never `complete`. The reserved
`minimumErrorUtf8Bytes` covers this outcome and its transport notices. A cap
below that protocol minimum fails adapter validation before retrieval rather
than emitting a malformed answer. Diagnostic codes are finite enums and
arbitrary messages/paths are budgeted content. Any other cap assertion failure
is an explicit implementation failure, not a tail cut. Legacy text-cut behavior
is removed only in the slice that has replacement requirement/gap accounting.

For every selected requirement:

```text
returned + degraded + omitted = selected
```

`complete` means the normalized obligations were searched within their explicit
bounds, every required obligation was satisfied, all selected required evidence
survived with valid freshness, and no required gap exists. It does not claim
all dynamic runtime behavior is known or the whole repository was exhaustively
searched. `partial` requires concrete, machine-readable gaps and is used for
all non-failed outcomes that are neither complete nor the narrowly defined
`no-evidence` case above. Graph/source failures are never `no-evidence`.

Version 1 has no continuation token, answer session, multi-page retrieval
contract or pre-authorized new SQLite table. A narrow follow-up query may be
suggested as text, but it does not resume hidden state. Continuation requires
separate measurement and design approval.

## Five-repository development acceptance matrix

These are deterministic local product tests against fixed source commits, not
Agent/DES/pilot execution and not independent holdout evidence. Their content
source is `scripts/agent-eval/task-prompts/zra-pilot-v2-draft.mjs`, including
the 2026-11-18 Flask amendment and the same five fixed commits as frozen v1.
The slice-0 fixture records that module's immutable task IDs and SHA-256. It
remains `content-reviewed-not-registered`; using its corrected content for
local development does not register a v2 pilot or authorize paired execution.
Frozen v1 evidence remains immutable and its superseded Flask/Express wording
is not an acceptance oracle.

Each task must pass all stages: indexed anchor -> discovered anchor -> selected
trace -> materialized requirement -> rendered evidence. Each atomic semantic
expectation in the Human-reviewed rubric becomes a required development
`QueryObligation` with expected source atoms, evidence roles, relation
semantics/certainty and forbidden claims; one compound rubric sentence must not
hide an unsatisfied sub-expectation. The expected answers are an independent
oracle, never retrieval input.
A required obligation that is unselected, degraded, unresolved or omitted fails
this development gate even when the product correctly reports `partial`.
File/symbol presence alone is insufficient. Each rendered claim is checked
against its evidence links; no final text cut, unexplained omission or
fabricated runtime claim is allowed.

| Repository | Required mechanism and source evidence | Semantic negative checks |
| --- | --- | --- |
| Flask | `ctx.py`: concrete `AppContext.push/session/_get_session`; `app.py`: response hook; `sessions.py`: open/save/should-set and deletion behavior | Do not use the deprecated `RequestContext` alias as a concrete method; do not defer normal session opening to first accessor use, claim response-hook cookie serialization, or claim every non-empty session writes a cookie |
| Django | `middleware/__init__.py`: `MiddlewareMixin`; `core/handlers/base.py`: middleware registration/scheduling; `middleware/csrf.py`: request/view/reject/response methods | Do not claim the mixin directly schedules every view hook; do not drop rejection or conditional cookie refresh |
| Express | `express.js`: application/prototype creation; `application.js`: `getrouter`, handle/use and mounted wrapper restoration | The router getter is not a `lazyrouter` function; preserve external-router boundaries and do not reduce restoration to `req.app` |
| Gin | `gin.go`: HTTP entry, route miss, `Use`, `serveError`; `routergroup.go`: handler composition; `context.go`: `Next`/`Abort` | Do not claim 404 bypasses global middleware, default body always overwrites output, or Abort panics/immediately returns from the HTTP entry |
| Spring PetClinic | `PetController.java`: model loading, binders, POST/update helper and integrity-error handling; `Owner.java`: the `getPet(Integer)` entity-selection overload and `getPet(String, boolean)` duplicate-name precheck; `OwnerRepository.java`: inherited save boundary; owner-aggregate save | Do not save the submitted pet directly, invent local JPA/transaction implementation, select a same-name overload without its receiver/parameter identity, or omit URL-based owner/pet association |

For each task, all requirements asserted as part of the answer must have their
actual source evidence, not merely a matching file heading. If existing graph
facts cannot support the required semantics, the test records a graph/index
blocker; a query-specific workaround is forbidden. All five repositories are
individual hard gates; a macro average cannot hide one failure.

Each repository also needs fixed negative fixtures for a nonexistent endpoint,
an ambiguous same-name symbol, an external framework terminal, and an answer
that exceeds the old ceiling. Every fixture has a stable ID, input, expected
obligation/trace/residual outcome and forbidden structured claims. Required
controls include a same-name wrong target versus correct overload, an unrelated
receiver/route registration decoy, swapped direct-call order, missing
registration forbidding connectivity, external terminal versus unresolved local
implementation, search exhaustion versus no path, and budget exclusion
forbidding `complete`. Assertions inspect the structured model and claim
semantics, not merely gap wording or a file heading. Cross-repository fixtures
cover unreadable and changed source, missing relationship sites, Windows path
separators, non-ASCII source, and deterministic repeated output. These
diagnostic tasks have already informed development and cannot later be
relabelled as unseen acceptance tasks.

## Verification at the Interface

1. **Application seam with in-memory ports.** Prove low-ranked but path-
   necessary nodes survive, new-file bridges can be discovered, path types are
   preserved, ambiguity is not silently collapsed, obligations cannot be
   dropped to obtain `complete`, every selected requirement is
   returned/degraded/omitted with derived counts, and failures do not
   masquerade as no evidence. Verify cancellation at each port/phase boundary.
2. **Budget and renderer goldens.** Cover exact UTF-8 cap boundaries, transport
   notices, a single oversized atom/signature, several necessary large files,
   duplicate atoms, omission overhead, minimum-envelope exhaustion, no
   mid-method/Unicode/text-tail cut, and byte-identical repeated rendering.
   Mutually exclusive result goldens cover zero-anchor interpretation failure,
   nonexistent normalized endpoints, mixed degraded/omitted obligations,
   all-budget-omitted anchors and each zero-evidence source failure code.
   Renderer imports/accesses no graph, filesystem, environment, or clock. CLI
   and MCP receive the same model and markdown payload; any dynamic transport
   notice is separately bounded and injected-clock tested.
3. **Real adapters.** Small Python, JavaScript, Go, and Java fixtures verify
   node/edge/provenance mapping, composite relation identity, retained
   alternatives, batch reads, root containment, content hashes, missing source,
   snapshot invalidation and single-read-view ownership. Tests distinguish no
   node, no edge, no source, no budget and graph failure. Out-of-order batch
   completion, different batch partitioning and cache hits preserve output.
4. **Five fixed development tasks.** Emit the five-stage audit, obligation
   outcomes, per-requirement ledger and claim-evidence links for every task.
   Run all five for every semantic change; do not tune until one local case
   passes and call the feature universal.
5. **Performance.** Preserve the registered architecture-red-line harness,
   frozen corpus/queries, nine repetitions, median and re-baseline authority:
   explore <=20% and indexing <=15%. Application DB operations, files/bytes
   read, cold/warm p95 and peak RSS are diagnostic observations with raw samples
   and environment, not new hard gates without separately registered baselines,
   statistics, thresholds and owners. Slice 0 records the legacy artifact,
   environment and nine-run baseline sample; absolute targets cannot be invented
   from this design.
6. **Independent product value.** Before production admission, use new,
   independently sourced and Human-reviewed tasks not used for development.
   Preserve the accepted Agent A/B protocol, correctness non-inferiority,
   pre-registered budgets, reviewer and isolation requirements. Five-task local
   coverage is neither answer-correctness proof nor Agent Sufficiency proof.

## Migration and reversible delivery

| Slice | Deliverable and exit condition |
| --- | --- |
| 0. Freeze seams | Pin current CLI/MCP fixtures, production-vs-evaluation boundaries, legacy option behavior, v2-draft content identity and five-stage failure audit. Record legacy latency artifacts on the fixed commits using the registered nine-run measurement protocol. Do not alter the stopped C/S candidates. |
| 1. Shared application | Implement the P1 shared application, source/graph ports and pure string renderer with legacy behavior and `maxFiles` acceptance preserved. Delete duplicate transport policy. Move evaluation-only signals into a separate `EvaluationExploreProjection` owned by the harness; production plan/model/renderer neither import nor accept it. Preserve frozen C/S candidate sets and no-execution status. |
| 2. Evidence ledger | Add an internal report while keeping legacy composition. Bind new graph-adapter reads to a fixed snapshot, map requirements/provenance/residuals/freshness and derive coverage counts. Initially observe alongside legacy composition; no semantic switch. Prove every current dropped item is attributed and no report is exposed without compatibility approval. |
| 3. Trace composition | Introduce universal obligation/anchor/typed-path closure, stable work limits and deterministic ordering behind one internal implementation switch shared by CLI/MCP. Stop on graph-semantics gaps rather than adding query rules. Update tool guidance and `server-instructions.ts` when any non-default semantic switch is first exposed. |
| 4. Global source allocation | Switch to the complete result interface and delivered-file `maxFiles` meaning under the separately authorized semantic migration. Replace file-order selection and final text cut with atom-level global UTF-8 budgeting, transport-overhead reservation and structured degradation. The old and new composition must not run as two answer-producing policies in one call. |
| 5. Five-repository hard gate | Run the complete fixed matrix, negative/freshness suites, real-adapter integration, registered performance red lines and diagnostic measurements. Graph/index changes, if needed, are separate reviewed slices with their own ownership, migration, schema and Agent-Sufficiency obligations. |
| 6. Admission and cleanup | Seek independent Agent/product-value evidence and explicit Human production approval. Only then change the default, remove legacy composition, update default-on guidance and close temporary compatibility code. A roadmap-ready node is not this approval. |

Each slice is independently buildable and revertible without deleting indexes
or unrelated uncommitted work. The implementation switch selects one shared
application implementation for both transports; it is not a permanent third
retrieval policy and defaults to legacy during migration. No production switch
is introduced before the corresponding implementation slice is separately
authorized. The existing public schema's static `default: 12` is not a frozen
legacy tier; do not copy it into new goldens. Describe the actual adaptive
behavior when tool guidance is revised.

## Deferred and rejected designs

- A new `trace` MCP tool or general graph query language.
- Per-framework/per-repository query, ranking, or budget plugins.
- Runtime LLM retrieval, generated call edges, or confidence upgrades based on
  text similarity alone.
- Larger top-k/file caps/output ceilings as the redesign.
- A parallel persisted evidence graph before existing facts prove insufficient.
- Opaque continuation/session state in v1.
- Treating a statically plausible path as a proof of actual runtime execution.
- Treating deterministic five-repository success as permission to enable the
  feature, run Agent/DES/pilot work, consume reserved runs, or unblock release.

## Relationship to existing contracts

This contract deepens the Explore portion of
`DES-cli-p1-modularity-explore-v1`; the P1 behavior-preserving migration still
occurs before semantic replacement. Where P1 describes the old bounded
candidate/source behavior, that behavior governs slice 1, not the final
redesigned algorithm. P1's deferral of semantic-search changes does not block
this explicitly approved structural-evidence redesign.

`ADR-0001` and `DES-baseline-agent-sufficiency-v1` remain the product-value
north star and trigger. `DES-schema-evolution-and-mcp-tool-cap-v1` keeps the
capability inside `explore` and governs any later persistence change.
`DES-architecture-regression-baseline-v1` and the indexing performance contract
remain binding. The accepted Agent A/B protocol and its independent task,
correctness, budget, review, and release conditions are not weakened or reused
as implementation evidence by this contract.
