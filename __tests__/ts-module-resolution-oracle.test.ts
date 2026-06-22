import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'ts-module-resolution-oracle.mjs');

describe('TypeScript moduleResolution oracle script', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes package/runtime oracle artifacts without source snippets', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-ts-oracle-'));
    tempDirs.push(dir);
    fs.mkdirSync(path.join(dir, 'src', 'features'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'node_modules', 'vitest'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: '@fixture/app',
        exports: {
          '.': './src/index.ts',
          './feature': './src/features/feature.ts',
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          target: 'ES2022',
          allowImportingTsExtensions: true,
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(dir, 'node_modules', 'vitest', 'package.json'),
      JSON.stringify({ name: 'vitest', types: 'index.d.ts' }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(dir, 'node_modules', 'vitest', 'index.d.ts'), 'export function describe(name: string): void;\n');
    fs.writeFileSync(path.join(dir, 'node_modules', 'vitest', 'subpath.d.ts'), 'export const subpathValue: number;\n');
    fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const appValue = 1;\n');
    fs.writeFileSync(path.join(dir, 'src', 'features', 'feature.ts'), 'export const featureValue = 2;\n');
    fs.writeFileSync(
      path.join(dir, 'src', 'main.ts'),
      [
        'import { readFile } from "node:fs";',
        'import { describe } from "vitest";',
        'import { appValue } from "@fixture/app";',
        'import { featureValue } from "@fixture/app/feature";',
        'import { subpathValue } from "vitest/subpath";',
        'import { missingValue } from "missing-pkg/subpath";',
        'export const total = appValue + featureValue;',
      ].join('\n') + '\n',
    );
    const profilePath = path.join(dir, 'profile.json');
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        rustCore: {
          esmNamedImportExportFallbackSamples: [
            rustSample('readFile', 1),
            rustSample('describe', 2),
            rustSample('appValue', 3),
            rustSample('featureValue', 4),
            rustSample('subpathValue', 5),
            rustSample('missingValue', 6),
          ],
        },
      }, null, 2),
    );

    const outDir = path.join(dir, 'artifacts');
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--project',
        dir,
        '--profile',
        profilePath,
        '--out-dir',
        outDir,
        '--prefix',
        'fixture-ts-oracle',
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      artifacts: { json: string; markdown: string };
      summary: {
        rowsInspected: number;
        deltaBuckets: Record<string, number>;
        recommendedSliceGoals: string[];
      };
    };
    expect(parsed.summary.rowsInspected).toBe(6);
    expect(parsed.summary.deltaBuckets['ts-runtime-builtin-boundary']).toBe(1);
    expect(parsed.summary.deltaBuckets['ts-resolves-third-party-boundary']).toBe(2);
    expect(parsed.summary.deltaBuckets['ts-resolves-repo-local-rust-fallback']).toBe(2);
    expect(parsed.summary.deltaBuckets['ts-unresolved-package-runtime']).toBe(1);
    expect(parsed.summary.recommendedSliceGoals).toContain('repo-local package/self-name resolution');
    expect(parsed.summary.recommendedSliceGoals).toContain('third-party package subpath boundary taxonomy');

    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      rows: Array<Record<string, unknown>>;
      summary: { recommendedTotalSliceCount: number };
    };
    expect(artifact.summary.recommendedTotalSliceCount).toBeGreaterThanOrEqual(3);
    expect(artifact.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        importSpecifier: 'node:fs',
        tsResolvedKind: 'node-runtime-builtin',
        repoLocal: false,
        deltaBucket: 'ts-runtime-builtin-boundary',
      }),
      expect.objectContaining({
        importSpecifier: 'vitest',
        tsResolvedKind: 'third-party-package',
        repoLocal: false,
        deltaBucket: 'ts-resolves-third-party-boundary',
      }),
      expect.objectContaining({
        importSpecifier: 'vitest/subpath',
        tsResolvedKind: 'third-party-package-subpath',
        repoLocal: false,
        deltaBucket: 'ts-resolves-third-party-boundary',
      }),
      expect.objectContaining({
        importSpecifier: 'missing-pkg/subpath',
        tsResolvedKind: 'unresolved',
        repoLocal: false,
        deltaBucket: 'ts-unresolved-package-runtime',
      }),
      expect.objectContaining({
        importSpecifier: '@fixture/app',
        tsResolvedKind: 'repo-local-package',
        repoLocal: true,
        deltaBucket: 'ts-resolves-repo-local-rust-fallback',
      }),
      expect.objectContaining({
        importSpecifier: '@fixture/app/feature',
        tsResolvedKind: 'repo-local-package-subpath',
        repoLocal: true,
        deltaBucket: 'ts-resolves-repo-local-rust-fallback',
      }),
    ]));
    for (const row of artifact.rows) {
      expect(row).not.toHaveProperty('source');
      expect(row).not.toHaveProperty('sourceLine');
      expect(row).not.toHaveProperty('sourceContent');
      expect(row).not.toHaveProperty('candidateSource');
    }

    const markdown = fs.readFileSync(parsed.artifacts.markdown, 'utf-8');
    expect(markdown).toContain('# TypeScript Module Resolution Oracle');
    expect(markdown).toContain('ts-resolves-repo-local-rust-fallback');
  });

  it('compares Rust moduleResolution shadow samples against the TypeScript oracle', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-ts-shadow-oracle-'));
    tempDirs.push(dir);
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          target: 'ES2022',
          allowImportingTsExtensions: true,
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(dir, 'src', 'dep.ts'), 'export const dep = 1;\n');
    fs.writeFileSync(path.join(dir, 'src', 'main.ts'), [
      'import { dep } from "./dep";',
      'import fs from "node:fs";',
      'import missing from "missing-pkg";',
    ].join('\n') + '\n');

    const profilePath = path.join(dir, 'profile.json');
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        rustCore: {
          moduleResolutionShadowSamples: [
            {
              specifier: './dep',
              sourceFile: 'src/main.ts',
              moduleResolutionMode: 'nodeNext',
              resolvedKind: 'relative',
              resolvedPath: 'src/dep.ts',
              isExternalLibraryImport: false,
              failedLookupCategory: null,
              conditionSet: [],
              parityStatus: 'unknown',
              fallbackReason: null,
            },
            {
              specifier: 'node:fs',
              sourceFile: 'src/main.ts',
              moduleResolutionMode: 'nodeNext',
              resolvedKind: 'nodeRuntimeBuiltin',
              resolvedPath: null,
              isExternalLibraryImport: true,
              failedLookupCategory: 'node-runtime-builtin',
              conditionSet: [],
              parityStatus: 'unknown',
              fallbackReason: null,
            },
            {
              specifier: 'missing-pkg',
              sourceFile: 'src/main.ts',
              moduleResolutionMode: 'nodeNext',
              resolvedKind: 'packageOrRuntime',
              resolvedPath: null,
              isExternalLibraryImport: true,
              failedLookupCategory: 'package-or-runtime-import',
              conditionSet: [],
              parityStatus: 'unknown',
              fallbackReason: 'rust-shadow-does-not-expand-node-modules',
            },
          ],
        },
      }, null, 2),
    );

    const outDir = path.join(dir, 'artifacts');
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--project',
        dir,
        '--profile',
        profilePath,
        '--out-dir',
        outDir,
        '--prefix',
        'fixture-ts-shadow-oracle',
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      artifacts: { json: string; markdown: string };
      summary: {
        rowsInspected: number;
        parityStatuses: Record<string, number>;
      };
    };
    expect(parsed.summary.rowsInspected).toBe(3);
    expect(parsed.summary.parityStatuses.match).toBe(2);
    expect(parsed.summary.parityStatuses.mismatch).toBe(1);

    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      dataSource: string;
      rows: Array<Record<string, unknown>>;
      summary: { parityStatuses: Record<string, number> };
    };
    expect(artifact.dataSource).toBe('rustCore.moduleResolutionShadowSamples');
    expect(artifact.summary.parityStatuses.match).toBe(2);
    expect(artifact.summary.parityStatuses.mismatch).toBe(1);
    expect(artifact.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        importSpecifier: './dep',
        rustResolvedKind: 'relative',
        parityStatus: 'match',
      }),
      expect.objectContaining({
        importSpecifier: 'node:fs',
        rustResolvedKind: 'nodeRuntimeBuiltin',
        parityStatus: 'match',
      }),
      expect.objectContaining({
        importSpecifier: 'missing-pkg',
        rustResolvedKind: 'packageOrRuntime',
        parityStatus: 'mismatch',
      }),
    ]));
    const markdown = fs.readFileSync(parsed.artifacts.markdown, 'utf-8');
    expect(markdown).toContain('### Parity Statuses');
    expect(markdown).toContain('`match`');
  });

  it('keeps paths alias taxonomy separate from package self-name taxonomy', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-ts-paths-taxonomy-'));
    tempDirs.push(dir);
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: '@fixture/app',
        exports: {
          '.': './src/index.ts',
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          target: 'ES2022',
          baseUrl: '.',
          paths: {
            'virtual-lib': ['./src/virtual-lib.ts'],
          },
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const appValue = 1;\n');
    fs.writeFileSync(path.join(dir, 'src', 'virtual-lib.ts'), 'export const virtualValue = 2;\n');
    fs.writeFileSync(path.join(dir, 'src', 'main.ts'), [
      'import { appValue } from "@fixture/app";',
      'import { virtualValue } from "virtual-lib";',
    ].join('\n') + '\n');

    const profilePath = path.join(dir, 'profile.json');
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        rustCore: {
          moduleResolutionShadowSamples: [
            shadowSample('@fixture/app', 'packageOrRuntime', null),
            shadowSample('virtual-lib', 'tsconfigPaths', 'src/virtual-lib.ts'),
          ],
        },
      }, null, 2),
    );

    const outDir = path.join(dir, 'artifacts');
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--project',
        dir,
        '--profile',
        profilePath,
        '--out-dir',
        outDir,
        '--prefix',
        'fixture-ts-paths-taxonomy',
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as { artifacts: { json: string } };
    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      rows: Array<Record<string, unknown>>;
      summary: { recommendedSlices: Record<string, number> };
    };

    expect(artifact.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        importSpecifier: '@fixture/app',
        tsResolvedKind: 'repo-local-package',
        recommendedSlice: 'repo-local package/self-name resolution',
      }),
      expect.objectContaining({
        importSpecifier: 'virtual-lib',
        deltaBucket: 'ts-resolves-repo-local-paths-alias',
        tsResolvedKind: 'repo-local-paths-alias',
        recommendedSlice: 'paths/rootDirs parity slice + oracle taxonomy correction',
      }),
    ]));
    expect(artifact.summary.recommendedSlices['repo-local package/self-name resolution']).toBe(1);
    expect(artifact.summary.recommendedSlices['paths/rootDirs parity slice + oracle taxonomy correction']).toBe(1);
  });
});

function rustSample(referenceName: string, line: number) {
  return {
    reason: 'package-or-runtime-binding',
    referenceName,
    referenceKind: 'imports',
    filePath: 'src/main.ts',
    language: 'typescript',
    line,
    col: 0,
  };
}

function shadowSample(specifier: string, resolvedKind: string, resolvedPath: string | null) {
  return {
    specifier,
    sourceFile: 'src/main.ts',
    moduleResolutionMode: 'nodeNext',
    resolvedKind,
    resolvedPath,
    isExternalLibraryImport: resolvedPath === null,
    failedLookupCategory: resolvedPath === null ? 'package-or-runtime-import' : null,
    conditionSet: [],
    parityStatus: 'unknown',
    fallbackReason: resolvedPath === null ? 'rust-shadow-does-not-expand-node-modules' : null,
  };
}
