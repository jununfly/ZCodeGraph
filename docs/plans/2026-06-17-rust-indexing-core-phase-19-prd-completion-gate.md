# Rust Indexing Core Phase 19: PRD Completion Gate Audit

## Parent

- PRD tracker: [#49](https://github.com/jununfly/ZCodeGraph/issues/49)
- Post-PRD optimization tracker to downgrade if this phase passes: [#165](https://github.com/jununfly/ZCodeGraph/issues/165)
- Next concrete optimization issue to keep open after PRD completion: [#193](https://github.com/jununfly/ZCodeGraph/issues/193)
- Phase 18 decision: `docs/benchmarks/2026-06-17-rust-indexing-core-phase-18-results-and-decision.md`
- PRD: `docs/prds/2026-06-12-rust-indexing-core-vertical-slice.md`

## Context

Phase 18 produced full-profile segmentation and one bounded SQLite write-path A/B. The candidate improved the intended SQLite write segment and preserved sufficiency, but it did not close the original deep performance target.

The PRD completion gate has now been clarified:

- Required targets: ZCodeGraph and Excalidraw.
- Rust remains explicit opt-in.
- TypeScript remains the product default.
- Rust full opt-in path must index end-to-end without Agent Sufficiency regression.
- The active index produced by Rust must be readable by the TypeScript shell and MCP tools.
- Rust wall time must be no more than 30% slower than TypeScript on required targets.
- Rust peak RSS must be no more than 15% higher than TypeScript on required targets.

The original deeper target remains important, but it is no longer the PRD completion gate. It becomes the post-PRD optimization gate:

- Rust should become at least 25% faster than TypeScript or at least 30% lower peak RSS, with the other metric not significantly worse.

Phase 19 is therefore a closeout and evidence-audit phase, not another optimization phase. It should decide whether the opt-in Rust vertical slice is complete under the clarified PRD gate, and it should preserve unresolved performance work in #165 and #193.

## Goal

Produce a decision-grade PRD completion audit for the Rust opt-in vertical slice.

The phase succeeds if it can clearly state one of:

- PRD completion gate passed, with evidence links and remaining optimization work downgraded to post-PRD follow-up.
- PRD completion gate failed, with the exact missing evidence or failing requirement named.
- PRD completion gate is inconclusive, with the smallest targeted smoke or artifact needed to make it conclusive.

## Non-Goals

- Do not make Rust the default product indexer.
- Do not claim default rollout readiness.
- Do not run a new full multi-run benchmark campaign.
- Do not implement another performance optimization in this phase.
- Do not close #165 as "fully optimized"; downgrade it only if the clarified PRD completion gate passes.
- Do not close #193; it remains the next concrete post-PRD optimization issue.
- Do not change SQLite schema, resolver semantics, MCP tool behavior, installer behavior, or packaging/release flow.
- Do not require VS Code sparse to pass the required-target completion gate; it remains stress evidence only.

## Decisions

### Evidence reuse

Phase 19 should reuse Phase 17 and Phase 18 artifacts wherever they already answer the clarified PRD gate. It should not rerun expensive full benchmarks merely to restate numbers already captured on the same local environment and repository snapshots.

Required reusable evidence includes:

- Phase 17 production final-flush validation and decision.
- Phase 18 full-profile required-target after artifacts.
- Phase 18 VS Code sparse final-after stress artifact.
- Existing sufficiency smoke results from the full profile.
- Existing active-index readability evidence from final-flush and CLI/MCP-compatible status/query paths.

### Targeted smoke only

If evidence is missing, Phase 19 should run the smallest targeted smoke that answers the missing question.

Allowed targeted smokes include:

- `--engine rust` index on required targets using the current full opt-in path.
- Active index readability via the TypeScript shell, CLI status/query, or MCP-compatible graph query surface.
- Agent Sufficiency smoke for the required targets.
- RSS availability check or explicit unavailable reason.

Disallowed validation expansion:

- No complete multi-run benchmark campaign.
- No new VS Code sparse rerun unless required evidence is missing and cannot be answered from Phase 18.
- No release/npm smoke unless packaging, CLI status, or release paths are touched by this phase.

### Gate semantics

The phase must separate three states:

- PRD completion gate: the opt-in Rust vertical slice is complete enough under the clarified 30% wall-time / 15% RSS regression envelope.
- Post-PRD optimization gate: the original 25% faster or 30% lower RSS target.
- Default rollout readiness: not claimed by this PRD unless separately proven.

If the PRD completion gate passes but the post-PRD optimization gate fails, #165 should be updated as a post-PRD optimization tracker rather than kept as a blocker to PRD completion. #193 should remain open as the next concrete result-oriented optimization issue.

### Decision record

The final decision record must be explicit about:

- required-target wall-time comparison,
- required-target RSS comparison or unavailable reason,
- graphStats and active-index readability,
- Agent Sufficiency,
- whether #165 is downgraded,
- why #193 remains open,
- why Rust remains opt-in,
- why no default rollout readiness is claimed.

## Issue Sequence

### 19.1 Completion gate evidence audit

Audit existing Phase 17 and Phase 18 artifacts against the clarified PRD completion gate. Produce a table covering ZCodeGraph and Excalidraw:

- TypeScript full wall time.
- Rust full wall time.
- Rust wall-time regression percentage.
- TypeScript peak RSS.
- Rust peak RSS.
- Rust RSS regression percentage or unavailable reason.
- graphStats parity.
- active-index readability.
- Agent Sufficiency.
- source artifact links.

Type: AFK

Blocked by: none

### 19.2 Targeted product smoke for missing evidence

Run only the minimal targeted smoke needed for any missing audit row from 19.1. Prefer required targets over VS Code sparse. Do not rerun a full benchmark campaign.

Type: AFK

Blocked by: 19.1

### 19.3 PRD decision and tracker updates

Write the Phase 19 decision record. If the clarified PRD completion gate passes, update #49 with the completion evidence, downgrade #165 to post-PRD optimization, and keep #193 open as the next concrete optimization issue. If the gate fails or is inconclusive, state the smallest next blocker.

Type: HITL for final decision wording; AFK for artifact collection and draft decision.

Blocked by: 19.1 and 19.2 if targeted smoke is needed

### 19.4 Phase 19 tracker

Track the Phase 19 plan, issue sequence, evidence audit, targeted smoke status, and final decision links.

Type: AFK

Blocked by: none

## Acceptance Criteria

- Phase 19 audit table exists and is grounded in actual artifacts.
- ZCodeGraph and Excalidraw are evaluated against the clarified PRD completion gate.
- Wall-time comparison uses the 30% slower envelope.
- RSS comparison uses the 15% higher envelope, or records a concrete unavailable reason.
- Agent Sufficiency is recorded for required targets.
- Active-index readability by the TypeScript shell / CLI / MCP-compatible path is recorded.
- Any new validation is targeted smoke only.
- No new performance optimization is implemented in this phase.
- #165 is downgraded only if the clarified PRD completion gate passes.
- #193 remains open as the next concrete post-PRD optimization issue.
- The final decision does not claim Rust default rollout readiness.

## Expected Artifacts

- Phase 19 audit artifact under `docs/benchmarks/`.
- Targeted smoke artifact under `docs/benchmarks/`, only if missing evidence requires it.
- Phase 19 decision record under `docs/benchmarks/`.
- GitHub issue sequence and tracker linked from #49, #165, and #193.

## Stop Conditions

Stop and write a decision instead of continuing validation if:

- Existing evidence already proves the clarified PRD completion gate passes.
- Existing evidence already proves the clarified PRD completion gate fails.
- The only missing work is the post-PRD optimization gate.
- A requested smoke expands into a full benchmark campaign.
- A default rollout readiness question appears; record it as out of scope for this PRD.
