import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DOC = path.resolve(
  __dirname,
  '..',
  'docs',
  'benchmarks',
  '2026-06-13-rust-indexing-core-phase-4-results-and-decision.md',
);

describe('Rust indexing Phase 4 results and decision document', () => {
  it('records the issue 82 stop/continue decision and names the default-rollout blockers', () => {
    const text = fs.readFileSync(DOC, 'utf-8');
    const lowerText = text.toLowerCase();

    expect(text).toContain('#82');
    expect(text).toContain('Branch B');
    expect(text).toContain('continue opt-in hardening');
    expect(text).toContain('Rust remains opt-in');
    expect(text).toContain('Branch A is not chosen');
    expect(text).toContain('validated on a large VS Code JS/TS sparse checkout');
    expect(text).toContain('referenceResolutionMs');
    expect(text).toContain('#85');
    expect(text).toContain('#86');
    expect(text).toContain('#87');
    expect(text).toContain('#88');
    expect(lowerText).toContain('raw artifact');
    expect(lowerText).toContain('rss evidence');
    expect(lowerText).toContain('optimization trend classification');
    expect(lowerText).toContain('large-target readiness evidence');
    expect(lowerText).toContain('package smoke');
    expect(lowerText).toContain('diagnostics');
    expect(lowerText).toContain('failure-safety');
    expect(lowerText).toContain('release-cycle evidence');
  });
});
