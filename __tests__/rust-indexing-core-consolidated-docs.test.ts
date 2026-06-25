import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const PLAN = path.join(
  REPO_ROOT,
  'docs/plans/2026-06-24-rust-indexing-core-consolidated-plans.md',
);
const BENCHMARK = path.join(
  REPO_ROOT,
  'docs/benchmarks/2026-06-24-rust-indexing-core-consolidated-benchmarks.md',
);
const DESIGN = path.join(
  REPO_ROOT,
  'docs/designs/2026-06-14-rust-end-to-end-graph-pipeline-feasibility.md',
);

describe('Rust indexing core consolidated documentation', () => {
  it('keeps the durable plan history after process-file consolidation', () => {
    expect(fs.existsSync(PLAN)).toBe(true);
    const plan = fs.readFileSync(PLAN, 'utf-8');

    for (const requiredTerm of [
      'Rust Indexing Core Consolidated Plans',
      'phase-2-packaging-ci-performance',
      'Phase 3 verification status',
      'Phase 4 Execution Status',
      'Phase 5 is a targeted blocker-reduction phase',
      'Phase 6 is a JS/TS Rust indexing completeness phase',
      'guarded Rust-assisted name matcher prototype',
      'Matcher Viability Hardening',
      'default rollout',
      'Branch A',
    ]) {
      expect(plan).toContain(requiredTerm);
    }
  });

  it('keeps the durable benchmark and decision history after raw artifact cleanup', () => {
    expect(fs.existsSync(BENCHMARK)).toBe(true);
    const benchmark = fs.readFileSync(BENCHMARK, 'utf-8');

    for (const requiredTerm of [
      'Rust Indexing Core Consolidated Benchmarks',
      'rollout',
      'rollout readiness',
      'reference-resolution investigation',
      'syntax-gap resolution',
      'supported-runtime blocker advanced to TypeScript indexing timeout',
      'phase-5-issue94-grouped-name-rowid-cleanup',
      'phase-7-results-and-decision',
      'phase-8-results-and-decision',
      'bounded success',
    ]) {
      expect(benchmark).toContain(requiredTerm);
    }
  });

  it('keeps the end-to-end pipeline feasibility decision in the designs directory', () => {
    expect(fs.existsSync(DESIGN)).toBe(true);
    const decision = fs.readFileSync(DESIGN, 'utf-8');

    expect(decision).toContain('Decision: `prototype-first`');
    expect(decision).toContain('Rust End-To-End Graph Pipeline');
  });
});
