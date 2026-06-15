# Explore Sufficiency Evaluation Plan — 2026-06-11

## Goal

Validate the current `zcodegraph_explore` Agent Sufficiency for flow questions.

This is an effectiveness evaluation, not an architecture-completion check. The
architecture seams are already validated in
`docs/design/architecture-roadmap-validation.md`; this plan measures whether the
current Explore Answer is sufficient enough that agents stop using generic
Read/Grep to recover expected flow evidence.

## Primary Metric

Use **Read/Grep Fallback displacement** as the primary metric.

A Read/Grep call counts as fallback only when it recovers evidence that the
Explore Answer was expected to provide under the current graph/output contract.

Do not use raw Read count as the primary metric. Classify each generic file or
text-search call as one of:

- **Fallback read/search** — expected answer evidence recovery.
- **Legitimate deepening read/search** — the agent inspects beyond the promised
  Evidence Scope after ZCodeGraph has already narrowed the target.
- **Edit-prep read/search** — the agent is preparing a concrete code change.
- **Verification read/search** — the agent checks tests, fixtures, generated
  files, or config because the task requires verification.
- **Noisy read/search** — irrelevant or agent-thrashing behavior that should be
  recorded but not treated as product evidence without transcript review.

## Tool Surface

Evaluate the current product surface:

- Primary: `zcodegraph_explore`
- Secondary drill-down: `zcodegraph_node`

Do not evaluate removed or historical `trace`/`context` behavior in this pass.
Historical benchmark conclusions remain useful context, but the current question
is whether the current Explore Answer is sufficient.

## Task Class

First pass scope: **flow questions only**.

Good prompt shapes:

- "How does X reach Y?"
- "How does updating X re-render Y?"
- "How does request X reach handler/service/repository Y?"

Each prompt should include endpoint symbols or a precise symbol bag so
`zcodegraph_explore` can surface its Flow section.

Out of scope for this pass:

- Broad surveys: "Explain module X."
- Edit-location tasks: "Where should I change feature Y?"
- PR reviews.
- Concrete implementation tasks.

Those tasks use different sufficiency standards and should get their own
evaluation plan.

## Repositories

Use three representative repos for the first pass:

| Repo | Why |
|---|---|
| Excalidraw | Historical worked example for React observer → render → JSX child → canvas rendering. |
| Django | Stress test for God Files, Polymorphic Families, Source Depth, and budget pressure. |
| ZCodeGraph | Current local codebase; validates whether the new planner/renderer architecture is self-explainable. |

Do not start with the full README benchmark corpus. First stabilize the
classification rules and pass bar on this smaller matrix.

## Prompt Matrix

Use 3 flow prompts per repo.

Draft prompt requirements:

- Must name concrete endpoint symbols or a symbol bag.
- Must ask for a mechanism path, not a broad overview.
- Must be answerable from the current graph + source snippets.
- Must have an expected flow that can be checked from the transcript.

Before running, record the exact prompts in the results document so runs are
reproducible.

## Runs

Initial matrix:

- 3 repos
- 3 prompts per repo
- 2 arms: WITH ZCodeGraph and WITHOUT ZCodeGraph
- 2 runs per arm

Total: 36 agent runs.

Run more only after reviewing variance. Do not draw a conclusion from a single
run per arm.

## Pass Bar

For flow questions, `zcodegraph_explore` passes when:

- Fallback Read/Grep is near zero within the repo's explore-call budget.
- The agent reaches the mechanism path without reconstructing it through generic
  file reads or text search.
- Total turns, duration, and cost do not regress against the WITHOUT arm.
- Any remaining Read/Grep calls are classifiable as legitimate deepening,
  edit-prep, verification, or noisy behavior rather than fallback.

If raw Read count is nonzero but transcript review shows no fallback reads, the
Explore Answer can still pass.

## Result Format

Record results in a separate document, not in this plan.

Recommended result file:

`docs/benchmarks/explore-sufficiency-2026-06-11.md`

For each run, capture:

- Repo, prompt, arm, run number.
- Tool sequence.
- `zcodegraph_explore` calls and whether Flow section connected end-to-end.
- Generic Read/Grep calls with classification.
- Turns, duration, cost, and total tool calls.
- Short failure classification if the run misses the pass bar:
  - scope missing
  - scope noisy
  - scope stale
  - scope shallow
  - graph disconnected
  - agent ignored evidence

## Non-Goals

- Do not add new Explore heuristics during this evaluation.
- Do not change MCP tool descriptions or server instructions before the baseline
  run.
- Do not mix broad survey prompts into the flow-question pass.
- Do not treat deterministic probes as sufficient evidence. Probes can explain a
  failure, but the primary evidence is real agent behavior.

## Suggested Commands

Use the existing benchmark harness when the corpus and authenticated agent
environment are available:

```bash
bash scripts/agent-eval/run-all.sh <repo> "<prompt>"
node scripts/agent-eval/parse-run.mjs <result-dir>
```

For deterministic diagnosis of a specific flow after a failed run:

```bash
node scripts/agent-eval/probe-explore.mjs <repo> "<symbol bag>"
node scripts/agent-eval/probe-node.mjs <repo> "<symbol>"
```
