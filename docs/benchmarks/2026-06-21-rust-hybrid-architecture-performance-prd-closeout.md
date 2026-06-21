# Rust-Hybrid Architecture/Performance PRD Closeout

Date: 2026-06-21

## Scope

This closes the architecture/performance PRD:

- PRD: `docs/prds/2026-06-19-rust-hybrid-architecture-and-performance-optimization.md`
- PRD tracker: #295
- Overall optimization tracker: #165
- Resolver migration decision tracker: #296

## Decision

#295 is complete.

The PRD asked for architecture-aware performance work, decision quality, and
verifiable trend evidence. It did not require completing the full migration of
TypeScript finalization/reference resolution, and it did not require hitting a
strict final performance target.

## Completed Outcomes

### Architecture Boundary Decision

The resolver migration decision work mapped current TypeScript-owned
finalization/reference-resolution responsibilities and established the target
split:

- Rust owns finalization/reference-resolution execution over time.
- TypeScript remains the product shell for CLI/SDK lifecycle, fallback
  planning, status/doctor packaging, MCP surfaces, and compatibility glue.
- Diagnostics and profile artifacts remain a required protocol contract.

Relevant artifacts:

- `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-ownership-decision.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-resolver-migration-closeout-decision.md`

### Architecture-Backed Implementation Slices

The PRD required at least one architecture-backed implementation slice. The
work exceeded that requirement with multiple bounded slices, including:

- candidate producer/protocol work;
- finalization cleanup diagnostics and batching;
- finalization edge-write diagnostics and bulk insert;
- JS/TS file import target parity;
- ESM named binding fallback diagnostics;
- relative import target taxonomy and burndown;
- relative `.js` source specifier burndown;
- direct export candidate-multiple taxonomy;
- TypeScript implementation-declaration metadata;
- guarded TypeScript overload implementation routing.

The latest production routing slice resolved guarded TypeScript overload
implementation candidates and recorded deterministic evidence:

- `docs/benchmarks/2026-06-21-ts-overload-implementation-tie-break-closeout-decision.md`

### Final Semantic Decision Slice

The final #295 slice classified the remaining dominant
type/value/namespace-collision fallback class:

- `docs/benchmarks/2026-06-21-ts-type-value-namespace-collision-semantic-closeout-decision.md`

VS Code sparse evidence at commit `4a6e32fc1f0` shows the capped remaining
collision samples are dominated by `value-token-plus-interface`:

- `value-token-plus-interface`: 81
- `function-overload-signature`: 17
- `ambient-declaration-merge`: 2

Decision: `value-token-plus-interface` is a plausible next production routing
candidate, but it belongs in a successor plan, not in #295.

## Explicit Non-Blockers

### #224 Parse/Extraction Diagnostics

#224 remains open as a sibling parse/extraction diagnostic track. It does not
block closing #295 because this PRD's executed mainline became the
TypeScript-finalization/reference-resolution architecture boundary.

Future performance work can pick up #224 without reopening #295.

### #165 Optimization Tracker

#165 remains open as the durable post-release optimization tracker. It should
continue to receive successor direction and future performance work, but it is
not closed by this PRD.

## Successor Work

Do not create more issues under #295.

Recommended successor direction:

1. Create a separate implementation plan for guarded
   `value-token-plus-interface` routing, if we choose to pursue it.
2. Keep #224 as the parse/extraction diagnostic lane.
3. Keep #165 as the top-level optimization map.

## Validation Boundary

This closeout makes no new performance claim.

The PRD produced deterministic profile/taxonomy evidence and production
learning, including no-go boundaries and successor candidates. It did not run a
full scoreboard or agent A/B campaign for the closeout.
