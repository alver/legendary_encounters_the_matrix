// cardsReloaded.ts — the second film ("The Matrix Reloaded"): its four Hero
// Groups (Neo (Reloaded), Morpheus and Trinity (Reloaded/Revolutions — shared
// with the third film), Ship Captains), the Keymaker Extra group, and the
// three Act mini-decks with their Extras.
// Data transcribed from the Sorting Guide / card scans.

import { C } from './cardsCore';

/* ═══════════════ Hero Groups ═══════════════ */

// — Neo (Reloaded)
C({
  id: 'NeoReloaded_2Common',
  name: 'Brawl',
  type: 'hero',
  group: 'NeoReloaded',
  cls: 'U',
  attack: 2,
  cost: 3,
  copies: 5,
  text: '{U}: You get +1 ⚔. Get an additional +1 ⚔ for each Enemy in the Combat Zone.',
});
C({
  id: 'NeoReloaded_3Common',
  name: 'Doing His Superman Thing',
  type: 'hero',
  group: 'NeoReloaded',
  cls: 'R',
  recruit: 2,
  cost: 4,
  copies: 5,
  text: 'Once this turn, you may move to the Real World. {R}: You may scan any space. If there are no face-down cards in the Matrix Row, you may draw a card instead.',
});
C({
  id: 'NeoReloaded_4Uncommon',
  name: 'The Bullet Is Still Inside',
  type: 'hero',
  group: 'NeoReloaded',
  cls: 'U',
  attack: 3,
  cost: 6,
  copies: 3,
  text: '{U}: Count the number of {U} Heroes in your play area (including this one). You may heal up to that many Strikes.',
});
C({
  id: 'NeoReloaded_1Rare',
  name: "I'll Handle Them",
  type: 'hero',
  group: 'NeoReloaded',
  cls: 'S',
  attack: 6,
  cost: 8,
  copies: 1,
  text: '{S}: Count the number of {S} Heroes in your play area (including this one). Avoid that many of the next Strikes you would draw this turn. Enemies have that much -⚔ this turn.',
});

// — Morpheus (Reloaded/Revolutions)
C({
  id: 'MorpheusRelRev_2Common',
  name: 'Some of You Believe as I Believe',
  type: 'hero',
  group: 'MorpheusRelRev',
  cls: 'I',
  recruit: 2,
  cost: 3,
  copies: 5,
  text: '{I}: You and each player in the same place as you (Real World or Matrix) draw a card.',
});
C({
  id: 'MorpheusRelRev_3Common',
  name: 'Towering Leap',
  type: 'hero',
  group: 'MorpheusRelRev',
  cls: 'S',
  recruit: 2,
  cost: 4,
  copies: 5,
  text: 'Once this turn, when you gain a Hero you may put it on top of your deck.',
});
C({
  id: 'MorpheusRelRev_4Uncommon',
  name: 'Zion, Hear Me!',
  type: 'hero',
  group: 'MorpheusRelRev',
  cls: 'I',
  recruit: 3,
  cost: 5,
  copies: 3,
  text: '{I}: You get +1 ® for each {I} Hero in your play area (including this one).',
});
C({
  id: 'MorpheusRelRev_1Rare',
  name: 'Fight Through Hel',
  type: 'hero',
  group: 'MorpheusRelRev',
  cls: 'U',
  attack: 4,
  cost: 9,
  copies: 1,
  kw: ['Coordinate'],
  text: 'Coordinate. When you Coordinate this, instead of drawing a card, put this Hero back into your hand at the end of the turn.',
});

// — Trinity (Reloaded/Revolutions)
C({
  id: 'TrinityRelRev_2Common',
  name: 'Scorpion Kick',
  type: 'hero',
  group: 'TrinityRelRev',
  cls: 'S',
  attack: 1,
  cost: 2,
  copies: 5,
  text: '{S}: You get +2 ⚔.',
});
C({
  id: 'TrinityRelRev_3Common',
  name: 'She Is Going to Die',
  type: 'hero',
  group: 'TrinityRelRev',
  cls: 'R',
  attack: 3,
  cost: 3,
  copies: 5,
  text: "Defeat the top card of your deck. (If it's your Free Your Mind card, discard it instead.)",
});
C({
  id: 'TrinityRelRev_4Uncommon',
  name: 'You Always Told Me to Stay Off the Freeway',
  type: 'hero',
  group: 'TrinityRelRev',
  cls: 'R',
  attack: 4,
  cost: 6,
  copies: 3,
  text: '{R}: You get +1 ⚔ for each {R} Hero in your play area (including this one).',
});
C({
  id: 'TrinityRelRev_1Rare',
  name: 'You Give Me Neo or We All Die',
  type: 'hero',
  group: 'TrinityRelRev',
  cls: 'I',
  attack: 4,
  cost: 7,
  copies: 1,
  text: 'Once this turn, you may gain a Neo Hero from the Dock.',
});

// — Ship Captains
C({
  id: 'ShipCaptains_2Common',
  name: 'Soren',
  type: 'hero',
  group: 'ShipCaptains',
  cls: 'T',
  attack: 2,
  cost: 3,
  copies: 5,
  text: '{T}: Once this turn, choose a player. They may defeat a card in their play area or in their discard pile.',
});
C({
  id: 'ShipCaptains_3Common',
  name: 'Roland',
  type: 'hero',
  group: 'ShipCaptains',
  cls: 'I',
  attack: 2,
  cost: 4,
  copies: 5,
  text: 'Once this turn, you may heal a random Strike from yourself or from a player in the same place as you (Real World or Matrix).',
});
C({
  id: 'ShipCaptains_4Uncommon',
  name: 'Ballard',
  type: 'hero',
  group: 'ShipCaptains',
  cls: 'T',
  attack: 2,
  cost: 5,
  copies: 3,
  kw: ['Coordinate'],
  text: 'Coordinate. This Hero does not count toward your limit of Coordinating one card per turn.',
});
C({
  id: 'ShipCaptains_1Rare',
  name: 'Ice',
  type: 'hero',
  group: 'ShipCaptains',
  cls: 'T',
  attack: 5,
  cost: 8,
  copies: 1,
  text: '{T}: Draw a card for each {T} Hero in your play area (including this one).',
});

// — The Keymaker — the Act 2 "Extra" Hero Group, shuffled into Zion by
// "rescue the Keymaker". Digital Heroes with player-chosen classes.
C({
  id: 'Act2FreeTheKeymakerExtra_2Common',
  name: 'You Are Handy',
  type: 'hero',
  group: 'Keymaker',
  cls: null,
  clsWild: true,
  cost: 1,
  copies: 5,
  kw: ['DigitalHero', 'Coordinate'],
  text: 'Digital Hero. Coordinate. Choose a class. This Hero has that class this turn.',
});
C({
  id: 'Act2FreeTheKeymakerExtra_3Common',
  name: "I'm the Keymaker",
  type: 'hero',
  group: 'Keymaker',
  cls: null,
  clsWild: true,
  recruit: 1,
  attack: 1,
  cost: 3,
  copies: 5,
  kw: ['DigitalHero'],
  text: 'Digital Hero. Choose a class. This Hero has that class this turn.',
});
C({
  id: 'Act2FreeTheKeymakerExtra_4Uncommon',
  name: 'Always Another Way',
  type: 'hero',
  group: 'Keymaker',
  cls: null,
  clsWild: true,
  recruit: 2,
  attack: 2,
  cost: 5,
  copies: 3,
  kw: ['DigitalHero'],
  text: 'Digital Hero. Choose two different classes. This Hero has both of those classes this turn.',
});
C({
  id: 'Act2FreeTheKeymakerExtra_1Rare',
  name: 'It Is My Purpose',
  type: 'hero',
  group: 'Keymaker',
  cls: null,
  clsAll: true,
  recruit: 3,
  attack: 3,
  cost: 7,
  copies: 1,
  kw: ['DigitalHero'],
  text: 'Digital Hero. This Hero has all five classes.',
});

/* ═══════════════ Act 1: The Oracle's Call — mini-deck (10) ═══════════════ */
C({
  id: 'Act1TheOraclesCall_1',
  name: 'Upgrades',
  type: 'enemy',
  group: 'RelAct1',
  descriptor: 'Program',
  defeat: 4,
  copies: 3,
  text: "Fight: You may fight this Enemy for free while there's a Neo Hero in your play area.",
});
C({
  id: 'Act1TheOraclesCall_2',
  name: 'Seraph',
  type: 'enemy',
  group: 'RelAct1',
  descriptor: 'Program',
  defeat: 3,
  copies: 1,
  text: "Fight: Discard the top card of the Strike deck. Seraph gets +⚔ during this fight equal to that Strike's damage. (Pay that much additional ⚔ to defeat him. Otherwise, leave him where he is.)",
});
C({
  id: 'Act1TheOraclesCall_3',
  name: 'Crisis Meeting',
  type: 'challenge',
  group: 'RelAct1',
  copies: 1,
  text: 'While there are at least four different Hero Groups in the Dock, you may complete this Challenge. Combat Zone: During the Strike Phase subtract 1 from the Time Track.',
});
C({
  id: 'Act1TheOraclesCall_4',
  name: 'Backdoor',
  type: 'special',
  group: 'RelAct1',
  copies: 1,
  text: 'Reveal: Attach this to the space it was revealed in. (If it was revealed in the Combat Zone, attach it to the Building.) You may pay ® instead of ⚔ to scan this space.',
});
C({
  id: 'Act1TheOraclesCall_5',
  name: 'Find the Oracle',
  type: 'challenge',
  group: 'RelAct1',
  copies: 1,
  text: 'Reveal: Put this in Operations. When you pay ® to scan a Backdoor space that has a face-down card, instead of revealing that card, you may "walk through and find the Oracle": Defeat the Backdoor, complete this Challenge, then begin Act 1 Part 2.',
});
C({
  id: 'Act1TheOraclesCall_6',
  name: 'The Machines Are Digging',
  type: 'event',
  group: 'RelAct1',
  copies: 1,
  text: 'Gain this card. When you draw this, draw another card and put this in your discard pile. Then defeat the top five Heroes of Zion. If there are no cards left in Zion, defeat all players.',
});
C({
  id: 'Act1TheOraclesCall_7',
  name: "We're Already Late",
  type: 'event',
  group: 'RelAct1',
  copies: 2,
  text: 'If this was revealed in the Combat Zone, subtract 3 from the Time Track. (Otherwise it has no effect.)',
});

/* — Act 1 Extras — */
C({
  id: 'Act1TheOraclesCallExtra_1',
  name: 'I Love Candy',
  type: 'hero',
  group: 'RelAct1Extra',
  cls: null,
  cost: 1,
  copies: 1,
  text: 'Draw a card. Choose any number of players and heal the lowest damage Strike from each of them.',
});
C({
  id: 'Act1TheOraclesCallExtra_2',
  name: 'Smith',
  type: 'enemy',
  group: 'RelAct1Extra',
  descriptor: 'Program',
  defeat: 2,
  copies: 3,
  text: "Fight: You can't fight more than one Enemy named Smith each turn. You may ignore this Enemy's Fight ability if you have a Neo Hero in your play area.",
});

/* ═══════════════ Act 2: Free the Keymaker — mini-deck (11) ═══════════════ */
C({
  id: 'Act2FreeTheKeymaker_1',
  name: "Persephone's Kiss",
  type: 'challenge',
  group: 'RelAct2',
  copies: 1,
  text: 'Reveal: Put this in Operations. Act 2: While you have a Neo Hero in your play area, you may "kiss Persephone so she\'ll lead you to the Keymaker": Complete this Challenge and begin Act 2 Part 2.',
});
C({
  id: 'Act2FreeTheKeymaker_2',
  name: 'The Merovingian',
  type: 'enemy',
  group: 'RelAct2',
  descriptor: 'Program',
  defeat: null,
  copies: 1,
  kw: ['Unfightable'],
  text: "The Merovingian doesn't strike. When five Merovingian's Henchmen have been defeated, defeat the Merovingian. Combat Zone: Merovingian's Henchmen in the Combat Zone have +2 ⚔.",
});
C({
  id: 'Act2FreeTheKeymaker_3',
  name: "Merovingian's Henchman",
  type: 'enemy',
  group: 'RelAct2',
  descriptor: 'Program',
  defeat: 5,
  copies: 5,
  kw: ['WildSwing'],
  text: 'Wild Swing. (When this Enemy strikes you, you may discard the first Strike you draw and draw a new one. You must keep the new one.)',
});
C({
  id: 'Act2FreeTheKeymaker_4',
  name: 'Twin',
  type: 'enemy',
  group: 'RelAct2',
  descriptor: 'Program',
  defeat: 4,
  copies: 2,
  text: 'Reveal: Put this in the Combat Zone. Combat Zone: If this Enemy would be defeated, put it into the Alley instead.',
});
C({
  id: 'Act2FreeTheKeymaker_5',
  name: 'Stranded',
  type: 'event',
  group: 'RelAct2',
  copies: 1,
  text: "You can't enter or leave the Matrix this turn.",
});
C({
  id: 'Act2FreeTheKeymaker_6',
  name: 'Cause and Effect',
  type: 'event',
  group: 'RelAct2',
  copies: 1,
  text: 'If this card was revealed in the Matrix Row, gain it. Otherwise, defeat it. When you draw this, defeat it and draw three cards.',
});

/* ═══════════════ Act 3: The Source — mini-deck (13 incl. Inevitable) ═══════════════ */
C({
  id: 'Act3TheSource_1',
  name: 'Agent',
  type: 'enemy',
  group: 'RelAct3',
  descriptor: 'Program',
  defeat: 10,
  copies: 3,
  kw: ['DoubleStrike', 'BuyTime'],
  text: "Double Strike. Buy Time 5 ®. (While you're in the Matrix you can pay 5 ® to distract this Agent — it won't strike this turn.)",
});
C({
  id: 'Act3TheSource_2',
  name: 'Smith',
  type: 'enemy',
  group: 'RelAct3',
  descriptor: 'Program',
  defeat: 1,
  copies: 6,
  text: 'This Enemy has +1 ⚔ for each Enemy named Smith in the Defeated Enemies pile.',
});
C({
  id: 'Act3TheSource_3',
  name: 'Destroy the Power Station',
  type: 'challenge',
  group: 'RelAct3',
  defeat: 4,
  defeatType: 'A',
  copies: 1,
  text: "Reveal: Put this in Operations. This can't be completed until Act 3. Once this is completed, Deactivate the Emergency System and then Open the Door must also be completed before your next turn.",
});
C({
  id: 'Act3TheSource_4',
  name: 'Open the Door',
  type: 'challenge',
  group: 'RelAct3',
  copies: 1,
  text: "Reveal: Put this in Operations. This can't be completed until Destroy the Power Station and Deactivate the Emergency System have been completed. Act 3: If there's a Keymaker Hero in your play area, you may complete this Challenge and then begin Act 3 Part 2. (If the Keymaker is not a Hero this game, you may complete this with a Neo Hero instead.)",
});
C({
  id: 'Act3TheSource_5',
  name: 'Deactivate the Emergency System',
  type: 'challenge',
  group: 'RelAct3',
  defeat: 4,
  defeatType: 'R',
  copies: 1,
  text: "Reveal: Put this in Operations. This can't be completed until Act 3. Once this is completed, Destroy the Power Station and then Open the Door must also be completed before your next turn.",
});
C({
  id: 'Act3TheSource_6A',
  name: 'The Prophecy of The One',
  type: 'special',
  group: 'RelAct3',
  copies: 1,
  kw: ['Inevitable'],
  flipTo: 'Act3TheSource_6B',
  text: 'Inevitable. Combat Zone: During the Strike Phase subtract 1 from the Time Track.',
});
C({
  id: 'Act3TheSource_6B',
  name: 'Tow Bomb Sentinels',
  type: 'enemy',
  group: 'RelAct3',
  descriptor: 'Machine',
  defeat: 20,
  copies: 0,
  realWorld: true,
  kw: ['FightOnly'],
  text: 'Strike: If there are any Hovercraft cards in your play area, this Enemy defeats one of them instead of striking. Otherwise this strikes you twice and the next player once. You can only defeat this Enemy by fighting it with ⚔ (20). When you defeat it, turn the Act card over.',
});

/* — Act 3 Extras — */
C({
  id: 'Act3TheSourceExtra_1',
  name: 'Meet the Architect',
  type: 'challenge',
  group: 'RelAct3Extra',
  copies: 1,
  text: 'You may "fulfill the function of The One and return to the Source, allowing Zion to be destroyed": The game ends with a Minor Victory. Or you can "re-enter the Matrix and rely on the quintessential human delusion, hope": Move back to the Matrix. When the only card left in the Matrix deck, Matrix Row, and Combat Zone is the Inevitable card, complete this Challenge and begin Act 3 Part 3.',
});
