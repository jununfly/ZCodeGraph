export const RUST_CORE_PACKAGE = 'zcodegraph-core';

export const RUST_CORE_RELEASE_TARGETS = [
  {
    releaseTarget: 'darwin-arm64',
    rustTargetTriple: 'aarch64-apple-darwin',
    runner: 'macos-14',
    strategy: 'native-github-hosted-runner',
    setupCommands: [],
  },
  {
    releaseTarget: 'darwin-x64',
    rustTargetTriple: 'x86_64-apple-darwin',
    runner: 'macos-13',
    strategy: 'native-github-hosted-runner',
    setupCommands: [],
  },
  {
    releaseTarget: 'linux-x64',
    rustTargetTriple: 'x86_64-unknown-linux-gnu',
    runner: 'ubuntu-24.04',
    strategy: 'native-github-hosted-runner',
    setupCommands: [],
  },
  {
    releaseTarget: 'linux-arm64',
    rustTargetTriple: 'aarch64-unknown-linux-gnu',
    runner: 'ubuntu-24.04-arm',
    strategy: 'native-github-hosted-runner',
    setupCommands: [],
  },
  {
    releaseTarget: 'win32-x64',
    rustTargetTriple: 'x86_64-pc-windows-msvc',
    runner: 'windows-2025',
    strategy: 'native-github-hosted-runner',
    setupCommands: [],
  },
  {
    releaseTarget: 'win32-arm64',
    rustTargetTriple: 'aarch64-pc-windows-msvc',
    runner: 'windows-2025',
    strategy: 'cross-compile-from-windows-x64-msvc',
    setupCommands: ['rustup target add aarch64-pc-windows-msvc'],
  },
].map((target) => {
  const executableName = target.releaseTarget.startsWith('win32-')
    ? 'zcodegraph-core.exe'
    : 'zcodegraph-core';

  return {
    ...target,
    artifactName: `zcodegraph-core-${target.releaseTarget}`,
    executableName,
    bundlePath: `bin/${executableName}`,
    buildCommand: `cargo build --release --package ${RUST_CORE_PACKAGE} --target ${target.rustTargetTriple}`,
    outputRelativePath: `target/${target.rustTargetTriple}/release/${executableName}`,
  };
});

export const RUST_CORE_NPM_CONTRACT = {
  packagedBinaryOnly: true,
  postinstallCompilation: false,
  npmUsersRequireRust: false,
  sourceDevelopmentCommand: `cargo build --package ${RUST_CORE_PACKAGE}`,
};
