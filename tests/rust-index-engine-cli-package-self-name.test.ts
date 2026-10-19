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

describe('zcodegraph rust-hybrid package self-name', () => {
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

  it('reports package self-name module edge-write diagnostics in the public profile', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: '@fixture/app',
      private: true,
    }) + '\n');
    fs.writeFileSync(path.join(tempDir, 'index.ts'), 'export const rootValue = 1;\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { rootValue } from '@fixture/app';",
        'export const total = rootValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-self-name-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageSelfName: {
              mode: string;
              eligibleRefs: number;
              writtenEdges: number;
              skippedRefs: number;
              skipReasons: Record<string, number>;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    const packageSelfName = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageSelfName;
    expect(packageSelfName).toMatchObject({
      mode: 'repo-local-file-targets-only',
      eligibleRefs: expect.any(Number),
      writtenEdges: expect.any(Number),
      skippedRefs: expect.any(Number),
      skipReasons: expect.any(Object),
      outcomeCounts: expect.objectContaining({
        resolvedRootIndex: expect.any(Number),
      }),
    });
    expect(packageSelfName.eligibleRefs).toBeGreaterThanOrEqual(1);
    expect(packageSelfName.writtenEdges).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('writes package self-name root imports as Rust-owned file dependency edges', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: '@fixture/app',
      private: true,
    }) + '\n');
    fs.writeFileSync(path.join(tempDir, 'index.ts'), 'export const rootValue = 1;\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { rootValue } from '@fixture/app';",
        'export const total = rootValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-self-name-edge-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const entryFile = cg.searchNodes('index.ts').find((match) => match.node.kind === 'file')?.node;
      expect(mainFile).toBeDefined();
      expect(entryFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: entryFile!.id,
          edgeOrigin: 'rust-finalization',
          metadata: expect.objectContaining({
            resolvedBy: 'rust-import-path-alias',
          }),
        }),
      ]));
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageSelfName: {
              writtenEdges: number;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    expect(profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageSelfName.writtenEdges)
      .toBeGreaterThanOrEqual(1);
    expect(profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageSelfName.outcomeCounts)
      .toMatchObject({ resolvedRootIndex: expect.any(Number) });
  }, 30_000);

  it('rewrites package exports declaration targets to runtime sibling file edges', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: '@fixture/app',
      private: true,
      exports: {
        '.': {
          types: './types/index.d.ts',
          default: './src/index.ts',
        },
      },
    }, null, 2) + '\n');
    fs.mkdirSync(path.join(tempDir, 'types'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'types', 'index.d.ts'), 'export declare const api: number;\n');
    fs.writeFileSync(path.join(tempDir, 'types', 'index.ts'), 'export const api = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'index.ts'), 'export const runtimeEntry = 2;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { api } from '@fixture/app';",
        'export const total = api;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-exports-runtime-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const declarationFile = cg.searchNodes('index.d.ts').find((match) => match.node.kind === 'file')?.node;
      const runtimeFile = cg.searchNodes('index.ts').find((match) => match.node.kind === 'file' && match.node.filePath === 'types/index.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(declarationFile).toBeDefined();
      expect(runtimeFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: runtimeFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
      ]));
      expect(importEdges.some((edge) => edge.target === declarationFile!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageSelfName: {
              writtenEdges: number;
              outcomeCounts: Record<string, number>;
            };
            declarationRuntime: {
              rewrittenEdges: number;
            };
          };
        };
      };
    };
    const moduleEdgeWrite = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite;
    expect(moduleEdgeWrite.packageSelfName.writtenEdges).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.packageSelfName.outcomeCounts).toMatchObject({
      exportsResolved: expect.any(Number),
    });
    expect(moduleEdgeWrite.declarationRuntime.rewrittenEdges).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('reports package self-name fail-closed taxonomy without writing unsupported package edges', () => {
    fs.mkdirSync(path.join(tempDir, 'packages', 'blocked', 'internal'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'packages', 'array'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'root', private: true }) + '\n');
    fs.writeFileSync(
      path.join(tempDir, 'packages', 'blocked', 'package.json'),
      JSON.stringify({
        name: '@fixture/blocked',
        exports: {
          './internal/*': null,
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'packages', 'array', 'package.json'),
      JSON.stringify({
        name: '@fixture/array',
        exports: ['./index.ts'],
      }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'packages', 'blocked', 'internal', 'foo.ts'), 'export const blockedValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'packages', 'array', 'index.ts'), 'export const arrayValue = 2;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { blockedValue } from '@fixture/blocked/internal/foo';",
        "import { arrayValue } from '@fixture/array';",
        'export const total = 0;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-self-name-fail-closed-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const blockedFile = cg.searchNodes('foo.ts').find((match) => match.node.kind === 'file')?.node;
      const arrayFile = cg.searchNodes('index.ts')
        .find((match) => match.node.kind === 'file' && match.node.filePath === 'packages/array/index.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(blockedFile).toBeDefined();
      expect(arrayFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges.some((edge) => edge.target === blockedFile!.id)).toBe(false);
      expect(importEdges.some((edge) => edge.target === arrayFile!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageSelfName: {
              skippedRefs: number;
              skipReasons: Record<string, number>;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    const packageSelfName = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageSelfName;
    expect(packageSelfName.skippedRefs).toBeGreaterThanOrEqual(2);
    expect(packageSelfName.outcomeCounts).toMatchObject({
      exportsBlocked: expect.any(Number),
      exportsUnsupported: expect.any(Number),
    });
    expect(packageSelfName.skipReasons).toMatchObject({
      exportsBlocked: expect.any(Number),
      exportsUnsupported: expect.any(Number),
    });
  }, 30_000);
});
