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
    expect(parsed.summary.semanticBoundaries['runtime-builtin-boundary']).toBe(1);
    expect(parsed.summary.semanticBoundaries['external-package-boundary']).toBe(3);
    expect(parsed.summary.semanticBoundaries['repo-local-source']).toBe(2);
    expect(parsed.summary.recommendedSliceGoals).toContain('simple exports string/object repo-local target slice');
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
        semanticBoundary: 'runtime-builtin-boundary',
      }),
      expect.objectContaining({
        importSpecifier: 'vitest',
        tsResolvedKind: 'third-party-package',
        repoLocal: false,
        deltaBucket: 'ts-resolves-third-party-boundary',
        semanticBoundary: 'external-package-boundary',
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
        semanticBoundary: 'repo-local-source',
        packageExportsCovered: true,
        recommendedSlice: 'simple exports string/object repo-local target slice',
      }),
      expect.objectContaining({
        importSpecifier: '@fixture/app/feature',
        tsResolvedKind: 'repo-local-package-subpath',
        repoLocal: true,
        deltaBucket: 'ts-resolves-repo-local-rust-fallback',
        packageExportsCovered: true,
        recommendedSlice: 'simple exports string/object repo-local target slice',
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
    expect(markdown).toContain('### Semantic Boundaries');
    expect(markdown).toContain('external-package-boundary');
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
    expect(artifact.summary.semanticBoundaries['repo-local-source']).toBe(1);
    expect(artifact.summary.semanticBoundaries['runtime-builtin-boundary']).toBe(1);
    expect(artifact.summary.semanticBoundaries['external-package-boundary']).toBe(1);
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
          './src/features/tool': './src/features/tool.ts',
          './pattern/*': './src/pattern/*.ts',
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
    fs.mkdirSync(path.join(dir, 'src', 'features'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'src', 'pattern'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const appValue = 1;\n');
    fs.writeFileSync(path.join(dir, 'src', 'features', 'tool.ts'), 'export const toolValue = 3;\n');
    fs.writeFileSync(path.join(dir, 'src', 'pattern', 'item.ts'), 'export const patternValue = 4;\n');
    fs.writeFileSync(path.join(dir, 'src', 'virtual-lib.ts'), 'export const virtualValue = 2;\n');
    fs.writeFileSync(path.join(dir, 'src', 'main.ts'), [
      'import { appValue } from "@fixture/app";',
      'import { toolValue } from "@fixture/app/src/features/tool";',
      'import { patternValue } from "@fixture/app/pattern/item";',
      'import { virtualValue } from "virtual-lib";',
    ].join('\n') + '\n');

    const profilePath = path.join(dir, 'profile.json');
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        rustCore: {
          moduleResolutionShadowSamples: [
            shadowSample('@fixture/app', 'packageOrRuntime', null),
            shadowSample('@fixture/app/src/features/tool', 'packageOrRuntime', null),
            shadowSample('@fixture/app/pattern/item', 'packageOrRuntime', null),
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
        recommendedSlice: 'simple exports string/object repo-local target slice',
      }),
      expect.objectContaining({
        importSpecifier: '@fixture/app/src/features/tool',
        tsResolvedKind: 'repo-local-package-subpath',
        recommendedSlice: 'simple exports string/object repo-local target slice',
      }),
      expect.objectContaining({
        importSpecifier: '@fixture/app/pattern/item',
        tsResolvedKind: 'repo-local-package-subpath',
        packageExportsRecommendedSlice: 'pattern/nested exports repo-local completion slice',
        recommendedSlice: 'pattern/nested exports repo-local completion slice',
      }),
      expect.objectContaining({
        importSpecifier: 'virtual-lib',
        deltaBucket: 'ts-resolves-repo-local-paths-alias',
        tsResolvedKind: 'repo-local-paths-alias',
        recommendedSlice: 'paths/rootDirs parity slice + oracle taxonomy correction',
      }),
    ]));
    expect(artifact.summary.recommendedSlices['simple exports string/object repo-local target slice']).toBe(2);
    expect(artifact.summary.recommendedSlices['pattern/nested exports repo-local completion slice']).toBe(1);
    expect(artifact.summary.recommendedSlices['paths/rootDirs parity slice + oracle taxonomy correction']).toBe(1);
  });

  it('classifies package imports hash specifiers as the package imports slice', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-ts-package-imports-taxonomy-'));
    tempDirs.push(dir);
    fs.mkdirSync(path.join(dir, 'packages', 'app', 'src', 'internal', 'features'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'root',
        private: true,
        imports: {
          '#internal': './src/root-internal.ts',
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(dir, 'packages', 'app', 'package.json'),
      JSON.stringify({
        name: '@fixture/app',
        private: true,
        imports: {
          '#internal': './src/internal/index.ts',
          '#feature/*': './src/internal/features/*.ts',
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
    fs.writeFileSync(path.join(dir, 'packages', 'app', 'src', 'internal', 'index.ts'), 'export const internalValue = 1;\n');
    fs.writeFileSync(path.join(dir, 'packages', 'app', 'src', 'internal', 'features', 'tool.ts'), 'export const featureValue = 2;\n');
    fs.writeFileSync(path.join(dir, 'packages', 'app', 'src', 'main.ts'), [
      'import { internalValue } from "#internal";',
      'import { featureValue } from "#feature/tool";',
    ].join('\n') + '\n');

    const profilePath = path.join(dir, 'profile.json');
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        rustCore: {
          moduleResolutionShadowSamples: [
            {
              specifier: '#internal',
              sourceFile: 'packages/app/src/main.ts',
              moduleResolutionMode: 'nodeNext',
              resolvedKind: 'packageOrRuntime',
              resolvedPath: null,
              isExternalLibraryImport: true,
              failedLookupCategory: 'package-or-runtime-import',
              conditionSet: [],
              parityStatus: 'unknown',
              fallbackReason: 'rust-shadow-does-not-expand-package-imports',
            },
            {
              specifier: '#feature/tool',
              sourceFile: 'packages/app/src/main.ts',
              moduleResolutionMode: 'nodeNext',
              resolvedKind: 'packageOrRuntime',
              resolvedPath: null,
              isExternalLibraryImport: true,
              failedLookupCategory: 'package-or-runtime-import',
              conditionSet: [],
              parityStatus: 'unknown',
              fallbackReason: 'rust-shadow-does-not-expand-package-imports',
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
        'fixture-ts-package-imports-taxonomy',
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
        importSpecifier: '#internal',
        tsResolvedKind: 'repo-local-package-import',
        packageImportsRecommendedSlice: 'package imports "#" repo-local slice',
        recommendedSlice: 'package imports "#" repo-local slice',
      }),
      expect.objectContaining({
        importSpecifier: '#feature/tool',
        tsResolvedKind: 'repo-local-package-import',
        packageImportsRecommendedSlice: 'package imports "#" repo-local slice',
        recommendedSlice: 'package imports "#" repo-local slice',
      }),
    ]));
    expect(artifact.summary.recommendedSlices['package imports "#" repo-local slice']).toBe(2);
  });

  it('classifies research-only semantic frontiers without changing graph behavior', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-ts-research-frontiers-'));
    tempDirs.push(dir);
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'node_modules', 'typed-pkg', 'ts5'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'node_modules', 'typed-pkg'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'packages', 'real-linked-pkg'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          target: 'ES2022',
          preserveSymlinks: true,
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(dir, 'node_modules', 'typed-pkg', 'package.json'),
      JSON.stringify({
        name: 'typed-pkg',
        types: 'index.d.ts',
        typesVersions: {
          '*': {
            feature: ['ts5/feature.d.ts'],
          },
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(dir, 'node_modules', 'typed-pkg', 'index.d.ts'), 'export type Root = string;\n');
    fs.writeFileSync(path.join(dir, 'node_modules', 'typed-pkg', 'ts5', 'feature.d.ts'), 'export type Feature = string;\n');
    fs.writeFileSync(
      path.join(dir, 'packages', 'real-linked-pkg', 'package.json'),
      JSON.stringify({ name: 'linked-pkg', types: 'index.d.ts' }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(dir, 'packages', 'real-linked-pkg', 'index.d.ts'), 'export type Linked = number;\n');
    try {
      fs.symlinkSync(path.join(dir, 'packages', 'real-linked-pkg'), path.join(dir, 'node_modules', 'linked-pkg'), 'dir');
    } catch {
      fs.mkdirSync(path.join(dir, 'node_modules', 'linked-pkg'), { recursive: true });
      fs.cpSync(path.join(dir, 'packages', 'real-linked-pkg'), path.join(dir, 'node_modules', 'linked-pkg'), { recursive: true });
    }
    fs.writeFileSync(path.join(dir, 'src', 'types.d.ts'), 'export interface DeclaredThing { value: string }\n');
    fs.writeFileSync(path.join(dir, 'src', 'types.js'), 'export const DeclaredThing = { value: "runtime" };\n');
    fs.writeFileSync(path.join(dir, 'src', 'local-types.ts'), 'export interface LocalOnly { value: number }\n');
    fs.writeFileSync(path.join(dir, 'src', 'main.ts'), [
      'import type { Feature } from "typed-pkg/feature";',
      'import type { Linked } from "linked-pkg";',
      'import type { DeclaredThing } from "./types";',
      'import type { LocalOnly } from "./local-types";',
      'export type Combined = Feature | Linked | DeclaredThing | LocalOnly;',
    ].join('\n') + '\n');

    const profilePath = path.join(dir, 'profile.json');
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        rustCore: {
          moduleResolutionShadowSamples: [
            researchShadowSample('typed-pkg/feature', 'src/main.ts', 'packageOrRuntime', null, { importKind: 'type' }),
            researchShadowSample('linked-pkg', 'src/main.ts', 'packageOrRuntime', null, { importKind: 'type' }),
            researchShadowSample('./types', 'src/main.ts', 'relative', 'src/types.d.ts', {
              importKind: 'type',
              declarationTargetRelationship: 'runtime-sibling-available',
              runtimeTargetPath: 'src/types.js',
            }),
            researchShadowSample('./local-types', 'src/main.ts', 'relative', 'src/local-types.ts', { importKind: 'type' }),
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
        'fixture-ts-research-frontiers',
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      artifacts: { json: string; markdown: string };
      summary: {
        researchFrontiers: Record<string, number>;
        researchDecisions: Record<string, number>;
      };
    };
    expect(parsed.summary.researchFrontiers['typesVersions']).toBe(1);
    expect(parsed.summary.researchFrontiers['symlink-preserve-symlinks']).toBe(1);
    expect(parsed.summary.researchFrontiers['type-only-runtime-divergence']).toBe(4);
    expect(parsed.summary.researchFrontiers['declaration-runtime-pairing']).toBe(1);
    expect(parsed.summary.researchDecisions['keep-research']).toBeGreaterThanOrEqual(2);
    expect(parsed.summary.researchDecisions['defer/no-go']).toBeGreaterThanOrEqual(1);

    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      productionRuntimeBehaviorChanged: boolean;
      rows: Array<Record<string, unknown>>;
    };
    expect(artifact.productionRuntimeBehaviorChanged).toBe(false);
    expect(artifact.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        importSpecifier: 'typed-pkg/feature',
        researchFrontier: 'typesVersions',
        researchDecision: 'keep-research',
      }),
      expect.objectContaining({
        importSpecifier: 'linked-pkg',
        researchFrontier: 'symlink-preserve-symlinks',
        researchDecision: 'keep-research',
      }),
      expect.objectContaining({
        importSpecifier: './types',
        researchFrontier: 'declaration-runtime-pairing',
        researchDecision: 'keep-research',
        declarationTargetRelationship: 'runtime-sibling-available',
      }),
    ]));
    const markdown = fs.readFileSync(parsed.artifacts.markdown, 'utf-8');
    expect(markdown).toContain('### Research Frontiers');
    expect(markdown).toContain('typesVersions');
    expect(markdown).toContain('symlink-preserve-symlinks');
    expect(markdown).toContain('declaration-runtime-pairing');
  });

  it('classifies resolveJsonModule repo-local JSON targets as the bounded JSON slice', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-ts-json-module-oracle-'));
    tempDirs.push(dir);
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          target: 'ES2022',
          resolveJsonModule: true,
        },
      }, null, 2) + '\n',
    );
    fs.writeFileSync(path.join(dir, 'src', 'settings.json'), '{"enabled":true}\n');
    fs.writeFileSync(path.join(dir, 'src', 'main.ts'), [
      'import settings from "./settings.json";',
      'export const enabled = settings.enabled;',
    ].join('\n') + '\n');

    const profilePath = path.join(dir, 'profile.json');
    fs.writeFileSync(
      profilePath,
      JSON.stringify({
        rustCore: {
          moduleResolutionShadowSamples: [
            {
              specifier: './settings.json',
              sourceFile: 'src/main.ts',
              moduleResolutionMode: 'nodeNext',
              resolvedKind: 'relative',
              resolvedPath: 'src/settings.json',
              isExternalLibraryImport: false,
              failedLookupCategory: null,
              conditionSet: [],
              parityStatus: 'unknown',
              fallbackReason: null,
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
        'fixture-ts-json-module-oracle',
      ],
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      artifacts: { json: string; markdown: string };
      summary: {
        semanticBoundaries: Record<string, number>;
        recommendedSlices: Record<string, number>;
      };
    };
    expect(parsed.summary.semanticBoundaries['json-module-boundary']).toBe(1);
    expect(parsed.summary.recommendedSlices['JSON resolveJsonModule file-level dependency slice']).toBe(1);

    const artifact = JSON.parse(fs.readFileSync(parsed.artifacts.json, 'utf-8')) as {
      productionRuntimeBehaviorChanged: boolean;
      rows: Array<Record<string, unknown>>;
    };
    expect(artifact.productionRuntimeBehaviorChanged).toBe(false);
    expect(artifact.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        importSpecifier: './settings.json',
        tsResolvedPath: 'src/settings.json',
        semanticBoundary: 'json-module-boundary',
        recommendedSlice: 'JSON resolveJsonModule file-level dependency slice',
      }),
    ]));

    const markdown = fs.readFileSync(parsed.artifacts.markdown, 'utf-8');
    expect(markdown).toContain('json-module-boundary');
    expect(markdown).toContain('JSON resolveJsonModule file-level dependency slice');
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

function researchShadowSample(
  specifier: string,
  sourceFile: string,
  resolvedKind: string,
  resolvedPath: string | null,
  extra: Record<string, unknown>,
) {
  return {
    specifier,
    sourceFile,
    moduleResolutionMode: 'nodeNext',
    resolvedKind,
    resolvedPath,
    isExternalLibraryImport: resolvedPath === null,
    failedLookupCategory: resolvedPath === null ? 'package-or-runtime-import' : null,
    conditionSet: [],
    parityStatus: 'unknown',
    fallbackReason: resolvedPath === null ? 'rust-shadow-does-not-expand-node-modules' : null,
    ...extra,
  };
}
