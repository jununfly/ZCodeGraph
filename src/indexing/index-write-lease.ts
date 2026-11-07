import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import { findLeaseHelperCommand } from './rust-indexer';

/**
 * ADR-0011 §1/§3: Node has no native file-lock API, so the OS lock handle is
 * owned by a supervised `zcodegraph-core index-lease` helper process. Node
 * borrows that lease for one operation. stdin EOF (normal release, parent
 * exit, or a parent SIGKILL closing the pipe) releases the OS lock through
 * handle cleanup. The stable rendezvous file is never deleted.
 *
 * This is the process-boundary-equivalent mechanism explicitly accepted by
 * Human on 2026-11-07; it is not the literal "Node holds the handle" wording
 * of §2 and requires real three-platform native-process evidence (items 3/7).
 */
export class IndexWriteLeaseBusyError extends Error {
  constructor() {
    super('An active index writer holds the OS-backed lock; acquisition failed closed.');
    this.name = 'IndexWriteLeaseBusyError';
  }
}

export type IndexWriteLeaseState =
  | 'not-locked'
  | 'active-writer'
  | 'invalid-rendezvous'
  | 'unsupported-adapter'
  | 'unknown';

const DIAGNOSIS_STATES: readonly string[] = [
  'not-locked',
  'active-writer',
  'invalid-rendezvous',
  'unsupported-adapter',
  'unknown',
];

function leaseArgs(projectRoot: string, extra: string[] = []): string[] {
  const core = findLeaseHelperCommand();
  return [
    ...core.argsPrefix,
    'index-lease',
    '--project-path',
    path.resolve(projectRoot),
    ...extra,
  ];
}

/** Inspect-only diagnosis for `unlock` (§4). Never deletes or repairs. */
export function diagnoseIndexWriteLease(projectRoot: string): IndexWriteLeaseState {
  const core = findLeaseHelperCommand();
  const result = spawnSync(core.command, leaseArgs(projectRoot, ['--diagnose']), {
    cwd: core.cwd,
    env: process.env,
    encoding: 'utf8',
  });
  if (result.error || result.status !== 0) return 'unknown';
  const state = result.stdout.trim();
  return DIAGNOSIS_STATES.includes(state) ? (state as IndexWriteLeaseState) : 'unknown';
}

export interface IndexWriteLeaseOwner {
  pid: number;
  acquiredAt: number;
}

export interface IndexWriteLeaseDiagnostics {
  state: IndexWriteLeaseState;
  owner: IndexWriteLeaseOwner | null;
}

/**
 * ADR-0011 §4 independent diagnosis channel (R1 of the restarted P1). The
 * helper derives `state` from the OS-lock probe and reads non-sensitive owner
 * fields from a separate, never-locked sidecar, so this works on Windows where
 * the whole-file-locked rendezvous file cannot be read cross-process. Owner
 * fields are exposed only for an active writer; a stale sidecar left by a
 * SIGKILLed writer is never presented as a live owner. Any spawn/parse failure
 * fails closed with `unknown` / `null`.
 */
export function readIndexWriteLeaseDiagnostics(projectRoot: string): IndexWriteLeaseDiagnostics {
  const core = findLeaseHelperCommand();
  const result = spawnSync(core.command, leaseArgs(projectRoot, ['--diagnose-json']), {
    cwd: core.cwd,
    env: process.env,
    encoding: 'utf8',
  });
  if (result.error || result.status !== 0) return { state: 'unknown', owner: null };
  try {
    const parsed = JSON.parse(result.stdout.trim()) as {
      state?: unknown;
      owner?: unknown;
    };
    const state =
      typeof parsed.state === 'string' && DIAGNOSIS_STATES.includes(parsed.state)
        ? (parsed.state as IndexWriteLeaseState)
        : 'unknown';
    if (state !== 'active-writer' || !parsed.owner || typeof parsed.owner !== 'object') {
      return { state, owner: null };
    }
    const { pid, acquiredAt } = parsed.owner as { pid?: unknown; acquiredAt?: unknown };
    const owner =
      typeof pid === 'number' &&
      Number.isSafeInteger(pid) &&
      pid > 0 &&
      typeof acquiredAt === 'number' &&
      Number.isSafeInteger(acquiredAt)
        ? { pid, acquiredAt }
        : null;
    return { state, owner };
  } catch {
    return { state: 'unknown', owner: null };
  }
}

/**
 * `unlock --force`: rewrite bounded diagnostic metadata in place through an
 * already-acquired OS lock. It cannot override an active writer (the helper
 * exits 3), and never deletes the rendezvous file.
 */
export function repairIndexWriteLeaseMetadata(projectRoot: string): boolean {
  const core = findLeaseHelperCommand();
  const result = spawnSync(core.command, leaseArgs(projectRoot, ['--repair']), {
    cwd: core.cwd,
    env: process.env,
    encoding: 'utf8',
  });
  return !result.error && result.status === 0 && result.stdout.trim() === 'repaired';
}

/** A process whose native handle lifetime owns the OS-backed lease. */
export class NativeIndexWriteLease {
  private exited = false;
  private released = false;
  private unexpectedExit: (error: Error) => void;
  private readonly exitPromise: Promise<void>;
  private exitHandler: (() => void) | null = null;
  private parentExitHandler: (() => void) | null = null;

  constructor(
    private readonly child: ChildProcess,
    onUnexpectedExit: (error: Error) => void,
  ) {
    this.unexpectedExit = onUnexpectedExit;
    this.exitPromise = new Promise((resolve) => {
      const onExit = () => {
        if (this.exited) return;
        this.exited = true;
        if (this.parentExitHandler) {
          process.off('exit', this.parentExitHandler);
          this.parentExitHandler = null;
        }
        if (!this.released) {
          this.unexpectedExit(new Error('Index write lease helper exited unexpectedly.'));
        }
        resolve();
      };
      child.once('close', onExit);
      child.once('error', onExit);
    });
  }

  get processId(): number | undefined {
    return this.child.pid;
  }

  onUnexpectedExit(handler: (error: Error) => void): void {
    this.unexpectedExit = handler;
  }

  setParentExitHandler(handler: () => void): void {
    this.exitHandler = handler;
    if (this.parentExitHandler) process.off('exit', this.parentExitHandler);
    this.parentExitHandler = () => this.releaseOnParentExit();
    process.once('exit', this.parentExitHandler);
  }

  async release(): Promise<void> {
    this.released = true;
    if (this.parentExitHandler) {
      process.off('exit', this.parentExitHandler);
      this.parentExitHandler = null;
    }
    this.child.stdin?.end();
    if (this.exited) return;
    this.child.kill();
    await this.exitPromise;
  }

  /** EOF is enforced by the OS if this process is SIGKILLed. */
  releaseOnParentExit(): void {
    this.child.stdin?.end();
    this.exitHandler?.();
    if (!this.exited) this.child.kill();
  }
}

export function acquireIndexWriteLease(projectRoot: string): Promise<NativeIndexWriteLease> {
  const core = findLeaseHelperCommand();
  return new Promise((resolve, reject) => {
    const child = spawn(core.command, leaseArgs(projectRoot), {
      cwd: core.cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const lease = new NativeIndexWriteLease(child, (error) => {
      process.emitWarning(error.message, { code: 'ZCG_INDEX_WRITE_LEASE_LOST' });
    });
    lease.setParentExitHandler(() => {});

    const cleanupAcquisitionListeners = () => {
      child.off('error', onError);
      child.off('exit', onExit);
      // The lease owns a persistent error listener after startup.
      child.on('error', () => {});
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanupAcquisitionListeners();
      void lease.release().finally(() => reject(error));
    };
    const onError = (error: Error) => fail(error);
    const onExit = (code: number | null) => {
      if (code === 3) {
        fail(new IndexWriteLeaseBusyError());
      } else {
        fail(
          new Error(
            `Index write lease failed before any write: ${stderr.trim() || `exit ${code ?? 'unknown'}`}`,
          ),
        );
      }
    };

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
      if (settled || stdout.trim() !== 'acquired') return;
      settled = true;
      cleanupAcquisitionListeners();
      resolve(lease);
    });
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', onError);
    child.once('exit', onExit);
  });
}
