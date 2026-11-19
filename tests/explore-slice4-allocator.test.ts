/**
 * Slice 4.2 / 4.3: Global allocator + degradation ladder — unit tests.
 */

import { describe, expect, it } from 'vitest';
import {
  globalAllocateAtoms,
  mergeOverlappingAtoms,
  rematerializeAtoms,
  type SourceAtom,
} from '../src/explore/allocator';
import {
  degradationLadder,
  formatLocation,
  isOversizedAtom,
  sliceAtCodepointBoundary,
} from '../src/explore/degradation';
import { utf8ByteLength } from '../src/explore/budget-utf8';

function atom(partial: Partial<SourceAtom> & Pick<SourceAtom, 'id' | 'filePath' | 'text'>): SourceAtom {
  return {
    requirementIds: [],
    range: { filePath: partial.filePath, startLine: 1, endLine: 5 },
    role: 'definition',
    required: true,
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// mergeOverlappingAtoms
// ---------------------------------------------------------------------------

describe('Slice 4.2 — mergeOverlappingAtoms', () => {
  it('merges overlapping ranges and rematerializes them from one verified source', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'one\ntwo\nthree', range: { filePath: 'f.ts', startLine: 1, endLine: 3 } });
    const b = atom({ id: 'b', filePath: 'f.ts', text: 'three\nfour', range: { filePath: 'f.ts', startLine: 3, endLine: 4 } });
    const merged = mergeOverlappingAtoms([a, b]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.range).toEqual({ filePath: 'f.ts', startLine: 1, endLine: 4 });
    expect(merged[0]?.text).toBe('one\ntwo\nthree\nfour');
    const rematerialized = rematerializeAtoms([a, b], {
      readRange: (range) => ['one', 'two', 'three', 'four', 'five']
        .slice(range.startLine - 1, range.endLine).join('\n'),
    });
    expect(rematerialized[0]?.text).toBe('one\ntwo\nthree\nfour');
    expect(rematerialized[0]?.sourceAtomIds).toEqual(['a', 'b']);
    const allocated = globalAllocateAtoms(rematerialized, {
      bodyAllowance: 4096,
    });
    expect(allocated.dispositions[0]?.kind).toBe('returned');
    expect(allocated.entries.map((entry) => entry.text).join('')).toContain('one\ntwo\nthree\nfour');
    expect(allocated.dispositions.map((disposition) => disposition.atomId).sort()).toEqual(['a', 'b']);
  });

  it('does not pull an unselected line between adjacent atoms', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'one', range: { filePath: 'f.ts', startLine: 1, endLine: 1 } });
    const b = atom({ id: 'b', filePath: 'f.ts', text: 'three', range: { filePath: 'f.ts', startLine: 2, endLine: 2 } });
    expect(mergeOverlappingAtoms([a, b])).toHaveLength(2);
  });

  it('does NOT merge atoms in different files', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'aaa', range: { filePath: 'f.ts', startLine: 1, endLine: 5 } });
    const b = atom({ id: 'b', filePath: 'g.ts', text: 'bbb', range: { filePath: 'g.ts', startLine: 1, endLine: 5 } });
    const merged = mergeOverlappingAtoms([a, b]);
    expect(merged).toHaveLength(2);
  });

  it('does NOT merge non-overlapping atoms in the same file', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'aaa', range: { filePath: 'f.ts', startLine: 1, endLine: 5 } });
    const b = atom({ id: 'b', filePath: 'f.ts', text: 'bbb', range: { filePath: 'f.ts', startLine: 20, endLine: 25 } });
    const merged = mergeOverlappingAtoms([a, b]);
    expect(merged).toHaveLength(2);
  });

  it('unions requirementIds on merge', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'a1\na2\na3\na4\na5', requirementIds: ['r1'], range: { filePath: 'f.ts', startLine: 1, endLine: 5 } });
    const b = atom({ id: 'b', filePath: 'f.ts', text: 'a5\nb6\nb7\nb8\nb9\nb10', requirementIds: ['r2'], range: { filePath: 'f.ts', startLine: 5, endLine: 10 } });
    const merged = mergeOverlappingAtoms([a, b]);
    expect(merged[0].requirementIds.sort()).toEqual(['r1', 'r2']);
  });

  it('selects the strongest role deterministically and drops an enlarged-range signature', () => {
    const supporting = atom({
      id: 'shared', filePath: 'f.ts', text: 'two\nthree\nfour\nfive', role: 'supporting', required: false,
      signature: 'old partial signature', requirementIds: ['support'],
      range: { filePath: 'f.ts', startLine: 2, endLine: 5 },
    });
    const invocation = atom({
      id: 'shared', filePath: 'f.ts', text: 'one\ntwo\nthree', role: 'invocation-site', required: true,
      signature: 'old partial signature', requirementIds: ['invoke'],
      range: { filePath: 'f.ts', startLine: 1, endLine: 3 },
    });
    const forward = mergeOverlappingAtoms([supporting, invocation]);
    const reversed = mergeOverlappingAtoms([invocation, supporting]);
    expect(forward).toEqual(reversed);
    expect(forward[0]).toMatchObject({
      role: 'invocation-site', required: true, signature: undefined,
      requirementIds: ['invoke', 'support'],
    });
  });
});

// ---------------------------------------------------------------------------
// globalAllocateAtoms
// ---------------------------------------------------------------------------

describe('Slice 4.2 — globalAllocateAtoms', () => {
  it('charges only bytes present in the rendered output, not phantom overhead', () => {
    const source = atom({ id: 'a', filePath: 'f.ts', text: 'hello' });
    const result = globalAllocateAtoms([source], {
      bodyAllowance: utf8ByteLength('hello\n[gap:a:budget-exhausted]\n'),
    });
    expect(result.dispositions[0]).toEqual({
      kind: 'returned', atomId: 'a', bytes: utf8ByteLength('hello\n'),
    });
    expect(result.entries.map((entry) => entry.text).join('')).toBe('hello\n');
    expect(result.totalBytes).toBe(utf8ByteLength('hello\n'));
  });

  it('returns full atoms when budget allows', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'hello' });
    const result = globalAllocateAtoms([a], {
      bodyAllowance: 1000,
    });
    expect(result.dispositions[0].kind).toBe('returned');
    expect(result.omittedAtomIds).toHaveLength(0);
  });

  it('degrades to signature when full does not fit', () => {
    const a = atom({
      id: 'a', filePath: 'f.ts',
      text: 'this is a long atom body that does not fit',
      signature: 'fn foo()',
    });
    const result = globalAllocateAtoms([a], {
      bodyAllowance: utf8ByteLength('[gap:a:budget-exhausted]\n'),
    });
    expect(result.dispositions[0].kind).toBe('degraded');
    if (result.dispositions[0].kind === 'degraded') {
      expect(result.dispositions[0].degradedTo).toBe('signature');
    }
  });

  it('keeps location degradation available after an ordinary overlap merge', () => {
    const a = atom({
      id: 'a', filePath: 'f.ts',
      text: ['first source line is deliberately long', 'second source line is deliberately long', 'shared source line is deliberately long'].join('\n'),
      signature: undefined, range: { filePath: 'f.ts', startLine: 1, endLine: 3 },
    });
    const b = atom({
      id: 'b', filePath: 'f.ts',
      text: ['shared source line is deliberately long', 'last source line is deliberately long'].join('\n'),
      signature: undefined,
      range: { filePath: 'f.ts', startLine: 3, endLine: 4 },
    });
    const merged = mergeOverlappingAtoms([a, b]);
    expect(merged[0]?.maximumTier).toBeUndefined();
    const text = `${merged[0]?.overhead}f.ts:1-4\n[gap:a:budget-exhausted]\n`;
    const result = globalAllocateAtoms(merged, {
      bodyAllowance: utf8ByteLength(text),
    });
    expect(result.entries[0]?.text).toBe(text);
    expect(result.entries[0]?.disposition).toEqual({
      kind: 'degraded', atomId: 'a', degradedTo: 'location', bytes: utf8ByteLength(`${merged[0]?.overhead}f.ts:1-4\n`),
    });
    expect(result.dispositions).toHaveLength(2);
    expect(result.dispositions.every((d) => d.kind === 'degraded')).toBe(true);
  });

  it('degrades to location when signature also does not fit', () => {
    const a = atom({
      id: 'a', filePath: 'f.ts',
      text: 'this is a long atom body that does not fit at all',
      signature: 'fn foo() with a very long signature that also overflows',
    });
    const result = globalAllocateAtoms([a], {
      bodyAllowance: utf8ByteLength('f.ts:1-5\n[gap:a:budget-exhausted]\n'),
    });
    expect(result.dispositions[0].kind).toBe('degraded');
    if (result.dispositions[0].kind === 'degraded') {
      expect(result.dispositions[0].degradedTo).toBe('location');
    }
  });

  it('omits atom and reserves omission-notice bytes when nothing fits', () => {
    const a = atom({
      id: 'a', filePath: 'f.ts',
      text: 'x'.repeat(100),
      signature: 'y'.repeat(80),
    });
    const result = globalAllocateAtoms([a], {
      bodyAllowance: utf8ByteLength('[gap:a:budget-exhausted]\n'),
    });
    expect(result.dispositions[0].kind).toBe('omitted');
    expect(result.omittedAtomIds).toContain('a');
  });

  it('required atoms allocate before alternatives before supporting', () => {
    // Use distinct files and ranges so mergeOverlappingAtoms does NOT merge them.
    const required = atom({
      id: 'r', filePath: 'r.ts', text: 'req', required: true, isAlternative: false,
      range: { filePath: 'r.ts', startLine: 1, endLine: 3 },
    });
    const alternative = atom({
      id: 'a', filePath: 'a.ts', text: 'alt', required: false, isAlternative: true,
      range: { filePath: 'a.ts', startLine: 1, endLine: 3 },
    });
    const supporting = atom({
      id: 's', filePath: 's.ts', text: 'sup', required: false, isAlternative: false,
      range: { filePath: 's.ts', startLine: 1, endLine: 3 },
    });
    // Reserve both complete gaps first; only then promote required source.
    const bodyAllowance = utf8ByteLength([
      'req\n',
      '[gap:r:budget-exhausted]\n',
      '[gap:a:budget-exhausted]\n',
      '[gap:s:budget-exhausted]\n',
    ].join(''));
    const result = globalAllocateAtoms([supporting, alternative, required], {
      bodyAllowance,
    });
    const req = result.dispositions.find((d) => d.atomId === 'r');
    expect(req?.kind).toBe('returned');
  });

  it('pays a frozen skeleton before promoting any source atom', () => {
    const skeleton = 'trace=caller→target\n';
    const source = atom({
      id: 'a', filePath: 'a.ts',
      text: 'target body that is deliberately longer than the complete signature',
      signature: 'fn target()',
      overhead: '#### a.ts:1-5\n',
    });
    const gap = '[gap:a:budget-exhausted]\n';
    const signature = '#### a.ts:1-5\nfn target()\na.ts:1-5\n';
    const minimumGap = `${source.overhead ?? ''}${gap}`;
    const signaturePromotion = Math.max(0, utf8ByteLength(signature) - utf8ByteLength(minimumGap));
    const result = globalAllocateAtoms([source], {
      bodyAllowance: utf8ByteLength(skeleton + minimumGap) + signaturePromotion,
      skeleton,
    });
    expect(result.totalBytes).toBe(utf8ByteLength(skeleton + signature));
    expect(result.entries[0]?.disposition.kind).toBe('degraded');
    expect(() => globalAllocateAtoms([source], {
      bodyAllowance: utf8ByteLength(skeleton) - 1,
      skeleton,
    })).toThrow('budget-exhausted');
  });
});

// ---------------------------------------------------------------------------
// degradationLadder
// ---------------------------------------------------------------------------

describe('Slice 4.3 — degradationLadder', () => {
  it('returns full when it fits', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'hi' });
    const r = degradationLadder(a, 100);
    expect(r?.tier).toBe('full');
  });

  it('returns signature when full does not fit but signature does', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'a much longer complete method body', signature: 'fn f()' });
    const r = degradationLadder(a, utf8ByteLength('fn f()\nf.ts:1-5\n'));
    expect(r?.tier).toBe('signature');
  });

  it('returns location when signature also overflows', () => {
    const a = atom({
      id: 'a', filePath: 'f.ts',
      text: 'long body here', signature: 'a very long signature that will not fit',
    });
    const r = degradationLadder(a, 12);
    expect(r?.tier).toBe('location');
    expect(r?.text).toBe(formatLocation(a));
  });

  it('returns null when even location does not fit', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'hi' });
    const r = degradationLadder(a, 1);
    expect(r).toBeNull();
  });
});

describe('Slice 4.3 — isOversizedAtom', () => {
  it('detects an atom whose full form exceeds the entire allowance', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'x'.repeat(1000) });
    expect(isOversizedAtom(a, 5)).toBe(true);
  });

  it('is NOT oversized when full fits', () => {
    const a = atom({ id: 'a', filePath: 'f.ts', text: 'hi' });
    expect(isOversizedAtom(a, 100)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unicode safety
// ---------------------------------------------------------------------------

describe('Slice 4.3 — sliceAtCodepointBoundary', () => {
  it('never splits a multi-byte codepoint', () => {
    const text = 'a中b'; // a=1, 中=3, b=1 → 5 bytes
    expect(utf8ByteLength(text)).toBe(5);
    // Cap at 2 bytes: should back off to 'a' (1 byte) since 中 starts at byte 1.
    const sliced = sliceAtCodepointBoundary(text, 2);
    expect(utf8ByteLength(sliced)).toBeLessThanOrEqual(2);
    expect(sliced).toBe('a');
  });

  it('returns the original string when under the cap', () => {
    const text = '中文';
    expect(sliceAtCodepointBoundary(text, 100)).toBe(text);
  });
});
