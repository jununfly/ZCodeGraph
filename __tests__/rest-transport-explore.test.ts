import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import CodeGraph from '../src/index';
import { ToolHandler } from '../src/mcp/tools';

function renderedFileSections(text: string): string[] {
  return text.match(/^#### .*/gm) ?? [];
}

describe('zcodegraph_explore — REST handler to transport action sufficiency', () => {
  let testDir: string;
  let cg: CodeGraph;
  let handler: ToolHandler;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rest-transport-'));

    const restDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'rest');
    fs.mkdirSync(restDir, { recursive: true });
    fs.writeFileSync(
      path.join(restDir, 'RestController.java'),
      `package org.elasticsearch.rest;
public class RestController {
  public void registerHandler(BaseRestHandler handler) {}
}
`
    );
    fs.writeFileSync(
      path.join(restDir, 'BaseRestHandler.java'),
      `package org.elasticsearch.rest;
import org.elasticsearch.client.internal.node.NodeClient;
public abstract class BaseRestHandler {
  public abstract RestChannelConsumer prepareRequest(RestRequest request, NodeClient client);
}
interface RestChannelConsumer {}
`
    );
    fs.writeFileSync(
      path.join(restDir, 'RestRequest.java'),
      `package org.elasticsearch.rest;
public class RestRequest {
  public String param(String name) { return name; }
}
`
    );
    fs.writeFileSync(
      path.join(restDir, 'RestHandler.java'),
      `package org.elasticsearch.rest;
public interface RestHandler {
  void handleRequest(RestRequest request);
}
`
    );
    fs.writeFileSync(
      path.join(restDir, 'RestChannel.java'),
      `package org.elasticsearch.rest;
public class RestChannel {
  public void sendResponse(Object response) {}
}
`
    );

    const clientDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'client', 'internal', 'node');
    fs.mkdirSync(clientDir, { recursive: true });
    fs.writeFileSync(
      path.join(clientDir, 'NodeClient.java'),
      `package org.elasticsearch.client.internal.node;
import org.elasticsearch.action.support.TransportAction;
public class NodeClient {
  public void executeLocally(TransportAction action, Object request) {
    action.doExecute(request);
  }
}
`
    );

    const supportDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'action', 'support');
    fs.mkdirSync(supportDir, { recursive: true });
    fs.writeFileSync(
      path.join(supportDir, 'TransportAction.java'),
      `package org.elasticsearch.action.support;
public abstract class TransportAction {
  public abstract void doExecute(Object request);
}
`
    );

    const transportDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'transport');
    fs.mkdirSync(transportDir, { recursive: true });
    fs.writeFileSync(
      path.join(transportDir, 'TransportService.java'),
      `package org.elasticsearch.transport;
public class TransportService {
  public void sendRequest(Object request) {}
}
`
    );

    const actionDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'action');
    fs.mkdirSync(actionDir, { recursive: true });
    fs.writeFileSync(
      path.join(actionDir, 'ActionModule.java'),
      `package org.elasticsearch.action;
import org.elasticsearch.rest.RestController;
public class ActionModule {
  public void initRestHandlers(RestController controller) {}
}
`
    );
    fs.writeFileSync(
      path.join(actionDir, 'TransportRequest.java'),
      `package org.elasticsearch.action;
public class TransportRequest {}
`
    );

    const searchRestDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'rest', 'action', 'search');
    fs.mkdirSync(searchRestDir, { recursive: true });
    fs.writeFileSync(
      path.join(searchRestDir, 'RestSearchAction.java'),
      `package org.elasticsearch.rest.action.search;
import org.elasticsearch.action.search.TransportSearchAction;
import org.elasticsearch.client.internal.node.NodeClient;
import org.elasticsearch.rest.BaseRestHandler;
import org.elasticsearch.rest.RestRequest;
public class RestSearchAction extends BaseRestHandler {
  public RestChannelConsumer prepareRequest(RestRequest request, NodeClient client) {
    request.param("index");
    return channel -> client.executeLocally(new TransportSearchAction(), request);
  }
}
interface RestChannelConsumer { void accept(Object channel); }
`
    );

    const searchActionDir = path.join(testDir, 'server', 'src', 'main', 'java', 'org', 'elasticsearch', 'action', 'search');
    fs.mkdirSync(searchActionDir, { recursive: true });
    fs.writeFileSync(
      path.join(searchActionDir, 'TransportSearchAction.java'),
      `package org.elasticsearch.action.search;
import org.elasticsearch.action.support.TransportAction;
public class TransportSearchAction extends TransportAction {
  public void doExecute(Object request) {}
}
`
    );
    fs.writeFileSync(
      path.join(searchActionDir, 'TransportNoopAction.java'),
      `package org.elasticsearch.action.search;
import org.elasticsearch.action.support.TransportAction;
public class TransportNoopAction extends TransportAction {
  public void doExecute(Object request) {}
}
`
    );

    cg = CodeGraph.initSync(testDir, {
      config: { include: ['**/*.java'], exclude: [] },
    });
    await cg.indexAll({ engine: 'typescript' });
    handler = new ToolHandler(cg);
  });

  afterEach(() => {
    if (cg) cg.destroy();
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('returns a concrete REST action, client execution, and transport action in one generic flow answer', async () => {
    const result = await handler.execute('zcodegraph_explore', {
      query: 'How does a REST request handler reach a transport action? Use this symbol bag: RestController BaseRestHandler RestRequest TransportAction TransportService',
      maxFiles: 8,
    });
    const text = result.content.map((c) => c.text).join('\n');
    const sections = renderedFileSections(text).join('\n');

    expect(sections).toContain('RestController.java');
    expect(sections).toContain('BaseRestHandler.java');
    expect(text).toContain('RestRequest');
    expect(sections).toContain('RestSearchAction.java');
    expect(text).toContain('prepareRequest');
    expect(sections).toContain('NodeClient.java');
    expect(text).toContain('executeLocally');
    expect(sections).toContain('TransportAction.java');
    expect(sections).toContain('TransportSearchAction.java');
    expect(text).toContain('doExecute');
  });
});
