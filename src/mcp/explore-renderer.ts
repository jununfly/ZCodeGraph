/**
 * Explore Renderer — Issue #14
 *
 * Takes ExplorePlan + CodeGraph + flow + blastRadius and produces
 * the final markdown output for zcodegraph_explore.
 *
 * Extracted from tools.ts handleExplore() — behavior identical to current.
 */

import { existsSync, readFileSync } from 'fs';
import type { Node } from '../types';
import type { ExplorePlan } from './explore-types';
import type CodeGraph from '../index';
import { validatePathWithinRoot } from '../utils';

function getExploreBudget(fileCount: number): number {
  if (fileCount < 500) return 1;
  if (fileCount < 5000) return 2;
  if (fileCount < 15000) return 3;
  if (fileCount < 25000) return 4;
  return 5;
}

function exploreLineNumbersEnabled(): boolean {
  return process.env['CODEGRAPH_EXPLORE_LINENUMS'] !== '0' && process.env['CODEGRAPH_EXPLORE_LINENUMS'] !== 'false';
}

function numberSourceLines(text: string, startLine: number): string {
  return text.split('\n').map((l, i) => `${startLine + i}\t${l}`).join('\n');
}

function registrationSnippetFromLocation(projectRoot: string, registeredAt: string | undefined): string | undefined {
  if (!registeredAt) return undefined;
  const match = registeredAt.match(/^(.*):(\d+)$/);
  if (!match) return undefined;
  const [, filePath, rawLine] = match;
  const lineNo = Number(rawLine);
  if (!filePath || !Number.isFinite(lineNo) || lineNo < 1) return undefined;
  const absPath = validatePathWithinRoot(projectRoot, filePath);
  if (!absPath || !existsSync(absPath)) return undefined;
  try {
    const line = readFileSync(absPath, 'utf-8').split('\n')[lineNo - 1];
    const snippet = line?.trim().replace(/\s+/g, ' ');
    if (!snippet) return undefined;
    return snippet.length > 160 ? `${snippet.slice(0, 157)}...` : snippet;
  } catch {
    return undefined;
  }
}

export function render(
  plan: ExplorePlan,
  cg: CodeGraph,
  flow: { text: string; pathNodeIds: Set<string>; namedNodeIds: Set<string>; uniqueNamedNodeIds: Set<string> },
  blastRadius: string,
): string {
  const { budget, subgraph, entryNodeIds, fileGroups, sortedFiles, adaptiveEnabled,
    glueNodeIds, connectedToEntry, centralFiles, projectRoot } = plan;
  const maxFiles = plan.maxFiles;
  const lines: string[] = [];

  // Header
  lines.push('## Exploration: ' + plan.query);
  lines.push('');
  lines.push('Found ' + subgraph.nodes.size + ' symbols across ' + fileGroups.size + ' files.');
  lines.push('');

  // Blast radius (pre-computed by caller)
  if (blastRadius) lines.push(blastRadius);

  const routeEdges = subgraph.edges.filter((edge) => {
    if (edge.kind === 'contains') return false;
    const sourceNode = subgraph.nodes.get(edge.source);
    const targetNode = subgraph.nodes.get(edge.target);
    return sourceNode?.kind === 'route' || targetNode?.kind === 'route';
  });
  if (routeEdges.length > 0) {
    lines.push('### Route matches');
    lines.push('');
    for (const edge of routeEdges.slice(0, budget.maxEdgesPerRelationshipKind)) {
      const sourceNode = subgraph.nodes.get(edge.source);
      const targetNode = subgraph.nodes.get(edge.target);
      if (!sourceNode || !targetNode) continue;
      lines.push(`- ${sourceNode.name} → ${targetNode.name} (${edge.kind})`);
    }
    if (routeEdges.length > budget.maxEdgesPerRelationshipKind) {
      lines.push(`- ... and ${routeEdges.length - budget.maxEdgesPerRelationshipKind} more`);
    }
    lines.push('');
  }

  // Relationship map
  const significantEdges = subgraph.edges.filter(e =>
    e.kind !== 'contains',
  );

  if (budget.includeRelationships && significantEdges.length > 0) {
    lines.push('### Relationships');
    lines.push('');

    const byKind = new Map<string, Array<{ source: string; target: string }>>();
    for (const edge of significantEdges) {
      const sourceNode = subgraph.nodes.get(edge.source);
      const targetNode = subgraph.nodes.get(edge.target);
      if (!sourceNode || !targetNode) continue;

      const group = byKind.get(edge.kind) || [];
      group.push({ source: sourceNode.name, target: targetNode.name });
      byKind.set(edge.kind, group);
    }

    for (const [kind, edges] of byKind) {
      const cap = budget.maxEdgesPerRelationshipKind;
      const shown = edges.slice(0, cap);
      lines.push('**' + kind + ':**');
      for (const e of shown) {
        lines.push('- ' + e.source + ' → ' + e.target);
      }
      if (edges.length > cap) {
        lines.push('- ... and ' + (edges.length - cap) + ' more');
      }
      lines.push('');
    }
  }

  const dynamicEvidence: string[] = [];
  const dynamicSeen = new Set<string>();
  if (cg) {
    for (const nodeId of subgraph.nodes.keys()) {
      if (dynamicEvidence.length >= 6) break;
      for (const edge of [...cg.getOutgoingEdges(nodeId), ...cg.getIncomingEdges(nodeId)]) {
        if (dynamicEvidence.length >= 6) break;
        if (edge.kind !== 'calls' || edge.edgeOrigin !== 'heuristic') continue;
        const meta = edge.metadata as Record<string, unknown> | undefined;
        if (meta?.synthesizedBy !== 'callback') continue;
        const source = subgraph.nodes.get(edge.source) ?? cg.getNode(edge.source);
        const target = subgraph.nodes.get(edge.target) ?? cg.getNode(edge.target);
        if (!source || !target) continue;
        const key = `${edge.source}>${edge.target}`;
        if (dynamicSeen.has(key)) continue;
        dynamicSeen.add(key);
        const registeredAt = typeof meta.registeredAt === 'string' ? meta.registeredAt : undefined;
        const registrationSnippet = typeof meta.registrationSnippet === 'string'
          ? meta.registrationSnippet
          : registrationSnippetFromLocation(projectRoot, registeredAt);
        const via = typeof meta.via === 'string' ? ` via \`${meta.via}\`` : '';
        const at = registeredAt ? ` @${registeredAt}` : '';
        const snippet = registrationSnippet ? ` — \`${registrationSnippet}\`` : '';
        dynamicEvidence.push(`- ${source.name} → ${target.name}   [callback${via}${at}${snippet}]`);
      }
    }
  }
  if (dynamicEvidence.length > 0) {
    lines.push('### Dynamic-dispatch evidence');
    lines.push('');
    lines.push('Synthesized callback edges include the registration line so you do not need to read the wiring file just to confirm the callback target.');
    lines.push('');
    lines.push(...dynamicEvidence);
    lines.push('');
  }

  // ================================================================
  // File rendering section (extracted from tools.ts handleExplore)
  // ================================================================

  
  // Step 4: Read contiguous file sections
  // (flow spine already computed above; reused for adaptive sizing below.)
  
  // Polymorphic-sibling detector for adaptive sizing. A class that implements/
  // extends a supertype shared by >= MIN_SIBLINGS classes is one of many
  // INTERCHANGEABLE implementations (OkHttp's 14 `: Interceptor` classes —
  // showing one + the rest as signatures is enough), as opposed to a DISTINCT
  // pipeline step (Excalidraw's `renderStaticScene`, which shares no supertype and
  // must stay full or the agent loses real content). Only off-spine sibling files
  // skeletonize; distinct steps and on-spine files keep full source. Cache
  // supertype→(has ≥N implementers) so this stays a handful of edge queries.
  const MIN_SIBLINGS = 3;
  const siblingSuper = new Map<string, boolean>();
  const isPolymorphicSibling = (nodes: Node[]): boolean => {
    for (const n of nodes) {
      for (const e of cg.getOutgoingEdges(n.id)) {
        if (e.kind !== 'implements' && e.kind !== 'extends') continue;
        let many = siblingSuper.get(e.target);
        if (many === undefined) {
          many = cg.getIncomingEdges(e.target)
            .filter((x) => x.kind === 'implements' || x.kind === 'extends').length >= MIN_SIBLINGS;
          siblingSuper.set(e.target, many);
        }
        if (many) return true;
      }
    }
    return false;
  };
  
  // A file that DEFINES a polymorphic supertype (a class/interface with ≥
  // MIN_SIBLINGS implementers) AND co-locates its subclasses is a redundant
  // "family" file — Django's compiler.py holds `SQLCompiler` + its 4 subclasses
  // (SQLInsert/Update/Delete/AggregateCompiler) in 2,266 lines. Such files are
  // huge and read-anyway, so they should STILL skeletonize even when the agent
  // named a method in them: a full one eats ~6.5K of the explore budget (Django
  // is pinned at the 28K cap, truncating), starving the sibling files the agent
  // then Reads. This flag OVERRIDES the named-callable spare below — it does NOT
  // by itself spare a file. (OkHttp's RealCall implements the `Lockable` mixin
  // but defines no ≥3-impl supertype, so the named spare keeps it full.)
  const superMany = new Map<string, boolean>();
  const definesPolymorphicSupertype = (nodes: Node[]): boolean => {
    for (const n of nodes) {
      if (n.kind !== 'class' && n.kind !== 'interface' && n.kind !== 'struct'
          && n.kind !== 'trait' && n.kind !== 'protocol' && n.kind !== 'type_alias') continue;
      let many = superMany.get(n.id);
      if (many === undefined) {
        many = cg.getIncomingEdges(n.id)
          .filter((x) => x.kind === 'implements' || x.kind === 'extends').length >= MIN_SIBLINGS;
        superMany.set(n.id, many);
      }
      if (many) return true;
    }
    return false;
  };
  
  lines.push('### Source Code');
  lines.push('');
  lines.push('> The code below is the **verbatim, current on-disk source** of these files — re-read from disk on this call and line-numbered, byte-for-byte identical to what the Read tool returns. It is NOT a summary, outline, or stale cache. Treat each block as a Read you have already performed: do not Read a file shown here.');
  lines.push('');
  
  let totalChars = lines.join('\n').length;
  let filesIncluded = 0;
  let anyFileTrimmed = false;
  
  for (const [filePath, group] of sortedFiles) {
    if (filesIncluded >= maxFiles) break;
    // A file DEFINES a named/spine symbol (the answer) vs merely references the
    // flow. Past 90% budget, stop pulling INCIDENTAL files — but keep scanning
    // for necessary ones, which render even past the cap (bounded by maxFiles).
    // Without this `continue` (was an unconditional `break`), the loop stopped
    // after the build + validators-exec files and never reached the ranked-in
    // validate-logic file (Alamofire's Validation.swift).
    const fileNecessary = group.nodes.some(n =>
      entryNodeIds.has(n.id) || flow.pathNodeIds.has(n.id) || flow.uniqueNamedNodeIds.has(n.id));
    if (!fileNecessary && totalChars > budget.maxOutputChars * 0.9) continue;
  
    const absPath = validatePathWithinRoot(projectRoot, filePath);
    if (!absPath || !existsSync(absPath)) continue;
  
    let fileContent: string;
    try {
      fileContent = readFileSync(absPath, 'utf-8');
    } catch {
      continue;
    }
  
    const fileLines = fileContent.split('\n');
    const lang = group.nodes[0]?.language || '';
  
    // Adaptive sizing (CODEGRAPH_ADAPTIVE_EXPLORE, default on): collapse a file
    // to a per-symbol view when it's a redundant member of a polymorphic family.
    // Engages iff ALL hold:
    //   1. a flow spine exists,
    //   2. no symbol in the file is on that spine (it's not the mechanism path),
    //   3. it IS a polymorphic sibling (≥ MIN_SIBLINGS impls of a shared supertype),
    //   4. it is NOT SPARED, where a file is spared iff the agent named a
    //      (near-)UNIQUE callable in it (`getResponseWithInterceptorChain`, 1 def →
    //      keep RealCall.kt full) UNLESS the file DEFINES the family supertype (a
    //      base+subclasses "family" file like Django's compiler.py — collapse it).
    //      Uniqueness matters: `as_sql` has 110 defs across every Compiler/Expression
    //      subclass; naming it must NOT keep every backend variant + test file full
    //      and flood the budget. That's why the spare reads uniqueNamedNodeIds.
    // Within a collapsed file the render is PER-SYMBOL (condition B): a method the
    // agent NAMED or that's on the spine is shown with its FULL body (so the agent
    // doesn't Read the file back for it — Django's SQLCompiler.execute_sql/as_sql);
    // every other symbol is just its signature. So the base mechanism survives while
    // the file's other ~80 symbols + the redundant subclasses collapse to one line each.
    const spareNamed = group.nodes.some(n => flow.uniqueNamedNodeIds.has(n.id));
    const fileDefinesSuper = definesPolymorphicSupertype(group.nodes);
    const spared = spareNamed && !fileDefinesSuper;
    const CALLABLE_BODY = new Set(['method', 'function', 'constructor', 'component']);
    const hasSpineNode = group.nodes.some(n => flow.pathNodeIds.has(n.id));
    // On-spine god-file: the flow path runs THROUGH this file, but it also holds
    // many OTHER named methods, and rendering all of them in full blows the
    // per-file budget and starves the other flow files (Alamofire: the agent
    // names ~7 Session.swift methods — the build spine PLUS off-path
    // task/didCompleteTask — far past the whole response budget). Engage the
    // per-symbol view to keep the SPINE full and collapse the off-path named
    // methods to signatures. Only when there IS off-path content to shed —
    // otherwise the spine is irreducible (a sequential flow has no redundancy),
    // so leave it to the normal full render.
    const namedBodyChars = group.nodes
      .filter(n => CALLABLE_BODY.has(n.kind) && (flow.pathNodeIds.has(n.id) || flow.uniqueNamedNodeIds.has(n.id)))
      .reduce((s, n) => s + fileLines.slice(n.startLine - 1, n.endLine).join('\n').length, 0);
    const onSpineGodFile = hasSpineNode
      && namedBodyChars > budget.maxCharsPerFile
      && group.nodes.some(n => CALLABLE_BODY.has(n.kind) && flow.uniqueNamedNodeIds.has(n.id) && !flow.pathNodeIds.has(n.id));
    if (adaptiveEnabled && flow.pathNodeIds.size > 0
        && (onSpineGodFile || (!hasSpineNode && isPolymorphicSibling(group.nodes) && !spared))) {
      const syms = group.nodes
        .filter(n => n.kind !== 'import' && n.kind !== 'export' && n.startLine > 0)
        .sort((a, b) => a.startLine - b.startLine);
      // Pass 1: choose which symbols get a FULL body, by priority, greedily within
      // a per-file body cap — so one huge family file can't body every named method
      // and crowd out the other flow files (Django's query.py). A symbol earns a
      // body if it's on-spine, or UNIQUELY named (`SQLCompiler.execute_sql`), or a
      // co-named method WHEN this file DEFINES the family supertype (so the base
      // `SQLCompiler.as_sql` body shows, but the 110 leaf `as_sql` overrides — and
      // OkHttp's 5 `intercept`s if the agent names `intercept` — stay signatures).
      const prio = (n: Node) => !CALLABLE_BODY.has(n.kind) ? 99
        : flow.pathNodeIds.has(n.id) ? 0
        : flow.uniqueNamedNodeIds.has(n.id) ? 1
        : (fileDefinesSuper && flow.namedNodeIds.has(n.id)) ? 2 : 99;
      // One ~250-line WINDOW per file. syms are taken by priority (spine first,
      // then uniquely-named, then family-base), and the cap applies to ALL of
      // them — including the spine — so a big-spine god-file (tokio's worker.rs:
      // run→run_task→next_task→steal_work) can't eat the whole response and
      // starve the co-flow file (harness.rs's poll). The native agent windows
      // such a file too (~190 lines at a time), so this mimics, not truncates.
      // Always emit ≥1 (never an empty section).
      const bodyCap = budget.maxCharsPerFile * 1.5;
      const bodyIds = new Set<string>();
      let bodyChars = 0;
      for (const n of syms.filter(n => prio(n) < 99 && n.endLine >= n.startLine).sort((a, b) => prio(a) - prio(b))) {
        const sz = fileLines.slice(n.startLine - 1, n.endLine).join('\n').length;
        if (bodyChars + sz > bodyCap && bodyIds.size > 0) continue;
        bodyIds.add(n.id);
        bodyChars += sz;
      }
      // Pass 2: render in line order — full body for chosen symbols, else the
      // signature line (capped, with a "+N more" tail so the structure map of a
      // god-file doesn't itself bloat the budget).
      const skel: string[] = [];
      let coveredUntil = 0; // skip symbols already inside an emitted body
      let sigCount = 0, sigDropped = 0;
      const SIG_MAX = Math.max(12, budget.maxSymbolsInFileHeader * 2);
      for (const n of syms) {
        if (n.startLine <= coveredUntil) continue;
        if (bodyIds.has(n.id)) {
          const end = n.endLine;
          const body = fileLines.slice(n.startLine - 1, end).join('\n');
          skel.push(exploreLineNumbersEnabled() ? numberSourceLines(body, n.startLine) : body);
          coveredUntil = end;
        } else {
          // Elide the body, emit the signature. node.startLine can point at a
          // decorator/annotation, so scan forward for the line that names the symbol.
          let lineNo = n.startLine;
          for (let k = 0; k < 4; k++) {
            if ((fileLines[n.startLine - 1 + k] || '').includes(n.name)) { lineNo = n.startLine + k; break; }
          }
          if (lineNo <= coveredUntil) continue;
          if (sigCount >= SIG_MAX) { sigDropped++; continue; }
          const sig = (fileLines[lineNo - 1] || '').trim();
          if (sig) { skel.push(exploreLineNumbersEnabled() ? `${lineNo}\t${sig}` : sig); sigCount++; }
        }
      }
      if (sigDropped > 0) skel.push(`… +${sigDropped} more (signatures elided)`);
      if (skel.length > 0) {
        const names = [...new Set(group.nodes.filter(n => n.kind !== 'import' && n.kind !== 'export').map(n => n.name))]
          .slice(0, budget.maxSymbolsInFileHeader).join(', ');
        // Steer the agent to zcodegraph_explore for an elided body — NEVER to
        // Read. The old "Read for more" / "Read for a full body" tags invited
        // a Read of the very file just skeletonized; on a central, wanted file
        // (Session.swift, DataRequest.swift) that fired an over-investigation
        // spiral (the agent Read the skeletonized file, then kept digging).
        // CLAUDE.md: Explore Answer text must never tell the agent to Read.
        const tag = bodyIds.size > 0
          ? 'focused (the methods you named in full, the rest as signatures — zcodegraph_explore a signature by name for its body; do NOT Read)'
          : 'skeleton (signatures only — zcodegraph_explore a name for its full body; do NOT Read)';
        lines.push(`#### ${filePath} — ${names} · ${tag}`, '', '```' + lang, skel.join('\n'), '```', '');
        totalChars += skel.join('\n').length + 120;
        filesIncluded++;
        continue;
      }
    }
  
    // Whole-file rule: if a relevant file is small enough to afford, return it
    // ENTIRELY instead of clustering. Clustering exists to tame god-files
    // (App.tsx ~13k lines); on a ~134-line component a cluster is a lossy
    // subset of a file the agent will just Read in full anyway — costing a
    // round-trip and a re-read every later turn. Reserve clustering for files
    // too big to ship whole. Still bounded by the total maxOutputChars check.
    //
    // CENTRAL files (where the query's Entry Nodes live) get a larger — but
    // bounded — ceiling: they're the heart of the answer, the file(s) the agent
    // would Read whole, so a genuinely small one comes back whole rather than as
    // thin clusters. A LARGE central file (the 791-line org-user store) exceeds
    // the ceiling and falls through to sectioning/clustering below — full method
    // bodies + signatures — so we never dump (or overflow on) a whole god-file.
    const isCentralFile = centralFiles.has(filePath);
    // Central files get a slightly larger whole-file window than peripheral ones,
    // but a TIGHT one (~1.5× the per-file cap): the native read of a central file
    // is a ~150–250 line orientation window, NOT the whole file. A flat "whole
    // central file" both overflowed the inline cap AND starved the co-flow files
    // (worker.rs ate the budget, dropping harness.rs's poll). A larger central
    // file falls through to per-method windowing/clustering below.
    const WHOLE_FILE_MAX_LINES = isCentralFile ? 280 : 220;
    const WHOLE_FILE_MAX_CHARS = isCentralFile
      ? Math.min(Math.max(0, budget.maxOutputChars - totalChars - 200), Math.round(budget.maxCharsPerFile * 1.5))
      : budget.maxCharsPerFile * 3;
    if (fileLines.length <= WHOLE_FILE_MAX_LINES && fileContent.length <= WHOLE_FILE_MAX_CHARS) {
      const body = fileContent.replace(/\n+$/, '');
      let wholeSection = exploreLineNumbersEnabled() ? numberSourceLines(body, 1) : body;
      const uniqSymbols = [...new Set(
        group.nodes
          .filter(n => n.kind !== 'import' && n.kind !== 'export')
          .map(n => `${n.name}(${n.kind})`)
      )];
      const headerNames = uniqSymbols.slice(0, budget.maxSymbolsInFileHeader);
      const omitted = uniqSymbols.length - headerNames.length;
      const wholeHeader = `#### ${filePath} — ${omitted > 0 ? `${headerNames.join(', ')}, +${omitted} more` : headerNames.join(', ')}`;
  
      if (!fileNecessary && totalChars + wholeSection.length + 200 > budget.maxOutputChars) {
        // Don't slice a whole file mid-method: an incidental file that doesn't
        // fit is skipped; a necessary one (below) renders in full. Half a file
        // forces the Read this is meant to prevent.
        anyFileTrimmed = true;
        continue;
      }
      lines.push(wholeHeader, '', '```' + lang, wholeSection, '```', '');
      totalChars += wholeSection.length + 200;
      filesIncluded++;
      continue;
    }
  
    // Cluster nearby symbols to avoid reading huge gaps between distant symbols.
    // Sort by start line, then merge overlapping/adjacent ranges (within the
    // adaptive gap threshold). Include both node ranges AND edge source
    // locations so template sections with component usages/calls are
    // covered (not just script block symbols).
    //
    // Each range carries an `importance` score so we can rank clusters
    // when the per-file budget forces us to drop some: entry-point nodes
    // are worth 10, directly-connected nodes 3, peripheral nodes 1, and
    // bare edge-source lines 2 (less than a connected node but more than
    // a peripheral one — they hint at a reference but aren't a definition).
    // Container kinds whose body can span most/all of a file. When such a
    // node covers most of the file we drop it from the ranges: keeping it
    // would merge every method inside it into one giant cluster spanning
    // the whole file, which then tail-trims down to just the container's
    // opening lines (its header/declarations) and buries the methods the
    // query actually asked about (#185 follow-up — Session.swift in
    // Alamofire is the canonical case: the `Session` class spans ~1,400
    // lines). We want the granular symbols inside, not the envelope.
    const ENVELOPE_KINDS = new Set(['file', 'module', 'class', 'struct', 'interface', 'enum', 'namespace', 'protocol', 'trait', 'component']);
    // Cluster from this file's collected nodes PLUS any callable the agent NAMED that
    // lives here. Explore's relevance collect can miss a named method def in a huge
    // non-sibling file — Django's query.py is 3,040 lines and `_fetch_all` (L2237)
    // was collected only as call-reference edges, never as a def, so it formed no
    // cluster and the agent Read it back. Inject named defs directly and rank them
    // ABOVE connected/glue nodes (importance 9) so their cluster wins the per-file
    // budget — the agent explicitly asked for these symbols.
    const rangeNodes = new Map<string, Node>();
    for (const n of group.nodes) if (n.startLine > 0 && n.endLine > 0) rangeNodes.set(n.id, n);
    for (const id of flow.namedNodeIds) {
      if (rangeNodes.has(id)) continue;
      const n = cg.getNode(id);
      if (n && n.filePath === filePath && n.startLine > 0 && n.endLine > 0) rangeNodes.set(id, n);
    }
    const ranges: Array<{ start: number; end: number; name: string; kind: string; importance: number }> = [...rangeNodes.values()]
      // Drop whole-file envelope nodes (containers covering >50% of the file).
      .filter(n => !(ENVELOPE_KINDS.has(n.kind) && (n.endLine - n.startLine + 1) > fileLines.length * 0.5))
      .map(n => {
        let importance = 1;
        if (entryNodeIds.has(n.id)) importance = 10;
        else if (flow.namedNodeIds.has(n.id)) importance = 9; // agent named it → keep its cluster
        else if (glueNodeIds.has(n.id)) importance = 6; // bridging caller/callee of an entry
        else if (connectedToEntry.has(n.id)) importance = 3;
        return { start: n.startLine, end: n.endLine, name: n.name, kind: n.kind, importance };
      });
  
    // Add edge source locations in this file — captures template references
    // (component usages, event handlers) that aren't nodes themselves.
    // Query edges directly from the DB (not just the subgraph) because BFS
    // traversal may have pruned template reference targets due to node budget.
    const edgeLines = new Set<string>(); // dedup by "line:name"
    for (const node of group.nodes) {
      const outgoing = cg.getOutgoingEdges(node.id);
      for (const edge of outgoing) {
        if (!edge.line || edge.line <= 0 || edge.kind === 'contains') continue;
        const key = `${edge.line}:${edge.target}`;
        if (edgeLines.has(key)) continue;
        edgeLines.add(key);
        // Look up target name from subgraph first, fall back to edge kind
        const targetNode = subgraph.nodes.get(edge.target);
        const targetName = targetNode?.name ?? edge.kind;
        ranges.push({ start: edge.line, end: edge.line, name: targetName, kind: edge.kind, importance: 2 });
      }
    }
  
    ranges.sort((a, b) => a.start - b.start);
  
    if (ranges.length === 0) continue;
  
    const gapThreshold = budget.gapThreshold;
    const clusters: Array<{ start: number; end: number; symbols: string[]; score: number; maxImportance: number }> = [];
    let current = {
      start: ranges[0]!.start,
      end: ranges[0]!.end,
      symbols: [`${ranges[0]!.name}(${ranges[0]!.kind})`],
      score: ranges[0]!.importance,
      maxImportance: ranges[0]!.importance,
    };
  
    for (let i = 1; i < ranges.length; i++) {
      const r = ranges[i]!;
      if (r.start <= current.end + gapThreshold) {
        current.end = Math.max(current.end, r.end);
        current.symbols.push(`${r.name}(${r.kind})`);
        current.score += r.importance;
        current.maxImportance = Math.max(current.maxImportance, r.importance);
      } else {
        clusters.push(current);
        current = {
          start: r.start,
          end: r.end,
          symbols: [`${r.name}(${r.kind})`],
          score: r.importance,
          maxImportance: r.importance,
        };
      }
    }
    clusters.push(current);
  
    // Build file section output from clusters, capped by per-file budget.
    // The pathological case (#185): a file like Session.swift where every
    // method is adjacent collapses into one cluster spanning the whole
    // file, and dumping that into the agent's context is most of the
    // token cost on small projects. We pick clusters in priority order
    // until the per-file char cap is hit. Truly enormous single clusters
    // get tail-trimmed with a marker.
    const contextPadding = 3;
    const withLineNumbers = exploreLineNumbersEnabled();
    const buildSection = (c: { start: number; end: number }): string => {
      const startIdx = Math.max(0, c.start - 1 - contextPadding);
      const endIdx = Math.min(fileLines.length, c.end + contextPadding);
      const slice = fileLines.slice(startIdx, endIdx).join('\n');
      // startIdx is 0-based, so the slice's first line is line startIdx + 1.
      return withLineNumbers ? numberSourceLines(slice, startIdx + 1) : slice;
    };
    // Language-neutral separator (no `//` — not a comment in Python, Ruby,
    // etc.). With line numbers on, the line-number jump also signals the gap.
    const GAP_MARKER = '\n\n... (gap) ...\n\n';
  
    // Rank clusters for inclusion under the per-file cap. Entry-point
    // clusters come first: a cluster containing a query Entry Node
    // (importance 10) must outrank a dense block of mere declarations,
    // otherwise on a large file like Session.swift the top-of-file class
    // header + property list (many adjacent low-importance nodes, high
    // density) wins the budget and buries the actual methods the query
    // asked about (perform/didCreateURLRequest/task live deep in the
    // file). Within the same importance tier, prefer density (score per
    // line) so we still favor focused clusters over sprawling ones, then
    // smaller span as a cheap-to-include tiebreak.
    const rankedClusters = clusters
      .map((c, i) => ({ idx: i, span: c.end - c.start + 1, c }))
      .sort((a, b) => {
        if (b.c.maxImportance !== a.c.maxImportance) return b.c.maxImportance - a.c.maxImportance;
        const densityA = a.c.score / a.span;
        const densityB = b.c.score / b.span;
        if (densityB !== densityA) return densityB - densityA;
        if (b.c.score !== a.c.score) return b.c.score - a.c.score;
        return a.span - b.span;
      });
  
    // Per-file budget is the SMALLER of the per-file cap and what's left of the
    // total output cap — so selection (which ranks by importance) keeps the
    // high-importance clusters and drops peripheral ones, instead of the
    // downstream source-order trim slicing off whatever comes last in the file.
    // That source-order slice is what cut Django's `_fetch_all` (L2237, importance
    // 9 — agent-named) when query.py was the last of four big files to be emitted.
    const fileBudget = Math.min(budget.maxCharsPerFile, Math.max(0, budget.maxOutputChars - totalChars - 200));
    const chosenIndices = new Set<number>();
    let projectedChars = 0;
    for (const rc of rankedClusters) {
      const sectionLen = buildSection(rc.c).length + (chosenIndices.size > 0 ? GAP_MARKER.length : 0);
      // Always take the top-ranked cluster, even if oversize, so we don't
      // return an empty file section (agent would then re-Read the file,
      // negating the savings).
      if (chosenIndices.size === 0) {
        chosenIndices.add(rc.idx);
        projectedChars += sectionLen;
        continue;
      }
      if (projectedChars + sectionLen > fileBudget) continue;
      chosenIndices.add(rc.idx);
      projectedChars += sectionLen;
    }
  
    // Emit chosen clusters in source order so the file reads top-to-bottom.
    let fileSection = '';
    const allSymbols: string[] = [];
    for (let i = 0; i < clusters.length; i++) {
      if (!chosenIndices.has(i)) continue;
      const cluster = clusters[i]!;
      const section = buildSection(cluster);
      if (fileSection.length > 0) fileSection += GAP_MARKER;
      fileSection += section;
      allSymbols.push(...cluster.symbols);
    }
  
    // A chosen cluster is a COMPLETE method-range — we never cut through a body.
    // An oversize single cluster (a long monolithic function) renders in FULL:
    // half a method is useless (the agent just Reads the rest for the other half),
    // which is the very fallback explore exists to prevent. A pathological file is
    // bounded by the per-file cluster SELECTION above + the total hard ceiling.
    if (chosenIndices.size < clusters.length) {
      anyFileTrimmed = true;
    }
  
    // Dedupe + cap the symbols list shown in the per-file header. Some
    // files (Session.swift in Alamofire) produced 3.4KB symbol lists
    // from cluster scoring + edge-source lines, dwarfing the per-file
    // body cap. Show top names by frequency, with a "+N more" tail.
    const symbolCounts = new Map<string, number>();
    for (const s of allSymbols) {
      symbolCounts.set(s, (symbolCounts.get(s) ?? 0) + 1);
    }
    const sortedSymbols = [...symbolCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    const headerCap = budget.maxSymbolsInFileHeader;
    const headerSymbols = sortedSymbols.slice(0, headerCap);
    const omittedCount = sortedSymbols.length - headerSymbols.length;
    const headerSuffix = omittedCount > 0
      ? `${headerSymbols.join(', ')}, +${omittedCount} more`
      : headerSymbols.join(', ');
    const fileHeader = `#### ${filePath} — ${headerSuffix}`;
  
    // The total cap bounds INCIDENTAL files only. A file that DEFINES a symbol
    // the agent named (or that's on the flow spine) renders even when the
    // nominal total is used up — it's the answer, and the set is bounded by
    // maxFiles AND by true-spine/named-seeding having already trimmed each file
    // to its necessary content. A file that merely REFERENCES the flow
    // (Combine.swift name-drops request/task) is incidental → still capped, so
    // freed budget never leaks into noise. This is the last god-file layer:
    // build (Session, true-spined) + validators-exec (Request) + validate
    // (DataRequest/Validation) all render, instead of the cap dropping whichever
    // phase the file order happened to put last.
    if (!fileNecessary && totalChars + fileSection.length + 200 > budget.maxOutputChars) {
      // Incidental file that doesn't fit: SKIP it whole — never slice mid-method.
      // Keep scanning for necessary files (which bypass this cap and render in
      // full, bounded by the hard ceiling).
      anyFileTrimmed = true;
      continue;
    }
  
    lines.push(fileHeader);
    lines.push('');
    lines.push('```' + lang);
    lines.push(fileSection);
    lines.push('```');
    lines.push('');
  
    totalChars += fileSection.length + 200;
    filesIncluded++;
  }
  
  // Add remaining files as references (from both relevant and peripheral files).
  // Small projects (per budget) skip this — the relevant story already fits
  // in the source section, and a trailing pointer list is pure overhead.
  if (budget.includeAdditionalFiles) {
    const remainingRelevant = sortedFiles.slice(filesIncluded);
    const peripheralFiles = [...fileGroups.entries()]
      .filter(([, group]) => group.score < 3)
      .sort((a, b) => b[1].score - a[1].score);
    const remainingFiles = [...remainingRelevant, ...peripheralFiles];
    if (remainingFiles.length > 0) {
      lines.push('### Not shown above — explore these names for their source');
      lines.push('');
      for (const [filePath, group] of remainingFiles.slice(0, 10)) {
        const symbols = group.nodes.map(n => `${n.name}:${n.startLine}`).join(', ');
        lines.push(`- ${filePath}: ${symbols}`);
      }
      if (remainingFiles.length > 10) {
        lines.push(`- ... and ${remainingFiles.length - 10} more files`);
      }
    }
  }
  
  // Add completeness signal so agents know they don't need to re-read these files.
  // On small projects the budget gates this off — but if we actually had to
  // trim or drop clusters, surface a brief note so the agent knows it can
  // still Read for more detail.
  if (budget.includeCompletenessSignal) {
    lines.push('');
    lines.push('---');
    lines.push(`> **Complete source for ${filesIncluded} files is included above — do NOT re-read them.** If your question also needs files/symbols listed under "Not shown above" (or any area this call didn't cover), make ANOTHER zcodegraph_explore targeting those names — it returns the same source with line numbers and is cheaper and more complete than reading. Reserve Read for a single specific line range explore can't surface.`);
  } else if (anyFileTrimmed) {
    lines.push('');
    lines.push(`> Some file sections were trimmed for size. For a specific symbol you still need, run another \`zcodegraph_explore\` (or \`zcodegraph_node\`) with its exact name — line-numbered source, cheaper and more complete than Read.`);
  }
  
  // Add explore budget note based on project size
  if (budget.includeBudgetNote) {
    try {
      const stats = cg.getStats();
      const callBudget = getExploreBudget(stats.fileCount);
      lines.push('');
      lines.push(`> **Explore budget: ${callBudget} calls for this project (${stats.fileCount.toLocaleString()} files indexed).** Each call covers ~6 files; if your question spans more, spend your remaining calls on the uncovered area BEFORE falling back to Read — another explore is cheaper and more complete than reading those files. Synthesize once you've used ${callBudget}.`);
    } catch {
      // Stats unavailable — skip budget note
    }
  }

  // Final assembly
  let output = flow.text + lines.join('\n');
  const hardCeiling = Math.min(Math.round(budget.maxOutputChars * 1.5), 25000);
  if (output.length > hardCeiling) {
    const cut = output.slice(0, hardCeiling);
    const lastSection = cut.lastIndexOf('\n#### ');
    const boundary = lastSection > hardCeiling * 0.5 ? lastSection : cut.lastIndexOf('\n');
    const safe = boundary > 0 ? cut.slice(0, boundary) : cut;
    return safe + '\n\n... (output truncated to budget; the source above is complete and verbatim — treat it as already Read. For any area not covered, run another zcodegraph_explore with the specific names — do NOT Read these files.)';
  }
  return output;
}
