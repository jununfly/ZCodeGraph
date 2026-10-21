---
doc-kind: evidence
authority: supporting
authority-id: EV-token-baseline-layer2-2026-10-21
supports: DES-token-baseline-tasks-v2
roadmap-node: 1-2-3
---

# Token Baseline Layer 2 — 2026-10-21

Status: frozen

This document records the Layer-2 token-consumption baseline for roadmap
node **1-2-3** (P0a token output optimisation). The task set is frozen by
[`docs/contracts/token-baseline-tasks-v2.md`](../contracts/token-baseline-tasks-v2.md);
this document only reports what the harness measured.

**Contract v2 change**: the numerator is now the byte size of
`zcodegraph explore "<query>"` stdout (the CLI twin of MCP
`zcodegraph_explore`), replacing v1's `cliCalls` sequence. Ratios in this
document are **NOT comparable** to the v1 baseline
([`2026-10-20-token-baseline-layer1.md`](./2026-10-20-token-baseline-layer1.md)).

## Method (recap)

```
ratio = explore_payload_bytes / equivalent_read_bytes
```

- **Numerator**: byte size of `zcodegraph explore "<query>"` stdout,
  invoked via `dist/bin/zcodegraph.js explore` against the pinned DB.
  One query per task (per contract v2), 3 repetitions, median reported.
- **Denominator**: byte size of the task's `equivalentFiles[]` —
  unchanged from v1.
- **A/B design**: the same 9 tasks were run TWICE — once with
  `CODEGRAPH_EXPLORE_ELIDED_MARKERS=1` (default, v1.2-3 S1 feature on)
  and once with `=0` (legacy behaviour). Both runs used
  `MEASURE_SKIP_FETCH=1` to skip network validation (corpus already
  pinned on disk).

Full machine-readable output:
- markers ON:  [`2026-10-21-token-baseline-layer2-markers-on.json`](./2026-10-21-token-baseline-layer2-markers-on.json)
- markers OFF: [`2026-10-21-token-baseline-layer2-markers-off.json`](./2026-10-21-token-baseline-layer2-markers-off.json)

## Pinned refs

| Corpus | SHA | Note |
| --- | --- | --- |
| `expressjs/express` | `0dee2c52c7c873498f8ed7d8ee4ddd0a04d3ada8` | unchanged from v1 |
| `pallets/flask` | `a20bcff8dc4e263312cfd74c11e432bfe8c194c1` | **moved** from v1's `d086db85…` |
| `spring-projects/spring-petclinic` | `c513a98b16cb4ee1059e89a23790d8a93a728f1f` | **moved** from v1's `500158f7…` |

Local corpus clones advance over time; this is expected. Contract v2
explicitly disclaims cross-version ratio comparability, so the SHA drift
does not invalidate the measurement — it only means v2 numbers stand on
their own.

## Aggregate (markers ON)

| Metric | Value |
| --- | --- |
| Tasks measured | 9 |
| **Median ratio across tasks** | **0.4098** |
| Min ratio | 0.2585 (`express-trace`) |
| Max ratio | 1.7416 (`petclinic-locate`) |

## Aggregate (markers OFF)

| Metric | Value |
| --- | --- |
| Tasks measured | 9 |
| **Median ratio across tasks** | **0.3921** |
| Min ratio | 0.2585 (`express-trace`) |
| Max ratio | 1.7416 (`petclinic-locate`) |

## Per-task results (markers ON)

| Task | Type | Numerator (B) | Denominator (B) | Ratio |
| --- | --- | --: | --: | --: |
| express-trace | trace | 4 213 | 16 301 | **0.2585** |
| express-impact | impact | 11 415 | 27 856 | **0.4098** |
| express-locate | locate | 10 222 | 38 949 | **0.2624** |
| flask-trace | trace | 19 802 | 62 528 | **0.3167** |
| flask-impact | impact | 19 796 | 67 197 | **0.2946** |
| flask-locate | locate | 12 936 | 15 814 | **0.8180** |
| petclinic-trace | trace | 10 887 | 8 517 | **1.2783** |
| petclinic-impact | impact | 18 067 | 12 028 | **1.5021** |
| petclinic-locate | locate | 14 833 | 8 517 | **1.7416** |

## A/B: elided markers ON vs OFF

Numerator bytes per task; delta = ON − OFF.

| Task | ON (B) | OFF (B) | Delta | Delta % |
| --- | --: | --: | --: | --: |
| express-trace | 4 213 | 4 213 | +0 | +0.00% |
| express-impact | 11 415 | 10 923 | +492 | +4.50% |
| express-locate | 10 222 | 9 726 | +496 | +5.10% |
| flask-trace | 19 802 | 19 729 | +73 | +0.37% |
| flask-impact | 19 796 | 19 666 | +130 | +0.66% |
| flask-locate | 12 936 | 12 037 | +899 | +7.47% |
| petclinic-trace | 10 887 | 10 887 | +0 | +0.00% |
| petclinic-impact | 18 067 | 17 984 | +83 | +0.46% |
| petclinic-locate | 14 833 | 14 833 | +0 | +0.00% |

**Aggregate**:

| Metric | ON | OFF | Delta |
| --- | --: | --: | --: |
| Total bytes (9 tasks) | 122 171 | 119 998 | **+2 173 (+1.81%)** |
| Median numerator | 12 936 | 12 037 | **+899 (+7.47%)** |
| p95 numerator (n=9, =max) | 19 802 | 19 729 | **+73 (+0.37%)** |
| Median ratio | 0.4098 | 0.3921 | +0.0177 |

## Interpretation

1. **v2 numerator is substantially larger than v1 on the same tasks.**
   Median v2 ratio (0.41) is ~2.4× the v1 median (0.17). This is NOT a
   regression — it is the intended effect of switching from the
   `cliCalls` proxy (which under-counted agent consumption on blind-spot
   queries like `query listen` returning example-code hits) to the real
   `zcodegraph_explore` payload agents actually consume. v2 is the
   honest numerator; v1 was the flattering one.

2. **Petclinic tasks exceed ratio 1.0 — explore is byte-heavier than
   direct read on small projects.** All three petclinic tasks return
   explore payloads 1.28×–1.74× the size of reading the equivalent
   files directly. Petclinic is a small project (files 2–7 KB) where
   the explore answer includes not just the target file but also
   blast-radius context, relationships, and 4–6 supporting files. On
   small focused questions ("findById signature change"), an agent with
   ZCodeGraph pays MORE bytes than an agent that just Reads the 3
   equivalent files. This is real signal, not a bug — it tells us
   explore is optimised for mid/large projects where reading
   transitively is expensive, and over-fires on tightly-scoped small
   questions.

3. **Elided markers are NOT a token-reduction mechanism.** The A/B
   shows markers ON costs **+1.81% total bytes / +7.47% median bytes /
   +0.37% p95 bytes**. Six of nine tasks emit at least one marker;
   three tasks trigger no elision and are byte-identical. Markers' value
   is **actionability**, not compression: they turn silent budget
   losses into greppable, re-explorable placeholders so an agent can
   issue a targeted follow-up explore instead of falling back to Read.
   S1 (roadmap 1-2-3 round 1) was explicit about this — markers make
   losses visible; they do not reduce them.

4. **Roadmap exit criteria ② is NOT met.** "固定探针集上统计显著下降"
   requires the numerator to DROP with the feature on; we observe a
   small but consistent RISE. The node cannot close on the current
   implementation. This is a negative result and the right outcome to
   record: the schema-v1 markers deliver the actionability win S1
   designed for, but they do not compress tokens. Closing 1-2-3 would
   require either (a) reframing exit criteria ② to "no regression
   beyond X%" (current +1.81% total / +7.47% median is arguably
   acceptable), or (b) implementing real compression (e.g. per-symbol
   summarisation, smaller default budgets) on top of the markers.

5. **Median-vs-p95 split is diagnostic.** Markers hit the median band
   (+7.47%) far harder than the p95 band (+0.37%). This means elision
   is most common on mid-sized answers — small answers have nothing to
   elide, large answers already saturate the hard ceiling and emit a
   single output marker. If a future round wants real byte savings, the
   median band is where to attack (e.g. adaptive `maxCharsPerFile`
   tightening when markers would otherwise fire).

## Caveats

- **v1/v2 ratios are not comparable.** Different numerator surfaces,
  different SHAs for 2/3 corpora. Any "did we improve?" question must
  be asked within a single contract version.
- **Three corpora, nine tasks.** Generalisation beyond
  express/flask/spring-petclinic is not claimed. Adding more corpora
  is a v3 contract change.
- **No tokenisation.** `1 byte ≠ 1 token`. For English source text the
  ratio is roughly `1 token ≈ 4 bytes`, but we report bytes as-is.
- **A/B measured feature cost, not feature value.** The +1.81% byte
  delta is what markers cost in payload. It does NOT measure the
  saved Read calls that markers enable — that would be a Layer-3
  e2e agent-behaviour measurement, out of scope here.
- **Repetition policy.** 3 runs × median per task; run-to-run variance
  was zero on every task (the CLI is deterministic against a fixed DB).

## Reproduce

```bash
# markers ON (default)
CODEGRAPH_EXPLORE_ELIDED_MARKERS=1 MEASURE_SKIP_FETCH=1 \
  node scripts/measure/token-baseline.mjs \
    --contract docs/contracts/token-baseline-tasks-v2.md \
    --out docs/evidence/2026-10-21-token-baseline-layer2-markers-on.json

# markers OFF (legacy)
CODEGRAPH_EXPLORE_ELIDED_MARKERS=0 MEASURE_SKIP_FETCH=1 \
  node scripts/measure/token-baseline.mjs \
    --contract docs/contracts/token-baseline-tasks-v2.md \
    --out docs/evidence/2026-10-21-token-baseline-layer2-markers-off.json
```

Requires `npm run build` first (script invokes `dist/bin/zcodegraph.js`).
Corpus clones are reused from `C:/workspace/measure-corpus` — pass
`--corpus-root` to redirect. `MEASURE_SKIP_FETCH=1` skips the git-fetch
validation step (safe when the corpus is already pinned on disk).
