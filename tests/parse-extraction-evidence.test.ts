import { describe, expect, it, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'parse-extraction-evidence.mjs');

describe('parse extraction evidence summarizer', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes decision-ready JSON and Markdown from a complete profile artifact', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-parse-evidence-'));
    tempDirs.push(dir);
    const profile = path.join(dir, 'profile.json');
    const outJson = path.join(dir, 'summary.json');
    const outMarkdown = path.join(dir, 'summary.md');
    fs.writeFileSync(profile, JSON.stringify({
      generatedAt: '2026-06-21T00:00:00.000Z',
      results: [{
        name: 'fixture',
        sourcePath: '/repo/fixture',
        commit: 'abc1234',
        engines: {
          rust: { peakRssBytes: 123456, rssUnavailableReason: null },
        },
        profile: {
          parseExtractionMs: 42,
          parseSourceReadMs: 3,
          parseNormalizationMs: 4,
          parseParserSetupMs: 5,
          parseTreeSitterMs: 20,
          parseAstExtractionMs: 9,
          parseErrorHandlingMs: 1,
          parseByLanguage: {
            typescript: {
              files: 2,
              parseExtractionMs: 42,
              sourceReadMs: 3,
              normalizationMs: 4,
              parserSetupMs: 5,
              treeSitterMs: 20,
              astExtractionMs: 9,
              errorHandlingMs: 1,
            },
          },
        },
      }],
    }));

    const result = spawnSync(process.execPath, [
      SCRIPT,
      '--profile', profile,
      '--out-json', outJson,
      '--out-md', outMarkdown,
    ], { cwd: REPO_ROOT, encoding: 'utf-8' });

    expect(result.status, result.stderr).toBe(0);
    const summary = JSON.parse(fs.readFileSync(outJson, 'utf-8')) as {
      corpora: Array<{
        name: string;
        dominantParseSubBucket: { name: string; ms: number };
        rss: { peakRssBytes: number | null; unavailableReason: string | null };
        decisionReadiness: { ready: boolean; missing: string[] };
      }>;
    };
    expect(summary.corpora[0]).toMatchObject({
      name: 'fixture',
      dominantParseSubBucket: { name: 'parseTreeSitterMs', ms: 20 },
      rss: { peakRssBytes: 123456, unavailableReason: null },
      decisionReadiness: { ready: true, missing: [] },
    });
    const markdown = fs.readFileSync(outMarkdown, 'utf-8');
    expect(markdown).toContain('| fixture | abc1234 | 42 | parseTreeSitterMs | 20 | 123456 | ready |');
    expect(markdown).toContain('## Per-Language Parse Distribution');
    expect(markdown).toContain('| fixture | typescript | 2 | 42 | 20 | 9 |');
  });

  it('marks older artifacts without parse sub-buckets as not decision-ready', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-parse-evidence-old-'));
    tempDirs.push(dir);
    const profile = path.join(dir, 'profile.json');
    const outJson = path.join(dir, 'summary.json');
    fs.writeFileSync(profile, JSON.stringify({
      results: [{
        name: 'old',
        sourcePath: '/repo/old',
        engines: {
          rust: { peakRssBytes: null, rssUnavailableReason: 'RSS sampling unavailable: fixture' },
        },
        profile: {
          parseExtractionMs: 10,
        },
      }],
    }));

    const result = spawnSync(process.execPath, [
      SCRIPT,
      '--profile', profile,
      '--out-json', outJson,
    ], { cwd: REPO_ROOT, encoding: 'utf-8' });

    expect(result.status, result.stderr).toBe(0);
    const summary = JSON.parse(fs.readFileSync(outJson, 'utf-8')) as {
      corpora: Array<{
        dominantParseSubBucket: { name: string | null; ms: number | null };
        rss: { peakRssBytes: number | null; unavailableReason: string | null };
        decisionReadiness: { ready: boolean; missing: string[] };
      }>;
    };
    expect(summary.corpora[0]?.dominantParseSubBucket).toEqual({ name: null, ms: null });
    expect(summary.corpora[0]?.rss.unavailableReason).toBe('RSS sampling unavailable: fixture');
    expect(summary.corpora[0]?.decisionReadiness.ready).toBe(false);
    expect(summary.corpora[0]?.decisionReadiness.missing).toEqual(expect.arrayContaining([
      'parse sub-buckets',
      'parseByLanguage',
    ]));
  });
});
