import { describe, expect, it } from 'vitest';

// @ts-expect-error evaluation-only JavaScript module has no declaration file
const load = () => import('../scripts/agent-eval/fixed-c-visible-evidence.mjs');

const alpha = ['alpha.ts', { score: 3 }] as const;
const beta = ['beta.ts', { score: 2 }] as const;
const gamma = ['gamma.ts', { score: 1 }] as const;
const cAnswer = [
  '## Exploration',
  '',
  '### Source Code',
  '',
  '> The code below is the **verbatim, current on-disk source** of these files — re-read from disk on this call and line-numbered, byte-for-byte identical to what the Read tool returns. It is NOT a summary, outline, or stale cache. Treat each block as a Read you have already performed: do not Read a file shown here.',
  '',
  '#### alpha.ts — run',
  '',
  '```ts',
  'export const alpha = "C clipped alpha";',
  '```',
  '',
  '#### beta.ts — handler',
  '',
  '```ts',
  'export const beta = "C clipped beta";',
  '```',
  '',
  '#### gamma.ts — helper',
  '',
  '```ts',
  'export const gamma = "C clipped gamma";',
  '```',
  '',
  '### Not shown above — explore these names for their source',
  '',
  '- delta.ts: helper',
  '',
  '> Some file sections were trimmed for size.',
  '',
].join('\n');

describe('fixed-c-visible-evidence-order-only-v1', () => {
  it('reorders complete C source blocks without changing their bytes or the trailing diagnostics', async () => {
    const { deriveFixedCVisibleEvidenceOrder } = await load();
    const expected = cAnswer.replace([
      '#### alpha.ts — run',
      '',
      '```ts',
      'export const alpha = "C clipped alpha";',
      '```',
      '',
      '#### beta.ts — handler',
      '',
      '```ts',
      'export const beta = "C clipped beta";',
      '```',
      '',
    ].join('\n'), [
      '#### beta.ts — handler',
      '',
      '```ts',
      'export const beta = "C clipped beta";',
      '```',
      '',
      '#### alpha.ts — run',
      '',
      '```ts',
      'export const alpha = "C clipped alpha";',
      '```',
      '',
    ].join('\n'));

    const result = deriveFixedCVisibleEvidenceOrder({
      cCandidates: [alpha, beta, gamma],
      sCandidates: [beta, alpha, gamma],
      cAnswer,
    });

    expect(result.answer).toBe(expected);
    expect(result.answer).not.toBe(cAnswer);
    expect(result.answer).toContain('export const alpha = "C clipped alpha";');
    expect(result.answer.endsWith('### Not shown above — explore these names for their source\n\n- delta.ts: helper\n\n> Some file sections were trimmed for size.\n')).toBe(true);
    expect(result.proof).toMatchObject({
      schema: 'fixed-c-visible-evidence-order-only-v1',
      diagnostic: true,
      cFileOrder: ['alpha.ts', 'beta.ts', 'gamma.ts'],
      sFileOrder: ['beta.ts', 'alpha.ts', 'gamma.ts'],
      fileSetsEqual: true,
      nonSourcePrefixIdentical: true,
      nonSourceSuffixIdentical: true,
      contentDifferences: [],
      candidateProjectionEqual: true,
    });
  });

  it('fails closed when a candidate is missing, duplicated or clipped by the hard ceiling', async () => {
    const { deriveFixedCVisibleEvidenceOrder } = await load();
    expect(() => deriveFixedCVisibleEvidenceOrder({
      cCandidates: [alpha, beta, gamma], sCandidates: [beta, alpha, gamma],
      cAnswer: cAnswer.replace('#### gamma.ts — helper', '#### unlisted.ts — helper'),
    })).toThrow(/exact, unique projection/);
    expect(() => deriveFixedCVisibleEvidenceOrder({
      cCandidates: [alpha, beta, gamma], sCandidates: [beta, alpha, gamma],
      cAnswer: cAnswer.replace('### Not shown above', '#### alpha.ts — duplicate\n\n```ts\nalpha\n```\n\n### Not shown above'),
    })).toThrow(/duplicate rendered file block/);
    expect(() => deriveFixedCVisibleEvidenceOrder({
      cCandidates: [alpha, beta], sCandidates: [beta, alpha],
      cAnswer: cAnswer.replace('export const gamma = "C clipped gamma";', '> … elided[output#abc'),
    })).toThrow(/hard-ceiling|exact, unique projection/);
    expect(() => deriveFixedCVisibleEvidenceOrder({
      cCandidates: [alpha, beta, gamma], sCandidates: [beta, alpha, beta], cAnswer,
    })).toThrow(/equal file multiset/);
  });

  it('keeps Markdown-looking source inside fenced file blocks and rejects an invalid Source Code preamble', async () => {
    const { deriveFixedCVisibleEvidenceOrder, parseExploreSourceBlocks } = await load();
    const fenced = cAnswer
      .replace('```ts\nexport const alpha = "C clipped alpha";\n```', [
        '````ts',
        'const example = `',
        '#### not-a-file.ts — fake',
        '### Not shown above — fake',
        '```',
        '`;',
        'export const alpha = "C clipped alpha";',
        '````',
      ].join('\n'))
    const result = deriveFixedCVisibleEvidenceOrder({
      cCandidates: [alpha, beta, gamma], sCandidates: [beta, alpha, gamma], cAnswer: fenced,
    });
    expect(result.proof).toMatchObject({
      diagnostic: true, cFileOrder: ['alpha.ts', 'beta.ts', 'gamma.ts'],
      sFileOrder: ['beta.ts', 'alpha.ts', 'gamma.ts'], contentDifferences: [],
    });
    expect(parseExploreSourceBlocks(result.answer).blocks.get('alpha.ts')).toContain('#### not-a-file.ts — fake');
    expect(result.answer.endsWith('### Not shown above — explore these names for their source\n\n- delta.ts: helper\n\n> Some file sections were trimmed for size.\n')).toBe(true);
    expect(() => parseExploreSourceBlocks(cAnswer.replace(
      '> The code below is the **verbatim, current on-disk source** of these files — re-read from disk on this call and line-numbered, byte-for-byte identical to what the Read tool returns. It is NOT a summary, outline, or stale cache. Treat each block as a Read you have already performed: do not Read a file shown here.',
      '> An unrecognised preamble could silently change non-file evidence.',
    ))).toThrow(/Source Code preamble/);
  });

  it('preserves renderer-owned quote and separator tails as immutable non-source content', async () => {
    const { deriveFixedCVisibleEvidenceOrder } = await load();
    const quotedTail = cAnswer.slice(0, cAnswer.indexOf('### Not shown above')) + [
      '> Some file sections were trimmed for size.',
      '',
      '---',
      '> **Complete source for 3 files is included above — do NOT re-read them.**',
      '> **Explore budget: 4 calls for this project.**',
    ].join('\n');
    const result = deriveFixedCVisibleEvidenceOrder({
      cCandidates: [alpha, beta, gamma], sCandidates: [beta, alpha, gamma], cAnswer: quotedTail,
    });
    expect(result.answer).toContain('#### beta.ts — handler');
    expect(result.answer.indexOf('#### beta.ts')).toBeLessThan(result.answer.indexOf('#### alpha.ts'));
    expect(result.answer.endsWith(quotedTail.slice(quotedTail.indexOf('> Some file sections')))).toBe(true);
    expect(result.proof).toMatchObject({ diagnostic: true, nonSourceSuffixIdentical: true, contentDifferences: [] });
  });

  it('classifies a hard-ceiling tail without fabricating a same-payload comparison', async () => {
    const { compareFinalExploreAnswers, deriveFixedCVisibleEvidenceOrder } = await load();
    const truncated = cAnswer.slice(0, cAnswer.indexOf('#### gamma.ts — helper'))
      + '> … elided[output#csrf] — `zcodegraph_explore("csrf")` for full body';
    expect(() => deriveFixedCVisibleEvidenceOrder({
      cCandidates: [alpha, beta], sCandidates: [beta, alpha], cAnswer: truncated,
    })).toThrow(/hard-ceiling truncation is a preparation failure/);
    expect(compareFinalExploreAnswers(cAnswer, truncated)).toMatchObject({
      cHardCeiling: false, sHardCeiling: true,
      cFileOrder: ['alpha.ts', 'beta.ts', 'gamma.ts'],
      sFileOrder: ['alpha.ts', 'beta.ts'],
    });
  });

  it('diagnoses every complete file before a renderer hard-ceiling tail', async () => {
    const { compareFinalExploreAnswers, deriveFixedCVisibleEvidenceOrder, parseExploreSourceBlocks } = await load();
    const truncated = [
      cAnswer.slice(0, cAnswer.indexOf('### Not shown above')),
      '```py',
      'class Incomplete:',
      '> … elided[output#csrf] — `zcodegraph_explore("csrf")` for full body',
      '> **Do not Read the files above.**',
    ].join('');
    const parsed = parseExploreSourceBlocks(truncated);
    expect([...parsed.blocks.keys()]).toEqual(['alpha.ts', 'beta.ts', 'gamma.ts']);
    expect(parsed.suffix).toContain('class Incomplete:');
    expect(parsed.suffix).toContain('elided[output#');
    expect(compareFinalExploreAnswers(truncated, truncated)).toMatchObject({
      cHardCeiling: true, cFileOrder: ['alpha.ts', 'beta.ts', 'gamma.ts'],
      wholeTextEqual: true,
    });
    expect(() => deriveFixedCVisibleEvidenceOrder({
      cCandidates: [alpha, beta, gamma], sCandidates: [beta, alpha, gamma], cAnswer: truncated,
    })).toThrow('hard-ceiling truncation is a preparation failure');
  });

  it('diagnoses truncation before the first file without treating its fragment as evidence', async () => {
    const { compareFinalExploreAnswers, deriveFixedCVisibleEvidenceOrder, parseExploreSourceBlocks } = await load();
    const truncated = cAnswer.slice(0, cAnswer.indexOf('#### alpha.ts — run'))
      + '```py\nclass TruncatedBeforeFirstFile:\n'
      + '> … elided[output#csrf] — `zcodegraph_explore("csrf")` for full body';
    const parsed = parseExploreSourceBlocks(truncated);
    expect(parsed.hardCeiling).toBe(true);
    expect([...parsed.blocks.keys()]).toEqual([]);
    expect(parsed.sourceHeader).toBe(cAnswer.slice(
      cAnswer.indexOf('### Source Code'), cAnswer.indexOf('#### alpha.ts — run'),
    ));
    expect(parsed.suffix).toContain('TruncatedBeforeFirstFile');
    expect(compareFinalExploreAnswers(truncated, truncated)).toMatchObject({
      wholeTextEqual: true, cHardCeiling: true, cFileOrder: [],
    });
    expect(() => deriveFixedCVisibleEvidenceOrder({
      cCandidates: [alpha, beta], sCandidates: [beta, alpha], cAnswer: truncated,
    })).toThrow('hard-ceiling truncation is a preparation failure');
  });

  it('marks fewer than two blocks or an identity projection as non-diagnostic without choosing another seed', async () => {
    const { deriveFixedCVisibleEvidenceOrder } = await load();
    const identity = deriveFixedCVisibleEvidenceOrder({
      cCandidates: [alpha, beta, gamma], sCandidates: [alpha, beta, gamma], cAnswer,
    });
    expect(identity.answer).toBe(cAnswer);
    expect(identity.proof).toMatchObject({
      status: 'not-diagnostic', diagnostic: false,
      reason: 'fixed-seed projection is the identity permutation', wholeTextEqual: true,
    });
    const single = deriveFixedCVisibleEvidenceOrder({
      cCandidates: [alpha], sCandidates: [alpha],
      cAnswer: cAnswer.slice(0, cAnswer.indexOf('#### beta.ts')),
    });
    expect(single.proof).toMatchObject({
      status: 'not-diagnostic', diagnostic: false, reason: 'fewer than two visible source blocks',
    });
  });
});
