#!/usr/bin/env bash
# Install a source-checkout dogfood command as `zcodegraph-dev`.
#
# This intentionally never creates or replaces `zcodegraph`; that command name
# belongs to the installed/release channel.

set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

BIN_DIR="${HOME}/.local/bin"
BUILD_ON_RUN=1
REPAIR_ZCODEGRAPH=0

usage() {
  cat <<'USAGE'
Usage: scripts/dev-link.sh [--bin-dir <dir>] [--no-build] [--repair-zcodegraph]

Installs a development shim named zcodegraph-dev.

Options:
  --bin-dir <dir>  Directory to write zcodegraph-dev into (default: ~/.local/bin)
  --no-build       Generate a faster shim that skips npm run build on each run
  --repair-zcodegraph
                   Remove a legacy zcodegraph dev shim only when it can be
                   proven to point at this checkout
  -h, --help       Show this help

Invariant:
  This script never creates, replaces, unlinks, or npm-links zcodegraph.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --bin-dir)
      if [ "$#" -lt 2 ]; then
        echo "error: --bin-dir requires a directory" >&2
        exit 2
      fi
      BIN_DIR="$2"
      shift 2
      ;;
    --no-build)
      BUILD_ON_RUN=0
      shift
      ;;
    --repair-zcodegraph)
      REPAIR_ZCODEGRAPH=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

shell_quote() {
  printf "'%s'" "$(printf "%s" "$1" | sed "s/'/'\\\\''/g")"
}

resolve_path() {
  node -e "const fs=require('fs'); const path=require('path'); try { console.log(fs.realpathSync(process.argv[1])); } catch { console.log(path.resolve(process.argv[1])); }" "$1"
}

legacy_zcodegraph_path() {
  command -v zcodegraph 2>/dev/null || true
}

is_current_checkout_zcodegraph() {
  local candidate="$1"
  [ -n "$candidate" ] || return 1
  [ -e "$candidate" ] || [ -L "$candidate" ] || return 1

  local resolved
  local expected
  resolved="$(resolve_path "$candidate")"
  expected="$(resolve_path "$REPO_ROOT/dist/bin/zcodegraph.js")"
  [ "$resolved" = "$expected" ] && return 0

  if [ -f "$candidate" ] && grep -F "$REPO_ROOT/dist/bin/zcodegraph.js" "$candidate" >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

warn_or_repair_legacy_zcodegraph() {
  local legacy
  legacy="$(legacy_zcodegraph_path)"
  [ -n "$legacy" ] || return 0

  if ! is_current_checkout_zcodegraph "$legacy"; then
    return 0
  fi

  if [ "$REPAIR_ZCODEGRAPH" -eq 1 ]; then
    rm -f "$legacy"
    echo
    echo "Removed legacy zcodegraph dev shim:"
    echo "  $legacy"
    return 0
  fi

  echo
  echo "Detected legacy zcodegraph dev shim:"
  echo "  $legacy -> $REPO_ROOT/dist/bin/zcodegraph.js"
  echo
  echo "zcodegraph should remain your release command."
  echo "To remove this legacy dev shim, run:"
  echo "  scripts/dev-link.sh --repair-zcodegraph"
}

mkdir -p "$BIN_DIR"

TARGET="${BIN_DIR%/}/zcodegraph-dev"
TMP="${TARGET}.tmp.$$"
QUOTED_REPO_ROOT="$(shell_quote "$REPO_ROOT")"

{
  echo '#!/usr/bin/env bash'
  echo 'set -euo pipefail'
  echo "REPO_ROOT=${QUOTED_REPO_ROOT}"
  echo 'cd "$REPO_ROOT"'
  if [ "$BUILD_ON_RUN" -eq 1 ]; then
    echo 'npm run build'
  fi
  echo 'exec node "$REPO_ROOT/dist/bin/zcodegraph.js" "$@"'
} > "$TMP"

chmod 755 "$TMP"
mv "$TMP" "$TARGET"

echo "Installed zcodegraph-dev:"
echo "  $TARGET"
if [ "$BUILD_ON_RUN" -eq 1 ]; then
  echo "Mode: build on each run"
else
  echo "Mode: no-build (uses existing dist/)"
fi
echo
echo "Release channel remains:"
echo "  zcodegraph"

warn_or_repair_legacy_zcodegraph

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    echo
    echo "Warning: $BIN_DIR is not on PATH."
    echo "Add it to PATH or run $TARGET directly."
    ;;
esac
