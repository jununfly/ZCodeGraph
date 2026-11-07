import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  acquireIndexWriteLease,
  diagnoseIndexWriteLease,
  readIndexWriteLeaseDiagnostics,
  repairIndexWriteLeaseMetadata,
  IndexWriteLeaseBusyError,
  type NativeIndexWriteLease,
} from '../src/indexing/index-write-lease';

/**
 * ADR-0011 Required verification items 1, 2, 5 and 6 (process-level subset).
 * These are real native processes, not mocks: the Rust helper owns the sole OS
 * lock handle on `.zcodegraph/zcodegraph.lock`.
 *
 * The §4 channel cases additionally pin the R1 prerequisite of restarted P1:
 * active-writer diagnostics come from an independent, never-locked channel,
 * never from the whole-file-locked rendezvous file.
 */
describe('index write lease (native process)', () => {
  const cliPath = path.resolve(__dirname, '../dist/bin/zcodegraph.js');
  let projectRoot: string;
  let rendezvous: string;
  let diagnosticsPath: string;
  let leases: NativeIndexWriteLease[];

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-index-lease-'));
    const store = path.join(projectRoot, '.zcodegraph');
    fs.mkdirSync(store, { recursive: true });
    // `isInitialized` requires the DB path to exist; unlock never opens it.
    fs.writeFileSync(path.join(store, 'zcodegraph.db'), '');
    rendezvous = path.join(store, 'zcodegraph.lock');
    diagnosticsPath = path.join(store, 'index-lease.diagnostics.json');
    leases = [];
  });

  afterEach(async () => {
    for (const lease of leases.reverse()) {
      await lease.release().catch(() => undefined);
    }
    // Windows may hold a handle briefly after a native helper exits.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        fs.rmSync(projectRoot, { recursive: true, force: true });
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  });

  async function hold(): Promise<NativeIndexWriteLease> {
    const lease = await acquireIndexWriteLease(projectRoot);
    leases.push(lease);
    return lease;
  }

  it('excludes a second writer and diagnoses an active OS writer', async () => {
    const first = await hold();
    expect(fs.existsSync(rendezvous)).toBe(true);
    expect(diagnoseIndexWriteLease(projectRoot)).toBe('active-writer');
    await expect(acquireIndexWriteLease(projectRoot)).rejects.toBeInstanceOf(IndexWriteLeaseBusyError);
    await first.release();
    expect(fs.existsSync(rendezvous)).toBe(true);
    expect(diagnoseIndexWriteLease(projectRoot)).toBe('not-locked');
    const second = await hold();
    await second.release();
  }, 30_000);

  it('normal release leaves the stable rendezvous file and allows repeated acquire', async () => {
    for (let round = 0; round < 3; round += 1) {
      const lease = await hold();
      // A second handle cannot read the file while the exclusive OS lock is
      // held on Windows (ERROR_LOCK_VIOLATION), so inspect after release.
      await lease.release();
      expect(fs.existsSync(rendezvous)).toBe(true);
      expect(fs.readFileSync(rendezvous, 'utf8')).toContain('"protocol":1');
    }
  }, 30_000);

  it('pins sharing-mode semantics: diagnostics never read the locked file', async () => {
    const lease = await hold();
    if (process.platform === 'win32') {
      // fs2's exclusive LockFileEx locks the whole file. ADR-0011 §4 requires
      // `unlock` to report active-writer diagnostics; the CLI must get them
      // from the helper's diagnosis channel, not from this file.
      expect(() => fs.readFileSync(rendezvous, 'utf8')).toThrow();
    }
    expect(diagnoseIndexWriteLease(projectRoot)).toBe('active-writer');
    await lease.release();
    expect(fs.readFileSync(rendezvous, 'utf8')).toContain('"protocol":1');
  }, 30_000);

  it('SIGKILL releases the OS lock without deleting the rendezvous file', async () => {
    const lease = await hold();
    expect(diagnoseIndexWriteLease(projectRoot)).toBe('active-writer');
    // The helper exit is intentional here, not a lost lease.
    lease.onUnexpectedExit(() => undefined);
    // Bypass the release path entirely: OS handle cleanup must do the work.
    process.kill(lease.processId!, 'SIGKILL');
    await vi.waitFor(
      () => expect(diagnoseIndexWriteLease(projectRoot)).toBe('not-locked'),
      { timeout: 10_000, interval: 100 },
    );
    expect(fs.existsSync(rendezvous)).toBe(true);
    // A stale sidecar left by the killed helper must not be presented as a
    // live owner: the OS-lock probe is the only state authority.
    expect(readIndexWriteLeaseDiagnostics(projectRoot).owner).toBeNull();
    const recovered = await hold();
    await recovered.release();
  }, 30_000);

  it('force repairs malformed legacy metadata in place, never deleting the file', () => {
    fs.writeFileSync(rendezvous, '99999999\nlegacy record');
    expect(repairIndexWriteLeaseMetadata(projectRoot)).toBe(true);
    expect(fs.existsSync(rendezvous)).toBe(true);
    expect(fs.readFileSync(rendezvous, 'utf8')).toContain('"protocol":1');
    expect(fs.readFileSync(rendezvous, 'utf8')).not.toContain('legacy record');
  }, 30_000);

  it('unlock diagnoses without deleting the lock file and fails closed on an active writer', async () => {
    expect(fs.existsSync(cliPath)).toBe(true);
    const plain = spawnSync(process.execPath, [cliPath, 'unlock', projectRoot], {
      encoding: 'utf8',
      timeout: 20_000,
    });
    expect(plain.status).toBe(0);
    expect(plain.stdout + plain.stderr).toMatch(/No active index writer|stable lock file/);

    const lease = await hold();
    const blocked = spawnSync(process.execPath, [cliPath, 'unlock', projectRoot], {
      encoding: 'utf8',
      timeout: 20_000,
    });
    expect(blocked.status).toBe(1);
    expect(blocked.stdout + blocked.stderr).toMatch(/cannot override|No lock file was deleted/);
    expect(fs.existsSync(rendezvous)).toBe(true);

    const forced = spawnSync(process.execPath, [cliPath, 'unlock', projectRoot, '--force'], {
      encoding: 'utf8',
      timeout: 20_000,
    });
    expect(forced.status).toBe(1);
    expect(fs.existsSync(rendezvous)).toBe(true);
    await lease.release();

    const repaired = spawnSync(process.execPath, [cliPath, 'unlock', projectRoot, '--force'], {
      encoding: 'utf8',
      timeout: 20_000,
    });
    expect(repaired.status).toBe(0);
    expect(repaired.stdout + repaired.stderr).toMatch(/repaired/);
    expect(fs.existsSync(rendezvous)).toBe(true);
  }, 60_000);

  it('exposes active-writer owner through the independent channel, never the locked rendezvous', async () => {
    const lease = await hold();
    const diagnostics = readIndexWriteLeaseDiagnostics(projectRoot);
    expect(diagnostics.state).toBe('active-writer');
    expect(diagnostics.owner?.pid).toBe(lease.processId);
    expect(diagnostics.owner!.acquiredAt).toBeGreaterThan(0);
    if (process.platform === 'win32') {
      // fs2's whole-file LockFileEx blocks the rendezvous read cross-process,
      // but the separate sidecar stays readable while the lease is held.
      expect(() => fs.readFileSync(rendezvous, 'utf8')).toThrow();
      expect(fs.readFileSync(diagnosticsPath, 'utf8')).toContain('"pid"');
    }
    await lease.release();
    const after = readIndexWriteLeaseDiagnostics(projectRoot);
    expect(after.state).toBe('not-locked');
    expect(after.owner).toBeNull();
  }, 30_000);

  it('ignores a stale diagnostics channel when no OS writer holds the lease', () => {
    fs.writeFileSync(diagnosticsPath, JSON.stringify({ protocol: 1, pid: 999999, acquiredAt: 123 }));
    const diagnostics = readIndexWriteLeaseDiagnostics(projectRoot);
    expect(diagnostics.state).toBe('not-locked');
    expect(diagnostics.owner).toBeNull();
  }, 30_000);

  it('unlock reports owner diagnostics without deleting the stable lock file', async () => {
    const lease = await hold();
    const blocked = spawnSync(process.execPath, [cliPath, 'unlock', projectRoot], {
      encoding: 'utf8',
      timeout: 20_000,
    });
    expect(blocked.status).toBe(1);
    expect(blocked.stdout + blocked.stderr).toContain(`pid ${lease.processId}`);
    expect(fs.existsSync(rendezvous)).toBe(true);
    await lease.release();
  }, 30_000);
});
