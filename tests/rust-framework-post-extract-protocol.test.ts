import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph, QueryBuilder, getDatabasePath } from '../src';
import type { Node } from '../src/types';
import { DatabaseConnection } from '../src/db';

function routeNode(overrides: Partial<Node> = {}): Node {
  return {
    id: 'route:users',
    kind: 'route',
    name: 'GET /users/:id',
    qualifiedName: 'src/users.controller.ts::GET:/users/:id',
    filePath: 'src/users.controller.ts',
    language: 'typescript',
    startLine: 5,
    endLine: 5,
    startColumn: 2,
    endColumn: 18,
    updatedAt: 1,
    ...overrides,
  };
}

describe('Rust framework postExtract update protocol', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('applies only allowlisted route name updates and reports skipped unsafe updates', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-post-extract-'));
    const cg = CodeGraph.initSync(tempDir);
    const db = DatabaseConnection.open(getDatabasePath(tempDir));
    const queries = new QueryBuilder(db.getDb());
    queries.insertNode(routeNode());
    queries.insertNode(routeNode({
      id: 'route:admin',
      name: 'GET /admin',
      qualifiedName: 'src/admin.controller.ts::GET:/',
      filePath: 'src/admin.controller.ts',
    }));
    queries.insertNode(routeNode({
      id: 'method:show',
      kind: 'method',
      name: 'show',
      qualifiedName: 'src/users.controller.ts::UsersController.show',
      filePath: 'src/users.controller.ts',
      startLine: 6,
      endLine: 6,
    }));
    queries.insertEdges([{
      source: 'route:users',
      target: 'method:show',
      kind: 'references',
      line: 5,
      col: 2,
    }]);
    db.close();

    try {
      const rustCoreProfile = {
        frameworkPostExtractUpdates: [
          {
            provider: 'nestjs',
            updateKind: 'route-name-prefix',
            nodeId: 'route:users',
            nodeKind: 'route',
            filePath: 'src/users.controller.ts',
            qualifiedName: 'src/users.controller.ts::GET:/users/:id',
            field: 'name',
            newName: 'GET /admin/users/:id',
          },
          {
            provider: 'nestjs',
            updateKind: 'route-name-prefix',
            nodeId: 'route:missing',
            nodeKind: 'route',
            filePath: 'src/missing.controller.ts',
            qualifiedName: 'src/missing.controller.ts::GET:/',
            field: 'name',
            newName: 'GET /missing',
          },
          {
            provider: 'nestjs',
            updateKind: 'route-name-prefix',
            nodeId: 'route:admin',
            nodeKind: 'route',
            filePath: 'src/admin.controller.ts',
            qualifiedName: 'src/admin.controller.ts::GET:/changed',
            field: 'name',
            newName: 'GET /changed',
          },
          {
            provider: 'nestjs',
            updateKind: 'route-name-prefix',
            nodeId: 'route:admin',
            nodeKind: 'route',
            filePath: 'src/admin.controller.ts',
            qualifiedName: 'src/admin.controller.ts::GET:/',
            field: 'qualifiedName',
            newName: 'src/admin.controller.ts::GET:/changed',
          },
        ],
      };
      const result = await cg.finalizeRustIndex(undefined, undefined, rustCoreProfile);

      expect(cg.getNode('route:users')).toMatchObject({
        id: 'route:users',
        kind: 'route',
        name: 'GET /admin/users/:id',
        qualifiedName: 'src/users.controller.ts::GET:/users/:id',
        filePath: 'src/users.controller.ts',
      });
      expect(cg.getNode('route:admin')).toMatchObject({
        id: 'route:admin',
        name: 'GET /admin',
        qualifiedName: 'src/admin.controller.ts::GET:/',
      });

      expect(result.profile.frameworkPostExtract).toMatchObject({
        owner: 'rust-core',
        mode: 'typed-node-update-protocol',
        attemptedUpdates: 4,
        appliedUpdates: 1,
        skippedUpdates: 3,
        failedProviders: 0,
        skipReasons: {
          'node-not-found': 1,
          'identity-mismatch': 1,
          'unsupported-update-field': 1,
        },
        providerCounts: {
          nestjs: 4,
        },
        appliedProviderCounts: {
          nestjs: 1,
        },
      });

      expect(cg.getOutgoingEdges('route:users')).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: 'method:show',
          kind: 'references',
        }),
      ]));

      const second = await cg.finalizeRustIndex(undefined, undefined, rustCoreProfile);
      expect(cg.getNode('route:users')?.name).toBe('GET /admin/users/:id');
      expect(second.profile.frameworkPostExtract).toMatchObject({
        attemptedUpdates: 4,
        appliedUpdates: 0,
        skippedUpdates: 4,
        skipReasons: {
          'no-op': 1,
          'node-not-found': 1,
          'identity-mismatch': 1,
          'unsupported-update-field': 1,
        },
      });
    } finally {
      cg.close();
    }
  });
});
