// Non-mandatory prompt calibration for a future explicitly selected run.
// Availability in this registry does not assert tool adoption, Human task review,
// a DES result, or authorization to invoke a model. The original v1 is unchanged.

import { PROMPT as ORIGINAL_PROMPT, COMMIT } from './flask-original.mjs';
import { SHARED_PREFIX } from './zra-pilot-v1.mjs';

export const PROMPT_ID = 'flask-ipv6-structure-trace-v2-candidate';
export { COMMIT };
export const CORPUS = `pallets/flask@${COMMIT}`;
export const PROMPT = `${SHARED_PREFIX} ${ORIGINAL_PROMPT}`;
