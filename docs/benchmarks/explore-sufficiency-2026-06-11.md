# Explore Sufficiency Benchmark — 2026-06-11

## Purpose

This document is the run sheet and result summary for issue #37, issue #38,
and issue #42.

It evaluates current `zcodegraph_explore` Agent Sufficiency for flow questions
using **Read/Grep Fallback displacement** as the primary metric.

The completed 2026-06-12 matrix is summarized below. The compact source record
is `docs/states/explore-sufficiency-2026-06-12-results.md`; raw transcripts
remain outside the repository under `/tmp/zcodegraph-sufficiency/`.

## Scope

Tool surface under evaluation:

- Primary: `zcodegraph_explore`
- Secondary drill-down: `zcodegraph_node`

Task class:

- Flow questions only.
- Each prompt names endpoint symbols or a precise symbol bag.
- Broad surveys, PR reviews, edit tasks, and implementation tasks are out of
  scope for this first pass.

Run matrix:

- 3 repos.
- 3 prompts per repo.
- 2 arms: WITH ZCodeGraph and WITHOUT ZCodeGraph.
- 2 runs per arm.
- Total: 36 agent runs.

## Read/Grep Classification

Classify every generic file-read or text-search call. Raw Read/Grep count is not
the primary metric.

| Classification | Meaning |
|---|---|
| Fallback read/search | Agent recovers expected answer evidence that `zcodegraph_explore` should have provided. |
| Legitimate deepening read/search | Agent inspects beyond the promised Evidence Scope after ZCodeGraph narrowed the target. |
| Edit-prep read/search | Agent prepares a concrete code change. |
| Verification read/search | Agent checks tests, fixtures, generated files, or config because the task requires verification. |
| Noisy read/search | Irrelevant or thrashing behavior; record separately and do not treat as product evidence without transcript review. |

## Pass Bar

For a flow prompt, `zcodegraph_explore` passes when:

- Fallback Read/Grep is near zero within the repo's explore-call budget.
- The agent reaches the mechanism path without reconstructing it through generic
  file reads or text search.
- Total turns, duration, and cost do not regress against the WITHOUT arm.
- Remaining Read/Grep calls are classifiable as legitimate deepening, edit-prep,
  verification, or noisy behavior rather than fallback.

## Prompt Matrix

### Excalidraw

Historical worked example for React observer → render → JSX child → canvas
rendering.

| ID | Prompt |
|---|---|
| EX-1 | How does updating an element re-render the canvas on screen? Use this symbol bag: `mutateElement triggerUpdate triggerRender render StaticCanvas renderStaticScene`. |
| EX-2 | How does a `Scene.onUpdate` subscription reach React render? Use this symbol bag: `Scene.onUpdate triggerUpdate triggerRender render StaticCanvas`. |
| EX-3 | How does `StaticCanvas` render elements onto the canvas? Use this symbol bag: `StaticCanvas renderStaticScene _renderStaticScene drawElementOnCanvas renderElement`. |

### Django

Stress test for God Files, Polymorphic Families, Source Depth, and budget
pressure.

| ID | Prompt |
|---|---|
| DJ-1 | How does evaluating a `QuerySet` reach SQL execution? Use this symbol bag: `QuerySet._fetch_all ModelIterable.__iter__ SQLCompiler.execute_sql`. |
| DJ-2 | How does iterating a `QuerySet` reach compiler results? Use this symbol bag: `QuerySet.iterator QuerySet._iterator ModelIterable.__iter__ SQLCompiler.execute_sql`. |
| DJ-3 | How does a `QuerySet` build SQL through the compiler? Use this symbol bag: `Query.get_compiler SQLCompiler.as_sql SQLCompiler.execute_sql`. |

### ZCodeGraph

Self-sufficiency check for current architecture seams.

| ID | Prompt |
|---|---|
| ZCG-1 | How does a `zcodegraph_explore` request become rendered markdown? Use this symbol bag: `handleExplore plan ExplorePlan render`. |
| ZCG-2 | How does indexing source files reach database node writes? Use this symbol bag: `runIndex CodeGraph.indexAll ExtractionOrchestrator.indexAll ParseStage QueryBuilder.insertNode`. |
| ZCG-3 | How does reference resolution run synthesizers and persist heuristic edges? Use this symbol bag: `ReferenceResolver.resolveAll createSynthesizerRegistry registerFullGraphSynthesizers executeFullGraphSynthesizers QueryBuilder.insertEdge`. |

## Results — 2026-06-12

The first-pass matrix covered 36 headless agent runs: 3 repositories, 3 prompts
per repository, 2 runs per prompt, and WITH/WITHOUT ZCodeGraph arms.

### Per-Run Result Index

This table records the compact per-run evidence required by issue #37. Full tool
sequences and generic Read/Grep call classification are preserved in the compact
state file and local raw logs referenced above.

| Repo | Prompt | Run | Arm | Status | Duration | Cost | Turns | Tools | CodeGraph | Read | Grep/Bash | Flow |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| ZCodeGraph | ZCG-1 | 1 | WITH | success | 41s | $1.324 | 4 | 3 | 3 | 0 | 0 | no |
| ZCodeGraph | ZCG-1 | 1 | WITHOUT | success | 70s | $2.438 | 10 | 9 | 0 | 6 | 3 | n/a |
| ZCodeGraph | ZCG-1 | 2 | WITH | success | 42s | $1.291 | 4 | 3 | 3 | 0 | 0 | no |
| ZCodeGraph | ZCG-1 | 2 | WITHOUT | success | 57s | $1.623 | 9 | 8 | 0 | 5 | 3 | n/a |
| ZCodeGraph | ZCG-2 | 1 | WITH | success | 41s | $1.284 | 5 | 4 | 4 | 0 | 0 | yes |
| ZCodeGraph | ZCG-2 | 1 | WITHOUT | success | 93s | $1.008 | 2 | 16 | 0 | 8 | 7 | n/a |
| ZCodeGraph | ZCG-2 | 2 | WITH | success | 36s | $1.188 | 4 | 3 | 3 | 0 | 0 | no |
| ZCodeGraph | ZCG-2 | 2 | WITHOUT | success | 82s | $2.120 | 15 | 14 | 0 | 6 | 8 | n/a |
| ZCodeGraph | ZCG-3 | 1 | WITH | success | 70s | $2.633 | 9 | 8 | 8 | 0 | 0 | yes |
| ZCodeGraph | ZCG-3 | 1 | WITHOUT | success | 145s | $2.589 | 8 | 28 | 0 | 16 | 11 | n/a |
| ZCodeGraph | ZCG-3 | 2 | WITH | success | 54s | $1.279 | 5 | 4 | 4 | 0 | 0 | yes |
| ZCodeGraph | ZCG-3 | 2 | WITHOUT | success | 121s | $1.616 | 5 | 19 | 0 | 8 | 10 | n/a |
| Excalidraw | EX-1 | 1 | WITH | success | 49s | $1.202 | 8 | 7 | 6 | 1 | 0 | yes |
| Excalidraw | EX-1 | 1 | WITHOUT | success | 109s | $0.856 | 2 | 36 | 0 | 15 | 20 | n/a |
| Excalidraw | EX-1 | 2 | WITH | success | 55s | $0.959 | 7 | 6 | 6 | 0 | 0 | yes |
| Excalidraw | EX-1 | 2 | WITHOUT | success | 124s | $1.103 | 2 | 31 | 0 | 14 | 16 | n/a |
| Excalidraw | EX-2 | 1 | WITH | success | 31s | $0.731 | 4 | 3 | 2 | 1 | 0 | yes |
| Excalidraw | EX-2 | 1 | WITHOUT | success | 111s | $0.876 | 2 | 19 | 0 | 10 | 8 | n/a |
| Excalidraw | EX-2 | 2 | WITH | success | 37s | $1.123 | 5 | 4 | 4 | 0 | 0 | yes |
| Excalidraw | EX-2 | 2 | WITHOUT | success | 97s | $0.861 | 2 | 22 | 0 | 9 | 12 | n/a |
| Excalidraw | EX-3 | 1 | WITH | success | 40s | $0.819 | 6 | 5 | 5 | 0 | 0 | yes |
| Excalidraw | EX-3 | 1 | WITHOUT | success | 90s | $0.777 | 2 | 15 | 0 | 5 | 9 | n/a |
| Excalidraw | EX-3 | 2 | WITH | success | 35s | $0.876 | 6 | 5 | 5 | 0 | 0 | yes |
| Excalidraw | EX-3 | 2 | WITHOUT | success | 79s | $0.579 | 2 | 6 | 0 | 3 | 2 | n/a |
| Django | DJ-1 | 1 | WITH | success | 49s | $0.630 | 3 | 2 | 2 | 0 | 0 | yes |
| Django | DJ-1 | 1 | WITHOUT | success | 65s | $1.333 | 7 | 6 | 0 | 4 | 2 | n/a |
| Django | DJ-1 | 2 | WITH | success | 33s | $0.751 | 3 | 2 | 2 | 0 | 0 | yes |
| Django | DJ-1 | 2 | WITHOUT | success | 38s | $0.951 | 7 | 6 | 0 | 3 | 3 | n/a |
| Django | DJ-2 | 1 | WITH | success | 38s | $0.867 | 3 | 2 | 2 | 0 | 0 | yes |
| Django | DJ-2 | 1 | WITHOUT | success | 60s | $1.495 | 8 | 7 | 0 | 5 | 2 | n/a |
| Django | DJ-2 | 2 | WITH | success | 36s | $0.632 | 4 | 3 | 3 | 0 | 0 | yes |
| Django | DJ-2 | 2 | WITHOUT | success | 47s | $1.105 | 6 | 5 | 0 | 3 | 2 | n/a |
| Django | DJ-3 | 1 | WITH | success | 39s | $0.757 | 3 | 2 | 2 | 0 | 0 | yes |
| Django | DJ-3 | 1 | WITHOUT | success | 47s | $1.063 | 7 | 6 | 0 | 4 | 2 | n/a |
| Django | DJ-3 | 2 | WITH | success | 38s | $0.757 | 3 | 2 | 2 | 0 | 0 | yes |
| Django | DJ-3 | 2 | WITHOUT | success | 71s | $0.815 | 2 | 9 | 0 | 3 | 5 | n/a |

### Overall First-Pass Verdict

| Repo | Verdict | Main failure mode if any |
|---|---|---|
| Excalidraw | Pass with one scoped follow-up | `scope shallow` |
| Django | Pass | None observed |
| ZCodeGraph | Pass for fallback displacement; partial for Flow section connectivity | `graph disconnected`, `scope shallow` |

Overall verdict: current `zcodegraph_explore` passes the flow-question Agent
Sufficiency bar for Read/Grep fallback displacement in this matrix. The WITH arm
replaced broad generic exploration with CodeGraph calls, stayed faster overall,
and left two concrete product gaps rather than an unbounded class of failures.

This verdict applies only to flow questions with precise endpoint symbols or
symbol bags. Broad surveys, PR review, edit-task sufficiency, and open-ended
implementation tasks remain outside this evaluation.

### Raw Counts

| Arm | Runs | Duration | Cost | Tools | CodeGraph | Read | Grep/Bash |
|---|---:|---:|---:|---:|---:|---:|---:|
| WITH | 18 | 764s | $19.106 | 68 | 66 | 2 | 0 |
| WITHOUT | 18 | 1506s | $23.210 | 262 | 0 | 127 | 125 |

### Read/Grep Fallback Displacement

Raw Read/Grep counts are reported above; displacement is the product signal.
Because these were flow-only prompts, generic Read/Grep-style calls in the
WITHOUT arm are classified as expected answer-evidence fallback. In the WITH arm,
only the two Excalidraw `App.tsx` reads were classified as fallback.

- Generic Read fallback: 127 -> 2.
- Generic Grep/Bash fallback: 125 -> 0.
- Total tool calls: 262 -> 68.
- Duration: 1506s -> 764s.
- Cost: $23.210 -> $19.106.

### Repo Verdicts

| Repo | WITH fallback R/G | WITHOUT fallback R/G | Flow connected | Verdict |
|---|---:|---:|---|---|
| Excalidraw | 2 Read / 0 Grep | 56 Read / 67 Grep/Bash | 6/6 WITH runs | Pass with scoped sufficiency gap |
| Django | 0 Read / 0 Grep | 22 Read / 16 Grep/Bash | 6/6 WITH runs | Pass |
| ZCodeGraph | 0 Read / 0 Grep | 49 Read / 42 Grep/Bash | 3/6 WITH runs | Pass on fallback displacement; partial on Flow quality |

### Findings

Excalidraw displaced nearly all generic fallback. The only residual fallback was
two `App.tsx` reads in `EX-1 run1` and `EX-2 run1`, after the Flow section had
already surfaced the relevant `Scene.onUpdate` wiring. This is classified as
`scope shallow`: the graph found the right region and dynamic boundary, but the
answer was not self-contained enough for the agent to stop. Follow-up: #43.

Django is the clean positive control. All 6 WITH runs connected the query/compiler
flow, used zero generic Read/Grep calls, and improved duration, tool count, and
cost against the WITHOUT arm. No recurring failure mode was observed.

ZCodeGraph self-queries displaced all generic fallback: 0 Read and 0 Grep in the
WITH arm versus 49 Read and 42 Grep/Bash in the WITHOUT arm. However, only 3 of 6
WITH runs reported an end-to-end connected Flow section. This is not a fallback
regression, but it is a product quality gap for Explore's Flow section. Classify
it as `graph disconnected` where the named path fails to connect and
`scope shallow` where the answer is sufficient for the agent but the Flow section
does not carry the complete path. Follow-up: #48.

There is no grounded evidence in this matrix for `scope missing`, `scope noisy`,
`scope stale`, or `agent ignored evidence` as recurring failure modes. Do not
propose heuristic changes for those categories from this dataset.

### Follow-up Issues

- #43: eliminate the remaining Excalidraw `App.tsx` fallback reads.
- #48: improve Explore Flow section connectivity for ZCodeGraph self-queries.

### Follow-up Validation — #43

Issue #43 tightened the Excalidraw callback evidence for the residual
`App.tsx` reads in `EX-1 run1` and `EX-2 run1`. The 2026-06-12 follow-up reran
the Excalidraw prompts with the local build and WITH-ZCodeGraph MCP only. Logs
were written under `/tmp/z43-agent-runs/`.

Deterministic probes confirmed that `zcodegraph_explore` now includes a
`Dynamic-dispatch evidence` section for the callback bridge:

```text
triggerUpdate -> triggerRender [callback via `onUpdate`
  @packages/excalidraw/components/App.tsx:3146
  - `this.scene.onUpdate(this.triggerRender);`]
```

Agent reruns:

| Prompt | Run | Duration | Cost | Turns | Tools | CodeGraph | Read | Grep | Bash |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| EX-1 | 1 | 38s | $0.901 | 7 | 6 | 6 | 0 | 0 | 0 |
| EX-1 | 2 | 42s | $0.987 | 7 | 6 | 6 | 0 | 0 | 0 |
| EX-2 | 1 | 33s | $0.793 | 3 | 2 | 2 | 0 | 0 | 0 |
| EX-2 | 2 | 39s | $0.808 | 3 | 2 | 2 | 0 | 0 | 0 |
| EX-3 | 1 | 38s | $0.676 | 5 | 4 | 4 | 0 | 0 | 0 |
| EX-3 | 2 | 59s | $1.154 | 7 | 6 | 6 | 0 | 0 | 0 |

Result: #43 passes. EX-1 and EX-2 both completed twice with zero generic
Read/Grep/Bash fallback, and the EX-3 no-regression prompt also completed twice
with zero generic fallback.

## Per-Run Template

Copy this template once per run.

```markdown
### <repo> <prompt-id> <arm> run <n>

- **Repo:**
- **Prompt ID:**
- **Prompt:**
- **Arm:** WITH ZCodeGraph / WITHOUT ZCodeGraph
- **Run:**
- **Command/result directory:**
- **Exit status:**
- **Duration:**
- **Cost:**
- **Turns:**
- **Total tool calls:**
- **Tool sequence:**
- **`zcodegraph_explore` calls:**
- **Explore Flow section connected end-to-end:** yes / no / not applicable
- **Explore-call budget respected:** yes / no / unknown

#### Generic Read/Grep Calls

| Call | Target/query | Classification | Why |
|---|---|---|---|
|  |  | fallback / legitimate deepening / edit-prep / verification / noisy |  |

#### Failure Classification

Use only when the run misses the pass bar:

- scope missing
- scope noisy
- scope stale
- scope shallow
- graph disconnected
- agent ignored evidence

#### Notes

-
```

## Repo Summary Template

Copy this template once per repo after all prompt runs finish.

```markdown
## <repo> Summary

| Prompt | WITH fallback R/G | WITHOUT fallback R/G | Flow connected | Verdict |
|---|---:|---:|---|---|
|  |  |  | yes / no | pass / fail |

### Findings

-

### Follow-up Candidates

-
```

## Overall Summary Template

Fill this after Excalidraw, Django, and ZCodeGraph slices are complete.

```markdown
## Overall First-Pass Verdict

| Repo | Verdict | Main failure mode if any |
|---|---|---|
| Excalidraw | pass / fail |  |
| Django | pass / fail |  |
| ZCodeGraph | pass / fail |  |

### Read/Grep Fallback Displacement

-

### Product Gaps

-

### Follow-up Issues

-
```

## Suggested Commands

Use the existing harness when the corpus and authenticated agent environment are
available:

```bash
bash scripts/agent-eval/run-all.sh <repo> "<prompt>"
node scripts/agent-eval/parse-run.mjs <result-dir>
```

For deterministic diagnosis after failed runs:

```bash
node scripts/agent-eval/probe-explore.mjs <repo> "<symbol bag>"
node scripts/agent-eval/probe-node.mjs <repo> "<symbol>"
```
