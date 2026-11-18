// Evaluation-only projection of C's final visible evidence. No production renderer changes.
import { createHash } from 'node:crypto';

export const FIXED_C_VISIBLE_EVIDENCE_SCHEMA = 'fixed-c-visible-evidence-order-only-v1';
const SOURCE_MARKER = '### Source Code';
const SOURCE_PREAMBLE = '> The code below is the **verbatim, current on-disk source** of these files — re-read from disk on this call and line-numbered, byte-for-byte identical to what the Read tool returns. It is NOT a summary, outline, or stale cache. Treat each block as a Read you have already performed: do not Read a file shown here.';
const EXPECTED_SOURCE_HEADER = `${SOURCE_MARKER}\n\n${SOURCE_PREAMBLE}\n\n`;
const FILE_HEADER = /^#### (.+?) — [^\n]*(?:\n|$)/;
const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex');
const sorted = (values) => [...values].sort();

function candidateFile(candidate) {
  const file = Array.isArray(candidate) ? candidate[0] : candidate;
  if (typeof file !== 'string' || file.length === 0) {
    throw new Error('each candidate must expose a non-empty file path');
  }
  return file;
}

export function parseExploreSourceBlocks(answer) {
  if (typeof answer !== 'string') throw new Error('C final answer must be a string');
  const marker = answer.indexOf(SOURCE_MARKER);
  if (marker < 0) throw new Error('rendered answer has no Source Code section');
  const prefix = answer.slice(0, marker);
  const source = answer.slice(marker);
  const hardCeiling = answer.includes('elided[output#');
  if (!source.startsWith(EXPECTED_SOURCE_HEADER)) {
    throw new Error('Source Code preamble does not match the production renderer contract');
  }
  let fence = null;
  let fenceStart = -1;
  let currentHeader = null;
  let currentBlockStart = -1;
  let completedBlockEnd = -1;
  let sourceEnd = source.length;
  let position = EXPECTED_SOURCE_HEADER.length;
  const headers = [];
  // The renderer owns these top-level fences and headings. Ignore all indented
  // fences/headings in verbatim source; do not interpret source as Markdown.
  for (const line of source.slice(EXPECTED_SOURCE_HEADER.length).split(/(?<=\n)/)) {
    const fenceMatch = line.match(/^(`{3,}|~{3,})[^\n]*(?:\n|$)/);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence.character
          && fenceMatch[1].length >= fence.length && /^(`+|~+)\s*(?:\n|$)/.test(line)) {
        fence = null;
        if (currentHeader && currentBlockStart >= 0) {
          headers.push({ file: currentHeader, index: currentBlockStart });
          completedBlockEnd = position + line.length;
          currentHeader = null;
          currentBlockStart = -1;
        }
      }
    } else if (hardCeiling && line.includes('elided[output#')) {
      sourceEnd = position;
      break;
    } else if (fenceMatch) {
      fence = { character: fenceMatch[1][0], length: fenceMatch[1].length };
      fenceStart = position;
    } else if (line.startsWith('### ')) {
      sourceEnd = position;
      break;
    } else {
      const match = line.match(FILE_HEADER);
      if (match) {
        currentHeader = match[1];
        currentBlockStart = position;
      } else if (/^> … elided\[output#[^\n]*$/.test(line)) {
        if (!hardCeiling) throw new Error('output truncation marker is inconsistent with the hard-ceiling flag');
        sourceEnd = position;
        break;
      } else if (currentBlockStart >= 0 && (/^> /.test(line) || /^---\s*(?:\n|$)/.test(line))) {
        sourceEnd = position;
        break;
      } else if (currentBlockStart >= 0 && line.trim() !== '') {
        throw new Error(`Source Code section must contain only complete file blocks; unexpected top-level content at offset ${position}: ${JSON.stringify(line.slice(0, 160))}`);
      }
    }
    position += line.length;
  }
  if (hardCeiling) {
    const completeBoundary = completedBlockEnd >= 0 ? completedBlockEnd : EXPECTED_SOURCE_HEADER.length;
    if (sourceEnd > completeBoundary) sourceEnd = completeBoundary;
  }
  if (fence && !hardCeiling) throw new Error(`unclosed source fence at offset ${fenceStart}`);
  if (headers.length === 0 && !hardCeiling && sourceEnd === EXPECTED_SOURCE_HEADER.length) {
    throw new Error('Source Code preamble must be followed by a file block or a trailing section');
  }
  const blocks = new Map();
  for (const [index, match] of headers.entries()) {
    const { file, index: start } = match;
    const end = headers[index + 1]?.index ?? sourceEnd;
    if (blocks.has(file)) throw new Error(`duplicate rendered file block: ${file}`);
    const text = source.slice(start, end);
    if (text.includes('elided[output#')) {
      throw new Error(`hard-ceiling truncation intersects rendered file block: ${file}`);
    }
    blocks.set(file, text);
  }
  return {
    prefix,
    sourceHeader: source.slice(0, headers[0]?.index ?? sourceEnd),
    suffix: source.slice(sourceEnd),
    blocks,
    hardCeiling,
  };
}

/** Compare actual final answers, not merely their originating candidate tuples. */
export function compareFinalExploreAnswers(cAnswer, sAnswer) {
  const c = parseExploreSourceBlocks(cAnswer);
  const s = parseExploreSourceBlocks(sAnswer);
  const cFileOrder = [...c.blocks.keys()];
  const sFileOrder = [...s.blocks.keys()];
  return {
    schema: 'markdown-explore-source-blocks-v1',
    nonSourcePrefixIdentical: c.prefix === s.prefix && c.sourceHeader === s.sourceHeader,
    nonSourceSuffixIdentical: c.suffix === s.suffix,
    cFileOrder,
    sFileOrder,
    fileSetsEqual: JSON.stringify(sorted(cFileOrder)) === JSON.stringify(sorted(sFileOrder)),
    onlyInC: sorted(cFileOrder.filter((file) => !s.blocks.has(file))),
    onlyInS: sorted(sFileOrder.filter((file) => !c.blocks.has(file))),
    contentDifferences: sorted(cFileOrder.filter((file) => c.blocks.get(file) !== s.blocks.get(file))),
    cHardCeiling: cAnswer.includes('elided[output#'),
    sHardCeiling: sAnswer.includes('elided[output#'),
    cSha256: sha256(cAnswer),
    sSha256: sha256(sAnswer),
    wholeTextEqual: cAnswer === sAnswer,
  };
}

/**
 * S receives exactly C's visible file evidence in the seeded candidate order.
 * Missing/duplicate/extra candidates and hard-ceiling intersections fail closed.
 */
export function deriveFixedCVisibleEvidenceOrder({ cCandidates, sCandidates, cPayload, cAnswer }) {
  const parsed = parseExploreSourceBlocks(cPayload ?? cAnswer);
  const sourceAnswer = cPayload ?? cAnswer;
  if (parsed.hardCeiling) throw new Error('hard-ceiling truncation is a preparation failure');
  const cFiles = cCandidates.map(candidateFile);
  const sFiles = sCandidates.map(candidateFile);
  const cUnique = new Set(cFiles);
  const sUnique = new Set(sFiles);
  if (cUnique.size !== cFiles.length || sUnique.size !== sFiles.length
      || cFiles.length !== sFiles.length
      || JSON.stringify(sorted(cFiles)) !== JSON.stringify(sorted(sFiles))) {
    throw new Error('C/S candidates must be an equal file multiset without duplicate paths');
  }
  const cOrder = [...parsed.blocks.keys()];
  const sOrder = sFiles.filter((file) => parsed.blocks.has(file));
  const candidateProjectionEqual = JSON.stringify(cOrder)
    === JSON.stringify(cFiles.filter((file) => parsed.blocks.has(file)));
  if (!candidateProjectionEqual || sOrder.length !== cOrder.length) {
    throw new Error('rendered C files must be an exact, unique projection of both candidate orders');
  }
  const diagnostic = cOrder.length >= 2 && JSON.stringify(cOrder) !== JSON.stringify(sOrder);
  const answer = parsed.prefix + parsed.sourceHeader
    + sOrder.map((file) => parsed.blocks.get(file)).join('') + parsed.suffix;
  const comparison = compareFinalExploreAnswers(sourceAnswer, answer);
  return {
    answer,
    proof: {
      schema: FIXED_C_VISIBLE_EVIDENCE_SCHEMA,
      status: diagnostic ? 'pass' : 'not-diagnostic',
      diagnostic,
      reason: diagnostic ? null : cOrder.length < 2
        ? 'fewer than two visible source blocks' : 'fixed-seed projection is the identity permutation',
      ...comparison,
      schema: FIXED_C_VISIBLE_EVIDENCE_SCHEMA,
      sourceBlockSchema: comparison.schema,
      candidateProjectionEqual,
    },
  };
}
