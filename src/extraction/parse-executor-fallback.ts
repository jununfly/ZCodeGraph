/**
 * Comment-stripping Fallback Strategy
 *
 * When WASM memory errors crash the worker (or in-process parser),
 * the retry pipeline strips comment-only lines and re-attempts
 * parsing. This is a last-resort recovery — the stripped content
 * loses comment-level information but preserves all code nodes.
 *
 * Independent of ParseExecutor so it can be tested in isolation.
 */

/**
 * Strip lines that consist only of a // comment (with optional
 * leading whitespace). Preserves all other lines including code
 * that has trailing comments.
 *
 * This is deliberately conservative — only lines where the first
 * non-whitespace characters are `//` are stripped. Block comments
 * (`/* ...`) are left intact because stripping them would require
 * multi-line awareness and could remove code between comment
 * delimiters.
 */
export function stripCommentLines(content: string): string {
  return content
    .split('\n')
    .map(line => /^\s*\/\//.test(line) ? '' : line)
    .join('\n');
}

/**
 * Returns true if the error is likely a WASM memory issue that
 * could be recovered by stripping comments.
 */
export function isWasmMemoryError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes('memory access out of bounds') ||
    msg.includes('out of memory') ||
    msg.includes('Worker exited')
  );
}
