import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  makeRustIndexingTempProject,
  RUST_CORE_BIN,
  runZcodegraphCli,
  ZCODEGRAPH_BIN,
} from './helpers/rust-indexing-cli';

describe('zcodegraph rust-hybrid candidate producer diagnostics', () => {
  let tempDir: string;

  beforeAll(() => {
    if (!fs.existsSync(ZCODEGRAPH_BIN)) {
      execFileSync('npm', ['run', 'build'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
      });
    }
    execFileSync('cargo', ['build', '--package', 'zcodegraph-core'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
  }, 60_000);

  beforeEach(() => {
    tempDir = makeRustIndexingTempProject();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes Rust candidate producer shadow diagnostics for exact, lower, and known-name lookups', () => {
    fs.writeFileSync(
      path.join(tempDir, 'rust-candidate-producer.ts'),
      [
        'export class MixedProducerName {',
        '  value = 1;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'rust-candidate-producer-helper.ts'),
      [
        'export function producerHelper(): number {',
        '  return 1;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'rust-candidate-producer-calls.ts'),
      [
        'type MixedProducerAlias = MixedProducerName;',
        '',
        'export function producerEntry(value: MixedProducerName): number {',
        '  return producerHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'rust-candidate-producer-profile.json');
    fs.writeFileSync(
      path.join(tempDir, '.zcodegraph', 'config.json'),
      JSON.stringify({ experimental: { rustCandidateProducerRouting: false } }, null, 2),
    );
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
      ZCODEGRAPH_CANDIDATE_PROTOCOL: '1',
      ZCODEGRAPH_RUST_CANDIDATE_PRODUCER: '1',
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          candidateProtocol: {
            rustCandidateProducer: {
              enabled: boolean;
              shadowMode: boolean;
              lookupCount: number;
              lookupShapeCounts: Record<string, number>;
              comparedCount: number;
              mismatchCount: number;
              mismatchReasons: Record<string, number>;
              mismatchSamples: unknown[];
              candidateCount: number;
              payloadBytes: number;
              disabledReason: string | null;
            };
          };
        };
      };
    };
    const producer = profile.finalize.referenceResolutionBreakdown.candidateProtocol.rustCandidateProducer;
    expect(producer).toMatchObject({
      enabled: true,
      shadowMode: true,
      lookupShapeCounts: expect.objectContaining({
        ExactName: expect.any(Number),
        LowerName: expect.any(Number),
        QualifiedName: expect.any(Number),
        FileNodes: expect.any(Number),
        KnownNamePresence: expect.any(Number),
      }),
      comparedCount: expect.any(Number),
      mismatchCount: 0,
      mismatchReasons: {},
      mismatchSamples: [],
      disabledReason: null,
    });
    expect(producer.lookupCount).toBeGreaterThan(0);
    expect(producer.lookupShapeCounts.ExactName).toBeGreaterThan(0);
    expect(producer.lookupShapeCounts.LowerName).toBeGreaterThanOrEqual(0);
    expect(producer.lookupShapeCounts.QualifiedName).toBeGreaterThanOrEqual(0);
    expect(producer.lookupShapeCounts.FileNodes).toBeGreaterThanOrEqual(0);
    expect(producer.lookupShapeCounts.KnownNamePresence).toBeGreaterThan(0);
    expect(producer.comparedCount).toBe(producer.lookupCount);
    expect(producer.candidateCount).toBeGreaterThan(0);
    expect(producer.payloadBytes).toBeGreaterThan(0);
  }, 30_000);
});
