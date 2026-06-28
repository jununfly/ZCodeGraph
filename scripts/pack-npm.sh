#!/usr/bin/env bash
#
# Assemble the npm thin-installer packages from built bundles (esbuild pattern).
#
# Produces, under release/npm/:
#   zcodegraph-<target>/  one per built bundle — the vendored Node + app, tagged
#                         with os/cpu so npm installs only the matching one.
#   main/                 the @jununfly/zcodegraph shim package: a tiny bin
#                         that execs the matching platform bundle, with every
#                         platform package in optionalDependencies.
#
# The release pipeline then `npm publish`es each dir. This does NOT touch the
# repo's package.json — the dev/from-source path keeps working; the *published*
# main package's shape is generated here.
#
# Prereq: run build-bundle.sh for each target first (release/zcodegraph-*.tar.gz).
# Usage:  scripts/pack-npm.sh [version]    (default: version from package.json)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-$(node -p "require('$ROOT/package.json').version")}"
SCOPE="@jununfly"
REL="$ROOT/release"
NPM="$REL/npm"

rm -rf "$NPM"
mkdir -p "$NPM/main"

shopt -s nullglob
archives=("$REL"/zcodegraph-*.tar.gz "$REL"/zcodegraph-*.zip)
[ ${#archives[@]} -gt 0 ] || { echo "[pack-npm] no bundles in $REL — run build-bundle.sh first" >&2; exit 1; }

contract_targets="$(
  ROOT="$ROOT" node --input-type=module -e '
    const { pathToFileURL } = await import("node:url");
    const contractUrl = pathToFileURL(process.env.ROOT + "/scripts/rust-core-artifact-contract.mjs").href;
    const contract = await import(contractUrl);
    process.stdout.write(contract.RUST_CORE_NPM_PACKAGES.map((pkg) => pkg.target).join("\n"));
  '
)"
staged_targets_file="$(mktemp)"
trap 'rm -f "$staged_targets_file"' EXIT
for archive in "${archives[@]}"; do
  fname="$(basename "$archive")"
  case "$fname" in
    *.tar.gz) base="${fname%.tar.gz}" ;;
    *.zip)    base="${fname%.zip}" ;;
  esac
  printf "%s\n" "${base#zcodegraph-}" >> "$staged_targets_file"
done
staged_targets="$(cat "$staged_targets_file")"
contract_sorted="$(printf "%s\n" "$contract_targets" | sed '/^$/d' | sort -u)"
staged_sorted="$(printf "%s\n" "$staged_targets" | sed '/^$/d' | sort -u)"
contract_file="$(mktemp)"
staged_file="$(mktemp)"
trap 'rm -f "$staged_targets_file" "$contract_file" "$staged_file"' EXIT
printf "%s\n" "$contract_sorted" > "$contract_file"
printf "%s\n" "$staged_sorted" > "$staged_file"
missing="$(comm -23 "$contract_file" "$staged_file" | paste -sd ' ' -)"
unexpected="$(comm -13 "$contract_file" "$staged_file" | paste -sd ' ' -)"
if [ -n "$missing" ] || [ -n "$unexpected" ]; then
  echo "[pack-npm] error: staged bundle targets do not match Rust core artifact contract" >&2
  [ -z "$missing" ] || echo "[pack-npm] missing: $missing" >&2
  [ -z "$unexpected" ] || echo "[pack-npm] unexpected: $unexpected" >&2
  exit 1
fi

targets=()
for archive in "${archives[@]}"; do
  fname="$(basename "$archive")"
  case "$fname" in
    *.tar.gz) base="${fname%.tar.gz}" ;;   # zcodegraph-<target>
    *.zip)    base="${fname%.zip}" ;;
  esac
  target="${base#zcodegraph-}"            # <target>, e.g. darwin-arm64 / win32-x64
  os="${target%-*}"                       # darwin | linux | win32
  arch="${target##*-}"                    # arm64 | x64
  pkgdir="$NPM/$base"
  mkdir -p "$pkgdir"
  case "$fname" in
    *.zip)
      tmpx="$(mktemp -d)"
      unzip -q "$archive" -d "$tmpx"
      mv "$tmpx/zcodegraph-${target}"/* "$pkgdir"/
      rm -rf "$tmpx"
      nodefile="node.exe"
      ;;
    *)
      tar -xzf "$archive" -C "$pkgdir" --strip-components=1
      nodefile="node"
      ;;
  esac
  VERSION="$VERSION" SCOPE="$SCOPE" TARGET="$target" OSV="$os" ARCHV="$arch" NODEFILE="$nodefile" \
    node -e '
      const fs=require("fs");
      fs.writeFileSync(process.argv[1], JSON.stringify({
        name: `${process.env.SCOPE}/zcodegraph-${process.env.TARGET}`,
        version: process.env.VERSION,
        description: `CodeGraph self-contained bundle for ${process.env.TARGET}`,
        os: [process.env.OSV], cpu: [process.env.ARCHV],
        files: [process.env.NODEFILE, "lib", "bin"],
        license: "MIT"
      }, null, 2) + "\n");
    ' "$pkgdir/package.json"
  targets+=("$target")
  echo "[pack-npm] ${SCOPE}/zcodegraph-${target}@${VERSION}"
done

# Main shim package.
#   npm-shim.js  CLI/MCP launcher (execs the bundled Node) — the `bin`.
#   npm-sdk.js   programmatic/embedded entry (#354): re-exports the installed
#                platform bundle's compiled library — the `main`.
#   dist/        the .d.ts tree only (types). The runtime .js stays in the
#                per-platform bundle so its deps aren't duplicated here.
cp "$ROOT/scripts/npm-shim.js" "$NPM/main/npm-shim.js"
cp "$ROOT/scripts/npm-sdk.js" "$NPM/main/npm-sdk.js"
[ -f "$ROOT/README.md" ] && cp "$ROOT/README.md" "$NPM/main/README.md"

# Ship the type declarations so `types`/`exports.types` resolve. Built from this
# same release, so they can't skew from the runtime npm-sdk.js re-exports.
[ -f "$ROOT/dist/index.d.ts" ] || ( echo "[pack-npm] building dist for .d.ts" >&2 && cd "$ROOT" && npm run build >/dev/null )
ROOT="$ROOT" DEST="$NPM/main" node -e '
  const fs=require("fs"), path=require("path");
  const src=path.join(process.env.ROOT,"dist"), dest=path.join(process.env.DEST,"dist");
  fs.cpSync(src, dest, { recursive:true, filter(s){
    try { return fs.statSync(s).isDirectory() || s.endsWith(".d.ts"); } catch (e) { return false; }
  }});
'

VERSION="$VERSION" SCOPE="$SCOPE" TARGETS="${targets[*]}" \
  node -e '
    const fs=require("fs");
    const opt={};
    for (const t of process.env.TARGETS.split(/\s+/).filter(Boolean))
      opt[`${process.env.SCOPE}/zcodegraph-${t}`]=process.env.VERSION;
    fs.writeFileSync(process.argv[1], JSON.stringify({
      name: `${process.env.SCOPE}/zcodegraph`,
      version: process.env.VERSION,
      description: "Local-first code intelligence for AI agents (MCP). Self-contained — bundles its own runtime.",
      bin: { zcodegraph: "npm-shim.js" },
      main: "npm-sdk.js",
      types: "dist/index.d.ts",
      exports: {
        ".": { types: "./dist/index.d.ts", default: "./npm-sdk.js" },
        "./package.json": "./package.json"
      },
      optionalDependencies: opt,
      files: ["npm-shim.js","npm-sdk.js","dist","README.md"],
      license: "MIT"
    }, null, 2) + "\n");
  ' "$NPM/main/package.json"

echo "[pack-npm] ${SCOPE}/zcodegraph@${VERSION} (${#targets[@]} platform packages in optionalDependencies)"
echo "[pack-npm] output: $NPM"
