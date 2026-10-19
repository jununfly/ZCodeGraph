import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'summarize-dhat.mjs');

describe('dhat heap summary HTML', () => {
  it('summarizes heap totals and top allocation sites into static HTML', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-dhat-summary-'));
    try {
      const report = path.join(temp, 'dhat-heap.json');
      const html = path.join(temp, 'dhat-summary.html');
      fs.writeFileSync(
        report,
        JSON.stringify(
          {
            dhatFileVersion: 2,
            mode: 'heap',
            pps: [
              { tb: 4096, mb: 2048, fs: [0] },
              { tb: 1024, mb: 512, fs: [1] },
            ],
            ftbl: ['parse_file (src/lib.rs:10:2)', 'insert_nodes (src/db.rs:44:4)'],
          },
          null,
          2,
        ),
      );

      const result = spawnSync(process.execPath, [SCRIPT, report], {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
      });

      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
      expect(result.stdout.trim()).toBe(html);
      const text = fs.readFileSync(html, 'utf-8');
      expect(text).toContain('<!doctype html>');
      expect(text).toContain('Total allocations');
      expect(text).toContain('Peak heap');
      expect(text).toContain('Top 20 allocations by size');
      expect(text).toContain('Top 20 allocations by call site');
      expect(text).toContain('parse_file');
      expect(text).toContain('src/lib.rs:10:2');
      expect(text).not.toContain('https://');
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});
