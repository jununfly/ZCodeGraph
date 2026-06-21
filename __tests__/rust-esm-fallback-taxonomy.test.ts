import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-esm-fallback-taxonomy.mjs');

describe('Rust ESM named fallback taxonomy script', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes taxonomy artifacts from Rust profile samples', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-esm-taxonomy-'));
    tempDirs.push(dir);
    const profilePath = path.join(dir, 'profile.json');
    const outDir = path.join(dir, 'artifacts');
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        rustCore: {
          esmNamedImportExportFallbackSamples: [
            {
              reason: 'direct-export-candidate-zero',
              referenceName: 'MissingExport',
              referenceKind: 'imports',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 1,
              col: 9,
              targetFilePath: 'src/target.ts',
              candidateCount: 0,
              resolvedByAttempt: 'direct-export',
            },
            {
              reason: 'package-or-runtime-binding',
              referenceName: 'describe',
              referenceKind: 'imports',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 2,
              col: 9,
            },
            {
              reason: 'unsupported-import-shape',
              referenceName: 'DefaultThing',
              referenceKind: 'imports',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 3,
              col: 9,
              targetFilePath: 'src/default-target.ts',
            },
          ],
        },
      }, null, 2),
    );

    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--profile',
        profilePath,
        '--out-dir',
        outDir,
        '--prefix',
        'fixture-esm-taxonomy',
      ],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      artifacts: { json: string; markdown: string };
      summary: {
        rowsInspected: number;
        reasons: Record<string, number>;
        candidateNextSlice: string;
      };
    };

    expect(parsed.summary.rowsInspected).toBe(3);
    expect(parsed.summary.reasons.directExportCandidateGap).toBe(1);
    expect(parsed.summary.reasons.packageOrRuntimeBoundary).toBe(1);
    expect(parsed.summary.reasons.unsupportedImportShape).toBe(1);
    expect(parsed.summary.candidateNextSlice).toContain('direct export candidate gaps');

    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      dataSource: string;
      rowsInspected: number;
      reasons: Record<string, { count: number; examples: Array<Record<string, unknown>> }>;
      candidateNextSlice: string;
    };
    expect(artifact.dataSource).toBe('rustCore.esmNamedImportExportFallbackSamples');
    expect(artifact.rowsInspected).toBe(3);
    expect(artifact.reasons.directExportCandidateGap.count).toBe(1);
    expect(artifact.reasons.directExportCandidateGap.examples[0]).toMatchObject({
      referenceName: 'MissingExport',
      targetFilePath: 'src/target.ts',
      candidateCount: 0,
      resolvedByAttempt: 'direct-export',
    });
    expect(artifact.reasons.directExportCandidateGap.examples[0]).not.toHaveProperty('source');
    expect(artifact.reasons.directExportCandidateGap.examples[0]).not.toHaveProperty('sourceLine');
    expect(artifact.reasons.directExportCandidateGap.examples[0]).not.toHaveProperty('candidateNames');

    const markdown = fs.readFileSync(parsed.artifacts.markdown, 'utf-8');
    expect(markdown).toContain('# ESM Named Binding Fallback Taxonomy');
    expect(markdown).toContain('directExportCandidateGap');
    expect(markdown).toContain('Candidate next slice');
  });

  it('reports unavailable samples without needing a database or source files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-esm-taxonomy-empty-'));
    tempDirs.push(dir);
    const profilePath = path.join(dir, 'profile.json');
    const outDir = path.join(dir, 'artifacts');
    fs.writeFileSync(profilePath, JSON.stringify({ rustCore: {} }, null, 2));

    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--profile', profilePath, '--out-dir', outDir, '--prefix', 'empty-esm-taxonomy'],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      summary: {
        rowsInspected: number;
        sampleSourceUnavailableReason: string;
        candidateNextSlice: string;
      };
    };
    expect(parsed.summary.rowsInspected).toBe(0);
    expect(parsed.summary.sampleSourceUnavailableReason).toContain(
      'rustCore.esmNamedImportExportFallbackSamples',
    );
    expect(parsed.summary.candidateNextSlice).toBe('no samples available');
  });
});
