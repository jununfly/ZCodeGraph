/**
 * Slice 4.1: UTF-8 byte budget — unit tests.
 */

import { describe, expect, it } from 'vitest';
import {
  computeApplicationBodyAllowance,
  freezeTransportNotice,
  isCapBelowProtocolMinimum,
  utf8ByteLength,
  verifyComposedCap,
  type Utf8Budget,
} from '../src/explore/budget-utf8';

describe('Slice 4.1 — utf8ByteLength', () => {
  it('counts ASCII as 1 byte per char', () => {
    expect(utf8ByteLength('hello')).toBe(5);
  });

  it('counts multi-byte characters by UTF-8 bytes, NOT UTF-16 length', () => {
    // '中' is 1 UTF-16 code unit but 3 UTF-8 bytes.
    expect('中'.length).toBe(1);
    expect(utf8ByteLength('中')).toBe(3);
  });

  it('handles emoji (surrogate pair) correctly', () => {
    // Emoji is 2 UTF-16 code units but 4 UTF-8 bytes.
    expect('🚀'.length).toBe(2);
    expect(utf8ByteLength('🚀')).toBe(4);
  });
});

describe('Slice 4.1 — computeApplicationBodyAllowance', () => {
  it('subtracts reservation and newline from the cap', () => {
    const budget: Utf8Budget = {
      maxOutputUtf8Bytes: 1000,
      transportReservation: { utf8Bytes: 100 },
      optionalCliNewlineBytes: 1,
      minimumErrorUtf8Bytes: 50,
    };
    expect(computeApplicationBodyAllowance(budget)).toBe(899);
  });

  it('returns 0 when reservation exceeds cap (never negative)', () => {
    const budget: Utf8Budget = {
      maxOutputUtf8Bytes: 100,
      transportReservation: { utf8Bytes: 200 },
      optionalCliNewlineBytes: 1,
      minimumErrorUtf8Bytes: 50,
    };
    expect(computeApplicationBodyAllowance(budget)).toBe(0);
  });
});

describe('Slice 4.1 — verifyComposedCap', () => {
  const budget: Utf8Budget = {
    maxOutputUtf8Bytes: 1000,
    transportReservation: { utf8Bytes: 100 },
    optionalCliNewlineBytes: 1,
    minimumErrorUtf8Bytes: 50,
  };

  it('accepts a composed answer within the cap', () => {
    expect(verifyComposedCap(budget, 50, 800)).toBe(true);
  });

  it('rejects when notice exceeds reservation', () => {
    expect(verifyComposedCap(budget, 150, 800)).toBe(false);
  });

  it('rejects when total exceeds cap', () => {
    expect(verifyComposedCap(budget, 100, 1000)).toBe(false);
  });
});

describe('Slice 4.1 — freezeTransportNotice', () => {
  it('sums line bytes and separators', () => {
    const res = freezeTransportNotice({
      noticeLines: ['hello', 'world'],
      separatorBytes: 1,
      cliNewlineBytes: 1,
    });
    expect(res.utf8Bytes).toBe(5 + 5 + 1);
  });

  it('is a stable upper bound', () => {
    const res = freezeTransportNotice({
      noticeLines: ['注意'],
      separatorBytes: 0,
      cliNewlineBytes: 0,
    });
    expect(res.utf8Bytes).toBe(6); // '注意' = 6 UTF-8 bytes
  });
});

describe('Slice 4.1 — isCapBelowProtocolMinimum', () => {
  it('flags cap below the protocol minimum', () => {
    const budget: Utf8Budget = {
      maxOutputUtf8Bytes: 100,
      transportReservation: { utf8Bytes: 30 },
      optionalCliNewlineBytes: 1,
      minimumErrorUtf8Bytes: 112,
    };
    expect(isCapBelowProtocolMinimum(budget)).toBe(true);
  });

  it('accepts cap at or above the minimum', () => {
    const budget: Utf8Budget = {
      maxOutputUtf8Bytes: 200,
      transportReservation: { utf8Bytes: 30 },
      optionalCliNewlineBytes: 1,
      minimumErrorUtf8Bytes: 80,
    };
    expect(isCapBelowProtocolMinimum(budget)).toBe(false);
  });
});
