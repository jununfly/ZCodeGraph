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

describe('Rust indexing Phase 4 execution status document', () => {
  it('shows which planned work completed, blocked Branch A, or stayed outside the gate', () => {
    const plan = fs.readFileSync(PLAN, 'utf-8');

    expect(plan).toContain('## Phase 4 Execution Status');
    expect(plan).toContain('| Plan item | Status | Evidence |');
    expect(plan).toContain('Completed');
    expect(plan).toContain('Branch A blocker');
    expect(plan).toContain('Deferred / not a Phase 4 gate');
    expect(plan).toContain(
      '[Profile baseline](../benchmarks/2026-06-13-rust-indexing-core-phase-4-profile-baseline.md)',
    );
    expect(plan).toContain(
      '[Optimization trial](../benchmarks/2026-06-13-rust-indexing-core-phase-4-optimization-trial.md)',
    );
    expect(plan).toContain(
      '[Large-target readiness](../benchmarks/2026-06-13-rust-indexing-core-phase-4-large-target-readiness.md)',
    );
    expect(plan).toContain('[#87](https://github.com/jununfly/ZCodeGraph/issues/87)');
    expect(plan).toContain('[#91](https://github.com/jununfly/ZCodeGraph/issues/91)');
    expect(plan).toContain(
      '[Phase 4 results and decision](../benchmarks/2026-06-13-rust-indexing-core-phase-4-results-and-decision.md)',
    );
    expect(plan).toContain('Rust remains opt-in');
    expect(plan).toContain('Branch A/default-rollout gates did not pass');
    expect(plan).not.toContain('Branch A passed');
    expect(plan).not.toContain('default rollout is ready');
  });
});
