// Story beats for the strategy layer. Owned by: strategy. Lines stay under 90 chars.
const A = (text) => ({ who: 'aaron', text });
const V = (text) => ({ who: 'victoria', text });
const B = (text) => ({ who: 'baron', text });
const N = (text) => ({ who: 'narrator', text });

export const FIRST_VISIT = [
  N('The last week of summer. The lake is... crunchy?'),
  V('Aaron. The freezer is empty. They took the mint chocolate chip.'),
  A('Who would DO that? Who steals mint chip in August?'),
  B('Ah-ha-HA! Baron von Brrr, at your service. Summer is cancelled!'),
  V('He has a monocle. Of course he has a monocle.'),
  A('Okay. Map out. We thaw the camp, then the Old City, then the summit.'),
  V('Every night the frost spreads. Watch the forecast and pick our fights.'),
  A('And Sunshine pushes the frost back. I packed extra. Mostly in my heart.'),
  V('Click a glowing node to go. Camp is for upgrades. Let\'s get our scoops back.'),
];

export const LIBERATED = {
  lakeside: [
    N('The Slush Golem melts into a very large, very sad puddle.'),
    A('Lakeside Camp is free! The pavilion is ours again!'),
    V('The road to the Old City is open. I know a great little alley...'),
    A('Of course you do.'),
  ],
  oldcity: [
    N('The clocktower thaws and chimes. It is, apparently, ice cream o\'clock.'),
    V('Look! The flower boxes are blooming again. Mums AND pumpkins!'),
    A('Next stop: Blue Ridge Summit. I have been waiting ALL GAME for this.'),
    V('You\'ve been waiting since 2019, honestly.'),
  ],
  summit: [
    A('Glacier Gate is down! That view... I\'m not crying. It\'s melting snow.'),
    V('The Baron\'s fortress is right there. And I can smell mint chip.'),
    B('You dare approach my fortress? I shall freeze you... POMPOUSLY!'),
  ],
};

export const BARON_DEFEATED = [
  B('My scoops! My beautiful frozen empire! Brrr-utal!'),
  V('Mint chocolate chip. Hand it over, Baron.'),
  A('Summer is SAVED!'),
];

export const DEFEAT_LINES = [
  [A('Okay, tactical retreat. Very tactical.'), V('We regroup, we get cocoa, we try again.')],
  [V('That did not go to plan.'), A('There was a plan? I just ran at the frosty guys.')],
  [A('Ow. Brain freeze. Full-body brain freeze.'), V('Back to camp. Tomorrow we come back warmer.')],
];

export const CAMP_CHILL_WARNING = [
  V('Aaron, the camp is getting cold. Like, really cold.'),
  A('If camp freezes, we lose base. Thaw or shield the frozen spot next to it!'),
];

/** Optional mission-start banter (passed as MissionParams.intro). */
export const NODE_INTROS = {
  pavilion: [A('Frostlings in OUR pavilion? We had a reservation!'), V('Sweep them out. I\'ll cover you.')],
  dock: [V('Guard the cart until the boats thaw out.'), A('Nobody touches the rocky road on my watch.')],
  picnic: [V('People are frozen mid-sandwich! Break them out!'), A('Don\'t worry, folks. Your potato salad is safe.')],
  pines: [A('These pines are my people. Let\'s go.'), V('Your people are trees, Aaron.')],
  sandbar: [B('Behold my Slush Golem! Two tons of pure brain freeze!'), A('Big guy. Slow guy. Flank it, Vic!')],
  elfreth: [V('One of the oldest streets around. Do NOT scratch the doors.'), A('Noted. Hit the ice, not the history.')],
  lamplight: [A('Protect the cart! Under the lamps, by the bollards!'), V('Red and black bollards. Very chic. Defend them.')],
  flowerbox: [V('They froze the pumpkins. That is a crime against autumn.'), A('Free the shopkeepers, save the gourds.')],
  market: [V('Popsicle Knights. Shields in front, so hit them from behind.'), A('Got it. Sneaky. I can be sneaky.')],
  clocktower: [B('Another Golem! Slushier! Golem-ier!'), V('He\'s just saying words now.')],
  overlook: [A('Overlook Trail! Best view in the whole land!'), V('Enjoy it after we clear the Frostlings.')],
  switchback: [A('Frozen hikers on MY switchbacks? Unacceptable.'), V('Rescue now, trail etiquette lecture later.')],
  ranger: [V('Hold the lookout while the cart climbs.'), A('Keep the cart rolling. Summit or bust!')],
  ridge: [A('Hazy Ridge. Those blue mountains go forever.'), V('So do these Frostlings, apparently.')],
  glacier_gate: [B('My finest Golem guards the gate! You shall not pass!'), A('We shall, actually. Watch.')],
  fortress: [B('Welcome to my fortress! Mind the floors. They are ice.'), V('Give back the mint chip, Baron.'), B('NEVER! Brrr-ha-ha!')],
};
