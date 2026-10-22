---
doc-kind: evidence
authority: primary
authority-id: EV-complexity-coverage-v1
bounded-question: "Did complexity-rubric-v1 meet the ≥90% per-language coverage exit criterion on the five pinned corpora?"
---
# Complexity Coverage v1 — Five-Corpus Measurement (roadmap 1-2-6)

Date: 2026-10-22
Rubric: `docs/contracts/complexity-rubric-v1.md`
Probe: `scripts/measure/complexity-coverage.mjs` (per-language, miss
bucket counts against coverage per rubric § Metrics).

## Result

**5/5 frozen languages pass the ≥90 % exit criterion.**

| Corpus | Language | Total | Computable | Exempt | Miss | Coverage | Pass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dotnet-architecture/eShopOnWeb | csharp | 357 | 353 | 4 | 0 | **0.989** | ✅ |
| spring-projects/spring-petclinic | java | 195 | 195 | 0 | 0 | **1.000** | ✅ |
| drupal/drupal | php | 35 708 | 35 708 | 0 | 0 | **1.000** | ✅ |
| django/django | python | 9 615 | 9 579 | 36 | 0 | **0.996** | ✅ |
| actix/actix-web | rust | 1 281 | 1 281 | 0 | 0 | **1.000** | ✅ |

Pooled coverage across all five: **46 916 / 46 956 = 0.9991**.

## Corpora (pinned)

| # | Slug | Ref | Sparse | Index provenance |
| --- | --- | --- | --- | --- |
| 1 | dotnet-architecture/eShopOnWeb | `4da8212117e8` | `src` | fresh index 2026-10-22 |
| 2 | spring-projects/spring-petclinic | `500158f73241` | `src` | fresh index 2026-10-22 |
| 3 | drupal/drupal | `d3cbca3f02c7` | `core/lib`, `core/modules` | **reused DB from 2026-10-21** (see Caveat A) |
| 4 | django/django | `2fff3e9f493a` | `django` | fresh index 2026-10-22 |
| 5 | actix/actix-web | `2db7119a9905` | `src`, `actix-web/src` | fresh index 2026-10-22 |

## Exemption breakdown (per rubric § E1/E2/E3)

| Corpus | Reason | Count | Notes |
| --- | --- | --- | --- |
| eShopOnWeb | `generated-product` (E3) | 4 | `.g.cs` / `.Designer.cs` source-generator output |
| django | `extern-or-ffi` (E2) | 36 | Python stub bodies (`pass` / `...` / docstring-only) — `.pyi`-style and ctypes patterns |
| others | — | 0 | No E1/E2/E3 hits |

No corpus hit the E1 (abstract-no-body) exemption on the indexed
subset — petclinic has no interface-only method declarations indexed
as `method` kind; actix-web's `derive`-generated code was not picked
up by the rust extractor on this sparse cone.

## Miss rate

**0 misses across all five corpora** (well under the 5 % defect
threshold defined in rubric § Metrics). Every non-exempt
function/method node had a readable body slice — file_path resolution
+ line arithmetic worked on every indexed row.

## Caveats

### A — Drupal corpus reused the 2026-10-21 DB

`zcodegraph index` on drupal fails on this host with `FOREIGN KEY
constraint failed` (the same partial-index issue documented in
`2026-10-21-dead-code-rubric-v1-annotation.md`). The measurement
therefore ran with `--reuse-db` against the preserved 2026-10-21 DB
(11 501 files, 8 820 PHP, 115 904 nodes). The preserved DB is the
same DB the dead-code annotation used, so the coverage number is
directly comparable across the two rubrics. The FK failure itself is
an extractor/resolver issue tracked separately and is **not** a
complexity-rubric defect.

### B — Miss bucket semantics

A "miss" means `fs.readFileSync` failed or
`validatePathWithinRoot` rejected the path — i.e., the index
recorded a node whose backing file is no longer readable. The
zero-miss result is evidence that body-slice acquisition (rubric
§ Body-slice acquisition) is reliable on the indexed subset.

### C — Sparse cone influence

eShopOnWeb, petclinic, and actix-web were indexed on narrow sparse
cones (`src`); django and drupal used the cones in the pinned table
above. The rubric does not specify corpus-wide coverage (it is
per-language over "successfully indexed" nodes), so sparse-cone
variation is acceptable — the exit criterion is about the metric's
computability on indexed data, not about the breadth of indexing.

## Reproduce

```bash
# eShopOnWeb (C#)
MEASURE_SKIP_FETCH=1 node scripts/measure/complexity-coverage.mjs \
  dotnet-architecture/eShopOnWeb --sparse src \
  --out docs/evidence/2026-10-22-complexity-coverage-eshoponweb.json

# spring-petclinic (Java)
MEASURE_SKIP_FETCH=1 node scripts/measure/complexity-coverage.mjs \
  spring-projects/spring-petclinic --sparse src \
  --out docs/evidence/2026-10-22-complexity-coverage-petclinic.json

# drupal (PHP, reuse preserved DB — fresh index hits FK error)
MEASURE_SKIP_FETCH=1 node scripts/measure/complexity-coverage.mjs \
  drupal/drupal --sparse core/lib --sparse core/modules --reuse-db \
  --out docs/evidence/2026-10-22-complexity-coverage-drupal.json

# django (Python)
MEASURE_SKIP_FETCH=1 node scripts/measure/complexity-coverage.mjs \
  django/django --sparse django \
  --out docs/evidence/2026-10-22-complexity-coverage-django.json

# actix-web (Rust)
MEASURE_SKIP_FETCH=1 node scripts/measure/complexity-coverage.mjs \
  actix/actix-web --sparse src --sparse actix-web/src \
  --out docs/evidence/2026-10-22-complexity-coverage-actix.json
```

Per-corpus JSON reports are stored next to this file.

## Verdict for node 1-2-6

- ✅ **Exit criterion ② (coverage ≥90 % per language)** — met by all
  five frozen languages (min 0.989, max 1.000).
- ✅ **Exit criterion ③ (denominator = successfully indexed function
  nodes, with exemption list)** — denominator counts all indexed
  function/method rows; exemptions are broken out by reason in
  `perLang.<lang>.exemptByReason` in each JSON report.
- ✅ **Exit criterion ① (no precompute / no persistence)** —
  complexity is computed at MCP query time and never written to the
  DB; the probe re-runs the rubric per node and never persists a
  complexity value back.

**Node 1-2-6 exit criteria are fully met.** Recommendation: close
1-2-6 and move to the next P0b item (1-2-10 test infra / 1-2-11
budget tightening / 1-2-12 backlog burn-down are still open).
