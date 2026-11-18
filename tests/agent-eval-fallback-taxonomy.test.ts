import { describe, it, expect } from 'vitest';
import { classifyToolCall, analyzeFallback } from '../scripts/agent-eval/harness/fallback-taxonomy.mjs';

describe('classifyToolCall', () => {
  it('classifies Glob as codegraphReplaceable', () => {
    const result = classifyToolCall({ name: 'Glob', arguments: { pattern: '**/flask/app.py' } });
    expect(result?.classification).toBe('codegraphReplaceable');
    expect(result?.codegraphAlternative).toBe('zcodegraph_explore');
  });

  it('classifies Grep for symbol name as codegraphReplaceable', () => {
    const result = classifyToolCall({ name: 'Grep', arguments: { pattern: 'session_transaction', path: '/src' } });
    expect(result?.classification).toBe('codegraphReplaceable');
    expect(result?.codegraphAlternative).toBe('zcodegraph_search');
  });

  it('classifies Grep for complex regex as codegraphReplaceable', () => {
    const result = classifyToolCall({ name: 'Grep', arguments: { pattern: 'def .*cookie', path: '/src' } });
    expect(result?.classification).toBe('codegraphReplaceable');
    expect(result?.codegraphAlternative).toBe('zcodegraph_explore');
  });

  it('classifies Read on code file as codegraphReplaceable', () => {
    const result = classifyToolCall({ name: 'Read', arguments: { file_path: '/src/flask/app.py' } });
    expect(result?.classification).toBe('codegraphReplaceable');
    expect(result?.codegraphAlternative).toBe('zcodegraph_node');
  });

  it('classifies Read on markdown as justified', () => {
    const result = classifyToolCall({ name: 'Read', arguments: { file_path: '/README.md' } });
    expect(result?.classification).toBe('justified');
    expect(result?.codegraphAlternative).toBeNull();
  });

  it('classifies Read on JSON config as justified', () => {
    const result = classifyToolCall({ name: 'Read', arguments: { file_path: '/package.json' } });
    expect(result?.classification).toBe('justified');
  });

  it('returns null for CodeGraph tool calls', () => {
    expect(classifyToolCall({ name: 'mcp__codegraph__zcodegraph_explore', arguments: { query: 'test' } })).toBeNull();
  });

  it('returns null for other tools', () => {
    expect(classifyToolCall({ name: 'Bash', arguments: { command: 'ls' } })).toBeNull();
  });
});

describe('analyzeFallback', () => {
  it('returns null for non-array input', () => {
    const result = analyzeFallback(null);
    expect(result.readGrepFallbackDisplacement).toBeNull();
    expect(result.fallbackTaxonomy).toBeNull();
  });

  it('returns zero counts for empty array', () => {
    const result = analyzeFallback([]);
    expect(result.readGrepFallbackDisplacement).toEqual({
      read: 0, grep: 0, glob: 0,
      notes: '0 codegraph-replaceable, 0 justified out of 0 Read/Grep/Glob calls',
    });
  });

  it('counts all replaceable calls from real Flask without-arm pattern', () => {
    // Simulates the real Flask baseline without-arm: 2 Read + 3 Grep + 3 Glob
    const toolCalls = [
      { name: 'Glob', arguments: { pattern: '**/flask/app.py' } },
      { name: 'Glob', arguments: { pattern: '**/flask/testing.py' } },
      { name: 'Glob', arguments: { pattern: '**/flask/*.py' } },
      { name: 'Grep', arguments: { pattern: 'SERVER_NAME', path: '/src/flask' } },
      { name: 'Grep', arguments: { pattern: 'session_transaction', path: '/src/flask' } },
      { name: 'Grep', arguments: { pattern: '_update_cookies', path: '/src/flask' } },
      { name: 'Read', arguments: { file_path: '/src/flask/app.py', offset: 721, limit: 50 } },
      { name: 'Read', arguments: { file_path: '/src/flask/testing.py', offset: 135, limit: 50 } },
    ];
    const result = analyzeFallback(toolCalls);
    expect(result.readGrepFallbackDisplacement).toEqual({
      read: 2, grep: 3, glob: 3,
      notes: '8 codegraph-replaceable, 0 justified out of 8 Read/Grep/Glob calls',
    });
    expect(result.fallbackTaxonomy.replaceable).toEqual({ read: 2, grep: 3, glob: 3 });
    expect(result.fallbackTaxonomy.justified).toEqual({ read: 0, grep: 0, glob: 0 });
    expect(result.fallbackTaxonomy.details).toHaveLength(8);
  });

  it('mixes replaceable and justified correctly', () => {
    const toolCalls = [
      { name: 'Read', arguments: { file_path: '/src/app.py' } },
      { name: 'Read', arguments: { file_path: '/README.md' } },
      { name: 'Grep', arguments: { pattern: 'myFunction', path: '/src' } },
      { name: 'Glob', arguments: { pattern: '**/*.py' } },
    ];
    const result = analyzeFallback(toolCalls);
    expect(result.readGrepFallbackDisplacement.read).toBe(1);
    expect(result.readGrepFallbackDisplacement.grep).toBe(1);
    expect(result.readGrepFallbackDisplacement.glob).toBe(1);
    expect(result.fallbackTaxonomy.justified.read).toBe(1);
    expect(result.fallbackTaxonomy.details).toHaveLength(4);
  });

  it('skips CodeGraph calls in taxonomy', () => {
    const toolCalls = [
      { name: 'mcp__codegraph__zcodegraph_explore', arguments: { query: 'test' } },
      { name: 'Read', arguments: { file_path: '/src/app.py' } },
    ];
    const result = analyzeFallback(toolCalls);
    expect(result.fallbackTaxonomy.details).toHaveLength(1);
    expect(result.readGrepFallbackDisplacement.read).toBe(1);
  });
});
