import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CodeGraph } from '../src';
import {
  makeRustIndexingTempProject,
  RUST_CORE_BIN,
  runZcodegraphCli,
  ZCODEGRAPH_BIN,
} from './helpers/rust-indexing-cli';

describe('zcodegraph rust-hybrid file-level import diagnostics', () => {
  let tempDir: string;

  beforeAll(() => {
    if (!fs.existsSync(ZCODEGRAPH_BIN)) {
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

  beforeEach(() => {
    tempDir = makeRustIndexingTempProject();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('reports Rust-owned module edge-write diagnostics for relative and paths-alias file imports', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@app/*': ['src/*'],
          },
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'helper.ts'),
      'export const helperValue = 1;\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'relative-entry.ts'),
      'import "./helper";\nexport const relativeEntry = helperValue;\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'src', 'alias-entry.ts'),
      'import "@app/helper";\nexport const aliasEntry = 1;\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'module-edge-write-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const relativeFile = cg.searchNodes('relative-entry.ts').find((match) => match.node.kind === 'file')?.node;
      const aliasFile = cg.searchNodes('alias-entry.ts').find((match) => match.node.kind === 'file')?.node;
      const helperFile = cg.searchNodes('helper.ts').find((match) => match.node.kind === 'file')?.node;
      expect(relativeFile).toBeDefined();
      expect(aliasFile).toBeDefined();
      expect(helperFile).toBeDefined();

      const relativeImports = cg.getOutgoingEdges(relativeFile!.id, ['imports'], 'rust-finalization');
      const aliasImports = cg.getOutgoingEdges(aliasFile!.id, ['imports'], 'rust-finalization');
      expect(relativeImports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: helperFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
      ]));
      expect(aliasImports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: helperFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
      ]));
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            owner: string;
            mode: string;
            eligibleRefs: number;
            attemptedRefs: number;
            writtenEdges: number;
            skippedRefs: number;
            skipReasons: Record<string, number>;
            edgeKindCounts: Record<string, number>;
            supportedSources: string[];
            excludedSources: string[];
            targetResolutionShapes: Record<string, {
              status: 'rust-owned' | 'partial' | 'unsupported' | 'needs-oracle';
              reason: string;
            }>;
          };
        };
      };
    };
    const moduleEdgeWrite = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite;
    expect(moduleEdgeWrite).toMatchObject({
      owner: 'rust-core',
      mode: 'guarded-file-imports',
      eligibleRefs: expect.any(Number),
      attemptedRefs: expect.any(Number),
      writtenEdges: expect.any(Number),
      skippedRefs: expect.any(Number),
      skipReasons: expect.any(Object),
      edgeKindCounts: expect.objectContaining({
        imports: expect.any(Number),
      }),
      supportedSources: ['relative', 'tsconfigPaths'],
      excludedSources: expect.arrayContaining([
        'rootDirs',
        'packageSelfName',
        'packageImports',
        'packageExports',
        'defaultImports',
        'symbolUsageEdges',
        'declarationRuntimeRewrite',
      ]),
    });
    expect(moduleEdgeWrite.targetResolutionShapes).toMatchObject({
      'relative-import-file-target': {
        status: 'rust-owned',
        reason: 'guarded-file-imports',
      },
      'tsconfig-paths-file-target': {
        status: 'rust-owned',
        reason: 'guarded-file-imports',
      },
      'rootDirs-file-target': {
        status: 'unsupported',
        reason: 'not-yet-rust-owned',
      },
      'package-self-name-repo-local-file-target': {
        status: 'partial',
        reason: 'repo-local-file-targets-only',
      },
      'package-imports-repo-local-file-target': {
        status: 'partial',
        reason: 'repo-local-file-targets-only',
      },
      'package-exports-repo-local-file-target': {
        status: 'needs-oracle',
        reason: 'package-exports-oracle-required',
      },
      'declaration-runtime-pairing-file-target': {
        status: 'partial',
        reason: 'single-runtime-sibling-only',
      },
    });
    expect(moduleEdgeWrite.excludedSources).not.toContain('namespaceImports');
    expect(moduleEdgeWrite.eligibleRefs).toBeGreaterThanOrEqual(2);
    expect(moduleEdgeWrite.attemptedRefs).toBeGreaterThanOrEqual(2);
    expect(moduleEdgeWrite.writtenEdges).toBeGreaterThanOrEqual(2);
    expect(moduleEdgeWrite.edgeKindCounts.imports).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it('writes namespace import module dependencies as Rust-owned file dependency edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'source.ts'), 'export const SOME_CONST = 42;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import * as NS from './source';",
        'export const value = NS.SOME_CONST;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'namespace-import-edge-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const sourceFile = cg.searchNodes('source.ts').find((match) => match.node.kind === 'file')?.node;
      const sourceSymbol = cg.searchNodes('SOME_CONST').find((match) => match.node.filePath === 'src/source.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(sourceFile).toBeDefined();
      expect(sourceSymbol).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: sourceFile!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-import-path-alias',
          }),
        }),
      ]));
      expect(importEdges.some((edge) => edge.target === sourceSymbol!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            attemptedRefs: number;
            writtenEdges: number;
            edgeKindCounts: Record<string, number>;
            excludedSources: string[];
          };
        };
      };
    };
    const moduleEdgeWrite = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite;
    expect(moduleEdgeWrite.attemptedRefs).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.writtenEdges).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.edgeKindCounts.imports).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.excludedSources).not.toContain('namespaceImports');
  }, 30_000);

  it('reports fail-closed module edge-write skip taxonomy without writing missing target imports', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@missing/*': ['src/missing/*'],
            '@ghost': ['src/ghost.txt'],
          },
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'src', 'dep.ts'), 'export const dep = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'ghost.txt'), 'not indexed as code\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { dep } from './dep';",
        "import { missing } from '@missing/value';",
        "import { ghost } from '@ghost';",
        'export const total = dep;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'module-edge-write-skip-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const depFile = cg.searchNodes('dep.ts').find((match) => match.node.kind === 'file')?.node;
      const depSymbol = cg.searchNodes('dep').find((match) => match.node.filePath === 'src/dep.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(depFile).toBeDefined();
      expect(depSymbol).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: depFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
      ]));
      const allowedTargets = new Set([depFile!.id, depSymbol!.id]);
      expect(importEdges.every((edge) => allowedTargets.has(edge.target))).toBe(true);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            attemptedRefs: number;
            writtenEdges: number;
            skippedRefs: number;
            skipReasons: Record<string, number>;
            edgeKindCounts: Record<string, number>;
          };
        };
      };
    };
    const moduleEdgeWrite = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite;
    expect(moduleEdgeWrite).toMatchObject({
      attemptedRefs: expect.any(Number),
      writtenEdges: expect.any(Number),
      skippedRefs: expect.any(Number),
      skipReasons: {
        'tsconfig-path-target-not-found': expect.any(Number),
        'file-node-not-found': expect.any(Number),
      },
      edgeKindCounts: {
        imports: expect.any(Number),
      },
    });
    expect(moduleEdgeWrite.attemptedRefs).toBeGreaterThanOrEqual(3);
    expect(moduleEdgeWrite.writtenEdges).toBe(1);
    expect(moduleEdgeWrite.skippedRefs).toBeGreaterThanOrEqual(2);
    expect(moduleEdgeWrite.skipReasons['tsconfig-path-target-not-found']).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.skipReasons['file-node-not-found']).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('reports namespace import fail-closed taxonomy without writing unsafe file edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import * as MissingNS from './missing';",
        'export const value = MissingNS.SOME_CONST;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'namespace-import-fail-closed-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      expect(mainFile).toBeDefined();
      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual([]);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            attemptedRefs: number;
            writtenEdges: number;
            skippedRefs: number;
            skipReasons: Record<string, number>;
            excludedSources: string[];
          };
        };
      };
    };
    const moduleEdgeWrite = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite;
    expect(moduleEdgeWrite.attemptedRefs).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.writtenEdges).toBe(0);
    expect(moduleEdgeWrite.skippedRefs).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.skipReasons['target-not-found']).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.excludedSources).not.toContain('namespaceImports');
  }, 30_000);
});
