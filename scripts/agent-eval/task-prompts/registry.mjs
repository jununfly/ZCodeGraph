// Task prompt registry: maps prompt IDs to prompt modules.
// Each prompt module exports PROMPT_ID, COMMIT, CORPUS, PROMPT.

import * as flaskOriginal from './flask-original.mjs';
import * as flaskGuided from './flask-guided.mjs';
import * as flaskWeakGuided from './flask-weak-guided.mjs';
import * as djangoGuided from './django-guided.mjs';
import * as expressGuided from './express-guided.mjs';
import { pilotTasks } from './zra-pilot-v1.mjs';

const prompts = new Map([
  [flaskOriginal.PROMPT_ID, flaskOriginal],
  [flaskGuided.PROMPT_ID, flaskGuided],
  [flaskWeakGuided.PROMPT_ID, flaskWeakGuided],
  [djangoGuided.PROMPT_ID, djangoGuided],
  [expressGuided.PROMPT_ID, expressGuided],
  ...pilotTasks.map((task) => [task.PROMPT_ID, task]),
]);

export function getPrompt(promptId) {
  const found = prompts.get(promptId);
  if (!found) throw new Error(`unknown prompt ID: ${promptId}`);
  return found;
}

export function listPromptIds() {
  return [...prompts.keys()];
}

export { flaskOriginal, flaskGuided, flaskWeakGuided, djangoGuided, expressGuided, pilotTasks };
