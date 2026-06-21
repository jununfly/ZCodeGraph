import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-esm-candidate-multiple-taxonomy.mjs');

function sqlite(dbPath: string, sql: string) {
  const result = spawnSync('sqlite3', [dbPath, sql], { encoding: 'utf-8' });
  expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
}

describe('Rust ESM direct export candidate-multiple taxonomy script', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('classifies candidate-multiple samples from profile and DB metadata', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-esm-multiple-taxonomy-'));
    tempDirs.push(dir);
    const profilePath = path.join(dir, 'profile.json');
    const dbPath = path.join(dir, 'codegraph.db');
    const outDir = path.join(dir, 'artifacts');

    sqlite(dbPath, `
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        qualified_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        language TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL
      );
      INSERT INTO nodes VALUES
        ('iface', 'interface', 'MergedThing', 'MergedThing', 'src/merged.ts', 'typescript', 1, 3),
        ('class', 'class', 'MergedThing', 'MergedThing', 'src/merged.ts', 'typescript', 5, 7),
        ('over1', 'function', 'overloaded', 'overloaded', 'src/overload.ts', 'typescript', 1, 1),
        ('over2', 'function', 'overloaded', 'overloaded', 'src/overload.ts', 'typescript', 2, 2),
        ('dup1', 'constant', 'Duplicated', 'Duplicated', 'src/dup.ts', 'typescript', 4, 4),
        ('dup2', 'constant', 'Duplicated', 'Duplicated', 'src/dup.ts', 'typescript', 4, 4),
        ('unk1', 'type_alias', 'UnknownThing', 'UnknownThing', 'src/unknown.ts', 'typescript', 1, 1),
        ('unk2', 'constant', 'UnknownThing', 'UnknownThing', 'src/unknown.ts', 'typescript', 4, 4);
    `);
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        rustCore: {
          esmNamedImportExportFallbackSamples: [
            {
              reason: 'direct-export-candidate-multiple',
              referenceName: 'MergedThing',
              referenceKind: 'imports',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 1,
              col: 9,
              targetFilePath: 'src/merged.ts',
              candidateCount: 2,
              resolvedByAttempt: 'direct-export',
            },
            {
              reason: 'direct-export-candidate-multiple',
              referenceName: 'overloaded',
              referenceKind: 'imports',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 2,
              col: 9,
              targetFilePath: 'src/overload.ts',
              candidateCount: 2,
              resolvedByAttempt: 'direct-export',
              candidateLineRanges: [
                {
                  kind: 'function',
                  startLine: 1,
                  endLine: 1,
                  hasBody: false,
                  declarationForm: 'signature',
                  metadataSource: 'target-file-line-range-inference',
                },
                {
                  kind: 'function',
                  startLine: 2,
                  endLine: 4,
                  hasBody: true,
                  declarationForm: 'implementation',
                  metadataSource: 'target-file-line-range-inference',
                },
              ],
            },
            {
              reason: 'same-file-export-specifier-candidate-multiple',
              referenceName: 'Duplicated',
              referenceKind: 'imports',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 3,
              col: 9,
              targetFilePath: 'src/dup.ts',
              candidateCount: 2,
              resolvedByAttempt: 'same-file-export-specifier',
            },
            {
              reason: 'direct-export-candidate-multiple',
              referenceName: 'UnknownThing',
              referenceKind: 'imports',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 4,
              col: 9,
              targetFilePath: 'src/unknown.ts',
              candidateCount: 2,
              resolvedByAttempt: 'direct-export',
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
        '--db',
        dbPath,
        '--out-dir',
        outDir,
        '--prefix',
        'fixture-candidate-multiple-taxonomy',
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      artifacts: { json: string; markdown: string };
      summary: {
        rowsInspected: number;
        subtypes: Record<string, number>;
        largestSubtype: string;
      };
    };
    expect(parsed.summary.rowsInspected).toBe(4);
    expect(parsed.summary.subtypes).toMatchObject({
      'interface-class-merge': 1,
      'function-overload-signature': 1,
      'duplicate-extraction': 1,
      'type-value-namespace-collision': 1,
    });
    expect(parsed.summary.largestSubtype).toBe('duplicate-extraction');

    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      databaseOpened: boolean;
      sourceFilesRead: number;
      subtypes: Record<string, {
        count: number;
        decisionPosture: string;
        examples: Array<Record<string, unknown>>;
      }>;
      boundedTieBreakCandidates: string[];
      noGoSubtypes: string[];
    };
    expect(artifact.databaseOpened).toBe(true);
    expect(artifact.sourceFilesRead).toBe(0);
    expect(artifact.subtypes['duplicate-extraction'].decisionPosture).toBe('prerequisite-first');
    expect(artifact.subtypes['interface-class-merge'].decisionPosture).toBe('no-go-keep-fallback');
    expect(artifact.boundedTieBreakCandidates).toContain('duplicate-extraction');
    expect(artifact.noGoSubtypes).toContain('interface-class-merge');
    expect(artifact.subtypes['interface-class-merge'].examples[0]).toMatchObject({
      referenceName: 'MergedThing',
      targetFilePath: 'src/merged.ts',
      candidateKinds: ['interface', 'class'],
    });
    expect(artifact.subtypes['interface-class-merge'].examples[0]).not.toHaveProperty('source');
    expect(artifact.subtypes['interface-class-merge'].examples[0]).not.toHaveProperty('sourceLine');
    expect(artifact.subtypes['interface-class-merge'].examples[0]).not.toHaveProperty('candidateSource');
    expect(artifact.subtypes['interface-class-merge'].examples[0]).not.toHaveProperty('exportList');
    expect(artifact.subtypes['function-overload-signature'].examples[0]).toMatchObject({
      candidateLineRanges: [
        {
          kind: 'function',
          startLine: 1,
          endLine: 1,
          hasBody: false,
          declarationForm: 'signature',
          metadataSource: 'target-file-line-range-inference',
        },
        {
          kind: 'function',
          startLine: 2,
          endLine: 4,
          hasBody: true,
          declarationForm: 'implementation',
          metadataSource: 'target-file-line-range-inference',
        },
      ],
    });

    const markdown = fs.readFileSync(parsed.artifacts.markdown, 'utf-8');
    expect(markdown).toContain('# ESM Direct Export Candidate-Multiple Taxonomy');
    expect(markdown).toContain('interface-class-merge');
    expect(markdown).toContain('Decision');
  });

  it('reports unavailable DB metadata without reading source files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-esm-multiple-taxonomy-missing-db-'));
    tempDirs.push(dir);
    const profilePath = path.join(dir, 'profile.json');
    const outDir = path.join(dir, 'artifacts');
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        rustCore: {
          esmNamedImportExportFallbackSamples: [
            {
              reason: 'direct-export-candidate-multiple',
              referenceName: 'MissingDbThing',
              referenceKind: 'imports',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 1,
              col: 9,
              targetFilePath: 'src/missing.ts',
              candidateCount: 2,
              resolvedByAttempt: 'direct-export',
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
        '--db',
        path.join(dir, 'missing.db'),
        '--out-dir',
        outDir,
        '--prefix',
        'missing-db-candidate-multiple-taxonomy',
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      summary: {
        rowsInspected: number;
        databaseUnavailableReason: string;
        subtypes: Record<string, number>;
      };
    };
    expect(parsed.summary.rowsInspected).toBe(1);
    expect(parsed.summary.databaseUnavailableReason).toContain('Database not found');
    expect(parsed.summary.subtypes['unknown-multiple']).toBe(1);
  });
});
