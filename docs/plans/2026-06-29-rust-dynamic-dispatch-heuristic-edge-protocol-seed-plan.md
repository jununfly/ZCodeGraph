# Rust Dynamic-Dispatch Heuristic Edge Protocol Seed Plan

## Roadmap mapping

- Parent roadmap: `docs/plans/2026-06-27-rust-indexing-debt-to-rust-migration-roadmap.json`
- Node: `1-6-8. Dynamic-dispatch synthesizer Rust migration exploit candidate`
- Current slice: `1-6-8-1. Callback/EventEmitter heuristic edge protocol seed`
- Follow-up slice: `1-6-8-2. Rust shadow/double-read dynamic-dispatch edge migration follow-up`
- Tracking issue: #664

## Decision

Start the dynamic-dispatch Rust migration with a protocol seed, not with production Rust edge writes.

The first bounded family is JS/TS callback/observer plus EventEmitter because the current TypeScript implementation already has explicit provenance metadata and durable design docs. The slice defines the future Rust heuristic edge contract and diagnostics needed for parity planning. The current TypeScript synthesizer remains the only production writer for these edges.

## Why this is narrow

Dynamic-dispatch synthesis is Agent Sufficiency sensitive. Partial flow coverage can be worse than no coverage because it exposes an incomplete bridge and then pushes agents back to Read/Grep to finish the flow manually.

This slice therefore does not migrate `synthesizeCallbackEdges()` to Rust. It only makes the future Rust-owned heuristic edge boundary explicit enough that a later shadow/double-read slice can compare Rust candidates against the existing TypeScript writer.

## Protocol seed

Common Rust heuristic edge fields:

- `sourceNodeId`
- `targetNodeId`
- `kind`
- `provenance: "heuristic"`
- `synthesizedBy`
- `registeredAt`
- `language`
- `precision`

Callback/EventEmitter metadata whitelist:

- `via`
- `eventName`
- `field`
- `registrationSite`
- `confidenceReason`

The protocol must reject or classify unbounded metadata instead of accepting arbitrary JSON. It must also avoid freezing TypeScript implementation details as the long-term Rust API.

## Diagnostics

Expose the protocol seed under finalization diagnostics/profile data, alongside the existing finalization boundary and candidate protocol diagnostics.

Required diagnostics:

- protocol `version`
- protocol `status`
- production writer owner, expected to remain `typescript-synthesizer`
- supported seed families: `callback`, `closure-collection`, `event-emitter`
- common fields and family metadata whitelist
- graph parity planning fields:
  - synthesized edge count by family
  - bounded representative samples
  - unavailable reason when no sample can be produced
- Agent Sufficiency guardrail status:
  - `required-before-rust-shadow-or-double-read`
  - no full A/B required for this no-behavior-change slice

## Non-goals

- Do not route callback/EventEmitter heuristic edges through Rust.
- Do not write Rust-produced heuristic edges into the graph.
- Do not migrate React render, JSX child, Gin middleware, RN bridge, MyBatis, or other families.
- Do not replace the existing best-effort TypeScript failure behavior.
- Do not mark `1-6-8` completed; only the protocol seed child can complete.

## Verification

- Contract tests lock the profile/diagnostic shape.
- Existing dynamic-dispatch behavior remains unchanged.
- Graph parity diagnostics report current TypeScript-owned callback/EventEmitter family counts and samples.
- Roadmap `1-6-8-1` is marked completed after the issue closes, while `1-6-8` remains in progress for the later Rust shadow/double-read work.
