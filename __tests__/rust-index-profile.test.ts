import { describe, expect, it, beforeAll, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-index-profile.mjs');
const BIN = path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js');

const PHASE_NAMES = [
  'sourceScanMs',
  'parseExtractionMs',
  'sqliteWriteMs',
  'typescriptFinalizationMs',
  'subprocessStartupHandoffMs',
];

const FINALIZATION_SUBPHASES = [
  'frameworkPostExtractMs',
  'referenceResolutionMs',
  'dynamicDispatchSynthesisMs',
  'dbMaintenanceMs',
];

const REFERENCE_RESOLUTION_BREAKDOWN = [
  'importResolutionMs',
  'nameMatchingMs',
  'frameworkMatchingMs',
  'databaseAccessMs',
  'cacheWarmupMs',
  'unresolvedReadMs',
  'candidateLookupMs',
  'sharedCandidateLookupMs',
  'candidateLookupCacheHitMs',
  'perReferenceDisambiguationMs',
  'edgeMaterializationMs',
  'edgeWriteMs',
  'unresolvedCleanupMs',
  'otherResolutionMs',
];

function writeFakeRustCore(dir: string): string {
  const script = path.join(dir, process.platform === 'win32' ? 'fake-rust-core.cjs' : 'fake-rust-core');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'process.stdout.write(JSON.stringify({ type: "progress", phase: "scanning", current: 0, total: 1 }) + "\\n");',
      'process.stdout.write(JSON.stringify({',
      '  type: "result",',
      '  success: true,',
      '  filesIndexed: 0,',
      '  filesSkipped: 0,',
      '  filesErrored: 0,',
      '  nodesCreated: 0,',
      '  edgesCreated: 0,',
      '  errors: [],',
      '  durationMs: 4,',
      '  profile: { sourceScanMs: 1, parseExtractionMs: 2, sqliteWriteMs: 3 }',
      '}) + "\\n");',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

describe('Rust indexing profiler script', () => {
  const tempDirs: string[] = [];

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      execFileSync('npm', ['run', 'build'], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      });
    }
  }, 60_000);

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('documents local use and every phase in --help', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--help'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: node scripts/rust-index-profile.mjs');
    expect(result.stdout).toContain('npm run build && cargo build --package zcodegraph-core');
    expect(result.stdout).toContain('--repo zcodegraph=.');
    expect(result.stdout).toContain('--repo excalidraw=');
    for (const phase of PHASE_NAMES) {
      expect(result.stdout).toContain(phase);
    }
    for (const phase of FINALIZATION_SUBPHASES) {
      expect(result.stdout).toContain(phase);
    }
    for (const phase of REFERENCE_RESOLUTION_BREAKDOWN) {
      expect(result.stdout).toContain(phase);
    }
  });

  it('emits comparable machine-readable phase timings', () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-profile-src-'));
    const fakeCoreDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-profile-core-'));
    tempDirs.push(project, fakeCoreDir);
    fs.writeFileSync(path.join(project, 'a.ts'), 'export function alpha() { return 1; }\n');
    CodeGraph.initSync(project).close();

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--repo', `fixture=${project}`, '--rust-core', writeFakeRustCore(fakeCoreDir)],
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
      toolchain: {
        node: string;
        os: string;
        platform: string;
        arch: string;
      };
      results: Array<{
        name: string;
        phase1CopiedFiles: number;
        engines: {
          typescript: {
            wallMs: number;
            peakRssBytes: number | null;
            rssUnavailableReason: string | null;
          };
          rust: {
            wallMs: number;
            peakRssBytes: number | null;
            rssUnavailableReason: string | null;
          };
        };
        profile: Record<string, number>;
        finalizationSubphases: Record<string, number>;
        referenceResolutionBreakdown: Record<string, number>;
        dominantFinalizationSubphase: string;
      }>;
    };

    expect(parsed.toolchain.node).toBe(process.version);
    expect(parsed.toolchain.platform).toBe(process.platform);
    expect(parsed.toolchain.arch).toBe(process.arch);
    expect(parsed.toolchain.os).toContain(os.arch());
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0]?.name).toBe('fixture');
    expect(parsed.results[0]?.phase1CopiedFiles).toBeGreaterThanOrEqual(1);
    for (const engine of ['typescript', 'rust'] as const) {
      const measured = parsed.results[0]?.engines[engine];
      expect(measured?.wallMs).toBeTypeOf('number');
      expect(measured?.wallMs).toBeGreaterThanOrEqual(0);
      if (measured?.peakRssBytes == null) {
        expect(measured?.rssUnavailableReason).toBeTypeOf('string');
        expect(measured?.rssUnavailableReason).not.toHaveLength(0);
      } else {
        expect(measured.peakRssBytes).toBeGreaterThan(0);
        expect(measured.rssUnavailableReason).toBeNull();
      }
    }
    for (const phase of PHASE_NAMES) {
      expect(parsed.results[0]?.profile[phase]).toBeTypeOf('number');
      expect(parsed.results[0]?.profile[phase]).toBeGreaterThanOrEqual(0);
    }
    for (const phase of FINALIZATION_SUBPHASES) {
      expect(parsed.results[0]?.finalizationSubphases[phase]).toBeTypeOf('number');
      expect(parsed.results[0]?.finalizationSubphases[phase]).toBeGreaterThanOrEqual(0);
    }
    for (const phase of REFERENCE_RESOLUTION_BREAKDOWN) {
      expect(parsed.results[0]?.referenceResolutionBreakdown[phase]).toBeTypeOf('number');
      expect(parsed.results[0]?.referenceResolutionBreakdown[phase]).toBeGreaterThanOrEqual(0);
    }
    expect(FINALIZATION_SUBPHASES).toContain(parsed.results[0]?.dominantFinalizationSubphase);
  });
});
