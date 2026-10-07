#!/usr/bin/env bash
# Back up your in-progress work to GitHub so a usage cutoff / crash never loses it.
# Usage: tools/backup.sh <team>
# Commits any uncommitted changes as "wip(<team>): autosave", then pushes HEAD to origin/wip/<team>
# (your own backup branch — force-pushing it is fine; NEVER force-push main). Does not touch main.
set -euo pipefail
TEAM="${1:?usage: tools/backup.sh <team>}"
cd "$(git rev-parse --show-toplevel)"
git add -A
git diff --cached --quiet || git commit -q -m "wip($TEAM): autosave $(date +%H:%M)"
git push -q -f origin "HEAD:refs/heads/wip/$TEAM"
echo "backup: $(git rev-parse --short HEAD) -> origin/wip/$TEAM"
