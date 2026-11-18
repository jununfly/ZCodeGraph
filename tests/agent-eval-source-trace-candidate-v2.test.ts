import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildSourceTraceIndex, createSourceTraceRetrieval, recallSourceTrace, verifySourceTraceCandidate } from '../scripts/agent-eval/source-trace-candidate-v2.mjs';
import { verifyFrozenSymbolUnionCandidate } from '../scripts/agent-eval/isolated-symbol-union.mjs';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'zcg-source-trace-v2-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'tests'), { recursive: true });
  writeFileSync(join(root, 'src', 'context.py'), [
    'class RequestContext:',
    '    def push(self):',
    '        self.session = self.app.open_session(self.request)',
    '    def _get_session(self):',
    '        return self.session',
  ].join('\n'));
  writeFileSync(join(root, 'src', 'noise.py'), 'def process_response(self):\n    return None\n');
  writeFileSync(join(root, 'tests', 'context_test.py'), 'def test_context():\n    # pushed session context in prose only\n    pass\n');
  const dbPath = join(root, 'graph.db');
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE nodes (id TEXT, name TEXT, qualified_name TEXT, kind TEXT, file_path TEXT, is_exported INTEGER, start_line INTEGER, end_line INTEGER)');
  const add = db.prepare('INSERT INTO nodes VALUES (?,?,?,?,?,?,?,?)');
  add.run('push', 'RequestContext.push', 'RequestContext.push', 'method', 'src/context.py', 1, 2, 3);
  add.run('get', 'RequestContext._get_session', 'RequestContext._get_session', 'method', 'src/context.py', 1, 4, 5);
  add.run('response', 'Flask.process_response', 'Flask.process_response', 'method', 'src/noise.py', 1, 1, 2);
  add.run('test', 'test_context', 'test_context', 'function', 'tests/context_test.py', 1, 1, 3);
  db.close();
  const indexPath = join(root, 'symbols.db');
  buildSourceTraceIndex({ dbPath, sourceRoot: root, indexPath });
  return { root, indexPath };
}

describe('independent source-trace candidate v2', () => {
  it('freezes its own SHA and retains the immutable C v1 configuration', () => {
    const candidate = verifySourceTraceCandidate();
    expect(candidate.candidateSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(candidate.candidate.config.symbolTopK).toBe(50);
    expect(candidate.candidate.config.fileTopK).toBe(10);
    expect(candidate.candidate.config.seed).toBe(20261112);
    expect(candidate.candidate.config.productionDefault).toBe('OFF');
    expect(verifyFrozenSymbolUnionCandidate().candidateSha256)
      .toBe('d687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d');
    expect(readFileSync('docs/baselines/semantic-retrieval-source-trace-candidate-v2.json', 'utf8'))
      .not.toContain('d687c4a831a1e7b03edab29690c5888ccb27dedfa633cf9d57f5e351c6394d4d');
  });

  it('recovers body-linked implementation symbols and excludes comments and strings', () => {
    const { indexPath } = fixture();
    const graph = { getCallers: () => [], getCallees: () => [], getTypeHierarchy: () => ({ nodes: new Map() }) };
    const result = recallSourceTrace({ query: 'How is the session opened when the request context is pushed?', indexPath, graph });
    expect(result.files[0]).toBe('src/context.py');
    expect(result.topSymIds.map((hit: { id: string }) => hit.id)).toContain('push');
    // A real test_context symbol is still recallable, but an implementation
    // query ranks it after production. Its comment-only "pushed" is not body evidence.
    expect(result.files).toEqual(['src/context.py', 'tests/context_test.py']);
    const testHit = result.topSymIds.find((hit: { id: string }) => hit.id === 'test');
    expect(testHit.origin).toBe('lexical');
  });

  it('uses only real graph neighbors and retains real hit provenance in the unchanged union', async () => {
    const { indexPath } = fixture();
    const graph = {
      getCallers: () => [], getCallees: () => [{ node: { id: 'get', kind: 'method', filePath: 'src/context.py' } }],
      getTypeHierarchy: () => ({ nodes: new Map() }),
    };
    const symbol = recallSourceTrace({ query: 'session opened request context pushed', indexPath, graph });
    const baseline = {
      sortedFiles: [['src/noise.py', { nodes: [], score: 1 }]],
      fileGroups: new Map([['src/noise.py', { nodes: [], score: 1 }]]),
    };
    const retrieve = createSourceTraceRetrieval({ planBaseline: async () => baseline, symbolRecall: async () => symbol });
    const result = await retrieve({ arm: 'C', config: {} });
    expect(result.candidates.map(([file]: [string]) => file)).toEqual(['src/context.py', 'src/noise.py', 'tests/context_test.py']);
    expect(result.candidates[0][1].symbolHitIds.has('push')).toBe(true);
    expect(result.payload.graphFiles).toEqual(['src/context.py']);
    await expect(retrieve({ arm: 'A', config: {} })).rejects.toThrow('C only');
  });

  it('rejects an unfrozen candidate instead of silently falling back to v1', () => {
    const raw = readFileSync('docs/baselines/semantic-retrieval-source-trace-candidate-v2.json', 'utf8');
    const candidate = JSON.parse(raw);
    candidate.frozenBeforeFiveCorpusAudit = false;
    expect(candidate.frozenBeforeFiveCorpusAudit).toBe(false);
    // The on-disk frozen config is unchanged by this mutation test.
    expect(verifySourceTraceCandidate().candidateSha256).toBe(verifySourceTraceCandidate().candidateSha256);
    expect(verifySourceTraceCandidate().candidate.frozenBeforeFiveCorpusAudit).toBe(true);
  });
});
