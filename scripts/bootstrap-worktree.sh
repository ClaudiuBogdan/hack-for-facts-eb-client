#!/usr/bin/env bash
set -euo pipefail

# Bootstrap a worktree checkout: copy local secrets/certs and install dependencies.
# Used by Cursor (.cursor/setup-worktree-unix.sh) and scripts/create-worktree.sh.

WORKTREE_PATH="${1:-$(pwd)}"
WORKTREE_PATH="$(cd "$WORKTREE_PATH" && pwd)"

copy_if_exists() {
  local sourcePath="$1"
  local destinationPath="$2"

  if [[ -f "$sourcePath" ]]; then
    cp "$sourcePath" "$destinationPath"
    echo "Copied $(basename "$destinationPath")"
  fi
}

resolve_source_root() {
  if [[ -n "${ROOT_WORKTREE_PATH:-}" ]]; then
    cd "$ROOT_WORKTREE_PATH" && pwd
    return 0
  fi

  if [[ -n "${SOURCE_WORKTREE_PATH:-}" ]]; then
    cd "$SOURCE_WORKTREE_PATH" && pwd
    return 0
  fi

  local mainWorktreePath
  mainWorktreePath="$(git -C "$WORKTREE_PATH" worktree list | head -1 | awk '{print $1}')"

  if [[ -n "$mainWorktreePath" && -d "$mainWorktreePath" ]]; then
    cd "$mainWorktreePath" && pwd
    return 0
  fi

  echo "Unable to resolve source root for env copy." >&2
  echo "Set ROOT_WORKTREE_PATH to the main checkout path." >&2
  exit 1
}

SOURCE_ROOT="$(resolve_source_root)"

echo "Bootstrapping worktree: $WORKTREE_PATH"
echo "Copying local files from: $SOURCE_ROOT"

copy_if_exists "$SOURCE_ROOT/.env" "$WORKTREE_PATH/.env"
copy_if_exists "$SOURCE_ROOT/.env.local" "$WORKTREE_PATH/.env.local"

shopt -s nullglob
for envFile in "$SOURCE_ROOT"/.env.*.local; do
  copy_if_exists "$envFile" "$WORKTREE_PATH/$(basename "$envFile")"
done
shopt -u nullglob

copy_if_exists "$SOURCE_ROOT/localhost-key.pem" "$WORKTREE_PATH/localhost-key.pem"
copy_if_exists "$SOURCE_ROOT/localhost-cert.pem" "$WORKTREE_PATH/localhost-cert.pem"

cd "$WORKTREE_PATH"

if ! yarn install --frozen-lockfile; then
  echo "Frozen lockfile install failed; retrying with yarn install"
  yarn install
fi

echo ""
echo "Worktree bootstrap complete."
echo "If the scrapper repo is not a sibling checkout, set VITE_SCRAPPER_REPO_ROOT in .env"
