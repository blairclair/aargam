// Short, warm mission banter (each line < 90 chars). Owned by: action team.
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const REGION_OPEN = {
  lakeside: [
    [{ who: 'aaron', text: 'Frost on the picnic tables? In August? Not on my watch.' },
      { who: 'victoria', text: 'They iced the pavilion. Whoever did this has no sense of history.' }],
    [{ who: 'victoria', text: 'Is that... frost on the lake? It was 85 degrees yesterday.' },
      { who: 'aaron', text: 'Trail Guide rule one: leave no Frostling behind. Rule two: snacks.' }],
  ],
  oldcity: [
    [{ who: 'victoria', text: 'These brick alleys are two hundred years old. Hands off, popsicles!' },
      { who: 'aaron', text: 'You take the history, I\'ll take the hooligans.' }],
    [{ who: 'aaron', text: 'They frosted the flower boxes. Even the pumpkins look cold.' },
      { who: 'victoria', text: 'Then let\'s give this city its autumn back. After the ice cream.' }],
  ],
  summit: [
    [{ who: 'aaron', text: 'What a view! ...Shame about the blizzard and the angry sorbet.' },
      { who: 'victoria', text: 'Eyes on the ridge, trail guide. Admire the vista after.' }],
    [{ who: 'victoria', text: 'The air smells like freezer burn up here.' },
      { who: 'aaron', text: 'Thin air, thick ice. Let\'s climb!' }],
  ],
};

const KIND_LINE = {
  skirmish: [
    { who: 'victoria', text: 'A whole Syndicate patrol. Let\'s send them back to the freezer.' },
    { who: 'aaron', text: 'Clear the area and the scoops are ours. Ready, partner?' },
  ],
  rescue: [
    { who: 'victoria', text: 'Townsfolk frozen in ice blocks! Break them out. Gently!' },
    { who: 'aaron', text: 'Hang tight, folks! The thaw squad has arrived.' },
  ],
  defend: [
    { who: 'aaron', text: 'Protect the ice-cream cart! It\'s the last one in town!' },
    { who: 'victoria', text: 'If they touch the mint chip, I will not be held responsible.' },
  ],
  boss: [
    { who: 'aaron', text: 'Something big is rumbling up ahead. Stay close.' },
  ],
};

const TIP = { who: 'narrator', text: 'Tip: Q swaps heroes. The benched hero slowly recovers HP.' };

export function introLines(params, bossType, firstTime) {
  const lines = [...pick(REGION_OPEN[params.region] ?? REGION_OPEN.lakeside), pick(KIND_LINE[params.kind] ?? KIND_LINE.skirmish)];
  if (params.kind === 'boss') {
    if (bossType === 'baron_brrr') {
      lines.push(
        { who: 'baron', text: 'Welcome, sunburnt peasants, to my Fortress of Eternal Brrr!' },
        { who: 'baron', text: 'Every scoop in the land is MINE. The mint chip especially.' },
        { who: 'victoria', text: 'Okay. Now it\'s personal.' },
        { who: 'aaron', text: 'Nice monocle, Baron. Shame it\'s about to fog up.' },
      );
    } else {
      lines.push(
        { who: 'golem', text: 'SLUUUUSH.' },
        { who: 'victoria', text: 'That is the biggest slushie I have ever seen.' },
        { who: 'aaron', text: 'And it\'s blocking the trail. Let\'s melt it!' },
      );
    }
  }
  if (params.modifiers?.includes('blizzard')) lines.push({ who: 'victoria', text: 'Blizzard\'s rolling in. Expect a lot more of them.' });
  if (params.modifiers?.includes('warm_cocoa')) lines.push({ who: 'aaron', text: 'Cocoa stand top-off! I feel invincible. Mostly.' });
  if (params.modifiers?.includes('ally_scouts')) lines.push({ who: 'victoria', text: 'Our scouts marked the Syndicate positions. Look sharp.' });
  if (firstTime) lines.push(TIP);
  return lines;
}

export function victoryLines(params, bossType) {
  if (params.kind === 'boss' && bossType === 'baron_brrr') {
    return [
      { who: 'baron', text: 'Impossible! Defeated by... by... a SUNNY DISPOSITION?!' },
      { who: 'victoria', text: 'And I\'ll be taking back the mint chip, thank you.' },
      { who: 'aaron', text: 'Summer\'s back! Best. Summit. EVER.' },
    ];
  }
  return pick([
    [{ who: 'aaron', text: 'Ha! That\'s how we do it on the trail.' }, { who: 'victoria', text: 'Grab the scoops, hero. They\'re melting.' }],
    [{ who: 'victoria', text: 'Feel that? The sun\'s warming up again.' }, { who: 'aaron', text: 'Team Aaron and Victoria: undefeated. Ice cream break?' }],
    [{ who: 'aaron', text: 'Did you see my Summit Shout? I think I scared a pine tree.' }, { who: 'victoria', text: 'I saw it. The whole valley heard it.' }],
    [{ who: 'victoria', text: 'Another patch of summer saved.' }, { who: 'aaron', text: 'High five! ...Careful, my hand\'s still a little frosty.' }],
  ]);
}

export function defeatLines(params, bossType) {
  const lines = [
    { who: 'aaron', text: 'Brain... freeze... regroup at camp?' },
    { who: 'victoria', text: 'We\'ll warm up, grab some cocoa, and come back stronger.' },
  ];
  if (bossType === 'baron_brrr') lines.unshift({ who: 'baron', text: 'Ha! Run along home, little sunbeams. Summer is CANCELLED!' });
  return lines;
}

export const RESCUE_THANKS = ['Thank you!', 'I can feel my toes!', 'Ice cream heroes!', 'Brrr... thanks!', 'My hero!', 'Is it summer again?'];
export const HERO_RESCUE_BARKS = [
  ['victoria', 'Out you come! Go get warm.'],
  ['aaron', 'One more thawed! Head for the sunshine!'],
  ['victoria', 'You\'re safe now. Find some cocoa.'],
  ['aaron', 'Free as a summit breeze!'],
];
