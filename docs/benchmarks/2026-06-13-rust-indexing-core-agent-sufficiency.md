# Rust Indexing Core Phase 1 Agent Sufficiency Guardrail

Parent PRD: [Rust Indexing Core Vertical Slice PRD](../prds/2026-06-12-rust-indexing-core-vertical-slice.md)
Parent plan: [Rust Indexing Core Phase 1 Plan](../plans/2026-06-12-rust-indexing-core-phase-1.md)
Issue: [#58](https://github.com/jununfly/ZCodeGraph/issues/58)

## Summary

The Rust-produced index does not regress the deterministic Explore sufficiency
guardrail against the TypeScript-produced index on the Phase 1 corpus.

- ZCodeGraph self-flow prompts have the same existing graph-coverage gap under
  both engines.
- Excalidraw flow prompts remain connected under both engines after fixing Rust
  extraction for callable arrow fields and class member containment.
- No Rust-only increase was observed in deterministic generic Read/Grep fallback
  risk.

This run is a deterministic tool-surface guardrail, not a stochastic Claude Code
A/B run. It exercises the same MCP `zcodegraph_explore` surface an agent uses
and records whether the answer already includes the expected flow evidence. The
raw JSON is stored outside the repo at
`/tmp/zcodegraph-rust-sufficiency-guardrail-58.json`.

## Method

- Runner: `scripts/rust-sufficiency-guardrail.mjs`
- Command:

```bash
npm run build
cargo build --package zcodegraph-core
/Users/bilibili/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  scripts/rust-sufficiency-guardrail.mjs \
  --repo zcodegraph=/Users/bilibili/Documents/workspace/jununfly/ZCodeGraph \
  --repo excalidraw=/private/tmp/codegraph-corpus/excalidraw
```

- Each repository was copied to temporary directories.
- One copy was indexed with the TypeScript engine.
- One copy was indexed with the Rust engine.
- Each prompt was run through `zcodegraph_explore`.
- The script records Flow section connectivity, expected-symbol presence, and a
  deterministic fallback-risk count.

## Environment

| Field | Value |
|---|---|
| Generated | 2026-06-12T18:34:02Z |
| Node | v24.14.0 |
| Rust | rustc 1.95.0 (59807616e 2026-04-14) |
| Cargo | cargo 1.95.0 (f2d3ce0bd 2026-03-21) |
| OS | Darwin 25.5.0 arm64 |
| CPU | Apple M5, 10 cores |

## Prompt Matrix

| Repo | Prompt | Symbol bag |
|---|---|---|
| ZCodeGraph | ZCG-1 | `handleExplore plan ExplorePlan render` |
| ZCodeGraph | ZCG-2 | `runIndex CodeGraph.indexAll ExtractionOrchestrator.indexAll ParseStage QueryBuilder.insertNode` |
| ZCodeGraph | ZCG-3 | `ReferenceResolver.resolveAll createSynthesizerRegistry registerFullGraphSynthesizers executeFullGraphSynthesizers QueryBuilder.insertEdge` |
| Excalidraw | EX-1 | `mutateElement triggerUpdate triggerRender render StaticCanvas renderStaticScene` |
| Excalidraw | EX-2 | `Scene.onUpdate triggerUpdate triggerRender render StaticCanvas` |
| Excalidraw | EX-3 | `StaticCanvas renderStaticScene _renderStaticScene drawElementOnCanvas renderElement` |

## Results

| Repo | Commit | Prompt | TS Flow | Rust Flow | TS fallback risk R/G | Rust fallback risk R/G | Classification |
|---|---:|---|---|---|---:|---:|---|
| ZCodeGraph | fc50081 | ZCG-1 | no | no | 1 / 1 | 1 / 1 | Existing graph coverage gap; no Rust regression |
| ZCodeGraph | fc50081 | ZCG-2 | no | no | 1 / 1 | 1 / 1 | Existing graph coverage gap; no Rust regression |
| ZCodeGraph | fc50081 | ZCG-3 | no | no | 1 / 1 | 1 / 1 | Existing graph coverage gap; no Rust regression |
| Excalidraw | a83ac488 | EX-1 | yes | yes | 0 / 0 | 0 / 0 | No regression |
| Excalidraw | a83ac488 | EX-2 | yes | yes | 0 / 0 | 0 / 0 | No regression |
| Excalidraw | a83ac488 | EX-3 | yes | yes | 0 / 0 | 0 / 0 | No regression |

## Fixes From This Guardrail

The first guardrail run caught two Rust-only Excalidraw regressions:

- `EX-3` lost the `renderStaticScene -> _renderStaticScene -> renderElement`
  flow because exported arrow-function constants were indexed as constants, not
  callable functions.
- `EX-2` lost the callback-to-render flow because class field arrow callbacks
  were indexed as fields and TSX class declarations were indexed as components,
  so React render synthesis could not find class-contained methods.

The Rust extractor now:

- indexes arrow-function variable declarators as callable functions;
- indexes class field arrow callbacks as methods;
- keeps TSX class declarations as classes, not components;
- attaches class member `contains` edges to the class node.

## Gate Decision

| Gate | Result |
|---|---|
| This repository indexed with both engines | Pass |
| Excalidraw indexed with both engines | Pass |
| Generic Read fallback does not increase | Pass for deterministic fallback-risk signal |
| Generic Grep/Bash fallback does not increase | Pass for deterministic fallback-risk signal |
| Flow connectivity does not regress | Pass after Rust extractor fixes |
| Differences classified | Pass |
| Compact repo document stored | Pass |
| Script exits non-zero on Rust-only regression | Pass (`regressions=[]`) |

## Limitations

This document does not claim stochastic agent behavior. No Claude Code A/B runs
were executed for this issue. The guardrail measures whether the tool response
contains enough graph evidence that an agent should not need generic Read/Grep
recovery. A future release/default-rollout decision should still run real
headless agent sessions over the same prompt matrix.
