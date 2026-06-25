# Baseline: Agent Sufficiency v1

Status: active

## Purpose

`baseline-agent-sufficiency-v1` preserves Agent Sufficiency as the north-star
guardrail for performance work without requiring a full agent A/B campaign for
every low-level indexing optimization.

Agent Sufficiency means CodeGraph gives agents enough structural evidence to
continue the task without falling back to generic Read/Grep recovery.

## Required Trigger

Run this baseline when a change touches:

- graph semantics;
- resolver/finalization behavior;
- Explore output;
- MCP tools;
- language or framework extraction;
- user-facing sufficiency claims.

Pure write-path, IO, profile, diagnostic, or packaging-neutral optimization
issues default to graphStats and fallback taxonomy guardrails instead of this
full baseline.

## Trigger Matrix

| Change shape | Default outcome | Required evidence |
|---|---|---|
| graph semantics | Agent Sufficiency required | Run this baseline, plus `graph-semantics-guardrail-v1` evidence for graphStats, fallback taxonomy, and RSS status. |
| resolver/finalization behavior | Agent Sufficiency required | Run this baseline unless the change is proven graph-invisible; record `graph-semantics-guardrail-v1` either way. |
| Explore output | Agent Sufficiency required | Run this baseline because the agent-facing answer changed directly. |
| MCP tools | Agent Sufficiency required | Run this baseline when tool behavior, shape, ranking, or returned evidence changes. |
| language or framework extraction | Agent Sufficiency required | Run this baseline for the affected language/framework slice, with representative prompts when available. |
| user-facing sufficiency claims | Agent Sufficiency required | Run this baseline before making or preserving the claim. |
| pure non-semantic changes | graph-semantics guardrail sufficient | Use `graph-semantics-guardrail-v1` when graph output and fallback taxonomy are intentionally unchanged. |
| product-sensitive interpretation | maintainer review required | Escalate when evidence is complete but the keep/no-go decision depends on user-visible tradeoffs. |

Pure non-semantic changes include IO, packaging, profile-label, docs-only,
write-path-neutral, and diagnostic-only work that does not change graph shape,
fallback taxonomy, Explore Answer content, MCP tool output, or user-facing
sufficiency claims.

`graph-semantics-guardrail-v1` is sufficient without this baseline only when the
closeout explicitly states why Agent Sufficiency was not triggered.

Maintainer review is required when product-sensitive interpretation remains
after evidence is complete, for example when a graphStats movement is expected
but user-visible, when Agent Sufficiency evidence conflicts with low-level graph
evidence, or when a regression may be accepted for a deliberate product reason.

## Required Evidence

When triggered, record:

- corpus and prompt identity;
- with-vs-without CodeGraph comparison when the change warrants agent A/B;
- Read/Grep fallback displacement;
- tool-call count;
- answer sufficiency notes;
- whether the run shows legitimate deepening reads or fallback reads;
- graphStats and fallback taxonomy when graph semantics changed;
- final classification: preserved, improved, regressed, inconclusive, or
  needs-human-review.

## Interpretation

Do not treat zero Read as the absolute goal. The goal is reducing fallback reads
while preserving legitimate deepening, edit-prep, and verification reads.

If a performance candidate improves wall time or RSS but regresses Agent
Sufficiency, the candidate cannot be kept as a production direction without a
separate architecture or product decision.
