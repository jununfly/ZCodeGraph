import { buildExploreBlastRadius } from './blast-radius';
import { renderExploreBlastRadius } from './blast-radius-renderer';
import { buildExploreRenderModel } from './evidence';
import { plan } from './planner';
import { CodeGraphExploreGraphRead, RootConfinedExploreSourceRead } from './ports';
import { render } from './renderer';
import { isTestFile } from '../search/query-utils';
import type { ExploreApplication, ExploreAnswer, ExploreOptions } from './types';
import type CodeGraph from '../index';

/** Shared CLI/MCP composition; transports own only parsing and envelopes. */
export class DefaultExploreApplication implements ExploreApplication {
  async explore(graph: CodeGraph, query: string, options: ExploreOptions): Promise<ExploreAnswer> {
    const planned = await plan(graph, query, { maxFiles: options.maxFiles, runtime: options.runtime });
    if (planned.subgraph.nodes.size === 0) {
      return { kind: 'empty', text: `No relevant code found for "${query}"` };
    }
    const blastRadius = planned.budget.includeBlastRadius === false
      ? ''
      : renderExploreBlastRadius(buildExploreBlastRadius(graph, planned.subgraph, isTestFile));
    const model = buildExploreRenderModel(
      new CodeGraphExploreGraphRead(graph),
      new RootConfinedExploreSourceRead(planned.projectRoot),
      planned,
      blastRadius,
      options.runtime,
    );
    return { kind: 'answer', markdown: render(model) };
  }
}

export const exploreApplication = new DefaultExploreApplication();
