# Story team: what we own and how to use it

Owns `src/story/**`, `src/audio/**`, `docs/STORY.md` and this file.

## The voice: `src/story/lines.js`
- `bark(roomId, event, { hero, skill })` returns `{ who, text }` or null, and never throws. Use `.text` for floating text.
  - Events: `start`, `boss`, `lowhp`, `hit`, `skillEarned` (pass `skill`), `win`, `lose`, `minigame`, `minigameWin`, `minigameFail`.
  - Pass the hero on the field. You get that hero's line or a PartyPlanner `> ` log line.
- `logLine(n?)` returns a PartyPlanner joke log line (no `> ` prefix), for hub tickers and loading screens.
- `CUTSCENES[id]` is `{ bg, shots }`, and `getCutscene(id, params)` resolves `'party'` by `partyScore`.
- `docs/STORY.md` is generated from lines.js, so never edit it by hand. Need a line? Message story.

## Scenes
- `title`: the house at dusk, both busts, PartyPlanner ticker, New Game / Continue and a controls card.
  If a save exists, Enter continues, and New Game asks for a second click before it wipes the save.
- `cutscene` (`params: { id, next, partyScore? }`):
  - Backdrop per room. It uses art's `drawRoom` when it exists, otherwise `src/story/backdrops.js`.
  - Art's `drawBust` busts slide in (Aaron left, Victoria right). The speaker is lit and the listener is dimmed.
  - PartyPlanner speaks in a terminal box with a blinking cursor.
  - Intros show a **GOAL** banner on every line. The last outro line shows a **NEW SKILLS** card, and prefinale shows the ultimates.
  - The last line shows "Next: choose your hero / back to the house map".
  - The 'party' variants end on an end card, then go to `next` (title).
  - Click, Enter or Space advances. Esc or Backspace skips. Unknown ids fall straight through to `next`.

## Audio: `src/audio/sfx.js` (signatures frozen)
- Every theme.SFX name is synthesized. Unknown names are ignored. Rapid repeats are rate-limited.
- Music: a step sequencer per theme.MUSIC track, with 1.2 s crossfades and a quiet default (music 0.32 × per-track volume).
  Internal extra track `backyard` (Marching Ravens snare cadence). `boss` also uses drumline rolls.
- **Auto-music**: `scene:changed` picks the track: title→title, hub/select/results→house,
  room→room (backyard: backyard, pond: boss), minigame→minigame (backyard: backyard), cutscene→cutscene / party.
  An explicit `playMusic()` in your scene's `enter()` overrides it.
- `setVolume({ master, music, sfx })` takes values from 0 to 1.
