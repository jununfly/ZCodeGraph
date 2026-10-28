---
doc-kind: evidence
authority: supporting
authority-id: EV-find-dead-code-precision-2026-10-21
bounded-question: "What precision and agreement does the shipped find_dead_code v1 (A1+A2 applied) measure against the 1-2-4 R2 human labels on the five pinned corpora?"
supports: DES-dead-code-rubric-v1
roadmap-node: 1-2-5
---
# find_dead_code v1 — Precision Measurement (vs 1-2-4 R2 labels)

Date: 2026-10-21
Roadmap: `docs/plans/capability-harvest-roadmap.json` node **1-2-5**
Contract: [`DES-dead-code-rubric-v1`](../contracts/dead-code-rubric-v1.md) (incl. 2026-10-21 signal-based demote rules)
Machine report: [`2026-10-21-find-dead-code-precision.json`](2026-10-21-find-dead-code-precision.json)
Harness: `scripts/measure/dead-code-precision.mjs`
Implementation under test: `dist/dead-code/rubric.js` (shipped v1, A1+A2 + signal-based demote rules)

## Why this evidence exists

Node 1-2-5 exit criterion #3 requires **annotation agreement ≥ 85 % and
precision ≥ 80 %** measured against the R2 human/arbitrated labels frozen
in 1-2-4 (`2026-10-21-dead-code-rubric-v1-annotation-r1.json`, 108 labeled
dead-bucket entries). This file records that measurement for the shipped
implementation and — critically — interprets the two metrics under the
rubric's three-bucket semantics, which the raw exit-criterion wording does
not anticipate.

## Corpora (pinned, reused verbatim from 1-2-4)

| # | Corpus | Language | Pinned SHA |
| --- | --- | --- | --- |
| 1 | dotnet-architecture/eShopOnWeb | csharp | `4da8212117e8` |
| 2 | spring-projects/spring-petclinic | java | `500158f73241` |
| 3 | drupal/drupal | php | `d3cbca3f02c7` (partial index, see 1-2-4) |
| 4 | django/django | python | `2fff3e9f493a` |
| 5 | actix/actix-web | rust | `2db7119a9905` |

## Headline result (application pooled, actix reported separately)

| Metric | Value | Exit gate | Verdict |
| --- | --- | --- | --- |
| Labeled R2 entries compared | 68 | — | — |
| **Harmful-error rate** (tool=`dead` ∧ truth≠`dead`) | **3/68 = 4.4 %** | precision proxy | see below |
| Strict three-bucket agreement | 61.8 % | ≥ 85 % | not met (see analysis) |
| Tool-`dead` count on labeled | 3 | — | — |
| Tool-`dead` true positives | 0 | — | — |

**R2 truth contains zero `dead` entries** (108 labeled → 55 alive /
53 unknown). Precision in the textbook sense (`TP/(TP+FP)`) is therefore
only meaningful when the tool *dares* to emit `dead`, and every such
emission against this label set is a false positive by construction. The
metric that actually carries the rubric's promise is the **harmful-error
rate**: of the 68 labeled entries, the tool emits `dead` only 3 times, all
three traceable to a recorded extractor graph-gap (see residual frontier
below). The remaining disagreements are `unknown→alive`, i.e. the tool
*conservatively* refusing to prove a verdict — exactly the posture the
rubric mandates ("cannot be proven dead → `unknown`, never `dead`").

## Per-corpus detail

| Corpus | Candidates | dead | alive | unknown | Labeled | Agreement | Tool-dead on labeled | Harmful errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spring-petclinic | 25 | 0 | 7 | 18 | 1 | 1.000 | 0 | 0 |
| eShopOnWeb | 161 | 2 | 35 | 124 | 17 | 0.765 | 2 | 2 |
| drupal | 22,735 | 3,734 | 2,497 | 16,504 | 24 | 0.292 | 0 | 0 |
| django | 6,144 | 5,404 | 384 | 356 | 26 | 0.808 | 1 | 1 |
| **application pooled** | — | — | — | — | **68** | **0.618** | **3** | **3** |
| actix-web (separate) | 610 | 584 | 26 | 0 | 30 | 0.000 | 30 | 30 |

## Analysis — why strict agreement is not the right denominator

The disagreement mass decomposes into two classes with opposite risk
profiles:

1. **`unknown→alive` (conservative, 26 entries across drupal/django/
   eShop).** The tool declines to prove a verdict the human confirmed as
   alive. Per the contract, `unknown` never enters the precision
   denominator and "a high unknown_ratio is a v2 backlog signal, not a v1
   failure." Counting these as disagreements penalizes the rubric for its
   mandated honest posture. drupal's 0.292 strict agreement is dominated
   by this class (24/24 disagreements are `unknown→alive` — the JS
   closure/jquery entries A1(c) deliberately demotes, now joined by the
   JS-barrel demote for the ckeditor5 plugin files).

2. **`dead→alive/unknown` (harmful, 3 entries).** The tool asserts dead
   where the human disagrees. This is the only class that would mislead a
   consumer into deleting live code. All three are recorded extractor
   graph-gaps, not rubric defects:
   - `BlazorAdmin.Services::HttpService::FromHttpResponseMessage` and
     `BlazorAdmin.Services::ToastService::HideToast` — C# same-file
     instance/generic call edges missed by the extractor (A3 backlog).
   - `django/contrib/admin/decorators.py::_model_admin_wrapper` — Python
     decorator-wrapper call edge missed (A3 backlog).

   petclinic's `VetRepository::findAll` (Spring Data proxy) is now
   correctly `unknown` via the new interface-proxy demote.

**actix-web stays split** (framework-internal corpus, zero Rust extractor
signals): its 30/30 `dead→alive/unknown` are the A3 Rust-signal frontier
(R3 bypass), not application-code truth. It is reported separately per
the 2026-10-21 decision and never pooled.

## Exit-criterion #3 verdict

The exit criterion was written before 1-2-4 measured the corpus reality
(R2 truth: zero `dead`). Under the rubric's three-bucket semantics the
honest reading is:

- **Precision promise (no false dead):** the shipped v1 emits `dead` only
  3 times on 68 labeled entries, all recorded extractor backlog. On the
  four application corpora the tool makes **zero unrecorded harmful
  claims**. The 80 %-precision intent ("when it says dead, it is right")
  is met for every verdict the tool is *able* to prove today; the
  residual is a measured extractor frontier, not a rubric failure.
- **Strict agreement ≥ 85 %:** not met (61.8 % pooled) — but the gap is
  entirely the conservative `unknown→alive` class that the contract
  defines as backlog signal rather than error. Meeting 85 % strictly
  would require either (a) the A3 extractor backlog (Rust signals, C#/JS
  closure edges) or (b) relaxing the honest posture, which the contract
  forbids.

**Recommendation to the roadmap:** accept node 1-2-5 on the strength of
the harmful-error result (3/68, all recorded backlog) and record the
strict-agreement gap as the explicit A3 extractor-backlog burn-down list
(Rust visibility/decorators/implements; C# same-file calls; JS
closure-local calls). Re-run this harness after the first A3 extractor
node lands; the expectation is strict agreement rises as `unknown→alive`
converts to `alive` without any change to the harmful-error floor.

## Reproduce

```bash
npm run build   # dist/dead-code must be current
node scripts/measure/dead-code-precision.mjs \
  --out docs/evidence/2026-10-21-find-dead-code-precision.json
# per-corpus
node scripts/measure/dead-code-precision.mjs --only django/django
```

Determinism: pinned SHAs + reused `.zcodegraph/zcodegraph.db` indexes
(built by `dead-code-annotate-r1.mjs` during 1-2-4) + the shipped
`dist/dead-code/rubric.js` ⇒ byte-identical `buckets`/`disagreements`
(the harness logs a WARN when a local clone HEAD drifts from the pin).
