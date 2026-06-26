import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph, type IndexEngine } from '../src';

const RUST_CORE_BIN = path.resolve(
  __dirname,
  '..',
  'target',
  'debug',
  process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core',
);

function makeProject(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `zcodegraph-sdk-${label}-`));
  fs.writeFileSync(path.join(dir, 'a.ts'), 'export function alpha(): number { return 1; }\n');
  return dir;
}

function writeFakeRustCoreWithPartialWriteGap(dir: string, filePath: string): string {
  const script = path.join(dir, process.platform === 'win32' ? 'fake-rust-core-partial-gap.cjs' : 'fake-rust-core-partial-gap');
  fs.writeFileSync(
    script,
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      'if (!args.includes("index")) process.exit(2);',
      'process.stdout.write(JSON.stringify({',
      '  type: "result",',
      '  success: true,',
      '  filesIndexed: 1,',
      '  filesSkipped: 0,',
      '  filesErrored: 1,',
      '  nodesCreated: 0,',
      '  edgesCreated: 0,',
      '  errors: [{',
      `    filePath: ${JSON.stringify(filePath)},`,
      '    language: "typescript",',
      '    code: "rust-owned-parse-gap",',
      '    severity: "warning",',
      '    writtenByRust: true,',
      '    message: "fake partial Rust write gap"',
      '  }],',
      '  durationMs: 1',
      '}) + "\\n");',
    ].join('\n') + '\n',
  );
  fs.chmodSync(script, 0o755);
  return script;
}

describe('SDK rust-hybrid full-index alignment', () => {
  const tempDirs: string[] = [];

  beforeAll(() => {
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

  it('exports the shared IndexEngine type and accepts explicit TypeScript engine for init indexing', async () => {
    const engine: IndexEngine = 'typescript';
    const dir = makeProject('init-typescript');
    tempDirs.push(dir);

    const cg = await CodeGraph.init(dir, { index: true, engine });
    try {
      expect(cg.getIndexBuildInfo().engine).toBe('typescript');
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    } finally {
      cg.close();
    }
  });

  it('accepts explicit TypeScript engine for SDK full re-indexing', async () => {
    const dir = makeProject('indexall-typescript');
    tempDirs.push(dir);
    const cg = await CodeGraph.init(dir, { index: false });
    try {
      const result = await cg.indexAll({ engine: 'typescript' });

      expect(result.success).toBe(true);
      expect(cg.getIndexBuildInfo().engine).toBe('typescript');
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    } finally {
      cg.close();
    }
  });

  it('accepts explicit Rust engine for SDK full re-indexing', async () => {
    const dir = makeProject('indexall-rust');
    tempDirs.push(dir);
    const cg = await CodeGraph.init(dir, { index: false });
    const previousRustCore = process.env.ZCODEGRAPH_RUST_CORE_BINARY;
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = RUST_CORE_BIN;

    try {
      const result = await cg.indexAll({ engine: 'rust' });

      expect(result.success).toBe(true);
      expect(cg.getIndexBuildInfo().engine).toBe('rust');
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    } finally {
      if (previousRustCore == null) {
        delete process.env.ZCODEGRAPH_RUST_CORE_BINARY;
      } else {
        process.env.ZCODEGRAPH_RUST_CORE_BINARY = previousRustCore;
      }
      cg.close();
    }
  }, 30_000);

  it('uses rust-hybrid for SDK init indexing by default', async () => {
    const dir = makeProject('init-default');
    tempDirs.push(dir);
    const previousRustCore = process.env.ZCODEGRAPH_RUST_CORE_BINARY;
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = RUST_CORE_BIN;

    const cg = await CodeGraph.init(dir, { index: true });
    try {
      expect(cg.getIndexBuildInfo().engine).toBe('rust-hybrid');
      expect(cg.getIndexBuildInfo().hybrid).toMatchObject({
        fallbackState: 'healthy',
      });
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    } finally {
      if (previousRustCore == null) {
        delete process.env.ZCODEGRAPH_RUST_CORE_BINARY;
      } else {
        process.env.ZCODEGRAPH_RUST_CORE_BINARY = previousRustCore;
      }
      cg.close();
    }
  }, 30_000);

  it('uses rust-hybrid for SDK re-indexing by default without reading the CLI engine env', async () => {
    const dir = makeProject('indexall-default');
    tempDirs.push(dir);
    const cg = await CodeGraph.init(dir, { index: false });
    const previousRustCore = process.env.ZCODEGRAPH_RUST_CORE_BINARY;
    const previousEngine = process.env.ZCODEGRAPH_INDEX_ENGINE;
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = RUST_CORE_BIN;
    process.env.ZCODEGRAPH_INDEX_ENGINE = 'typescript';

    try {
      const result = await cg.indexAll();

      expect(result.success).toBe(true);
      expect(cg.getIndexBuildInfo().engine).toBe('rust-hybrid');
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    } finally {
      if (previousRustCore == null) {
        delete process.env.ZCODEGRAPH_RUST_CORE_BINARY;
      } else {
        process.env.ZCODEGRAPH_RUST_CORE_BINARY = previousRustCore;
      }
      if (previousEngine == null) {
        delete process.env.ZCODEGRAPH_INDEX_ENGINE;
      } else {
        process.env.ZCODEGRAPH_INDEX_ENGINE = previousEngine;
      }
      cg.close();
    }
  }, 30_000);

  it('fails safely on SDK default rust-hybrid process failure without full TypeScript fallback', async () => {
    const dir = makeProject('fail-safe');
    tempDirs.push(dir);
    const cg = await CodeGraph.init(dir, { index: true, engine: 'typescript' });
    const previousRustCore = process.env.ZCODEGRAPH_RUST_CORE_BINARY;
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = path.join(dir, 'missing-zcodegraph-core');

    try {
      await expect(cg.indexAll()).rejects.toThrow(/Rust index engine is unavailable/);
      expect(cg.getIndexBuildInfo().engine).toBe('typescript');
      expect(cg.searchNodes('alpha').some((match) => match.node.name === 'alpha')).toBe(true);
    } finally {
      if (previousRustCore == null) {
        delete process.env.ZCODEGRAPH_RUST_CORE_BINARY;
      } else {
        process.env.ZCODEGRAPH_RUST_CORE_BINARY = previousRustCore;
      }
      cg.close();
    }
  }, 30_000);

  it('indexes Python through SDK rust-hybrid as a Rust-owned language', async () => {
    const dir = makeProject('python-rust-owned');
    tempDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'worker.py'), 'def worker():\n    return 1\n');
    const previousRustCore = process.env.ZCODEGRAPH_RUST_CORE_BINARY;
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = RUST_CORE_BIN;

    const cg = await CodeGraph.init(dir, { index: false });
    try {
      const result = await cg.indexAll();

      expect(result.success).toBe(true);
      expect(cg.searchNodes('worker').some((match) => match.node.language === 'python')).toBe(true);
      expect(cg.getIndexBuildInfo().hybrid).toMatchObject({
        rustOwnedLanguages: expect.arrayContaining(['python']),
        engineByLanguage: { python: 'rust' },
        fallbackByLanguage: {},
        fallbackFileCount: 0,
        fallbackReasonTaxonomy: {},
      });
    } finally {
      if (previousRustCore == null) {
        delete process.env.ZCODEGRAPH_RUST_CORE_BINARY;
      } else {
        process.env.ZCODEGRAPH_RUST_CORE_BINARY = previousRustCore;
      }
      cg.close();
    }
  }, 30_000);

  it('indexes Rust files through SDK rust-hybrid as a Rust-owned language', async () => {
    const dir = makeProject('rust-rust-owned');
    tempDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'worker.rs'), 'fn worker() -> i32 { 1 }\n');
    const previousRustCore = process.env.ZCODEGRAPH_RUST_CORE_BINARY;
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = RUST_CORE_BIN;

    const cg = await CodeGraph.init(dir, { index: false });
    try {
      const result = await cg.indexAll();

      expect(result.success).toBe(true);
      expect(cg.searchNodes('worker').some((match) => match.node.language === 'rust')).toBe(true);
      expect(cg.getIndexBuildInfo().hybrid).toMatchObject({
        rustOwnedLanguages: expect.arrayContaining(['rust']),
        engineByLanguage: { rust: 'rust' },
        fallbackByLanguage: {},
        fallbackFileCount: 0,
        fallbackReasonTaxonomy: {},
      });
    } finally {
      if (previousRustCore == null) {
        delete process.env.ZCODEGRAPH_RUST_CORE_BINARY;
      } else {
        process.env.ZCODEGRAPH_RUST_CORE_BINARY = previousRustCore;
      }
      cg.close();
    }
  }, 30_000);

  it('appends language-level TypeScript fallback files through SDK rust-hybrid', async () => {
    const dir = makeProject('language-fallback');
    tempDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'routing.yml'), 'app:\n  path: /health\n');
    const previousRustCore = process.env.ZCODEGRAPH_RUST_CORE_BINARY;
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = RUST_CORE_BIN;

    const cg = await CodeGraph.init(dir, { index: false });
    try {
      const result = await cg.indexAll();

      expect(result.success).toBe(true);
      expect(cg.getIndexBuildInfo().hybrid).toMatchObject({
        fallbackState: 'degraded',
        fallbackByLanguage: { yaml: 1 },
        fallbackFileCount: 1,
        fallbackReasonTaxonomy: { 'language-level-typescript-fallback': 1 },
      });
    } finally {
      if (previousRustCore == null) {
        delete process.env.ZCODEGRAPH_RUST_CORE_BINARY;
      } else {
        process.env.ZCODEGRAPH_RUST_CORE_BINARY = previousRustCore;
      }
      cg.close();
    }
  }, 30_000);

  it('treats missing language-level fallback files as degraded diagnostics without weakening ordinary file indexing', async () => {
    const dir = makeProject('missing-language-fallback');
    tempDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'routing.yml'), 'app:\n  path: /health\n');

    const cg = await CodeGraph.init(dir, { index: false });
    try {
      await expect(cg.indexFiles(['routing.yml'])).resolves.toMatchObject({
        success: true,
      });
      await expect(cg.indexFiles(['missing.yml'])).resolves.toMatchObject({
        success: false,
      });

      const result = await cg.indexFallbackFiles(['routing.yml', 'missing.yml']);

      expect(result.success).toBe(true);
      expect(result.fallbackFileCount).toBe(2);
      expect(result.errorTaxonomy).toMatchObject({
        'language-level-fallback-missing-file': 1,
      });
      expect(result.missingFallbackFileCount).toBe(1);
      expect(result.missingFallbackByLanguage).toEqual({ yaml: 1 });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('records Rust-owned per-file parse gaps through SDK rust-hybrid without same-language TypeScript fallback', async () => {
    const dir = makeProject('rust-owned-gap');
    tempDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'broken.ts'), 'export function broken( {\n');
    const previousRustCore = process.env.ZCODEGRAPH_RUST_CORE_BINARY;
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = RUST_CORE_BIN;

    const cg = await CodeGraph.init(dir, { index: false });
    try {
      const result = await cg.indexAll();

      expect(result.success).toBe(true);
      expect(cg.getIndexBuildInfo().hybrid).toMatchObject({
        fallbackState: 'degraded',
        fallbackByLanguage: {},
        fallbackFileCount: 0,
        fallbackReasonTaxonomy: { 'rust-owned-parse-gap': 1 },
        pendingFallbacks: [],
      });
    } finally {
      if (previousRustCore == null) {
        delete process.env.ZCODEGRAPH_RUST_CORE_BINARY;
      } else {
        process.env.ZCODEGRAPH_RUST_CORE_BINARY = previousRustCore;
      }
      cg.close();
    }
  }, 30_000);

  it('preserves partial-write blocked taxonomy through SDK rust-hybrid', async () => {
    const dir = makeProject('partial-write-blocked');
    tempDirs.push(dir);
    const rustCore = writeFakeRustCoreWithPartialWriteGap(dir, 'a.ts');
    const previousRustCore = process.env.ZCODEGRAPH_RUST_CORE_BINARY;
    process.env.ZCODEGRAPH_RUST_CORE_BINARY = rustCore;

    const cg = await CodeGraph.init(dir, { index: false });
    try {
      const result = await cg.indexAll();

      expect(result.success).toBe(true);
      expect(cg.searchNodes('alpha').some((match) => match.node.language === 'typescript')).toBe(false);
      expect(cg.getIndexBuildInfo().hybrid).toMatchObject({
        fallbackState: 'degraded',
        fallbackByLanguage: {},
        fallbackFileCount: 0,
        fallbackReasonTaxonomy: { 'rust-owned-gap-with-partial-write-blocked': 1 },
      });
    } finally {
      if (previousRustCore == null) {
        delete process.env.ZCODEGRAPH_RUST_CORE_BINARY;
      } else {
        process.env.ZCODEGRAPH_RUST_CORE_BINARY = previousRustCore;
      }
      cg.close();
    }
  }, 30_000);
});
