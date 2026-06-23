# ZJ-0005: Separate durable decisions from process artifacts

## Status

Accepted

ZCodeGraph keeps durable product and architecture memory in `ZJ-CONTEXT.md`,
`docs/zj-adr/`, PRDs, roadmaps, plans, and closeout/decision artifacts. Raw
profiles, generated experiment summaries, rerun logs, and draft summaries may
live in `docs/benchmarks/` while they support active decisions, but they should
be consolidated and deleted when a durable decision artifact has absorbed their
useful facts.

This keeps benchmark evidence auditable without letting hundreds of temporary
process files become the project's effective source of truth. The trade-off is
intentional: raw historical detail can be removed once it is no longer
referenced or replay-useful, but decision artifacts must preserve the
classification, evidence context, and next-step implications that future agents
need.

