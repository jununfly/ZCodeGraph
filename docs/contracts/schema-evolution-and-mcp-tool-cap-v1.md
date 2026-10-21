---
doc-kind: contract
authority: primary
authority-id: DES-schema-evolution-and-mcp-tool-cap-v1
bounded-question: "What clauses govern schema evolution (NodeKind/EdgeKind/migrations) and the MCP tool-surface cap?"
decided-by:
  - "1-2-7"
last-reviewed: 2026-10-21
---
# Schema Evolution & MCP Tool-Cap Contract v1

Status: active

## Purpose

This contract freezes two **transverse** clauses that apply to every future
capability landing on ZCodeGraph, regardless of which roadmap node ships it:

1. **Schema evolution clause** — what must accompany any change to
   `NodeKind` / `EdgeKind` / pre-computed tables / persisted columns.
2. **MCP tool-cap clause** — the hard ceiling on the MCP tool surface and
   the default destination for new analytical capability.

Both clauses exist because of one empirical fact (recorded in `AGENTS.md`
and REFINED-PLAN §0 P-5): **new MCP tools are very rarely adopted by
agents**. `zcodegraph_trace` and `zcodegraph_context` were retired for
exactly this reason. The cost of ignoring these clauses is silent index
corruption (schema drift) and tool-surface bloat that the agent never
pays back.

Roadmap source: capability-harvest-roadmap node **1-2-7**.

## Non-goals

- This contract does **not** pick winners among future capabilities. It
  only governs *how* a capability lands, not *whether* it should.
- It does **not** redefine the six-word health vocabulary, MCP tool
  semantics, or `server-instructions.ts` — those remain governed by
  their own contracts (see `DES-health-rubric-v1`, issue #529).

## Clause 1 — Schema evolution

Any change that **adds** a `NodeKind`, `EdgeKind`, pre-computed table, or
persisted column MUST satisfy all three of the following, in the same
commit:

1. **Migration entry** in `src/db/migrations.ts`. The entry's `version`
   MUST equal `CURRENT_SCHEMA_VERSION + 1` (pre-bump), and the same
   commit MUST bump `CURRENT_SCHEMA_VERSION` to that value. Versions
   MUST be strictly increasing across the `migrations` array.
2. **Old-CLI / new-library compat strategy** written into the migration
   entry's `description` field. The strategy MUST answer: *if an older
   zcodegraph binary (with `CURRENT_SCHEMA_VERSION < N`) opens a database
   already at version N, what is the guaranteed behavior?* Acceptable
   answers include: `read-only compatible`, `refuses with error E`,
   `silently ignores column X`. "Undefined" is not acceptable.
3. **Cost-matrix adjustment** if the change adds per-index or per-query
   cost (new index, new column to backfill, new traversal join). The
   adjustment goes into `docs/contracts/baseline-indexing-performance-v1.md`
   when the cost is material (>5% on the standard corpora).

Mechanical guardrail: `tests/schema-evolution-clause.test.ts` asserts
`CURRENT_SCHEMA_VERSION === max(migrations[].version)` and that versions
are strictly increasing. It does **not** validate clause 1.2 (that is a
human review item).

### Existing gap (recorded, not silently fixed here)

`src/db/index.ts:100` currently handles only
`currentVersion < CURRENT_SCHEMA_VERSION` (upgrade path). The opposite
direction — an old binary opening a newer database — is **silently
allowed** today. Closing that hole is a behavior change and belongs to
its own node; this contract only mandates that *future* migrations write
the compat strategy into `description` so the decision is explicit at
review time.

## Clause 2 — MCP tool surface cap

The MCP tool surface exposed by `src/mcp/tools.ts` `tools[]` MUST stay
**≤ 12 entries** at all times. As of this contract the count is **8**
(`search`, `callers`, `callees`, `impact`, `node`, `explore`, `status`,
`files`), leaving a headroom of 4.

New analytical capability MUST be routed in this order:

1. **Default: fold into an existing tool.** `explore` and `status` are
   the designated carriers — `explore` already supports budget / dynamic
   description, `status` already carries health, grammar diagnostics, and
   missing-wasm segments. Dead-code signals, complexity metrics, capability
   probes all belong here as new sections, not new tools.
2. **If folding is impossible** (the capability requires a new input
   shape, or its output cannot share a budget with `explore`), the next
   destination is a **CLI subcommand** (e.g. `zcodegraph badge`,
   `zcodegraph churn`, `zcodegraph affected`). SVG / archify / health-card
   renderings are CLI/CI exits only — they MUST NOT become MCP tools.
3. **A new MCP tool is the last resort** and requires passing the gate
   *"will an agent actually call this?"* — documented in the migration
   node's `decide` entry with empirical evidence (A/B or corpus replay).
   Without that evidence the capability stays at step 1 or 2.

Mechanical guardrail: `tests/mcp-tool-cap.test.ts` asserts
`tools.length <= 12`. The tiny-repo gate (`<500` files → 3 tools) is
independent of this cap and remains governed by `src/mcp/tools.ts:696`.

## Clause 3 — Single source of truth for agent-facing tool guidance

`src/mcp/server-instructions.ts` remains the **only** place where
agent-facing tool usage guidance is edited (issue #529). Installer
targets do **not** write a duplicate `## CodeGraph` block into
`AGENTS.md` / `~/.codex/AGENTS.md` / `.cursor/rules/codegraph.mdc`.
Any change to tool semantics MUST be reflected there, not in
installer templates.

## Supersession

This contract is superseded only by an explicit `DES-schema-evolution-and-mcp-tool-cap-v2`
carrying `supersedes: [DES-schema-evolution-and-mcp-tool-cap-v1]` in
frontmatter. Silent edits to the numbers (12, 8, 4) are review signals,
not supersession.

## Cross-references

- `DES-health-rubric-v1` — six-word health vocabulary; the `status`
  tool's health segment renders from this rubric.
- `DES-dead-code-rubric-v1` — example of a capability routed per
  Clause 2 step 1 (will surface as an `explore` / `status` section,
  not a new MCP tool).
- REFINED-PLAN §0 P-5 / §6 — empirical basis for the ≤12 cap.
- ADR ZJ-0008 — `init` merged into `index`; precedent for "fold
  capability into an existing surface rather than adding a new one".
