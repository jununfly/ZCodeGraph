---
doc-kind: contract
authority: primary
authority-id: DES-token-baseline-tasks-v2
supersedes: DES-token-baseline-tasks-v1
bounded-question: "What are the frozen task definitions for measuring the Layer-1 token-consumption baseline when the numerator is the zcodegraph_explore payload an agent actually consumes?"
---

# Token-Baseline Tasks v2

Status: active

## What changed from v1

**Numerator definition.** v1 measured the byte size of a fixed `cliCalls`
sequence (`query <symbol>` + optionally `callers` / `callees` / `impact`).
That was a **proxy** for what an agent consumes — but the agent's actual
high-frequency MCP call is `zcodegraph_explore`, which runs a different
pipeline (`explore-planner` + `explore-renderer`) and emits a single
markdown payload.

**v2 replaces the numerator** with the real thing: for each task, we
invoke `zcodegraph explore "<query>"` (CLI twin of `zcodegraph_explore`,
byte-identical to the MCP channel) against the pinned DB, and the byte
length of stdout **is** the numerator. This aligns the baseline with
roadmap node 1-2-3's compression target (the explore answer surface),
so any A/B token-reduction measurement on explore plugs directly into
this contract.

**Denominator, corpora, repetitions, and conservative-annotation policy
are unchanged from v1.** We keep the same nine tasks across the same
three corpora, same 3-repetition median, same `equivalentFiles[]`
annotation. Only the numerator's invocation surface moves.

## Why this change is safe

1. **Same underlying DB.** The explore CLI reads the same
   `.zcodegraph/zcodegraph.db` that v1's `query`/`callers`/`impact` read.
   No re-indexing is required between v1 and v2 runs on the same corpus
   clone.

2. **Same binary.** `zcodegraph explore` is a thin shell over
   `explore-planner.plan` + `explore-renderer.render` — exactly the same
   functions the MCP `zcodegraph_explore` tool calls. Bytes on stdout
   match bytes over MCP by construction (both go through the same
   `render()` return value).

3. **Same honesty policy.** If explore returns "No relevant code found
   for ..." the numerator is the byte length of that message; we do NOT
   pad, retry, or substitute a different query. v1's "honest numerator"
   principle carries over verbatim.

4. **Ratios are not comparable across versions.** v1 ratio and v2 ratio
   measure different invocation surfaces. A v2 ratio is not "better" or
   "worse" than v1; it is a different quantity. Evidence docs must
   record which contract version produced them.

## Migration notes (v1 → v2)

- v1 contract is **frozen**; do not edit `token-baseline-tasks-v1.md`.
- v2 changes `cliCalls: string[][]` → `exploreQueries: string[]`. Each
  task lists ONE OR MORE natural-language queries to feed to
  `zcodegraph explore`. The task's numerator is the **concatenation**
  of all per-query payloads, mirroring how v1 concatenated `cliCalls`.
- Multi-query tasks exist because explore is single-shot per query. A
  trace question ("how does X reach Y") sometimes needs two angles; we
  allow up to 2 queries per task to avoid bloating the numerator with
  redundant shots. Single-query is the norm.
- `zcodegraph explore` accepts `--max-files`; v2 does NOT pass it,
  leaving the default (budget-driven) so we measure what an agent
  actually sees.
- Environment: `CODEGRAPH_ALLOW_UNSAFE_NODE=1`, `CODEGRAPH_NO_DAEMON=1`,
  `CODEGRAPH_NO_RELAUNCH=1` — identical to v1.

## Task-type definitions (unchanged semantics)

The task's *type* no longer determines CLI calls — explore is always
the single entry point. The type labels remain as documentation of
the question's intent:

- **Trace** — a call-path question; the query names the start symbol
  (and optionally the end).
- **Impact** — a signature-change question; the query names the symbol
  whose contract is changing.
- **Locate** — a "where is X implemented" question; the query names the
  concept, not necessarily a symbol.

## Tasks

Each task is identified by `id = <corpus>-<type>`. `repo` is the pinned
GitHub slug; `ref` is resolved at measurement time and recorded in the
evidence doc. All paths are repo-relative POSIX. `exploreQueries[]`
holds 1-2 natural-language queries; `equivalentFiles[]` is unchanged
from v1.

### Corpus: expressjs/express (JavaScript)

Router implementation note: express 5.x moved routing into the external
`router` npm package; this repo's `lib/` contains only the app/view
pipeline. Tasks below target what **is** in the repo.

#### `express-trace`

- **type**: Trace
- **question**: "What is the call path from `app.listen()` to the HTTP
  server actually accepting connections?"
- **exploreQueries**:
  - `"app.listen http server accept"`
- **equivalentFiles**:
  - `lib/express.js` (1636 B) — entry point that constructs `app`,
    re-exports from `lib/application.js`; without it you cannot know
    `listen` lives on the app prototype.
  - `lib/application.js` (13953 B) — owns `app.listen` and the lazy
    `this._router` wiring; the path terminates here.
- **equivalentFilesRationale**: unchanged from v1.

#### `express-impact`

- **type**: Impact
- **question**: "If I change the signature of `res.send()`, what internal
  express code breaks?"
- **exploreQueries**:
  - `"res.send signature change impact"`
- **equivalentFiles**:
  - `lib/response.js` (25089 B) — owns `res.send`; you cannot change a
    signature without reading the definition.
  - `lib/express.js` (1636 B) — binds `res` prototype; you must know
    whether external callers reach `send` through this module.
- **equivalentFilesRationale**: unchanged from v1.

#### `express-locate`

- **type**: Locate
- **question**: "Where is HTTP content-negotiation (`Accept` header
  parsing) implemented?"
- **exploreQueries**:
  - `"Accept header content negotiation"`
- **equivalentFiles**:
  - `lib/request.js` (12283 B) — `req.accepts*` family lives here.
  - `lib/response.js` (25089 B) — `res.format` (the response-side
    negotiation) lives here; the question does not say "request only".
- **equivalentFilesRationale**: unchanged from v1.

### Corpus: pallets/flask (Python)

#### `flask-trace`

- **type**: Trace
- **question**: "What is the call path from `app.run()` to the WSGI
  request actually being dispatched?"
- **exploreQueries**:
  - `"app.run wsgi dispatch"`
- **equivalentFiles**:
  - `src/flask/app.py` (65299 B) — owns `Flask.run`,
    `Flask.wsgi_app`, `Flask.full_dispatch_request`; the entire path
    lives in this one file.
- **equivalentFilesRationale**: unchanged from v1.

#### `flask-impact`

- **type**: Impact
- **question**: "If I change the signature of `Flask.add_url_rule()`,
  what internal flask code breaks?"
- **exploreQueries**:
  - `"Flask.add_url_rule signature change"`
- **equivalentFiles**:
  - `src/flask/app.py` (65299 B) — owns the definition and the
    `Flask.route` decorator that forwards to it.
  - `src/flask/blueprints.py` (4541 B) — `Blueprint.add_url_rule` and
    `Blueprint.route` re-expose the same surface; signature change
    forces blueprint edits.
- **equivalentFilesRationale**: unchanged from v1.

#### `flask-locate`

- **type**: Locate
- **question**: "Where is the `session` object actually implemented
  (read/write of the signed cookie)?"
- **exploreQueries**:
  - `"session signed cookie SecureCookieSession"`
- **equivalentFiles**:
  - `src/flask/sessions.py` (14955 B) — `SecureCookieSession`,
    `SecureCookieSessionInterface` live here.
- **equivalentFilesRationale**: unchanged from v1.

### Corpus: spring-projects/spring-petclinic (Java)

#### `petclinic-trace`

- **type**: Trace
- **question**: "What is the call path from `OwnerController.showOwner()`
  to the database read?"
- **exploreQueries**:
  - `"OwnerController.showOwner findById database"`
- **equivalentFiles**:
  - `src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java`
    (6600 B) — owns `showOwner`.
  - `src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java`
    (2298 B) — the `findById` called by `showOwner`; Spring Data
    generates the SQL from the interface, so the "database read" is
    visible only in the interface signature.
- **equivalentFilesRationale**: unchanged from v1.

#### `petclinic-impact`

- **type**: Impact
- **question**: "If I change the signature of `OwnerRepository.findById()`,
  what internal code breaks?"
- **exploreQueries**:
  - `"OwnerRepository.findById signature change"`
- **equivalentFiles**:
  - `src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java`
    (2298 B) — the definition site.
  - `src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java`
    (6600 B) — calls `findById` in both `showOwner` and
    `processUpdateOwnerForm`.
  - `src/main/java/org/springframework/samples/petclinic/owner/VisitController.java`
    (3789 B) — calls `findById` to load the owner before adding a
    visit.
- **equivalentFilesRationale**: unchanged from v1.

#### `petclinic-locate`

- **type**: Locate
- **question**: "Where is the 'find owner by last name' search
  implemented?"
- **exploreQueries**:
  - `"findByLastName owner search"`
- **equivalentFiles**:
  - `src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java`
    (6600 B) — `processFindForm` HTTP entry point.
  - `src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java`
    (2298 B) — `findByLastName` Spring Data derived query.
- **equivalentFilesRationale**: unchanged from v1.

## Implementation constraints

- **Frozen.** Any change to a task row requires bumping the contract to
  `token-baseline-tasks-v3.md` and writing a migration note in the
  evidence doc.
- **Deterministic.** The script reads only this contract + the pinned
  `.zcodegraph/zcodegraph.db`. No LLM, no network.
- **Single source.** `scripts/measure/token-baseline.mjs` must parse
  the task rows out of this file's fenced `json` block (see below); it
  must NOT hard-code task definitions. The script dispatches on
  `contract.version` — v1 uses `cliCalls`, v2 uses `exploreQueries`.
- **Review surface.** `equivalentFilesRationale` is the human-auditable
  justification; PRs touching `equivalentFiles` without touching the
  rationale are rejected.

## Machine-readable task block

```json
{
  "version": 2,
  "repetitions": 3,
  "aggregate": "median",
  "numeratorCommand": "explore",
  "tasks": [
    {
      "id": "express-trace",
      "repo": "expressjs/express",
      "type": "trace",
      "question": "call path from app.listen to http accept",
      "exploreQueries": ["app.listen http server accept"],
      "equivalentFiles": ["lib/express.js", "lib/application.js"]
    },
    {
      "id": "express-impact",
      "repo": "expressjs/express",
      "type": "impact",
      "question": "signature change of res.send",
      "exploreQueries": ["res.send signature change impact"],
      "equivalentFiles": ["lib/response.js", "lib/express.js"]
    },
    {
      "id": "express-locate",
      "repo": "expressjs/express",
      "type": "locate",
      "question": "content negotiation (Accept header)",
      "exploreQueries": ["Accept header content negotiation"],
      "equivalentFiles": ["lib/request.js", "lib/response.js"]
    },
    {
      "id": "flask-trace",
      "repo": "pallets/flask",
      "type": "trace",
      "question": "call path from app.run to wsgi dispatch",
      "exploreQueries": ["app.run wsgi dispatch"],
      "equivalentFiles": ["src/flask/app.py"]
    },
    {
      "id": "flask-impact",
      "repo": "pallets/flask",
      "type": "impact",
      "question": "signature change of Flask.add_url_rule",
      "exploreQueries": ["Flask.add_url_rule signature change"],
      "equivalentFiles": ["src/flask/app.py", "src/flask/blueprints.py"]
    },
    {
      "id": "flask-locate",
      "repo": "pallets/flask",
      "type": "locate",
      "question": "session signed-cookie implementation",
      "exploreQueries": ["session signed cookie SecureCookieSession"],
      "equivalentFiles": ["src/flask/sessions.py"]
    },
    {
      "id": "petclinic-trace",
      "repo": "spring-projects/spring-petclinic",
      "type": "trace",
      "question": "OwnerController.showOwner to db read",
      "exploreQueries": ["OwnerController.showOwner findById database"],
      "equivalentFiles": [
        "src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java",
        "src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java"
      ]
    },
    {
      "id": "petclinic-impact",
      "repo": "spring-projects/spring-petclinic",
      "type": "impact",
      "question": "signature change of OwnerRepository.findById",
      "exploreQueries": ["OwnerRepository.findById signature change"],
      "equivalentFiles": [
        "src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java",
        "src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java",
        "src/main/java/org/springframework/samples/petclinic/owner/VisitController.java"
      ]
    },
    {
      "id": "petclinic-locate",
      "repo": "spring-projects/spring-petclinic",
      "type": "locate",
      "question": "find owner by last name",
      "exploreQueries": ["findByLastName owner search"],
      "equivalentFiles": [
        "src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java",
        "src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java"
      ]
    }
  ]
}
```

## Exit criteria (from roadmap node 1-2-3 round 2)

1. This contract is the frozen v2 task list; task edits require `v3`.
2. `scripts/measure/token-baseline.mjs` accepts `--contract <path>` and
   dispatches on `version`: v1 → cliCalls path (unchanged), v2 →
   exploreQueries path (new). Both paths share the same
   clone/index/median/report infrastructure.
3. Evidence doc `docs/evidence/YYYY-MM-DD-token-baseline-layer2.md`
   records: per-task v2 ratio, pinned ref sha, DB row counts, and a
   one-paragraph interpretation. Ratios are NOT comparable to v1.
4. A/B elided-markers measurement (exit criteria ② of 1-2-3): run the
   same v2 tasks twice — once with `CODEGRAPH_EXPLORE_ELIDED_MARKERS=1`
   (default) and once with `=0`. Report p95 byte delta across the 9
   tasks. No "~62%" promise is made (exit criteria ③).
