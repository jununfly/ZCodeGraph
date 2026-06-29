#!/usr/bin/env bash
# One-shot ZCodeGraph quality audit:
#   set version -> ensure corpus repo -> wipe+reindex with that version ->
#   run with/without A/B.
#
# Usage: audit.sh <version> <repo-name> <repo-url> "<question>" [headless|all]
#   <version>    "local" (build + temporary zcodegraph-dev) | "latest" | a version (e.g. 0.7.10)
#   <repo-name>  dir name under the corpus dir
#   <repo-url>   git URL (cloned --depth 1 when the repo dir is missing)
#   [mode]       headless (default) | all (also the interactive tmux arms)
# Env: CORPUS  corpus dir (default: /tmp/zcodegraph-corpus)
set -uo pipefail

VERSION="${1:?usage: audit.sh <version> <repo-name> <repo-url> \"<question>\" [mode]}"
NAME="${2:?repo-name required}"
URL="${3:?repo-url required}"
Q="${4:?question required}"
MODE="${5:-headless}"

HARNESS="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HARNESS/../.." && pwd)"     # zcodegraph repo root
CORPUS="${CORPUS:-/tmp/zcodegraph-corpus}"
REPO="$CORPUS/$NAME"
PKG="@jununfly/zcodegraph"
DEV_BIN_DIR=""

echo "==================== ZCodeGraph audit ===================="
echo "version=$VERSION  repo=$NAME  mode=$MODE  corpus=$CORPUS"
echo

# 1. Set the zcodegraph version under test.
if [ "$VERSION" = local ]; then
  echo "→ [1/4] building local dev build and installing temporary zcodegraph-dev"
  DEV_BIN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/zcodegraph-dev-bin.XXXXXX")"
  ( cd "$REPO_ROOT" && npm run build && ./scripts/dev-link.sh --bin-dir "$DEV_BIN_DIR" --no-build ) || {
    echo "local dev setup failed"
    exit 1
  }
  CG_BIN="$DEV_BIN_DIR/zcodegraph-dev"
else
  echo "→ [1/4] installing $PKG@$VERSION globally"
  npm install -g "$PKG@$VERSION" || { echo "npm install -g $PKG@$VERSION failed"; exit 1; }
  CG_BIN="$(command -v zcodegraph)"
fi
ACTUAL="$("$CG_BIN" --version 2>/dev/null || echo '?')"
echo "  zcodegraph under test: $CG_BIN -> $ACTUAL"

# 2. Ensure the corpus repo exists (clone shallow if missing, reuse if present).
mkdir -p "$CORPUS"
if [ -d "$REPO/.git" ]; then
  echo "→ [2/4] reusing existing checkout: $REPO"
else
  echo "→ [2/4] cloning $URL"
  git clone --depth 1 "$URL" "$REPO" || { echo "git clone failed"; exit 1; }
fi

# 3. Wipe + re-index with THIS version (the index must be built by the same
#    binary that serves it — different versions extract differently).
echo "→ [3/4] wiping .zcodegraph and re-indexing with $ACTUAL"
rm -rf "$REPO/.zcodegraph"
( cd "$REPO" && "$CG_BIN" init ) || { echo "indexing failed"; exit 1; }

# 4. Run the with/without A/B.
echo "→ [4/4] running A/B harness (mode=$MODE)"
CG_BIN="$CG_BIN" bash "$HARNESS/run-all.sh" "$REPO" "$Q" "$MODE"

[ -n "$DEV_BIN_DIR" ] && rm -rf "$DEV_BIN_DIR"
echo "==================== audit complete ===================="
