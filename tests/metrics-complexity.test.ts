/**
 * Complexity rubric v1 — pure-function unit tests.
 *
 * Locks the decision-point sets, exemption rules, and formula in
 * docs/contracts/complexity-rubric-v1.md (roadmap 1-2-6). Any rule change
 * requires a rubric amendment (clarification) or v2 (rule change).
 */

import { describe, expect, it } from 'vitest';
import type { Node } from '../src/types';
import {
  COMPLEXITY_LANGUAGES,
  computeCyclomatic,
} from '../src/metrics/complexity/rubric';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

let seq = 0;
function fn(
  partial: Partial<Node> &
    Pick<Node, 'name' | 'filePath' | 'language' | 'kind'>,
): Node {
  seq++;
  return {
    id: `fn:${seq}`,
    qualifiedName: `${partial.filePath}::${partial.name}`,
    startLine: 1,
    endLine: 10,
    startColumn: 0,
    endColumn: 0,
    updatedAt: 0,
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// Language/kind gate
// ---------------------------------------------------------------------------

describe('eligibility gate', () => {
  it('accepts function + method on the 5 frozen languages', () => {
    for (const lang of COMPLEXITY_LANGUAGES) {
      for (const kind of ['function', 'method'] as const) {
        const n = fn({ name: 'x', filePath: 'a', language: lang, kind });
        // Use a body with `{` so the Rust trait-declaration heuristic
        // (single line ending in `;` with no `{`) does not fire.
        const body =
          lang === 'python' ? 'def x():\n    return 1' : 'int x() { return 1; }';
        const v = computeCyclomatic(n, body);
        // Exemption-free stub: value must be set for all 5 languages.
        expect(v.value, `${lang}/${kind}`).not.toBeNull();
      }
    }
  });

  it('rejects non-function/method kinds (returns null value)', () => {
    const n = fn({
      name: 'C',
      filePath: 'a.cs',
      language: 'csharp',
      kind: 'class',
    });
    const v = computeCyclomatic(n, 'class C {}');
    expect(v.value).toBeNull();
  });

  it('rejects languages outside the 5 (returns null value)', () => {
    const n = fn({
      name: 'f',
      filePath: 'a.go',
      language: 'go',
      kind: 'function',
    });
    const v = computeCyclomatic(n, 'func f() { if true {} }');
    expect(v.value).toBeNull();
  });

  it('returns null value when bodySlice is null (unreadable file)', () => {
    const n = fn({
      name: 'f',
      filePath: 'a.cs',
      language: 'csharp',
      kind: 'method',
    });
    const v = computeCyclomatic(n, null);
    expect(v.value).toBeNull();
    expect(v.exemption).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// C# decision points
// ---------------------------------------------------------------------------

describe('csharp', () => {
  const csFn = (body: string) =>
    fn({
      name: 'M',
      filePath: 'a.cs',
      language: 'csharp',
      kind: 'method',
    });

  it('linear body → complexity 1', () => {
    const v = computeCyclomatic(csFn(''), 'int x = 1; return x;');
    expect(v.value).toBe(1);
    expect(v.decisionPoints).toBe(0);
  });

  it('single if → 2', () => {
    const v = computeCyclomatic(
      csFn(''),
      'if (x > 0) { return 1; } return 0;',
    );
    expect(v.value).toBe(2);
  });

  it('if + for + foreach + while + do-while + case + catch + && + || + ? + ?? → 1+12', () => {
    const body = `
      if (a) {}
      for (int i = 0; i < 10; i++) {}
      foreach (var y in ys) {}
      while (b) {}
      do {} while (c);
      switch (s) { case 1: break; }
      try {} catch (Exception e) {}
      var r = (x && y) || z;
      var t = p ? 1 : 2;
      var u = q ?? 5;
    `;
    const v = computeCyclomatic(csFn(''), body);
    // if(1) for(1) foreach(1) while(1) do(1) while(1) case(1) catch(1)
    // &&(1) ||(1) ?(1) ??(1) = 12 decision points
    expect(v.decisionPoints).toBe(12);
    expect(v.value).toBe(13);
  });

  it('else if counts once (the if), not twice', () => {
    const v = computeCyclomatic(
      csFn(''),
      'if (a) {} else if (b) {} else {}',
    );
    expect(v.decisionPoints).toBe(2); // if + else if
    expect(v.value).toBe(3);
  });

  it('comments and strings are not counted', () => {
    const body = `
      // if (this is a comment) for while
      /* if block comment for while */
      var s = "if while case";
      var t = "another string with && and ||";
    `;
    const v = computeCyclomatic(csFn(''), body);
    expect(v.decisionPoints).toBe(0);
  });

  it('?. (null-conditional) contributes 0', () => {
    const v = computeCyclomatic(csFn(''), 'var x = obj?.Foo?.Bar;');
    expect(v.decisionPoints).toBe(0);
  });

  it('??= counts as one operator', () => {
    const v = computeCyclomatic(csFn(''), 'x ??= 5;');
    expect(v.decisionPoints).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Java decision points
// ---------------------------------------------------------------------------

describe('java', () => {
  const jFn = (body: string) =>
    fn({ name: 'm', filePath: 'A.java', language: 'java', kind: 'method' });

  it('if + for + while + do-while + case + catch + && + || + ? → 1+10', () => {
    const body = `
      if (a) {}
      for (int i = 0; i < 10; i++) {}
      while (b) {}
      do {} while (c);
      switch (s) { case 1: break; }
      try {} catch (Exception e) {}
      var r = (x && y) || z;
      var t = p ? 1 : 2;
    `;
    const v = computeCyclomatic(jFn(''), body);
    // if, for, while, do, while, case, catch, &&, ||, ? = 10
    expect(v.decisionPoints).toBe(10);
    expect(v.value).toBe(11);
  });

  it('instanceof counts +1', () => {
    const v = computeCyclomatic(jFn(''), 'if (x instanceof Foo) {}');
    // if + instanceof
    expect(v.decisionPoints).toBe(2);
  });

  it('abstract signature ending in `);` → E1 exemption', () => {
    const n = fn({
      name: 'm',
      filePath: 'A.java',
      language: 'java',
      kind: 'method',
      signature: 'void m();',
    });
    const v = computeCyclomatic(n, null);
    expect(v.value).toBeNull();
    expect(v.exemption).toBe('abstract-no-body');
  });

  it('`native` signature → E2 exemption', () => {
    const n = fn({
      name: 'm',
      filePath: 'A.java',
      language: 'java',
      kind: 'method',
      signature: 'public native void m();',
    });
    const v = computeCyclomatic(n, 'body ignored');
    expect(v.exemption).toBe('extern-or-ffi');
  });

  it('@Generated → E3 exemption', () => {
    const n = fn({
      name: 'm',
      filePath: 'A.java',
      language: 'java',
      kind: 'method',
      decorators: ['javax.annotation.Generated'],
    });
    const v = computeCyclomatic(n, 'int x = 1;');
    expect(v.exemption).toBe('generated-product');
  });
});

// ---------------------------------------------------------------------------
// PHP decision points
// ---------------------------------------------------------------------------

describe('php', () => {
  const pFn = (body: string) =>
    fn({ name: 'f', filePath: 'a.php', language: 'php', kind: 'function' });

  it('if + elseif + foreach + case + && + ?? → +6', () => {
    const body = `
      if ($a) {}
      elseif ($b) {}
      foreach ($xs as $x) {}
      switch ($s) { case 1: break; }
      $r = $x && $y;
      $u = $q ?? 5;
    `;
    const v = computeCyclomatic(pFn(''), body);
    expect(v.decisionPoints).toBe(6);
    expect(v.value).toBe(7);
  });

  it('vendor/ path → E3 exemption', () => {
    const n = fn({
      name: 'f',
      filePath: 'vendor/monolog/f.php',
      language: 'php',
      kind: 'function',
    });
    const v = computeCyclomatic(n, 'if ($a) {}');
    expect(v.exemption).toBe('generated-product');
  });
});

// ---------------------------------------------------------------------------
// Python decision points
// ---------------------------------------------------------------------------

describe('python', () => {
  const pyFn = (body: string) =>
    fn({
      name: 'f',
      filePath: 'a.py',
      language: 'python',
      kind: 'function',
    });

  it('if + elif + for + while + except + with + assert + and + or → +9', () => {
    const body = `
def f(x):
    if x:
        pass
    elif y:
        pass
    for i in range(10):
        pass
    while z:
        pass
    try:
        pass
    except Exception:
        pass
    with open('f') as fh:
        pass
    assert x
    a = p and q or r
    `;
    const v = computeCyclomatic(pyFn(''), body);
    // if, elif, for, while, except, with, assert, and, or = 9
    expect(v.decisionPoints).toBe(9);
    expect(v.value).toBe(10);
  });

  it('comments (#) and strings are not counted', () => {
    const body = `
def f():
    # if for while
    s = "if for while"
    t = """triple quoted if for while"""
    `;
    const v = computeCyclomatic(pyFn(''), body);
    expect(v.decisionPoints).toBe(0);
  });

  it('stub body (pass only) → E2 exemption', () => {
    const n = pyFn('');
    const v = computeCyclomatic(n, 'def f():\n    pass');
    expect(v.exemption).toBe('extern-or-ffi');
  });

  it('stub body (...) → E2 exemption', () => {
    const n = pyFn('');
    const v = computeCyclomatic(n, 'def f():\n    ...');
    expect(v.exemption).toBe('extern-or-ffi');
  });

  it('@abstractmethod decorator → E1 exemption (with non-stub body)', () => {
    const n = fn({
      name: 'f',
      filePath: 'a.py',
      language: 'python',
      kind: 'method',
      decorators: ['abstractmethod'],
    });
    // Provide a non-stub body so E2 (stub) does not preempt E1.
    const v = computeCyclomatic(n, 'def f(self):\n    return 1');
    expect(v.exemption).toBe('abstract-no-body');
  });
});

// ---------------------------------------------------------------------------
// Rust decision points
// ---------------------------------------------------------------------------

describe('rust', () => {
  const rFn = (body: string) =>
    fn({
      name: 'f',
      filePath: 'a.rs',
      language: 'rust',
      kind: 'function',
    });

  it('if + for + while + loop + && + || + ? → +7', () => {
    const body = `
      fn f() {
        if a {}
        for x in xs {}
        while b {}
        loop {}
        let r = (x && y) || z;
        let v = opt?;
      }
    `;
    const v = computeCyclomatic(rFn(''), body);
    // if, for, while, loop, &&, ||, ? = 7
    expect(v.decisionPoints).toBe(7);
    expect(v.value).toBe(8);
  });

  it('match with 4 arms → +4 (keyword itself = 0)', () => {
    const body = `
      match x {
        1 => {},
        2 => {},
        3 => {},
        _ => {},
      }
    `;
    const v = computeCyclomatic(rFn(''), body);
    expect(v.decisionPoints).toBe(4);
    expect(v.value).toBe(5);
  });

  it('if let / while let count once (the if/while)', () => {
    const body = `
      if let Some(x) = opt {}
      while let Some(y) = iter.next() {}
    `;
    const v = computeCyclomatic(rFn(''), body);
    expect(v.decisionPoints).toBe(2);
  });

  it('trait declaration body (no `{`, ends in `;`) → E1 exemption', () => {
    const n = fn({
      name: 'f',
      filePath: 'a.rs',
      language: 'rust',
      kind: 'method',
      // Extractor strips `fn` and trailing `;` from signature — the
      // rubric cannot key on signature. The body slice is the robust
      // signal: a trait declaration is a single line with no `{` and a
      // trailing `;`.
      signature: '(&self);',
    });
    const v = computeCyclomatic(n, '    fn f(&self);');
    expect(v.exemption).toBe('abstract-no-body');
  });

  it('extern "C" signature → E2 exemption', () => {
    const n = fn({
      name: 'f',
      filePath: 'a.rs',
      language: 'rust',
      kind: 'function',
      signature: 'extern "C" fn f(x: i32) -> i32;',
    });
    const v = computeCyclomatic(n, null);
    expect(v.exemption).toBe('extern-or-ffi');
  });

  it('#[derive(...)] → E3 exemption', () => {
    const n = fn({
      name: 'f',
      filePath: 'a.rs',
      language: 'rust',
      kind: 'function',
      decorators: ['derive(Debug, Clone)'],
    });
    const v = computeCyclomatic(n, 'fn f() { if a {} }');
    expect(v.exemption).toBe('generated-product');
  });

  it('isAbstract=true → E1 exemption regardless of language', () => {
    const n = fn({
      name: 'f',
      filePath: 'a.rs',
      language: 'rust',
      kind: 'method',
      isAbstract: true,
    });
    const v = computeCyclomatic(n, 'fn f() { if a {} }');
    expect(v.exemption).toBe('abstract-no-body');
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting: comment / string hygiene
// ---------------------------------------------------------------------------

describe('tokenizer hygiene', () => {
  it('C# block comment spanning decision tokens', () => {
    const n = fn({
      name: 'M',
      filePath: 'a.cs',
      language: 'csharp',
      kind: 'method',
    });
    const body = `
      /* if for while case catch && || ? ?? */
      int x = 1;
    `;
    const v = computeCyclomatic(n, body);
    expect(v.decisionPoints).toBe(0);
  });

  it('escaped quote inside string does not break tokenization', () => {
    const n = fn({
      name: 'M',
      filePath: 'a.cs',
      language: 'csharp',
      kind: 'method',
    });
    const body = 'var s = "if \\"quoted\\" for";';
    const v = computeCyclomatic(n, body);
    expect(v.decisionPoints).toBe(0);
  });

  it('Python triple-quoted docstring is fully skipped', () => {
    const n = fn({
      name: 'f',
      filePath: 'a.py',
      language: 'python',
      kind: 'function',
    });
    const body = `
def f():
    """
    docstring with if for while and or
    """
    return 1
    `;
    const v = computeCyclomatic(n, body);
    // After skipping docstring, body has no decision tokens.
    // (Stub detection does not fire because `return 1` is real code.)
    expect(v.decisionPoints).toBe(0);
    expect(v.value).toBe(1);
  });
});
