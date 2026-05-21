#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/create-worktree.sh <slug> [branch-name]

Examples:
  ./scripts/create-worktree.sh political feat/new-datasets-political
  ./scripts/create-worktree.sh soe

Environment:
  WORKTREE_BASE_BRANCH   Base branch to branch from (default: feat/new-datasets)
  CODEX_WORKTREES_ROOT   Root directory for worktrees (default: ~/.codex/worktrees)
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

SLUG="${1:?Missing slug. Run with --help for usage.}"
BRANCH="${2:-}"
REPO_NAME="hack-for-facts-eb-client"
BASE_BRANCH="${WORKTREE_BASE_BRANCH:-feat/new-datasets}"
WORKTREE_ROOT="${CODEX_WORKTREES_ROOT:-$HOME/.codex/worktrees}"
WORKTREE_PATH="$WORKTREE_ROOT/$SLUG/$REPO_NAME"
MAIN_REPO="$(git rev-parse --show-toplevel)"
OPENCODE_BIN="${OPENCODE_BIN:-$HOME/.opencode/bin/opencode}"

if [[ -e "$WORKTREE_PATH" ]]; then
  echo "Worktree path already exists: $WORKTREE_PATH" >&2
  exit 1
fi

mkdir -p "$(dirname "$WORKTREE_PATH")"

if [[ -n "$BRANCH" ]]; then
  git -C "$MAIN_REPO" worktree add -B "$BRANCH" "$WORKTREE_PATH" "$BASE_BRANCH"
else
  git -C "$MAIN_REPO" worktree add "$WORKTREE_PATH" "$BASE_BRANCH"
fi

export ROOT_WORKTREE_PATH="$MAIN_REPO"
bash "$MAIN_REPO/scripts/bootstrap-worktree.sh" "$WORKTREE_PATH"

echo ""
echo "Worktree ready: $WORKTREE_PATH"
echo "Open in Cursor: File -> Open Folder -> $WORKTREE_PATH"

if [[ -x "$OPENCODE_BIN" ]]; then
  echo "OpenCode: $OPENCODE_BIN run --dir \"$WORKTREE_PATH\" \"<prompt>\""
else
  echo "OpenCode: opencode run --dir \"$WORKTREE_PATH\" \"<prompt>\""
fi

echo "Codex: open $WORKTREE_PATH as the workspace root"
echo ""
git -C "$MAIN_REPO" worktree list
