import { describe, expect, it, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-indexing-evidence.mjs');

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function target(name: string, overrides: Record<string, unknown> = {}) {
  return {
    name,
    targetClass: name === 'vscode' ? 'stress' : 'required',
    requiredForDecision: name !== 'vscode',
    emptyCorpus: { status: 'valid', diagnostics: [] },
    arms: {
      typescript: {
        execution: { status: 'completed', elapsedMs: 1000, peakRssBytes: 1000 },
        graphStats: { fileCount: 2, nodeCount: 10, edgeCount: 20, nodeKinds: { file: 2, function: 8 }, edgeKinds: { contains: 10, calls: 10 } },
      },
      rust: {
        execution: {
          status: 'completed',
          elapsedMs: 1400,
          peakRssBytes: 900,
          indexProfile: {
            rustCore: {
              parseExtractionMs: 100,
              sqliteWriteMs: 80,
              importPathAliasResolutionMs: 20,
              esmNamedImportExportResolutionMs: 30,
              localExactReferenceResolutionMs: 300,
            },
            finalize: {
              referenceResolutionMs: 200,
              referenceResolutionBreakdown: {
                databaseAccessMs: 120,
                nameMatchingMs: 40,
                edgeWriteDbMs: 20,
              },
            },
            typescriptFinalizationMs: 500,
          },
        },
        graphStats: { fileCount: 2, nodeCount: 10, edgeCount: 20, nodeKinds: { file: 2, function: 8 }, edgeKinds: { contains: 10, calls: 10 } },
      },
    },
    gates: {
      sufficiency: { status: 'passed', regressions: [] },
      performance: { status: 'unavailable', wallTimeDeltaPct: 40, peakRssDeltaPct: -10 },
    },
    classification: 'target-failed-performance-gate-unmet',
    ...overrides,
  };
}

function artifact(overrides: Record<string, unknown> = {}) {
  return {
    experimentId: 'fixture-before',
    classification: 'failed-required-performance-gate-unmet',
    decisionReadiness: { rolloutReadinessClaimed: false },
    targets: [target('zcodegraph'), target('vscode')],
    ...overrides,
  };
}

describe('Rust indexing evidence pipeline', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('generates a before/after comparison markdown from raw artifacts', () => {
    const temp = makeTempDir('zcodegraph-rust-evidence-');
    tempDirs.push(temp);
    const before = path.join(temp, 'before.json');
    const after = path.join(temp, 'after.json');
    const out = path.join(temp, 'comparison.md');
    writeJson(before, artifact());
    writeJson(
      after,
      artifact({
        experimentId: 'fixture-after',
        targets: [
          target('zcodegraph', {
            arms: {
              ...target('zcodegraph').arms,
              rust: {
                ...target('zcodegraph').arms.rust,
                execution: {
                  ...target('zcodegraph').arms.rust.execution,
                  elapsedMs: 1200,
                  indexProfile: {
                    ...target('zcodegraph').arms.rust.execution.indexProfile,
                    rustCore: {
                      ...target('zcodegraph').arms.rust.execution.indexProfile.rustCore,
                      sqliteWriteMs: 60,
                      localExactReferenceResolutionMs: 240,
                    },
                  },
                },
              },
            },
            gates: { sufficiency: { status: 'passed', regressions: [] }, performance: { status: 'unavailable', wallTimeDeltaPct: 20, peakRssDeltaPct: -10 } },
          }),
          target('vscode'),
        ],
      }),
    );

    const result = spawnSync(process.execPath, [SCRIPT, '--before', before, '--after', after, '--out', out], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const markdown = fs.readFileSync(out, 'utf-8');
    expect(markdown).toContain('# Rust Indexing Evidence Comparison');
    expect(markdown).toContain('| zcodegraph | required | yes | valid | passed | unchanged |');
    expect(markdown).toContain('| zcodegraph | 1400 | 1200 | -14.29% | 80 | 60 | -25.00% |');
    expect(markdown).toContain('| zcodegraph | parseExtractionMs | 100 | 100 | 0.00% |');
    expect(markdown).toContain('| zcodegraph | localExactReferenceResolutionMs | 300 | 240 | -20.00% |');
    expect(markdown).toContain('| zcodegraph | TypeScript finalization | 500 | 500 | 0.00% |');
    expect(markdown).toContain('| zcodegraph | databaseAccessMs | 120 | 120 | 0.00% |');
    expect(markdown).not.toContain('[object Object]');
    expect(markdown).toContain('Rust default rollout readiness is not claimed');
  });

  it('documents the evidence contract and RSS unavailable reasons', () => {
    const temp = makeTempDir('zcodegraph-rust-evidence-contract-');
    tempDirs.push(temp);
    const before = path.join(temp, 'before.json');
    const after = path.join(temp, 'after.json');
    const out = path.join(temp, 'comparison.md');
    writeJson(
      before,
      artifact({
        targets: [
          target('zcodegraph', {
            arms: {
              ...target('zcodegraph').arms,
              rust: {
                ...target('zcodegraph').arms.rust,
                execution: {
                  ...target('zcodegraph').arms.rust.execution,
                  peakRssBytes: null,
                  peakRssUnavailableReason: 'rss sampler disabled in fixture',
                },
              },
            },
          }),
        ],
      }),
    );
    writeJson(
      after,
      artifact({
        experimentId: 'fixture-after',
        targets: [
          target('zcodegraph', {
            arms: {
              ...target('zcodegraph').arms,
              rust: {
                ...target('zcodegraph').arms.rust,
                execution: {
                  ...target('zcodegraph').arms.rust.execution,
                  peakRssBytes: null,
                  peakRssUnavailableReason: 'rss sampler disabled in fixture',
                },
              },
            },
          }),
        ],
      }),
    );

    const result = spawnSync(process.execPath, [SCRIPT, '--before', before, '--after', after, '--out', out], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const markdown = fs.readFileSync(out, 'utf-8');
    expect(markdown).toContain('## Evidence Contract');
    expect(markdown).toContain('- Scope: local before/after artifact comparison; no GitHub or network side effects.');
    expect(markdown).toContain('- RSS: records peak RSS bytes when available, otherwise records an unavailable reason.');
    expect(markdown).toContain('| zcodegraph | n/a | n/a | n/a | rss sampler disabled in fixture | rss sampler disabled in fixture |');
  });

  it('ranks the next candidate and documents excluded directions', () => {
    const temp = makeTempDir('zcodegraph-rust-evidence-ranking-');
    tempDirs.push(temp);
    const before = path.join(temp, 'before.json');
    const after = path.join(temp, 'after.json');
    const out = path.join(temp, 'comparison.md');
    writeJson(before, artifact());
    writeJson(after, artifact({ experimentId: 'fixture-after' }));

    const result = spawnSync(process.execPath, [SCRIPT, '--before', before, '--after', after, '--out', out], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const markdown = fs.readFileSync(out, 'utf-8');
    expect(markdown).toContain('## Candidate Ranking');
    expect(markdown).toContain('Recommend next bounded candidate: localExactReferenceResolutionMs.');
    expect(markdown).toContain('| 1 | localExactReferenceResolutionMs | 300 | 300 | 600 | zcodegraph:300, vscode:300 |');
    expect(markdown).toContain('#208 candidate replay verifier');
    expect(markdown).toContain('#209 TypeScript finalization edge-write-only');
    expect(markdown).toContain('#211 FTS-trigger bulk write');
  });

  it('generates a standard decision artifact draft with a tracker update section', () => {
    const temp = makeTempDir('zcodegraph-rust-evidence-decision-');
    tempDirs.push(temp);
    const before = path.join(temp, 'before.json');
    const after = path.join(temp, 'after.json');
    const comparisonOut = path.join(temp, 'comparison.md');
    const decisionOut = path.join(temp, 'decision.md');
    writeJson(before, artifact());
    writeJson(after, artifact({ experimentId: 'fixture-after' }));

    const result = spawnSync(process.execPath, [SCRIPT, '--before', before, '--after', after, '--out', comparisonOut, '--decision-out', decisionOut], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const decision = fs.readFileSync(decisionOut, 'utf-8');
    expect(decision).toContain('# Rust Indexing Optimization Decision Draft');
    expect(decision).toContain('Keep the implementation if this draft corresponds to a completed bounded candidate.');
    expect(decision).toContain('Recommend next bounded candidate: localExactReferenceResolutionMs.');
    expect(decision).toContain('## Tracker Update Draft');
    expect(decision).toContain('- Sufficiency: passed on all compared targets.');
    expect(decision).toContain('- Rust graphStats parity: unchanged on all compared targets.');
    expect(decision).toContain('Rust default rollout readiness is not claimed');
  });
});
