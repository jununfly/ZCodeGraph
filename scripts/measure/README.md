# scripts/measure — Real-corpus measurement harness

Scope: P2 measurement-infrastructure scripts (structured-measurement milestone **1-1-3**).

Three standalone scripts that turn the manual real-corpus gate workflow
(clone → index → probe → tally → document) into a repeatable CLI. Each
script prints a structured JSON report on stdout and exits 0 on success,
non-zero on any clone / index / probe failure.

The scripts only produce JSON. Routine reports go to `.tmp/measure/`.
Only an explicitly promoted input consumed by tests, scripts, or CI belongs
in `docs/baselines/` and must be registered in `docs/README.md`.

## Architecture regression red lines (1-2-8)

Three additional scripts form the 1-2-8 red-line + capability-probe loop:

- `perf-baseline.mjs` — measures index wall-time (N cold re-indexes,
  median) and explore latency (frozen queries, median) for one corpus.
  Produces the versioned CI input `docs/baselines/architecture-regression-v1.json`.
  Contract: `docs/contracts/architecture-regression-baseline-v1.md`.
- `perf-regression-check.mjs` — re-measures the baseline corpus and fails
  (exit 1) when index wall-time regresses > 15% or explore latency > 20%
  against the committed baseline. CI job `architecture-red-lines` runs it.
- `capability-probes.mjs` — runs one minimal real check per capability
  domain (extraction / resolution / search / context / mcp-tools /
  dead-code) against an indexed corpus and emits `capabilities.json`.
  `zcodegraph doctor capabilities.json [--upstream-check]` consumes the
  report and summarizes domain health; `--upstream-check` additionally
  verifies offline upstream artifacts (wasm grammars + rust core binary).

```bash
# Re-baseline (requires roadmap decision on 1-2-8 + registered input update)
node scripts/measure/perf-baseline.mjs spring-projects/spring-petclinic \
  --out docs/baselines/architecture-regression-v1.json

# Red-line check (what CI runs)
node scripts/measure/perf-regression-check.mjs \
  --baseline docs/baselines/architecture-regression-v1.json

# Capability probes against an already-indexed dir (skip clone/index)
CAPABILITY_PROBE_DIR=/path/to/indexed/repo \
  node scripts/measure/capability-probes.mjs --out .tmp/measure/capabilities.json
node dist/bin/zcodegraph.js doctor .tmp/measure/capabilities.json --upstream-check
```


## Common CLI

```bash
node scripts/measure/<metric>.mjs <github-url> [options]
```

Positional:
- `<github-url>` — `owner/name` or `https://github.com/owner/name`

Options:
- `--ref <sha>` — pin a specific commit; defaults to `origin/HEAD`
- `--sparse <path>` — sparse-checkout cone (repeatable). Defaults to full tree.
- `--out <path>` — also write the JSON report to this file
- `--corpus-root <dir>` — parent directory for clones (default `C:/workspace/measure-corpus`)
- `--no-keep` — reserved (corpus is kept by default; future flag)
- `--quiet` — suppress progress on stderr

## Metrics

### dead-code.mjs

Measures the 1-1-6 D1 formula on a real repo: function/method nodes with
zero incoming AND outgoing `calls` edges, as a percentage of all
function/method nodes.

```bash
node scripts/measure/dead-code.mjs expressjs/express --sparse lib --sparse examples
```

`value` payload:
- `deadPct` — dead code percentage (0–100)
- `deadFunctions` — absolute count
- `totalFunctions` — denominator

### complexity.mjs

Measures coupling + long-function distribution (1-1-6 D4 + D5 + percentiles).

`value` payload:
- `avgCoupling` — non-`contains` edges / files
- `longFnPct` — % of functions with `end_line - start_line >= 100`
- `longFns` — absolute count of long functions
- `godFiles` — files with `node_count >= 100`
- `fnLines: { p50, p95, max }` — function length distribution
- `totalFunctions` — denominator

### setup.mjs

Measures first-time setup latency (clone + index wall-clock).

`value` payload:
- `cloneMs` — clone wall-clock (0 when reusing a cached clone)
- `indexMs` — `zcodegraph index` wall-clock
- `totalMs` — end-to-end wall-clock
- `filesIndexed` / `nodesTotal` / `edgesTotal` — sanity counters
- `reusedClone` — whether the clone was cached (pass `--corpus-root` to a
  fresh directory for cold measurement)

## Report envelope

All three scripts emit the same envelope:

```json
{
  "metric": "dead-code|complexity|setup",
  "repo": "owner/name",
  "ref": "<resolved sha>",
  "measuredAt": "<ISO 8601>",
  "value": { /* metric-specific payload */ },
  "evidence": {
    "corpusDir": "<absolute path>",
    "dbPath": "<.zcodegraph/zcodegraph.db>",
    "filesIndexed": 50,
    "nodesTotal": 561,
    "edgesTotal": 916,
    "cloneDurationMs": 1234,
    "indexDurationMs": 5678,
    "totalDurationMs": 7000,
    "reusedClone": false
  }
}
```

## Notes

- **Read-only on the corpus DB.** The probe opens `.zcodegraph/zcodegraph.db`
  with `node:sqlite` in `readOnly` mode.
- **No new npm deps.** Everything runs on `node:sqlite` +
  `node:child_process` + `node:fs` (Node 22+).
- **Corpus caching.** Clones live under `--corpus-root` and are reused on
  subsequent runs of the same repo; delete the directory or pick a new
  `--corpus-root` to force a cold run.
- **CLI must be built.** The scripts call `dist/bin/zcodegraph.js`; run
  `npm run build` once before measuring.

## Example — express (matches 1-6-6-4 corpus)

```bash
node scripts/measure/dead-code.mjs expressjs/express \
  --ref a419aa7350389a275ab45fde2e849ed1f02449ef \
  --sparse lib --sparse examples \
  --out .tmp/measure/express-dead-code.json
```
