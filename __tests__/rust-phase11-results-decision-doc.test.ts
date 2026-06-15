import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const DOC = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-15-rust-indexing-core-phase-11-results-and-decision.md',
);

describe('Phase 11 sufficiency smoke results and decision', () => {
  it('records harness success without claiming rollout readiness', () => {
    const text = fs.readFileSync(DOC, 'utf-8');

    expect(text).toContain('bounded harness success, sufficiency comparison unavailable');
    expect(text).toContain('unsupported-runtime');
    expect(text).toContain('4ac5322601c6985aba4cd9349c23f4ef22dc3e65');
    expect(text).toContain('commitMatchesExpected');
    expect(text).toContain('--repo-pair name:typescript');
    expect(text).toContain('copy stage: `completed`');
    expect(text).toContain('TypeScript index stage: `unavailable`');
    expect(text).toContain('does not change Rust matcher opt-in status');
    expect(text).toContain('does not establish default rollout readiness');
    expect(text).toContain('Do not start resolver, matcher, Explore planner, or Rust extraction changes');
  });
});
