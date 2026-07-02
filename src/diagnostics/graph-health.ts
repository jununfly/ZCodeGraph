export type GraphHealthState = 'healthy' | 'degraded' | 'failed' | 'unavailable' | 'stale' | 'corrupted';

export interface GraphHealthDiagnosticRecord {
  exists: boolean;
  endedAt?: string | null;
}

export interface GraphHealthInput {
  initialized: boolean;
  databasePath: string;
  databasePresent: boolean;
  openError?: string | null;
  pendingChangeCount?: number;
  reindexRecommended?: boolean;
  hybridFallbackState?: string | null;
  lastRun?: GraphHealthDiagnosticRecord | null;
  lastFailure?: GraphHealthDiagnosticRecord | null;
}

export interface GraphHealth {
  state: GraphHealthState;
  usable: boolean;
  summary: string;
  reasons: string[];
  nextCommands: string[];
}

function diagnosticRecordTime(record: GraphHealthDiagnosticRecord | null | undefined): number | null {
  if (!record?.exists || !record.endedAt) return null;
  const ms = Date.parse(record.endedAt);
  return Number.isFinite(ms) ? ms : null;
}

function hasLatestFailure(input: GraphHealthInput): boolean {
  if (!input.lastFailure?.exists) return false;
  const failureTime = diagnosticRecordTime(input.lastFailure);
  const runTime = diagnosticRecordTime(input.lastRun);
  if (failureTime == null || runTime == null) return true;
  return failureTime >= runTime;
}

function doctorCommands(input: GraphHealthInput): string[] {
  const commands: string[] = [];
  if (input.lastRun?.exists) {
    commands.push('zcodegraph doctor --engine rust-hybrid --bundle --last-run');
  }
  if (input.lastFailure?.exists) {
    commands.push('zcodegraph doctor --engine rust-hybrid --bundle --last-failure');
  }
  return commands;
}

export function classifyGraphHealth(input: GraphHealthInput): GraphHealth {
  if (!input.initialized || !input.databasePresent) {
    return {
      state: 'unavailable',
      usable: false,
      summary: 'No usable graph is available yet.',
      reasons: input.initialized
        ? [`Database not found: ${input.databasePath}`]
        : ['Project is not initialized.'],
      nextCommands: ['zcodegraph init'],
    };
  }

  if (input.openError) {
    const commands = doctorCommands(input);
    return {
      state: 'corrupted',
      usable: false,
      summary: 'The graph database exists but cannot be opened; do not trust the current graph.',
      reasons: [input.openError],
      nextCommands: [
        ...commands,
        'rm -rf .zcodegraph && zcodegraph init',
      ],
    };
  }

  if (hasLatestFailure(input)) {
    return {
      state: 'failed',
      usable: true,
      summary: 'The last rust-hybrid build failed; the previous graph may still be usable but needs diagnosis.',
      reasons: ['Latest diagnostic record is last-failure.'],
      nextCommands: ['zcodegraph doctor --engine rust-hybrid --bundle --last-failure'],
    };
  }

  const staleReasons: string[] = [];
  const pendingChangeCount = input.pendingChangeCount ?? 0;
  if (pendingChangeCount > 0) staleReasons.push(`${pendingChangeCount} pending source change(s).`);
  if (input.reindexRecommended) staleReasons.push('Index was built by an older engine or extraction version.');
  if (staleReasons.length > 0) {
    return {
      state: 'stale',
      usable: true,
      summary: 'The graph is usable but out of date with the current checkout.',
      reasons: staleReasons,
      nextCommands: input.reindexRecommended
        ? ['zcodegraph index --force']
        : ['zcodegraph sync'],
    };
  }

  if (input.hybridFallbackState === 'degraded') {
    return {
      state: 'degraded',
      usable: true,
      summary: 'The graph is usable; fallback-degraded files or diagnostics are the only parts that need review.',
      reasons: ['rust-hybrid fallback health is degraded.'],
      nextCommands: ['zcodegraph doctor --engine rust-hybrid --bundle --last-run'],
    };
  }

  return {
    state: 'healthy',
    usable: true,
    summary: 'The graph is current and fully usable.',
    reasons: [],
    nextCommands: [],
  };
}
