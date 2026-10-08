import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CodeGraph } from '../src';
import { initGrammars, loadAllGrammars } from '../src/extraction/grammars';

beforeAll(async () => {
  await initGrammars();
  await loadAllGrammars();
});

describe('Django end-to-end framework extraction', () => {
  let tmpDir: string | undefined;
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it('creates a route->view edge from urls.py to view class', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-django-'));
    fs.writeFileSync(path.join(tmpDir, 'manage.py'), '# marker\n');
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'django==4.2\n');
    fs.mkdirSync(path.join(tmpDir, 'users'));
    fs.writeFileSync(path.join(tmpDir, 'users/__init__.py'), '');
    fs.writeFileSync(
      path.join(tmpDir, 'users/views.py'),
      'class UserListView:\n    def get(self, request): pass\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'users/urls.py'),
      'from django.urls import path\n' +
        'from users.views import UserListView\n' +
        'urlpatterns = [path("users/", UserListView.as_view(), name="user-list")]\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'typescript' });

    // Route node exists
    const routes = cg.getNodesByKind('route');
    expect(routes.length).toBeGreaterThan(0);
    const route = routes.find((n) => n.name === 'users/');
    expect(route).toBeDefined();

    // View class exists
    const classNodes = cg.getNodesByKind('class');
    const view = classNodes.find((n) => n.name === 'UserListView');
    expect(view).toBeDefined();

    // Edge route -> view exists
    const edges = cg.getOutgoingEdges(route!.id);
    const toView = edges.find((e) => e.target === view!.id);
    expect(toView).toBeDefined();
    expect(toView!.kind).toBe('references');

    cg.close();
  });
});

describe('Flask end-to-end framework extraction', () => {
  let tmpDir: string | undefined;
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it('resolves stacked routes across @login_required to a view named after a builtin (index)', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-flask-'));
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'flask==3.0\n');
    fs.writeFileSync(
      path.join(tmpDir, 'app.py'),
      'from flask import Blueprint, render_template\n' +
        'from flask_login import login_required\n' +
        'bp = Blueprint("main", __name__)\n' +
        '\n' +
        '@bp.route("/", methods=["GET", "POST"])\n' +
        '@bp.route("/index", methods=["GET", "POST"])\n' +
        '@login_required\n' +
        'def index():\n' +
        '    return render_template("index.html")\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'typescript' });

    // Both stacked @bp.route decorators are extracted (the second was previously
    // dropped because @login_required broke the "def must follow" assumption).
    const routes = cg.getNodesByKind('route');
    expect(routes.map((r) => r.name).sort()).toEqual(['GET /', 'GET /index']);

    // The view function exists even though its name is a Python builtin method.
    const fn = cg.getNodesByKind('function').find((n) => n.name === 'index');
    expect(fn).toBeDefined();

    // Both routes resolve to it — exercises the bare-name builtin guard, which
    // previously filtered the `index` reference as a builtin method.
    for (const route of routes) {
      const edges = cg.getOutgoingEdges(route.id);
      const toView = edges.find((e) => e.target === fn!.id && e.kind === 'references');
      expect(toView, `route ${route.name} should resolve to index()`).toBeDefined();
    }

    cg.close();
  });
});

// Python framework routes on the DEFAULT rust-hybrid engine (roadmap 1-6-2).
// Python is rust-owned, so python files never enter the TypeScript fallback
// pass, and the Rust core does not implement Django/Flask/FastAPI route
// extraction (only axum/Rust attribute routes, Go Gin, and NestJS post-extract
// updates). Roadmap 1-6-2-4 fixed this by re-running the TypeScript python
// framework route extractors during finalizeRustIndex (after post-extract,
// before batched reference resolution), inserting route nodes + unresolved
// refs that resolve into route -> handler `references` edges. The three
// cases below were tracked skips encoding the intended seam (0% route recall
// on django-realworld/fastapi-realworld, confirmed 2026-09-30) and are now
// active contracts; their titles are registered in ci.yml step2's -t filter.
describe('Python framework routes on rust-hybrid (roadmap 1-6-2-4 restored)', () => {
  let tmpDir: string | undefined;
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  // roadmap 1-6-2-4: Django path() route + route->view edge restored on rust-hybrid.
  it('creates a route->view edge from urls.py to view class on rust-hybrid', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-django-rh-'));
    fs.writeFileSync(path.join(tmpDir, 'manage.py'), '# marker\n');
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'django==4.2\n');
    fs.mkdirSync(path.join(tmpDir, 'users'));
    fs.writeFileSync(path.join(tmpDir, 'users/__init__.py'), '');
    fs.writeFileSync(
      path.join(tmpDir, 'users/views.py'),
      'class UserListView:\n    def get(self, request):\n        return None\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'users/urls.py'),
      'from django.urls import path\n' +
        'from users.views import UserListView\n' +
        "urlpatterns = [path('users/', UserListView.as_view(), name='user-list')]\n"
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'rust-hybrid' });

    const route = cg.getNodesByKind('route').find((n) => n.name === 'users/');
    expect(route).toBeDefined();
    const view = cg.getNodesByKind('class').find((n) => n.name === 'UserListView');
    expect(view).toBeDefined();
    const toView = cg.getOutgoingEdges(route!.id).find((e) => e.target === view!.id);
    expect(toView).toBeDefined();
    expect(toView!.kind).toBe('references');

    cg.close();
  });

  // roadmap 1-6-2-4: Flask @bp.route decorator routes restored on rust-hybrid.
  it('extracts stacked @bp.route nodes and resolves them to the view on rust-hybrid', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-flask-rh-'));
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'flask==3.0\n');
    fs.writeFileSync(
      path.join(tmpDir, 'app.py'),
      'from flask import Blueprint\n' +
        'bp = Blueprint("main", __name__)\n' +
        '\n' +
        '@bp.route("/", methods=["GET", "POST"])\n' +
        '@bp.route("/index")\n' +
        'def index():\n' +
        '    return "ok"\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'rust-hybrid' });

    const routes = cg.getNodesByKind('route');
    expect(routes.map((r) => r.name).sort()).toEqual(['GET /', 'GET /index']);
    const fn = cg.getNodesByKind('function').find((n) => n.name === 'index');
    expect(fn).toBeDefined();
    for (const route of routes) {
      const toView = cg.getOutgoingEdges(route.id).find((e) => e.target === fn!.id && e.kind === 'references');
      expect(toView, `route ${route.name} should resolve to index()`).toBeDefined();
    }

    cg.close();
  });

  // roadmap 1-6-2-4: FastAPI @app.METHOD decorator routes restored on rust-hybrid.
  it('extracts FastAPI @app.get/@app.post routes and resolves them to handlers on rust-hybrid', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-fastapi-rh-'));
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'fastapi\n');
    fs.writeFileSync(
      path.join(tmpDir, 'main.py'),
      'from fastapi import FastAPI\n' +
        'app = FastAPI()\n' +
        '\n' +
        '@app.get("/items")\n' +
        'def list_items():\n' +
        '    return []\n' +
        '\n' +
        '@app.post("/items")\n' +
        'def create_item(item_id: int):\n' +
        '    return item_id\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'rust-hybrid' });

    const routes = cg.getNodesByKind('route');
    expect(routes.map((r) => r.name).sort()).toEqual(['GET /items', 'POST /items']);
    for (const [routeName, handlerName] of [['GET /items', 'list_items'], ['POST /items', 'create_item']] as const) {
      const route = routes.find((r) => r.name === routeName);
      expect(route, `route ${routeName}`).toBeDefined();
      const handler = cg.getNodesByKind('function').find((n) => n.name === handlerName);
      expect(handler, `handler ${handlerName}`).toBeDefined();
      const edge = cg.getOutgoingEdges(route!.id).find((e) => e.target === handler!.id && e.kind === 'references');
      expect(edge, `route ${routeName} -> ${handlerName}`).toBeDefined();
    }

    cg.close();
  });
});

describe('NestJS end-to-end framework post-extract boundary', () => {
  let tmpDir: string | undefined;
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it('applies RouterModule prefixes before the final graph is consumed', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-nest-post-extract-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ dependencies: { '@nestjs/common': '10.0.0' } }));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'src/app.module.ts'),
      [
        "import { Module } from '@nestjs/common';",
        "import { RouterModule } from '@nestjs/core';",
        "import { UsersModule } from './users.module';",
        '',
        '@Module({',
        '  imports: [',
        '    UsersModule,',
        '    RouterModule.register([{ path: "admin", module: UsersModule }]),',
        '  ],',
        '})',
        'export class AppModule {}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tmpDir, 'src/users.module.ts'),
      [
        "import { Module } from '@nestjs/common';",
        "import { UsersController } from './users.controller';",
        '',
        '@Module({ controllers: [UsersController] })',
        'export class UsersModule {}',
      ].join('\n') + '\n',
    );
    fs.writeFileSync(
      path.join(tmpDir, 'src/users.controller.ts'),
      [
        "import { Controller, Get } from '@nestjs/common';",
        '',
        '@Controller("users")',
        'export class UsersController {',
        '  @Get(":id")',
        '  findOne() { return "ok"; }',
        '}',
      ].join('\n') + '\n',
    );

    const cg = CodeGraph.initSync(tmpDir);
    try {
      const result = await cg.indexAll({ engine: 'typescript' });
      expect(result.success).toBe(true);

      const routes = cg.getNodesByKind('route');
      expect(routes.some((route) => route.name === 'GET /admin/users/:id')).toBe(true);
      expect(routes.some((route) => route.name === 'GET /users/:id')).toBe(false);

      const handler = cg.getNodesByKind('method').find((node) => node.name === 'findOne');
      const route = routes.find((node) => node.name === 'GET /admin/users/:id');
      expect(handler).toBeDefined();
      expect(route).toBeDefined();
      expect(cg.getOutgoingEdges(route!.id).some((edge) => (
        edge.kind === 'references' && edge.target === handler!.id
      ))).toBe(true);
    } finally {
      cg.close();
    }
  });
});

describe('Flutter end-to-end — setState→build synthesis', () => {
  let tmpDir: string | undefined;
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it('synthesizes a handler→build edge when a State method calls setState', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-flutter-'));
    fs.writeFileSync(
      path.join(tmpDir, 'main.dart'),
      'import "package:flutter/material.dart";\n' +
        'class CounterPage extends StatefulWidget {\n' +
        '  @override\n' +
        '  State<CounterPage> createState() => _CounterPageState();\n' +
        '}\n' +
        'class _CounterPageState extends State<CounterPage> {\n' +
        '  int _count = 0;\n' +
        '  void _increment() {\n' +
        '    setState(() {\n' +
        '      _count++;\n' +
        '    });\n' +
        '  }\n' +
        '  @override\n' +
        '  Widget build(BuildContext context) {\n' +
        '    return Text("$_count");\n' +
        '  }\n' +
        '}\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'typescript' });

    const methods = cg.getNodesByKind('method');
    const increment = methods.find((n) => n.name === '_increment');
    const build = methods.find((n) => n.name === 'build');
    expect(increment).toBeDefined();
    expect(build).toBeDefined();

    // setState re-runs build (Flutter-internal, no static edge). The synthesizer
    // bridges the handler → build so the "tap → setState → rebuilt UI" flow connects.
    const edges = cg.getOutgoingEdges(increment!.id);
    const toBuild = edges.find((e) => e.target === build!.id && e.kind === 'calls');
    expect(toBuild, '_increment should reach build via setState synthesis').toBeDefined();

    cg.close();
  });
});

// The old TypeScript C++ extractor was removed in favor of Rust ownership.
// #692 wave-0 probe (2026-09-28) showed these receiver cases could not be
// re-activated on the Rust graph. G4 (roadmap 1-2-3-1, FIXED) closed all three
// underlying gaps in the Rust core: (1) `m_cpAlg->Processing()` now preserves
// the receiver as a `m_cpAlg.Processing` call ref (tree-sitter-cpp models both
// `.` and `->` as field_expression; `->` normalizes to `.`) so the TS shell's
// inferCppReceiverType runs and resolves the typed-pointer callee across the
// .hpp/.cpp split; (2) out-of-class `int CDetect::Run(){}` definitions are now
// kind `method` with a `Class::method` qualifiedName (the resolver hard-filters
// kind == 'method'); (3) `int r = ...->Processing()` creates variable `r`, no
// longer a spurious `Processing` variable. G2 (extends) + G3 (inline methods)
// landed earlier; the non-receiver virtual-override bridge is the separate
// ACTIVE describe below.
describe('C++ end-to-end — typed pointer callers (rust-hybrid) (G4)', () => {
  // Rust qualifiedName is always `relative_path::[scope::]Class::method`; the
  // #445-era assertions compared the bare `Class::method` tail, so reduce to
  // the last two segments (Class::method) for the caller/callee comparisons.
  const classMethodTail = (qualifiedName: string): string =>
    qualifiedName.split('::').slice(-2).join('::');
  let tmpDir: string | undefined;
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it('resolves callers through typed object pointers', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cpp-'));
    let cg: CodeGraph | undefined;
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'detect.hpp'),
        'class CDetect {\n' +
          ' public:\n' +
          '  int Processing();\n' +
          '};\n' +
          'class CDetector {\n' +
          ' private:\n' +
          '  CDetect* m_cpAlg = nullptr;\n' +
          ' public:\n' +
          '  int Run();\n' +
          '  int Flush();\n' +
          '};\n'
      );
      fs.writeFileSync(
        path.join(tmpDir, 'detect.cpp'),
        '#include "detect.hpp"\n' +
          'int CDetector::Run() { return m_cpAlg->Processing(); }\n' +
          'int CDetector::Flush() { return m_cpAlg->Processing(); }\n' +
          'int CDetect::Processing() { return 0; }\n'
      );

      cg = CodeGraph.initSync(tmpDir);
      await cg.indexAll({ engine: 'rust-hybrid' });

      const processing = cg
        .getNodesByKind('method')
        .find((n) => n.qualifiedName.endsWith('CDetect::Processing'));
      expect(processing).toBeDefined();

      const callers = cg.getCallers(processing!.id).map((c) => classMethodTail(c.node.qualifiedName));
      expect(callers).toContain('CDetector::Run');
      expect(callers).toContain('CDetector::Flush');

      const runMethod = cg
        .getNodesByKind('method')
        .find((n) => n.qualifiedName.endsWith('CDetector::Run'));
      expect(runMethod).toBeDefined();
      const callees = cg.getCallees(runMethod!.id).map((c) => classMethodTail(c.node.qualifiedName));
      expect(callees).toContain('CDetect::Processing');
    } finally {
      cg?.close();
    }
  });

  it('resolves typed pointer callers when the method name is ambiguous and the call sits inside a return/declaration', async () => {
    // Regression: an earlier version of the C++ receiver-type inference matched
    // the call line itself (`return m_cpAlg->Processing()`) and treated `return`
    // as the type, OR grabbed `int r =` as a type from the prefix. With Strategy
    // 3's "unique method name" fallback, the original issue example resolved
    // anyway — but as soon as two classes share a method name (very common in
    // real C++), both calls go unresolved.
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cpp-'));
    let cg: CodeGraph | undefined;
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'detect.hpp'),
        'class CDetect { public: int Processing(); };\n' +
          'class CWidget { public: int Processing(); };\n' +
          'class CDetector {\n' +
          ' private:\n' +
          '  CDetect* m_cpAlg = nullptr;\n' +
          ' public:\n' +
          '  int RunReturn();\n' +
          '  int RunAssign();\n' +
          '};\n'
      );
      fs.writeFileSync(
        path.join(tmpDir, 'detect.cpp'),
        '#include "detect.hpp"\n' +
          'int CDetector::RunReturn() { return m_cpAlg->Processing(); }\n' +
          'int CDetector::RunAssign() { int r = m_cpAlg->Processing(); return r; }\n' +
          'int CDetect::Processing() { return 0; }\n' +
          'int CWidget::Processing() { return 0; }\n'
      );

      cg = CodeGraph.initSync(tmpDir);
      await cg.indexAll({ engine: 'rust-hybrid' });

      const detectProc = cg
        .getNodesByKind('method')
        .find((n) => n.qualifiedName.endsWith('CDetect::Processing'));
      const widgetProc = cg
        .getNodesByKind('method')
        .find((n) => n.qualifiedName.endsWith('CWidget::Processing'));
      expect(detectProc).toBeDefined();
      expect(widgetProc).toBeDefined();

      const detectCallers = cg
        .getCallers(detectProc!.id)
        .map((c) => classMethodTail(c.node.qualifiedName));
      expect(detectCallers).toContain('CDetector::RunReturn');
      expect(detectCallers).toContain('CDetector::RunAssign');

      // CWidget::Processing is never called — calls must NOT misroute here.
      const widgetCallers = cg
        .getCallers(widgetProc!.id)
        .map((c) => classMethodTail(c.node.qualifiedName));
      expect(widgetCallers).not.toContain('CDetector::RunReturn');
      expect(widgetCallers).not.toContain('CDetector::RunAssign');
    } finally {
      cg?.close();
    }
  });
});

// G2 (extends edge) + G3 (inline class methods are kind `method`) together
// unlock the queries-only cppOverrideEdges synthesizer: both the base virtual
// and the subclass override are now `method` nodes contained by classes linked
// by an `extends` edge, so the base method bridges to the override. This case
// has no `obj->method()` receiver call, so it does not need G4.
describe('C++ virtual override synthesis (rust-hybrid) (G2+G3)', () => {
  let tmpDir: string | undefined;
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it('bridges a base virtual method to the subclass override', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cpp-'));
    fs.writeFileSync(
      path.join(tmpDir, 'iter.cpp'),
      'class Iterator {\n' +
        ' public:\n' +
        '  virtual void Next() { }\n' +
        '};\n' +
        'class DBIter : public Iterator {\n' +
        ' public:\n' +
        '  void Next() override { advance(); }\n' +
        '  void advance() { }\n' +
        '};\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'rust-hybrid' });

    // Two methods named Next: the base virtual (lower line) and the override.
    const nexts = cg
      .getNodesByKind('method')
      .filter((n) => n.name === 'Next')
      .sort((a, b) => a.startLine - b.startLine);
    expect(nexts.length).toBe(2);
    const [baseNext, overrideNext] = nexts;

    // A vtable call to Iterator::Next dispatches to DBIter::Next — bridge it so
    // trace/callees from the interface method reaches the implementation.
    const edge = cg
      .getOutgoingEdges(baseNext!.id)
      .find((e) => e.target === overrideNext!.id && e.kind === 'calls');
    expect(edge, 'Iterator::Next should reach DBIter::Next via override synthesis').toBeDefined();

    cg.close();
  });
});

describe('Java end-to-end — field-injected bean trace (issue #389)', () => {
  let tmpDir: string | undefined;
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  // Mirrors the issue's Spring MVC pattern:
  //   UserAction(@Resource UserBO userbo).toLogin2() -> this.userbo.toLogin2()
  //     -> UserBO.toLogin2() -> userService.toLogin() -> UserService.toLogin (iface)
  //     -> UserServiceImpl.toLogin() via interface→impl synthesis.
  // Without the extractor `this.` strip + field-typed receiver lookup, the very
  // first hop (controller -> bean) was missing entirely, breaking trace.
  it('connects controller -> @Resource bean -> interface -> impl end-to-end', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-spring-bean-'));
    const javaDir = path.join(tmpDir, 'src/main/java/com/example/user');
    fs.mkdirSync(path.join(javaDir, 'action'), { recursive: true });
    fs.mkdirSync(path.join(javaDir, 'bo'), { recursive: true });
    fs.mkdirSync(path.join(javaDir, 'service'), { recursive: true });
    fs.mkdirSync(path.join(javaDir, 'service/impl'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'pom.xml'),
      '<project><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>\n'
    );
    fs.writeFileSync(
      path.join(javaDir, 'action/UserAction.java'),
      'package com.example.user.action;\n' +
        'import com.example.user.bo.UserBO;\n' +
        'import javax.annotation.Resource;\n' +
        '@org.springframework.stereotype.Controller\n' +
        'public class UserAction {\n' +
        '  @Resource(name = "userBO") private UserBO userbo;\n' +
        '  public void toLogin2() { this.userbo.toLogin2(); }\n' +
        '}\n'
    );
    fs.writeFileSync(
      path.join(javaDir, 'bo/UserBO.java'),
      'package com.example.user.bo;\n' +
        'import com.example.user.service.UserService;\n' +
        'import javax.annotation.Resource;\n' +
        '@org.springframework.stereotype.Component("userBO")\n' +
        'public class UserBO {\n' +
        '  @Resource private UserService userService;\n' +
        '  public void toLogin2() { userService.toLogin(); }\n' +
        '}\n'
    );
    fs.writeFileSync(
      path.join(javaDir, 'service/UserService.java'),
      'package com.example.user.service;\n' +
        'public interface UserService { void toLogin(); }\n'
    );
    fs.writeFileSync(
      path.join(javaDir, 'service/impl/UserServiceImpl.java'),
      'package com.example.user.service.impl;\n' +
        'import com.example.user.service.UserService;\n' +
        '@org.springframework.stereotype.Service("userService")\n' +
        'public class UserServiceImpl implements UserService {\n' +
        '  public void toLogin() { }\n' +
        '}\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'rust-hybrid' });

    const methods = cg.getNodesByKind('method');
    const find = (cls: string, name: string) =>
      methods.find((m) => m.name === name && m.filePath.endsWith(`${cls}.java`));

    const action = find('UserAction', 'toLogin2');
    const bo = find('UserBO', 'toLogin2');
    const svc = find('UserService', 'toLogin');
    const impl = find('UserServiceImpl', 'toLogin');
    expect(action).toBeDefined();
    expect(bo).toBeDefined();
    expect(svc).toBeDefined();
    expect(impl).toBeDefined();

    // UserAction.toLogin2 -> UserBO.toLogin2 (the regressed hop — `this.userbo`
    // receiver was emitted verbatim and the field-type lookup didn't exist).
    const actionToBo = cg.getOutgoingEdges(action!.id).find((e) => e.target === bo!.id);
    expect(actionToBo, 'controller `this.userbo.toLogin2()` should reach UserBO.toLogin2').toBeDefined();
    expect(actionToBo!.kind).toBe('calls');

    // UserBO.toLogin2 -> UserService.toLogin (plain identifier receiver, works pre-fix).
    const boToSvc = cg.getOutgoingEdges(bo!.id).find((e) => e.target === svc!.id);
    expect(boToSvc).toBeDefined();

    // UserService.toLogin -> UserServiceImpl.toLogin (interface->impl synth).
    const svcToImpl = cg.getOutgoingEdges(svc!.id).find((e) => e.target === impl!.id);
    expect(svcToImpl).toBeDefined();

    cg.close();
  });

  it('bridges a Java mapper interface method to its MyBatis XML statement (incl. SQL fragments)', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-mybatis-'));
    const javaDir = path.join(tmpDir, 'src/main/java/com/example/dao');
    const xmlDir = path.join(tmpDir, 'src/main/resources/mappers');
    fs.mkdirSync(javaDir, { recursive: true });
    fs.mkdirSync(xmlDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'pom.xml'),
      '<project><dependencies><dependency><groupId>org.mybatis</groupId><artifactId>mybatis</artifactId></dependency></dependencies></project>\n'
    );
    fs.writeFileSync(
      path.join(javaDir, 'UserDAOMapper.java'),
      'package com.example.dao;\n' +
        'public interface UserDAOMapper {\n' +
        '  Object getById(int id);\n' +
        '  int updateUser(Object u);\n' +
        '}\n'
    );
    fs.writeFileSync(
      path.join(xmlDir, 'UserDAOMapper.xml'),
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">\n' +
        '<mapper namespace="com.example.dao.UserDAOMapper">\n' +
        '  <sql id="userCols">id, name, email</sql>\n' +
        '  <select id="getById" parameterType="int" resultType="User">\n' +
        '    SELECT <include refid="userCols"/> FROM users WHERE id = #{id}\n' +
        '  </select>\n' +
        '  <update id="updateUser" parameterType="User">\n' +
        '    UPDATE users SET name=#{name}, email=#{email} WHERE id=#{id}\n' +
        '  </update>\n' +
        '</mapper>\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'rust-hybrid' });

    const methods = cg.getNodesByKind('method');
    const getByIdJava = methods.find((m) => m.name === 'getById' && m.language === 'java');
    const getByIdXml = methods.find((m) => m.name === 'getById' && m.language === 'xml');
    const updateJava = methods.find((m) => m.name === 'updateUser' && m.language === 'java');
    const updateXml = methods.find((m) => m.name === 'updateUser' && m.language === 'xml');
    const sqlFrag = methods.find((m) => m.name === 'userCols' && m.language === 'xml');
    expect(getByIdJava).toBeDefined();
    expect(getByIdXml).toBeDefined();
    expect(updateJava).toBeDefined();
    expect(updateXml).toBeDefined();
    expect(sqlFrag).toBeDefined();

    // XML statement qualified name must be `<namespace>::<id>` so the
    // synthesizer can match against the Java method's `<Class>::<method>`
    // suffix — this is the load-bearing contract between extractor + synthesis.
    expect(getByIdXml!.qualifiedName).toBe('com.example.dao.UserDAOMapper::getById');

    // Bridge: Java mapper method -> XML statement, kind 'calls'.
    const j2xGet = cg.getOutgoingEdges(getByIdJava!.id).find((e) => e.target === getByIdXml!.id);
    expect(j2xGet, 'Java getById should reach the XML <select id="getById">').toBeDefined();
    expect(j2xGet!.kind).toBe('calls');
    const j2xUpd = cg.getOutgoingEdges(updateJava!.id).find((e) => e.target === updateXml!.id);
    expect(j2xUpd, 'Java updateUser should reach the XML <update id="updateUser">').toBeDefined();

    // <include refid="userCols"/> inside <select> -> <sql id="userCols"> in same mapper.
    const incEdge = cg.getOutgoingEdges(getByIdXml!.id).find((e) => e.target === sqlFrag!.id);
    expect(incEdge, '<include refid="userCols"/> should reach the <sql> fragment').toBeDefined();

    cg.close();
  });

  it('binds @Value / @ConfigurationProperties to YAML + .properties keys (incl. relaxed binding)', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-spring-config-'));
    const javaDir = path.join(tmpDir, 'src/main/java/com/example');
    const resDir = path.join(tmpDir, 'src/main/resources');
    fs.mkdirSync(javaDir, { recursive: true });
    fs.mkdirSync(resDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'pom.xml'),
      '<project><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter</artifactId></dependency></dependencies></project>\n'
    );
    fs.writeFileSync(
      path.join(resDir, 'application.yml'),
      'app:\n' +
        '  cache:\n' +
        '    name:\n' +
        '      user-token: "example-service:auth:token"\n' +
        '    enabled: true\n' +
        'db:\n' +
        '  url: "jdbc:mysql://localhost/x"\n'
    );
    fs.writeFileSync(
      path.join(resDir, 'application.properties'),
      'app.retry-count=3\n'
    );
    fs.writeFileSync(
      path.join(javaDir, 'CacheConfig.java'),
      'package com.example;\n' +
        'import org.springframework.beans.factory.annotation.Value;\n' +
        'public class CacheConfig {\n' +
        '  @Value("${app.cache.name.user-token}") private String tokenCacheName;\n' +
        '  @Value("${app.cache.enabled:true}") private boolean enabled;\n' +
        '  // relaxed binding: java camelCase, properties kebab-case\n' +
        '  @Value("${app.retryCount}") private int retry;\n' +
        '}\n'
    );
    fs.writeFileSync(
      path.join(javaDir, 'CacheProperties.java'),
      'package com.example;\n' +
        'import org.springframework.boot.context.properties.ConfigurationProperties;\n' +
        '@ConfigurationProperties(prefix = "app.cache")\n' +
        'public class CacheProperties { private boolean enabled; }\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'typescript' });

    // YAML/properties leaf keys: one constant node per dotted path.
    const cfgKeys = cg
      .getNodesByKind('constant')
      .filter((n) => n.language === 'yaml' || n.language === 'properties');
    const cfgByQn = (qn: string) => cfgKeys.find((n) => n.qualifiedName === qn);
    expect(cfgByQn('app.cache.name.user-token')).toBeDefined();
    expect(cfgByQn('app.cache.enabled')).toBeDefined();
    expect(cfgByQn('db.url')).toBeDefined();
    expect(cfgByQn('app.retry-count')).toBeDefined();

    // @Value("${app.cache.name.user-token}") -> the YAML leaf key.
    const valueBindings = cg
      .getNodesByKind('constant')
      .filter((n) => n.id.startsWith('spring-value:'));
    const userToken = valueBindings.find((n) => n.name === 'app.cache.name.user-token');
    expect(userToken).toBeDefined();
    const userTokenEdges = cg.getOutgoingEdges(userToken!.id);
    const userTokenTarget = userTokenEdges.find((e) =>
      cfgKeys.some((c) => c.id === e.target && c.qualifiedName === 'app.cache.name.user-token'),
    );
    expect(userTokenTarget, '@Value should reference the YAML leaf key').toBeDefined();

    // Default-value form `${k:default}` — strip the `:default` and bind the key.
    const enabledBind = valueBindings.find((n) => n.name === 'app.cache.enabled');
    expect(enabledBind).toBeDefined();
    expect(cg.getOutgoingEdges(enabledBind!.id).some((e) => {
      const t = cfgByQn('app.cache.enabled');
      return t && e.target === t.id;
    })).toBe(true);

    // Relaxed binding: `app.retryCount` (camel) -> `app.retry-count` (kebab).
    const retryBind = valueBindings.find((n) => n.name === 'app.retryCount');
    expect(retryBind).toBeDefined();
    expect(cg.getOutgoingEdges(retryBind!.id).some((e) => {
      const t = cfgByQn('app.retry-count');
      return t && e.target === t.id;
    })).toBe(true);

    // @ConfigurationProperties(prefix="app.cache") -> a key under that prefix.
    const cpBindings = cg
      .getNodesByKind('constant')
      .filter((n) => n.id.startsWith('spring-cp:'));
    const cpAppCache = cpBindings.find((n) => n.name === 'app.cache');
    expect(cpAppCache).toBeDefined();
    const cpEdges = cg.getOutgoingEdges(cpAppCache!.id);
    expect(cpEdges.length).toBeGreaterThan(0);

    cg.close();
  });

  it('emits only a file node for non-MyBatis XML (pom.xml, beans.xml, log4j.xml)', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-xml-non-mybatis-'));
    fs.writeFileSync(
      path.join(tmpDir, 'pom.xml'),
      '<project><groupId>x</groupId><artifactId>y</artifactId></project>\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'log4j.xml'),
      '<?xml version="1.0"?><Configuration><Loggers><Root level="info"/></Loggers></Configuration>\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'typescript' });
    // No method nodes — non-mapper XML produces no symbols (just file rows).
    expect(cg.getNodesByKind('method').filter((n) => n.language === 'xml').length).toBe(0);
    cg.close();
  });

  it('resolves a `this.field.method()` call to a unique implementation class', async () => {
    // Standalone test of the extractor `this.` strip: even without Spring annotations,
    // `this.svc.run()` where `svc` is typed as a concrete class should route to that
    // class's method. This is the general Java fix, Spring is only one consumer.
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-java-this-field-'));
    fs.writeFileSync(
      path.join(tmpDir, 'App.java'),
      'class Svc { public void run() { } }\n' +
        'class App {\n' +
        '  private Svc svc;\n' +
        '  public void go() { this.svc.run(); }\n' +
        '}\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'rust-hybrid' });

    const methods = cg.getNodesByKind('method');
    const go = methods.find((m) => m.name === 'go');
    const run = methods.find((m) => m.name === 'run');
    expect(go && run).toBeTruthy();

    const edge = cg.getOutgoingEdges(go!.id).find((e) => e.target === run!.id);
    expect(edge, '`this.svc.run()` should resolve to Svc.run').toBeDefined();

    cg.close();
  });
});

describe('JVM FQN imports — end-to-end', () => {
  let tmpDir: string | undefined;
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it('resolves a Kotlin import when the file name differs from the class name', async () => {
    // Bar lives in Models.kt — the filesystem-based Java-style path lookup
    // (com/example/Bar.kt) misses this; only FQN-via-qualifiedName finds it.
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-jvm-imp-'));
    fs.writeFileSync(
      path.join(tmpDir, 'Models.kt'),
      'package com.example\n\nclass Bar {\n  fun greet(): String = "hi"\n}\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'Caller.kt'),
      'package com.example.app\n\nimport com.example.Bar\n\nclass App {\n  fun run() { Bar().greet() }\n}\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'rust-hybrid' });

    const bar = cg.getNodesByKind('class').find((n) => n.qualifiedName === 'com.example::Bar');
    expect(bar, 'Bar should be extracted with package-qualified name').toBeDefined();

    const importNode = cg.getNodesByKind('import').find((n) => n.name === 'com.example.Bar');
    expect(importNode, 'import statement node should exist').toBeDefined();

    // The imports edge may originate from the import node OR from a parent
    // scope (file / namespace) — accept either, but require that an
    // imports-kind edge to Bar exists.
    const reachesBar = cg
      .getIncomingEdges(bar!.id)
      .find((e) => e.kind === 'imports');
    expect(reachesBar, 'an imports edge should resolve to Bar via FQN').toBeDefined();

    cg.close();
  });

  it('resolves a Kotlin top-level function import', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-jvm-imp-'));
    fs.writeFileSync(
      path.join(tmpDir, 'Utils.kt'),
      'package com.example\n\nfun util(): Int = 42\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'Caller.kt'),
      'package com.example.app\n\nimport com.example.util\n\nfun main() { util() }\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'rust-hybrid' });

    const util = cg.getNodesByKind('function').find((n) => n.qualifiedName === 'com.example::util');
    expect(util, 'top-level util() should be extracted under com.example').toBeDefined();

    const edge = cg.getIncomingEdges(util!.id).find((e) => e.kind === 'imports');
    expect(edge, 'imports edge should reach the top-level function by FQN').toBeDefined();
  });

  it('resolves cross-language: Kotlin importing a Java class', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-jvm-imp-'));
    fs.writeFileSync(
      path.join(tmpDir, 'JavaBar.java'),
      'package com.example;\n\npublic class JavaBar {\n  public String greet() { return "hi"; }\n}\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'Caller.kt'),
      'package com.example.app\n\nimport com.example.JavaBar\n\nfun main() { JavaBar().greet() }\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'rust-hybrid' });

    const javaBar = cg.getNodesByKind('class').find((n) => n.qualifiedName === 'com.example::JavaBar');
    expect(javaBar, 'JavaBar should be extracted under com.example regardless of language').toBeDefined();

    const edge = cg.getIncomingEdges(javaBar!.id).find((e) => e.kind === 'imports');
    expect(edge, 'Kotlin caller should resolve its import to the Java class').toBeDefined();
  });

  it('disambiguates a class-name collision across packages', async () => {
    // Two `Bar` classes in different packages — each importer should reach
    // ITS Bar, not the other one. This is the central failure mode that
    // name-matcher alone cannot disambiguate.
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-jvm-imp-'));
    fs.writeFileSync(
      path.join(tmpDir, 'AlphaBar.kt'),
      'package com.example.alpha\n\nclass Bar { fun who() = "alpha" }\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'BetaBar.kt'),
      'package com.example.beta\n\nclass Bar { fun who() = "beta" }\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'CallerA.kt'),
      'package app\n\nimport com.example.alpha.Bar\n\nfun a() { Bar().who() }\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'CallerB.kt'),
      'package app\n\nimport com.example.beta.Bar\n\nfun b() { Bar().who() }\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'rust-hybrid' });

    const alphaBar = cg.getNodesByKind('class').find((n) => n.qualifiedName === 'com.example.alpha::Bar');
    const betaBar = cg.getNodesByKind('class').find((n) => n.qualifiedName === 'com.example.beta::Bar');
    expect(alphaBar).toBeDefined();
    expect(betaBar).toBeDefined();
    expect(alphaBar!.id).not.toBe(betaBar!.id);

    // Each Bar receives exactly one imports edge — from its own caller.
    const alphaIncoming = cg.getIncomingEdges(alphaBar!.id).filter((e) => e.kind === 'imports');
    const betaIncoming = cg.getIncomingEdges(betaBar!.id).filter((e) => e.kind === 'imports');
    expect(alphaIncoming.length).toBeGreaterThan(0);
    expect(betaIncoming.length).toBeGreaterThan(0);

    // Sanity: the edges don't cross — alpha's incoming sources don't include
    // beta's filePath and vice versa.
    const sourceFiles = (edges: typeof alphaIncoming) =>
      edges.map((e) => cg.getNode(e.source)?.filePath).filter(Boolean);
    expect(sourceFiles(alphaIncoming).some((p) => p?.includes('CallerA.kt'))).toBe(true);
    expect(sourceFiles(betaIncoming).some((p) => p?.includes('CallerB.kt'))).toBe(true);
  });
});

describe('Java anonymous-class override synthesis — end-to-end', () => {
  let tmpDir: string | undefined;
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it('bridges an abstract base method to overrides inside `new Base() { ... }`', async () => {
    // Mirrors guava Splitter: a factory returns `new BaseIter() {
    // @Override int separatorStart(...) { ... } }`. Without anon-class
    // extraction the override is invisible — Phase 5.5 interface-impl
    // has no class to bridge — and an agent investigating `BaseIter.separatorStart`
    // can't see its real implementation without reading the file.
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-anon-java-'));
    fs.writeFileSync(
      path.join(tmpDir, 'Splitter.java'),
      'package com.example;\n' +
        '\n' +
        'abstract class BaseIter {\n' +
        '  abstract int separatorStart(int start);\n' +
        '}\n' +
        '\n' +
        'public class Splitter {\n' +
        '  public BaseIter make() {\n' +
        '    return new BaseIter() {\n' +
        '      @Override\n' +
        '      int separatorStart(int start) { return start + 1; }\n' +
        '    };\n' +
        '  }\n' +
        '}\n'
    );

    const cg = CodeGraph.initSync(tmpDir);
    await cg.indexAll({ engine: 'rust-hybrid' });

    // The anon class is extracted and contains the override.
    const anonClass = cg
      .getNodesByKind('class')
      .find((n) => /BaseIter\$anon@/.test(n.name));
    expect(anonClass, 'anonymous BaseIter subclass should be a class node').toBeDefined();

    const baseAbstract = cg
      .getNodesByKind('method')
      .find((n) => n.qualifiedName === 'com.example::BaseIter::separatorStart');
    const anonOverride = cg
      .getNodesByKind('method')
      .find(
        (n) =>
          n.name === 'separatorStart' &&
          n.qualifiedName.includes('$anon@') &&
          n.qualifiedName.startsWith('com.example::Splitter::make::')
      );
    expect(baseAbstract, 'base abstract method should be in the graph').toBeDefined();
    expect(anonOverride, 'anon-class override should be in the graph').toBeDefined();

    // Phase 5.5 interface-impl: the abstract method has a synthesized
    // `calls` edge to the anon override. Without this hop the agent
    // would have to Read the file to discover the implementation.
    const synthEdge = cg
      .getOutgoingEdges(baseAbstract!.id)
      .find((e) => e.target === anonOverride!.id && e.kind === 'calls');
    expect(synthEdge, 'BaseIter.separatorStart should bridge to anon.separatorStart').toBeDefined();
    expect(synthEdge!.edgeOrigin).toBe('heuristic');
    expect((synthEdge!.metadata as { synthesizedBy?: string } | undefined)?.synthesizedBy).toBe(
      'interface-impl'
    );

    cg.close();
  });
});

describe('Go gRPC stub→impl synthesis', () => {
  let tmpDir: string | undefined;
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it('bridges UnimplementedMsgServer methods to the hand-written keeper impl', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-go-grpc-'));
    // Mimic protoc-gen-go-grpc output: `*_grpc.pb.go` carrying the
    // UnimplementedMsgServer stub.
    fs.writeFileSync(
      path.join(tmpDir, 'tx_grpc.pb.go'),
      'package banktypes\n\n' +
        'type UnimplementedMsgServer struct{}\n\n' +
        'func (UnimplementedMsgServer) Send(ctx context.Context, req *MsgSend) (*MsgSendResponse, error) { return nil, nil }\n' +
        'func (UnimplementedMsgServer) MultiSend(ctx context.Context, req *MsgMultiSend) (*MsgMultiSendResponse, error) { return nil, nil }\n' +
        'func (UnimplementedMsgServer) mustEmbedUnimplementedMsgServer() {}\n' +
        'func (UnimplementedMsgServer) testEmbeddedByValue() {}\n'
    );
    // Hand-written impl in a non-generated file — what an agent actually
    // wants the trace to land on.
    fs.writeFileSync(
      path.join(tmpDir, 'msg_server.go'),
      'package keeper\n\n' +
        'type msgServer struct{ k Keeper }\n\n' +
        'func (m msgServer) Send(ctx context.Context, req *MsgSend) (*MsgSendResponse, error) {\n' +
        '  return m.k.SendCoins(ctx, req.From, req.To, req.Amount)\n' +
        '}\n' +
        'func (m msgServer) MultiSend(ctx context.Context, req *MsgMultiSend) (*MsgMultiSendResponse, error) {\n' +
        '  return nil, nil\n' +
        '}\n'
    );

    let cg: CodeGraph | undefined;
    try {
      cg = CodeGraph.initSync(tmpDir);
      await cg.indexAll({ engine: 'typescript' });

      const stubSend = cg
        .getNodesByKind('method')
        .find((n) => n.qualifiedName.endsWith('UnimplementedMsgServer::Send'));
      const implSend = cg
        .getNodesByKind('method')
        .find((n) => n.qualifiedName.endsWith('msgServer::Send'));
      expect(stubSend, 'UnimplementedMsgServer.Send should be indexed').toBeDefined();
      expect(implSend, 'msgServer.Send should be indexed').toBeDefined();

      const bridge = cg
        .getOutgoingEdges(stubSend!.id)
        .find((e) => e.target === implSend!.id && e.kind === 'calls');
      expect(bridge, 'stub Send should bridge to impl Send').toBeDefined();
      expect(bridge!.edgeOrigin).toBe('heuristic');
      expect((bridge!.metadata as { synthesizedBy?: string } | undefined)?.synthesizedBy).toBe(
        'go-grpc-stub-impl'
      );
    } finally {
      cg?.close();
    }
  });

  it('does not bridge to candidates living in another generated file', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-go-grpc-sib-'));
    // `*_grpc.pb.go` also contains a sibling `msgClient` struct that
    // happens to satisfy the same method set. We must NOT bridge to it —
    // it's not the hand-written impl, just the gRPC client wrapper.
    fs.writeFileSync(
      path.join(tmpDir, 'tx_grpc.pb.go'),
      'package banktypes\n\n' +
        'type UnimplementedMsgServer struct{}\n' +
        'func (UnimplementedMsgServer) Send() {}\n' +
        'func (UnimplementedMsgServer) MultiSend() {}\n\n' +
        'type msgClient struct{}\n' +
        'func (m msgClient) Send() {}\n' +
        'func (m msgClient) MultiSend() {}\n'
    );

    let cg: CodeGraph | undefined;
    try {
      cg = CodeGraph.initSync(tmpDir);
      await cg.indexAll({ engine: 'typescript' });

      const stub = cg
        .getNodesByKind('struct')
        .find((n) => n.name === 'UnimplementedMsgServer');
      expect(stub).toBeDefined();
      const bridges = cg
        .getNodesByKind('method')
        .filter((n) => n.qualifiedName.endsWith('UnimplementedMsgServer::Send'))
        .flatMap((stubSend) => cg!.getOutgoingEdges(stubSend.id))
        .filter(
          (e) =>
            e.kind === 'calls' &&
            (e.metadata as { synthesizedBy?: string } | undefined)?.synthesizedBy ===
              'go-grpc-stub-impl',
        );
      expect(bridges, 'no bridge to msgClient (also generated)').toHaveLength(0);
    } finally {
      cg?.close();
    }
  });
});

// Roadmap 1-6-3-1: Go is rust-owned and the Rust core owns route extraction,
// but its verb table used to cover only the five uppercase Gin verbs. The
// 1-6-3 probe measured 4/8 recall vs the TypeScript goResolver surface:
// OPTIONS/HEAD, Chi title-case verbs, and net/http + gorilla/mux
// HandleFunc/Handle (recorded ANY) were lost on the default rust-hybrid
// engine. These cases lock the extended surface end to end, including the
// Rust-only group-prefix expansion (better than TS, which emitted the bare
// path) and a chained gorilla/mux `.HandleFunc(...).Methods("GET")`.
describe('Go route coverage on rust-hybrid (roadmap 1-6-3-1)', () => {
  let tmpDir: string | undefined;
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  it('extracts OPTIONS/HEAD, Chi verbs, stdlib/gorilla ANY, and grouped routes, resolving handlers', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-go-routes-'));
    fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module ginapp\n\ngo 1.21\n');
    fs.writeFileSync(
      path.join(tmpDir, 'routes.go'),
      'package main\n\n' +
        'func ListItems() {}\n' +
        'func CreateItem() {}\n' +
        'func OptionsH() {}\n' +
        'func HeadH() {}\n' +
        'func ChiList() {}\n' +
        'func StdHandler() {}\n' +
        'func listUsers() {}\n\n' +
        'func setupRouter() {\n' +
        '  r := newEngine()\n' +
        '  r.GET("/items", ListItems)\n' +
        '  r.POST("/items", CreateItem)\n' +
        '  r.OPTIONS("/opts", OptionsH)\n' +
        '  r.HEAD("/healthz", HeadH)\n' +
        '  v1 := r.Group("/api/v1")\n' +
        '  v1.GET("/users", ListItems)\n' +
        '  mux := newMux()\n' +
        '  mux.HandleFunc("/std", StdHandler)\n' +
        '  mux.Get("/chi", ChiList)\n' +
        '  s := mux.PathPrefix("/users").Subrouter()\n' +
        '  s.HandleFunc("/users/{id}", listUsers).Methods("GET")\n' +
        '}\n',
    );

    let cg: CodeGraph | undefined;
    try {
      cg = CodeGraph.initSync(tmpDir);
      await cg.indexAll({ engine: 'rust-hybrid' });

      const routes = cg.getNodesByKind('route').sort((a, b) => a.startLine - b.startLine);
      const names = routes.map((r) => r.name);

      // Pre-existing five-verb Gin coverage must not regress.
      expect(names).toContain('GET /items');
      expect(names).toContain('POST /items');
      // The three gap shapes from the 1-6-3 probe.
      expect(names).toContain('OPTIONS /opts');
      expect(names).toContain('HEAD /healthz');
      expect(names).toContain('GET /chi');
      // net/http + gorilla/mux method-agnostic registrations record ANY.
      expect(names).toContain('ANY /std');
      expect(names).toContain('ANY /users/{id}');
      // Rust-only advantage over the TS resolver: group prefix is expanded.
      expect(names).toContain('GET /api/v1/users');

      // Every newly covered route resolves to its handler function.
      const handlerByName = (routeName: string): string | undefined => {
        const route = routes.find((r) => r.name === routeName);
        if (!route) return undefined;
        const edge = cg!
          .getOutgoingEdges(route.id)
          .find((e) => e.kind === 'references');
        const target = edge ? cg!.getNode(edge.target) : undefined;
        return target?.name;
      };
      expect(handlerByName('OPTIONS /opts')).toBe('OptionsH');
      expect(handlerByName('HEAD /healthz')).toBe('HeadH');
      expect(handlerByName('GET /chi')).toBe('ChiList');
      expect(handlerByName('ANY /std')).toBe('StdHandler');
      // The chained gorilla/mux constraint does not corrupt handler capture.
      expect(handlerByName('ANY /users/{id}')).toBe('listUsers');
      // The grouped route resolves too.
      expect(handlerByName('GET /api/v1/users')).toBe('ListItems');
    } finally {
      cg?.close();
    }
  });
});
