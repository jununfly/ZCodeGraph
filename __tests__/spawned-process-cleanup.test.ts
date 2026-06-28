import { describe, expect, it } from 'vitest';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { removeTempDirWithRetries, terminateSpawnedProcess } from './helpers/spawned-process-cleanup';

describe('spawned process cleanup helper', () => {
  it('waits for the child process to close after requesting termination', async () => {
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000);'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let closeObserved = false;
    child.once('close', () => {
      closeObserved = true;
    });

    await terminateSpawnedProcess(child, { timeoutMs: 2000 });

    expect(closeObserved).toBe(true);
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
  });

  it('retries transient Windows-style temp directory removal failures', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-cleanup-retry-'));
    const realRmSync = fs.rmSync;
    let calls = 0;
    const flakyRemove: typeof fs.rmSync = (target, options) => {
      calls++;
      if (calls === 1) {
        const error = new Error('file handle still closing') as NodeJS.ErrnoException;
        error.code = 'EPERM';
        throw error;
      }
      return realRmSync(target, options);
    };

    try {
      await removeTempDirWithRetries(dir, { retries: 1, delayMs: 1, removeDir: flakyRemove });
      expect(fs.existsSync(dir)).toBe(false);
      expect(calls).toBe(2);
    } finally {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
