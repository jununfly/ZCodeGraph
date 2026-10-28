---
doc-kind: contract
authority: primary
authority-id: CON-resolver-semantic-residuals-v1
bounded-question: "Which resolver semantic gaps are currently accepted as deferred / no-go, and what guards bind the slices that did ship?"
version: v1
---

# Resolver Semantic Residuals v1

> Status: active contract. Consolidated on 2026-10-28 from the completed
> resolver migration. This page is the **single authoritative list** of
> resolver semantic boundaries that the codebase intentionally keeps as
> fallback, plus the guards that bound the slices that did ship.

## Purpose

The Rust-hybrid resolver is **deliberately incomplete**. It ships a set of
bounded, evidence-backed routes and keeps a fallback for everything else.
This page enumerates:

1. The guarded routes that **shipped** and the prerequisites that bind them.
2. The semantic buckets that are **explicit no-go** and must not be routed
   without a new contract revision.
3. The semantic buckets that are **deferred pending metadata** — they may be
   revisited only when the named prerequisite is satisfied.

A future resolver change that crosses any boundary listed here without
updating this contract is a regression.

## Shipped Routes (with guards)

### SR-1: Bounded direct ESM named import/export

- **Scope**: repo-local relative or paths-alias source files where the
  target file has exactly one matching exported declaration, or same-file
  `export { Name }` with exactly one local declaration candidate.
- **Declaration-style coverage**: `export async function`,
  `export abstract class`, `export declare function`, typed `export const`,
  `export var`.
- **Guards**: candidate-zero and candidate-multiple (without further
  qualification) keep fallback. Default imports, namespace imports, type-only
  imports, package/runtime imports, multi-hop re-exports are out of scope.

### SR-2: TypeScript overload-implementation tie-break

- **Scope**: when a candidate-multiple set has **exactly one** TypeScript
  implementation declaration.
- **Safe prerequisites (all must hold)**:
  - All candidates are in the same resolved target file.
  - All candidates are runtime/value compatible function declarations.
  - Candidate metadata exposes `hasBody=true` or
    `declarationForm=implementation`.
  - Exactly one candidate is marked as the implementation declaration.
  - Target file is not a `.d.ts` declaration file.
- **Import edges and imported-symbol usage edges** both target the
  implementation declaration.
- **Empirical**: resolved 3,766 refs on VS Code sparse.

### SR-3: `value-token-plus-interface` service-token routing

- **Scope**: the guarded service-token shape only.
- **Safe prerequisites (all must hold)**:
  - Candidate shape is exactly `constant-interface` (one `constant` + one
    `interface`).
  - Import form is `named-value-import`.
  - Target candidates are in the same resolved target file.
  - Source file has visible runtime usage (imported-symbol usage reference or
    decorator-token syntax such as `@IService`).
- **Routing**: import edges and usage edges target the **value token**
  candidate, not the interface.
- **Fail-closed for**: `import type`, mixed `type` specifiers in a named
  import list, default imports, namespace imports, package/runtime imports,
  re-export/barrel chains, unknown usage context, type-position-only usage.

### SR-4: Bounded repo-local one-hop named re-export

- **Scope**: `1-7-3-1` import-through-barrel and `1-7-3-2`
  export-through-barrel guarded writes.
- **Boundary**: exactly one repo-local named re-export hop. One-hop candidate
  rows carry the leaf file path so the writer validates the actual target
  file, not the barrel file.

### SR-5: Relative `.js` source-specifier fallback

- **Scope**: when a relative import explicitly ends in `.js`, `.mjs`, or
  `.cjs` and the literal file does not exist, try supported TS/JS source
  candidates (`.ts`, `.tsx`, `.mts`, `.cts`, `.jsx`).
- **Guards**: literal `.js` targets win when present. Alias/workspace/package
  paths do **not** opt into the fallback. Asset imports stay unresolved.

### SR-6: Namespace import/export as file/module dependency

- **Scope**: `import * as NS from "./source"` and
  `export * as NS from "./source"` are represented as **file/module
  dependency edges** only.
- **Boundary**: no first-class namespace surface nodes, no member-level
  symbol edges through `NS.member`. The namespace surface name is not
  modelled as a symbol node.

## Explicit No-Go (must stay fallback)

The following buckets are **semantically bound** to fallback. Routing any of
them requires a contract revision.

| Bucket | Reason |
| --- | --- |
| `class-plus-interface` collision | Ambiguous target — type vs value. |
| `type-alias-plus-value` collision | Same ambiguity. |
| `enum-or-namespace-plus-type` collision | Same ambiguity. |
| `unknown-collision` | No metadata to decide. |
| Type-only imports (`import type`, mixed `type` specifiers) | Out of runtime graph by design. |
| Default imports | Not yet bounded. |
| Namespace imports (member-level) | Requires export/member resolver redesign. |
| Package / `node_modules` / runtime builtins | Out of repo-local scope (Part 2 territory). |
| Multi-hop barrel chains | Exponential blowup; one-hop is the bounded slice. |
| `export *` star re-export semantics | Deferred sub-node 1-7-3-3. |
| Default re-export semantics | Deferred sub-node 1-7-3-4. |
| Namespace re-export semantics (member-level) | Deferred sub-node 1-7-3-5. |
| Package / `node_modules` re-export semantics | Deferred sub-node 1-7-3-6. |
| Multi-hop re-export semantics | Deferred sub-node 1-7-3-7. |
| Asset imports (`.css`, images, etc.) | Not code; intentionally unresolved. |
| Config imports (`package.json`, `.json`) | Non-code target. |
| Ambient-only overload/signature sets | No runtime target exists. |
| `.d.ts` overload/signature sets | Declaration file, no implementation. |
| No-implementation overload sets | No runtime target. |
| Source-order / pick-first tie-break | Rejected as a semantic rule. |

## Deferred Pending Metadata

These buckets have a named prerequisite. They may be revisited only when the
prerequisite is satisfied **and** a new contract section is added.

| Bucket | Prerequisite |
| --- | --- |
| `value-token-plus-interface` (non-service-token residual) | Richer usage-context metadata to distinguish service-token from other constant-interface collisions. |
| `function-overload-signature` (residual after SR-2) | Same prerequisite chain as SR-2 — already shipped for the bounded case; broader cases need additional metadata. |
| `ambient-declaration-merge` | Implementation-declaration metadata (same chain as SR-2). |
| First-class namespace surface modeling | Export/member resolver redesign — needs a separate plan. |
| Package/runtime binding (`node_modules`, builtins) | A dedicated package-resolution plan (Part 2). |

## Update Protocol

To change any boundary in this contract:

1. Add deterministic fixtures proving the new semantics.
2. Update the relevant row above (move between "Shipped Routes",
   "No-Go", "Deferred Pending Metadata" as appropriate).
3. Bump the `version:` frontmatter (v1 → v2, …).
4. Cross-link from `decisions/` if the change represents a durable
   architectural decision.

A change that crosses a boundary without updating this contract is a
regression and must be reverted.

## Out Of Scope

- Performance claims. This contract governs semantics, not throughput.
- Agent A/B measurements. Those live in
  `docs/methods/ab-evaluation-matrix.md`.
- Framework-specific routes (Spring DI, Laravel, etc.). Those are governed by
  `docs/contracts/rust-framework-ownership-matrix-v1.md`.

## Relationship To Other Contracts

- `docs/contracts/rust-framework-ownership-matrix-v1.md` — language and
  framework ownership. This contract governs **resolver semantic boundaries**
  within a slice; the ownership matrix governs **which language/framework
  owns a slice**.
- `docs/contracts/graph-semantics-guardrail-v1.md` — evidence gate for
  graph-semantic closeouts. Any change to the boundaries above triggers the
  guardrail.
- `docs/contracts/finalization-tail-boundary-contract.md` — finalization
  tail boundary, complementary to the routes above.
