import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import CodeGraph from '../src/index';
import { ToolHandler } from '../src/mcp/tools';
import type { Node, Subgraph } from '../src/types';

const ROOT = path.resolve(__dirname, '..');
const BIN = path.join(ROOT, 'dist', 'bin', 'zcodegraph.js');
const temporaryDirectories: string[] = [];
const handlers: ToolHandler[] = [];

function node(id: string, filePath = `src/${id}.ts`): Node {
  return {
    id, name: id, kind: 'function', filePath, startLine: 1, endLine: 1,
  } as Node;
}

function subgraph(entries: Node[]): Subgraph {
  return {
    nodes: new Map(entries.map((entry) => [entry.id, entry])),
    edges: [], entryNodes: entries.map((entry) => entry.id),
  };
}

function temporaryProject(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-legacy-explore-'));
  temporaryDirectories.push(directory);
  return directory;
}

function runCli(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd: ROOT,
    env: {
      ...process.env,
      ZCG_ALLOW_UNSAFE_NODE: '1', ZCG_NO_DAEMON: '1', ZCG_NO_RELAUNCH: '1',
      ...env,
    },
    encoding: 'utf8', timeout: 30_000,
  });
}

function initializeCliProject(): string {
  const directory = temporaryProject();
  fs.mkdirSync(path.join(directory, 'src'));
  for (const name of ['alpha', 'beta', 'gamma']) {
    fs.writeFileSync(path.join(directory, 'src', `${name}.ts`),
      `export function sharedTarget() { return '${name}'; }\n`
      + `export function ${name}() { return sharedTarget(); }\n`);
  }
  const initialized = runCli(['index', directory, '--engine', 'typescript', '--quiet']);
  expect(initialized.status, initialized.stderr).toBe(0);
  return directory;
}

function sourceSections(output: string): string[] {
  return [...output.matchAll(/^#### (.+?) —/gm)].map((match) => match[1]);
}

beforeAll(() => {
  expect(fs.existsSync(BIN), 'run npm run build before CLI characterization').toBe(true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  delete process.env.ZCG_EXPLORE_TIGHT_SMALL_PROJECT;
  delete process.env.ZCG_EXPLORE_LINENUMS;
  await Promise.all(handlers.splice(0).map((handler) => handler.closeAll()));
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('legacy MCP Explore composition', () => {
  it('returns the established empty-query and no-evidence envelopes', async () => {
    const graph = {
      findRelevantContext: vi.fn().mockResolvedValue(subgraph([])),
      getProjectRoot: () => '/legacy-project', getStats: () => ({ fileCount: 1 }),
      getPendingFiles: () => [], closeAndWait: async () => {},
    } as unknown as CodeGraph;
    const handler = new ToolHandler(graph);
    handlers.push(handler);

    expect(await handler.execute('zcodegraph_explore', { query: '' })).toEqual({
      content: [{ type: 'text', text: 'Error: query must be a non-empty string' }], isError: true,
    });
    expect(await handler.execute('zcodegraph_explore', { query: '   ' })).toEqual({
      content: [{ type: 'text', text: 'No relevant code found for "   "' }],
    });
  });

  it('wraps a query failure without converting it to no evidence', async () => {
    const graph = {
      findRelevantContext: vi.fn().mockRejectedValue(new Error('query boom')),
      getProjectRoot: () => '/legacy-project', getStats: () => ({ fileCount: 1 }),
      getPendingFiles: () => [], closeAndWait: async () => {},
    } as unknown as CodeGraph;
    const handler = new ToolHandler(graph);
    handlers.push(handler);

    expect(await handler.execute('zcodegraph_explore', { query: 'target' })).toEqual({
      content: [{ type: 'text', text: 'Error: Tool execution failed: query boom' }], isError: true,
    });
  });

  it('retains fractional maxFiles and still renders the source that fits', async () => {
    const directory = temporaryProject();
    fs.writeFileSync(path.join(directory, 'feature.ts'),
      'export function target() { return 1; }\nexport function caller() { return target(); }\n');
    const graph = CodeGraph.initSync(directory, { config: { include: ['**/*.ts'], exclude: [] } });
    await graph.indexAll({ engine: 'typescript' });
    const handler = new ToolHandler(graph);
    handlers.push(handler);

    const result = await handler.execute('zcodegraph_explore', { query: 'target', maxFiles: 1.5 });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('### Source Code');
    expect(result.content[0].text).toContain('target');
  });

  it('deduplicates caller identities and normalized files, and caps roots and listed files', () => {
    const handler = new ToolHandler(null);
    const roots = Array.from({ length: 6 }, (_, index) => node(`root${index}`, `src\\root${index}.ts`));
    const callers = new Map<string, Node[]>();
    for (const root of roots) {
      callers.set(root.id, [
        node(`${root.id}-caller`, `src\\${root.id}.ts`),
        node(`${root.id}-caller`, `src\\${root.id}.ts`),
        node(`${root.id}-same-file`, `src/${root.id}.ts`),
        ...Array.from({ length: 4 }, (_, index) => node(`${root.id}-extra${index}`, `src/${root.id}-${index}.ts`)),
        ...Array.from({ length: 5 }, (_, index) => node(`${root.id}-test${index}`, `test/${root.id}-${index}.test.ts`)),
      ]);
    }
    const graph = {
      getCallers: vi.fn((id: string) => {
        if (id === 'root0') throw new Error('caller boom');
        return (callers.get(id) ?? []).map((caller) => ({ node: caller }));
      }),
    } as unknown as CodeGraph;

    const output = handler.buildBlastRadiusSection(graph, subgraph(roots));
    expect(output).toContain('root1');
    expect(output).not.toContain('`root0`');
    expect(output).not.toContain('`root5`');
    expect(graph.getCallers).toHaveBeenCalledTimes(5);
    expect(output).toContain('11 callers');
    expect(output).toContain('src/root1.ts');
    expect(output).not.toContain('src\\root1.ts');
    expect(output).toContain('+1 more');
    expect(output).toMatch(/tests:.*\+1(\n|$)/);
    expect((output.match(/^- `root/gm) ?? []).length).toBe(4);
  });
});

describe('legacy CLI Explore composition', () => {
  it('prints no evidence and adds the console newline', () => {
    const directory = initializeCliProject();
    const result = runCli(['explore', 'definitelyNoSuchSymbol', '--path', directory]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('No relevant code found for "definitelyNoSuchSymbol"\n');
  });

  it('parses fractional maxFiles before planning and honors runtime output flags', () => {
    const directory = initializeCliProject();
    const regular = runCli(['explore', 'sharedTarget', '--path', directory, '--max-files', '1.9']);
    expect(regular.status, regular.stderr).toBe(0);
    expect(sourceSections(regular.stdout)).toHaveLength(1);
    expect(regular.stdout).toContain('### Blast radius');
    expect(regular.stdout).toMatch(/^\d+\t/m);
    expect(regular.stdout.endsWith('\n')).toBe(true);

    const tight = runCli(['explore', 'sharedTarget', '--path', directory], {
      ZCG_EXPLORE_TIGHT_SMALL_PROJECT: '1', ZCG_EXPLORE_LINENUMS: '0',
    });
    expect(tight.status, tight.stderr).toBe(0);
    expect(tight.stdout).not.toContain('### Blast radius');
    expect(tight.stdout).not.toMatch(/^\d+\t/m);
  });

  it('preserves the legacy non-numeric maxFiles behavior instead of rejecting it', () => {
    const directory = initializeCliProject();
    const result = runCli(['explore', 'sharedTarget', '--path', directory, '--max-files', 'not-a-number']);
    expect(result.status, result.stderr).toBe(0);
    expect(sourceSections(result.stdout).length).toBeGreaterThan(1);
  });
});
