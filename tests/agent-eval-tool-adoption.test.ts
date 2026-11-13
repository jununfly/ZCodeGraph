import { describe, it, expect } from 'vitest';
import { analyzeToolAdoption } from '../scripts/agent-eval/harness/tool-adoption-metrics.mjs';

describe('analyzeToolAdoption', () => {
  it('returns null for non-array input', () => {
    expect(analyzeToolAdoption(null).graphStats).toBeNull();
  });

  it('handles empty array', () => {
    const { graphStats } = analyzeToolAdoption([]);
    expect(graphStats.codeGraphCallCount).toBe(0);
    expect(graphStats.totalToolCallCount).toBe(0);
    expect(graphStats.firstCodeGraphCallIndex).toBe(-1);
    expect(graphStats.codeGraphCallRatio).toBe(0);
    expect(graphStats.exploreUsageRate).toBe(0);
    expect(graphStats.structuralPathCoverage).toBe(false);
    expect(graphStats.codeGraphToolSequence).toEqual([]);
  });

  it('detects zero CodeGraph adoption (real Flask with-arm pattern)', () => {
    // Real Flask baseline with-arm: 7 calls, all Read/Grep/Glob, 0 CodeGraph
    const toolCalls = [
      { name: 'Glob', arguments: { pattern: '**/flask/app.py' } },
      { name: 'Grep', arguments: { pattern: 'SERVER_NAME', path: '/src' } },
      { name: 'Read', arguments: { file_path: '/src/flask/app.py' } },
      { name: 'Grep', arguments: { pattern: 'session_transaction', path: '/src' } },
      { name: 'Read', arguments: { file_path: '/src/flask/testing.py' } },
      { name: 'Glob', arguments: { pattern: '**/flask/*.py' } },
      { name: 'Glob', arguments: { pattern: '**/tests/*.py' } },
    ];
    const { graphStats } = analyzeToolAdoption(toolCalls);
    expect(graphStats.codeGraphCallCount).toBe(0);
    expect(graphStats.totalToolCallCount).toBe(7);
    expect(graphStats.firstCodeGraphCallIndex).toBe(-1);
    expect(graphStats.codeGraphCallRatio).toBe(0);
    expect(graphStats.exploreUsageRate).toBe(0);
    expect(graphStats.structuralPathCoverage).toBe(false);
    expect(graphStats.nonCodeGraphCalls).toBe(7);
  });

  it('detects full CodeGraph adoption', () => {
    const toolCalls = [
      { name: 'mcp__codegraph__zcodegraph_explore', arguments: { query: 'Flask.run SERVER_NAME IPv6' } },
      { name: 'mcp__codegraph__zcodegraph_explore', arguments: { query: 'FlaskClient session_transaction cookie' } },
      { name: 'mcp__codegraph__zcodegraph_node', arguments: { symbol: 'Flask.run', includeCode: true } },
      { name: 'Read', arguments: { file_path: '/README.md' } },
    ];
    const { graphStats } = analyzeToolAdoption(toolCalls);
    expect(graphStats.codeGraphCallCount).toBe(3);
    expect(graphStats.totalToolCallCount).toBe(4);
    expect(graphStats.firstCodeGraphCallIndex).toBe(0);
    expect(graphStats.codeGraphCallRatio).toBe(0.75);
    expect(graphStats.exploreUsageRate).toBeCloseTo(2 / 3);
    expect(graphStats.structuralPathCoverage).toBe(true);
    expect(graphStats.codeGraphToolSequence).toEqual([
      'mcp__codegraph__zcodegraph_explore',
      'mcp__codegraph__zcodegraph_explore',
      'mcp__codegraph__zcodegraph_node',
    ]);
    expect(graphStats.nonCodeGraphCalls).toBe(1);
  });

  it('detects partial adoption with late first CodeGraph call', () => {
    const toolCalls = [
      { name: 'Glob', arguments: { pattern: '**/*.py' } },
      { name: 'Grep', arguments: { pattern: 'Flask', path: '/src' } },
      { name: 'mcp__codegraph__zcodegraph_callers', arguments: { symbol: 'Flask.run' } },
      { name: 'Read', arguments: { file_path: '/src/app.py' } },
    ];
    const { graphStats } = analyzeToolAdoption(toolCalls);
    expect(graphStats.firstCodeGraphCallIndex).toBe(2);
    expect(graphStats.codeGraphCallCount).toBe(1);
    expect(graphStats.structuralPathCoverage).toBe(true);
    expect(graphStats.exploreUsageRate).toBe(0); // callers, not explore
  });

  it('tracks structural vs non-structural CodeGraph tools', () => {
    const toolCalls = [
      { name: 'mcp__codegraph__zcodegraph_files', arguments: { pattern: '**/*.py' } },
      { name: 'mcp__codegraph__zcodegraph_status', arguments: {} },
    ];
    const { graphStats } = analyzeToolAdoption(toolCalls);
    expect(graphStats.codeGraphCallCount).toBe(2);
    expect(graphStats.structuralPathCoverage).toBe(false); // files/status are not structural
  });
});
