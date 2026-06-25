import { describe, expect, it, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-hybrid-baseline.mjs');

describe('rust-hybrid baseline runner', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes a complete baseline result with runs, profile summaries, graphStats, and RSS status', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-fixture-'));
    const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-bin-'));
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-out-'));
    tempDirs.push(fixture, binDir, outDir);

    spawnSync('git', ['init'], { cwd: fixture, stdio: 'ignore' });
    fs.writeFileSync(path.join(fixture, 'package.json'), '{"name":"fixture"}\n');
    spawnSync('git', ['add', '.'], { cwd: fixture, stdio: 'ignore' });
    spawnSync('git', ['commit', '-m', 'fixture'], {
      cwd: fixture,
      stdio: 'ignore',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.com',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.com',
      },
    });

    const fakeBin = path.join(binDir, 'zcodegraph.js');
    const fakeTime = path.join(binDir, 'fake-time');
    fs.writeFileSync(fakeBin, [
      '#!/usr/bin/env node',
      'const fs = require("fs");',
      'const path = require("path");',
      'const args = process.argv.slice(2);',
      'if (args[0] === "init") { process.exit(0); }',
      'if (args[0] === "index") {',
      '  const profileOut = args[args.indexOf("--profile-out") + 1];',
      '  fs.mkdirSync(path.dirname(profileOut), { recursive: true });',
      '  fs.writeFileSync(profileOut, JSON.stringify({',
      '    complete: true,',
      '    checkpoints: [{ name: "profile.completed", state: "completed", elapsedMs: 10 }],',
      '    rustCore: { sourceScanMs: 1, parseExtractionMs: 2, sqliteWriteMs: 3, subprocessStartupHandoffMs: 4 },',
      '    finalize: {',
      '      frameworkPostExtractMs: 5, referenceResolutionMs: 6, dynamicDispatchSynthesisMs: 7, dbMaintenanceMs: 8,',
      '      referenceResolutionBreakdown: {',
      '        importResolutionMs: 1, nameMatchingMs: 2, frameworkMatchingMs: 3, databaseAccessMs: 4,',
      '        cacheWarmupDbMs: 10, refHydrationDbMs: 11, unresolvedReadDbMs: 12,',
      '        candidateLookupMs: 13, sharedCandidateLookupMs: 14, candidateLookupCacheHitMs: 15,',
      '        nameMatcherCandidateLookupDbMs: 16, perReferenceDisambiguationMs: 17,',
      '        edgeMaterializationMs: 18, edgeMaterializationDbMs: 19, edgeEndpointValidationDbMs: 20,',
      '        edgeWriteMs: 5, edgeWriteDbMs: 21, edgeInsertCount: 22,',
      '        unresolvedCleanupMs: 6, unresolvedCleanupDbMs: 23, resolvedCleanupMs: 7, resolvedCleanupDbMs: 24, resolvedCleanupRowCount: 25,',
      '        intentionallyUnresolvedCleanupMs: 26, intentionallyUnresolvedCleanupDbMs: 27, intentionallyUnresolvedCleanupRowCount: 28,',
      '        candidateReplayEligibleRefs: 29, candidateReplayComparedRefs: 30, candidateReplayEquivalentRefs: 31, candidateReplayMismatchRefs: 32,',
      '        rustMatcherEligibleRefs: 33, rustMatcherHandledRefs: 34, rustMatcherFallbackRefs: 35, rustMatcherSemanticMismatchRefs: 36,',
      '        rustMatcherFallbackReasons: { unsupported: 1 },',
      '        candidateProtocol: { enabled: true, lookupMs: 37, lookupCount: 38, lookupShapeCounts: { ExactName: 1 } },',
      '        cleanupOwnership: { retainedRefs: 39 }, guardedEdgeWrite: { attemptedRefs: 40 }, moduleEdgeWrite: { writtenEdges: 41 },',
      '        semanticReplay: { eligibleRefs: 42, comparedRefs: 43, equivalentRefs: 44, mismatchRefs: 0 }',
      '      },',
      '      fallbackTaxonomy: { totalFallbacks: 1, entries: [{ stage: "reference", classification: "known-unsupported", reason: "fixture", count: 1 }]}',
      '    },',
      '    typescriptFinalizationMs: 9',
      '  }));',
      '  process.exit(0);',
      '}',
      'if (args[0] === "status") {',
      '  process.stdout.write(JSON.stringify({ initialized: true, fileCount: 1, nodeCount: 2, edgeCount: 3, dbSizeBytes: 4, nodesByKind: { file: 1 }, languages: ["typescript"], index: { engine: "rust-hybrid" } }));',
      '  process.exit(0);',
      '}',
      'process.exit(2);',
    ].join('\n'));
    fs.writeFileSync(fakeTime, [
      '#!/usr/bin/env node',
      'const { spawnSync } = require("child_process");',
      'const [command, ...args] = process.argv.slice(2);',
      'const result = spawnSync(command, args, { encoding: "utf-8" });',
      'process.stdout.write(result.stdout || "");',
      'process.stderr.write(result.stderr || "");',
      'process.stderr.write("\\n24680  maximum resident set size\\n");',
      'process.exit(result.status ?? 1);',
      '',
    ].join('\n'));
    fs.chmodSync(fakeTime, 0o755);

    const out = path.join(outDir, 'baseline-result.json');
    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--bin', fakeBin, '--out', out, '--repo', `fixture=${fixture}`, '--runs', '2'],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RSS_PS_COMMAND: 'zcodegraph-nonexistent-ps-for-test',
          ZCODEGRAPH_RSS_TIME_COMMAND: fakeTime,
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      baseline: string;
      resultClassification: string;
      thresholds: { candidateSignalPct: number; planLevelClaimPct: number };
      results: Array<{
        name: string;
        status: string;
        requestedRuns: number;
        completedRuns: number;
        runs: Array<{
          status: string;
          profilePath: string;
          peakRssBytes: number | null;
          rssSource: string | null;
          rssUnavailableKind: string | null;
          rssUnavailableReason: string | null;
          graphStats: { available: boolean; fileCount: number; nodeCount: number; edgeCount: number };
          profileSummary: {
            complete: boolean;
            lastCheckpoint: { name: string };
            fallbackTaxonomy: { totalFallbacks: number };
            tailDiagnostics: {
              typescriptFinalization: { typescriptFinalizationMs: number; referenceResolutionMs: number };
              referenceResolutionLookupCache: { candidateLookupMs: number; candidateProtocol: { lookupMs: number } };
              referenceResolutionDatabaseHydration: { refHydrationDbMs: number };
              edgeWriteCleanup: { edgeWriteDbMs: number; cleanupOwnership: { retainedRefs: number } };
              semanticReplayMatcherSafety: { rustMatcherEligibleRefs: number; semanticReplay: { eligibleRefs: number } };
            };
          };
        }>;
        summary: { medianWallMs: number; wallMsVariance: number };
      }>;
    };

    expect(artifact.baseline).toBe('baseline-indexing-performance-v1');
    expect(artifact.resultClassification).toBe('baseline-frozen');
    expect(artifact.thresholds).toEqual({ candidateSignalPct: 5, planLevelClaimPct: 10 });
    expect(artifact.results).toHaveLength(1);
    expect(artifact.results[0]).toMatchObject({
      name: 'fixture',
      status: 'completed',
      requestedRuns: 2,
      completedRuns: 2,
    });
    expect(artifact.results[0]!.summary.medianWallMs).toBeGreaterThanOrEqual(0);
    expect(artifact.results[0]!.summary.wallMsVariance).toBeGreaterThanOrEqual(0);
    expect(artifact.results[0]!.runs).toHaveLength(2);
    expect(artifact.results[0]!.runs[0]!.profilePath).toContain('tmp-baseline-result');
    expect(artifact.results[0]!.runs[0]!.peakRssBytes).toBe(24680);
    expect(artifact.results[0]!.runs[0]!.rssSource).toBe('command');
    expect(artifact.results[0]!.runs[0]!.rssUnavailableKind).toBeNull();
    expect(artifact.results[0]!.runs[0]!.rssUnavailableReason).toBeNull();
    expect(artifact.results[0]!.runs[0]!.graphStats).toMatchObject({
      available: true,
      fileCount: 1,
      nodeCount: 2,
      edgeCount: 3,
    });
    expect(artifact.results[0]!.runs[0]!.profileSummary).toMatchObject({
      complete: true,
      lastCheckpoint: { name: 'profile.completed' },
      fallbackTaxonomy: { totalFallbacks: 1 },
      tailDiagnostics: {
        typescriptFinalization: {
          typescriptFinalizationMs: 9,
          frameworkPostExtractMs: 5,
          referenceResolutionMs: 6,
          dynamicDispatchSynthesisMs: 7,
          dbMaintenanceMs: 8,
        },
        referenceResolutionLookupCache: {
          candidateLookupMs: 13,
          sharedCandidateLookupMs: 14,
          candidateLookupCacheHitMs: 15,
          nameMatcherCandidateLookupDbMs: 16,
          perReferenceDisambiguationMs: 17,
          candidateProtocol: { enabled: true, lookupMs: 37, lookupCount: 38 },
        },
        referenceResolutionDatabaseHydration: {
          databaseAccessMs: 4,
          cacheWarmupDbMs: 10,
          refHydrationDbMs: 11,
          unresolvedReadDbMs: 12,
          edgeMaterializationDbMs: 19,
          edgeEndpointValidationDbMs: 20,
        },
        edgeWriteCleanup: {
          edgeMaterializationMs: 18,
          edgeWriteMs: 5,
          edgeWriteDbMs: 21,
          edgeInsertCount: 22,
          unresolvedCleanupMs: 6,
          unresolvedCleanupDbMs: 23,
          resolvedCleanupMs: 7,
          resolvedCleanupDbMs: 24,
          resolvedCleanupRowCount: 25,
          intentionallyUnresolvedCleanupMs: 26,
          intentionallyUnresolvedCleanupDbMs: 27,
          intentionallyUnresolvedCleanupRowCount: 28,
          cleanupOwnership: { retainedRefs: 39 },
          guardedEdgeWrite: { attemptedRefs: 40 },
          moduleEdgeWrite: { writtenEdges: 41 },
        },
        semanticReplayMatcherSafety: {
          candidateReplayEligibleRefs: 29,
          candidateReplayComparedRefs: 30,
          candidateReplayEquivalentRefs: 31,
          candidateReplayMismatchRefs: 32,
          rustMatcherEligibleRefs: 33,
          rustMatcherHandledRefs: 34,
          rustMatcherFallbackRefs: 35,
          rustMatcherSemanticMismatchRefs: 36,
          rustMatcherFallbackReasons: { unsupported: 1 },
          semanticReplay: { eligibleRefs: 42, comparedRefs: 43 },
        },
      },
    });
  });

  it('records needs-human-setup instead of cloning a missing corpus', () => {
    const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-bin-'));
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-out-'));
    tempDirs.push(binDir, outDir);
    const fakeBin = path.join(binDir, 'zcodegraph.js');
    fs.writeFileSync(fakeBin, 'process.exit(0);\n');

    const out = path.join(outDir, 'baseline-result.json');
    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--bin', fakeBin, '--out', out, '--repo', `missing=${path.join(outDir, 'missing')}`],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      resultClassification: string;
      results: Array<{ name: string; status: string; unavailableReason: string }>;
    };
    expect(artifact.resultClassification).toBe('baseline-partial-needs-human-setup');
    expect(artifact.results[0]).toMatchObject({
      name: 'missing',
      status: 'needs-human-setup',
      unavailableReason: 'corpus path does not exist',
    });
  });

  it('treats a directory with an invalid .git folder as needs-human-setup', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-invalid-git-'));
    const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-bin-'));
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-out-'));
    tempDirs.push(fixture, binDir, outDir);
    fs.mkdirSync(path.join(fixture, '.git'));
    const fakeBin = path.join(binDir, 'zcodegraph.js');
    fs.writeFileSync(fakeBin, 'process.exit(0);\n');

    const out = path.join(outDir, 'baseline-result.json');
    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--bin', fakeBin, '--out', out, '--repo', `invalid=${fixture}`],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      resultClassification: string;
      results: Array<{ name: string; status: string; unavailableReason: string }>;
    };
    expect(artifact.resultClassification).toBe('baseline-partial-needs-human-setup');
    expect(artifact.results[0]).toMatchObject({
      name: 'invalid',
      status: 'needs-human-setup',
      unavailableReason: 'corpus path is not a valid Git checkout',
    });
  });

  it('records partial timeout artifacts instead of losing completed earlier repos', () => {
    const first = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-first-'));
    const second = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-second-'));
    const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-bin-'));
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-out-'));
    tempDirs.push(first, second, binDir, outDir);
    for (const dir of [first, second]) {
      spawnSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
      fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"fixture"}\n');
      spawnSync('git', ['add', '.'], { cwd: dir, stdio: 'ignore' });
      spawnSync('git', ['commit', '-m', 'fixture'], {
        cwd: dir,
        stdio: 'ignore',
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 'Test',
          GIT_AUTHOR_EMAIL: 'test@example.com',
          GIT_COMMITTER_NAME: 'Test',
          GIT_COMMITTER_EMAIL: 'test@example.com',
        },
      });
    }

    const fakeBin = path.join(binDir, 'zcodegraph.js');
    fs.writeFileSync(fakeBin, [
      '#!/usr/bin/env node',
      'const fs = require("fs");',
      'const path = require("path");',
      'const args = process.argv.slice(2);',
      'if (args[0] === "init") { process.exit(0); }',
      'if (args[0] === "index" && process.cwd().includes("second")) { setTimeout(() => {}, 10_000); return; }',
      'if (args[0] === "index") {',
      '  const profileOut = args[args.indexOf("--profile-out") + 1];',
      '  fs.mkdirSync(path.dirname(profileOut), { recursive: true });',
      '  fs.writeFileSync(profileOut, JSON.stringify({ complete: true, checkpoints: [{ name: "profile.completed", state: "completed", elapsedMs: 1 }], rustCore: {}, finalize: {} }));',
      '  process.exit(0);',
      '}',
      'if (args[0] === "status") { process.stdout.write(JSON.stringify({ initialized: true, fileCount: 1, nodeCount: 1, edgeCount: 1 })); process.exit(0); }',
      'process.exit(2);',
    ].join('\n'));

    const out = path.join(outDir, 'baseline-result.json');
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--bin',
        fakeBin,
        '--out',
        out,
        '--timeout-ms',
        '100',
        '--repo',
        `first=${first}`,
        '--repo',
        `second=${second}`,
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      resultClassification: string;
      results: Array<{
        name: string;
        status: string;
        runs: Array<{
          status: string;
          timeoutSnapshots?: Array<{
            elapsedMs: number;
            graphStats: { available: boolean; fileCount: number; nodeCount: number; edgeCount: number };
            profile: { exists: boolean };
            stdoutBytes: number;
            stderrBytes: number;
          }>;
        }>;
      }>;
    };
    expect(artifact.resultClassification).toBe('baseline-partial-timeout');
    expect(artifact.results).toHaveLength(2);
    expect(artifact.results[0]).toMatchObject({ name: 'first', status: 'completed' });
    expect(artifact.results[1]).toMatchObject({ name: 'second', status: 'timed-out' });
    expect(artifact.results[1]!.runs[0]).toMatchObject({ status: 'timed-out' });
    expect(artifact.results[1]!.runs[0]!.timeoutSnapshots).toEqual([
      expect.objectContaining({
        elapsedMs: expect.any(Number),
        graphStats: expect.objectContaining({
          available: true,
          fileCount: 1,
          nodeCount: 1,
          edgeCount: 1,
        }),
        profile: expect.objectContaining({ exists: false }),
        stdoutBytes: expect.any(Number),
        stderrBytes: expect.any(Number),
      }),
    ]);
  });

  it('keeps a completed baseline run when the command RSS wrapper cannot report RSS', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-no-rss-'));
    const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-bin-'));
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-out-'));
    tempDirs.push(fixture, binDir, outDir);

    spawnSync('git', ['init'], { cwd: fixture, stdio: 'ignore' });
    fs.writeFileSync(path.join(fixture, 'package.json'), '{"name":"fixture"}\n');
    spawnSync('git', ['add', '.'], { cwd: fixture, stdio: 'ignore' });
    spawnSync('git', ['commit', '-m', 'fixture'], {
      cwd: fixture,
      stdio: 'ignore',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.com',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.com',
      },
    });

    const fakeBin = path.join(binDir, 'zcodegraph.js');
    const fakeTime = path.join(binDir, 'fake-time');
    fs.writeFileSync(fakeBin, [
      '#!/usr/bin/env node',
      'const fs = require("fs");',
      'const path = require("path");',
      'const args = process.argv.slice(2);',
      'if (args[0] === "init") { process.exit(0); }',
      'if (args[0] === "index") {',
      '  const profileOut = args[args.indexOf("--profile-out") + 1];',
      '  fs.mkdirSync(path.dirname(profileOut), { recursive: true });',
      '  fs.writeFileSync(profileOut, JSON.stringify({ complete: true, checkpoints: [{ name: "profile.completed", state: "completed", elapsedMs: 1 }], rustCore: {}, finalize: {} }));',
      '  process.exit(0);',
      '}',
      'if (args[0] === "status") { process.stdout.write(JSON.stringify({ initialized: true, fileCount: 1, nodeCount: 1, edgeCount: 1 })); process.exit(0); }',
      'process.exit(2);',
    ].join('\n'));
    fs.writeFileSync(fakeTime, [
      '#!/usr/bin/env node',
      'const { spawnSync } = require("child_process");',
      'const [command, ...args] = process.argv.slice(2);',
      'const result = spawnSync(command, args, { encoding: "utf-8" });',
      'process.stdout.write(result.stdout || "");',
      'process.stderr.write(result.stderr || "");',
      'process.stderr.write("time: sysctl kern.clockrate: Operation not permitted\\n");',
      'process.exit(1);',
      '',
    ].join('\n'));
    fs.chmodSync(fakeTime, 0o755);

    const out = path.join(outDir, 'baseline-result.json');
    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--bin', fakeBin, '--out', out, '--repo', `fixture=${fixture}`],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          ZCODEGRAPH_RSS_TIME_COMMAND: fakeTime,
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      resultClassification: string;
      results: Array<{
        status: string;
        completedRuns: number;
        runs: Array<{
          status: string;
          peakRssBytes: number | null;
          rssUnavailableKind: string | null;
          rssUnavailableReason: string | null;
          profileSummary: {
            tailDiagnostics: {
              referenceResolutionLookupCache: { candidateProtocol: null };
              edgeWriteCleanup: { cleanupOwnership: null; guardedEdgeWrite: null; moduleEdgeWrite: null };
              semanticReplayMatcherSafety: { semanticReplay: null; rustMatcherFallbackReasons: null };
            };
          };
        }>;
      }>;
    };
    expect(artifact.resultClassification).toBe('baseline-frozen');
    expect(artifact.results[0]).toMatchObject({ status: 'completed', completedRuns: 1 });
    expect(artifact.results[0]!.runs[0]).toMatchObject({
      status: 'completed',
      peakRssBytes: null,
      rssUnavailableKind: 'command-wrapper-no-rss',
      rssUnavailableReason: 'command RSS sampling did not report maximum resident set size',
      profileSummary: {
        tailDiagnostics: {
          referenceResolutionLookupCache: { candidateProtocol: null },
          edgeWriteCleanup: { cleanupOwnership: null, guardedEdgeWrite: null, moduleEdgeWrite: null },
          semanticReplayMatcherSafety: { semanticReplay: null, rustMatcherFallbackReasons: null },
        },
      },
    });
  });

  it('records init failure output for setup failures', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-init-fail-'));
    const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-bin-'));
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-baseline-out-'));
    tempDirs.push(fixture, binDir, outDir);
    spawnSync('git', ['init'], { cwd: fixture, stdio: 'ignore' });

    const fakeBin = path.join(binDir, 'zcodegraph.js');
    fs.writeFileSync(fakeBin, [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      'if (args[0] === "init") { process.stderr.write("init exploded\\n"); process.exit(7); }',
      'if (args[0] === "status") { process.stdout.write(JSON.stringify({ initialized: false })); process.exit(0); }',
      'process.exit(2);',
    ].join('\n'));

    const out = path.join(outDir, 'baseline-result.json');
    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--bin', fakeBin, '--out', out, '--repo', `fixture=${fixture}`],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      resultClassification: string;
      results: Array<{ status: string; runs: Array<{ status: string; exitCode: number; failureOutput: { stderrTail: string } }> }>;
    };
    expect(artifact.resultClassification).toBe('baseline-run-failed');
    expect(artifact.results[0]!.runs[0]).toMatchObject({
      status: 'failed',
      exitCode: 7,
      failureOutput: { stderrTail: 'init exploded\n' },
    });
  });
});
