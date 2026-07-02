# Post-Candidate-1 Agent Baseline — 2026-06-12

## Purpose

This is the issue #35 baseline for agent-facing sufficiency after Candidate 1
split `zcodegraph_explore` into the Explore Answer planner seam.

It complements the unit-level Candidate 1 regression baseline by measuring
whether real headless agent sessions can answer representative Explore prompts
without falling back to generic Read/Grep-style tools.

Related design context:

- `docs/designs/architecture-roadmap.md`
- `docs/designs/architecture-roadmap.md`
- `docs/benchmarks/explore-sufficiency-2026-06-11.md`

Issue date: #35 was opened on 2026-06-11. This run was taken on 2026-06-12
against repository commit `cccae42` (`Add explore sufficiency benchmark results`)
and package version `0.9.9`.

## Corpus

Representative codebase: Elasticsearch.

- Repo path: `/tmp/codegraph-corpus/elasticsearch`
- Repo commit: `802bd01b`
- Indexed with: `/tmp/zcodegraph-dev init /tmp/codegraph-corpus/elasticsearch`
- Final index: 32,716 files, 1,052,944 nodes, 4,124,167 edges
- Index duration: 6m 40s

Raw logs:

- Agent A/B logs: `/tmp/post-c1-agent-baseline/`
- Final deterministic eval JSON:
  `__tests__/evaluation/results/2026-06-12T06-50-46-699Z.json`
- Earlier partial-index eval JSON:
  `__tests__/evaluation/results/2026-06-12T06-30-08-464Z.json`

The final numbers below use the completed index.

## Deterministic Eval

Command:

```bash
EVAL_CODEBASE=/tmp/codegraph-corpus/elasticsearch npm run eval
```

`npm run eval` exits non-zero because two exploration cases fail the current
pass bar. Search precision remains strong; broad natural-language exploration
is the weak area.

Summary:

| Area | Result |
|---|---:|
| Total cases | 12 |
| Passed | 10 |
| Failed | 2 |
| Mean recall | 0.76 |
| Mean MRR | 0.78 |

Case results:

| Case | Result | Recall | Extra | Missed symbols |
|---|---|---:|---:|---|
| `search-class-exact` | pass | 1.00 | MRR 1.00 |  |
| `search-method-qualified` | pass | 1.00 | MRR 0.20 |  |
| `search-interface` | pass | 1.00 | MRR 1.00 |  |
| `search-enum` | pass | 1.00 | MRR 1.00 |  |
| `search-exception` | pass | 1.00 | MRR 1.00 |  |
| `search-nested-class` | pass | 1.00 | MRR 0.50 |  |
| `explore-rest-layer` | pass | 0.75 | density 0.31 | `RestController` |
| `explore-search-execution` | pass | 0.67 | density 1.04 | `SearchShardsGroup` |
| `explore-bulk-indexing` | fail | 0.00 | density 0.73 | `TransportBulkAction`, `BulkRequest`, `BulkResponse` |
| `explore-shard-allocation` | fail | 0.00 | density 1.27 | `AllocationService`, `BalancedShardsAllocator` |
| `explore-transport-search` | pass | 1.00 | density 1.12 |  |
| `explore-engine-implementations` | pass | 0.67 | density 0.57 | `ReadOnlyEngine` |

Interpretation:

- Exact symbol lookup is healthy for these Elasticsearch targets.
- The broad natural-language `findRelevantContext` cases still miss important
  domain symbols, especially bulk indexing and shard allocation.
- Candidate 2+ work should treat broad exploration recall as a regression
  guardrail, not as solved by the Candidate 1 seam.

Follow-up validation for #44:

- The `explore-bulk-indexing` miss was reproduced against
  `/tmp/codegraph-corpus/elasticsearch` before the fix: recall 0.00 for
  `TransportBulkAction`, `BulkRequest`, and `BulkResponse`.
- After preserving Java-style action/request/response operation families for
  broad prose queries, the deterministic public-API probe
  `findRelevantContext("How does bulk indexing work?")` finds all three expected
  symbols with recall 1.00.
- Evidence Scope is sufficient for this deterministic case without generic
  Read/Grep fallback: the entry nodes include `TransportBulkAction`,
  `BulkRequest`, and `BulkResponse` directly.

Follow-up validation for #45:

- The `explore-shard-allocation` miss was reproduced against
  `/tmp/codegraph-corpus/elasticsearch` before the fix: recall 0.00 for
  `AllocationService` and `BalancedShardsAllocator`.
- After preserving Java allocation service and concrete allocator evidence for
  broad prose queries, the deterministic public-API probe
  `findRelevantContext("How does shard rebalancing and allocation work?")`
  finds both expected symbols with recall 1.00.
- Evidence Scope is sufficient for this deterministic case without generic
  Read/Grep fallback: the entry nodes include `BalancedShardsAllocator`,
  `AllocationService`, and the `ShardsAllocator` interface directly.

Follow-up validation for #46:

- The `explore-engine-implementations` miss was reproduced against
  `/tmp/codegraph-corpus/elasticsearch` before the fix: recall 0.67, missing
  `ReadOnlyEngine` while finding `Engine` and `InternalEngine`.
- After fixing type-hierarchy expansion to include descendants as well as
  ancestors, the deterministic public-API probe
  `findRelevantContext("What are the Engine implementations for indexing?")`
  finds `Engine`, `InternalEngine`, and `ReadOnlyEngine` with recall 1.00.
- Evidence Scope is sufficient for this deterministic case without generic
  Read/Grep fallback: the graph includes write-capable `InternalEngine`,
  read-only `ReadOnlyEngine`, and plugin-family evidence including
  `IndexEngine`, `SearchEngine`, and `HollowIndexEngine`; test-only Engine
  subclasses are filtered out for non-test queries.

Follow-up validation for #47:

- The ES-3 baseline was the headless WITH-arm run from this document: 180s,
  5 turns, 4 `zcodegraph_explore` calls, and 0 generic Read/Grep fallback calls.
- After seeding a concrete REST-to-transport action slice for broad flow
  questions, the deterministic public-API Explore probe against
  `/tmp/codegraph-corpus/elasticsearch` completed in 38.8s with 1
  `zcodegraph_explore` call and 0 generic fallback calls.
- Evidence Scope is sufficient for this deterministic case: the rendered source
  includes route dispatch (`RestController`), handler preparation
  (`BaseRestHandler` and `RestUpdateAction.prepareRequest`), local client
  execution (`NodeClient.executeLocally`), and transport action execution
  (`TransportUpdateAction.doExecute`) in the first answer.

## Explore Query Matrix

The headless A/B run used three planner-seam prompts:

| ID | Prompt class | Prompt |
|---|---|---|
| ES-1 | Mechanism tracing | How does `TransportService` connect to `SearchTransportService`? Use this symbol bag: `TransportService SearchTransportService sendRequest sendChildRequest`. |
| ES-2 | Polymorphic family | What are the `Engine` implementations for indexing? Use this symbol bag: `Engine InternalEngine ReadOnlyEngine Index`. |
| ES-3 | Cross-module flow | How does a REST request handler reach a transport action? Use this symbol bag: `RestController BaseRestHandler RestRequest TransportAction TransportService`. |

Each prompt was run once per arm with `scripts/agent-eval/run-all.sh` in
headless mode. This is a baseline, not a statistically stable benchmark.

## Agent A/B Summary

| Prompt | Arm | Duration | Turns | Tool calls | CodeGraph calls | Generic Read | Generic Bash search/read | Cost | Sufficiency |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| ES-1 | WITH | 48s | 2 | 1 | 1 | 0 | 0 | $0.581 | sufficient |
| ES-1 | WITHOUT | 85s | 2 | 15 | 0 | 5 | 9 | $0.867 | sufficient after fallback |
| ES-2 | WITH | 47s | 2 | 1 | 1 | 0 | 0 | $0.569 | partially sufficient |
| ES-2 | WITHOUT | 236s | 2 | 40 | 0 | 7 | 32 | $1.210 | sufficient after fallback |
| ES-3 | WITH | 180s | 5 | 4 | 4 | 0 | 0 | $1.480 | sufficient but slower |
| ES-3 | WITHOUT | 82s | 14 | 13 | 0 | 4 | 9 | $1.831 | sufficient after fallback |

Aggregate:

| Arm | Duration | Tool calls | Generic Read | Generic Bash search/read | Cost |
|---|---:|---:|---:|---:|---:|
| WITH | 275s | 6 | 0 | 0 | $2.630 |
| WITHOUT | 403s | 68 | 16 | 50 | $3.908 |

Read/Grep displacement:

- WITH ZCodeGraph: 0 generic fallback reads/searches across all three prompts.
- WITHOUT ZCodeGraph: 66 generic evidence-recovery calls across all three prompts.
- WITH reduced total tool calls by 91% in this n=1 slice.
- WITH reduced cost by 33% in this n=1 slice.
- WITH was faster overall, but ES-3 regressed wall-clock time because it used
  four large explore calls on a cross-module flow.

## Fallback Classification

Classification follows `docs/designs/architecture-roadmap.md`.

| Prompt | Arm | Raw generic reads/searches | Fallback reads/searches | Classification |
|---|---|---:|---:|---|
| ES-1 | WITH | 0 | 0 | No fallback. One `zcodegraph_explore` answered the composition/delegation mechanism. |
| ES-1 | WITHOUT | 14 | 14 | Expected evidence recovery: locating `SearchTransportService`, `TransportService`, `Transport`, and send methods. |
| ES-2 | WITH | 0 | 0 | No generic fallback, but answer scope was partial: it flagged `IndexEngine` as outside the returned graph slice. |
| ES-2 | WITHOUT | 39 | 39 | Expected evidence recovery: finding engine subclasses and reading implementation bodies/signatures. |
| ES-3 | WITH | 0 | 0 | No generic fallback. Four `zcodegraph_explore` calls stayed within the large-repo explore-call budget of 5. |
| ES-3 | WITHOUT | 13 | 13 | Expected evidence recovery: route dispatch, handler, `NodeClient`, and transport action lookup. |

No WITH-arm generic calls were legitimate deepening, edit-prep, verification, or
noisy reads because there were no generic Read/Grep-style calls.

## Findings

Candidate 1's planner seam is sufficient for the two precise symbol-bag prompts:
the agent answered with one explore call and no generic file reads.

The polymorphic family prompt shows a scope gap rather than a fallback problem.
The agent avoided generic tools, but the WITH answer called out `IndexEngine` as
outside the returned graph slice. That makes ES-2 a useful Candidate 2+ family
coverage guardrail.

The cross-module REST-to-transport prompt shows the current tradeoff clearly.
ZCodeGraph displaced all generic reads and searches, but the agent needed four
explore calls and took longer than the WITHOUT arm. That is not a Read/Grep
fallback regression; it is an output-sufficiency and routing-depth tuning signal.

The deterministic eval broad-query failures remain open product evidence. Bulk
indexing and shard allocation should be tracked separately from this benchmark
doc because they fail before the agent layer.

## Limitations

- Agent A/B is n=1 per prompt per arm; use these numbers as a baseline, not a
  stable performance claim.
- Agent runs were executed while the Elasticsearch reference resolver was still
  completing. The final deterministic eval was rerun after the index completed.
- The run used the local `/tmp/zcodegraph-dev` wrapper because the host Node is
  newer than the supported engine range.
- Raw logs are kept in `/tmp/post-c1-agent-baseline/`; they are not checked into
  the repository.

## Baseline Verdict

Issue #35's baseline is established:

- Representative Elasticsearch index exists and completed.
- Deterministic eval is recorded with final stable results.
- Three planner-seam Explore prompts are defined.
- Headless WITH/WITHOUT agent sessions were run.
- Read/Grep fallback was classified.

Use this document as the post-Candidate-1 comparison point for Candidate 2+
changes to Evidence Value heuristics, family coverage, skeletonization, and
large-repo explore-call behavior.
