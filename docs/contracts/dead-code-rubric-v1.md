---
doc-kind: contract
authority: primary
authority-id: DES-dead-code-rubric-v1
bounded-question: "How is a function/method node judged dead, alive, or unknown for find_dead_code v1?"
---
# Dead-Code Rubric v1

Status: active

## Purpose

`dead-code-rubric-v1` freezes the judgment rules behind `find_dead_code`
(roadmap node 1-2-5) so that every candidate the tool emits is reproducible
from the indexed graph alone — no LLM call, no raw-source regex scanning,
no schema migration. The rubric refines the coarse dead-code definition in
`health-rubric-v1` D1 ("function/method nodes with zero `calls` edges in
either direction") into a **three-bucket verdict** (`dead` / `alive` /
`unknown`) with explicit rule IDs, so precision can be measured against
human annotation and unknowns can be burned down by later rubric versions.

## Non-goals

- **No recall claim.** v1 only commits to precision (≥80 %, node 1-2-5).
  Dynamic dispatch (reflection, DI containers, duck-typed callbacks) makes
  full recall unprovable from a static graph; candidates that cannot be
  *proven* dead go to `unknown`, never to `dead`.
- **No raw-source scanning.** Rules consume only `nodes`, `edges`, `files`
  columns (including `nodes.decorators`, `nodes.is_exported`,
  `nodes.signature`) and the `route` nodes / framework edges the resolvers
  already persist — plus the bounded file-content existence probes defined
  by amendment A1 and clarified on 2026-10-21 (existence-only substring
  match over already-indexed files; see Amendments). If a signal is
  neither in the graph nor an A1 probe, it is out of scope.
- **No per-language new extraction.** The annotation/attribute whitelist
  below is read from the existing `decorators` column; languages whose
  extractors do not populate `decorators` fall back to rules R2/R3 and the
  `unknown` bucket — they are not given new extractors in this rubric.
- **No auto-fix / deletion suggestion.** v1 emits a report only.

## Base candidate set

A node enters candidacy iff **all** of:

```
kind IN ('function','method')
AND zero incoming edges of kind 'calls'
AND zero outgoing edges of kind 'calls'   -- matches health-rubric-v1 D1
AND file is indexed successfully (not degraded)
AND file path is not excluded by the test/generated exclusions below
```

Path exclusions (case-insensitive substring match, aligned with the
fair-coverage denominator exclusions in
`methods/language-verification-guide.md`):

- `test`, `tests`, `__tests__`, `spec`, `testing`, `testdata`
- `mock`, `mocks`, `fixture`, `fixtures`
- `generated`, `gen-`, `.generated`, `vendor`, `migrations`

Test files are excluded from candidacy, not judged: they are exercised by
the runner, not by the graph, and judging them would conflate "no static
caller" with "dead". Their exclusion is reported in the output summary.

## Verdict rules

Rules are evaluated **in order**; the first match wins. Every emitted
candidate carries `bucket`, `rule_id`, and the evidence fields used by the
rule (edge counts, decorator hit, etc.) so annotation R1 is a pure
re-execution of the same queries.

### R1 — Annotation / attribute whitelist → `alive`

If `nodes.decorators` (JSON array) contains any entry matching the
language's whitelist, the node is `alive` — the framework or compiler
invokes it through channels the static graph cannot see.

**Fallback signal (`via: decorates-edge`).** Extractors that do not
populate `nodes.decorators` may still record annotation usages as resolved
`decorates` edges (Java emits `@Foo` usages as `decorates` unresolved refs;
resolved ones land as edges whose target node name is the annotation's
leaf type). When the `decorators` column is empty, the same whitelist is
matched (same substring rule) against the names of `decorates`-edge
targets. Whichever channel produced the hit is recorded in
`evidence.via`. Unresolved `decorates` refs are **not** consulted — the
`unresolved_refs` table is consumed and cleared by resolution.

| Language | Whitelist (substring match, case-insensitive) |
| --- | --- |
| Java | `override`, `bean`, `component`, `service`, `repository`, `controller`, `requestmapping`, `getmapping`, `postmapping`, `putmapping`, `deletemapping`, `patchmapping`, `autowired`, `inject`, `postconstruct`, `predestroy`, `eventlistener`, `scheduled`, `transactional`, `test`, `parameterizedtest`, `beforeeach`, `aftereach`, `beforeall`, `afterall` |
| C# | `override` (signature keyword), `apicontroller`, `route`, `httpget`, `httppost`, `httpput`, `httpdelete`, `httppatch`, `fact`, `theory`, `test`, `testmethod`, `setup`, `teardown`, `onmodelcreating`, `jsonconstructor`, `webmethod`, `grpc` |
| Python | `property`, `staticmethod`, `classmethod`, `abstractmethod`, `pytest.fixture`, `fixture`, `app.route`, `route`, `get`, `post`, `put`, `delete`, `patch`, `api_view`, `receiver`, `override`, `patch.object`, `mock`, `celery.task`, `shared_task`, `lru_cache`, `cache`, `wraps`, `contextmanager`, `dataclass` |
| PHP | `route`, `middleware`, `scope`, `boot`, `register`, `hook_` (Drupal hook prefix), `test`, `dataprovider` |
| Rust | `test`, `no_mangle`, `wasm_bindgen`, `derive`, `async_std.main`, `tokio.main`, `actix`, `get(`, `post(`, `route`, `handler` |
| Go | *(no decorator column — falls through to R2/R3/unknown)* |

`override` matches for C# are checked against `signature`, not
`decorators` (C# expresses overriding as a keyword, not an attribute).

### R2 — Framework entry points → `alive`

The node is `alive` if any of:

- It is the **handler end** of a `route` node (any edge connecting the
  route node to this function/method, either direction — the resolver
  layer persists `references` edges from route to handler).
- Its `name` is a language-standard entry point: `main`, `Main`,
  `index`, `handler`, `Handler`, `__init__`, `__call__`, `run`, `boot`,
  `register`, `setup`, `configure`, `create`, `build` (constructor-shaped
  factory names), or it is a `constructor`/`__construct`/`__construct`
  method kind.
- `is_exported = 1` **and** the file sits in the package's public surface
  (path does not contain `internal/`, `private`, `impl/`). Public-API
  symbols are consumed by downstream code outside the indexed repo; the
  graph cannot see those callers.
- It is a **test function** by name convention: `test*`, `Test*` (Go),
  `it*`, `should*`, `*_test`, `test_*` — defensive duplicate of the path
  exclusion, covering tests colocated with source.

### R3 — Dynamic-dispatch exemption → `unknown`

The node is `unknown` — statically unreferenced but plausibly invoked
through indirection the graph cannot prove — if any of:

- It has an incoming `implements` / `overrides` / `type_of` edge, or its
  containing class/trait has an `implements` edge to an interface that is
  itself referenced anywhere (interface method dispatched via the
  interface type).
- Its name matches a known reflection/serialization/lifecycle callback:
  `toString`, `toJson`, `to_json`, `fromJson`, `from_json`, `serialize`,
  `deserialize`, `__str__`, `__repr__`, `__eq__`, `__hash__`, `__lt__`,
  `__len__`, `__iter__`, `__enter__`, `__exit__`, `__getattr__`,
  `__getattribute__`, `__setattr__`, `equals`, `hashCode`, `clone`,
  `finalize`, `close`, `dispose`, `Dispose`, `CompareTo`, `GetHashCode`,
  `Equals`, `ToString`, `accept`, `visit*`, `on*` (event-handler
  convention), `render`, `componentDidMount`-style framework lifecycles.
- Its file contains reflection signals the index recorded (e.g. an
  `imports` edge to `System.Reflection`, `java.lang.reflect`,
  `importlib`, or a DI container package such as `spring-context`,
  `autofac`, `injector`) — file-level signal, reported as
  `reflection_context: true`.
- It is `pub` (Rust) / package-visible with no path signal, or exported
  from a file whose package exports it via a barrel the resolver did not
  resolve (residual `unknown`).

### R4 — Residual → `dead`

Anything still unmatched after R1–R3 is judged `dead`: a function/method
with zero `calls` edges in both directions, not annotation-protected, not
a framework entry point, not reachable through dynamic dispatch, and not
in a test/generated path.

## Metrics

For each corpus:

```
precision = |dead ∩ human-dead| / |dead|          (only the dead bucket)
unknown_ratio = |unknown| / |candidates|          (reported, not graded)
```

- Precision is computed **per corpus and pooled**; node 1-2-5 requires
  pooled precision ≥ 80 % and per-corpus annotation agreement ≥ 85 %.
- `unknown` never enters the precision denominator. A high `unknown_ratio`
  is a v2 backlog signal, not a v1 failure.

## Corpora (fixed commits)

Five existing real-corpus gate repositories, reused verbatim from the
coverage-ceiling matrix; commits are pinned in the annotation evidence
file:

| # | Corpus | Language | Framework surface exercised |
| --- | --- | --- | --- |
| 1 | eShopOnWeb | C# | ASP.NET controllers, DI |
| 2 | spring-petclinic | Java | Spring MVC, Spring Data, bean/DI |
| 3 | drupal (core subset) | PHP | Drupal hook system |
| 4 | django | Python | Django ORM/queryset, admin, views |
| 5 | actix (actix-web) | Rust | actix handlers, macros |

spring-petclinic satisfies the roadmap exit criterion "≥1 Spring 仓固定
commit". If R1 annotation shows Spring signal density too low to exercise
R1/R3 rules (e.g. fewer than 5 whitelist hits), one additional Spring
corpus (candidate: `spring-boot-realworld-example-app`) may be added by
rubric amendment without invalidating v1.

## Annotation protocol

Two independent passes per corpus, per roadmap node 1-2-4 exit criteria:

1. **R1 (mechanical).** The Agent executes the candidacy query + R1–R4
   exactly as specified, over each corpus's indexed SQLite. Zero
   judgment: every verdict is the first-matching rule, recorded with its
   rule ID and evidence. Sample: per corpus, all `dead` candidates up to
   30 (fewer if the corpus yields fewer), padded with an equal number of
   randomly drawn `alive`/`unknown` candidates (seed fixed in the
   evidence file) to avoid an all-positive sample; minimum 30 nodes per
   corpus total.
2. **R2 (blind human).** The Human labels the same sample
   dead/alive/unknown from the source alone, without seeing R1 verdicts.
   **Minimum sample-size fallback:** if a corpus's full candidate pool is
   smaller than 30 nodes, the entire pool is labeled (25/25-style) and the
   corpus is reported with its actual N; per-corpus agreement then uses
   that N, and the pooled agreement weights each corpus by its N. This
   preserves the "≥30" intent (a statistically meaningful sample) for
   larger corpora instead of importing noise via padding.
3. **Arbitration.** Every R1≠R2 disagreement is listed with both
   verdicts, the triggering rule ID, and the arbitrated truth. Arbitration
   outcomes that indicate a rule defect are recorded as rubric amendments
   (appended to this file) before node 1-2-4 closes; outcomes that
   indicate graph gaps are recorded as evidence for resolver backlog, not
   rubric changes.

Frozen annotation input: `docs/baselines/dead-code-annotation-r1-v1.json`
(sample manifest, R1 verdicts, R2 verdicts, arbitration log, agreement
metrics). This versioned input is consumed by `dead-code-precision.mjs`;
new annotation runs belong in `.tmp/measure/` until explicitly promoted.

## Amendments

Rule changes require a new version (`dead-code-rubric-v2.md`) unless they
are pure clarifications that do not change any verdict. Arbitration-driven
clarifications land here as dated amendment entries below this line.

### 2026-10-21 — A1/A2/A3 (post-R1/R2 arbitration, roadmap 1-2-4)

R1+R2 on the five pinned corpora produced **0/108 confirmed dead** — every
R1 `dead` verdict was arbitrated to `alive` (55) or `unknown` (53). Root
causes classified into three buckets; the rubric text above is clarified
accordingly (clarifications only — no rule verdict changes, hence no v2):

- **A1 (rubric-gap, 49 entries) — entry-point classes R2 must also cover.**
  Clarify R2's framework-entry list to include: (a) Blazor component
  lifecycle overrides (`OnInitialized`, `OnAfterRender*`, `Dispose`) and
  markup-referenced handlers in `.razor.cs` partial classes
  (`*Click`-style methods of a `partial class` paired with a `.razor`
  file of the same basename); (b) Django template-tag/filter modules —
  a file containing `register = template.Library()` has all its
  module-level functions treated as string-referenced (alive) or, when
  no direct `@register.*` decorator is visible, `unknown`; (c) JavaScript
  functions declared inside an IIFE/closure that registers DOM/jQuery
  handlers in the same file (Drupal `Drupal.behaviors` pattern) demote
  from R4 to `unknown` when the file attaches any `$(...).on(`/
  `.each(`/event-binding call. These are *signals*, not new extractors:
  (a)/(b) are name/path patterns, (c) is a same-file text probe.
- **A2 (corpus-noise, 10 entries) — path exclusions extended.** Add
  `js/build/`, `/static/admin/js/`, and minified bundles (`*.min.js` and
  any `.js` whose functions cluster on line 1) to the path exclusions.
- **A3 (graph-gap, 49 entries) — NOT rubric changes.** Missing extractor
  signals (Rust `visibility`/trait-impl edges, JS closure-local calls
  edges, C# same-file generic calls edges, Spring Data repository proxy
  modeling) are recorded as extractor/resolver backlog for node 1-2-5's
  frontier list. The rubric keeps its honest posture: when the signal is
  absent the verdict falls to R4, and precision is reported against
  human truth. Downstream consumers of `find_dead_code` v1 must read
  precision per corpus alongside the frontier list.

**Implementation gate for node 1-2-5:** shipping `find_dead_code` without
A1+A2 reproduced a measured **0% precision** on this sample; A1+A2 are
therefore mandatory scope for 1-2-5, A3 is tracked as backlog.

### 2026-10-21 — A1 text-probe clarification (roadmap 1-2-5, Q3)

Clarification only — no rule verdict changes. A1's signals (b) and (c)
require reading the **raw content of an already-indexed file** to answer a
substring-existence question (`register = template.Library()`,
`$(...).on(`, `.razor` sibling presence). This is reconciled with the
Non-goal "No raw-source scanning" as follows:

- The probe is **existence-only**: substring/prefix match, no AST parsing,
  no regex extraction of symbols, no LLM.
- The probe input set is **bounded to paths already present in the `files`
  table** — it never walks the filesystem, never touches unindexed files.
- Results are reported as `evidence.via: 'file-text-probe'` so downstream
  consumers can distinguish graph-derived verdicts from probe-derived
  ones.

With this clarification, A1's signal class is "graph signals + bounded
file-content existence probes", which preserves the Non-goal's original
intent (no full-source rescan, no LLM summarization, deterministic replay
from the index alone).

### 2026-10-21 — signal-based demote rules (roadmap 1-2-5 implementation)

The following rules were added while implementing `find_dead_code` v1.
All are **signal-based** (each requires a concrete graph/content signal,
never a language-wide blanket), preserving the rubric's honest posture.
They are clarifications of R2/R3's existing signal classes, not new
verdicts — hence no v2.

1. **R2 — A1(a) extended: `.razor` class reference.** A C# method whose
   containing class (qualified-name prefix) appears in any indexed
   `.razor` file (`@inherits` / markup component tag) is `alive`.
   eShopOnWeb arbitration showed Blazor helpers referenced from markup
   without a `.razor.cs` sibling (e.g. `ToastComponent` ←
   `Toast.razor @inherits`). Probe: substring of the class short name in
   the union of indexed `.razor` contents.
2. **R2 — A1(b) probe variant.** `= Library(` is accepted alongside
   `template.Library()` (Django template-tag modules use
   `register = Library()`).
3. **R3 — Python dunder names.** `__<lower>+__` (e.g. `__deepcopy__`,
   `__html__`) are interpreter/framework-invoked; R3 callback list
   extended from the fixed set to the dunder pattern.
4. **R3 — C# constructor-shaped method.** A method whose name equals its
   owner class simple name is invoked by DI/EF materialization even when
   the graph sees no call (eShopOnWeb: EF-core/DDD ctors). Demote to
   `unknown` (`via: ctor-reflection`).
5. **R3 — Java interface method.** A method whose owner (via `contains`)
   is an `interface` node is dispatched through the framework-generated
   proxy (Spring Data / JDK proxy). Demote to `unknown`
   (`via: interface-proxy`).
6. **R3 — Python public-API residual.** A module-level Python `function`
   whose name does not start with `_` is public by PEP8 convention
   (`via: pub-residual, note: pep8-public`). Python has no visibility
   column, so the base `pub-residual` rule never fires for it; the same
   "downstream caller outside the indexed repo" argument as R2's
   exported-public-surface applies.
7. **R3 — JS barrel residual.** A `.js`/`.ts` file containing
   `export default` is a module entry; its inner functions are reachable
   through the closure the entry creates (JS closure-local calls edges
   are an A3 graph-gap). Demote inner zero-calls functions to `unknown`
   (`via: js-barrel-graph-gap`).

**Residual frontier (NOT rubric changes, tracked as A3 extractor
backlog):** C# same-file instance call edges (eShop
`FromHttpResponseMessage`/`HideToast`), Python decorator-wrapper call
edges (django `_model_admin_wrapper`), and all Rust extractor signals
(actix-web 30/30 sample). These remain `dead` in v1 output and are
reported as false-dead against human truth — they are the measured
precision cost of the current extractor frontier, not rubric defects.
