/**
 * R3 of roadmap 1-9-15-4 — declared-return chain inference + parent-class audit.
 *
 * Two capabilities:
 *   1. declared-return: `a.foo().bar()` — foo()'s return type becomes bar()'s
 *      receiver type. The Rust writer must emit a `method_invocation` fact
 *      with `evidence='declared-return'` and the resolved return type.
 *   2. parent-class audit: when the receiver's declaredType is a subclass
 *      but the method is declared on a superclass, the resolver walks the
 *      extends chain to find the declaring class.
 *
 * Both must abstain on ambiguity / incomplete evidence.
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

describe('resolveJavaOverload R3 (roadmap 1-9-15-4)', () => {
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

  function javaCallRowids(db: DbHandle, filePath: string): number[] {
    const rows = db.prepare(
      "SELECT id FROM unresolved_refs WHERE file_path = ?1 AND reference_kind = 'calls' ORDER BY id",
    ).all(filePath) as Array<{ id: number }>;
    return rows.map((r) => r.id);
  }

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

  // ── 1. declared-return chain ────────────────────────────────────────────
  it('resolves a chained call via declared-return type inference', () => {
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner {',
      '  public Owner self() { return this; }',
      '  public void find(String s) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner) {',
      '    owner.self().find("x");', // self() returns Owner → find on Owner
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowids = javaCallRowids(db, examplePath);
      // The Rust writer visits the OUTER call first, so `find` gets a lower
      // rowid than `self`. rowids[0] is `find`, rowids[1] is `self`.
      expect(rowids.length).toBeGreaterThanOrEqual(2);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      // The find call should resolve via declared-return.
      const findResult = resolveJavaOverload(rowids[0]!, access, ctx);
      expect(findResult).not.toBeNull();
      expect(findResult!.resolvedBy).toBe('exact-match');
      const target = methodNode(cg, ownerPath, 'find');
      expect(findResult!.targetNodeId).toBe(target.id);
    } finally {
      cg.close();
    }
  });

  it('abstains when the only same-named return method belongs to an unrelated class', () => {
    const unrelatedPath = 'demo/Unrelated.java';
    const wrongReceiverPath = 'demo/WrongReceiver.java';
    const examplePath = 'demo/Example.java';
    writeFile(unrelatedPath, [
      'package demo;',
      'public class Unrelated {',
      '  public WrongReceiver self() { return null; }',
      '}',
      '',
    ].join('\n'));
    writeFile(wrongReceiverPath, [
      'package demo;',
      'public class WrongReceiver { public void find(String value) {} }',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Owner {}',
      'public class Example {',
      '  public void run(Owner owner) { owner.self().find("x"); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const outerFind = db.prepare(
        "SELECT id, metadata FROM unresolved_refs WHERE file_path = ?1 AND reference_kind = 'calls' AND reference_name = 'find' AND metadata LIKE '%\"kind\":\"method-invocation\"%'",
      ).get(examplePath) as { id: number; metadata: string };
      expect(JSON.parse(outerFind.metadata).zcgJavaCall.receiver).toMatchObject({
        kind: 'method-invocation',
        complete: false,
      });
      expect(resolveJavaOverload(
        outerFind.id,
        new RestrictedResolutionAccessModel(db),
        makeContext(cg),
      )).toBeNull();
    } finally {
      cg.close();
    }
  });

  // ── 2. declared-return with unknown return type abstains ────────────────
  it('abstains when the chained method has no resolvable return type', () => {
    const examplePath = 'demo/Example.java';
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner) {',
      '    owner.unknown().find("x");', // unknown() has no declaration
      '  }',
      '}',
      'class Owner {}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowids = javaCallRowids(db, examplePath);
      expect(rowids.length).toBeGreaterThanOrEqual(2);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      // The find call should abstain — unknown() has no return type.
      expect(resolveJavaOverload(rowids[1]!, access, ctx)).toBeNull();
    } finally {
      cg.close();
    }
  });

  // ── 3. parent-class audit ───────────────────────────────────────────────
  it('resolves a method declared on a superclass', () => {
    const basePath = 'demo/Base.java';
    const subPath = 'demo/Sub.java';
    const examplePath = 'demo/Example.java';
    writeFile(basePath, [
      'package demo;',
      'public class Base {',
      '  public void find(String s) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(subPath, [
      'package demo;',
      'public class Sub extends Base {}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Sub sub) {',
      '    sub.find("x");', // Sub extends Base, find is on Base
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowids = javaCallRowids(db, examplePath);
      expect(rowids).toHaveLength(1);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      const result = resolveJavaOverload(rowids[0]!, access, ctx);
      expect(result).not.toBeNull();
      expect(result!.resolvedBy).toBe('exact-match');
      const target = methodNode(cg, basePath, 'find');
      expect(result!.targetNodeId).toBe(target.id);
    } finally {
      cg.close();
    }
  });

  it('resolves an explicitly imported superclass outside the receiver package', () => {
    const basePath = 'other/Base.java';
    const subPath = 'demo/Sub.java';
    const examplePath = 'demo/Example.java';
    writeFile(basePath, [
      'package other;',
      'public class Base { public void find(String value) {} }',
      '',
    ].join('\n'));
    writeFile(subPath, [
      'package demo;',
      'import other.Base;',
      'public class Sub extends Base {}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Sub sub) { sub.find("x"); }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowids = javaCallRowids(db, examplePath);
      expect(rowids).toHaveLength(1);
      const result = resolveJavaOverload(
        rowids[0]!,
        new RestrictedResolutionAccessModel(db),
        makeContext(cg),
      );
      expect(result).toEqual({
        targetNodeId: methodNode(cg, basePath, 'find').id,
        confidence: 1,
        resolvedBy: 'exact-match',
      });
    } finally {
      cg.close();
    }
  });

  // ── 4. parent-class audit with override ─────────────────────────────────
  it('resolves to the override when subclass shadows superclass method', () => {
    const basePath = 'demo/Base.java';
    const subPath = 'demo/Sub.java';
    const examplePath = 'demo/Example.java';
    writeFile(basePath, [
      'package demo;',
      'public class Base {',
      '  public void find(String s) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(subPath, [
      'package demo;',
      'public class Sub extends Base {',
      '  @Override public void find(String s) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Sub sub) {',
      '    sub.find("x");', // Sub.find overrides Base.find
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowids = javaCallRowids(db, examplePath);
      expect(rowids).toHaveLength(1);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      const result = resolveJavaOverload(rowids[0]!, access, ctx);
      expect(result).not.toBeNull();
      const target = methodNode(cg, subPath, 'find');
      expect(result!.targetNodeId).toBe(target.id);
    } finally {
      cg.close();
    }
  });

  // ── 5. parent-class audit with JDK parent abstains ──────────────────────
  it('abstains when the parent is a JDK class not in the project', () => {
    const examplePath = 'demo/Example.java';
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Exception e) {',
      '    e.printStackTrace();', // Exception is JDK, not in project
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowids = javaCallRowids(db, examplePath);
      expect(rowids).toHaveLength(1);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      expect(resolveJavaOverload(rowids[0]!, access, ctx)).toBeNull();
    } finally {
      cg.close();
    }
  });

  // ── 6. multi-level inheritance ──────────────────────────────────────────
  it('walks multiple levels of inheritance', () => {
    const basePath = 'demo/Base.java';
    const midPath = 'demo/Mid.java';
    const leafPath = 'demo/Leaf.java';
    const examplePath = 'demo/Example.java';
    writeFile(basePath, [
      'package demo;',
      'public class Base {',
      '  public void find(String s) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(midPath, 'package demo; public class Mid extends Base {}\n');
    writeFile(leafPath, 'package demo; public class Leaf extends Mid {}\n');
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Leaf leaf) {',
      '    leaf.find("x");', // Leaf → Mid → Base.find
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowids = javaCallRowids(db, examplePath);
      expect(rowids).toHaveLength(1);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      const result = resolveJavaOverload(rowids[0]!, access, ctx);
      expect(result).not.toBeNull();
      const target = methodNode(cg, basePath, 'find');
      expect(result!.targetNodeId).toBe(target.id);
    } finally {
      cg.close();
    }
  });

  // ── 7. declared-return chain with parent-class audit ────────────────────
  it('combines declared-return with parent-class audit', () => {
    const basePath = 'demo/Base.java';
    const subPath = 'demo/Sub.java';
    const ownerPath = 'demo/Owner.java';
    const examplePath = 'demo/Example.java';
    writeFile(basePath, [
      'package demo;',
      'public class Base {',
      '  public void find(String s) {}',
      '}',
      '',
    ].join('\n'));
    writeFile(subPath, 'package demo; public class Sub extends Base {}\n');
    writeFile(ownerPath, [
      'package demo;',
      'public class Owner {',
      '  public Sub getSub() { return null; }',
      '}',
      '',
    ].join('\n'));
    writeFile(examplePath, [
      'package demo;',
      'public class Example {',
      '  public void run(Owner owner) {',
      '    owner.getSub().find("x");', // getSub() returns Sub → find on Base
      '  }',
      '}',
      '',
    ].join('\n'));
    indexWithRust();
    const { cg, db } = openGraph();
    try {
      const rowids = javaCallRowids(db, examplePath);
      expect(rowids.length).toBeGreaterThanOrEqual(2);
      const access = new RestrictedResolutionAccessModel(db);
      const ctx = makeContext(cg);
      // The Rust writer visits the OUTER call first, so `find` gets a lower
      // rowid than `getSub`. rowids[0] is `find`, rowids[1] is `getSub`.
      const result = resolveJavaOverload(rowids[0]!, access, ctx);
      expect(result).not.toBeNull();
      const target = methodNode(cg, basePath, 'find');
      expect(result!.targetNodeId).toBe(target.id);
    } finally {
      cg.close();
    }
  });
});
