/**
 * Context ranking: common-word precision + low-confidence handoff.
 *
 * Regression coverage for the failure where a prose query
 * ("capture intro onboarding screen flat object") surfaced an unrelated
 * constant named `FLAT` (in a download script) as a top Entry Node — because
 * the descriptive word "flat" exact-matched it and the +exact-name bonus was
 * exempt from single-term dampening. The fix: only distinctive identifiers earn
 * that exemption; an isolated common-word exact match is demoted, and a query
 * that resolves only to such weak matches is flagged low-confidence so the
 * response hands off to explore/trace instead of bluffing.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import CodeGraph from '../src/index';
import { LOW_CONFIDENCE_MARKER } from '../src/context';
import { isDistinctiveIdentifier } from '../src/search/query-utils';

describe('isDistinctiveIdentifier', () => {
  it('treats plain dictionary words as non-distinctive', () => {
    for (const word of ['flat', 'object', 'screen', 'standing', 'capture']) {
      expect(isDistinctiveIdentifier(word)).toBe(false);
    }
  });

  it('treats leading-capital-only words (proper nouns / sentence start) as non-distinctive', () => {
    expect(isDistinctiveIdentifier('Screen')).toBe(false);
    expect(isDistinctiveIdentifier('Zustand')).toBe(false);
  });

  it('treats camelCase / PascalCase / snake_case / acronyms / digits as distinctive', () => {
    expect(isDistinctiveIdentifier('setLastEmail')).toBe(true);
    expect(isDistinctiveIdentifier('OrgUserStore')).toBe(true);
    expect(isDistinctiveIdentifier('user_store')).toBe(true);
    expect(isDistinctiveIdentifier('REST')).toBe(true);
    expect(isDistinctiveIdentifier('v2')).toBe(true);
  });
});

describe('Context ranking — common-word precision & confidence', () => {
  let testDir: string;
  let cg: CodeGraph;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-ctxrank-'));

    // The corroborated target: a capture-flow screen whose NAME alone matches
    // three query terms (capture + intro + screen), and which lives under a
    // matching directory.
    const captureDir = path.join(testDir, 'src', 'app', 'capture');
    fs.mkdirSync(captureDir, { recursive: true });
    fs.writeFileSync(
      path.join(captureDir, 'intro.tsx'),
      `export function CaptureIntroScreen() {
  // Onboarding screen shown before the user selects flat or standing object capture.
  return null;
}
`
    );

    // The trap: an unrelated constant literally named FLAT, in a totally
    // different area. "flat" in a prose query exact-matches it.
    const scriptsDir = path.join(testDir, 'scripts', 'dataset');
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.writeFileSync(
      path.join(scriptsDir, 'download.ts'),
      `export const FLAT = 'freiburg_flat_dataset';
export function downloadDataset(name: string): string { return name; }
`
    );

    cg = CodeGraph.initSync(testDir, {
      config: { include: ['**/*.ts', '**/*.tsx'], exclude: [] },
    });
    await cg.indexAll();
  });

  afterEach(() => {
    if (cg) cg.destroy();
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('does not let a common-word exact match (FLAT) outrank a corroborated symbol', async () => {
    const sg = await cg.findRelevantContext(
      'capture intro onboarding screen flat object'
    );
    const rootNames = sg.entryNodes.map((id) => sg.nodes.get(id)?.name);

    // The corroborated capture screen surfaces as an Entry Node...
    expect(rootNames).toContain('CaptureIntroScreen');
    // ...and the trap constant is never the lead result (the bug we fixed).
    expect(rootNames[0]).not.toBe('FLAT');

    const capIdx = rootNames.indexOf('CaptureIntroScreen');
    const flatIdx = rootNames.indexOf('FLAT');
    if (flatIdx >= 0) expect(capIdx).toBeLessThan(flatIdx);

    // And it's confidently answered (we located a corroborated symbol).
    expect(sg.confidence).toBe('high');
  });

  it('flags low confidence and emits the handoff when only common words match', async () => {
    const query = 'flat object thing';
    const sg = await cg.findRelevantContext(query);
    expect(sg.confidence).toBe('low');

    const md = await cg.collectContext(query, { format: 'markdown' });
    expect(typeof md).toBe('string');
    expect(md as string).toContain(LOW_CONFIDENCE_MARKER);
    // The handoff routes to the precise tools rather than claiming completeness.
    expect(md as string).toMatch(/zcodegraph_explore/);
  });

  it('does not emit the handoff for a precise, distinctive-symbol query', async () => {
    const sg = await cg.findRelevantContext('CaptureIntroScreen');
    expect(sg.confidence).toBe('high');

    const md = await cg.collectContext('CaptureIntroScreen', { format: 'markdown' });
    expect(md as string).not.toContain(LOW_CONFIDENCE_MARKER);
  });
});

describe('Context ranking — broad operation family recall', () => {
  let testDir: string;
  let cg: CodeGraph;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-opfamily-'));

    const bulkDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'action', 'bulk');
    fs.mkdirSync(bulkDir, { recursive: true });
    fs.writeFileSync(
      path.join(bulkDir, 'TransportBulkAction.java'),
      `package org.elasticsearch.action.bulk;
public class TransportBulkAction {
  public BulkResponse execute(BulkRequest request) { return new BulkResponse(); }
}
class BulkRequest {}
class BulkResponse {}
`
    );

    const statsDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'index', 'bulk', 'stats');
    fs.mkdirSync(statsDir, { recursive: true });
    fs.writeFileSync(
      path.join(statsDir, 'BulkStats.java'),
      `package org.elasticsearch.index.bulk.stats;
public class BulkStats {}
public class BulkOperationListener {}
public class ShardBulkStats {}
`
    );

    const vectorsDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'index', 'codec', 'vectors');
    fs.mkdirSync(vectorsDir, { recursive: true });
    fs.writeFileSync(
      path.join(vectorsDir, 'VectorScoringUtils.java'),
      `package org.elasticsearch.index.codec.vectors;
public class VectorScoringUtils {
  public void bulk() {}
  public void indexing() {}
}
`
    );

    const noiseDir = path.join(testDir, 'x-pack', 'plugin', 'core', 'src', 'main', 'java', 'org', 'elasticsearch', 'indexing');
    fs.mkdirSync(noiseDir, { recursive: true });
    fs.writeFileSync(
      path.join(noiseDir, 'IndexerNoise.java'),
      `package org.elasticsearch.indexing;
public class IndexEngine {}
public class IndexerUtils {}
public class IndexedDISI {}
public enum IndexerState { STARTED }
public class IndexerJobStats {}
`
    );

    cg = CodeGraph.initSync(testDir, {
      config: { include: ['**/*.java'], exclude: [] },
    });
    await cg.indexAll();
  });

  afterEach(() => {
    if (cg) cg.destroy();
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('keeps action/request/response symbols for a broad bulk indexing query', async () => {
    const sg = await cg.findRelevantContext('How does bulk indexing work?', {
      searchLimit: 4,
      traversalDepth: 1,
      maxNodes: 40,
      minScore: 0.2,
    });
    const names = new Set([...sg.nodes.values()].map((n) => n.name));

    expect(names).toContain('TransportBulkAction');
    expect(names).toContain('BulkRequest');
    expect(names).toContain('BulkResponse');
  });
});

describe('Context ranking — broad allocation service recall', () => {
  let testDir: string;
  let cg: CodeGraph;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-allocation-'));

    const allocationDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'cluster', 'routing', 'allocation');
    fs.mkdirSync(allocationDir, { recursive: true });
    fs.writeFileSync(
      path.join(allocationDir, 'AllocationService.java'),
      `package org.elasticsearch.cluster.routing.allocation;
public class AllocationService {
  private final BalancedShardsAllocator allocator = new BalancedShardsAllocator();
  public void reroute() { allocator.allocate(); }
}
class RoutingAllocation {}
`
    );

    const allocatorDir = path.join(allocationDir, 'allocator');
    fs.mkdirSync(allocatorDir, { recursive: true });
    fs.writeFileSync(
      path.join(allocatorDir, 'BalancedShardsAllocator.java'),
      `package org.elasticsearch.cluster.routing.allocation.allocator;
public class BalancedShardsAllocator {
  public void allocate() {}
}
`
    );

    const deciderDir = path.join(allocationDir, 'decider');
    fs.mkdirSync(deciderDir, { recursive: true });
    fs.writeFileSync(
      path.join(deciderDir, 'EnableAllocationDecider.java'),
      `package org.elasticsearch.cluster.routing.allocation.decider;
public class EnableAllocationDecider {
  public enum Rebalance { ALWAYS, INDICES_ALL_ACTIVE }
}
public class RebalanceOnlyWhenActiveAllocationDecider {}
`
    );

    const mlDir = path.join(testDir, 'x-pack', 'plugin', 'ml', 'src', 'main', 'java', 'org', 'elasticsearch', 'xpack', 'ml', 'inference', 'assignment');
    fs.mkdirSync(mlDir, { recursive: true });
    fs.writeFileSync(
      path.join(mlDir, 'TrainedModelAssignmentRebalancer.java'),
      `package org.elasticsearch.xpack.ml.inference.assignment;
public class TrainedModelAssignmentRebalancer {
  public void rebalance() {}
}
`
    );

    cg = CodeGraph.initSync(testDir, {
      config: { include: ['**/*.java'], exclude: [] },
    });
    await cg.indexAll();
  });

  afterEach(() => {
    if (cg) cg.destroy();
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('keeps allocation service and allocator evidence for a broad shard rebalancing query', async () => {
    const sg = await cg.findRelevantContext('How does shard rebalancing and allocation work?', {
      searchLimit: 4,
      traversalDepth: 1,
      maxNodes: 40,
      minScore: 0.2,
    });
    const names = new Set([...sg.nodes.values()].map((n) => n.name));

    expect(names).toContain('AllocationService');
    expect(names).toContain('BalancedShardsAllocator');
  });
});

describe('Context ranking — polymorphic implementation family recall', () => {
  let testDir: string;
  let cg: CodeGraph;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-engine-family-'));

    const engineDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'index', 'engine');
    fs.mkdirSync(engineDir, { recursive: true });
    fs.writeFileSync(
      path.join(engineDir, 'Engine.java'),
      `package org.elasticsearch.index.engine;
public abstract class Engine {
  public abstract void index();
}
`
    );
    fs.writeFileSync(
      path.join(engineDir, 'InternalEngine.java'),
      `package org.elasticsearch.index.engine;
public class InternalEngine extends Engine {
  public void index() {}
}
`
    );
    fs.writeFileSync(
      path.join(engineDir, 'ReadOnlyEngine.java'),
      `package org.elasticsearch.index.engine;
public class ReadOnlyEngine extends Engine {
  public void index() {}
}
`
    );

    const statelessDir = path.join(testDir, 'x-pack', 'plugin', 'stateless', 'src', 'main', 'java', 'org', 'elasticsearch', 'xpack', 'stateless', 'engine');
    fs.mkdirSync(statelessDir, { recursive: true });
    fs.writeFileSync(
      path.join(statelessDir, 'IndexEngine.java'),
      `package org.elasticsearch.xpack.stateless.engine;
import org.elasticsearch.index.engine.InternalEngine;
public class IndexEngine extends InternalEngine {
  public void index() {}
}
`
    );

    const noiseDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'action', 'index');
    fs.mkdirSync(noiseDir, { recursive: true });
    fs.writeFileSync(
      path.join(noiseDir, 'IndexNoise.java'),
      `package org.elasticsearch.action.index;
public class IndexRequest {}
public class IndexResponse {}
public class IndexerUtils {}
public class IndexedDISI {}
`
    );

    const testDirPath = path.join(testDir, 'server', 'src', 'test', 'java', 'org', 'elasticsearch', 'index', 'engine');
    fs.mkdirSync(testDirPath, { recursive: true });
    fs.writeFileSync(
      path.join(testDirPath, 'TestEngine.java'),
      `package org.elasticsearch.index.engine;
public class TestEngine extends Engine {
  public void index() {}
}
`
    );

    cg = CodeGraph.initSync(testDir, {
      config: { include: ['**/*.java'], exclude: [] },
    });
    await cg.indexAll();
  });

  afterEach(() => {
    if (cg) cg.destroy();
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('keeps write-capable and read-only Engine implementations in a broad implementation query', async () => {
    const sg = await cg.findRelevantContext('What are the Engine implementations for indexing?', {
      searchLimit: 4,
      traversalDepth: 0,
      maxNodes: 40,
      minScore: 0.2,
    });
    const names = new Set([...sg.nodes.values()].map((n) => n.name));

    expect(names).toContain('Engine');
    expect(names).toContain('InternalEngine');
    expect(names).toContain('ReadOnlyEngine');
    expect(names).toContain('IndexEngine');
    expect(names).not.toContain('TestEngine');
  });
});
