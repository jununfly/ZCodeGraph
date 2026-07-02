# Rust-Owned Python Flask Validation

Date: 2026-07-02

## Purpose

Validate Rust-owned Python indexing on a suitably sized real GitHub Python
project after adding Python decorator references.

## Corpus

- Repository: `https://github.com/pallets/flask`
- Checkout: shallow clone at commit `36e4a82`
- Local path: `/private/tmp/zcodegraph-python-flask-validation`
- Corpus size: 217 files total, 83 Python files

Flask was selected because it is a moderate-sized Python project with enough
real framework/decorator usage to validate Python graph behavior without turning
this slice into a large framework sufficiency A/B.

## Commands

```bash
git clone --depth 1 https://github.com/pallets/flask.git /private/tmp/zcodegraph-python-flask-validation
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 node dist/bin/zcodegraph.js init /private/tmp/zcodegraph-python-flask-validation --engine rust-hybrid
CODEGRAPH_ALLOW_UNSAFE_NODE=1 CODEGRAPH_NO_DAEMON=1 CODEGRAPH_NO_RELAUNCH=1 node dist/bin/zcodegraph.js status /private/tmp/zcodegraph-python-flask-validation --json
sqlite3 /private/tmp/zcodegraph-python-flask-validation/.zcodegraph/zcodegraph.db "<validation queries>"
```

## Result

- Index result: 91 files, 2,570 nodes, 4,042 edges in 355 ms.
- Status health: `degraded` but usable.
- Degradation reason: 8 YAML files used TypeScript fallback.
- Rust-owned assignment: `python` -> `rust`.
- Python files indexed: 83.
- Python file errors: 0.
- Python node counts:
  - class: 160
  - file: 83
  - function: 1,018
  - import: 650
  - method: 442
  - module: 83
  - variable: 134
- Edge counts:
  - calls: 373
  - contains: 2,487
  - decorates: 64
  - imports: 959
  - instantiates: 159
- Python `decorates` unresolved refs remaining: 0.

## Decision

This is sufficient real-corpus evidence for the current Rust-owned Python
language-support slice. The run proves that Python files are assigned to the
Rust engine, parse without file-level errors on a real project, and preserve
decorator semantics through final graph edges.

The run does not claim full Python framework sufficiency. Larger Django/DRF or
FastAPI flow A/B validation remains a separate dynamic-dispatch/framework
coverage initiative.

## Closeout Decision Audit

| Roadmap decision | Classification | Durable location |
| --- | --- | --- |
| Use a dedicated roadmap branch and roadmap-sliced development loop | PR only | Branch commits and PR body |
| Scope Python support as practical Rust-owned extraction plus real-corpus evidence, not duplicate language registration | durable doc | This file and `docs/benchmarks/2026-06-24-current-state-decision-pack.md` |
| Use `/Users/bilibili/Documents/workspace/github/jununfly/ZAgenticLoop/docs/designs/roadmap-sliced-development-pattern.md` as the pattern source | discarded process note | Relevant only to this run's process |
| Select `pallets/flask` as the real Python validation corpus | durable doc | Corpus section above |

Process roadmap JSON/Markdown files were deleted after this audit because the
durable evidence now lives in this benchmark note, the current-state decision
pack, the changelog, and the commit history.
