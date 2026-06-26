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
    const dbPath = path.join(dir, 'zcodegraph.db');
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
        ('token1', 'interface', 'ServiceToken', 'ServiceToken', 'src/token.ts', 'typescript', 1, 1),
        ('token2', 'constant', 'ServiceToken', 'ServiceToken', 'src/token.ts', 'typescript', 3, 3),
        ('type1', 'type_alias', 'TypeValueThing', 'TypeValueThing', 'src/type-value.ts', 'typescript', 1, 1),
        ('type2', 'constant', 'TypeValueThing', 'TypeValueThing', 'src/type-value.ts', 'typescript', 4, 4),
        ('enum1', 'interface', 'EnumThing', 'EnumThing', 'src/enum.ts', 'typescript', 1, 1),
        ('enum2', 'enum', 'EnumThing', 'EnumThing', 'src/enum.ts', 'typescript', 4, 4);
    `);
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'src', 'main.ts'),
      [
        'import { MergedThing } from "./merged";',
        'import { overloaded } from "./overload";',
        'import { Duplicated } from "./dup";',
        'import { ServiceToken } from "./token";',
        'import type { TypeValueThing } from "./type-value";',
        'import { EnumThing } from "./enum";',
        'class Consumer {',
        '  constructor(@ServiceToken service: unknown) {}',
        '}',
        'type Alias = TypeValueThing;',
        'const enumValue = EnumThing.Value;',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        rustCore: {
          esmNamedImportExportOverloadImplementationResolvedRefs: 3,
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
            {
              reason: 'direct-export-candidate-multiple',
              referenceName: 'ServiceToken',
              referenceKind: 'imports',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 4,
              col: 9,
              targetFilePath: 'src/token.ts',
              candidateCount: 2,
              resolvedByAttempt: 'direct-export',
            },
            {
              reason: 'direct-export-candidate-multiple',
              referenceName: 'TypeValueThing',
              referenceKind: 'imports',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 5,
              col: 14,
              targetFilePath: 'src/type-value.ts',
              candidateCount: 2,
              resolvedByAttempt: 'direct-export',
            },
            {
              reason: 'direct-export-candidate-multiple',
              referenceName: 'EnumThing',
              referenceKind: 'imports',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 6,
              col: 9,
              targetFilePath: 'src/enum.ts',
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
        '--source-root',
        dir,
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
    expect(parsed.summary.rowsInspected).toBe(7);
    expect(parsed.summary.subtypes).toMatchObject({
      'class-plus-interface': 1,
      'function-overload-signature': 1,
      'duplicate-extraction': 1,
      'value-token-plus-interface': 1,
      'type-alias-plus-value': 1,
      'enum-or-namespace-plus-type': 1,
    });
    expect(parsed.summary.largestSubtype).toBe('class-plus-interface');

    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      databaseOpened: boolean;
      sourceFilesRead: number;
      collisionSubtypes: Record<string, {
        count: number;
        recommendation: string;
      }>;
      subtypes: Record<string, {
        count: number;
        decisionPosture: string;
        syntaxSummary: {
          importForms: Record<string, number>;
          usageContextHints: Record<string, number>;
          candidateShapes: Record<string, number>;
        };
        examples: Array<Record<string, unknown>>;
      }>;
      boundedTieBreakCandidates: string[];
      noGoSubtypes: string[];
      resolvedEvidence: { overloadImplementationResolvedRefs: number };
    };
    expect(artifact.resolvedEvidence.overloadImplementationResolvedRefs).toBe(3);
    expect(artifact.databaseOpened).toBe(true);
    expect(artifact.sourceFilesRead).toBe(1);
    expect(artifact.subtypes['duplicate-extraction'].decisionPosture).toBe('prerequisite-first');
    expect(artifact.subtypes['class-plus-interface'].decisionPosture).toBe('no-go-keep-fallback');
    expect(artifact.boundedTieBreakCandidates).toContain('duplicate-extraction');
    expect(artifact.noGoSubtypes).toContain('class-plus-interface');
    expect(artifact.collisionSubtypes['value-token-plus-interface']).toMatchObject({
      count: 1,
      recommendation: 'candidate-for-next-routing-slice',
    });
    expect(artifact.collisionSubtypes['type-alias-plus-value']).toMatchObject({
      count: 1,
      recommendation: 'no-go-keep-fallback',
    });
    expect(artifact.subtypes['class-plus-interface'].examples[0]).toMatchObject({
      referenceName: 'MergedThing',
      targetFilePath: 'src/merged.ts',
      candidateKinds: ['interface', 'class'],
    });
    expect(artifact.subtypes['class-plus-interface'].examples[0]).not.toHaveProperty('source');
    expect(artifact.subtypes['class-plus-interface'].examples[0]).not.toHaveProperty('sourceLine');
    expect(artifact.subtypes['class-plus-interface'].examples[0]).not.toHaveProperty('candidateSource');
    expect(artifact.subtypes['class-plus-interface'].examples[0]).not.toHaveProperty('exportList');
    expect(artifact.subtypes['value-token-plus-interface'].examples[0]).toMatchObject({
      importForm: 'named-value-import',
      usageContextHint: 'decorator-token',
      candidateShape: 'constant-interface',
      collisionRecommendation: 'candidate-for-next-routing-slice',
    });
    expect(artifact.subtypes['value-token-plus-interface'].syntaxSummary).toMatchObject({
      importForms: { 'named-value-import': 1 },
      usageContextHints: { 'decorator-token': 1 },
      candidateShapes: { 'constant-interface': 1 },
    });
    expect(artifact.subtypes['type-alias-plus-value'].examples[0]).toMatchObject({
      importForm: 'import-type',
      usageContextHint: 'type-position',
      candidateShape: 'type-alias-value',
      collisionRecommendation: 'no-go-keep-fallback',
    });
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
    expect(markdown).toContain('class-plus-interface');
    expect(markdown).toContain('value-token-plus-interface');
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
