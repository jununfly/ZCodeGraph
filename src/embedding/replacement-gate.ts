import { spawn, type ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import { findRustCoreCommand } from '../indexing/rust-indexer';

export class ReplacementGateBusyError extends Error {
  constructor() {
    super('Embedding worker is still active; database replacement is not safe yet.');
    this.name = 'ReplacementGateBusyError';
  }
}

function dbProjectRoot(dbPath: string): string {
  const store = path.dirname(path.resolve(dbPath));
  if (path.basename(store) !== '.zcodegraph') {
    throw new Error('Database replacement requires a project-local .zcodegraph database.');
  }
  return path.dirname(store);
}

/** A process whose native handle lifetime owns the OS-backed lease. */
export class NativeReplacementLease {
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
      // Reap the helper's output pipes as well as the process. Waiting only
      // for `exit` can leave Windows children alive until pipe close.
      const onExit = () => {
        if (this.exited) return;
        this.exited = true;
        if (this.parentExitHandler) {
          process.off('exit', this.parentExitHandler);
          this.parentExitHandler = null;
        }
        if (!this.released) {
          this.unexpectedExit(new Error('Embedding replacement lease helper exited unexpectedly.'));
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

  /** EOF is also enforced by the native helper if this process is SIGKILLed. */
  releaseOnParentExit(): void {
    this.child.stdin?.end();
    this.exitHandler?.();
    if (!this.exited) this.child.kill();
  }
}

export function acquireReplacementWorkerLease(dbPath: string, waitMs = 5_000): Promise<NativeReplacementLease> {
  return acquire(dbPath, 'worker-lease', waitMs);
}

export function acquireExclusiveReplacementGate(dbPath: string, waitMs = 5_000): Promise<NativeReplacementLease> {
  return acquire(dbPath, 'replacement-gate', waitMs);
}

export function replacementGateBusy(error: unknown): boolean {
  return error instanceof ReplacementGateBusyError;
}

function acquire(dbPath: string, command: 'worker-lease' | 'replacement-gate', waitMs: number): Promise<NativeReplacementLease> {
  const projectRoot = dbProjectRoot(dbPath);
  const core = findRustCoreCommand();
  return new Promise((resolve, reject) => {
    const args = [
      ...core.argsPrefix,
      command,
      '--project-path', projectRoot,
      '--wait-ms', String(waitMs),
    ];
    const child = spawn(core.command, args, { cwd: core.cwd, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const lease = new NativeReplacementLease(child, (error) => {
      process.emitWarning(error.message, { code: 'ZCG_REPLACEMENT_LEASE_LOST' });
    });
    lease.setParentExitHandler(() => {});
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      if (settled || stdout.trim() !== 'acquired') return;
      settled = true;
      cleanupAcquisitionListeners();
      resolve(lease);
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanupAcquisitionListeners();
      void lease.release().finally(() => reject(error));
    };
    const cleanupAcquisitionListeners = () => {
      child.off('error', onError);
      child.off('exit', onExit);
      // NativeReplacementLease owns a persistent error listener after startup.
      // This no-op also handles a helper that exited before acquisition settled.
      child.on('error', () => {});
    };
    const onError = (error: Error) => fail(error);
    const onExit = (code: number | null) => {
      if (code === 3) {
        fail(new ReplacementGateBusyError());
      } else {
        fail(new Error(`Embedding replacement gate failed before any write: ${stderr.trim() || `exit ${code ?? 'unknown'}`}`));
      }
    };
    child.once('error', onError);
    child.once('exit', onExit);
  });
}
