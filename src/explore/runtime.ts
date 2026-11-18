import { readBooleanFlag } from '../config/flags';
import type { ExploreRuntimeOptions } from './types';

/** Legacy process-level reader. New application paths pass runtime data instead. */
export function tightSmallProjectBudgetEnabled(): boolean {
  return readBooleanFlag('ZCG_EXPLORE_TIGHT_SMALL_PROJECT');
}

/** Read all legacy flags once at an Adapter boundary. */
export function readExploreRuntimeOptions(): ExploreRuntimeOptions {
  return {
    adaptiveEnabled: readBooleanFlag('ZCG_ADAPTIVE_EXPLORE'),
    lineNumbersEnabled: readBooleanFlag('ZCG_EXPLORE_LINENUMS'),
    elidedMarkersEnabled: readBooleanFlag('ZCG_EXPLORE_ELIDED_MARKERS'),
    tightSmallProjectBudgetEnabled: tightSmallProjectBudgetEnabled(),
  };
}