import { describe, expect, it, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'targeted-profile-evidence.mjs');

describe('targeted profile evidence runner', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('records RSS unavailable reason without failing a successful command', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-targeted-profile-'));
    tempDirs.push(dir);
    const out = path.join(dir, 'evidence.json');

    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--out',
        out,
        '--cwd',
        dir,
        '--',
        process.execPath,
        '-e',
        'process.stdout.write("profile-ok\\n")',
      ],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          ZCODEGRAPH_RSS_PS_COMMAND: 'zcodegraph-nonexistent-ps-for-test',
        },
        encoding: 'utf-8',
      },
    );

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toBe('profile-ok\n');
    expect(fs.existsSync(out)).toBe(true);

    const artifact = JSON.parse(fs.readFileSync(out, 'utf-8')) as {
      status: string;
      exitCode: number;
      wallMs: number;
      peakRssBytes: number | null;
      rssUnavailableReason: string | null;
    };

    expect(artifact.status).toBe('completed');
    expect(artifact.exitCode).toBe(0);
    expect(artifact.wallMs).toBeGreaterThanOrEqual(0);
    expect(artifact.peakRssBytes).toBeNull();
    expect(artifact.rssUnavailableReason).toContain('RSS sampling unavailable');
  });
});
