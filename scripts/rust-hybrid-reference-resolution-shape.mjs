#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function usage() {
  console.log([
    'Usage: node scripts/rust-hybrid-reference-resolution-shape.mjs --db <path> --out-dir <dir> [--profile <path>] [--result <path>] [--prefix <name>]',
    '',
    'Reads an existing CodeGraph SQLite DB and optional production profile/result',
    'artifacts, then writes a reference-resolution pressure shape report.',
    'This script is read-only with respect to the analyzed corpus.',
  ].join('\n'));
}

function parseArgs(argv) {
  let dbPath = null;
  let profilePath = null;
  let resultPath = null;
  let outDir = path.resolve('docs', 'benchmarks');
  let prefix = `${new Date().toISOString().slice(0, 10)}-rust-hybrid-reference-resolution-shape`;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--db') {
      dbPath = path.resolve(requiredValue(argv, ++i, '--db'));
      continue;
    }
    if (arg === '--profile') {
      profilePath = path.resolve(requiredValue(argv, ++i, '--profile'));
      continue;
    }
    if (arg === '--result') {
      resultPath = path.resolve(requiredValue(argv, ++i, '--result'));
      continue;
    }
    if (arg === '--out-dir') {
      outDir = path.resolve(requiredValue(argv, ++i, '--out-dir'));
      continue;
    }
    if (arg === '--prefix') {
      prefix = requiredValue(argv, ++i, '--prefix');
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!dbPath) {
    dbPath = path.resolve('.zcodegraph', 'zcodegraph.db');
  }
  return { help: false, dbPath, profilePath, resultPath, outDir, prefix };
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function openDatabase(dbPath) {
  const { DatabaseSync } = require('node:sqlite');
  return new DatabaseSync(dbPath, { readOnly: true });
}

function count(db, sql) {
  return Number(db.prepare(sql).get().c ?? 0);
}

function groupedCounts(db, sql, key = 'k') {
  return Object.fromEntries(db.prepare(sql).all().map((row) => [String(row[key] ?? 'unknown'), Number(row.c ?? 0)]));
}

function loadJsonIfExists(file) {
  if (!file || !fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function candidateCount(candidates) {
  if (!candidates) return 0;
  try {
    const parsed = JSON.parse(candidates);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function bucketCandidateCount(countValue) {
  if (countValue <= 0) return '0';
  if (countValue === 1) return '1';
  if (countValue <= 3) return '2-3';
  if (countValue <= 10) return '4-10';
  return '>10';
}

function topRows(rows, keyFn, limit = 10) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts, ([key, countValue]) => ({ key, count: countValue }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function analyzeDb(dbPath) {
  const db = openDatabase(dbPath);
  try {
    const unresolvedRows = db.prepare(`
      SELECT reference_name, reference_kind, candidates, file_path, language
      FROM unresolved_refs
      ORDER BY id
    `).all();
    const candidateCardinality = {};
    for (const row of unresolvedRows) {
      const bucket = bucketCandidateCount(candidateCount(row.candidates));
      candidateCardinality[bucket] = (candidateCardinality[bucket] ?? 0) + 1;
    }
    return {
      dbPath,
      dbSizeBytes: fs.statSync(dbPath).size,
      graphShape: {
        fileCount: count(db, 'SELECT count(*) as c FROM files'),
        nodeCount: count(db, 'SELECT count(*) as c FROM nodes'),
        edgeCount: count(db, 'SELECT count(*) as c FROM edges'),
        filesByLanguage: groupedCounts(db, 'SELECT language as k, count(*) as c FROM files GROUP BY language ORDER BY c DESC'),
        nodesByKind: groupedCounts(db, 'SELECT kind as k, count(*) as c FROM nodes GROUP BY kind ORDER BY c DESC'),
        edgesByKind: groupedCounts(db, 'SELECT kind as k, count(*) as c FROM edges GROUP BY kind ORDER BY c DESC'),
        edgeOrigins: groupedCounts(db, "SELECT coalesce(edgeOrigin, 'none') as k, count(*) as c FROM edges GROUP BY coalesce(edgeOrigin, 'none') ORDER BY c DESC"),
      },
      referenceShape: {
        unresolvedReferenceCount: unresolvedRows.length,
        byKind: groupedCounts(db, 'SELECT reference_kind as k, count(*) as c FROM unresolved_refs GROUP BY reference_kind ORDER BY c DESC'),
        byLanguage: groupedCounts(db, 'SELECT language as k, count(*) as c FROM unresolved_refs GROUP BY language ORDER BY c DESC'),
        candidateCardinality,
        topFiles: topRows(unresolvedRows, (row) => String(row.file_path ?? '')),
        topNames: topRows(unresolvedRows, (row) => String(row.reference_name ?? '')),
      },
    };
  } finally {
    db.close();
  }
}

function checkpointShape(profile) {
  const checkpoints = Array.isArray(profile?.checkpoints) ? profile.checkpoints : [];
  const rustCore = profile?.rustCore ?? {};
  return {
    complete: profile?.complete === true,
    checkpointCount: checkpoints.length,
    lastCheckpoint: checkpoints.length > 0 ? checkpoints[checkpoints.length - 1] : null,
    checkpoints,
    rustCore: {
      sourceScanMs: numberOrNull(rustCore.sourceScanMs),
      parseExtractionMs: numberOrNull(rustCore.parseExtractionMs),
      sqliteWriteMs: numberOrNull(rustCore.sqliteWriteMs),
      importPathAliasResolvedRefs: numberOrNull(rustCore.importPathAliasResolvedRefs),
      importPathAliasFallbackRefs: numberOrNull(rustCore.importPathAliasFallbackRefs),
      localExactReferenceResolvedRefs: numberOrNull(rustCore.localExactReferenceResolvedRefs),
      localExactReferenceFallbackRefs: numberOrNull(rustCore.localExactReferenceFallbackRefs),
    },
    finalize: profile?.finalize ? {
      frameworkPostExtractMs: numberOrNull(profile.finalize.frameworkPostExtractMs),
      referenceResolutionMs: numberOrNull(profile.finalize.referenceResolutionMs),
      dynamicDispatchSynthesisMs: numberOrNull(profile.finalize.dynamicDispatchSynthesisMs),
      dbMaintenanceMs: numberOrNull(profile.finalize.dbMaintenanceMs),
    } : null,
    typescriptFallbackAppend: profile?.typescriptFallbackAppend ?? null,
  };
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function fixtureRecommendations(report) {
  const recommendations = [];
  const byKind = report.referenceShape.byKind;
  const cardinality = report.referenceShape.candidateCardinality;
  const rustFinalizationEdges = report.graphShape.edgeOrigins['rust-finalization'] ?? 0;
  if (Object.keys(byKind).length > 1) {
    recommendations.push({
      source: 'reference-kind-mix',
      recommendation: 'Model a mix of imports, calls, and plain references instead of a single reference kind.',
    });
  } else if (Object.keys(byKind).length === 1) {
    recommendations.push({
      source: 'reference-kind-mix',
      recommendation: `Model the dominant reference kind: ${Object.keys(byKind)[0]}.`,
    });
  }
  if (Object.keys(cardinality).length > 1 || cardinality['2-3'] || cardinality['4-10'] || cardinality['>10']) {
    recommendations.push({
      source: 'candidate-cardinality-mix',
      recommendation: 'Include references with zero, single, and multiple candidates to exercise lookup and disambiguation paths.',
    });
  }
  if (report.graphShape.edgeCount > 0) {
    recommendations.push({
      source: 'edge-materialization-pressure',
      recommendation: 'Include references that resolve into persisted edges so finalization edge growth is visible in profile smoke.',
    });
  }
  if (report.referenceShape.unresolvedReferenceCount === 0 && rustFinalizationEdges > 0) {
    recommendations.push({
      source: 'resolved-edge-write-tail',
      recommendation: 'Model a high volume of resolvable references; the observed DB has no residual unresolved_refs but many rust-finalization edges.',
    });
  }
  const last = report.checkpointShape.lastCheckpoint?.name;
  if (last) {
    recommendations.push({
      source: 'checkpoint-boundary',
      recommendation: `Fixture smoke should complete beyond the observed checkpoint boundary (${last}) so it can be used for fast A/B runs.`,
    });
  }
  return recommendations;
}

function markdownReport(report) {
  const rows = (entries) => Object.entries(entries)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, value]) => `| ${key} | ${value} |`);
  return [
    '# Rust-Hybrid Reference Resolution Shape Report',
    '',
    `Status: ${report.status}`,
    `DB: ${report.dbPath ?? 'unavailable'}`,
    '',
    '## Checkpoint Shape',
    '',
    `- Complete: ${report.checkpointShape.complete}`,
    `- Last checkpoint: ${report.checkpointShape.lastCheckpoint?.name ?? 'n/a'}`,
    `- Checkpoint count: ${report.checkpointShape.checkpointCount}`,
    '',
    '## Graph Shape',
    '',
    `- Files: ${report.graphShape.fileCount}`,
    `- Nodes: ${report.graphShape.nodeCount}`,
    `- Edges: ${report.graphShape.edgeCount}`,
    '',
    '## Reference Shape',
    '',
    `- Unresolved references: ${report.referenceShape.unresolvedReferenceCount}`,
    '',
    '### By Kind',
    '',
    '| Kind | Count |',
    '|---|---:|',
    ...rows(report.referenceShape.byKind),
    '',
    '### Candidate Cardinality',
    '',
    '| Candidate count bucket | Count |',
    '|---|---:|',
    ...rows(report.referenceShape.candidateCardinality),
    '',
    '## Fixture Recommendations',
    '',
    ...report.fixtureRecommendations.map((item) => `- ${item.source}: ${item.recommendation}`),
    '',
  ].join('\n');
}

function artifactPaths(outDir, prefix) {
  return {
    json: path.join(outDir, `${prefix}.json`),
    markdown: path.join(outDir, `${prefix}.md`),
  };
}

function needsHumanSetup({ dbPath, profilePath, resultPath, outDir, prefix, reason }) {
  const paths = artifactPaths(outDir, prefix);
  const artifact = {
    status: 'needs-human-setup',
    unavailableReason: reason,
    inputs: { dbPath, profilePath, resultPath },
  };
  writeJson(paths.json, artifact);
  fs.writeFileSync(paths.markdown, [
    '# Rust-Hybrid Reference Resolution Shape Report',
    '',
    'Status: needs-human-setup',
    '',
    reason,
    '',
  ].join('\n'));
  return { status: 'needs-human-setup', artifacts: paths, summary: { unavailableReason: reason } };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!fs.existsSync(args.dbPath)) {
    console.log(JSON.stringify(needsHumanSetup({
      ...args,
      reason: `DB path does not exist: ${args.dbPath}`,
    }), null, 2));
    return;
  }

  const dbReport = analyzeDb(args.dbPath);
  const profile = loadJsonIfExists(args.profilePath);
  const result = loadJsonIfExists(args.resultPath);
  const report = {
    status: 'completed',
    generatedAt: new Date().toISOString(),
    inputs: {
      dbPath: args.dbPath,
      profilePath: args.profilePath,
      resultPath: args.resultPath,
    },
    resultClassification: result?.resultClassification ?? null,
    ...dbReport,
    checkpointShape: checkpointShape(profile),
  };
  report.fixtureRecommendations = fixtureRecommendations(report);

  const paths = artifactPaths(args.outDir, args.prefix);
  writeJson(paths.json, report);
  fs.mkdirSync(path.dirname(paths.markdown), { recursive: true });
  fs.writeFileSync(paths.markdown, `${markdownReport(report)}\n`);

  console.log(JSON.stringify({
    status: report.status,
    artifacts: paths,
    summary: {
      unresolvedReferenceCount: report.referenceShape.unresolvedReferenceCount,
      lastCheckpoint: report.checkpointShape.lastCheckpoint,
      fixturePressureSources: report.fixtureRecommendations.map((item) => item.source),
    },
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
