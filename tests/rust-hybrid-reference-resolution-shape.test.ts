import { describe, expect, it, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-hybrid-reference-resolution-shape.mjs');
const FIXTURE_SCRIPT = path.join(REPO_ROOT, 'scripts', 'generate-reference-resolution-fixture.mjs');
const SMOKE_SCRIPT = path.join(REPO_ROOT, 'scripts', 'rust-hybrid-reference-resolution-fixture-smoke.mjs');

function createShapeDb(dbPath: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE files (
      path TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      language TEXT NOT NULL,
      size INTEGER NOT NULL,
      modified_at INTEGER NOT NULL,
      indexed_at INTEGER NOT NULL,
      node_count INTEGER DEFAULT 0,
      errors TEXT
    );
    CREATE TABLE nodes (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      qualified_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      language TEXT NOT NULL,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      start_column INTEGER NOT NULL,
      end_column INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      kind TEXT NOT NULL,
      metadata TEXT,
      edgeOrigin TEXT DEFAULT NULL
    );
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
  const fileInsert = db.prepare('INSERT INTO files VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  fileInsert.run('src/a.ts', 'a', 'typescript', 100, 1, 1, 2, '[]');
  fileInsert.run('src/b.ts', 'b', 'typescript', 200, 1, 1, 1, '[]');
  fileInsert.run('src/c.js', 'c', 'javascript', 150, 1, 1, 1, '[]');

  const nodeInsert = db.prepare(`
    INSERT INTO nodes (
      id, kind, name, qualified_name, file_path, language, start_line, end_line,
      start_column, end_column, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  nodeInsert.run('n1', 'function', 'alpha', 'alpha', 'src/a.ts', 'typescript', 1, 3, 0, 1, 1);
  nodeInsert.run('n2', 'function', 'beta', 'beta', 'src/b.ts', 'typescript', 1, 3, 0, 1, 1);
  nodeInsert.run('n3', 'class', 'Thing', 'Thing', 'src/c.js', 'javascript', 1, 5, 0, 1, 1);

  const edgeInsert = db.prepare('INSERT INTO edges (source, target, kind, metadata, edgeOrigin) VALUES (?, ?, ?, ?, ?)');
  edgeInsert.run('n1', 'n2', 'references', '{}', 'rust-reference-resolution');
  edgeInsert.run('n1', 'n3', 'imports', '{}', 'rust-import-resolution');
  edgeInsert.run('n2', 'n3', 'references', '{}', null);

  const refInsert = db.prepare(`
    INSERT INTO unresolved_refs (
      from_node_id, reference_name, reference_kind, line, col, candidates, file_path, language
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  refInsert.run('n1', 'alpha', 'calls', 10, 2, JSON.stringify(['n1', 'n2']), 'src/a.ts', 'typescript');
  refInsert.run('n1', 'beta', 'references', 11, 2, JSON.stringify(['n2']), 'src/a.ts', 'typescript');
  refInsert.run('n2', './c', 'imports', 1, 8, JSON.stringify(['src/c.js']), 'src/b.ts', 'typescript');
  refInsert.run('n3', 'Thing', 'references', 6, 2, JSON.stringify(['n3']), 'src/c.js', 'javascript');
  db.close();
}

describe('rust-hybrid reference-resolution shape report', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes a shape report from an existing DB and profile artifact', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-shape-report-'));
    tempDirs.push(dir);
    const dbPath = path.join(dir, 'zcodegraph.db');
    const profilePath = path.join(dir, 'partial.profile.json');
    const resultPath = path.join(dir, 'baseline-result.json');
    const outDir = path.join(dir, 'artifacts');
    createShapeDb(dbPath);
    fs.writeFileSync(profilePath, JSON.stringify({
      complete: false,
      checkpoints: [
        { name: 'rustCore.completed', state: 'completed', elapsedMs: 100 },
        { name: 'finalization.referenceResolution.started', state: 'started', elapsedMs: 120 },
      ],
      rustCore: { parseExtractionMs: 10, sqliteWriteMs: 20 },
    }));
    fs.writeFileSync(resultPath, JSON.stringify({
      resultClassification: 'baseline-partial-timeout',
      results: [{ name: 'fixture', status: 'timed-out' }],
    }));

    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--db',
        dbPath,
        '--profile',
        profilePath,
        '--result',
        resultPath,
        '--out-dir',
        outDir,
        '--prefix',
        'fixture-shape',
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      status: string;
      artifacts: { json: string; markdown: string };
      summary: {
        unresolvedReferenceCount: number;
        lastCheckpoint: { name: string };
        fixturePressureSources: string[];
      };
    };

    expect(parsed.status).toBe('completed');
    expect(parsed.summary.unresolvedReferenceCount).toBe(4);
    expect(parsed.summary.lastCheckpoint.name).toBe('finalization.referenceResolution.started');
    expect(parsed.summary.fixturePressureSources).toContain('reference-kind-mix');
    expect(parsed.summary.fixturePressureSources).toContain('candidate-cardinality-mix');

    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      status: string;
      graphShape: { filesByLanguage: Record<string, number>; nodesByKind: Record<string, number>; edgesByKind: Record<string, number> };
      referenceShape: { byKind: Record<string, number>; candidateCardinality: Record<string, number> };
      checkpointShape: { complete: boolean; lastCheckpoint: { name: string } };
      fixtureRecommendations: Array<{ source: string; recommendation: string }>;
    };
    expect(artifact.status).toBe('completed');
    expect(artifact.graphShape.filesByLanguage.typescript).toBe(2);
    expect(artifact.graphShape.nodesByKind.function).toBe(2);
    expect(artifact.graphShape.edgesByKind.references).toBe(2);
    expect(artifact.referenceShape.byKind.references).toBe(2);
    expect(artifact.referenceShape.candidateCardinality['1']).toBe(3);
    expect(artifact.checkpointShape.complete).toBe(false);
    expect(artifact.fixtureRecommendations.length).toBeGreaterThan(0);

    const markdown = fs.readFileSync(parsed.artifacts.markdown, 'utf-8');
    expect(markdown).toContain('# Rust-Hybrid Reference Resolution Shape Report');
    expect(markdown).toContain('finalization.referenceResolution.started');
    expect(markdown).toContain('candidate-cardinality-mix');
  });

  it('records needs-human-setup when the DB is unavailable', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-shape-missing-'));
    tempDirs.push(dir);
    const outDir = path.join(dir, 'artifacts');
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--db',
        path.join(dir, 'missing.db'),
        '--out-dir',
        outDir,
        '--prefix',
        'missing-shape',
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as { status: string; artifacts: { json: string } };
    expect(parsed.status).toBe('needs-human-setup');
    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      status: string;
      unavailableReason: string;
    };
    expect(artifact.status).toBe('needs-human-setup');
    expect(artifact.unavailableReason).toContain('DB path does not exist');
  });

  it('generates a deterministic reference-resolution pressure fixture', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-reference-fixture-'));
    tempDirs.push(dir);
    const firstOut = path.join(dir, 'first');
    const secondOut = path.join(dir, 'second');

    for (const out of [firstOut, secondOut]) {
      const result = spawnSync(
        process.execPath,
        [FIXTURE_SCRIPT, '--out', out, '--modules', '4', '--fanout', '3'],
        { cwd: REPO_ROOT, encoding: 'utf-8' },
      );
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    }

    const firstManifest = JSON.parse(fs.readFileSync(path.join(firstOut, 'fixture-manifest.json'), 'utf-8')) as {
      kind: string;
      modules: number;
      fanout: number;
      expectedPressureSources: string[];
      files: string[];
    };
    const secondManifest = JSON.parse(fs.readFileSync(path.join(secondOut, 'fixture-manifest.json'), 'utf-8')) as typeof firstManifest;

    expect(firstManifest).toEqual(secondManifest);
    expect(firstManifest).toMatchObject({
      kind: 'rust-hybrid-reference-resolution-pressure-fixture',
      modules: 4,
      fanout: 3,
    });
    expect(firstManifest.expectedPressureSources).toEqual(expect.arrayContaining([
      'edge-materialization-pressure',
      'resolved-edge-write-tail',
      'checkpoint-boundary',
    ]));
    expect(firstManifest.files).toContain('src/module-000.ts');
    expect(firstManifest.files).toContain('src/shared.ts');
    expect(fs.readFileSync(path.join(firstOut, 'src', 'module-000.ts'), 'utf-8')).toBe(
      fs.readFileSync(path.join(secondOut, 'src', 'module-000.ts'), 'utf-8'),
    );
    expect(fs.readFileSync(path.join(firstOut, 'src', 'module-000.ts'), 'utf-8')).toContain('sharedHelper0');
    expect(fs.readFileSync(path.join(firstOut, 'src', 'index.ts'), 'utf-8')).toContain('runModule000');
  });

  it('records a complete fixture profile smoke result', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-reference-smoke-'));
    tempDirs.push(dir);
    const fixture = path.join(dir, 'fixture');
    const out = path.join(dir, 'smoke-result.json');

    const generate = spawnSync(
      process.execPath,
      [FIXTURE_SCRIPT, '--out', fixture, '--modules', '4', '--fanout', '3'],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );
    expect(generate.status, `stdout:\n${generate.stdout}\nstderr:\n${generate.stderr}`).toBe(0);

    const result = spawnSync(
      process.execPath,
      [SMOKE_SCRIPT, '--fixture', fixture, '--out', out, '--bin', path.join(REPO_ROOT, 'dist', 'bin', 'zcodegraph.js')],
      {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: {
          ...process.env,
          CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
          CODEGRAPH_NO_DAEMON: '1',
          CODEGRAPH_NO_RELAUNCH: '1',
        },
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as { status: string; result: { profileComplete: boolean; referenceResolutionMs: number; edgeInsertCount: number } };
    expect(parsed.status).toBe('completed');
    expect(parsed.result.profileComplete).toBe(true);
    expect(parsed.result.referenceResolutionMs).toBeGreaterThanOrEqual(0);
    expect(parsed.result.edgeInsertCount).toBeGreaterThan(0);

    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      status: string;
      profile: { complete: boolean; checkpointNames: string[] };
      pressureSignal: {
        edgeInsertCount: number;
        candidateLookupCount: number;
        fileNodesLookup: {
          requestedCount: number;
          reusedCount: number;
          missedCount: number;
          fallbackCount: number;
          lookupMs: number;
        } | null;
      };
      budget: { targetMs: number; passed: boolean };
    };
    expect(artifact.status).toBe('completed');
    expect(artifact.profile.complete).toBe(true);
    expect(artifact.profile.checkpointNames).toContain('finalization.referenceResolution.started');
    expect(artifact.profile.checkpointNames).toContain('finalization.referenceResolution.completed');
    expect(artifact.pressureSignal.edgeInsertCount).toBeGreaterThan(0);
    expect(artifact.pressureSignal.candidateLookupCount).toBeGreaterThan(0);
    expect(artifact.pressureSignal.fileNodesLookup).toMatchObject({
      requestedCount: expect.any(Number),
      reusedCount: expect.any(Number),
      missedCount: expect.any(Number),
      fallbackCount: expect.any(Number),
      lookupMs: expect.any(Number),
    });
    expect(artifact.budget.targetMs).toBe(60_000);
  }, 30_000);
});
