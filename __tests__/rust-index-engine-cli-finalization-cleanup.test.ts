import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CodeGraph } from '../src';
import {
  makeRustIndexingTempProject,
  RUST_CORE_BIN,
  runZcodegraphCli,
  ZCODEGRAPH_BIN,
} from './helpers/rust-indexing-cli';

describe('zcodegraph rust-hybrid finalization cleanup diagnostics', () => {
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

  it('reports finalization cleanup ownership as a public contract diagnostic', () => {
    fs.writeFileSync(
      path.join(tempDir, 'cleanup_contract.rb'),
      [
        'def cleanup_target',
        '  1',
        'end',
        '',
        'def cleanup_entry',
        '  cleanup_target',
        'end',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'cleanup-missing.ts'),
      [
        'export function cleanupMissingEntry(): void {',
        '  missingCleanupTarget();',
        '}',
      ].join('\n') + '\n',
    );

    const profileOut = path.join(tempDir, '.zcodegraph', 'cleanup-ownership-profile.json');
    const result = runZcodegraphCli(tempDir, ['index', '--engine', 'rust-hybrid', '--quiet', '--profile-out', profileOut], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);

    const profile = JSON.parse(fs.readFileSync(profileOut, 'utf-8')) as {
      finalize: {
        referenceResolutionBreakdown: {
          resolvedCleanupRowCount: number;
          intentionallyUnresolvedCleanupRowCount: number;
          cleanupOwnership: {
            owner: string;
            mode: string;
            resolvedTerminalRefs: number;
            intentionallyUnresolvedTerminalRefs: number;
            retainedRefs: number;
            rustCorePrecleanedRefs: number | null;
            fallbackReason: string | null;
            protocol: {
              version: number;
              valid: boolean;
              declaredCategories: string[];
              executor: string;
              deletionMechanics: string;
              dbMaintenance: string;
            };
            notes: string[];
          };
        };
      };
    };
    const breakdown = profile.finalize.referenceResolutionBreakdown;

    expect(breakdown.cleanupOwnership).toMatchObject({
      owner: 'rust-core-protocol',
      mode: 'rust-declared-typescript-executed',
      resolvedTerminalRefs: breakdown.resolvedCleanupRowCount,
      intentionallyUnresolvedTerminalRefs: breakdown.intentionallyUnresolvedCleanupRowCount,
      retainedRefs: expect.any(Number),
      rustCorePrecleanedRefs: null,
      fallbackReason: null,
      protocol: {
        version: 1,
        valid: true,
        declaredCategories: [
          'resolved-terminal',
          'intentionally-unresolved-terminal',
          'retained-backlog',
        ],
        executor: 'typescript-shell',
        deletionMechanics: 'typescript-rowid-range',
        dbMaintenance: 'out-of-scope',
      },
      notes: expect.arrayContaining([
        expect.stringContaining('Rust core declared terminal cleanup protocol'),
        expect.stringContaining('TypeScript shell still executes rowid-range cleanup'),
      ]),
    });
    expect(breakdown.cleanupOwnership.resolvedTerminalRefs).toBeGreaterThan(0);
    expect(breakdown.cleanupOwnership.intentionallyUnresolvedTerminalRefs).toBeGreaterThan(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.queries.getUnresolvedReferencesCount()).toBe(breakdown.cleanupOwnership.retainedRefs);
    } finally {
      cg.close();
    }
  }, 30_000);
});
