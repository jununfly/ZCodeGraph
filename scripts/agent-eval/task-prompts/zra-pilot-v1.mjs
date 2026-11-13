// Content-frozen ZRA-Paired v1 pilot tasks. Registry availability is NOT
// execution authorization; reviewer/coverage/production/DES gates remain.

export const SHARED_PREFIX = 'CodeGraph MCP tools are available for structural code questions in this read-only checkout; use them when they help. Investigate without editing files, running tests, or starting a server. Give a concise technical explanation with exact file paths and symbol names.';
const review = Object.freeze({ reviewer: 'victo', verdict: 'accept', reviewedAt: '2026-11-12' });
const freshness = Object.freeze({ createdAt: '2026-11-12', reusedV3Text: false, limitation: 'New prompt/rubric; no claim of an unseen repository or zero model-training contamination.' });

function task({ id, corpus, commit, question, rubric, negativeConstraints, sourceAnchors }) {
  return Object.freeze({
    PROMPT_ID: id, CORPUS: `${corpus}@${commit}`, COMMIT: commit,
    SHARED_PREFIX, PROMPT: `${SHARED_PREFIX} ${question}`,
    RUBRIC: Object.freeze(rubric), NEGATIVE_CONSTRAINTS: Object.freeze(negativeConstraints),
    SOURCE_ANCHORS: Object.freeze(sourceAnchors),
    TASK_SET_REVIEW: review, FRESHNESS: freshness,
  });
}

export const flask = task({
  id: 'flask-session-response-trace-v1', corpus: 'pallets/flask',
  commit: '05e9c6bd630ecf4ec0ec884b1fc7901663737bc7',
  question: 'Trace how the default Flask session is loaded on demand and how changes reach the HTTP response. Identify the request-context accessor, application response hook, and concrete session-interface methods involved. Explain when no cookie is written even when the session is non-empty, and distinguish empty-session deletion from ordinary persistence. Cite repository files and symbols, and do not attribute cookie serialization to the response hook itself.',
  rubric: [
    'src/flask/ctx.py: RequestContext._get_session lazily calls the session interface open_session and supplies a null session when appropriate.',
    'src/flask/app.py: Flask.process_response runs response hooks and delegates save_session to the session interface for a non-null session.',
    'src/flask/sessions.py: SecureCookieSessionInterface.open_session reads the signed cookie and returns a new session for missing or invalid input.',
    'src/flask/sessions.py: should_set_cookie requires modification or permanent-session refresh; non-empty alone is insufficient.',
    'src/flask/sessions.py: save_session distinguishes empty modified-session deletion from conditional ordinary persistence and performs cookie serialization.',
  ],
  negativeConstraints: ['Do not claim process_response serializes the cookie itself.', 'Do not claim every non-empty session unconditionally writes a cookie.'],
  sourceAnchors: {
    requiredFiles: ['src/flask/ctx.py', 'src/flask/app.py', 'src/flask/sessions.py'],
    symbols: [
      { query: '_get_session', name: 'AppContext._get_session', file: 'src/flask/ctx.py' },
      { query: 'process_response', name: 'Flask.process_response', file: 'src/flask/app.py' },
      { query: 'open_session', name: 'SecureCookieSessionInterface.open_session', file: 'src/flask/sessions.py' },
      { query: 'save_session', name: 'SecureCookieSessionInterface.save_session', file: 'src/flask/sessions.py' },
      { query: 'should_set_cookie', name: 'SessionInterface.should_set_cookie', file: 'src/flask/sessions.py' },
    ],
  },
});

export const django = task({
  id: 'django-csrf-view-trace-v1', corpus: 'django/django',
  commit: '2fff3e9f493a9c85fb8a2294358c6751575ee4bf',
  question: "Trace how Django's CSRF middleware protects a state-changing view. Follow the request from the middleware's request hook through view dispatch, then explain how a rejected request is produced and how an outgoing CSRF cookie is refreshed. Identify which component schedules view middleware, rather than assuming the middleware base class calls every hook directly. Cite repository files and symbols.",
  rubric: [
    'django/middleware/__init__.py: MiddlewareMixin.__call__ coordinates request/get_response/response, not direct process_view dispatch.',
    'django/core/handlers/base.py: BaseHandler.load_middleware registers process_view and _get_response schedules it before invoking the view.',
    'django/middleware/csrf.py: CsrfViewMiddleware.process_request obtains the secret and process_view validates, rejects, or accepts.',
    'django/middleware/csrf.py: _reject produces the rejection response.',
    'django/middleware/csrf.py: process_response refreshes the cookie when CSRF_COOKIE_NEEDS_UPDATE is set and clears that flag.',
  ],
  negativeConstraints: ['Do not claim MiddlewareMixin.__call__ directly calls process_view.', 'Do not omit the base handler view-middleware scheduling role.'],
  sourceAnchors: {
    requiredFiles: ['django/middleware/__init__.py', 'django/core/handlers/base.py', 'django/middleware/csrf.py'],
    symbols: [
      { query: '__call__', name: 'MiddlewareMixin.__call__', file: 'django/middleware/__init__.py' },
      { query: 'load_middleware', name: 'BaseHandler.load_middleware', file: 'django/core/handlers/base.py' },
      { query: '_get_response', name: 'BaseHandler._get_response', file: 'django/core/handlers/base.py' },
      { query: 'process_view', name: 'CsrfViewMiddleware.process_view', file: 'django/middleware/csrf.py' },
      { query: 'process_response', name: 'CsrfViewMiddleware.process_response', file: 'django/middleware/csrf.py' },
      { query: '_reject', name: 'CsrfViewMiddleware._reject', file: 'django/middleware/csrf.py' },
    ],
  },
});

export const express = task({
  id: 'express-mounted-prototypes-trace-v1', corpus: 'expressjs/express',
  commit: '6d2df035a95f3d1002be3e29997b7a4bfe976b5f',
  question: 'Trace how an Express sub-application is mounted and how request/response prototypes are restored after the sub-application finishes. Identify the creation-time prototypes, the application request hook, and the mounted wrapper. Explain the role of the mount event and distinguish what is proven in this checkout from behavior delegated to the external router package. Cite repository files and symbols.',
  rubric: [
    'lib/express.js: createApplication creates per-application request and response prototypes.',
    'lib/application.js: lazyRouter creates the external Router and app.handle installs the prototypes before router.handle.',
    'lib/application.js: app.use records mount path/parent and wraps the mounted app.',
    'The mounted wrapper preserves orig=req.app and restores orig.request/orig.response prototypes before next(err).',
    'The mount event notifies the child but does not replace wrapper restoration; router path stripping is an external-router boundary in this checkout.',
  ],
  negativeConstraints: ['Do not invent lib/router/index.js in this checkout.', 'Do not describe prototype restoration as only req.app=orig or attribute external-router behavior to local code.'],
  sourceAnchors: {
    requiredFiles: ['lib/express.js', 'lib/application.js'],
    symbols: [
      { query: 'createApplication', name: 'createApplication', file: 'lib/express.js' },
      { query: 'lazyrouter', name: 'lazyrouter', file: 'lib/application.js' },
      { query: 'handle', name: 'handle', file: 'lib/application.js' },
      { query: 'use', name: 'use', file: 'lib/application.js' },
      { query: 'mounted_app', name: 'mounted_app', file: 'lib/application.js' },
    ],
  },
});

export const gin = task({
  id: 'gin-not-found-middleware-trace-v1', corpus: 'gin-gonic/gin',
  commit: '0f09c3a9b4626d9fe9979cf4d0521d6ae32ab646',
  question: "Trace how a request with no matching route reaches Gin's custom not-found handlers. Start at the HTTP entry point, follow the route-miss branch, and explain how global middleware joins that chain, when the default body is written, and why aborting inside a handler does not mean the HTTP entry point returns immediately. Cite repository files and symbols.",
  rubric: [
    'gin.go: Engine.ServeHTTP resets the Context and calls handleHTTPRequest.',
    'gin.go: route miss without an allowed method selects allNoRoute and calls serveError.',
    'gin.go/routergroup.go: Use rebuilds the 404 chain and combineHandlers joins group middleware with noRoute handlers.',
    'gin.go: serveError sets status, calls Context.Next, and writes default404Body only when unwritten and the status remains appropriate.',
    'context.go: Next advances the handler index; Abort sets abortIndex and does not panic or immediately return from ServeHTTP.',
  ],
  negativeConstraints: ['Do not claim a 404 bypasses global middleware.', 'Do not claim the default body overwrites handler output or Abort is a panic/immediate HTTP return.'],
  sourceAnchors: {
    requiredFiles: ['gin.go', 'context.go', 'routergroup.go'],
    symbols: [
      { query: 'ServeHTTP', name: 'Engine.ServeHTTP', file: 'gin.go' },
      { query: 'handleHTTPRequest', name: 'Engine.handleHTTPRequest', file: 'gin.go' },
      { query: 'serveError', name: 'serveError', file: 'gin.go' },
      { query: 'Next', name: 'Context.Next', file: 'context.go' },
      { query: 'Abort', name: 'Context.Abort', file: 'context.go' },
      { query: 'combineHandlers', name: 'RouterGroup.combineHandlers', file: 'routergroup.go' },
      { query: 'Use', name: 'Engine.Use', file: 'gin.go' },
    ],
  },
});

export const spring = task({
  id: 'spring-pet-update-persistence-trace-v1', corpus: 'spring-projects/spring-petclinic',
  commit: 'f3c74834e31079f69855e9c9eddb34fceb40a8d9',
  question: 'Trace how editing an existing pet in Spring PetClinic reaches persistence without allowing the request to replace the pet or owner ID. Identify the model-loading and binding methods, the POST handler, and the helper that updates the entity. Explain which entity is saved and how a duplicate-name integrity error becomes form feedback. Cite repository files and symbols.',
  rubric: [
    'owner/PetController.java: findPet loads the owner and owner.getPet(petId) resolves the existing pet.',
    'owner/PetController.java: initOwnerBinder/initPetBinder disallow id and wildcard-id binding.',
    'owner/PetController.java: processUpdateForm validates and delegates entity mutation to updatePetDetails.',
    'owner/PetController.java and Owner.java: updatePetDetails copies mutable fields onto the persistent pet and owners.saveAndFlush saves the owner aggregate; getPet selects the existing matching non-new entity.',
    'owner/PetController.java: a duplicate-name DataIntegrityViolationException becomes rejectValue(name,duplicate); other integrity errors are rethrown.',
  ],
  negativeConstraints: ['Do not claim the submitted pet is directly saved instead of the owner.', 'Do not attribute JPA/transaction implementation to the controller or omit URL-based owner/pet association.'],
  sourceAnchors: {
    requiredFiles: [
      'src/main/java/org/springframework/samples/petclinic/owner/PetController.java',
      'src/main/java/org/springframework/samples/petclinic/owner/Owner.java',
    ],
    symbols: [
      { query: 'findPet', name: 'findPet', file: 'src/main/java/org/springframework/samples/petclinic/owner/PetController.java' },
      { query: 'initOwnerBinder', name: 'initOwnerBinder', file: 'src/main/java/org/springframework/samples/petclinic/owner/PetController.java' },
      { query: 'initPetBinder', name: 'initPetBinder', file: 'src/main/java/org/springframework/samples/petclinic/owner/PetController.java' },
      { query: 'processUpdateForm', name: 'processUpdateForm', file: 'src/main/java/org/springframework/samples/petclinic/owner/PetController.java' },
      { query: 'updatePetDetails', name: 'updatePetDetails', file: 'src/main/java/org/springframework/samples/petclinic/owner/PetController.java' },
      { query: 'getPet', name: 'getPet', file: 'src/main/java/org/springframework/samples/petclinic/owner/Owner.java' },
    ],
    externalBoundaries: ['OwnerRepository.saveAndFlush is inherited from external Spring Data; it is not a repository-local symbol requirement.'],
  },
});

export const pilotTasks = Object.freeze([flask, django, express, gin, spring]);
