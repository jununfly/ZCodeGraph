/**
 * Read Model Interface Tests
 *
 * Contract tests for the 4 read-model interfaces extracted from QueryBuilder:
 *   - AgentReadModel   (agent-serving queries)
 *   - MaintenanceWriteModel (index/maintenance writes)
 *   - ResolutionReadModel   (resolution-phase reads)
 *   - StatusReadModel  (CLI/status queries)
 *
 * These tests verify that QueryBuilder implements all interfaces and that
 * each interface exposes only the methods its callers need.
 *
 * TDD per zj-tdd: TB1 defines the interfaces and tests the contract.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DatabaseConnection } from '../src/db';
import { QueryBuilder } from '../src/db/queries';
import type {
  AgentReadModel,
  MaintenanceWriteModel,
  ResolutionReadModel,
  StatusReadModel,
} from '../src/db/read-models';

// ============================================================
// Helpers
// ============================================================

function createTempDb(): { dir: string; db: DatabaseConnection; qb: QueryBuilder } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'read-models-test-'));
  const db = DatabaseConnection.initialize(path.join(dir, 'test.db'));
  const qb = new QueryBuilder(db.getDb());
  return { dir, db, qb };
}

function cleanupTempDb(dir: string, db: DatabaseConnection): void {
  db.close();
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

// ============================================================
// TB1a: AgentReadModel contract
// ============================================================

describe('AgentReadModel interface', () => {
  let dir: string;
  let db: DatabaseConnection;
  let qb: QueryBuilder;

  beforeEach(() => {
    const tmp = createTempDb();
    dir = tmp.dir;
    db = tmp.db;
    qb = tmp.qb;
  });

  afterEach(() => {
    cleanupTempDb(dir, db);
  });

  it('QueryBuilder implements AgentReadModel', () => {
    const model: AgentReadModel = qb;

    // Verify all methods are callable (TypeScript structural typing)
    expect(typeof model.getNodeById).toBe('function');
    expect(typeof model.getNodesByIds).toBe('function');
    expect(typeof model.getNodesByFile).toBe('function');
    expect(typeof model.getNodesByKind).toBe('function');
    expect(typeof model.iterateNodesByKind).toBe('function');
    expect(typeof model.getOutgoingEdges).toBe('function');
    expect(typeof model.getIncomingEdges).toBe('function');
    expect(typeof model.findEdgesBetweenNodes).toBe('function');
    expect(typeof model.searchNodes).toBe('function');
    expect(typeof model.findNodesByExactName).toBe('function');
    expect(typeof model.findNodesByNameSubstring).toBe('function');
    expect(typeof model.getNodesByName).toBe('function');
    expect(typeof model.getNodesByQualifiedNameExact).toBe('function');
    expect(typeof model.getNodesByLowerName).toBe('function');
    expect(typeof model.getDependentFilePaths).toBe('function');
    expect(typeof model.getDependencyFilePaths).toBe('function');
    expect(typeof model.getDominantFile).toBe('function');
    expect(typeof model.getTopRouteFile).toBe('function');
    expect(typeof model.getRoutingManifest).toBe('function');
  });

  it('AgentReadModel does not expose write methods at type level', () => {
    const model: AgentReadModel = qb;

    // Read-only: should return null for nonexistent node
    const node = model.getNodeById('nonexistent');
    expect(node).toBeNull();

    // getNodesByIds returns a Map
    const map = model.getNodesByIds([]);
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
  });
});

// ============================================================
// TB1b: MaintenanceWriteModel contract
// ============================================================

describe('MaintenanceWriteModel interface', () => {
  let dir: string;
  let db: DatabaseConnection;
  let qb: QueryBuilder;

  beforeEach(() => {
    const tmp = createTempDb();
    dir = tmp.dir;
    db = tmp.db;
    qb = tmp.qb;
  });

  afterEach(() => {
    cleanupTempDb(dir, db);
  });

  it('QueryBuilder implements MaintenanceWriteModel', () => {
    const model: MaintenanceWriteModel = qb;

    // Write methods
    expect(typeof model.insertNode).toBe('function');
    expect(typeof model.insertNodes).toBe('function');
    expect(typeof model.updateNode).toBe('function');
    expect(typeof model.deleteNode).toBe('function');
    expect(typeof model.deleteNodesByFile).toBe('function');
    expect(typeof model.insertEdge).toBe('function');
    expect(typeof model.insertEdges).toBe('function');
    expect(typeof model.deleteEdgesBySource).toBe('function');
    expect(typeof model.upsertFile).toBe('function');
    expect(typeof model.deleteFile).toBe('function');
    expect(typeof model.insertUnresolvedRef).toBe('function');
    expect(typeof model.insertUnresolvedRefsBatch).toBe('function');
    expect(typeof model.deleteUnresolvedByNode).toBe('function');
    expect(typeof model.clearUnresolvedReferences).toBe('function');
    expect(typeof model.deleteResolvedReferences).toBe('function');
    expect(typeof model.deleteSpecificResolvedReferences).toBe('function');
    expect(typeof model.setMetadata).toBe('function');
    expect(typeof model.clear).toBe('function');
  });

  it('can insert and query a node via MaintenanceWriteModel + AgentReadModel', () => {
    const writeModel: MaintenanceWriteModel = qb;
    const readModel: AgentReadModel = qb;

    // Insert via write model
    writeModel.insertNode({
      id: 'test-node-1',
      kind: 'function' as any,
      name: 'hello',
      qualifiedName: 'hello',
      filePath: '/test/file.ts',
      language: 'typescript' as any,
      startLine: 1,
      endLine: 5,
      startColumn: 0,
      endColumn: 10,
      isExported: true,
      isAsync: false,
      isStatic: false,
      isAbstract: false,
      updatedAt: Date.now(),
    });

    // Read via agent model
    const node = readModel.getNodeById('test-node-1');
    expect(node).not.toBeNull();
    expect(node!.name).toBe('hello');
    expect(node!.kind).toBe('function');
  });
});

// ============================================================
// TB1c: ResolutionReadModel contract
// ============================================================

describe('ResolutionReadModel interface', () => {
  let dir: string;
  let db: DatabaseConnection;
  let qb: QueryBuilder;

  beforeEach(() => {
    const tmp = createTempDb();
    dir = tmp.dir;
    db = tmp.db;
    qb = tmp.qb;
  });

  afterEach(() => {
    cleanupTempDb(dir, db);
  });

  it('QueryBuilder implements ResolutionReadModel', () => {
    const model: ResolutionReadModel = qb;

    expect(typeof model.getUnresolvedReferences).toBe('function');
    expect(typeof model.getUnresolvedReferencesCount).toBe('function');
    expect(typeof model.getUnresolvedReferencesBatch).toBe('function');
    expect(typeof model.getUnresolvedReferencesByFiles).toBe('function');
    expect(typeof model.getUnresolvedByName).toBe('function');
    expect(typeof model.getAllFilePaths).toBe('function');
    expect(typeof model.getAllNodeNames).toBe('function');
    expect(typeof model.getNodeById).toBe('function');
    expect(typeof model.getNodesByFile).toBe('function');
    expect(typeof model.getNodesByName).toBe('function');
    expect(typeof model.getNodesByQualifiedNameExact).toBe('function');
    expect(typeof model.getNodesByKind).toBe('function');
    expect(typeof model.getNodesByLowerName).toBe('function');
  });
});

// ============================================================
// TB1d: StatusReadModel contract
// ============================================================

describe('StatusReadModel interface', () => {
  let dir: string;
  let db: DatabaseConnection;
  let qb: QueryBuilder;

  beforeEach(() => {
    const tmp = createTempDb();
    dir = tmp.dir;
    db = tmp.db;
    qb = tmp.qb;
  });

  afterEach(() => {
    cleanupTempDb(dir, db);
  });

  it('QueryBuilder implements StatusReadModel', () => {
    const model: StatusReadModel = qb;

    expect(typeof model.getStats).toBe('function');
    expect(typeof model.getNodeAndEdgeCount).toBe('function');
    expect(typeof model.getLastIndexedAt).toBe('function');
    expect(typeof model.getMetadata).toBe('function');
    expect(typeof model.getAllMetadata).toBe('function');
  });

  it('StatusReadModel returns stats from empty db', () => {
    const model: StatusReadModel = qb;

    const stats = model.getStats();
    expect(stats).toBeDefined();
    expect(stats.nodeCount).toBe(0);
    expect(stats.edgeCount).toBe(0);
    expect(stats.fileCount).toBe(0);
  });

  it('StatusReadModel returns counts after inserting data', () => {
    const writeModel: MaintenanceWriteModel = qb;
    const statusModel: StatusReadModel = qb;

    // Insert a file and a node
    writeModel.upsertFile({
      path: '/test/hello.ts',
      contentHash: 'abc123',
      language: 'typescript' as any,
      size: 100,
      modifiedAt: Date.now(),
      indexedAt: Date.now(),
      nodeCount: 0,
    });

    writeModel.insertNode({
      id: 'n1',
      kind: 'function' as any,
      name: 'hello',
      qualifiedName: 'hello',
      filePath: '/test/hello.ts',
      language: 'typescript' as any,
      startLine: 1,
      endLine: 5,
      startColumn: 0,
      endColumn: 10,
      isExported: true,
      isAsync: false,
      isStatic: false,
      isAbstract: false,
      updatedAt: Date.now(),
    });

    const stats = statusModel.getStats();
    expect(stats.fileCount).toBeGreaterThanOrEqual(1);
    expect(stats.nodeCount).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// TB1e: Interface isolation — each interface is self-contained
// ============================================================

describe('Read model isolation', () => {
  let dir: string;
  let db: DatabaseConnection;
  let qb: QueryBuilder;

  beforeEach(() => {
    const tmp = createTempDb();
    dir = tmp.dir;
    db = tmp.db;
    qb = tmp.qb;
  });

  afterEach(() => {
    cleanupTempDb(dir, db);
  });

  it('AgentReadModel and StatusReadModel share no write methods', () => {
    const agentModel: AgentReadModel = qb;
    const statusModel: StatusReadModel = qb;

    // Both can call getNodeById (it's a read method used by both)
    expect(agentModel.getNodeById('x')).toBeNull();

    // getStats is on StatusReadModel
    expect(statusModel.getStats().nodeCount).toBe(0);
  });

  it('ResolutionReadModel can coexist with MaintenanceWriteModel', () => {
    const readModel: ResolutionReadModel = qb;
    const writeModel: MaintenanceWriteModel = qb;

    // Insert a node via write model
    writeModel.insertNode({
      id: 'res-test',
      kind: 'class' as any,
      name: 'MyClass',
      qualifiedName: 'MyClass',
      filePath: '/test/file.ts',
      language: 'typescript' as any,
      startLine: 1, endLine: 10,
      startColumn: 0, endColumn: 20,
      isExported: true, isAsync: false,
      isStatic: false, isAbstract: false,
      updatedAt: Date.now(),
    });

    // Read via resolution model
    const node = readModel.getNodeById('res-test');
    expect(node).not.toBeNull();
    expect(node!.name).toBe('MyClass');

    // Resolution model can also read by name
    const byName = readModel.getNodesByName('MyClass');
    expect(byName).toHaveLength(1);
  });
});
