# Multi-agent workflow

Several agents build this game at the same time. These rules keep us out of each other's way.

## Roles
- **Supervisor** (the main Claude session): owns `src/core/**`, the contracts, the theme, and the docs.
  Answers questions, approves contract changes, reviews integration, and checks in about every 10 minutes.
- **Teams**: `story`, `hub`, `action`, `games-a`, `games-b`, `art`. Each team owns the paths listed in `OWNERS.json`.

## Git
1. Each agent works in **its own git worktree on its own branch**. Never touch another agent's worktree.
2. Edit **only files your team owns.** `tools/check.mjs --team <team>` rejects anything else.
3. Commit small and often, using conventional messages prefixed with your team: `action: add Popsicle Knight shield logic`.
4. Integrate with **`tools/ship.sh <team>`**, which:
   fetches, rebases onto `origin/main`, runs the checks, and pushes `HEAD:main`, retrying if someone
   else shipped first. It **never** force-pushes.
5. Ship whenever the game still runs and you have made a meaningful step, at least every ~30 minutes. Keep
   `main` always playable. Don't ship something that crashes the title → overworld → level loop.
6. Never `git push --force`, never rewrite `main`, and never commit the raw `*.jpg` photos in the repo root.
7. If ship reports a **rebase conflict** or ownership error, stop and message the supervisor.

## Talking to the supervisor
- Use `SendMessage` with `to: "main"`. Make the first line a one-sentence summary.
- **Ask, don't guess**, when you need: a contract or signature change, a new theme constant or asset,
  something from another team, or a design call that the bible doesn't settle.
- While you wait for an answer, keep working on something that doesn't depend on it.
- When the supervisor checks in, reply briefly: what you shipped, what's next, blockers, and questions.

## Testing your work
- `node tools/check.mjs`: syntax, import and export resolution.
- `node tools/smoke.mjs --port <your port>`: boots every scene (all regions × mission kinds) in headless
  Chrome, mashes the inputs, and fails on any uncaught exception, `console.error`, or engine crash screen.
  Add `--shots <dir>` for screenshots, which you can Read to *look* at your work. Use `ONLY="scene=level&region=summit"`
  to test a single URL. `ship.sh` runs it automatically.
- Serve manually with `python3 -m http.server <port>`, using **your own port** so you don't collide with other agents:
  action 8101, hub 8102, art 8103, story 8104, games-a 8105, games-b 8106. Kill your server when you're done.
- **Scratch files go in `<scratchpad>/<your-team>/` only.** All agents share one scratchpad directory; never write outside your subfolder.
- **Always launch any browser with `--mute-audio`.** Sound from test runs plays out loud on the user's machine.
- Use deep links (see docs/ARCHITECTURE.md) to test your scene directly, e.g. `?scene=room&roomId=kitchen&hero=victoria&dev=allskills`.
- If you have a headless browser available, use it to confirm there are no console errors. If you don't,
  reason carefully about runtime errors, because a broken `main` blocks everyone.
