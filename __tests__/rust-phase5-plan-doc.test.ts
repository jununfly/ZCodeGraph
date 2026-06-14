import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const PLAN = path.join(
  REPO_ROOT,
  'docs',
  'plans',
  '2026-06-14-rust-indexing-core-phase-5-reference-resolution-bottleneck-burndown.md',
);

describe('Rust indexing Phase 5 plan document', () => {
  it('records targeted blocker reduction without claiming default rollout readiness', () => {
    const plan = fs.readFileSync(PLAN, 'utf-8');

    expect(plan).toContain('Phase 5 is a targeted blocker-reduction phase');
    expect(plan).toContain('Rust remains opt-in');
    expect(plan).toContain('[#95](https://github.com/jununfly/ZCodeGraph/issues/95)');
    expect(plan).toContain('[#94](https://github.com/jununfly/ZCodeGraph/issues/94)');
    expect(plan).toContain('Do not make Rust the default index engine');
    expect(plan).toContain('validated on a large VS Code JS/TS sparse checkout');
    expect(plan).toContain('shared candidate lookup');
    expect(plan).toContain('per-reference disambiguation');
    expect(plan).toContain('rowid');
    expect(plan).toContain('## Issue Sequence');
    expect(plan).toContain('### 1. Phase 5 Plan And Doc Guardrails');
    expect(plan).toContain('### 2. Reference-Resolution Profile Sub-Buckets');
    expect(plan).toContain('### 3. Grouped Name Matching And Rowid Cleanup');
    expect(plan).toContain('### 4. Optional Bounded Second Candidate');
    expect(plan).toContain('### 5. Phase 5 Results And Decision');
    expect(plan).toContain('resolved');
    expect(plan).toContain('reduced but still blocking');
    expect(plan).toContain('still unresolved');
    expect(plan).toContain('regressed');
    expect(plan).not.toContain('default rollout is ready');
    expect(plan).not.toContain('Rust is ready to become the default');
  });
});
