import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const PLAN = path.join(
  REPO_ROOT,
  'docs',
  'plans',
  '2026-06-14-rust-indexing-core-phase-6-js-ts-completeness.md',
);
const FEASIBILITY_DECISION = path.join(
  REPO_ROOT,
  'docs',
  'design',
  '2026-06-14-rust-end-to-end-graph-pipeline-feasibility.md',
);

describe('Rust indexing Phase 6 plan document', () => {
  it('records JS/TS Rust indexing completeness without default rollout or end-to-end migration claims', () => {
    const plan = fs.readFileSync(PLAN, 'utf-8');

    expect(plan).toContain('Phase 6 is a JS/TS Rust indexing completeness phase');
    expect(plan).toContain('Rust remains opt-in');
    expect(plan).toContain('Do not make Rust the default index engine');
    expect(plan).toContain('Do not migrate ReferenceResolver');
    expect(plan).toContain('Do not expand Rust language coverage beyond JavaScript, TypeScript, JSX, and TSX');
    expect(plan).toContain('Completeness + minimum performance floor');
    expect(plan).toContain('validated on a large VS Code JS/TS sparse checkout');
    expect(plan).toContain('Rust end-to-end graph pipeline feasibility decision');
    expect(plan).toContain('ready for end-to-end prototype');
    expect(plan).toContain('continue Rust indexing completeness');
    expect(plan).toContain('stop Rust expansion');
    expect(plan).toContain('regressed');
    expect(plan).toContain('### 1. Phase 6 Plan And Doc Guardrails');
    expect(plan).toContain('### 2. Extraction Semantic Coverage: Symbols And References');
    expect(plan).toContain('### 3. Extraction Semantic Coverage: Edges And Components');
    expect(plan).toContain('### 4. Diagnostics, Benchmark Attribution, And Feasibility Decision');
    expect(plan).toContain('### 5. Operational Completeness Closeout');
    expect(plan).not.toContain('default rollout is ready');
    expect(plan).not.toContain('Rust is ready to become the default');
  });

  it('records the Phase 6 end-to-end Rust graph pipeline feasibility decision without implementing it', () => {
    const decision = fs.readFileSync(FEASIBILITY_DECISION, 'utf-8');

    expect(decision).toContain('Decision: `prototype-first`');
    expect(decision).toContain('Rust remains opt-in');
    expect(decision).toContain('Phase 6 does not implement the end-to-end Rust graph pipeline');
    expect(decision).toContain('name matcher only');
    expect(decision).toContain('reference resolver only');
    expect(decision).toContain('dynamic synthesizers later');
    expect(decision).toContain('validated on a large VS Code JS/TS sparse checkout');
    expect(decision).toContain('perReferenceDisambiguationMs');
    expect(decision).not.toContain('default rollout is ready');
    expect(decision).not.toContain('Rust is ready to become the default');
  });
});
