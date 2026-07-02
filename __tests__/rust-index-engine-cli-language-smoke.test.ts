import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CodeGraph } from '../src';
import { ToolHandler } from '../src/mcp/tools';
import {
  makeRustIndexingTempProject,
  RUST_CORE_BIN,
  runZcodegraphCli,
  ZCODEGRAPH_BIN,
} from './helpers/rust-indexing-cli';

describe('zcodegraph rust index language framework and MCP smoke behavior', () => {
  let tempDir: string;

  beforeAll(() => {
    if (!fs.existsSync(ZCODEGRAPH_BIN)) {
      execFileSync('npm', ['run', 'build'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
      });
    }
    execFileSync('cargo', ['build', '--package', 'zcodegraph-core'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
  }, 60_000);

  beforeEach(() => {
    tempDir = makeRustIndexingTempProject();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('indexes ordinary Go files under rust-hybrid', () => {
    fs.writeFileSync(path.join(tempDir, 'server.go'), 'package main\nfunc main() {}\n');

    const result = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getStats().filesByLanguage.go).toBe(1);
      expect(cg.searchNodes('main').some((match) => match.node.kind === 'function' && match.node.language === 'go')).toBe(true);
      expect(cg.getIndexBuildInfo()).toMatchObject({ engine: 'rust-hybrid' });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('indexes Rust files as Rust-owned under rust-hybrid', () => {
    fs.writeFileSync(path.join(tempDir, 'worker.rs'), 'fn worker() -> i32 { 1 }\n');

    const result = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getStats().filesByLanguage.rust).toBe(1);
      expect(cg.searchNodes('worker').some((match) => match.node.kind === 'function' && match.node.language === 'rust')).toBe(true);
      expect(cg.getIndexBuildInfo().hybrid).toMatchObject({
        rustOwnedLanguages: expect.arrayContaining(['rust']),
        engineByLanguage: { rust: 'rust' },
        fallbackByLanguage: {},
        fallbackFileCount: 0,
        fallbackReasonTaxonomy: {},
      });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('indexes the Rust core lib.rs without a Rust-owned parse gap', () => {
    const srcDir = path.join(tempDir, 'crates/zcodegraph-core/src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.copyFileSync(
      path.resolve(__dirname, '../crates/zcodegraph-core/src/lib.rs'),
      path.join(srcDir, 'lib.rs'),
    );

    const indexResult = spawnSync(RUST_CORE_BIN, [
      'index',
      '--engine',
      'rust',
      '--project-path',
      tempDir,
      '--index-path',
      path.join(tempDir, '.zcodegraph', 'zcodegraph.db'),
    ], {
      cwd: tempDir,
      encoding: 'utf-8',
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const resultLine = indexResult.stdout
      .trim()
      .split('\n')
      .filter((line) => line.includes('"type":"result"'))
      .pop();
    expect(resultLine).toBeDefined();
    const result = JSON.parse(resultLine!) as {
      filesErrored: number;
      errors: Array<{ filePath?: string; code?: string }>;
    };
    expect(result.filesErrored).toBe(0);
    expect(result.errors).not.toContainEqual(expect.objectContaining({
      filePath: 'crates/zcodegraph-core/src/lib.rs',
      code: 'rust-owned-parse-gap',
    }));
  }, 30_000);

  it('indexes Python as Rust-owned under rust-hybrid', () => {
    fs.mkdirSync(path.join(tempDir, 'pkg'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'worker.py'),
      [
        'def helper():',
        '    return 1',
        '',
        'def worker():',
        '    return helper()',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'pkg', 'foo.py'),
      [
        'widget = {"n": 1}',
        '',
        'def helper():',
        '    return 1',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'pkg', 'bar.py'),
      [
        'from foo import widget, helper',
        '',
        'registry = [widget]',
      ].join('\n') + '\n',
    );

    const result = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });

    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getStats().filesByLanguage.python).toBe(3);
      const worker = cg.searchNodes('worker').find((match) => match.node.kind === 'function' && match.node.language === 'python')?.node;
      const helper = cg.searchNodes('helper').find((match) => match.node.kind === 'function' && match.node.language === 'python')?.node;
      expect(worker).toBeDefined();
      expect(helper).toBeDefined();
      const workerCalls = cg.getOutgoingEdges(worker!.id).filter((edge) => edge.kind === 'calls');
      expect(workerCalls.some((edge) => edge.target === helper!.id)).toBe(true);
      expect(cg.getFileDependents('pkg/foo.py')).toContain('pkg/bar.py');
      const buildInfo = cg.getIndexBuildInfo();
      expect(buildInfo.engine).toBe('rust-hybrid');
      expect(buildInfo.hybrid).toMatchObject({
        rustOwnedLanguages: expect.arrayContaining(['python']),
        engineByLanguage: { python: 'rust' },
        fallbackByLanguage: {},
        fallbackFileCount: 0,
        fallbackReasonTaxonomy: {},
        pendingFallbacks: ['rust-owned-parse-gap'],
      });
    } finally {
      cg.close();
    }
  }, 30_000);

  it('reports Rust index-engine metadata through MCP status', async () => {
    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const handler = new ToolHandler(cg);
      const result = await handler.execute('zcodegraph_status', {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('**Index engine:** rust');
      expect(result.content[0].text).toContain('**Index engine version:** 0.1.0');
    } finally {
      cg.close();
    }
  }, 30_000);

  it('indexes one JavaScript file so TypeScript queries can find its symbols', () => {
    fs.writeFileSync(
      path.join(tempDir, 'app.js'),
      [
        'export function beta(value) {',
        '  return value + 1;',
        '}',
        '',
        'export class Widget {',
        '  render() { return beta(1); }',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const stats = cg.getStats();
      expect(stats.fileCount).toBeGreaterThanOrEqual(2);
      expect(stats.nodeCount).toBeGreaterThanOrEqual(3);
      expect(cg.searchNodes('beta').some((match) => match.node.name === 'beta')).toBe(true);
      expect(cg.searchNodes('Widget').some((match) => match.node.name === 'Widget')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('indexes Go symbols through the Rust engine', () => {
    fs.writeFileSync(
      path.join(tempDir, 'server.go'),
      [
        'package main',
        '',
        'type User struct {',
        '  Name string',
        '}',
        '',
        'type Store interface {',
        '  List() []User',
        '}',
        '',
        'type Handler struct {',
        '  store Store',
        '}',
        '',
        'const DefaultLimit = 10',
        'var cachedUsers []User',
        '',
        'type UserID = string',
        '',
        'func NewHandler(store Store) *Handler {',
        '  return &Handler{store: store}',
        '}',
        '',
        'func (h *Handler) ListUsers() []User {',
        '  return h.store.List()',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.getStats().filesByLanguage.go).toBe(1);
      const expectations = [
        ['main', 'module'],
        ['User', 'struct'],
        ['Name', 'field'],
        ['Store', 'interface'],
        ['Handler', 'struct'],
        ['store', 'field'],
        ['DefaultLimit', 'constant'],
        ['cachedUsers', 'variable'],
        ['UserID', 'type_alias'],
        ['NewHandler', 'function'],
        ['Handler.ListUsers', 'method'],
      ] as const;
      for (const [name, kind] of expectations) {
        expect(
          cg.searchNodes(name).some((match) => match.node.name === name && match.node.kind === kind && match.node.language === 'go'),
          `${name} (${kind}) should be indexed as Go`,
        ).toBe(true);
      }
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves Go same-file and same-package direct calls through the Rust engine', () => {
    fs.writeFileSync(
      path.join(tempDir, 'handler.go'),
      [
        'package main',
        '',
        'type Handler struct {}',
        '',
        'func (h *Handler) ListUsers() []string {',
        '  return loadUsers()',
        '}',
        '',
        'func loadUsers() []string {',
        '  return buildUsers()',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'store.go'),
      [
        'package main',
        '',
        'func buildUsers() []string {',
        '  return []string{"ada"}',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const listUsers = cg.searchNodes('Handler.ListUsers').find((match) => match.node.kind === 'method')?.node;
      const loadUsers = cg.searchNodes('loadUsers').find((match) => match.node.kind === 'function')?.node;
      const buildUsers = cg.searchNodes('buildUsers').find((match) => match.node.kind === 'function')?.node;
      expect(listUsers).toBeDefined();
      expect(loadUsers).toBeDefined();
      expect(buildUsers).toBeDefined();

      const listCalls = cg.getOutgoingEdges(listUsers!.id).filter((edge) => edge.kind === 'calls');
      const loadCalls = cg.getOutgoingEdges(loadUsers!.id).filter((edge) => edge.kind === 'calls');
      expect(listCalls.some((edge) => edge.target === loadUsers!.id)).toBe(true);
      expect(loadCalls.some((edge) => edge.target === buildUsers!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('links Gin direct routes to handlers and handler helpers under rust-hybrid', () => {
    fs.writeFileSync(
      path.join(tempDir, 'main.go'),
      [
        'package main',
        '',
        'import "github.com/gin-gonic/gin"',
        '',
        'type Controller struct {}',
        '',
        'func main() {',
        '  r := gin.Default()',
        '  r.GET("/health", healthHandler)',
        '  api := r.Group("/api")',
        '  controller := &Controller{}',
        '  api.POST("/users", controller.CreateUser)',
        '}',
        '',
        'func healthHandler(c *gin.Context) {',
        '  writeHealth()',
        '}',
        '',
        'func writeHealth() {}',
        '',
        'func (c *Controller) CreateUser(ctx *gin.Context) {',
        '  saveUser()',
        '}',
        '',
        'func saveUser() {}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status, `stdout:\n${indexResult.stdout}\nstderr:\n${indexResult.stderr}`).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const routes = cg.getNodesByKind('route');
      const healthRoute = routes.find((node) => node.name === 'GET /health');
      const createUserRoute = routes.find((node) => node.name === 'POST /api/users');
      const healthHandler = cg.searchNodes('healthHandler').find((match) => match.node.kind === 'function')?.node;
      const writeHealth = cg.searchNodes('writeHealth').find((match) => match.node.kind === 'function')?.node;
      const createUser = cg.searchNodes('Controller.CreateUser').find((match) => match.node.kind === 'method')?.node;
      const saveUser = cg.searchNodes('saveUser').find((match) => match.node.kind === 'function')?.node;

      expect(healthRoute).toBeDefined();
      expect(createUserRoute).toBeDefined();
      expect(healthHandler).toBeDefined();
      expect(writeHealth).toBeDefined();
      expect(createUser).toBeDefined();
      expect(saveUser).toBeDefined();

      const healthRouteEdges = cg.getOutgoingEdges(healthRoute!.id).filter((edge) => edge.kind === 'references');
      const createUserRouteEdges = cg.getOutgoingEdges(createUserRoute!.id).filter((edge) => edge.kind === 'references');
      const healthHandlerCalls = cg.getOutgoingEdges(healthHandler!.id).filter((edge) => edge.kind === 'calls');
      const createUserCalls = cg.getOutgoingEdges(createUser!.id).filter((edge) => edge.kind === 'calls');

      expect(healthRouteEdges.some((edge) => edge.target === healthHandler!.id)).toBe(true);
      expect(createUserRouteEdges.some((edge) => edge.target === createUser!.id)).toBe(true);
      expect(healthHandlerCalls.some((edge) => edge.target === writeHealth!.id)).toBe(true);
      expect(createUserCalls.some((edge) => edge.target === saveUser!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('keeps indexing valid JavaScript files when one JavaScript file has a parse error', () => {
    fs.writeFileSync(
      path.join(tempDir, 'valid.js'),
      [
        'export function stillIndexed() {',
        '  return 42;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'broken.js'), 'export function broken( {\n');

    const indexResult = spawnSync(RUST_CORE_BIN, [
      'index',
      '--engine',
      'rust',
      '--project-path',
      tempDir,
      '--index-path',
      path.join(tempDir, '.zcodegraph', 'zcodegraph.db'),
    ], {
      cwd: tempDir,
      encoding: 'utf-8',
    });
    expect(indexResult.status).toBe(0);

    const resultLine = indexResult.stdout
      .trim()
      .split('\n')
      .filter((line) => line.includes('"type":"result"'))
      .pop();
    expect(resultLine).toBeDefined();
    const result = JSON.parse(resultLine!) as {
      filesErrored: number;
      errors: Array<{ message: string; filePath?: string; code?: string; severity?: string; writtenByRust?: boolean }>;
    };
    expect(result.filesErrored).toBeGreaterThanOrEqual(1);
    expect(result.errors).toContainEqual(expect.objectContaining({
      message: 'parse error',
      filePath: 'broken.js',
      code: 'rust-owned-parse-gap',
      severity: 'warning',
      writtenByRust: false,
    }));

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('stillIndexed').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('broken.js').some((match) => match.node.kind === 'file')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('skips unsupported Phase 1 languages while indexing supported files', () => {
    fs.writeFileSync(
      path.join(tempDir, 'supported.ts'),
      [
        'export function supportedSymbol() {',
        '  return 7;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# not indexed by the Rust Phase 1 engine\n');

    const indexResult = spawnSync(RUST_CORE_BIN, [
      'index',
      '--engine',
      'rust',
      '--project-path',
      tempDir,
      '--index-path',
      path.join(tempDir, '.zcodegraph', 'zcodegraph.db'),
    ], {
      cwd: tempDir,
      encoding: 'utf-8',
    });
    expect(indexResult.status).toBe(0);

    const resultLine = indexResult.stdout
      .trim()
      .split('\n')
      .filter((line) => line.includes('"type":"result"'))
      .pop();
    expect(resultLine).toBeDefined();
    const result = JSON.parse(resultLine!) as {
      filesIndexed: number;
      filesSkipped: number;
      filesErrored: number;
      errors: Array<{ message: string }>;
    };
    expect(result.filesIndexed).toBeGreaterThanOrEqual(2);
    expect(result.filesSkipped).toBe(0);
    expect(result.filesErrored).toBe(0);
    expect(result.errors).toEqual([]);

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('supportedSymbol').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('README.md').some((match) => match.node.kind === 'file')).toBe(false);
      expect(cg.getStats().filesByLanguage).not.toHaveProperty('markdown');
    } finally {
      cg.close();
    }
  }, 30_000);

  it('serves Rust-produced indexes through MCP search and graph tools', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'callee.ts'),
      [
        'export function mcpHelper() {',
        '  return 42;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'caller.ts'),
      [
        'import { mcpHelper } from "./callee";',
        'export function mcpEntry() {',
        '  return mcpHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const handler = new ToolHandler(cg);
      const search = await handler.execute('zcodegraph_search', { query: 'mcpHelper' });
      expect(search.isError).toBeFalsy();
      expect(search.content[0].text).toContain('mcpHelper');

      const callers = await handler.execute('zcodegraph_callers', { symbol: 'mcpHelper' });
      expect(callers.isError).toBeFalsy();
      expect(callers.content[0].text).toContain('mcpEntry');

      const callees = await handler.execute('zcodegraph_callees', { symbol: 'mcpEntry' });
      expect(callees.isError).toBeFalsy();
      expect(callees.content[0].text).toContain('mcpHelper');
    } finally {
      cg.close();
    }
  }, 30_000);

  it('treats exported arrow-function constants as callable functions in Rust-produced indexes', () => {
    fs.writeFileSync(
      path.join(tempDir, 'renderer.ts'),
      [
        'const localImpl = () => {',
        '  return 1;',
        '};',
        '',
        'export const renderPublic = () => {',
        '  return localImpl();',
        '};',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'canvas.ts'),
      [
        'import { renderPublic } from "./renderer";',
        'export function StaticCanvas() {',
        '  return renderPublic();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const renderPublic = cg.searchNodes('renderPublic').find((match) => match.node.kind === 'function')?.node;
      const localImpl = cg.searchNodes('localImpl').find((match) => match.node.kind === 'function')?.node;
      const staticCanvas = cg.searchNodes('StaticCanvas').find((match) => match.node.kind === 'function')?.node;
      expect(renderPublic).toBeDefined();
      expect(localImpl).toBeDefined();
      expect(staticCanvas).toBeDefined();

      expect(cg.getCallees(staticCanvas!.id).some((entry) => entry.node.id === renderPublic!.id)).toBe(true);
      expect(cg.getCallees(renderPublic!.id).some((entry) => entry.node.id === localImpl!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('treats class field arrow callbacks as callable methods in Rust-produced indexes', () => {
    fs.writeFileSync(
      path.join(tempDir, 'scene.ts'),
      [
        'type Callback = () => void;',
        'export class Scene {',
        '  private callbacks = new Set<Callback>();',
        '  triggerUpdate() {',
        '    for (const callback of Array.from(this.callbacks)) {',
        '      callback();',
        '    }',
        '  }',
        '  onUpdate(cb: Callback) {',
        '    this.callbacks.add(cb);',
        '  }',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'app.ts'),
      [
        'import { Scene } from "./scene";',
        'export class App extends React.Component {',
        '  scene = new Scene();',
        '  triggerRender = () => {',
        '    this.setState({});',
        '  };',
        '  render() {',
        '    return null;',
        '  }',
        '  mount() {',
        '    this.scene.onUpdate(this.triggerRender);',
        '  }',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const triggerUpdate = cg.searchNodes('triggerUpdate').find((match) => match.node.kind === 'method')?.node;
      const triggerRender = cg.searchNodes('triggerRender').find((match) => match.node.kind === 'method')?.node;
      const render = cg.searchNodes('render').find((match) => match.node.kind === 'method')?.node;
      const app = cg.searchNodes('App').find((match) => match.node.kind === 'class')?.node;
      expect(app).toBeDefined();
      expect(triggerUpdate).toBeDefined();
      expect(triggerRender).toBeDefined();
      expect(render).toBeDefined();

      expect(cg.getCallees(triggerUpdate!.id).some((entry) => (
        entry.node.id === triggerRender!.id &&
        entry.edge.kind === 'calls' &&
        entry.edge.edgeOrigin === 'heuristic'
      ))).toBe(true);
      expect(cg.getCallees(triggerRender!.id).some((entry) => (
        entry.node.id === render!.id &&
        entry.edge.kind === 'calls' &&
        entry.edge.edgeOrigin === 'heuristic'
      ))).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('indexes TypeScript, JSX, and TSX symbols through the Rust engine', () => {
    fs.writeFileSync(
      path.join(tempDir, 'helpers.js'),
      [
        'import { loadUser } from "./models";',
        'function localHelper() { return loadUser("1"); }',
        'export function exportedHelper() { return localHelper(); }',
        'class LocalWidget {',
        '  constructor() {}',
        '  render() { return exportedHelper(); }',
        '}',
        'export class ExportedWidget {',
        '  render() { return new LocalWidget(); }',
        '}',
        'let mutableCount = 0;',
        'const JS_LIMIT = 3;',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'models.ts'),
      [
        'import { ProfileCard } from "./card";',
        'export { ProfileCard } from "./card";',
        'export interface User { id: UserId; name: string }',
        'export type UserId = string;',
        'export const DEFAULT_LIMIT = 25;',
        'let mutableUser: User | null = null;',
        'export function loadUser(id: UserId): User {',
        '  return { id, name: "Ada" };',
        '}',
        'export class UserService {',
        '  cache = new Map<string, User>();',
        '  constructor() {}',
        '  get(id: UserId): User { return loadUser(id); }',
        '}',
        'export const store = {',
        '  fetchUser(id: UserId) { return loadUser(id); },',
        '};',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'card.jsx'),
      [
        'export function ProfileCard(props) {',
        '  return <section><Avatar /></section>;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'dashboard.tsx'),
      [
        'export const Dashboard = () => {',
        '  const service = new UserService();',
        '  return <ProfileCard name={service.get("1")} />;',
        '};',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const statusResult = runZcodegraphCli(tempDir, ['status', '--json']);
    const statusLine = statusResult.stdout.trim().split('\n').filter(Boolean).pop();
    const status = JSON.parse(statusLine!) as { languages: string[] };
    expect(status.languages).toEqual(expect.arrayContaining(['typescript', 'jsx', 'tsx']));

    const cg = CodeGraph.openSync(tempDir);
    try {
      expect(cg.searchNodes('localHelper').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('exportedHelper').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('LocalWidget').some((match) => match.node.kind === 'class')).toBe(true);
      expect(cg.searchNodes('ExportedWidget').some((match) => match.node.kind === 'class')).toBe(true);
      expect(cg.searchNodes('mutableCount').some((match) => match.node.kind === 'variable')).toBe(true);
      expect(cg.searchNodes('JS_LIMIT').some((match) => match.node.kind === 'constant')).toBe(true);
      expect(cg.searchNodes('User').some((match) => match.node.kind === 'interface')).toBe(true);
      expect(cg.searchNodes('UserId').some((match) => match.node.kind === 'type_alias')).toBe(true);
      expect(cg.searchNodes('DEFAULT_LIMIT').some((match) => match.node.kind === 'constant')).toBe(true);
      expect(cg.searchNodes('mutableUser').some((match) => match.node.kind === 'variable')).toBe(true);
      expect(cg.searchNodes('loadUser').some((match) => match.node.kind === 'function')).toBe(true);
      expect(cg.searchNodes('UserService').some((match) => match.node.kind === 'class')).toBe(true);
      expect(cg.searchNodes('cache').some((match) => match.node.kind === 'field')).toBe(true);
      expect(cg.searchNodes('constructor').some((match) => match.node.kind === 'method')).toBe(true);
      expect(cg.searchNodes('fetchUser').some((match) => match.node.kind === 'method')).toBe(true);
      expect(cg.searchNodes('ProfileCard').some((match) => match.node.kind === 'component')).toBe(true);
      expect(cg.searchNodes('Dashboard').some((match) => match.node.kind === 'component')).toBe(true);

      const db = (cg as unknown as { db: { getDb(): { prepare(sql: string): { all(): unknown[] } } } }).db.getDb();
      const symbolRows = db.prepare(
        "SELECT kind, name FROM nodes WHERE kind IN ('import', 'export') ORDER BY kind, name",
      ).all() as Array<{ kind: string; name: string }>;
      expect(symbolRows).toEqual(
        expect.arrayContaining([
          { kind: 'import', name: './models' },
          { kind: 'import', name: './card' },
          { kind: 'export', name: './card' },
        ]),
      );

      const localHelper = cg.searchNodes('localHelper').find((match) => match.node.kind === 'function')!.node;
      const exportedHelper = cg.searchNodes('exportedHelper').find((match) => match.node.kind === 'function')!.node;
      const loadUser = cg.searchNodes('loadUser').find((match) => match.node.kind === 'function')!.node;
      const dashboard = cg.searchNodes('Dashboard').find((match) => match.node.kind === 'component')!.node;
      const profileCard = cg.searchNodes('ProfileCard').find((match) => match.node.kind === 'component')!.node;

      expect(cg.getCallers(localHelper.id).some((entry) => entry.node.id === exportedHelper.id)).toBe(true);
      expect(cg.getCallees(exportedHelper.id).some((entry) => entry.node.id === localHelper.id)).toBe(true);
      expect(cg.getCallers(loadUser.id).some((entry) => entry.node.id === localHelper.id)).toBe(true);
      expect(cg.getCallees(dashboard.id).some((entry) => entry.node.id === profileCard.id)).toBe(true);

      const sourceRows = db.prepare(
        "SELECT name, kind, language, start_line AS startLine, start_column AS startColumn FROM nodes WHERE name IN ('helpers.js', 'localHelper', 'mutableUser', 'cache', 'ProfileCard', 'Dashboard')",
      ).all() as Array<{
        name: string;
        kind: string;
        language: string;
        startLine: number;
        startColumn: number;
      }>;
      expect(sourceRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'helpers.js', kind: 'file', language: 'javascript' }),
          expect.objectContaining({ name: 'localHelper', kind: 'function', language: 'javascript' }),
          expect.objectContaining({ name: 'mutableUser', kind: 'variable', language: 'typescript' }),
          expect.objectContaining({ name: 'cache', kind: 'field', language: 'typescript' }),
          expect.objectContaining({ name: 'ProfileCard', kind: 'component', language: 'jsx' }),
          expect.objectContaining({ name: 'Dashboard', kind: 'component', language: 'tsx' }),
        ]),
      );
      for (const row of sourceRows) {
        expect(row.startLine).toBeGreaterThanOrEqual(1);
        expect(row.startColumn).toBeGreaterThanOrEqual(0);
      }
    } finally {
      cg.close();
    }
  }, 30_000);

  it('resolves Rust-extracted cross-file references through TypeScript graph queries', () => {
    fs.writeFileSync(
      path.join(tempDir, 'callee.ts'),
      [
        'export function sharedHelper() {',
        '  return 42;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'caller.ts'),
      [
        'import { sharedHelper } from "./callee";',
        'export function runFeature() {',
        '  return sharedHelper();',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const helper = cg.searchNodes('sharedHelper').find((match) => match.node.kind === 'function')?.node;
      const caller = cg.searchNodes('runFeature').find((match) => match.node.kind === 'function')?.node;
      expect(helper).toBeDefined();
      expect(caller).toBeDefined();

      expect(cg.getCallers(helper!.id).some((entry) => entry.node.id === caller!.id)).toBe(true);
      expect(cg.getCallees(caller!.id).some((entry) => entry.node.id === helper!.id)).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);

  it('runs dynamic synthesizers after Rust extraction so JSX child edges are queryable', () => {
    fs.writeFileSync(
      path.join(tempDir, 'Child.tsx'),
      [
        'export function ChildWidget() {',
        '  return <span />;',
        '}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tempDir, 'Parent.tsx'),
      [
        'import { ChildWidget } from "./Child";',
        'export function ParentWidget() {',
        '  return <ChildWidget />;',
        '}',
      ].join('\n') + '\n',
    );

    const indexResult = runZcodegraphCli(tempDir, ['index', '--engine', 'rust', '--quiet'], {
      ZCODEGRAPH_RUST_CORE_BINARY: RUST_CORE_BIN,
    });
    expect(indexResult.status).toBe(0);

    const cg = CodeGraph.openSync(tempDir);
    try {
      const parent = cg.searchNodes('ParentWidget').find((match) => match.node.kind === 'component')?.node;
      const child = cg.searchNodes('ChildWidget').find((match) => match.node.kind === 'component')?.node;
      expect(parent).toBeDefined();
      expect(child).toBeDefined();

      const childEdges = cg.getCallees(parent!.id);
      expect(childEdges.some((entry) => entry.node.id === child!.id && entry.edge.kind === 'calls')).toBe(true);
    } finally {
      cg.close();
    }
  }, 30_000);
});
