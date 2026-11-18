import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mergedRerank } from '../measure/symbol-index-core.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CANDIDATE = path.join(REPO, 'docs/baselines/semantic-retrieval-symbol-index-candidate-v1.json');
export const FROZEN_CANDIDATE_SHA256 = 'd687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d';

export function verifyFrozenSymbolUnionCandidate() {
  const raw = readFileSync(CANDIDATE);
  const rawSha256 = createHash('sha256').update(raw).digest('hex');
  // Git's Windows autocrlf transport must not change the frozen configuration.
  // Only CRLF/LF differences are normalized; every other byte remains checked.
  const canonical = raw.toString('utf8').replace(/\r\n/g, '\n');
  if (canonical.includes('\r')) throw new Error('frozen candidate contains unsupported CR line endings');
  const candidateSha256 = createHash('sha256').update(canonical, 'utf8').digest('hex');
  if (candidateSha256 !== FROZEN_CANDIDATE_SHA256) {
    throw new Error(`frozen symbol-index candidate content mismatch: ${candidateSha256}`);
  }
  const candidate = JSON.parse(canonical);
  return Object.freeze({
    candidateSha256,
    rawSha256,
    lineEndingNormalization: 'CRLF-to-LF-only',
    symbolTopK: candidate.config.symbolTopK,
    fileTopK: candidate.config.fileTopK,
    unionRerank: candidate.config.unionRerank,
  });
}

/**
 * Evaluation-only retrieval seam for runPairedEvaluation. A is the supplied
 * baseline plan; C uses the frozen symbol-union algorithm. S is composed by
 * the paired runtime, which alone owns its fixed-seed order permutation.
 * Create one adapter per paired block; its C snapshot is intentionally cached.
 * This module does not register a production flag or modify Explore ranking.
 */
export function createIsolatedSymbolUnionRetrieval({ planBaseline, symbolRecall }) {
  if (typeof planBaseline !== 'function' || typeof symbolRecall !== 'function') {
    throw new TypeError('isolated retrieval requires planBaseline and symbolRecall seams');
  }
  let cached;
  const prepare = async (config) => {
    if (!cached) {
      cached = (async () => {
        const baseline = await planBaseline(config);
        const symbol = await symbolRecall(config);
        const baseFiles = baseline.sortedFiles.map(([file]) => file);
        const files = mergedRerank(baseFiles, symbol.files, symbol.byFile, symbol.qTok);
        const provenance = symbolProvenance(symbol);
        const groupFor = (file) => {
          const baselineGroup = baseline.fileGroups.get(file);
          const group = baselineGroup ?? { nodes: [], score: 0 };
          const symbolHitIds = new Set();
          const symbolHitRanks = new Map();
          for (const [id, hit] of provenance) if (hit.filePath === file) {
            symbolHitIds.add(id);
            symbolHitRanks.set(id, hit.rank);
          }
          // Composition verifies these IDs against the indexed file contents;
          // the baseline group itself is never mutated.
          return symbolHitIds.size > 0 ? { ...group, symbolHitIds, symbolHitRanks } : group;
        };
        return Object.freeze({
          candidates: Object.freeze(files.map((file) => Object.freeze([file, groupFor(file)]))),
          symbolHitIds: Object.freeze([...provenance.keys()]),
          baselineFiles: Object.freeze(baseFiles),
          symbolFiles: Object.freeze([...symbol.files]),
          files: Object.freeze(files),
        });
      })();
    }
    return cached;
  };
function symbolProvenance(symbol) {
  const provenance = new Map();
  // Rendering consumes the real indexed hit IDs, not task-specific names. This
  // does not add, remove or reorder any candidate selected by the frozen union.
  for (const [rank, { id, filePath, score }] of (symbol.topSymIds ?? []).entries()) {
    if (typeof id !== 'string' || !Number.isFinite(score)) continue;
    provenance.set(id, { filePath, score: Math.max(0, score), rank });
  }
  return provenance;
}

  return async ({ arm, config }) => {
    if (arm !== 'A' && arm !== 'C') throw new Error('S must be derived from C by runPairedEvaluation');
    if (arm === 'A') {
      const baseline = await planBaseline(config);
      return { candidates: baseline.sortedFiles, payload: baseline };
    }
    const prepared = await prepare(config);
    return {
      candidates: prepared.candidates,
      payload: Object.freeze({
        kind: 'isolated-symbol-union-v1',
        candidateSha256: FROZEN_CANDIDATE_SHA256,
        baselineFiles: prepared.baselineFiles,
        symbolFiles: prepared.symbolFiles,
        files: prepared.files,
        symbolHitIds: prepared.symbolHitIds,
      }),
    };
  };
}

function parse(argv) {
  if (argv.length !== 1 || argv[0] !== '--verify-frozen-candidate') {
    throw new Error('Usage: node scripts/agent-eval/isolated-symbol-union.mjs --verify-frozen-candidate');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    parse(process.argv.slice(2));
    const candidateSha256 = verifyFrozenSymbolUnionCandidate().candidateSha256;
    // No corpus is opened and no symbol index is built until a future, explicitly
    // authorized isolated evaluation supplies its baseline-plan seam.
    console.log(JSON.stringify({ status: 'verified', candidateSha256, productionChanged: false }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
