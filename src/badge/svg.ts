/**
 * README SVG badge renderer.
 *
 * Produces a single self-contained SVG "card" that summarises the indexed
 * graph: health score (A-F + 0-100), node count, and edge count.
 *
 * Hard rules:
 *  - Pure function of the inputs. No DB, no fs, no LLM, no Date.now() —
 *    the caller injects everything (determinism for tests + CI).
 *  - Self-contained output: no external fonts, no CSS imports, no <image>,
 *    no <script>. One <svg> with inline <rect> and <text>.
 *  - shields.io endpoint schema modelled internally (label / message /
 *    color), so future variants (separate mini-badges) can reuse the
 *    pieces without touching the layout math.
 *
 * Layout (flat-square, fixed size):
 *
 *     0        88        188        288  340
 *     ┌─────────┬──────────┬──────────┬───┐
 *     │ health  │  nodes   │  edges   │   │  height = 28
 *     │ A · 92  │  1,234   │  5,678   │   │
 *     └─────────┴──────────┴──────────┴───┘
 */

import type { HealthGrade } from '../health/rubric';

export interface BadgeInputs {
  /** Health score 0..100. */
  score: number;
  /** Letter grade derived from score. */
  grade: HealthGrade;
  /** Total node count (all kinds). */
  nodes: number;
  /** Total edge count (all kinds). */
  edges: number;
}

/** shields.io-inspired palette for the grade cell. */
const GRADE_COLORS: Record<HealthGrade, string> = {
  A: '#4c1', // brightgreen
  B: '#97ca00', // green
  C: '#dfb317', // yellow
  D: '#fe7d37', // orange
  F: '#e05d44', // red
};

const LABEL_BG = '#555'; // left cell background (shields "labelGrey")
const VALUE_BG = '#2d2d2d'; // numeric cells (neutral dark)
const TEXT_COLOR = '#fff';
const FONT_FAMILY =
  'Verdana,Geneva,DejaVu Sans,sans-serif';

const SVG_WIDTH = 340;
const SVG_HEIGHT = 28;
const CELL_Y_TEXT = 19; // baseline of 11px text in a 28px-high badge

/** Format a non-negative integer with thousands separators (1,234). */
function formatCount(n: number): string {
  return Math.max(0, Math.floor(n)).toLocaleString('en-US');
}

/**
 * XML-escape a string destined for SVG text content or attribute values.
 * The badge only emits ASCII digits/letters/punctuation today, but we
 * escape defensively so future fields (e.g. project name) cannot break
 * the document.
 */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface Cell {
  x: number;
  width: number;
  fill: string;
  text: string;
  /** X coordinate (centre) for the text. */
  textX: number;
}

function cell(x: number, width: number, fill: string, text: string): Cell {
  return { x, width, fill, text, textX: x + width / 2 };
}

/**
 * Compute the three cells (grade / nodes / edges) given the badge inputs.
 * Widths are fixed so the output is byte-for-byte deterministic for a
 * given (grade, nodes, edges) triple.
 */
function layout(inputs: BadgeInputs): Cell[] {
  const gradeText = `${inputs.grade} · ${inputs.score}`;
  const nodesText = formatCount(inputs.nodes);
  const edgesText = formatCount(inputs.edges);

  // Fixed column widths. The grade cell is widest because the letter
  // plus " · " plus a 0-100 number needs room; the numeric cells size
  // to a generous upper bound (999,999 fits comfortably).
  const COL1 = 88;
  const COL2 = 100;
  const COL3 = 100;
  const COL4 = SVG_WIDTH - COL1 - COL2 - COL3; // trailing spacer / label

  return [
    cell(0, COL1, GRADE_COLORS[inputs.grade], gradeText),
    cell(COL1, COL2, VALUE_BG, nodesText),
    cell(COL1 + COL2, COL3, VALUE_BG, edgesText),
    cell(COL1 + COL2 + COL3, COL4, LABEL_BG, 'zcodegraph'),
  ];
}

/**
 * Render the badge SVG. Deterministic: same inputs → same bytes.
 */
export function renderBadgeSvg(inputs: BadgeInputs): string {
  const cells = layout(inputs);

  const rects = cells
    .map(
      (c) =>
        `<rect x="${c.x}" y="0" width="${c.width}" height="${SVG_HEIGHT}" fill="${c.fill}"/>`,
    )
    .join('');

  const texts = cells
    .map(
      (c) =>
        `<text x="${c.textX}" y="${CELL_Y_TEXT}" fill="${TEXT_COLOR}" ` +
        `font-family="${FONT_FAMILY}" font-size="11" text-anchor="middle">${xmlEscape(c.text)}</text>`,
    )
    .join('');

  // Accessibility / semantics: <title> is what screen readers and the
  // browser tooltip surface. Keep it short and ASCII-only.
  const title = `zcodegraph health ${inputs.grade} ${inputs.score}/100, ${inputs.nodes} nodes, ${inputs.edges} edges`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" ` +
    `viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${xmlEscape(title)}">` +
    `<title>${xmlEscape(title)}</title>` +
    rects +
    texts +
    `</svg>`
  );
}
