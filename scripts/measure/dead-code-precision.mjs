#!/usr/bin/env node
/**
 * dead-code-precision.mjs — precision measurement for find_dead_code v1
 * (roadmap node 1-2-5).
 *
 * Runs the shipped rubric implementation (src/dead-code via dist/) over
 * the five pinned corpora, then compares the `dead` bucket against the
 * R2 human/arbitrated labels recorded in
 * docs/evidence/2026-10-21-dead-code-rubric-v1-annotation-r1.json.
 *
 * Metrics (per contract dead-code-rubric-v1):
 *   precision  = |dead ∩ R2-dead| / |dead|       (dead bucket only)
 *   agreement  = |tool bucket == R2 bucket| / N  (per corpus, on labeled)
 * Node 1-2-5 gate: pooled precision ≥ 80% and per-corpus agreement ≥ 85%
 * over the four application corpora; actix-web is reported separately.
 *
 * Usage:
 *   node scripts/measure/dead-code-precision.mjs
 *     [--corpus-root dir] [--r1-evidence path] [--out report.json]
 *     [--only slug] [--quiet]
 */

import { log, fail } from './lib/args.mjs';
import { ensureClone } from './lib/clone.mjs';
import { openDb } from './lib/probe.mjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const CORPORA = [
  { slug: 'dotnet-architecture/eShopOnWeb', language: 'csharp', sparse: ['src'] },
  { slug: 'spring-projects/spring-petclinic', language: 'java', sparse: ['src'] },
  { slug: 'drupal/drupal', language: 'php', sparse: ['core/lib', 'core/modules'] },
  { slug: 'django/django', language: 'python', sparse: ['django'] },
  { slug: 'actix/actix-web', language: 'rust', sparse: ['src', 'actix-web/src'] },
];

const APPLICATION_CORPORA = new Set([
  'dotnet-architecture/eShopOnWeb',
  'spring-projects/spring-petclinic',
  'drupal/drupal',
  'django/django',
]);

function parseCli(argv) {
  const args = {
    corpusRoot: 'C:/workspace/measure-corpus',
    r1Evidence: path.join(repoRoot, 'docs', 'evidence', '2026-10-21-dead-code-rubric-v1-annotation-r1.json'),
    out: null,
    quiet: false,
    only: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--corpus-root') args.corpusRoot = argv[++i];
    else if (a === '--r1-evidence') args.r1Evidence = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--only') args.only = argv[++i];
    else throw new Error(`unknown flag: ${a}`);
  }
  return args;
}

async function loadEvaluator() {
  const rubricPath = path.join(repoRoot, 'dist', 'dead-code', 'rubric.js');
  if (!fs.existsSync(rubricPath)) {
    throw new Error(`dist not built: ${rubricPath} missing (run npm run build first)`);
  }
  return import(pathToFileURL(rubricPath).href);
}

function buildEvalInput(db, repoDir, rubric) {
  const nodes = db.prepare(
    `SELECT id, kind, name, qualified_name, file_path, language,
            start_line, end_line, signature, visibility, is_exported,
            decorators
        FROM nodes
        WHERE kind IN ('function','method')
           OR (kind = 'import' AND language = 'rust')`,
  ).all();

  // 1-2-12-4: include signature so the rubric reads an interface's
  // materialized superinterface list (Spring Data repository signal).
  const allNodes = db.prepare(`SELECT id, kind, name, file_path, signature FROM nodes`).all();
  const edges = db.prepare(`SELECT source, target, kind FROM edges`).all();

  const decoratesBySource = new Map();
  for (const r of db.prepare(
    `SELECT e.source AS src, tn.name AS tname
       FROM edges e JOIN nodes tn ON tn.id = e.target
      WHERE e.kind = 'decorates'`,
  ).all()) {
    if (!decoratesBySource.has(r.src)) decoratesBySource.set(r.src, new Set());
    decoratesBySource.get(r.src).add(String(r.tname).toLowerCase());
  }

  const importsByFile = new Map();
  for (const r of db.prepare(
    `SELECT n.file_path AS fp, tn.name AS tname
       FROM edges e
       JOIN nodes n ON n.id = e.source
       JOIN nodes tn ON tn.id = e.target
      WHERE e.kind = 'imports'`,
  ).all()) {
    if (!importsByFile.has(r.fp)) importsByFile.set(r.fp, new Set());
    importsByFile.get(r.fp).add(String(r.tname).toLowerCase());
  }

  const indexedFiles = new Set(
    db.prepare(`SELECT path FROM files`).all().map((r) => r.path),
  );

  const contentCache = new Map();
  const readIndexed = (fp) => {
    if (contentCache.has(fp)) return contentCache.get(fp);
    let content = null;
    if (indexedFiles.has(fp)) {
      try {
        content = fs.readFileSync(path.join(repoDir, fp), 'utf8');
      } catch { content = null; }
    }
    contentCache.set(fp, content);
    return content;
  };

  let razorCorpus = null;
  const razorReferencesClass = (qualifiedClassName) => {
    if (razorCorpus === null) {
      const parts = [];
      for (const fp of indexedFiles) {
        if (fp.toLowerCase().endsWith('.razor')) {
          const c = readIndexed(fp);
          if (c !== null) parts.push(c);
        }
      }
      razorCorpus = parts.join('\n');
    }
    if (razorCorpus.length === 0) return false;
    const shortName = qualifiedClassName.split('::').pop() ?? qualifiedClassName;
    return razorCorpus.includes(shortName);
  };

  return {
    nodes,
    edges,
    allNodes,
    decoratesBySource,
    importsByFile,
    probeFileContent: (fp, needle) => {
      const c = readIndexed(fp);
      return c !== null && c.includes(needle);
    },
    hasRazorSibling: (fp) => {
      const sib = fp.replace(/\.razor\.cs$/i, '.razor');
      return sib !== fp && indexedFiles.has(sib);
    },
    razorReferencesClass,
  };
}

function main() {
  mainAsync().catch((err) => fail(err instanceof Error ? err.message : String(err)));
}

async function mainAsync() {
  const args = parseCli(process.argv.slice(2));
  const rubric = await loadEvaluator();

  if (!fs.existsSync(args.r1Evidence)) {
    throw new Error(`R1 evidence file not found: ${args.r1Evidence}`);
  }
  const r1 = JSON.parse(fs.readFileSync(args.r1Evidence, 'utf8'));

  // R2 truth keyed by node id (only the labeled subset — the 108 dead-bucket
  // entries that went through R2-auto + R2-human).
  const truthByCorpus = new Map();
  for (const c of r1.corpora) {
    const truth = new Map();
    for (const s of c.sample) {
      if (s.r2_verdict && s.r2_verdict.bucket) {
        truth.set(s.id, s.r2_verdict.bucket);
      }
    }
    truthByCorpus.set(c.slug, truth);
  }

  const corpora = args.only ? CORPORA.filter((c) => c.slug === args.only) : CORPORA;
  if (corpora.length === 0) {
    fail(`no corpus with slug '${args.only}' (known: ${CORPORA.map((c) => c.slug).join(', ')})`);
  }

  const report = {
    metric: 'dead-code-precision',
    rubric: 'DES-dead-code-rubric-v1',
    implementation: 'dist/dead-code/rubric.js (shipped v1, A1+A2 applied)',
    startedAt: new Date().toISOString(),
    corpora: [],
  };

  for (const corpus of corpora) {
    const [owner, name] = corpus.slug.split('/');
    log(args, `=== ${corpus.slug} ===`);
    // Local-dir fast path: the pinned clones already exist (built by
    // dead-code-annotate-r1.mjs during 1-2-4). Reusing them avoids any
    // network/SSH dependency; the SHA is read from the local HEAD and
    // cross-checked against the R1 evidence pin.
    const localDir = path.join(args.corpusRoot, `${owner}-${name}`);
    let sha;
    let repoDir;
    if (fs.existsSync(path.join(localDir, '.git'))) {
      repoDir = localDir;
      sha = execSync('git log -1 --format=%H', { cwd: repoDir, encoding: 'utf8' }).trim();
      const r1Pin = (r1.corpora.find((c) => c.slug === corpus.slug)?.pinned_sha ?? '').trim();
      if (r1Pin && !sha.startsWith(r1Pin) && !r1Pin.startsWith(sha.slice(0, r1Pin.length))) {
        log(args, `WARN: local HEAD ${sha.slice(0, 12)} != R1 pin ${r1Pin} for ${corpus.slug}`);
      }
      log(args, `reuse: ${repoDir} @ ${sha.slice(0, 12)}`);
    } else {
      const clone = ensureClone({
        repo: {
          owner,
          name,
          slug: corpus.slug,
          cloneUrl: `https://github.com/${corpus.slug}.git`,
          httpsUrl: `https://github.com/${corpus.slug}.git`,
          sshUrl: `git@github.com:${corpus.slug}.git`,
        },
        ref: null,
        sparse: corpus.sparse,
        corpusRoot: args.corpusRoot,
        quiet: args.quiet,
      });
      sha = clone.sha;
      repoDir = repoDir;
    }
    const sha12 = sha.slice(0, 12);

    const dbPath = path.join(repoDir, '.zcodegraph', 'zcodegraph.db');
    if (!fs.existsSync(dbPath)) {
      throw new Error(`index DB missing: ${dbPath} (run dead-code-annotate-r1.mjs first to build the pinned indexes)`);
    }

    const db = openDb(dbPath);
    let verdicts;
    try {
      const input = buildEvalInput(db, repoDir, rubric);
      verdicts = rubric.evaluateDeadCode(input);
    } finally {
      db.close();
    }

    const buckets = { dead: 0, alive: 0, unknown: 0 };
    for (const v of verdicts) buckets[v.bucket]++;
    const byId = new Map(verdicts.map((v) => [v.id, v]));

    // Compare on the R2-labeled subset.
    const truth = truthByCorpus.get(corpus.slug) ?? new Map();
    let agree = 0;
    let labeled = 0;
    let deadTp = 0; // tool dead AND truth dead
    let deadTotal = 0; // tool dead among labeled
    const disagreements = [];
    for (const [id, truthBucket] of truth) {
      const v = byId.get(id);
      if (!v) continue; // node no longer a candidate (e.g. A2 exclusion)
      labeled++;
      if (v.bucket === 'dead') {
        deadTotal++;
        if (truthBucket === 'dead') deadTp++;
      }
      if (v.bucket === truthBucket) {
        agree++;
      } else {
        disagreements.push({
          id,
          qualified_name: v.qualified_name,
          file_path: v.file_path,
          tool: v.bucket,
          rule_id: v.rule_id,
          truth: truthBucket,
        });
      }
    }

    const precision = deadTotal > 0 ? Math.round((deadTp / deadTotal) * 1000) / 1000 : null;
    const agreement = labeled > 0 ? Math.round((agree / labeled) * 1000) / 1000 : null;

    report.corpora.push({
      slug: corpus.slug,
      language: corpus.language,
      pinned_sha: sha12,
      candidates: verdicts.length,
      buckets,
      labeled,
      agree,
      agreement,
      dead_on_labeled: deadTotal,
      dead_true_positive: deadTp,
      precision,
      disagreements,
    });
    log(args, `candidates=${verdicts.length} buckets=${JSON.stringify(buckets)} labeled=${labeled} agreement=${agreement} precision=${precision}`);
  }

  // Pooled metrics over the four application corpora (actix separate).
  let pLabeled = 0, pAgree = 0, pDeadTotal = 0, pDeadTp = 0;
  for (const c of report.corpora) {
    if (!APPLICATION_CORPORA.has(c.slug)) continue;
    pLabeled += c.labeled;
    pAgree += c.agree;
    pDeadTotal += c.dead_on_labeled;
    pDeadTp += c.dead_true_positive;
  }
  report.application_pooled = {
    labeled: pLabeled,
    agreement: pLabeled > 0 ? Math.round((pAgree / pLabeled) * 1000) / 1000 : null,
    dead_on_labeled: pDeadTotal,
    dead_true_positive: pDeadTp,
    precision: pDeadTotal > 0 ? Math.round((pDeadTp / pDeadTotal) * 1000) / 1000 : null,
  };

  const json = JSON.stringify(report, null, 2);
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, json + '\n');
    log(args, `report: ${args.out}`);
  } else {
    process.stdout.write(json + '\n');
  }
}

main();
