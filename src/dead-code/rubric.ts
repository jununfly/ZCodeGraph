/**
 * Dead-code rubric v1 — frozen judgment rules
 * (see docs/contracts/dead-code-rubric-v1.md).
 *
 * Three-bucket verdict (dead / alive / unknown) over function/method nodes
 * with zero `calls` edges in either direction. Rules are evaluated in
 * order R1 → R4; the first match wins.
 *
 * Hard rules:
 *  - Pure functions over plain row objects. No DB, no LLM, no fs — the
 *    only file-content access is the bounded A1 text probe, injected as
 *    the `probeFileContent` callback by the caller (report.ts).
 *  - Deterministic. Same rows → same verdicts, byte-for-byte.
 *  - Single source of truth. The CLI, tests, and the precision harness
 *    must call into this module; do NOT re-implement the rules elsewhere.
 */

export type DeadCodeBucket = 'dead' | 'alive' | 'unknown';
export type DeadCodeRuleId = 'R1' | 'R2' | 'R3' | 'R4';

/** A function/method node row (the rubric's candidate unit). */
export interface DeadCodeNodeRow {
  id: string;
  kind: string;
  name: string;
  qualified_name: string;
  file_path: string;
  language: string;
  start_line: number;
  end_line: number;
  signature: string | null;
  visibility: string | null;
  is_exported: number;
  decorators: string | null; // JSON array
}

/** An edge row — only `kind`, `source`, `target` are consumed. */
export interface DeadCodeEdgeRow {
  source: string;
  target: string;
  kind: string;
}

/** Minimal node shape for edge-endpoint kind/name lookups. */
export interface DeadCodeNodeMeta {
  id: string;
  kind: string;
  name: string;
  file_path: string;
  /** 1-2-12-4: materialized superinterface list for interfaces
   * (`extends Repository,...`), consumed by the Spring Data repository
   * branch of interface-proxy. Optional — older callers may omit it. */
  signature?: string | null;
}

export interface DeadCodeEvidence {
  via?: string;
  hit?: string;
  name?: string;
  owner?: string;
  file?: string;
  [key: string]: unknown;
}

export interface DeadCodeVerdict {
  id: string;
  name: string;
  qualified_name: string;
  file_path: string;
  language: string;
  start_line: number;
  bucket: DeadCodeBucket;
  rule_id: DeadCodeRuleId;
  evidence: DeadCodeEvidence;
}

// ---------------------------------------------------------------------------
// Rubric constants (docs/contracts/dead-code-rubric-v1.md — keep in sync)
// ---------------------------------------------------------------------------

/**
 * Path exclusions (case-insensitive substring match). Base list from the
 * rubric; A2 amendment entries are marked.
 */
export const PATH_EXCLUSIONS: readonly string[] = [
  'test', 'tests', '__tests__', 'spec', 'testing', 'testdata',
  'mock', 'mocks', 'fixture', 'fixtures',
  'generated', 'gen-', '.generated', 'vendor', 'migrations',
  // A2 (2026-10-21): corpus-noise exclusions
  'js/build/', '/static/admin/js/', '.min.js',
];

/** A2: a `.js` file whose functions cluster on line 1 is a minified bundle. */
export const MINIFIED_LINE_CLUSTER_THRESHOLD = 1;

export const WHITELIST: Readonly<Record<string, readonly string[]>> = {
  java: [
    'override', 'bean', 'component', 'service', 'repository', 'controller',
    'requestmapping', 'getmapping', 'postmapping', 'putmapping',
    'deletemapping', 'patchmapping', 'autowired', 'inject', 'postconstruct',
    'predestroy', 'eventlistener', 'scheduled', 'transactional', 'test',
    'parameterizedtest', 'beforeeach', 'aftereach', 'beforeall', 'afterall',
  ],
  csharp: [
    'apicontroller', 'route', 'httpget', 'httppost', 'httpput', 'httpdelete',
    'httppatch', 'fact', 'theory', 'test', 'testmethod', 'setup', 'teardown',
    'onmodelcreating', 'jsonconstructor', 'webmethod', 'grpc',
  ],
  python: [
    'property', 'staticmethod', 'classmethod', 'abstractmethod',
    'pytest.fixture', 'fixture', 'app.route', 'route', 'get', 'post', 'put',
    'delete', 'patch', 'api_view', 'receiver', 'override', 'patch.object',
    'mock', 'celery.task', 'shared_task', 'lru_cache', 'cache', 'wraps',
    'contextmanager', 'dataclass',
  ],
  php: [
    'route', 'middleware', 'scope', 'boot', 'register', 'hook_', 'test',
    'dataprovider',
  ],
  rust: [
    'test', 'no_mangle', 'wasm_bindgen', 'derive', 'async_std.main',
    'tokio.main', 'actix', 'get(', 'post(', 'route', 'handler',
  ],
};

export const ENTRY_NAMES: ReadonlySet<string> = new Set([
  'main', 'Main', 'index', 'handler', 'Handler', '__init__', '__call__',
  'run', 'boot', 'register', 'setup', 'configure', 'create', 'build',
  'constructor', '__construct',
]);

export const TEST_NAME_RE = /^(test|Test|it|should)|(_test|test_)$|^test_/;

export const R3_CALLBACK_NAMES: ReadonlySet<string> = new Set([
  'toString', 'toJson', 'to_json', 'fromJson', 'from_json', 'serialize',
  'deserialize', '__str__', '__repr__', '__eq__', '__hash__', '__lt__',
  '__len__', '__iter__', '__enter__', '__exit__', '__getattr__',
  '__getattribute__', '__setattr__', 'equals', 'hashCode', 'clone',
  'finalize', 'close', 'dispose', 'Dispose', 'CompareTo', 'GetHashCode',
  'Equals', 'ToString', 'accept', 'render',
]);

export const R3_NAME_RE = /^(visit|on)[A-Z_]/; // visit*, on* event-handler convention

export const REFLECTION_IMPORT_SIGNALS: readonly string[] = [
  'system.reflection', 'java.lang.reflect', 'importlib',
  'spring-context', 'autofac', 'injector',
];

// ---------------------------------------------------------------------------
// A1 amendment signals (2026-10-21, mandatory for node 1-2-5)
// ---------------------------------------------------------------------------

/** A1(a): Blazor component lifecycle overrides (C#). */
export const BLAZOR_LIFECYCLE_NAMES: ReadonlySet<string> = new Set([
  'OnInitialized', 'OnInitializedAsync', 'OnParametersSet',
  'OnParametersSetAsync', 'OnAfterRender', 'OnAfterRenderAsync',
  'ShouldRender', 'Dispose', 'DisposeAsync',
]);

/** A1(c): file-content probes whose presence demotes JS closures to unknown. */
export const JS_CLOSURE_FILE_PROBES: readonly string[] = [
  '$(...).on(', ').on(', '.each(', 'Drupal.behaviors',
];

/** A1(b): Django template-tag module markers (any of them registers the module). */
export const DJANGO_TEMPLATE_LIBRARY_PROBES: readonly string[] = [
  'template.Library()',
  '= Library(',
];

/** A1(b): Python dunder callback names are reflection-invoked (Django/DRF magic). */
export const PYTHON_DUNDER_RE = /^__[a-z]+__$/;

/** A1(c): C# classes referenced by a `.razor` file (`@inherits` / markup)
 * have all their methods treated as markup-reachable. The qualified-name
 * probe is a substring match against any `.razor` file's content. */
export type RazorReferenceProbe = (qualifiedClassName: string) => boolean;

/**
 * Bounded file-content existence probe. Returns true when the file at
 * `filePath` (already present in the `files` table) contains `needle`.
 * Injected by report.ts; rubric.ts itself never touches fs.
 */
export type FileContentProbe = (filePath: string, needle: string) => boolean;

/** A no-op probe — used by tests and by callers without fs access. */
export const NULL_PROBE: FileContentProbe = () => false;

// ---------------------------------------------------------------------------
// Rule evaluation
// ---------------------------------------------------------------------------

export function pathExcluded(filePath: string): boolean {
  const p = filePath.toLowerCase();
  return PATH_EXCLUSIONS.some((frag) => p.includes(frag));
}

/** A2: minified bundle heuristic — every function in the file starts ≤ line 1. */
export function isMinifiedJsFile(filePath: string, nodeStartLines: number[]): boolean {
  if (!filePath.toLowerCase().endsWith('.js')) return false;
  if (nodeStartLines.length === 0) return false;
  return nodeStartLines.every((ln) => ln <= MINIFIED_LINE_CLUSTER_THRESHOLD);
}

function matchWhitelist(
  language: string,
  decorators: string[] | null,
  signature: string | null,
  decoratesNames: ReadonlySet<string> | undefined,
): { hit: string; via: string } | null {
  const list = WHITELIST[language];
  if (!list) return null;
  const decos = (decorators ?? []).map((d) => String(d).toLowerCase());
  for (const d of decos) {
    for (const w of list) {
      if (d.includes(w)) return { hit: w, via: 'decorators' };
    }
  }
  if (decoratesNames) {
    for (const d of decoratesNames) {
      for (const w of list) {
        if (d.includes(w)) return { hit: w, via: 'decorates-edge' };
      }
    }
  }
  // C# `override` is a signature keyword, not an attribute.
  if (language === 'csharp' && signature && /\boverride\b/.test(signature)) {
    return { hit: 'override', via: 'signature' };
  }
  return null;
}

/**
 * 1-2-12-4: Spring Data repository marker interfaces. When a Java interface's
 * materialized `signature` (`extends <leaf1>,<leaf2>`, generics stripped)
 * lists one of these, Spring Data generates the runtime proxy — the
 * interface's methods are reachable through that proxy by graph signal.
 * Covers the core `org.springframework.data.repository.*` hierarchy plus the
 * common store-specific sub-interfaces.
 */
const SPRING_DATA_REPOSITORY_MARKERS = new Set([
  'repository', // org.springframework.data.repository.Repository (marker)
  'crudrepository',
  'listcrudrepository',
  'pagingandsortingrepository',
  'listpagingandsortingrepository',
  'jparepository',
  'mongorepository',
  'cassandrarepository',
  'redisrepository',
  'elasticsearchrepository',
  'neo4jrepository',
  'r2dbcrepository',
  'reactivecrudrepository',
  'reactivemongorepository',
  'jparespecificationexecutor',
  'querybyexampleexecutor',
  'querydsl-predicateexecutor',
  'querydslpredicateexecutor',
]);

/**
 * Return the matching Spring Data marker superinterface leaf from an
 * interface's materialized signature (`extends Repository,CrudRepository`),
 * or null when it is not a Spring Data repository interface. Comparison is
 * case-insensitive on the already generics-stripped leaf names.
 */
function springDataSuperinterface(signature: string | null | undefined): string | null {
  if (!signature || !signature.startsWith('extends ')) return null;
  const list = signature.slice('extends '.length);
  for (const raw of list.split(',')) {
    const leaf = raw.trim().toLowerCase();
    if (leaf && SPRING_DATA_REPOSITORY_MARKERS.has(leaf)) return raw.trim();
  }
  return null;
}

export interface DeadCodeEvaluationInput {
  nodes: DeadCodeNodeRow[];
  edges: DeadCodeEdgeRow[];
  /** All nodes (any kind) — used for route/contains/import endpoint lookups. */
  allNodes: DeadCodeNodeMeta[];
  /** decorates-edge target leaf names per source node id. */
  decoratesBySource: ReadonlyMap<string, ReadonlySet<string>>;
  /** imports-edge target names per file path. */
  importsByFile: ReadonlyMap<string, ReadonlySet<string>>;
  /** Bounded A1 file-content probe. Defaults to NULL_PROBE. */
  probeFileContent?: FileContentProbe;
  /** Sibling-existence probe: does `<basename>.razor` exist for a `.razor.cs` path? */
  hasRazorSibling?: (filePath: string) => boolean;
  /** A1(c)-extended: is this C# class referenced by any indexed .razor file? */
  razorReferencesClass?: RazorReferenceProbe;
}

/**
 * Evaluate the rubric over the given graph rows. Every function/method
 * node with zero calls edges and no path exclusion gets a verdict;
 * non-candidates are simply omitted from the output.
 */
export function evaluateDeadCode(input: DeadCodeEvaluationInput): DeadCodeVerdict[] {
  const { nodes, edges, allNodes, decoratesBySource, importsByFile } = input;
  const probe = input.probeFileContent ?? NULL_PROBE;
  const hasRazorSibling = input.hasRazorSibling ?? (() => false);
  const razorReferencesClass = input.razorReferencesClass ?? (() => false);

  const allNodesById = new Map(allNodes.map((n) => [n.id, n]));

  // Per-file start-line list for the A2 minified heuristic.
  const jsFileNodeLines = new Map<string, number[]>();

  const calledIn = new Set<string>();
  const calledOut = new Set<string>();
  const implementsIn = new Set<string>();
  const overridesIn = new Set<string>();
  const typeOfIn = new Set<string>();
  const routeLinked = new Set<string>();
  const implementsEdgesByClass = new Map<string, string[]>();
  const referencedIds = new Set<string>();
  // 1-2-12-6: ids of function/method nodes that are the TARGET of a
  // references edge (fn-as-value callback reachability signal).
  const fnReferencedIn = new Set<string>();

  for (const e of edges) {
    switch (e.kind) {
      case 'calls':
        calledIn.add(e.target);
        calledOut.add(e.source);
        break;
      case 'implements':
        implementsIn.add(e.target);
        if (!implementsEdgesByClass.has(e.source)) implementsEdgesByClass.set(e.source, []);
        implementsEdgesByClass.get(e.source)!.push(e.target);
        break;
      case 'overrides':
        overridesIn.add(e.target);
        break;
      case 'type_of':
        typeOfIn.add(e.source);
        break;
      case 'references': {
        referencedIds.add(e.target);
        referencedIds.add(e.source);
        const s = allNodesById.get(e.source);
        const t = allNodesById.get(e.target);
        if (s && s.kind === 'route') routeLinked.add(e.target);
        if (t && t.kind === 'route') routeLinked.add(e.source);
        // 1-2-12-6: a references edge whose TARGET is a function/method
        // means the fn is passed by value (`.all(entity_validate_char)`,
        // `.map(handler)`) or otherwise referenced by name — the callback is
        // reachable through the caller even though there is no `calls` edge.
        if (t && (t.kind === 'function' || t.kind === 'method')) {
          fnReferencedIn.add(e.target);
        }
        break;
      }
    }
  }

  // Interfaces that are themselves referenced anywhere.
  const referencedInterfaces = new Set<string>();
  for (const ifaces of implementsEdgesByClass.values()) {
    for (const iface of ifaces) {
      if (referencedIds.has(iface)) referencedInterfaces.add(iface);
    }
  }

  // 1-2-12-5: line ranges of Rust functions decorated with a test-driver
  // attribute. Any nested fn defined INSIDE one of these ranges is
  // reachable only via the test driver and must be demoted to alive —
  // the static graph cannot see the `#[test]` / `#[actix_rt::test]` /
  // `#[tokio::test]` invocation, and the extractor (by design) attaches
  // nested fns to the file node, not the outer fn, so a contains-walk
  // cannot recover this signal. We recognise the test driver by the
  // leaf segment of any decorates body on the outer fn: `test`,
  // `actix_rt::test`, `tokio::test`, `actix_web::test`, `rstest`.
  const TEST_DECORATE_LEAVES = new Set(['test', 'rstest']);
  const testDecoratedRustFnRanges: Array<{ filePath: string; startLine: number; endLine: number }> = [];
  for (const n of nodes) {
    if (n.language !== 'rust') continue;
    if (n.kind !== 'function' && n.kind !== 'method') continue;
    const decos = decoratesBySource.get(n.id);
    if (!decos) continue;
    let hit = false;
    for (const body of decos) {
      // body is already lowercased by report.ts (e.g. 'actix_rt::test',
      // 'test', 'tokio::test', 'rstest'). Take the last `::` segment as
      // the leaf name.
      const leaf = body.split('::').pop() ?? body;
      if (TEST_DECORATE_LEAVES.has(leaf)) {
        hit = true;
        break;
      }
    }
    if (hit) {
      testDecoratedRustFnRanges.push({
        filePath: n.file_path,
        startLine: n.start_line,
        endLine: n.end_line,
      });
    }
  }

  // 1-2-12-5 (b): line ranges of Rust `mod` blocks decorated with
  // `#[cfg(test)]` — these are the idiomatic `mod tests { ... }` modules
  // holding unit tests. The extractor persists the mod as an `import`
  // node and (post-1-2-12-5) writes decorates edges for the mod's own
  // attributes, so we can recover the range from decoratesBySource.
  // Every function whose start line falls inside such a range is
  // reachable only via `cargo test` and must be demoted to alive.
  const cfgTestModRanges: Array<{ filePath: string; startLine: number; endLine: number }> = [];
  for (const n of nodes) {
    if (n.language !== 'rust') continue;
    if (n.kind !== 'import') continue; // Rust extractor represents mod as import
    const decos = decoratesBySource.get(n.id);
    if (!decos) continue;
    let hit = false;
    for (const body of decos) {
      // body is lowercased: 'cfg(test)', 'cfg(all(test, ...))', ...
      if (body.startsWith('cfg(') && body.includes('test')) {
        hit = true;
        break;
      }
    }
    if (hit) {
      cfgTestModRanges.push({
        filePath: n.file_path,
        startLine: n.start_line,
        endLine: n.end_line,
      });
    }
  }

  // Method -> containing class via contains edges.
  const classOfMethod = new Map<string, string>();
  for (const e of edges) {
    if (e.kind !== 'contains') continue;
    const parent = allNodesById.get(e.source);
    if (parent && ['class', 'struct', 'interface', 'trait', 'impl'].includes(parent.kind)) {
      classOfMethod.set(e.target, e.source);
    }
  }

  // Collect per-JS-file start lines for the A2 minified heuristic.
  for (const n of nodes) {
    const fp = n.file_path.toLowerCase();
    if (fp.endsWith('.js')) {
      if (!jsFileNodeLines.has(n.file_path)) jsFileNodeLines.set(n.file_path, []);
      jsFileNodeLines.get(n.file_path)!.push(n.start_line);
    }
  }

  const verdicts: DeadCodeVerdict[] = [];

  for (const n of nodes) {
    // Candidacy: zero calls edges in both directions, file not excluded.
    if (calledIn.has(n.id) || calledOut.has(n.id)) continue;
    if (pathExcluded(n.file_path)) continue;
    // A2: minified JS bundles are excluded as corpus noise.
    if (isMinifiedJsFile(n.file_path, jsFileNodeLines.get(n.file_path) ?? [n.start_line])) continue;

    const base = {
      id: n.id,
      name: n.name,
      qualified_name: n.qualified_name,
      file_path: n.file_path,
      language: n.language,
      start_line: n.start_line,
    };

    let decorators: string[] | null = null;
    if (n.decorators) {
      try {
        const parsed = JSON.parse(n.decorators);
        if (Array.isArray(parsed)) decorators = parsed;
      } catch {
        decorators = null;
      }
    }

    // R1 — annotation/attribute whitelist (decorators column + decorates
    // edges + C# override signature keyword).
    const r1 = matchWhitelist(n.language, decorators, n.signature, decoratesBySource.get(n.id));
    if (r1) {
      verdicts.push({ ...base, bucket: 'alive', rule_id: 'R1', evidence: r1 });
      continue;
    }

    // R2 — framework entry points.
    if (routeLinked.has(n.id)) {
      verdicts.push({ ...base, bucket: 'alive', rule_id: 'R2', evidence: { via: 'route-link' } });
      continue;
    }
    if (ENTRY_NAMES.has(n.name)) {
      verdicts.push({ ...base, bucket: 'alive', rule_id: 'R2', evidence: { via: 'entry-name', name: n.name } });
      continue;
    }
    if (TEST_NAME_RE.test(n.name)) {
      verdicts.push({ ...base, bucket: 'alive', rule_id: 'R2', evidence: { via: 'test-name', name: n.name } });
      continue;
    }
    if (n.is_exported === 1) {
      const p = n.file_path.toLowerCase();
      if (!p.includes('internal/') && !p.includes('private') && !p.includes('impl/')) {
        verdicts.push({ ...base, bucket: 'alive', rule_id: 'R2', evidence: { via: 'exported-public-surface' } });
        continue;
      }
    }
    // 1-2-12-3: Rust `pub` / `pub(crate)` / `pub(super)` / `pub(in ...)`
    // functions are reachable from outside their defining module — the
    // graph sees zero in-crate `calls` edges even when downstream crates
    // or macros invoke them. The Rust extractor (crates/zcodegraph-core)
    // records visibility on the node, so consume it here. Private fns
    // fall through to R3/R4 as before. We deliberately demote to `alive`
    // (not `unknown`) because `pub` is a strong external-reachability
    // signal — the framework-crate false-positive cohort (actix 30 FP)
    // is dominated by exactly this shape.
    if (n.language === 'rust' && n.visibility !== null && n.visibility.startsWith('pub')) {
      verdicts.push({ ...base, bucket: 'alive', rule_id: 'R2', evidence: { via: 'rust-pub-visibility', visibility: n.visibility } });
      continue;
    }
    // 1-2-12-5: Rust nested fns defined INSIDE a `#[test]` /
    // `#[actix_rt::test]` / `#[tokio::test]` / `#[rstest]` outer fn are
    // reachable only via the test driver. The static graph cannot see
    // the call (the driver is invoked by the test runner), and the
    // extractor deliberately attaches nested fns to the file node (not
    // the outer fn), so contains-walks cannot rescue them either. Demote
    // to alive when the candidate's line range falls inside any
    // test-decorated outer fn in the same file.
    if (n.language === 'rust') {
      const enclosing = testDecoratedRustFnRanges.find(
        (r) =>
          r.filePath === n.file_path &&
          n.start_line > r.startLine &&
          n.start_line < r.endLine,
      );
      if (enclosing) {
        verdicts.push({
          ...base,
          bucket: 'alive',
          rule_id: 'R2',
          evidence: { via: 'rust-nested-fn-in-test', enclosingStart: enclosing.startLine },
        });
        continue;
      }
      // 1-2-12-5 (b): functions whose start line falls inside a
      // `#[cfg(test)] mod ... { ... }` range. The mod itself is held by
      // the test runner, so every fn inside is reachable only via
      // `cargo test`. The extractor persists the mod as an `import`
      // node and writes decorates edges for the mod's attributes.
      const enclosingMod = cfgTestModRanges.find(
        (r) =>
          r.filePath === n.file_path &&
          n.start_line > r.startLine &&
          n.start_line < r.endLine,
      );
      if (enclosingMod) {
        verdicts.push({
          ...base,
          bucket: 'alive',
          rule_id: 'R2',
          evidence: { via: 'rust-fn-in-cfg-test-mod', modStart: enclosingMod.startLine },
        });
        continue;
      }
    }
    // A1(a): Blazor lifecycle overrides and .razor-paired partial-class
    // handlers (e.g. `*Click` methods in `Foo.razor.cs`).
    if (n.language === 'csharp' && BLAZOR_LIFECYCLE_NAMES.has(n.name)) {
      verdicts.push({ ...base, bucket: 'alive', rule_id: 'R2', evidence: { via: 'blazor-lifecycle', name: n.name } });
      continue;
    }
    if (n.language === 'csharp' && n.file_path.toLowerCase().endsWith('.razor.cs') && hasRazorSibling(n.file_path)) {
      verdicts.push({ ...base, bucket: 'alive', rule_id: 'R2', evidence: { via: 'razor-paired-handler', file: n.file_path } });
      continue;
    }
    // A1(a)-extended: methods of a C# class referenced by any indexed
    // `.razor` file (`@inherits` / markup component tag) are
    // markup-reachable. Owner class id = `<method-id>` minus the kind
    // prefix is unavailable here, so we match on qualified_name prefix:
    // `Ns::Class::Method` → owner `Ns::Class`.
    if (n.language === 'csharp' && n.kind === 'method') {
      const qn = n.qualified_name;
      const sep = qn.lastIndexOf('::');
      if (sep > 0) {
        const ownerQn = qn.slice(0, sep);
        if (razorReferencesClass(ownerQn)) {
          verdicts.push({ ...base, bucket: 'alive', rule_id: 'R2', evidence: { via: 'razor-class-reference', owner: ownerQn } });
          continue;
        }
      }
    }
    // A1(b): Django template-tag module — file contains
    // `template.Library()` or `= Library(`; module-level functions are
    // string-referenced from templates. With a visible @register.*
    // decorator R1 already fired; otherwise the file signal makes it alive.
    if (n.language === 'python' &&
      DJANGO_TEMPLATE_LIBRARY_PROBES.some((needle) => probe(n.file_path, needle))) {
      verdicts.push({ ...base, bucket: 'alive', rule_id: 'R2', evidence: { via: 'file-text-probe', hit: DJANGO_TEMPLATE_LIBRARY_PROBES[0] } });
      continue;
    }

    // R3 — dynamic-dispatch exemptions.
    if (implementsIn.has(n.id) || overridesIn.has(n.id) || typeOfIn.has(n.id)) {
      verdicts.push({ ...base, bucket: 'unknown', rule_id: 'R3', evidence: { via: 'implements/overrides/type_of edge' } });
      continue;
    }
    const ownerClass = classOfMethod.get(n.id);
    if (ownerClass && implementsEdgesByClass.has(ownerClass)) {
      const ifaces = implementsEdgesByClass.get(ownerClass)!;
      if (ifaces.some((i) => referencedInterfaces.has(i))) {
        verdicts.push({ ...base, bucket: 'unknown', rule_id: 'R3', evidence: { via: 'interface-dispatch', owner: ownerClass } });
        continue;
      }
    }
    // 1-2-12-6: the fn is the target of a references edge — it is passed by
    // value (`.all(entity_validate_char)`, `.map(handler)`,
    // `thread::spawn(worker)`) or otherwise name-referenced. The graph has
    // no `calls` edge for such callbacks, so a zero-calls verdict is not
    // provable. Demote to unknown (not alive): a references edge is weaker
    // than a framework entry point, and the extractor emits these refs
    // wide (resolver keeps only single-candidate function/method matches).
    if (fnReferencedIn.has(n.id)) {
      verdicts.push({ ...base, bucket: 'unknown', rule_id: 'R3', evidence: { via: 'fn-as-value-reference', name: n.name } });
      continue;
    }
    if (R3_CALLBACK_NAMES.has(n.name) || R3_NAME_RE.test(n.name)) {
      verdicts.push({ ...base, bucket: 'unknown', rule_id: 'R3', evidence: { via: 'callback-name', name: n.name } });
      continue;
    }
    // A1(b)-extended: Python dunder names (__deepcopy__, __html__, ...)
    // are invoked reflectively by the interpreter/framework — the graph
    // can never see those calls.
    if (n.language === 'python' && PYTHON_DUNDER_RE.test(n.name)) {
      verdicts.push({ ...base, bucket: 'unknown', rule_id: 'R3', evidence: { via: 'callback-name', name: n.name } });
      continue;
    }
    // C# constructor-shaped methods (name == owner class simple name)
    // are invoked by DI/reflection even when the static graph sees no
    // call (EF-core materialization, DDD factories). Owner simple name =
    // last `::` segment of the owner path. Demote to unknown.
    if (n.language === 'csharp' && n.kind === 'method') {
      const qn = n.qualified_name;
      const sep = qn.lastIndexOf('::');
      if (sep > 0) {
        const ownerPath = qn.slice(0, sep);
        const ownerSimple = ownerPath.split('::').pop() ?? '';
        if (ownerSimple.length > 0 && ownerSimple === n.name) {
          verdicts.push({ ...base, bucket: 'unknown', rule_id: 'R3', evidence: { via: 'ctor-reflection', name: n.name } });
          continue;
        }
      }
    }
    const fileImports = importsByFile.get(n.file_path);
    if (fileImports && [...fileImports].some((imp) =>
      REFLECTION_IMPORT_SIGNALS.some((sig) => imp.includes(sig)))) {
      verdicts.push({ ...base, bucket: 'unknown', rule_id: 'R3', evidence: { via: 'reflection_context', file: n.file_path } });
      continue;
    }
    // A1(c): JS functions in a file that registers DOM/jQuery handlers
    // (Drupal behaviors pattern) — demote R4 → unknown.
    if ((n.language === 'javascript' || n.language === 'typescript') &&
      JS_CLOSURE_FILE_PROBES.some((needle) => probe(n.file_path, needle))) {
      verdicts.push({ ...base, bucket: 'unknown', rule_id: 'R3', evidence: { via: 'file-text-probe', hit: 'js-closure-handler' } });
      continue;
    }
    if (n.visibility === 'public' || n.is_exported === 1) {
      verdicts.push({ ...base, bucket: 'unknown', rule_id: 'R3', evidence: { via: 'pub-residual' } });
      continue;
    }
    // A1(b)-extended (signal-based, not language-wide): a Java method
    // whose owner is an interface is invoked through the proxy the
    // framework generates (Spring Data / JDK proxy) — the graph has no
    // signal to distinguish it, so it is not provably dead.
    if (n.language === 'java' && n.kind === 'method') {
      const ownerId = classOfMethod.get(n.id);
      const owner = ownerId ? allNodesById.get(ownerId) : undefined;
      if (owner && owner.kind === 'interface') {
        // 1-2-12-4: prefer the precise graph signal over the broad fallback.
        // The extractor materializes an interface's superinterface list onto
        // its signature (`extends Repository,...`, generics stripped, leaf
        // names). A superinterface in the Spring Data repository marker set
        // (Repository / CrudRepository / JpaRepository / ...) means Spring
        // Data generates the proxy at runtime — that is a *graph* verdict,
        // not the generic "owner is an interface" heuristic below.
        const springDataHit = springDataSuperinterface(owner.signature);
        if (springDataHit) {
          verdicts.push({
            ...base,
            bucket: 'unknown',
            rule_id: 'R3',
            evidence: { via: 'spring-data-repository', owner: owner.name, superinterface: springDataHit },
          });
          continue;
        }
        verdicts.push({ ...base, bucket: 'unknown', rule_id: 'R3', evidence: { via: 'interface-proxy', owner: owner.name } });
        continue;
      }
    }
    // Python public-API residual: a module-level function whose name does
    // not start with `_` is public by PEP8 convention. Python has no
    // visibility column, so the extractor never fills pub-residual for
    // these; the same "downstream code outside the indexed repo may call
    // it" argument as R2's exported-public-surface applies.
    if (n.language === 'python' && n.kind === 'function' && !n.name.startsWith('_')) {
      verdicts.push({ ...base, bucket: 'unknown', rule_id: 'R3', evidence: { via: 'pub-residual', note: 'pep8-public' } });
      continue;
    }
    // JS barrel residual: a `.js`/`.ts` file that contains an
    // `export default` is a module entry; its inner functions are
    // reachable through the closure the entry creates. The JS extractor
    // does not emit closure-local calls edges (1-2-4 graph-gap), so a
    // zero-calls verdict inside such a file is not provable.
    if ((n.language === 'javascript' || n.language === 'typescript') &&
      n.kind === 'function' && probe(n.file_path, 'export default')) {
      verdicts.push({ ...base, bucket: 'unknown', rule_id: 'R3', evidence: { via: 'js-barrel-graph-gap' } });
      continue;
    }

    // R4 — residual dead.
    verdicts.push({ ...base, bucket: 'dead', rule_id: 'R4', evidence: {} });
  }

  return verdicts;
}

export interface DeadCodeBuckets {
  dead: number;
  alive: number;
  unknown: number;
}

export function countBuckets(verdicts: readonly DeadCodeVerdict[]): DeadCodeBuckets {
  const buckets: DeadCodeBuckets = { dead: 0, alive: 0, unknown: 0 };
  for (const v of verdicts) buckets[v.bucket]++;
  return buckets;
}
