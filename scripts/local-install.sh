#!/usr/bin/env bash
# Compatibility wrapper for the old local development install command.
#
# Historically this script used `npm link` and replaced the global
# `zcodegraph` command. That made source-checkout dogfood leak into ordinary
# projects. The development channel is now explicit: `zcodegraph-dev`.

set -euo pipefail

cd "$(dirname "$0")/.."

BIN_DIR="${HOME}/.local/bin"
UNDO=0
PASSTHROUGH=()

usage() {
  cat <<'USAGE'
Usage: scripts/local-install.sh [--bin-dir <dir>] [--no-build] [--repair-zcodegraph]
       scripts/local-install.sh --undo [--bin-dir <dir>]

Deprecated compatibility wrapper.

Installs the source checkout as zcodegraph-dev. The zcodegraph command name is
reserved for your installed/release channel and is never modified by this
script.

Options:
  --bin-dir <dir>  Directory for zcodegraph-dev (default: ~/.local/bin)
  --no-build       Install a faster zcodegraph-dev shim that skips build on run
  --repair-zcodegraph
                   Remove a legacy zcodegraph dev shim only when it can be
                   proven to point at this checkout
  --undo           Remove zcodegraph-dev only
  -h, --help       Show this help
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
      PASSTHROUGH+=("$1" "$2")
      shift 2
      ;;
    --no-build)
      PASSTHROUGH+=("$1")
      shift
      ;;
    --repair-zcodegraph)
      PASSTHROUGH+=("$1")
      shift
      ;;
    --undo)
      UNDO=1
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

TARGET="${BIN_DIR%/}/zcodegraph-dev"

echo "scripts/local-install.sh has moved to the explicit development channel."
echo "  dev command:     zcodegraph-dev"
echo "  release command: zcodegraph"
echo

if [ "$UNDO" -eq 1 ]; then
  if [ -e "$TARGET" ] || [ -L "$TARGET" ]; then
    rm -f "$TARGET"
    echo "Removed zcodegraph-dev:"
    echo "  $TARGET"
  else
    echo "zcodegraph-dev was not installed at:"
    echo "  $TARGET"
  fi
  echo
  echo "zcodegraph was not modified."
  exit 0
fi

exec ./scripts/dev-link.sh "${PASSTHROUGH[@]}"
