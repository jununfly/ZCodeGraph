---
doc-kind: decision
authority: primary
authority-id: ADR-0005
bounded-question: "What architectural trade-off does ZJ-0005-separate-durable-decisions-from-process-artifacts resolve?"
---
# ZJ-0005: Separate durable decisions from process artifacts

## Status

Accepted

ZCodeGraph keeps durable product and architecture memory in `ZJ-CONTEXT.md`,
`docs/decisions/`, `docs/contracts/`, and `docs/methods/`. Active roadmaps and
plans remain roadmap-managed process material. Machine-readable inputs consumed
by tests, scripts, or CI are explicitly promoted to `docs/baselines/`. Raw
profiles, generated experiment summaries, rerun logs, and draft summaries go to
`.tmp/measure/` or their owning issue; they should be consolidated when a
durable decision artifact has absorbed their useful facts.

This keeps benchmark evidence auditable without letting temporary process files
become the project's effective source of truth. Decision artifacts must preserve
the classification, evidence context, and next-step implications that future
agents need. Completed process material and raw historical detail remain
traceable through Git history rather than becoming inputs to current code or
documentation.

