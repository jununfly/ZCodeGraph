import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';
import { ToolHandler } from '../src/mcp/tools';

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
  const marker = path.join(dir, '.fake-rust-core-invoked');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      `require("fs").writeFileSync(${JSON.stringify(marker)}, JSON.stringify({ args, profiling: process.env.ZCODEGRAPH_PROFILING || null, experimentId: process.env.ZCODEGRAPH_EXPERIMENT_ID || null }) + "\\n");`,
      'if (!args.includes("index")) process.exit(2);',
      'process.stdout.write(JSON.stringify({ type: "progress", phase: "scanning", current: 0, total: 1 }) + "\\n");',
      'process.stdout.write(JSON.stringify({ type: "result", success: true, filesIndexed: 0, filesSkipped: 0, filesErrored: 0, nodesCreated: 0, edgesCreated: 0, errors: [], durationMs: 1 }) + "\\n");',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

function fakeRustCoreMarker(dir: string): string {
  return path.join(dir, '.fake-rust-core-invoked');
}

function writeFailingRustCore(dir: string): string {
  const script = path.join(dir, process.platform === 'win32' ? 'failing-rust-core.cjs' : 'failing-rust-core');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'process.stderr.write(JSON.stringify({ type: "error", message: "Rust core should not have been invoked" }) + "\\n");',
      'process.exit(70);',
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
    const rustCore = writeFailingRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
      expect(cg.getIndexBuildInfo()).toMatchObject({ engine: 'typescript' });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('runs the Rust subprocess when selected by CLI flag', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(fakeRustCoreMarker(tempDir))).toBe(true);
    expect(result.stderr).not.toContain('Failed to index');
  });

  it('passes graph work profile to the Rust subprocess when selected by CLI flag', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--engine', 'rust', '--graph-work-profile', 'matched-ts-js', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const marker = JSON.parse(fs.readFileSync(fakeRustCoreMarker(tempDir), 'utf-8')) as { args: string[] };
    expect(marker.args).toContain('--graph-work-profile');
    expect(marker.args).toContain('matched-ts-js');
  });

  it('uses production final-flush for Rust by default while keeping SQLite write mode overrides', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const defaultResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(defaultResult.status, `stdout:\n${defaultResult.stdout}\nstderr:\n${defaultResult.stderr}`).toBe(0);
    const defaultMarker = JSON.parse(fs.readFileSync(fakeRustCoreMarker(tempDir), 'utf-8')) as { args: string[] };
    expect(defaultMarker.args).toContain('--sqlite-write-mode');
    expect(defaultMarker.args).toContain('final-flush');

    fs.rmSync(fakeRustCoreMarker(tempDir), { force: true });
    const experimentResult = runCli(tempDir, ['index', '--engine', 'rust', '--sqlite-write-mode', 'memory-final-flush', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(experimentResult.status, `stdout:\n${experimentResult.stdout}\nstderr:\n${experimentResult.stderr}`).toBe(0);
    const experimentMarker = JSON.parse(fs.readFileSync(fakeRustCoreMarker(tempDir), 'utf-8')) as { args: string[] };
    expect(experimentMarker.args).toContain('--sqlite-write-mode');
    expect(experimentMarker.args).toContain('memory-final-flush');

    fs.rmSync(fakeRustCoreMarker(tempDir), { force: true });
    const diskResult = runCli(tempDir, ['index', '--engine', 'rust', '--sqlite-write-mode', 'disk', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(diskResult.status, `stdout:\n${diskResult.stdout}\nstderr:\n${diskResult.stderr}`).toBe(0);
    const diskMarker = JSON.parse(fs.readFileSync(fakeRustCoreMarker(tempDir), 'utf-8')) as { args: string[] };
    expect(diskMarker.args).toContain('--sqlite-write-mode');
    expect(diskMarker.args).toContain('disk');
  });

  it('passes heap profiling to the Rust subprocess when selected by CLI flag', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--engine', 'rust', '--profile', 'heap', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
      ZCODEGRAPH_EXPERIMENT_ID: 'cli-heap-profile',
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const marker = JSON.parse(fs.readFileSync(fakeRustCoreMarker(tempDir), 'utf-8')) as { args: string[]; profiling: string | null; experimentId: string | null };
    expect(marker.args).not.toContain('--profile');
    expect(marker.profiling).toBe('heap');
    expect(marker.experimentId).toBe('cli-heap-profile');
  });

  it('runs the Rust subprocess when selected by environment variable', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_INDEX_ENGINE: 'rust',
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(fakeRustCoreMarker(tempDir))).toBe(true);
    expect(result.stderr).not.toContain('Failed to index');
  });

  it('runs the packaged Rust subprocess from a bundle layout without an env override', () => {
    const bundle = path.join(tempDir, 'bundle');
    const packagedDist = path.join(bundle, 'lib', 'dist');
    fs.cpSync(path.resolve(__dirname, '..', 'dist'), packagedDist, { recursive: true });
    fs.copyFileSync(path.resolve(__dirname, '..', 'package.json'), path.join(bundle, 'lib', 'package.json'));
    const packagedBinDir = path.join(bundle, 'bin');
    fs.mkdirSync(packagedBinDir, { recursive: true });
    const rustCore = writeFakeRustCore(packagedBinDir);
    const packagedRustCore = path.join(packagedBinDir, process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core');
    fs.renameSync(rustCore, packagedRustCore);
    const packagedBin = path.join(packagedDist, 'bin', 'zcodegraph.js');

    const result = spawnSync(process.execPath, [packagedBin, 'index', '--engine', 'rust', '--quiet'], {
      cwd: tempDir,
      env: {
        ...process.env,
        CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
        CODEGRAPH_NO_DAEMON: '1',
        CODEGRAPH_NO_RELAUNCH: '1',
        NODE_PATH: path.resolve(__dirname, '..', 'node_modules'),
        ZCODEGRAPH_RUST_CORE_BINARY: undefined,
      },
      encoding: 'utf-8',
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(fakeRustCoreMarker(packagedBinDir))).toBe(true);
    expect(result.stderr).not.toContain('Rust index engine is unavailable');
  });

  it('rejects unsupported graph work profile values before indexing', () => {
    const rustCore = writeFailingRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--engine', 'rust', '--graph-work-profile', 'wide-open', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
    expect(result.stderr).toContain('Unsupported graph work profile');
    expect(fs.existsSync(fakeRustCoreMarker(tempDir))).toBe(false);
  });

  it('rejects unsupported profile values before indexing', () => {
    const rustCore = writeFailingRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--engine', 'rust', '--profile', 'cpu', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
    expect(result.stderr).toContain('Unsupported index profile');
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
    expect(result.stderr).toContain('Rust diagnostics:');
    expect(result.stderr).toContain('discovery source: env');
    expect(result.stderr).toContain(`attempted command: ${path.join(tempDir, 'missing-rust-core')}`);
    expect(result.stderr).toContain('active index preserved: yes');
    expect(result.stderr).toContain('next action: Set ZCODEGRAPH_RUST_CORE_BINARY');

    cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('writes a Rust-produced index and profile that TypeScript status can inspect', () => {
    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-index-profile.json');
    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      ZCODEGRAPH_INDEX_PROFILE_OUT: profileOut,
    });
    expect(indexResult.status).toBe(0);
    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: { sourceScanMs: number; parseExtractionMs: number; sqliteWriteMs: number };
      finalize: { referenceResolutionMs: number; dynamicDispatchSynthesisMs: number; dbMaintenanceMs: number };
      typescriptFinalizationMs: number;
    };
    expect(profile.rustCore).toMatchObject({
      sourceScanMs: expect.any(Number),
      parseExtractionMs: expect.any(Number),
      sqliteWriteMs: expect.any(Number),
    });
    expect(profile.finalize).toMatchObject({
      referenceResolutionMs: expect.any(Number),
      dynamicDispatchSynthesisMs: expect.any(Number),
      dbMaintenanceMs: expect.any(Number),
    });
    expect(profile.typescriptFinalizationMs).toEqual(expect.any(Number));

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

  it('resolves JS/TS relative and paths-alias imports as Rust-owned file-level edges', () => {
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@app/*': ['src/*'],
          },
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(srcDir, 'lib.ts'), 'export function libValue() { return 1; }\n');
    fs.writeFileSync(path.join(srcDir, 'alias-target.ts'), 'export function aliasValue() { return 2; }\n');
    fs.writeFileSync(
      path.join(srcDir, 'main.ts'),
      [
        'import { libValue } from "./lib";',
        'import { aliasValue } from "@app/alias-target";',
        'export function mainValue() {',
        '  return libValue() + aliasValue();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-import-profile.json');
    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      ZCODEGRAPH_INDEX_PROFILE_OUT: profileOut,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        boundaryProtocol: { rustOwnedStages: string[] };
      };
    };
    expect(profile.finalize.boundaryProtocol.rustOwnedStages).toContain('import-path-alias-resolution');

    const cg = CodeGraph.openSync(tempDir);
    try {
      const files = cg.getNodesByKind('file');
      const mainFile = files.find((node) => node.filePath === 'src/main.ts');
      const relativeTarget = files.find((node) => node.filePath === 'src/lib.ts');
      const aliasTarget = files.find((node) => node.filePath === 'src/alias-target.ts');
      expect(mainFile).toBeDefined();
      expect(relativeTarget).toBeDefined();
      expect(aliasTarget).toBeDefined();

      const imports = cg.getOutgoingEdges(mainFile!.id).filter((edge) => edge.kind === 'imports');
      expect(imports.some((edge) => edge.target === relativeTarget!.id)).toBe(true);
      expect(imports.some((edge) => edge.target === aliasTarget!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves same-file exact callable references as Rust-owned edges', () => {
    fs.writeFileSync(
      path.join(tempDir, 'local-calls.ts'),
      [
        'function localHelper() {',
        '  return 1;',
        '}',
        '',
        'export function localEntry() {',
        '  return localHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-local-reference-profile.json');
    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      ZCODEGRAPH_INDEX_PROFILE_OUT: profileOut,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: { boundaryProtocol: { rustOwnedStages: string[] } };
    };
    expect(profile.finalize.boundaryProtocol.rustOwnedStages).toContain('local-exact-reference-resolution');

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entry = cg.searchNodes('localEntry').find((match) => match.node.kind === 'function')?.node;
      const helper = cg.searchNodes('localHelper').find((match) => match.node.kind === 'function')?.node;
      expect(entry).toBeDefined();
      expect(helper).toBeDefined();

      const calls = cg.getOutgoingEdges(entry!.id).filter((edge) => edge.kind === 'calls');
      expect(calls.some((edge) => edge.target === helper!.id && edge.edgeOrigin === 'rust-finalization')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves direct ESM named imports to exported target-file symbols as Rust-owned edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'target.ts'),
      [
        'export function importedHelper() {',
        '  return 41;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        'import { importedHelper } from "./target";',
        'export function importedEntry() {',
        '  return importedHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-esm-named-import-profile.json');
    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      ZCODEGRAPH_INDEX_PROFILE_OUT: profileOut,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: { boundaryProtocol: { rustOwnedStages: string[] } };
    };
    expect(profile.finalize.boundaryProtocol.rustOwnedStages).toContain('esm-named-import-export-resolution');

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entry = cg.searchNodes('importedEntry').find((match) => match.node.kind === 'function')?.node;
      const helper = cg.searchNodes('importedHelper').find((match) => match.node.kind === 'function' && match.node.filePath === 'src/target.ts')?.node;
      expect(entry).toBeDefined();
      expect(helper).toBeDefined();

      const calls = cg.getOutgoingEdges(entry!.id).filter((edge) => edge.kind === 'calls');
      expect(calls.some((edge) => edge.target === helper!.id && edge.edgeOrigin === 'rust-finalization')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves paths-alias ESM named imports to exported target-file symbols as Rust-owned edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@app/*': ['src/*'],
          },
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'alias-target.ts'),
      [
        'export function aliasedHelper() {',
        '  return 41;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        'import { aliasedHelper } from "@app/alias-target";',
        'export function aliasedEntry() {',
        '  return aliasedHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entry = cg.searchNodes('aliasedEntry').find((match) => match.node.kind === 'function')?.node;
      const helper = cg.searchNodes('aliasedHelper').find((match) => match.node.kind === 'function' && match.node.filePath === 'src/alias-target.ts')?.node;
      expect(entry).toBeDefined();
      expect(helper).toBeDefined();

      const calls = cg.getOutgoingEdges(entry!.id).filter((edge) => edge.kind === 'calls');
      expect(calls.some((edge) => edge.target === helper!.id && edge.edgeOrigin === 'rust-finalization')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('reports Rust index-engine metadata through MCP status', async () => {
    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const handler = new ToolHandler(cg);
      const result = await handler.execute('zcodegraph_status', {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('**Index engine:** rust');
      expect(result.content[0].text).toContain('**Index engine version:** 0.1.0');
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

  it('skips unsupported Phase 1 languages while indexing supported files', () => {
    fs.writeFileSync(
      path.join(tempDir, 'supported.ts'),
      [
        'export function supportedSymbol() {',
        '  return 7;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# not indexed by the Rust Phase 1 engine\n');

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
      filesIndexed: number;
      filesSkipped: number;
      filesErrored: number;
      errors: Array<{ message: string }>;
    };
    expect(result.filesIndexed).toBeGreaterThanOrEqual(2);
    expect(result.filesSkipped).toBe(0);
    expect(result.filesErrored).toBe(0);
    expect(result.errors).toEqual([]);

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('supportedSymbol').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('README.md').some((match) => match.node.kind === 'file')).toBe(false);
      expect(cg.getStats().filesByLanguage).not.toHaveProperty('markdown');
    } finally {
      cg.close();
    }
  }, 30_000);

  it('serves Rust-produced indexes through MCP search and graph tools', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'callee.ts'),
      [
        'export function mcpHelper() {',
        '  return 42;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'caller.ts'),
      [
        'import { mcpHelper } from "./callee";',
        'export function mcpEntry() {',
        '  return mcpHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const handler = new ToolHandler(cg);
      const search = await handler.execute('zcodegraph_search', { query: 'mcpHelper' });
      expect(search.isError).toBeFalsy();
      expect(search.content[0].text).toContain('mcpHelper');

      const callers = await handler.execute('zcodegraph_callers', { symbol: 'mcpHelper' });
      expect(callers.isError).toBeFalsy();
      expect(callers.content[0].text).toContain('mcpEntry');

      const callees = await handler.execute('zcodegraph_callees', { symbol: 'mcpEntry' });
      expect(callees.isError).toBeFalsy();
      expect(callees.content[0].text).toContain('mcpHelper');
    } finally {
      cg.close();
    }
  }, 30_000);

  it('treats exported arrow-function constants as callable functions in Rust-produced indexes', () => {
    fs.writeFileSync(
      path.join(tempDir, 'renderer.ts'),
      [
        'const localImpl = () => {',
        '  return 1;',
        '};',
        '',
        'export const renderPublic = () => {',
        '  return localImpl();',
        '};',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'canvas.ts'),
      [
        'import { renderPublic } from "./renderer";',
        'export function StaticCanvas() {',
        '  return renderPublic();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const renderPublic = cg.searchNodes('renderPublic').find((match) => match.node.kind === 'function')?.node;
      const localImpl = cg.searchNodes('localImpl').find((match) => match.node.kind === 'function')?.node;
      const staticCanvas = cg.searchNodes('StaticCanvas').find((match) => match.node.kind === 'function')?.node;
      expect(renderPublic).toBeDefined();
      expect(localImpl).toBeDefined();
      expect(staticCanvas).toBeDefined();

      expect(cg.getCallees(staticCanvas!.id).some((entry) => entry.node.id === renderPublic!.id)).toBe(true);
      expect(cg.getCallees(renderPublic!.id).some((entry) => entry.node.id === localImpl!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('treats class field arrow callbacks as callable methods in Rust-produced indexes', () => {
    fs.writeFileSync(
      path.join(tempDir, 'scene.ts'),
      [
        'type Callback = () => void;',
        'export class Scene {',
        '  private callbacks = new Set<Callback>();',
        '  triggerUpdate() {',
        '    for (const callback of Array.from(this.callbacks)) {',
        '      callback();',
        '    }',
        '  }',
        '  onUpdate(cb: Callback) {',
        '    this.callbacks.add(cb);',
        '  }',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'app.ts'),
      [
        'import { Scene } from "./scene";',
        'export class App extends React.Component {',
        '  scene = new Scene();',
        '  triggerRender = () => {',
        '    this.setState({});',
        '  };',
        '  render() {',
        '    return null;',
        '  }',
        '  mount() {',
        '    this.scene.onUpdate(this.triggerRender);',
        '  }',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const triggerUpdate = cg.searchNodes('triggerUpdate').find((match) => match.node.kind === 'method')?.node;
      const triggerRender = cg.searchNodes('triggerRender').find((match) => match.node.kind === 'method')?.node;
      const render = cg.searchNodes('render').find((match) => match.node.kind === 'method')?.node;
      const app = cg.searchNodes('App').find((match) => match.node.kind === 'class')?.node;
      expect(app).toBeDefined();
      expect(triggerUpdate).toBeDefined();
      expect(triggerRender).toBeDefined();
      expect(render).toBeDefined();

      expect(cg.getCallees(triggerUpdate!.id).some((entry) => (
        entry.node.id === triggerRender!.id &&
        entry.edge.kind === 'calls' &&
        entry.edge.edgeOrigin === 'heuristic'
      ))).toBe(true);
      expect(cg.getCallees(triggerRender!.id).some((entry) => (
        entry.node.id === render!.id &&
        entry.edge.kind === 'calls' &&
        entry.edge.edgeOrigin === 'heuristic'
      ))).toBe(true);
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

      const localHelper = cg.searchNodes('localHelper').find((match) => match.node.kind === 'function')!.node;
      const exportedHelper = cg.searchNodes('exportedHelper').find((match) => match.node.kind === 'function')!.node;
      const loadUser = cg.searchNodes('loadUser').find((match) => match.node.kind === 'function')!.node;
      const dashboard = cg.searchNodes('Dashboard').find((match) => match.node.kind === 'component')!.node;
      const profileCard = cg.searchNodes('ProfileCard').find((match) => match.node.kind === 'component')!.node;

      expect(cg.getCallers(localHelper.id).some((entry) => entry.node.id === exportedHelper.id)).toBe(true);
      expect(cg.getCallees(exportedHelper.id).some((entry) => entry.node.id === localHelper.id)).toBe(true);
      expect(cg.getCallers(loadUser.id).some((entry) => entry.node.id === localHelper.id)).toBe(true);
      expect(cg.getCallees(dashboard.id).some((entry) => entry.node.id === profileCard.id)).toBe(true);

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

  it('resolves Rust-extracted cross-file references through TypeScript graph queries', () => {
    fs.writeFileSync(
      path.join(tempDir, 'callee.ts'),
      [
        'export function sharedHelper() {',
        '  return 42;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'caller.ts'),
      [
        'import { sharedHelper } from "./callee";',
        'export function runFeature() {',
        '  return sharedHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const helper = cg.searchNodes('sharedHelper').find((match) => match.node.kind === 'function')?.node;
      const caller = cg.searchNodes('runFeature').find((match) => match.node.kind === 'function')?.node;
      expect(helper).toBeDefined();
      expect(caller).toBeDefined();

      expect(cg.getCallers(helper!.id).some((entry) => entry.node.id === caller!.id)).toBe(true);
      expect(cg.getCallees(caller!.id).some((entry) => entry.node.id === helper!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('runs dynamic synthesizers after Rust extraction so JSX child edges are queryable', () => {
    fs.writeFileSync(
      path.join(tempDir, 'Child.tsx'),
      [
        'export function ChildWidget() {',
        '  return <span />;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'Parent.tsx'),
      [
        'import { ChildWidget } from "./Child";',
        'export function ParentWidget() {',
        '  return <ChildWidget />;',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const parent = cg.searchNodes('ParentWidget').find((match) => match.node.kind === 'component')?.node;
      const child = cg.searchNodes('ChildWidget').find((match) => match.node.kind === 'component')?.node;
      expect(parent).toBeDefined();
      expect(child).toBeDefined();

      const childEdges = cg.getCallees(parent!.id);
      expect(childEdges.some((entry) => entry.node.id === child!.id && entry.edge.kind === 'calls')).toBe(true);
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
