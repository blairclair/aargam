#!/usr/bin/env bash
# Integrate your committed work onto origin/main without stepping on other teams.
# Usage: tools/ship.sh <team>     (team = action | strategy | presentation | supervisor)
# Steps: fetch -> rebase onto origin/main -> check (syntax, imports, ownership) -> headless smoke test -> push HEAD:main.
# Retries if someone else pushed in between. Never force-pushes.
set -euo pipefail
TEAM="${1:?usage: tools/ship.sh <team>}"
cd "$(git rev-parse --show-toplevel)"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ship: you have uncommitted changes. Commit (or stash) first." >&2; exit 1
fi

for attempt in 1 2 3 4 5 6 7 8; do
  git fetch -q origin
  if git rev-parse -q --verify origin/main >/dev/null; then
    if ! git rebase -q origin/main; then
      git rebase --abort || true
      echo "ship: REBASE CONFLICT against origin/main. Do not force anything." >&2
      echo "      Files: $(git diff --name-only --diff-filter=U | tr '\n' ' ')" >&2
      echo "      Message the supervisor (SendMessage to: main) with the conflicting files." >&2
      exit 2
    fi
  fi
  node tools/check.mjs --team "$TEAM"
  # Full headless smoke only on the first attempt; retries (someone else shipped first) re-run the fast
  # check only, so 9 teams racing to push don't starve each other with 2-minute smoke reruns.
  if [ "$attempt" = 1 ]; then
  case "$TEAM" in action) PORT=8101;; hub) PORT=8102;; art) PORT=8103;; story) PORT=8104;; games-a) PORT=8105;; games-b) PORT=8106;; art-world) PORT=8107;; games-c) PORT=8108;; games-d) PORT=8109;; *) PORT=8100;; esac
  # CPU is shared by every agent: allow at most 2 concurrent smokes machine-wide (mkdir = atomic lock).
  LOCKBASE="${TMPDIR:-/tmp}/aargam-smoke"
  SLOT=""
  while [ -z "$SLOT" ]; do
    for n in 1 2; do
      if mkdir "$LOCKBASE.$n" 2>/dev/null; then SLOT="$LOCKBASE.$n"; break; fi
      # reclaim a slot whose holder died (older than 10 minutes)
      if [ -n "$(find "$LOCKBASE.$n" -maxdepth 0 -mmin +10 2>/dev/null)" ]; then rmdir "$LOCKBASE.$n" 2>/dev/null; fi
    done
    [ -z "$SLOT" ] && { echo "ship: waiting for a smoke slot..." >&2; sleep 5; }
  done
  trap 'rmdir "$SLOT" 2>/dev/null' EXIT
  node tools/smoke.mjs --port "$PORT" || { rmdir "$SLOT" 2>/dev/null; exit 1; }
  rmdir "$SLOT" 2>/dev/null; trap - EXIT
  fi
  if git push -q origin HEAD:main; then
    echo "ship: pushed $(git rev-parse --short HEAD) to origin/main"
    exit 0
  fi
  echo "ship: push rejected (someone shipped first). Retrying ($attempt)..." >&2
  sleep $((RANDOM % 6 + 1))
done
echo "ship: gave up after 8 attempts; message the supervisor." >&2
exit 3
