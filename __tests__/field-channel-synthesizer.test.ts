import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { CodeGraph } from '../src';

/**
 * End-to-end synthesizer test for field-backed observer callbacks.
 *
 * A registrar stores a callback in a field, a dispatcher later invokes callbacks
 * from that same field, and a registration site passes a named callback method.
 * Static extraction only sees `cb()` inside the dispatcher; the synthesizer must
 * recover the runtime edge `dispatcher -> callback` and surface the wiring site.
 */
describe('field observer callback synthesizer', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'field-channel-fixture-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('links dispatcher to a named callback through registrar registration site', async () => {
    fs.writeFileSync(
      path.join(dir, 'App.ts'),
      `type Callback = () => void;

class Scene {
  private callbacks = new Set<Callback>();

  onUpdate(cb: Callback) {
    this.callbacks.add(cb);
  }

  triggerUpdate() {
    for (const cb of this.callbacks) {
      cb();
    }
  }
}

class App {
  private scene = new Scene();
  renderCount = 0;

  constructor() {
    this.scene.onUpdate(this.triggerRender);
  }

  triggerRender() {
    this.renderCount++;
  }
}

class OtherScene {
  private callbacks = new Set<Callback>();

  onUpdate(cb: Callback) {
    this.callbacks.add(cb);
  }

  triggerUpdate() {
    for (const cb of this.callbacks) {
      cb();
    }
  }
}

class OtherApp {
  private other = new OtherScene();

  constructor() {
    this.other.triggerUpdate();
  }

  triggerOtherRender() {}
}
`
    );

    const cg = await CodeGraph.init(dir, { silent: true });
    await cg.indexAll();

    const db = (cg as any).db.db;
    const rows = db
      .prepare(
        `SELECT s.name source_name,
                s.kind source_kind,
                t.name target_name,
                t.kind target_kind,
                e.kind edge_kind,
                e.provenance provenance,
                json_extract(e.metadata,'$.synthesizedBy') synthesizedBy,
                json_extract(e.metadata,'$.via') via,
                json_extract(e.metadata,'$.field') field,
                json_extract(e.metadata,'$.registeredAt') registeredAt
         FROM edges e
         JOIN nodes s ON s.id = e.source
         JOIN nodes t ON t.id = e.target
         WHERE json_extract(e.metadata,'$.synthesizedBy') = 'callback'`
      )
      .all();

    cg.close?.();

    const edge = rows.find(
      (r: any) =>
        r.source_name === 'triggerUpdate' &&
        r.target_name === 'triggerRender'
    );

    expect(edge).toBeTruthy();
    expect(edge.source_kind).toBe('method');
    expect(edge.target_kind).toBe('method');
    expect(edge.edge_kind).toBe('calls');
    expect(edge.provenance).toBe('heuristic');
    expect(edge.synthesizedBy).toBe('callback');
    expect(edge.via).toBe('onUpdate');
    expect(edge.field).toBe('callbacks');
    expect(edge.registeredAt).toMatch(/App\.ts:\d+/);

    expect(rows.some((r: any) => r.target_name === 'triggerOtherRender')).toBe(false);
  });
});
