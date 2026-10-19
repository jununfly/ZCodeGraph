/**
 * Grammar loading behavior.
 *
 * web-tree-sitter's WASM Language.load() is not safe to run concurrently on
 * Node 19+/20+ when grammars include external scanners. This locks in the
 * public behavior that CodeGraph loads requested grammars one at a time.
 */

import { describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  activeLoads: 0,
  overlapped: false,
  loadOrder: [] as string[],
}));

vi.mock('web-tree-sitter', () => {
  class Parser {
    static init = vi.fn(async () => undefined);
    setLanguage = vi.fn();
    delete = vi.fn();
  }

  class Language {
    static load = vi.fn(async (wasmPath: string) => {
      mockState.activeLoads += 1;
      if (mockState.activeLoads > 1) mockState.overlapped = true;
      mockState.loadOrder.push(wasmPath);
      await new Promise((resolve) => setTimeout(resolve, 0));
      mockState.activeLoads -= 1;
      return { wasmPath };
    });
  }

  return { Parser, Language };
});

describe('grammar loading', () => {
  it('loads requested WASM grammars sequentially', async () => {
    const { loadGrammarsForLanguages } = await import('../src/extraction/grammars');

    await loadGrammarsForLanguages(['typescript', 'tsx', 'python']);

    expect(mockState.loadOrder).toHaveLength(3);
    expect(mockState.overlapped).toBe(false);
  });
});
