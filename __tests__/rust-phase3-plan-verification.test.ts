import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PLAN = path.resolve(
  __dirname,
  '..',
  'docs',
  'plans',
  '2026-06-13-rust-indexing-core-phase-3-production-hardening.md',
);

describe('Rust indexing Phase 3 plan verification', () => {
  it('records #76 implementation verification and #77 real-corpus completion', () => {
    const text = fs.readFileSync(PLAN, 'utf-8');

    expect(text).toContain('Phase 3 verification status');
    expect(text).toContain('[#76]');
    expect(text).toContain('[#77]');
    expect(text).toContain('Implementation gates: pass');
    expect(text).toContain('Real three-repo validation completed');
    expect(text).toContain('ZCodeGraph `d77fce6`');
    expect(text).toContain('Excalidraw `a83ac488`');
    expect(text).toContain('Zustand `566b5bf`');
    expect(text).toContain('/tmp/zcodegraph-rust-phase3-real/');
    expect(text).toContain('cargo test --package zcodegraph-core');
    expect(text).toContain('__tests__/rust-index-engine-cli.test.ts __tests__/rust-parity.test.ts');
    expect(text).not.toContain('Zustand checkout was not available');
  });
});
