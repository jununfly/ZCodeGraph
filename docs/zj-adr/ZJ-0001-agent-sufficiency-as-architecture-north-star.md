# ZJ-0001: Use Agent Sufficiency as the architecture north star

## Status

Accepted

## Context

ZCodeGraph is a fork-productized code understanding tool. Its highest-value user outcome is not merely having a more complete internal code graph; it is helping coding agents answer and act with fewer generic Read/Grep-style fallbacks.

The architecture review identified several candidates for deepening the codebase:

- Explore Answer planner / Output Budget seam.
- Dynamic dispatch synthesizer registry / seam.
- Index pipeline module.
- Extraction parse execution module.
- CLI command adapter / execution context seam.
- Installer target adapter contract hardening.
- Query/storage Access Model seam.

Without a shared decision criterion, those candidates can optimize different things: graph completeness, file decomposition, output size, trace adoption, or benchmark cost. The project needs a durable north star that ties architecture work to observable agent behavior.

Relevant durable docs:

- `ZJ-CONTEXT.md`
- `docs/designs/architecture-roadmap.md`
- `docs/designs/adaptive-explore-sizing.md`
- `docs/benchmarks/call-sequence-analysis.md`
- `docs/benchmarks/answer-directly-vs-explore-agent.md`

## Decision

Use **Agent Sufficiency** as the architecture north star.

For architecture work, ZCodeGraph should optimize for answers that give agents enough code understanding to continue the task without falling back to generic Read/Grep-style tools.

The project adopts these supporting concepts:

- **Explore Answer**: a bounded hypothesis about what code context an agent needs next, produced from the user's query and current code graph.
- **Evidence Scope**: the answer evidence boundary selected by an Explore Answer.
- **Output Budget**: the limited answer capacity spent to make the Evidence Scope useful for the agent's next step.
- **Evidence Value**: the expected contribution of evidence to Agent Sufficiency within the current Evidence Scope and Output Budget.
- **Read/Grep Fallback**: expected answer evidence recovery via generic tools.

This ADR intentionally records the conceptual frame as one decision. Sub-decisions about these concepts should only become separate ADRs when they introduce independently reversible implementation trade-offs.

The first tech-design artifact for this direction is `docs/designs/architecture-roadmap.md`, which keeps implementation-oriented tiers and benchmark classifications out of the domain glossary.

## Consequences

### Positive

- Architecture candidates can be compared by whether they improve agent-facing sufficiency, not just internal graph completeness.
- Candidate 1, the Explore Answer planner / Output Budget seam, becomes the recommended starting point because it directly controls the evidence an agent receives.
- Testing can target planner decisions: Evidence Scope selection, Output Budget allocation, rendering fidelity, and benchmark-level fallback reduction.
- Benchmarks can classify failures as scope missing, scope noisy, scope stale, or scope shallow instead of only reporting raw Read/Grep counts.

### Negative / trade-offs

- Graph completeness improvements are not automatically considered wins unless they improve agent-facing answers.
- Raw Read/Grep counts need interpretation; some reads are legitimate deepening reads rather than fallback failures.
- Planner behavior may need real-agent A/B validation, because deterministic probes cannot fully capture agent stopping behavior.

## Guardrails

- Do not treat "zero Read" as the absolute goal. The goal is reducing **fallback** reads while preserving legitimate deepening, edit-prep, and verification reads.
- Do not optimize for filling token/character budgets. Output Budget should be spent according to Evidence Value.
- Do not rename internal `CodeGraph` API/domain terms or `.codegraph/` storage as part of this architecture direction.
- Keep domain language in `ZJ-CONTEXT.md`; keep implementation tiers and benchmark interpretation rules in design docs.

## Alternatives considered

### Code Graph Completeness as north star

Rejected as the primary north star. Graph completeness matters, especially for dynamic dispatch coverage, but a more complete graph is only valuable when the agent-facing answer exposes the right evidence.

### Token or payload reduction as north star

Rejected. Benchmarks showed that smaller payloads can regress if they force the agent to recover missing bodies via Read/Grep. Lean output is good only when it remains sufficient.

### Architecture Depth as north star

Rejected as the top-level criterion. Deep modules and seams are valuable engineering tools, but they need to serve an agent-facing outcome.

## Follow-up

- Candidate 1 should produce a concrete Explore planner design with testable intermediate output.
- Candidate 2 should be evaluated as a multiplier: better graph connectivity increases the evidence available to the planner.
- Benchmark tooling should distinguish fallback reads from legitimate deepening, edit-prep, verification, and irrelevant/noisy reads.
