// Scene registry. Owned by: supervisor. Each scene file is owned by one team (see OWNERS.json).
import TitleScene from './ui/title.js';
import EndingScene from './ui/ending.js';
import OverworldScene from './strategy/overworld.js';
import CampScene from './strategy/camp.js';
import LevelScene from './action/level.js';

export const SCENES = {
  title: TitleScene,       // ui
  ending: EndingScene,     // ui     params: { victory: boolean }
  overworld: OverworldScene, // strategy params: { outcome?: MissionOutcome }
  camp: CampScene,         // strategy
  level: LevelScene,       // action   params: MissionParams
};
