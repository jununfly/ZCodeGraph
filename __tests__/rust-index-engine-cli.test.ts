import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';

const BIN = path.resolve(__dirname, '../dist/bin/zcodegraph.js');
const RUST_CORE_BIN = path.resolve(
  __dirname,
  '..',
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

function makeTempProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-engine-'));
  fs.writeFileSync(path.join(dir, 'a.ts'), 'export function alpha(): number { return 1; }\n');
  const cg = CodeGraph.initSync(dir);
  cg.close();
  return dir;
}

function writeFakeRustCore(dir: string): string {
  const script = path.join(dir, process.platform === 'win32' ? 'fake-rust-core.cjs' : 'fake-rust-core');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      'if (!args.includes("index")) process.exit(2);',
      'process.stdout.write(JSON.stringify({ type: "progress", phase: "scanning", current: 0, total: 1 }) + "\\n");',
      'process.stdout.write(JSON.stringify({ type: "result", success: true, filesIndexed: 0, filesSkipped: 0, filesErrored: 0, nodesCreated: 0, edgesCreated: 0, errors: [], durationMs: 1 }) + "\\n");',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

function runCli(
  cwd: string,
  args: string[],
  env: Record<string, string | undefined> = {},
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    env: {
      ...process.env,
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
      ...env,
    },
    encoding: 'utf-8',
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function waitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for condition');
}

describe('zcodegraph index engine selection', () => {
  let tempDir: string;

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      execFileSync('npm', ['run', 'build'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
      });
    }
    execFileSync('cargo', ['build', '--package', 'zcodegraph-core'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
  }, 60_000);

  beforeEach(() => {
    tempDir = makeTempProject();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('uses the TypeScript indexer by default', () => {
    const result = runCli(tempDir, ['index', '--quiet']);

    expect(result.status).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('runs the Rust subprocess when selected by CLI flag', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain('Failed to index');
  });

  it('runs the Rust subprocess when selected by environment variable', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_INDEX_ENGINE: 'rust',
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain('Failed to index');
  });

  it('rejects unsupported engine values before indexing', () => {
    const result = runCli(tempDir, ['index', '--engine', 'python', '--quiet']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unsupported index engine');
  });

  it('leaves the existing TypeScript index intact when the Rust binary is unavailable', async () => {
    let cg = CodeGraph.openSync(tempDir);
    await cg.indexAll();
    expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    cg.close();

    const result = runCli(tempDir, ['index', '--engine', 'rust', '--force', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: path.join(tempDir, 'missing-rust-core'),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Rust index engine is unavailable');

    cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('writes a Rust-produced index that TypeScript status can inspect', () => {
    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const statusResult = runCli(tempDir, ['status', '--json']);
    expect(statusResult.status).toBe(0);
    const statusLine = statusResult.stdout.trim().split('\n').filter(Boolean).pop();
    expect(statusLine).toBeDefined();
    const status = JSON.parse(statusLine!) as {
      initialized: boolean;
      index: {
        engine: string | null;
        engineVersion: string | null;
        builtWithExtractionVersion: number | null;
      };
    };

    expect(status.initialized).toBe(true);
    expect(status.index.engine).toBe('rust');
    expect(status.index.engineVersion).toBe('0.1.0');
    expect(status.index.builtWithExtractionVersion).toBeTypeOf('number');

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getIndexBuildInfo()).toMatchObject({
        engine: 'rust',
        engineVersion: '0.1.0',
      });
      expect(cg.getStats().fileCount).toBeGreaterThanOrEqual(1);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('indexes one JavaScript file so TypeScript queries can find its symbols', () => {
    fs.writeFileSync(
      path.join(tempDir, 'app.js'),
      [
        'export function beta(value) {',
        '  return value + 1;',
        '}',
        '',
        'export class Widget {',
        '  render() { return beta(1); }',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const stats = cg.getStats();
      expect(stats.fileCount).toBeGreaterThanOrEqual(2);
      expect(stats.nodeCount).toBeGreaterThanOrEqual(3);
      expect(cg.searchNodes('beta').some((match) => match.node.name === 'beta')).toBe(true);
      expect(cg.searchNodes('Widget').some((match) => match.node.name === 'Widget')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('keeps indexing valid JavaScript files when one JavaScript file has a parse error', () => {
    fs.writeFileSync(
      path.join(tempDir, 'valid.js'),
      [
        'export function stillIndexed() {',
        '  return 42;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'broken.js'), 'export function broken( {\n');

    const indexResult = spawnSync(RUST_CORE_BIN, [
      'index',
      '--engine',
      'rust',
      '--project-path',
      tempDir,
      '--index-path',
      path.join(tempDir, '.zcodegraph', 'zcodegraph.db'),
    ], {
      cwd: tempDir,
      encoding: 'utf-8',
    });
    expect(indexResult.status).toBe(0);

    const resultLine = indexResult.stdout
      .trim()
      .split('\n')
      .filter((line) => line.includes('"type":"result"'))
      .pop();
    expect(resultLine).toBeDefined();
    const result = JSON.parse(resultLine!) as {
      filesErrored: number;
      errors: Array<{ message: string }>;
    };
    expect(result.filesErrored).toBeGreaterThanOrEqual(1);
    expect(result.errors.some((error) => error.message.includes('broken.js: parse error'))).toBe(true);

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('stillIndexed').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('broken.js').some((match) => match.node.kind === 'file')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('indexes TypeScript, JSX, and TSX symbols through the Rust engine', () => {
    fs.writeFileSync(
      path.join(tempDir, 'helpers.js'),
      [
        'import { loadUser } from "./models";',
        'function localHelper() { return loadUser("1"); }',
        'export function exportedHelper() { return localHelper(); }',
        'class LocalWidget {',
        '  constructor() {}',
        '  render() { return exportedHelper(); }',
        '}',
        'export class ExportedWidget {',
        '  render() { return new LocalWidget(); }',
        '}',
        'let mutableCount = 0;',
        'const JS_LIMIT = 3;',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'models.ts'),
      [
        'import { ProfileCard } from "./card";',
        'export { ProfileCard } from "./card";',
        'export interface User { id: UserId; name: string }',
        'export type UserId = string;',
        'export const DEFAULT_LIMIT = 25;',
        'let mutableUser: User | null = null;',
        'export function loadUser(id: UserId): User {',
        '  return { id, name: "Ada" };',
        '}',
        'export class UserService {',
        '  cache = new Map<string, User>();',
        '  constructor() {}',
        '  get(id: UserId): User { return loadUser(id); }',
        '}',
        'export const store = {',
        '  fetchUser(id: UserId) { return loadUser(id); },',
        '};',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'card.jsx'),
      [
        'export function ProfileCard(props) {',
        '  return <section><Avatar /></section>;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'dashboard.tsx'),
      [
        'export const Dashboard = () => {',
        '  const service = new UserService();',
        '  return <ProfileCard name={service.get("1")} />;',
        '};',
      ].join('\n') + '\n',
    );

    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const statusResult = runCli(tempDir, ['status', '--json']);
    const statusLine = statusResult.stdout.trim().split('\n').filter(Boolean).pop();
    const status = JSON.parse(statusLine!) as { languages: string[] };
    expect(status.languages).toEqual(expect.arrayContaining(['typescript', 'jsx', 'tsx']));

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('localHelper').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('exportedHelper').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('LocalWidget').some((match) => match.node.kind === 'class')).toBe(true);
      expect(cg.searchNodes('ExportedWidget').some((match) => match.node.kind === 'class')).toBe(true);
      expect(cg.searchNodes('mutableCount').some((match) => match.node.kind === 'variable')).toBe(true);
      expect(cg.searchNodes('JS_LIMIT').some((match) => match.node.kind === 'constant')).toBe(true);
      expect(cg.searchNodes('User').some((match) => match.node.kind === 'interface')).toBe(true);
      expect(cg.searchNodes('UserId').some((match) => match.node.kind === 'type_alias')).toBe(true);
      expect(cg.searchNodes('DEFAULT_LIMIT').some((match) => match.node.kind === 'constant')).toBe(true);
      expect(cg.searchNodes('mutableUser').some((match) => match.node.kind === 'variable')).toBe(true);
      expect(cg.searchNodes('loadUser').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('UserService').some((match) => match.node.kind === 'class')).toBe(true);
      expect(cg.searchNodes('cache').some((match) => match.node.kind === 'field')).toBe(true);
      expect(cg.searchNodes('constructor').some((match) => match.node.kind === 'method')).toBe(true);
      expect(cg.searchNodes('fetchUser').some((match) => match.node.kind === 'method')).toBe(true);
      expect(cg.searchNodes('ProfileCard').some((match) => match.node.kind === 'component')).toBe(true);
      expect(cg.searchNodes('Dashboard').some((match) => match.node.kind === 'component')).toBe(true);

      const db = (cg as unknown as { db: { getDb(): { prepare(sql: string): { all(): unknown[] } } } }).db.getDb();
      const symbolRows = db.prepare(
        "SELECT kind, name FROM nodes WHERE kind IN ('import', 'export') ORDER BY kind, name",
      ).all() as Array<{ kind: string; name: string }>;
      expect(symbolRows).toEqual(
        expect.arrayContaining([
          { kind: 'import', name: './models' },
          { kind: 'import', name: './card' },
          { kind: 'export', name: './card' },
        ]),
      );

      const refs = db.prepare(
        "SELECT reference_name AS referenceName, reference_kind AS referenceKind, file_path AS filePath, language FROM unresolved_refs ORDER BY reference_kind, reference_name",
      ).all() as Array<{
        referenceName: string;
        referenceKind: string;
        filePath: string;
        language: string;
      }>;
      expect(refs).toEqual(
        expect.arrayContaining([
          { referenceName: './card', referenceKind: 'imports', filePath: 'models.ts', language: 'typescript' },
          { referenceName: './card', referenceKind: 'exports', filePath: 'models.ts', language: 'typescript' },
          { referenceName: './models', referenceKind: 'imports', filePath: 'helpers.js', language: 'javascript' },
          { referenceName: 'localHelper', referenceKind: 'calls', filePath: 'helpers.js', language: 'javascript' },
          { referenceName: 'loadUser', referenceKind: 'calls', filePath: 'models.ts', language: 'typescript' },
          { referenceName: 'Avatar', referenceKind: 'references', filePath: 'card.jsx', language: 'jsx' },
          { referenceName: 'ProfileCard', referenceKind: 'references', filePath: 'dashboard.tsx', language: 'tsx' },
          { referenceName: 'UserService', referenceKind: 'instantiates', filePath: 'dashboard.tsx', language: 'tsx' },
          { referenceName: 'LocalWidget', referenceKind: 'instantiates', filePath: 'helpers.js', language: 'javascript' },
        ]),
      );
      const sourceRows = db.prepare(
        "SELECT name, kind, language, start_line AS startLine, start_column AS startColumn FROM nodes WHERE name IN ('helpers.js', 'localHelper', 'mutableUser', 'cache', 'ProfileCard', 'Dashboard')",
      ).all() as Array<{
        name: string;
        kind: string;
        language: string;
        startLine: number;
        startColumn: number;
      }>;
      expect(sourceRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'helpers.js', kind: 'file', language: 'javascript' }),
          expect.objectContaining({ name: 'localHelper', kind: 'function', language: 'javascript' }),
          expect.objectContaining({ name: 'mutableUser', kind: 'variable', language: 'typescript' }),
          expect.objectContaining({ name: 'cache', kind: 'field', language: 'typescript' }),
          expect.objectContaining({ name: 'ProfileCard', kind: 'component', language: 'jsx' }),
          expect.objectContaining({ name: 'Dashboard', kind: 'component', language: 'tsx' }),
        ]),
      );
      for (const row of sourceRows) {
        expect(row.startLine).toBeGreaterThanOrEqual(1);
        expect(row.startColumn).toBeGreaterThanOrEqual(0);
      }
    } finally {
      cg.close();
    }
  }, 30_000);

  it('keeps the previous good index when the Rust writer cannot acquire the project lock', async () => {
    let cg = CodeGraph.openSync(tempDir);
    await cg.indexAll();
    expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    cg.close();

    const lockPath = path.join(tempDir, '.zcodegraph', 'zcodegraph.lock');
    fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
    try {
      const result = runCli(tempDir, ['index', '--engine', 'rust', '--force', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('CodeGraph database is locked by another process');
    } finally {
      fs.rmSync(lockPath, { force: true });
    }

    cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
      expect(cg.getIndexBuildInfo()).toMatchObject({
        engine: 'typescript',
      });
    } finally {
      cg.close();
    }
  }, 30_000);

  it.runIf(process.platform !== 'win32')('can index again after the Rust subprocess is terminated while holding the project lock', async () => {
    const indexPath = path.join(tempDir, '.zcodegraph', 'zcodegraph.db');
    const child = spawn(RUST_CORE_BIN, [
      'index',
      '--engine',
      'rust',
      '--project-path',
      tempDir,
      '--index-path',
      indexPath,
    ], {
      cwd: tempDir,
      env: {
        ...process.env,
        ZCODEGRAPH_RUST_CORE_TEST_SLEEP_MS: '5000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const lockPath = path.join(tempDir, '.zcodegraph', 'zcodegraph.lock');
    await waitFor(() => fs.existsSync(lockPath));
    child.kill('SIGTERM');
    await new Promise<void>((resolve) => child.once('close', () => resolve()));
    expect(fs.existsSync(lockPath)).toBe(true);

    const retry = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(retry.status).toBe(0);
    expect(fs.existsSync(lockPath)).toBe(false);

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getIndexBuildInfo()).toMatchObject({ engine: 'rust' });
    } finally {
      cg.close();
    }
  }, 30_000);
});
