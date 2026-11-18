import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { camelSplit, mergedRerank } from '../measure/symbol-index-core.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CANDIDATE = path.join(REPO, 'docs/baselines/semantic-retrieval-source-trace-candidate-v2.json');
export const SOURCE_TRACE_CANDIDATE_SCHEMA = 'source-trace-candidate-v2';

function canonicalCandidate() {
  const canonical = readFileSync(CANDIDATE, 'utf8').replace(/\r\n/g, '\n');
  if (canonical.includes('\r')) throw new Error('candidate contains unsupported CR line endings');
  const candidate = JSON.parse(canonical);
  return {
    candidate,
    candidateSha256: createHash('sha256').update(canonical, 'utf8').digest('hex'),
  };
}

/** Read the immutable candidate, not its historical v1 parent. */
export function verifySourceTraceCandidate() {
  const { candidate, candidateSha256 } = canonicalCandidate();
  if (candidate.metric !== SOURCE_TRACE_CANDIDATE_SCHEMA || !candidate.frozenBeforeFiveCorpusAudit) {
    throw new Error('source-trace candidate must be frozen before its five-corpus audit');
  }
  if (candidate.config.symbolTopK !== 50 || candidate.config.fileTopK !== 10
      || candidate.config.unionRerank !== '0.4*planPos + 0.4*symPos + 0.2*termAlign'
      || candidate.config.seed !== 20261112) {
    throw new Error('source-trace candidate changed a frozen protocol invariant');
  }
  return Object.freeze({ candidate, candidateSha256 });
}

function queryTokens(query) {
  return [...new Set(camelSplit(query.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')))]
    .filter((token) => token.length >= 2);
}

function sourceTokens(source) {
  // Remove literal/comment prose before indexing implementation identifiers.
  // Retain whitespace so adjacent code tokens cannot accidentally concatenate.
  const code = source
    .replace(/('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/#[^\n]*/g, ' ');
  return new Set(queryTokens(code));
}

function isTestPath(file) {
  return /(^|\/)(tests?|specs?|__tests__|fixtures?|testdata|mocks?)(\/|\.)/i.test(file)
    || /(?:^|\/)(?:test_[^/]+|[^/]+_test)\.(?:py|go|rb)$|\.(?:test|spec)\.[a-z]+$/i.test(file)
    || /(?:tests?|spec)\.(?:java|kt|scala|cs)$/i.test(file);
}

/**
 * Build a versioned symbol/source index. Expected task files and rubrics never
 * enter this function; its only evidence is the indexed graph and source text.
 */
export function buildSourceTraceIndex({ dbPath, sourceRoot, indexPath }) {
  if (!dbPath || !sourceRoot || !indexPath) throw new Error('source index requires db, source root and fresh output paths');
  const requireFromRepo = createRequire(path.join(REPO, 'package.json'));
  const { DatabaseSync } = requireFromRepo('node:sqlite');
  const source = new DatabaseSync(dbPath, { readOnly: true });
  const index = new DatabaseSync(indexPath);
  index.exec('PRAGMA journal_mode = MEMORY; PRAGMA synchronous = OFF;');
  index.exec(`CREATE VIRTUAL TABLE source_symbols USING fts5(
    name_tokens, body_tokens, raw_name UNINDEXED, kind UNINDEXED,
    file_path UNINDEXED, is_exported UNINDEXED, node_id UNINDEXED,
    start_line UNINDEXED, end_line UNINDEXED
  );`);
  const rows = source.prepare(
    `SELECT id, name, qualified_name, kind, file_path, is_exported, start_line, end_line
     FROM nodes WHERE kind IN ('function','method','class','struct','interface','type_alias',
       'constant','variable','field','enum','enum_member','property','trait','protocol')`,
  ).all();
  const insert = index.prepare(`INSERT INTO source_symbols
    (name_tokens,body_tokens,raw_name,kind,file_path,is_exported,node_id,start_line,end_line)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  index.exec('BEGIN');
  const fileCache = new Map();
  for (const row of rows) {
    const names = new Set([...camelSplit(row.name), ...camelSplit(row.qualified_name)]);
    let bodies = new Set();
    if (['function', 'method', 'class', 'struct', 'interface', 'type_alias', 'property'].includes(row.kind)
        && row.start_line > 0 && row.end_line >= row.start_line) {
      try {
        if (!fileCache.has(row.file_path)) {
          fileCache.set(row.file_path, readFileSync(path.resolve(sourceRoot, row.file_path), 'utf8').split('\n'));
        }
        const lines = fileCache.get(row.file_path)
          .slice(row.start_line - 1, row.end_line).join('\n').slice(0, 12000);
        bodies = sourceTokens(lines);
      } catch {
        // A missing/unreadable source contributes no lexical evidence, never a
        // fabricated name match. Its graph node remains independently auditable.
      }
    }
    if (names.size === 0 && bodies.size === 0) continue;
    insert.run([...names].join(' '), [...bodies].join(' '), row.name, row.kind,
      row.file_path, row.is_exported ? 1 : 0, row.id, row.start_line, row.end_line);
  }
  index.exec('COMMIT');
  source.close();
  index.close();
}

function rankRows(rows, tokens, documentFrequency, totalDocuments) {
  const candidates = [];
  for (const row of rows) {
    const nameTokens = new Set(row.name_tokens.split(' ').filter(Boolean));
    const bodyTokens = new Set(row.body_tokens.split(' ').filter(Boolean));
    const matched = tokens.filter((token) => nameTokens.has(token) || bodyTokens.has(token));
    if (matched.length === 0) continue;
    let coverage = 0;
    let nameCoverage = 0;
    for (const token of matched) {
      const idf = Math.log1p(totalDocuments / Math.max(1, documentFrequency.get(token) ?? 1));
      coverage += idf;
      if (nameTokens.has(token)) nameCoverage += idf;
    }
    const weight = ['function', 'method'].includes(row.kind) ? 1.2
      : ['class', 'struct', 'interface', 'type_alias'].includes(row.kind) ? 0.8 : 0.3;
    candidates.push({
      id: row.node_id, filePath: row.file_path, rawName: row.raw_name, kind: row.kind,
      exported: Number(row.is_exported) > 0, nameTokens, bodyTokens,
      coverage, nameCoverage, bm25: Math.max(0, -row.bm25),
      score: weight * (2 * nameCoverage + 4 * coverage) + Math.max(0, -row.bm25),
    });
  }
  return candidates.sort((left, right) => right.score - left.score
    || left.filePath.localeCompare(right.filePath) || left.id.localeCompare(right.id));
}

/** Real top-50 symbol recall plus one-hop graph provenance from those hits. */
export function recallSourceTrace({ query, indexPath, graph }) {
  const requireFromRepo = createRequire(path.join(REPO, 'package.json'));
  const { DatabaseSync } = requireFromRepo('node:sqlite');
  const index = new DatabaseSync(indexPath, { readOnly: true });
  const tokens = queryTokens(query);
  const qTok = new Set(tokens);
  const noEvidence = { files: [], byFile: new Map(), qTok, topSymIds: [], graphFiles: [] };
  if (tokens.length === 0) { index.close(); return noEvidence; }
  try {
    const match = tokens.map((token) => `"${token}"`).join(' OR ');
    const rows = index.prepare(`SELECT node_id,file_path,raw_name,kind,is_exported,
      name_tokens,body_tokens,bm25(source_symbols) AS bm25
      FROM source_symbols WHERE source_symbols MATCH ? ORDER BY bm25 LIMIT 500`).all(match);
    const totalDocuments = index.prepare('SELECT COUNT(*) AS n FROM source_symbols').get().n;
    const documentFrequency = new Map(tokens.map((token) => [token,
      index.prepare('SELECT COUNT(*) AS n FROM source_symbols WHERE source_symbols MATCH ?').get(`"${token}"`).n]));
    const direct = rankRows(rows, tokens, documentFrequency, totalDocuments);
    const top = direct.slice(0, 50);
    const candidates = new Map(top.map((candidate) => [candidate.id, { ...candidate, origin: 'lexical' }]));
    const graphFiles = [];
    for (const hit of top) {
      let neighbors = [];
      try {
        neighbors = [
          ...graph.getCallers(hit.id, 1).map((entry) => entry.node),
          ...graph.getCallees(hit.id, 1).map((entry) => entry.node),
          ...graph.getTypeHierarchy(hit.id).nodes.values(),
        ];
      } catch { continue; }
      for (const node of neighbors) {
        if (!node?.id || !['function', 'method'].includes(node.kind)) continue;
        const neighbor = direct.find((candidate) => candidate.id === node.id);
        if (!neighbor) continue;
        const score = hit.score * 0.5 + neighbor.score * 0.5;
        if (!candidates.has(node.id) || candidates.get(node.id).score < score) {
          candidates.set(node.id, { ...neighbor, score, origin: `graph:${hit.id}` });
        }
        graphFiles.push(node.filePath);
      }
    }
    const ranked = [...candidates.values()].sort((left, right) => right.score - left.score
      || left.filePath.localeCompare(right.filePath) || left.id.localeCompare(right.id));
    const explicitTests = /\btests?|testing|spec(?:ification)?s?\b/i.test(query);
    const byFile = new Map();
    for (const candidate of ranked) {
      if (!byFile.has(candidate.filePath)) byFile.set(candidate.filePath, {
        count: 0, bm25: 0, names: [], kinds: [], exported: [], score: 0,
      });
      const file = byFile.get(candidate.filePath);
      file.count++;
      file.bm25 += candidate.bm25;
      file.names.push(candidate.rawName);
      file.kinds.push(candidate.kind);
      file.exported.push(candidate.exported);
      file.score += candidate.score;
    }
    const files = [...byFile.entries()].sort(([leftFile, left], [rightFile, right]) => {
      if (!explicitTests) {
        const testPriority = Number(isTestPath(leftFile)) - Number(isTestPath(rightFile));
        if (testPriority !== 0) return testPriority;
      }
      return right.score - left.score || leftFile.localeCompare(rightFile);
    }).slice(0, 10).map(([file]) => file);
    const selected = new Set(files);
    const topSymIds = ranked.filter((candidate) => selected.has(candidate.filePath))
      .map((candidate) => ({ id: candidate.id, filePath: candidate.filePath,
        score: candidate.score, origin: candidate.origin }));
    return { files, byFile, qTok, topSymIds, graphFiles: [...new Set(graphFiles)] };
  } finally {
    index.close();
  }
}

/** Keep the v1 union formula while supplying independently identified C hits. */
export function createSourceTraceRetrieval({ planBaseline, symbolRecall }) {
  if (typeof planBaseline !== 'function' || typeof symbolRecall !== 'function') {
    throw new TypeError('source-trace retrieval requires baseline and recall seams');
  }
  const { candidateSha256 } = verifySourceTraceCandidate();
  return async ({ arm, config }) => {
    if (arm !== 'C') throw new Error('source-trace-v2 preparation audit exposes C only');
    const [baseline, symbol] = await Promise.all([planBaseline(config), symbolRecall(config)]);
    const baseFiles = baseline.sortedFiles.map(([file]) => file);
    const files = mergedRerank(baseFiles, symbol.files, symbol.byFile, symbol.qTok);
    const provenance = new Map((symbol.topSymIds ?? []).map((hit, rank) => [hit.id, { ...hit, rank }]));
    const candidates = files.map((file) => {
      const group = baseline.fileGroups.get(file) ?? { nodes: [], score: 0 };
      const hits = [...provenance.entries()].filter(([, hit]) => hit.filePath === file);
      return [file, hits.length ? { ...group,
        symbolHitIds: new Set(hits.map(([id]) => id)),
        symbolHitRanks: new Map(hits.map(([id, hit]) => [id, hit.rank])),
      } : group];
    });
    return {
      candidates,
      payload: {
        kind: SOURCE_TRACE_CANDIDATE_SCHEMA, candidateSha256,
        baselineFiles: baseFiles, symbolFiles: symbol.files, files,
        symbolHitIds: [...provenance.keys()], graphFiles: symbol.graphFiles,
      },
    };
  };
}
