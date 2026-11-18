/**
 * Compatibility re-export. The shared Explore types now live in
 * `src/explore/types.ts` per DES-cli-p1-modularity-and-explore-v1.
 *
 * This file exists only so existing imports from `src/mcp/*` keep working
 * during Slice 1; it adds no policy and no evaluation-only signals.
 */
export type {
  ExploreOutputBudget,
  FlowSpine,
  EvidenceValue,
  ExplorePlanEntry,
  ExplorePlan,
  FileGroup,
  ExploreOptions,
  ExploreAnswer,
  ExploreRenderModel,
  ExploreRuntimeOptions,
  ExploreApplication,
} from '../explore/types';
