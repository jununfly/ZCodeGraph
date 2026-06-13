import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DOC = path.resolve(
  __dirname,
  '..',
  'docs',
  'benchmarks',
  '2026-06-13-rust-indexing-core-phase-4-supported-node-rerun.md',
);

describe('Rust indexing Phase 4 supported Node rerun document', () => {
  it('records supported-runtime VS Code profile and sufficiency evidence for issue 85', () => {
    const text = fs.readFileSync(DOC, 'utf-8');
    const lowerText = text.toLowerCase();

    expect(text).toContain('#85');
    expect(text).toContain('275e1b3102b410cb6fe8a8dd7d12bc5cebb917f0');
    expect(text).toContain('large VS Code JS/TS sparse checkout');
    expect(text).toContain('Node v22');
    expect(text).toContain('Node v26.0.0');
    expect(lowerText).toContain('supported package range');
    expect(lowerText).toContain('profile smoke');
    expect(lowerText).toContain('peak rss');
    expect(lowerText).toContain('finalization subphases');
    expect(lowerText).toContain('node/edge counts');
    expect(lowerText).toContain('dominant bottleneck');
    expect(lowerText).toContain('sufficiency probe');
    expect(lowerText).toContain('read/grep fallback-risk');
    expect(lowerText).toContain('raw artifacts');
    expect(lowerText).toContain('node 26 comparison');
  });
});
