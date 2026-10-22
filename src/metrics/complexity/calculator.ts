/**
 * Complexity calculator — bridges Node rows to the pure rubric.
 *
 * Responsibilities:
 *  - Acquire body slice via the shared `readBodySlice` helper (same
 *    pattern as `ContextBuilder.extractNodeCode`).
 *  - Apply the language/kind gate (function|method × 5 languages).
 *  - Invoke the pure `computeCyclomatic` rubric.
 *  - Maintain an in-memory LRU keyed by file_path so repeated queries
 *    against the same file do not re-read. Cache is per-process only
 *    (per complexity-rubric-v1 "No persisted cache").
 *
 * Non-responsibilities:
 *  - No DB access. Caller passes the Node row.
 *  - No MCP formatting. Caller renders the result.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Node } from '../../types.js';
import {
  COMPLEXITY_LANGUAGES,
  computeCyclomatic,
  type ComplexityLanguage,
  type ComplexityVerdict,
} from './rubric.js';

// ---------------------------------------------------------------------------
// File-content LRU (per-process, mtime-invalidated)
// ---------------------------------------------------------------------------

interface CacheEntry {
  /** mtime in ms at the time of read; used for invalidation. */
  mtimeMs: number;
  lines: string[];
}

class FileLineCache {
  private readonly capacity: number;
  private readonly map = new Map<string, CacheEntry>();

  constructor(capacity = 32) {
    this.capacity = capacity;
  }

  /**
   * Return the file's lines, or `null` if the file is unreadable.
   * Throws nothing. Cache key is the absolute path.
   */
  get(absPath: string): string[] | null {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(absPath);
    } catch {
      return null;
    }
    const mtimeMs = stat.mtimeMs;

    const cached = this.map.get(absPath);
    if (cached && cached.mtimeMs === mtimeMs) {
      // Refresh LRU position.
      this.map.delete(absPath);
      this.map.set(absPath, cached);
      return cached.lines;
    }

    let content: string;
    try {
      content = fs.readFileSync(absPath, 'utf-8');
    } catch {
      return null;
    }
    const lines = content.split('\n');

    // Evict oldest if at capacity.
    if (this.map.size >= this.capacity) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(absPath, { mtimeMs, lines });
    return lines;
  }
}

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

export interface ComplexityCalculatorOptions {
  /** Absolute project root; node.filePath is resolved against it. */
  projectRoot: string;
  /** LRU capacity (files). Defaults to 32. */
  cacheCapacity?: number;
}

export class ComplexityCalculator {
  private readonly projectRoot: string;
  private readonly cache: FileLineCache;

  constructor(options: ComplexityCalculatorOptions) {
    this.projectRoot = options.projectRoot;
    this.cache = new FileLineCache(options.cacheCapacity ?? 32);
  }

  /**
   * Whether this node is eligible for a complexity value at all
   * (kind × language gate, before exemption rules).
   */
  static isEligible(node: Node): boolean {
    if (node.kind !== 'function' && node.kind !== 'method') return false;
    return COMPLEXITY_LANGUAGES.includes(
      node.language as ComplexityLanguage,
    );
  }

  /**
   * Compute the complexity verdict for a node. Returns `null` iff the
   * node is not eligible (wrong kind or language); otherwise returns
   * the rubric verdict (which may itself have `value === null` for
   * exemptions or unreadable files).
   */
  compute(node: Node): ComplexityVerdict | null {
    if (!ComplexityCalculator.isEligible(node)) return null;

    const body = this.readBodySlice(node);
    return computeCyclomatic(node, body);
  }

  /**
   * Acquire the body slice for a node. Returns `null` on any failure
   * (path outside root, missing file, unreadable file).
   *
   * Mirrors `ContextBuilder.extractNodeCode` — keep this in sync with
   * that implementation.
   */
  private readBodySlice(node: Node): string | null {
    // Inline of validatePathWithinRoot to avoid a dependency on the
    // context module from metrics. This is the same safety rule: the
    // resolved absolute path must stay under projectRoot.
    const resolved = path.resolve(this.projectRoot, node.filePath);
    const normalizedRoot = path.resolve(this.projectRoot);
    if (
      resolved !== normalizedRoot &&
      !resolved.startsWith(normalizedRoot + path.sep)
    ) {
      return null;
    }

    const lines = this.cache.get(resolved);
    if (!lines) return null;

    const startIdx = Math.max(0, node.startLine - 1);
    const endIdx = Math.min(lines.length, node.endLine);
    if (startIdx >= endIdx) return null;
    return lines.slice(startIdx, endIdx).join('\n');
  }
}
