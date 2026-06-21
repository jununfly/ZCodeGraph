import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const MODULE = path.resolve(__dirname, '..', 'scripts', 'process-tree-rss.mjs');

describe('process-tree RSS sampler', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('samples process-tree RSS from procfs without invoking ps', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-proc-rss-'));
    tempDirs.push(dir);
    writeStatus(dir, 100, 1, 10);
    writeStatus(dir, 101, 100, 20);
    writeStatus(dir, 102, 101, 30);
    writeStatus(dir, 200, 1, 40);

    const { sampleProcessTreeRssBytes } = await import(MODULE) as {
      sampleProcessTreeRssBytes: (
        pid: number,
        options?: { procRoot?: string; psCommand?: string },
      ) => { peakRssBytes: number | null; unavailableReason: string | null };
    };

    const result = sampleProcessTreeRssBytes(100, {
      procRoot: dir,
      psCommand: 'zcodegraph-nonexistent-ps-for-test',
    });

    expect(result).toEqual({
      peakRssBytes: (10 + 20 + 30) * 1024,
      unavailableReason: null,
    });
  });

  it('falls back to an unavailable reason when procfs and ps are both unavailable', async () => {
    const { sampleProcessTreeRssBytes } = await import(MODULE) as {
      sampleProcessTreeRssBytes: (
        pid: number,
        options?: { procRoot?: string; psCommand?: string },
      ) => { peakRssBytes: number | null; unavailableReason: string | null };
    };

    const result = sampleProcessTreeRssBytes(100, {
      procRoot: path.join(os.tmpdir(), 'zcodegraph-missing-proc-root'),
      psCommand: 'zcodegraph-nonexistent-ps-for-test',
    });

    expect(result.peakRssBytes).toBeNull();
    expect(result.unavailableReason).toContain('RSS sampling unavailable');
  });

  it('can measure a command peak RSS from a time-style wrapper without process-list access', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-time-rss-'));
    tempDirs.push(dir);
    const fakeTime = path.join(dir, process.platform === 'win32' ? 'fake-time.cjs' : 'fake-time');
    fs.writeFileSync(
      fakeTime,
      [
        '#!/usr/bin/env node',
        'const { spawnSync } = require("child_process");',
        'const [command, ...args] = process.argv.slice(2);',
        'const result = spawnSync(command, args, { encoding: "utf-8" });',
        'process.stdout.write(result.stdout || "");',
        'process.stderr.write(result.stderr || "");',
        'process.stderr.write("\\n12345  maximum resident set size\\n");',
        'process.exit(result.status ?? 1);',
        '',
      ].join('\n'),
    );
    fs.chmodSync(fakeTime, 0o755);

    const { spawnMeasured } = await import(MODULE) as {
      spawnMeasured: (
        command: string,
        args: string[],
        options?: {
          rssMode?: 'process-tree' | 'command';
          timeCommand?: string;
          procRoot?: string;
          psCommand?: string;
        },
      ) => Promise<{
        code: number | null;
        peakRssBytes: number | null;
        rssUnavailableReason: string | null;
      }>;
    };

    const result = await spawnMeasured(process.execPath, ['-e', 'process.stdout.write("ok")'], {
      rssMode: 'command',
      timeCommand: fakeTime,
      procRoot: path.join(os.tmpdir(), 'zcodegraph-missing-proc-root'),
      psCommand: 'zcodegraph-nonexistent-ps-for-test',
    });

    expect(result.code).toBe(0);
    expect(result.peakRssBytes).toBe(12345);
    expect(result.rssUnavailableReason).toBeNull();
  });

  it('records a specific unavailable reason when command RSS wrapper cannot report peak RSS', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-time-rss-missing-'));
    tempDirs.push(dir);
    const fakeTime = path.join(dir, process.platform === 'win32' ? 'fake-time.cjs' : 'fake-time');
    fs.writeFileSync(
      fakeTime,
      [
        '#!/usr/bin/env node',
        'const { spawnSync } = require("child_process");',
        'const [command, ...args] = process.argv.slice(2);',
        'const result = spawnSync(command, args, { encoding: "utf-8" });',
        'process.stdout.write(result.stdout || "");',
        'process.stderr.write(result.stderr || "");',
        'process.exit(result.status ?? 1);',
        '',
      ].join('\n'),
    );
    fs.chmodSync(fakeTime, 0o755);

    const { spawnMeasured } = await import(MODULE) as {
      spawnMeasured: (
        command: string,
        args: string[],
        options?: { rssMode?: 'process-tree' | 'command'; timeCommand?: string },
      ) => Promise<{ peakRssBytes: number | null; rssUnavailableReason: string | null }>;
    };

    const result = await spawnMeasured(process.execPath, ['-e', '0'], {
      rssMode: 'command',
      timeCommand: fakeTime,
    });

    expect(result.peakRssBytes).toBeNull();
    expect(result.rssUnavailableReason).toContain('command RSS sampling did not report maximum resident set size');
  });
});

function writeStatus(procRoot: string, pid: number, ppid: number, rssKb: number) {
  const dir = path.join(procRoot, String(pid));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'status'),
    [
      `Name:\tfixture-${pid}`,
      `Pid:\t${pid}`,
      `PPid:\t${ppid}`,
      `VmRSS:\t${rssKb} kB`,
      '',
    ].join('\n'),
  );
}
