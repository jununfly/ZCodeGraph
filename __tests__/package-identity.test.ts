import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

describe('package and CLI identity', () => {
  it('exposes ZCodeGraph as the npm package and CLI command', () => {
    expect(pkg.name).toBe('@jununfly/zcodegraph');
    expect(pkg.bin).toEqual({
      zcodegraph: './dist/bin/zcodegraph.js',
    });
  });

  it('build and local CLI scripts target the zcodegraph dist entry', () => {
    expect(pkg.scripts.build).toContain('dist/bin/zcodegraph.js');
    expect(pkg.scripts.cli).toContain('dist/bin/zcodegraph.js');
    expect(pkg.scripts.build).not.toContain('dist/bin/codegraph.js');
    expect(pkg.scripts.cli).not.toContain('dist/bin/codegraph.js');
  });

  it('uses zcodegraph as the TypeScript CLI entry filename', () => {
    expect(fs.existsSync(path.join(root, 'src', 'bin', 'zcodegraph.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src', 'bin', 'codegraph.ts'))).toBe(false);
  });

  it.runIf(process.platform !== 'win32')('keeps the published npm shim executable on POSIX', () => {
    const mode = fs.statSync(path.join(root, 'scripts', 'npm-shim.js')).mode;
    expect(mode & 0o111).not.toBe(0);
  });

  it('keeps release and embedded SDK package names aligned with ZCodeGraph', () => {
    const npmShim = fs.readFileSync(path.join(root, 'scripts', 'npm-shim.js'), 'utf8');
    const npmSdk = fs.readFileSync(path.join(root, 'scripts', 'npm-sdk.js'), 'utf8');

    expect(npmShim).toContain("var pkg = '@jununfly/zcodegraph-' + target");
    expect(npmShim).toContain("var REPO = 'jununfly/ZCodeGraph'");
    expect(npmShim).toContain("var asset = 'zcodegraph-' + target");
    expect(npmShim).not.toContain('@colbymchenry/codegraph');
    expect(npmShim).not.toContain('dist/bin/codegraph.js');

    expect(npmSdk).toContain("var pkg = '@jununfly/zcodegraph-' + target");
    expect(npmSdk).not.toContain('@colbymchenry/codegraph');
  });
});
