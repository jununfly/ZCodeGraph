---
doc-kind: ledger
authority: supporting
authority-id: LED-rust-owned-migration-roadmap-closeout
bounded-question: "What was decided and delivered in the rust-owned migration campaign (2026-09-28 → 2026-10-18), and where does its durable content now live?"
decided-by:
  - "1"
  - "1-4-1"
  - "1-4-2"
  - "1-5"
  - "1-6"
last-reviewed: 2026-10-19
---

# Rust-Owned Migration Roadmap Closeout

This ledger consolidates the durable content of the completed rust-owned
migration campaign whose process SoT lived at
`docs/plans/rust-owned-migration-roadmap.json` (166 nodes, 317 decisions,
closed 2026-10-18). In line with ADR
[`ZJ-0005-separate-durable-decisions-from-process-artifacts`](../decisions/ZJ-0005-separate-durable-decisions-from-process-artifacts.md)
and the ontology rule that `docs/plans/` holds process material only, the
JSON and its rendered `.md` were removed after this closeout was absorbed.

The full decision tree (166 nodes, 317 Q&A records) remains reachable in git
history at the path above. This ledger preserves the campaign-level shape and
the pointers to every durable artifact the campaign produced.

## Campaign Timeline

| Phase | Window | Scope |
| --- | --- | --- |
| Baseline calibration | 2026-09-28 | 1-1 nodes reconciled PRD status vs code, listed remaining migration scope |
| Wave 0 + first three languages | 2026-09-29 → 2026-10-05 | Java, C++, Kotlin cutovers; #692 fixture pattern hardened |
| Mid-campaign language waves | 2026-10-06 → 2026-10-14 | C#, PHP, Ruby, Dart, Swift, ObjC, Lua, Luau, Pascal |
| Late-campaign language waves | 2026-10-15 → 2026-10-16 | Scala cutover; C++ bodyless headers; Kotlin expect→actual |
| Framework re-decision + closeout | 2026-10-16 → 2026-10-18 | 23 framework resolvers re-decided under the new meta-principle; JS/TS framework backfill restored; Express real-corpus gate |
| Acceptance guardrails | 2026-10-18 | 1-5 nodes closed; ownership matrix contract shipped |

Final commit on the campaign: `f9ca972 chore(roadmap): close rust-owned-migration 1-5 acceptance branch` (2026-10-18).

## Final Counts

| Metric | Value | Durable home |
| --- | --- | --- |
| Rust-owned source languages | **21** | `src/indexing/rust-hybrid-contract.ts` (`RUST_HYBRID_RUST_OWNED_LANGUAGES`) |
| Rust extractor LOC | **37,467** across 14 files | `crates/zcodegraph-core/src/*.rs` (lib.rs alone 27,898) |
| TS framework backfill modules | **9** | `src/indexing/rust-{python,php,ruby,swift,objc,scala,java,js,kotlin}-framework-routes.ts` |
| Framework resolver decisions (1-4-1) | **25** leaves | Body of this ledger + per-decision rationale in the roadmap JSON history |
| Finalization-layer decisions (1-4-2) | **9** leaves | Body of this ledger |
| Real-corpus validation docs | **30** dated evidence files | `docs/evidence/2026-*.md` |
| Skip-debt guardrail | **empty allowlist** | `tests/skip-debt-guardrail.test.ts` (`ALLOWED_SKIPS = []`) |
| CI `-t` filters | **2 steps**, ~50 titles in sync | `.github/workflows/ci.yml` |

## Goal 1 — Language Baseline Extraction (1-2, 1-3)

**Outcome:** 21/21 grammar languages migrated to Rust-owned per-file indexing;
8/8 custom/file-level languages decided (all keep TS-shell with explicit
justification).

Grammar languages cutover order: Java → C → C++ → C# → PHP → Ruby → Swift →
Kotlin → Dart → Pascal/Delphi → Scala → Lua → Luau → Objective-C.

Custom/file-level languages (1-3): svelte, vue, liquid, razor/blazor,
xml/mybatis, yaml, twig, properties. All eight were decided `keep TS-shell`
because their extractors are pure path-convention or regex scans whose
consumers are TS resolvers (see per-language decisions in the JSON history
and `src/extraction/tree-sitter.ts:3697` + `src/extraction/grammars.ts:332`
for the file-level language ownership guard).

Per-language evidence is indexed under
[`docs/evidence/`](../evidence/) in files named
`YYYY-MM-DD-rust-owned-<lang>-<corpus>-validation.md`. The full inventory is
registered in [`docs/README.md`](../README.md) under "Rust-owned language
validation evidence".

## Goal 2 — TS Shell Shared-Layer Decisions (1-4)

**Meta-principle** (set by the Human during 1-4-1): a `keep` decision must be
justified by a concrete reason (precision loss, only-TS-can-do); otherwise
the item migrates to Rust. This principle drove a re-decision of all 23
framework resolvers in 1-4-1-1 through 1-4-1-13 after their initial `keep`
verdicts.

### 1-4-1 Framework resolver decisions (25 leaves)

| Decision shape | Count | Items |
| --- | --- | --- |
| `split` (extract → Rust, resolve stays TS) | 9 | Laravel, Express, NestJS, React, Django, Flask, FastAPI, Rails, Play |
| `keep TS-shell` (hard justification) | 2 | Svelte, Vue/Nuxt (file-convention-only, only TS consumers) |
| `split with partial keep` | 2 | Drupal (hook → Rust, routing.yml stays), Spring (Java source → Rust, yaml/properties stay) |
| Swift extract → Rust (1-4-1-17~19) | 3 | SwiftUI, UIKit, Vapor |
| Rust Axum/Actix/Rocket (1-4-1-15) | 1 | Axum in Rust; Actix/Rocket attribute forms migrated |
| ASP.NET (1-4-1-16) | 1 | extract → Rust (csharp.rs AST), backfill module deleted |
| Go/Gin (1-4-1-14) | 1 | extract → Rust |
| Resolve-only (no extract) | 1 | Swift-ObjC bridge (deferred to 1-4-2) |
| Bridge partial keep | 2 | React Native bridge, Fabric view resolver (ObjC side → Rust, TS spec / JVM side stays) |
| Expo Modules (1-4-1-22) | 1 | extract → Rust (swift.rs + kotlin.rs shared), deferred to 1-4-2-9 backfill |
| Rust Go framework routes gap | 1 | Closed as standalone backlog (1-4-1-24) |
| Re-decide batch | 1 | 1-4-1-25 parent for the 13-item re-decision wave |

### 1-4-2 Reference-resolution & finalization decisions (9 leaves)

All nine items decided and closed:

1. **ReferenceResolver orchestration** — keep TS (cross-language
   coordination is the shell's job).
2. **Name matcher** — keep TS (`resolveMethodOnType` suffix-matches
   `Class::method` qname; Rust only produces candidates).
3. **Dynamic-dispatch synthesizers** — keep TS per existing playbook.
4. **Framework resolver registry** — keep TS; Rust exposes post-extract
   protocol via the nine `rust-*-framework-routes.ts` backfill modules.
5. **Cleanup protocol execution** — keep TS executor.
6. **Status/doctor diagnostics** — keep six-word health vocabulary stable.
7. **MCP/read API surface** — keep tool semantics stable;
   `server-instructions.ts` remains the single source of truth.
8. **Rust-owned gap diagnostics** — keep per-file parse/extraction-gap
   reporting for every newly migrated language.
9. **rust-hybrid framework backfill gap closure** — shipped
   `rust-{scala,java,js,kotlin}-framework-routes.ts` and wired them into
   `finalizeRustIndex` (`src/index.ts:2071/2083/2095/2107`).

## Acceptance Guardrails (1-5)

| Node | Deliverable | Durable home |
| --- | --- | --- |
| 1-5-1 | TS fallback = 0 for migrated languages | `rust-hybrid-contract.ts` + per-language cutover evidence |
| 1-5-2 | Deterministic fixture + real-corpus evidence per language | `tests/fixtures/` + `docs/evidence/` |
| 1-5-3 | Every non-migrated shared-layer item has a recorded decision | this ledger + the JSON history |
| 1-5-4 | Status/doctor six-state health output unchanged | `src/diagnostics/` + `tests/graph-health.test.ts` |
| 1-5-5 | File-level Rust-owned ≠ framework/runtime Rust-owned | [`contracts/rust-framework-ownership-matrix-v1.md`](../contracts/rust-framework-ownership-matrix-v1.md) |

## Wave Schedule (1-6)

| Wave | Scope | Closing evidence |
| --- | --- | --- |
| 1-6-1 | Kotlin baseline (first post-#692 new language) | `2026-09-30-rust-owned-kotlin-koans-validation.md` |
| 1-6-2 | Python framework sufficiency → product fix 1-6-2-4 | `2026-09-30-python-framework-sufficiency.md` |
| 1-6-3 | Go/Gin route ownership extension | `2026-09-30-go-gin-route-ownership.md` |
| 1-6-4 | Swift baseline cutover (16th rust-owned) | `2026-10-12-rust-owned-swift-kingfisher-vapor-validation.md` |
| 1-6-5 | Wave-0 #692 fixture debt burned down | `skip-debt-guardrail.test.ts` empty allowlist |
| 1-6-6 | JS/TS framework backfill restoration (Express, NestJS extract, React) | `2026-10-17-rust-owned-express-expressjs-validation.md` |

## Cross-Cutting Constraints Preserved

- Six-word health vocabulary (`healthy`, `degraded`, `failed`, `unavailable`,
  `stale`, `corrupted`) is unchanged; `status`/`doctor` semantics untouched.
- MCP tool semantics unchanged; `server-instructions.ts` is the single
  agent-facing source of truth (issue #529).
- Skip-debt guardrail (`ALLOWED_SKIPS = []`) keeps the campaign honest: any
  new skip must carry a tracker (gap id, roadmap node, or GitHub issue).
- CI `-t` filters (~50 test titles across two steps) are locked in sync with
  real test names by `skip-debt-guardrail.test.ts`.

## What Is **Not** In This Ledger

- The full per-node decision text (317 Q&A records). Those live in the JSON
  history; this ledger preserves only the campaign-level shape and the
  pointers needed to navigate to the durable contracts, ADRs, code, and
  tests.
- One-off profile numbers, per-machine CI run ids, and re-decide churn
  detail. The rationale for any individual decision can be recovered by
  reading the JSON at the campaign's closing commit.

## Source Files (Absorbed)

- `docs/plans/rust-owned-migration-roadmap.json` — 3,586 lines, 166 nodes,
  317 decisions, last rendered 2026-10-18 15:36.
- `docs/plans/rust-owned-migration-roadmap.md` — 52-line rendered view
  (auto-generated, derived artifact).

Both files removed 2026-10-19 under `/zj-docs-ontology` after this closeout
was absorbed. See the change log entry in [`docs/README.md`](../README.md)
for the consolidation pass record.
