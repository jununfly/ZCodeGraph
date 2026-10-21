---
doc-kind: evidence
authority: supporting
authority-id: EV-dead-code-rubric-v1-annotation-2026-10-21
bounded-question: "What did the R1 mechanical annotation of dead-code-rubric-v1 produce on the five pinned corpora, and what signal gaps did it expose?"
supports: DES-dead-code-rubric-v1
roadmap-node: 1-2-4
---
# Dead-Code Rubric v1 — R1 Mechanical Annotation

Date: 2026-10-21
Roadmap: `docs/plans/capability-harvest-roadmap.json` node **1-2-4** (P0b 冻结《死代码判定 rubric v1》)
Contract: [`DES-dead-code-rubric-v1`](../contracts/dead-code-rubric-v1.md)
Machine report: [`2026-10-21-dead-code-rubric-v1-annotation-r1.json`](2026-10-21-dead-code-rubric-v1-annotation-r1.json)
Annotator: `scripts/measure/dead-code-annotate-r1.mjs` (seed `20261021`)

## Why this evidence exists

Node 1-2-4 exit criteria require (a) the rule list frozen in the contract,
(b) a fixed-commit corpus of the existing 5 repos incl. ≥1 Spring repo, and
(c) two independent annotation passes with arbitration. This file records
the **R1 (mechanical) pass**: the rubric executed verbatim as graph
queries — zero judgment, every verdict carries its first-matching rule id
and evidence fields. The R2 (blind human) pass and arbitration log are
appended below when complete.

## Corpora (pinned)

| # | Corpus | Language | Pinned SHA | Sparse cone | Index provenance |
| --- | --- | --- | --- | --- | --- |
| 1 | dotnet-architecture/eShopOnWeb | csharp | `4da8212117e8` | `src` | fresh index 2026-10-21 |
| 2 | spring-projects/spring-petclinic | java | `500158f73241` | `src` | reused index (2026-10-21, same tree) |
| 3 | drupal/drupal | php | `d3cbca3f02c7` | `core/lib`, `core/modules` | **partial**: rust-hybrid indexing halted with a FOREIGN KEY error after 11,501 files (8,820 PHP; 115,904 nodes, 742 route nodes); TS resolution phase never ran, so `unresolved_refs` survives (339,376 rows) |
| 4 | django/django | python | `2fff3e9f493a` | `django` | fresh index 2026-10-21 |
| 5 | actix/actix-web | rust | `2db7119a9905` | `src`, `actix-web/src` | fresh index 2026-10-21 |

## R1 results (full candidate pools)

| Corpus | Candidates | dead (R4) | alive | unknown | unknown_ratio | Sample N |
| --- | --- | --- | --- | --- | --- | --- |
| spring-petclinic | 25 | 1 | 7 | 17 | 0.68 | 25 (whole pool < 30) |
| eShopOnWeb | 161 | 17 | 15 | 129 | 0.80 | 34 |
| drupal | 22,763 | 3,949 | 2,498 | 16,316 | 0.72 | 60 |
| django | 6,148 | 5,659 | 242 | 247 | 0.04 | 60 |
| actix-web | 610 | 584 | 26 | 0 | 0.00 | 56 |

Sample rule distribution (bucket/rule):

| Corpus | dead/R4 | alive/R1 | alive/R2 | unknown/R3 |
| --- | --- | --- | --- | --- |
| spring-petclinic | 1 | 0 | 7 | 17 |
| eShopOnWeb | 17 | 1 | 0 | 16 |
| drupal | 30 | 0 | 3 | 27 |
| django | 30 | 22 | 0 | 8 |
| actix-web | 30 | 0 | 26 | 0 |

## Signal gaps exposed by R1 (rubric-amendment input)

These are **facts about the graph signals the rubric consumes**, recorded
here so arbitration can distinguish "rubric defect" from "graph gap":

1. **`nodes.decorators` is language-sparse.** Java emits annotation usages
   as `decorates` unresolved refs, not the decorators column (petclinic:
   172 fn nodes, 0 with decorators). Mitigation shipped in this rubric
   revision: R1 falls back to resolved `decorates`-edge target names
   (`evidence.via: decorates-edge`). Unresolved refs are not consulted —
   the table is cleared by resolution.
2. **Rust extractor populates none of the R3 signals** on actix-web:
   `visibility`/`is_exported` all 0, no `decorators`, no
   `implements`/`overrides` edges, no attribute-macro refs
   (`#[get("/")]`, `#[test]`). Result: R3 never fires (unknown=0) and
   584/610 candidates fall through to R4, including the framework's own
   pub API. **actix-web is a framework-internal corpus** (its handlers
   live in `examples/`, outside the sparse cone); its R4 bucket is
   expected to arbitrage mostly false-dead. Per roadmap decision
   2026-10-21, actix precision is reported **separately** from the four
   application corpora, never pooled.
3. **Django's R4 dominance (5,659/6,148, 92%)** reflects real static
   frontier: ORM queryset/Model methods have no static callers (they are
   invoked via manager/attribute magic), and the graph has no
   `implements` edges for Python. The 8-sample unknown/R3 slice will
   quantify how much of R4 is provable vs frontier.
4. **petclinic candidate pool is only 25** (< 30 minimum): 172 fn − 134
   with calls edges − 81 in test paths (overlap) = 25. Handled by the
   rubric's whole-pool fallback (amendment recorded in the contract).
5. **drupal index is partial** (FOREIGN KEY halt, see corpora table).
   Candidates are computed on the partial graph; route nodes (742) and
   decorates signals are present. The failed finalization means
   `unresolved_refs` was never cleared — but per rubric it is not
   consulted, so verdicts are unaffected. Index-completeness caveat is
   recorded for R2: a `calls` edge that resolution would have added may
   be missing, biasing drupal slightly toward more candidates.

## Spot checks (sanity, not part of the protocol)

- petclinic's single R4: `vet::VetRepository::findAll` — a Spring Data
  repository interface method. This is the known proxy-class frontier
  (`docs/methods/language-verification-guide.md` §ceiling). Expected R2
  verdict: not-dead (Spring Data generates the impl). If confirmed,
  arbitration should record this as a **graph gap** (resolver backlog:
  Spring Data repository proxy), not a rubric defect — the rubric has no
  signal to distinguish it.
- actix-web sample contains only dead/R4 + alive/R2 (entry-name/exported
  path), confirming R3 bypass.

## R2 (blind human) pass

Complete. The dead-bucket sample (108) was split per protocol amendment
into **R2-auto** (43 labels from text-level independent signals — no graph
edges consulted) and **R2-human** (65 labels from the blind checklist,
applied verbatim as returned by the Human on 2026-10-21):

```
1 u, 2 u, 3 u, 4 u, 5 u, 6 u, 7 u, 8 u, 9 a, 10 a,
11 a, 12 a, 13 a, 14 a, 15 a, 16 a, 17 a, 18 a, 19 a, 20 u,
21 u, 22 u, 23 u, 24 u, 25 u, 26 a, 27 a, 28 a, 29 a, 30 a,
31 a, 32 a, 33 a, 34 a, 35 a, 36 a, 37 a, 38 a, 39 a, 40 u,
41 u, 42 u, 43 u, 44 u, 45 u, 46 u, 47 a, 48 u, 49 a, 50 u,
51 u, 52 u, 53 u, 54 u, 55 a, 56 a, 57 a, 58 a, 59 u, 60 a,
61 u, 62 u, 63 a, 64 a, 65 a
```

### Precision result (R1 dead bucket vs R2 truth)

| Corpus | R1 dead | R2 dead | R2 alive | R2 unknown | precision |
| --- | --- | --- | --- | --- | --- |
| spring-petclinic | 1 | 0 | 0 | 1 | 0/1 |
| eShopOnWeb | 17 | 0 | 8 | 9 | 0/17 |
| drupal | 30 | 0 | 17 | 13 | 0/30 |
| django | 30 | 0 | 22 | 8 | 0/30 |
| **application pooled** | **78** | **0** | **47** | **31** | **0.000** |
| actix-web (separate) | 30 | 0 | 25 | 5 | 0/30 |

**R1 precision on this sample is 0/108 (0%).** Not one R1 `dead` verdict
survived the second pass. This is a legitimate negative result and the
exact outcome the rubric-freeze node exists to produce *before* node
1-2-5 builds `find_dead_code` on top.

## Arbitration log

All 108 entries are disagreements (R1=dead, R2≠dead); classification
counts (each entry's full record lives in the companion JSON):

| Class | Count | Root cause buckets |
| --- | --- | --- |
| `graph-gap` | 49 | rust test-helper/pub-fn visibility absent (27); django registry/decorator callbacks (9); EF-core/DDD reflection ctors (6); same-file call edge missed (3); rust trait impl without implements edges (3); spring-data proxy (1) |
| `rubric-gap` | 49 | js closure/jquery callbacks in drupal behaviors (24); django template tags via string refs (17); blazor markup/lifecycle entries (8) |
| `corpus-noise` | 10 | minified js bundle symbols (6); dom-driven static admin js (4) |

### Arbitration outcomes → rubric amendments (recorded in contract)

1. **None of the 108 false-dead verdicts trace to a rubric rule being
   *wrong* given its signals** — they trace to (a) graph signals the
   extractor does not emit (49), (b) entry-point classes R2's framework
   list does not cover (49), or (c) corpus noise the path exclusions do
   not catch (10). Recorded as amendments A1–A3 in the contract.
2. **1-2-5 implementation gate**: `find_dead_code` v1 must ship the
   rubric's R2 entry-list extension (blazor lifecycle + markup handler
   naming, django template-tag registration file signal, JS-in-behaviors
   closure demotion to `unknown`) and the path-exclusion extension
   (`js/build/`, `*/static/admin/js/`), or its precision will be 0% on
   the same sample. Rust visibility / trait-impl edges and closure-local
   JS calls edges are extractor work, gated separately.
3. **actix-web stays split** (framework-internal corpus) per the
   2026-10-21 decision; its 0/30 is dominated by missing Rust extractor
   signals, not application-code truth.

## Reproduce

```bash
# whole pipeline (clone is idempotent; --skip-index reuses .zcodegraph DBs)
node scripts/measure/dead-code-annotate-r1.mjs \
  --out docs/evidence/2026-10-21-dead-code-rubric-v1-annotation-r1.json
# per-corpus
node scripts/measure/dead-code-annotate-r1.mjs --only spring-projects/spring-petclinic --skip-index
```

Determinism: same pinned SHAs + same seed (`20261021`) ⇒ byte-identical
`sample` arrays (draw order is mulberry32 over the candidate array order,
which is SQLite row order — stable for a fixed DB).
