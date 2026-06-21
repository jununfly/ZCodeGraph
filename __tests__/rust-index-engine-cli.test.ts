import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';
import { ToolHandler } from '../src/mcp/tools';
import { buildRustHybridMetadataFromPlan, mergeRustOwnedGapDiagnostics, planRustHybridAssignments } from '../src/indexing/rust-hybrid-contract';

const BIN = path.resolve(__dirname, '../dist/bin/zcodegraph.js');
const RUST_CORE_BIN = path.resolve(
  __dirname,
  '..',
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

const FINALIZATION_DIAGNOSTIC_BUCKETS = [
  'databaseAccessMs',
  'cacheWarmupDbMs',
  'refHydrationDbMs',
  'unresolvedReadDbMs',
  'candidateLookupMs',
  'sharedCandidateLookupMs',
  'nameMatcherCandidateLookupDbMs',
  'perReferenceDisambiguationMs',
  'candidateReplayEligibleRefs',
  'candidateReplayComparedRefs',
  'candidateReplayEquivalentRefs',
  'candidateReplayMismatchRefs',
  'edgeMaterializationMs',
  'edgeMaterializationDbMs',
  'edgeEndpointValidationDbMs',
  'edgeInsertCount',
  'edgeInsertSerializationMs',
  'edgeInsertSerializedBytes',
  'edgeWriteMs',
  'edgeWriteDbMs',
  'unresolvedCleanupMs',
  'unresolvedCleanupDbMs',
  'resolvedCleanupMs',
  'resolvedCleanupDbMs',
  'resolvedCleanupRowCount',
  'intentionallyUnresolvedCleanupMs',
  'intentionallyUnresolvedCleanupDbMs',
  'intentionallyUnresolvedCleanupRowCount',
] as const;

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

function writeFakeRustCoreWithPerFileGap(dir: string, filePath: string, code = 'rust-owned-parse-gap'): string {
  const script = path.join(dir, process.platform === 'win32' ? 'fake-rust-core-gap.cjs' : 'fake-rust-core-gap');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      'if (!args.includes("index")) process.exit(2);',
      'process.stdout.write(JSON.stringify({ type: "progress", phase: "scanning", current: 0, total: 1 }) + "\\n");',
      'process.stdout.write(JSON.stringify({',
      '  type: "result",',
      '  success: true,',
      '  filesIndexed: 1,',
      '  filesSkipped: 0,',
      '  filesErrored: 1,',
      '  nodesCreated: 0,',
      '  edgesCreated: 0,',
      '  errors: [{',
      `    filePath: ${JSON.stringify(filePath)},`,
      '    language: "typescript",',
      `    code: ${JSON.stringify(code)},`,
      '    severity: "warning",',
      '    writtenByRust: false,',
      '    line: 1,',
      '    column: 1,',
      '    message: "fake Rust-owned parse gap"',
      '  }],',
      '  durationMs: 1',
      '}) + "\\n");',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

function writeFakeRustCoreWithPartialWriteGap(dir: string, filePath: string): string {
  const script = path.join(dir, process.platform === 'win32' ? 'fake-rust-core-partial-gap.cjs' : 'fake-rust-core-partial-gap');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      'if (!args.includes("index")) process.exit(2);',
      'process.stdout.write(JSON.stringify({',
      '  type: "result",',
      '  success: true,',
      '  filesIndexed: 1,',
      '  filesSkipped: 0,',
      '  filesErrored: 1,',
      '  nodesCreated: 0,',
      '  edgesCreated: 0,',
      '  errors: [{',
      `    filePath: ${JSON.stringify(filePath)},`,
      '    language: "typescript",',
      '    code: "rust-owned-parse-gap",',
      '    severity: "warning",',
      '    writtenByRust: true,',
      '    message: "fake partial Rust write gap"',
      '  }],',
      '  durationMs: 1',
      '}) + "\\n");',
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

  it('uses the rust-hybrid indexer by default', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(fakeRustCoreMarker(tempDir))).toBe(true);
    expect(result.stderr).not.toContain('Failed to index');
  });

  it('keeps the TypeScript indexer as an explicit escape hatch', () => {
    const rustCore = writeFailingRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--engine', 'typescript', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(fakeRustCoreMarker(tempDir))).toBe(false);
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

  it('rejects stale CLI engine selection from the environment', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_INDEX_ENGINE: 'typescript',
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
    expect(result.stderr).toContain('ZCODEGRAPH_INDEX_ENGINE is no longer supported');
    expect(result.stderr).toContain('zcodegraph index --engine typescript');
    expect(fs.existsSync(fakeRustCoreMarker(tempDir))).toBe(false);
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
    expect(result.stderr).toContain('typescript, rust, rust-hybrid');
  });

  it('indexes ordinary Go files under rust-hybrid', () => {
    fs.writeFileSync(path.join(tempDir, 'server.go'), 'package main\nfunc main() {}\n');

    const result = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getStats().filesByLanguage.go).toBe(1);
      expect(cg.searchNodes('main').some((match) => match.node.kind === 'function' && match.node.language === 'go')).toBe(true);
      expect(cg.getIndexBuildInfo()).toMatchObject({ engine: 'rust-hybrid' });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('plans Rust-owned and TypeScript fallback files for rust-hybrid', () => {
    fs.writeFileSync(path.join(tempDir, 'server.go'), 'package main\nfunc main() {}\n');
    fs.writeFileSync(path.join(tempDir, 'routing.yml'), 'app:\n  path: /health\n');
    fs.writeFileSync(path.join(tempDir, 'notes.txt'), 'not source\n');
    fs.writeFileSync(path.join(tempDir, 'service.pb.go'), 'package main\n');

    const plan = planRustHybridAssignments(tempDir);

    expect(plan.rustOwnedFiles).toContain('a.ts');
    expect(plan.rustOwnedFiles).toContain('server.go');
    expect(plan.fallbackFiles).toContain('routing.yml');
    expect(plan.unsupportedFiles).toEqual([]);
    expect(plan.fallbackFiles).not.toContain('notes.txt');
    expect(plan.engineByLanguage).toMatchObject({ typescript: 'rust', go: 'rust', yaml: 'typescript' });
    expect(plan.engineByFileCount).toMatchObject({ rust: 2, typescript: 1 });
    expect(plan.fallbackByLanguage).toMatchObject({ yaml: 1 });
    expect(plan.fallbackFileCount).toBe(1);
    expect(plan.skippedGeneratedByLanguage.go).toBe(1);
    expect(plan.fallbackState).toBe('degraded');
    expect(plan.fallbackReasonTaxonomy).toMatchObject({ 'language-level-typescript-fallback': 1 });
    expect(plan.pendingFallbacks).toContain('rust-owned-parse-gap');
  });

  it('merges Rust-owned per-file gap diagnostics into degraded rust-hybrid metadata', () => {
    const plan = planRustHybridAssignments(tempDir);
    const merged = mergeRustOwnedGapDiagnostics(plan, [
      {
        filePath: 'a.ts',
        language: 'typescript',
        code: 'rust-owned-parse-gap',
        severity: 'warning',
        writtenByRust: false,
      },
    ]);

    const metadata = buildRustHybridMetadataFromPlan(merged);

    expect(merged.fallbackFiles).toContain('a.ts');
    expect(metadata).toMatchObject({
      fallbackState: 'degraded',
      fallbackByLanguage: { typescript: 1 },
      fallbackFileCount: 1,
      fallbackReasonTaxonomy: { 'rust-owned-parse-gap': 1 },
      pendingFallbacks: [],
    });
    expect(metadata.fallbackMessage).toContain('Rust-owned gap fallback appended 1 file');
  });

  it('indexes non-Rust-owned supported languages through TypeScript fallback under rust-hybrid', () => {
    fs.writeFileSync(path.join(tempDir, 'worker.py'), 'def worker():\n    return 1\n');

    const result = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getStats().filesByLanguage.python).toBe(1);
      expect(cg.searchNodes('worker').some((match) => match.node.kind === 'function' && match.node.language === 'python')).toBe(true);
      const buildInfo = cg.getIndexBuildInfo();
      expect(buildInfo.engine).toBe('rust-hybrid');
      expect(buildInfo.hybrid).toMatchObject({
        fallbackState: 'degraded',
        fallbackByLanguage: { python: 1 },
        fallbackFileCount: 1,
        pendingFallbacks: ['rust-owned-parse-gap'],
      });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('appends TypeScript fallback for Rust-owned per-file gaps from a successful Rust core', () => {
    const rustCore = writeFakeRustCoreWithPerFileGap(tempDir, 'a.ts');

    const result = runCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.kind === 'function' && match.node.language === 'typescript')).toBe(true);
      const buildInfo = cg.getIndexBuildInfo();
      expect(buildInfo.engine).toBe('rust-hybrid');
      expect(buildInfo.hybrid).toMatchObject({
        fallbackState: 'degraded',
        fallbackByLanguage: { typescript: 1 },
        fallbackFileCount: 1,
        fallbackReasonTaxonomy: { 'rust-owned-parse-gap': 1 },
        pendingFallbacks: [],
      });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('reports recovered Rust-owned parse gaps consistently in CLI output and errors log', () => {
    const rustCore = writeFakeRustCoreWithPerFileGap(tempDir, 'a.ts');

    const result = runCli(tempDir, ['index', '--engine', 'rust-hybrid'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('recovered by fallback');
    expect(result.stdout).not.toContain('could not be parsed');
    expect(result.stdout).toContain('Fallback warning breakdown');
    expect(result.stdout).toContain('Rust-owned files recovered by TypeScript fallback');

    const errorsLog = fs.readFileSync(path.join(tempDir, '.zcodegraph', 'errors.log'), 'utf-8');
    expect(errorsLog).toContain('0 files with errors');
    expect(errorsLog).toContain('1 file with recovered fallback warnings');
    expect(errorsLog).toContain('Recovered fallback warnings:');
    expect(errorsLog).toContain('a.ts:1:1: fake Rust-owned parse gap [rust-owned-parse-gap]');

    const cg = CodeGraph.openSync(tempDir);
    try {
      const buildInfo = cg.getIndexBuildInfo();
      expect(buildInfo.hybrid).toMatchObject({
        fallbackState: 'degraded',
        fallbackFileCount: 1,
        fallbackReasonTaxonomy: { 'rust-owned-parse-gap': 1 },
      });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('does not append fallback when a Rust-owned gap may have partial graph writes', () => {
    const rustCore = writeFakeRustCoreWithPartialWriteGap(tempDir, 'a.ts');

    const result = runCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.language === 'typescript')).toBe(false);
      const buildInfo = cg.getIndexBuildInfo();
      expect(buildInfo.engine).toBe('rust-hybrid');
      expect(buildInfo.hybrid).toMatchObject({
        fallbackState: 'degraded',
        fallbackByLanguage: {},
        fallbackFileCount: 0,
        fallbackReasonTaxonomy: { 'rust-owned-gap-with-partial-write-blocked': 1 },
      });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('prints a concise fallback summary when rust-hybrid appends fallback files', () => {
    fs.writeFileSync(path.join(tempDir, 'worker.py'), 'def worker():\n    return 1\n');

    const result = runCli(tempDir, ['index'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('TypeScript fallback files');
    expect(result.stdout).toContain('Fallback health: degraded');
    expect(result.stdout).toContain('zcodegraph doctor --engine rust-hybrid --bundle --last-run');
  }, 30_000);

  it('appends fallback files without clearing existing graph data or stamping TypeScript metadata', async () => {
    const cg = CodeGraph.openSync(tempDir);
    try {
      const initial = await cg.indexFiles(['a.ts']);
      expect(initial.success, JSON.stringify(initial.errors, null, 2)).toBe(true);
      expect(cg.searchNodes('alpha').some((match) => match.node.language === 'typescript')).toBe(true);

      fs.writeFileSync(path.join(tempDir, 'worker.py'), 'def worker():\n    return 1\n');
      const appended = await cg.indexFallbackFiles(['worker.py']);

      expect(appended.success).toBe(true);
      expect(appended.fallbackFileCount).toBe(1);
      expect(appended.errorTaxonomy).toEqual({});
      expect(cg.searchNodes('alpha').some((match) => match.node.language === 'typescript')).toBe(true);
      expect(cg.searchNodes('worker').some((match) => match.node.language === 'python')).toBe(true);
      expect(cg.getIndexBuildInfo().engine).not.toBe('typescript');
    } finally {
      cg.close();
    }
  }, 30_000);

  it('counts generated Go files in rust-hybrid metadata', () => {
    fs.writeFileSync(path.join(tempDir, 'service.pb.go'), 'package main\n');

    const result = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const statusResult = runCli(tempDir, ['status', '--json']);
    expect(statusResult.status).toBe(0);
    const statusLine = statusResult.stdout.trim().split('\n').filter(Boolean).pop();
    expect(statusLine).toBeDefined();
    const status = JSON.parse(statusLine!) as {
      index: {
        hybrid: {
          rustOwnedLanguages: string[];
          skippedGeneratedByLanguage: Record<string, number>;
        };
      };
    };
    expect(status.index.hybrid.rustOwnedLanguages).toContain('go');
    expect(status.index.hybrid.skippedGeneratedByLanguage.go).toBe(1);
  }, 30_000);

  it('allows mixed-language projects through the TypeScript escape hatch', () => {
    const rustCore = writeFailingRustCore(tempDir);
    fs.writeFileSync(path.join(tempDir, 'server.go'), 'package main\nfunc main() {}\n');

    const result = runCli(tempDir, ['index', '--engine', 'typescript', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(fakeRustCoreMarker(tempDir))).toBe(false);
  }, 30_000);

  it('uses rust-hybrid for init indexing by default', () => {
    const initDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-hybrid-init-'));
    try {
      fs.writeFileSync(path.join(initDir, 'a.ts'), 'export const initValue = 1;\n');
      const rustCore = writeFakeRustCore(initDir);

      const result = runCli(initDir, ['init'], {
        ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
      });

      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
      expect(fs.existsSync(fakeRustCoreMarker(initDir))).toBe(true);
    } finally {
      fs.rmSync(initDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('does not accept the historical init --index flag', () => {
    const initDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-hybrid-init-flag-'));
    try {
      fs.writeFileSync(path.join(initDir, 'a.ts'), 'export const initValue = 1;\n');
      const rustCore = writeFakeRustCore(initDir);

      const result = runCli(initDir, ['init', '-i'], {
        ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
      });

      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
      expect(result.stderr).toContain('unknown option');
      expect(result.stderr).toContain('-i');
      expect(fs.existsSync(fakeRustCoreMarker(initDir))).toBe(false);
    } finally {
      fs.rmSync(initDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('allows init indexing to use the TypeScript escape hatch', () => {
    const initDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-typescript-init-'));
    try {
      fs.writeFileSync(path.join(initDir, 'a.ts'), 'export const initValue = 1;\n');
      const rustCore = writeFailingRustCore(initDir);

      const result = runCli(initDir, ['init', '--engine', 'typescript'], {
        ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
      });

      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
      expect(fs.existsSync(fakeRustCoreMarker(initDir))).toBe(false);
      const cg = CodeGraph.openSync(initDir);
      try {
        expect(cg.getIndexBuildInfo()).toMatchObject({ engine: 'typescript' });
      } finally {
        cg.close();
      }
    } finally {
      fs.rmSync(initDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('does not require Rust core when init exits early for an already initialized project', () => {
    const rustCore = writeFailingRustCore(tempDir);

    const result = runCli(tempDir, ['init'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('Already initialized');
    expect(fs.existsSync(fakeRustCoreMarker(tempDir))).toBe(false);
  });

  it('leaves the existing TypeScript index intact when the Rust binary is unavailable', async () => {
    let cg = CodeGraph.openSync(tempDir);
    await cg.indexAll({ engine: 'typescript' });
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

  it('prints the rust-hybrid failure doctor hint when the Rust binary is unavailable', async () => {
    const cg = CodeGraph.openSync(tempDir);
    try {
      await cg.indexAll({ engine: 'typescript' });
    } finally {
      cg.close();
    }

    const result = runCli(tempDir, ['index', '--engine', 'rust-hybrid', '--force'], {
      ZCODEGRAPH_RUST_CORE_BINARY: path.join(tempDir, 'missing-rust-core'),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Rust-hybrid indexing failed before fallback could safely continue.');
    expect(result.stderr).toContain('Previous index was preserved.');
    expect(result.stderr).toContain('zcodegraph doctor --engine rust-hybrid --bundle --last-failure');
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
      finalize: {
        referenceResolutionMs: number;
        dynamicDispatchSynthesisMs: number;
        dbMaintenanceMs: number;
        referenceResolutionBreakdown: Record<string, number>;
      };
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
    for (const bucket of FINALIZATION_DIAGNOSTIC_BUCKETS) {
      expect(profile.finalize.referenceResolutionBreakdown[bucket]).toEqual(expect.any(Number));
    }
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

  it('writes rust-hybrid status metadata for a default rust-hybrid index', () => {
    const indexResult = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const statusResult = runCli(tempDir, ['status', '--json']);
    expect(statusResult.status).toBe(0);
    const statusLine = statusResult.stdout.trim().split('\n').filter(Boolean).pop();
    expect(statusLine).toBeDefined();
    const status = JSON.parse(statusLine!) as {
      index: {
        engine: string | null;
        hybrid: {
          phase: string;
          rustOwnedLanguages: string[];
          engineByLanguage: Record<string, string>;
          engineByFileCount: Record<string, number>;
          fallbackByLanguage: Record<string, number>;
          fallbackFileCount: number;
          fallbackState: string;
          fallbackMessage: string;
          fallbackReasonTaxonomy: Record<string, number>;
          pendingFallbacks: string[];
          skippedGeneratedByLanguage: Record<string, number>;
        } | null;
      };
    };

    expect(status.index.engine).toBe('rust-hybrid');
    expect(status.index.hybrid).toMatchObject({
      phase: 'phase-6-rust-owned-per-file-gap-fallback',
      rustOwnedLanguages: ['javascript', 'jsx', 'typescript', 'tsx', 'go'],
      engineByLanguage: { typescript: 'rust' },
      engineByFileCount: { rust: 1 },
      fallbackByLanguage: {},
      fallbackFileCount: 0,
      fallbackState: 'healthy',
      fallbackReasonTaxonomy: {},
      pendingFallbacks: ['rust-owned-parse-gap'],
      skippedGeneratedByLanguage: {},
    });
    expect(status.index.hybrid?.fallbackMessage).toContain('No TypeScript fallback files');
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

  it('resolves JS/TS conventional aliases and workspace package imports as Rust-owned file-level edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'app'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'packages/ui/widgets'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'tools/logger'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'root', private: true, workspaces: ['packages/*'] }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), "packages:\n  - 'tools/*'\n");
    fs.writeFileSync(
      path.join(tempDir, 'packages/ui/package.json'),
      JSON.stringify({ name: '@scope/ui', version: '1.0.0' }, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'tools/logger/package.json'),
      JSON.stringify({ name: '@tools/logger', version: '1.0.0' }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'src/alias-target.ts'), 'export const aliasValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'app/service.ts'), 'export const serviceValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'packages/ui/widgets/index.ts'), 'export const widgetValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'tools/logger/index.ts'), 'export const loggerValue = 1;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src/main.ts'),
      [
        'import { aliasValue } from "@/alias-target";',
        'import { serviceValue } from "app/service";',
        'import { widgetValue } from "@scope/ui/widgets";',
        'import { loggerValue } from "@tools/logger";',
        'export const total = aliasValue + serviceValue + widgetValue + loggerValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-import-parity-profile.json');
    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      ZCODEGRAPH_INDEX_PROFILE_OUT: profileOut,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: {
        importPathAliasResolvedRefs: number;
        importPathAliasUnresolvedFallbackRefs: number;
        importPathAliasResolvedBySource: {
          conventionalAlias: number;
          workspacePackage: number;
        };
        importPathAliasFallbackBySource: {
          conventionalAlias: number;
          workspacePackage: number;
        };
      };
    };
    expect(profile.rustCore.importPathAliasResolvedRefs).toBeGreaterThanOrEqual(4);
    expect(profile.rustCore.importPathAliasUnresolvedFallbackRefs).toBe(0);
    expect(profile.rustCore.importPathAliasResolvedBySource).toMatchObject({
      conventionalAlias: 2,
      workspacePackage: 2,
    });
    expect(profile.rustCore.importPathAliasFallbackBySource).toMatchObject({
      conventionalAlias: 0,
      workspacePackage: 0,
    });

    const cg = CodeGraph.openSync(tempDir);
    try {
      const files = cg.getNodesByKind('file');
      const mainFile = files.find((node) => node.filePath === 'src/main.ts');
      const targets = new Set(
        cg.getOutgoingEdges(mainFile!.id)
          .filter((edge) => edge.kind === 'imports')
          .map((edge) => files.find((node) => node.id === edge.target)?.filePath)
          .filter(Boolean),
      );
      expect(targets).toEqual(new Set([
        'app/service.ts',
        'packages/ui/widgets/index.ts',
        'src/alias-target.ts',
        'tools/logger/index.ts',
      ]));
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves only relative JS source specifiers to TypeScript source candidates', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src/exact'), { recursive: true });
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
    fs.writeFileSync(path.join(tempDir, 'src/only-ts.ts'), 'export const onlyTs = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src/view.tsx'), 'export const view = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src/module.ts'), 'export const moduleValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src/common.ts'), 'export const commonValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src/exact/literal.js'), 'export const literal = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src/exact/literal.ts'), 'export const literal = 2;\n');
    fs.writeFileSync(path.join(tempDir, 'src/alias-only.ts'), 'export const aliasOnly = 1;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src/main.ts'),
      [
        'import { onlyTs } from "./only-ts.js";',
        'import { view } from "./view.js";',
        'import { moduleValue } from "./module.mjs";',
        'import { commonValue } from "./common.cjs";',
        'import { literal } from "./exact/literal.js";',
        'import styles from "./style.css";',
        'import { aliasOnly } from "@app/alias-only.js";',
        'export const total = onlyTs + view + moduleValue + commonValue + literal + String(styles) + aliasOnly;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-relative-js-source-profile.json');
    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      ZCODEGRAPH_INDEX_PROFILE_OUT: profileOut,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: {
        importPathAliasResolvedBySource: { relative: number; tsconfigPaths: number };
        importPathAliasFallbackSampleCounts: Record<string, number>;
      };
    };
    expect(profile.rustCore.importPathAliasResolvedBySource.relative).toBe(5);
    expect(profile.rustCore.importPathAliasResolvedBySource.tsconfigPaths).toBe(0);
    expect(profile.rustCore.importPathAliasFallbackSampleCounts).toMatchObject({
      'relative/target-not-found': 1,
      'tsconfigPaths/tsconfig-path-target-not-found': 1,
    });

    const cg = CodeGraph.openSync(tempDir);
    try {
      const files = cg.getNodesByKind('file');
      const mainFile = files.find((node) => node.filePath === 'src/main.ts');
      expect(mainFile).toBeDefined();
      const targets = new Set(
        cg.getOutgoingEdges(mainFile!.id)
          .filter((edge) => edge.kind === 'imports')
          .map((edge) => files.find((node) => node.id === edge.target)?.filePath)
          .filter(Boolean),
      );
      expect(targets).toEqual(new Set([
        'src/common.ts',
        'src/exact/literal.js',
        'src/module.ts',
        'src/only-ts.ts',
        'src/view.tsx',
      ]));
      expect(targets.has('src/exact/literal.ts')).toBe(false);
      expect(targets.has('src/alias-only.ts')).toBe(false);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('emits bounded Rust import fallback samples in the profile artifact', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src/main.ts'),
      [
        'import missing from "./missing";',
        'import styles from "./style.css";',
        'export const total = missing + String(styles);',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-import-fallback-samples-profile.json');
    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      ZCODEGRAPH_INDEX_PROFILE_OUT: profileOut,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: {
        importPathAliasFallbackSampleCounts: Record<string, number>;
        importPathAliasFallbackSamples: Array<Record<string, unknown>>;
        importPathAliasFallbackSampleCap: {
          perBucket: number;
          total: number;
          truncated: boolean;
        };
      };
    };

    expect(profile.rustCore.importPathAliasFallbackSampleCounts).toMatchObject({
      'relative/target-not-found': 2,
    });
    expect(profile.rustCore.importPathAliasFallbackSampleCap).toEqual({
      perBucket: 100,
      total: 2000,
      truncated: false,
    });
    expect(profile.rustCore.importPathAliasFallbackSamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKind: 'relative',
          reason: 'target-not-found',
          referenceName: './missing',
          filePath: 'src/main.ts',
          language: 'typescript',
          line: expect.any(Number),
          col: expect.any(Number),
        }),
        expect.objectContaining({
          sourceKind: 'relative',
          reason: 'target-not-found',
          referenceName: './style.css',
          filePath: 'src/main.ts',
          language: 'typescript',
          line: expect.any(Number),
          col: expect.any(Number),
        }),
      ]),
    );
    for (const sample of profile.rustCore.importPathAliasFallbackSamples) {
      expect(sample).not.toHaveProperty('source');
      expect(sample).not.toHaveProperty('sourceContent');
      expect(sample).not.toHaveProperty('sourceLine');
      expect(sample).not.toHaveProperty('candidateCode');
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

  it('keeps exact-name resolved graph stable when candidate protocol is enabled or disabled', () => {
    const makeProject = (): string => {
      const dir = makeTempProject();
      fs.writeFileSync(
        path.join(dir, 'candidate-protocol.ts'),
        [
          'function protocolHelper() {',
          '  return 1;',
          '}',
          '',
          'export function protocolEntry() {',
          '  return protocolHelper();',
          '}',
        ].join('\n') + '\n',
      );
      return dir;
    };
    const graphSummary = (dir: string, enabled: boolean): {
      stats: { fileCount: number; nodeCount: number; edgeCount: number };
      edges: Array<{ source: string; target: string; kind: string; resolvedBy: unknown }>;
    } => {
      const result = runCli(dir, ['index', '--engine', 'rust-hybrid', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: writeFakeRustCoreWithPerFileGap(dir, 'candidate-protocol.ts'),
        ZCODEGRAPH_CANDIDATE_PROTOCOL: enabled ? '1' : '0',
      });
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

      const cg = CodeGraph.openSync(dir);
      try {
        const entry = cg.searchNodes('protocolEntry').find((match) => match.node.kind === 'function')?.node;
        expect(entry).toBeDefined();
        const nodesById = new Map(cg.getNodesByKind('function').map((node) => [node.id, node.name]));
        const stats = cg.getStats();
        const edges = cg.getOutgoingEdges(entry!.id)
          .filter((edge) => edge.kind === 'calls')
          .map((edge) => ({
            source: entry!.name,
            target: nodesById.get(edge.target) ?? edge.target,
            kind: edge.kind,
            resolvedBy: edge.metadata?.resolvedBy,
          }))
          .sort((a, b) => `${a.source}:${a.target}:${a.kind}`.localeCompare(`${b.source}:${b.target}:${b.kind}`));
        return {
          stats: {
            fileCount: stats.fileCount,
            nodeCount: stats.nodeCount,
            edgeCount: stats.edgeCount,
          },
          edges,
        };
      } finally {
        cg.close();
      }
    };

    const enabledDir = makeProject();
    const disabledDir = makeProject();
    try {
      const enabledGraph = graphSummary(enabledDir, true);
      const disabledGraph = graphSummary(disabledDir, false);
      expect(enabledGraph.edges).toContainEqual({
        source: 'protocolEntry',
        target: 'protocolHelper',
        kind: 'calls',
        resolvedBy: 'exact-match',
      });
      expect(enabledGraph).toEqual(disabledGraph);
    } finally {
      fs.rmSync(enabledDir, { recursive: true, force: true });
      fs.rmSync(disabledDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('writes candidate protocol diagnostics in rust-hybrid profile artifacts', () => {
    fs.writeFileSync(
      path.join(tempDir, 'candidate-profile.ts'),
      [
        'function profileHelper() {',
        '  return 1;',
        '}',
        '',
        'export function profileEntry() {',
        '  return profileHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'candidate-protocol-profile.json');
    const result = runCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: writeFakeRustCoreWithPerFileGap(tempDir, 'candidate-profile.ts'),
      ZCODEGRAPH_INDEX_PROFILE_OUT: profileOut,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          candidateLookupMs: number;
          candidateLookupCacheHitMs: number;
          nameMatcherCandidateLookupDbMs: number;
          perReferenceDisambiguationMs: number;
          databaseAccessMs: number;
          refHydrationDbMs: number;
          candidateProtocol: {
            enabled: boolean;
            materializationMs: number;
            lookupMs: number;
            lookupCount: number;
            cacheHitCount: number;
            cacheMissCount: number;
            dbLookupCount: number;
            candidateCount: number;
            lookupShapeCounts: Record<string, number>;
            lookupShapeMs: Record<string, number>;
            equivalenceComparedCount: number;
            equivalenceMismatchCount: number;
            fallbackReasons: Record<string, number>;
            disabledReason: string | null;
          };
        };
      };
    };

    expect(profile.finalize.referenceResolutionBreakdown.candidateProtocol).toMatchObject({
      enabled: true,
      materializationMs: expect.any(Number),
      lookupMs: expect.any(Number),
      lookupCount: expect.any(Number),
      cacheHitCount: expect.any(Number),
      cacheMissCount: expect.any(Number),
      dbLookupCount: expect.any(Number),
      candidateCount: expect.any(Number),
      lookupShapeCounts: expect.objectContaining({
        ExactName: expect.any(Number),
        LowerName: expect.any(Number),
        QualifiedName: expect.any(Number),
        FileNodes: expect.any(Number),
        KnownNamePresence: expect.any(Number),
      }),
      lookupShapeMs: expect.objectContaining({
        ExactName: expect.any(Number),
        LowerName: expect.any(Number),
        QualifiedName: expect.any(Number),
        FileNodes: expect.any(Number),
        KnownNamePresence: expect.any(Number),
      }),
      equivalenceComparedCount: expect.any(Number),
      equivalenceMismatchCount: expect.any(Number),
      fallbackReasons: expect.any(Object),
      disabledReason: null,
    });
    expect(profile.finalize.referenceResolutionBreakdown.candidateProtocol.lookupCount).toBeGreaterThan(0);
    expect(profile.finalize.referenceResolutionBreakdown.candidateLookupMs).toBeGreaterThanOrEqual(0);
    expect(profile.finalize.referenceResolutionBreakdown.candidateLookupCacheHitMs).toBeGreaterThanOrEqual(0);
    expect(profile.finalize.referenceResolutionBreakdown.nameMatcherCandidateLookupDbMs).toBeGreaterThanOrEqual(0);
    expect(profile.finalize.referenceResolutionBreakdown.perReferenceDisambiguationMs).toBeGreaterThanOrEqual(0);
    expect(profile.finalize.referenceResolutionBreakdown.databaseAccessMs).toBeGreaterThanOrEqual(
      profile.finalize.referenceResolutionBreakdown.refHydrationDbMs,
    );
  }, 30_000);

  it('writes Rust candidate producer shadow diagnostics for exact, lower, and known-name lookups', () => {
    fs.writeFileSync(
      path.join(tempDir, 'rust-candidate-producer.ts'),
      [
        'export class MixedProducerName {',
        '  value = 1;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'rust-candidate-producer.py'),
      [
        'def producerHelper():',
        '    return 1',
        '',
        'def producerEntry(value: MixedProducerName):',
        '    return producerHelper()',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-candidate-producer-profile.json');
    fs.writeFileSync(
      path.join(tempDir, '.zcodegraph', 'config.json'),
      JSON.stringify({ experimental: { rustCandidateProducerRouting: false } }, null, 2),
    );
    const result = runCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      ZCODEGRAPH_CANDIDATE_PROTOCOL: '1',
      ZCODEGRAPH_RUST_CANDIDATE_PRODUCER: '1',
      ZCODEGRAPH_INDEX_PROFILE_OUT: profileOut,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          candidateProtocol: {
            rustCandidateProducer: {
              enabled: boolean;
              shadowMode: boolean;
              lookupCount: number;
              lookupShapeCounts: Record<string, number>;
              comparedCount: number;
              mismatchCount: number;
              mismatchReasons: Record<string, number>;
              mismatchSamples: unknown[];
              candidateCount: number;
              payloadBytes: number;
              disabledReason: string | null;
            };
          };
        };
      };
    };
    const producer = profile.finalize.referenceResolutionBreakdown.candidateProtocol.rustCandidateProducer;
    expect(producer).toMatchObject({
      enabled: true,
      shadowMode: true,
      lookupShapeCounts: expect.objectContaining({
        ExactName: expect.any(Number),
        LowerName: expect.any(Number),
        QualifiedName: expect.any(Number),
        FileNodes: expect.any(Number),
        KnownNamePresence: expect.any(Number),
      }),
      comparedCount: expect.any(Number),
      mismatchCount: 0,
      mismatchReasons: {},
      mismatchSamples: [],
      disabledReason: null,
    });
    expect(producer.lookupCount).toBeGreaterThan(0);
    expect(producer.lookupShapeCounts.ExactName).toBeGreaterThan(0);
    expect(producer.lookupShapeCounts.LowerName).toBeGreaterThanOrEqual(0);
    expect(producer.lookupShapeCounts.QualifiedName).toBeGreaterThanOrEqual(0);
    expect(producer.lookupShapeCounts.FileNodes).toBeGreaterThanOrEqual(0);
    expect(producer.lookupShapeCounts.KnownNamePresence).toBeGreaterThan(0);
    expect(producer.comparedCount).toBe(producer.lookupCount);
    expect(producer.candidateCount).toBeGreaterThan(0);
    expect(producer.payloadBytes).toBeGreaterThan(0);
  }, 30_000);

  it('keeps resolved graph stable when Rust candidate producer shadow mode is enabled', () => {
    const makeProject = (): string => {
      const dir = makeTempProject();
      fs.writeFileSync(
        path.join(dir, 'rust-candidate-producer-guard.py'),
        [
          'def producerGuardHelper():',
          '    return 1',
          '',
          'def producerGuardEntry():',
          '    return producerGuardHelper()',
        ].join('\n') + '\n',
      );
      return dir;
    };
    const graphSummary = (dir: string, enabled: boolean): {
      stats: { fileCount: number; nodeCount: number; edgeCount: number };
      edges: Array<{ source: string; target: string; kind: string; resolvedBy: unknown }>;
    } => {
      const result = runCli(dir, ['index', '--engine', 'rust-hybrid', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
        ZCODEGRAPH_CANDIDATE_PROTOCOL: '1',
        ZCODEGRAPH_RUST_CANDIDATE_PRODUCER: enabled ? '1' : '0',
      });
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

      const cg = CodeGraph.openSync(dir);
      try {
        const entry = cg.searchNodes('producerGuardEntry').find((match) => match.node.kind === 'function')?.node;
        expect(entry).toBeDefined();
        const nodesById = new Map(cg.getNodesByKind('function').map((node) => [node.id, node.name]));
        const stats = cg.getStats();
        const edges = cg.getOutgoingEdges(entry!.id)
          .filter((edge) => edge.kind === 'calls')
          .map((edge) => ({
            source: entry!.name,
            target: nodesById.get(edge.target) ?? edge.target,
            kind: edge.kind,
            resolvedBy: edge.metadata?.resolvedBy,
          }))
          .sort((a, b) => `${a.source}:${a.target}:${a.kind}`.localeCompare(`${b.source}:${b.target}:${b.kind}`));
        return {
          stats: {
            fileCount: stats.fileCount,
            nodeCount: stats.nodeCount,
            edgeCount: stats.edgeCount,
          },
          edges,
        };
      } finally {
        cg.close();
      }
    };

    const enabledDir = makeProject();
    const disabledDir = makeProject();
    try {
      const enabledGraph = graphSummary(enabledDir, true);
      const disabledGraph = graphSummary(disabledDir, false);
      expect(enabledGraph.edges).toContainEqual({
        source: 'producerGuardEntry',
        target: 'producerGuardHelper',
        kind: 'calls',
        resolvedBy: 'exact-match',
      });
      expect(enabledGraph).toEqual(disabledGraph);
    } finally {
      fs.rmSync(enabledDir, { recursive: true, force: true });
      fs.rmSync(disabledDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('keeps resolved graph stable when Rust candidate producer routing is locally enabled or invalid', () => {
    const makeProject = (config: string | null, profileName: string): { dir: string; profileOut: string } => {
      const dir = makeTempProject();
      fs.writeFileSync(
        path.join(dir, 'rust-candidate-routing.py'),
        [
          'def routingHelper():',
          '    return 1',
          '',
          'def routingEntry():',
          '    return routingHelper()',
        ].join('\n') + '\n',
      );
      if (config !== null) {
        fs.writeFileSync(path.join(dir, '.zcodegraph', 'config.json'), config);
      }
      return { dir, profileOut: path.join(dir, '.zcodegraph', profileName) };
    };
    const graphSummary = (dir: string, profileOut: string): {
      stats: { fileCount: number; nodeCount: number; edgeCount: number };
      edges: Array<{ source: string; target: string; kind: string; resolvedBy: unknown }>;
      routing: {
        configured: boolean;
        source: string;
        active: boolean;
        activeShapes: string[];
        fallbackReason: string | null;
      };
    } => {
      const result = runCli(dir, ['index', '--engine', 'rust-hybrid', '--quiet'], {
        ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
        ZCODEGRAPH_INDEX_PROFILE_OUT: profileOut,
      });
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

      const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
        finalize: {
          referenceResolutionBreakdown: {
            candidateProtocol: {
              rustCandidateProducer: {
                routing: {
                  configured: boolean;
                  source: string;
                  active: boolean;
                  activeShapes: string[];
                  fallbackReason: string | null;
                };
              };
            };
          };
        };
      };
      const cg = CodeGraph.openSync(dir);
      try {
        const entry = cg.searchNodes('routingEntry').find((match) => match.node.kind === 'function')?.node;
        expect(entry).toBeDefined();
        const nodesById = new Map(cg.getNodesByKind('function').map((node) => [node.id, node.name]));
        const stats = cg.getStats();
        const edges = cg.getOutgoingEdges(entry!.id)
          .filter((edge) => edge.kind === 'calls')
          .map((edge) => ({
            source: entry!.name,
            target: nodesById.get(edge.target) ?? edge.target,
            kind: edge.kind,
            resolvedBy: edge.metadata?.resolvedBy,
          }))
          .sort((a, b) => `${a.source}:${a.target}:${a.kind}`.localeCompare(`${b.source}:${b.target}:${b.kind}`));
        return {
          stats: {
            fileCount: stats.fileCount,
            nodeCount: stats.nodeCount,
            edgeCount: stats.edgeCount,
          },
          edges,
          routing: profile.finalize.referenceResolutionBreakdown.candidateProtocol.rustCandidateProducer.routing,
        };
      } finally {
        cg.close();
      }
    };

    const enabled = makeProject(
      JSON.stringify({ experimental: { rustCandidateProducerRouting: true } }, null, 2),
      'routing-enabled-profile.json',
    );
    const disabled = makeProject(
      JSON.stringify({ experimental: { rustCandidateProducerRouting: false } }, null, 2),
      'routing-disabled-profile.json',
    );
    const invalid = makeProject(
      JSON.stringify({ experimental: { rustCandidateProducerRouting: 'yes' } }, null, 2),
      'routing-invalid-profile.json',
    );
    try {
      const enabledGraph = graphSummary(enabled.dir, enabled.profileOut);
      const disabledGraph = graphSummary(disabled.dir, disabled.profileOut);
      const invalidGraph = graphSummary(invalid.dir, invalid.profileOut);

      expect(enabledGraph.edges).toContainEqual({
        source: 'routingEntry',
        target: 'routingHelper',
        kind: 'calls',
        resolvedBy: 'exact-match',
      });
      expect(enabledGraph.stats).toEqual(disabledGraph.stats);
      expect(enabledGraph.edges).toEqual(disabledGraph.edges);
      expect(invalidGraph.stats).toEqual(disabledGraph.stats);
      expect(invalidGraph.edges).toEqual(disabledGraph.edges);
      expect(enabledGraph.routing).toMatchObject({
        configured: true,
        source: 'local-config',
        active: true,
        activeShapes: ['ExactName', 'KnownNamePresence', 'LowerName', 'QualifiedName', 'FileNodes'],
        fallbackReason: null,
      });
      expect(disabledGraph.routing).toMatchObject({
        configured: false,
        source: 'local-config',
        active: false,
      });
      expect(invalidGraph.routing).toMatchObject({
        configured: false,
        source: 'invalid-local-config',
        active: false,
        fallbackReason: 'invalid-local-config',
      });
    } finally {
      fs.rmSync(enabled.dir, { recursive: true, force: true });
      fs.rmSync(disabled.dir, { recursive: true, force: true });
      fs.rmSync(invalid.dir, { recursive: true, force: true });
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

  it('resolves one-hop ESM named re-exports to final leaf symbols as Rust-owned edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'leaf.ts'),
      [
        'export function reexportedHelper() {',
        '  return 41;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'barrel.ts'),
      'export { reexportedHelper } from "./leaf";\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        'import { reexportedHelper } from "./barrel";',
        'export function reexportedEntry() {',
        '  return reexportedHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-esm-reexport-profile.json');
    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      ZCODEGRAPH_INDEX_PROFILE_OUT: profileOut,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: { boundaryProtocol: { rustOwnedStages: string[] } };
    };
    expect(profile.finalize.boundaryProtocol.rustOwnedStages).toContain('esm-one-hop-reexport-resolution');

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entry = cg.searchNodes('reexportedEntry').find((match) => match.node.kind === 'function')?.node;
      const helper = cg.searchNodes('reexportedHelper').find((match) => match.node.kind === 'function' && match.node.filePath === 'src/leaf.ts')?.node;
      expect(entry).toBeDefined();
      expect(helper).toBeDefined();

      const calls = cg.getOutgoingEdges(entry!.id).filter((edge) => edge.kind === 'calls');
      expect(calls.some((edge) => edge.target === helper!.id && edge.edgeOrigin === 'rust-finalization')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves paths-alias one-hop ESM named re-exports to final leaf symbols as Rust-owned edges', () => {
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
      path.join(tempDir, 'src', 'leaf.ts'),
      [
        'export function aliasReexportedHelper() {',
        '  return 41;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'barrel.ts'),
      'export { aliasReexportedHelper } from "@app/leaf";\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        'import { aliasReexportedHelper } from "@app/barrel";',
        'export function aliasReexportedEntry() {',
        '  return aliasReexportedHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const entry = cg.searchNodes('aliasReexportedEntry').find((match) => match.node.kind === 'function')?.node;
      const helper = cg.searchNodes('aliasReexportedHelper').find((match) => match.node.kind === 'function' && match.node.filePath === 'src/leaf.ts')?.node;
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

  it('indexes Go symbols through the Rust engine', () => {
    fs.writeFileSync(
      path.join(tempDir, 'server.go'),
      [
        'package main',
        '',
        'type User struct {',
        '  Name string',
        '}',
        '',
        'type Store interface {',
        '  List() []User',
        '}',
        '',
        'type Handler struct {',
        '  store Store',
        '}',
        '',
        'const DefaultLimit = 10',
        'var cachedUsers []User',
        '',
        'type UserID = string',
        '',
        'func NewHandler(store Store) *Handler {',
        '  return &Handler{store: store}',
        '}',
        '',
        'func (h *Handler) ListUsers() []User {',
        '  return h.store.List()',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getStats().filesByLanguage.go).toBe(1);
      const expectations = [
        ['main', 'module'],
        ['User', 'struct'],
        ['Name', 'field'],
        ['Store', 'interface'],
        ['Handler', 'struct'],
        ['store', 'field'],
        ['DefaultLimit', 'constant'],
        ['cachedUsers', 'variable'],
        ['UserID', 'type_alias'],
        ['NewHandler', 'function'],
        ['Handler.ListUsers', 'method'],
      ] as const;
      for (const [name, kind] of expectations) {
        expect(
          cg.searchNodes(name).some((match) => match.node.name === name && match.node.kind === kind && match.node.language === 'go'),
          `${name} (${kind}) should be indexed as Go`,
        ).toBe(true);
      }
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves Go same-file and same-package direct calls through the Rust engine', () => {
    fs.writeFileSync(
      path.join(tempDir, 'handler.go'),
      [
        'package main',
        '',
        'type Handler struct {}',
        '',
        'func (h *Handler) ListUsers() []string {',
        '  return loadUsers()',
        '}',
        '',
        'func loadUsers() []string {',
        '  return buildUsers()',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'store.go'),
      [
        'package main',
        '',
        'func buildUsers() []string {',
        '  return []string{"ada"}',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const listUsers = cg.searchNodes('Handler.ListUsers').find((match) => match.node.kind === 'method')?.node;
      const loadUsers = cg.searchNodes('loadUsers').find((match) => match.node.kind === 'function')?.node;
      const buildUsers = cg.searchNodes('buildUsers').find((match) => match.node.kind === 'function')?.node;
      expect(listUsers).toBeDefined();
      expect(loadUsers).toBeDefined();
      expect(buildUsers).toBeDefined();

      const listCalls = cg.getOutgoingEdges(listUsers!.id).filter((edge) => edge.kind === 'calls');
      const loadCalls = cg.getOutgoingEdges(loadUsers!.id).filter((edge) => edge.kind === 'calls');
      expect(listCalls.some((edge) => edge.target === loadUsers!.id)).toBe(true);
      expect(loadCalls.some((edge) => edge.target === buildUsers!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('links Gin direct routes to handlers and handler helpers under rust-hybrid', () => {
    fs.writeFileSync(
      path.join(tempDir, 'main.go'),
      [
        'package main',
        '',
        'import "github.com/gin-gonic/gin"',
        '',
        'type Controller struct {}',
        '',
        'func main() {',
        '  r := gin.Default()',
        '  r.GET("/health", healthHandler)',
        '  api := r.Group("/api")',
        '  controller := &Controller{}',
        '  api.POST("/users", controller.CreateUser)',
        '}',
        '',
        'func healthHandler(c *gin.Context) {',
        '  writeHealth()',
        '}',
        '',
        'func writeHealth() {}',
        '',
        'func (c *Controller) CreateUser(ctx *gin.Context) {',
        '  saveUser()',
        '}',
        '',
        'func saveUser() {}',
      ].join('\n') + '\n',
    );

    const indexResult = runCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const routes = cg.getNodesByKind('route');
      const healthRoute = routes.find((node) => node.name === 'GET /health');
      const createUserRoute = routes.find((node) => node.name === 'POST /api/users');
      const healthHandler = cg.searchNodes('healthHandler').find((match) => match.node.kind === 'function')?.node;
      const writeHealth = cg.searchNodes('writeHealth').find((match) => match.node.kind === 'function')?.node;
      const createUser = cg.searchNodes('Controller.CreateUser').find((match) => match.node.kind === 'method')?.node;
      const saveUser = cg.searchNodes('saveUser').find((match) => match.node.kind === 'function')?.node;

      expect(healthRoute).toBeDefined();
      expect(createUserRoute).toBeDefined();
      expect(healthHandler).toBeDefined();
      expect(writeHealth).toBeDefined();
      expect(createUser).toBeDefined();
      expect(saveUser).toBeDefined();

      const healthRouteEdges = cg.getOutgoingEdges(healthRoute!.id).filter((edge) => edge.kind === 'references');
      const createUserRouteEdges = cg.getOutgoingEdges(createUserRoute!.id).filter((edge) => edge.kind === 'references');
      const healthHandlerCalls = cg.getOutgoingEdges(healthHandler!.id).filter((edge) => edge.kind === 'calls');
      const createUserCalls = cg.getOutgoingEdges(createUser!.id).filter((edge) => edge.kind === 'calls');

      expect(healthRouteEdges.some((edge) => edge.target === healthHandler!.id)).toBe(true);
      expect(createUserRouteEdges.some((edge) => edge.target === createUser!.id)).toBe(true);
      expect(healthHandlerCalls.some((edge) => edge.target === writeHealth!.id)).toBe(true);
      expect(createUserCalls.some((edge) => edge.target === saveUser!.id)).toBe(true);
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
      errors: Array<{ message: string; filePath?: string; code?: string; severity?: string; writtenByRust?: boolean }>;
    };
    expect(result.filesErrored).toBeGreaterThanOrEqual(1);
    expect(result.errors).toContainEqual(expect.objectContaining({
      message: 'parse error',
      filePath: 'broken.js',
      code: 'rust-owned-parse-gap',
      severity: 'warning',
      writtenByRust: false,
    }));

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
    await cg.indexAll({ engine: 'typescript' });
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
