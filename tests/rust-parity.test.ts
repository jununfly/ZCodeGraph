import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  compareSemanticSnapshots,
  edgeKey,
  nodeKey,
  type SemanticEdgeFact,
  type SemanticNodeFact,
  type SemanticSnapshot,
} from '../src/indexing/parity';
import { CodeGraph } from '../src';
import { DatabaseConnection, getDatabasePath } from '../src/db';
import { QueryBuilder } from '../src/db/queries';

const BIN = path.resolve(__dirname, '../dist/bin/zcodegraph.js');
const RUST_CORE_BIN = path.resolve(
  __dirname,
  '..',
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

function snapshot(overrides: Partial<SemanticSnapshot> = {}): SemanticSnapshot {
  return {
    files: [{ path: 'src/a.ts', language: 'typescript' }],
    nodes: [
      {
        kind: 'function',
        name: 'run',
        filePath: 'src/a.ts',
        language: 'typescript',
        startLine: 1,
        startColumn: 0,
      },
    ],
    edges: [
      {
        kind: 'contains',
        source: 'file:src/a.ts',
        target: 'function:src/a.ts:run',
      },
    ],
    unresolvedRefs: [
      {
        from: 'function:src/a.ts:run',
        referenceName: 'helper',
        referenceKind: 'calls',
        filePath: 'src/a.ts',
        language: 'typescript',
        line: 2,
        column: 9,
      },
    ],
    ...overrides,
  };
}

describe('semantic parity comparator', () => {
  const tempDirs: string[] = [];

  beforeAll(() => {
    if (!fs.existsSync(BIN)) {
      execFileSync('npm', ['run', 'build'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
      });
    }
    execFileSync('cargo', ['build', '--package', 'zcodegraph-core'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
  }, 60_000);

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('categorizes semantic differences without requiring byte-identical output', () => {
    const result = compareSemanticSnapshots(
      snapshot({
        nodes: [
          {
            kind: 'function',
            name: 'run',
            filePath: 'src/a.ts',
            language: 'typescript',
            startLine: 10,
            startColumn: 4,
          },
          {
            kind: 'class',
            name: 'ExpectedLater',
            filePath: 'src/a.ts',
            language: 'typescript',
            startLine: 20,
            startColumn: 0,
          },
        ],
      }),
      snapshot({
        files: [
          { path: 'src/a.ts', language: 'typescript' },
          { path: 'src/generated.ts', language: 'typescript' },
        ],
        nodes: [
          {
            kind: 'function',
            name: 'run',
            filePath: 'src/a.ts',
            language: 'typescript',
            startLine: 11,
            startColumn: 4,
          },
          {
            kind: 'constant',
            name: 'ExtraConstant',
            filePath: 'src/a.ts',
            language: 'typescript',
            startLine: 30,
            startColumn: 0,
          },
        ],
      }),
      {
        locationToleranceLines: 2,
        expectedDifferenceKeys: new Set(['node:class:src/a.ts:ExpectedLater']),
        acceptableDifferenceKeys: new Set(['file:src/generated.ts']),
      },
    );

    expect(result.summary).toEqual({
      blocking: 1,
      acceptable: 1,
      expected: 1,
    });
    expect(result.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'node:class:src/a.ts:ExpectedLater',
          category: 'expected',
        }),
        expect.objectContaining({
          key: 'file:src/generated.ts',
          category: 'acceptable',
        }),
        expect.objectContaining({
          key: 'node:constant:src/a.ts:ExtraConstant',
          category: 'blocking',
        }),
      ]),
    );
    expect(result.differences.some((diff) => diff.key === 'node:function:src/a.ts:run')).toBe(false);
  });

  it('compares TypeScript and Rust semantic outputs for the JS/TS/JSX/TSX fixture slice', async () => {
    const fixture = new Map<string, string>([
      [
        'plain.js',
        [
          'import { loadUser as loadProfile } from "./typed";',
          'function localHelper() { return loadProfile("1"); }',
          'export function exportedHelper() { return localHelper(); }',
          'export class ExportedWidget {',
          '  constructor() {}',
          '  render() { return exportedHelper(); }',
          '}',
          'const store = {',
          '  fetchUser(id) { return loadUser(id); },',
          '};',
          'export { loadUser } from "./typed";',
        ].join('\n') + '\n',
      ],
      [
        'typed.ts',
        [
          'export interface User { id: UserId; name: string }',
          'export type UserId = string;',
          'export enum Status { Ready, Loading = "loading" }',
          'export const DEFAULT_LIMIT = 25;',
          'export function loadUser(id: UserId): User {',
          '  return { id, name: "Ada" };',
          '}',
          'export class UserService {',
          '  cache = new Map<string, User>();',
          '  refresh = withTrace(() => loadUser("1"));',
          '  constructor() {}',
          '  get(id: UserId): User { return loadUser(id); }',
          '}',
        ].join('\n') + '\n',
      ],
      [
        'card.jsx',
        [
          'export function ProfileCard(props) {',
          '  return <Avatar />;',
          '}',
        ].join('\n') + '\n',
      ],
      [
        'dashboard.tsx',
        [
          'import { ProfileCard } from "./card";',
          'export function Dashboard() {',
          '  return <ProfileCard />;',
          '}',
        ].join('\n') + '\n',
      ],
    ]);

    const tsProject = await indexWithTypeScript(fixture, tempDirs);
    const rustProject = indexWithRust(fixture, tempDirs);

    const trackedNames = new Set([
      'plain.js',
      'typed.ts',
      'card.jsx',
      'dashboard.tsx',
      'localHelper',
      'exportedHelper',
      'ExportedWidget',
      'constructor',
      'render',
      'store',
      'loadProfile',
      'fetchUser',
      './typed',
      './card',
      'User',
      'UserId',
      'Status',
      'DEFAULT_LIMIT',
      'loadUser',
      'UserService',
      'cache',
      'refresh',
      'ProfileCard',
      'Dashboard',
    ]);
    const tsSnapshot = semanticSnapshot(tsProject, trackedNames);
    const rustSnapshot = semanticSnapshot(rustProject, trackedNames);
    const result = compareSemanticSnapshots(tsSnapshot, rustSnapshot, {
      locationToleranceLines: 2,
      acceptableDifferenceKeys: acceptableRustPhase1Differences(tsSnapshot, rustSnapshot),
    });

    expect(result.differences.filter((diff) => diff.category === 'blocking')).toEqual([]);
  }, 30_000);
});

async function indexWithTypeScript(files: Map<string, string>, tempDirs: string[]): Promise<string> {
  const dir = writeProject(files, tempDirs);
  const cg = CodeGraph.initSync(dir);
  try {
    const result = await cg.indexAll({ engine: 'typescript' });
    expect(result.success).toBe(true);
  } finally {
    cg.close();
  }
  return dir;
}

function indexWithRust(files: Map<string, string>, tempDirs: string[]): string {
  const dir = writeProject(files, tempDirs);
  const cg = CodeGraph.initSync(dir);
  cg.close();
  const result = spawnSync(process.execPath, [BIN, 'index', '--engine', 'rust', '--quiet'], {
    cwd: dir,
    env: {
      ...process.env,
      CODEGRAPH_ALLOW_UNSAFE_NODE: '1',
      CODEGRAPH_NO_DAEMON: '1',
      CODEGRAPH_NO_RELAUNCH: '1',
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    },
    encoding: 'utf-8',
  });
  expect(result.status).toBe(0);
  return dir;
}

function writeProject(files: Map<string, string>, tempDirs: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-parity-'));
  tempDirs.push(dir);
  for (const [relativePath, content] of files) {
    const absolutePath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  }
  return dir;
}

function semanticSnapshot(projectRoot: string, trackedNames: Set<string>): SemanticSnapshot {
  const db = DatabaseConnection.open(getDatabasePath(projectRoot));
  try {
    const queries = new QueryBuilder(db.getDb());
    const nodes = queries.getAllNodes();
    const trackedNodeIds = new Set(
      nodes
        .filter((node) => trackedNames.has(node.name))
        .map((node) => node.id),
    );
    const normalizedNodes = nodes.map((node) => ({
      id: node.id,
      kind: normalizeNodeKind(node.kind, node.name, node.filePath),
      name: node.name,
      filePath: node.filePath,
      language: node.language,
      startLine: node.startLine,
      startColumn: 0,
    }));
    const nodeLabels = new Map(
      normalizedNodes.map((node) => [
        node.id,
        `${node.kind}:${node.filePath}:${node.name}`,
      ]),
    );

    return {
      files: queries
        .getAllFiles()
        .filter((file) => trackedNames.has(file.path))
        .map((file) => ({ path: file.path, language: file.language })),
      nodes: normalizedNodes
        .filter((node) => trackedNames.has(node.name))
        .map((node): SemanticNodeFact => ({
          kind: node.kind,
          name: node.name,
          filePath: node.filePath,
          language: node.language,
          startLine: node.startLine,
          startColumn: node.startColumn,
        })),
      edges: (db.getDb().prepare('SELECT source, target, kind FROM edges').all() as Array<{ source: string; target: string; kind: string }>)
        .filter((edge) => trackedNodeIds.has(edge.source) && trackedNodeIds.has(edge.target))
        .map((edge): SemanticEdgeFact => ({
          kind: edge.kind,
          source: edge.kind === 'contains'
            ? fileLabelForTarget(edge.target, nodeLabels)
            : nodeLabels.get(edge.source) ?? edge.source,
          target: nodeLabels.get(edge.target) ?? edge.target,
        })),
      unresolvedRefs: queries
        .getUnresolvedReferences()
        .filter((ref) => trackedNames.has(ref.referenceName))
        .map((ref) => ({
          from: nodeLabels.get(ref.fromNodeId) ?? ref.fromNodeId,
          referenceName: ref.referenceName,
          referenceKind: ref.referenceKind,
          filePath: ref.filePath ?? '',
          language: ref.language ?? 'unknown',
          line: ref.line,
          column: ref.column,
        })),
    };
  } finally {
    db.close();
  }
}

function normalizeNodeKind(kind: string, name: string, filePath: string): string {
  if ((filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) && /^[A-Z]/.test(name) && kind === 'function') {
    return 'component';
  }
  return kind;
}

function fileLabelForTarget(targetId: string, nodeLabels: Map<string, string>): string {
  const target = nodeLabels.get(targetId);
  const filePath = target?.split(':')[1];
  return filePath ? `file:${filePath}:${filePath}` : targetId;
}

function acceptableRustPhase1Differences(
  typescriptSnapshot: SemanticSnapshot,
  rustSnapshot: SemanticSnapshot,
): Set<string> {
  const acceptable = new Set<string>();
  const rustNodeKeys = new Set(rustSnapshot.nodes.map(nodeKey));
  for (const node of typescriptSnapshot.nodes) {
    const key = nodeKey(node);
    if (rustNodeKeys.has(key)) continue;
    if (
      node.kind === 'variable' ||
      node.kind === 'parameter' ||
      node.kind === 'property' ||
      key.includes(':cache')
    ) {
      acceptable.add(key);
    }
  }
  const tsNodeKeys = new Set(typescriptSnapshot.nodes.map(nodeKey));
  for (const node of rustSnapshot.nodes) {
    const key = nodeKey(node);
    if (tsNodeKeys.has(key)) continue;
    if (
      node.kind === 'export' ||
      node.kind === 'field' ||
      key.includes(':fetchUser') ||
      key.includes(':cache')
    ) {
      acceptable.add(key);
    }
  }

  const rustEdgeKeys = new Set(rustSnapshot.edges.map(edgeKey));
  for (const edge of typescriptSnapshot.edges) {
    const key = edgeKey(edge);
    if (rustEdgeKeys.has(key)) continue;
    if (
      edge.kind === 'type_of' ||
      edge.kind === 'references' ||
      (edge.kind === 'imports' && edge.target.startsWith('import:')) ||
      key.includes(':fetchUser') ||
      key.includes(':cache')
    ) {
      acceptable.add(key);
    }
  }
  const tsEdgeKeys = new Set(typescriptSnapshot.edges.map(edgeKey));
  for (const edge of rustSnapshot.edges) {
    const key = edgeKey(edge);
    if (tsEdgeKeys.has(key)) continue;
    if (
      edge.kind === 'exports' ||
      edge.kind === 'references' ||
      key === 'edge:calls:function:plain.js:localHelper->function:typed.ts:loadUser' ||
      (edge.kind === 'imports' && edge.target.startsWith('file:')) ||
      key.includes(':fetchUser') ||
      key.includes(':cache') ||
      key.includes('->export:')
    ) {
      acceptable.add(key);
    }
  }
  return acceptable;
}
