import { describe, expect, it } from 'vitest';
import { classifyGraphHealth, formatGraphHealthLines } from '../src/diagnostics/graph-health';

describe('graph health classification contract', () => {
  const base = {
    initialized: true,
    databasePath: '/repo/.zcodegraph/zcodegraph.db',
    databasePresent: true,
  };

  it('classifies an initialized current graph as healthy', () => {
    expect(classifyGraphHealth(base)).toMatchObject({
      state: 'healthy',
      usable: true,
      nextCommands: [],
    });
  });

  it('classifies fallback diagnostics as degraded with a last-run doctor command', () => {
    expect(classifyGraphHealth({
      ...base,
      hybridFallbackState: 'degraded',
    })).toMatchObject({
      state: 'degraded',
      usable: true,
      nextCommands: ['zcodegraph doctor --engine rust-hybrid --bundle --last-run'],
    });
  });

  it('classifies pending source changes as stale with a sync command', () => {
    expect(classifyGraphHealth({
      ...base,
      pendingChangeCount: 2,
    })).toMatchObject({
      state: 'stale',
      usable: true,
      reasons: ['2 pending source change(s).'],
      nextCommands: ['zcodegraph sync'],
    });
  });

  it('classifies stale engine metadata with a force-index command', () => {
    expect(classifyGraphHealth({
      ...base,
      reindexRecommended: true,
    })).toMatchObject({
      state: 'stale',
      usable: true,
      nextCommands: ['zcodegraph index --force'],
    });
  });

  it('classifies the latest diagnostic failure as failed', () => {
    expect(classifyGraphHealth({
      ...base,
      lastRun: { exists: true, endedAt: '2026-07-02T00:00:00.000Z' },
      lastFailure: { exists: true, endedAt: '2026-07-02T00:01:00.000Z' },
    })).toMatchObject({
      state: 'failed',
      usable: true,
      nextCommands: ['zcodegraph doctor --engine rust-hybrid --bundle --last-failure'],
    });
  });

  it('classifies missing initialization as unavailable', () => {
    expect(classifyGraphHealth({
      initialized: false,
      databasePath: '/repo/.zcodegraph/zcodegraph.db',
      databasePresent: false,
    })).toMatchObject({
      state: 'unavailable',
      usable: false,
      nextCommands: ['zcodegraph init'],
    });
  });

  it('classifies an unreadable existing database as corrupted without auto-cleanup', () => {
    expect(classifyGraphHealth({
      ...base,
      openError: 'database disk image is malformed',
      lastRun: { exists: true, endedAt: '2026-07-02T00:00:00.000Z' },
    })).toMatchObject({
      state: 'corrupted',
      usable: false,
      reasons: ['database disk image is malformed'],
      nextCommands: [
        'zcodegraph doctor --engine rust-hybrid --bundle --last-run',
        'rm -rf .zcodegraph && zcodegraph init',
      ],
    });
  });

  it('formats human-readable status lines with exact next steps', () => {
    expect(formatGraphHealthLines(classifyGraphHealth({
      ...base,
      pendingChangeCount: 1,
    }))).toEqual([
      'State: stale',
      'Usable: yes',
      'The graph is usable but out of date with the current checkout.',
      'Reasons:',
      '  1 pending source change(s).',
      'Next steps:',
      '  zcodegraph sync',
    ]);

    expect(formatGraphHealthLines(classifyGraphHealth({
      ...base,
      hybridFallbackState: 'degraded',
    }))).toContain('  zcodegraph doctor --engine rust-hybrid --bundle --last-run');
  });
});
