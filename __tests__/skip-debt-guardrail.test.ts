import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * #692 wave-0 (roadmap 1-6-5-3) skip-debt + CI-filter guardrails.
 *
 * Pure source-level audit: it indexes nothing and spawns no Rust binary, so it
 * runs on every platform and as part of any vitest invocation. It enforces two
 * invariants that the wave-0 cleanup relied on:
 *
 *  1. Skipped tests are deliberate debt. Every retained `describe.skip` /
 *     `it.skip` must (a) be on a frozen allowlist (so a new skip can't appear
 *     silently) and (b) carry a tracker in a preceding comment — a gap id
 *     (G1..G10), a roadmap node (1-x-y), or a GitHub issue (#nnn). `.only` is
 *     forbidden outright.
 *
 *  2. CI `-t` name filters stay in sync with real test names. vitest's `-t`
 *     pattern silently runs ZERO tests (CI stays green) when no test name
 *     matches, so every name in ci.yml's `-t "…|…|…"` filters must correspond
 *     to an actual `it(…)` / `test(…)` title. Renaming a test therefore forces
 *     a ci.yml update or this guard fails.
 */
const root = path.resolve(__dirname, '..');
const testsDir = path.join(root, '__tests__');
const ciPath = path.join(root, '.github', 'workflows', 'ci.yml');

// Matches a real (non-commented) describe.skip( / it.skip( line and captures
// the test kind and the string-literal title.
const SKIP_RE = /^\s*(describe|it|test)\.skip\(\s*(['"`])([\s\S]*?)\2/;
// A tracker that justifies why the skip is still allowed.
const TRACKER_RE = /(?:#\d{2,})|(?:\bG\d+\b)|(?:\broadmap\s+1-\d+(?:-\d+)*)|(?:\bissue\b)/i;
const TITLE_RE = /\b(?:it|test)\(\s*(['"`])([\s\S]*?)\1/g;

// The exact, frozen set of skips wave 0 left behind — all are real Rust
// extraction gaps, each mapped to a gap id + roadmap node in its comment.
// Any change here must be a deliberate wave-N decision, not a drive-by skip.
// (B/C c/cpp include e2e were on this list as G10 but were removed once the
// G10 file-node basename normalization shipped and the tests were re-activated.
// The C++ free-function describe was on this list as G1 and was removed once
// trailing-return-type naming was fixed in the Rust core and it was
// re-activated on rust-hybrid.)
// The wave-0 / roadmap 1-2-1-1 Java skip inventory is now EMPTY: G5/G6's dead
// legacy-TS-engine describe was deleted (replaced by the pure-Rust
// "Java semantic gaps G5-G9" fixtures), and the G7 end-to-end describe and G9
// static-value-read `it` were re-activated on rust-hybrid once the Rust core
// emitted decorates / references / instantiates refs. Keep this list empty so
// any NEW skip fails loudly; add an entry here only with a tracker comment.
const ALLOWED_SKIPS: ReadonlyArray<{ file: string; kind: string; title: string }> = [];

function listTestFiles(): string[] {
  return fs
    .readdirSync(testsDir)
    .filter((f) => f.endsWith('.test.ts'))
    .sort();
}

interface SkipSite {
  file: string;
  kind: string;
  title: string;
  line: number;
  tracked: boolean;
}

function collectSites(): { skips: SkipSite[]; onlyHits: string[]; titles: Set<string> } {
  const skips: SkipSite[] = [];
  const onlyHits: string[] = [];
  const titles = new Set<string>();

  for (const file of listTestFiles()) {
    const full = path.join(testsDir, file);
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();

      // Strip line comments so commented-out examples are never counted.
      const code = line.startsWith('//') ? '' : rawLine;

      const skipMatch = SKIP_RE.exec(code);
      if (skipMatch) {
        const kind = skipMatch[1]!;
        const title = skipMatch[3]!;
        // Search a generous preceding comment window for a tracker token.
        const windowStart = Math.max(0, idx - 18);
        const windowText = lines.slice(windowStart, idx + 1).join('\n');
        skips.push({
          file,
          kind,
          title,
          line: idx + 1,
          tracked: TRACKER_RE.test(windowText),
        });
      }

      // A leftover .only silently narrows the suite — never allowed.
      if (/^\s*(?:describe|it|test)\.only\(/.test(code)) {
        onlyHits.push(`${file}:${idx + 1}`);
      }

      // Gather every real test title for the CI -t sync check (comments never
      // begin with it(/test( after optional whitespace, so a simple trim works).
      for (const m of code.matchAll(TITLE_RE)) {
        titles.add(m[2]!);
      }
    });
  }

  return { skips, onlyHits, titles };
}

describe('skip-debt and CI guardrails (#692 wave 0, roadmap 1-6-5-3)', () => {
  const { skips, onlyHits, titles } = collectSites();

  it('retains exactly the frozen set of tracked skips — no silent new skip debt', () => {
    const actual = skips.map((s) => `${s.file}::${s.kind}::${s.title}`).sort();
    const expected = ALLOWED_SKIPS.map((s) => `${s.file}::${s.kind}::${s.title}`).sort();

    const extra = actual.filter((s) => !expected.includes(s));
    const missing = expected.filter((s) => !actual.includes(s));

    expect(
      extra,
      `new untracked skip site(s): ${extra.join(' | ') || '(none)'} — either resolve the gap or add it to the wave-N inventory with a tracker`,
    ).toEqual([]);
    expect(
      missing,
      `expected skip site(s) disappeared: ${missing.join(' | ') || '(none)'} — if the gap is fixed, remove it from the allowlist in the same change`,
    ).toEqual([]);
    expect(skips).toHaveLength(ALLOWED_SKIPS.length);
  });

  it('every retained skip carries a tracker (gap id G#, roadmap node, or issue #)', () => {
    const untracked = skips.filter((s) => !s.tracked);
    expect(
      untracked.map((s) => `${s.file}:${s.line} [${s.kind}] ${s.title}`),
      'each skip must reference a gap id / roadmap node / issue in a preceding comment',
    ).toEqual([]);
  });

  it('never leaves a focused .only in the suite', () => {
    expect(onlyHits, `.only found at: ${onlyHits.join(', ')}`).toEqual([]);
  });

  it('keeps every ci.yml `-t` filter branch runnable (each regex matches a real test)', () => {
    const workflow = fs.readFileSync(ciPath, 'utf8');
    const branches: string[] = [];
    // A `-t "a|b|c"` value may sit inline or on a YAML continuation line.
    for (const m of workflow.matchAll(/(?:^|[\s])-t\s*(['"`])([\s\S]*?)\1/gm)) {
      for (const part of m[2]!.split('|')) {
        const branch = part.trim();
        if (branch) branches.push(branch);
      }
    }

    expect(branches.length, 'ci.yml should keep at least one -t filter').toBeGreaterThan(0);
    // vitest treats -t as a RAW regexp and marks non-matching tests skipped —
    // a filter that matches no title silently runs zero tests (CI stays green).
    // It is matched against each test's own title here; matching a real title
    // implies a match against that test's full name as well. This also catches
    // regex-metacharacter mistakes (e.g. an unescaped `C++` / `(...)` fragment).
    const dead = branches.filter((branch) => {
      let re: RegExp;
      try {
        re = new RegExp(branch);
      } catch {
        return true; // invalid regexp -> definitely runs nothing
      }
      return ![...titles].some((title) => re.test(title));
    });
    expect(
      dead,
      `ci.yml -t branch(es) match NO test (would silently run 0): ${dead.join(' | ') || '(none)'} — sync the filter after renaming/removing a test`,
    ).toEqual([]);
  });
});
