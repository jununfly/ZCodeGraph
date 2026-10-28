---
doc-kind: method
authority: primary
authority-id: MET-agent-routing
bounded-question: "Should an agent answer 'how does X work?' directly with CodeGraph in the main session, or delegate exploration to a sub-agent?"
page-form: reference
---

# Agent Routing — Answer Directly vs Delegate to Sub-Agent

> Method contract for the MCP `server-instructions.ts` routing rule. Based on
> the 0.9.4 interactive A/B (2026-05-24, Claude Code TUI, Excalidraw 643
> files + VS Code ~10.7k files).

## Verdict

**Answer directly with CodeGraph. Do not delegate exploration to a sub-agent
(Explore / Task agent) when CodeGraph MCP is present.**

This applies uniformly to **Claude Code, Codex, Cursor, opencode** — Codex /
Cursor / opencode have no Explore-agent mechanism and would otherwise fall
back to reading files directly, and Claude Code's delegation path is
empirically *worse* on every axis that matters.

## Why — the measurement

The study asked whether main-session context balloons at scale without
delegation, and whether a sub-agent's transcript absorbs the file reads more
cheaply than answering directly.

### Methodology

- **Harness**: interactive Claude Code TUI via `scripts/agent-eval/itrun.sh`
  (tmux) — **not** headless `claude -p`. Headless spawns **0** Explore
  agents, so only the interactive TUI measures delegation behavior at all.
- **Arms**: WITH = CodeGraph in MCP config; WITHOUT = empty MCP config
  (`--strict-mcp-config`).
- **Model**: `opus`. **n = 3 runs per arm.** Main **and** sub-agent
  transcripts parsed; reads and bash summed across main + sub-agents.
- **Repos**: Excalidraw (643 files, medium) and VS Code (~10.7k files,
  large — ~16× Excalidraw).
- "Main-session context" is the TUI's reported `Context X/Y` for the *main*
  thread (sub-agent context does not count against it).

### Excalidraw (643 files)

Question: *"How does Excalidraw render and update canvas elements?"*

| metric | WITH codegraph | WITHOUT |
|---|---|---|
| Explore agents spawned | 0 / 0 / 0 | 0 / 1 / 1 (delegated 2 of 3) |
| main-session context | 51k / 49k / 50k (~50k) | 48k / 34k / 26k (~36k) |
| total tool calls | 4 / 4 / 4 | 16 / 55 / 37 |
| Reads (main+sub) | 0 / 0 / 0 | 6 / 25 / 16 |
| billable tokens | ~127k | ~175k |

### VS Code (~10.7k files, ~16× Excalidraw)

Question: *"How does the extension host communicate with the main process?"*

| metric | WITH codegraph | WITHOUT |
|---|---|---|
| main-session context | 47k / 43k / 50k (~47k) | 54k / 29k / 31k (~38k) |
| Explore agents | 0 / 0 / 0 | 0 / 1 / 1 (delegated 2 of 3) |
| codegraph calls | ~8 (search + explore×2–3 + context) | 0 |
| Reads (main+sub) | 0 / 1 / 0 | 6 / 26 / 19 |
| billable tokens | ~126k | ~176k |

## Findings

**Main-session context is scale-invariant with CodeGraph.** With codegraph,
main-session context was **~47k on VS Code — essentially identical to
Excalidraw's ~50k**, despite a 16× larger repo. It did not balloon. The
reason: CodeGraph's `explore` payload is **budget-capped** and retrieval is
**targeted** — answering one question pulls in the relevant *flow/area*, not
more just because the repo is huge.

The thing that *would* balloon at scale is reading many big files directly
into main. Claude Code avoids that **without** codegraph by delegating to an
Explore agent (29–31k main), but at the cost of **17–26 reads** and **~28 %
more tokens**. CodeGraph keeps main lean a *better* way: a capped, targeted
payload — no delegation, **0 reads**.

**On "the Explore agents use codegraph."** Could not reproduce: across **6/6**
with-codegraph runs (both repos), Claude Code **never delegated** — it
answered directly every time. The Explore-agent path only appeared in the
WITHOUT arm (using grep/read, since codegraph was not in that config). With
the current instructions + codegraph present, Claude Code stays in the main
session — the lean-main-via-Explore-agent best case simply is not what
happens; lean-main-via-capped-codegraph is, and it is cheaper.

## Implications for `server-instructions.ts`

The MCP `initialize` instructions **must** steer agents toward answering
directly with CodeGraph and **must not** recommend spawning an Explore / Task
sub-agent for code exploration. Earlier wording ("NEVER call
`zcodegraph_explore` directly / ALWAYS spawn an Explore agent") pushed
Claude Code toward the worse path — that wording has been removed and must
not be reintroduced.

## Caveat / future work

An Explore agent that *itself uses codegraph* could in principle get
lean-main *and* low-work. The "answer directly" instruction currently
prevents delegation in practice (0 delegations observed across 6 runs), the
main-context gain would be marginal (~50k → ~30k, both a few percent of a 1M
window), and it adds a sub-agent round-trip. Worth a future experiment, not
a default.

## Out of scope

- Per-agent instruction splits. The unified "answer directly" rule is
  correct for every agent target.
- Headless `claude -p` runs. Headless spawns 0 Explore agents, so the
  question this page answers does not arise in that mode.
