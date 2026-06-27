import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';
import {
  fakeRustCoreMarker,
  makeRustIndexingTempProject,
  RUST_CORE_BIN,
  runZcodegraphCli,
  writeFailingRustCore,
  writeFakeRustCore,
  ZCODEGRAPH_BIN,
} from './helpers/rust-indexing-cli';

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

describe('zcodegraph index engine CLI defaults and profiles', () => {
  let tempDir: string;

  beforeAll(() => {
    if (!fs.existsSync(ZCODEGRAPH_BIN)) {
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
    tempDir = makeRustIndexingTempProject();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('uses the rust-hybrid indexer by default', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(fakeRustCoreMarker(tempDir))).toBe(true);
    expect(result.stderr).not.toContain('Failed to index');
  });

  it('keeps the TypeScript indexer as an explicit escape hatch', () => {
    const rustCore = writeFailingRustCore(tempDir);
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'typescript', '--quiet'], {
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
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(fakeRustCoreMarker(tempDir))).toBe(true);
    expect(result.stderr).not.toContain('Failed to index');
  });

  it('passes graph work profile to the Rust subprocess when selected by CLI flag', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--graph-work-profile', 'matched-ts-js', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const marker = JSON.parse(fs.readFileSync(fakeRustCoreMarker(tempDir), 'utf-8')) as { args: string[] };
    expect(marker.args).toContain('--graph-work-profile');
    expect(marker.args).toContain('matched-ts-js');
  });

  it('uses production final-flush for Rust by default while keeping SQLite write mode overrides', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const defaultResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(defaultResult.status, `stdout:\n${defaultResult.stdout}\nstderr:\n${defaultResult.stderr}`).toBe(0);
    const defaultMarker = JSON.parse(fs.readFileSync(fakeRustCoreMarker(tempDir), 'utf-8')) as { args: string[] };
    expect(defaultMarker.args).toContain('--sqlite-write-mode');
    expect(defaultMarker.args).toContain('final-flush');

    fs.rmSync(fakeRustCoreMarker(tempDir), { force: true });
    const experimentResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--sqlite-write-mode', 'memory-final-flush', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(experimentResult.status, `stdout:\n${experimentResult.stdout}\nstderr:\n${experimentResult.stderr}`).toBe(0);
    const experimentMarker = JSON.parse(fs.readFileSync(fakeRustCoreMarker(tempDir), 'utf-8')) as { args: string[] };
    expect(experimentMarker.args).toContain('--sqlite-write-mode');
    expect(experimentMarker.args).toContain('memory-final-flush');

    fs.rmSync(fakeRustCoreMarker(tempDir), { force: true });
    const diskResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--sqlite-write-mode', 'disk', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(diskResult.status, `stdout:\n${diskResult.stdout}\nstderr:\n${diskResult.stderr}`).toBe(0);
    const diskMarker = JSON.parse(fs.readFileSync(fakeRustCoreMarker(tempDir), 'utf-8')) as { args: string[] };
    expect(diskMarker.args).toContain('--sqlite-write-mode');
    expect(diskMarker.args).toContain('disk');
  });

  it('passes heap profiling to the Rust subprocess when selected by CLI flag', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--profile', 'heap', '--quiet'], {
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
    const result = runZcodegraphCli(tempDir, ['index', '--quiet'], {
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
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--graph-work-profile', 'wide-open', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
    expect(result.stderr).toContain('Unsupported graph work profile');
    expect(fs.existsSync(fakeRustCoreMarker(tempDir))).toBe(false);
  });

  it('rejects unsupported profile values before indexing', () => {
    const rustCore = writeFailingRustCore(tempDir);
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--profile', 'cpu', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(1);
    expect(result.stderr).toContain('Unsupported index profile');
  });

  it('rejects unsupported engine values before indexing', () => {
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'python', '--quiet']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unsupported index engine');
    expect(result.stderr).toContain('typescript, rust, rust-hybrid');
  });

  it('allows mixed-language projects through the TypeScript escape hatch', () => {
    const rustCore = writeFailingRustCore(tempDir);
    fs.writeFileSync(path.join(tempDir, 'server.go'), 'package main\nfunc main() {}\n');

    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'typescript', '--quiet'], {
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

      const result = runZcodegraphCli(initDir, ['init'], {
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

      const result = runZcodegraphCli(initDir, ['init', '-i'], {
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

      const result = runZcodegraphCli(initDir, ['init', '--engine', 'typescript'], {
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

    const result = runZcodegraphCli(tempDir, ['init'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('Already initialized');
    expect(fs.existsSync(fakeRustCoreMarker(tempDir))).toBe(false);
  });

  it('writes a Rust-produced index and profile that TypeScript status can inspect', () => {
    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-index-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--profile-out', profileOut, '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);
    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      rustCore: {
        sourceScanMs: number;
        parseExtractionMs: number;
        parseSourceReadMs: number;
        parseNormalizationMs: number;
        parseParserSetupMs: number;
        parseTreeSitterMs: number;
        parseAstExtractionMs: number;
        parseErrorHandlingMs: number;
        parseByLanguage: Record<string, {
          files: number;
          parseExtractionMs: number;
          sourceReadMs: number;
          normalizationMs: number;
          parserSetupMs: number;
          treeSitterMs: number;
          astExtractionMs: number;
          errorHandlingMs: number;
        }>;
        sqliteWriteMs: number;
      };
      finalize: {
        referenceResolutionMs: number;
        dynamicDispatchSynthesisMs: number;
        dbMaintenanceMs: number;
        referenceResolutionBreakdown: Record<string, number>;
      };
      typescriptFinalizationMs: number;
      complete: boolean;
      checkpoints: Array<{ name: string; state: string; elapsedMs: number }>;
    };
    expect(profile.complete).toBe(true);
    expect(profile.checkpoints).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'rustCore.started', state: 'started', elapsedMs: expect.any(Number) }),
      expect.objectContaining({ name: 'rustCore.completed', state: 'completed', elapsedMs: expect.any(Number) }),
      expect.objectContaining({ name: 'finalization.frameworkPostExtract.started', state: 'started', elapsedMs: expect.any(Number) }),
      expect.objectContaining({ name: 'finalization.frameworkPostExtract.completed', state: 'completed', elapsedMs: expect.any(Number) }),
      expect.objectContaining({ name: 'finalization.referenceResolution.started', state: 'started', elapsedMs: expect.any(Number) }),
      expect.objectContaining({ name: 'finalization.referenceResolution.completed', state: 'completed', elapsedMs: expect.any(Number) }),
      expect.objectContaining({ name: 'finalization.dynamicDispatchSynthesis.started', state: 'started', elapsedMs: expect.any(Number) }),
      expect.objectContaining({ name: 'finalization.dynamicDispatchSynthesis.completed', state: 'completed', elapsedMs: expect.any(Number) }),
      expect.objectContaining({ name: 'finalization.dbMaintenance.started', state: 'started', elapsedMs: expect.any(Number) }),
      expect.objectContaining({ name: 'finalization.dbMaintenance.completed', state: 'completed', elapsedMs: expect.any(Number) }),
      expect.objectContaining({ name: 'finalization.completed', state: 'completed', elapsedMs: expect.any(Number) }),
      expect.objectContaining({ name: 'profile.completed', state: 'completed', elapsedMs: expect.any(Number) }),
    ]));
    expect(profile.rustCore).toMatchObject({
      sourceScanMs: expect.any(Number),
      parseExtractionMs: expect.any(Number),
      parseSourceReadMs: expect.any(Number),
      parseNormalizationMs: expect.any(Number),
      parseParserSetupMs: expect.any(Number),
      parseTreeSitterMs: expect.any(Number),
      parseAstExtractionMs: expect.any(Number),
      parseErrorHandlingMs: expect.any(Number),
      sqliteWriteMs: expect.any(Number),
    });
    expect(profile.rustCore.parseByLanguage.typescript).toMatchObject({
      files: expect.any(Number),
      parseExtractionMs: expect.any(Number),
      sourceReadMs: expect.any(Number),
      normalizationMs: expect.any(Number),
      parserSetupMs: expect.any(Number),
      treeSitterMs: expect.any(Number),
      astExtractionMs: expect.any(Number),
      errorHandlingMs: expect.any(Number),
    });
    expect(profile.rustCore.parseByLanguage.typescript.files).toBeGreaterThan(0);
    const parseSubBucketTotal = profile.rustCore.parseSourceReadMs
      + profile.rustCore.parseNormalizationMs
      + profile.rustCore.parseParserSetupMs
      + profile.rustCore.parseTreeSitterMs
      + profile.rustCore.parseAstExtractionMs
      + profile.rustCore.parseErrorHandlingMs;
    expect(parseSubBucketTotal).toBeLessThanOrEqual(profile.rustCore.parseExtractionMs);
    expect(profile.finalize).toMatchObject({
      referenceResolutionMs: expect.any(Number),
      dynamicDispatchSynthesisMs: expect.any(Number),
      dbMaintenanceMs: expect.any(Number),
    });
    for (const bucket of FINALIZATION_DIAGNOSTIC_BUCKETS) {
      expect(profile.finalize.referenceResolutionBreakdown[bucket]).toEqual(expect.any(Number));
    }
    expect(profile.typescriptFinalizationMs).toEqual(expect.any(Number));

    const statusResult = runZcodegraphCli(tempDir, ['status', '--json']);
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

  it('does not write a profile from the legacy profile output environment variable', () => {
    const profileOut = path.join(tempDir, '.zcodegraph', 'legacy-env-profile.json');
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      ZCODEGRAPH_INDEX_PROFILE_OUT: profileOut,
    });

    expect(indexResult.status).toBe(0);
    expect(fs.existsSync(profileOut)).toBe(false);
  });

  it('rejects profile-out for the TypeScript index engine', () => {
    const profileOut = path.join(tempDir, '.zcodegraph', 'typescript-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'typescript', '--profile-out', profileOut, '--quiet']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--profile-out is only supported for rust and rust-hybrid index engines');
    expect(fs.existsSync(profileOut)).toBe(false);
  });

  it('writes a partial profile checkpoint artifact when Rust core produces no indexable files', () => {
    const rustCore = writeFakeRustCore(tempDir);
    const profileOut = path.join(tempDir, '.zcodegraph', 'partial-profile.json');

    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--profile-out', profileOut, '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status).toBe(0);
    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      complete: boolean;
      checkpoints: Array<{ name: string; state: string; elapsedMs: number }>;
      rustCore: unknown;
    };
    expect(profile.complete).toBe(false);
    expect(profile.rustCore).toBeDefined();
    expect(profile.checkpoints).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'rustCore.started', state: 'started', elapsedMs: expect.any(Number) }),
      expect.objectContaining({ name: 'rustCore.completed', state: 'completed', elapsedMs: expect.any(Number) }),
    ]));
    expect(profile.checkpoints.some((checkpoint) => checkpoint.name === 'profile.completed')).toBe(false);
  });

  it('writes rust-hybrid status metadata for a default rust-hybrid index', () => {
    const indexResult = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const statusResult = runZcodegraphCli(tempDir, ['status', '--json']);
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
      rustOwnedLanguages: ['javascript', 'jsx', 'typescript', 'tsx', 'go', 'python', 'rust'],
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
});
