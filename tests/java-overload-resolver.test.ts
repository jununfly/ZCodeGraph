/**
 * R2 of roadmap 1-9-15-4 — precise Java overload resolver.
 *
 * Consumes the RestrictedResolutionAccessModel's validated `zcgJavaCall.v1`
 * envelope and produces a `calls` edge ONLY when the evidence supports a
 * unique overload. Every other outcome abstains (returns null) — there is NO
 * legacy loose fallback path.
 *
 * Pinned behaviors:
 *   - single same-name candidate + matching arg types → exact-match edge
 *   - multiple same-name overloads disambiguated by arg types → exact-match
 *   - multiple same-name overloads, evidence insufficient → abstain
 *   - zero candidates → abstain
 *   - complete=false → abstain (the Rust writer already gave up)
 *   - cross-file same-package JDK shadowing (7b) → abstain (AST-only cannot
 *     distinguish `java.lang.String` from a sibling-file `demo.String`)
 *   - receiver declaredType mismatch → abstain
 *   - access model refused → abstain (R1 refusal propagates, never throws)
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
import { resolveJavaOverload } from '../src/resolution/java-overload-resolver';
import type { Node } from '../src/types';
import type { ResolutionContext } from '../src/resolution/types';

describe('resolveJavaOverload (roadmap 1-9-15-4 R2)', () => {
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
    ], { cwd: tempDir, encoding: 'utf-8' });
    expect(
      result.status,
      `rust index failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    ).toBe(0);
  }

  function openGraph(): { cg: CodeGraph; db: DbHandle } {
    const cg = CodeGraph.openSync(tempDir);
    const db = (cg as unknown as { db: { getDb(): DbHandle } }).db.getDb();
    return { cg, db };
  }

  function writeFile(relPath: string, contents: string): void {
    const full = path.join(tempDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }

  function javaCallRowid(db: DbHandle, filePath: string): number {
    const row = db.prepare(
      "SELECT id FROM unresolved_refs WHERE file_path = ?1 AND reference_kind = 'calls'",
    ).get(filePath) as { id: number } | undefined;
    expect(row, `expected a single Java calls row for ${filePath}`).toBeDefined();
    return row!.id;
  }

  /** Build a minimal ResolutionContext backed by the live CodeGraph. */
  function makeContext(cg: CodeGraph): ResolutionContext {
    return {
      getNodesInFile: (fp) => cg.getNodesByKind('method').filter((n) => n.filePath === fp),
      getNodesByName: (name) => cg.getNodesByName(name),
      getNodesByQualifiedName: (qn) =>
        cg.getNodesByKind('method').filter((n) => n.qualifiedName === qn),
      getNodesByKind: (kind) => cg.getNodesByKind(kind),
      fileExists: (fp) => fs.existsSync(path.join(tempDir, fp)),
      readFile: (fp) => {
        try {
          return fs.readFileSync(path.join(tempDir, fp), 'utf8');
        } catch {
          return null;
        }
      },
      getProjectRoot: () => tempDir,
      getAllFiles: () => [],
      getNodesByLowerName: (ln) =>
        cg.getNodesByKind('method').filter((n) => n.name.toLowerCase() === ln),
      getImportMappings: () => [],
    };
  }

  function methodNode(cg: CodeGraph, filePath: string, name: string): Node {
    const node = cg.getNodesByName(name).find(
      (n) => n.filePath === filePath && n.kind === 'method',
    );
    expect(node, `expected method ${name} in ${filePath}`).toBeDefined();
    return node!;
  }

  // ── 1. single candidate, matching args ─────────────────────────────────
  it('emits exact-match edge for a single candidate with matching arg types', () => {
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
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      const result = resolveJavaOverload(rowid, access, ctx);
      expect(result).not.toBeNull();
      expect(result!.resolvedBy).toBe('exact-match');
      expect(result!.confidence).toBe(1.0);
      const target = methodNode(cg, ownerPath, 'find');
      expect(result!.targetNodeId).toBe(target.id);
    } finally {
      cg.close();
    }
  });

  // ── 2. multiple overloads disambiguated by arg types ────────────────────
  it('picks the unique overload when argument types disambiguate', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner {',
      '  public void find(String name) {}',
      '  public void find(int id) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner) {',
      '    owner.find("x");',
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      const result = resolveJavaOverload(rowid, access, ctx);
      expect(result).not.toBeNull();
      expect(result!.resolvedBy).toBe('exact-match');
      // The String-arg overload must be picked; the int overload must not.
      const target = methodNode(cg, ownerPath, 'find');
      expect(result!.targetNodeId).toBe(target.id);
    } finally {
      cg.close();
    }
  });

  // ── 3. multiple overloads, evidence insufficient ────────────────────────
  it('abstains when multiple same-name overloads cannot be disambiguated', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner {',
      '  public void find(String name) {}',
      '  public void find(String other) {}', // duplicate signature shape
      '}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner) {',
      '    owner.find("x");',
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      expect(resolveJavaOverload(rowid, access, ctx)).toBeNull();
    } finally {
      cg.close();
    }
  });

  // ── 4. zero candidates ─────────────────────────────────────────────────
  it('abstains when no candidate method exists with that name', () => {
    const examplePath = 'demo/Example.java';
    writeFile(examplePath, [
      'package demo;',
      'public class Owner {}',
      'public class Example {',
      '  public void run(Owner owner) {',
      '    owner.find("x");', // Owner has no find method
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      expect(resolveJavaOverload(rowid, access, ctx)).toBeNull();
    } finally {
      cg.close();
    }
  });

  // ── 5. complete=false propagates abstention ─────────────────────────────
  it('abstains when the Rust writer already marked the call incomplete', () => {
    const examplePath = 'demo/Example.java';
    // Constructor caller → complete=false per the freeze matrix.
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
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      expect(resolveJavaOverload(rowid, access, ctx)).toBeNull();
    } finally {
      cg.close();
    }
  });

  // ── 6. cross-file same-package JDK shadowing (7b) abstains ─────────────
  it('abstains on cross-file same-package JDK shadowing (7b)', () => {
    // The receiver is typed String (java.lang.String), but demo/String.java
    // shadows it for the whole package. AST-only we cannot tell which String
    // the writer meant. The resolver MUST abstain.
    const stringPath = 'demo/String.java';
    const examplePath = 'demo/Example.java';
    writeFile(stringPath, [
      'package demo;',
      'public class String {',
      '  public void find() {}',
      '}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(String name) {',
      '    name.find();', // receiver is String — but which String?
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      expect(resolveJavaOverload(rowid, access, ctx)).toBeNull();
    } finally {
      cg.close();
    }
  });

  it('does not treat an unrelated-package JDK-named class as a shadow', () => {
    const examplePath = 'demo/Example.java';
    writeFile('other/String.java', [
      'package other;',
      'public class String { public void find() {} }',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(String name) { name.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const metadata = access.getMetadata(rowid);
      expect(metadata).toMatchObject({
        kind: 'ok',
        envelope: { receiver: { declaredType: 'java.lang.String' } },
      });
      expect(resolveJavaOverload(rowid, access, makeContext(cg))).toBeNull();
    } finally {
      cg.close();
    }
  });

  it('resolves an explicitly imported JDK receiver despite an unrelated same-named class', () => {
    const ownerPath = 'java/lang/String.java';
    const examplePath = 'demo/Example.java';
    writeFile('other/String.java', [
      'package other;',
      'public class String { public void find() {} }',
      '',
    ].join('\n'));
    writeFile(ownerPath, [
      'package java.lang;',
      'public class String { public void find() {} }',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'import java.lang.String;',
      'public class Example {',
      '  public void run(String name) { name.find(); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const result = resolveJavaOverload(rowid, access, makeContext(cg));
      expect(result?.targetNodeId).toBe(methodNode(cg, ownerPath, 'find').id);
    } finally {
      cg.close();
    }
  });

  it('resolves the unique imported overload using the candidate declaration package', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'api/Example.java';
    writeFile('api/Request.java', 'package api; public class Request {}\n');
    writeFile('demo/Request.java', 'package demo; public class Request {}\n');
    writeFile(ownerPath, [
      'package demo;',
      'import api.Request;',
      'public class Owner {',
      '  public void find(Request request) {}',
      '  public void find(String request) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package api;',
      'import demo.Owner;',
      'public class Example {',
      '  public void run(Owner owner, Request request) { owner.find(request); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const result = resolveJavaOverload(rowid, access, makeContext(cg));
      expect(result).not.toBeNull();
      const target = methodNode(cg, ownerPath, 'find');
      expect(target.signature).toContain('Request request');
      expect(result?.targetNodeId).toBe(target.id);
    } finally {
      cg.close();
    }
  });

  // ── 7. receiver declaredType mismatch ──────────────────────────────────
  it('abstains when receiver declaredType does not match any candidate class', () => {
    const ownerPath = 'demo/Owner.java';
    const otherPath = 'demo/Other.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner { public void find(String s) {} }',
      '',
    ].join('\n'));
    writeFile(otherPath, 'package demo; public class Other {}\n');
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Other other) {',
      '    other.find("x");', // Other has no find; only Owner does
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      expect(resolveJavaOverload(rowid, access, ctx)).toBeNull();
    } finally {
      cg.close();
    }
  });

  // ── 8. access model refused → abstain, never throw ──────────────────────
  it('abstains when the access model refuses the row', () => {
    const examplePath = 'demo/Example.java';
    writeFile(examplePath, [
      'package demo;',
      'public class Owner { public void find(String s) {} }',
      'public class Example {',
      '  public void run(Owner owner) { owner.find("x"); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      // Tamper the row so the access model refuses it.
      db.prepare('UPDATE unresolved_refs SET metadata = ?1 WHERE id = ?2')
        .run('not-json', rowid);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      expect(() => resolveJavaOverload(rowid, access, ctx)).not.toThrow();
      expect(resolveJavaOverload(rowid, access, ctx)).toBeNull();
    } finally {
      cg.close();
    }
  });

  // ── 9. argument count mismatch abstains ────────────────────────────────
  it('abstains when no candidate has a matching parameter count', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner { public void find(String a, String b) {} }',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner) {',
      '    owner.find("only-one");', // arity mismatch
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      expect(resolveJavaOverload(rowid, access, ctx)).toBeNull();
    } finally {
      cg.close();
    }
  });

  it('distinguishes an array argument from its scalar overload', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner {',
      '  public void find(String scalar) {}',
      '  public void find(String[] values) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner, String[] values) {',
      '    owner.find(values);',
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const result = resolveJavaOverload(rowid, access, makeContext(cg));
      const arrayOverload = cg.getNodesByName('find').find(
        (node) => node.kind === 'method' && node.signature?.includes('String[] values'),
      );
      expect(arrayOverload).toBeDefined();
      expect(result).toEqual({
        targetNodeId: arrayOverload!.id,
        confidence: 1,
        resolvedBy: 'exact-match',
      });
    } finally {
      cg.close();
    }
  });

  it('retains array dimensions after erasing a generic type', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner {',
      '  public void find(Box<String> scalar) {}',
      '  public void find(Box<String>[] values) {}',
      '}',
      'class Box<T> {}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner, Box<String>[] values) {',
      '    owner.find(values);',
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const metadata = access.getMetadata(rowid);
      expect(metadata).toMatchObject({
        kind: 'ok',
        envelope: { arguments: [{ declaredType: 'demo.Box[]' }] },
      });
      const arrayOverload = cg.getNodesByName('find').find(
        (node) => node.kind === 'method' && node.signature?.includes('Box<String>[] values'),
      );
      expect(resolveJavaOverload(rowid, access, makeContext(cg))?.targetNodeId)
        .toBe(arrayOverload!.id);
    } finally {
      cg.close();
    }
  });

  // ── 10. primitive arg type alignment ────────────────────────────────────
  it('aligns primitive argument declaredType with the parameter type', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner {',
      '  public void find(int id) {}',
      '  public void find(String name) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner) {',
      '    owner.find(42);', // int literal → int overload
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowid = javaCallRowid(db, examplePath);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      const result = resolveJavaOverload(rowid, access, ctx);
      expect(result).not.toBeNull();
      expect(result!.resolvedBy).toBe('exact-match');
      const target = methodNode(cg, ownerPath, 'find');
      expect(result!.targetNodeId).toBe(target.id);
    } finally {
      cg.close();
    }
  });
});
