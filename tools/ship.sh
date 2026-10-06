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

for attempt in 1 2 3 4 5; do
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
  case "$TEAM" in action) PORT=8101;; strategy) PORT=8102;; presentation) PORT=8103;; *) PORT=8100;; esac
  node tools/smoke.mjs --port "$PORT"
  if git push -q origin HEAD:main; then
    echo "ship: pushed $(git rev-parse --short HEAD) to origin/main"
    exit 0
  fi
  echo "ship: push rejected (someone shipped first). Retrying ($attempt)..." >&2
  sleep $((RANDOM % 4 + 1))
done
echo "ship: gave up after 5 attempts; message the supervisor." >&2
exit 3
