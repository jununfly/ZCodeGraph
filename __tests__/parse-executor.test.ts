/**
 * Tests for parse executor adapters and comment-stripping fallback.
 *
 * Candidate 4: isolate parse execution behind worker and in-process adapters.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock tree-sitter to avoid WASM dependency in unit tests
vi.mock('../src/extraction/tree-sitter', () => ({
  extractFromSource: vi.fn(),
}));

// Mock grammars to avoid WASM dependency
vi.mock('../src/extraction/grammars', () => ({
  detectLanguage: vi.fn(),
  initGrammars: vi.fn(),
  isSourceFile: vi.fn(),
  isFileLevelOnlyLanguage: vi.fn(),
}));

// Mock errors
vi.mock('../src/errors', () => ({
  logWarn: vi.fn(),
  logDebug: vi.fn(),
}));

import { extractFromSource } from '../src/extraction/tree-sitter';
import { detectLanguage, initGrammars } from '../src/extraction/grammars';

import { InProcessParseExecutor } from '../src/extraction/parse-executor-inprocess';
import { stripCommentLines, isWasmMemoryError } from '../src/extraction/parse-executor-fallback';
import type { ParseRequest, ParseExecutor } from '../src/extraction/parse-executor-types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockExtractResult(nodes: number = 1, errors: number = 0) {
  return {
    nodes: Array.from({ length: nodes }, (_, i) => ({
      id: `node-${i}`,
      name: `func${i}`,
      kind: 'function',
      filePath: 'test.ts',
      line: i + 1,
      column: 1,
      endLine: i + 1,
      endColumn: 10,
      language: 'typescript' as const,
      rawName: `func${i}`,
    })),
    edges: [],
    unresolvedReferences: [],
    errors: Array.from({ length: errors }, (_, i) => ({
      message: `error ${i}`,
      filePath: 'test.ts',
      severity: 'error' as const,
      code: 'parse_error' as const,
    })),
    durationMs: 1,
  };
}

function setupMocks() {
  vi.mocked(initGrammars).mockResolvedValue(undefined);
  vi.mocked(detectLanguage).mockReturnValue('typescript');
  vi.mocked(extractFromSource).mockReturnValue(mockExtractResult());
}

// ─── Tests: InProcessParseExecutor ──────────────────────────────────────────

describe('InProcessParseExecutor', () => {
  let executor: InProcessParseExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
    executor = new InProcessParseExecutor();
  });

  it('has name "in-process"', () => {
    expect(executor.name).toBe('in-process');
  });

  it('throws if parse called before initialize', async () => {
    await expect(executor.parse({ filePath: 'test.ts', content: 'const x = 1' }))
      .rejects.toThrow('not initialized');
  });

  it('initializes grammars on first initialize call', async () => {
    await executor.initialize(['typescript'], ['react']);
    expect(initGrammars).toHaveBeenCalledTimes(1);
  });

  it('initialize is idempotent', async () => {
    await executor.initialize(['typescript'], ['react']);
    await executor.initialize(['typescript'], ['react']);
    expect(initGrammars).toHaveBeenCalledTimes(1);
  });

  it('parses a file via extractFromSource', async () => {
    await executor.initialize(['typescript'], ['react']);
    const result = await executor.parse({ filePath: 'test.ts', content: 'const x = 1' });

    expect(extractFromSource).toHaveBeenCalledWith(
      'test.ts', 'const x = 1', 'typescript', ['react']
    );
    expect(result.fromWorker).toBe(false);
    expect(result.retryCount).toBe(0);
    expect(result.result.nodes).toHaveLength(1);
  });

  it('parses multiple files independently', async () => {
    await executor.initialize(['typescript', 'python'], []);

    vi.mocked(detectLanguage)
      .mockReturnValueOnce('typescript')
      .mockReturnValueOnce('python');

    const r1 = await executor.parse({ filePath: 'a.ts', content: 'const a = 1' });
    const r2 = await executor.parse({ filePath: 'b.py', content: 'def foo(): pass' });

    expect(r1.result.nodes).toHaveLength(1);
    expect(r2.result.nodes).toHaveLength(1);
    expect(extractFromSource).toHaveBeenCalledTimes(2);
  });

  it('reports errors from extractFromSource', async () => {
    vi.mocked(extractFromSource).mockReturnValue(mockExtractResult(0, 2));

    await executor.initialize(['typescript'], []);
    const result = await executor.parse({ filePath: 'bad.ts', content: 'broken' });

    expect(result.result.nodes).toHaveLength(0);
    expect(result.result.errors).toHaveLength(2);
  });

  it('throws extractFromSource errors as-is', async () => {
    vi.mocked(extractFromSource).mockImplementation(() => {
      throw new Error('memory access out of bounds');
    });

    await executor.initialize(['typescript'], []);
    await expect(executor.parse({ filePath: 'big.ts', content: 'x'.repeat(100000) }))
      .rejects.toThrow('memory access out of bounds');
  });

  it('can be disposed and re-initialized', async () => {
    await executor.initialize(['typescript'], []);
    await executor.dispose();

    await expect(executor.parse({ filePath: 'test.ts', content: 'x' }))
      .rejects.toThrow('not initialized');

    await executor.initialize(['typescript'], []);
    const result = await executor.parse({ filePath: 'test.ts', content: 'x' });
    expect(result.result.nodes).toHaveLength(1);
  });
});

// ─── Tests: WorkerParseExecutor (basic construction + lifecycle) ────────────

describe('WorkerParseExecutor', () => {
  // We test the WorkerParseExecutor class structure and configuration,
  // since actual worker_threads require a runtime environment.
  // The integration path is covered by existing ParseStage tests.

  it('can be imported and constructed', async () => {
    const { WorkerParseExecutor } = await import('../src/extraction/parse-executor-worker');
    const executor = new WorkerParseExecutor('/fake/path/parse-worker.js');
    expect(executor.name).toBe('worker');
  });

  it('accepts custom configuration', async () => {
    const { WorkerParseExecutor } = await import('../src/extraction/parse-executor-worker');
    const executor = new WorkerParseExecutor('/fake/path/parse-worker.js', {
      parseTimeoutMs: 5000,
      workerRecycleInterval: 100,
    });
    expect(executor.name).toBe('worker');
  });

  it('throws if parse called before initialize', async () => {
    const { WorkerParseExecutor } = await import('../src/extraction/parse-executor-worker');
    const executor = new WorkerParseExecutor('/fake/path/parse-worker.js');
    await expect(executor.parse({ filePath: 'test.ts', content: 'x' }))
      .rejects.toThrow('not initialized');
  });

  it('throws if parse called after dispose', async () => {
    const { WorkerParseExecutor } = await import('../src/extraction/parse-executor-worker');
    const executor = new WorkerParseExecutor('/fake/path/parse-worker.js');
    await executor.dispose();
    await expect(executor.parse({ filePath: 'test.ts', content: 'x' }))
      .rejects.toThrow('not initialized');
  });
});

// ─── Tests: stripCommentLines ───────────────────────────────────────────────

describe('stripCommentLines', () => {
  it('removes single-line comment lines', () => {
    const input = '// This is a comment\nconst x = 1;';
    expect(stripCommentLines(input)).toBe('\nconst x = 1;');
  });

  it('removes indented comment lines', () => {
    const input = '  // indented comment\nconst x = 1;';
    expect(stripCommentLines(input)).toBe('\nconst x = 1;');
  });

  it('preserves code with trailing comments', () => {
    const input = 'const x = 1; // trailing comment';
    expect(stripCommentLines(input)).toBe('const x = 1; // trailing comment');
  });

  it('preserves empty lines (becomes empty string in output)', () => {
    const input = 'const a = 1;\n\nconst b = 2;';
    expect(stripCommentLines(input)).toBe('const a = 1;\n\nconst b = 2;');
  });

  it('handles all-comment file', () => {
    const input = '// line 1\n// line 2\n// line 3';
    expect(stripCommentLines(input)).toBe('\n\n');
  });

  it('preserves block comments', () => {
    const input = '/* block comment */\nconst x = 1;';
    expect(stripCommentLines(input)).toBe('/* block comment */\nconst x = 1;');
  });

  it('preserves JSDoc-style comments (start with /** not //)', () => {
    const input = '/** @param x */\nfunction foo(x: number) {}';
    expect(stripCommentLines(input)).toBe('/** @param x */\nfunction foo(x: number) {}');
  });

  it('handles Python-style comments (not stripped)', () => {
    const input = '# python comment\nx = 1';
    expect(stripCommentLines(input)).toBe('# python comment\nx = 1');
  });

  it('handles empty input', () => {
    expect(stripCommentLines('')).toBe('');
  });

  it('preserves line count', () => {
    const input = 'line1\n//c2\nline3\n//c4\nline5';
    const result = stripCommentLines(input);
    expect(result.split('\n').length).toBe(5);
  });
});

// ─── Tests: isWasmMemoryError ───────────────────────────────────────────────

describe('isWasmMemoryError', () => {
  it('detects memory access out of bounds', () => {
    expect(isWasmMemoryError(new Error('memory access out of bounds'))).toBe(true);
  });

  it('detects out of memory', () => {
    expect(isWasmMemoryError(new Error('RuntimeError: out of memory'))).toBe(true);
  });

  it('detects worker exit', () => {
    expect(isWasmMemoryError(new Error('Worker exited with code 1'))).toBe(true);
  });

  it('rejects normal parse errors', () => {
    expect(isWasmMemoryError(new Error('Syntax error at line 42'))).toBe(false);
  });

  it('rejects non-Error values', () => {
    expect(isWasmMemoryError('memory access out of bounds')).toBe(false);
    expect(isWasmMemoryError(null)).toBe(false);
    expect(isWasmMemoryError(undefined)).toBe(false);
    expect(isWasmMemoryError(42)).toBe(false);
  });

  it('rejects timeout errors', () => {
    expect(isWasmMemoryError(new Error('Parse timed out after 10000ms'))).toBe(false);
  });

  it('rejects file read errors', () => {
    expect(isWasmMemoryError(new Error('ENOENT: no such file'))).toBe(false);
  });
});

// ─── Tests: ParseExecutor interface contract ────────────────────────────────

describe('ParseExecutor interface', () => {
  it('InProcessParseExecutor satisfies ParseExecutor interface', () => {
    const executor: ParseExecutor = new InProcessParseExecutor();
    expect(executor.name).toBe('in-process');
    expect(typeof executor.initialize).toBe('function');
    expect(typeof executor.parse).toBe('function');
    expect(typeof executor.dispose).toBe('function');
  });

  it('both executors share the same interface shape', async () => {
    const { WorkerParseExecutor } = await import('../src/extraction/parse-executor-worker');
    const inproc: ParseExecutor = new InProcessParseExecutor();
    const worker: ParseExecutor = new WorkerParseExecutor('/fake/path.js');

    // Same method signatures
    for (const key of ['name', 'initialize', 'parse', 'dispose'] as const) {
      expect(typeof inproc[key]).toBe(typeof worker[key]);
    }
  });
});
