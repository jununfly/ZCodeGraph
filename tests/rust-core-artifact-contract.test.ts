import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('Rust core release artifact contract', () => {
  it('maps every release target to a concrete Rust binary artifact', async () => {
    const contract = await import('../scripts/rust-core-artifact-contract.mjs');

    expect(contract.RUST_CORE_PACKAGE).toBe('zcodegraph-core');
    expect(contract.RUST_CORE_RELEASE_TARGETS).toHaveLength(6);

    expect(contract.RUST_CORE_RELEASE_TARGETS.map((target: any) => target.releaseTarget)).toEqual([
      'darwin-arm64',
      'darwin-x64',
      'linux-x64',
      'linux-arm64',
      'win32-x64',
      'win32-arm64',
    ]);

    for (const target of contract.RUST_CORE_RELEASE_TARGETS) {
      expect(target.artifactName).toBe(`zcodegraph-core-${target.releaseTarget}`);
      expect(target.executableName).toBe(target.releaseTarget.startsWith('win32-') ? 'zcodegraph-core.exe' : 'zcodegraph-core');
      expect(target.bundlePath).toBe(`bin/${target.executableName}`);
      expect(target.rustTargetTriple).toMatch(/^[a-z0-9_]+-[a-z0-9_]+-[a-z0-9_]+/);
      expect(target.buildCommand).toContain('cargo build --release --package zcodegraph-core');
      expect(target.buildCommand).toContain(`--target ${target.rustTargetTriple}`);
      expect(target.outputRelativePath).toBe(`target/${target.rustTargetTriple}/release/${target.executableName}`);
    }
  });

  it('documents Windows ARM64 as a resolved cross-compile path', async () => {
    const contract = await import('../scripts/rust-core-artifact-contract.mjs');
    const winArm64 = contract.RUST_CORE_RELEASE_TARGETS.find((target: any) => target.releaseTarget === 'win32-arm64');

    expect(winArm64).toMatchObject({
      releaseTarget: 'win32-arm64',
      rustTargetTriple: 'aarch64-pc-windows-msvc',
      runner: 'windows-2025',
      strategy: 'cross-compile-from-windows-x64-msvc',
    });
    expect(winArm64.setupCommands).toContain('rustup target add aarch64-pc-windows-msvc');
  });

  it('maps every release target to one npm platform package', async () => {
    const contract = await import('../scripts/rust-core-artifact-contract.mjs');

    expect(contract.RUST_CORE_NPM_PACKAGES).toHaveLength(contract.RUST_CORE_RELEASE_TARGETS.length);
    expect(contract.RUST_CORE_NPM_PACKAGES.map((pkg: any) => pkg.target)).toEqual(
      contract.RUST_CORE_RELEASE_TARGETS.map((target: any) => target.releaseTarget),
    );

    for (const pkg of contract.RUST_CORE_NPM_PACKAGES) {
      const releaseTarget = contract.RUST_CORE_RELEASE_TARGETS.find((target: any) => target.releaseTarget === pkg.target);
      expect(releaseTarget, `missing release target for npm package ${pkg.target}`).toBeDefined();
      expect(pkg.packageName).toBe(`@jununfly/zcodegraph-${pkg.target}`);
      expect(pkg.optionalDependencyKey).toBe(pkg.packageName);
      expect(pkg.packageDirectory).toBe(`zcodegraph-${pkg.target}`);
      expect(pkg.bundleArchiveBase).toBe(`zcodegraph-${pkg.target}`);
      expect(pkg.os).toBe(pkg.target.slice(0, pkg.target.lastIndexOf('-')));
      expect(pkg.cpu).toBe(pkg.target.slice(pkg.target.lastIndexOf('-') + 1));
      expect(pkg.rustCoreBinaryPath).toBe(releaseTarget.bundlePath);
    }
  });

  it('keeps npm and npx users free of local Rust compilation', async () => {
    await import('../scripts/rust-core-artifact-contract.mjs');
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const lifecycleScripts = Object.entries(pkg.scripts ?? {}).filter(([name]) => /install/.test(name));

    expect(lifecycleScripts).toEqual([
      ['preuninstall', 'node dist/bin/uninstall.js'],
    ]);
    expect(JSON.stringify(pkg)).not.toContain('cargo build');
    expect(JSON.stringify(pkg)).not.toContain('rustup');
  });
});
