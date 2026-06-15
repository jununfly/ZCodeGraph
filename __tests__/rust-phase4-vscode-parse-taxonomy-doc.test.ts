import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-13-rust-indexing-core-phase-4-vscode-profile.raw.json',
);
const DOC = path.join(
  REPO_ROOT,
  'docs',
  'benchmarks',
  '2026-06-13-rust-indexing-core-phase-4-vscode-parse-error-taxonomy.md',
);

function parseErrorPaths(): string[] {
  const profile = JSON.parse(fs.readFileSync(PROFILE, 'utf-8'));
  return profile.results[0].result.errors.map((error: { message: string }) =>
    error.message.replace(/: parse error$/, ''),
  );
}

describe('Rust indexing Phase 4 VS Code parse-error taxonomy', () => {
  it('classifies every VS Code large-target parse error from the raw profile artifact', () => {
    const text = fs.readFileSync(DOC, 'utf-8');
    const lowerText = text.toLowerCase();

    expect(text).toContain('#86');
    expect(text).toContain('46');
    expect(text).toContain('Intentional invalid fixture / malformed test input');
    expect(text).toContain('Generated or prompt-heavy source not meant as normal app code');
    expect(text).toContain('Real supported JS/TS syntax gap');
    expect(text).toContain('Unknown');
    expect(lowerText).toContain('default rollout');

    for (const errorPath of parseErrorPaths()) {
      expect(text, `missing taxonomy entry for ${errorPath}`).toContain(errorPath);
    }
  });
});
