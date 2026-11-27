/**
 * R1 of roadmap 1-9-15-4 — Restricted ResolutionAccessModel skeleton +
 * malformed-metadata fail-closed behavior.
 *
 * The Rust core persists a `zcgJavaCall.v1` envelope per Java method-invocation
 * into `unresolved_refs.metadata`. Task #3 introduces a narrow TypeScript-side
 * reader (the "restricted ResolutionAccessModel") that:
 *
 *   - exposes ONLY `getMetadata(rowid)` (plus diagnostics) — no file reads,
 *     no graph writes, no schema surface beyond the v1 envelope;
 *   - parses + validates the envelope with fail-closed semantics: any
 *     structural deviation returns a typed refusal, never throws and never
 *     returns a half-initialized object;
 *   - refuses non-Java rows outright (the access model is Java-scoped);
 *   - enforces the same 16 KiB budget the Rust writer enforces, so a
 *     tampered row is rejected on the TS side as well.
 *
 * The three-state pre-prewarm / hydration / ready routing, the precise
 * overload resolver and the declared-return / parent-class audit are R2 / R3
 * concerns; this file only pins R1's fail-closed contract.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CodeGraph } from '../src';
import {
  makeRustIndexingTempProject,
  RUST_CORE_BIN,
} from './helpers/rust-indexing-cli';
import { RestrictedResolutionAccessModel } from '../src/resolution/resolution-access-model';

describe('RestrictedResolutionAccessModel (roadmap 1-9-15-4 R1)', () => {
  let tempDir: string;

  beforeAll(() => {
    execFileSync('cargo', ['build', '--package', 'zcodegraph-core'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
  }, 60_000);

  beforeEach(() => {
    tempDir = makeRustIndexingTempProject();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  type DbHandle = {
    prepare(sql: string): {
      all(...args: unknown[]): unknown[];
      get(...args: unknown[]): unknown;
      run(...args: unknown[]): unknown;
    };
  };

  function indexWithRust(): void {
    const result = spawnSync(RUST_CORE_BIN, [
      'index',
      '--engine',
      'rust',
      '--project-path',
      tempDir,
      '--index-path',
      path.join(tempDir, '.zcodegraph', 'zcodegraph.db'),
    ], {
      cwd: tempDir,
      encoding: 'utf-8',
    });
    expect(
      result.status,
      `rust index failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    ).toBe(0);
  }

  function openGraph(): { cg: CodeGraph; db: DbHandle } {
    const cg = CodeGraph.openSync(tempDir);
    const db = (
      cg as unknown as { db: { getDb(): DbHandle } }
    ).db.getDb();
    return { cg, db };
  }

  function writeFile(relPath: string, contents: string): void {
    const full = path.join(tempDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }

  /** Find the rowid of the single Java `calls` row for `filePath`. */
  function javaCallRowid(db: DbHandle, filePath: string): number {
    const row = db.prepare(
      "SELECT id FROM unresolved_refs WHERE file_path = ?1 AND reference_kind = 'calls'",
    ).get(filePath) as { id: number } | undefined;
    expect(row, `expected a single Java calls row for ${filePath}`).toBeDefined();
    return row!.id;
  }

  /** Overwrite the metadata column on a specific rowid (test-only injection). */
  function overwriteMetadata(db: DbHandle, rowid: number, raw: string | null): void {
    db.prepare('UPDATE unresolved_refs SET metadata = ?1 WHERE id = ?2').run(raw, rowid);
  }

  it('returns a typed v1 envelope for a well-formed Java row', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner { void find(String name, boolean active) {} }',
      'class Example {',
      '  void run(Owner owner) {',
      '    owner.find("café", true);',
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();

    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, filePath);
      const access = new RestrictedResolutionAccessModel(db);
      const result = access.getMetadata(rowid);
      expect(result.kind).toBe('ok');
      if (result.kind !== 'ok') return;
      expect(result.envelope.v).toBe(1);
      expect(result.envelope.methodName).toBe('find');
      expect(result.envelope.complete).toBe(true);
      expect(result.envelope.caller.complete).toBe(true);
      expect(result.envelope.receiver.complete).toBe(true);
    } finally {
      cg.close();
    }
  });

  it('routes pre-prewarm, hydration and ready reads with exact diagnostics', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner {',
      '  void find(String name, boolean active) {}',
      '  void findAgain(String name) {}',
      '}',
      'class Example {',
      '  void run(Owner owner) {',
      '    owner.find("x", true);',
      '    owner.findAgain("y");',
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();

    const { cg, db } = openGraph();
    try {
      const rowids = db.prepare(
        "SELECT id FROM unresolved_refs WHERE file_path = ?1 AND reference_kind = 'calls' ORDER BY id",
      ).all(filePath) as Array<{ id: number }>;
      expect(rowids).toHaveLength(2);
      const [direct, hydrated] = rowids;
      const access = new RestrictedResolutionAccessModel(db);
      expect(access.getMetadata(direct!.id).kind).toBe('ok');
      access.hydrateMetadata([hydrated!.id]);
      expect(access.getMetadata(hydrated!.id).kind).toBe('ok');
      expect(access.getDiagnostics()).toEqual({
        'pre-prewarm': 1,
        hydration: 1,
        ready: 1,
      });
      // Diagnostics are snapshots: callers cannot mutate the counters.
      const snapshot = access.getDiagnostics();
      snapshot.ready = 100;
      expect(access.getDiagnostics().ready).toBe(1);
    } finally {
      cg.close();
    }
  });

  it('refuses non-Java rows with reason=non-java-row', () => {
    // Kotlin is the closest non-Java neighbor: it also flows through the
    // Rust-owned path and emits `calls` refs with metadata, so the row
    // exists. The access model must reject it on language grounds alone.
    const filePath = 'demo/Example.kt';
    writeFile(filePath, [
      'package demo',
      'class Owner { fun find(name: String) {} }',
      'class Example {',
      '  fun run(owner: Owner) {',
      '    owner.find("x")',
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();

    const { cg, db } = openGraph();
    try {
      const row = db.prepare(
        "SELECT id FROM unresolved_refs WHERE file_path = ?1 AND reference_kind = 'calls'",
      ).get(filePath) as { id: number } | undefined;
      expect(row).toBeDefined();
      const access = new RestrictedResolutionAccessModel(db);
      const result = access.getMetadata(row!.id);
      expect(result).toEqual({ kind: 'refused', reason: 'non-java-row' });
    } finally {
      cg.close();
    }
  });

  it('refuses an unknown rowid with reason=row-not-found', () => {
    writeFile('demo/Example.java', 'package demo; class Example {}\n');
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const access = new RestrictedResolutionAccessModel(db);
      expect(access.getMetadata(999_999)).toEqual({
        kind: 'refused',
        reason: 'row-not-found',
      });
    } finally {
      cg.close();
    }
  });

  it('refuses NULL metadata with reason=missing-envelope', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner { void find() {} }',
      'class Example {',
      '  void run(Owner owner) { owner.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, filePath);
      overwriteMetadata(db, rowid, null);
      const access = new RestrictedResolutionAccessModel(db);
      expect(access.getMetadata(rowid)).toEqual({
        kind: 'refused',
        reason: 'missing-envelope',
      });
    } finally {
      cg.close();
    }
  });

  it('refuses non-JSON metadata with reason=malformed-json', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner { void find() {} }',
      'class Example {',
      '  void run(Owner owner) { owner.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, filePath);
      overwriteMetadata(db, rowid, 'not-json{{{');
      const access = new RestrictedResolutionAccessModel(db);
      expect(access.getMetadata(rowid)).toEqual({
        kind: 'refused',
        reason: 'malformed-json',
      });
    } finally {
      cg.close();
    }
  });

  it('refuses JSON without the zcgJavaCall envelope key with reason=missing-envelope', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner { void find() {} }',
      'class Example {',
      '  void run(Owner owner) { owner.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, filePath);
      overwriteMetadata(db, rowid, JSON.stringify({ unrelated: true }));
      const access = new RestrictedResolutionAccessModel(db);
      expect(access.getMetadata(rowid)).toEqual({
        kind: 'refused',
        reason: 'missing-envelope',
      });
    } finally {
      cg.close();
    }
  });

  it('refuses an unsupported envelope version with reason=unsupported-version', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner { void find() {} }',
      'class Example {',
      '  void run(Owner owner) { owner.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, filePath);
      overwriteMetadata(db, rowid, JSON.stringify({
        zcgJavaCall: { v: 99, methodName: 'find', complete: false },
      }));
      const access = new RestrictedResolutionAccessModel(db);
      expect(access.getMetadata(rowid)).toEqual({
        kind: 'refused',
        reason: 'unsupported-version',
      });
    } finally {
      cg.close();
    }
  });

  it('refuses complete=true with missing caller.nodeId (malformed-caller)', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner { void find() {} }',
      'class Example {',
      '  void run(Owner owner) { owner.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, filePath);
      // Forge a complete=true envelope that is structurally broken: the
      // caller claims completion but has no nodeId. A fail-closed reader
      // must reject this rather than propagate a half-initialized caller.
      overwriteMetadata(db, rowid, JSON.stringify({
        zcgJavaCall: {
          v: 1,
          methodName: 'find',
          occurrence: { byteOffset: 0 },
          caller: {
            category: 'ordinary-method',
            lexicalDepth: 0,
            complete: true,
            // nodeId is missing — malformed
          },
          receiver: { kind: 'identifier', name: 'owner', complete: true },
          arguments: [],
          complete: true,
        },
      }));
      const access = new RestrictedResolutionAccessModel(db);
      expect(access.getMetadata(rowid)).toEqual({
        kind: 'refused',
        reason: 'malformed-caller',
      });
    } finally {
      cg.close();
    }
  });

  it('refuses a non-string methodName with reason=malformed-method-name', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner { void find() {} }',
      'class Example {',
      '  void run(Owner owner) { owner.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, filePath);
      overwriteMetadata(db, rowid, JSON.stringify({
        zcgJavaCall: {
          v: 1,
          methodName: 42,
          complete: false,
          reason: 'unsupported-caller-category',
        },
      }));
      const access = new RestrictedResolutionAccessModel(db);
      expect(access.getMetadata(rowid)).toEqual({
        kind: 'refused',
        reason: 'malformed-method-name',
      });
    } finally {
      cg.close();
    }
  });

  it('refuses metadata exceeding the 16 KiB budget with reason=metadata-bytes', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner { void find() {} }',
      'class Example {',
      '  void run(Owner owner) { owner.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, filePath);
      const huge = JSON.stringify({
        zcgJavaCall: {
          v: 1,
          methodName: 'x'.repeat(17 * 1024),
          complete: false,
        },
      });
      overwriteMetadata(db, rowid, huge);
      const access = new RestrictedResolutionAccessModel(db);
      expect(access.getMetadata(rowid)).toEqual({
        kind: 'refused',
        reason: 'metadata-bytes',
      });
    } finally {
      cg.close();
    }
  });

  it('refuses oversized UTF-8 bytes even when the string length fits 16 KiB', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner { void find() {} }',
      'class Example {',
      '  void run(Owner owner) { owner.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, filePath);
      const oversized = JSON.stringify({
        zcgJavaCall: {
          v: 1,
          methodName: `find${'界'.repeat(5450)}`,
          complete: false,
        },
      });
      expect(oversized.length).toBeLessThan(16 * 1024);
      expect(Buffer.byteLength(oversized, 'utf8')).toBeGreaterThan(16 * 1024);
      overwriteMetadata(db, rowid, oversized);
      const access = new RestrictedResolutionAccessModel(db);
      expect(access.getMetadata(rowid)).toEqual({
        kind: 'refused',
        reason: 'metadata-bytes',
      });
    } finally {
      cg.close();
    }
  });

  it('refuses malformed nested facts without throwing', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner { void find() {} }',
      'class Example {',
      '  void run(Owner owner) { owner.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, filePath);
      const row = db.prepare('SELECT metadata FROM unresolved_refs WHERE id = ?1').get(rowid) as { metadata: string };
      const valid = JSON.parse(row.metadata).zcgJavaCall as Record<string, unknown>;
      const malformed: Array<Record<string, unknown>> = [
        { ...valid, complete: false, receiver: null },
        { ...valid, complete: false, receiver: [] },
        { ...valid, complete: false, arguments: {} },
        { ...valid, complete: false, arguments: [null] },
        { ...valid, complete: false, receiver: { kind: 'method-invocation', complete: false, receiver: null } },
        { ...valid, complete: false, receiver: { kind: 'method-invocation', complete: false, arguments: [null] } },
        { ...valid, complete: 'false' },
      ];
      for (const envelope of malformed) {
        overwriteMetadata(db, rowid, JSON.stringify({ zcgJavaCall: envelope }));
        const access = new RestrictedResolutionAccessModel(db);
        expect(access.getMetadata(rowid)).toEqual({
          kind: 'refused',
          reason: 'malformed-envelope',
        });
      }
    } finally {
      cg.close();
    }
  });

  it('refuses to upgrade a refused row from a later raw-store read', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner { void find() {} }',
      'class Example {',
      '  void run(Owner owner) { owner.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, filePath);
      const row = db.prepare('SELECT metadata FROM unresolved_refs WHERE id = ?1').get(rowid) as { metadata: string };
      const access = new RestrictedResolutionAccessModel(db);
      overwriteMetadata(db, rowid, 'not-json');
      expect(access.getMetadata(rowid)).toEqual({
        kind: 'refused', reason: 'malformed-json',
      });
      overwriteMetadata(db, rowid, row.metadata);
      expect(access.getMetadata(rowid)).toEqual({
        kind: 'refused', reason: 'malformed-json',
      });
      expect(access.getDiagnostics()).toEqual({
        'pre-prewarm': 1, hydration: 0, ready: 1,
      });
    } finally {
      cg.close();
    }
  });

  it('never throws — every refusal path returns a typed object', () => {
    const filePath = 'demo/Example.java';
    writeFile(filePath, [
      'package demo;',
      'class Owner { void find() {} }',
      'class Example {',
      '  void run(Owner owner) { owner.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, filePath);
      const access = new RestrictedResolutionAccessModel(db);
      // Blast a sequence of malformed inputs; none may throw.
      const inputs: Array<string | null> = [
        null,
        '',
        '   ',
        'not-json',
        '[1,2,3]',
        '"string"',
        '42',
        JSON.stringify([]),
        JSON.stringify({ zcgJavaCall: null }),
        JSON.stringify({ zcgJavaCall: 'string' }),
        JSON.stringify({ zcgJavaCall: [] }),
        JSON.stringify({ zcgJavaCall: {} }),
      ];
      for (const raw of inputs) {
        overwriteMetadata(db, rowid, raw);
        let result: ReturnType<typeof access.getMetadata> | undefined;
        expect(() => {
          result = access.getMetadata(rowid);
        }, `input=${JSON.stringify(raw)}`).not.toThrow();
        expect(result?.kind).toBe('refused');
      }
    } finally {
      cg.close();
    }
  });
});
