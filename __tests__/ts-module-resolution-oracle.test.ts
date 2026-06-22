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
