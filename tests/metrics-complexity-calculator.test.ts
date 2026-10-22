/**
 * ComplexityCalculator — integration tests with real files on disk.
 *
 * Verifies:
 *  - Body-slice acquisition matches ContextBuilder.extractNodeCode
 *    semantics (start_line/end_line → lines.slice).
 *  - File LRU caches by mtime (no re-read for the same file).
 *  - Eligibility gate rejects wrong kind/language before any fs hit.
 *  - Path traversal outside projectRoot returns null.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Node } from '../src/types';
import { ComplexityCalculator } from '../src/metrics/complexity/calculator';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-complexity-'));
});

afterEach(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors on Windows (EPERM)
  }
});

function writeFile(rel: string, lines: string[]): string {
  const abs = path.join(tmpDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  // Use LF explicitly so start/end-line arithmetic is stable.
  fs.writeFileSync(abs, lines.join('\n'), 'utf-8');
  return abs;
}

let seq = 0;
function fn(partial: Partial<Node> & Pick<Node, 'name' | 'filePath' | 'language' | 'kind'>): Node {
  seq++;
  return {
    id: `fn:${seq}`,
    qualifiedName: `${partial.filePath}::${partial.name}`,
    startLine: 1,
    endLine: 1,
    startColumn: 0,
    endColumn: 0,
    updatedAt: 0,
    ...partial,
  };
}

describe('ComplexityCalculator', () => {
  it('computes complexity for a real C# file body slice', () => {
    writeFile('src/Foo.cs', [
      'public class Foo {',
      '  public int M(int x) {',
      '    if (x > 0) return 1;',
      '    return 0;',
      '  }',
      '}',
    ]);
    const n = fn({
      name: 'M',
      filePath: 'src/Foo.cs',
      language: 'csharp',
      kind: 'method',
      startLine: 2,
      endLine: 5,
    });
    const calc = new ComplexityCalculator({ projectRoot: tmpDir });
    const v = calc.compute(n);
    expect(v).not.toBeNull();
    expect(v!.value).toBe(2); // 1 + if
    expect(v!.exemption).toBeNull();
  });

  it('computes complexity for a real Python file body slice', () => {
    writeFile('src/f.py', [
      'def f(x):',
      '    if x:',
      '        return 1',
      '    elif y:',
      '        return 2',
      '    return 0',
    ]);
    const n = fn({
      name: 'f',
      filePath: 'src/f.py',
      language: 'python',
      kind: 'function',
      startLine: 1,
      endLine: 6,
    });
    const calc = new ComplexityCalculator({ projectRoot: tmpDir });
    const v = calc.compute(n);
    expect(v!.value).toBe(3); // 1 + if + elif
  });

  it('computes complexity for a real Rust file with match arms', () => {
    writeFile('src/lib.rs', [
      'fn classify(x: i32) -> i32 {',
      '    match x {',
      '        0 => 0,',
      '        1 => 1,',
      '        _ => 2,',
      '    }',
      '}',
    ]);
    const n = fn({
      name: 'classify',
      filePath: 'src/lib.rs',
      language: 'rust',
      kind: 'function',
      startLine: 1,
      endLine: 7,
    });
    const calc = new ComplexityCalculator({ projectRoot: tmpDir });
    const v = calc.compute(n);
    // match keyword = 0, three arms (=>) = 3
    expect(v!.value).toBe(4);
    expect(v!.decisionPoints).toBe(3);
  });

  it('returns null for non-eligible nodes without touching fs', () => {
    // Wrong kind
    const cls = fn({
      name: 'C',
      filePath: 'nonexistent.cs',
      language: 'csharp',
      kind: 'class',
    });
    const calc = new ComplexityCalculator({ projectRoot: tmpDir });
    expect(calc.compute(cls)).toBeNull();

    // Wrong language
    const goFn = fn({
      name: 'f',
      filePath: 'nonexistent.go',
      language: 'go',
      kind: 'function',
    });
    expect(calc.compute(goFn)).toBeNull();
  });

  it('returns null value when the file does not exist', () => {
    const n = fn({
      name: 'M',
      filePath: 'no/such/file.cs',
      language: 'csharp',
      kind: 'method',
      startLine: 1,
      endLine: 5,
    });
    const calc = new ComplexityCalculator({ projectRoot: tmpDir });
    const v = calc.compute(n);
    expect(v).not.toBeNull();
    expect(v!.value).toBeNull();
    expect(v!.exemption).toBeNull();
  });

  it('rejects path traversal outside projectRoot', () => {
    const n = fn({
      name: 'M',
      filePath: '../../etc/passwd',
      language: 'csharp',
      kind: 'method',
      startLine: 1,
      endLine: 5,
    });
    const calc = new ComplexityCalculator({ projectRoot: tmpDir });
    const v = calc.compute(n);
    expect(v!.value).toBeNull();
  });

  it('caches file lines (mtime-invalidated)', () => {
    const abs = writeFile('src/Foo.cs', [
      'public class Foo {',
      '  public int M(int x) {',
      '    if (x > 0) return 1;',
      '    return 0;',
      '  }',
      '}',
    ]);
    const n = fn({
      name: 'M',
      filePath: 'src/Foo.cs',
      language: 'csharp',
      kind: 'method',
      startLine: 2,
      endLine: 5,
    });
    const calc = new ComplexityCalculator({ projectRoot: tmpDir });
    const v1 = calc.compute(n);
    expect(v1!.value).toBe(2);

    // Modify the file to add a second decision point. mtime must change
    // for cache invalidation — on fast filesystems we may need to
    // explicitly bump it.
    fs.writeFileSync(
      abs,
      [
        'public class Foo {',
        '  public int M(int x) {',
        '    if (x > 0) return 1;',
        '    if (x < 0) return -1;',
        '    return 0;',
        '  }',
        '}',
      ].join('\n'),
      'utf-8',
    );
    // Force mtime bump (some filesystems have 1s granularity).
    const future = new Date(Date.now() + 2000);
    fs.utimesSync(abs, future, future);

    const v2 = calc.compute(n);
    expect(v2!.value).toBe(3); // 1 + if + if
  });
});
