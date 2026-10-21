/**
 * Schema evolution clause (DES-schema-evolution-and-mcp-tool-cap-v1, Clause 1).
 *
 * Any change that adds a NodeKind / EdgeKind / pre-computed table / persisted
 * column MUST bump `CURRENT_SCHEMA_VERSION` to `max(migrations[].version) +
 * 1` in the same commit, and migration versions MUST be strictly increasing.
 *
 * This test mechanically enforces the bump-sync invariant. It does NOT
 * enforce Clause 1.2 (old-CLI/new-library compat strategy written into each
 * migration's `description`) — that is a human review item.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CURRENT_SCHEMA_VERSION } from '../src/db/migrations';

const MIGRATIONS_TS = join(__dirname, '..', 'src', 'db', 'migrations.ts');

/**
 * Extract `version: <number>` entries from the migrations array in source.
 * We intentionally parse the source rather than import the (unexported)
 * `migrations` array so this test also catches a migration entry added
 * without being wired into the array.
 */
function parseMigrationVersions(): number[] {
  const src = readFileSync(MIGRATIONS_TS, 'utf-8');
  const versions: number[] = [];
  // Match `version: <digits>,` lines inside the migrations array.
  for (const m of src.matchAll(/^\s*version:\s*(\d+)\s*,/gm)) {
    versions.push(Number(m[1]));
  }
  return versions;
}

describe('Schema evolution clause (DES-schema-evolution-and-mcp-tool-cap-v1)', () => {
  it('CURRENT_SCHEMA_VERSION equals the maximum declared migration version', () => {
    const versions = parseMigrationVersions();
    expect(versions.length).toBeGreaterThan(0);
    const max = Math.max(...versions);
    expect(CURRENT_SCHEMA_VERSION).toBe(max);
  });

  it('migration versions are strictly increasing in source order', () => {
    const versions = parseMigrationVersions();
    for (let i = 1; i < versions.length; i++) {
      expect(
        versions[i],
        `migration version at index ${i} (${versions[i]}) must be > previous (${versions[i - 1]})`
      ).toBeGreaterThan(versions[i - 1]);
    }
  });

  it('every migration entry carries a non-empty description (Clause 1.2 surface)', () => {
    const src = readFileSync(MIGRATIONS_TS, 'utf-8');
    // Each `version: N,` must be followed by a `description: '...'` (or
    // template literal) within the same object literal. A lightweight
    // structural scan — not a full parser — is sufficient as a tripwire.
    const entries = src.matchAll(
      /version:\s*(\d+)\s*,\s*\n\s*description:\s*([`'"])([\s\S]*?)\2/g
    );
    let count = 0;
    for (const m of entries) {
      count++;
      expect(
        m[3].trim().length,
        `migration v${m[1]} must declare a non-empty description (old-CLI compat strategy)`
      ).toBeGreaterThan(0);
    }
    expect(count).toBeGreaterThan(0);
  });
});
