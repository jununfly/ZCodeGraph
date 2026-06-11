/**
 * Access Model Interfaces
 *
 * Extracted from QueryBuilder to separate callers by intent:
 *   - AgentAccessModel       → agent-serving queries (ContextBuilder, MCP tools)
 *   - MaintenanceAccessModel → index/maintenance writes (ExtractionOrchestrator)
 *   - ResolutionAccessModel  → resolution-phase reads (ReferenceResolver)
 *   - StatusAccessModel      → CLI/status queries (getStats, getMetadata)
 *
 * Candidate 7: Query/storage access model Seam.
 *
 * QueryBuilder implements all four interfaces for backward compatibility.
 * New code should depend on the narrowest interface it needs.
 */

import type {
  Node,
  Edge,
  FileRecord,
  UnresolvedReference,
  NodeKind,
  EdgeKind,
  GraphStats,
  SearchOptions,
  SearchResult,
} from '../types';

// ============================================================
// AgentAccessModel — agent-serving queries
// ============================================================

/**
 * Access model for agent-serving code understanding queries.
 *
 * Callers: ContextBuilder, GraphTraverser, GraphQueryManager,
 * MCP explore-planner, MCP explore-renderer.
 */
export interface AgentAccessModel {
  // Node lookups
  getNodeById(id: string): Node | null;
  getNodesByIds(ids: readonly string[]): Map<string, Node>;
  getNodesByFile(filePath: string): Node[];
  getNodesByKind(kind: NodeKind): Node[];
  iterateNodesByKind(kind: NodeKind): IterableIterator<Node>;
  getNodesByName(name: string): Node[];
  getNodesByQualifiedNameExact(qname: string): Node[];
  getNodesByLowerName(lowerName: string): Node[];

  // Search
  searchNodes(query: string, options?: SearchOptions): SearchResult[];
  findNodesByExactName(names: string[], options?: SearchOptions): SearchResult[];
  findNodesByNameSubstring(substring: string, options?: SearchOptions): SearchResult[];

  // Edge traversal
  getOutgoingEdges(sourceId: string, kinds?: EdgeKind[], edgeOrigin?: string): Edge[];
  getIncomingEdges(targetId: string, kinds?: EdgeKind[]): Edge[];
  findEdgesBetweenNodes(nodeIds: string[], kinds?: EdgeKind[]): Edge[];

  // File-level queries
  getDependentFilePaths(filePath: string): string[];
  getDependencyFilePaths(filePath: string): string[];

  // Analytics
  getDominantFile(): { filePath: string; edgeCount: number; nextEdgeCount: number } | null;
  getTopRouteFile(): { filePath: string; routeCount: number; totalRoutes: number } | null;
  getRoutingManifest(limit?: number): {
    entries: Array<{ url: string; handler: string; handlerFile: string; handlerLine: number; handlerKind: string }>;
    topHandlerFile: string | null;
    topHandlerFileCount: number;
    totalRoutes: number;
  } | null;
}

// ============================================================
// MaintenanceAccessModel — index/maintenance writes
// ============================================================

/**
 * Access model for index building and maintenance operations.
 *
 * Callers: ExtractionOrchestrator, index-stages (storeExtractionResult),
 * ReferenceResolver (write path).
 */
export interface MaintenanceAccessModel {
  // Node writes
  insertNode(node: Node): void;
  insertNodes(nodes: Node[]): void;
  updateNode(node: Node): void;
  deleteNode(id: string): void;
  deleteNodesByFile(filePath: string): void;

  // Edge writes
  insertEdge(edge: Edge): void;
  insertEdges(edges: Edge[]): void;
  deleteEdgesBySource(sourceId: string): void;

  // File writes
  upsertFile(file: FileRecord): void;
  deleteFile(filePath: string): void;

  // Unresolved reference writes
  insertUnresolvedRef(ref: UnresolvedReference): void;
  insertUnresolvedRefsBatch(refs: UnresolvedReference[]): void;
  deleteUnresolvedByNode(nodeId: string): void;
  clearUnresolvedReferences(): void;
  deleteResolvedReferences(fromNodeIds: string[]): void;
  deleteSpecificResolvedReferences(refs: UnresolvedReference[]): void;

  // Metadata
  setMetadata(key: string, value: string): void;

  // Maintenance
  clear(): void;
}

// ============================================================
// ResolutionAccessModel — resolution-phase reads
// ============================================================

/**
 * Access model for the reference resolution phase.
 *
 * Callers: ReferenceResolver, callback-synthesizer.ts.
 *
 * Note: these callers ALSO need write access (they insert synthesized
 * edges), so they typically receive both ResolutionAccessModel and
 * MaintenanceAccessModel.
 */
export interface ResolutionAccessModel {
  // Unresolved references
  getUnresolvedReferences(): UnresolvedReference[];
  getUnresolvedReferencesCount(): number;
  getUnresolvedReferencesBatch(offset: number, limit: number): UnresolvedReference[];
  getUnresolvedReferencesByFiles(filePaths: string[]): UnresolvedReference[];
  getUnresolvedByName(name: string): UnresolvedReference[];

  // Lightweight listings (used by resolution for candidate matching)
  getAllFilePaths(): string[];
  getAllNodeNames(): string[];

  // Node lookups (subset of AgentAccessModel)
  getNodeById(id: string): Node | null;
  getNodesByFile(filePath: string): Node[];
  getNodesByName(name: string): Node[];
  getNodesByQualifiedNameExact(qname: string): Node[];
  getNodesByKind(kind: NodeKind): Node[];
  getNodesByLowerName(lowerName: string): Node[];
}

// ============================================================
// StatusAccessModel — CLI/status queries
// ============================================================

/**
 * Access model for CLI commands and MCP status tools.
 *
 * Callers: CodeGraph.getStats(), CLI status command, MCP handleStatus.
 */
export interface StatusAccessModel {
  getStats(): GraphStats;
  getNodeAndEdgeCount(): { nodes: number; edges: number };
  getLastIndexedAt(): number | null;
  getMetadata(key: string): string | null;
  getAllMetadata(): Record<string, string>;
}
