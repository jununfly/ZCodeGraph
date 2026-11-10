---
doc-kind: decision
authority: primary
authority-id: ADR-0016
bounded-question: "Why is the Agent Sufficiency baseline harness provider-agnostic instead of extending the Claude-specific scripts?"
roadmap-node: 1-8-2
date: 2026-11-10
---
# ZJ-0016: Provider-agnostic Agent Sufficiency baseline harness

## Status

Accepted（2026-11-10，Human 确认设计共识后由 grilling 会话收敛）

## Context

`DES-baseline-agent-sufficiency-v1` Trigger Matrix requires an Agent Sufficiency
baseline whenever a change touches Explore output, MCP tools, ranking, or returned
evidence. ADR-0015 D1 repeats that requirement for the retrieval-arm work.

The existing `scripts/agent-eval/` harness cannot satisfy it in a portable way.
Its coupling sits in three layers:

- execution — `run-all.sh`, `run-agent.sh`, `run-arms.sh`, `itrun.sh` all invoke
  one specific agent CLI directly;
- parsing — `parse-run.mjs` and `parse-session.mjs` only understand that CLI's
  stream-json and `~/.claude/projects/` session layout;
- budget — spend is expressed through that CLI's own dollar-budget flag.

The repository already solved the same class of problem once:
`src/installer/targets/types.ts` defines an `AgentTarget` interface and
`registry.ts` makes adding a target one file plus one registry entry, explicitly
closing the Claude-locked installer issue while noting that the runtime MCP
server is already agent-agnostic. The installer abstraction covers
configuration writing only; no agent-runner abstraction exists yet.

`docs/contracts/baseline-agent-sufficiency-v1.md` §Required Evidence lists eight
record categories. No machine-readable schema for them exists anywhere in the
repository; `parse-run.mjs` emits console text, not evidence.

This decision does not authorize product changes, does not change `src/mcp/`,
CLI, MCP ranking, schema, or default Explore behavior, and does not unblock 1-4.

## Decision

### D1 — AgentRunner is the only execution boundary

The harness owns one contract:

```
run({ arm, prompt, mcpConfig, model, maxTurns, ...adapterOptions })
  -> { exitCode, toolCalls, usage, model, turns }
```

The harness constructs the with-vs-without CodeGraph MCP configurations as the
single variable. No provider name, vendor flag, or vendor transcript format
appears in harness code; they belong exclusively to adapters. Timeout and other
adapter-specific knobs are adapter-owned; the harness does not impose a
wall-clock limit.

### D2 — One provider-neutral evidence record

`BaselineTranscript` is a JSON schema carrying the eight DES categories:
corpus and prompt identity, with-vs-without comparison, Read/Grep fallback
displacement, tool-call count, answer sufficiency notes, deepening-vs-fallback
reads, graphStats / fallback taxonomy, and final classification. Tool calls are
normalized to `{ name, callId, arguments, timestamp }`.

`humanReview` is Human-owned: the harness writes it as empty and never decides
answer sufficiency or final classification.

### D3 — Adapter boundary and first instance

Adding a provider means one file under `harness/adapters/` plus one registry
entry; the harness is unchanged. The first adapter is the WorkBuddy-shipped
headless **CodeBuddy CLI Runner** (`adapters/codebuddy.mjs`), invoked through
`AgentRunner`. The legacy `scripts/agent-eval/` scripts are deprecated-but-kept
and remain byte-identical so historical `run-*.jsonl` evidence stays reproducible.

### D4 — Model versions are resolved, never hard-coded

Agent runtimes ship new models continuously. No model identifier is frozen in
code, in this ADR, or in the harness. The model is supplied per run, the actual
model is read back from the transcript, and the shared-config fingerprint
requires every arm of one run to use the same resolved version. A model id that
is superseded later needs no code change.

### D5 — Resource guards belong to the harness

The first adapter's CLI exposes turn, step and token limits but no monetary
budget flag. The harness therefore guards runaway executions by accumulating
turns, tokens and credit from normalized transcripts and hard-stopping a run
when an engineering default is exceeded. These guards are implementation
defaults, not pre-registration values. The single pre-registered hard gate is
ADR-0015's `pilot ceiling = 96 paired-runs`, recorded in
`MET-hard-budget-ceiling-pre-registration`. No measurement run is needed to set
or justify the guards.

### D6 — Falsifiable decoupling and failure semantics

Three acceptance criteria are test-locked:

1. Harness code (excluding `adapters/`) contains no provider-specific name or
   vendor transcript marker.
2. A process-free fake adapter can drive a complete with-vs-without run and
   produce schema-conformant evidence without any external CLI or spend.
3. Registering another adapter requires no change to harness code.

A non-zero exit, timeout, missing transcript, budget breach, or configuration
fingerprint mismatch invalidates and discards the **whole run** (ADR-0015 D4);
partial arms are never retained. High-risk permission bypass flags are not used;
isolation comes from the credential-free read-only snapshot harness.

## Consequences

- **Positive**: the baseline requirement becomes satisfiable by any agent
  runtime; DES evidence becomes machine-readable; historical reports stay
  reproducible; a superseded model needs no code change.
- **Cost**: an adapter must translate each vendor's transcript format; the first
  adapter's stdout mapping is uncalibrated until a real baseline run occurs;
  resource guards are harness-enforced rather than native.
- **Honest statement**: this ADR approves a harness architecture. It produces
  no Agent Sufficiency evidence by itself, does not prove any retrieval arm's
  value, and does not authorize implementation of `ZCG_RETRIEVAL_ARM`, the
  `plan()` wiring, or the pilot.

## Boundaries

- No model identifiers, resource-guard values, task sets, or reviewer names are
  frozen here. Pre-registration owns the 96 paired-run gate and the pilot-time
  fields; resource guards are engineering defaults.
- No `src/`, CLI, MCP, schema, or default Explore changes; product default OFF.
- `e9` unchanged; 1-4 remains pending + blocked; 1-8-1 and 1-8-2 remain parallel.
- No review-trigger records are written into this ADR, any contract, or `docs/README.md`.

## Change history

- 2026-11-10 — **Classification correction, no design change.** D5 originally
  called the harness guard values "pre-registered thresholds" and listed them
  as pre-registration data; Boundaries repeated that classification. They are
  engineering defaults, and ADR-0015's 96 paired-runs is the only pre-registered
  gate. D1's contract signature listed `timeoutMs`, which the harness does not
  pass; timeout is adapter-owned. Consequences no longer presents a calibration
  run as a prerequisite. The architecture, the with-vs-without variable, the
  evidence schema, the adapter boundary and the acceptance criteria are
  unchanged. This clarifies stale wording in roadmap 1-8-2 decisions #7-#9,
  which are retained append-only.

## Related

- `ADR-0015` — ZRA-Paired v1 protocol; D1 baseline trigger and D4 stop rules.
- `DES-baseline-agent-sufficiency-v1` — trigger matrix and required evidence.
- `ZJ-CONTEXT.md` § Baseline Harness Language — canonical terms.
- `scripts/agent-eval/harness/` — this decision's implementation surface.
