import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const PLAN = path.join(
  REPO_ROOT,
  'docs',
  'plans',
  '2026-06-13-rust-indexing-core-phase-4-default-rollout-readiness.md',
);
const DECISION = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-13-rust-indexing-core-phase-4-results-and-decision.md',
);

describe('Rust indexing Phase 4 completion versus Branch A gates', () => {
  it('separates decision completion from default-rollout gate success', () => {
    const plan = fs.readFileSync(PLAN, 'utf-8');
    const decision = fs.readFileSync(DECISION, 'utf-8');

    expect(plan).toContain('Phase 4 decision-producing work is complete');
    expect(plan).toContain('Branch A/default-rollout gates did not pass');
    expect(plan).toContain('Branch A is blocked');
    expect(plan).toContain('Rust remains opt-in');
    expect(plan).not.toContain('Phase 4 is complete only when all hard gates pass');

    expect(decision).toContain('Phase 4 decision-producing evidence is complete');
    expect(decision).toContain('Branch A/default-rollout gates did not pass');
    expect(decision).toContain('Branch A is blocked');
    expect(decision).toContain('Rust remains opt-in');
    expect(decision).not.toContain('default rollout is ready');
    expect(decision).not.toContain('Rust is ready to become the default');
  });
});
