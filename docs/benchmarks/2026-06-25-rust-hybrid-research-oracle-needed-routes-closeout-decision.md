# Rust-Hybrid Research And Oracle-Needed Routes Closeout Decision

Date: 2026-06-25

Status: active closeout decision

Roadmap node: `1-6-2. Research and oracle-needed routes`

## Purpose

This decision closes the research/oracle-needed tail of the rust-hybrid
indexing ownership roadmap. It is not an implementation queue. The routes below
remain visible as taxonomy, research, or future product-switch exits so future
agents do not accidentally treat them as completed ownership work or as hidden
mainline TODOs.

## Route Classification

| Route | Classification | Decision |
|---|---|---|
| `node_modules` and third-party package graph expansion | `defer/no-go taxonomy` | Do not index third-party package source or expand package graphs by default. Keep package-boundary taxonomy visible. |
| package manager edge cases | `needs-oracle/research` | Require deterministic oracle fixture coverage before any bounded exploit slice. |
| `typesVersions` | `needs-oracle/research` | Do not enter the ownership mainline until oracle evidence shows user-visible value beyond declaration/type target exactness. |
| symlink, `preserveSymlinks`, and pnpm virtual store behavior | `needs-oracle/research` | Require module-identity fixtures and oracle evidence before any implementation route. |
| type-only versus runtime target divergence | `needs-oracle/research` | Do not write value graph edges from type-only evidence. Future work requires separate type graph design. |
| advanced declaration/runtime semantics beyond high-confidence pairing | `needs-oracle/research` | Keep the current bounded same-basename/runtime-sibling solution. Future work may reopen as a narrow exploit slice with oracle evidence. |
| CSS/assets/custom non-code modules | `defer/no-go taxonomy` | Keep non-code and bundler asset taxonomy only. Do not expand resolver ownership around these modules in the current roadmap. |
| package/runtime/builtin imports | `future explicit product switch` | Do not implicitly expand package/runtime/builtin resolution. Reopen only behind an explicit product decision and user-facing behavior contract. |

## Reopen Conditions

A route in this archive can re-enter the mainline only when all applicable
conditions are met:

- deterministic oracle fixture evidence or real-repo evidence shows that the
  current taxonomy is insufficient;
- Agent Sufficiency or user usability value justifies the work;
- the work can be cut into a bounded exploit slice rather than full
  moduleResolution parity;
- graph semantics guardrail evidence can record graphStats, fallback taxonomy,
  and RSS or an unavailable reason;
- package, `node_modules`, package/runtime/builtin imports, or type graph work
  has a prior product or architecture decision.

## Closeout

The current roadmap can treat these routes as archived research boundaries.
They are not completed semantics, but they are also not blockers for the
rust-hybrid ownership roadmap closeout.
