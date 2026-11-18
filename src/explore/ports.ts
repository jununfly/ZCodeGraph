import { existsSync, readFileSync } from 'node:fs';
import type CodeGraph from '../index';
import type { Edge, Node } from '../types';
import { validatePathWithinRoot } from '../utils';

/** Narrow reads required by the Slice 1 evidence assembler. */
export interface ExploreGraphRead {
  getOutgoingEdges(nodeId: string): Edge[];
  getIncomingEdges(nodeId: string): Edge[];
  getNode(nodeId: string): Node | undefined;
  getStats(): { fileCount: number };
}

/** Source reads are root-confined and never expose filesystem access to a renderer. */
export interface ExploreSourceRead {
  readText(filePath: string): string | undefined;
}

export class CodeGraphExploreGraphRead implements ExploreGraphRead {
  constructor(private readonly graph: CodeGraph) {}

  getOutgoingEdges(nodeId: string): Edge[] {
    return this.graph.getOutgoingEdges(nodeId);
  }

  getIncomingEdges(nodeId: string): Edge[] {
    return this.graph.getIncomingEdges(nodeId);
  }

  getNode(nodeId: string): Node | undefined {
    return this.graph.getNode(nodeId) ?? undefined;
  }

  getStats(): { fileCount: number } {
    return this.graph.getStats();
  }
}

export class RootConfinedExploreSourceRead implements ExploreSourceRead {
  constructor(private readonly projectRoot: string) {}

  readText(filePath: string): string | undefined {
    const absolute = validatePathWithinRoot(this.projectRoot, filePath);
    if (!absolute || !existsSync(absolute)) return undefined;
    try {
      return readFileSync(absolute, 'utf8');
    } catch {
      return undefined;
    }
  }
}

/** Test counterpart: no database or filesystem is involved. */
export class InMemoryExploreSourceRead implements ExploreSourceRead {
  constructor(private readonly files: ReadonlyMap<string, string>) {}

  readText(filePath: string): string | undefined {
    return this.files.get(filePath);
  }
}
