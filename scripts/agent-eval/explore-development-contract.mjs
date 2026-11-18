// Slice 0 development inputs only. This is not an executable pilot registry.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pilotTasksV2Draft } from './task-prompts/zra-pilot-v2-draft.mjs';

export const EXPLORE_DEVELOPMENT_CONTRACT_SCHEMA = 'explore-slice0-development-contract-v1';
export const EXPLORE_DEVELOPMENT_TASK_MODULE_SHA256 = '0433811d8b902d8d2f28afb9e55f35f9de65df9faedef2482cb9867b278c851d';

const FROZEN_TASKS = Object.freeze([
  ['flask-session-response-trace-v2-draft', 'pallets/flask', 'pallets-flask', '05e9c6bd630ecf4ec0ec884b1fc7901663737bc7'],
  ['django-csrf-view-trace-v2-draft', 'django/django', 'django-django', '2fff3e9f493a9c85fb8a2294358c6751575ee4bf'],
  ['express-mounted-prototypes-trace-v2-draft', 'expressjs/express', 'expressjs-express', '6d2df035a95f3d1002be3e29997b7a4bfe976b5f'],
  ['gin-not-found-middleware-trace-v2-draft', 'gin-gonic/gin', 'gin-gonic-gin', '0f09c3a9b4626d9fe9979cf4d0521d6ae32ab646'],
  ['spring-pet-update-persistence-trace-v2-draft', 'spring-projects/spring-petclinic', 'spring-projects-spring-petclinic', 'f3c74834e31079f69855e9c9eddb34fceb40a8d9'],
].map(([id, repo, directory, commit]) => Object.freeze({ id, repo, directory, commit })));

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/** Bind the reviewed content to exact bytes without registering or executing it. */
export function loadExploreDevelopmentContract() {
  const modulePath = fileURLToPath(new URL('./task-prompts/zra-pilot-v2-draft.mjs', import.meta.url));
  const moduleSha256 = sha256(readFileSync(modulePath));
  if (moduleSha256 !== EXPLORE_DEVELOPMENT_TASK_MODULE_SHA256) {
    throw new Error(`v2 development task bytes changed: ${moduleSha256}; explicitly re-freeze the slice 0 contract`);
  }
  if (pilotTasksV2Draft.length !== FROZEN_TASKS.length) throw new Error('exactly five development tasks are required');
  const tasks = FROZEN_TASKS.map((frozen) => {
    const task = pilotTasksV2Draft.find((candidate) => candidate.PROMPT_ID === frozen.id);
    if (!task || task.COMMIT !== frozen.commit || task.CORPUS !== `${frozen.repo}@${frozen.commit}`) {
      throw new Error(`development task identity mismatch: ${frozen.id}`);
    }
    if (task.CONTRACT_STATUS !== 'content-reviewed-not-registered') {
      throw new Error(`development task must remain unregistered: ${frozen.id}`);
    }
    return Object.freeze({
      ...frozen, task,
      promptSha256: sha256(task.PROMPT),
      rubricSha256: sha256(JSON.stringify(task.RUBRIC)),
      negativeConstraintsSha256: sha256(JSON.stringify(task.NEGATIVE_CONSTRAINTS)),
      sourceAnchorsSha256: sha256(JSON.stringify(task.SOURCE_ANCHORS)),
    });
  });
  return Object.freeze({
    schema: EXPLORE_DEVELOPMENT_CONTRACT_SCHEMA,
    taskModule: 'scripts/agent-eval/task-prompts/zra-pilot-v2-draft.mjs',
    taskModuleSha256: moduleSha256,
    executionRegistration: 'not-registered',
    purpose: 'local development characterization; not unseen holdout, Agent, DES, pilot or production admission',
    tasks: Object.freeze(tasks),
  });
}
