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
 * The C++ free-function block is only partially portable: the
 * qualified-type-param function (`TableFileName`) is named correctly, but a
 * trailing-return-type function (`auto BuildName(...) -> std::string`) is
 * still misnamed `string`. That is a tracked Rust extraction gap
 * (roadmap 1-2-3-1 / G1), so the legacy skip block for it stays until the
 * gap is fixed — no red or fake-green test is written here.
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
      // its real name. (The trailing-return-type twin of this bug, `BuildName`,
      // is still open — roadmap 1-2-3-1 / G1 — so it is intentionally NOT
      // asserted here.)
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
});
