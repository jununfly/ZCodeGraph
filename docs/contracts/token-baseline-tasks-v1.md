---
doc-kind: contract
authority: primary
authority-id: DES-token-baseline-tasks-v1
bounded-question: "What are the frozen task definitions for measuring the Layer-1 token-consumption baseline ratio?"
---
# Token-Baseline Tasks v1

Status: active

## Purpose

This contract freezes the **nine task definitions** used by roadmap node
**1-1-4** to measure the Layer-1 token-consumption baseline:

```
ratio = zcodegraph_payload_bytes / equivalent_read_bytes
```

- **Numerator** (`zcodegraph_payload_bytes`): bytes of the payload the
  agent actually receives when it answers the task using ZCodeGraph tool
  calls (searchSymbols + getCallers + getCallees + getImpactRadius +
  collectContext), measured deterministically from the indexed DB.
- **Denominator** (`equivalent_read_bytes`): bytes an agent **without**
  ZCodeGraph would have to `Read` to answer the same task — the
  conservative "required file set" listed in this contract.

The ratio answers the product-level question *"does using ZCodeGraph save
token cost?"* with a deterministic, reproducible proxy: no LLM call, no
vendor lock-in, no non-determinism. A ratio < 1 means ZCodeGraph's tool
payload is smaller than the read-everything baseline.

**Numerator definition (v1, honest):** the numerator is the byte size of
the JSON payload emitted by a fixed sequence of ZCodeGraph CLI commands
(`query`, optionally `callers` / `callees` / `impact` / `files`) executed
against the pinned DB. The script invokes the real `dist/bin/zcodegraph.js`
binary and captures stdout — no SQL shortcut, no simulation. If a command
returns zero rows for a task (e.g. prototype-style JS where ZCodeGraph
extracts few `method` nodes), the numerator records the actual payload
size anyway; we do NOT pad or retry. This makes the numerator an honest
measure of what ZCodeGraph actually delivers on each corpus — including
its blind spots.

## Non-goals

- **Not an e2e LLM cost measurement.** Layer-2 (real Claude/GPT token
  consumption under MCP ablation) is explicitly deferred to a separate
  node after 1-1-5. See the 1-1-4 decide record for rationale
  (non-deterministic, ~$3600/baseline at N=20, vendor-bound, cannot
  decompose `total_cost_usd`).
- **Not a compression target.** We report the measured ratio; we do NOT
  set a goal like "ratio must be < 0.5". Setting a goal would invite
  gaming the annotation.
- **Not a benchmark of ZCodeGraph correctness.** The tasks assume
  ZCodeGraph returns the right symbols; they measure the *size* of the
  payload, not its precision/recall.

## Conservative annotation policy (Q1 = A)

`equivalentFiles[]` lists **only the files an agent cannot avoid reading**
to answer the task. This is the most conservative (least flattering to
ZCodeGraph) annotation:

- **Include** a file if the answer cannot be produced without reading it.
- **Exclude** a file if it is merely "helpful context" (tests, examples,
  docs, changelogs, config, package.json, README).
- **Exclude** files pulled in transitively that the agent would reach
  only via grep-driven exploration — the baseline is *direct read*, not
  *transitive grep*. This makes the denominator a **lower bound**, which
  means the reported ratio is an **upper bound on ZCodeGraph's advantage**.
  We deliberately under-claim.

Every task row carries an `equivalentFilesRationale` explaining **why each
file is on the list**. The rationale is the review surface — any future
PR that touches `equivalentFiles[]` must also touch the rationale, and
reviewers reject rows whose rationale does not justify inclusion.

## Repetition policy (Q2 = A)

Each task is measured **3 times** against the same pinned DB; the
**median** of the three payload sizes is the reported numerator. The DB
is read-only between runs, so variance comes only from incidental
ordering in SQL result serialization. Median-of-3 is cheap and kills
single-run outliers.

## Task type definitions

Task types shape **which CLI commands** the script runs; they do not
change the conservative denominator annotation.

- **Trace** — run `query <symbol>` then `callees <symbol>`. Concatenate
  both stdout payloads; the byte count is the numerator.
- **Impact** — run `query <symbol>` then `callers <symbol>` then
  `impact <symbol>`. Concatenate the three payloads.
- **Locate** — run `query <query>` only.

All commands are invoked with `--json` where supported so the payload is
machine-readable and the byte count is stable. The script does not parse
the payloads; it only measures their size.

## Tasks

Each task is identified by `id = <corpus>-<type>`. `repo` is the pinned
GitHub slug; `ref` is resolved at measurement time and recorded in the
evidence doc. All paths are repo-relative POSIX.

### Corpus: expressjs/express (JavaScript)

Router implementation note: express 5.x moved routing into the external
`router` npm package; this repo's `lib/` contains only the app/view
pipeline. Tasks below target what **is** in the repo.

#### `express-trace`

- **type**: Trace
- **question**: "What is the call path from `app.listen()` to the HTTP
  server actually accepting connections?"
- **symbol**: `listen` in `lib/application.js`
- **numerator tools**: searchSymbols("app.listen") → getCallees(listen) →
  collectContext(listen)
- **equivalentFiles**:
  - `lib/express.js` (1636 B) — entry point that constructs `app`,
    re-exports from `lib/application.js`; without it you cannot know
    `listen` lives on the app prototype.
  - `lib/application.js` (13953 B) — owns `app.listen` and the lazy
    `this._router` wiring; the path terminates here.
- **equivalentFilesRationale**: `listen` is defined in `application.js`
  and bound to the app object created in `express.js`. An agent without
  ZCodeGraph must open both to even find `listen`. `request.js` /
  `response.js` / `view.js` are excluded — they are not on the
  listen→accept path. `utils.js` excluded — only mixin helpers, not on
  the path. Tests/examples excluded per policy.

#### `express-impact`

- **type**: Impact
- **question**: "If I change the signature of `res.send()`, what internal
  express code breaks?"
- **symbol**: `send` in `lib/response.js`
- **numerator tools**: searchSymbols("res.send") → getCallers(send) →
  getImpactRadius(send, depth=2)
- **equivalentFiles**:
  - `lib/response.js` (25089 B) — owns `res.send`; you cannot change a
    signature without reading the definition.
  - `lib/express.js` (1636 B) — binds `res` prototype; you must know
    whether external callers reach `send` through this module.
- **equivalentFilesRationale**: The question asks about *internal*
  breakage, so the blast radius stays inside `lib/`. `response.js` is
  the definition site (required); `express.js` is the prototype-binder
  (required to know exposure). `application.js` / `request.js` /
  `view.js` excluded — they do not call `res.send` internally
  (verified by inspection of 5.x source). Examples excluded — the
  question says *internal*.

#### `express-locate`

- **type**: Locate
- **question**: "Where is HTTP content-negotiation (`Accept` header
  parsing) implemented?"
- **symbol**: top hit for query `accepts` / `content-negotiation`
- **numerator tools**: searchSymbols("accepts") → collectContext(topHit)
- **equivalentFiles**:
  - `lib/request.js` (12283 B) — `req.accepts*` family lives here.
  - `lib/response.js` (25089 B) — `res.format` (the response-side
    negotiation) lives here; the question does not say "request only".
- **equivalentFilesRationale**: An agent asked "where is content
  negotiation" cannot answer by reading only one side — `req.accepts`
  (request) and `res.format` (response) are the two public surfaces.
  Both files are required. `application.js` / `express.js` excluded —
  they delegate, they do not implement.

### Corpus: pallets/flask (Python)

#### `flask-trace`

- **type**: Trace
- **question**: "What is the call path from `app.run()` to the WSGI
  request actually being dispatched?"
- **symbol**: `run` in `src/flask/app.py`
- **numerator tools**: searchSymbols("app.run") → getCallees(run) →
  collectContext(run)
- **equivalentFiles**:
  - `src/flask/app.py` (65299 B) — owns `Flask.run`,
    `Flask.wsgi_app`, `Flask.full_dispatch_request`; the entire path
    lives in this one file.
- **equivalentFilesRationale**: Flask deliberately concentrates the
  request lifecycle in `app.py` (`run` → `wsgi_app` →
  `full_dispatch_request`). `ctx.py` / `globals.py` are *context
  machinery used by* the path but are not on the path itself — the
  question asks about dispatch, not request-context binding.
  Conservative read: one file.

#### `flask-impact`

- **type**: Impact
- **question**: "If I change the signature of `Flask.add_url_rule()`,
  what internal flask code breaks?"
- **symbol**: `add_url_rule` in `src/flask/app.py`
- **numerator tools**: searchSymbols("add_url_rule") →
  getCallers(add_url_rule) → getImpactRadius(add_url_rule, depth=2)
- **equivalentFiles**:
  - `src/flask/app.py` (65299 B) — owns the definition and the
    `Flask.route` decorator that forwards to it.
  - `src/flask/blueprints.py` (4541 B) — `Blueprint.add_url_rule` and
    `Blueprint.route` re-expose the same surface; signature change
    forces blueprint edits.
- **equivalentFilesRationale**: Both files define a public
  `add_url_rule` and a `route` decorator that calls through. Changing
  the Flask-side signature mechanically forces the Blueprint-side
  signature. `views.py` excluded — `View.dispatch_request` does not
  call `add_url_rule` directly (verified). `templating.py` /
  `sessions.py` / `json/` excluded — unrelated subsystem.

#### `flask-locate`

- **type**: Locate
- **question**: "Where is the `session` object actually implemented
  (read/write of the signed cookie)?"
- **symbol**: top hit for query `session` / `SecureCookieSession`
- **numerator tools**: searchSymbols("session") →
  collectContext(topHit)
- **equivalentFiles**:
  - `src/flask/sessions.py` (14955 B) — `SecureCookieSession`,
    `SecureCookieSessionInterface` live here.
- **equivalentFilesRationale**: The question is specifically about the
  signed-cookie implementation, which lives entirely in `sessions.py`.
  `app.py` only *uses* `session_interface`; `globals.py` only re-exports
  a `LocalProxy`. Conservative read: one file.

### Corpus: spring-projects/spring-petclinic (Java)

#### `petclinic-trace`

- **type**: Trace
- **question**: "What is the call path from `OwnerController.showOwner()`
  to the database read?"
- **symbol**: `showOwner` in `OwnerController.java`
- **numerator tools**: searchSymbols("showOwner") →
  getCallees(showOwner) → collectContext(showOwner)
- **equivalentFiles**:
  - `src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java`
    (6600 B) — owns `showOwner`.
  - `src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java`
    (2298 B) — the `findById` called by `showOwner`; Spring Data
    generates the SQL from the interface, so the "database read" is
    visible only in the interface signature.
- **equivalentFilesRationale**: The trace terminates at a Spring Data
  interface — there is no concrete impl to read. Both files are
  required: the controller for the call site, the repository interface
  for the callee. `Owner.java` / `Pet.java` excluded — JPA entities
  with no behavior; not on the call path. Templates excluded.

#### `petclinic-impact`

- **type**: Impact
- **question**: "If I change the signature of `OwnerRepository.findById()`,
  what internal code breaks?"
- **symbol**: `findById` in `OwnerRepository.java`
- **numerator tools**: searchSymbols("findById") →
  getCallers(findById) → getImpactRadius(findById, depth=2)
- **equivalentFiles**:
  - `src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java`
    (2298 B) — the definition site.
  - `src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java`
    (6600 B) — calls `findById` in both `showOwner` and
    `processUpdateOwnerForm`.
  - `src/main/java/org/springframework/samples/petclinic/owner/VisitController.java`
    (3789 B) — calls `findById` to load the owner before adding a
    visit.
- **equivalentFilesRationale**: All three files either define or call
  `findById`; signature change forces edits in all three. `PetController`
  excluded — it loads owners via `OwnerRepository.findById` *in older
  revisions* but in current `main` goes through `PetTypeRepository` /
  form binding; verified by inspection. Conservative: include only
  verified callers.

#### `petclinic-locate`

- **type**: Locate
- **question**: "Where is the 'find owner by last name' search
  implemented?"
- **symbol**: top hit for query `findByLastName`
- **numerator tools**: searchSymbols("findByLastName") →
  collectContext(topHit)
- **equivalentFiles**:
  - `src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java`
    (6600 B) — `processFindForm` HTTP entry point.
  - `src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java`
    (2298 B) — `findByLastName` Spring Data derived query.
- **equivalentFilesRationale**: "Where is X implemented" for a web
  endpoint requires both the HTTP surface (controller) and the data
  surface (repository). `Owner.java` excluded — pure entity. Templates
  excluded — view layer, not implementation.

## Implementation constraints

- **Frozen.** Any change to a task row requires bumping the contract to
  `token-baseline-tasks-v2.md` and writing a migration note in the
  evidence doc.
- **Deterministic.** The script reads only this contract + the pinned
  `.zcodegraph/zcodegraph.db`. No LLM, no network.
- **Single source.** `scripts/measure/token-baseline.mjs` must parse the
  task rows out of this file's fenced `json` block (see below); it must
  NOT hard-code task definitions.
- **Review surface.** `equivalentFilesRationale` is the human-auditable
  justification; PRs touching `equivalentFiles` without touching the
  rationale are rejected.

## Machine-readable task block

```json
{
  "version": 1,
  "repetitions": 3,
  "aggregate": "median",
  "tasks": [
    {
      "id": "express-trace",
      "repo": "expressjs/express",
      "type": "trace",
      "question": "call path from app.listen to http accept",
      "cliCalls": [
        ["query", "listen", "--json"],
        ["callees", "listen", "--json"]
      ],
      "equivalentFiles": ["lib/express.js", "lib/application.js"]
    },
    {
      "id": "express-impact",
      "repo": "expressjs/express",
      "type": "impact",
      "question": "signature change of res.send",
      "cliCalls": [
        ["query", "send", "--json"],
        ["callers", "send", "--json"],
        ["impact", "send", "--json"]
      ],
      "equivalentFiles": ["lib/response.js", "lib/express.js"]
    },
    {
      "id": "express-locate",
      "repo": "expressjs/express",
      "type": "locate",
      "question": "content negotiation (Accept header)",
      "cliCalls": [
        ["query", "accepts", "--json"]
      ],
      "equivalentFiles": ["lib/request.js", "lib/response.js"]
    },
    {
      "id": "flask-trace",
      "repo": "pallets/flask",
      "type": "trace",
      "question": "call path from app.run to wsgi dispatch",
      "cliCalls": [
        ["query", "run", "--json"],
        ["callees", "run", "--json"]
      ],
      "equivalentFiles": ["src/flask/app.py"]
    },
    {
      "id": "flask-impact",
      "repo": "pallets/flask",
      "type": "impact",
      "question": "signature change of Flask.add_url_rule",
      "cliCalls": [
        ["query", "add_url_rule", "--json"],
        ["callers", "add_url_rule", "--json"],
        ["impact", "add_url_rule", "--json"]
      ],
      "equivalentFiles": ["src/flask/app.py", "src/flask/blueprints.py"]
    },
    {
      "id": "flask-locate",
      "repo": "pallets/flask",
      "type": "locate",
      "question": "session signed-cookie implementation",
      "cliCalls": [
        ["query", "session", "--json"]
      ],
      "equivalentFiles": ["src/flask/sessions.py"]
    },
    {
      "id": "petclinic-trace",
      "repo": "spring-projects/spring-petclinic",
      "type": "trace",
      "question": "OwnerController.showOwner to db read",
      "cliCalls": [
        ["query", "showOwner", "--json"],
        ["callees", "showOwner", "--json"]
      ],
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
      "cliCalls": [
        ["query", "findById", "--json"],
        ["callers", "findById", "--json"],
        ["impact", "findById", "--json"]
      ],
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
      "cliCalls": [
        ["query", "findByLastName", "--json"]
      ],
      "equivalentFiles": [
        "src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java",
        "src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java"
      ]
    }
  ]
}
```

## Exit criteria (from roadmap node 1-1-4)

1. This contract is the frozen task list; task edits require `v2`.
2. `scripts/measure/token-baseline.mjs` reads tasks from the JSON block
   above, clones/indexes the three repos at a pinned ref, runs each task
   3 times against the same DB, and emits the median ratio per task.
3. Evidence doc `docs/evidence/2026-10-20-token-baseline-layer1.md`
   records: per-task ratio, pinned ref sha, DB row counts, and a
   one-paragraph interpretation. No compression target is set.
4. Layer-2 (e2e LLM cost) is tracked as a separate node, not here.
