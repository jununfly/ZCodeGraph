/**
 * Contract test: the EXTRACTION_VERSION constant must be kept equal across the
 * TypeScript extractor and the Rust indexing core.
 *
 * The Rust side (`crates/zcodegraph-core/src/lib.rs`) is the real indexer in
 * rust-hybrid mode and stamps `indexed_with_extraction_version` into the DB;
 * the TypeScript side (`src/extraction/extraction-version.ts`) is what
 * `zcodegraph status` / `isIndexStale()` read to decide whether an on-disk
 * index is stale and needs a rebuild. If the two ever drift, the staleness
 * signal compares against the wrong baseline silently. Both files already
 * carry "keep the two equal" comments; this test makes that a hard guarantee.
 *
 * This is a static source read, not a build artifact check, so it runs without
 * compiling either side.
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = path.resolve(__dirname, '..');
const TS_FILE = path.join(root, 'src', 'extraction', 'extraction-version.ts');
const RUST_FILE = path.join(root, 'crates', 'zcodegraph-core', 'src', 'lib.rs');

function readConstant(file: string, pattern: RegExp, label: string): number {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`${label}: could not find the EXTRACTION_VERSION constant in ${file}`);
  }
  const value = Number(match[1]);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label}: EXTRACTION_VERSION must be a positive integer, got "${match[1]}"`);
  }
  return value;
}

describe('EXTRACTION_VERSION TS/Rust mirror contract', () => {
  it('keeps the TypeScript and Rust constants equal', () => {
    const tsVersion = readConstant(
      TS_FILE,
      /export const EXTRACTION_VERSION\s*=\s*(\d+)/,
      'TypeScript',
    );
    const rustVersion = readConstant(
      RUST_FILE,
      /const EXTRACTION_VERSION:\s*i64\s*=\s*(\d+)/,
      'Rust',
    );

    expect(rustVersion).toBe(tsVersion);
  });

  it('declares exactly one constant definition on each side', () => {
    // Guards against an accidental second definition shadowing the one the
    // contract reads (e.g. a test/debug override left behind).
    const tsSource = fs.readFileSync(TS_FILE, 'utf8');
    const rustSource = fs.readFileSync(RUST_FILE, 'utf8');

    const tsDefs = tsSource.match(/export const EXTRACTION_VERSION\s*=\s*\d+/g) ?? [];
    const rustDefs = rustSource.match(/const EXTRACTION_VERSION:\s*i64\s*=\s*\d+/g) ?? [];

    expect(tsDefs).toHaveLength(1);
    expect(rustDefs).toHaveLength(1);
  });
});
