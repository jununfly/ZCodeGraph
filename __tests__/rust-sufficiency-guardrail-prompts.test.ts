import { describe, expect, it, afterEach, beforeAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-sufficiency-guardrail.mjs');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');
const RUST_CORE = path.join(
  REPO_ROOT,
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('Rust sufficiency guardrail prompt configuration', () => {
  const tempDirs: string[] = [];

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      const result = spawnSync('npm', ['run', 'build'], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      });
      expect(result.status).toBe(0);
    }
  }, 60_000);

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('documents external prompt files for long-running repo-specific probes', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--help'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('--prompts <json>');
    expect(result.stdout).toContain('--out <file>');
    expect(result.stdout).toContain('--prompt-id <id>');
    expect(result.stdout).toContain('--repo-pair <name>:typescript=<path>');
    expect(result.stdout).toContain('Names with built-in prompts: zcodegraph, excalidraw, zustand');
    expect(result.stdout).toContain('JavaScript/TypeScript/config slice');
  });

  it('writes a machine-readable unavailable artifact for a missing indexed pair', () => {
    const temp = makeTempDir('zcodegraph-sufficiency-missing-index-');
    tempDirs.push(temp);
    const prompts = path.join(temp, 'prompts.json');
    const out = path.join(temp, 'artifact.json');
    fs.writeFileSync(
      prompts,
      JSON.stringify({
        fixture: [
          {
            id: 'FX-1',
            query: 'alpha beta',
            expected: ['alpha', 'beta'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--prompts',
        prompts,
        '--prompt-id',
        'FX-1',
        '--repo-pair',
        `fixture:typescript=${path.join(temp, 'missing-ts')}`,
        '--repo-pair',
        `fixture:rust=${path.join(temp, 'missing-rust')}`,
        '--out',
        out,
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status).toBe(1);
    const parsed = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      status: string;
      unavailableKind: string;
      stages: { copy: { status: string }; typescriptIndex: { status: string }; rustIndex: { status: string } };
      defaultRolloutReadinessClaimed: boolean;
    };

    expect(parsed.status).toBe('unavailable');
    expect(parsed.unavailableKind).toBe('missing-index');
    expect(parsed.stages.copy.status).toBe('skipped');
    expect(parsed.stages.typescriptIndex.status).toBe('skipped');
    expect(parsed.stages.rustIndex.status).toBe('skipped');
    expect(parsed.defaultRolloutReadinessClaimed).toBe(false);
  });

  it('preserves stdout JSON while supporting prompt filtering and --out in reuse mode', async () => {
    const temp = makeTempDir('zcodegraph-sufficiency-reuse-');
    tempDirs.push(temp);
    const repo = path.join(temp, 'repo');
    const ts = path.join(temp, 'ts');
    const rust = path.join(temp, 'rust');
    const prompts = path.join(temp, 'prompts.json');
    const out = path.join(temp, 'artifact.json');
    for (const dir of [repo, ts, rust]) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'flow.ts'),
        [
          'export function alpha() {',
          '  return beta();',
          '}',
          'export function beta() {',
          '  return 1;',
          '}',
        ].join('\n') + '\n',
      );
      const cg = CodeGraph.initSync(dir);
      await cg.indexAll({ force: true });
      cg.close();
    }
    fs.writeFileSync(
      prompts,
      JSON.stringify({
        fixture: [
          {
            id: 'FX-1',
            query: 'alpha beta',
            expected: ['alpha', 'beta'],
          },
          {
            id: 'FX-2',
            query: 'gamma delta',
            expected: ['gamma', 'delta'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--prompts',
        prompts,
        '--prompt-id',
        'FX-1',
        '--repo',
        `fixture=${repo}`,
        '--repo-pair',
        `fixture:typescript=${ts}`,
        '--repo-pair',
        `fixture:rust=${rust}`,
        '--out',
        out,
      ],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
          CODEGRAPH_NO_DAEMON: '1',
          CODEGRAPH_NO_RELAUNCH: '1',
        },
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const stdoutParsed = JSON.parse(result.stdout) as { status: string; results: Array<{ prompts: Array<{ id: string }> }> };
    const outParsed = JSON.parse(fs.readFileSync(out, 'utf-8')) as typeof stdoutParsed & {
      experimentMode: string;
      executionModel: string;
      target: { name: string; sourcePath: string };
      arms: {
        typescript: {
          sourceCopy: { path: string; mode: string; skipped: boolean };
          indexing: { status: string };
          graphAvailable: boolean;
          graphStats: Record<string, number> | null;
          lastProgress: null;
          command: { executable: string; args: string[]; cwd: string; env: Record<string, string> };
          diagnostics: unknown[];
        };
        rust: {
          sourceCopy: { path: string; mode: string; skipped: boolean };
          indexing: { status: string };
          graphAvailable: boolean;
          graphStats: Record<string, number> | null;
          lastProgress: null;
          command: { executable: string; args: string[]; cwd: string; env: Record<string, string> };
          diagnostics: unknown[];
        };
      };
      comparison: { status: string };
      classification: string;
      stages: { copy: { status: string }; typescriptIndex: { status: string }; rustIndex: { status: string } };
      results: Array<{ reuseIndexedPair: { typescript: { path: string }; rust: { path: string } } }>;
    };

    expect(stdoutParsed.status).toBe('completed');
    expect(stdoutParsed.results[0]?.prompts.map((prompt) => prompt.id)).toEqual(['FX-1']);
    expect(outParsed.experimentMode).toBe('full-index-ab');
    expect(outParsed.executionModel).toBe('sequential');
    expect(outParsed.target).toMatchObject({ name: 'fixture', sourcePath: repo });
    expect(outParsed.arms.typescript.sourceCopy).toMatchObject({ path: ts, mode: 'reuse-indexed-pair', skipped: true });
    expect(outParsed.arms.rust.sourceCopy).toMatchObject({ path: rust, mode: 'reuse-indexed-pair', skipped: true });
    expect(outParsed.arms.typescript.indexing.status).toBe('skipped');
    expect(outParsed.arms.rust.indexing.status).toBe('skipped');
    expect(outParsed.arms.typescript.graphAvailable).toBe(true);
    expect(outParsed.arms.rust.graphAvailable).toBe(true);
    expect(outParsed.arms.typescript.graphStats).not.toBeNull();
    expect(outParsed.arms.rust.graphStats).not.toBeNull();
    expect(outParsed.arms.typescript.lastProgress).toBeNull();
    expect(outParsed.arms.rust.lastProgress).toBeNull();
    expect(outParsed.arms.typescript.command.env).toEqual({
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
    });
    expect(outParsed.arms.rust.command.env).toMatchObject({
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE,
    });
    expect(Object.keys(outParsed.arms.rust.command.env).sort()).toEqual([
      'CODEGRAPH_ALLOW_UNSAFE_NODE',
      'CODEGRAPH_NO_DAEMON',
      'CODEGRAPH_NO_RELAUNCH',
      'ZCODEGRAPH_RUST_CORE_BINARY',
    ]);
    expect(outParsed.arms.typescript.diagnostics).toEqual([]);
    expect(outParsed.arms.rust.diagnostics).toEqual([]);
    expect(outParsed.comparison.status).toBe('completed');
    expect(outParsed.classification).toBe('success-comparison-completed');
    expect(outParsed.stages.copy.status).toBe('skipped');
    expect(outParsed.stages.typescriptIndex.status).toBe('skipped');
    expect(outParsed.stages.rustIndex.status).toBe('skipped');
    expect(outParsed.results[0]?.reuseIndexedPair.typescript.path).toBe(ts);
    expect(outParsed.results[0]?.reuseIndexedPair.rust.path).toBe(rust);
  }, 60_000);

  it('loads prompt definitions for repositories without built-in prompts before checking build artifacts', () => {
    const temp = makeTempDir('zcodegraph-sufficiency-prompts-');
    tempDirs.push(temp);
    const repo = path.join(temp, 'vscode-does-not-exist');
    const prompts = path.join(temp, 'prompts.json');
    fs.writeFileSync(
      prompts,
      JSON.stringify({
        vscode: [
          {
            id: 'VS-1',
            query: 'ExtensionHostMain MainThreadExtensionService',
            expected: ['ExtensionHostMain', 'MainThreadExtensionService'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--prompts', prompts, '--repo', `vscode=${repo}`],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).not.toContain('No built-in or configured prompts for repo name "vscode"');
  });

  it.runIf(fs.existsSync(RUST_CORE))('does not treat the explore query echo as expected-symbol evidence', () => {
    const temp = makeTempDir('zcodegraph-sufficiency-query-echo-');
    tempDirs.push(temp);
    const repo = path.join(temp, 'repo');
    fs.mkdirSync(repo, { recursive: true });
    fs.writeFileSync(
      path.join(repo, 'flow.ts'),
      [
        'export function present() {',
        '  return 1;',
        '}',
      ].join('\n') + '\n',
    );
    const prompts = path.join(temp, 'prompts.json');
    fs.writeFileSync(
      prompts,
      JSON.stringify({
        fixture: [
          {
            id: 'FX-echo',
            query: 'MissingSymbol present',
            expected: ['MissingSymbol', 'present'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--prompts', prompts, '--repo', `fixture=${repo}`],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
          CODEGRAPH_NO_DAEMON: '1',
          CODEGRAPH_NO_RELAUNCH: '1',
        },
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      results: Array<{
        prompts: Array<{
          typescript: { missingExpected: string[] };
          rust: { missingExpected: string[] };
        }>;
      }>;
    };

    expect(parsed.results[0]?.prompts[0]?.typescript.missingExpected).toContain('MissingSymbol');
    expect(parsed.results[0]?.prompts[0]?.rust.missingExpected).toContain('MissingSymbol');
  }, 60_000);

  it.runIf(fs.existsSync(RUST_CORE))('records JS/TS slice copy metadata in guardrail output', () => {
    const temp = makeTempDir('zcodegraph-sufficiency-slice-');
    tempDirs.push(temp);
    const repo = path.join(temp, 'repo');
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'package.json'), '{"name":"slice-fixture"}\n');
    fs.writeFileSync(
      path.join(repo, 'src', 'flow.ts'),
      [
        'export function alpha() {',
        '  return beta();',
        '}',
        'export function beta() {',
        '  return 1;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(path.join(repo, 'README.md'), '# ignored by JS/TS slice\n');
    const prompts = path.join(temp, 'prompts.json');
    fs.writeFileSync(
      prompts,
      JSON.stringify({
        fixture: [
          {
            id: 'FX-1',
            query: 'alpha beta',
            expected: ['alpha', 'beta'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--prompts', prompts, '--repo', `fixture=${repo}`],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
          CODEGRAPH_NO_DAEMON: '1',
          CODEGRAPH_NO_RELAUNCH: '1',
        },
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      results: Array<{
        copyMode: string;
        copies: {
          typescript: { copiedFiles: number };
          rust: { copiedFiles: number };
        };
      }>;
    };

    expect(parsed.results[0]?.copyMode).toBe('js-ts-config-slice');
    expect(parsed.results[0]?.copies.typescript.copiedFiles).toBe(2);
    expect(parsed.results[0]?.copies.rust.copiedFiles).toBe(2);
  });

  it('emits asymmetric blocker when only one indexed arm is available', async () => {
    const temp = makeTempDir('zcodegraph-sufficiency-single-arm-');
    tempDirs.push(temp);
    const repo = path.join(temp, 'repo');
    const ts = path.join(temp, 'ts');
    const prompts = path.join(temp, 'prompts.json');
    const out = path.join(temp, 'artifact.json');
    for (const dir of [repo, ts]) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'flow.ts'),
        [
          'export function alpha() {',
          '  return beta();',
          '}',
          'export function beta() {',
          '  return 1;',
          '}',
        ].join('\n') + '\n',
      );
    }
    const cg = CodeGraph.initSync(ts);
    await cg.indexAll({ force: true });
    cg.close();
    fs.writeFileSync(
      prompts,
      JSON.stringify({
        fixture: [
          {
            id: 'FX-1',
            query: 'alpha beta',
            expected: ['alpha', 'beta'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--prompts',
        prompts,
        '--repo',
        `fixture=${repo}`,
        '--repo-arm',
        `fixture:typescript=${ts}`,
        '--out',
        out,
      ],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
          CODEGRAPH_NO_DAEMON: '1',
          CODEGRAPH_NO_RELAUNCH: '1',
        },
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      status: string;
      arms: {
        typescript: { sourceCopy: { path: string; mode: string; skipped: boolean }; indexing: { status: string }; graphAvailable: boolean };
        rust: { sourceCopy: null; indexing: { status: string; reason: string }; graphAvailable: boolean; diagnostics: Array<{ kind: string }> };
      };
      comparison: { status: string; reason: string };
      classification: string;
      stages: { rustIndex: { status: string; reason: string } };
    };

    expect(parsed.status).toBe('completed');
    expect(parsed.arms.typescript.sourceCopy).toMatchObject({ path: ts, mode: 'reuse-indexed-arm', skipped: true });
    expect(parsed.arms.typescript.indexing.status).toBe('skipped');
    expect(parsed.arms.typescript.graphAvailable).toBe(true);
    expect(parsed.arms.rust.sourceCopy).toBeNull();
    expect(parsed.arms.rust.indexing.status).toBe('unavailable');
    expect(parsed.arms.rust.indexing.reason).toContain('Missing indexed project');
    expect(parsed.stages.rustIndex.status).toBe('unavailable');
    expect(parsed.stages.rustIndex.reason).toContain('Missing indexed project');
    expect(parsed.arms.rust.graphAvailable).toBe(false);
    expect(parsed.arms.rust.diagnostics[0]?.kind).toBe('missing-index');
    expect(parsed.comparison.status).toBe('unavailable');
    expect(parsed.classification).toBe('success-asymmetric-blocker');
  }, 60_000);

  it('emits asymmetric blocker when one indexing arm fails without discarding the other arm result', () => {
    const temp = makeTempDir('zcodegraph-sufficiency-asymmetric-');
    tempDirs.push(temp);
    const repo = path.join(temp, 'repo');
    fs.mkdirSync(repo, { recursive: true });
    fs.writeFileSync(
      path.join(repo, 'flow.ts'),
      [
        'export function alpha() {',
        '  return beta();',
        '}',
        'export function beta() {',
        '  return 1;',
        '}',
      ].join('\n') + '\n',
    );
    const prompts = path.join(temp, 'prompts.json');
    fs.writeFileSync(
      prompts,
      JSON.stringify({
        fixture: [
          {
            id: 'FX-1',
            query: 'alpha beta',
            expected: ['alpha', 'beta'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--prompts', prompts, '--repo', `fixture=${repo}`, '--fail-engine-index', 'rust'],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
          CODEGRAPH_NO_DAEMON: '1',
          CODEGRAPH_NO_RELAUNCH: '1',
        },
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      arms: {
        typescript: { indexing: { status: string }; graphAvailable: boolean; diagnostics: Array<{ kind: string }> };
        rust: { indexing: { status: string }; graphAvailable: boolean; graphStats: Record<string, number> | null };
      };
      comparison: { status: string; reason: string };
      classification: string;
    };

    expect(parsed.arms.typescript.indexing.status).toBe('completed');
    expect(parsed.arms.typescript.graphAvailable).toBe(true);
    expect(parsed.arms.rust.indexing.status).toBe('unavailable');
    expect(parsed.arms.rust.graphAvailable).toBe(false);
    expect(parsed.arms.rust.diagnostics[0]?.kind).toBe('process-error');
    expect(parsed.comparison.status).toBe('unavailable');
    expect(parsed.classification).toBe('success-asymmetric-blocker');
  });

  it('records independent per-arm source copies and excludes stale source indexes', () => {
    const temp = makeTempDir('zcodegraph-sufficiency-copy-isolation-');
    tempDirs.push(temp);
    const repo = path.join(temp, 'repo');
    fs.mkdirSync(path.join(repo, '.zcodegraph'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.zcodegraph', 'stale.txt'), 'must not be copied\n');
    fs.writeFileSync(path.join(repo, 'package.json'), '{"name":"copy-isolation-fixture"}\n');
    fs.writeFileSync(
      path.join(repo, 'src', 'flow.ts'),
      [
        'export function alpha() {',
        '  return beta();',
        '}',
        'export function beta() {',
        '  return 1;',
        '}',
      ].join('\n') + '\n',
    );
    const prompts = path.join(temp, 'prompts.json');
    fs.writeFileSync(
      prompts,
      JSON.stringify({
        fixture: [
          {
            id: 'FX-1',
            query: 'alpha beta',
            expected: ['alpha', 'beta'],
          },
        ],
      }),
    );

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--prompts', prompts, '--repo', `fixture=${repo}`, '--fail-engine-index', 'rust'],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
          CODEGRAPH_NO_DAEMON: '1',
          CODEGRAPH_NO_RELAUNCH: '1',
        },
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      arms: {
        typescript: { sourceCopy: { path: string; mode: string; copiedFiles: number; skipped: boolean } };
        rust: { sourceCopy: { path: string; mode: string; copiedFiles: number; skipped: boolean } };
      };
    };

    const tsCopy = parsed.arms.typescript.sourceCopy;
    const rustCopy = parsed.arms.rust.sourceCopy;
    expect(tsCopy.mode).toBe('js-ts-config-slice');
    expect(rustCopy.mode).toBe('js-ts-config-slice');
    expect(tsCopy.skipped).toBe(false);
    expect(rustCopy.skipped).toBe(false);
    expect(tsCopy.path).not.toBe(rustCopy.path);
    expect(tsCopy.copiedFiles).toBe(2);
    expect(rustCopy.copiedFiles).toBe(2);
    expect(fs.existsSync(path.join(tsCopy.path, '.zcodegraph', 'stale.txt'))).toBe(false);
    expect(fs.existsSync(path.join(rustCopy.path, '.zcodegraph', 'stale.txt'))).toBe(false);
  });
});
