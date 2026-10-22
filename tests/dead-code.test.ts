/**
 * Dead-code rubric v1 — pure-function unit tests.
 *
 * Locks the judgment rules in docs/contracts/dead-code-rubric-v1.md
 * (incl. the mandatory A1+A2 amendments, roadmap 1-2-4/1-2-5). Any rule
 * change requires a rubric amendment (clarification) or v2 (rule change).
 */

import { describe, expect, it } from 'vitest';
import {
  countBuckets,
  DeadCodeEvaluationInput,
  DeadCodeNodeMeta,
  DeadCodeNodeRow,
  evaluateDeadCode,
  isMinifiedJsFile,
  pathExcluded,
} from '../src/dead-code/rubric';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

let seq = 0;
function fn(partial: Partial<DeadCodeNodeRow> & Pick<DeadCodeNodeRow, 'name' | 'file_path' | 'language'>): DeadCodeNodeRow {
  seq++;
  return {
    id: `fn:${seq}`,
    kind: 'function',
    qualified_name: `${partial.file_path}::${partial.name}`,
    start_line: 10,
    end_line: 12,
    signature: null,
    visibility: null,
    is_exported: 0,
    decorators: null,
    ...partial,
  };
}

function meta(id: string, kind: string, name: string, file_path = 'src/x.ts'): DeadCodeNodeMeta {
  return { id, kind, name, file_path };
}

function evalWith(input: Partial<DeadCodeEvaluationInput> & { nodes: DeadCodeNodeRow[] }) {
  const allNodes: DeadCodeNodeMeta[] = input.allNodes ?? input.nodes.map((n) => meta(n.id, n.kind, n.name, n.file_path));
  return evaluateDeadCode({
    edges: [],
    allNodes,
    decoratesBySource: new Map(),
    importsByFile: new Map(),
    ...input,
  });
}

// ---------------------------------------------------------------------------
// Candidacy + path exclusions (base + A2)
// ---------------------------------------------------------------------------

describe('candidacy', () => {
  it('excludes nodes with any calls edge in either direction', () => {
    const a = fn({ name: 'a', file_path: 'src/a.py', language: 'python' });
    const b = fn({ name: 'b', file_path: 'src/a.py', language: 'python' });
    const verdicts = evalWith({
      nodes: [a, b],
      edges: [{ source: a.id, target: b.id, kind: 'calls' }],
    });
    expect(verdicts).toHaveLength(0);
  });

  it('excludes test/generated/vendor paths (case-insensitive substring)', () => {
    expect(pathExcluded('src/__tests__/x.py')).toBe(true);
    expect(pathExcluded('SRC/Test/x.py'.toLowerCase())).toBe(true);
    expect(pathExcluded('pkg/generated/y.go')).toBe(true);
    expect(pathExcluded('app/vendor/z.php')).toBe(true);
    expect(pathExcluded('src/main.py')).toBe(false);
  });

  it('A2: excludes js/build/, static/admin/js, *.min.js', () => {
    expect(pathExcluded('web/js/build/app.js')).toBe(true);
    expect(pathExcluded('django/contrib/admin/static/admin/js/core.js')).toBe(true);
    expect(pathExcluded('assets/jquery.min.js')).toBe(true);
    expect(pathExcluded('assets/app.js')).toBe(false);
  });

  it('A2: minified heuristic — .js whose functions all start on line <=1', () => {
    expect(isMinifiedJsFile('a.js', [1, 1, 1])).toBe(true);
    expect(isMinifiedJsFile('a.js', [1, 40])).toBe(false);
    expect(isMinifiedJsFile('a.ts', [1, 1])).toBe(false);
    expect(isMinifiedJsFile('a.js', [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// R1 — annotation whitelist
// ---------------------------------------------------------------------------

describe('R1 — annotation whitelist', () => {
  it('python decorators column hit → alive/R1', () => {
    const n = fn({ name: 'view', file_path: 'app/views.py', language: 'python', decorators: JSON.stringify(['app.route']) });
    const [v] = evalWith({ nodes: [n] });
    expect(v).toMatchObject({ bucket: 'alive', rule_id: 'R1' });
    expect(v.evidence.via).toBe('decorators');
  });

  it('java decorates-edge fallback hit → alive/R1', () => {
    const n = fn({ name: 'list', file_path: 'src/C.java', language: 'java' });
    const [v] = evalWith({
      nodes: [n],
      decoratesBySource: new Map([[n.id, new Set(['getmapping'])]]),
    });
    expect(v).toMatchObject({ bucket: 'alive', rule_id: 'R1' });
    expect(v.evidence.via).toBe('decorates-edge');
  });

  it('csharp override signature keyword → alive/R1', () => {
    const n = fn({ name: 'Save', file_path: 'src/R.cs', language: 'csharp', kind: 'method', signature: 'public override void Save()' });
    const [v] = evalWith({ nodes: [n] });
    expect(v).toMatchObject({ bucket: 'alive', rule_id: 'R1' });
    expect(v.evidence.via).toBe('signature');
  });

  it('language without whitelist entry (go) skips R1 silently', () => {
    const n = fn({ name: 'helper', file_path: 'internal/x.go', language: 'go', visibility: 'private' });
    const [v] = evalWith({ nodes: [n] });
    expect(v.rule_id).not.toBe('R1');
  });
});

// ---------------------------------------------------------------------------
// R2 — framework entry points
// ---------------------------------------------------------------------------

describe('R2 — framework entry points', () => {
  it('route-node references edge → alive/R2 route-link', () => {
    const n = fn({ name: 'getUser', file_path: 'src/routes.ts', language: 'typescript' });
    const route = meta('route:1', 'route', 'GET /users');
    const [v] = evalWith({
      nodes: [n],
      allNodes: [meta(n.id, n.kind, n.name, n.file_path), route],
      edges: [{ source: route.id, target: n.id, kind: 'references' }],
    });
    expect(v).toMatchObject({ bucket: 'alive', rule_id: 'R2' });
    expect(v.evidence.via).toBe('route-link');
  });

  it('entry-point names (main/handler/__init__) → alive/R2', () => {
    for (const name of ['main', 'handler', '__init__', 'configure']) {
      const n = fn({ name, file_path: 'src/x.py', language: 'python' });
      const [v] = evalWith({ nodes: [n] });
      expect(v, name).toMatchObject({ bucket: 'alive', rule_id: 'R2' });
    }
  });

  it('test-name convention → alive/R2', () => {
    const n = fn({ name: 'TestUserFlow', file_path: 'src/x.go', language: 'go' });
    const [v] = evalWith({ nodes: [n] });
    expect(v).toMatchObject({ bucket: 'alive', rule_id: 'R2' });
    expect(v.evidence.via).toBe('test-name');
  });

  it('exported public surface → alive/R2; internal/ path excluded', () => {
    const pub = fn({ name: 'PublicAPI', file_path: 'pkg/api/x.ts', language: 'typescript', is_exported: 1 });
    const internal = fn({ name: 'hidden', file_path: 'pkg/internal/x.ts', language: 'typescript', is_exported: 1 });
    const [vPub] = evalWith({ nodes: [pub] });
    expect(vPub).toMatchObject({ bucket: 'alive', rule_id: 'R2' });
    const [vInt] = evalWith({ nodes: [internal] });
    expect(vInt).not.toMatchObject({ bucket: 'alive', rule_id: 'R2', evidence: { via: 'exported-public-surface' } });
  });

  it('A1(a): blazor lifecycle name → alive/R2', () => {
    const n = fn({ name: 'OnInitializedAsync', file_path: 'Pages/Counter.razor.cs', language: 'csharp', kind: 'method' });
    const [v] = evalWith({ nodes: [n] });
    expect(v).toMatchObject({ bucket: 'alive', rule_id: 'R2' });
    expect(v.evidence.via).toBe('blazor-lifecycle');
  });

  it('A1(a): .razor.cs with indexed .razor sibling → alive/R2', () => {
    const n = fn({ name: 'IncrementCount', file_path: 'Pages/Counter.razor.cs', language: 'csharp', kind: 'method' });
    const [v] = evalWith({
      nodes: [n],
      hasRazorSibling: (p) => p === 'Pages/Counter.razor.cs',
    });
    expect(v).toMatchObject({ bucket: 'alive', rule_id: 'R2' });
    expect(v.evidence.via).toBe('razor-paired-handler');
  });

  it('A1(a): .razor.cs WITHOUT sibling falls through', () => {
    const n = fn({ name: 'IncrementCount', file_path: 'Pages/Counter.razor.cs', language: 'csharp', kind: 'method' });
    const [v] = evalWith({ nodes: [n], hasRazorSibling: () => false });
    expect(v).not.toMatchObject({ rule_id: 'R2', evidence: { via: 'razor-paired-handler' } });
  });

  it('A1(b): django template-tag module (file probe) → alive/R2', () => {
    const n = fn({ name: 'my_filter', file_path: 'app/templatetags/tags.py', language: 'python' });
    const [v] = evalWith({
      nodes: [n],
      probeFileContent: (p, needle) => p === n.file_path && needle === 'template.Library()',
    });
    expect(v).toMatchObject({ bucket: 'alive', rule_id: 'R2' });
    expect(v.evidence.via).toBe('file-text-probe');
  });

  it('A1(b): django `= Library(` probe variant also fires', () => {
    const n = fn({ name: 'my_tag', file_path: 'app/templatetags/tags.py', language: 'python' });
    const [v] = evalWith({
      nodes: [n],
      probeFileContent: (p, needle) => p === n.file_path && needle === '= Library(',
    });
    expect(v).toMatchObject({ bucket: 'alive', rule_id: 'R2' });
  });

  it('A1(a)-ext: method of class referenced by .razor markup → alive/R2', () => {
    const n = fn({
      name: 'HideToast',
      file_path: 'Helpers/ToastComponent.cs',
      language: 'csharp',
      kind: 'method',
      qualified_name: 'BlazorAdmin.Helpers::ToastComponent::HideToast',
    });
    const [v] = evalWith({
      nodes: [n],
      razorReferencesClass: (qn) => qn === 'BlazorAdmin.Helpers::ToastComponent',
    });
    expect(v).toMatchObject({ bucket: 'alive', rule_id: 'R2' });
    expect(v.evidence.via).toBe('razor-class-reference');
  });
});

// ---------------------------------------------------------------------------
// R3 — dynamic-dispatch exemptions
// ---------------------------------------------------------------------------

describe('R3 — dynamic-dispatch exemptions', () => {
  it('incoming implements/overrides edge on the node itself → unknown/R3', () => {
    const n = fn({ name: 'Serve', file_path: 'src/s.cs', language: 'csharp', kind: 'method' });
    const [v] = evalWith({
      nodes: [n],
      edges: [{ source: 'caller:1', target: n.id, kind: 'overrides' }],
    });
    expect(v).toMatchObject({ bucket: 'unknown', rule_id: 'R3' });
  });

  it('interface-dispatch via containing class → unknown/R3', () => {
    const cls = meta('class:1', 'class', 'MyService');
    const iface = meta('iface:1', 'interface', 'IService');
    const n = fn({ name: 'Serve', file_path: 'src/s.cs', language: 'csharp', kind: 'method' });
    const [v] = evalWith({
      nodes: [n],
      allNodes: [meta(n.id, n.kind, n.name, n.file_path), cls, iface],
      edges: [
        { source: cls.id, target: n.id, kind: 'contains' },
        { source: cls.id, target: iface.id, kind: 'implements' },
        { source: 'other:1', target: iface.id, kind: 'references' },
      ],
    });
    expect(v).toMatchObject({ bucket: 'unknown', rule_id: 'R3' });
    expect(v.evidence.via).toBe('interface-dispatch');
  });

  it('1-2-12-4: Spring Data repository method → unknown/R3 via spring-data-repository (graph signal)', () => {
    // VetRepository interface with a materialized superinterface signature
    // (`extends Repository`). Its methods resolve through the Spring Data
    // runtime proxy — a graph verdict, not the broad interface-proxy
    // fallback. Evidence must name the marker superinterface.
    const repo: DeadCodeNodeMeta = {
      id: 'iface:vet',
      kind: 'interface',
      name: 'VetRepository',
      file_path: 'src/VetRepository.java',
      signature: 'extends Repository',
    };
    const n = fn({ name: 'findAll', file_path: 'src/VetRepository.java', language: 'java', kind: 'method' });
    const [v] = evalWith({
      nodes: [n],
      allNodes: [meta(n.id, n.kind, n.name, n.file_path), repo],
      edges: [{ source: repo.id, target: n.id, kind: 'contains' }],
    });
    expect(v).toMatchObject({ bucket: 'unknown', rule_id: 'R3' });
    expect(v.evidence.via).toBe('spring-data-repository');
    expect(v.evidence.superinterface).toBe('Repository');
  });

  it('1-2-12-4: non-Spring-Data interface method stays on the interface-proxy fallback', () => {
    // A plain interface (no Spring Data marker superinterface) must still
    // hit the generic interface-proxy rule, NOT the spring-data branch.
    const iface: DeadCodeNodeMeta = {
      id: 'iface:plain',
      kind: 'interface',
      name: 'Greeter',
      file_path: 'src/Greeter.java',
      signature: 'extends AutoCloseable',
    };
    const n = fn({ name: 'greet', file_path: 'src/Greeter.java', language: 'java', kind: 'method' });
    const [v] = evalWith({
      nodes: [n],
      allNodes: [meta(n.id, n.kind, n.name, n.file_path), iface],
      edges: [{ source: iface.id, target: n.id, kind: 'contains' }],
    });
    expect(v).toMatchObject({ bucket: 'unknown', rule_id: 'R3' });
    expect(v.evidence.via).toBe('interface-proxy');
  });

  it('callback names (__str__/Dispose/onX) → unknown/R3', () => {
    for (const name of ['__str__', 'Dispose', 'onClick']) {
      const n = fn({ name, file_path: 'src/x.py', language: 'python' });
      const [v] = evalWith({ nodes: [n] });
      expect(v, name).toMatchObject({ bucket: 'unknown', rule_id: 'R3' });
    }
  });

  it('reflection import context → unknown/R3', () => {
    const n = fn({ name: 'helper', file_path: 'src/dyn.py', language: 'python' });
    const [v] = evalWith({
      nodes: [n],
      importsByFile: new Map([[n.file_path, new Set(['importlib'])]]),
    });
    expect(v).toMatchObject({ bucket: 'unknown', rule_id: 'R3' });
    expect(v.evidence.via).toBe('reflection_context');
  });

  it('A1(c): JS closure-handler file probe → unknown/R3', () => {
    const n = fn({ name: 'attach', file_path: 'modules/x/js/behaviors.js', language: 'javascript' });
    const [v] = evalWith({
      nodes: [n],
      probeFileContent: (p, needle) => p === n.file_path && needle === 'Drupal.behaviors',
    });
    expect(v).toMatchObject({ bucket: 'unknown', rule_id: 'R3' });
    expect(v.evidence.via).toBe('file-text-probe');
  });

  it('pub-residual (visibility=public, no other signal) → unknown/R3', () => {
    // Non-Rust: a public fn with no other signal is unknown via pub-residual.
    // (Rust `pub` is handled earlier by R2 rust-pub-visibility → alive; see
    // the dedicated test below.)
    const n = fn({ name: 'open_helper', file_path: 'src/Lib.cs', language: 'csharp', visibility: 'public' });
    const [v] = evalWith({ nodes: [n] });
    expect(v).toMatchObject({ bucket: 'unknown', rule_id: 'R3' });
    expect(v.evidence.via).toBe('pub-residual');
  });

  it('rust pub visibility (visibility=public) → alive/R2 rust-pub-visibility', () => {
    // 1-2-12-3: a Rust `pub` fn is reachable from outside its defining
    // module (downstream crates/macros) even when the static graph sees zero
    // in-crate calls edges. `visibility` starts with 'pub' → R2 alive, which
    // fires before the generic R3 pub-residual rule.
    const n = fn({ name: 'open_helper', file_path: 'src/lib.rs', language: 'rust', visibility: 'public' });
    const [v] = evalWith({ nodes: [n] });
    expect(v).toMatchObject({ bucket: 'alive', rule_id: 'R2' });
    expect(v.evidence.via).toBe('rust-pub-visibility');
  });

  it('fn-as-value reference (incoming references edge) → unknown/R3', () => {
    // 1-2-12-6: a fn passed by value (`.all(entity_validate_char)`) is the
    // target of a references edge. With no calls edge it would fall to R4;
    // the references edge demotes it to unknown instead.
    const target = fn({ name: 'entity_validate_char', file_path: 'src/e.rs', language: 'rust' });
    const caller = fn({ name: 'check_slice_validity', file_path: 'src/e.rs', language: 'rust' });
    const [v] = evalWith({
      nodes: [target, caller],
      edges: [
        // caller has an outgoing calls edge so it is not itself a candidate;
        // target has only the incoming references edge (fn-as-value).
        { source: caller.id, target: 'fn:external', kind: 'calls' },
        { source: caller.id, target: target.id, kind: 'references' },
      ],
    });
    expect(v).toMatchObject({ id: target.id, bucket: 'unknown', rule_id: 'R3' });
    expect(v.evidence.via).toBe('fn-as-value-reference');
  });

  it('A1(b)-ext: python dunder (__deepcopy__/__html__) → unknown/R3', () => {
    for (const name of ['__deepcopy__', '__html__']) {
      const n = fn({ name, file_path: 'src/x.py', language: 'python' });
      const [v] = evalWith({ nodes: [n] });
      expect(v, name).toMatchObject({ bucket: 'unknown', rule_id: 'R3' });
    }
  });

  it('csharp ctor-shaped method (name == owner class) → unknown/R3', () => {
    const n = fn({
      name: 'Buyer',
      file_path: 'src/Buyer.cs',
      language: 'csharp',
      kind: 'method',
      qualified_name: 'App.Entities::BuyerAggregate::Buyer::Buyer',
    });
    const [v] = evalWith({ nodes: [n] });
    expect(v).toMatchObject({ bucket: 'unknown', rule_id: 'R3' });
    expect(v.evidence.via).toBe('ctor-reflection');
  });
});

// ---------------------------------------------------------------------------
// R4 — residual dead
// ---------------------------------------------------------------------------

describe('R4 — residual dead', () => {
  it('no signal at all → dead/R4', () => {
    // Python private (underscore) function: no PEP8-public demote applies.
    const n = fn({ name: '_orphan_util', file_path: 'src/util.py', language: 'python' });
    const [v] = evalWith({ nodes: [n] });
    expect(v).toMatchObject({ bucket: 'dead', rule_id: 'R4', evidence: {} });
  });

  it('rule order: R1 beats R4 even when R3/R4 would also apply', () => {
    const n = fn({
      name: '__str__', // would be R3 callback
      file_path: 'app/models.py',
      language: 'python',
      decorators: JSON.stringify(['property']), // R1 hit
    });
    const [v] = evalWith({ nodes: [n] });
    expect(v).toMatchObject({ bucket: 'alive', rule_id: 'R1' });
  });
});

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

describe('countBuckets', () => {
  it('tallies the three buckets', () => {
    const a = fn({ name: 'main', file_path: 'src/x.py', language: 'python' });
    const b = fn({ name: '__str__', file_path: 'src/x.py', language: 'python' });
    const c = fn({ name: '_gone', file_path: 'src/x.py', language: 'python' });
    const verdicts = evalWith({ nodes: [a, b, c] });
    expect(countBuckets(verdicts)).toEqual({ dead: 1, alive: 1, unknown: 1 });
  });
});
