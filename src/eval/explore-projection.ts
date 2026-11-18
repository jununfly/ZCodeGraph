/**
 * Harness-owned historical C symbol-hit projection.
 * Production ExplorePlan, ExploreRenderModel and renderer must not accept it.
 * The frozen C/S candidate remains stopped; this interface grants no execution.
 */
export interface EvaluationExploreProjection {
  symbolHitNodeIds: ReadonlySet<string>;
  symbolHitRanks: ReadonlyMap<string, number>;
}
