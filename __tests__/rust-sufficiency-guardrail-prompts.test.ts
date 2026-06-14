import { describe, expect, it, afterEach, beforeAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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
    expect(result.stdout).toContain('Names with built-in prompts: zcodegraph, excalidraw, zustand');
    expect(result.stdout).toContain('JavaScript/TypeScript/config slice');
  });

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
});
