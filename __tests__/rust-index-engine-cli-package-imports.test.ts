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

describe('zcodegraph rust-hybrid package imports', () => {
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

  it('reports package imports module edge-write diagnostics in the public profile', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'package-imports-fixture',
      private: true,
      imports: {
        '#internal': './src/internal.ts',
      },
    }, null, 2) + '\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'internal.ts'), 'export const internalValue = 1;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { internalValue } from '#internal';",
        'export const total = internalValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-imports-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageImports: {
              mode: string;
              eligibleRefs: number;
              attemptedRefs: number;
              writtenEdges: number;
              skippedRefs: number;
              skipReasons: Record<string, number>;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    const packageImports = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports;
    expect(packageImports).toMatchObject({
      mode: 'repo-local-file-targets-only',
      eligibleRefs: expect.any(Number),
      attemptedRefs: expect.any(Number),
      writtenEdges: expect.any(Number),
      skippedRefs: expect.any(Number),
      skipReasons: expect.any(Object),
      outcomeCounts: expect.objectContaining({
        importsResolved: expect.any(Number),
      }),
    });
    expect(packageImports.eligibleRefs).toBeGreaterThanOrEqual(1);
    expect(packageImports.attemptedRefs).toBeGreaterThanOrEqual(1);
    expect(packageImports.writtenEdges).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('writes package imports direct keys as Rust-owned file dependency edges', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'package-imports-fixture',
      private: true,
      imports: {
        '#internal': './src/internal.ts',
      },
    }, null, 2) + '\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'internal.ts'), 'export const internalValue = 1;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { internalValue } from '#internal';",
        'export const total = internalValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-imports-edge-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const internalFile = cg.searchNodes('internal.ts').find((match) => match.node.kind === 'file')?.node;
      expect(mainFile).toBeDefined();
      expect(internalFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: internalFile!.id,
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
            packageImports: {
              writtenEdges: number;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    expect(profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports.writtenEdges)
      .toBeGreaterThanOrEqual(1);
    expect(profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports.outcomeCounts)
      .toMatchObject({ importsResolved: expect.any(Number) });
  }, 30_000);

  it('writes package imports pattern and condition targets as Rust-owned file dependency edges', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'package-imports-fixture',
      private: true,
      imports: {
        '#feature/*': './src/features/*.ts',
        '#typed': {
          import: {
            default: './src/typed.ts',
          },
        },
      },
    }, null, 2) + '\n');
    fs.mkdirSync(path.join(tempDir, 'src', 'features'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'features', 'tool.ts'), 'export const featureValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'typed.ts'), 'export const typedValue = 2;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { featureValue } from '#feature/tool';",
        "import { typedValue } from '#typed';",
        'export const total = featureValue + typedValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-imports-pattern-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const featureFile = cg.searchNodes('tool.ts').find((match) => match.node.kind === 'file')?.node;
      const typedFile = cg.searchNodes('typed.ts').find((match) => match.node.kind === 'file')?.node;
      expect(mainFile).toBeDefined();
      expect(featureFile).toBeDefined();
      expect(typedFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: featureFile!.id,
          edgeOrigin: 'rust-finalization',
        }),
        expect.objectContaining({
          target: typedFile!.id,
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
            packageImports: {
              writtenEdges: number;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    const packageImports = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports;
    expect(packageImports.writtenEdges).toBeGreaterThanOrEqual(2);
    expect(packageImports.outcomeCounts).toMatchObject({
      importsResolved: expect.any(Number),
    });
    expect(packageImports.outcomeCounts.importsResolved).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it('reports package imports fail-closed taxonomy without writing unsafe package edges', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'shared'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'package-imports-fixture',
      private: true,
      imports: {
        '#blocked': null,
        '#array': ['./src/array.ts'],
        '#missing': './src/missing.ts',
        '#escape': '../shared/index.ts',
      },
    }, null, 2) + '\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'array.ts'), 'export const arrayValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'shared', 'index.ts'), 'export const sharedValue = 2;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { blockedValue } from '#blocked';",
        "import { arrayValue } from '#array';",
        "import { missingValue } from '#missing';",
        "import { sharedValue } from '#escape';",
        'export const total = 0;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-imports-fail-closed-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const arrayFile = cg.searchNodes('array.ts').find((match) => match.node.kind === 'file')?.node;
      const sharedFile = cg.searchNodes('index.ts')
        .find((match) => match.node.kind === 'file' && match.node.filePath === 'shared/index.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(arrayFile).toBeDefined();
      expect(sharedFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges.some((edge) => edge.target === arrayFile!.id)).toBe(false);
      expect(importEdges.some((edge) => edge.target === sharedFile!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            packageImports: {
              eligibleRefs: number;
              attemptedRefs: number;
              skippedRefs: number;
              skipReasons: Record<string, number>;
              outcomeCounts: Record<string, number>;
            };
          };
        };
      };
    };
    const packageImports = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.packageImports;
    expect(packageImports.eligibleRefs).toBeGreaterThanOrEqual(4);
    expect(packageImports.attemptedRefs).toBe(packageImports.eligibleRefs);
    expect(packageImports.skippedRefs).toBeGreaterThanOrEqual(4);
    expect(packageImports.outcomeCounts).toMatchObject({
      importsBlocked: expect.any(Number),
      importsUnsupported: expect.any(Number),
      importsMissingTarget: expect.any(Number),
      importsTargetEscapesPackage: expect.any(Number),
    });
    expect(packageImports.skipReasons).toMatchObject({
      importsBlocked: expect.any(Number),
      importsUnsupported: expect.any(Number),
      importsMissingTarget: expect.any(Number),
      importsTargetEscapesPackage: expect.any(Number),
    });
  }, 30_000);

  it('rewrites package imports declaration targets to runtime sibling file edges', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'package-imports-fixture',
      private: true,
      imports: {
        '#typed': {
          import: {
            types: './types/typed.d.ts',
            default: './src/typed.ts',
          },
        },
      },
    }, null, 2) + '\n');
    fs.mkdirSync(path.join(tempDir, 'types'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'types', 'typed.d.ts'), 'export declare const typedValue: number;\n');
    fs.writeFileSync(path.join(tempDir, 'types', 'typed.ts'), 'export const typedValue = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'typed.ts'), 'export const runtimeTypedValue = 2;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import { typedValue } from '#typed';",
        'export const total = typedValue;',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'package-imports-runtime-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const declarationFile = cg.searchNodes('typed.d.ts').find((match) => match.node.kind === 'file')?.node;
      const runtimeSiblingFile = cg.searchNodes('typed.ts')
        .find((match) => match.node.kind === 'file' && match.node.filePath === 'types/typed.ts')?.node;
      expect(mainFile).toBeDefined();
      expect(declarationFile).toBeDefined();
      expect(runtimeSiblingFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges).toEqual(expect.arrayContaining([
        expect.objectContaining({
          target: runtimeSiblingFile!.id,
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
            packageImports: {
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
    expect(moduleEdgeWrite.packageImports.writtenEdges).toBeGreaterThanOrEqual(1);
    expect(moduleEdgeWrite.packageImports.outcomeCounts).toMatchObject({
      importsResolved: expect.any(Number),
    });
    expect(moduleEdgeWrite.declarationRuntime.rewrittenEdges).toBeGreaterThanOrEqual(1);
  }, 30_000);
});
