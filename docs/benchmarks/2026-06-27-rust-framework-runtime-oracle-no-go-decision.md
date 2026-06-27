# Rust Framework Runtime Oracle No-go Decision

Date: 2026-06-27

## Scope

This records the human decision for issue #608, `Rust framework route runtime oracle research decision`.

The question was whether runtime-accurate Rust framework route graphs should enter the product roadmap now, and which oracle path should be selected if so.

## Decision

Status: no-go for the current roadmap.

Runtime-accurate Rust framework route graphs do not enter the current Rust language indexing roadmap or near-term mainline implementation plan.

This does not remove the bounded route work already completed:

- bounded Axum route wiring remains supported,
- source-visible Rust attribute routes remain supported,
- route-like macro/proc-macro patterns remain diagnostic-only.

The no-go applies to runtime-accurate framework graph facts that require compiler, framework, runtime, or data-flow semantics.

## No-go Taxonomy

Do not write value graph edges for:

- proc-macro-generated routes,
- macro-generated handlers or router modules,
- runtime route registries,
- framework plugin registries,
- middleware stack semantics,
- async runtime/task flow,
- typed extractor/data-flow semantics,
- framework lifecycle hooks,
- framework behavior that requires rustc, rust-analyzer, rustdoc, cargo metadata, framework metadata, or runtime execution to know the effective graph.

These may remain visible as diagnostic taxonomy. They should not become `references`, `calls`, or other value graph edges through heuristic implementation.

## Future Oracle Exit

Future work may reopen this area only through a new PRD.

That PRD must choose an oracle path before implementation issues are created. Possible oracle families include:

- rust-analyzer,
- rustc,
- rustdoc,
- cargo metadata,
- framework metadata,
- another explicitly chosen framework/runtime oracle.

The PRD must also define:

- target framework or framework family,
- what runtime-accurate means,
- replayable corpus,
- acceptance and failure taxonomy,
- whether external tools, compilation, generated artifacts, or environment-dependent steps are allowed.

Normal implementation issues must not directly start heuristic runtime graph work.

## Rationale

The current product goal is Rust language indexing and agent sufficiency, not a Rust framework runtime analyzer.

Partial runtime coverage is worse than none: a half-bridged runtime route graph can make the agent over-trust incomplete paths, then fall back to Read/Grep to repair the missing semantics manually.

The current bounded route slices are enough for source-visible route facts. Runtime-accurate route graphs need a separate product decision and oracle design.

## Closeout

Issue #608 should be closed as a completed human decision:

- no-go taxonomy recorded,
- current roadmap not reopened,
- future oracle exit preserved through a PRD-only path.
