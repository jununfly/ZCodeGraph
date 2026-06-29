import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'release.yml'), 'utf8');

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function releaseTargetMatrixEntry(releaseTarget: string): string {
  const pattern = new RegExp(
    String.raw`          - target: ${escapeRegExp(releaseTarget)}\n(?:            .+\n)*?(?=          - target: |\s{4}steps:)`,
  );
  const match = workflow.match(pattern);
  expect(match, `missing release workflow matrix entry for ${releaseTarget}`).not.toBeNull();
  return match![0];
}

function stepIndex(name: string): number {
  const index = workflow.indexOf(`- name: ${name}`);
  expect(index, `missing release workflow step: ${name}`).toBeGreaterThanOrEqual(0);
  return index;
}

describe('Release workflow Rust core artifacts', () => {
  it('builds one Rust core artifact for each release target before packaging', async () => {
    const contract = await import('../scripts/rust-core-artifact-contract.mjs');

    expect(workflow).toContain('build-rust-core:');
    expect(workflow).toContain('strategy:');
    expect(workflow).toContain('matrix:');
    expect(workflow).toContain('actions/upload-artifact@v6');

    for (const target of contract.RUST_CORE_RELEASE_TARGETS) {
      expect(workflow).toContain(`target: ${target.releaseTarget}`);
      expect(workflow).toContain(`rust_target: ${target.rustTargetTriple}`);
      expect(workflow).toContain(`artifact: ${target.artifactName}`);
      expect(releaseTargetMatrixEntry(target.releaseTarget)).toContain(`runner: ${target.runner}`);
      expect(workflow).toContain(`runs-on: \${{ matrix.runner }}`);
      expect(workflow).toContain(`cargo build --release --package zcodegraph-core --target "\${{ matrix.rust_target }}"`);
      expect(workflow).toContain(`target/\${{ matrix.rust_target }}/release/\${{ matrix.exe }}`);
    }

    expect(workflow).toContain('rustup target add "${{ matrix.rust_target }}"');
    expect(workflow).toContain('aarch64-pc-windows-msvc');
    expect(workflow).toContain('windows-2025');
  });

  it('downloads and verifies every Rust core artifact before building bundles', () => {
    expect(workflow).toContain('needs: build-rust-core');
    expect(workflow).toContain('actions/download-artifact@v6');
    expect(workflow).toContain('pattern: zcodegraph-core-*');
    expect(workflow).toContain('path: release/rust-core');
    expect(workflow).toContain('Verify Rust core artifacts');
    expect(workflow).toContain('for t in darwin-arm64 darwin-x64 linux-x64 linux-arm64 win32-x64 win32-arm64; do');
    expect(workflow).toContain('release/rust-core/zcodegraph-core-${t}/${exe}');
    expect(workflow).toContain('::error::missing Rust core artifact');
    expect(workflow).toContain('bash scripts/build-bundle.sh "$t"');
  });

  it('keeps release publishing behavior intact and removes stale no-native-build comments', () => {
    expect(workflow).toContain('Promote [Unreleased] → [<version>] in CHANGELOG.md');
    expect(workflow).toContain('Create GitHub Release');
    expect(workflow).toContain('Publish to npm');
    expect(workflow).toContain('Sync packages to npmmirror');

    expect(workflow).not.toContain('there is no native compilation');
    expect(workflow).not.toContain('No cross-compile, no native runners');
  });

  it('guards release credentials, registry confirmation, and best-effort mirror sync', () => {
    expect(workflow).toContain('permissions:');
    expect(workflow).toContain('contents: write');
    expect(workflow).toContain('token: ${{ secrets.RELEASE_PAT }}');

    expect(workflow).toContain('GH_TOKEN: ${{ secrets.RELEASE_PAT || github.token }}');
    expect(workflow).toContain('gh release create "$TAG"');
    expect(workflow).toContain('gh release upload "$TAG"');

    expect(workflow).toContain('NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}');
    expect(workflow).toContain('npm publish --access public');
    expect(workflow).toContain('npm view "$name@$V" version >/dev/null 2>&1');
    expect(workflow).toContain('Verify every package is actually on the registry');
    expect(workflow).toContain('::error::$name@$V never appeared on the registry');

    expect(workflow).toContain('Sync packages to npmmirror');
    expect(workflow).toContain('continue-on-error: true');
    expect(workflow).toContain('https://registry.npmmirror.com/-/package/$enc/syncs');
    expect(workflow).toContain('curl -s -X PUT');
  });

  it('runs targeted package smoke after npm packing and before npm publishing', () => {
    const packIndex = stepIndex('Pack npm packages');
    const smokeIndex = stepIndex('Run targeted package smoke');
    const publishIndex = stepIndex('Publish to npm');

    expect(packIndex).toBeLessThan(smokeIndex);
    expect(smokeIndex).toBeLessThan(publishIndex);

    expect(workflow).toContain('bash scripts/pack-npm.sh "$V"');
    expect(workflow).toContain('release/zcodegraph-linux-x64.tar.gz');
    expect(workflow).toContain('scripts/rust-package-smoke.mjs');
    expect(workflow).toContain('--bundle release/package-smoke/linux-x64-bundle');
    expect(workflow).toContain('--npm-root release/npm');
    expect(workflow).toContain('--out release/package-smoke/out');
    expect(workflow).toContain('Upload package smoke artifacts');
    expect(workflow).toContain('release/package-smoke/out');

    const smokeStep = workflow.slice(smokeIndex, publishIndex);
    expect(smokeStep).not.toContain('npm publish');
    expect(smokeStep).not.toContain('gh release create');
    expect(smokeStep).not.toContain('gh release upload');
    expect(smokeStep).not.toContain('npm view');
    expect(smokeStep).not.toContain('git push');
    expect(smokeStep).not.toContain('curl ');
  });

  it('guards release Node runtime and package-lock sync semantics', () => {
    expect(workflow).toContain('actions/setup-node@v6');
    expect(workflow).toContain('node-version: 22');
    expect(workflow).toContain('registry-url: https://registry.npmjs.org');

    expect(workflow).toContain('Sync package-lock.json if version drifted');
    expect(workflow).toContain('PKG_V=$(node -p "require(\'./package.json\').version")');
    expect(workflow).toContain('LOCK_V=$(node -p "require(\'./package-lock.json\').version")');
    expect(workflow).toContain('npm install --package-lock-only --ignore-scripts');
    expect(workflow).toContain('git add package-lock.json');
    expect(workflow).toContain('release: sync package-lock.json to ${PKG_V}');
    expect(workflow).toContain('npm ci');
  });
});
