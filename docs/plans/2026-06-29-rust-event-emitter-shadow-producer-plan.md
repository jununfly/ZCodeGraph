# Rust EventEmitter Shadow Producer Plan

## Roadmap mapping

- Parent roadmap: `docs/plans/2026-06-27-rust-indexing-debt-to-rust-migration-roadmap.json`
- Node: `1-6-8. Dynamic-dispatch synthesizer Rust migration exploit candidate`
- Current slice: `1-6-8-2. Rust shadow/double-read dynamic-dispatch edge migration follow-up`
- Tracking issue: #665

## Decision

Implement the first Rust dynamic-dispatch shadow producer for the bounded EventEmitter named-handler shape.

This slice is still shadow-only. Rust may produce EventEmitter heuristic edge candidates in profile diagnostics, and TypeScript may compare them against the current TypeScript-written heuristic graph, but Rust-produced candidates are not consumed for graph writes.

## Bounded family

First family: JS/TS EventEmitter named-handler candidates.

Supported source shapes:

- registrar: `on("event", namedHandler)`, `once("event", namedHandler)`, `addListener("event", namedHandler)`
- dispatcher: `emit("event")`, `fire("event")`, `dispatchEvent("event")`
- handler must be a named function/method node already indexed by Rust.
- dispatcher source should be the enclosing function/method/component node of the emit call.

Non-goals:

- anonymous arrow callback link-through-body
- field-backed observer channels
- closure collection dispatch
- React render / JSX child
- production Rust heuristic edge writes
- new SQLite shadow tables or persistent `.zcodegraph/diagnostics` artifacts

## Ownership boundary

Rust core owns candidate discovery by scanning indexed source and node facts. TypeScript owns comparison against the existing TypeScript dynamic-dispatch synthesizer output.

TypeScript must not pre-digest EventEmitter facts for Rust. The Rust output should be carried through the existing index profile/result payload.

## Profile contract

Rust profile should expose a shadow producer section with:

- `enabled: true`
- `family: "event-emitter"`
- `mode: "shadow-only"`
- `candidateCount`
- `sampleLimit`
- bounded samples containing source/target node ids, names, file paths, event name, and metadata keys compatible with the heuristic edge protocol seed

TypeScript finalization diagnostics should expose parity fields:

- `comparedCount`
- `matchedCount`
- `mismatchCount`
- `mismatchReasons`
- bounded `mismatchSamples`
- `rustCandidateCount`
- `typescriptEdgeCount`
- `rustEdgeWritesEnabled: false`

## Verification

- A bounded EventEmitter fixture proves Rust shadow candidates match the TypeScript heuristic graph.
- The same fixture proves graph node/edge output is unchanged with shadow diagnostics present.
- Profile contract tests cover Rust producer output and TypeScript parity diagnostics.
- Agent Sufficiency A/B remains a later gate because this slice intentionally does not change graph output.

## Outcome

Implemented by #665.

- Rust core profile now exposes `dynamicDispatchShadowProducer` for EventEmitter named-handler candidates.
- TypeScript finalization diagnostics now merge Rust shadow candidates into `dynamicDispatchHeuristicEdgeProtocol.graphParity.eventEmitterShadow`.
- Rust candidates remain shadow-only; graph writes continue to come from the TypeScript dynamic-dispatch synthesizer.
- Verification covered Rust result JSON contract and `rust-hybrid` CLI profile parity on a bounded EventEmitter fixture.
