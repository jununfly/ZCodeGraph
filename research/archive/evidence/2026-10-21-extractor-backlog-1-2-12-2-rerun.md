---
doc-kind: evidence
authority: supporting
authority-id: EV-extractor-backlog-1-2-12-2-rerun-2026-10-21
bounded-question: "After the 1-2-12-2 extractor fixes (C# generic-call ref-name stripping, C# event-subscription refs, Python closure-return refs — TS + Rust dual-stack), what do the harmful-error rate and per-corpus agreement measure on the five pinned corpora?"
supports: DES-dead-code-rubric-v1
roadmap-node: 1-2-12-2
---
# A3 extractor backlog burn-down (1-2-12-2) — post-fix re-measurement

Date: 2026-10-21
Roadmap: `docs/plans/capability-harvest-roadmap.json` node **1-2-12-2**
Baseline: [`2026-10-21-find-dead-code-precision.md`](2026-10-21-find-dead-code-precision.md) (pre-fix, harmful-error rate 3/68)
Machine reports: [`2026-10-21-extractor-backlog-1-2-12-2/`](2026-10-21-extractor-backlog-1-2-12-2/) — `1-2-12-2-pooled-rerun.json` (pooled), `1-2-12-2-eshop-rerun.json`, `1-2-12-2-django-rerun.json`
Harness: `scripts/measure/dead-code-precision.mjs` (same R2 labels, same pinned corpora)

## What changed under test

Three extraction/resolution graph-gaps closed, implemented in BOTH the TS
extractor (`src/extraction/tree-sitter.ts`, `src/resolution/name-matcher.ts`,
`src/resolution/index.ts`) and the Rust rust-hybrid core
(`crates/zcodegraph-core/src/csharp.rs`, `lib.rs` — python lives in lib.rs),
because csharp and python are RUST_HYBRID_RUST_OWNED_LANGUAGES and the
production index is built by the Rust binary:

1. **C# generic call-site ref names** (`FromHttpResponseMessage<T>`,
   `obj.Helper<int, string>`) are stripped of trailing type arguments via
   `stripGenericTypeArgs` / `strip_generic_args` — wired into the three
   name-matcher strategies AND the `hasAnyPossibleMatch` pre-filter.
2. **C# event subscription** (`Countdown.Elapsed += HideToast;`) emits a
   `calls` ref to the handler (assignment_expression with `+=`/`-=` whose
   right side is an identifier/member_access_expression). Lambda right sides
   emit nothing (TS parity).
3. **Python closure-return** (`def register(...): ... return _model_admin_wrapper`)
   emits a `calls` ref from the factory to the returned nested function.

## End-to-end verification (DB probes)

- eShopOnWeb: `FromHttpResponseMessage ← calls:{HttpGet,HttpDelete,HttpPost,HttpPut}`;
  `ToastComponent::HideToast ← OnInitialized`; `ToastService::HideToast ← SetCountdown`.
- django: `django/contrib/admin/decorators.py::register → _model_admin_wrapper`.

## Metrics (pre → post)

| Corpus | harmful errors (pre) | harmful errors (post) | agreement (pre) | agreement (post) |
| --- | --- | --- | --- | --- |
| eShopOnWeb | 2 | **0** | 0.765 | **1.000** |
| django | 1 | **0** | 0.808 | 0.84 |
| spring-petclinic | 0 | 0 | 1.000 | 1.000 |
| drupal | 0 | 0 | 0.292 | 0.292 |
| **application pooled** | **3** | **0** | 0.618 | 0.656 |
| actix-web (separate) | 30 | 30 | 0.000 | 0.000 |

**Harmful-error rate: 3/68 = 4.4 % → 0/61 = 0 %.** All three previously
recorded extractor graph-gap harmful verdicts are eliminated; the tool now
makes zero harmful claims on the four application corpora. django's residual
4 disagreements are all conservative `unknown→alive` (R3 honest posture, not
errors). eShop's 1.000 agreement meets the 1-2-12-2 exit criterion (≥ 94 %);
the harmful-error rate went DOWN (3 → 0), satisfying the second half.

Note on labeled counts: labeled dropped 68 → 61 because the three fixed
nodes now resolve to `alive` verdicts whose node ids differ from the R1
sample snapshot, and eShop's labeled subset shrank 17 → 11 for the same
reason (6 formerly-`dead`-bucket entries now carry edges and exited the
candidate comparison). This is expected churn, not label loss.

## What is NOT closed here

- **drupal 0.292** is unchanged by design: all 24 disagreements are the
  rubric A1(c) `JS_CLOSURE_FILE_PROBES` deliberate demote (frozen 2026-10-21)
  plus the JS-barrel demote — a rubric-v2 contract topic, NOT an extractor
  backlog item. Node 1-2-12-1 was closed probe-falsified on exactly this
  finding.
- **actix-web 0.000** is the A3 Rust-signal frontier (extractor emits no
  visibility/decorators/implements for Rust) — tracked as node 1-2-12-3.
- **petclinic Spring Data proxy** (`VetRepository::findAll`) is already
  correctly `unknown` via the interface-proxy demote; the remaining Spring
  proxy-promotion topic is node 1-2-12-4.
