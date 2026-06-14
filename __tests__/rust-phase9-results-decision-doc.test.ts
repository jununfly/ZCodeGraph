import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const DECISION = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-9-results-and-decision.md',
);
const PROBE = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-9-vs1-probe.raw.json',
);
const SUFFICIENCY = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-14-rust-indexing-core-phase-9-vscode-sufficiency.raw.json',
);

describe('Phase 9 VS-1 results and decision', () => {
  it('records bounded success and the missing-symbol root cause', () => {
    const decision = fs.readFileSync(DECISION, 'utf-8');
    const probe = JSON.parse(fs.readFileSync(PROBE, 'utf-8')) as {
      summary: { primaryClassification: string };
      classifications: Array<{ token: string; classification: string; candidateCount: number }>;
    };
    const sufficiency = JSON.parse(fs.readFileSync(SUFFICIENCY, 'utf-8')) as {
      fullRerunAttempt: { status: string; unavailableReason: string };
      regressions: string[];
      results: Array<{
        prompts: Array<{
          typescript: { classification: string; missingExpected: string[] };
          rust: { classification: string; missingExpected: string[] };
        }>;
      }>;
    };

    expect(decision).toContain('bounded success');
    expect(decision).not.toContain('Phase 9 classification: **full success**');
    expect(decision).toContain('#120');
    expect(decision).toContain('#121');
    expect(decision).toContain('#122');
    expect(decision).toContain('#123');
    expect(decision).toContain('#113');
    expect(decision).toContain('2026-06-14-rust-indexing-core-phase-9-vs1-probe.raw.json');
    expect(decision).toContain('2026-06-14-rust-indexing-core-phase-9-vscode-sufficiency.raw.json');
    expect(decision).toContain('does not change Rust matcher opt-in status');
    expect(decision).toContain('does not change Rust indexer default status');
    expect(decision).toContain('does not establish default rollout readiness');

    expect(probe.summary.primaryClassification).toBe('missing-symbol');
    expect(probe.classifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ token: 'AbstractExtensionService', classification: 'missing-symbol', candidateCount: 0 }),
        expect.objectContaining({ token: 'ExtensionHostMain', classification: 'missing-symbol', candidateCount: 0 }),
        expect.objectContaining({ token: 'MainThreadExtensionService', classification: 'missing-symbol', candidateCount: 0 }),
        expect.objectContaining({ token: 'start', classification: 'ambiguous-symbol', candidateCount: 26 }),
      ]),
    );

    const prompt = sufficiency.results[0]?.prompts[0];
    expect(sufficiency.fullRerunAttempt.status).toBe('unavailable');
    expect(sufficiency.fullRerunAttempt.unavailableReason).toContain('Timed out');
    expect(sufficiency.regressions).toEqual([]);
    expect(prompt?.typescript.classification).toBe('missing-symbol');
    expect(prompt?.rust.classification).toBe('missing-symbol');
    expect(prompt?.typescript.missingExpected).toContain('AbstractExtensionService');
    expect(prompt?.rust.missingExpected).toContain('AbstractExtensionService');
  });
});
