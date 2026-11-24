/**
 * Foundation Tests
 *
 * Tests for the CodeGraph foundation layer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CodeGraph } from '../src';
import type { IndexOptions, IndexResult } from '../src';
import { rebuildEmbeddingQueue } from '../src/embedding/queue';
import { createDatabase } from '../src/db/sqlite-adapter';
import type { SqliteDatabase } from '../src/db/sqlite-adapter';
import { Node, Edge } from '../src/types';
import { isInitialized, getCodeGraphDir, validateDirectory } from '../src/directory';
import { validatePathWithinRoot } from '../src/utils';
import {
  DatabaseConnection,
  getDatabasePath,
  issueJavaFinalizationToken,
} from '../src/db';

// Create a temporary directory for each test
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-test-'));
}

// Clean up temporary directory
function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('CodeGraph Foundation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Initialization', () => {
    it('should initialize a new project', () => {
      const cg = CodeGraph.initSync(tempDir);

      expect(CodeGraph.isInitialized(tempDir)).toBe(true);
      expect(fs.existsSync(getCodeGraphDir(tempDir))).toBe(true);
      expect(fs.existsSync(getDatabasePath(tempDir))).toBe(true);

      cg.close();
    });

    it('should create .gitignore in .zcodegraph directory', () => {
      const cg = CodeGraph.initSync(tempDir);

      const gitignorePath = path.join(getCodeGraphDir(tempDir), '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(getCodeGraphDir(tempDir)).toBe(path.join(tempDir, '.zcodegraph'));
      expect(getDatabasePath(tempDir)).toBe(path.join(tempDir, '.zcodegraph', 'zcodegraph.db'));

      // Ignore everything in .zcodegraph/ except this file itself, so transient
      // files (db, daemon.pid, sockets, logs) never show up in git. (#492, #484)
      expect(content).toContain('*');
      expect(content).toContain('!.gitignore');

      cg.close();
    });

    it('should throw if already initialized', () => {
      const cg = CodeGraph.initSync(tempDir);
      cg.close();

      expect(() => CodeGraph.initSync(tempDir)).toThrow(/already initialized/i);
    });
  });

  describe('Opening Projects', () => {
    it('should open an existing project', () => {
      // First initialize
      const cg1 = CodeGraph.initSync(tempDir);
      cg1.close();

      // Then open
      const cg2 = CodeGraph.openSync(tempDir);
      expect(cg2.getProjectRoot()).toBe(path.resolve(tempDir));
      cg2.close();
    });

    it('should throw if not initialized', () => {
      expect(() => CodeGraph.openSync(tempDir)).toThrow(/not initialized/i);
    });
  });

  describe('Static Methods', () => {
    it('isInitialized should return false for new directory', () => {
      expect(CodeGraph.isInitialized(tempDir)).toBe(false);
    });

    it('isInitialized should return true after init', () => {
      const cg = CodeGraph.initSync(tempDir);
      expect(CodeGraph.isInitialized(tempDir)).toBe(true);
      cg.close();
    });

    it('does not treat a legacy .codegraph database as initialized', () => {
      fs.mkdirSync(path.join(tempDir, '.codegraph'));
      fs.writeFileSync(path.join(tempDir, '.codegraph', 'codegraph.db'), '');

      expect(CodeGraph.isInitialized(tempDir)).toBe(false);
      expect(() => CodeGraph.openSync(tempDir)).toThrow(/not initialized/i);
    });
  });

  describe('Database', () => {
    it('should create database with correct schema', () => {
      const cg = CodeGraph.initSync(tempDir);

      // Check that we can get stats (requires tables to exist)
      const stats = cg.getStats();
      expect(stats.nodeCount).toBe(0);
      expect(stats.edgeCount).toBe(0);
      expect(stats.fileCount).toBe(0);

      cg.close();
    });

    it('should return correct database size', () => {
      const cg = CodeGraph.initSync(tempDir);
      const stats = cg.getStats();

      // Database should have some size (at least the schema)
      expect(stats.dbSizeBytes).toBeGreaterThan(0);

      cg.close();
    });

    it('should support optimize operation', () => {
      const cg = CodeGraph.initSync(tempDir);

      // Should not throw
      expect(() => cg.optimize()).not.toThrow();

      cg.close();
    });

    it('should support clear operation', async () => {
      const cg = CodeGraph.initSync(tempDir);

      await expect(cg.clear()).resolves.toBeUndefined();

      const stats = cg.getStats();
      expect(stats.nodeCount).toBe(0);

      cg.close();
    });
  });

  describe('Directory Management', () => {
    it('should validate directory structure', () => {
      const cg = CodeGraph.initSync(tempDir);
      cg.close();

      const validation = validateDirectory(tempDir);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid directory', () => {
      const validation = validateDirectory(tempDir);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Uninitialize', () => {
    it('should remove .zcodegraph directory', async () => {
      const cg = CodeGraph.initSync(tempDir);

      await cg.uninitialize();

      expect(fs.existsSync(getCodeGraphDir(tempDir))).toBe(false);
      expect(CodeGraph.isInitialized(tempDir)).toBe(false);
    });
  });

  describe('Close/Destroy', () => {
    it('should close database but keep .zcodegraph directory', () => {
      const cg = CodeGraph.initSync(tempDir);

      cg.destroy(); // destroy is alias for close

      expect(fs.existsSync(getCodeGraphDir(tempDir))).toBe(true);
      expect(CodeGraph.isInitialized(tempDir)).toBe(true);
    });
  });

  describe('Graph Query Methods', () => {
    it('should throw "Node not found" for non-existent nodes', () => {
      const cg = CodeGraph.initSync(tempDir);

      // getContext throws for non-existent nodes
      expect(() => cg.getContext('non-existent')).toThrow(/not found/i);

      cg.close();
    });

    it('should return empty results for non-existent nodes', () => {
      const cg = CodeGraph.initSync(tempDir);

      // These methods return empty results instead of throwing
      const traverseResult = cg.traverse('non-existent');
      expect(traverseResult.nodes.size).toBe(0);

      const callGraph = cg.getCallGraph('non-existent');
      expect(callGraph.nodes.size).toBe(0);

      const typeHierarchy = cg.getTypeHierarchy('non-existent');
      expect(typeHierarchy.nodes.size).toBe(0);

      const usages = cg.findUsages('non-existent');
      expect(usages.length).toBe(0);

      cg.close();
    });

  });
});

describe('Database Connection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should initialize new database', () => {
    const dbPath = path.join(tempDir, 'test.db');
    const db = DatabaseConnection.initialize(dbPath);

    expect(db.isOpen()).toBe(true);
    expect(fs.existsSync(dbPath)).toBe(true);

    db.close();
  });

  it('should get schema version', () => {
    const dbPath = path.join(tempDir, 'test.db');
    const db = DatabaseConnection.initialize(dbPath);

    const version = db.getSchemaVersion();
    expect(version).not.toBeNull();
    expect(version?.version).toBe(7);

    db.close();
  });

  it('should support transactions', () => {
    const dbPath = path.join(tempDir, 'test.db');
    const db = DatabaseConnection.initialize(dbPath);

    const result = db.transaction(() => {
      return 42;
    });

    expect(result).toBe(42);

    db.close();
  });

  it('should throw when opening non-existent database', () => {
    const dbPath = path.join(tempDir, 'nonexistent.db');

    expect(() => DatabaseConnection.open(dbPath)).toThrow(/not found/i);
  });

  it('1-9-15: rejects a required Java graph before connection configuration', () => {
    const dbPath = path.join(tempDir, 'required.db');
    const setup = DatabaseConnection.initialize(dbPath);
    const metadata = setup.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    );
    metadata.run('java_finalization_state', 'required', 1);
    metadata.run('java_fact_generation', 'p0b-java-v1', 1);
    setup.close();

    const before = fs.readFileSync(dbPath);
    expect(() => DatabaseConnection.open(dbPath)).toThrow(/Java.*required.*rebuild/i);
    expect(fs.readFileSync(dbPath)).toEqual(before);
  });

  it('1-9-15: admits only the token-bound run and pass to a required Java graph', () => {
    const dbPath = path.join(tempDir, 'token-required.db');
    const setup = DatabaseConnection.initialize(dbPath);
    const metadata = setup.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    );
    metadata.run('java_finalization_state', 'required', 1);
    metadata.run('java_fact_generation', 'p0b-java-v1', 1);
    metadata.run('java_finalization_run', 'run-1', 1);
    metadata.run('java_finalization_pass', 'pass-1', 1);
    setup.close();

    const token = issueJavaFinalizationToken('run-1', 'pass-1');
    expect(() => DatabaseConnection.open(dbPath)).toThrow(/Java.*required.*rebuild/i);
    expect(() => DatabaseConnection.openForJavaFinalization(
      dbPath,
      issueJavaFinalizationToken('run-1', 'pass-2'),
    )).toThrow(/run\/pass.*match/i);
    expect(() => DatabaseConnection.openForJavaFinalization(
      dbPath,
      issueJavaFinalizationToken('run-2', 'pass-1'),
    )).toThrow(/run\/pass.*match/i);

    const opened = DatabaseConnection.openForJavaFinalization(dbPath, token);
    expect(opened.getDb().prepare('SELECT value FROM project_metadata WHERE key = ?').get(
      'java_finalization_state',
    )).toEqual({ value: 'required' });
    opened.close();
  });

  it('1-9-15: rechecks the run/pass identity whenever a private connection is used', () => {
    const dbPath = path.join(tempDir, 'private-held.db');
    const setup = DatabaseConnection.initialize(dbPath);
    const metadata = setup.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    );
    metadata.run('java_finalization_state', 'required', 1);
    metadata.run('java_fact_generation', 'p0b-java-v1', 1);
    metadata.run('java_finalization_run', 'run-1', 1);
    metadata.run('java_finalization_pass', 'pass-1', 1);
    setup.close();

    const opened = DatabaseConnection.openForJavaFinalization(
      dbPath,
      issueJavaFinalizationToken('run-1', 'pass-1'),
    );
    try {
      const raw = opened.getDb();
      raw.prepare('UPDATE project_metadata SET value = ? WHERE key = ?').run(
        'run-2', 'java_finalization_run',
      );
      expect(() => opened.getDb()).toThrow(/run\/pass.*match/i);
    } finally {
      opened.close();
    }
  });

  it('1-9-15: commits complete exactly once through the token-bound marker writer', () => {
    const dbPath = path.join(tempDir, 'marker-required.db');
    const setup = DatabaseConnection.initialize(dbPath);
    setup.getDb().exec("PRAGMA journal_mode = DELETE");
    const metadata = setup.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    );
    metadata.run('java_finalization_state', 'required', 1);
    metadata.run('java_fact_generation', 'p0b-java-v1', 1);
    metadata.run('java_finalization_run', 'run-1', 1);
    metadata.run('java_finalization_pass', 'pass-1', 1);
    setup.close();

    const writer = DatabaseConnection.openForJavaFinalization(
      dbPath,
      issueJavaFinalizationToken('run-1', 'pass-1'),
    );
    expect(writer.commitJavaFinalizationComplete()).toEqual({ changes: 1 });
    expect(() => writer.commitJavaFinalizationComplete()).toThrow(/exactly one.*required/i);
    writer.close();

    const opened = DatabaseConnection.open(dbPath);
    expect(opened.getDb().prepare('SELECT value FROM project_metadata WHERE key = ?').get(
      'java_finalization_state',
    )).toEqual({ value: 'complete' });
    opened.close();
  });

  it('1-9-15: records the marker change before returning a successful COMMIT', () => {
    const dbPath = path.join(tempDir, 'marker-commit-receipt.db');
    const setup = DatabaseConnection.initialize(dbPath);
    setup.getDb().exec('PRAGMA journal_mode = DELETE');
    const metadata = setup.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    );
    metadata.run('java_finalization_state', 'required', 1);
    metadata.run('java_fact_generation', 'p0b-java-v1', 1);
    metadata.run('java_finalization_run', 'run-1', 1);
    metadata.run('java_finalization_pass', 'pass-1', 1);
    setup.close();

    const events: string[] = [];
    const writer = DatabaseConnection.openForJavaFinalization(
      dbPath,
      issueJavaFinalizationToken('run-1', 'pass-1'),
      (_guardPath, options) => createDatabase(dbPath, {
        ...options,
        onExec: options?.readOnly ? undefined : (sql) => events.push(sql),
      }),
    );
    try {
      expect(writer.commitJavaFinalizationComplete()).toEqual({ changes: 1 });
      expect(events).toEqual(['BEGIN', 'COMMIT']);
    } finally {
      writer.close();
    }
    const opened = DatabaseConnection.open(dbPath);
    expect(opened.getDb().prepare('SELECT value FROM project_metadata WHERE key = ?').get(
      'java_finalization_state',
    )).toEqual({ value: 'complete' });
    opened.close();
  });

  it('1-9-15: does not report a complete marker when its COMMIT fails', () => {
    const dbPath = path.join(tempDir, 'marker-commit-failed.db');
    const setup = DatabaseConnection.initialize(dbPath);
    setup.getDb().exec('PRAGMA journal_mode = DELETE');
    const metadata = setup.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    );
    metadata.run('java_finalization_state', 'required', 1);
    metadata.run('java_fact_generation', 'p0b-java-v1', 1);
    metadata.run('java_finalization_run', 'run-1', 1);
    metadata.run('java_finalization_pass', 'pass-1', 1);
    setup.close();

    const token = issueJavaFinalizationToken('run-1', 'pass-1');
    const events: string[] = [];
    const writer = DatabaseConnection.openForJavaFinalization(
      dbPath,
      token,
      (_guardPath, options) => createDatabase(dbPath, {
        ...options,
        onExec: options?.readOnly ? undefined : (sql) => {
          events.push(sql);
          if (sql === 'COMMIT') throw new Error('marker COMMIT sentinel');
        },
      }),
    );
    try {
      expect(() => writer.commitJavaFinalizationComplete()).toThrow('marker COMMIT sentinel');
      expect(events).toEqual(['BEGIN', 'COMMIT', 'ROLLBACK']);
      expect(() => DatabaseConnection.open(dbPath)).toThrow(/Java.*required.*rebuild/i);
    } finally {
      writer.close();
    }
  });

  it('1-9-15: completes a clean Java replacement through its private finalization session', async () => {
    fs.writeFileSync(path.join(tempDir, 'Owner.java'), [
      'class Owner { void find(String name) {} }',
      'class Example { void run(Owner owner) { owner.find("A"); } }',
      '',
    ].join('\n'));
    const cg = CodeGraph.initSync(tempDir);
    try {
      const result = await cg.indexAll({ engine: 'rust' });
      expect(result.success).toBe(true);
      const state = cg.getIndexBuildInfo();
      expect(state.engine).toBe('rust');
      expect(cg.getNodesByName('run')).toHaveLength(1);
      const expectedQueue = cg.getFiles().map((file) => ({
        filePath: file.path,
        contentHash: file.contentHash,
        status: 'pending',
      }));
      expect(expectedQueue).toHaveLength(1);
      expect(cg.getEmbeddingQueueSnapshot()).toEqual(expectedQueue);
      const raw = (cg as unknown as {
        db: { getDb(): { prepare(sql: string): { all(...params: string[]): unknown[] } } };
      }).db.getDb();
      expect(raw.prepare(
        'SELECT key, value FROM project_metadata WHERE key IN (?, ?, ?, ?) ORDER BY key',
      ).all(
        'java_fact_generation',
        'java_finalization_state',
        'java_finalization_run',
        'java_finalization_pass',
      )).toEqual([
        { key: 'java_fact_generation', value: 'p0b-java-v1' },
        { key: 'java_finalization_pass', value: '1' },
        { key: 'java_finalization_run', value: expect.any(String) },
        { key: 'java_finalization_state', value: 'complete' },
      ]);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: completes an empty replacement instead of leaving it required', async () => {
    const cg = CodeGraph.initSync(tempDir);
    try {
      const result = await cg.indexAll({ engine: 'rust' });
      expect(result.success).toBe(true);
      expect(result.filesIndexed).toBe(0);
      expect(cg.getFiles()).toEqual([]);
      expect(cg.getEmbeddingQueueSnapshot()).toEqual([]);
      const reopened = CodeGraph.openSync(tempDir);
      try {
        expect(reopened.getFiles()).toEqual([]);
      } finally {
        reopened.close();
      }
    } finally {
      cg.close();
    }
  });

  it('1-9-15: fails closed when the committed queue has non-initial columns', async () => {
    fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner { void find() {} }\n');
    const cg = CodeGraph.initSync(tempDir);
    const evaluate = (cg as unknown as {
      indexExternalEngineForEvaluation(
        engine: 'rust',
        options: IndexOptions,
        dependencies: {
          rebuildQueue(db: SqliteDatabase): number;
        },
      ): Promise<IndexResult>;
    }).indexExternalEngineForEvaluation;
    try {
      await expect(evaluate.call(cg, 'rust', {}, {
        rebuildQueue(db) {
          const count = rebuildEmbeddingQueue(db);
          db.prepare('UPDATE embedding_queue SET attempts = 1, last_error = ?').run(
            'injected queue reconciliation failure',
          );
          return count;
        },
      })).rejects.toThrow(/queue reconciliation.*initial pending/i);
      expect(() => CodeGraph.openSync(tempDir)).toThrow(/Java.*failed.*rebuild/i);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: preserves the finalization failure when failure marking also fails', async () => {
    fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner { void find() {} }\n');
    const cg = CodeGraph.initSync(tempDir);
    const evaluate = (cg as unknown as {
      indexExternalEngineForEvaluation(
        engine: 'rust',
        options: IndexOptions,
        dependencies: {
          rebuildQueue(db: SqliteDatabase): number;
          markFailed(): void;
        },
      ): Promise<IndexResult>;
    }).indexExternalEngineForEvaluation;
    let markerAttempts = 0;
    try {
      await expect(evaluate.call(cg, 'rust', {}, {
        rebuildQueue() {
          throw new Error('queue commit sentinel');
        },
        markFailed() {
          markerAttempts++;
          throw new Error('failure-marker sentinel');
        },
      })).rejects.toThrow('queue commit sentinel');
      expect(markerAttempts).toBe(1);
      expect(() => CodeGraph.openSync(tempDir)).toThrow(/Java.*required.*rebuild/i);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: marks a promoted graph failed when fallback finalization fails', async () => {
    fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner { void find() {} }\n');
    fs.writeFileSync(path.join(tempDir, 'page.vue'), '<template><p>fallback</p></template>\n');
    const cg = CodeGraph.initSync(tempDir);
    const evaluate = (cg as unknown as {
      indexExternalEngineForEvaluation(
        engine: 'rust-hybrid',
        options: IndexOptions,
        dependencies: {
          openFinalizationGraph(): Promise<CodeGraph>;
        },
      ): Promise<IndexResult>;
    }).indexExternalEngineForEvaluation;
    try {
      await expect(evaluate.call(cg, 'rust-hybrid', {}, {
        async openFinalizationGraph() {
          return {
            async indexFallbackFiles() {
              return {
                success: false,
                filesIndexed: 0,
                filesSkipped: 0,
                filesErrored: 1,
                nodesCreated: 0,
                edgesCreated: 0,
                errors: [{ message: 'fallback sentinel', severity: 'error' }],
                durationMs: 0,
                missingFallbackFileCount: 0,
                missingFallbackByLanguage: {},
                errorTaxonomy: {},
              };
            },
            close() {},
          } as unknown as CodeGraph;
        },
      })).rejects.toThrow(/fallback failed before.*complete/i);
      expect(() => CodeGraph.openSync(tempDir)).toThrow(/Java.*failed.*rebuild/i);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: rejects a missing Java fallback from the original plan before any probe', async () => {
    fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner {}\n');
    fs.writeFileSync(path.join(tempDir, 'page.ts'), 'export const before = 1;\n');
    const cg = CodeGraph.initSync(tempDir);
    try {
      const initial = await cg.indexAll({ engine: 'rust' });
      expect(initial.success).toBe(true);
      const raw = (cg as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
      const metadata = raw.prepare("INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)");
      if (!raw.prepare('SELECT 1 FROM project_metadata WHERE key = ?').get('java_fact_generation')) {
        metadata.run('java_fact_generation', 'p0b-java-v1', 1);
        metadata.run('java_finalization_state', 'complete', 1);
      }
      fs.writeFileSync(path.join(tempDir, 'page.ts'), 'export const after = 2;\n');
      const before = cg.getFiles();
      const orchestrator = (cg as unknown as {
        orchestrator: { preflightJavaWritesForEvaluation(paths: string[]): void };
      }).orchestrator;
      let observedPlan: string[] | null = null;
      const originalPreflight = orchestrator.preflightJavaWritesForEvaluation.bind(orchestrator);
      orchestrator.preflightJavaWritesForEvaluation = (filePaths) => {
        observedPlan = [...filePaths];
        return originalPreflight(filePaths);
      };
      const result = await cg.indexFallbackFiles(['Missing.java', 'page.ts']);
      expect(observedPlan).toEqual(['Missing.java', 'page.ts']);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual([expect.objectContaining({
        code: 'java-facts-rebuild-required',
      })]);
      expect(cg.getFiles()).toEqual(before);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: preserves lexical path errors inside the private replacement', async () => {
    fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner {}\n');
    const initial = CodeGraph.initSync(tempDir);
    const raw = (initial as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
    const metadata = raw.prepare("INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)");
    metadata.run('java_fact_generation', 'p0b-java-v1', 1);
    metadata.run('java_finalization_state', 'required', 1);
    metadata.run('java_finalization_run', 'run-lexical', 1);
    metadata.run('java_finalization_pass', 'pass-lexical', 1);
    initial.close();

    const graph = await CodeGraph.openForJavaFinalization(
      tempDir,
      issueJavaFinalizationToken('run-lexical', 'pass-lexical'),
    );
    try {
      const result = await graph.indexFallbackFiles(['../outside.ts']);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual([expect.objectContaining({
        code: 'path_traversal',
        filePath: '../outside.ts',
      })]);
    } finally {
      graph.close();
    }
  });

  it('1-9-15: rejects a missing Java rewrite before probing and preserves mixed batch data', async () => {
    const cg = CodeGraph.initSync(tempDir);
    try {
      const initial = await cg.indexAll({ engine: 'rust' });
      expect(initial.success).toBe(true);
      const raw = (cg as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
      const metadata = raw.prepare("INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)");
      if (!raw.prepare('SELECT 1 FROM project_metadata WHERE key = ?').get('java_fact_generation')) {
        metadata.run('java_fact_generation', 'p0b-java-v1', 1);
        metadata.run('java_finalization_state', 'complete', 1);
      }
      fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner { void find() {} }\n');
      fs.writeFileSync(path.join(tempDir, 'page.ts'), 'export const before = 1;\n');
      await cg.indexFiles(['Owner.java', 'page.ts']);
      const before = {
        files: cg.getFiles(),
        owner: raw.prepare('SELECT * FROM files WHERE path = ?').get('Owner.java'),
        page: raw.prepare('SELECT * FROM files WHERE path = ?').get('page.ts'),
      };
      fs.unlinkSync(path.join(tempDir, 'Owner.java'));
      fs.writeFileSync(path.join(tempDir, 'page.ts'), 'export const after = 2;\n');
      const probe = (cg as unknown as {
        orchestrator: { probePathForEvaluation(path: string): never };
      }).orchestrator.probePathForEvaluation = (filePath) => {
        throw new Error(`unexpected probe: ${filePath}`);
      };

      const result = await cg.indexFiles(['Missing.java', 'page.ts']);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual([expect.objectContaining({
        code: 'java-facts-rebuild-required',
        severity: 'error',
      })]);
      expect(cg.getFiles()).toEqual(before.files);
      expect(raw.prepare('SELECT * FROM files WHERE path = ?').get('Owner.java'))
        .toEqual(before.owner);
      expect(raw.prepare('SELECT * FROM files WHERE path = ?').get('page.ts'))
        .toEqual(before.page);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: rejects the whole sync of a Java-bearing graph before removal or source reads', async () => {
    const cg = CodeGraph.initSync(tempDir);
    try {
      const initial = await cg.indexAll({ engine: 'rust' });
      expect(initial.success).toBe(true);
      const raw = (cg as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
      const metadata = raw.prepare("INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)");
      if (!raw.prepare('SELECT 1 FROM project_metadata WHERE key = ?').get('java_fact_generation')) {
        metadata.run('java_fact_generation', 'p0b-java-v1', 1);
        metadata.run('java_finalization_state', 'complete', 1);
      }
      fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner { void find() {} }\n');
      fs.writeFileSync(path.join(tempDir, 'page.ts'), 'export const before = 1;\n');
      await cg.indexFiles(['Owner.java', 'page.ts']);
      const before = cg.getFiles();
      fs.unlinkSync(path.join(tempDir, 'Owner.java'));
      fs.writeFileSync(path.join(tempDir, 'page.ts'), 'export const after = 2;\n');
      const probe = (cg as unknown as {
        orchestrator: { probePathForEvaluation(path: string): never };
      }).orchestrator.probePathForEvaluation = (filePath) => {
        throw new Error(`unexpected probe: ${filePath}`);
      };

      await expect(cg.sync()).rejects.toThrow(/java-facts-rebuild-required/i);
      expect(cg.getFiles()).toEqual(before);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: leaves all graph facts untouched when a Java-bearing sync is rejected', async () => {
    fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner { void run() {} }\n');
    fs.writeFileSync(path.join(tempDir, 'page.ts'), [
      'export class Page {',
      '  run(owner: Owner) { owner.run(); }',
      '}',
      '',
    ].join('\n'));
    const cg = CodeGraph.initSync(tempDir);
    try {
      const initial = await cg.indexAll({ engine: 'typescript' });
      expect(initial.success).toBe(true);
      const raw = (cg as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
      const metadata = raw.prepare(
        'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)',
      );
      if (!raw.prepare('SELECT 1 FROM project_metadata WHERE key = ?').get('java_fact_generation')) {
        metadata.run('java_fact_generation', 'p0b-java-v1', 1);
        metadata.run('java_finalization_state', 'complete', 1);
      }
      const queries = (cg as unknown as {
        queries: { deleteFile(filePath: string): void };
      }).queries;
      const deleteSpy = vi.spyOn(queries, 'deleteFile');
      const snapshot = () => Object.fromEntries([
        ['files', raw.prepare('SELECT * FROM files ORDER BY path').all()],
        ['nodes', raw.prepare('SELECT * FROM nodes ORDER BY id').all()],
        ['edges', raw.prepare('SELECT * FROM edges ORDER BY id').all()],
        ['unresolved_refs', raw.prepare('SELECT * FROM unresolved_refs ORDER BY id').all()],
        ['project_metadata', raw.prepare('SELECT * FROM project_metadata ORDER BY key').all()],
      ]);
      const before = snapshot();
      fs.unlinkSync(path.join(tempDir, 'Owner.java'));
      fs.writeFileSync(path.join(tempDir, 'page.ts'), 'export const changed = true;\n');
      fs.writeFileSync(path.join(tempDir, 'new-page.ts'), 'export const added = true;\n');
      const orchestrator = (cg as unknown as {
        orchestrator: { probePathForEvaluation(path: string): never };
      }).orchestrator;
      orchestrator.probePathForEvaluation = (filePath) => {
        throw new Error(`unexpected probe: ${filePath}`);
      };

      await expect(cg.sync()).rejects.toThrow(/java-facts-rebuild-required/i);
      expect(deleteSpy).not.toHaveBeenCalled();
      expect(snapshot()).toEqual(before);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: blocks legacy Java upgrades while allowing a genuinely first Java write', async () => {
    const cg = CodeGraph.initSync(tempDir);
    try {
      fs.writeFileSync(path.join(tempDir, 'Old.java'), 'class Old {}\n');
      fs.writeFileSync(path.join(tempDir, 'note.ts'), 'export const note = 1;\n');
      const legacy = await cg.indexAll({ engine: 'typescript' });
      expect(legacy.success).toBe(true);
      const before = cg.getFiles();
      const raw = (cg as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
      raw.prepare("INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)")
        .run('java_fact_generation', 'legacy-next', 1);
      const inconsistent = await cg.indexFiles(['../outside.ts']);
      expect(inconsistent.errors).toEqual([expect.objectContaining({
        code: 'java-facts-inconsistent-state',
      })]);
      raw.prepare('DELETE FROM project_metadata WHERE key = ?').run('java_fact_generation');
      fs.writeFileSync(path.join(tempDir, 'New.java'), 'class New {}\n');
      const rejected = await cg.indexFiles(['New.java']);
      expect(rejected.success).toBe(false);
      expect(rejected.errors).toEqual([expect.objectContaining({ code: 'java-facts-rebuild-required' })]);
      expect(cg.getFiles()).toEqual(before);

      const clean = CodeGraph.initSync(`${tempDir}-clean`);
      try {
        fs.writeFileSync(path.join(`${tempDir}-clean`, 'New.java'), 'class New {}\n');
        const first = await clean.indexFiles(['New.java']);
        expect(first.success).toBe(true);
        expect(first.errors).toEqual([]);
        expect(clean.getFile('New.java')).not.toBeNull();
      } finally {
        clean.close();
        cleanupTempDir(`${tempDir}-clean`);
      }
    } finally {
      cg.close();
    }
  });

  it('1-9-15: preserves every graph row when legacy file evidence rejects a mixed batch', async () => {
    fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner { void run() {} }\n');
    fs.writeFileSync(path.join(tempDir, 'page.ts'), [
      'export class Page {',
      '  run(owner: Owner) { owner.run(); }',
      '}',
      '',
    ].join('\n'));
    const cg = CodeGraph.initSync(tempDir);
    try {
      const initial = await cg.indexAll({ engine: 'typescript' });
      expect(initial.success).toBe(true);
      const raw = (cg as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
      const queries = (cg as unknown as {
        queries: { deleteFile(filePath: string): void };
      }).queries;
      const deleteSpy = vi.spyOn(queries, 'deleteFile');
      const snapshot = () => Object.fromEntries([
        ['files', raw.prepare('SELECT * FROM files ORDER BY path').all()],
        ['nodes', raw.prepare('SELECT * FROM nodes ORDER BY id').all()],
        ['edges', raw.prepare('SELECT * FROM edges ORDER BY id').all()],
        ['unresolved_refs', raw.prepare('SELECT * FROM unresolved_refs ORDER BY id').all()],
      ]);
      expect(raw.prepare("SELECT 1 FROM files WHERE language = 'java'").get()).toBeDefined();
      const before = snapshot();
      fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner { void changed() {} }\n');
      fs.writeFileSync(path.join(tempDir, 'new-page.ts'), 'export const added = true;\n');

      const result = await cg.indexFiles(['new-page.ts', 'Owner.java']);
      expect(result.success).toBe(false);
      expect(result.filesIndexed).toBe(0);
      expect(result.errors).toEqual([expect.objectContaining({
        code: 'java-facts-rebuild-required',
      })]);
      expect(deleteSpy).not.toHaveBeenCalled();
      expect(snapshot()).toEqual(before);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: detects declaration-only Java evidence without a Java file row', () => {
    const cg = CodeGraph.initSync(tempDir);
    try {
      const raw = (cg as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
      raw.prepare(`
        INSERT INTO nodes (
          id, kind, name, qualified_name, file_path, language,
          start_line, end_line, start_column, end_column,
          signature, is_exported, is_async, is_static, is_abstract, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'legacy:Owner', 'class', 'Owner', 'legacy.Owner', 'orphan.ts', 'typescript',
        1, 1, 0, 20, 'zcg-java-declaration/v1', 0, 0, 0, 0, 1,
      );
      const orchestrator = (cg as unknown as {
        orchestrator: {
          preflightJavaWritesForEvaluation(paths: readonly string[]): { code?: string } | null;
        };
      }).orchestrator;
      expect(raw.prepare("SELECT 1 FROM files WHERE language = 'java'").get()).toBeUndefined();
      expect(orchestrator.preflightJavaWritesForEvaluation(['Owner.java']))
        .toEqual(expect.objectContaining({ code: 'java-facts-rebuild-required' }));
      expect(orchestrator.preflightJavaWritesForEvaluation(['page.ts'])).toBeNull();
    } finally {
      cg.close();
    }
  });

  it('1-9-15: detects unresolved-reference-only Java evidence without a Java file row', () => {
    const cg = CodeGraph.initSync(tempDir);
    try {
      const raw = (cg as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
      raw.prepare(`
        INSERT INTO nodes (
          id, kind, name, qualified_name, file_path, language,
          start_line, end_line, start_column, end_column,
          is_exported, is_async, is_static, is_abstract, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'legacy:Page', 'class', 'Page', 'legacy.Page', 'page.ts', 'typescript',
        1, 1, 0, 20, 0, 0, 0, 0, 1,
      );
      raw.prepare(`
        INSERT INTO unresolved_refs (
          from_node_id, reference_name, reference_kind, line, col,
          candidates, metadata, file_path, language
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'legacy:Page', 'owner', 'call', 1, 4,
        null, '{"zcgJavaCall":true}', 'page.ts', 'typescript',
      );
      const orchestrator = (cg as unknown as {
        orchestrator: {
          preflightJavaWritesForEvaluation(paths: readonly string[]): { code?: string } | null;
        };
      }).orchestrator;
      expect(raw.prepare("SELECT 1 FROM files WHERE language = 'java'").get()).toBeUndefined();
      expect(orchestrator.preflightJavaWritesForEvaluation(['Owner.java']))
        .toEqual(expect.objectContaining({ code: 'java-facts-rebuild-required' }));
      expect(orchestrator.preflightJavaWritesForEvaluation(['page.ts'])).toBeNull();
    } finally {
      cg.close();
    }
  });

  it('1-9-15: defends pre-read single-file writes against Java mutations', async () => {
    fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner {}\n');
    const cg = CodeGraph.initSync(tempDir);
    try {
      const initial = await cg.indexAll({ engine: 'rust' });
      expect(initial.success).toBe(true);
      const before = cg.getFiles();
      const orchestrator = (cg as unknown as {
        orchestrator: {
          indexFileWithContent(filePath: string, content: string, stats: fs.Stats): Promise<{
            errors: Array<{ code?: string }>;
          }>;
        };
      }).orchestrator;
      const stats = fs.statSync(path.join(tempDir, 'Owner.java'));
      const result = await orchestrator.indexFileWithContent(
        'Owner.java',
        'class Owner { void changed() {} }\n',
        stats,
      );
      expect(result.errors).toEqual([expect.objectContaining({
        code: 'java-facts-rebuild-required',
      })]);
      expect(cg.getFiles()).toEqual(before);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: rejects unknown and mixed Java lifecycle evidence in both write modes', () => {
    const cases: Array<{
      label: string;
      generation?: unknown;
      state?: unknown;
    }> = [
      { label: 'legacy generation', generation: 'legacy-next', state: 'complete' },
      { label: 'future generation', generation: 'unknown-v2', state: 'complete' },
      { label: 'empty generation', generation: '', state: 'complete' },
      { label: 'failed state', generation: 'p0b-java-v1', state: 'failed' },
      { label: 'empty state', generation: 'p0b-java-v1', state: '' },
      { label: 'unknown state', generation: 'p0b-java-v1', state: 'unknown-v2' },
      { label: 'state without generation', state: 'complete' },
      { label: 'BLOB generation', generation: Buffer.from('p0b-java-v1'), state: 'complete' },
      { label: 'BLOB state', generation: 'p0b-java-v1', state: Buffer.from('complete') },
    ];

    const cg = CodeGraph.initSync(tempDir);
    const raw = (cg as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
    const metadata = raw.prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)',
    );
    try {
      const orchestrator = (cg as unknown as {
        orchestrator: {
          preflightJavaWritesForEvaluation(paths: readonly string[]): { code?: string } | null;
          allowPrivateV1ReplacementForFinalization(): void;
        };
      }).orchestrator;
      for (const testCase of cases) {
        if (testCase.generation !== undefined) {
          metadata.run('java_fact_generation', testCase.generation, 1);
        }
        if (testCase.state !== undefined) {
          metadata.run('java_finalization_state', testCase.state, 1);
        }
        expect(orchestrator.preflightJavaWritesForEvaluation(['Owner.java']), testCase.label)
          .toEqual(expect.objectContaining({ code: 'java-facts-inconsistent-state' }));
        orchestrator.allowPrivateV1ReplacementForFinalization();
        expect(orchestrator.preflightJavaWritesForEvaluation(['Owner.java']), testCase.label)
          .toEqual(expect.objectContaining({ code: 'java-facts-inconsistent-state' }));
        raw.prepare(
          "DELETE FROM project_metadata WHERE key IN ('java_fact_generation', 'java_finalization_state')",
        ).run();
        raw.prepare('DELETE FROM files').run();
      }
    } finally {
      cg.close();
    }
  });

  it('1-9-15: rejects malformed Java write input paths before any per-file probe', async () => {
    fs.writeFileSync(path.join(tempDir, 'page.ts'), 'export const page = 1;\n');
    const cg = CodeGraph.initSync(tempDir);
    try {
      const orchestrator = (cg as unknown as {
        orchestrator: { probePathForEvaluation(path: string): never };
      }).orchestrator;
      orchestrator.probePathForEvaluation = (filePath) => {
        throw new Error(`unexpected probe: ${filePath}`);
      };
      const result = await cg.indexFiles([
        'page.ts',
        42 as unknown as string,
      ]);
      expect(result.success).toBe(false);
      expect(result.filesIndexed).toBe(0);
      expect(result.errors).toEqual([expect.objectContaining({
        code: 'java-facts-inconsistent-state',
      })]);
      expect(cg.getFiles()).toEqual([]);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: enforces the Java write input cap before any per-file probe', async () => {
    const cg = CodeGraph.initSync(tempDir);
    try {
      const requests = Array.from({ length: 2049 }, (_, index) => `file-${index}.ts`);
      const result = await cg.indexFiles(requests);
      expect(result.success).toBe(false);
      expect(result.filesIndexed).toBe(0);
      expect(result.errors).toEqual([expect.objectContaining({ code: 'java-preflight-limit' })]);
      expect(cg.getFiles()).toEqual([]);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: accepts exactly 2048 original paths without triggering the input cap', async () => {
    const cg = CodeGraph.initSync(tempDir);
    try {
      const orchestrator = (cg as unknown as {
        orchestrator: { preflightJavaWritesForEvaluation(paths: string[]): { code?: string } | null };
      }).orchestrator;
      const requests = Array.from({ length: 2048 }, (_, i) => `file-${i}.ts`);
      const rejection = orchestrator.preflightJavaWritesForEvaluation(requests);
      expect(rejection).toBeNull();
    } finally {
      cg.close();
    }
  });

  it('1-9-15: rejects an original path batch exceeding 1 MiB of UTF-8 bytes', async () => {
    const cg = CodeGraph.initSync(tempDir);
    try {
      const orchestrator = (cg as unknown as {
        orchestrator: { preflightJavaWritesForEvaluation(paths: string[]): { code?: string } | null };
      }).orchestrator;
      const longName = 'a'.repeat(600);
      const requests = Array.from({ length: 1800 }, (_, i) => `${longName}-${i}.ts`);
      const totalBytes = requests.reduce((sum, p) => sum + Buffer.byteLength(p, 'utf8'), 0);
      expect(totalBytes).toBeGreaterThan(1024 * 1024);
      expect(requests.length).toBeLessThanOrEqual(2048);
      const rejection = orchestrator.preflightJavaWritesForEvaluation(requests);
      expect(rejection).not.toBeNull();
      expect(rejection?.code).toBe('java-preflight-limit');
    } finally {
      cg.close();
    }
  });

  it('1-9-15: byte cap fires before any path is lexically evaluated', async () => {
    const cg = CodeGraph.initSync(tempDir);
    try {
      const orchestrator = (cg as unknown as {
        orchestrator: { preflightJavaWritesForEvaluation(paths: string[]): { code?: string } | null };
      }).orchestrator;
      const longName = 'a'.repeat(600);
      const valid = Array.from({ length: 1800 }, (_, i) => `${longName}-${i}.ts`);
      const rejection = orchestrator.preflightJavaWritesForEvaluation([...valid, '../outside.ts']);
      expect(rejection?.code).toBe('java-preflight-limit');
    } finally {
      cg.close();
    }
  });

  it('1-9-15: normalized distinct cap tolerates duplicate paths within 2048', async () => {
    const cg = CodeGraph.initSync(tempDir);
    try {
      const orchestrator = (cg as unknown as {
        orchestrator: { preflightJavaWritesForEvaluation(paths: string[]): { code?: string } | null };
      }).orchestrator;
      const requests: string[] = [];
      for (let i = 0; i < 2048; i++) {
        requests.push(i % 2 === 0 ? 'a.ts' : 'b.ts');
      }
      const rejection = orchestrator.preflightJavaWritesForEvaluation(requests);
      expect(rejection).toBeNull();
    } finally {
      cg.close();
    }
  });

  it('1-9-15: rejects a failed Java graph without mutating it', () => {
    const dbPath = path.join(tempDir, 'failed.db');
    const setup = DatabaseConnection.initialize(dbPath);
    const metadata = setup.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    );
    metadata.run('java_finalization_state', 'failed', 1);
    metadata.run('java_fact_generation', 'p0b-java-v1', 1);
    setup.close();

    const before = fs.readFileSync(dbPath);
    expect(() => DatabaseConnection.open(dbPath)).toThrow(/Java.*failed.*rebuild/i);
    expect(fs.readFileSync(dbPath)).toEqual(before);
  });

  it('1-9-15: admits a complete Java graph through ordinary open', () => {
    const dbPath = path.join(tempDir, 'complete.db');
    const setup = DatabaseConnection.initialize(dbPath);
    const metadata = setup.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    );
    metadata.run('java_finalization_state', 'complete', 1);
    metadata.run('java_fact_generation', 'p0b-java-v1', 1);
    setup.close();

    const opened = DatabaseConnection.open(dbPath);
    expect(opened.isOpen()).toBe(true);
    expect(opened.getSchemaVersion()?.version).toBe(7);
    opened.close();
  });

  it('1-9-15: reopens a complete Java graph without any database-file mutation', () => {
    const dbPath = path.join(tempDir, 'complete-read-only.db');
    const setup = DatabaseConnection.initialize(dbPath);
    setup.getDb().pragma('journal_mode = DELETE');
    const metadata = setup.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    );
    metadata.run('java_finalization_state', 'complete', 1);
    metadata.run('java_fact_generation', 'p0b-java-v1', 1);
    setup.close();

    const snapshot = () => Object.fromEntries(fs.readdirSync(tempDir).sort().map((name) => [
      name,
      fs.readFileSync(path.join(tempDir, name)),
    ]));
    const before = snapshot();
    const opened = DatabaseConnection.open(dbPath);
    expect(opened.getDb().prepare('SELECT value FROM project_metadata WHERE key = ?').get(
      'java_finalization_state',
    )).toEqual({ value: 'complete' });
    expect(opened.getSchemaVersion()?.version).toBe(7);
    opened.close();

    expect(snapshot()).toEqual(before);
  });

  it('1-9-15: rejects a v1 generation with no finalization state', () => {
    const dbPath = path.join(tempDir, 'missing-state.db');
    const setup = DatabaseConnection.initialize(dbPath);
    setup.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    ).run('java_fact_generation', 'p0b-java-v1', 1);
    setup.close();

    const before = fs.readFileSync(dbPath);
    expect(() => DatabaseConnection.open(dbPath)).toThrow(/Java.*state.*rebuild/i);
    expect(fs.readFileSync(dbPath)).toEqual(before);
  });

  it('1-9-15: rejects complete metadata without the exact Java v1 generation', () => {
    const dbPath = path.join(tempDir, 'unpaired-complete.db');
    const setup = DatabaseConnection.initialize(dbPath);
    setup.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    ).run('java_finalization_state', 'complete', 1);
    setup.close();

    const before = fs.readFileSync(dbPath);
    expect(() => DatabaseConnection.open(dbPath)).toThrow(/Java.*generation.*rebuild/i);
    expect(fs.readFileSync(dbPath)).toEqual(before);
  });

  it('1-9-15: rejects a schema mismatch without migrating the graph', () => {
    const dbPath = path.join(tempDir, 'mismatched-schema.db');
    const setup = DatabaseConnection.initialize(dbPath);
    setup.getDb().prepare('DELETE FROM schema_versions WHERE version = ?').run(7);
    setup.close();

    const before = fs.readFileSync(dbPath);
    expect(() => DatabaseConnection.open(dbPath)).toThrow(/schema.*version.*7/i);
    expect(fs.readFileSync(dbPath)).toEqual(before);
  });

  it('1-9-15: rechecks finalization when an existing connection is used', () => {
    const dbPath = path.join(tempDir, 'held.db');
    const held = DatabaseConnection.initialize(dbPath);
    held.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    ).run('java_finalization_state', 'required', 1);

    expect(() => held.getDb()).toThrow(/Java.*required.*rebuild/i);
    held.close();
  });

  it('1-9-15: CodeGraph.openSync rejects a required graph before public reads', () => {
    const setup = DatabaseConnection.initialize(getDatabasePath(tempDir));
    setup.getDb().prepare(
      'INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)'
    ).run('java_finalization_state', 'required', 1);
    setup.close();

    expect(() => CodeGraph.openSync(tempDir)).toThrow(/Java.*required.*rebuild/i);
  });

  // ── Filesystem adapter failure injection ─────────────────────────────────
  // The Java write preflight is lexical-only: it must make its decision
  // before any realpath/stat/read call. These tests inject deterministic
  // failures into the underlying fs.* primitives AFTER the initial index and
  // lifecycle stamping are complete, so only the post-preflight mutation
  // attempt is affected. A failing realpath/stat/read must never bypass the
  // Java predicate.

  // ── Filesystem adapter failure injection ─────────────────────────────────
  // The Java write preflight is lexical-only: it must make its decision
  // before any realpath/stat/read call. Node's built-in fs module exposes
  // some methods as non-configurable getters in ESM, so vi.spyOn cannot
  // replace them directly. Instead these tests use Object.defineProperty
  // with configurable: true to force-replace the method, then restore.
  //
  // The contract under test: a failing realpath/stat/read must never bypass
  // the Java predicate. The preflight fires BEFORE the orchestrator reaches
  // any fs.* call, so the injected failure must not become the visible
  // error — the Java rejection must.

  it('1-9-15: preflight rejects Java mutation before any realpathSync probe', async () => {
    // Uses the orchestrator's own probePathForEvaluation seam to inject a
    // deterministic failure at the first realpathSync boundary. The
    // preflight must fire before this probe is ever reached.
    fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner {}\n');
    const cg = CodeGraph.initSync(tempDir);
    try {
      const initial = await cg.indexAll({ engine: 'rust' });
      expect(initial.success).toBe(true);
      const raw = (cg as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
      const metadata = raw.prepare("INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)");
      if (!raw.prepare('SELECT 1 FROM project_metadata WHERE key = ?').get('java_fact_generation')) {
        metadata.run('java_fact_generation', 'p0b-java-v1', 1);
        metadata.run('java_finalization_state', 'complete', 1);
      }
      const before = cg.getFiles();
      fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner { void changed() {} }\n');

      const orchestrator = (cg as unknown as {
        orchestrator: { probePathForEvaluation(path: string): never };
      }).orchestrator;
      orchestrator.probePathForEvaluation = (filePath) => {
        throw new Error(`EACCES: realpathSync probe reached for ${filePath}`);
      };

      const result = await cg.indexFiles(['Owner.java']);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual([expect.objectContaining({
        code: 'java-facts-rebuild-required',
      })]);
      expect(cg.getFiles()).toEqual(before);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: preflight rejects Java mutation before any statSync probe', async () => {
    fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner {}\n');
    const cg = CodeGraph.initSync(tempDir);
    try {
      const initial = await cg.indexAll({ engine: 'rust' });
      expect(initial.success).toBe(true);
      const raw = (cg as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
      const metadata = raw.prepare("INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)");
      if (!raw.prepare('SELECT 1 FROM project_metadata WHERE key = ?').get('java_fact_generation')) {
        metadata.run('java_fact_generation', 'p0b-java-v1', 1);
        metadata.run('java_finalization_state', 'complete', 1);
      }
      const before = cg.getFiles();
      fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner { void changed() {} }\n');

      const orchestrator = (cg as unknown as {
        orchestrator: { probePathForEvaluation(path: string): never };
      }).orchestrator;
      orchestrator.probePathForEvaluation = (filePath) => {
        throw new Error(`EACCES: statSync probe reached for ${filePath}`);
      };

      const result = await cg.indexFiles(['Owner.java']);
      expect(result.success).toBe(false);
      expect(result.errors).toEqual([expect.objectContaining({
        code: 'java-facts-rebuild-required',
      })]);
      expect(cg.getFiles()).toEqual(before);
    } finally {
      cg.close();
    }
  });

  it('1-9-15: preflight rejects Java mutation before any readFile probe', async () => {
    fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner {}\n');
    const cg = CodeGraph.initSync(tempDir);
    try {
      const initial = await cg.indexAll({ engine: 'rust' });
      expect(initial.success).toBe(true);
      const raw = (cg as unknown as { db: { getDb(): SqliteDatabase } }).db.getDb();
      const metadata = raw.prepare("INSERT INTO project_metadata(key, value, updated_at) VALUES (?, ?, ?)");
      if (!raw.prepare('SELECT 1 FROM project_metadata WHERE key = ?').get('java_fact_generation')) {
        metadata.run('java_fact_generation', 'p0b-java-v1', 1);
        metadata.run('java_finalization_state', 'complete', 1);
      }
      const before = cg.getFiles();
      fs.writeFileSync(path.join(tempDir, 'Owner.java'), 'class Owner { void changed() {} }\n');

      const readSpy = vi.spyOn(fs.promises, 'readFile').mockImplementation(async () => {
        const err = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
        err.code = 'EACCES';
        throw err;
      });
      try {
        const result = await cg.indexFiles(['Owner.java']);
        expect(result.success).toBe(false);
        expect(result.errors).toEqual([expect.objectContaining({
          code: 'java-facts-rebuild-required',
        })]);
        expect(cg.getFiles()).toEqual(before);
      } finally {
        readSpy.mockRestore();
      }
    } finally {
      cg.close();
    }
  });

  it('1-9-15: validatePathWithinRoot returns null for a non-existent path', () => {
    // Real FS failure: the path does not exist, so realpathSync throws
    // ENOENT. The function falls back to the lexical path.
    const result = validatePathWithinRoot(tempDir, 'does-not-exist.ts');
    expect(result).not.toBeNull();
    expect(result).toContain('does-not-exist.ts');
  });

  it('1-9-15: validatePathWithinRoot returns null for a path escaping root', () => {
    const result = validatePathWithinRoot(tempDir, '../outside.ts');
    expect(result).toBeNull();
  });
});

describe('Query Builder', () => {
  let tempDir: string;
  let cg: CodeGraph;

  beforeEach(() => {
    tempDir = createTempDir();
    cg = CodeGraph.initSync(tempDir);
  });

  afterEach(() => {
    cg.close();
    cleanupTempDir(tempDir);
  });

  it('should return null for non-existent node', () => {
    const node = cg.getNode('nonexistent');
    expect(node).toBeNull();
  });

  it('should return empty array for nodes in non-existent file', () => {
    const nodes = cg.getNodesInFile('nonexistent.ts');
    expect(nodes).toEqual([]);
  });

  it('should return empty array for edges from non-existent node', () => {
    const edges = cg.getOutgoingEdges('nonexistent');
    expect(edges).toEqual([]);
  });

  it('should return null for non-existent file', () => {
    const file = cg.getFile('nonexistent.ts');
    expect(file).toBeNull();
  });

  it('should return empty array for files when none tracked', () => {
    const files = cg.getFiles();
    expect(files).toEqual([]);
  });
});
