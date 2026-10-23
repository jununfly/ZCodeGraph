/**
 * Roadmap 1-2-11 — P0a explore 小项目 budget 收紧 + 真压缩.
 *
 * Motivation: 2026-10-21 layer2 evidence showed petclinic 3 tasks all >1.0
 * explore/read ratio (1.28/1.50/1.74). On small projects the explore answer
 * over-fires: blast-radius + whole-file rule on controller files push the
 * numerator past the byte cost of reading 2-3 equivalent files directly.
 *
 * The opt-in env var CODEGRAPH_EXPLORE_TIGHT_SMALL_PROJECT=1 switches the
 * <150 and <500 budget tiers to a tightened shape (lower maxOutputChars,
 * lower maxCharsPerFile, includeBlastRadius=false). These tests pin:
 *
 *   1. The tight-tier budget shape itself (so default behaviour is untouched
 *      when the env var is unset).
 *   2. Blast-radius section is omitted on the tight tier.
 *   3. Whole-file rule shrinks on the tight tier, so a ~6-7KB controller file
 *      falls through to per-symbol clustering instead of a verbatim dump.
 *   4. Critical named symbols still surface — the petclinic-trace core link
 *      (OwnerController.showOwner → OwnerRepository.findById) remains
 *      greppable after tightening.
 *
 * Fixture note: we do NOT use the real petclinic corpus (a 69-file Java
 * project lives in C:/workspace/measure-corpus, gated on MEASURE_SKIP_FETCH).
 * Instead we build a synthetic small-project fixture mimicking the petclinic
 * shape (a controller + a repository + a handful of siblings) and drive
 * explore through ToolHandler.execute, the same path the MCP server uses.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getExploreOutputBudget,
  tightSmallProjectBudgetEnabled,
  ToolHandler,
} from '../src/mcp/tools';
import CodeGraph from '../src/index';

// ---------------------------------------------------------------------------
// Budget shape
// ---------------------------------------------------------------------------

describe('tight small-project budget shape (roadmap 1-2-11)', () => {
  const ENV_KEY = 'CODEGRAPH_EXPLORE_TIGHT_SMALL_PROJECT';

  beforeEach(() => {
    delete process.env[ENV_KEY];
  });
  afterEach(() => {
    delete process.env[ENV_KEY];
  });

  it('is disabled by default (env var unset)', () => {
    expect(tightSmallProjectBudgetEnabled()).toBe(false);
  });

  it('is enabled when CODEGRAPH_EXPLORE_TIGHT_SMALL_PROJECT=1', () => {
    process.env[ENV_KEY] = '1';
    expect(tightSmallProjectBudgetEnabled()).toBe(true);
  });

  it('is enabled when CODEGRAPH_EXPLORE_TIGHT_SMALL_PROJECT=true', () => {
    process.env[ENV_KEY] = 'true';
    expect(tightSmallProjectBudgetEnabled()).toBe(true);
  });

  it('is disabled for other values (0 / false / garbage)', () => {
    for (const v of ['0', 'false', 'yes', '']) {
      process.env[ENV_KEY] = v;
      expect(tightSmallProjectBudgetEnabled()).toBe(false);
    }
  });

  it('leaves the default <150 tier untouched when tight mode is OFF', () => {
    const b = getExploreOutputBudget(69);
    expect(b.maxOutputChars).toBe(13000);
    expect(b.defaultMaxFiles).toBe(4);
    expect(b.maxCharsPerFile).toBe(3800);
    expect(b.includeBlastRadius).toBeUndefined(); // legacy = on
  });

  it('leaves the default <500 tier untouched when tight mode is OFF', () => {
    const b = getExploreOutputBudget(300);
    expect(b.maxOutputChars).toBe(18000);
    expect(b.defaultMaxFiles).toBe(5);
    expect(b.maxCharsPerFile).toBe(3800);
    expect(b.includeBlastRadius).toBeUndefined();
  });

  it('tightens the <150 tier when tight mode is ON', () => {
    process.env[ENV_KEY] = '1';
    const b = getExploreOutputBudget(69);
    expect(b.maxOutputChars).toBeLessThan(13000);
    expect(b.defaultMaxFiles).toBeLessThan(4);
    expect(b.maxCharsPerFile).toBeLessThan(3800);
    expect(b.includeBlastRadius).toBe(false);
  });

  it('tightens the <500 tier when tight mode is ON', () => {
    process.env[ENV_KEY] = '1';
    const b = getExploreOutputBudget(300);
    expect(b.maxOutputChars).toBeLessThan(18000);
    expect(b.defaultMaxFiles).toBeLessThan(5);
    expect(b.maxCharsPerFile).toBeLessThan(3800);
    expect(b.includeBlastRadius).toBe(false);
  });

  it('does not tighten medium/large tiers (>=500 files untouched)', () => {
    process.env[ENV_KEY] = '1';
    const medium = getExploreOutputBudget(1000);
    const large = getExploreOutputBudget(20000);
    expect(medium.maxOutputChars).toBe(24000);
    expect(large.maxOutputChars).toBe(24000);
    expect(medium.includeBlastRadius).toBeUndefined();
    expect(large.includeBlastRadius).toBeUndefined();
  });

  it('preserves the monotonic invariant: larger tier never has smaller maxCharsPerFile', () => {
    process.env[ENV_KEY] = '1';
    const tiny = getExploreOutputBudget(100);
    const small = getExploreOutputBudget(300);
    const medium = getExploreOutputBudget(1000);
    expect(tiny.maxCharsPerFile).toBeLessThanOrEqual(small.maxCharsPerFile);
    expect(small.maxCharsPerFile).toBeLessThanOrEqual(medium.maxCharsPerFile);
  });
});

// ---------------------------------------------------------------------------
// End-to-end: tight mode on a synthetic petclinic-like small project
// ---------------------------------------------------------------------------

describe('Explore Answer on a petclinic-like small project (tight mode)', () => {
  const ENV_KEY = 'CODEGRAPH_EXPLORE_TIGHT_SMALL_PROJECT';
  let testDir: string;
  let cg: CodeGraph;
  let handler: ToolHandler;

  beforeAll(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-tight-small-'));
    const ownerDir = path.join(testDir, 'src', 'owner');
    fs.mkdirSync(ownerDir, { recursive: true });

    // OwnerRepository.ts — findById as a plain exported function (NOT an
    // interface method) so it has a real definition body that callers can
    // reference. Interface methods have no def-site edges in the graph and
    // never produce blast-radius callers — the explore-blast-radius fixture
    // uses plain functions for exactly this reason.
    fs.writeFileSync(
      path.join(ownerDir, 'OwnerRepository.ts'),
      [
        'export interface Owner { id: number; lastName: string; }',
        '',
        '/** Retrieve an Owner from the data store by id. */',
        'export function findById(id: number): Owner | undefined {',
        '  return id > 0 ? { id, lastName: "stub" } : undefined;',
        '}',
        '',
        '/** Retrieve Owners by last name. */',
        'export function findByLastNameStartingWith(lastName: string): Owner[] {',
        '  return lastName ? [{ id: 1, lastName }] : [];',
        '}',
        '',
      ].join('\n')
    );

    // OwnerController.ts — a fat-ish controller calling findById. Mimics
    // petclinic's OwnerController: 200+ lines with many unrelated handler
    // methods so the whole-file rule on the default tier would dump it
    // whole, but the tight tier should force it into clustering around
    // showOwner/processFindForm.
    const controllerLines: string[] = [
      "import { findById, findByLastNameStartingWith } from './OwnerRepository';",
      "import type { Owner } from './OwnerRepository';",
      '',
      'export class OwnerController {',
      '',
    ];
    // Filler methods to bloat the file past 220 lines (the default
    // WHOLE_FILE_MAX_LINES). Each is small; the point is the file is
    // controller-sized, not utility-sized.
    for (let i = 0; i < 18; i++) {
      controllerLines.push(
        `  handler${i}(id: number | null): string {`,
        `    if (id == null) return 'error';`,
        `    const o = findById(id);`,
        `    return o ? 'ok' + ${i} : 'missing';`,
        `  }`,
        ''
      );
    }
    controllerLines.push(
      '  showOwner(ownerId: number): string {',
      '    const owner: Owner | undefined = findById(ownerId);',
      '    return owner ? "ownerView" : "notFound";',
      '  }',
      '',
      '  processFindForm(lastName: string): string {',
      '    const results = findByLastNameStartingWith(lastName);',
      '    return results.length === 0 ? "none" : "list";',
      '  }',
      '}',
      ''
    );
    fs.writeFileSync(path.join(ownerDir, 'OwnerController.ts'), controllerLines.join('\n'));

    // Owner.ts — a small sibling.
    fs.writeFileSync(
      path.join(ownerDir, 'Owner.ts'),
      [
        'export class Owner {',
        '  constructor(public id: number, public lastName: string) {}',
        '  getId(): number { return this.id; }',
        '  getLastName(): string { return this.lastName; }',
        '}',
        ''
      ].join('\n')
    );

    // A handful of unrelated siblings so the project has a realistic shape
    // (and to ensure the <150 tier applies).
    for (let i = 0; i < 8; i++) {
      fs.writeFileSync(
        path.join(ownerDir, `Sibling${i}.ts`),
        [
          `export class Sibling${i} {`,
          `  method${i}(): string { return 's${i}'; }`,
          '}',
          ''
        ].join('\n')
      );
    }

    cg = CodeGraph.initSync(testDir, {
      config: { include: ['**/*.ts'], exclude: [] },
    });
    await cg.indexAll({ engine: 'typescript' });
    handler = new ToolHandler(cg);
  });

  afterAll(() => {
    if (cg) cg.destroy();
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    delete process.env[ENV_KEY];
  });
  afterEach(() => {
    delete process.env[ENV_KEY];
  });

  it('includes the blast-radius section on the default tier', async () => {
    const result = await handler.execute('zcodegraph_explore', {
      query: 'findById signature change',
    });
    const text = result.content?.[0]?.text ?? '';
    // Default tier has blast radius on (includeBlastRadius undefined → true).
    // The query names findById, which has callers in OwnerController, so the
    // blast-radius section should appear.
    expect(text).toContain('### Blast radius');
  });

  it('omits the blast-radius section when tight mode is ON', async () => {
    process.env[ENV_KEY] = '1';
    const result = await handler.execute('zcodegraph_explore', {
      query: 'findById signature change',
    });
    const text = result.content?.[0]?.text ?? '';
    expect(text).not.toContain('### Blast radius');
  });

  it('produces a smaller payload when tight mode is ON', async () => {
    const offResult = await handler.execute('zcodegraph_explore', {
      query: 'findById signature change',
    });
    const offText = offResult.content?.[0]?.text ?? '';

    process.env[ENV_KEY] = '1';
    const onResult = await handler.execute('zcodegraph_explore', {
      query: 'findById signature change',
    });
    const onText = onResult.content?.[0]?.text ?? '';

    expect(onText.length).toBeLessThan(offText.length);
  });

  it('still surfaces the trace core (OwnerController.showOwner → OwnerRepository.findById) after tightening', async () => {
    process.env[ENV_KEY] = '1';
    const result = await handler.execute('zcodegraph_explore', {
      query: 'OwnerController.showOwner findById database',
    });
    const text = result.content?.[0]?.text ?? '';
    // The explore answer must still name both files — the agent cannot
    // answer the trace question if either half is missing. We do NOT assert
    // on specific line numbers (those drift with fixture edits); the file
    // headers and the method-name grep are the load-bearing assertions.
    expect(text).toContain('OwnerController.ts');
    expect(text).toContain('OwnerRepository.ts');
    expect(text).toContain('showOwner');
    expect(text).toContain('findById');
  });

  it('still surfaces the definition site for findById after tightening', async () => {
    process.env[ENV_KEY] = '1';
    const result = await handler.execute('zcodegraph_explore', {
      query: 'findById signature change',
    });
    const text = result.content?.[0]?.text ?? '';
    // The signature-change question cannot be answered without the
    // definition. The repository interface must appear in the answer.
    expect(text).toContain('OwnerRepository.ts');
    expect(text).toContain('findById');
  });

  it('keeps the Route matches / Source Code section markers intact on tight mode', async () => {
    process.env[ENV_KEY] = '1';
    const result = await handler.execute('zcodegraph_explore', {
      query: 'findById signature change',
    });
    const text = result.content?.[0]?.text ?? '';
    // The Source Code section is load-bearing — tight mode must not strip it.
    expect(text).toContain('### Source Code');
  });
});
