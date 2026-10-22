/**
 * Complexity rubric v1 — frozen decision-point sets and exemption rules
 * (see docs/contracts/complexity-rubric-v1.md).
 *
 * Per-function cyclomatic complexity (McCabe: 1 + |decision points|)
 * computed over a body slice at query time. Zero schema change, zero
 * persistence — pure functions over a body string and a Node row.
 *
 * Hard rules:
 *  - Pure functions over plain inputs. No DB, no fs, no LLM. The caller
 *    (calculator.ts) is responsible for acquiring the body slice.
 *  - Deterministic. Same body + same language → same verdict, byte-for-byte.
 *  - Single source of truth. The MCP layer, tests, and the coverage
 *    probe must call into this module; do NOT re-implement the rules
 *    elsewhere.
 */

import type { Node } from '../../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ComplexityLanguage =
  | 'csharp'
  | 'java'
  | 'php'
  | 'python'
  | 'rust';

export const COMPLEXITY_LANGUAGES: readonly ComplexityLanguage[] = [
  'csharp',
  'java',
  'php',
  'python',
  'rust',
];

export type ComplexityExemptionReason =
  | 'abstract-no-body'
  | 'extern-or-ffi'
  | 'generated-product';

export interface ComplexityVerdict {
  /** 1 + |decision points|; null iff exempt. */
  value: number | null;
  /** Set iff value === null. */
  exemption: ComplexityExemptionReason | null;
  /** Raw decision-point count before the +1. */
  decisionPoints: number;
}

// ---------------------------------------------------------------------------
// Decision-point sets (docs/contracts/complexity-rubric-v1.md — keep in sync)
// ---------------------------------------------------------------------------

/**
 * Token-level decision points. Each entry contributes +1.
 *
 * Keywords are word-boundary matched. Operators (`&&`, `||`, `??`, `?`)
 * are matched verbatim. Entries are case-sensitive unless noted.
 */
export const DECISION_KEYWORDS: Readonly<
  Record<ComplexityLanguage, readonly string[]>
> = {
  csharp: [
    'if',
    'for',
    'foreach',
    'while',
    'do',
    'case',
    'catch',
  ],
  java: ['if', 'for', 'while', 'do', 'case', 'catch', 'instanceof'],
  php: ['if', 'elseif', 'for', 'foreach', 'while', 'do', 'case', 'catch'],
  python: ['if', 'elif', 'for', 'while', 'except', 'with', 'assert', 'and', 'or'],
  rust: ['if', 'for', 'while', 'loop', 'if', 'while'],
};

/**
 * Operator tokens (verbatim match, no word boundary). Each contributes +1.
 *
 * Note on Rust `match`: per rubric, the `match` keyword itself contributes 0;
 * each top-level `=>` arm contributes +1. Handled separately in the
 * tokenizer, not listed here.
 */
export const DECISION_OPERATORS: Readonly<
  Record<ComplexityLanguage, readonly string[]>
> = {
  csharp: ['&&', '||', '??', '??='],
  java: ['&&', '||'],
  php: ['&&', '||', '??', '??='],
  python: [], // boolean ops are keywords (and/or)
  rust: ['&&', '||', '?'],
};

/**
 * Ternary `?` handling:
 *  - C#, Java, PHP: `?` is the ternary marker; `??` and `??=` are handled
 *    as separate operators above and must not double-count. `?.` (null-
 *    conditional member access) contributes 0 (it is a call-site short-
 *    circuit, not a branch — v1 follows Sonar/Lizard here).
 *  - Rust: `?` is the try operator; every `?` token contributes +1.
 *    There is no ternary in Rust, and `??` is not a Rust token.
 */
const TERNARY_LANGUAGES: ReadonlySet<ComplexityLanguage> = new Set([
  'csharp',
  'java',
  'php',
]);

const RUST_TRY_LANGUAGES: ReadonlySet<ComplexityLanguage> = new Set(['rust']);

// ---------------------------------------------------------------------------
// Tokenizer (string/comment aware)
// ---------------------------------------------------------------------------

interface Token {
  /** 'word' for identifier-like runs; 'op' for punctuation runs. */
  kind: 'word' | 'op';
  text: string;
  /** Absolute index in the source body. */
  index: number;
  /** Bracket nesting depth at this token (`([{` count minus `)]}` count). */
  depth: number;
}

/**
 * Language-specific comment/string syntax. Every supported language has
 * `//` line comments and `/* ... *\/` block comments except Python, which
 * uses `#`. String delimiters: `"` and `'` for all five; Python adds
 * triple-quoted strings. Rust raw strings (`r"..."`, `r#"..."#`) are
 * handled by the `"` rule with a conservative fallback (the `r` is
 * tokenized as a word, then the `"` opens a string — this is acceptable
 * for v1 because raw-string contents are rare in decision-point
 * positions and the rubric is a counter, not a parser).
 */
function tokenize(body: string, language: ComplexityLanguage): Token[] {
  const tokens: Token[] = [];
  const lineComment = language === 'python' ? '#' : '//';
  const hasBlockComment = language !== 'python';

  let i = 0;
  let depth = 0;
  const n = body.length;

  const isWordChar = (c: string) => /[A-Za-z0-9_]/.test(c);

  while (i < n) {
    const c = body[i] as string;

    // Skip whitespace
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }

    // Line comment
    if (body.startsWith(lineComment, i)) {
      // `//` or `#` — but Python `#` is also a comment, so this works
      const eol = body.indexOf('\n', i);
      i = eol === -1 ? n : eol + 1;
      continue;
    }

    // Block comment
    if (hasBlockComment && body.startsWith('/*', i)) {
      const end = body.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }

    // Python triple-quoted strings
    if (
      language === 'python' &&
      (body.startsWith('"""', i) || body.startsWith("'''", i))
    ) {
      const delim = body.slice(i, i + 3);
      const end = body.indexOf(delim, i + 3);
      i = end === -1 ? n : end + 3;
      continue;
    }

    // String literals (single, double). No escape tracking for v1 —
    // `\"` inside a string is rare in decision-point positions and the
    // rubric follows Lizard's "good enough" posture.
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < n) {
        if (body[j] === '\\') {
          j += 2;
          continue;
        }
        if (body[j] === quote) {
          j++;
          break;
        }
        if (body[j] === '\n') {
          // Unterminated string on the line — treat rest of line as
          // string (conservative; matches Python/C#/Java behavior for
          // malformed code).
          break;
        }
        j++;
      }
      i = j;
      continue;
    }

    // Character literal (C-family only — Python has no char type, `'a'`
    // is already handled by the string rule above). Same rule; no
    // special case needed.

    // Word token
    if (isWordChar(c)) {
      let j = i + 1;
      while (j < n) {
        const bj = body[j];
        if (bj === undefined || !isWordChar(bj)) break;
        j++;
      }
      tokens.push({
        kind: 'word',
        text: body.slice(i, j),
        index: i,
        depth,
      });
      i = j;
      continue;
    }

    // Bracket tracking (for Python comprehension `if` and Rust match
    // arm top-level detection).
    if (c === '(' || c === '[' || c === '{') {
      depth++;
      i++;
      continue;
    }
    if (c === ')' || c === ']' || c === '}') {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }

    // Operator token — maximal run of punctuation.
    let j = i + 1;
    while (j < n) {
      const bj = body[j];
      if (bj === undefined) break;
      if (isWordChar(bj)) break;
      if (
        bj === ' ' || bj === '\t' || bj === '\n' || bj === '\r' ||
        bj === '"' || bj === "'" ||
        bj === '(' || bj === ')' || bj === '[' || bj === ']' ||
        bj === '{' || bj === '}'
      ) {
        break;
      }
      if (body.startsWith(lineComment, j)) break;
      if (hasBlockComment && body.startsWith('/*', j)) break;
      j++;
    }
    const opText = body.slice(i, j);
    tokens.push({ kind: 'op', text: opText, index: i, depth });
    i = j;
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Decision-point counting
// ---------------------------------------------------------------------------

function countDecisionPoints(
  tokens: Token[],
  language: ComplexityLanguage,
): number {
  const keywords = new Set(DECISION_KEYWORDS[language]);
  const operators = DECISION_OPERATORS[language];

  let count = 0;

  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];
    if (!tok) continue;

    if (tok.kind === 'word') {
      if (!keywords.has(tok.text)) continue;

      // Python `and` / `or` are keywords — always count.
      if (language === 'python' && (tok.text === 'and' || tok.text === 'or')) {
        count++;
        continue;
      }

      // Python comprehension `if`: count. Our tokenizer does not
      // distinguish comprehension `if` from statement `if`, and both
      // are decision points — so just count every `if`/`elif`.
      // (No special case needed; comprehension `for` is also a decision
      // point in McCabe's sense and is counted the same way.)
      count++;
      continue;
    }

    // Operator tokens
    if (tok.kind === 'op') {
      // Rust match arms: `=>` at the top level of a `match` block.
      // Heuristic for v1: every `=>` token contributes +1. This counts
      // closure parameters in some languages (C# `x => x + 1`) — see
      // below.
      if (tok.text === '=>') {
        if (language === 'rust') {
          // Rust: `=>` is only used for match arms. Always +1.
          count++;
        }
        // C#: `x => x+1` is a lambda, and per rubric its decision points
        // are counted via its body's tokens, not the `=>`. Do NOT count
        // `=>` in C#.
        continue;
      }

      // Ternary `?` in C#/Java/PHP.
      if (TERNARY_LANGUAGES.has(language)) {
        if (tok.text === '?') {
          count++;
          continue;
        }
        // `??` and `??=` are listed in DECISION_OPERATORS; handled below.
        // `?.` contributes 0 (call-site short-circuit).
        if (tok.text === '?.') {
          continue;
        }
      }

      // Rust `?` (try operator). `??` is not a Rust token. The tokenizer
      // maximal-munches punctuation, so `opt?;` becomes the single op
      // token `?;` — accept `?`-prefixed tokens as the try operator.
      if (
        RUST_TRY_LANGUAGES.has(language) &&
        (tok.text === '?' || tok.text.startsWith('?'))
      ) {
        count++;
        continue;
      }

      // Generic operator match (verbatim). We iterate longest-first so
      // `??=` wins over `??` if both were ever present in the same
      // token (tokenizer maximal-munch already ensures this, but we
      // keep the check for safety).
      if (operators.includes(tok.text)) {
        count++;
        continue;
      }

      // Multi-char operators containing a decision operator as a
      // substring (e.g. `||=` in some languages). v1: only exact match
      // counts. If a tokenizer produces `||=` as a single token in C#,
      // it will NOT match `||` — this is a known v1 simplification
      // documented in the rubric.
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Exemption rules (E1 / E2 / E3)
// ---------------------------------------------------------------------------

/**
 * E1 — abstract / interface method (no body). Returns the exemption
 * reason iff matched, else null.
 *
 * Pure: consumes only the Node row. The calculator layer is responsible
 * for `contains`-edge lookups when needed; v1 relies on the signals
 * already on the row (`is_abstract`, `signature`, `decorators`).
 */
function checkE1Abstract(node: Node): ComplexityExemptionReason | null {
  // Direct flag from extractor.
  if (node.isAbstract) return 'abstract-no-body';

  // Python `@abstractmethod` decorator.
  if (node.language === 'python' && node.decorators) {
    if (
      node.decorators.some(
        (d) => typeof d === 'string' && d.includes('abstractmethod'),
      )
    ) {
      return 'abstract-no-body';
    }
  }

  // Rust trait method without default body: the rubric rule keyed on
  // `signature` is unreliable because extractors normalize signatures
  // (strip the `fn` keyword and trailing `;`). The robust signal is the
  // body slice itself: a trait method declaration is a single line
  // ending in `;` with no `{`. We cannot check this here without
  // bodySlice, so the check is done at the computeCyclomatic level
  // (which receives bodySlice). See below.

  // Java interface method (no `default`/`static` modifier and no body
  // in signature). Java extractor sets `signature` to the method
  // declaration line; if it ends with `);` and the node is a `method`,
  // this is a declaration-only interface method. This is a heuristic —
  // v1 accepts the false-positive rate on `abstract` methods in
  // abstract classes (they are also no-body, so the exemption is still
  // correct).
  if (
    node.language === 'java' &&
    node.kind === 'method' &&
    node.signature &&
    node.signature.trim().endsWith(');')
  ) {
    return 'abstract-no-body';
  }

  return null;
}

/**
 * E2 — extern / FFI declaration.
 */
function checkE2Extern(
  node: Node,
  bodySlice: string | null,
): ComplexityExemptionReason | null {
  if (node.language === 'rust' && node.signature) {
    const sig = node.signature.trim();
    if (sig.startsWith('extern ')) return 'extern-or-ffi';
  }

  if (node.language === 'csharp' && node.signature) {
    if (/\bextern\b/.test(node.signature)) return 'extern-or-ffi';
  }

  if (node.language === 'java' && node.signature) {
    if (/\bnative\b/.test(node.signature)) return 'extern-or-ffi';
  }

  // Python stub: body slice is empty or contains only a docstring /
  // `pass` / `...`. This is a body-level probe (existence-only,
  // substring) and is the only body-content exemption in v1. If the
  // node carries `@abstractmethod`, E1 owns the verdict — do not
  // preempt it here (interface-style stubs are "abstract-no-body",
  // not "extern-or-ffi").
  if (
    node.language === 'python' &&
    bodySlice !== null &&
    !(
      node.decorators &&
      node.decorators.some(
        (d) => typeof d === 'string' && d.includes('abstractmethod'),
      )
    )
  ) {
    const stripped = bodySlice
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      // Drop the `def ...:` line itself.
      .filter((l) => !l.startsWith('def '));
    if (stripped.length === 0) return 'extern-or-ffi';
    const firstReal = stripped.find(
      (l) =>
        !l.startsWith('"""') &&
        !l.startsWith("'''") &&
        !l.endsWith('"""') &&
        !l.endsWith("'''"),
    );
    if (
      firstReal === undefined ||
      firstReal === 'pass' ||
      firstReal === '...'
    ) {
      return 'extern-or-ffi';
    }
  }

  return null;
}

/**
 * E3 — macro / derive / source-generator product.
 */
function checkE3Generated(node: Node): ComplexityExemptionReason | null {
  if (node.language === 'rust' && node.decorators) {
    const hits = ['derive', 'async_trait', 'automock', 'pyfunction', 'wasm_bindgen'];
    for (const d of node.decorators) {
      if (typeof d !== 'string') continue;
      for (const h of hits) {
        if (d.includes(h)) return 'generated-product';
      }
    }
  }

  if (node.language === 'csharp') {
    const fp = node.filePath;
    if (
      fp.endsWith('.g.cs') ||
      fp.endsWith('.Designer.cs') ||
      fp.includes('SourceGenerated')
    ) {
      return 'generated-product';
    }
  }

  if (node.language === 'java' && node.decorators) {
    if (
      node.decorators.some(
        (d) => typeof d === 'string' && d.includes('Generated'),
      )
    ) {
      return 'generated-product';
    }
  }

  if (node.language === 'php' && node.filePath.includes('vendor/')) {
    return 'generated-product';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute cyclomatic complexity for a function/method node.
 *
 * @param node       Node row (kind/language/isAbstract/signature/decorators).
 * @param bodySlice  Body text acquired by the caller (lines.slice(
 *                   startLine-1, endLine).join('\n')). Pass `null` iff the
 *                   file is unreadable; the function will return a
 *                   `null`-value verdict with no exemption (the miss is
 *                   reported upstream).
 * @returns          ComplexityVerdict. `value === null` iff exempt OR
 *                   bodySlice is null.
 */
export function computeCyclomatic(
  node: Node,
  bodySlice: string | null,
): ComplexityVerdict {
  // Kind gate — only function/method.
  if (node.kind !== 'function' && node.kind !== 'method') {
    return { value: null, exemption: null, decisionPoints: 0 };
  }

  // Language gate.
  if (
    !COMPLEXITY_LANGUAGES.includes(node.language as ComplexityLanguage)
  ) {
    return { value: null, exemption: null, decisionPoints: 0 };
  }

  const lang = node.language as ComplexityLanguage;

  // Exemption evaluation order: E2 (extern/FFI) → E1 (abstract) → E3
  // (generated). Extern declarations often end in `;` (Rust `extern
  // "C" fn f();`) or `);` (Java `native void m();`) — if E1 ran first,
  // it would mis-classify them as "abstract-no-body". Extern is the
  // more specific signal, so it wins.
  const e2 = checkE2Extern(node, bodySlice);
  if (e2) return { value: null, exemption: e2, decisionPoints: 0 };

  const e1 = checkE1Abstract(node);
  if (e1) return { value: null, exemption: e1, decisionPoints: 0 };

  // E1 continued — Rust trait declaration heuristic. The extractor
  // strips the `fn` keyword and trailing `;` from `signature`, so the
  // "signature ends with ;" check on the column is unreliable. A trait
  // method declaration's body slice is a single line ending in `;`
  // with no opening `{`. This must run BEFORE E3 (generated) so that
  // trait methods with a `#[derive]`-style attribute do not get
  // mis-bucketed as generated products.
  if (
    node.language === 'rust' &&
    bodySlice !== null &&
    !bodySlice.includes('{') &&
    bodySlice.trim().endsWith(';')
  ) {
    return { value: null, exemption: 'abstract-no-body', decisionPoints: 0 };
  }

  const e3 = checkE3Generated(node);
  if (e3) return { value: null, exemption: e3, decisionPoints: 0 };

  if (bodySlice === null) {
    return { value: null, exemption: null, decisionPoints: 0 };
  }

  const tokens = tokenize(bodySlice, lang);
  const decisionPoints = countDecisionPoints(tokens, lang);
  return { value: 1 + decisionPoints, exemption: null, decisionPoints };
}
