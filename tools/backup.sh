#!/usr/bin/env bash
# Back up your in-progress work to GitHub so a usage cutoff / crash never loses it.
# Usage: tools/backup.sh <team>
# Snapshots HEAD + ALL uncommitted changes (incl. untracked) into a detached commit using a temporary
# index — your branch, index and working tree are NOT modified, so autosaves never leak into main.
# Pushes the snapshot to origin/wip/<team> (your own backup branch; force is fine there, NEVER on main).
set -euo pipefail
TEAM="${1:?usage: tools/backup.sh <team>}"
cd "$(git rev-parse --show-toplevel)"
TMP_INDEX="$(mktemp -t aargam-backup-index.XXXXXX)"
trap 'rm -f "$TMP_INDEX"' EXIT
cp "$(git rev-parse --git-path index)" "$TMP_INDEX" 2>/dev/null || true
GIT_INDEX_FILE="$TMP_INDEX" git add -A
TREE="$(GIT_INDEX_FILE="$TMP_INDEX" git write-tree)"
if [ "$TREE" = "$(git rev-parse 'HEAD^{tree}')" ]; then SNAP="$(git rev-parse HEAD)"
else SNAP="$(git commit-tree "$TREE" -p HEAD -m "wip($TEAM): autosave $(date +%H:%M)")"; fi
git push -q -f origin "$SNAP:refs/heads/wip/$TEAM"
echo "backup: ${SNAP:0:7} -> origin/wip/$TEAM (branch untouched)"
