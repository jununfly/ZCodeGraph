# ZCodeGraph Brand and Isolation Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the external product identity from upstream CodeGraph to ZCodeGraph while preserving internal domain model names, then audit and fix project-controlled multi-agent/multi-skill shared-state pollution risks.

**Architecture:** Treat this as two commits: first a mostly mechanical external identity migration, then a behavioral isolation pass. External product identity changes package, CLI, MCP tool names, docs, installer instructions, benchmarks, and tests. Internal domain model names remain stable: `CodeGraph`, `.codegraph/`, DB schema, and the phrase “code graph” as a domain concept are not renamed.

**Tech Stack:** TypeScript, Node.js >=20 <25, npm package metadata, Vitest, MCP tool definitions, CLI bin entry, local SQLite-backed `.codegraph` indexes.

---

## Confirmed Decisions

- Product name: `ZCodeGraph`
- Tagline: `maintained by jununfly`
- Attribution: `based on upstream CodeGraph by Colby McHenry`
- npm package name: `@jununfly/zcodegraph`
- install command: `npm install -g @jununfly/zcodegraph`
- CLI command: `zcodegraph`
- CLI dist file: `dist/bin/zcodegraph.js`
- MCP tool names: `zcodegraph_*`
- No external users currently; breaking migration is acceptable.
- Keep internal domain model stable:
  - Keep `CodeGraph` class and `CodeGraph.open/init`.
  - Keep `.codegraph/` index directory.
  - Keep DB schema/table names.
  - Keep internal domain term “code graph” where it means the concept, not the product brand.

## Explicit Non-Goals

- Do not rename `CodeGraph` class to `ZCodeGraph`.
- Do not rename `.codegraph/` to `.zcodegraph/`.
- Do not migrate DB schema names.
- Do not introduce compatibility aliases for old CLI command `codegraph`.
- Do not keep old MCP tool names as aliases.
- Do not expand isolation audit into WorkBuddy, Claude, Cursor, Codex, or other platform internals.

---

## Commit 1: External Identity Migration

### Task 1: Inventory external identity references

**Files:**
- Inspect: `package.json`
- Inspect: `package-lock.json`
- Inspect: `README.md`
- Inspect: `CLAUDE.md`
- Inspect: `src/bin/codegraph.ts`
- Inspect: `src/mcp/tools.ts`
- Inspect: `src/installer/**`
- Inspect: `docs/**/*.md`
- Inspect: `scripts/agent-eval/**`
- Inspect: `__tests__/**`

**Step 1: Search external product/package/CLI/tool references**

Run:

```bash
git grep -n -E '@colbymchenry/codegraph|npm install -g|\bcodegraph\b|codegraph_|dist/bin/codegraph\.js|src/bin/codegraph|codegraph\.ts|CodeGraph'
```

Expected:
- Many hits.
- Class/domain references to `CodeGraph` must be separated from external identity references.

**Step 2: Classify hits before editing**

Create a temporary checklist in the implementation notes, not a committed file:

```text
Rename:
- package name
- install command
- CLI command examples
- CLI source/dist file path
- MCP tool names
- benchmark/probe tool names
- installer instructions

Keep:
- CodeGraph class/API
- .codegraph directory
- DB schema
- conceptual “code graph” text
- upstream attribution occurrences
```

**Step 3: Do not commit yet**

Expected:
- No file changes in this task.

---

### Task 2: Update package identity and CLI entry path

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Rename: `src/bin/codegraph.ts` -> `src/bin/zcodegraph.ts`
- Modify any TypeScript config or build script references if present.

**Step 1: Update `package.json`**

Expected target shape:

```json
{
  "name": "@jununfly/zcodegraph",
  "bin": {
    "zcodegraph": "./dist/bin/zcodegraph.js"
  }
}
```

Also update build chmod path from:

```text
dist/bin/codegraph.js
```

to:

```text
dist/bin/zcodegraph.js
```

**Step 2: Rename CLI source file**

Run:

```bash
git mv src/bin/codegraph.ts src/bin/zcodegraph.ts
```

Expected:
- `src/bin/zcodegraph.ts` exists.
- `src/bin/codegraph.ts` no longer exists.

**Step 3: Update lockfile package name**

Run:

```bash
/Users/bilibili/.workbuddy/binaries/node/versions/22.22.2/bin/npm install --package-lock-only --ignore-scripts
```

Expected:
- `package-lock.json` reflects `@jununfly/zcodegraph`.
- No dependency version churn beyond package identity metadata.

**Step 4: Build check**

Run:

```bash
/Users/bilibili/.workbuddy/binaries/node/versions/22.22.2/bin/npm run build
```

Expected:
- `dist/bin/zcodegraph.js` exists.
- Build exits 0.

---

### Task 3: Rename MCP tool names from `codegraph_*` to `zcodegraph_*`

**Files:**
- Modify: `src/mcp/tools.ts`
- Modify: tests that call MCP tools.
- Modify: benchmark/probe scripts under `scripts/agent-eval/`.
- Modify: docs that show MCP tool names.

**Step 1: Write or update focused tests first**

Search existing tests for MCP tool names:

```bash
git grep -n "codegraph_" __tests__ src scripts docs README.md CLAUDE.md
```

Expected:
- Identify tests that assert tool definitions or call `ToolHandler.execute()`.

If no test asserts renamed tool names, add one targeted test that verifies exported tool names include `zcodegraph_explore` and do not include `codegraph_explore`.

**Step 2: Run the focused test and verify failure**

Run the relevant Vitest file, for example:

```bash
/Users/bilibili/.workbuddy/binaries/node/versions/22.22.2/bin/npm test -- __tests__/mcp-tools.test.ts
```

Expected before implementation:
- FAIL because tool names are still `codegraph_*`.

**Step 3: Update tool definitions and handler dispatch names**

Replace external MCP names:

```text
codegraph_explore -> zcodegraph_explore
codegraph_node -> zcodegraph_node
codegraph_context -> zcodegraph_context
codegraph_callers -> zcodegraph_callers
codegraph_callees -> zcodegraph_callees
codegraph_impact -> zcodegraph_impact
codegraph_search -> zcodegraph_search
```

Use actual names found in `src/mcp/tools.ts`; do not invent names.

**Step 4: Update benchmark/probe scripts**

Especially inspect:

```text
scripts/agent-eval/probe-explore.mjs
scripts/agent-eval/probe-node.mjs
scripts/agent-eval/probe-context.mjs
scripts/agent-eval/probe-trace.mjs
scripts/agent-eval/probe-sweep.mjs
scripts/agent-eval/*.sh
```

Change `h.execute('codegraph_explore', ...)` style calls to new names.

**Step 5: Run focused tests**

Run:

```bash
/Users/bilibili/.workbuddy/binaries/node/versions/22.22.2/bin/npm test -- __tests__/mcp-tools.test.ts
```

Expected:
- PASS.

---

### Task 4: Update README, docs, installer instructions, and agent-facing text

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `docs/**/*.md`
- Modify: `src/installer/**`
- Modify: package metadata docs if present.

**Step 1: Update product intro**

README should introduce:

```text
ZCodeGraph — maintained by jununfly
Based on upstream CodeGraph by Colby McHenry.
```

Keep attribution visible and non-deceptive.

**Step 2: Update install command**

Replace:

```bash
npm install -g @colbymchenry/codegraph
```

with:

```bash
npm install -g @jununfly/zcodegraph
```

Do not keep upstream fallback as the primary path.

**Step 3: Update CLI examples**

Replace external command examples:

```bash
codegraph init -i
codegraph serve
codegraph status
```

with:

```bash
zcodegraph init -i
zcodegraph serve
zcodegraph status
```

Do not replace conceptual prose like “builds a code graph” unless it refers to the product name.

**Step 4: Update installer/agent instructions**

Search for generated config or instruction strings that tell agents to run `codegraph`.

Replace CLI command with `zcodegraph`.

Replace MCP tool names with `zcodegraph_*`.

**Step 5: Update build/dist references**

Replace external path references:

```text
dist/bin/codegraph.js
```

with:

```text
dist/bin/zcodegraph.js
```

---

### Task 5: Verify identity migration and commit

**Files:**
- All changed files from Tasks 2-4.

**Step 1: Run full build**

Run:

```bash
/Users/bilibili/.workbuddy/binaries/node/versions/22.22.2/bin/npm run build
```

Expected:
- Exit 0.
- `dist/bin/zcodegraph.js` exists.

**Step 2: Run full tests**

Run:

```bash
/Users/bilibili/.workbuddy/binaries/node/versions/22.22.2/bin/npm test
```

Expected:
- Exit 0.
- All test files pass.

**Step 3: Check old external identity residue**

Run:

```bash
git grep -n -E '@colbymchenry/codegraph|npm install -g @colbymchenry/codegraph|\bcodegraph init\b|\bcodegraph serve\b|\bcodegraph status\b|codegraph_|dist/bin/codegraph\.js|src/bin/codegraph\.ts' -- . ':!.workbuddy/**'
```

Expected:
- No hits, except intentional upstream attribution if the query is broadened manually.
- If there are hits, classify each as intentional domain/attribution or fix it.

**Step 4: Check internal domain model preserved**

Run:

```bash
git grep -n -E 'class CodeGraph|CodeGraph\.open|CodeGraph\.init|\.codegraph' -- src __tests__ docs README.md CLAUDE.md
```

Expected:
- Internal API and `.codegraph/` references still exist where appropriate.

**Step 5: Commit**

Use the project commit workflow. Commit message:

```text
chore: migrate external identity to ZCodeGraph
```

Do not include `.workbuddy/` files.

---

## Commit 2: Multi-Agent / Multi-Skill Isolation Audit and Fixes

### Task 6: Audit MCP `ToolHandler` shared state

**Files:**
- Inspect/Modify: `src/mcp/tools.ts`
- Test: existing MCP tests or create `__tests__/mcp-project-isolation.test.ts`

**Step 1: Inspect mutable state**

Focus on:

```ts
private projectCache: Map<string, CodeGraph>
private defaultProjectHint: string | null
private worktreeMismatchCache: Map<string, WorktreeIndexMismatch | null>
private catchUpGate: Promise<void> | null
```

Questions to answer in code comments or implementation notes:

```text
- Is projectCache keyed by canonical project root?
- Can two explicit projectPath calls share the wrong CodeGraph instance?
- Can defaultProjectHint from one agent affect another explicit projectPath call?
- Is catchUpGate global across projects?
- Is worktreeMismatchCache keyed by enough project/worktree identity?
```

**Step 2: Write failing isolation tests**

Create tests for at least these cases:

1. Explicit `projectPath` A and explicit `projectPath` B use separate cached `CodeGraph` instances.
2. A previous default project hint does not override a later explicit `projectPath`.
3. Catch-up gating is per canonical project, not global across unrelated projects.

Pseudo-test shape:

```ts
it('does not let one project hint override an explicit projectPath', async () => {
  const handler = new ToolHandler(null);
  // Arrange two temp projects with separate indexes.
  // Execute a tool against project A without explicit projectPath if needed.
  // Execute a tool against project B with explicit projectPath.
  // Assert output references only project B content.
});
```

Prefer real temp projects over excessive mocks when possible.

**Step 3: Run tests and verify failure**

Run:

```bash
/Users/bilibili/.workbuddy/binaries/node/versions/22.22.2/bin/npm test -- __tests__/mcp-project-isolation.test.ts
```

Expected:
- At least one new test fails before implementation if a real bug exists.
- If tests pass, record no code change for that subcase and keep tests as regression coverage.

**Step 4: Implement minimal isolation fix**

Likely changes:

- Canonicalize project roots before cache lookup.
- Replace global `catchUpGate` with per-project map:

```ts
private catchUpGates: Map<string, Promise<void>> = new Map();
```

- Ensure explicit `projectPath` wins over `defaultProjectHint`.
- Key `worktreeMismatchCache` by canonical project/worktree identity.

Do not alter public MCP behavior beyond isolation.

**Step 5: Run focused tests**

Run:

```bash
/Users/bilibili/.workbuddy/binaries/node/versions/22.22.2/bin/npm test -- __tests__/mcp-project-isolation.test.ts
```

Expected:
- PASS.

---

### Task 7: Audit daemon/session/watch/index lock isolation

**Files:**
- Inspect/Modify: daemon-related files under `src/**`.
- Inspect/Modify: watcher/index lock files under `src/**`.
- Test: existing daemon/watch/lock tests or create focused tests.

**Step 1: Locate daemon/watch/lock code**

Run:

```bash
git grep -n -E 'daemon|session|watcher|FileWatcher|FileLock|indexMutex|lock|projectPath|projectRoot' src __tests__
```

Expected:
- Identify exact files controlling process/session/project isolation.

**Step 2: Audit project identity keys**

For each mutable global/cache/session map, check whether it is keyed by:

```text
canonical project root + relevant worktree/index path identity
```

Not acceptable:

```text
single global mutable value that affects all projects
cwd-only identity when explicit project path exists
```

**Step 3: Write focused regression tests only for real risks**

Do not invent broad daemon integration tests if no bug is found. Prefer small tests around path resolution, lock path, or session key generation.

**Step 4: Implement minimal fixes**

Examples:

- Make lock path derive from the target project root, not process cwd.
- Make watcher state instance-scoped, not module-global.
- Canonicalize project path before daemon session lookup.

**Step 5: Run focused tests**

Run the relevant test file(s).

Expected:
- PASS.

---

### Task 8: Audit installer config isolation after `zcodegraph` migration

**Files:**
- Inspect/Modify: `src/installer/index.ts`
- Inspect/Modify: `src/installer/targets/**`
- Test: installer tests under `__tests__/**` if present.

**Step 1: Search installer command/config text**

Run:

```bash
git grep -n -E 'codegraph|zcodegraph|projectPath|cwd|local|global|settings|mcp|command' src/installer __tests__ docs README.md CLAUDE.md
```

Expected:
- No stale external `codegraph` command references after Commit 1.
- Config generation should point to `zcodegraph`.

**Step 2: Check local/global config isolation**

Questions:

```text
- Does local install write only to current project configuration?
- Does global install avoid embedding a stale project path unless intended?
- Does target detection use the passed location instead of process cwd drift?
```

**Step 3: Add or update tests for generated config**

Expected config should use:

```text
zcodegraph
zcodegraph_* tool names where instructions mention tools
```

**Step 4: Run focused installer tests**

Run relevant test files.

Expected:
- PASS.

---

### Task 9: Audit benchmark/probe scripts for single-agent/single-project assumptions

**Files:**
- Inspect/Modify: `scripts/agent-eval/*.mjs`
- Inspect/Modify: `scripts/agent-eval/*.sh`
- Inspect/Modify: `docs/benchmarks/*.md`

**Step 1: Search projectPath and tool name usage**

Run:

```bash
git grep -n -E 'codegraph_|zcodegraph_|projectPath|repo|cwd|process\.cwd|ToolHandler|execute\(' scripts/agent-eval docs/benchmarks
```

Expected:
- Tool names use `zcodegraph_*`.
- Probes that execute MCP tools pass explicit `projectPath` whenever the API supports it.

**Step 2: Update probes to pass explicit projectPath**

Example target shape:

```js
const repo = process.argv[2] || process.cwd();
const res = await h.execute('zcodegraph_explore', { query, projectPath: repo });
```

Do this for all probes that instantiate `ToolHandler` and execute tools.

**Step 3: Smoke run deterministic probes**

After build, run at least:

```bash
/Users/bilibili/.workbuddy/binaries/node/versions/22.22.2/bin/node scripts/agent-eval/probe-explore.mjs . "how does indexing work?"
```

Expected:
- Probe runs against the explicit repo.
- No stale `codegraph_*` tool name error.

---

### Task 10: Final verification and second commit

**Files:**
- All changed files from Tasks 6-9.

**Step 1: Run full build**

Run:

```bash
/Users/bilibili/.workbuddy/binaries/node/versions/22.22.2/bin/npm run build
```

Expected:
- Exit 0.

**Step 2: Run full tests**

Run:

```bash
/Users/bilibili/.workbuddy/binaries/node/versions/22.22.2/bin/npm test
```

Expected:
- Exit 0.

**Step 3: Run residue checks**

Run:

```bash
git grep -n -E 'codegraph_|\bcodegraph\b|dist/bin/codegraph\.js|src/bin/codegraph\.ts|@colbymchenry/codegraph' -- . ':!.workbuddy/**'
```

Expected:
- Any remaining hits must be intentional:
  - upstream attribution,
  - internal domain phrase “code graph”,
  - `.codegraph/` index directory,
  - `CodeGraph` class/API.
- No old external CLI/MCP/package identity remains.

**Step 4: Review diff manually**

Run:

```bash
git diff --stat
git diff -- package.json src/mcp/tools.ts src/bin/zcodegraph.ts
```

Expected:
- Commit 2 should focus on isolation and probe/config correctness, not broad rename churn.

**Step 5: Commit**

Commit message:

```text
fix: isolate zcodegraph project state across agents
```

Do not include `.workbuddy/` files.

---

## Implementation Notes

- Use TDD for behavioral isolation changes.
- Keep mechanical rename and isolation fixes separate.
- Prefer canonical absolute project roots for cache keys.
- Explicit `projectPath` must always win over defaults/hints.
- Avoid compatibility aliases because the user explicitly chose a breaking migration and there are no external users.
- Do not amend implementation commits to insert their own hashes into docs; use a separate doc-only follow-up if a stable commit hash needs to be recorded.

## Done Criteria

- `package.json` uses `@jununfly/zcodegraph`.
- CLI command is `zcodegraph` only.
- CLI built file is `dist/bin/zcodegraph.js`.
- MCP tools are `zcodegraph_*` only.
- README/docs/install/installer/benchmarks/tests use the new external identity.
- `CodeGraph` class/API, `.codegraph/`, and DB schema remain unchanged.
- Multi-project/multi-agent state isolation is covered by targeted tests where code-controlled risk exists.
- `npm run build` passes.
- `npm test` passes.
- `.workbuddy/` remains untracked and uncommitted.
