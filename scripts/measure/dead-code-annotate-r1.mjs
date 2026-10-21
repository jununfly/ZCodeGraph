#!/usr/bin/env node
/**
 * dead-code-annotate-r1.mjs — R1 (mechanical) annotation for
 * dead-code-rubric-v1 (roadmap node 1-2-4).
 *
 * Executes the rubric verbatim against each corpus's indexed SQLite:
 *   candidacy query -> R1 whitelist -> R2 framework entries ->
 *   R3 dynamic-dispatch exemptions -> R4 residual dead
 * then draws the annotation sample (all dead up to --sample-dead, padded
 * with an equal number of alive/unknown draws, min --sample-min per corpus;
 * deterministic via --seed).
 *
 * Zero judgment: every verdict is the first-matching rule, recorded with
 * its rule id and evidence fields.
 *
 * Usage:
 *   node scripts/measure/dead-code-annotate-r1.mjs
 *     [--corpus-root dir] [--seed N] [--sample-dead N] [--sample-min N]
 *     [--out report.json] [--quiet] [--only slug]
 */

import { log, fail } from './lib/args.mjs';
import { ensureClone } from './lib/clone.mjs';
import { runIndex } from './lib/index.mjs';
import { openDb } from './lib/probe.mjs';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Corpus manifest (decision 2026-10-21: sparse cones mirror prior evidence)
// ---------------------------------------------------------------------------

const CORPORA = [
  {
    slug: 'dotnet-architecture/eShopOnWeb',
    language: 'csharp',
    sparse: ['src'],
  },
  {
    slug: 'spring-projects/spring-petclinic',
    language: 'java',
    sparse: ['src'],
  },
  {
    slug: 'drupal/drupal',
    language: 'php',
    sparse: ['core/lib', 'core/modules'],
  },
  {
    slug: 'django/django',
    language: 'python',
    sparse: ['django'],
  },
  {
    slug: 'actix/actix-web',
    language: 'rust',
    sparse: ['src', 'actix-web/src'],
  },
];

// ---------------------------------------------------------------------------
// Rubric constants (docs/contracts/dead-code-rubric-v1.md — keep in sync)
// ---------------------------------------------------------------------------

const PATH_EXCLUSIONS = [
  'test', 'tests', '__tests__', 'spec', 'testing', 'testdata',
  'mock', 'mocks', 'fixture', 'fixtures',
  'generated', 'gen-', '.generated', 'vendor', 'migrations',
];

const WHITELIST = {
  java: [
    'override', 'bean', 'component', 'service', 'repository', 'controller',
    'requestmapping', 'getmapping', 'postmapping', 'putmapping',
    'deletemapping', 'patchmapping', 'autowired', 'inject', 'postconstruct',
    'predestroy', 'eventlistener', 'scheduled', 'transactional', 'test',
    'parameterizedtest', 'beforeeach', 'aftereach', 'beforeall', 'afterall',
  ],
  csharp: [
    'apicontroller', 'route', 'httpget', 'httppost', 'httpput', 'httpdelete',
    'httppatch', 'fact', 'theory', 'test', 'testmethod', 'setup', 'teardown',
    'onmodelcreating', 'jsonconstructor', 'webmethod', 'grpc',
  ],
  python: [
    'property', 'staticmethod', 'classmethod', 'abstractmethod',
    'pytest.fixture', 'fixture', 'app.route', 'route', 'get', 'post', 'put',
    'delete', 'patch', 'api_view', 'receiver', 'override', 'patch.object',
    'mock', 'celery.task', 'shared_task', 'lru_cache', 'cache', 'wraps',
    'contextmanager', 'dataclass',
  ],
  php: [
    'route', 'middleware', 'scope', 'boot', 'register', 'hook_', 'test',
    'dataprovider',
  ],
  rust: [
    'test', 'no_mangle', 'wasm_bindgen', 'derive', 'async_std.main',
    'tokio.main', 'actix', 'get(', 'post(', 'route', 'handler',
  ],
};

const ENTRY_NAMES = new Set([
  'main', 'Main', 'index', 'handler', 'Handler', '__init__', '__call__',
  'run', 'boot', 'register', 'setup', 'configure', 'create', 'build',
  'constructor', '__construct',
]);

const TEST_NAME_RE = /^(test|Test|it|should)|(_test|test_)$|^test_/;

const R3_CALLBACK_NAMES = new Set([
  'toString', 'toJson', 'to_json', 'fromJson', 'from_json', 'serialize',
  'deserialize', '__str__', '__repr__', '__eq__', '__hash__', '__lt__',
  '__len__', '__iter__', '__enter__', '__exit__', '__getattr__',
  '__getattribute__', '__setattr__', 'equals', 'hashCode', 'clone',
  'finalize', 'close', 'dispose', 'Dispose', 'CompareTo', 'GetHashCode',
  'Equals', 'ToString', 'accept', 'render',
]);

const R3_NAME_RE = /^(visit|on)[A-Z_]/; // visit*, on* event-handler convention

const REFLECTION_IMPORT_SIGNALS = [
  'system.reflection', 'java.lang.reflect', 'importlib',
  'spring-context', 'autofac', 'injector',
];

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32) for sample draws
// ---------------------------------------------------------------------------

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Rubric evaluation
// ---------------------------------------------------------------------------

function pathExcluded(filePath) {
  const p = filePath.toLowerCase();
  return PATH_EXCLUSIONS.some((frag) => p.includes(frag));
}

function matchWhitelist(language, decorators, signature, decoratesNames) {
  const list = WHITELIST[language];
  if (!list) return null;
  const decos = (decorators ?? []).map((d) => String(d).toLowerCase());
  for (const d of decos) {
    for (const w of list) {
      if (d.includes(w)) return { hit: w, via: 'decorators' };
    }
  }
  if (decoratesNames) {
    for (const d of decoratesNames) {
      for (const w of list) {
        if (d.includes(w)) return { hit: w, via: 'decorates-edge' };
      }
    }
  }
  // C# `override` is a signature keyword, not an attribute.
  if (language === 'csharp' && signature && /\boverride\b/.test(signature)) {
    return { hit: 'override', via: 'signature' };
  }
  return null;
}

function evaluateCorpus(db, language) {
  const nodes = db.prepare(
    `SELECT id, kind, name, qualified_name, file_path, language,
            start_line, end_line, signature, visibility, is_exported,
            decorators
       FROM nodes
      WHERE kind IN ('function','method')`,
  ).all();

  const edges = db.prepare(
    `SELECT source, target, kind FROM edges`,
  ).all();

  // R1 fallback signal: resolved `decorates` edges. When an extractor does
  // not populate the `decorators` column (e.g. Java emits annotation USAGES
  // as decorates refs, and only resolved ones land as edges), the
  // annotation's leaf type name is still visible here. Whitelist matching
  // uses the same substring rule on the target node's name.
  const decoratesBySource = new Map(); // node id -> Set<string> (leaf names)
  {
    const rows = db.prepare(
      `SELECT e.source AS src, tn.name AS tname
         FROM edges e JOIN nodes tn ON tn.id = e.target
        WHERE e.kind = 'decorates'`,
    ).all();
    for (const r of rows) {
      if (!decoratesBySource.has(r.src)) decoratesBySource.set(r.src, new Set());
      decoratesBySource.get(r.src).add(String(r.tname).toLowerCase());
    }
  }

  const importsByFile = new Map(); // file_path -> Set<string> (import target names)
  {
    const rows = db.prepare(
      `SELECT n.file_path AS fp, e.target AS target
         FROM edges e JOIN nodes n ON n.id = e.source
        WHERE e.kind = 'imports'`,
    ).all();
    // targets are node ids; resolve names
    const nameById = new Map(
      db.prepare(`SELECT id, name FROM nodes`).all().map((r) => [r.id, r.name]),
    );
    for (const r of rows) {
      if (!importsByFile.has(r.fp)) importsByFile.set(r.fp, new Set());
      const nm = nameById.get(r.target);
      if (nm) importsByFile.get(r.fp).add(String(nm).toLowerCase());
    }
  }

  const calledIn = new Set();
  const calledOut = new Set();
  const implementsIn = new Map(); // node id -> count
  const overridesIn = new Map();
  const typeOfIn = new Map();
  const routeLinked = new Set();
  const implementsEdgesByClass = new Map(); // class node id -> interface ids
  const referencedIds = new Set();

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const allNodesById = new Map(
    db.prepare(`SELECT id, kind, name, file_path FROM nodes`).all().map((r) => [r.id, r]),
  );

  for (const e of edges) {
    if (e.kind === 'calls') {
      calledIn.add(e.target);
      calledOut.add(e.source);
    } else if (e.kind === 'implements') {
      implementsIn.set(e.target, (implementsIn.get(e.target) ?? 0) + 1);
      // source implements target; record for interface-method dispatch check
      if (!implementsEdgesByClass.has(e.source)) implementsEdgesByClass.set(e.source, []);
      implementsEdgesByClass.get(e.source).push(e.target);
    } else if (e.kind === 'overrides') {
      overridesIn.set(e.target, (overridesIn.get(e.target) ?? 0) + 1);
    } else if (e.kind === 'type_of') {
      typeOfIn.set(e.source, (typeOfIn.get(e.source) ?? 0) + 1);
    } else if (e.kind === 'references') {
      referencedIds.add(e.target);
      referencedIds.add(e.source);
      // route node linkage: a references edge touching a route node links the other end
      const s = allNodesById.get(e.source);
      const t = allNodesById.get(e.target);
      if (s && s.kind === 'route') routeLinked.add(e.target);
      if (t && t.kind === 'route') routeLinked.add(e.source);
    }
  }

  // interface ids that are themselves referenced anywhere
  const referencedInterfaces = new Set();
  for (const [classId, ifaces] of implementsEdgesByClass) {
    for (const iface of ifaces) {
      if (referencedIds.has(iface)) referencedInterfaces.add(iface);
    }
  }

  // Map method -> containing class (qualified_name prefix match is fragile;
  // use contains edges instead)
  const classOfMethod = new Map();
  for (const e of edges) {
    if (e.kind !== 'contains') continue;
    const parent = allNodesById.get(e.source);
    if (parent && ['class', 'struct', 'interface', 'trait', 'impl'].includes(parent.kind)) {
      classOfMethod.set(e.target, e.source);
    }
  }

  const verdicts = [];
  for (const n of nodes) {
    // Candidacy
    if (calledIn.has(n.id) || calledOut.has(n.id)) continue; // has calls edges: not a candidate
    if (pathExcluded(n.file_path)) continue;

    let decorators = null;
    if (n.decorators) {
      try { decorators = JSON.parse(n.decorators); } catch { decorators = null; }
    }

    // R1 — annotation/attribute whitelist (decorators column + decorates
    // edges + signature fallback for C# override keyword)
    const r1 = matchWhitelist(language, decorators, n.signature, decoratesBySource.get(n.id));
    if (r1) {
      verdicts.push({ node: n, bucket: 'alive', rule_id: 'R1', evidence: r1 });
      continue;
    }

    // R2 — framework entry points
    if (routeLinked.has(n.id)) {
      verdicts.push({ node: n, bucket: 'alive', rule_id: 'R2', evidence: { via: 'route-link' } });
      continue;
    }
    if (ENTRY_NAMES.has(n.name)) {
      verdicts.push({ node: n, bucket: 'alive', rule_id: 'R2', evidence: { via: 'entry-name', name: n.name } });
      continue;
    }
    if (TEST_NAME_RE.test(n.name)) {
      verdicts.push({ node: n, bucket: 'alive', rule_id: 'R2', evidence: { via: 'test-name', name: n.name } });
      continue;
    }
    if (n.is_exported === 1) {
      const p = n.file_path.toLowerCase();
      if (!p.includes('internal/') && !p.includes('private') && !p.includes('impl/')) {
        verdicts.push({ node: n, bucket: 'alive', rule_id: 'R2', evidence: { via: 'exported-public-surface' } });
        continue;
      }
    }

    // R3 — dynamic-dispatch exemptions
    if (implementsIn.has(n.id) || overridesIn.has(n.id) || typeOfIn.has(n.id)) {
      verdicts.push({
        node: n, bucket: 'unknown', rule_id: 'R3',
        evidence: { via: 'implements/overrides/type_of edge' },
      });
      continue;
    }
    const ownerClass = classOfMethod.get(n.id);
    if (ownerClass && implementsEdgesByClass.has(ownerClass)) {
      const ifaces = implementsEdgesByClass.get(ownerClass);
      if (ifaces.some((i) => referencedInterfaces.has(i))) {
        verdicts.push({
          node: n, bucket: 'unknown', rule_id: 'R3',
          evidence: { via: 'interface-dispatch', owner: ownerClass },
        });
        continue;
      }
    }
    if (R3_CALLBACK_NAMES.has(n.name) || R3_NAME_RE.test(n.name)) {
      verdicts.push({
        node: n, bucket: 'unknown', rule_id: 'R3',
        evidence: { via: 'callback-name', name: n.name },
      });
      continue;
    }
    const fileImports = importsByFile.get(n.file_path);
    if (fileImports && [...fileImports].some((imp) =>
      REFLECTION_IMPORT_SIGNALS.some((sig) => imp.includes(sig)))) {
      verdicts.push({
        node: n, bucket: 'unknown', rule_id: 'R3',
        evidence: { via: 'reflection_context', file: n.file_path },
      });
      continue;
    }
    if (n.visibility === 'public' || n.is_exported === 1) {
      verdicts.push({
        node: n, bucket: 'unknown', rule_id: 'R3',
        evidence: { via: 'pub-residual' },
      });
      continue;
    }

    // R4 — residual dead
    verdicts.push({ node: n, bucket: 'dead', rule_id: 'R4', evidence: {} });
  }

  return verdicts;
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

function drawSample(verdicts, { sampleDead, sampleMin, seed }) {
  const rng = makeRng(seed);
  const dead = verdicts.filter((v) => v.bucket === 'dead');
  const rest = verdicts.filter((v) => v.bucket !== 'dead');

  const deadSample = dead.slice(0, sampleDead);
  const wantRest = Math.max(sampleMin - deadSample.length, deadSample.length);
  const shuffled = [...rest].sort(() => rng() - 0.5);
  const restSample = shuffled.slice(0, Math.min(wantRest, shuffled.length));

  return [...deadSample, ...restSample].map((v) => ({
    id: v.node.id,
    name: v.node.name,
    qualified_name: v.node.qualified_name,
    file_path: v.node.file_path,
    start_line: v.node.start_line,
    bucket: v.bucket,
    rule_id: v.rule_id,
    evidence: v.evidence,
    r2_verdict: null, // filled by human blind pass
    arbitration: null,
  }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function parseCli(argv) {
  const args = {
    corpusRoot: 'C:/workspace/measure-corpus',
    seed: 20261021,
    sampleDead: 30,
    sampleMin: 30,
    out: null,
    quiet: false,
    only: null,
    skipIndex: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--corpus-root') args.corpusRoot = argv[++i];
    else if (a === '--seed') args.seed = Number(argv[++i]);
    else if (a === '--sample-dead') args.sampleDead = Number(argv[++i]);
    else if (a === '--sample-min') args.sampleMin = Number(argv[++i]);
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--skip-index') args.skipIndex = true;
    else throw new Error(`unknown flag: ${a}`);
  }
  return args;
}

function main() {
  const args = parseCli(process.argv.slice(2));
  const startedAt = new Date().toISOString();

  const corpora = args.only
    ? CORPORA.filter((c) => c.slug === args.only)
    : CORPORA;
  if (corpora.length === 0) {
    fail(`no corpus with slug '${args.only}' (known: ${CORPORA.map((c) => c.slug).join(', ')})`);
  }

  const report = {
    metric: 'dead-code-annotate-r1',
    rubric: 'DES-dead-code-rubric-v1',
    startedAt,
    seed: args.seed,
    sampleDead: args.sampleDead,
    sampleMin: args.sampleMin,
    corpora: [],
  };

  for (const corpus of corpora) {
    const [owner, name] = corpus.slug.split('/');
    log(args, `=== ${corpus.slug} ===`);
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
    log(args, `clone: ${clone.sha} (reused=${clone.reusedClone})`);

    let dbPath = path.join(clone.repoDir, '.zcodegraph', 'zcodegraph.db');
    if (!args.skipIndex || !fs.existsSync(dbPath)) {
      const idx = runIndex({ repoDir: clone.repoDir, quiet: args.quiet });
      dbPath = idx.dbPath;
      log(args, `index: ${dbPath} (${idx.durationMs}ms)`);
    } else {
      log(args, `index: reusing ${dbPath}`);
    }

    const db = openDb(dbPath);
    let verdicts;
    try {
      verdicts = evaluateCorpus(db, corpus.language);
    } finally {
      db.close();
    }

    const counts = { dead: 0, alive: 0, unknown: 0 };
    for (const v of verdicts) counts[v.bucket]++;
    const total = verdicts.length;
    const sample = drawSample(verdicts, args);

    report.corpora.push({
      slug: corpus.slug,
      language: corpus.language,
      pinned_sha: clone.sha,
      sparse: corpus.sparse,
      candidates: total,
      buckets: counts,
      unknown_ratio: total > 0 ? Math.round((counts.unknown / total) * 1000) / 1000 : 0,
      sample_size: sample.length,
      sample,
    });
    log(args, `candidates=${total} dead=${counts.dead} alive=${counts.alive} unknown=${counts.unknown} sample=${sample.length}`);
  }

  const json = JSON.stringify(report, null, 2);
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, json + '\n');
    log(args, `report: ${args.out}`);
  } else {
    process.stdout.write(json + '\n');
  }
}

try {
  main();
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
