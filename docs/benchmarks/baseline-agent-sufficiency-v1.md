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
