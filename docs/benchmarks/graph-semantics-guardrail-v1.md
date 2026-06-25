# Graph Semantics Guardrail v1

Status: active

## Purpose

`graph-semantics-guardrail-v1` defines the minimum evidence contract for changes
that touch graph semantics, resolver/finalization ownership, edge writing,
cleanup, fallback behavior, or language/framework extraction.

The guardrail answers one question: did the graph remain trustworthy enough for
Agent Sufficiency work to continue?

This is a standard, not a one-off result artifact. Result artifacts may live in
`docs/benchmarks/` when they are durable baseline/result/decision records. Short
process evidence should stay with the issue or plan that produced it.

## Required Trigger

Use this guardrail for any production change that touches:

- graph-visible nodes or edges;
- resolver, finalization, edge-write, or cleanup ownership;
- fallback taxonomy, unsupported-shape handling, or unresolved-reference
  retention/deletion;
- language or framework extraction that can change graph shape;
- Explore Answer, MCP tool output, or user-facing sufficiency claims.

Pure IO, packaging, documentation, profile-label, or write-path optimization
changes may use `baseline-indexing-performance-v1` without a full semantic
guardrail only when graph output and fallback taxonomy are intentionally
unchanged and the closeout states that explicitly.

## Hard Gate

A graph-semantics closeout cannot pass unless all three evidence lanes are
present.

### 1. graphStats

Record `graphStats` for the affected corpus or fixture. At minimum, capture
file count, node count, edge count, node-kind counts, and edge-kind counts when
available.

Classify graphStats as one of:

- `stable` - no graph-visible movement beyond accepted noise;
- `changed-expected` - movement is expected, explained, and tied to the change;
- `changed-unexpected` - movement is unexplained or outside the planned scope;
- `unavailable` - graphStats could not be collected.

`stable` and `changed-expected` may pass. `changed-unexpected` and `unavailable`
require a blocker, no-go, or explicit maintainer decision before production
keep.

### 2. fallback taxonomy

Record fallback taxonomy from the profile artifact, doctor bundle, or relevant
public diagnostic bucket.

Valid sources include, but are not limited to:

- `finalize.fallbackTaxonomy`;
- `guardedEdgeWrite.skipReasons`;
- `moduleEdgeWrite.skipReasons`;
- package self-name or package imports outcome counts;
- TypeScript fallback append diagnostics;
- rust-owned per-file fallback taxonomy in doctor/status artifacts.

The closeout must explain whether fallback taxonomy is stable, reduced by an
expected ownership migration, or changed for another expected reason.

Unsupported, unresolved, or intentionally skipped evidence must not disappear
silently. If cleanup or edge-write ownership deletes unresolved rows, the
fallback reason must still be visible in a public diagnostic artifact.

### 3. RSS

Record peak RSS or an explicit unavailable reason.

Acceptable fields include:

- `peakRssBytes`;
- `rssUnavailableReason`;
- `rssUnavailableKind`;
- a runner-specific RSS source such as `procfs`, `process-tree`, or `command`.

RSS does not need to improve for this guardrail to pass. The hard requirement is
that resource evidence is present or its absence is explainable.

## Required Result Fields

Every durable result or closeout that claims this guardrail should include:

- guardrail id: `graph-semantics-guardrail-v1`;
- issue, plan, or roadmap node being closed;
- ZCodeGraph git commit;
- corpus or fixture identity;
- command invocation or deterministic test name;
- graphStats summary and classification;
- fallback taxonomy summary and classification;
- RSS value or unavailable reason;
- final classification: `pass`, `fail`, `needs-human-review`, or `not-run`;
- explanation for any graphStats or fallback taxonomy movement.

## Relationship To Other Baselines

`baseline-indexing-performance-v1` is the default baseline for indexing speed
and resource optimization. It already records graphStats, fallback taxonomy, and
RSS status, so a performance result may also satisfy this guardrail when it
contains the required classifications.

`baseline-agent-sufficiency-v1` remains the north-star guardrail when graph
semantics, Explore output, MCP tools, language/framework extraction, or
user-facing sufficiency claims change. This graph-semantics guardrail does not
replace Agent Sufficiency when that baseline is triggered; it supplies the
lower-level evidence needed to interpret sufficiency results.

Use the `baseline-agent-sufficiency-v1` Trigger Matrix to decide whether this
guardrail is sufficient by itself. This document owns the low-level evidence
contract; the Agent Sufficiency baseline owns the user-facing trigger policy.

## Pass/Fail Interpretation

Pass:

- graphStats are stable or changed only in an expected, explained way;
- fallback taxonomy is visible and stable or changed in an expected, explained
  way;
- RSS is recorded or has a clear unavailable reason.

Fail:

- graphStats moved unexpectedly;
- fallback taxonomy evidence disappeared or became unexplainable;
- RSS is missing without an unavailable reason;
- the closeout claims semantic safety without the three required evidence lanes.

Needs human review:

- evidence is complete but interpretation depends on product judgment;
- a graphStats movement is expected but materially changes user-visible graph
  behavior;
- Agent Sufficiency results conflict with low-level graph evidence.

## Out Of Scope

This guardrail does not require a full agent A/B campaign, a full scoreboard
run, VS Code sparse smoke, or a new RSS sampler. Those are selected by the
owning plan when the scope warrants them.

This guardrail also does not define TypeScript moduleResolution exactness,
package-resolution oracle behavior, or exact `NS.member` style symbol semantics.
Those remain separate semantic slices.
