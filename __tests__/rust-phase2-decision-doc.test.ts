import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DOC = path.resolve(
  __dirname,
  '..',
  'docs',
  'benchmarks',
  '2026-06-13-rust-indexing-core-phase-2-decision.md',
);

describe('Rust indexing Phase 2 decision document', () => {
  it('records the release-readiness decision and blockers for issue 69', () => {
    const text = fs.readFileSync(DOC, 'utf-8');

    expect(text).toContain('../plans/2026-06-13-rust-indexing-core-phase-2-packaging-ci-performance.md');
    expect(text).toContain('../benchmarks/2026-06-13-rust-indexing-core-phase-2-results.md');
    expect(text).toContain('#69');
    for (const target of ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'win32-x64', 'win32-arm64']) {
      expect(text).toContain(target);
    }
    expect(text).toContain('npm/npx');
    expect(text).toContain('default TypeScript');
    expect(text).toContain('CI coverage');
    expect(text).toContain('benchmark');
    expect(text).toContain('profile');
    expect(text).toContain('Agent Sufficiency');
    expect(text).toContain('Prepare a default-rollout plan: no');
    expect(text).toContain('Keep Rust opt-in');
  });
});
