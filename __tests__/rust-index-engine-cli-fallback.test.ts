import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';
import { buildRustHybridMetadataFromPlan, mergeMissingFallbackDiagnostics, mergeRustOwnedGapDiagnostics, planRustHybridAssignments } from '../src/indexing/rust-hybrid-contract';
import {
  makeRustIndexingTempProject,
  RUST_CORE_BIN,
  runZcodegraphCli,
  writeFakeRustCoreWithPartialWriteGap,
  writeFakeRustCoreWithPerFileGap,
  ZCODEGRAPH_BIN,
} from './helpers/rust-indexing-cli';

describe('zcodegraph rust-hybrid fallback degraded status and doctor output', () => {
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

  it('plans Rust-owned and non-Rust-owned files via TypeScript fallback for rust-hybrid', () => {
    fs.writeFileSync(path.join(tempDir, 'server.go'), 'package main\nfunc main() {}\n');
    fs.writeFileSync(path.join(tempDir, 'service.py'), 'def service():\n    return 1\n');
    fs.writeFileSync(path.join(tempDir, 'worker.rs'), 'fn worker() -> i32 { 1 }\n');
    fs.writeFileSync(path.join(tempDir, 'worker.c'), 'int worker(void) { return 1; }\n');
    fs.writeFileSync(path.join(tempDir, 'routing.yml'), 'app:\n  path: /health\n');
    fs.writeFileSync(path.join(tempDir, 'notes.txt'), 'not source\n');
    fs.writeFileSync(path.join(tempDir, 'service.pb.go'), 'package main\n');

    const plan = planRustHybridAssignments(tempDir);

    expect(plan.rustOwnedFiles).toContain('a.ts');
    expect(plan.rustOwnedFiles).toContain('server.go');
    expect(plan.rustOwnedFiles).toContain('service.py');
    expect(plan.rustOwnedFiles).toContain('worker.rs');
    expect(plan.rustOwnedFiles).toContain('worker.c');
    expect(plan.fallbackFiles).toContain('routing.yml');
    expect(plan.unsupportedFiles).toEqual([]);
    expect(plan.fallbackFiles).not.toContain('notes.txt');
    expect(plan.engineByLanguage).toMatchObject({ typescript: 'rust', go: 'rust', python: 'rust', rust: 'rust', c: 'rust', yaml: 'typescript' });
    expect(plan.engineByFileCount).toMatchObject({ rust: 5, typescript: 1 });
    expect(plan.fallbackByLanguage).toMatchObject({ yaml: 1 });
    expect(plan.fallbackFileCount).toBe(1);
    expect(plan.missingFallbackByLanguage).toEqual({});
    expect(plan.missingFallbackFileCount).toBe(0);
    expect(plan.skippedGeneratedByLanguage.go).toBe(1);
    expect(plan.fallbackState).toBe('partial');
    expect(plan.fallbackReasonTaxonomy).toMatchObject({ 'language-level-typescript-fallback': 1 });
    expect(plan.pendingFallbacks).toContain('rust-owned-parse-gap');
  });

  it('classifies ambiguous headers by content before assigning rust-hybrid ownership', () => {
    fs.writeFileSync(path.join(tempDir, 'plain.h'), '#ifndef PLAIN_H\nint plain(void);\n#endif\n');
    fs.writeFileSync(path.join(tempDir, 'widget.h'), 'namespace app { class Widget {}; }\n');
    fs.writeFileSync(path.join(tempDir, 'View.h'), '@interface View\n@end\n');

    const plan = planRustHybridAssignments(tempDir);

    expect(plan.rustOwnedFiles).toContain('plain.h');
    expect(plan.rustOwnedFiles).toContain('widget.h');
    expect(plan.fallbackFiles).toContain('View.h');
    expect(plan.engineByLanguage).toMatchObject({ c: 'rust', cpp: 'rust', objc: 'typescript' });
    expect(plan.fallbackByLanguage).toMatchObject({ objc: 1 });
  });

  it('records Rust-owned per-file gap diagnostics without same-language TypeScript fallback append', () => {
    const plan = planRustHybridAssignments(tempDir);
    const merged = mergeRustOwnedGapDiagnostics(plan, [
      {
        filePath: 'a.ts',
        language: 'typescript',
        code: 'rust-owned-parse-gap',
        severity: 'warning',
        writtenByRust: false,
      },
    ]);

    const metadata = buildRustHybridMetadataFromPlan(merged);

    expect(merged.fallbackFiles).not.toContain('a.ts');
    expect(metadata).toMatchObject({
      fallbackState: 'degraded',
      fallbackByLanguage: {},
      fallbackFileCount: 0,
      fallbackReasonTaxonomy: { 'rust-owned-parse-gap': 1 },
      pendingFallbacks: [],
    });
    expect(metadata.fallbackMessage).toContain('Rust-owned gap diagnostics recorded 1 file');
    expect(metadata.fallbackMessage).toContain('without TypeScript fallback append');
  });

  it('records sparse-missing fallback diagnostics in rust-hybrid metadata', () => {
    fs.writeFileSync(path.join(tempDir, 'routing.yml'), 'app:\n  path: /health\n');
    const plan = planRustHybridAssignments(tempDir);
    const merged = mergeMissingFallbackDiagnostics(plan, {
      missingFallbackFileCount: 1,
      missingFallbackByLanguage: { yaml: 1 },
    });

    const metadata = buildRustHybridMetadataFromPlan(merged);

    expect(metadata).toMatchObject({
      fallbackState: 'degraded',
      fallbackByLanguage: { yaml: 1 },
      fallbackFileCount: 1,
      fallbackReasonTaxonomy: {
        'language-level-typescript-fallback': 1,
        'language-level-fallback-missing-file': 1,
      },
      missingFallbackFileCount: 1,
      missingFallbackByLanguage: { yaml: 1 },
    });
    expect(metadata.fallbackMessage).toContain('Sparse checkout omitted 1 planned TypeScript fallback file');
  });

  it('does not append TypeScript fallback for Rust-owned per-file gaps from a successful Rust core', () => {
    const rustCore = writeFakeRustCoreWithPerFileGap(tempDir, 'a.ts');

    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.kind === 'function' && match.node.language === 'typescript')).toBe(false);
      const buildInfo = cg.getIndexBuildInfo();
      expect(buildInfo.engine).toBe('rust-hybrid');
      expect(buildInfo.hybrid).toMatchObject({
        fallbackState: 'degraded',
        fallbackByLanguage: {},
        fallbackFileCount: 0,
        fallbackReasonTaxonomy: { 'rust-owned-parse-gap': 1 },
        pendingFallbacks: [],
      });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('reports unrecovered Rust-owned parse gap diagnostics consistently in CLI output and errors log', () => {
    const rustCore = writeFakeRustCoreWithPerFileGap(tempDir, 'a.ts');

    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).not.toContain('recovered by fallback');
    expect(result.stdout).not.toContain('recovered by TypeScript fallback');
    expect(result.stdout).not.toContain('could not be parsed');
    expect(result.stdout).toContain('Warning breakdown');
    expect(result.stdout).toContain('Rust-owned files with diagnostics and no TypeScript fallback append');
    expect(result.stdout).toContain('Fallback health: degraded');
    expect(result.stdout).toContain('The index is usable; fallback-degraded files or diagnostics are the only parts that need review.');
    expect(result.stdout).toContain('Top fallback reasons:');
    expect(result.stdout).toContain('1 Rust-owned files with parse diagnostics');
    expect(result.stdout).toContain('zcodegraph doctor --engine rust-hybrid --bundle --last-run');

    const errorsLog = fs.readFileSync(path.join(tempDir, '.zcodegraph', 'errors.log'), 'utf-8');
    expect(errorsLog).toContain('0 files with errors');
    expect(errorsLog).toContain('1 file with warning diagnostics');
    expect(errorsLog).toContain('Warning diagnostics:');
    expect(errorsLog).toContain('a.ts:1:1: fake Rust-owned parse gap [rust-owned-parse-gap]');

    const cg = CodeGraph.openSync(tempDir);
    try {
      const buildInfo = cg.getIndexBuildInfo();
      expect(buildInfo.hybrid).toMatchObject({
        fallbackState: 'degraded',
        fallbackByLanguage: {},
        fallbackFileCount: 0,
        fallbackReasonTaxonomy: { 'rust-owned-parse-gap': 1 },
      });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('does not append fallback when a Rust-owned gap may have partial graph writes', () => {
    const rustCore = writeFakeRustCoreWithPartialWriteGap(tempDir, 'a.ts');

    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: rustCore,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('alpha').some((match) => match.node.language === 'typescript')).toBe(false);
      const buildInfo = cg.getIndexBuildInfo();
      expect(buildInfo.engine).toBe('rust-hybrid');
      expect(buildInfo.hybrid).toMatchObject({
        fallbackState: 'degraded',
        fallbackByLanguage: {},
        fallbackFileCount: 0,
        fallbackReasonTaxonomy: { 'rust-owned-gap-with-partial-write-blocked': 1 },
      });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('prints a concise fallback summary when rust-hybrid appends fallback files', () => {
    fs.writeFileSync(path.join(tempDir, 'routing.yml'), 'app:\n  path: /health\n');

    const result = runZcodegraphCli(tempDir, ['index'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('non-Rust-owned files via TypeScript fallback');
    expect(result.stdout).toContain('Fallback health: partial');
    expect(result.stdout).toContain('files indexed via TypeScript fallback (non-Rust-owned languages)');
    expect(result.stdout).not.toContain('need review');
    expect(result.stdout).not.toContain('zcodegraph doctor --engine rust-hybrid --bundle --last-run');
  }, 30_000);

  it('surfaces partial fallback quality details in status output', () => {
    fs.writeFileSync(path.join(tempDir, 'routing.yml'), 'app:\n  path: /health\n');

    const index = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(index.status, `stdout:\n${index.stdout}\nstderr:\n${index.stderr}`).toBe(0);

    const status = runZcodegraphCli(tempDir, ['status']);
    expect(status.status, `stdout:\n${status.stdout}\nstderr:\n${status.stderr}`).toBe(0);
    expect(status.stdout).toContain('Graph Health:');
    expect(status.stdout).toContain('State: healthy');
    expect(status.stdout).toContain('Rust-hybrid Fallback:');
    expect(status.stdout).toContain('Fallback health: partial');
    expect(status.stdout).toContain('non-Rust-owned files via TypeScript fallback');
    expect(status.stdout).not.toContain('per-file-diagnostics.json');
    expect(status.stdout).not.toContain('zcodegraph doctor --engine rust-hybrid --bundle --last-run');
  }, 30_000);

  it('exposes partial fallback quality details in status json', () => {
    fs.writeFileSync(path.join(tempDir, 'routing.yml'), 'app:\n  path: /health\n');

    const index = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(index.status, `stdout:\n${index.stdout}\nstderr:\n${index.stderr}`).toBe(0);

    const statusResult = runZcodegraphCli(tempDir, ['status', '--json']);
    expect(statusResult.status, `stdout:\n${statusResult.stdout}\nstderr:\n${statusResult.stderr}`).toBe(0);
    const statusLine = statusResult.stdout.trim().split('\n').filter(Boolean).pop();
    expect(statusLine).toBeDefined();
    const status = JSON.parse(statusLine!) as {
      fallbackDiagnostics: {
        state: string;
        graphUsabilityMessage: string;
        doctorCommand: string;
        artifactHint: string;
        topReasons: Array<{ code: string; count: number; label: string }>;
      };
    };
    expect(status.fallbackDiagnostics).toMatchObject({
      state: 'partial',
      doctorCommand: '',
      artifactHint: '',
    });
    expect(status.fallbackDiagnostics.graphUsabilityMessage).toContain('Index is complete');
    expect(status.fallbackDiagnostics.topReasons).toEqual([
      expect.objectContaining({
        code: 'language-level-typescript-fallback',
        count: 1,
        label: 'non-Rust-owned files via TypeScript fallback',
      }),
    ]);
  }, 30_000);

  it('prints the partial fallback health explanation during rust-hybrid init', () => {
    const initDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-hybrid-fallback-init-'));
    try {
      fs.writeFileSync(path.join(initDir, 'a.ts'), 'export const initValue = 1;\n');
      fs.writeFileSync(path.join(initDir, 'routing.yml'), 'app:\n  path: /health\n');

      const result = runZcodegraphCli(initDir, ['init'], {
        ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      });

      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
      expect(result.stdout).toContain('Initialized in');
      expect(result.stdout).toContain('Indexed with rust-hybrid');
      expect(result.stdout).toContain('Fallback health: partial');
      expect(result.stdout).toContain('files indexed via TypeScript fallback (non-Rust-owned languages)');
      expect(result.stdout).not.toContain('need review');
      expect(result.stdout).not.toContain('zcodegraph doctor --engine rust-hybrid --bundle --last-run');
    } finally {
      fs.rmSync(initDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('appends fallback files without clearing existing graph data or stamping TypeScript metadata', async () => {
    const cg = CodeGraph.openSync(tempDir);
    try {
      const initial = await cg.indexFiles(['a.ts']);
      expect(initial.success, JSON.stringify(initial.errors, null, 2)).toBe(true);
      expect(cg.searchNodes('alpha').some((match) => match.node.language === 'typescript')).toBe(true);

      fs.writeFileSync(path.join(tempDir, 'worker.rs'), 'fn worker() -> i32 { 1 }\n');
      const appended = await cg.indexFallbackFiles(['worker.rs']);

      expect(appended.success).toBe(true);
      expect(appended.fallbackFileCount).toBe(1);
      expect(appended.errorTaxonomy).toEqual({});
      expect(cg.searchNodes('alpha').some((match) => match.node.language === 'typescript')).toBe(true);
      expect(cg.searchNodes('worker').some((match) => match.node.language === 'rust')).toBe(true);
      expect(cg.getIndexBuildInfo().engine).not.toBe('typescript');
    } finally {
      cg.close();
    }
  }, 30_000);

  it('counts generated Go files in rust-hybrid metadata', () => {
    fs.writeFileSync(path.join(tempDir, 'service.pb.go'), 'package main\n');

    const result = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const statusResult = runZcodegraphCli(tempDir, ['status', '--json']);
    expect(statusResult.status).toBe(0);
    const statusLine = statusResult.stdout.trim().split('\n').filter(Boolean).pop();
    expect(statusLine).toBeDefined();
    const status = JSON.parse(statusLine!) as {
      index: {
        hybrid: {
          rustOwnedLanguages: string[];
          skippedGeneratedByLanguage: Record<string, number>;
        };
      };
    };
    expect(status.index.hybrid.rustOwnedLanguages).toContain('go');
    expect(status.index.hybrid.skippedGeneratedByLanguage.go).toBe(1);
  }, 30_000);

  it('prints the rust-hybrid failure doctor hint when the Rust binary is unavailable', async () => {
    const cg = CodeGraph.openSync(tempDir);
    try {
      await cg.indexAll({ engine: 'typescript' });
    } finally {
      cg.close();
    }

    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--force'], {
      ZCODEGRAPH_RUST_CORE_BINARY: path.join(tempDir, 'missing-rust-core'),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Rust-hybrid indexing failed before fallback could safely continue.');
    expect(result.stderr).toContain('Previous index was preserved.');
    expect(result.stderr).toContain('zcodegraph doctor --engine rust-hybrid --bundle --last-failure');
  }, 30_000);
});
