import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    /**
     * Serialize test file execution (run one file at a time in the main thread).
     *
     * The default behavior runs many test files in parallel worker threads,
     * which races the synchronous `require.resolve('tree-sitter-wasms/...')`
     * in `src/extraction/grammars.ts::initGrammars()` against worker-thread
     * module initialization. The symptom was `Failed to get parser for
     * language: typescript/javascript/...` in `tests/extraction.test.ts`
     * (107 of 276 cases failing) on Windows, while the same tests passed
     * standalone or via the compiled `dist/`.
     *
     * `fileParallelism: false` is the ONLY configuration we verified is
     * deterministic on vitest 2.1.9 + Windows (3/3 cold+warm runs stabilize
     * at 275/276). Alternatives considered and rejected:
     *   - `pool: 'forks'` (global): honored on cold runs, silently falls back
     *     to threads on warm runs (vitest 2.1.9 Windows config-cache race).
     *   - `poolMatchGlobs`: same non-determinism — 3 consecutive runs yielded
     *     1/3, 107, 1/3 failures.
     *   - Upgrading to vitest 3.x: out of scope (major version bump).
     *
     * Trade-off: serial execution lengthens a full `npm test` from ~140s to
     * ~30-60min locally. Acceptable for this repo: most contributors run
     * targeted `npx vitest run <file>` during dev, and CI on Node 22/23 does
     * not hit the wasm race as consistently as Windows.
     */
    fileParallelism: false,
    /**
     * Several MCP integration tests (mcp-daemon, mcp-initialize, mcp-ppid-watchdog,
     * mcp-roots) spawn `dist/bin/zcodegraph.js serve --mcp` with `process.execPath`
     * and rely on the child inheriting `process.env`. On a Node >= 25 dev machine
     * the CLI's hard-block (src/bin/zcodegraph.ts) would otherwise exit the child
     * before it ever responds, so every spawn-based test times out — see #478.
     *
     * Setting the override here keeps the CLI's runtime guard intact for end
     * users (it's still enforced when `codegraph` is invoked directly) while
     * letting the test suite run on whatever Node the contributor happens to
     * have installed. CI on Node 22/23 is unaffected — the guard doesn't fire
     * there, so the variable is a no-op.
     */
    env: { CODEGRAPH_ALLOW_UNSAFE_NODE: '1' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
