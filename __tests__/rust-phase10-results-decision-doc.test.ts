import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const DOC = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-10-results-and-decision.md',
);

describe('Phase 10 VS-1 results and decision', () => {
  it('records corrected-target evidence without changing Rust rollout status', () => {
    const text = fs.readFileSync(DOC, 'utf-8');

    expect(text).toContain('bounded success with commit drift');
    expect(text).toContain('275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0');
    expect(text).toContain('4ac5322601c6985aba4cd9349c23f4ef22dc3e65');
    expect(text).toContain('sufficiencySmokeAllowed');
    expect(text).toContain('Flow connected: `true`');
    expect(text).toContain('Primary classification: `ambiguous-symbol`');
    expect(text).toContain('status`: `unavailable`');
    expect(text).toContain('does not change Rust matcher opt-in status');
    expect(text).toContain('does not establish default rollout readiness');
    expect(text).toContain('should be closed or replaced with narrower wording');
  });
});
