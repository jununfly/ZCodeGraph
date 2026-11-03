# ZJ-CONTEXT

## Domain Language

### Product Naming

**Definition:** The product, package shorthand, command names, filesystem names, and protocol keys share the ZCodeGraph/zcodegraph family.

**Use when:** Writing README copy, design docs, CLI help text, installer guidance, release notes, or agent-facing instructions.

**Rules:**
- **ZCodeGraph** — product name, GitHub repo name, package/API shorthand in prose, official documentation titles, and public-facing prose.
- **CodeGraph** — existing code identifiers such as the `CodeGraph` class.
- **zcodegraph** — the CLI command, MCP tool prefix, filesystem namespace, database filename, and MCP server key, such as `zcodegraph index`, `zcodegraph_explore`, `.zcodegraph/`, `zcodegraph.db`, and the server key `zcodegraph`.

**Not:** A generic lowercase product name. `codegraph` appears only as a legacy compatibility name or in historical references.

**Related terms:** Agent Sufficiency, Explore Answer.

### Agent Sufficiency

**Definition:** The degree to which a ZCodeGraph answer gives an agent enough code understanding to continue the task without falling back to generic file-reading or text-search tools.

**Use when:** Discussing Explore Answer quality, context planning, benchmark goals, or whether code graph information was presented in an actionable form.

**Not:** A claim that the underlying graph contains every possible code relationship. Graph completeness can contribute to sufficiency, but it is not the same thing.

**Related terms:** Explore Answer, Read/Grep Fallback.

### Rust-Owned Indexing

**Definition:** A ZCodeGraph indexing ownership state where the Rust-backed core is responsible for extracting graph facts for a language on the default `rust-hybrid` path.

**Use when:** Distinguishing which implementation path owns a source language, especially when explaining `rust-hybrid` status, doctor output, fallback taxonomy, or language support tables.

**Not:** A claim that the Rust programming language has compiler-grade semantic support. Rust-owned indexing is about which engine owns extraction, not the depth of language semantics.

**Related terms:** Rust Language Semantic Support, Semantic Frontier, Evidence Artifact.

### Rust Language Semantic Support

**Definition:** The degree to which ZCodeGraph can answer Rust programming-language questions about `.rs` files, including module paths, traits, macros, Cargo semantics, visibility, and framework route patterns.

**Use when:** Planning or describing Rust-specific graph capability and its frontiers.

**Not:** The same as `rust-hybrid`. `rust-hybrid` is an indexing engine path; Rust Language Semantic Support is the product capability for Rust code understanding.

**Related terms:** Rust-Owned Indexing, Agent Sufficiency, Bounded Slice, Semantic Frontier.

### Fallback Health State

**Definition:** The three-tier classification of rust-hybrid indexing fallback
quality: `healthy` (zero fallbacks), `partial` (only non-Rust-owned language
fallbacks — expected behavior), or `degraded` (Rust-owned parse/extraction
gaps or missing files — real problems).

**Use when:** Interpreting `fallbackState` in CLI output, status JSON, doctor
diagnostics, or deciding whether fallback diagnostics warrant investigation.

**Not:** A measure of graph completeness. `partial` means the index is complete
and usable; it only indicates that some files were indexed via TypeScript
fallback rather than the Rust core. `degraded` is the only state that signals
a real indexing problem.

**Related terms:** Rust-Owned Indexing, Evidence Artifact.

### Explore Answer

**Definition:** The answer that an Explore handler produces from a user's query and the current code graph. It is a bounded hypothesis about what code context the agent needs next: narrowed to a specific Evidence Scope, prioritized by Evidence Value, and subject to Output Budget and freshness constraints.

**Use when:** Discussing how Explore decides what evidence to present, how agent sufficiency is evaluated, or how benchmark failures reveal missing or mis-scoped context.

**Not:** A guarantee that every relevant code fact is present. The answer is scoped: enough to guide the next agent step under the current budget and graph state, not an exhaustive code map.

**Related terms:** Agent Sufficiency, Output Budget, Evidence Scope, Evidence Value, Read/Grep Fallback.

### Evidence Scope

**Definition:** The boundary of code evidence that an Explore Answer chooses to include. It identifies which files, symbols, relationships, source snippets, and freshness signals are sufficient to support the agent's next step.

**Use when:** Discussing why Explore included one file but excluded another, why a symbol was rendered as full source or summarized, or why a benchmark failed due to missing or mis-prioritized evidence.

**Not:** The complete set of relevant facts in the repository. Evidence Scope is intentionally bounded by the user's query, graph state, output budget, and the agent's likely next action.

**Related terms:** Explore Answer, Agent Sufficiency, Output Budget, Read/Grep Fallback.

### Output Budget

**Definition:** The limited answer capacity that an Explore Answer can spend to make its Evidence Scope useful for the agent's next step. It is allocated by evidence value, not by repository coverage: mechanism and named intent deserve more budget; redundant sibling detail, low-value files, and stale/noisy evidence should spend less.

**Use when:** Discussing why Explore renders some evidence as full source, some as skeletons, and some not at all; when diagnosing whether a planner change reduced Read/Grep Fallback; or when designing tests for budget-sensitive answers.

**Not:** A raw token, character, file-count, or section-count limit. Those are implementation constraints. Output Budget is the domain concept that explains how answer capacity should be spent under those constraints.

**Related terms:** Agent Sufficiency, Explore Answer, Evidence Scope, Read/Grep Fallback.

### Evidence Value

**Definition:** The expected contribution of a piece of code evidence to Agent Sufficiency within the current Evidence Scope and Output Budget.

**Use when:** Ranking candidate files, symbols, relationships, source snippets, or freshness signals for an Explore Answer.

**Not:** Generic relevance to the query. Evidence can be relevant but low-value if it duplicates other evidence, consumes budget without changing the agent's next action, or makes the answer larger without reducing fallback behavior.

**Related terms:** Agent Sufficiency, Evidence Scope, Output Budget, Read/Grep Fallback.

### Read/Grep Fallback

**Definition:** A visible agent behavior where, after receiving a ZCodeGraph answer, the agent still uses generic file-reading or text-search tools to recover code facts that the answer was expected to provide.

**Use when:** Classifying benchmark failures, evaluating Explore Answer sufficiency, or deciding whether a planner change improved the agent workflow.

**Not:** Any use of file-reading tools. Some tasks legitimately require reading source after ZCodeGraph narrows the target. A fallback only counts when the agent uses generic tools to rediscover information that should have been present in the ZCodeGraph answer.

**Related terms:** Agent Sufficiency, Explore Answer.

### Entry Node

**Definition:** The starting node(s) in the code graph that the agent's query names —
the entry point(s) the Explore Answer uses to begin graph traversal and Flow Spine construction.

**Use when:** Discussing which symbols/files the agent named, how the explore
planner seeds traversal, or why a particular file is the focal point of an answer.

**Not:** The graph-theoretic root (a node with no incoming edges). An Entry Node
can be any node the agent cares about, regardless of its structural position.

**Related terms:** Flow Spine, Explore Answer.

### Flow Spine

**Definition:** The chain of call-path edges traced from the agent's Entry Node(s) —
the backbone that determines which files are kept full (on-spine) and which may be skeletonized (off-spine).

**Use when:** Discussing skeletonization decisions, why a file is rendered with
full source vs. signatures only, or how the explore planner prioritizes evidence.

**Not:** The entire subgraph. The spine is the minimal path; everything else is context around it.

**Related terms:** Entry Node, Source Depth, Skeletonization.

### Skeletonization

**Definition:** The rendering strategy that shows only class/method signatures
(omitting method bodies) for off-spine files in an Explore Answer, reducing
token consumption while preserving symbol-relationship visibility.

**Verb form:** skeletonize. **Source Depth value:** `"skeleton"`.

**Use when:** Discussing why an Explore Answer omits method bodies, how
off-spine files are rendered, or tuning output budget allocation.

**Not:** Deleting or discarding code. Skeletonization is a rendering choice, not a
graph-modification operation.

**Related terms:** Flow Spine, Source Depth, Explore Answer.

### God File

**Definition:** An abnormally large file (e.g. Django's `query.py`) that
contains many symbol definitions and cannot be simply clustered by polymorphic
relationships. Requires special skeletonization handling (e.g. per-method clustering).

**Use when:** Discussing skeletonization of large files, why family-file clustering
fails for a particular file, or tuning the per-file char budget.

**Not:** Any large file. A God File specifically breaks the Polymorphic Family
clustering strategy and needs its own handling.

**Related terms:** Skeletonization, Polymorphic Family (formerly Family File).

### Seam

**Definition:** A module boundary where dependencies are injected (via interface or
function) so that both sides can be unit-tested independently. The core design
concept behind all 7 architecture-roadmap candidates.

**Use when:** Discussing how to make a module testable, where to inject a
dependency, or reviewing whether an architecture change follows the roadmap pattern.

**Not:** A generic "interface" or "abstraction". A seam is specifically a
place where you can alter behavior without editing the module's code.

**Related terms:** (architecture-roadmap)

### Source Depth

**Definition:** How deeply source code is included for a file in an Explore Answer.
Determined by the Explore Plan based on Flow Spine, Skeletonization policy,
and Output Budget.

**Values:** `full` (complete source), `focused` (only named callables' bodies),
`skeleton` (signatures only), `omit` (not rendered).

**Use when:** Discussing Source Depth, why a file appears with full source vs.
signatures, or how the explore planner allocates output budget across files.

**Not:** The Output Budget itself. Source Depth is per-file; Output Budget is the
total cap across all files.

**Related terms:** Explore Answer, Flow Spine, Skeletonization, Output Budget.

### Access Model

**Definition:** Narrow storage interfaces split by caller intent, replacing the
monolithic `QueryBuilder`. Enables independent testing and clearer caller–callee
contracts.

**Variants:**
- `AgentAccessModel` — graph queries for the Agent service.
- `MaintenanceAccessModel` — write operations for index maintenance.
- `ResolutionAccessModel` — reference queries for the resolution phase.
- `StatusAccessModel` — status queries for CLI.

**Use when:** Discussing the QueryBuilder seam (Candidate 7), why a caller
should depend on a narrow interface, or how to test a storage-dependent module.

**Not:** A full CQRS implementation. These are lightweight TypeScript interfaces,
not separate read/write databases.

**Related terms:** Seam, QueryBuilder.

### Edge Origin

**Definition:** How an edge in the code graph was discovered or created.
Affects the agent's confidence in the edge and whether it is safe to delete.

**Values:**
- `tree-sitter` — precise AST-based extraction.
- `scip` — imported from SCIP index data.
- `heuristic` — synthesized by a heuristic synthesizer (e.g. callback-edge synthesis).

**Use when:** Discussing edge confidence, why a particular edge exists,
or whether a synthesizer is producing false positives.

**Not:** The edge's kind (`calls`, `imports`, etc.) or its source file.
Edge Origin explains provenance; EdgeKind explains the relationship type.

**Related terms:** EdgeKind, Synthesizer.

### Evidence Artifact

**Definition:** A replayable or inspectable file that records benchmark, smoke,
profile, oracle, taxonomy, or closeout evidence for a specific decision.

**Use when:** Discussing what data supports a decision, whether a benchmark can
be audited later, or whether a raw/process file can be removed after its useful
facts are consolidated.

**Not:** A durable architecture decision. Evidence can support an ADR, but it
does not replace the ADR's explanation of the decision and trade-off.

**Related terms:** Decision Artifact, Roadmap, Agent Sufficiency.

### Decision Artifact

**Definition:** A durable summary that states what was decided, why, what scope
is complete, and what remains deferred. It may cite Evidence Artifacts, but it
must stand on its own for future agent navigation.

**Use when:** Closing an issue, phase, plan, or roadmap branch; replacing a
series of process files with a single reusable conclusion; or deciding whether
a future agent can proceed without rereading raw experiments.

**Not:** A temporary draft, raw profile, rerun log, or generated experiment
summary.

**Related terms:** Evidence Artifact, Roadmap, Semantic Frontier.

### Roadmap

**Definition:** The shared navigation map for a multi-step architecture effort:
numbered nodes, progress state, mode, and node-level decisions.

**Use when:** Coordinating long-running work across agents and human decisions,
tracking which branch is mainline vs deferred, or deciding where the next slice
should attach.

**Not:** A static plan document. A Roadmap is updated as the work learns new
boundaries.

**Related terms:** Bounded Slice, Semantic Frontier, Decision Artifact.

### Bounded Slice

**Definition:** A deliberately scoped piece of implementation or validation
work that can be tested, closed, and reasoned about without claiming the full
semantic space is solved.

**Use when:** Splitting resolver migration, graph-writing, language coverage,
or performance work into safe units.

**Not:** A workaround or partial truth. A Bounded Slice must say exactly what it
does and what it leaves out.

**Related terms:** Roadmap, Semantic Frontier, Evidence Artifact.

### Semantic Frontier

**Definition:** A known area where correct behavior depends on broader
language, package, runtime, or product semantics that are not yet part of the
current bounded route.

**Use when:** Classifying `node_modules`, third-party package indexing,
package-manager layouts, custom loaders, type-graph semantics, or multi-hop
module-resolution behavior that should not be smuggled into a smaller slice.

**Not:** A bug backlog. A Semantic Frontier item becomes implementation work
only after it is promoted into a Bounded Slice or a new Roadmap branch.

**Related terms:** Roadmap, Bounded Slice, Decision Artifact.

### Polymorphic Family

**Definition:** A supertype and all its subtype implementors, treated as a unit
for skeletonization decisions. When a supertype has ≥3 implementors, the
**Family File** (root, defines the supertype) retains full source, while each
**Polymorphic Sibling** (leaf implementor) may be skeletonized to signature level.

**Sub-concepts:**
- **Family File** — the file that defines a polymorphic supertype with ≥3 implementors.
- **Polymorphic Sibling** — a file whose class implements/extends a supertype shared by ≥3 classes.

**Use when:** Discussing why certain files are skeletonized, how the explore planner/renderer
decides between per-method and per-file body caps, or why a God File triggers special handling
(because it breaks the Polymorphic Family clustering strategy).

**Not:** Any inheritance relationship. The ≥3 threshold and the Family-File-vs-Sibling distinction
are what give the term its skeletonization decision power.

**Related terms:** Skeletonization, God File, Flow Spine, Source Depth.

### Embedding Queue Drain

**Definition:** The bounded foreground processing of a project's already-enqueued embedding work until no pending or actively claimed work remains, without discovering new index content or managing the MCP background worker.

**Use when:** Distinguishing the `embedding run` operation from index-time enqueueing, continuous watching, or semantic retrieval.

**Not:** A full-project rescan, a long-lived worker, or proof that embedding succeeded.

**Related terms:** Explicit Embedding Retry.

### Explicit Embedding Retry

**Definition:** A human-requested, immediately executed retry of failed embedding work whose content hash is still current in the project index. Each request is counted separately from processing attempts and retains failure history until success.

**Use when:** Describing `embedding retry-failed`, manual recovery after an environment or processing failure, and the absence of automatic failed-item retries.

**Not:** Requeueing every historical hash, silently retrying failures, or changing queue state without processing it.

**Related terms:** Embedding Queue Drain.

### Embedding Readiness

**Definition:** Whether an initialized project has the prerequisites needed to execute embedding work, independently of the current queue's outcome or scheduling state.

**Use when:** Distinguishing missing dependencies or an unusable project from failed, pending, or unscheduled embedding work.

**Not:** Queue health, a fully drained queue, or evidence that a model can successfully process every file.

**Related terms:** Embedding Queue Health, Embedding Queue Drain.

### Embedding Queue Health

**Definition:** Whether current-index embedding work has no failed items or expired claims while its prerequisites are ready. Pending and actively claimed work may be healthy; historical content and disabled scheduling do not by themselves make it unhealthy.

**Use when:** Interpreting `embedding status`, separating operational state from execution failure, or applying the stricter drained requirement in CI.

**Not:** Proof that no work remains, that a background worker is enabled, or that a worker process is alive.

**Related terms:** Embedding Readiness, Explicit Embedding Retry.

### Current-Vector Supersession

**Definition:** The queue and vector-commit rule that prevents an older content hash from replacing the single vector stored for a file path. Historical claims are closed without embedding, and every claimed row is checked against `files(path, content_hash)` again in its terminal transaction before any vector write.

**Use when:** Reviewing foreground or MCP embedding concurrency, stale queue work, terminal queue/vector transactions, or database content-hash changes.

**Not:** Evidence that the old hash was embedded, a fifth persisted queue status, or support for retaining multiple vectors per file.

**Related terms:** Embedding Queue Drain, Committed Drain Counters.

### Committed Drain Counters

**Definition:** The per-command counts of queue items whose terminal `done` or `failed` transition this process actually committed, accumulated once per completed worker batch and kept separate from the final global queue snapshot.

**Use when:** Interpreting `embedding run` / `retry-failed` execution results, coordinating multiple workers, or testing idle/progress messages and lost claim ownership.

**Not:** A count of scanned files, initially pending rows, messages received, attempted terminal updates, or work completed by every process.

**Related terms:** Embedding Queue Drain, Current-Vector Supersession.

### Historical Unfinished Embedding Work

**Definition:** Pending or in-progress queue rows whose `(file_path, content_hash)` no longer matches the current `files` row, including orphan paths. They remain visible for diagnostics and foreground drain but do not determine current-index queue health.

**Use when:** Classifying queue snapshots, defining `historicalUnfinished`, or deciding whether superseded work may write a vector.

**Not:** Terminal historical `done`/`failed` rows, current-index work, proof of an active worker, or permission to overwrite the current vector.

**Related terms:** Embedding Queue Health, Current-Vector Supersession.

### Index Write Lock Ownership

**Definition:** The OS-enforced exclusive holding of an index-write lock handle by one complete index operation, including its Rust and TypeScript delegates.

**Use when:** Acquiring, borrowing, releasing, or diagnosing a project index lock.

**Not:** A PID, lock-file timestamp, ownerToken, process-health check, or database fencing epoch.

**Related terms:** Index Write Lease, Forced Lock Recovery.

### Index Write Lease

**Definition:** The operation-scoped capability under which an outer index owner and its nested TypeScript/Rust delegates may write, valid until all delegated writers finish and the OS lock handle is released. Rust children borrow an externally-held lease while the parent retains the sole OS lock; OS-enforced child lifetime prevents a surviving delegate after parent death.

**Use when:** Reasoning about long-running index writes, nested helpers, delegated child processes, crash recovery, and concurrent index access.

**Not:** A renewable timestamp, fixed indexing deadline, independent lock for each helper, an inherited child lock handle, a PID-only liveness check, or proof that external process termination left the index valid.

**Related terms:** Index Write Lock Ownership, Forced Lock Recovery.

### Forced Lock Recovery

**Definition:** Human-requested repair of legacy or malformed lock metadata while holding the OS lock, without deleting the stable rendezvous file or bypassing an active writer.

**Use when:** Explaining `unlock --force` and its limits after crash-safe OS-backed recovery.

**Not:** Forced removal of an active lock, process termination, stale-file cleanup, validation bypass, or proof that a killed writer's index is valid.

**Related terms:** Index Write Lock Ownership, Index Write Lease.

### Semantic Entry Discovery

**Definition:** The use of natural-language intent to identify candidate files that can seed existing graph-based narrowing and improve an Explore Answer.

**Use when:** Evaluating semantic retrieval as a distinct product capability rather than treating stored embeddings as a delivered search feature.

**Not:** Exact-symbol lookup, an unrestricted code question-answering system, or proof that vector candidates improve agent outcomes.

**Related terms:** Explore Answer, Agent Sufficiency, Embedding Readiness.

### Retrieval Acceptance Gate

**Definition:** A predeclared evidence boundary that separates offline retrieval improvement, Agent-level net benefit, and permission to integrate a semantic retrieval candidate into the product.

**Use when:** Deciding whether a reranking or semantic-fusion candidate may advance, interpreting a NO-GO result, or changing retrieval metrics and their thresholds.

**Not:** A mandate to maximize MRR, a count of passing script checks, or proof that a diagnostic holdout remains independent after it informs tuning.

**Related terms:** Agent Sufficiency, Semantic Entry Discovery, Evidence Artifact.
