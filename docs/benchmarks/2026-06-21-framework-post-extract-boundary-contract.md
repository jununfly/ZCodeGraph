# Framework Post-Extract Boundary Contract

Date: 2026-06-21

## Parent

- Plan: `docs/plans/2026-06-21-rust-hybrid-finalization-tail-boundary-plan.md`
- Issue: #408
- Ownership matrix:
  `docs/benchmarks/2026-06-21-finalization-tail-ownership-matrix.md`

## Decision

Framework post-extract remains TypeScript-owned and deferred for migration.

This boundary is part of the finalization tail because it mutates graph facts
after extraction and before reference resolution. It is not moved to Rust in
this plan.

## Boundary Contract

Framework post-extract hooks may:

- read the complete indexed file list;
- read source files needed for cross-file framework declarations;
- inspect already-extracted nodes;
- update existing node names or metadata when a framework-level declaration
  changes the externally visible graph fact;
- preserve stable node ids when updating nodes so existing extracted edges stay
  valid;
- request resolver cache invalidation before and after mutation.

Framework post-extract hooks must not:

- change every-reference disambiguation semantics;
- delete unresolved references;
- create broad dynamic-dispatch edges;
- assume TypeScript fallback append has not run;
- depend on a partial graph that only contains the current file.

## Ordering Contract

The ordering is:

```text
extraction / Rust graph write
  -> TypeScript fallback append when needed
  -> resolver initialize
  -> framework post-extract
  -> reference resolution
  -> dynamic-dispatch synthesis
  -> database maintenance
```

Framework post-extract must run before reference resolution because route,
controller, module, or framework-derived names can be consumed by downstream
resolution and agent-facing retrieval.

## Deterministic Fixture

Fixture:

- `__tests__/frameworks-integration.test.ts`
  `NestJS end-to-end framework post-extract boundary > applies RouterModule prefixes before the final graph is consumed`

The fixture indexes a small NestJS project through the public `CodeGraph`
interface. It proves the final graph exposes `GET /admin/users/:id`, not the
pre-post-extract `GET /users/:id`, and that the route still references the
handler method.

This protects the public boundary rather than the private NestJS helper.

## Migration Gate

Before any framework post-extract hook can move to Rust or protocol ownership,
the migration plan must provide:

- deterministic fixture parity for the hook;
- graphStats before/after;
- route/node id stability evidence when nodes are updated;
- fallback taxonomy or no-op reason for unsupported framework forms;
- representative real-repo smoke when the hook affects route or flow
  sufficiency;
- explicit confirmation that dynamic-dispatch synthesis is not accidentally
  bundled into the same migration.

No hook should migrate if it requires changing every-reference disambiguation
semantics or broad framework coverage in the same slice.

## Closeout Input

This artifact satisfies the framework post-extract boundary portion of the
Finalization Tail Boundary Plan. The final closeout should classify framework
post-extract as deferred migration candidate with a tested TypeScript-owned
boundary contract.
