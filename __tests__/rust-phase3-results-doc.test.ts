import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DOC = path.resolve(
  __dirname,
  '..',
  'docs',
  'benchmarks',
  '2026-06-13-rust-indexing-core-phase-3-results.md',
);

describe('Rust indexing Phase 3 results document', () => {
  it('records profiling evidence, optimization conclusion, and rollout readiness gates', () => {
    const text = fs.readFileSync(DOC, 'utf-8');

    expect(text).toContain('../plans/2026-06-13-rust-indexing-core-phase-3-production-hardening.md');
    expect(text).toContain('rust-index-profile.mjs');
    expect(text).toContain('rust-package-smoke.mjs');
    expect(text).toContain('scripts/pack-npm.sh');
    for (const repo of ['ZCodeGraph', 'Excalidraw', 'Zustand']) {
      expect(text).toContain(repo);
    }
    for (const phase of [
      'frameworkPostExtractMs',
      'referenceResolutionMs',
      'dynamicDispatchSynthesisMs',
      'dbMaintenanceMs',
    ]) {
      expect(text).toContain(phase);
    }
    expect(text).toContain('Low-risk optimization conclusion');
    expect(text).toContain('Local bundle and packed npm smoke');
    expect(text).toContain('Default-rollout readiness checklist');
    expect(text).toContain('Rust remains opt-in');
    expect(text).toContain('Rust is not required to be faster than TypeScript in Phase 3');
  });
});
