# Rust Indexing Core Vertical Slice PRD

Published issue: [#49 — PRD: Rust indexing core vertical slice](https://github.com/jununfly/ZCodeGraph/issues/49)

## Problem Statement

ZCodeGraph's current indexing hot path runs in Node.js and parses source through WebAssembly tree-sitter grammars. That has become a product risk for a local-first code intelligence tool: Node and V8 runtime behavior can block indexing, WebAssembly memory behavior is hard to control, and large repo indexing pays Node/WASM overhead exactly where users need predictable speed and bounded memory.

From the user's perspective, ZCodeGraph should be a reliable local code intelligence engine that indexes large JavaScript and TypeScript codebases without being exposed to Node/WASM parser instability, while preserving the Agent Sufficiency behavior that makes `zcodegraph_explore` useful.

## Solution

Introduce an experimental Rust indexing core as a vertical slice for JavaScript, TypeScript, JSX, and TSX files. The Rust core runs as a subprocess, parses with native tree-sitter, writes the existing SQLite index schema directly, and leaves the TypeScript product shell in place for CLI orchestration, MCP tools, installer behavior, resolution, synthesizers, Explore planning, and rendering.

The Rust indexer is opt-in only at first, enabled by an explicit CLI flag or environment variable. The existing TypeScript indexer remains the default and fallback path. The first PRD slice succeeds if semantic extraction parity is good enough, Agent Sufficiency does not regress, the Rust path stays within the Phase completion performance envelope, and the remaining performance blockers are captured with data-backed follow-up work. The deeper performance target remains important, but it is deferred into a post-PRD optimization milestone rather than blocking completion of the opt-in vertical slice.

## User Stories

1. As a ZCodeGraph user, I want indexing to avoid Node/WebAssembly parser failure modes, so that indexing works reliably across supported local environments.
2. As a ZCodeGraph user, I want large JavaScript and TypeScript projects to index faster, so that I can start using code intelligence sooner.
3. As a ZCodeGraph user, I want indexing memory usage to stay bounded, so that indexing does not destabilize my machine or agent session.
4. As a maintainer, I want a Rust indexing core behind an explicit opt-in switch, so that we can validate it without destabilizing the default release path.
5. As a maintainer, I want the TypeScript indexer to remain available, so that regressions can be isolated and users have a safe fallback.
6. As a maintainer, I want Rust to write the existing SQLite schema directly, so that the current MCP and Explore layers can continue reading indexes without a product rewrite.
7. As an agent user, I want `zcodegraph_explore` answers to stay at least as sufficient after Rust indexing, so that faster indexing does not trade away answer quality.
8. As a benchmark runner, I want side-by-side TypeScript indexer and Rust indexer measurements, so that performance and memory claims are grounded in repeatable data.
9. As a developer adding language support, I want the first Rust slice to be narrow and well-scoped, so that extraction parity can be evaluated before migrating more languages.
10. As a release maintainer, I want the Rust core to live in the same repository and release flow, so that versioning, tests, and binaries remain aligned with the npm package.
11. As a CLI user, I want an explicit `index` engine selector, so that I can choose the experimental Rust path without changing my normal workflow.
12. As an MCP user, I want the same project index to work with current MCP tools after Rust indexing, so that tool behavior does not fork by engine.
13. As a maintainer, I want index metadata to record which engine produced the index, so that bug reports can be interpreted correctly.
14. As a maintainer, I want Rust and TypeScript to share the same locking discipline, so that concurrent CLI, MCP, and hook processes do not corrupt the index.
15. As a maintainer, I want Rust indexing failures to leave the previous good index intact, so that an experimental engine cannot destroy working project state.
16. As a maintainer, I want JavaScript and TypeScript extraction parity tests to compare behavior semantically, so that Rust is not forced to preserve incidental TypeScript implementation details.
17. As a maintainer, I want Agent Sufficiency guardrails to run after Rust indexing, so that graph parity is evaluated by the answer behavior users actually care about.
18. As a performance investigator, I want peak RSS and wall-clock indexing metrics recorded for the Rust path, so that memory and speed are first-class acceptance criteria.
19. As a maintainer, I want resolver and synthesizer behavior to stay in TypeScript for the first phase, so that the migration does not expand into a full graph rewrite.
20. As a maintainer, I want the Rust core to be independently testable, so that parser and writer failures can be diagnosed without starting MCP.
21. As a user on a Node version with WebAssembly instability, I want the Rust indexer path to avoid WebAssembly parsing entirely, so that indexing is not blocked by V8 parser behavior.
22. As a package consumer, I want the npm distribution to keep working, so that introducing Rust does not break current installation and upgrade flows.
23. As a maintainer, I want clear stop/continue criteria after the first slice, so that Rust migration proceeds only if it proves its value.
24. As a future contributor, I want a documented boundary between Rust core and TypeScript shell, so that changes land in the right layer.
25. As a maintainer, I want the first phase to produce reusable migration infrastructure, so that future language migrations can follow the same pattern.

## Implementation Decisions

- The migration will not be a full rewrite. The TypeScript product shell remains responsible for CLI orchestration, MCP tools, installer and upgrade flows, Explore Answer planning and rendering, framework/dynamic-dispatch resolution, and Agent Sufficiency policy.
- The first Rust deliverable is an indexing core for JavaScript, TypeScript, JSX, and TSX only.
- The Rust core runs as a subprocess invoked by the TypeScript CLI layer.
- The Rust core writes the existing SQLite schema directly rather than returning JSON for TypeScript to persist.
- The TypeScript indexer remains the default. The Rust indexer is enabled only by an explicit engine flag or environment variable.
- The existing TypeScript resolver, framework resolvers, dynamic-dispatch synthesizers, graph traversal, MCP tools, and Explore planner continue to run after Rust extraction output is written.
- The Rust core records index engine metadata, including engine name and version, so status and bug reports can identify the producer of the index.
- The Rust core uses the same project index, schema version, extraction version, and locking contract as the existing indexer.
- The Rust indexer should write to a temporary or otherwise failure-safe target and preserve the previous good index if the experimental path fails.
- The migration is accepted by semantic parity, not byte-identical database parity. Stable symbol identity, meaningful node/edge coverage, unresolved reference behavior, and downstream Explore behavior matter more than incidental ordering.
- The first phase must include a Cargo workspace in the same repository with one Rust crate for the core. Additional Rust crate splitting is out of scope until the first slice proves value.
- The Rust core should expose a small command surface suitable for TypeScript orchestration: project path, database path or project index location, force/fresh-index mode, progress events, and machine-readable errors.
- Progress and errors should be emitted in a stable machine-readable protocol that the TypeScript CLI can render using the existing user experience.
- The first phase should avoid changing the MCP protocol, tool names, installer behavior, or release semantics beyond packaging the experimental Rust binary where needed.
- The Phase completion gate is: on both the ZCodeGraph repository and Excalidraw, the Rust opt-in full path must index end-to-end without Agent Sufficiency regression, must leave the active index readable by the TypeScript shell and MCP tools, and must not be significantly worse than the TypeScript indexer. For this PRD, "not significantly worse" means Rust wall time is no more than 30% slower than TypeScript and peak RSS is no more than 15% higher than TypeScript on the required targets. If either metric exceeds that envelope, the PRD remains incomplete unless there is a documented maintainer decision to accept the regression for a narrower opt-in release.
- The post-PRD optimization gate remains: on both the ZCodeGraph repository and Excalidraw, Rust indexing should become at least 25% faster or peak RSS at least 30% lower than TypeScript, with the other metric not significantly worse. This is no longer the completion gate for the Rust opt-in vertical slice; it is the follow-up deep optimization target after the end-to-end Rust implementation is complete.
- Agent Sufficiency must not regress: representative ZCodeGraph and Excalidraw flow prompts must not increase generic Read/Grep fallback after indexing with the Rust core.
- Rust indexing must avoid the Node/WebAssembly parser hot path for the supported JavaScript and TypeScript slice.

## Testing Decisions

- Good tests should verify externally visible behavior and durable contracts, not private implementation details. The most important outcomes are: the current TypeScript shell can read the Rust-produced index, Explore answers remain sufficient, the Rust indexer stays within the Phase completion performance envelope, and post-PRD optimization work has trustworthy benchmark artifacts.
- The highest test seam is CLI indexing with engine selection followed by existing MCP/Explore queries against the resulting index.
- The next seam is the SQLite contract: files, nodes, edges, unresolved references, schema metadata, extraction version, and index engine metadata must be readable by the existing TypeScript layers.
- The extraction parity seam compares TypeScript and Rust indexing output semantically for JS/TS/JSX/TSX fixtures. It should cover exported functions, classes, methods, object-literal methods, components, imports, exports, calls, contains edges, references, and unresolved references.
- Real-repo parity should run against the ZCodeGraph repository and Excalidraw, with differences categorized as expected, acceptable, or blocking.
- Performance tests should capture wall-clock index time and peak RSS for both engines on the same machine and repository snapshot. Phase completion tests judge the 30% wall-time / 15% RSS regression envelope; post-PRD optimization tests judge the deeper 25% faster / 30% lower RSS target.
- Agent Sufficiency guardrails should reuse the existing Explore sufficiency prompts for ZCodeGraph and Excalidraw. The Rust indexer must not increase generic Read/Grep fallback.
- Failure-safety tests should verify that a Rust indexing error does not leave a corrupted or partially mixed index as the active project index.
- Locking tests should verify that TypeScript and Rust indexing paths respect the same cross-process write lock.
- Prior test models in the existing suite include full-pipeline indexing tests, extraction tests, MCP Explore tests, staleness and locking tests, and Agent Sufficiency probe scripts. The Rust work should extend these seams instead of inventing a parallel testing strategy.

## Out of Scope

- Full migration from TypeScript to Rust.
- Rewriting the MCP server in Rust.
- Rewriting the installer, upgrade flow, npm shim, or agent configuration writers in Rust.
- Rewriting Explore planner, Explore renderer, or Agent Sufficiency policy in Rust.
- Rewriting ReferenceResolver, framework resolvers, or dynamic-dispatch synthesizers in Rust during the first phase.
- Migrating languages beyond JavaScript, TypeScript, JSX, and TSX in the first phase.
- Changing the user-facing MCP tool surface.
- Changing the SQLite schema except for minimal metadata needed to identify the index engine, unless a separate migration decision is made.
- Making the Rust indexer default before parity, Agent Sufficiency, failure-safety, and the post-PRD performance/memory optimization gates pass.

## Further Notes

This PRD intentionally chooses an incremental migration because the user's motivation is concentrated in the indexing hot path: Node/WebAssembly runtime risk, indexing performance, and peak memory control. The current TypeScript layers remain valuable for fast Agent Sufficiency iteration, npm distribution, MCP integration, and installer behavior.

If the Rust opt-in slice fails the Phase completion gate, the project should stop expanding Rust coverage and reassess whether the architecture boundary is wrong, the implementation is immature, or the migration is not justified. If the Rust opt-in slice passes the Phase completion gate but misses the post-PRD optimization gate, the project may complete this PRD while keeping a dedicated optimization tracker open. That follow-up should use the end-to-end scoreboard and segment-level A/B methodology to pursue the original speed and RSS targets without blocking completion of the opt-in Rust indexing vertical slice.
