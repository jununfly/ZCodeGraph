# Explore Sufficiency Benchmark — 2026-06-11

## Purpose

This document is the run sheet and result template for issue #38.

It evaluates current `zcodegraph_explore` Agent Sufficiency for flow questions
using **Read/Grep Fallback displacement** as the primary metric.

No benchmark runs have been executed in this slice. This document defines the
prompt matrix and stable result format for the follow-up run issues.

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
