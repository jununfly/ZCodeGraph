import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PLAN = path.resolve(
  __dirname,
  '..',
  'docs',
  'plans',
  '2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md',
);

describe('Rust indexing Phase 2 plan completion', () => {
  it('records tracking issue 70 as complete with all child issues closed out', () => {
    const text = fs.readFileSync(PLAN, 'utf-8');

    expect(text).toContain('Phase 2 status: complete');
    expect(text).toContain('Phase 2 results: [Rust Indexing Core Phase 2 Results]');
    expect(text).toContain('Phase 2 decision: [Rust Indexing Core Phase 2 Stop/Continue Decision]');
    expect(text).toContain('[x] [#70]');
    for (const issue of ['#60', '#61', '#62', '#63', '#64', '#65', '#66', '#67', '#68', '#69']) {
      expect(text).toContain(`[x] [${issue}]`);
    }
    expect(text).not.toContain('Bundle and npm smoke validation should be added during Phase 2');
    expect(text).not.toContain('default rollout blocked pending #69');
  });
});
