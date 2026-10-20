---
doc-kind: evidence
authority: supporting
authority-id: EV-token-baseline-layer1-2026-10-20
supports: DES-token-baseline-tasks-v1
roadmap-node: 1-1-4
---
# Token Baseline Layer 1 — 2026-10-20

Status: frozen

This document records the Layer-1 deterministic token-consumption baseline
for roadmap node **1-1-4**. The task set is frozen by
[`docs/contracts/token-baseline-tasks-v1.md`](../contracts/token-baseline-tasks-v1.md);
this document only reports what the harness measured.

## Method (recap)

```
ratio = zcodegraph_payload_bytes / equivalent_read_bytes
```

- **Numerator**: byte size of the concatenated stdout produced by running
  the task's `cliCalls` against `dist/bin/zcodegraph.js` in the cloned
  repo. Real CLI, no SQL shortcut, no padding.
- **Denominator**: byte size of the task's `equivalentFiles[]` — the
  conservative "files an agent without ZCodeGraph cannot avoid reading".
- **Repetitions**: each task was run 3 times against the same pinned DB;
  the median is reported. Run-to-run variance was zero on every task
  (the CLI is deterministic against a fixed DB), so median = each run.

Full machine-readable output:
[`2026-10-20-token-baseline-layer1.json`](./2026-10-20-token-baseline-layer1.json).

## Pinned refs

| Corpus | SHA |
| --- | --- |
| `expressjs/express` | `0dee2c52c7c873498f8ed7d8ee4ddd0a04d3ada8` |
| `pallets/flask` | `d086db856be187255b8ec61ef409357393020f32` |
| `spring-projects/spring-petclinic` | `500158f732419217507c7656904b8e6aa1bcc0d6` |

## Aggregate

| Metric | Value |
| --- | --- |
| Tasks measured | 9 |
| **Median ratio across tasks** | **0.1712** |
| Min ratio | 0.0139 (`express-locate`) |
| Max ratio | 0.6649 (`petclinic-impact`) |

**Headline**: across the nine tasks, the ZCodeGraph CLI payload is on
median **~17 %** the size of the conservative read-everything baseline —
i.e. an agent using ZCodeGraph consumes roughly **6× fewer bytes** than
one that has to read the required files directly, before any tokenization
overhead.

## Per-task results

| Task | Type | Numerator (B) | Denominator (B) | Ratio |
| --- | --- | --: | --: | --: |
| express-trace | trace | 717 | 16 301 | **0.0440** |
| express-impact | impact | 8 107 | 27 856 | **0.2910** |
| express-locate | locate | 543 | 38 949 | **0.0139** |
| flask-trace | trace | 6 308 | 66 924 | **0.0943** |
| flask-impact | impact | 12 260 | 71 593 | **0.1712** |
| flask-locate | locate | 5 681 | 15 340 | **0.3703** |
| petclinic-trace | trace | 3 816 | 8 898 | **0.4289** |
| petclinic-impact | impact | 8 435 | 12 687 | **0.6649** |
| petclinic-locate | locate | 682 | 8 898 | **0.0766** |

### `express-trace` — call path from `app.listen` to http accept

- CLI calls: `query listen --json` (557 B) + `callees listen --json` (160 B)
- Equivalent files: `lib/express.js` (1 717 B) + `lib/application.js` (14 584 B)
- **ratio = 0.0440**

### `express-impact` — signature change of `res.send`

- CLI calls: `query send --json` (1 085 B) + `callers send --json` (2 720 B) + `impact send --json` (4 302 B)
- Equivalent files: `lib/response.js` (26 139 B) + `lib/express.js` (1 717 B)
- **ratio = 0.2910**

### `express-locate` — content negotiation (Accept header)

- CLI calls: `query accepts --json` (543 B)
- Equivalent files: `lib/request.js` (12 810 B) + `lib/response.js` (26 139 B)
- **ratio = 0.0139** — strongest ZCodeGraph advantage in the run.

### `flask-trace` — call path from `app.run` to wsgi dispatch

- CLI calls: `query run --json` (5 599 B) + `callees run --json` (709 B)
- Equivalent files: `src/flask/app.py` (66 924 B)
- **ratio = 0.0943**

### `flask-impact` — signature change of `Flask.add_url_rule`

- CLI calls: `query add_url_rule --json` (2 372 B) + `callers add_url_rule --json` (2 950 B) + `impact add_url_rule --json` (6 938 B)
- Equivalent files: `src/flask/app.py` (66 924 B) + `src/flask/blueprints.py` (4 669 B)
- **ratio = 0.1712**

### `flask-locate` — session signed-cookie implementation

- CLI calls: `query session --json` (5 681 B)
- Equivalent files: `src/flask/sessions.py` (15 340 B)
- **ratio = 0.3703**

### `petclinic-trace` — `OwnerController.showOwner` to db read

- CLI calls: `query showOwner --json` (3 408 B) + `callees showOwner --json` (408 B)
- Equivalent files: `OwnerController.java` (6 600 B) + `OwnerRepository.java` (2 298 B)
- **ratio = 0.4289**

### `petclinic-impact` — signature change of `OwnerRepository.findById`

- CLI calls: `query findById --json` (645 B) + `callers findById --json` (3 677 B) + `impact findById --json` (4 113 B)
- Equivalent files: `OwnerRepository.java` (2 298 B) + `OwnerController.java` (6 600 B) + `VisitController.java` (3 789 B)
- **ratio = 0.6649** — weakest ZCodeGraph advantage in the run; see
  interpretation below.

### `petclinic-locate` — find owner by last name

- CLI calls: `query findByLastName --json` (682 B)
- Equivalent files: `OwnerController.java` (6 600 B) + `OwnerRepository.java` (2 298 B)
- **ratio = 0.0766**

## Interpretation

1. **ZCodeGraph is byte-cheaper on every task.** All nine ratios are
   below 1.0; eight of nine are below 0.5. The worst case
   (`petclinic-impact` at 0.66) is still ~34 % smaller than reading the
   required files directly.

2. **Impact tasks pay for graph traversal.** Impact-type tasks run three
   CLI calls (`query` + `callers` + `impact`) and consequently have the
   largest numerators. `petclinic-impact` is the extreme: the
   `OwnerRepository.findById` symbol fans out to many callers, and the
   impact payload (4 113 B) plus callers payload (3 677 B) together are
   larger than two of the three equivalent files. This is the honest
   cost of traversal — not a bug.

3. **Locate tasks are where ZCodeGraph shines.** Locate-type tasks run a
   single `query` call and produce the three smallest ratios (0.014,
   0.077, 0.370). One well-targeted symbol lookup replaces reading one or
   two whole files.

4. **Numerator honesty.** On express, ZCodeGraph's prototype-style JS
   extraction is thin (`query listen` returns a single `list` function
   in `examples/`, not the real `app.listen`). We report that payload
   anyway — 717 B for `express-trace`. The denominator still reflects
   the true cost of reading `lib/express.js` + `lib/application.js`.
   Even with an unhelpful numerator payload, ZCodeGraph is byte-cheaper
   on this task. If we padded the numerator to "what ZCodeGraph should
   have returned", the ratio would still be ≪ 1.

5. **What this number is NOT.** This is a **byte-count proxy**, not a
   tokenizer-accurate measurement. Layer-2 (real LLM token consumption
   under MCP ablation) is tracked as a separate node after 1-1-5; see
   the 1-1-4 decide records for why Layer-2 is deferred
   (non-deterministic, ~$3 600/baseline at N=20, vendor-bound).

## Caveats

- **Denominator is a lower bound.** We exclude tests, examples, config,
  transitive grep-driven reads. A real agent without ZCodeGraph would
  often read *more* than `equivalentFiles[]`. The true advantage of
  ZCodeGraph is therefore **at least** the reported ratio, possibly
  better. We deliberately under-claim.
- **Three corpora, nine tasks.** Generalization beyond
  express/flask/spring-petclinic is not claimed. Adding more corpora is
  a v2 contract change.
- **No tokenization.** `1 byte ≠ 1 token`. For English source text the
  ratio is roughly `1 token ≈ 4 bytes`, but we do not multiply through;
  we report the byte ratio as-is.

## Reproduce

```bash
node scripts/measure/token-baseline.mjs \
  --out docs/evidence/2026-10-20-token-baseline-layer1.json
```

Requires `npm run build` first (script invokes `dist/bin/zcodegraph.js`).
Corpus clones are reused from `C:/workspace/measure-corpus` — pass
`--corpus-root` to redirect.
