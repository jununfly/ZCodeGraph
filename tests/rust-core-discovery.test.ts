import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { findRustCoreCommand, getRustReadinessDiagnostics } from '../src/indexing/rust-indexer';

const exeName = process.platform === 'win32' ? 'zcodegraph-core.exe' : 'zcodegraph-core';

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'zcodegraph-rust-core-discovery-'));
}

function touchExecutable(file: string): string {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '#!/bin/sh\n');
  fs.chmodSync(file, 0o755);
  return file;
}

describe('Rust core binary discovery', () => {
  it('prefers ZCODEGRAPH_RUST_CORE_BINARY over packaged and source binaries', () => {
    const root = tempRoot();
    try {
      const configured = touchExecutable(path.join(root, 'override', exeName));
      const packaged = touchExecutable(path.join(root, 'bundle', 'bin', exeName));
      const compiledFileDir = path.join(root, 'bundle', 'lib', 'dist', 'indexing');

      const command = findRustCoreCommand(
        { ZCODEGRAPH_RUST_CORE_BINARY: configured },
        { compiledFileDir },
      );

      expect(command).toEqual({ command: configured, argsPrefix: [], cwd: process.cwd() });
      expect(packaged).not.toBe(configured);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('finds a packaged binary from a bundle or npm platform package layout', () => {
    const root = tempRoot();
    try {
      const packaged = touchExecutable(path.join(root, 'zcodegraph-darwin-arm64', 'bin', exeName));
      const compiledFileDir = path.join(root, 'zcodegraph-darwin-arm64', 'lib', 'dist', 'indexing');

      const command = findRustCoreCommand({}, { compiledFileDir });

      expect(command).toEqual({
        command: packaged,
        argsPrefix: [],
        cwd: path.dirname(packaged),
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports packaged binary diagnostics without requiring env overrides', () => {
    const root = tempRoot();
    try {
      const packaged = touchExecutable(path.join(root, 'zcodegraph-darwin-arm64', 'bin', exeName));
      const compiledFileDir = path.join(root, 'zcodegraph-darwin-arm64', 'lib', 'dist', 'indexing');

      const diagnostics = getRustReadinessDiagnostics(
        root,
        { engine: 'rust', engineVersion: '0.1.0' },
        {},
        { compiledFileDir },
      );

      expect(diagnostics.configuredEngine).toMatchObject({ engine: 'rust-hybrid', source: 'default' });
      expect(diagnostics.core).toMatchObject({
        available: true,
        discoverySource: 'packaged-binary',
        attemptedCommand: packaged,
        attemptedArgsPrefix: [],
      });
      expect(diagnostics.lastIndex).toEqual({ engine: 'rust', engineVersion: '0.1.0' });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses the source debug binary before falling back to cargo run', () => {
    const root = tempRoot();
    try {
      const debugBinary = touchExecutable(path.join(root, 'target', 'debug', exeName));
      fs.writeFileSync(path.join(root, 'Cargo.toml'), '[workspace]\n');
      const compiledFileDir = path.join(root, 'dist', 'indexing');

      const command = findRustCoreCommand({}, { compiledFileDir });

      expect(command).toEqual({ command: debugBinary, argsPrefix: [], cwd: root });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('falls back to cargo run for source development when no binary exists', () => {
    const root = tempRoot();
    try {
      fs.writeFileSync(path.join(root, 'Cargo.toml'), '[workspace]\n');
      const compiledFileDir = path.join(root, 'dist', 'indexing');

      const command = findRustCoreCommand({}, { compiledFileDir });

      expect(command).toEqual({
        command: 'cargo',
        argsPrefix: ['run', '--quiet', '--package', 'zcodegraph-core', '--'],
        cwd: root,
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports unavailable when neither packaged nor source paths exist', () => {
    const root = tempRoot();
    try {
      const compiledFileDir = path.join(root, 'bundle', 'lib', 'dist', 'indexing');

      expect(() => findRustCoreCommand({}, { compiledFileDir })).toThrow(
        /Rust index engine is unavailable: no Rust core binary was found/,
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
