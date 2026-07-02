# Rust Language Semantic Support PRD

Date: 2026-06-26

Status: completed for the bounded feature branch.

Related feedback: #565

Closeout: `docs/designs/plan-artifact-consolidated-closeout.md`

## Problem

ZCodeGraph 0.10.x uses `rust-hybrid` as the default indexing path. The name
describes the implementation strategy: a Rust-backed core owns selected
languages, while the mature TypeScript indexer covers the rest of the supported
source set.

That product language is easy to confuse with full Rust programming-language
semantic analysis. A Rust project user reasonably expects support for Rust
concepts such as traits, macros, lifetimes, module paths, Cargo features, and
crate workspaces. Current `.rs` support is structural indexing and graph
connectivity, not a Rust compiler-style semantic model.

## Goal

Add a dedicated Rust language semantic support track that improves Agent
Sufficiency for real Rust codebases without overloading the existing
`rust-hybrid` indexing terminology.

The feature should make Rust code questions more answerable through ZCodeGraph
tools before agents fall back to generic Read/Grep.

## Non-Goals

- Do not rename `rust-hybrid`; that term remains the indexing engine path.
- Do not promise a full Rust compiler implementation in one release.
- Do not treat every Rust compiler feature as a release blocker.
- Do not mix this feature with the 0.10.x diagnostic/docs bugfix release.

## User Stories

1. As a Rust project user, I want ZCodeGraph to connect module-level Rust calls
   and re-exports, so agent answers can follow ordinary crate structure.
2. As a Rust project user, I want trait definitions and implementations to be
   visible in graph answers, so agents can reason about dynamic dispatch
   frontiers without reading the whole crate.
3. As a Rust project user, I want macro-heavy or feature-gated code to report
   clear coverage taxonomy when exact analysis is unavailable, so I can trust
   what the graph did and did not model.
4. As a maintainer, I want Rust semantic support to be validated on real Rust
   repositories, so the feature improves agent sufficiency rather than only
   increasing graph size.

## Scope

### Phase 1: Taxonomy and Baseline

- Define Rust language support levels separately from indexing engine ownership.
- Audit current `.rs` extraction and resolver behavior.
- Record current Rust project sufficiency on at least one real Rust repository.
- Produce a gap taxonomy for:
  - module path resolution;
  - trait and impl relationships;
  - macro-generated symbols;
  - lifetimes and generics;
  - Cargo workspace, package, feature, and target configuration.

### Phase 2: Bounded Semantic Slices

Select one or more bounded slices based on the baseline:

- repo-local module path resolution;
- trait definition to impl/member relationship;
- common web-framework route wiring such as Axum or Rocket;
- Cargo workspace/package boundary awareness;
- macro coverage taxonomy without expanding arbitrary macros.

Each slice must include deterministic graph tests and at least one real-repo
sufficiency smoke.

### Phase 3: Product Surface

- Update README language support to distinguish structural indexing from Rust
  semantic depth.
- Update status/doctor taxonomy if a Rust semantic gap affects trust.
- Keep issue reports privacy-preserving and replayable.

## Release Criteria

- Rust language support claims are explicit about what is implemented and what
  remains a frontier.
- At least one real Rust repository has deterministic evidence showing improved
  sufficiency for a named Rust code question.
- The feature does not regress existing JavaScript, TypeScript, Go, or Python
  `rust-hybrid` indexing paths.
- Unsupported Rust semantic features produce clear taxonomy rather than silent
  wrong edges.

## Completion Summary

Completed on branch `codex/rust-language-semantic-support-prd`.

The branch implemented the bounded Rust language semantic support track:

- Rust-owned `.rs` baseline indexing under `rust-hybrid`;
- repo-local module path resolution;
- bounded trait/impl structural relationships with fail-closed guards;
- Cargo workspace/package/cfg diagnostics;
- macro/cfg/generated-code taxonomy;
- bounded source-visible route wiring for Axum and attribute routes;
- route/framework runtime no-go taxonomy and future oracle exit.

The durable closeout is recorded in
`docs/designs/plan-artifact-consolidated-closeout.md`.

This completion does not claim full Rust compiler semantics. Macro expansion,
active cfg/feature resolution, rustc privacy exactness, cross-crate trait
coherence, external dependency graph semantics, and runtime-accurate framework
graphs remain explicit semantic frontiers.

## Open Questions

- Deeper Rust analysis may later use `rust-analyzer`, rustc, rustdoc, cargo
  metadata, framework metadata, tree-sitter plus bounded heuristics, or a hybrid
  of those sources. That requires a new PRD before implementation.
