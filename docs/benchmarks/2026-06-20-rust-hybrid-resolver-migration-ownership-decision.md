# Rust-Hybrid Resolver Migration Ownership Decision

Date: 2026-06-20

Issue: #298

Parent plan: `docs/plans/2026-06-20-rust-hybrid-resolver-migration-decision-plan.md`

Related:

- #296 resolver migration decision plan
- #297 current-state architecture map
- #299 candidate lookup/cache protocol first-slice plan
- #301 historical benchmark decision ADR migration cleanup
- `docs/zj-adr/ZJ-0002-rust-owned-finalization-reference-resolution.md`
- `docs/benchmarks/2026-06-20-rust-hybrid-finalization-architecture-map.md`

## Decision

Accept the long-term direction from ADR ZJ-0002:

```text
Rust-owned finalization/reference-resolution
  with a narrow protocol boundary to the TypeScript product shell
```

For the migration route, classify ownership by domain instead of treating
finalization/reference resolution as one indivisible rewrite.

The first implementation slice should be **candidate lookup/cache protocol**.
It should not migrate or alter every-reference disambiguation decisions.

## Ownership Classification

| Domain | Target ownership | First-slice status | Rationale |
| --- | --- | --- | --- |
| Product shell orchestration | TypeScript-owned | Out of first slice | CLI/SDK lifecycle, fallback planning, status/doctor packaging, MCP surfaces, and compatibility glue are product-shell responsibilities rather than resolver execution. |
| TypeScript fallback append | TypeScript-owned for now | Out of first slice | Fallback append serves unsupported or not-yet-Rust-owned files and should not be mixed into resolver migration. |
| Candidate lookup/cache | Protocol-owned first, Rust-owned later if evidence supports it | First slice | This is closest to repeated candidate hydration/lookup cost while preserving current disambiguation semantics. |
| Disambiguation decision | TypeScript-owned first, Rust-owned later | Explicitly excluded from first slice | This is the graph semantic core. It requires stronger parity/replay evidence before migration. |
| Import/export resolution tail | Rust-owned later | Later slice before broad disambiguation | Existing Rust-owned slices prove the direction, but package/default/namespace/type-only scope creep must be avoided. |
| Local exact references | Rust-owned later | Later slice before broad disambiguation | Existing Rust-owned local exact work makes this a plausible medium-risk migration domain, but scope parity still matters. |
| Cleanup / edge-write / DB maintenance | Rust-owned later; protocol-owned transition acceptable | Fallback implementation candidate | These are mechanical finalization tail costs. They are not the first choice, but can become the fallback slice if candidate lookup/cache is no-go. |
| Framework post-extract | Deferred; split by framework later | Out of first slice | Framework-specific semantics directly affect sufficiency and should be migrated one framework at a time. |
| Dynamic-dispatch synthesis | Deferred; split by mechanism later | Out of first slice | Partial dynamic-dispatch coverage can be worse than none. Migrate mechanism-by-mechanism with end-to-end flow evidence. |
| Diagnostics / profile / status contract | Protocol-owned | Cross-cutting requirement | The migrated path must remain explainable through profile buckets, fallback taxonomy, graphStats, and status/doctor artifacts. |

## Why Candidate Lookup/Cache Is Protocol-Owned First

The first slice should stabilize the contract for candidate facts before moving
semantic decisions.

Protocol-owned means:

- candidate set shape is explicitly defined;
- lookup keys account for name, file, scope, language, and fallback context;
- TypeScript can continue to perform disambiguation using the candidate set;
- Rust can later become the candidate producer if equivalence evidence supports
  it;
- diagnostics can distinguish candidate materialization, transport/cache,
  hit/miss behavior, TypeScript disambiguation, and downstream edge work.

Direct Rust ownership in the first slice is rejected because it risks combining
candidate generation, scope semantics, fallback graph consistency, TypeScript
verification, and performance optimization into one large semantic migration.

## Disambiguation Migration Preconditions

Disambiguation execution must remain TypeScript-owned until all of these are
true:

- candidate lookup/cache protocol can produce stable candidate sets;
- candidate availability equivalence tests pass;
- replay diagnostics can compare the TypeScript baseline with the
  protocol/Rust candidate source;
- fallback taxonomy remains stable;
- graphStats remain stable or every change is explained;
- representative corpus profile evidence shows the remaining bottleneck is
  still in per-reference disambiguation rather than candidate lookup/hydration;
- a separate migration plan states whether ranking/tie-break semantics are
  preserved or intentionally changed by an explicit architecture/product
  decision.

Until then, any optimization may change candidate collection, caching,
transport, and measurement, but not final target selection.

## Deferred Domains

Framework post-extract and dynamic-dispatch synthesis remain part of the
long-term migration target. They are deferred because they carry high Agent
Sufficiency risk.

Rules:

- framework post-extract must be split by framework;
- dynamic-dispatch synthesis must be split by mechanism;
- partial flow coverage must not be shipped as a hidden improvement;
- semantic movement in these domains may require deterministic flow evidence,
  real repo smoke, or agent A/B evidence depending on the surface touched.

## Migration Order

Default order:

1. Candidate lookup/cache protocol.
2. Import/export tail or local exact references, chosen by profile and parity
   evidence.
3. Cleanup / edge-write / DB maintenance if candidate cache is no-go or if DB
   write/cleanup remains dominant after the first slice.
4. Broad disambiguation execution.
5. Framework post-extract by framework.
6. Dynamic-dispatch synthesis by mechanism.

This order can change only through a later decision artifact that explains the
new evidence and trade-off.

## Guardrails

- Do not change default user behavior.
- Do not change every-reference disambiguation semantics in the first slice.
- Do not bundle framework or dynamic-dispatch migration into candidate
  lookup/cache.
- Do not claim performance target closure from this ownership decision.
- Do not move raw benchmark evidence into ADRs. ADRs record durable architecture
  decisions; benchmark artifacts remain supporting evidence.

## Input To #299

#299 should define the first-slice plan for candidate lookup/cache protocol.

It should answer:

- What is the candidate set shape?
- What is the candidate lookup key?
- How does the protocol represent file, scope, language, and fallback context?
- Which candidate facts stay TypeScript-produced in the first implementation,
  and which may become Rust-produced later?
- What diagnostics prove lookup/cache movement rather than bucket reshuffling?
- What candidate equivalence tests are required?
- What no-go evidence stops this path?
- What before/after profile, VS Code sparse targeted profile, graphStats,
  fallback taxonomy, and RSS evidence are required for implementation?

