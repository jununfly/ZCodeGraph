import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const BENCHMARKS_DIR = path.resolve(__dirname, '..', 'docs', 'benchmarks');

const readBenchmarkDoc = (fileName: string): string =>
  fs.readFileSync(path.join(BENCHMARKS_DIR, fileName), 'utf-8');

describe('Rust indexing Phase 4 evidence durability docs', () => {
  it('marks local raw artifacts as local-only provenance and names durable summaries', () => {
    const text = readBenchmarkDoc(
      '2026-06-13-rust-indexing-core-phase-4-results-and-decision.md',
    );

    expect(text).toContain('Evidence Durability Policy');
    expect(text).toContain(
      'Repo-relative `docs/benchmarks/` raw JSON files are durable checked-in evidence',
    );

    const localOnlyRawArtifacts = [
      '/tmp/zcodegraph-rust-phase4-profile-baseline.json',
      '/tmp/zcodegraph-rust-phase4-optimization-after.json',
      '/tmp/zcodegraph-rust-phase4-optimization-sufficiency.json',
      '/tmp/zcodegraph-rust-phase4-readiness/package-smoke/summary.json',
      '/tmp/zcodegraph-rust-phase4-readiness/failure-safety-matrix/summary.json',
    ];

    for (const artifact of localOnlyRawArtifacts) {
      const line = text
        .split('\n')
        .find((candidate) => candidate.includes(artifact));

      expect(line, `missing artifact reference ${artifact}`).toBeTruthy();
      expect(line).toContain('local-only provenance');
      expect(line).toContain('authoritative summary:');
    }

    expect(text).toContain(
      'authoritative summary: [Profile baseline](2026-06-13-rust-indexing-core-phase-4-profile-baseline.md)',
    );
    expect(text).toContain(
      'authoritative summary: [Optimization trial](2026-06-13-rust-indexing-core-phase-4-optimization-trial.md)',
    );
    expect(text).toContain(
      'authoritative summary: [Readiness refresh](2026-06-13-rust-indexing-core-phase-4-readiness-refresh.md)',
    );
  });

  it('makes each local-only Phase 4 summary self-contained when raw tmp files are gone', () => {
    const summaryDocs = [
      '2026-06-13-rust-indexing-core-phase-4-profile-baseline.md',
      '2026-06-13-rust-indexing-core-phase-4-optimization-trial.md',
      '2026-06-13-rust-indexing-core-phase-4-readiness-refresh.md',
    ];

    for (const fileName of summaryDocs) {
      const text = readBenchmarkDoc(fileName);

      expect(text, fileName).toContain('Raw Artifacts And Durability');
      expect(text, fileName).toContain('local-only provenance');
      expect(text, fileName).toContain('durable source of truth');
    }
  });
});
