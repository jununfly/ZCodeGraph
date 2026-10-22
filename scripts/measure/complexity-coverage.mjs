#!/usr/bin/env node
/**
 * complexity-coverage.mjs — measure per-language complexity coverage on a
 * real-world repo (roadmap node 1-2-6 exit criterion).
 *
 * Definition (docs/contracts/complexity-rubric-v1.md § Metrics):
 *   coverage_lang = |computable nodes| / |successfully indexed function+method nodes in lang|
 * where computable = body slice readable AND not exempt.
 *
 * Frozen languages: csharp, java, php, python, rust. Other languages are
 * excluded from both numerator and denominator.
 *
 * Exit criterion (1-2-6): coverage_lang ≥ 0.90 for every frozen language
 * present in the corpus.
 *
 * Usage:
 *   node scripts/measure/complexity-coverage.mjs <github-url> [--ref sha]
 *     [--sparse path] [--out report.json] [--corpus-root dir]
 *     [--no-keep] [--quiet] [--reuse-db]
 *
 * --reuse-db: skip `zcodegraph index` and read the existing
 * .zcodegraph/zcodegraph.db in the corpus dir. Use when the corpus
 * index is already built and known-good (e.g. drupal partial index —
 * re-running `index` would hit the FOREIGN KEY issue; the preserved
 * DB is still the right measurement target, matching the dead-code
 * annotation evidence).
 */

import { parseArgs, log, fail } from './lib/args.mjs';
import { ensureClone } from './lib/clone.mjs';
import { runIndex } from './lib/index.mjs';
import { openDb } from './lib/probe.mjs';
import { emitReport } from './lib/report.mjs';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FROZEN_LANGUAGES = ['csharp', 'java', 'php', 'python', 'rust'];
const COVERAGE_TARGET = 0.9;

function main() {
  // parseArgs rejects unknown flags, so filter --reuse-db before parsing
  // and track it separately.
  const argv = process.argv.slice(2);
  const reuseDbIdx = argv.indexOf('--reuse-db');
  const reuseDb = reuseDbIdx !== -1;
  if (reuseDb) argv.splice(reuseDbIdx, 1);

  const args = parseArgs(argv);
  const startedAt = Date.now();

  const clone = ensureClone(args);
  log(args, `clone: ${clone.sha} (${clone.durationMs}ms, reused=${clone.reusedClone})`);

  let idx;
  if (reuseDb) {
    const dbPath = path.join(clone.repoDir, '.zcodegraph', 'zcodegraph.db');
    if (!fs.existsSync(dbPath)) {
      fail(`--reuse-db requested but ${dbPath} is missing`);
    }
    idx = { dbPath, durationMs: 0 };
    log(args, `reuse-db: ${idx.dbPath} (index step skipped)`);
  } else {
    idx = runIndex({ repoDir: clone.repoDir, quiet: args.quiet });
    log(args, `index: ${idx.dbPath} (${idx.durationMs}ms)`);
  }

  // Import rubric lazily — it has no node:sqlite dep, so it's safe to
  // load after the DB is built.
  return import('../../dist/metrics/complexity/rubric.js')
    .then(({ computeCyclomatic }) => {
      const db = openDb(idx.dbPath);
      let rows;
      try {
        rows = db
          .prepare(
            `SELECT id, kind, name, qualified_name, file_path, language,
                    start_line, end_line, start_column, end_column,
                    signature, visibility, is_exported, is_async, is_static,
                    is_abstract, decorators, docstring, type_parameters,
                    updated_at
             FROM nodes
             WHERE kind IN ('function','method')
               AND language IN ('csharp','java','php','python','rust')`,
          )
          .all();
      } finally {
        db.close();
      }

      const perLang = {};
      for (const lang of FROZEN_LANGUAGES) {
        perLang[lang] = {
          total: 0,
          computable: 0,
          exempt: 0,
          miss: 0,
          exemptByReason: {},
        };
      }

      for (const r of rows) {
        const lang = r.language;
        if (!perLang[lang]) continue;
        perLang[lang].total++;

        // Resolve file path — file_path in nodes is relative to the
        // indexed project root.
        const absPath = path.resolve(clone.repoDir, r.file_path);
        let bodySlice = null;
        try {
          const content = fs.readFileSync(absPath, 'utf-8');
          const lines = content.split('\n');
          const startIdx = Math.max(0, r.start_line - 1);
          const endIdx = Math.min(lines.length, r.end_line);
          if (startIdx < endIdx) {
            bodySlice = lines.slice(startIdx, endIdx).join('\n');
          }
        } catch {
          // bodySlice stays null → miss bucket below
        }

        // Adapt DB row → Node shape (camelCase) expected by rubric.
        const node = {
          id: r.id,
          kind: r.kind,
          name: r.name,
          qualifiedName: r.qualified_name,
          filePath: r.file_path,
          language: r.language,
          startLine: r.start_line,
          endLine: r.end_line,
          startColumn: r.start_column,
          endColumn: r.end_column,
          signature: r.signature ?? undefined,
          visibility: r.visibility ?? undefined,
          isExported: r.is_exported === 1,
          isAsync: r.is_async === 1,
          isStatic: r.is_static === 1,
          isAbstract: r.is_abstract === 1,
          decorators: r.decorators ? JSON.parse(r.decorators) : undefined,
          docstring: r.docstring ?? undefined,
          typeParameters: r.type_parameters
            ? JSON.parse(r.type_parameters)
            : undefined,
          updatedAt: r.updated_at,
        };

        const verdict = computeCyclomatic(node, bodySlice);

        if (verdict.exemption !== null) {
          perLang[lang].exempt++;
          const r8n = verdict.exemption;
          perLang[lang].exemptByReason[r8n] =
            (perLang[lang].exemptByReason[r8n] ?? 0) + 1;
        } else if (verdict.value !== null) {
          perLang[lang].computable++;
        } else {
          perLang[lang].miss++;
        }
      }

      // Coverage: per rubric § Metrics, denominator includes exempt
      // nodes ("successfully indexed"); miss counts against coverage.
      const coverage = {};
      let allPass = true;
      for (const lang of FROZEN_LANGUAGES) {
        const bucket = perLang[lang];
        if (bucket.total === 0) {
          coverage[lang] = null; // language not in corpus
          continue;
        }
        const cov = bucket.computable / bucket.total;
        coverage[lang] = Math.round(cov * 1000) / 1000;
        if (cov < COVERAGE_TARGET) allPass = false;
      }

      emitReport({
        metric: 'complexity-coverage',
        repo: args.repo,
        ref: clone.sha,
        value: {
          coverage,
          target: COVERAGE_TARGET,
          pass: allPass,
          perLang,
        },
        evidence: {
          corpusDir: clone.repoDir,
          dbPath: idx.dbPath,
          frozenLanguages: FROZEN_LANGUAGES,
          cloneDurationMs: clone.durationMs,
          indexDurationMs: idx.durationMs,
          totalDurationMs: Date.now() - startedAt,
          reusedClone: clone.reusedClone,
        },
        out: args.out,
      });

      if (!allPass) {
        process.exit(2);
      }
    })
    .catch((err) => {
      fail(err instanceof Error ? err.message : String(err));
    });
}

try {
  main();
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
