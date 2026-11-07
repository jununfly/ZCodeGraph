import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  acquireIndexWriteLease,
  diagnoseIndexWriteLease,
  repairIndexWriteLeaseMetadata,
  IndexWriteLeaseBusyError,
  type NativeIndexWriteLease,
} from '../src/indexing/index-write-lease';

/**
 * ADR-0011 Required verification items 1, 2, 5 and 6 (process-level subset).
 * These are real native processes, not mocks: the Rust helper owns the sole OS
 * lock handle on `.zcodegraph/zcodegraph.lock`.
 */
describe('index write lease (native process)', () => {
  const cliPath = path.resolve(__dirname, '../dist/bin/zcodegraph.js');
  let projectRoot: string;
  let rendezvous: string;
  let leases: NativeIndexWriteLease[];

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zcg-index-lease-'));
    const store = path.join(projectRoot, '.zcodegraph');
    fs.mkdirSync(store, { recursive: true });
    // `isInitialized` requires the DB path to exist; unlock never opens it.
    fs.writeFileSync(path.join(store, 'zcodegraph.db'), '');
    rendezvous = path.join(store, 'zcodegraph.lock');
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
});
