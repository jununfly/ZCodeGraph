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
