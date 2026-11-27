/**
 * R4 of roadmap 1-9-15-4 — integration into the main resolution loop.
 *
 * The precise overload resolver is wired into `ReferenceResolver.resolveOne`
 * so that Java `calls` refs with a `zcgJavaCall.v1` envelope are resolved by
 * the precise path FIRST, and the legacy loose fallback is NOT entered when
 * the precise path abstains.
 *
 * Pinned behaviors:
 *   - Java calls ref with complete envelope → resolved by exact-match
 *   - Java calls ref with incomplete envelope → unresolved (no legacy fallback)
 *   - Java calls ref with malformed metadata → unresolved (fail-closed)
 *   - Non-Java calls ref → unaffected (legacy path still works)
 *   - ZCG_ENABLE_JAVA_OVERLOAD=0 → precise path disabled, legacy path used
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CodeGraph } from '../src';
import { readBooleanFlag } from '../src/config/flags';
import {
  makeRustIndexingTempProject,
  RUST_CORE_BIN,
} from './helpers/rust-indexing-cli';

describe('Java overload integration (roadmap 1-9-15-4 R4)', () => {
  let tempDir: string;

  beforeAll(() => {
    execFileSync('cargo', ['build', '--package', 'zcodegraph-core'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
  }, 60_000);

  beforeEach(() => {
    tempDir = makeRustIndexingTempProject();
    vi.stubEnv('ZCG_ENABLE_JAVA_OVERLOAD', '1');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function indexWithRust(): void {
    const result = spawnSync(RUST_CORE_BIN, [
      'index',
      '--engine',
      'rust',
      '--project-path',
      tempDir,
      '--index-path',
      path.join(tempDir, '.zcodegraph', 'zcodegraph.db'),
    ], { cwd: tempDir, encoding: 'utf-8' });
    expect(result.status, `rust index failed\n${result.stdout}\n${result.stderr}`).toBe(0);
  }

  function writeFile(relPath: string, contents: string): void {
    const full = path.join(tempDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }

  function openGraph(): CodeGraph {
    return CodeGraph.openSync(tempDir);
  }

  it('registers the opt-in flag and keeps invalid values disabled', () => {
    expect(readBooleanFlag('ZCG_ENABLE_JAVA_OVERLOAD', {
      env: {}, onWarning: () => undefined,
    })).toBe(false);
    expect(readBooleanFlag('ZCG_ENABLE_JAVA_OVERLOAD', {
      env: { ZCG_ENABLE_JAVA_OVERLOAD: 'true' }, onWarning: () => undefined,
    })).toBe(true);
    expect(readBooleanFlag('ZCG_ENABLE_JAVA_OVERLOAD', {
      env: { ZCG_ENABLE_JAVA_OVERLOAD: 'invalid' }, onWarning: () => undefined,
    })).toBe(false);
  });

  // ── 1. precise path produces an edge in the main loop ───────────────────
  it('produces a calls edge via the precise overload path', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner {',
      '  public void find(String name, boolean active) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner) {',
      '    owner.find("x", true);',
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const cg = openGraph();
    try {
      // Rust CLI only extracts; the public SDK explicitly drives the TS loop.
      const resolution = cg.resolveReferences();
      expect(resolution.stats.byMethod['exact-match']).toBe(1);
      expect(resolution.stats.timings).not.toHaveProperty('javaOverloadAccess');
      const access = (cg as unknown as {
        resolver: { javaAccessModel: { getDiagnostics(): Record<string, number> } };
      }).resolver.javaAccessModel;
      expect(access.getDiagnostics()).toEqual({
        'pre-prewarm': 0,
        hydration: 1,
        ready: 1,
      });
      const callers = cg.getCallers(
        cg.getNodesByName('find').find((n) => n.filePath === ownerPath)!.id,
      );
      expect(callers.length).toBeGreaterThan(0);
      const caller = callers.find((c) => c.node.filePath === examplePath);
      expect(caller?.node.name).toBe('run');
      expect(caller?.edge.metadata).toMatchObject({ confidence: 1, resolvedBy: 'exact-match' });
    } finally {
      cg.close();
    }
  });

  // ── 2. incomplete envelope does NOT trigger legacy fallback ─────────────
  it('does not produce a calls edge when the envelope is incomplete', () => {
    const examplePath = 'demo/Example.java';
    // Constructor caller → complete=false. The legacy loose path would
    // still try to match by name; the precise path must abstain.
    writeFile(examplePath, [
      'package demo;',
      'public class Owner { public void find(String s) {} }',
      'public class Example {',
      '  public Example(Owner owner) {',
      '    owner.find("x");',
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const cg = openGraph();
    try {
      const resolution = cg.resolveReferences();
      expect(resolution.stats.byMethod['exact-match']).toBeUndefined();
      const callers = cg.getCallers(
        cg.getNodesByName('find').find((n) => n.filePath === examplePath)!.id,
      );
      // The constructor caller should NOT produce an edge.
      const constructorCaller = callers.find(
        (c) => c.name === 'Example' && c.kind === 'method',
      );
      expect(constructorCaller).toBeUndefined();
    } finally {
      cg.close();
    }
  });

  // ── 3. non-Java path is unaffected ──────────────────────────────────────
  it('does not affect TypeScript resolution', () => {
    const tsPath = 'demo/helper.ts';
    const mainPath = 'demo/main.ts';
    writeFile(tsPath, 'export function helper(): void {}\n');
    writeFile(mainPath, [
      'import { helper } from "./helper";',
      'helper();',
      '',
    ].join('\n'));
    indexWithRust();
    const cg = openGraph();
    try {
      const resolution = cg.resolveReferences();
      expect(resolution.stats.timings).not.toHaveProperty('javaOverloadAccess');
      const callers = cg.getCallers(
        cg.getNodesByName('helper').find((n) => n.filePath === tsPath)!.id,
      );
      expect(callers.length).toBeGreaterThan(0);
    } finally {
      cg.close();
    }
  });

  // ── 4. ZCG_ENABLE_JAVA_OVERLOAD=0 disables the precise path ─────────────
  it('falls back to legacy when ZCG_ENABLE_JAVA_OVERLOAD=0', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner {',
      '  public void find(String name, boolean active) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner) {',
      '    owner.find("x", true);',
      '  }',
      '}',
      '',
    ].join('\n'));
    // Index with the precise path disabled.
    const env = { ...process.env, ZCG_ENABLE_JAVA_OVERLOAD: '0' };
    const result = spawnSync(RUST_CORE_BIN, [
      'index',
      '--engine',
      'rust',
      '--project-path',
      tempDir,
      '--index-path',
      path.join(tempDir, '.zcodegraph', 'zcodegraph.db'),
    ], { cwd: tempDir, encoding: 'utf-8', env });
    expect(result.status).toBe(0);
    const cg = openGraph();
    try {
      // The flag is read at TS resolution time, not by the Rust extractor.
      vi.stubEnv('ZCG_ENABLE_JAVA_OVERLOAD', '0');
      const resolution = cg.resolveReferences();
      expect(resolution.stats.byMethod['exact-match']).toBeUndefined();
      expect(resolution.stats.resolved).toBeGreaterThan(0);
      expect(resolution.stats.timings).not.toHaveProperty('javaOverloadAccess');
      const callers = cg.getCallers(
        cg.getNodesByName('find').find((n) => n.filePath === ownerPath)!.id,
      );
      expect(callers.length).toBeGreaterThan(0);
    } finally {
      cg.close();
    }
  });

  it('retains terminal Java abstentions through batched resolution', async () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner { public void find(String name) {} }',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public Example(Owner owner) { owner.find("x"); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const cg = openGraph();
    const db = (cg as unknown as { db: { getDb(): { prepare(sql: string): { get(...args: unknown[]): unknown } } } }).db.getDb();
    try {
      const resolution = await cg.resolveReferencesBatched();
      expect(resolution.stats.byMethod['exact-match']).toBeUndefined();
      expect(resolution.stats.timings).not.toHaveProperty('javaOverloadAccess');
      const access = (cg as unknown as {
        resolver: { javaAccessModel: { getDiagnostics(): Record<string, number> } };
      }).resolver.javaAccessModel;
      expect(access.getDiagnostics()).toMatchObject({
        hydration: 1,
        ready: 1,
      });
      const retained = db.prepare(
        "SELECT COUNT(*) AS count FROM unresolved_refs WHERE reference_kind = 'calls' AND file_path = ?1",
      ).get(examplePath) as { count: number };
      expect(retained.count).toBe(1);
    } finally {
      cg.close();
    }
  });

  it('continues past a retained Java abstention to later batched references', async () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    const helperPath = 'demo/helper.ts';
    const mainPath = 'demo/main.ts';
    fs.rmSync(path.join(tempDir, 'a.ts'));
    writeFile(ownerPath, 'package demo; public class Owner { public void find(String s) {} }\n');
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public Example(Owner owner) { owner.find("x"); }',
      '}',
      '',
    ].join('\n'));
    writeFile(helperPath, 'export function helper(): void {}\n');
    writeFile(mainPath, [
      'import { helper } from "./helper";',
      'helper();',
      '',
    ].join('\n'));
    indexWithRust();
    const cg = openGraph();
    const db = (cg as unknown as { db: { getDb(): { prepare(sql: string): { all(...args: unknown[]): unknown[]; get(...args: unknown[]): unknown } } } }).db.getDb();
    try {
      const first = db.prepare("SELECT id, file_path AS filePath FROM unresolved_refs ORDER BY id LIMIT 1").get() as { filePath: string };
      expect(first.filePath).toBe(examplePath);
      // Rust has already resolved and removed its own helper() reference.
      // Reintroduce that fact for the TS batch seam, after the retained Java
      // row, so this test cannot mistake Rust's completed work for TS work.
      const caller = db.prepare(
        "SELECT id FROM nodes WHERE file_path = ?1 AND kind = 'file'",
      ).get(mainPath) as { id: string };
      db.prepare(
        "INSERT INTO unresolved_refs (from_node_id, reference_name, reference_kind, line, col, file_path, language) VALUES (?1, 'helper', 'calls', 2, 0, ?2, 'typescript')",
      ).run(caller.id, mainPath);
      expect(db.prepare('SELECT COUNT(*) AS count FROM unresolved_refs').get()).toEqual({ count: 2 });
      const resolver = (cg as unknown as {
        resolver: { resolveAndPersistBatched(onProgress?: undefined, batchSize?: number): Promise<ReturnType<CodeGraph['resolveReferences']>> };
      }).resolver;
      const resolution = await resolver.resolveAndPersistBatched(undefined, 1);
      expect(resolution.stats.byMethod['exact-match']).toBe(1);
      expect(resolution.stats.total).toBe(2);
      expect(cg.getCallers(
        cg.getNodesByName('find').find((node) => node.filePath === ownerPath)!.id,
      )).toEqual([]);
      expect(cg.getCallers(cg.getNodesByName('helper')[0]!.id).length).toBeGreaterThan(0);
      expect(db.prepare(
        "SELECT file_path AS filePath FROM unresolved_refs WHERE reference_kind = 'calls'",
      ).all()).toEqual([{ filePath: examplePath }]);
    } finally {
      cg.close();
    }
  });

  it('abstains safely for a Rust-native minimal incomplete envelope', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner { public void find(String name) {} }',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner) { owner.find("x"); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const cg = openGraph();
    const db = (cg as unknown as { db: { getDb(): { prepare(sql: string): { get(...args: unknown[]): unknown; run(...args: unknown[]): unknown } } } }).db.getDb();
    try {
      db.prepare(
        "UPDATE unresolved_refs SET metadata = ?1 WHERE reference_kind = 'calls' AND file_path = ?2",
      ).run(JSON.stringify({
        zcgJavaCall: {
          v: 1,
          methodName: 'find',
          complete: false,
          reason: 'argument-count',
        },
      }), examplePath);

      expect(() => cg.resolveReferences()).not.toThrow();
      expect(cg.getCallers(cg.getNodesByName('find')[0]!.id)).toEqual([]);
      expect(db.prepare(
        "SELECT COUNT(*) AS count FROM unresolved_refs WHERE reference_kind = 'calls' AND file_path = ?1",
      ).get(examplePath)).toEqual({ count: 1 });
    } finally {
      cg.close();
    }
  });

  it('refuses an envelope borrowed from another caller', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner { public void find(String name) {} }',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void good(Owner owner) { owner.find("x"); }',
      '  public void bad(Owner owner) { owner.find("y"); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const cg = openGraph();
    const db = (cg as unknown as { db: { getDb(): { prepare(sql: string): { get(...args: unknown[]): unknown; run(...args: unknown[]): unknown } } } }).db.getDb();
    try {
      const good = db.prepare(
        "SELECT id, metadata FROM unresolved_refs WHERE reference_kind = 'calls' AND file_path = ?1 AND line = 3",
      ).get(examplePath) as { id: number; metadata: string };
      const bad = db.prepare(
        "SELECT id FROM unresolved_refs WHERE reference_kind = 'calls' AND file_path = ?1 AND line = 4",
      ).get(examplePath) as { id: number };
      db.prepare('UPDATE unresolved_refs SET metadata = ?1 WHERE id = ?2').run(good.metadata, bad.id);

      const resolution = cg.resolveReferences();
      expect(resolution.stats.byMethod['exact-match']).toBe(1);
      const callers = cg.getCallers(cg.getNodesByName('find')[0]!.id);
      expect(callers.map((c) => c.node.name)).toEqual(['good']);
      expect(db.prepare('SELECT COUNT(*) AS count FROM unresolved_refs WHERE id = ?1').get(bad.id)).toEqual({ count: 1 });
    } finally {
      cg.close();
    }
  });

  it('starts a fresh terminal-evidence read for a new public resolution transaction', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, 'package demo; public class Owner { public void find() {} }\n');
    writeFile(examplePath, [
      'package demo;',
      'public class Example { public void run(Owner owner) { owner.find(); } }',
      '',
    ].join('\n'));
    indexWithRust();
    const cg = openGraph();
    const db = (cg as unknown as { db: { getDb(): { prepare(sql: string): { get(...args: unknown[]): unknown; run(...args: unknown[]): unknown } } } }).db.getDb();
    try {
      const row = db.prepare(
        "SELECT metadata FROM unresolved_refs WHERE reference_kind = 'calls' AND file_path = ?1",
      ).get(examplePath) as { metadata: string };
      db.prepare(
        "UPDATE unresolved_refs SET metadata = 'not-json' WHERE reference_kind = 'calls' AND file_path = ?1",
      ).run(examplePath);
      expect(cg.resolveReferences().stats.byMethod['exact-match']).toBeUndefined();
      db.prepare(
        "UPDATE unresolved_refs SET metadata = ?1 WHERE reference_kind = 'calls' AND file_path = ?2",
      ).run(row.metadata, examplePath);
      expect(cg.resolveReferences().stats.byMethod['exact-match']).toBe(1);
      expect(cg.getCallers(cg.getNodesByName('find')[0]!.id)).toHaveLength(1);
    } finally {
      cg.close();
    }
  });

  // ── 5. malformed metadata is fail-closed in the main loop ───────────────
  it('does not throw when metadata is malformed', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner {',
      '  public void find(String name, boolean active) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner) {',
      '    owner.find("x", true);',
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const cg = openGraph();
    try {
      // Tamper the metadata to be malformed.
      const db = (cg as unknown as { db: { getDb(): { prepare(sql: string): { run(...args: unknown[]): unknown } } } }).db.getDb();
      db.prepare(
        "UPDATE unresolved_refs SET metadata = 'not-json' WHERE reference_kind = 'calls' AND file_path = ?1",
      ).run(examplePath);
      // The main loop should not throw and must retain the malformed row.
      const resolution = cg.resolveReferences();
      expect(resolution.stats.byMethod['exact-match']).toBeUndefined();
      expect(resolution.stats.timings).not.toHaveProperty('javaOverloadAccess');
      const access = (cg as unknown as {
        resolver: { javaAccessModel: { getDiagnostics(): Record<string, number> } };
      }).resolver.javaAccessModel;
      expect(access.getDiagnostics().hydration).toBe(1);
      const callers = cg.getCallers(
        cg.getNodesByName('find').find((n) => n.filePath === ownerPath)!.id,
      );
      expect(callers).toEqual([]);
      const retained = db.prepare(
        "SELECT COUNT(*) AS count FROM unresolved_refs WHERE reference_kind = 'calls' AND file_path = ?1",
      ).get(examplePath) as { count: number };
      expect(retained.count).toBe(1);
    } finally {
      cg.close();
    }
  });
});
