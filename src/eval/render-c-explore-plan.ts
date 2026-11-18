import { render as renderExplore } from './legacy-explore-renderer';
import { projectSymbolOnlyRelationships } from './c-explore-plan';
import type CodeGraph from '../index';
import type { EvaluationExplorePlan } from './c-explore-plan';

/** Evaluation-only composition: carry real C symbol hits through the renderer. */
export function render(
  plan: EvaluationExplorePlan,
  cg: CodeGraph,
  flow: EvaluationExplorePlan['spine'],
  blastRadius: string,
): string {
  return renderExplore(projectSymbolOnlyRelationships(plan), cg, flow, blastRadius, plan.symbolHitNodeIds ?? new Set(), plan.symbolHitRanks ?? new Map());
}
