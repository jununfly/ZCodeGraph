import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CodeGraph } from '../src';
import {
  makeRustIndexingTempProject,
  RUST_CORE_BIN,
} from './helpers/rust-indexing-cli';

/**
 * Rust-owned language fixture contract (roadmap 1-6-5, wave 0 of #692).
 *
 * These replace the legacy `describe.skip(...)` blocks that drove the removed
 * TypeScript per-language extractors. There is no callable TS extraction
 * function anymore, so assertions run end-to-end against the Rust core binary
 * (`--engine rust`) and read back the SQLite graph via the SDK / a direct DB
 * handle. Running the pure-Rust engine (not rust-hybrid) keeps the assertions
 * focused on what Rust extraction itself produces: import nodes, unresolved
 * refs and symbol naming — independent of the TypeScript shell finalizers.
 *
 * Assertions here were calibrated against the actual Rust core output with
 * sqlite probes (2026-09-28). One deliberate deviation from the legacy
 * expectations applies to every import case: Rust import nodes carry NO
 * `signature` (the legacy raw `#include <x>` / `import x;` text is not stored),
 * so only the import NAME and the unresolved ref are asserted.
 *
 * C++ free-function naming is fully covered: the qualified-type-param
 * function (`TableFileName`) and the trailing-return-type function
 * (`auto BuildName(...) -> std::string`) are both named correctly. The latter
 * was Rust extraction gap G1 (roadmap 1-2-3-1) — the declarator-name walk used
 * to take the trailing return type's last identifier (`string`); it now prunes
 * `trailing_return_type` and keeps the real name.
 *
 * C++ inheritance (gap G2) is covered at the pure-Rust layer here: a
 * `base_class_clause` (`class D : public A, private B`) emits one `extends`
 * unresolved ref per base (access keywords skipped), with qualified/templated
 * bases reduced to their leaf name. The rust-hybrid end-to-end edge resolution
 * lives in extraction.test.ts "C++ class inheritance extraction (rust-hybrid)".
 *
 * C++ typed-pointer/member calls (gap G4) are also covered here: `ptr->m()` and
 * `obj.m()` (both tree-sitter field_expression) emit a receiver-qualified call
 * ref `receiver.m`; out-of-class `Class::m` definitions are kind `method`; and
 * `int r = ptr->m()` yields variable `r`, not a spurious `m` variable. The
 * rust-hybrid receiver-type inference end-to-end lives in
 * frameworks-integration.test.ts "C++ end-to-end — typed pointer callers".
 */
describe('Rust-owned language fixtures (#692 wave 0)', () => {
  let tempDir: string;

  beforeAll(() => {
    // Debug build only compiles the bin (.rmeta-free fast path); CI already
    // runs this same command before vitest, so it adds no CI cost. No skipIf:
    // a missing core must fail loudly (#692 lesson).
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
    prepare(sql: string): { all(): unknown[] };
  };

  type OpenedGraph = { cg: CodeGraph; db: DbHandle };

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
    expect(result.status, `rust index failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
  }

  function openGraph(): OpenedGraph {
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

  function importNames(cg: CodeGraph, language: string): string[] {
    return cg
      .getNodesByKind('import')
      .filter((n) => n.language === language)
      .map((n) => n.name);
  }

  function unresolvedImportRefs(db: DbHandle, filePath: string): Array<{
    reference_name: string;
    reference_kind: string;
    line: number;
    language: string;
  }> {
    return db
      .prepare(
        'SELECT reference_name, reference_kind, line, language FROM unresolved_refs WHERE file_path = ?1 AND reference_kind = \'imports\' ORDER BY line',
      )
      .all(filePath) as Array<{
        reference_name: string;
        reference_kind: string;
        line: number;
        language: string;
      }>;
  }

  // Generic unresolved-ref read for non-import kinds (extends / implements /
  // instantiates / calls ...), used by the anonymous-class semantics block.
  function unresolvedRefs(db: DbHandle, filePath: string): Array<{
    reference_name: string;
    reference_kind: string;
    line: number;
  }> {
    return db
      .prepare(
        'SELECT reference_name, reference_kind, line FROM unresolved_refs WHERE file_path = ?1 ORDER BY line',
      )
      .all(filePath) as Array<{
        reference_name: string;
        reference_kind: string;
        line: number;
      }>;
  }

  describe('C/C++ baseline', () => {
    it('extracts a C++ system include node (#include <iostream>)', () => {
      writeFile('main.cpp', '#include <iostream>\n');
      indexWithRust();

      const { cg } = openGraph();
      try {
        expect(cg.getStats().filesByLanguage.cpp).toBe(1);
        expect(importNames(cg, 'cpp')).toContain('iostream');
      } finally {
        cg.close();
      }
    });

    it('extracts a C++ system include node with a path (#include <nlohmann/json.hpp>)', () => {
      writeFile('app.cpp', '#include <nlohmann/json.hpp>\n');
      indexWithRust();

      const { cg } = openGraph();
      try {
        expect(importNames(cg, 'cpp')).toContain('nlohmann/json.hpp');
      } finally {
        cg.close();
      }
    });

    it('extracts a C++ local include node (#include "myheader.h")', () => {
      writeFile('main.cpp', '#include "myheader.h"\n');
      indexWithRust();

      const { cg } = openGraph();
      try {
        expect(importNames(cg, 'cpp')).toContain('myheader.h');
      } finally {
        cg.close();
      }
    });

    it('extracts multiple C++ includes from one translation unit', () => {
      writeFile(
        'app.cpp',
        ['#include <iostream>', '#include <vector>', '#include "config.h"', ''].join('\n'),
      );
      indexWithRust();

      const { cg } = openGraph();
      try {
        const names = importNames(cg, 'cpp');
        expect(names).toContain('iostream');
        expect(names).toContain('vector');
        expect(names).toContain('config.h');
      } finally {
        cg.close();
      }
    });

    it('writes an unresolved imports ref for a missing local include', () => {
      writeFile('main.cpp', '#include "myheader.h"\n');
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        expect(unresolvedImportRefs(db, 'main.cpp')).toContainEqual({
          reference_name: 'myheader.h',
          reference_kind: 'imports',
          line: 1,
          language: 'cpp',
        });
      } finally {
        cg.close();
      }
    });

    it('writes an unresolved imports ref for a system include', () => {
      writeFile('main.cpp', '#include <iostream>\n');
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        expect(unresolvedImportRefs(db, 'main.cpp')).toContainEqual({
          reference_name: 'iostream',
          reference_kind: 'imports',
          line: 1,
          language: 'cpp',
        });
      } finally {
        cg.close();
      }
    });

    it('names a C++ free function with qualified-type params correctly (not after its return type)', () => {
      // Regression guard for the legacy bug where a `const std::string&` parameter
      // made the extractor name the function `string`. `TableFileName` must keep
      // its real name. (The trailing-return-type twin, `BuildName`, was gap G1
      // and now has its own case below.)
      writeFile(
        'src/names.cc',
        [
          '#include <string>',
          '',
          'std::string TableFileName(const std::string& dbname, int number) {',
          '  return dbname;',
          '}',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg } = openGraph();
      try {
        const tableFn = cg
          .getNodesByKind('function')
          .find((n) => n.name === 'TableFileName' && n.filePath === 'src/names.cc');
        expect(tableFn, 'TableFileName extracted under its real name').toBeDefined();
      } finally {
        cg.close();
      }
    });

    it('names a C++ free function with a trailing return type correctly (G1)', () => {
      // G1 regression guard: `auto BuildName(...) -> std::string` used to be
      // named `string` because the declarator-name walk took the trailing
      // return type's last type identifier. It must keep the real name.
      writeFile(
        'src/names.cc',
        [
          '#include <string>',
          '',
          'auto BuildName(const std::string& a) -> std::string {',
          '  return a;',
          '}',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg } = openGraph();
      try {
        const fns = cg
          .getNodesByKind('function')
          .filter((n) => n.filePath === 'src/names.cc')
          .map((n) => n.name);
        expect(fns, 'BuildName extracted, not its trailing return type `string`').toContain('BuildName');
        expect(fns, 'no node misnamed after the trailing return type').not.toContain('string');
      } finally {
        cg.close();
      }
    });

    it('emits an extends ref per C++ base class, incl cross-file and templated bases (G2)', () => {
      // G2 regression guard: `class Derived : public Base, private Other` used
      // to emit zero inheritance information because the Rust extractor never
      // visited `base_class_clause`. It now emits one `extends` unresolved ref
      // per base type (access keywords skipped), reduces qualified/templated
      // bases to their leaf name, and handles structs too. Pure rust only emits
      // the refs; the rust-hybrid shell resolves them into extends edges
      // (covered by the activated extraction e2e, #692).
      writeFile('src/base.h', 'class Base { public: int baseMethod(); };\nclass Other {};\n');
      writeFile(
        'src/derived.cc',
        [
          '#include "base.h"',
          'namespace ns { class Qux {}; }',
          'class Derived : public Base, private Other { int derivedMethod(); };',
          'class Qual : public ns::Qux, public std::vector<int> {};',
          'struct SBase { int x; };',
          'struct SDerived : SBase { int y; };',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        const names = unresolvedRefs(db, 'src/derived.cc')
          .filter((r) => r.reference_kind === 'extends')
          .map((r) => r.reference_name);
        // Base/Other live in base.h (cross-file); Qux/vector/SBase same file.
        for (const expected of ['Base', 'Other', 'Qux', 'vector', 'SBase']) {
          expect(names, `extends ref to ${expected}`).toContain(expected);
        }
        // Access specifiers and template arguments must never become refs.
        expect(names).not.toContain('public');
        expect(names).not.toContain('private');
        expect(names).not.toContain('int');
        expect(names.some((n) => n.includes(':')), 'qualified name reduced to leaf').toBe(false);
      } finally {
        cg.close();
      }
    });

    it('classifies an inline C++ class method as method with class-scoped qualifiedName (G3)', () => {
      // G3 regression guard: an inline function_definition inside a class body
      // used to be kind `function` with a qualified name lacking the class. It
      // is now `method`, scoped `file::[ns::]Class::name`. An out-of-class
      // qualified definition (`void gfx::Canvas::draw() {}`) is ALSO `method`
      // since G4 (multi-segment qualified_identifier promotion, mirroring the
      // #445 engine); only a bare free function (`void freeFn() {}`) stays
      // `function`.
      writeFile(
        'widget.hpp',
        [
          'namespace gfx {',
          'class Canvas {',
          'public:',
          '  void render() { return; }',
          '  virtual int area() const { return 0; }',
          '};',
          '}',
          'struct Point { int x() { return 0; } };',
          'void gfx::Canvas::draw() { }',
          'void freeFn() { }',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg } = openGraph();
      try {
        const methods = cg.getNodesByKind('method');
        const render = methods.find((n) => n.name === 'render');
        expect(render, 'inline class method is kind method').toBeDefined();
        expect(
          render!.qualifiedName,
          'method qualifiedName carries namespace + class',
        ).toBe('widget.hpp::gfx::Canvas::render');
        expect(methods.some((n) => n.name === 'area'), 'virtual inline method is a method').toBe(true);
        expect(methods.some((n) => n.name === 'x'), 'inline struct method is a method').toBe(true);
        const draw = methods.find((n) => n.name === 'draw');
        expect(draw, 'out-of-class qualified definition is a method since G4').toBeDefined();
        expect(draw!.qualifiedName, 'out-of-class method keeps class scope').toContain(
          'gfx::Canvas::draw',
        );

        const functions = cg.getNodesByKind('function');
        expect(functions.some((n) => n.name === 'freeFn'), 'free function stays a function').toBe(true);
      } finally {
        cg.close();
      }
    });

    it('preserves the receiver of ->/. member calls and promotes out-of-class defs to method (G4)', () => {
      // G4 regression guard at the pure-Rust layer: a typed-pointer member call
      // `m_cpAlg->Processing()` must emit a receiver-qualified unresolved ref
      // `m_cpAlg.Processing` (tree-sitter-cpp models both `.` and `->` as
      // field_expression; `->` normalizes to `.` so the hybrid shell infers the
      // receiver type). Out-of-class definitions are `method`, and an
      // initialized declaration `int r = ...->Processing()` yields variable `r`
      // — never a spurious `Processing` variable.
      writeFile(
        'src/detect.hpp',
        [
          'class CDetect { public: int Processing(); };',
          'class CWidget { public: int Processing(); };',
          'class CDetector {',
          ' private:',
          '  CDetect* m_cpAlg = nullptr;',
          ' public:',
          '  int RunReturn();',
          '  int RunAssign();',
          '  int RunDot();',
          '};',
          '',
        ].join('\n'),
      );
      writeFile(
        'src/detect.cpp',
        [
          '#include "detect.hpp"',
          'int CDetector::RunReturn() { return m_cpAlg->Processing(); }',
          'int CDetector::RunAssign() { int r = m_cpAlg->Processing(); return r; }',
          'int CDetector::RunDot() { CDetect local; return local.Processing(); }',
          'int CDetect::Processing() { return 0; }',
          'int CWidget::Processing() { return 0; }',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        const callNames = unresolvedRefs(db, 'src/detect.cpp')
          .filter((r) => r.reference_kind === 'calls')
          .map((r) => r.reference_name)
          .sort();
        expect(callNames).toEqual([
          'local.Processing',
          'm_cpAlg.Processing',
          'm_cpAlg.Processing',
        ]);

        const methods = cg.getNodesByKind('method');
        for (const m of ['RunReturn', 'RunAssign', 'RunDot']) {
          const node = methods.find((n) => n.name === m);
          expect(node, `${m} out-of-class def is a method`).toBeDefined();
          expect(node!.qualifiedName).toContain(`CDetector::${m}`);
        }
        expect(
          methods.filter((n) => n.name === 'Processing').length,
          'both out-of-class Processing defs are methods',
        ).toBe(2);

        const variables = cg.getNodesByKind('variable');
        expect(
          variables.some((n) => n.name === 'Processing'),
          'no spurious Processing variable from the initializer',
        ).toBe(false);
        expect(variables.some((n) => n.name === 'r'), 'the declared variable r is extracted').toBe(
          true,
        );
      } finally {
        cg.close();
      }
    });
  });

  describe('Java imports baseline', () => {
    it('extracts a simple import (java.util.List)', () => {
      writeFile('Simple.java', 'import java.util.List;\n');
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        expect(cg.getStats().filesByLanguage.java).toBe(1);
        expect(importNames(cg, 'java')).toContain('java.util.List');
        expect(unresolvedImportRefs(db, 'Simple.java')).toContainEqual({
          reference_name: 'java.util.List',
          reference_kind: 'imports',
          line: 1,
          language: 'java',
        });
      } finally {
        cg.close();
      }
    });

    it('extracts a static import under its fully-qualified member name', () => {
      writeFile('Utils.java', 'import static java.util.Collections.emptyList;\n');
      indexWithRust();

      const { cg } = openGraph();
      try {
        expect(importNames(cg, 'java')).toContain('java.util.Collections.emptyList');
      } finally {
        cg.close();
      }
    });

    it('extracts a wildcard import under its package name (java.util.* -> java.util)', () => {
      writeFile('App.java', 'import java.util.*;\n');
      indexWithRust();

      const { cg } = openGraph();
      try {
        expect(importNames(cg, 'java')).toContain('java.util');
      } finally {
        cg.close();
      }
    });

    it('extracts a nested-class import (java.util.Map.Entry)', () => {
      writeFile('MapUtil.java', 'import java.util.Map.Entry;\n');
      indexWithRust();

      const { cg } = openGraph();
      try {
        expect(importNames(cg, 'java')).toContain('java.util.Map.Entry');
      } finally {
        cg.close();
      }
    });

    it('extracts multiple imports from one compilation unit', () => {
      writeFile(
        'Service.java',
        ['import java.util.List;', 'import java.util.Map;', 'import java.io.IOException;', ''].join('\n'),
      );
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        const names = importNames(cg, 'java');
        expect(names).toHaveLength(3);
        expect(names).toContain('java.util.List');
        expect(names).toContain('java.util.Map');
        expect(names).toContain('java.io.IOException');

        const refs = unresolvedImportRefs(db, 'Service.java');
        expect(refs.map((r) => r.reference_name)).toEqual([
          'java.util.List',
          'java.util.Map',
          'java.io.IOException',
        ]);
      } finally {
        cg.close();
      }
    });
  });

  // Legacy L831 cases #3/#4 (package declaration handling). Kept in their own
  // describe because they assert module/qualifiedName shape, not imports.
  describe('Java package declaration baseline', () => {
    // Legacy L831 case #3. The TS extractor wrapped a package in a
    // `namespace` node; the Rust engine models the package as kind `module`
    // (locked by rust-index-engine-cli-language-smoke). The qualifiedName
    // shape is byte-identical, so that part ports directly.
    it('wraps package-level declarations in a module and keeps package-qualified names', () => {
      writeFile(
        'pkg/com/example/foo/Bar.java',
        ['package com.example.foo;', '', 'public class Bar {', '    public String greet() { return "hi"; }', '}', ''].join('\n'),
      );
      indexWithRust();

      const { cg } = openGraph();
      try {
        const filePath = 'pkg/com/example/foo/Bar.java';
        const pkg = cg
          .getNodesByKind('module')
          .find((n) => n.name === 'com.example.foo' && n.filePath === filePath);
        expect(pkg, 'package emitted as a module node').toBeDefined();

        const cls = cg
          .getNodesByKind('class')
          .find((n) => n.name === 'Bar' && n.filePath === filePath);
        expect(cls?.qualifiedName).toBe('com.example.foo::Bar');

        const greet = cg
          .getNodesByKind('method')
          .find((n) => n.name === 'greet' && n.filePath === filePath);
        expect(greet?.qualifiedName).toBe('com.example.foo::Bar::greet');
      } finally {
        cg.close();
      }
    });

    // Legacy L831 case #4. Without a package declaration no wrapper node is
    // emitted. The TS extractor used a bare `Bar` qualifiedName; Rust always
    // file-prefixes top-level symbols (`NoPkg.java::Bar`), a design locked by
    // the smoke suite, so the portable assertion is the ABSENCE of a package
    // module node rather than the bare name.
    it('does not emit a package module when no package is declared', () => {
      writeFile('NoPkg.java', ['public class Bar {', '    public String greet() { return "hi"; }', '}', ''].join('\n'));
      indexWithRust();

      const { cg } = openGraph();
      try {
        const pkgModules = cg
          .getNodesByKind('module')
          .filter((n) => n.language === 'java' && n.filePath === 'NoPkg.java');
        expect(pkgModules).toHaveLength(0);

        const cls = cg
          .getNodesByKind('class')
          .find((n) => n.name === 'Bar' && n.filePath === 'NoPkg.java');
        expect(cls, 'top-level class still indexed without a package').toBeDefined();
        expect(cls?.qualifiedName).toBe('NoPkg.java::Bar');
      } finally {
        cg.close();
      }
    });
  });

  // Legacy L6467. The @interface DEFINITION half
  // (annotation_type_declaration -> interface + element method) is guarded
  // here; the USAGE half (@MyAnno on a class/field/method -> decorates ref) is
  // gap G7 under roadmap 1-2-1-1 and now SHIPPED, covered in the
  // "Java semantic gaps G5-G9" describe below.
  describe('Java annotation definition baseline', () => {
    it('indexes an @interface annotation type and its element method', () => {
      writeFile(
        'p/MyAnno.java',
        ['package p;', 'public @interface MyAnno { String value() default ""; }', ''].join('\n'),
      );
      indexWithRust();

      const { cg } = openGraph();
      try {
        const filePath = 'p/MyAnno.java';
        const anno = cg
          .getNodesByKind('interface')
          .find((n) => n.name === 'MyAnno' && n.filePath === filePath);
        expect(anno, '@interface indexed as an interface node').toBeDefined();
        expect(anno?.qualifiedName).toBe('p::MyAnno');

        const element = cg
          .getNodesByKind('method')
          .find((n) => n.name === 'value' && n.filePath === filePath);
        expect(element, 'annotation element value() indexed as a method').toBeDefined();
        expect(element?.qualifiedName).toBe('p::MyAnno::value');
      } finally {
        cg.close();
      }
    });
  });

  // Legacy extraction.test D group (the `Java Extraction` skip block, cases
  // "anonymous-class overrides" D1/D2). Unlike the modifier/annotation gaps,
  // Rust DOES extract anonymous classes declared via `new T() { ... }`,
  // including inside a lambda body: the synthetic `<T$anon@line>` class, its
  // override methods (fully qualified through the enclosing method path) and
  // the `extends T` / `implements I` refs are all present, so these port
  // end-to-end. One half of the legacy D1 assertion does NOT port: Rust emits
  // no `instantiates` ref for object creation — not even for a plain
  // `new Foo()` — which is the general gap G8 under roadmap 1-2-1-1, not an
  // anonymous-class-specific miss. That half is tracked there and deliberately
  // not asserted here (no red test in wave 0).
  describe('Java anonymous-class overrides baseline', () => {
    // Legacy D1: `new Base() { @Override int compute(...) }` inside a factory
    // method.
    it('extracts an anonymous-class override from `new T() { ... }` with an extends ref', () => {
      writeFile(
        'com/example/Factory.java',
        [
          'package com.example;',
          '',
          'abstract class Base {',
          '  abstract int compute(int x);',
          '}',
          '',
          'public class Factory {',
          '  public Base make() {',
          '    return new Base() {',
          '      @Override',
          '      int compute(int x) { return x + 1; }',
          '    };',
          '  }',
          '}',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        const filePath = 'com/example/Factory.java';

        const anon = cg
          .getNodesByKind('class')
          .find((n) => n.filePath === filePath && /Base\$anon@/.test(n.name));
        expect(anon, 'anonymous Base subclass extracted as a class').toBeDefined();
        expect(anon?.qualifiedName).toContain('Factory::make::<Base$anon@');

        const compute = cg
          .getNodesByKind('method')
          .find(
            (n) =>
              n.filePath === filePath &&
              n.name === 'compute' &&
              (n.qualifiedName.includes('$anon@')),
          );
        expect(compute, 'override method belongs to the anon class').toBeDefined();
        expect(compute?.qualifiedName).toContain('Factory::make::<Base$anon@');
        expect(compute?.qualifiedName?.endsWith('::compute')).toBe(true);

        // The anon class must carry `extends Base` so the interface-impl
        // synthesizer has something to bridge.
        const refs = unresolvedRefs(db, filePath);
        const extendsBase = refs.some(
          (r) => r.reference_kind === 'extends' && r.reference_name === 'Base',
        );
        expect(extendsBase, 'anon class carries an `extends Base` reference').toBe(true);

        // G8 (roadmap 1-2-1-1) SHIPPED: `new T(...)` now emits an
        // `instantiates` unresolved ref. For the anonymous form the synthetic
        // class keeps its own `extends Base` (asserted above) AND the enclosing
        // factory method carries `instantiates Base`, exactly like the legacy
        // TS D1 assertion expected (both edges, from different sources).
        const instantiatesBase = refs.some(
          (r) => r.reference_kind === 'instantiates' && r.reference_name === 'Base',
        );
        expect(
          instantiatesBase,
          'G8: `new Base(){}` emits an instantiates Base ref from the enclosing method',
        ).toBe(true);
      } finally {
        cg.close();
      }
    });

    // Legacy D2: the guava Splitter shape — an anonymous class returned from
    // inside a lambda body passed to a constructor.
    it('extracts an anonymous class declared inside a lambda body', () => {
      writeFile(
        'com/example/Splitter.java',
        [
          'package com.example;',
          '',
          'interface Strategy {',
          '  java.util.Iterator<String> iterator(String s);',
          '}',
          '',
          'abstract class BaseIter implements java.util.Iterator<String> {',
          '  abstract int separatorStart(int start);',
          '}',
          '',
          'public class Splitter {',
          '  private final Strategy strategy;',
          '  public Splitter(Strategy s) { this.strategy = s; }',
          '',
          '  public static Splitter on(char c) {',
          '    return new Splitter((seq) ->',
          '        new BaseIter() {',
          '          @Override',
          '          int separatorStart(int start) { return start + 1; }',
          '          @Override public boolean hasNext() { return false; }',
          '          @Override public String next() { return null; }',
          '        });',
          '  }',
          '}',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        const filePath = 'com/example/Splitter.java';

        const anon = cg
          .getNodesByKind('class')
          .find((n) => n.filePath === filePath && /BaseIter\$anon@/.test(n.name));
        expect(anon, 'anon BaseIter inside the lambda body is extracted').toBeDefined();
        expect(anon?.qualifiedName).toContain('Splitter::on::<BaseIter$anon@');

        const sepStart = cg
          .getNodesByKind('method')
          .find(
            (n) =>
              n.filePath === filePath &&
              n.name === 'separatorStart' &&
              n.qualifiedName.includes('$anon@'),
          );
        expect(sepStart, 'override inside the lambda-returned anon class is a method').toBeDefined();

        // Rust extracts all three overridden methods, not just the abstract one.
        for (const methodName of ['separatorStart', 'hasNext', 'next']) {
          const m = cg
            .getNodesByKind('method')
            .find(
              (n) =>
                n.filePath === filePath &&
                n.name === methodName &&
                n.qualifiedName.includes('$anon@'),
            );
          expect(m, `anon override ${methodName} is indexed`).toBeDefined();
          expect(m?.qualifiedName).toContain('Splitter::on::<BaseIter$anon@');
        }

        // BaseIter's own `implements Iterator` and the anon class's
        // `extends BaseIter` both survive the lambda nesting.
        const refs = unresolvedRefs(db, filePath);
        expect(
          refs.some((r) => r.reference_kind === 'implements' && r.reference_name === 'Iterator'),
          'BaseIter implements Iterator',
        ).toBe(true);
        expect(
          refs.some((r) => r.reference_kind === 'extends' && r.reference_name === 'BaseIter'),
          'anon class extends BaseIter',
        ).toBe(true);
      } finally {
        cg.close();
      }
    });
  });

  // Roadmap 1-2-1-1 (#692) Java semantic gaps G5-G9, calibrated against the
  // pure-Rust engine with sqlite probes. G5/G6 persist modifiers
  // (visibility/is_static); G7 emits decorates refs for annotation usages; G8
  // emits instantiates refs for `new T()`; G9 emits references refs for
  // Capitalized-receiver static-field / enum value reads.
  describe('Java semantic gaps G5-G9 (roadmap 1-2-1-1)', () => {
    function nodeByName(
      cg: CodeGraph,
      filePath: string,
      name: string,
      kind?: string,
    ) {
      return cg
        .getNodesByKind(kind ?? 'method')
        .find((n) => n.filePath === filePath && n.name === name);
    }

    it('G5/G6 persists visibility and is_static (package-private stays null)', () => {
      writeFile(
        'com/example/Calculator.java',
        [
          'package com.example;',
          '',
          'public class Calculator {',
          '    private int secret;',
          '    String packageScoped;',
          '',
          '    public Calculator() {}',
          '    public static int add(int a, int b) { return a + b; }',
          '    protected int getSecret() { return secret; }',
          '}',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg } = openGraph();
      try {
        const filePath = 'com/example/Calculator.java';
        expect(nodeByName(cg, filePath, 'Calculator', 'class')?.visibility).toBe('public');
        expect(nodeByName(cg, filePath, 'secret', 'field')?.visibility).toBe('private');
        expect(nodeByName(cg, filePath, 'getSecret')?.visibility).toBe('protected');
        // No access keyword -> package-private -> NULL (never forced to "private").
        expect(nodeByName(cg, filePath, 'packageScoped', 'field')?.visibility ?? null).toBeNull();
        expect(nodeByName(cg, filePath, 'add')?.isStatic).toBe(true);
        expect(nodeByName(cg, filePath, 'getSecret')?.isStatic).toBe(false);
      } finally {
        cg.close();
      }
    });

    it('G7 emits decorates refs for marker, arg-bearing and qualified annotation usages', () => {
      writeFile(
        'com/example/Service.java',
        'package com.example;\npublic @interface Service { String value() default ""; }\n',
      );
      writeFile(
        'com/example/Edge.java',
        [
          'package com.example;',
          '@com.example.Service',
          'public class Edge {',
          '    @Named("primary")',
          '    private String label;',
          '    @Override public String toString() { return label; }',
          '}',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        const refs = unresolvedRefs(db, 'com/example/Edge.java').filter(
          (r) => r.reference_kind === 'decorates',
        );
        const names = refs.map((r) => r.reference_name).sort();
        expect(names).toEqual(['Named', 'Override', 'Service']);
      } finally {
        cg.close();
      }
    });

    it('G8/G9 emits instantiates for new T() and references for Capitalized static reads', () => {
      writeFile(
        'com/example/User.java',
        'package com.example;\npublic class User {\n    public String getName() { return ""; }\n}\n',
      );
      writeFile(
        'com/example/JsonScope.java',
        'package com.example;\npublic class JsonScope {\n    public static final int EMPTY_DOCUMENT = 1;\n}\n',
      );
      writeFile(
        'com/example/Client.java',
        [
          'package com.example;',
          'public class Client {',
          '    public int run() {',
          '        int scope = JsonScope.EMPTY_DOCUMENT;',
          '        User user = new User();',
          '        return user.getName().length() + scope;',
          '    }',
          '}',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        const refs = unresolvedRefs(db, 'com/example/Client.java');
        expect(
          refs.some((r) => r.reference_kind === 'instantiates' && r.reference_name === 'User'),
          'plain new User() emits instantiates User',
        ).toBe(true);
        expect(
          refs.some((r) => r.reference_kind === 'references' && r.reference_name === 'JsonScope'),
          'JsonScope.EMPTY_DOCUMENT value read emits references JsonScope',
        ).toBe(true);
        expect(
          refs.some((r) => r.reference_kind === 'references' && r.reference_name === 'user'),
          'lowercase instance read user.getName() must not emit a references ref',
        ).toBe(false);
      } finally {
        cg.close();
      }
    });
  });

  // Kotlin baseline (roadmap 1-6-1 wave 1). The fwcd tree-sitter-kotlin 0.4
  // grammar drives pure-Rust extraction: package module, imports,
  // class/interface/enum/data-class/object, member + top-level + extension
  // functions, properties, type aliases, call sites (simple / qualified /
  // chained), type-position references, delegation `: T` and annotation
  // usages. Assertions were calibrated against the Rust core via sqlite
  // probes. `fun interface` ERROR recovery, expect/actual and companion-object
  // static semantics are deliberately out of the baseline.
  describe('Kotlin baseline (roadmap 1-6-1)', () => {
    function ktNodes(
      cg: CodeGraph,
      filePath: string,
      kind: string,
    ): Array<{ name: string; qualifiedName: string; visibility: string | null }> {
      return cg
        .getNodesByKind(kind)
        .filter((n) => n.language === 'kotlin' && n.filePath === filePath)
        .map((n) => ({ name: n.name, qualifiedName: n.qualifiedName, visibility: n.visibility ?? null }));
    }

    function ktRefs(db: DbHandle, filePath: string, kind: string): string[] {
      return unresolvedRefs(db, filePath)
        .filter((r) => r.reference_kind === kind)
        .map((r) => r.reference_name);
    }

    it('counts .kt files under the kotlin language and indexes imports', () => {
      writeFile('com/example/a.kt', 'package com.example\n\nimport kotlin.collections.List\nimport com.other.Thing\n\nclass A\n');
      writeFile('com/example/b.kt', 'package com.example\n\nclass B\n');
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        expect(cg.getStats().filesByLanguage.kotlin).toBe(2);
        expect(importNames(cg, 'kotlin')).toEqual([
          'kotlin.collections.List',
          'com.other.Thing',
        ]);
        const refs = unresolvedImportRefs(db, 'com/example/a.kt').map((r) => r.reference_name);
        expect(refs).toEqual(['kotlin.collections.List', 'com.other.Thing']);
      } finally {
        cg.close();
      }
    });

    it('wraps the package in a module and keeps package-qualified symbol names', () => {
      const filePath = 'com/example/demo/Models.kt';
      writeFile(
        filePath,
        ['package com.example.demo', '', 'class UserService {', '    fun find(id: Int): User = User()', '}', ''].join('\n'),
      );
      indexWithRust();

      const { cg } = openGraph();
      try {
        const pkg = cg
          .getNodesByKind('module')
          .find((n) => n.language === 'kotlin' && n.name === 'com.example.demo' && n.filePath === filePath);
        expect(pkg, 'package emitted as a module node').toBeDefined();

        const cls = ktNodes(cg, filePath, 'class').find((n) => n.name === 'UserService');
        expect(cls?.qualifiedName).toBe('com.example.demo::UserService');

        const method = ktNodes(cg, filePath, 'method').find((n) => n.name === 'find');
        expect(method?.qualifiedName).toBe('com.example.demo::UserService::find');
      } finally {
        cg.close();
      }
    });

    it('classifies class/interface/enum/data-class/object and enum entries', () => {
      const filePath = 'com/example/demo/Shapes.kt';
      writeFile(
        filePath,
        [
          'package com.example.demo',
          '',
          'interface Named {',
          '    fun name(): String',
          '}',
          '',
          'enum class Level {',
          '    LOW, HIGH, MEDIUM',
          '}',
          '',
          'data class User(val name: String, var age: Int = 0) : Named',
          '',
          'object Registry {',
          '    const val MAX: Int = 100',
          '}',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        const names = (kind: string) => ktNodes(cg, filePath, kind).map((n) => n.name).sort();
        expect(names('interface')).toEqual(['Named']);
        expect(names('enum')).toEqual(['Level']);
        expect(names('class').sort()).toEqual(['Registry', 'User']);
        expect(names('enum_member')).toEqual(['HIGH', 'LOW', 'MEDIUM']);
        // data class : Named → extends ref
        const extendsRefs = ktRefs(db, filePath, 'extends');
        expect(extendsRefs).toContain('Named');
      } finally {
        cg.close();
      }
    });

    it('qualifies extension functions through their receiver type', () => {
      const filePath = 'com/example/demo/Ext.kt';
      writeFile(
        filePath,
        ['package com.example.demo', '', 'fun Int.times2(): Int = this * 2', ''].join('\n'),
      );
      indexWithRust();

      const { cg } = openGraph();
      try {
        // An extension receiver extracts as a METHOD qualified `Int::times2`,
        // mirroring the TS getReceiverType qualifiedName override.
        const ext = cg
          .getNodesByKind('method')
          .find((n) => n.language === 'kotlin' && n.filePath === filePath && n.name === 'times2');
        expect(ext, 'extension fun extracted as method').toBeDefined();
        expect(ext?.qualifiedName).toBe('Int::times2');
        expect(cg.getNodesByKind('function').some((n) => n.name === 'times2')).toBe(false);
      } finally {
        cg.close();
      }
    });

    it('routes class-body members to property and locals/top-level vals to variable', () => {
      const filePath = 'com/example/demo/Svc.kt';
      writeFile(
        filePath,
        [
          'package com.example.demo',
          '',
          'object Registry {',
          '    const val MAX: Int = 100',
          '}',
          '',
          'class Svc {',
          '    private val total: Int get() = 0',
          '    fun go() { val label = 1 }',
          '}',
          '',
          'val topLevel: Int = 0',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg } = openGraph();
      try {
        const props = ktNodes(cg, filePath, 'property');
        expect(props.map((p) => p.name).sort()).toEqual(['MAX', 'total']);
        expect(props.find((p) => p.name === 'total')?.visibility).toBe('private');
        // No explicit modifier → Kotlin default public.
        expect(props.find((p) => p.name === 'MAX')?.visibility).toBe('public');

        const vars = ktNodes(cg, filePath, 'variable').map((v) => v.name).sort();
        expect(vars).toEqual(['label', 'topLevel']);
      } finally {
        cg.close();
      }
    });

    it('extracts a type alias node', () => {
      const filePath = 'com/example/demo/Aliases.kt';
      writeFile(
        filePath,
        'package com.example.demo\n\ntypealias Users = List<User>\n',
      );
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        expect(ktNodes(cg, filePath, 'type_alias').map((n) => n.name)).toEqual(['Users']);
        // RHS user_type emits a references edge to the aliased type.
        expect(ktRefs(db, filePath, 'references')).toContain('User');
      } finally {
        cg.close();
      }
    });

    it('emits calls: bare name, receiver-qualified, and bare method on a call receiver', () => {
      const filePath = 'com/example/demo/Flow.kt';
      writeFile(
        filePath,
        [
          'package com.example.demo',
          '',
          'class Repo {',
          '    fun count(): Int = 0',
          '}',
          '',
          'class Flow(private val repo: Repo) {',
          '    fun run() {',
          '        val s = StringBuilder().append(1)',
          '        helper(s)',
          '        return repo.count()',
          '    }',
          '}',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        const calls = ktRefs(db, filePath, 'calls');
        expect(calls).toContain('helper');
        expect(calls).toContain('repo.count');
        // Chained call whose receiver is itself a call (`StringBuilder().append`)
        // emits the bare method name, not the noisy `StringBuilder().append`.
        expect(calls).toContain('append');
        expect(calls.some((c) => c.includes('('))).toBe(false);
      } finally {
        cg.close();
      }
    });

    it('emits extends refs for every delegation specifier and decorates for annotations', () => {
      const filePath = 'com/example/demo/UserService.kt';
      writeFile(
        filePath,
        [
          'package com.example.demo',
          '',
          'import org.springframework.stereotype.Service',
          '',
          'class UserRepository',
          'open class Base',
          'interface Iface',
          '',
          '@Service',
          'class UserService(private val repo: UserRepository) : Base(), Iface',
          '',
        ].join('\n'),
      );
      indexWithRust();

      const { cg, db } = openGraph();
      try {
        const ext = ktRefs(db, filePath, 'extends').sort();
        expect(ext).toEqual(['Base', 'Iface']);
        expect(ktRefs(db, filePath, 'decorates')).toEqual(['Service']);
        // Primary-constructor property type is a type-position reference.
        expect(ktRefs(db, filePath, 'references')).toContain('UserRepository');
      } finally {
        cg.close();
      }
    });
  });
});