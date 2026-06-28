import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodeGraph } from '../src';

describe('Rust finalization ownership reporting', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('separates Rust-owned stages from TypeScript-owned finalization residuals', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-finalization-reporting-'));
    const cg = CodeGraph.initSync(tempDir);

    try {
      const result = await cg.finalizeRustIndex();
      const boundaryProtocol = result.profile.boundaryProtocol as {
        productShell: string;
        rustOwnedStages: string[];
        typescriptOwnedResidualStages: Array<{
          stage: string;
          owner: string;
          status: string;
          reason: string;
        }>;
      };
      const fallbackTaxonomy = result.profile.fallbackTaxonomy as {
        entries: Array<{
          stage: string;
          classification: string;
          reason: string;
          count: number;
        }>;
      };

      expect(boundaryProtocol.productShell).toBe('typescript');
      expect(boundaryProtocol.rustOwnedStages).toEqual([
        'source-scan',
        'parse-extraction',
        'graph-write',
      ]);
      expect(boundaryProtocol.typescriptOwnedResidualStages).toEqual([
        {
          stage: 'framework-post-extract',
          owner: 'typescript-finalization',
          status: 'migration-target',
          reason: 'not-yet-rust-owned',
        },
        {
          stage: 'reference-resolution',
          owner: 'typescript-finalization',
          status: 'migration-target',
          reason: 'not-yet-rust-owned',
        },
        {
          stage: 'dynamic-dispatch-synthesis',
          owner: 'typescript-finalization',
          status: 'migration-target',
          reason: 'not-yet-rust-owned',
        },
        {
          stage: 'db-maintenance',
          owner: 'typescript-finalization',
          status: 'migration-target',
          reason: 'not-yet-rust-owned',
        },
        {
          stage: 'profile-checkpoint-orchestration',
          owner: 'typescript-product-shell',
          status: 'reporting-only',
          reason: 'profile-assembly-not-graph-semantics',
        },
      ]);
      expect(fallbackTaxonomy.entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            stage: 'framework-post-extract',
            classification: 'migration-target',
            reason: 'typescript-finalization-not-yet-migrated',
            count: 1,
          }),
          expect.objectContaining({
            stage: 'profile-checkpoint-orchestration',
            classification: 'reporting-only',
            reason: 'typescript-product-shell-profile-assembly',
            count: 1,
          }),
        ]),
      );
    } finally {
      cg.close();
    }
  });
});
