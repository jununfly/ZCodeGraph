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

describe('zcodegraph rust-hybrid declaration/runtime pairing', () => {
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

  it('reports declaration/runtime module edge-write diagnostics in the public profile', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'root' }) + '\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'api.d.ts'), 'export declare const api: number;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'api.ts'), 'export const api = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'main.ts'), "import './api.d.ts';\n");

    const profileOut = path.join(tempDir, '.zcodegraph', 'declaration-runtime-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            declarationRuntime: {
              mode: string;
              eligibleRefs: number;
              rewrittenEdges: number;
              skippedRefs: number;
              skipReasons: Record<string, number>;
            };
          };
        };
      };
    };
    const declarationRuntime = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.declarationRuntime;
    expect(declarationRuntime).toMatchObject({
      mode: 'single-runtime-sibling-only',
      eligibleRefs: expect.any(Number),
      rewrittenEdges: expect.any(Number),
      skippedRefs: expect.any(Number),
      skipReasons: expect.any(Object),
    });
    expect(declarationRuntime.eligibleRefs).toBeGreaterThanOrEqual(1);
    expect(declarationRuntime.rewrittenEdges).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('rewrites declaration module imports to unique runtime sibling file edges', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'root' }) + '\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'api.d.ts'), 'export declare const api: number;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'api.ts'), 'export const api = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'main.ts'), "import './api.d.ts';\n");

    const profileOut = path.join(tempDir, '.zcodegraph', 'declaration-runtime-rewrite-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const declarationFile = cg.searchNodes('api.d.ts').find((match) => match.node.kind === 'file')?.node;
      const runtimeFile = cg.searchNodes('api.ts').find((match) => match.node.kind === 'file')?.node;
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
            declarationRuntime: {
              rewrittenEdges: number;
            };
          };
        };
      };
    };
    expect(profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.declarationRuntime.rewrittenEdges)
      .toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('reports fail-closed declaration/runtime skip taxonomy without choosing uncertain runtime siblings', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'root' }) + '\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'multi.d.ts'), 'export declare const multi: number;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'multi.ts'), 'export const multi = 1;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'multi.js'), 'export const multi = 2;\n');
    fs.writeFileSync(path.join(tempDir, 'src', 'missing.d.ts'), 'export declare const missing: number;\n');
    fs.writeFileSync(
      path.join(tempDir, 'src', 'main.ts'),
      [
        "import './multi.d.ts';",
        "import './missing.d.ts';",
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'declaration-runtime-skip-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const mainFile = cg.searchNodes('main.ts').find((match) => match.node.kind === 'file')?.node;
      const multiTsFile = cg.searchNodes('multi.ts').find((match) => match.node.kind === 'file')?.node;
      const multiJsFile = cg.searchNodes('multi.js').find((match) => match.node.kind === 'file')?.node;
      expect(mainFile).toBeDefined();
      expect(multiTsFile).toBeDefined();
      expect(multiJsFile).toBeDefined();

      const importEdges = cg
        .getOutgoingEdges(mainFile!.id)
        .filter((edge) => edge.kind === 'imports' && edge.edgeOrigin === 'rust-finalization');
      expect(importEdges.some((edge) => edge.target === multiTsFile!.id)).toBe(false);
      expect(importEdges.some((edge) => edge.target === multiJsFile!.id)).toBe(false);
    } finally {
      cg.close();
    }

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          moduleEdgeWrite: {
            declarationRuntime: {
              skippedRefs: number;
              skipReasons: Record<string, number>;
            };
          };
        };
      };
    };
    const declarationRuntime = profile.finalize.referenceResolutionBreakdown.moduleEdgeWrite.declarationRuntime;
    expect(declarationRuntime.skippedRefs).toBeGreaterThanOrEqual(2);
    expect(declarationRuntime.skipReasons).toMatchObject({
      'multiple-runtime-siblings': expect.any(Number),
      'no-runtime-sibling': expect.any(Number),
    });
    expect(declarationRuntime.skipReasons['multiple-runtime-siblings']).toBeGreaterThanOrEqual(1);
    expect(declarationRuntime.skipReasons['no-runtime-sibling']).toBeGreaterThanOrEqual(1);
  }, 30_000);
});
