/**
 * symbol-index-core.mjs — 1-7-1 符号级索引召回共享核心。
 *
 * 提供：camelCase 切分、符号级 FTS5 索引构建（每 corpus 缓存）、
 * 符号召回（bm25 top-K 符号 → 文件聚合）、union 双遍重排。
 * dev 与 holdout 评估脚本共用，避免实现漂移。
 *
 * 设计约束（来自现状勘察）：
 *   - signature/docstring 在 dev+holdout corpus 全 0 覆盖，符号召回仅依赖
 *     name + qualified_name 的 camelCase 切分对齐。
 *   - k8s (Go) visibility=0，派生可见性未纳入 v1，故索引未用 visibility 过滤。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SYMBOL_DIR = path.join(REPO, '.tmp', 'symbol-index');
const CORPUS_ROOT = 'C:/workspace/measure-corpus';

export const SYMBOL_TOP_K = 50;
export const FILE_TOP_K = 10;
export const SYM_KINDS = [
  'function', 'method', 'class', 'struct', 'interface', 'type_alias',
  'constant', 'variable', 'field', 'enum', 'enum_member', 'property',
  'trait', 'protocol',
];

export function camelSplit(s) {
  if (!s) return [];
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export function buildSymbolIndex(corpusOrOptions) {
  const isolated = typeof corpusOrOptions === 'object' && corpusOrOptions !== null;
  const dbPath = isolated
    ? corpusOrOptions.dbPath
    : path.join(CORPUS_ROOT, corpusOrOptions, '.zcodegraph', 'zcodegraph.db');
  const idxPath = isolated
    ? corpusOrOptions.indexPath
    : path.join(SYMBOL_DIR, `${corpusOrOptions}.db`);
  if (!dbPath || !idxPath) throw new Error('symbol index requires source and output paths');
  const requireFromRepo = createRequire(path.join(REPO, 'package.json'));
  const { DatabaseSync } = requireFromRepo('node:sqlite');
  if (!isolated && fs.existsSync(idxPath)) return idxPath;
  fs.mkdirSync(path.dirname(idxPath), { recursive: true });
  if (isolated && fs.existsSync(idxPath)) {
    throw new Error('snapshot-bound symbol index must use a fresh output path');
  }
  const src = new DatabaseSync(dbPath, { readOnly: true });
  const idx = new DatabaseSync(idxPath);
  idx.exec('PRAGMA journal_mode = MEMORY; PRAGMA synchronous = OFF;');
  idx.exec(`CREATE VIRTUAL TABLE sym_fts USING fts5(
    tokens, raw_name UNINDEXED, kind UNINDEXED, file_path UNINDEXED,
    visibility UNINDEXED, is_exported UNINDEXED, node_id UNINDEXED
  );`);
  const placeholders = SYM_KINDS.map(() => '?').join(',');
  const rows = src.prepare(
    `SELECT id, name, qualified_name, kind, file_path, visibility, is_exported
     FROM nodes WHERE kind IN (${placeholders})`
  ).all(...SYM_KINDS);
  const ins = idx.prepare(
    'INSERT INTO sym_fts (tokens, raw_name, kind, file_path, visibility, is_exported, node_id) VALUES (?,?,?,?,?,?,?)'
  );
  idx.exec('BEGIN');
  for (const r of rows) {
    const toks = [...new Set([...camelSplit(r.name), ...camelSplit(r.qualified_name)])].join(' ');
    if (!toks) continue;
    ins.run(toks, r.name, r.kind, r.file_path, r.visibility ?? '', r.is_exported ? 1 : 0, r.id);
  }
  idx.exec('COMMIT');
  src.close();
  idx.close();
  console.error(`[sym] built index ${isolated ? 'snapshot' : corpusOrOptions}: ${rows.length} symbols -> ${idxPath}`);
  return idxPath;
}

export function symbolRecallFiles(query, idxPath) {
  const requireFromRepo = createRequire(path.join(REPO, 'package.json'));
  const { DatabaseSync } = requireFromRepo('node:sqlite');
  const idx = new DatabaseSync(idxPath, { readOnly: true });
  const qToks = camelSplit(query).filter((t) => t.length >= 2);
  if (qToks.length === 0) { idx.close(); return { files: [], byFile: new Map(), qTok: new Set() }; }
  const match = qToks.map((t) => `"${t}"`).join(' OR ');
  let rows;
  try {
    rows = idx.prepare(
      `SELECT node_id, file_path, raw_name, kind, is_exported, bm25(sym_fts) AS rank
       FROM sym_fts WHERE sym_fts MATCH ? ORDER BY rank LIMIT ?`
    ).all(match, SYMBOL_TOP_K);
  } catch {
    idx.close();
    return { files: [], byFile: new Map(), qTok: new Set(qToks), topSymIds: [] };
  }
  const byFile = new Map();
  const topSymIds = [];
  for (const r of rows) {
    topSymIds.push({ id: r.node_id, score: Math.max(0, -r.rank) });
    if (!byFile.has(r.file_path)) byFile.set(r.file_path, { count: 0, bm25: 0, names: [], kinds: [], exported: [] });
    const e = byFile.get(r.file_path);
    e.count += 1;
    e.bm25 += Math.max(0, -r.rank);
    e.names.push(r.raw_name);
    e.kinds.push(r.kind);
    e.exported.push(Number(r.is_exported) > 0);
  }
  const files = [...byFile.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].bm25 - a[1].bm25)
    .slice(0, FILE_TOP_K)
    .map(([f]) => f);
  idx.close();
  return { files, byFile, qTok: new Set(qToks), topSymIds };
}

// ---- 图/类型召回：从 top-K 符号出发遍历 callers/callees/type-hierarchy 拉邻居文件 ----
// 现有 plan() 的 glue 只遍历 entry nodes 且限于已浮现文件；本函数从**专用符号
// FTS5 召回的更宽符号集**出发，拉取即便不在初始 subgraph 的邻居文件。返回
// Map<filePath, string[]>：每个邻居文件及其关联的符号名（用于 termAlign 排序）。
export function graphExpand(cg, topSymIds, topK = 15) {
  const fileNeighbors = new Map();
  for (const { id } of topSymIds.slice(0, topK)) {
    if (!id) continue;
    let neighbors = [];
    try {
      const callers = cg.getCallers(id, 1).map((c) => c.node);
      const callees = cg.getCallees(id, 1).map((c) => c.node);
      const hierNodes = [...cg.getTypeHierarchy(id).nodes.values()];
      neighbors = [...callers, ...callees, ...hierNodes];
    } catch {
      continue;
    }
    for (const n of neighbors) {
      if (n.filePath === undefined) continue;
      if (!fileNeighbors.has(n.filePath)) fileNeighbors.set(n.filePath, []);
      fileNeighbors.get(n.filePath).push(n.name);
    }
  }
  return fileNeighbors;
}

export function rankGraphFiles(fileNeighbors, qTok, topK = FILE_TOP_K) {
  const scored = [];
  for (const [file, names] of fileNeighbors.entries()) {
    const symToks = new Set();
    for (const n of names) for (const t of camelSplit(n)) symToks.add(t);
    let hit = 0;
    for (const t of qTok) if (symToks.has(t)) hit++;
    const coverage = qTok.size > 0 ? hit / qTok.size : 0;
    scored.push({ file, score: coverage * 10 + names.length });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, topK).map((x) => x.file);
}

// ---- 增强符号文件评分（round 2）：kind 权重 + exported 加成 + query-token 覆盖度 ----
// 压制 k8s/dotnet 的 field/constant PascalCase 过匹配噪声：intent-bearing kind
// (function/method/class/struct/interface/type_alias/enum/trait/protocol) 权重高，
// field/constant/variable/property 权重低；多 query-token 命中的符号优先；文件级
// token 覆盖度作为乘性奖励。
const KIND_WEIGHT = {
  function: 1.0, method: 1.0, class: 1.0, struct: 1.0, interface: 1.0,
  type_alias: 1.0, enum: 1.0, enum_member: 0.8, trait: 1.0, protocol: 1.0,
  constant: 0.3, variable: 0.3, field: 0.25, property: 0.3,
};
const EXPORTED_BONUS = 1.5;

export function rankSymbolFilesEnhanced(symResult, qTok, topK = FILE_TOP_K) {
  const byFile = symResult.byFile;
  const scored = [];
  for (const [file, e] of byFile.entries()) {
    let fileTokHits = new Set();
    let raw = 0;
    for (let i = 0; i < e.names.length; i++) {
      const symToks = new Set(camelSplit(e.names[i]));
      let matched = 0;
      for (const t of qTok) if (symToks.has(t)) { matched++; fileTokHits.add(t); }
      const kw = KIND_WEIGHT[e.kinds[i]] ?? 0.5;
      const eb = e.exported[i] ? EXPORTED_BONUS : 1.0;
      raw += kw * eb * (1 + matched); // matched>0 显著加权
    }
    const coverage = qTok.size > 0 ? fileTokHits.size / qTok.size : 0;
    const score = raw * (0.5 + 0.5 * coverage);
    scored.push({ file, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.file);
}

export function fileSymToks(file, symByFile) {
  const e = symByFile.get(file);
  if (!e) return new Set();
  const toks = new Set();
  for (const n of e.names) for (const t of camelSplit(n)) toks.add(t);
  return toks;
}
export function termAlign(file, symByFile, qTok) {
  if (!symByFile.get(file) || qTok.size === 0) return 0;
  const symToks = fileSymToks(file, symByFile);
  let hit = 0;
  for (const t of qTok) if (symToks.has(t)) hit++;
  return hit / qTok.size;
}
export function rankScoreOf(file, idxA, idxB, symByFile, qTok) {
  const a = idxA < 0 ? 0 : (10 - idxA) / 10;
  const b = idxB < 0 ? 0 : (10 - idxB) / 10;
  const c = termAlign(file, symByFile, qTok);
  return 0.4 * a + 0.4 * b + 0.2 * c;
}
export function uniqueFiles(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) for (const f of list) if (!seen.has(f)) { seen.add(f); out.push(f); }
  return out;
}
export function mergedRerank(baseFiles, symFiles, symByFile, qTok) {
  const merged = uniqueFiles(baseFiles, symFiles);
  const idxA = new Map(baseFiles.map((f, i) => [f, i]));
  const idxB = new Map(symFiles.map((f, i) => [f, i]));
  return merged
    .map((f) => ({ f, s: rankScoreOf(f, idxA.get(f) ?? -1, idxB.get(f) ?? -1, symByFile, qTok) }))
    .sort((x, y) => y.s - x.s)
    .map((x) => x.f)
    .slice(0, FILE_TOP_K);
}
