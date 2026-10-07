// Scene registry. Owned by: supervisor. Each scene file is owned by one team (see OWNERS.json).
// Transitions between teams go through src/core/flow.js — never switchScene into another team's scene directly.
import TitleScene from './story/title.js';
import CutsceneScene from './story/cutscene.js';
import HubScene from './hub/hub.js';
import SelectScene from './hub/select.js';
import ResultsScene from './hub/results.js';
import RoomScene from './action/room.js';
import MinigameHost from './minigames/host.js';

export const SCENES = {
  title: TitleScene,       // story
  cutscene: CutsceneScene, // story    params: { id, next: {scene, params}, partyScore? }
  hub: HubScene,           // hub      params: { justFinished? }
  select: SelectScene,     // hub      params: { roomId, retry?, lastHero? }
  results: ResultsScene,   // hub      params: { roomId, hero, stars, action, minigame, newSkills }
  room: RoomScene,         // action   params: RoomParams
  minigame: MinigameHost,  // core host -> src/minigames/<roomId>.js   params: MinigameParams
};
