import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DOC = path.resolve(
  __dirname,
  '..',
  'docs',
  'benchmarks',
  '2026-06-13-rust-indexing-core-phase-2-results.md',
);

describe('Rust indexing Phase 2 results document', () => {
  it('records the benchmark, profile, sufficiency, and rollout conclusion for both target repos', () => {
    const text = fs.readFileSync(DOC, 'utf-8');

    expect(text).toContain('../plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md');
    expect(text).toContain('#68');
    expect(text).toContain('ZCodeGraph');
    expect(text).toContain('Excalidraw');
    expect(text).toContain('rust-index-benchmark.mjs');
    expect(text).toContain('rust-index-profile.mjs');
    expect(text).toContain('rust-sufficiency-guardrail.mjs');
    expect(text).toContain('<100% slower stretch goal');
    expect(text).toContain('Default rollout remains blocked');
  });
});
