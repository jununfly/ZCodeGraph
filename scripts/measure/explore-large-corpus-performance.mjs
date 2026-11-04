#!/usr/bin/env node
/** Measure baseline-explore on the frozen v2 holdout; no candidate tuning. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const corpus = readArg('--corpus', 'kubernetes');
const corpusRoot = readArg('--corpus-root', 'C:/workspace/measure-corpus');
const out = path.resolve(readArg('--out', path.join(repo, '.tmp', 'measure', `explore-${corpus}-performance.json`)));
const frozenPath = path.join(repo, 'docs', 'baselines', 'semantic-retrieval-human-frozen-v2.json');
const frozen = JSON.parse(fs.readFileSync(frozenPath, 'utf8'));
const queries = frozen.queries.filter((q) => q.corpus === corpus && q.split === 'holdout');
if (queries.length === 0) throw new Error(`no frozen holdout queries for ${corpus}`);

const [{ CodeGraph }, { plan }] = await Promise.all([
  import(pathToFileURL(path.join(repo, 'dist', 'index.js')).href),
  import(pathToFileURL(path.join(repo, 'dist', 'mcp', 'explore-planner.js')).href),
]);
const cg = CodeGraph.openSync(path.join(corpusRoot, corpus));
const rows = [];
for (let round = 0; round < 4; round++) {
  for (const q of queries) {
    const start = performance.now();
    const result = await plan(cg, q.query, { maxFiles: 10 });
    const ms = performance.now() - start;
    const files = result.sortedFiles.map(([file]) => file);
    const rank = files.findIndex((file) => q.expectedFiles.includes(file)) + 1;
    rows.push({ id: q.id, round, ms, rank: rank || null, files });
    console.error(`[explore-perf] ${corpus} round=${round} ${q.id} ${ms.toFixed(1)}ms rank=${rank || 'miss'}`);
  }
}
await cg.closeAndWait();
const quantile = (values, q) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * q) - 1];
const cold = rows.filter((r) => r.round === 0).map((r) => r.ms);
const warm = rows.filter((r) => r.round > 0).map((r) => r.ms);
const firstRoundRanks = rows.filter((r) => r.round === 0).map((r) => r.rank ?? 0);
const stableRankedFiles = [...new Set(rows.map((r) => r.id))].every((id) => {
  const runs = rows.filter((r) => r.id === id);
  return runs.every((r) => JSON.stringify(r.files) === JSON.stringify(runs[0].files));
});
const summary = {
  // Round 0 uses distinct queries in one already-open process; it is not
  // the v2 fresh-process/model-load cold-start measurement.
  firstRoundMs: { p50: quantile(cold, 0.5), p95: quantile(cold, 0.95), max: Math.max(...cold) },
  warmMs: { p50: quantile(warm, 0.5), p95: quantile(warm, 0.95), max: Math.max(...warm) },
  warmGate: { p50: 150, p95: 250, largeCorpusP95: 500 },
  firstRoundEffectiveness: {
    hitAt1: firstRoundRanks.filter((rank) => rank > 0 && rank <= 1).length / firstRoundRanks.length,
    hitAt5: firstRoundRanks.filter((rank) => rank > 0 && rank <= 5).length / firstRoundRanks.length,
    hitAt10: firstRoundRanks.filter((rank) => rank > 0 && rank <= 10).length / firstRoundRanks.length,
    mrr: firstRoundRanks.reduce((sum, rank) => sum + (rank > 0 ? 1 / rank : 0), 0) / firstRoundRanks.length,
  },
  stableRankedFiles,
  freshProcessColdStartMs: null,
};
const report = {
  metric: 'explore-large-corpus-performance',
  measuredAt: new Date().toISOString(),
  scope: 'baseline-explore only; not a candidate-effectiveness or full v2 acceptance run',
  corpus,
  frozenBaseline: 'docs/baselines/semantic-retrieval-human-frozen-v2.json',
  host: { node: process.version, platform: process.platform, arch: process.arch },
  summary,
  rows,
};
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ out, summary }, null, 2));
