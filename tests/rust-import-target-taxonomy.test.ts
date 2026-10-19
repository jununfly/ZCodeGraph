import { describe, expect, it, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-import-target-taxonomy.mjs');

function createSqliteDb(dbPath: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE unresolved_refs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_node_id TEXT NOT NULL,
      reference_name TEXT NOT NULL,
      reference_kind TEXT NOT NULL,
      line INTEGER NOT NULL,
      col INTEGER NOT NULL,
      candidates TEXT,
      file_path TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'unknown'
    );
  `);
  const insert = db.prepare(`
    INSERT INTO unresolved_refs (
      from_node_id, reference_name, reference_kind, line, col, candidates, file_path, language
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['from1', './views/App.ts?raw', 'imports', 1, 8, '[]', 'src/main.ts', 'typescript'],
    ['from2', './styles/app.css', 'imports', 2, 8, '[]', 'src/main.ts', 'typescript'],
    ['from3', '../model/user', 'imports', 3, 8, '[]', 'src/main.ts', 'typescript'],
    ['from4', './types/foo.d.ts', 'imports', 4, 8, '[]', 'src/main.ts', 'typescript'],
    ['from5', 'react', 'imports', 5, 8, '[]', 'src/main.ts', 'typescript'],
    ['from6', './ignored', 'calls', 6, 8, '[]', 'src/main.ts', 'typescript'],
    ['from7', './py', 'imports', 7, 8, '[]', 'src/main.py', 'python'],
  ] as const;
  for (const row of rows) {
    insert.run(...row);
  }
  db.close();
}

describe('Rust import target taxonomy script', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('classifies relative unresolved JS/TS imports from DB metadata', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-import-taxonomy-'));
    tempDirs.push(dir);
    const dbPath = path.join(dir, 'zcodegraph.db');
    const outDir = path.join(dir, 'artifacts');
    createSqliteDb(dbPath);

    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--db',
        dbPath,
        '--out-dir',
        outDir,
        '--prefix',
        'fixture-taxonomy',
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
        totalRelativeUnresolvedImports: number;
        categories: Record<string, number>;
      };
    };

    expect(parsed.summary.totalRelativeUnresolvedImports).toBe(4);
    expect(parsed.summary.categories.queryHashSupportedSource).toBe(1);
    expect(parsed.summary.categories.assetLikeTarget).toBe(1);
    expect(parsed.summary.categories.extensionlessOrIndexCandidate).toBe(1);
    expect(parsed.summary.categories.declarationTarget).toBe(1);

    expect(fs.existsSync(parsed.artifacts.json)).toBe(true);
    expect(fs.existsSync(parsed.artifacts.markdown)).toBe(true);

    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      rowsInspected: number;
      ignoredRows: Record<string, number>;
      categories: Record<string, { count: number }>;
    };

    expect(artifact.rowsInspected).toBe(7);
    expect(artifact.ignoredRows.nonRelativeImport).toBe(1);
    expect(artifact.ignoredRows.nonImportReference).toBe(1);
    expect(artifact.ignoredRows.unsupportedLanguage).toBe(1);
    expect(artifact.categories.queryHashSupportedSource?.count).toBe(1);
    expect(artifact.categories.assetLikeTarget?.count).toBe(1);

    const markdown = fs.readFileSync(parsed.artifacts.markdown, 'utf-8');
    expect(markdown).toContain('# Relative Import Target Taxonomy');
    expect(markdown).toContain('queryHashSupportedSource');
    expect(markdown).toContain('assetLikeTarget');
  });

  it('classifies Rust core fallback samples from profile artifacts', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-import-taxonomy-profile-'));
    tempDirs.push(dir);
    const profilePath = path.join(dir, 'profile.json');
    const outDir = path.join(dir, 'artifacts');
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        rustCore: {
          importPathAliasFallbackSamples: [
            {
              sourceKind: 'relative',
              reason: 'target-not-found',
              referenceName: './view.ts?raw',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 1,
              col: 8,
            },
            {
              sourceKind: 'relative',
              reason: 'file-node-not-found',
              referenceName: './style.css',
              targetKind: 'asset',
              targetExtension: '.css',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 2,
              col: 8,
            },
            {
              sourceKind: 'relative',
              reason: 'file-node-not-found',
              referenceName: './settings.json',
              targetKind: 'config',
              targetExtension: '.json',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 3,
              col: 8,
            },
            {
              sourceKind: 'relative',
              reason: 'target-not-found',
              referenceName: './asset.svg',
              filePath: 'src/main.ts',
              language: 'typescript',
              line: 4,
              col: 8,
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
        'fixture-profile-taxonomy',
      ],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      summary: {
        totalRelativeUnresolvedImports: number;
        categories: Record<string, number>;
      };
    };

    expect(parsed.summary.totalRelativeUnresolvedImports).toBe(4);
    expect(parsed.summary.categories.queryHashSupportedSource).toBe(1);
    expect(parsed.summary.categories.nonCodeAssetTarget).toBe(1);
    expect(parsed.summary.categories.nonCodeConfigTarget).toBe(1);
    expect(parsed.summary.categories.assetLikeTarget).toBe(1);

    const artifact = JSON.parse(
      fs.readFileSync(path.join(outDir, 'fixture-profile-taxonomy.json'), 'utf-8'),
    ) as {
      dataSource: string;
      sampleSourceUnavailableReason?: string;
      categories: Record<string, { count: number }>;
    };

    expect(artifact.dataSource).toBe('rustCore.importPathAliasFallbackSamples');
    expect(artifact.sampleSourceUnavailableReason).toBeUndefined();
    expect(artifact.categories.queryHashSupportedSource?.count).toBe(1);
    expect(artifact.categories.nonCodeAssetTarget?.count).toBe(1);
    expect(artifact.categories.nonCodeConfigTarget?.count).toBe(1);
    expect(artifact.categories.assetLikeTarget?.count).toBe(1);
  });
});
