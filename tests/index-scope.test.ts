/**
 * Unit tests for the index-scope configuration (roadmap 1-2-9).
 *
 * Covers:
 *   - `loadProjectConfig` reading `zcodegraph.json` (valid / missing / malformed)
 *   - `buildDefaultIgnore` excluding agent work dirs by default
 *   - `buildDefaultIgnore` honoring user-supplied `exclude` globs from config
 *
 * These tests operate on the ignore matcher directly (no git, no SQLite).
 * The e2e CLI coverage is in `tests/cli-index-scope.test.ts`.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildDefaultIgnore } from '../src/extraction';
import { loadProjectConfig, PROJECT_CONFIG_FILENAME } from '../src/config/project-config';

describe('loadProjectConfig', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zg-cfg-'));
  });
  afterEach(() => {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });

  it('returns {} when zcodegraph.json is missing', () => {
    expect(loadProjectConfig(dir)).toEqual({});
  });

  it('returns {} when zcodegraph.json is invalid JSON', () => {
    fs.writeFileSync(path.join(dir, PROJECT_CONFIG_FILENAME), '{not json', 'utf-8');
    expect(loadProjectConfig(dir)).toEqual({});
  });

  it('returns {} when the root is not an object', () => {
    fs.writeFileSync(path.join(dir, PROJECT_CONFIG_FILENAME), '[]', 'utf-8');
    expect(loadProjectConfig(dir)).toEqual({});
  });

  it('parses a valid exclude list and filters non-strings', () => {
    fs.writeFileSync(
      path.join(dir, PROJECT_CONFIG_FILENAME),
      JSON.stringify({ exclude: ['notes/**', 42, null, 'scratch/*.ts', ''] }),
      'utf-8',
    );
    expect(loadProjectConfig(dir)).toEqual({
      exclude: ['notes/**', 'scratch/*.ts'],
    });
  });
});

describe('buildDefaultIgnore: agent work dirs', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zg-ig-'));
  });
  afterEach(() => {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });

  it('excludes .workbuddy/, .claude/, .cursor/ and other agent work dirs by default', () => {
    const ig = buildDefaultIgnore(dir);
    expect(ig.ignores('.workbuddy/')).toBe(true);
    expect(ig.ignores('.workbuddy/notes.md')).toBe(true);
    expect(ig.ignores('.claude/')).toBe(true);
    expect(ig.ignores('.cursor/')).toBe(true);
    expect(ig.ignores('.codex/')).toBe(true);
    expect(ig.ignores('.opencode/')).toBe(true);
    expect(ig.ignores('.gemini/')).toBe(true);
    expect(ig.ignores('.continue/')).toBe(true);
    expect(ig.ignores('.windsurf/')).toBe(true);
    expect(ig.ignores('.zed/')).toBe(true);
    expect(ig.ignores('.aider/')).toBe(true);
    expect(ig.ignores('.codeium/')).toBe(true);
    expect(ig.ignores('.cody/')).toBe(true);
    expect(ig.ignores('.tabnine/')).toBe(true);
    expect(ig.ignores('.amazonq/')).toBe(true);
  });

  it('still excludes node_modules/ and other built-in defaults', () => {
    const ig = buildDefaultIgnore(dir);
    expect(ig.ignores('node_modules/')).toBe(true);
    expect(ig.ignores('node_modules/lodash/index.js')).toBe(true);
    expect(ig.ignores('dist/')).toBe(true);
    expect(ig.ignores('target/')).toBe(true);
  });

  it('does NOT exclude normal source dirs', () => {
    const ig = buildDefaultIgnore(dir);
    expect(ig.ignores('src/')).toBe(false);
    expect(ig.ignores('src/index.ts')).toBe(false);
    expect(ig.ignores('tests/foo.test.ts')).toBe(false);
  });

  it('lets .gitignore `!negation` opt back into an agent work dir', () => {
    fs.writeFileSync(path.join(dir, '.gitignore'), '!.workbuddy/\n', 'utf-8');
    const ig = buildDefaultIgnore(dir);
    expect(ig.ignores('.workbuddy/')).toBe(false);
  });

  it('appends zcodegraph.json exclude globs on top of defaults', () => {
    fs.writeFileSync(
      path.join(dir, PROJECT_CONFIG_FILENAME),
      JSON.stringify({ exclude: ['notes/**', 'scratch/*.ts'] }),
      'utf-8',
    );
    const ig = buildDefaultIgnore(dir);
    // User globs hit
    expect(ig.ignores('notes/notes.md')).toBe(true);
    expect(ig.ignores('notes/deep/file.md')).toBe(true);
    expect(ig.ignores('scratch/foo.ts')).toBe(true);
    // Built-in defaults still active
    expect(ig.ignores('.workbuddy/')).toBe(true);
    expect(ig.ignores('node_modules/')).toBe(true);
    // Normal sources untouched
    expect(ig.ignores('src/index.ts')).toBe(false);
  });
});
