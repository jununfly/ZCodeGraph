// Human-reviewed contract revision. This module is deliberately absent from registry.mjs.
// v1 remains frozen; content review does not authorize paired execution.
import {
  SHARED_PREFIX,
  django,
  gin,
  spring,
} from './zra-pilot-v1.mjs';

const review = Object.freeze({
  reviewer: 'victo',
  verdict: 'accept',
  reviewedAt: '2026-11-17',
  supersedes: 'content-reviewed ZRA-Paired v1; v1 evidence remains immutable',
});
const freshness = Object.freeze({
  createdAt: '2026-11-17',
  reusedV3Text: false,
  limitation: 'Minimal source-consistency revision of v1; no claim of an unseen repository or zero model-training contamination.',
});

function draft({ id, corpus, commit, question, rubric, negativeConstraints, sourceAnchors }) {
  return Object.freeze({
    PROMPT_ID: id, CORPUS: `${corpus}@${commit}`, COMMIT: commit,
    SHARED_PREFIX, PROMPT: `${SHARED_PREFIX} ${question}`,
    RUBRIC: Object.freeze(rubric), NEGATIVE_CONSTRAINTS: Object.freeze(negativeConstraints),
    SOURCE_ANCHORS: Object.freeze(sourceAnchors),
    TASK_SET_REVIEW: review, FRESHNESS: freshness,
    CONTRACT_STATUS: 'content-reviewed-not-registered',
  });
}

const flask = draft({
  id: 'flask-session-response-trace-v2-draft', corpus: 'pallets/flask',
  commit: '05e9c6bd630ecf4ec0ec884b1fc7901663737bc7',
  question: 'Trace how the default Flask session is opened when the combined AppContext with request information is pushed, cached by its session accessor, and saved to the HTTP response. Identify the AppContext push and accessor methods, application response hook, and concrete session-interface methods involved. Explain when no cookie is written even when the session is non-empty, and distinguish empty-session deletion from ordinary persistence. Cite repository files and symbols, and do not attribute cookie serialization to the response hook itself.',
  rubric: [
    'src/flask/ctx.py: AppContext.push calls _get_session when request information is present, before request matching; _get_session caches open_session and supplies a null session when appropriate.',
    'src/flask/ctx.py: AppContext.session delegates to _get_session and marks the returned session accessed; RequestContext is only a deprecated module-level alias of the merged AppContext class.',
    'src/flask/app.py: Flask.process_response runs response hooks and delegates save_session to the session interface for a non-null session.',
    'src/flask/sessions.py: SecureCookieSessionInterface.open_session reads the signed cookie and returns a new session for missing or invalid input.',
    'src/flask/sessions.py: should_set_cookie requires modification or permanent-session refresh; non-empty alone is insufficient.',
    'src/flask/sessions.py: save_session distinguishes empty modified-session deletion from conditional ordinary persistence and performs cookie serialization.',
  ],
  negativeConstraints: [
    'Do not claim process_response serializes the cookie itself.',
    'Do not claim every non-empty session unconditionally writes a cookie.',
    'Do not describe normal request session opening as deferred until the first session property access; AppContext.push opens it before request matching.',
    'Do not name RequestContext.push as a concrete method in this checkout; RequestContext is a deprecated alias of AppContext.',
  ],
  sourceAnchors: {
    requiredFiles: ['src/flask/ctx.py', 'src/flask/app.py', 'src/flask/sessions.py'],
    symbols: [
      { query: 'push', name: 'AppContext.push', file: 'src/flask/ctx.py' },
      { query: 'session', name: 'AppContext.session', file: 'src/flask/ctx.py' },
      { query: '_get_session', name: 'AppContext._get_session', file: 'src/flask/ctx.py' },
      { query: 'process_response', name: 'Flask.process_response', file: 'src/flask/app.py' },
      { query: 'open_session', name: 'SecureCookieSessionInterface.open_session', file: 'src/flask/sessions.py' },
      { query: 'save_session', name: 'SecureCookieSessionInterface.save_session', file: 'src/flask/sessions.py' },
      { query: 'should_set_cookie', name: 'SessionInterface.should_set_cookie', file: 'src/flask/sessions.py' },
    ],
  },
});

export const express = draft({
  id: 'express-mounted-prototypes-trace-v2-draft', corpus: 'expressjs/express',
  commit: '6d2df035a95f3d1002be3e29997b7a4bfe976b5f',
  question: 'Trace how an Express sub-application is mounted and how request/response prototypes are restored after the sub-application finishes. Identify the creation-time prototypes, the lazy router property getter, the application request hook, and the mounted wrapper. Explain the role of the mount event and distinguish what is proven in this checkout from behavior delegated to the external router package. Cite repository files and symbols.',
  rubric: [
    'lib/express.js: createApplication creates per-application request and response prototypes.',
    'lib/application.js: the router property getter named getrouter lazily creates the external Router; app.handle installs the prototypes before router.handle.',
    'lib/application.js: app.use records mount path/parent and wraps the mounted app.',
    'The mounted wrapper preserves orig=req.app and restores orig.request/orig.response prototypes before next(err).',
    'The mount event notifies the child but does not replace wrapper restoration; router path stripping is an external-router boundary in this checkout.',
  ],
  negativeConstraints: [
    'Do not invent lib/router/index.js in this checkout.',
    'Do not describe prototype restoration as only req.app=orig or attribute external-router behavior to local code.',
    'Do not name a lazyrouter function or describe getrouter as an ordinary app method; it is the router property getter.',
  ],
  sourceAnchors: {
    requiredFiles: ['lib/express.js', 'lib/application.js'],
    symbols: [
      { query: 'createApplication', name: 'createApplication', file: 'lib/express.js' },
      { query: 'getrouter', name: 'getrouter', file: 'lib/application.js' },
      { query: 'handle', name: 'handle', file: 'lib/application.js' },
      { query: 'use', name: 'use', file: 'lib/application.js' },
      { query: 'mounted_app', name: 'mounted_app', file: 'lib/application.js' },
    ],
  },
});

function unchangedV2(task, id) {
  return Object.freeze({
    ...task,
    PROMPT_ID: id,
    TASK_SET_REVIEW: review,
    FRESHNESS: freshness,
    CONTRACT_STATUS: 'content-reviewed-not-registered',
  });
}

export const flaskV2 = Object.freeze({
  ...flask,
  TASK_SET_REVIEW: Object.freeze({
    ...review,
    reviewedAt: '2026-11-18',
    scope: 'Human re-reviewed the AppContext naming/accessor amendment; content accepted, execution remains unregistered.',
  }),
  CONTRACT_STATUS: 'content-reviewed-not-registered',
  AMENDMENT: Object.freeze({
    reason: 'The fixed checkout defines AppContext.push and AppContext.session; RequestContext is a deprecated module-level alias. Executable push() opens the session before matching even though some constructor/class prose still describes first-access loading.',
    source: 'pallets-flask@05e9c6bd630ecf4ec0ec884b1fc7901663737bc7:src/flask/ctx.py:260-297,381-444,528-540',
  }),
});

export const djangoV2 = unchangedV2(django, 'django-csrf-view-trace-v2-draft');
export const ginV2 = unchangedV2(gin, 'gin-not-found-middleware-trace-v2-draft');
export const springV2 = unchangedV2(spring, 'spring-pet-update-persistence-trace-v2-draft');
export const pilotTasksV2Draft = Object.freeze([flaskV2, djangoV2, express, ginV2, springV2]);
