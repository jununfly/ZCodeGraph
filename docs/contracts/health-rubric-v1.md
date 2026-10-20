---
doc-kind: contract
authority: primary
authority-id: DES-health-rubric-v1
bounded-question: "How is the zcodegraph health A-F grade computed from the indexed graph?"
---
# Health Rubric v1

Status: active

## Purpose

`health-rubric-v1` freezes the formula behind `zcodegraph health` so the
letter grade a user (or CI gate) sees is reproducible from the schema alone —
no LLM call, no external service, no schema migration.

The rubric is **deduction-based**: every project starts at 100, and each of
six dimensions deducts up to a fixed cap. The remaining score is mapped to
A/B/C/D/F on thresholds that match codeflow exactly, so a codeflow user can
compare grades across the two tools without re-calibration.

## Non-goals

- No security scanning (codeflow's `security` dimension relies on regex
  pattern matching against raw source; ZCodeGraph stores only extracted
  symbols, not raw text, so this dimension is **replaced**, not copied).
- No LLM-based judgment (any "quality" phrasing that cannot be derived from
  `nodes` / `edges` / `files` via SQL is out of scope for v1).
- No git-history-derived dimensions (churn is owned by a separate node
  `1-1-7`; doc freshness by a later rubric version).

## Total score

```
score = 100
      - min(20, D1)          // dead code percentage
      - min(20, D2)          // circular import issues
      - min(15, D3)          // god file issues
      - min(15, D4)          // coupling above threshold
      - min(10, D5)          // long function density
      - min(10, D6)          // orphan node ratio
score = clamp(0..100, round)
```

Grade mapping (identical to codeflow `calcHealth()` in
`index.html:5660-5677`):

| Grade | Score range |
| --- | --- |
| A | 90 – 100 |
| B | 80 – 89 |
| C | 70 – 79 |
| D | 60 – 69 |
| F | 0 – 59 |

The six deduction caps sum to 90; the remaining 10 points are the "base"
every indexed project keeps even under worst-case input. This mirrors
codeflow's 90-point deduction budget.

## Dimensions

### D1 — Dead code percentage (cap 20)

**Formula.** `deadPct = deadFunctions / totalFunctions * 100`, where
`totalFunctions = count(nodes WHERE kind IN ('function','method'))` and
`deadFunctions` = those function/method nodes that have **zero incoming or
outgoing `calls` edges** (both directions — matches codeflow's
`internal+external === 0` definition).

**Deduction.** `min(20, deadPct)` — i.e. every point of dead code percentage
costs 1 point up to 20 % dead.

**Why it matters.** Dead functions inflate the graph without adding
reachable behavior. An agent calling `getCallers(fn)` on a dead symbol gets
zero results and wastes a tool call.

### D2 — Circular import issues (cap 20)

**Formula.** Run Tarjan SCC over the graph whose vertices are `nodes
WHERE kind='file'` and whose arcs are `edges WHERE kind='imports'` (projected
to file-level via the source/target file_path). Count SCCs of size > 1.
`circularIssues = |{ scc : |scc| > 1 }|`.

**Deduction.** `min(20, circularIssues * 5)`.

**Why it matters.** Each strongly-connected component is an import cycle.
Five points per cycle matches codeflow's exact weight.

### D3 — God file issues (cap 15)

**Formula.** A file is a god file when `files.node_count >= 100`. Count
such files: `godIssues = |{ f : f.node_count >= 100 }|`.

**Deduction.** `min(15, godIssues * 3)`.

**Why it matters.** One file owning 100+ symbols is a refactor-risk
concentration point. `node_count` is the closest cheap proxy for "large" —
we deliberately do NOT use `files.size` bytes because raw byte size is
encoding- and minification-sensitive, whereas symbol count tracks actual
structural weight. Threshold 100 was picked against codeflow's
"Large" issue heuristic on the same corpus.

### D4 — Coupling (cap 15)

**Formula.** `avgCoupling = count(edges) / count(files)` over file-level
non-`contains` edges (specifically `kind IN ('imports','calls','extends',
'implements','references','type_of','returns','instantiates','overrides',
'decorates')`). `excessCoupling = max(0, avgCoupling - 3)`.

**Deduction.** `min(15, excessCoupling * 2)`.

**Why it matters.** codeflow deducts only when avgCoupling > 3; we keep the
same threshold and the same 2-points-per-unit penalty so grades are
comparable. `contains` is excluded because it is the structural tree, not
coupling.

### D5 — Long function density (cap 10) — *new vs codeflow*

**Formula.** A function is "long" when `end_line - start_line >= 100`.
`longFnPct = longFns / totalFunctions * 100`.

**Deduction.** `min(10, longFnPct)`.

**Why it matters.** Long functions are where bug density concentrates and
where agents struggle most with context budget — a 200-line function
consumed via `collectContext` eats ~2k tokens. codeflow does not measure
this. tree-sitter gives us exact `start_line`/`end_line` for free; this is
the cheapest useful dimension we can add.

### D6 — Orphan node ratio (cap 10) — *agent-differentiated, new vs codeflow*

**Formula.** A node is an orphan when it has **zero non-`contains` edges**
(either direction). `orphanPct = orphans / count(nodes) * 100`.

**Deduction.** `min(10, orphanPct)`.

**Why it matters.** This is the agent-sufficiency dimension codeflow
cannot compute. A graph where most nodes are isolated is a **dead graph**
for agent purposes — `getCallers`/`getCallees`/`getImpactRadius` all
return empty, and the agent silently falls back to grep. Keeping orphan
ratio low is the structural precondition for the "Agent Sufficiency" north
star (ADR-0001).

## Display panels (not graded)

Mirroring codeflow Card's panels; all read-only and not part of the A-F
formula:

- **scale** — `count(files)`, `count(nodes WHERE kind IN ('function',
  'method'))`, `sum(files.size)` (used as byte-size proxy for LOC), `count(DISTINCT
  language)`.
- **hidden costs** — `circularIssues`, `deadPct`, `avgCoupling` (all three
  are already computed above; we surface them as "lower is better").

**Deferred to v1.1:** the **fragility** panel (top-3 blast-radius files).
Computing blast radius requires a transitive BFS over the resolved symbol
graph and would force us to open the full `CodeGraph` API; v1 keeps the
snapshot read-only over `node:sqlite` for speed and isolation. Track as a
follow-up to roadmap node 1-1-6 if a real user asks for it.

## Implementation constraints

- **Read-only.** The rubric touches `nodes`, `edges`, `files` only via
  `SELECT`; no `INSERT`/`UPDATE`/`DELETE` and no schema migration.
- **No LLM.** Every dimension is pure SQL or pure graph traversal (Tarjan
  SCC is O(V+E) in-process).
- **Single source.** `src/health/rubric.ts` is the only place these
  formulas live; the CLI and any future MCP tool must call into it.
- **Determinism.** For a given `.zcodegraph/index.db`, two runs of
  `zcodegraph health` must produce byte-identical JSON. Tie-breaking in
  "top 3 fragility" is by file path ascending.

## Exit criteria (from roadmap node 1-1-6)

1. This document is the frozen rubric — any formula change requires a new
   version file (`health-rubric-v2.md`) and a migration note.
2. `zcodegraph health` CLI subcommand emits A-F grade + per-dimension
   scores + suggestions, in both `--json` and human-readable form.
3. All six dimensions are SQL/graph-traversal only; no LLM call.
4. Unit + e2e tests green; three-OS CI passes.
