import * as path from 'node:path';
import {
  acquireIndexWriteLease,
  IndexWriteLeaseBusyError,
  type NativeIndexWriteLease,
} from './index-write-lease';

/**
 * ADR-0011 §1/§3: cross-process index-write mutual exclusion.
 *
 * This is the production TypeScript surface of the OS-backed lease. Each writer
 * borrows the lease held by a supervised native helper (`zcodegraph-core
 * index-lease`, see `index-write-lease.ts` and ADR-0011 §3). The stable
 * `.zcodegraph/zcodegraph.lock` rendezvous file is the OS-lock target and is
 * never deleted on release or after a crash — recovery is OS handle cleanup,
 * never lock-file unlink. Bounded diagnostics live in a separate, never-locked
 * sidecar (`index-lease.diagnostics.json`), so cross-process readers (e.g. the
 * `unlock` CLI and the native-process supervision tests) never read the
 * whole-file-exclusively-locked rendezvous.
 *
 * The constructor still accepts the historical lock-path argument for call-site
 * compatibility, but the lease is always acquired on the owning project root
 * derived from it (`<projectRoot>/.zcodegraph/zcodegraph.lock`).
 */
export class FileLock {
  private lease: NativeIndexWriteLease | null = null;
  private readonly projectRoot: string;
  private readonly lockPath: string;

  constructor(lockPath: string) {
    this.lockPath = lockPath;
    // lockPath = <projectRoot>/.zcodegraph/zcodegraph.lock
    this.projectRoot = path.dirname(path.dirname(lockPath));
  }

  /**
   * Acquire the cross-process index-write lease. Throws if another live process
   * holds the OS lock. A missing/unavailable native Adapter fails closed before
   * any write (ADR-0011 §3).
   */
  async acquire(): Promise<void> {
    try {
      this.lease = await acquireIndexWriteLease(this.projectRoot);
    } catch (error) {
      if (error instanceof IndexWriteLeaseBusyError) {
        throw new Error(
          `CodeGraph database is locked by another process. ` +
            `If this is stale, run 'codegraph unlock' or inspect ${this.lockPath}`,
        );
      }
      throw error;
    }
  }

  /**
   * Release the leased OS lock. The stable rendezvous file is left in place;
   * abnormal termination is recovered by OS handle cleanup, never by unlink.
   */
  async release(): Promise<void> {
    const lease = this.lease;
    if (!lease) return;
    this.lease = null;
    await lease.release();
  }

  /**
   * Execute a function while holding the lease. Accepts a sync or async fn.
   */
  async withLock<T>(fn: () => T | Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      await this.release();
    }
  }

  /**
   * Alias for {@link withLock} retained for call-site compatibility.
   */
  async withLockAsync<T>(fn: () => T | Promise<T>): Promise<T> {
    return this.withLock(fn);
  }
}
