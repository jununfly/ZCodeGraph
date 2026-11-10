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

**Related terms:** Explore Answer, Recovery Read/Grep Fallback.

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

**Definition:** The classification of rust-hybrid indexing fallback quality:
`healthy` (zero fallbacks), `partial` (only non-Rust-owned language fallbacks —
expected behavior), `degraded` (Rust-owned parse/extraction gaps or missing
files — real problems), and `pending` (ADR-0009 embedding readiness work not yet
complete). The original ADR-0007 scope used the first three states.

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

**Related terms:** Agent Sufficiency, Output Budget, Evidence Scope, Evidence Value, Recovery Read/Grep Fallback.

### Evidence Scope

**Definition:** The boundary of code evidence that an Explore Answer chooses to include. It identifies which files, symbols, relationships, source snippets, and freshness signals are sufficient to support the agent's next step.

**Use when:** Discussing why Explore included one file but excluded another, why a symbol was rendered as full source or summarized, or why a benchmark failed due to missing or mis-prioritized evidence.

**Not:** The complete set of relevant facts in the repository. Evidence Scope is intentionally bounded by the user's query, graph state, output budget, and the agent's likely next action.

**Related terms:** Explore Answer, Agent Sufficiency, Output Budget, Recovery Read/Grep Fallback.

### Output Budget

**Definition:** The limited answer capacity that an Explore Answer can spend to make its Evidence Scope useful for the agent's next step. It is allocated by evidence value, not by repository coverage: mechanism and named intent deserve more budget; redundant sibling detail, low-value files, and stale/noisy evidence should spend less.

**Use when:** Discussing why Explore renders some evidence as full source, some as skeletons, and some not at all; when diagnosing whether a planner change reduced Recovery Read/Grep Fallback; or when designing tests for budget-sensitive answers.

**Not:** A raw token, character, file-count, or section-count limit. Those are implementation constraints. Output Budget is the domain concept that explains how answer capacity should be spent under those constraints.

**Related terms:** Agent Sufficiency, Explore Answer, Evidence Scope, Recovery Read/Grep Fallback.

### Evidence Value

**Definition:** The expected contribution of a piece of code evidence to Agent Sufficiency within the current Evidence Scope and Output Budget.

**Use when:** Ranking candidate files, symbols, relationships, source snippets, or freshness signals for an Explore Answer.

**Not:** Generic relevance to the query. Evidence can be relevant but low-value if it duplicates other evidence, consumes budget without changing the agent's next action, or makes the answer larger without reducing fallback behavior.

**Related terms:** Agent Sufficiency, Evidence Scope, Output Budget, Recovery Read/Grep Fallback.

### Recovery Read/Grep Fallback

**Definition:** A visible agent behavior where, after receiving a ZCodeGraph answer, the agent still uses generic file-reading or text-search tools to recover code facts that the answer was expected to provide.

**Legacy alias:** Read/Grep Fallback.

**Use when:** Classifying benchmark failures, evaluating Explore Answer sufficiency, or deciding whether a planner change improved the agent workflow.

**Not:** Any use of file-reading tools, an indexing Fallback Health State, or Receipt Health. Some tasks legitimately require reading source after ZCodeGraph narrows the target. A fallback only counts when the agent uses generic tools to rediscover information that should have been present in the ZCodeGraph answer.

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

**Not:** A temporary Proposal Draft, Process Artifact, raw profile, rerun log,
or generated experiment summary.

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

**Definition:** The OS-enforced exclusive holding of the index-write lease handle on the stable `.zcodegraph/zcodegraph.lock` rendezvous file by one complete index operation. In the TypeScript path the holder is a supervised native `index-lease` helper; in the Rust path it is `IndexWriteLease` directly. Both share one rendezvous file and one lock policy.

**Use when:** Acquiring, borrowing, releasing, or diagnosing a project index lock.

**Not:** A PID, lock-file timestamp, ownerToken, process-health check, or database fencing epoch.

**Related terms:** Index Write Lease, Forced Lock Recovery.

### Index Write Lease

**Definition:** The OS-backed exclusive lease on the stable `.zcodegraph/zcodegraph.lock` rendezvous file that gates a single index-write operation. The TypeScript `FileLock` borrows it through a supervised native `zcodegraph-core index-lease` helper (stdin EOF / parent exit releases the OS handle); the Rust writer acquires it directly via `IndexWriteLease`. The lease is never deleted on release or crash; recovery is OS handle cleanup, and an active writer cannot be overridden.

**Use when:** Reasoning about long-running index writes, supervised helper processes, crash recovery, and concurrent index access.

**Not:** A renewable timestamp, fixed indexing deadline, independent lock for each helper, an inherited child lock handle, a PID-only liveness check, or proof that external process termination left the index valid.

**Related terms:** Index Write Lock Ownership, Forced Lock Recovery.

### Forced Lock Recovery

**Definition:** Human-requested repair of malformed lock metadata in place while holding the OS lock, without deleting the stable rendezvous file or bypassing an active writer. The OS lock itself is never released by `--force`; only bounded diagnostic metadata is rewritten.

**Use when:** Explaining `unlock --force` and its limits after crash-safe OS-backed recovery.

**Not:** Forced removal of an active lock, process termination, stale-file cleanup, validation bypass, or proof that a killed writer's index is valid.

**Related terms:** Index Write Lock Ownership, Index Write Lease.

### Semantic Entry Discovery

**Definition:** The use of natural-language intent to identify candidate files that can seed existing graph-based narrowing and improve an Explore Answer.

**Use when:** Evaluating semantic retrieval as a distinct product capability rather than treating stored embeddings as a delivered search feature.

**Not:** Exact-symbol lookup, an unrestricted code question-answering system, or proof that vector candidates improve agent outcomes.

**Related terms:** Explore Answer, Agent Sufficiency, Embedding Readiness.

### Retrieval Acceptance Gate

**Definition:** A predeclared evidence boundary that separates offline retrieval improvement, Agent-level net benefit, and permission to integrate a semantic retrieval candidate into the product. ADR-0014 splits it into G-entry and G-ship while preserving the product-default thresholds.

**Use when:** Deciding whether a reranking or semantic-fusion candidate may advance, interpreting a NO-GO result, or changing retrieval metrics and their thresholds.

**Not:** A mandate to maximize MRR, a count of passing script checks, or proof that a diagnostic holdout remains independent after it informs tuning.

**Related terms:** Agent Sufficiency, Semantic Entry Discovery, Evidence Artifact, G-entry and G-ship, Acceptance Holdout.

## Agent A/B Evaluation Language

### Agent Task

**Definition:** One independent natural-language code-understanding task used as the unit of statistical inference.

**Use when:** Counting independent observations, designing task sets, or defining the pairing structure of an Agent A/B comparison.

**Not:** An offline file-location query, a single Arm Run, or a repository.

**Related terms:** Task Cluster, Paired Block, Recovery Read/Grep Fallback.

### Arm

**Definition:** One retrieval-implementation condition compared within an Agent Task.

**Use when:** Naming experimental conditions, defining the single-variable constraint, or interpreting a paired difference.

**Not:** A model version, a prompt, a task, or an execution order.

**Related terms:** Arm Run, Paired Block, Arm Order.

### Arm Run

**Definition:** One execution of one Arm within a Paired Block.

**Legacy aliases:** Trial, Run, Repetition.

**Use when:** Recording a single trajectory, classifying a tool call, or auditing one run manifest row.

**Not:** An independent Agent Task or a complete paired comparison.

**Related terms:** Arm, Paired Block, Recovery Read/Grep Fallback.

### Paired Block

**Definition:** One within-task repetition containing exactly one Arm Run for each Arm; the repetition count of an Agent Task counts Paired Blocks, not independent tasks.

**Use when:** Describing k, interleaving Arm Order, or preserving complete paired observations.

**Not:** An independent sample, a single Arm Run, or a reason to multiply the number of Agent Tasks.

**Related terms:** Agent Task, Arm Run, Arm Order, Task Cluster.

### Arm Order

**Definition:** The sequence in which Arm Runs are executed within a Paired Block.

**Use when:** Counterbalancing position effects, describing permutations, or auditing order balance.

**Not:** The retrieval implementation itself or a product default setting.

**Related terms:** Arm, Arm Run, Paired Block.

### Task Cluster

**Definition:** All observations belonging to one Agent Task, treated as one unit for inference and resampling.

**Use when:** Choosing the experimental unit, computing paired differences, or resampling uncertainty.

**Not:** A set of independent trials or a repository-level sample.

**Related terms:** Agent Task, Paired Block, MDE.

### Answer Sufficiency

**Definition:** The predeclared correctness guardrail that judges whether an Agent response contains the required code evidence without unacceptable regression.

**Use when:** Defining stopping rules, auditing response quality, or separating correctness from behavioral efficiency.

**Not:** Generic correctness, a final-state reward, or a reduction in tool calls.

**Related terms:** Agent Task, Recovery Read/Grep Fallback, G-entry and G-ship.

### Task Freshness

**Definition:** The contamination-control property of an Agent Task set: tasks are independently produced, timestamped, and reviewed without participating in tuning.

**Use when:** Designing a new task set, disclosing selection leakage, or claiming generalization to unseen work.

**Not:** Index freshness, model freshness, or proof of zero training-data contamination.

**Related terms:** Acceptance Holdout, Diagnostic Holdout, Frozen v3.

### Acceptance Holdout

**Definition:** A frozen task or query set that has not informed candidate selection and remains eligible for independent acceptance evidence.

**Use when:** Certifying a candidate for a product gate or replacing a contaminated holdout.

**Not:** A development set, a diagnostic set, or a set that may be reused after tuning.

**Related terms:** Diagnostic Holdout, Frozen v3, Task Freshness.

### Diagnostic Holdout

**Definition:** A formerly independent holdout that has already informed candidate selection or tuning and now may only support diagnostic comparison.

**Use when:** Interpreting historical results after a holdout has been used for decisions.

**Not:** An independent acceptance set or a reusable tuning set.

**Related terms:** Acceptance Holdout, Frozen v3.

### Frozen v3

**Definition:** The permanently diagnostic v3 semantic-retrieval holdout already used for 1-7 candidate evaluation.

**Use when:** Explaining why v3 cannot support another acceptance claim or another tuning round.

**Not:** A reusable acceptance holdout or a source of new independent tasks.

**Related terms:** Diagnostic Holdout, Acceptance Holdout, Task Freshness.

### G-entry and G-ship

**Definition:** The two-stage Retrieval Acceptance Gate: G-entry grants permission to enter paired Agent evaluation; G-ship governs permission to consider product-default integration and retains its absolute thresholds.

**Use when:** Deciding whether a candidate may be measured in a real Agent workflow versus shipped as a default.

**Not:** A relaxed product gate, a single combined threshold, or evidence that a candidate has passed either stage.

**Related terms:** Retrieval Acceptance Gate, Acceptance Holdout, Frozen v3.

### MDE

**Definition:** The minimum detectable benefit: the smallest practically important effect that the evaluation is predeclared to detect.

**Use when:** Freezing sample size, power, and decision thresholds before an experiment.

**Not:** An observed effect, a post-hoc threshold, or a statistical significance value.

**Related terms:** Task Cluster, Answer Sufficiency.

### Proposal Draft

**Definition:** A non-normative consolidated proposal that records a candidate design and its open decisions before Human approval.

**Use when:** Converging research material into one reviewable document without changing accepted decisions.

**Not:** A Decision Artifact, an Evidence Artifact, or an implementation authorization.

**Related terms:** Process Artifact, Decision Artifact, ADR Reference Hygiene.

### Process Artifact

**Definition:** A working file that supports coordination, review, or temporary synthesis without carrying normative authority.

**Use when:** Classifying roadmaps, discussion material, or draft proposals that must not be mistaken for durable decisions.

**Not:** A primary contract, an accepted decision, or a release input.

**Related terms:** Proposal Draft, Decision Artifact, Roadmap.

### ADR Reference Hygiene

**Definition:** The maintenance activity that updates or removes stale code, path, status, or version references in ADRs while preserving their decisions.

**Use when:** Reconciling accepted decisions with current code without silently changing architecture.

**Not:** Deleting source code, archiving an ADR, or rewriting historical conclusions.

**Related terms:** Decision Artifact, Proposal Draft.

### Receipt Health

**Definition:** The publication-contract health of a generated research report, indicating structural and citation checks passed.

**Use when:** Interpreting a compiler receipt or distinguishing report validity from empirical validation.

**Not:** Fallback Health State, product correctness, or evidence that a candidate won an Agent evaluation.

**Related terms:** Recovery Read/Grep Fallback, Evidence Artifact.

## Baseline Harness Language

### Agent Sufficiency Baseline

**Definition:** The with-vs-without CodeGraph comparison that records whether an agent can continue a task without generic Read/Grep recovery.

**Use when:** Naming the baseline required by DES-baseline-agent-sufficiency-v1 when a change touches agent-facing Explore content, MCP tool behavior, or ranking.

**Not:** Retrieval Arm A, a model version, a prompt, or a paired A/B trial.

**Related terms:** Agent Sufficiency, Answer Sufficiency, BaselineTranscript, Retrieval Arm A.

**Rules:** A bare "baseline" in this glossary refers to this term; Retrieval Arm A is always written out.

### Retrieval Arm A

**Definition:** The current `plan()` retrieval implementation used as the reference condition of a ZRA-Paired v1 Paired Block.

**Use when:** Comparing retrieval implementations inside one Agent Task.

**Not:** Agent Sufficiency Baseline, model versions, prompts, tasks, or execution orders.

**Related terms:** Arm, Paired Block, Agent Sufficiency Baseline.

### AgentRunner

**Definition:** The harness-owned execution boundary that runs one agent task against one tool configuration and returns a normalized transcript.

**Use when:** Describing how a baseline run is started without naming an agent product.

**Not:** An Adapter, a provider runtime, or a retrieval arm.

**Related terms:** Adapter, BaselineTranscript, CodeBuddy CLI Runner.

### Adapter

**Definition:** A provider-specific translation layer that maps one agent runtime's invocation and transcript format onto the AgentRunner contract.

**Use when:** Adding support for another agent runtime without changing the harness.

**Not:** The harness itself, a model, or a configuration preset.

**Related terms:** AgentRunner, CodeBuddy CLI Runner.

### BaselineTranscript

**Definition:** The provider-neutral evidence record of one baseline arm, carrying tool calls, fallback displacement, usage, and a Human-owned review block.

**Use when:** Recording or comparing the evidence required by DES-baseline-agent-sufficiency-v1.

**Not:** A raw vendor log, a verdict written by an agent, or a release input.

**Related terms:** Agent Sufficiency Baseline, AgentRunner, Answer Sufficiency, Task Freshness.

### CodeBuddy CLI Runner

**Definition:** The headless agent runtime shipped with WorkBuddy that serves as the first Adapter instance behind the AgentRunner contract.

**Use when:** Naming the concrete runtime used by the first adapter.

**Not:** A product-level `workbuddy` command, a model version, or the AgentRunner contract itself.

**Related terms:** Adapter, AgentRunner.
