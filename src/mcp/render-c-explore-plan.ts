import { render as renderExplore } from './explore-renderer';
import { projectSymbolOnlyRelationships } from './c-explore-plan';
import type CodeGraph from '../index';
import type { ExplorePlan } from './explore-types';

/** Evaluation-only composition: carry real C symbol hits through the renderer. */
export function render(
  plan: ExplorePlan,
  cg: CodeGraph,
  flow: ExplorePlan['spine'],
  blastRadius: string,
): string {
  return renderExplore(projectSymbolOnlyRelationships(plan), cg, flow, blastRadius, plan.symbolHitNodeIds, plan.symbolHitRanks);
}
