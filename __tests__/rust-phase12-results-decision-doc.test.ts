import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const DOC = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-15-rust-indexing-core-phase-12-results-and-decision.md',
);

describe('Phase 12 supported-runtime sufficiency results and decision', () => {
  it('records Node 22 evidence and the TypeScript indexing blocker', () => {
    const text = fs.readFileSync(DOC, 'utf-8');

    expect(text).toContain('supported-runtime blocker advanced to TypeScript indexing timeout');
    expect(text).toContain('/private/tmp/node-v22.21.1-darwin-arm64/bin/node');
    expect(text).toContain('v22.21.1');
    expect(text).toContain('4ac5322601c6985aba4cd9349c23f4ef22dc3e65');
    expect(text).toContain('commitMatchesExpected');
    expect(text).toContain('typescript-index-timeout');
    expect(text).toContain('timeout only');
    expect(text).toContain('No additional attempts were run');
    expect(text).toContain('does not change Rust matcher opt-in status');
    expect(text).toContain('does not establish default rollout readiness');
    expect(text).toContain('Do not start resolver, matcher, Explore planner, or Rust extraction changes');
  });
});
