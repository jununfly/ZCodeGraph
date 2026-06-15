import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'release.yml'), 'utf8');

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
});
