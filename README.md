<div align="center">

# ZCodeGraph

<sub>maintained by jununfly · based on upstream CodeGraph by Colby McHenry</sub>

### Supercharge Claude Code, Cursor, Codex, OpenCode, Hermes Agent, Gemini, Antigravity, and Kiro with Semantic Code Intelligence

**Rust-hybrid indexing · deterministic code evidence · 100% local**

</div>

## Get Started

### 1. Install the CLI

**No Node.js required** — one command grabs the right build for your OS:

```bash
# macOS / Linux
npm install -g @jununfly/zcodegraph

# Windows (PowerShell)
npm install -g @jununfly/zcodegraph
```

Already have Node? Use npm instead (works on any version):

```bash
npm i -g @jununfly/zcodegraph
```

<sub>ZCodeGraph bundles its own runtime — nothing to compile, no native build, works the same everywhere. The installer puts `zcodegraph` on your PATH but **doesn't change your current shell** — open a new terminal before the next step so the command resolves.</sub>

<sub>**Upgrade any time** with `zcodegraph upgrade` — it detects how you installed (bundle, npm, or npx) and updates in place. Add `--check` to see if an update is available, or `zcodegraph upgrade <version>` to pin one.</sub>

### 2. Wire up your agent(s)

In a **new terminal**, run the installer to connect ZCodeGraph to the agents you use:

```bash
zcodegraph install
```

<sub>Detects and auto-configures Claude Code, Cursor, Codex CLI, opencode, Hermes Agent, Gemini CLI, Antigravity IDE, and Kiro — wiring the ZCodeGraph MCP server into each. **This is the step that connects ZCodeGraph to your agent;** installing the CLI in step 1 does not do it on its own. (Shortcut: `npx @jununfly/zcodegraph` downloads and runs this in one go.)</sub>

### 3. Initialize each project

```bash
cd your-project
zcodegraph init
zcodegraph status
```

<sub>Builds the local `.zcodegraph/` knowledge graph for this project. ZCodeGraph uses its fastest supported local indexing path automatically, with per-file fallback when needed, so you don't have to choose an engine during setup.</sub>

`zcodegraph status` is the trust check for the current graph. It reports one
shared health state across the CLI: `healthy`, `degraded`, `stale`, `failed`,
`unavailable`, or `corrupted`, plus the exact next command when action is needed.
If indexing reports fallback, degraded status, or a failure, create a local
diagnostic bundle before opening an issue:

```bash
zcodegraph doctor --engine rust-hybrid --bundle --last-run
```

If that command is not found, or if `--engine`, `--bundle`, or `--last-run`
are reported as unknown, first confirm that your shell is running the ZCodeGraph
CLI you just installed:

```bash
command -v zcodegraph        # macOS / Linux
where.exe zcodegraph         # Windows PowerShell
zcodegraph --version
zcodegraph doctor --help
```

The expected 0.10.x CLI lists `doctor [options] [path]` in `zcodegraph --help`
and lists `--engine`, `--bundle`, `--last-run`, and `--last-failure` in
`zcodegraph doctor --help`. If your shell shows a different command, open a new
terminal or reinstall/upgrade ZCodeGraph so your PATH points at the current
`zcodegraph` binary.

After `zcodegraph install` and `zcodegraph init`, restart your agent and ask
normal code questions. The MCP server exposes the graph automatically; you do
not need to paste code or teach the agent a new workflow.

### Uninstall

Changed your mind? One command removes ZCodeGraph from every agent it configured:

```bash
zcodegraph uninstall
```

<sub>Reverses the installer — strips ZCodeGraph's MCP server config, instructions, and permissions from each configured agent. Your project indexes (`.zcodegraph/`) are left untouched; remove those per-project with `zcodegraph uninit`. Use `--target` to remove from specific agents, or `--yes` to run non-interactively.</sub>

---

## Why ZCodeGraph?

When Claude Code explores a codebase, it spawns **Explore agents** that scan files with grep, glob, and Read — consuming tokens on every tool call.

**ZCodeGraph gives those agents a pre-indexed knowledge graph** — symbol relationships, call graphs, and code structure. Agents query the graph instantly instead of scanning files.

### 0.10.0 current-state metrics

The 0.10.0 release snapshot measures the current default `rust-hybrid` path on
the main user-facing corpora. This is release evidence, not a new stochastic
agent A/B benchmark: indexing numbers come from local profile runs, and
sufficiency checks call `zcodegraph_explore` directly to verify that the
expected code evidence appears in the answer.

| Corpus | Scope | Wall | Files | Nodes | Edges | Fallback |
|---|---|---:|---:|---:|---:|---|
| ZCodeGraph repo | TS/JS + Rust/YAML | 7.73s | 354 | 16,978 | 40,207 | degraded; 5 files |
| Zustand | TypeScript/JavaScript | 656ms | 63 | 1,435 | 2,845 | degraded; 14 files |
| Gin examples | Go/Gin | 326ms | 62 | 565 | 762 | degraded; 5 files |
| Excalidraw | TypeScript/React | 13.0s | 652 | 20,947 | 53,867 | degraded; 14 files |
| VS Code sparse checkout | TypeScript/JavaScript | 518.4s | 11,951 | 582,781 | 1,657,053 | degraded; 214 files |

Deterministic sufficiency probes passed on the same release snapshot:

| Corpus | Query target | Required evidence found |
|---|---|---|
| Zustand | store update evidence | `createStore`, `setState` |
| Gin examples | `POST /upload` route evidence | `POST /upload`, `uploadHandler` |
| Excalidraw | element update -> canvas repaint evidence | `mutateElement`, `triggerUpdate`, `triggerRender`, `StaticCanvas`, `renderStaticScene` |
| VS Code sparse checkout | workbench startup evidence | `createWorkbench`, `Workbench`, `lifecycleService` |

Targeted one-run agent A/B smoke on the same release corpora:

| Corpus | Time | Cost | Tool calls | Read/Grep/Bash fallback |
|---|---:|---:|---:|---:|
| Zustand | 35s -> 34s | $0.707 -> $0.742 | 4 -> 3 | 1 -> 3 |
| Gin examples | 16s -> 44s | $0.303 -> $0.538 | 1 -> 15 | 0 -> 14 |
| Excalidraw | 45s -> 224s | $1.027 -> $1.521 | 3 -> 55 | 0 -> 54 |
| VS Code sparse checkout | 119s -> 98s | $1.517 -> $0.555 | 9 -> 18 | 2 -> 17 |

Across these four one-run smoke cells, ZCodeGraph used **51% fewer tool calls**
and **89% fewer Read/Grep/Bash fallback calls**. Cost and wall time are intentionally
not claimed as broad savings here: VS Code sparse was fewer-tool but slower and
costlier, and this smoke is not the historical 7-repo median-of-4 benchmark.

Notes:

- `degraded` means the index completed with hybrid fallback or Rust-owned parse
  gaps recorded in status/doctor metadata. It is not the same as failed.
- RSS was unavailable in this local command wrapper run, and the artifact
  records the exact unavailable reason for each corpus.
- VS Code is a sparse checkout, not the full repository.
- The local source-path commands ran under Node 26 with
  `CODEGRAPH_ALLOW_UNSAFE_NODE=1`; release users should use the bundled runtime
  or a supported embedding runtime.

Full evidence: `docs/benchmarks/2026-06-26-zcodegraph-0-10-0-current-state.md`
and `docs/benchmarks/2026-06-26-zcodegraph-0-10-0-targeted-agent-ab.md`.

<details>
<summary><strong>Historical benchmark context</strong></summary>

Previous agent A/B and coverage measurements remain useful for understanding
how ZCodeGraph reduces file-scanning behavior, but they are not the 0.10.0
release current-state source of truth. See
`docs/benchmarks/call-sequence-analysis.md`,
`docs/benchmarks/baseline-agent-sufficiency-v1.md`, and
`docs/designs/dynamic-dispatch-coverage-playbook.md` for the historical
methodology and mechanism notes.

</details>

---

## Key Features

| | |
|---|---|
| **Smart Context Building** | One tool call returns entry points, related symbols, and code snippets — no expensive exploration agents |
| **Full-Text Search** | Find code by name instantly across your entire codebase, powered by FTS5 |
| **Impact Analysis** | Trace callers, callees, and the full impact radius of any symbol before making changes |
| **Always Fresh** | File watcher uses native OS events (FSEvents/inotify/ReadDirectoryChangesW) with debounced auto-sync — the graph stays current as you code, zero config |
| **20+ Languages** | TypeScript, JavaScript, Python, Go, Rust, Java, C#, PHP, Ruby, C, C++, Objective-C, Swift, Kotlin, Dart, Lua, Luau, Svelte, Liquid, Pascal/Delphi |
| **Framework-aware Routes** | Recognizes web-framework routing files and links URL patterns to their handlers across 14 frameworks |
| **Mixed iOS / React Native / Expo** | Closes cross-language flows that static parsing misses: Swift ↔ ObjC bridging, React Native legacy bridge + TurboModules + Fabric view components, native → JS event emitters, Expo Modules |
| **100% Local** | No data leaves your machine. No API keys. No external services. SQLite database only |

<details>
<summary><strong>How auto-syncing works — and why you don't need to run <code>zcodegraph sync</code> manually</strong></summary>

When your agent (Claude Code, Cursor, Codex, opencode) launches `zcodegraph serve --mcp`, three layers keep the index in step with your code — and make sure the agent never gets a silent wrong answer in the brief window between an edit and the next sync:

1. **File watcher with debounced auto-sync.** A native FSEvents / inotify / ReadDirectoryChangesW watcher captures every source-file create / modify / delete and triggers a re-index after a debounce window (default `2000ms`, tunable via `CODEGRAPH_WATCH_DEBOUNCE_MS`, clamped to `[100ms, 60s]`). Bursts of edits collapse into a single sync.

2. **Per-file staleness banner.** During the brief debounce window, MCP tool responses that would reference a still-pending file prepend a `⚠️` banner naming it and telling the agent to `Read` it directly. Pending files NOT referenced by the response surface as a small footer instead. Either way, the agent gets an explicit signal — validated with Claude Code, where the agent literally says "Reading the file directly for the live content" before opening it.

3. **Connect-time catch-up.** When the MCP server (re)connects, codegraph runs a fast `(size, mtime)` + content-hash reconciliation against the working tree before answering the first query — so edits made while no MCP server was running (a `git pull` from the terminal, edits from another editor, a previous agent session that exited) get absorbed on the next session's first tool call.

```
agent writes src/Widget.ts
  → watcher fires (<100ms)
  → debounce (default 2s)
  → sync; Widget.ts is in the index
  → next agent query sees it
```

**Verify any time** with `zcodegraph_status` (via MCP) or `zcodegraph status` (CLI). If anything is pending, you'll see a `### Pending sync:` section naming the files and their edit age.

The handful of cases where manual `zcodegraph sync` makes sense: the watcher is disabled (sandboxed environments, or `CODEGRAPH_NO_DAEMON=1`), or you're scripting against the index outside an agent session and want a pre-flight sync at the start of your script.

→ Full deep-dive in [Guides → Indexing a Project](https://jununfly.github.io/ZCodeGraph/guides/indexing/#stay-fresh-automatically).

</details>

---

## Framework-aware Routes

CodeGraph detects web-framework routing files and emits `route` nodes linked by `references` edges to their handler classes or functions. Querying callers of a view/controller now surfaces the URL pattern that binds it.

| Framework | Shapes recognized |
|---|---|
| **Django** | `path()`, `re_path()`, `url()`, `include()` in `urls.py` (CBV `.as_view()`, dotted paths) |
| **Flask** | `@app.route('/path', methods=[...])`, blueprint routes |
| **FastAPI** | `@app.get(...)`, `@router.post(...)`, all standard methods |
| **Express** | `app.get(...)`, `router.post(...)` with middleware chains |
| **NestJS** | `@Controller` + `@Get/@Post/...`, GraphQL `@Resolver` + `@Query/@Mutation`, `@MessagePattern`/`@EventPattern`, `@SubscribeMessage` |
| **Laravel** | `Route::get()`, `Route::resource()`, `Controller@action`, tuple syntax |
| **Drupal** | `*.routing.yml` routes (`_controller`, `_form`, entity handlers); `hook_*` implementations in `.module`/`.theme`/`.install`/`.inc` |
| **Rails** | `get '/x', to: 'users#index'`, hash-rocket `=>` syntax |
| **Spring** | `@GetMapping`, `@PostMapping`, `@RequestMapping` on methods |
| **Gin / chi / gorilla / mux** | `r.GET(...)`, `router.HandleFunc(...)` |
| **Axum / actix / Rocket** | `.route("/x", get(handler))` |
| **ASP.NET** | `[HttpGet("/x")]` attributes on action methods |
| **Vapor** | `app.get("x", use: handler)` |
| **React Router** / **SvelteKit** | Route component nodes |

---

## Mixed iOS / React Native / Expo bridging

Real iOS and React Native codebases live across multiple languages — a Swift caller invokes an Objective-C selector that's been auto-bridged, a JS file calls into a native module via the React Native bridge, a JSX component delegates to a native view manager. Static tree-sitter extraction stops at each language boundary. CodeGraph bridges them so `trace`, `callers`, `callees`, and `impact` connect end-to-end across the gap.

| Boundary | JS / Swift side | Native side | How |
|---|---|---|---|
| **Swift → ObjC** | Swift `obj.foo(bar:)` | ObjC selector `-fooWithBar:` | `@objc` auto-bridging rules (including init/property/protocol forms) + Cocoa preposition prefixes (`With`/`For`/`By`/`In`/`On`/`At`/…) |
| **ObjC → Swift** | ObjC `[obj fooWithBar:]` | Swift `@objc func foo(bar:)` | Reverse-bridge name candidates; verifies `@objc` exposure from source |
| **React Native legacy bridge** | JS `NativeModules.X.fn(...)` | ObjC `RCT_EXPORT_METHOD` / `RCT_REMAP_METHOD` · Java/Kotlin `@ReactMethod` | Parses macro/annotation declarations to build a JS-name → native-method map |
| **React Native TurboModules** | JS `import M from './NativeM'; M.fn(...)` | Native impl matching the Codegen spec | Treats the `Native<X>.ts` spec interface as ground truth |
| **RN native → JS events** | JS `new NativeEventEmitter(...).addListener('e', cb)` | ObjC `[self sendEventWithName:@"e" body:...]` · Swift `sendEvent(withName: "e", ...)` · Java/Kotlin `.emit("e", ...)` | Synthesized cross-language event channel keyed by literal event name |
| **Expo Modules** | JS `requireNativeModule('X').fn(...)` | Swift / Kotlin `Module { Name("X"); AsyncFunction("fn") { ... } }` | Parses the Expo DSL literals; synthetic method nodes resolve via existing name-match |
| **Fabric view components** | JSX `<MyView prop={v}/>` | TS Codegen spec + native impl class | Spec → `component` node; convention-based name+suffix lookup (`View`/`ComponentView`/`Manager`/`ViewManager`) bridges to native |
| **Legacy Paper view managers** | JSX `<MyView prop={v}/>` | ObjC `RCT_EXPORT_VIEW_PROPERTY` · Java/Kotlin `@ReactProp` | Same as Fabric — Paper-era declarations also produce `component` + `property` nodes |

**Validated on real codebases** (small + medium + large for each bridge):

| Bridge | Small | Medium | Large |
|---|---|---|---|
| Swift ↔ ObjC | [Charts](https://github.com/danielgindi/Charts) | [realm-swift](https://github.com/realm/realm-swift) | [Wikipedia-iOS](https://github.com/wikimedia/wikipedia-ios) |
| RN legacy bridge | [AsyncStorage](https://github.com/react-native-async-storage/async-storage) | [react-native-svg](https://github.com/software-mansion/react-native-svg) | [react-native-firebase](https://github.com/invertase/react-native-firebase) |
| RN native → JS events | [RNGeolocation](https://github.com/Agontuk/react-native-geolocation-service) | — | react-native-firebase |
| Expo Modules | expo-haptics | expo-camera | expo SDK sweep (7 packages) |
| Fabric / Paper views | [react-native-segmented-control](https://github.com/react-native-segmented-control/segmented-control) | [react-native-screens](https://github.com/software-mansion/react-native-screens) | [react-native-skia](https://github.com/Shopify/react-native-skia) |

Each bridge emits edges tagged `provenance:'heuristic'` with `metadata.synthesizedBy:` set to a stable channel name (e.g. `swift-objc-bridge`, `rn-event-channel`, `fabric-native-impl`, `expo-module-extract`), so the agent can tell at a glance how a hop got into the graph.

---

## Quick Start

### 1. Run the Installer

```bash
npx @jununfly/zcodegraph
```

The installer will:
- Ask which agent(s) to configure — auto-detects installed ones from: **Claude Code**, **Cursor**, **Codex CLI**, **opencode**, **Hermes Agent**, **Gemini CLI**, **Antigravity IDE**, **Kiro**
- Prompt to install `zcodegraph` on your PATH (so agents can launch the MCP server)
- Ask whether configs apply to all your projects or just this one
- Write each chosen agent's MCP server config (the ZCodeGraph usage guide is delivered by the MCP server itself, so no instructions file is added to `CLAUDE.md` / `AGENTS.md` / etc.)
- Set up auto-allow permissions when Claude Code is one of the targets
- Initialize your current project (local installs only)

**Non-interactive (scripting / CI):**

```bash
zcodegraph install --yes                              # auto-detect agents, install global
zcodegraph install --target=cursor,claude --yes       # explicit target list
zcodegraph install --target=auto --location=local     # detected agents, project-local
zcodegraph install --print-config codex               # print snippet, no file writes
```

| Flag | Values | Default |
|---|---|---|
| `--target` | `auto`, `all`, `none`, or csv (`claude,cursor,...`) | prompt |
| `--location` | `global`, `local` | prompt |
| `--yes` | (boolean) | prompt every step |
| `--no-permissions` | (boolean) skip Claude auto-allow list | permissions on |
| `--print-config <id>` | dump snippet for one agent and exit | — |

### 2. Restart Your Agent

Restart your agent (Claude Code / Cursor / Codex CLI / opencode / Hermes Agent / Gemini CLI / Antigravity IDE / Kiro) for the MCP server to load.

### 3. Initialize Projects

```bash
cd your-project
zcodegraph init
```

Builds the per-project knowledge graph index. ZCodeGraph uses Rust-backed indexing where supported and falls back file-by-file where needed, while your agent still reads one local graph. A single global `zcodegraph install` works in every project you open — no need to re-run the installer per project.

That's it — your agent will use ZCodeGraph tools automatically when a `.zcodegraph/` directory exists.

<details>
<summary><strong>Manual Setup (Alternative)</strong></summary>

**Install globally:**
```bash
npm install -g @jununfly/zcodegraph
```

**Add to `~/.claude.json`:**
```json
{
  "mcpServers": {
    "zcodegraph": {
      "type": "stdio",
      "command": "zcodegraph",
      "args": ["serve", "--mcp"]
    }
  }
}
```

**Add to `~/.claude/settings.json` (optional, for auto-allow):**
```json
{
  "permissions": {
    "allow": [
      "mcp__zcodegraph__zcodegraph_search",
      "mcp__zcodegraph__zcodegraph_explore",
      "mcp__zcodegraph__zcodegraph_callers",
      "mcp__zcodegraph__zcodegraph_callees",
      "mcp__zcodegraph__zcodegraph_impact",
      "mcp__zcodegraph__zcodegraph_node",
      "mcp__zcodegraph__zcodegraph_status",
      "mcp__zcodegraph__zcodegraph_files"
    ]
  }
}
```

</details>

<details>
<summary><strong>Agent Tool Guidance</strong></summary>

ZCodeGraph's MCP server delivers its usage guidance to your agent **automatically**, in the MCP `initialize` response — there's no instructions file to manage and nothing is added to your `CLAUDE.md` / `AGENTS.md` / `GEMINI.md`. In short, it tells the agent to:

- **Answer structural questions directly with ZCodeGraph** — it *is* the pre-built index, so a grep/read loop just repeats work it already did. Treat the returned source as already read.
- **Pick the tool by intent:** `zcodegraph_explore` for almost anything — "how does X work", a flow/"how does X reach Y", or surveying an area (one call returns the relevant symbols' source grouped by file); `zcodegraph_search` to just locate a symbol; `zcodegraph_callers`/`zcodegraph_callees` to walk call flow; `zcodegraph_impact` before editing; `zcodegraph_node` for one specific symbol's full source (it returns every overload for an ambiguous name).
- **Trust the results — don't re-verify with grep**, and check the staleness banner after edits.
- If `.zcodegraph/` doesn't exist yet, offer to run `zcodegraph init`.

The exact text is `src/mcp/server-instructions.ts` — the single source of truth.

</details>

---

## How It Works

```
┌───────────────────────────────────────────────────────────────────┐
│                            Claude Code                            │
│                                                                   │
│   "How does a request reach the database?"                        │
│       calls CodeGraph tools directly — no Explore sub-agent       │
│                                 │                                 │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                        CodeGraph MCP Server                       │
│                                                                   │
│       explore · search · callers · callees · impact · node        │
│                                 │                                 │
│                                 ▼                                 │
│                       SQLite knowledge graph                      │
│          symbols · edges · files · FTS5 full-text search          │
└───────────────────────────────────────────────────────────────────┘
```

1. **Extraction** — [tree-sitter](https://tree-sitter.github.io/) parses source code into ASTs. Language-specific queries extract nodes (functions, classes, methods) and edges (calls, imports, extends, implements).

2. **Storage** — Everything goes into a local SQLite database (`.zcodegraph/zcodegraph.db`) with FTS5 full-text search.

3. **Resolution** — After extraction, references are resolved: function calls → definitions, imports → source files, class inheritance, and framework-specific patterns.

4. **Auto-Sync** — The MCP server watches your project using native OS file events. Changes are debounced (2-second quiet window), filtered to source files only, and incrementally synced. The graph stays fresh as you code — no configuration needed.

---

## CLI Reference

```bash
zcodegraph                         # Run interactive installer
zcodegraph install                 # Run installer (explicit)
zcodegraph uninstall               # Remove ZCodeGraph from your agents (inverse of install)
zcodegraph init [path]             # Initialize a project and build the initial index
zcodegraph uninit [path]           # Remove ZCodeGraph from a project (--force to skip prompt)
zcodegraph index [path]            # Full index (--force to re-index, --quiet for less output)
zcodegraph sync [path]             # Incremental update
zcodegraph status [path]           # Show statistics
zcodegraph query <search>          # Search symbols (--kind, --limit, --json)
zcodegraph files [path]            # Show file structure (--format, --filter, --max-depth, --json)
zcodegraph callers <symbol>        # Find what calls a function/method (--limit, --json)
zcodegraph callees <symbol>        # Find what a function/method calls (--limit, --json)
zcodegraph impact <symbol>         # Analyze what code is affected by changing a symbol (--depth, --json)
zcodegraph affected [files...]     # Find test files affected by changes (see below)
zcodegraph serve --mcp             # Start MCP server
zcodegraph upgrade [version]       # Update to the latest release (--check, --force)
```

### `zcodegraph affected`

Traces import dependencies transitively to find which test files are affected by changed source files.

```bash
zcodegraph affected src/utils.ts src/api.ts         # Pass files as arguments
git diff --name-only | zcodegraph affected --stdin   # Pipe from git diff
zcodegraph affected src/auth.ts --filter "e2e/*"     # Custom test file pattern
```

| Option | Description | Default |
|--------|-------------|---------|
| `--stdin` | Read file list from stdin | `false` |
| `-d, --depth <n>` | Max dependency traversal depth | `5` |
| `-f, --filter <glob>` | Custom glob to identify test files | auto-detect |
| `-j, --json` | Output as JSON | `false` |
| `-q, --quiet` | Output file paths only | `false` |

**CI/hook example:**

```bash
#!/usr/bin/env bash
AFFECTED=$(git diff --name-only HEAD | zcodegraph affected --stdin --quiet)
if [ -n "$AFFECTED" ]; then
  npx vitest run $AFFECTED
fi
```

---

## MCP Tools

When running as an MCP server, ZCodeGraph exposes these tools to Claude Code:

| Tool | Purpose |
|------|---------|
| `zcodegraph_explore` | **Primary.** Answer almost any question in one call — "how does X work", a flow ("how does X reach Y"), or surveying an area — returning the relevant symbols' verbatim source grouped by file, plus a relationship map and blast radius. Surfaces dynamic-dispatch hops (callbacks, React re-render, interface→impl) grep can't follow. |
| `zcodegraph_search` | Find symbols by name across the codebase |
| `zcodegraph_callers` | Find what calls a function |
| `zcodegraph_callees` | Find what a function calls |
| `zcodegraph_impact` | Analyze what code is affected by changing a symbol |
| `zcodegraph_node` | Get one specific symbol's details + full source (returns every overload for an ambiguous name) |
| `zcodegraph_files` | Get indexed file structure (faster than filesystem scanning) |
| `zcodegraph_status` | Check index health and statistics |

---

## Library Usage

CodeGraph can be embedded directly. The npm package re-exports its programmatic
API, so both `import` and `require` resolve the `CodeGraph` class in your own
process — handy for embedding it in an app (e.g. an Electron main process).

```typescript
import CodeGraph from '@jununfly/zcodegraph';
// CommonJS works too:
//   const { CodeGraph } = require('@jununfly/zcodegraph');

const cg = await CodeGraph.init('/path/to/project');
// Or: const cg = await CodeGraph.open('/path/to/project');

await cg.indexAll({
  onProgress: (p) => console.log(`${p.phase}: ${p.current}/${p.total}`)
});

const results = cg.searchNodes('UserService');
const callers = cg.getCallers(results[0].node.id);
const context = await cg.buildContext('fix login bug', { maxNodes: 20, includeCode: true, format: 'markdown' });
const impact = cg.getImpactRadius(results[0].node.id, 2);

cg.watch();   // auto-sync on file changes
cg.unwatch(); // stop watching
cg.close();
```

Lower-level building blocks are exported from the same entry point for callers
that drive the graph directly: `DatabaseConnection`, `QueryBuilder`,
`getDatabasePath`, `initGrammars` / `loadGrammarsForLanguages`, and `FileLock`.

**Embedding requirements**

- Install from npm (`npm i @jununfly/zcodegraph`) so the matching
  per-platform package — which carries the compiled library and its
  dependencies — is fetched alongside the shim.
- The API runs on **your** runtime, so it needs **Node 22.5+** for the built-in
  `node:sqlite` (Electron qualifies when its bundled Node is 22.5+). The CLI and
  MCP server are unaffected — they run on the self-contained bundled runtime.
- TypeScript types ship with the package. As with any Node-targeting library,
  keep `@types/node` available and `skipLibCheck: true` (the common default).

---

## Configuration

There isn't any — CodeGraph is zero-config, with **no config file** to write or
keep in sync. Language support is automatic from the file extension; there's
nothing to wire up per language.

What it skips out of the box:

- **Dependency, build, and cache directories** — `node_modules`, `vendor`,
  `dist`, `build`, `target`, `.venv`, `Pods`, `.next`, and the like across every
  [supported stack](#supported-languages) — so the graph is your code, not
  third-party noise. This holds even with no `.gitignore`.
- **Anything in your `.gitignore`** — honored in git repos via git, and in
  non-git projects by reading `.gitignore` directly (root and nested).
- **Files larger than 1 MB** — generated bundles, minified JS, vendored blobs.

To keep something else out, add it to `.gitignore`. To pull a default-excluded
directory back **in** (say you really do want a vendored dependency indexed),
add a negation — `!vendor/`. The defaults apply uniformly, so committing a
dependency or build directory doesn't force it into the graph; the `.gitignore`
negation is the explicit opt-in.

## Supported Platforms

Every release ships a self-contained build (bundled Node runtime — nothing to
compile) for all three desktop OSes, on both Intel/AMD (x64) and ARM (arm64):

| Platform | Architectures | Install |
|----------|---------------|---------|
| Windows | x64, arm64 | PowerShell installer or npm |
| macOS | x64, arm64 | shell installer or npm |
| Linux | x64, arm64 | shell installer or npm |

See [Get Started](#get-started) for the one-line install commands.

## Supported Agents

The interactive installer auto-detects and configures each of these — wiring up
the MCP server (which delivers its own usage guidance, so no instructions file
is written):

- **Claude Code**
- **Cursor**
- **Codex CLI**
- **opencode**
- **Hermes Agent**
- **Gemini CLI**
- **Antigravity IDE**
- **Kiro**

## Supported Languages

### Indexing engine ownership

The default user path is `rust-hybrid`: ZCodeGraph uses a Rust-backed indexing
core for the languages it currently owns, then appends the mature TypeScript
indexer for the rest of the supported source set. Here **Rust-owned** describes
the implementation path, not the Rust programming language. ZCodeGraph can index
`.rs` files structurally, but it does not yet provide a full Rust compiler-style
semantic model for macros, lifetimes, trait coherence, or Cargo feature
resolution.

Users normally do not need to choose an engine. For debugging, the mature
TypeScript indexer remains available as an explicit command:

```bash
zcodegraph index --engine typescript
```

| State | Meaning | Current languages / files |
|---|---|---|
| Rust-owned | Indexed by the Rust core on the default `rust-hybrid` path. | JavaScript, JSX, TypeScript, TSX, Go, Python, Rust. |
| TS-indexed | Indexed by the TypeScript indexer as the mature multi-language path. | Java, C#, PHP, Ruby, C, C++, Objective-C, Swift, Kotlin, Scala, Dart, Svelte, Vue, Liquid, Pascal/Delphi, Lua, Luau, and other supported non-Rust-owned sources. |
| Hybrid fallback | `rust-hybrid` uses TypeScript fallback for a file or language and reports it in status/doctor. | Expected for non-Rust-owned supported files, and for Rust-owned parse gaps when recoverable. |
| Not covered | Not indexed as source symbols/edges. | Unsupported extensions, ignored paths, default-excluded dependency/build/cache directories, and files over the size limit. |

| Language | Extension | Status |
|----------|-----------|--------|
| TypeScript | `.ts`, `.tsx` | Full support |
| JavaScript | `.js`, `.jsx`, `.mjs` | Full support |
| Python | `.py` | Full support |
| Go | `.go` | Full support |
| Rust | `.rs` | Structural indexing support; full Rust-specific semantic analysis is planned separately |
| Java | `.java` | Full support |
| C# | `.cs` | Full support |
| PHP | `.php` | Full support |
| Ruby | `.rb` | Full support |
| C | `.c`, `.h` | Full support |
| C++ | `.cpp`, `.hpp`, `.cc` | Full support |
| Objective-C | `.m`, `.mm`, `.h` | Partial support (classes, protocols, methods, `@property`, `#import`, message sends; `.mm` ObjC++ may parse incompletely) |
| Swift | `.swift` | Full support |
| Kotlin | `.kt`, `.kts` | Full support |
| Scala | `.scala`, `.sc` | Full support (classes, traits, methods, type aliases, Scala 3 enums) |
| Dart | `.dart` | Full support |
| Svelte | `.svelte` | Full support (script extraction, Svelte 5 runes, SvelteKit routes) |
| Vue | `.vue` | Full support (script + script-setup extraction, Nuxt page/API/middleware routes) |
| Liquid | `.liquid` | Full support |
| Pascal / Delphi | `.pas`, `.dpr`, `.dpk`, `.lpr`, `.dfm`, `.fmx` | Full support (classes, records, interfaces, enums, DFM/FMX form files) |
| Lua | `.lua` | Full support (functions, methods with receivers, local variables, `require` imports, call edges) |
| Luau | `.luau` | Full support (everything in Lua, plus `type`/`export type` aliases, typed signatures, and Roblox instance-path `require`) |

## Measured Coverage

Impact and blast-radius queries are only as good as the dependency graph behind
them, so coverage is measured rather than asserted. The 0.10.0 README uses the
current-state release snapshot above as its displayed metric set. Historical
cross-file and framework coverage methodology is kept in
`docs/designs/dynamic-dispatch-coverage-playbook.md` so it can evolve without
mixing old benchmark numbers into the release snapshot.

## Troubleshooting

**"CodeGraph not initialized"** — Run `zcodegraph init` in your project directory first.

**Check index health** — Use `zcodegraph status` for a human-readable summary,
or `zcodegraph status --json` when reporting a bug or scripting a check. The
shared health states are:

- `healthy` — the graph is current and fully usable.
- `degraded` — the graph is usable, but fallback diagnostics need review.
- `stale` — the graph is usable but out of date; run `zcodegraph sync` or
  `zcodegraph index --force`.
- `failed` — the latest build failed; run
  `zcodegraph doctor --engine rust-hybrid --bundle --last-failure`.
- `unavailable` — no usable graph exists yet; run `zcodegraph init`.
- `corrupted` — the database exists but cannot be opened; do not trust the graph
  until you follow the recovery commands printed by `zcodegraph status`.

**Indexing is slow** — Check that `node_modules` and other large directories are excluded. Use `--quiet` to reduce output overhead.

**Indexing completed with fallback or failed** — Run a local diagnostic bundle and attach it to your issue. Bundles do not include source code by default:

```bash
zcodegraph doctor --engine rust-hybrid --bundle --last-run
zcodegraph doctor --engine rust-hybrid --bundle --last-failure
```

If `doctor` or one of those flags is missing, capture command-resolution
evidence before filing the issue:

```bash
command -v zcodegraph        # macOS / Linux
where.exe zcodegraph         # Windows PowerShell
zcodegraph --version
zcodegraph --help
zcodegraph doctor --help
```

Good issue reports are replayable and privacy-conscious. Include:

- the diagnostic bundle above;
- `zcodegraph status --json`;
- the command-resolution output above if `doctor` is missing or a flag is
  unknown;
- the exact command you ran;
- stdout/stderr;
- OS, architecture, install method, and Node version if you are embedding the
  library instead of using the bundled CLI;
- languages, package manager, and monorepo/workspace shape;
- a minimal public reproduction when possible.

Do not paste private source code by default. The standard doctor bundle records
metadata such as hashed file paths, extensions, languages, sizes, error
taxonomy, line/column, and Git blob hashes; it does not include source slices.

**Need the mature TypeScript indexer while reporting a Rust-backed indexing issue** — Use the escape hatch for the next full index:

```bash
zcodegraph index --engine typescript
```

**MCP hits `database is locked`** — current builds shouldn't: CodeGraph bundles its own Node runtime and uses Node's built-in `node:sqlite` in WAL mode, where concurrent reads never block on a writer. If you still see it:

- **You're on an old (pre-0.9) install.** Reinstall to get the bundled runtime — `npm install -g @jununfly/zcodegraph` (macOS/Linux), `npm install -g @jununfly/zcodegraph` (Windows), or `npm i -g @jununfly/zcodegraph@latest`.
- **`zcodegraph status` shows `Journal:` other than `wal`** — WAL couldn't be enabled on this filesystem (common on network shares and WSL2 `/mnt`), so reads can block on writes. Move the project (with its `.zcodegraph/` folder) onto a local disk.

**MCP server not connecting** — Ensure the project is initialized/indexed, verify the path in your MCP config, and check that `zcodegraph serve --mcp` works from the command line.

**Missing symbols** — The MCP server auto-syncs on save (wait a couple seconds). Run `zcodegraph sync` manually if needed. Check that the file's language is supported and isn't inside a `.gitignore`d or default-excluded directory (e.g. `node_modules`, `dist`).

## Star History

<a href="https://www.star-history.com/?repos=jununfly%2FZCodeGraph&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=jununfly/ZCodeGraph&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=jununfly/ZCodeGraph&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=jununfly/ZCodeGraph&type=date&legend=top-left" />
 </picture>
</a>

## License

MIT

---

<div align="center">

**Made for AI coding agents — Claude Code, Cursor, Codex CLI, opencode, Hermes Agent, Gemini CLI, Antigravity IDE, and Kiro**

[Report Bug](https://github.com/jununfly/ZCodeGraph/issues) · [Request Feature](https://github.com/jununfly/ZCodeGraph/issues)

</div>
