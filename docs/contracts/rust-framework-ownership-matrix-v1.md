---
doc-kind: contract
authority: primary
authority-id: DES-rust-framework-ownership-matrix-v1
bounded-question: "What stable contract does rust-framework-ownership-matrix-v1 define?"
---
# Rust Framework Ownership Matrix v1

> Per-language framework/runtime semantics ownership ledger — distilled 2026-10-18
> from roadmap nodes `1-2-*` (grammar baseline), `1-3-*` (file-level language
> feasibility), `1-4-1-*` (framework resolvers), and `1-4-2-*` (reference
> resolution & finalization). Companion to `graph-semantics-guardrail-v1.md` and
> `resolver-semantic-residuals-ledger.md`. Existence and content locked by
> `__tests__/graph-semantics-guardrail-doc.test.ts` — do not delete or rename
> without updating that test.
>
> doc-kind: design · authority: primary (DES-framework-ownership-v1).

This matrix answers one bounded question: **when a source file is Rust-owned,
which framework/runtime semantics are still resolved in TypeScript shell, and
which have already been migrated into the Rust core?**

The matrix is the single page that closes roadmap node **1-5-5** ("文件 Rust-owned
不自动宣称框架/运行时语义 Rust-owned") — every migrated language must answer its
framework boundary independently of its file-ownership status.

## Purpose

- Bind each Rust-owned language to an explicit framework-ownership verdict
  (`rust` / `typescript` / `split` / `n/a`).
- Anchor every verdict to the roadmap node that decided it, so the boundary is
  auditable and reversible only through the same ledger protocol.
- Lock the boundary against drift: any code change that alters this matrix
  (e.g. migrating a resolver `resolve()` into Rust, or adding a new framework
  route extractor) must also update this file and the guardrail test in the
  same commit.
- Make the per-language framework boundary answerable from one page instead of
  walking four separate roadmap subtrees.

## Ownership Verdicts (vocabulary)

| Verdict | Meaning |
| --- | --- |
| `rust` | Framework extraction + resolution both live in the Rust core. |
| `typescript` | Framework extraction AND resolution both live in the TypeScript shell. File-level extraction is Rust-owned but all framework/runtime semantics stay TS. |
| `split` | Framework extraction is Rust-owned; framework resolution stays TypeScript shell. This is the dominant cutover pattern for roadmap wave 1. |
| `n/a` | The language has no first-party framework resolver slice (either no frameworks in scope, or all frameworks handled by a different language's resolver). |

Roadmap wave-1 rule: a language's grammar-baseline migration to Rust does
**not** automatically migrate its framework resolvers. Every resolver keeps a
separate `1-4-1-N` decision; without one, the resolver stays TS by default.

## Grammar-baseline Rust-owned languages (21)

Languages in `RUST_HYBRID_RUST_OWNED_LANGUAGES`
(`src/indexing/rust-hybrid-contract.ts`). For each, the file-level parser and
baseline symbol extractor are Rust-owned. The framework column is the
**framework-semantics** verdict, not the file-ownership verdict.

| Language | File-level extraction | Framework extraction | Framework resolution | Decided at | Note |
| --- | --- | --- | --- | --- | --- |
| javascript | rust | split | typescript | 1-2-* (baseline) + 1-4-1-3 / 1-4-1-5 / 1-6-6 | Express + NestJS extract kept TS until 1-6-6 backfill (`rust-js-framework-routes.ts`); React extract kept TS; `resolve()` stays TS shell. |
| jsx | rust | split | typescript | 1-2-* + 1-4-1-5 | Same shape as `javascript`; React component extraction covered by `rust-js-framework-routes.ts`. |
| typescript | rust | split | typescript | 1-2-* + 1-4-1-3 / 1-4-1-5 / 1-6-6 | Same shape as `javascript`. NestJS postExtract already Rust-side via `produce_nestjs_framework_post_extract_updates`. |
| tsx | rust | split | typescript | 1-2-* + 1-4-1-5 | Same shape as `typescript`. |
| go | rust | split | typescript | 1-2-* + 1-4-1-14 | Gin extract migrated into `crates/zcodegraph-core/src/go.rs` framework-routes; `resolve()` deferred to 1-4-2. |
| java | rust | split | typescript | 1-2-1-* + 1-4-1-12 | Spring extract covered by `rust-java-framework-routes.ts` backfill (1-4-2-9); `resolve()` TS. |
| kotlin | rust | split | typescript | 1-2-8-* + 1-4-1-22 | Expo Modules extract migrated (kotlin.rs framework-routes segment); `resolve()` TS. |
| python | rust | split | typescript | 1-2-* + 1-4-1-8 / 1-4-1-9 / 1-4-1-10 | Django/Flask/FastAPI resolver stays TS; extraction backfilled via `rust-python-framework-routes.ts` (1-6-2-4). |
| rust | rust | split | typescript | 1-2-* + 1-4-1-15 | Axum routes migrated (`extract_rust_axum_routes`); Actix/Rocket attribute shapes remain as backlog; `resolve()` deferred. |
| c | rust | n/a | n/a | 1-2-2-* | No framework resolver in scope. |
| cpp | rust | n/a | n/a | 1-2-3-* | No framework resolver in scope. |
| csharp | rust | split | typescript | 1-2-4-* + 1-4-1-16 | ASP.NET extract covered by `rust-csharp-framework-routes.ts`; Razor/Blazor stays TS (1-3-4-1); `resolve()` TS. |
| php | rust | split | typescript | 1-2-5-* + 1-4-1-1 / 1-4-1-2 | Laravel + Drupal resolvers stay TS; extraction covered by `rust-php-framework-routes.ts`. |
| ruby | rust | split | typescript | 1-2-6-* + 1-4-1-11 | Rails resolver stays TS; extraction covered by `rust-ruby-framework-routes.ts`. |
| dart | rust | n/a | n/a | 1-2-9-* | No first-party framework resolver; Flutter widget trees are file-level symbols only. |
| swift | rust | split | typescript | 1-2-7-* + 1-4-1-17 / 1-4-1-18 / 1-4-1-19 | SwiftUI + UIKit + Vapor extract migrated into `swift.rs` framework-routes; `resolve()` deferred to 1-4-2. |
| objc | rust | split | typescript | 1-2-14-* + 1-4-1-21 / 1-4-1-23 | React Native bridge (ObjC side) + Fabric (ObjC side) extract covered by `rust-objc-framework-routes.ts`; `resolve()` TS. |
| lua | rust | n/a | n/a | 1-2-12-* | No framework resolver in scope. |
| luau | rust | n/a | n/a | 1-2-13-* | No framework resolver in scope. |
| pascal | rust | n/a | n/a | 1-2-10-* | No framework resolver in scope (Delphi/VCL/FMX out of wave-1). |
| scala | rust | split | typescript | 1-2-11-* + 1-4-1-13 | Play conf/routes extract covered by `rust-scala-framework-routes.ts` (1-4-2-9); `resolve()` TS. |

## File-level languages (kept TypeScript shell)

Languages whose *entire file-level* extraction is deliberately TypeScript
shell (decision recorded at `1-3-N-1`). File-level symbols for these languages
are produced by either (a) a TS shell extractor (e.g. `svelte-extractor.ts`,
`vue-extractor.ts`) or (b) a TS framework resolver that emits symbols as a
side effect (e.g. `extractSpringConfig` in `java.ts` for `.properties`). These
files are **not** in `RUST_HYBRID_RUST_OWNED_LANGUAGES`.

| Language | File-level extraction | Framework extraction | Framework resolution | Decided at | Note |
| --- | --- | --- | --- | --- | --- |
| svelte | typescript | typescript | typescript | 1-3-1-1 + 1-4-1-6 | tree-sitter-svelte grammar too stale for wave-1; SvelteKit resolver stays TS. |
| vue | typescript | typescript | typescript | 1-3-2-1 + 1-4-1-7 | Vue/Nuxt file-convention routing stays TS. |
| liquid | typescript | typescript | typescript | 1-3-3-1 | Parser-free extractor preferred for auditability. |
| razor | typescript | typescript | typescript | 1-3-4-1 | `@code` delegation + heavy framework semantics; locked to TS. |
| xml (MyBatis) | typescript | typescript | typescript | 1-3-5-1 | MyBatis synthesizer stays at TS orchestration layer. |
| yaml | typescript | typescript | typescript | 1-3-6-1 | File-level zero-symbol language; symbols backfilled by 1-4 framework resolvers. |
| twig | typescript | typescript | typescript | 1-3-7-1 | Deliberate no-op extraction; no migration target. |
| properties | typescript | typescript | typescript | 1-3-8-1 | Symbols produced by `java.ts` Spring resolver `extractSpringConfig`; Spring resolver ownership decision governs. |

The keep verdicts above are locked by `__tests__/file-level-language-ownership-guard.test.ts`
(8 cases, one per language).

## Framework resolver verdicts (1-4-1-*)

| Resolver | Verdict | Note |
| --- | --- | --- |
| 1-4-1-1 Laravel | keep TS | Extraction backfilled via `rust-php-framework-routes.ts`. |
| 1-4-1-2 Drupal | keep TS | Routing YAML + hook sink stays TS. |
| 1-4-1-3 Express | keep TS | Extraction backfilled via `rust-js-framework-routes.ts` (1-6-6). |
| 1-4-1-4 NestJS | split | `extract()` TS; `postExtract()` Rust (module-prefix). |
| 1-4-1-5 React | keep TS | Component/context/router semantics TS. |
| 1-4-1-6 Svelte | keep TS | SvelteKit routes + form actions TS. |
| 1-4-1-7 Vue/Nuxt | keep TS | File-convention routing TS. |
| 1-4-1-8 Django | keep TS | URL/view/model + ORM descriptor semantics TS. |
| 1-4-1-9 Flask | keep TS | Decorator routing + Flask-RESTful TS. |
| 1-4-1-10 FastAPI | keep TS | Decorator routing + dependency injection TS. |
| 1-4-1-11 Rails | keep TS | Routes + controller/model/helper/service conventions TS. |
| 1-4-1-12 Spring | keep TS | Controller routing + config key binding TS. |
| 1-4-1-13 Play | keep TS | conf/routes extract backfilled (1-4-2-9). |
| 1-4-1-14 Go/Gin | split | Extract migrated (go.rs framework-routes); resolve TS. |
| 1-4-1-15 Rust (Axum/Rocket) | split | Axum migrated; Actix/Rocket attribute shapes backlog. |
| 1-4-1-16 ASP.NET | split | Extract covered by `rust-csharp-framework-routes.ts`; resolve TS. |
| 1-4-1-17 SwiftUI | split | Extract migrated (swift.rs framework-routes); resolve TS. |
| 1-4-1-18 UIKit | split | Extract migrated (swift.rs framework-routes); resolve TS. |
| 1-4-1-19 Vapor | split | Extract migrated (swift.rs framework-routes); resolve TS. |
| 1-4-1-20 Swift-ObjC bridge | resolve-only | No extract slice; deferred to 1-4-2. |
| 1-4-1-21 React Native bridge | split with partial keep | ObjC extract backfilled; TS spec + JVM `@ReactMethod` extract kept TS. |
| 1-4-1-22 Expo Modules | split | Extract migrated (swift.rs + kotlin.rs framework-routes); resolve TS. |
| 1-4-1-23 Fabric view | split with partial keep | ObjC extract backfilled; TS spec + JVM extract kept TS. |

## Reference resolution & finalization verdicts (1-4-2-*)

| Slice | Verdict | Note |
| --- | --- | --- |
| 1-4-2-1 ReferenceResolver orchestration | keep TS | Cross-language total orchestration stays TS. |
| 1-4-2-2 Name matcher | split | Completed; current shape frozen. |
| 1-4-2-3 Dynamic-dispatch synthesizers | keep TS | Stays TS until conditions mature. |
| 1-4-2-4 Framework resolver registry | keep TS | Registry is orchestration; Rust only receives extract backfill. |
| 1-4-2-5 Cleanup protocol execution | keep TS | Cleanup is part of finalization transaction boundary. |
| 1-4-2-6 Status/doctor degraded diagnostics | keep TS | Health vocabulary is user-facing contract, decoupled from implementation ownership. |
| 1-4-2-7 MCP/read API surface | keep TS | Surface frozen; `server-instructions.ts` is single source of truth. |
| 1-4-2-8 Rust-owned gap diagnostics | split | Contract + format TS-owned; data production Rust-owned (already the pattern). |
| 1-4-2-9 Rust-hybrid framework backfill gap closure | completed | rust-scala/java/js/kotlin framework-routes modules wired at `src/index.ts:2071/2083/2095/2107`. |

## Update Protocol

When any of the following changes lands, update this matrix **and** the
guardrail test in the same commit:

- A new framework extractor is migrated into the Rust core (any language).
- A `resolve()` slice is migrated from TS shell into Rust.
- A new framework resolver is added under `src/resolution/frameworks/`.
- A language is added to / removed from `RUST_HYBRID_RUST_OWNED_LANGUAGES`.
- A 1-3 keep decision is reversed (any file-level language moves to Rust).

Update procedure:

1. Edit the relevant row(s) in this file.
2. Edit `__tests__/graph-semantics-guardrail-doc.test.ts` so its locked strings
   still match the new content (the test asserts presence, not exact text, so
   updates are local).
3. If a new roadmap node is created for the change, record the decision with
   `roadmap_cli.py decide` on that node **before** marking this matrix updated.
4. Run `npx vitest run __tests__/graph-semantics-guardrail-doc.test.ts` to
   confirm the lock still holds.

## Out Of Scope

- The per-language gap taxonomy for *baseline* extraction (tracked in
  `rust-hybrid-contract.ts` `fallbackReasonTaxonomy` and the per-language
  `1-2-N` roadmap nodes).
- The performance evidence contract for ownership slices (tracked in
  `baseline-indexing-performance-v1.md`).
- The hard-gate evidence contract for graph-semantic closeouts (tracked in
  `graph-semantics-guardrail-v1.md`).
- File-level language keep rationale (the decisions live at `1-3-N-1`; this
  matrix only mirrors the verdict).
- Any proposal to migrate a `resolve()` slice into Rust (requires a new
  roadmap node and a fresh decision).

## Relationship To Other Ledgers

- `resolver-semantic-residuals-ledger.md` — enumerates *why* certain semantic
  buckets stay deferred. This matrix enumerates *where* the ownership boundary
  currently sits per language. The two pages must stay consistent: a deferred
  residual on the resolver ledger cannot be marked `rust` here.
- `rust-hybrid-optimization-decision-ledger.md` — enumerates rollout /
  optimization decisions. When a rollout decision promotes a resolver slice
  from TS to Rust, this matrix must be updated first, then the optimization
  ledger cross-references the change.
- `plan-artifact-consolidated-closeout.md` — top-level navigation. This matrix
  is the framework-ownership entry under that navigation.

## Pass/Fail Interpretation

For any new PR:

- **pass** — The PR does not change any ownership verdict listed here, or it
  updates this matrix + guardrail test in the same commit.
- **fail** — The PR changes an ownership verdict in code without updating this
  matrix, or updates the matrix without a corresponding roadmap decision.
- **needs-human-review** — The PR introduces a new framework resolver slice
  or adds a new language to `RUST_HYBRID_RUST_OWNED_LANGUAGES` without an
  accompanying 1-4-1 / 1-4-2 roadmap decision.
