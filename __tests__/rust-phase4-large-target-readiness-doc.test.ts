import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DOC = path.resolve(
  __dirname,
  '..',
  'docs',
  'benchmarks',
  '2026-06-13-rust-indexing-core-phase-4-large-target-readiness.md',
);

describe('Rust indexing Phase 4 large-target readiness document', () => {
  it('records pinned large-repo profile and sufficiency evidence outside the quick loop', () => {
    const text = fs.readFileSync(DOC, 'utf-8');
    const lowerText = text.toLowerCase();

    expect(text).toContain('#81');
    expect(text).toContain('https://github.com/microsoft/vscode');
    expect(text).toContain('Pinned commit');
    expect(lowerText).toContain('indexed file count');
    expect(text).toContain('rust-index-profile.mjs');
    expect(text).toContain('rust-sufficiency-guardrail.mjs');
    expect(text).toContain('wall-clock');
    expect(text).toContain('peak RSS');
    expect(lowerText).toContain('finalization subphases');
    expect(lowerText).toContain('node/edge counts');
    expect(lowerText).toContain('dominant bottleneck');
    expect(lowerText).toContain('read/grep fallback risk');
    expect(text).toContain('outside the ordinary quick local test loop');
  });
});
