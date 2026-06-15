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
const ISSUE_94_RESULTS = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-5-issue94-grouped-name-rowid-cleanup.md',
);
const PHASE_5_DECISION = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-5-results-and-decision.md',
);

describe('Rust indexing Phase 5 plan document', () => {
  it('records targeted blocker reduction without claiming default rollout readiness', () => {
    const plan = fs.readFileSync(PLAN, 'utf-8');

    expect(plan).toContain('Phase 5 is a targeted blocker-reduction phase');
    expect(plan).toContain('Rust remains opt-in');
    expect(plan).toContain('[#95](https://github.com/jununfly/ZCodeGraph/issues/95)');
    expect(plan).toContain('[#96](https://github.com/jununfly/ZCodeGraph/issues/96)');
    expect(plan).toContain('[#94](https://github.com/jununfly/ZCodeGraph/issues/94)');
    expect(plan).toContain('Do not make Rust the default index engine');
    expect(plan).toContain('validated on a large VS Code JS/TS sparse checkout');
    expect(plan).toContain('shared candidate lookup');
    expect(plan).toContain('per-reference disambiguation');
    expect(plan).toContain('candidateLookupMs');
    expect(plan).toContain('candidateLookupCacheHitMs');
    expect(plan).toContain('perReferenceDisambiguationMs');
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

  it('records issue 94 as unresolved on the large target without default rollout claims', () => {
    const plan = fs.readFileSync(PLAN, 'utf-8');
    const results = fs.readFileSync(ISSUE_94_RESULTS, 'utf-8');

    expect(plan).toContain('Grouped name matching and rowid cleanup | Completed');
    expect(plan).toContain('Optional bounded second candidate | Skipped');
    expect(results).toContain('Status: `still unresolved`');
    expect(results).toContain('validated on a large VS Code JS/TS sparse checkout');
    expect(results).toContain('reference resolution as the dominant finalization blocker');
    expect(results).toContain('did not meet the 15% target-sub-bucket reduction bar');
    expect(results).not.toContain('default rollout is ready');
    expect(results).not.toContain('Rust is ready to become the default');
  });

  it('records the final Phase 5 stop/continue decision', () => {
    const plan = fs.readFileSync(PLAN, 'utf-8');
    const decision = fs.readFileSync(PHASE_5_DECISION, 'utf-8');

    expect(plan).toContain('Phase 5 results and decision | Completed');
    expect(decision).toContain('Classification: `still unresolved`');
    expect(decision).toContain('Branch A/default rollout remains blocked');
    expect(decision).toContain('Rust remains opt-in');
    expect(decision).toContain('validated on a large VS Code JS/TS sparse checkout');
    expect(decision).toContain('docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-vscode-profile.raw.json');
    expect(decision).toContain('docs/benchmarks/2026-06-14-rust-indexing-core-phase-5-issue94-vscode-sufficiency.raw.json');
    expect(decision).toContain('name matching policy and per-reference disambiguation cost');
    expect(decision).not.toContain('default rollout is ready');
    expect(decision).not.toContain('Rust is ready to become the default');
  });
});
