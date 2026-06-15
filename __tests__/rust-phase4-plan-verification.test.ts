import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PLAN = path.resolve(
  __dirname,
  '..',
  'docs',
  'plans',
  '2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md',
);

describe('Rust indexing Phase 4 plan verification', () => {
  it('records default-rollout readiness gates without changing the default engine', () => {
    const text = fs.readFileSync(PLAN, 'utf-8');

    expect(text).toContain('Phase 4 aims to collect the missing rollout-readiness evidence');
    expect(text).toContain('Rust remains opt-in throughout Phase 4');
    expect(text).toContain('Target decision branch A');
    expect(text).toContain('Require one bounded, data-driven optimization trial');
    expect(text).toContain('Require matching tests and benchmark/profile evidence');
    expect(text).toContain('Rust end-to-end wall-clock indexing is no more than 25% slower');
    expect(text).toContain('VS Code or the documented same-class large target');
    expect(text).toContain('valid peak-RSS data');
    expect(text).toContain('RSS unavailable reasons');
    expect(text).toContain('positive');
    expect(text).toContain('neutral but informative');
    expect(text).toContain('negative');
    expect(text).toContain('default TypeScript safety');
    expect(text).toContain('Release-cycle evidence remains outside the Phase 4 completion gate');
    expect(text).not.toContain('Make Rust the default index engine');
  });
});
