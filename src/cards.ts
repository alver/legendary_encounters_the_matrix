// cards.ts — the complete card database for the first film ("The Matrix"):
// starters, hovercrafts, avatars, strikes, Part of the System, the four Hero
// Groups, the Neo (Extra) group, the Oracle cards, and the three Act mini-decks
// with their Extras. Data transcribed from the Sorting Guide / card scans.
//
// Classes: I=Intellect  R=Range  S=Strength  U=Survival  T=Tech
// defeat: {A} (or {R} when defeatType:'R') needed to defeat/complete.
// kw Unfightable == can't be fought by paying Attack at all.

import type { ActCardDef, AvatarDef, CardClass, CardDef, CardDefInput } from './types';

// BASE_URL makes the build relocatable (e.g. GitHub Pages serves under /<repo>/).
const IMG = (id: string): string => `${import.meta.env.BASE_URL}cards/${id}.jpg`;

export const CARDS: Record<string, CardDef> = {};
function C(input: CardDefInput): CardDef {
  const def = input as CardDef;
  def.recruit = def.recruit || 0;
  def.attack = def.attack || 0;
  def.cost = def.cost != null ? def.cost : null;
  def.kw = def.kw || [];
  def.copies = def.copies != null ? def.copies : 1;
  def.image = def.image || IMG(def.id);
  CARDS[def.id] = def;
  return def;
}

/* ═══════════════ Starters ═══════════════ */
C({
  id: 'StarterUnplug',
  name: 'Unplug',
  type: 'hero',
  group: 'Starter',
  cls: null,
  recruit: 1,
  cost: 0,
  copies: 7,
  text: '',
});
C({
  id: 'StarterThereIsNoSpoon',
  name: 'There Is No Spoon',
  type: 'hero',
  group: 'Starter',
  cls: null,
  attack: 1,
  cost: 0,
  copies: 5,
  text: '',
});
C({
  id: 'StarterFreeYourMind',
  name: 'Free Your Mind',
  type: 'hero',
  group: 'Starter',
  cls: null,
  cost: 0,
  copies: 1,
  text: "Resolve your Avatar's ability for the current Act.",
});

/* ═══════════════ Hovercrafts (all Coordinate, ®2, cost 3) ═══════════════ */
for (const [id, name, cls] of [
  ['HovercraftTheCaduceus', 'The Caduceus', 'U'],
  ['HovercraftTheLagos', 'The Lagos', 'R'],
  ['HovercraftTheMjolnir', 'The Mjolnir', 'S'],
  ['HovercraftTheNebuchadnezzar', 'The Nebuchadnezzar', 'T'],
  ['HovercraftTheVigilant', 'The Vigilant', 'I'],
] as [string, string, CardClass][])
  C({
    id,
    name,
    type: 'hovercraft',
    group: 'Hovercraft',
    cls,
    recruit: 2,
    cost: 3,
    kw: ['Coordinate'],
    text: 'Coordinate',
  });

/* ═══════════════ Hero Groups ═══════════════ */
// Each group: 5× Common1, 5× Common2, 3× Uncommon, 1× Rare (14 cards).

// — Morpheus (The Matrix)
C({
  id: 'MorpheusTheMatrix_2Common',
  name: "I've Spent My Entire Life Looking For You",
  type: 'hero',
  group: 'Morpheus',
  cls: 'U',
  recruit: 2,
  cost: 3,
  copies: 5,
  text: '{U}: You may scan any space. If there are no face-down cards in the Matrix Row, you may draw a card instead.',
});
C({
  id: 'MorpheusTheMatrix_3Common',
  name: 'Welcome to the Real World',
  type: 'hero',
  group: 'Morpheus',
  cls: 'I',
  recruit: 2,
  cost: 3,
  copies: 5,
  text: '{I}: You get +2 ®.',
});
C({
  id: 'MorpheusTheMatrix_4Uncommon',
  name: "You Think That's Air You're Breathing?",
  type: 'hero',
  group: 'Morpheus',
  cls: 'U',
  attack: 3,
  cost: 5,
  copies: 3,
  text: 'Once this turn, you may choose a player in the Matrix and heal their lowest damage Strike. {U}: Once this turn, you may heal a Strike from a player in the Matrix.',
});
C({
  id: 'MorpheusTheMatrix_1Rare',
  name: 'EMP',
  type: 'hero',
  group: 'Morpheus',
  cls: 'T',
  attack: 5,
  cost: 8,
  copies: 1,
  kw: ['Sacrifice'],
  text: 'Sacrifice: Defeat a Machine Enemy.',
});

// — Trinity (The Matrix)
C({
  id: 'TrinityTheMatrix_2Common',
  name: 'Your Men Are Already Dead',
  type: 'hero',
  group: 'Trinity',
  cls: 'U',
  attack: 2,
  cost: 4,
  copies: 5,
  text: 'At the end of your turn, if you defeated at least one Enemy this turn, draw an extra card when you draw your new hand.',
});
C({
  id: 'TrinityTheMatrix_3Common',
  name: "We Think You're Bugged",
  type: 'hero',
  group: 'Trinity',
  cls: 'R',
  attack: 1,
  cost: 3,
  copies: 5,
  text: "Choose a player. They may defeat a card in their discard pile. If it's a Bug, you and that player each draw a card. (If you ARE that player, draw two cards.)",
});
C({
  id: 'TrinityTheMatrix_4Uncommon',
  name: 'Knife Throw',
  type: 'hero',
  group: 'Trinity',
  cls: 'R',
  attack: 3,
  cost: 6,
  copies: 3,
  kw: ['Coordinate'],
  text: 'Coordinate',
});
C({
  id: 'TrinityTheMatrix_1Rare',
  name: 'I Love You',
  type: 'hero',
  group: 'Trinity',
  cls: 'I',
  attack: 3,
  recruit: 3,
  cost: 8,
  copies: 1,
  kw: ['Sacrifice'],
  text: 'Sacrifice: Choose a player and heal up to three Strikes from them. They draw three cards.',
});

// — Tank
C({
  id: 'Tank_2Common',
  name: 'Operator',
  type: 'hero',
  group: 'Tank',
  cls: 'T',
  recruit: 2,
  cost: 3,
  copies: 5,
  text: 'Once this turn, you may move a player to the Real World.',
});
C({
  id: 'Tank_3Common',
  name: 'Combat Training',
  type: 'hero',
  group: 'Tank',
  cls: 'S',
  attack: 2,
  cost: 4,
  copies: 5,
  kw: ['Coordinate'],
  text: 'Coordinate',
});
C({
  id: 'Tank_4Uncommon',
  name: "It's a Trap, Get Out!",
  type: 'hero',
  group: 'Tank',
  cls: 'T',
  attack: 4,
  cost: 6,
  copies: 3,
  text: 'Look at a face-down card in the Matrix Row. {T}: Once this turn, you may defeat a card in your play area or discard pile.',
});
C({
  id: 'Tank_1Rare',
  name: 'Breakfast of Champions',
  type: 'hero',
  group: 'Tank',
  cls: 'U',
  attack: 2,
  recruit: 2,
  cost: 7,
  copies: 1,
  text: 'Once this turn, choose any number of players in the Real World and heal a Strike from each of them.',
});

// — The Nebuchadnezzar Crew
C({
  id: 'NebuchadnezzarCrew_2Common',
  name: 'Dozer',
  type: 'hero',
  group: 'NebCrew',
  cls: 'S',
  recruit: 2,
  cost: 2,
  copies: 5,
  text: '{S}: You may heal a Strike from any player.',
});
C({
  id: 'NebuchadnezzarCrew_3Common',
  name: 'Mouse',
  type: 'hero',
  group: 'NebCrew',
  cls: 'T',
  recruit: 1,
  attack: 1,
  cost: 4,
  copies: 5,
  text: '{T}: Choose any number of players to each draw a card.',
});
C({
  id: 'NebuchadnezzarCrew_4Uncommon',
  name: 'Switch',
  type: 'hero',
  group: 'NebCrew',
  cls: 'S',
  cost: 5,
  copies: 3,
  text: 'When you play this Hero, choose to get +3 ® or +3 ⚔.',
});
C({
  id: 'NebuchadnezzarCrew_1Rare',
  name: 'Apoc',
  type: 'hero',
  group: 'NebCrew',
  cls: 'R',
  attack: 4,
  cost: 7,
  copies: 1,
  text: '{R}: You may gain a Hero from the Dock and put it into your hand.',
});

// — Neo (The Matrix) — the Act 1 "Extra" Hero Group, shuffled into Zion by "free Neo".
C({
  id: 'Act1WhatIsTheMatrixExtra_2Common',
  name: 'I Know Kung Fu',
  type: 'hero',
  group: 'Neo',
  cls: 'I',
  attack: 1,
  cost: 2,
  copies: 5,
  text: 'You get +2 ⚔ against the next Enemy you fight in the Combat Zone this turn.',
});
C({
  id: 'Act1WhatIsTheMatrixExtra_3Common',
  name: 'Guns, Lots of Guns',
  type: 'hero',
  group: 'Neo',
  cls: 'R',
  attack: 2,
  cost: 4,
  copies: 5,
  text: '{R}: You get +2 ⚔.',
});
C({
  id: 'Act1WhatIsTheMatrixExtra_4Uncommon',
  name: 'You Move Like They Do',
  type: 'hero',
  group: 'Neo',
  cls: 'I',
  attack: 4,
  cost: 5,
  copies: 3,
  text: '{I}: Avoid each Strike you would draw from Enemies in the Matrix this turn.',
});
C({
  id: 'Act1WhatIsTheMatrixExtra_1Rare',
  name: 'The One',
  type: 'hero',
  group: 'Neo',
  cls: 'S',
  attack: 6,
  cost: 9,
  copies: 1,
  text: "Once this turn, you may resolve your Avatar's ability for the current Act. {S}: Skip all Strike Phases until your next turn.",
});

/* ═══════════════ Strikes (40) ═══════════════ */
C({
  id: 'StrikeBlinded',
  name: 'Blinded',
  type: 'strike',
  damage: 0,
  copies: 2,
  text: 'Covers your Act abilities. The next time you would resolve an Act ability, discard all of your Blinded Strikes instead.',
});
C({
  id: 'StrikeGoodbyeMrAnderson',
  name: 'Goodbye, Mister Anderson',
  type: 'strike',
  damage: 4,
  copies: 2,
  text: '',
});
C({
  id: 'StrikeHesKillingHim',
  name: "He's Killing Him",
  type: 'strike',
  damage: 3,
  copies: 5,
  text: '',
});
C({
  id: 'StrikeIncoming',
  name: 'Incoming',
  type: 'strike',
  damage: 4,
  copies: 2,
  text: 'You may subtract 1 from the Time Track instead of taking the Strike. If you do, discard this Strike.',
});
C({
  id: 'StrikeIveNeverSeenAnyoneMoveThatFast',
  name: "I've Never Seen Anyone Move That Fast",
  type: 'strike',
  damage: 0,
  copies: 6,
  text: 'No damage. Discard this Strike.',
});
C({
  id: 'StrikeNotLikeThis',
  name: 'Not Like This',
  type: 'strike',
  damage: 0,
  copies: 2,
  text: "Defeat a random Hero with cost 1 or more in your discard pile, then discard this Strike. (If you don't have any Heroes with cost 1 or more there, draw another Strike.)",
});
C({
  id: 'StrikeOneOfYouIsGoingToDie',
  name: 'One of You Is Going to Die',
  type: 'strike',
  damage: 5,
  copies: 1,
  text: 'Any other player may choose to take this Strike instead of you.',
});
C({
  id: 'StrikeTheMindMakesItReal',
  name: 'The Mind Makes It Real',
  type: 'strike',
  damage: 2,
  copies: 8,
  text: '',
});
C({
  id: 'StrikeTheyreNotMoving',
  name: "They're Not Moving",
  type: 'strike',
  damage: 1,
  copies: 2,
  text: 'Each player in the same place as you (Real World or Matrix) also draws a Strike.',
});
C({
  id: 'StrikeWasntFastEnough',
  name: "Wasn't Fast Enough",
  type: 'strike',
  damage: 1,
  copies: 10,
  text: '',
});

/* ═══════════════ Part of the System (optional difficulty knob in solo) ═══════════════ */
C({
  id: 'PartOfTheSystem-Bug',
  name: 'Bug',
  type: 'event',
  group: 'System',
  copies: 2,
  text: 'Gain this card. When you draw this, discard it.',
});
C({
  id: 'PartOfTheSystem-SecurityGuard',
  name: 'Security Guard',
  type: 'enemy',
  group: 'System',
  descriptor: 'Human',
  defeat: 1,
  copies: 3,
  text: "Reveal: If this Enemy was revealed in the Matrix Row, it can't be fought this turn.",
});
C({
  id: 'PartOfTheSystem-Soldier',
  name: 'Soldier',
  type: 'enemy',
  group: 'System',
  descriptor: 'Human',
  defeat: 3,
  copies: 3,
  text: "Strike: This Enemy's Strikes can't be avoided.",
});
C({
  id: 'PartOfTheSystem-TacticalPolice',
  name: 'Tactical Police',
  type: 'enemy',
  group: 'System',
  descriptor: 'Human',
  defeat: 2,
  copies: 3,
  text: "Reveal: You can't scan for the rest of the turn.",
});
C({
  id: 'PartOfTheSystem-TheDesertOfTheReal',
  name: 'The Desert of the Real',
  type: 'event',
  group: 'System',
  copies: 2,
  text: 'The first player who is in the Real World draws a Strike.',
});
C({
  id: 'PartOfTheSystem-TheMatrixIsAllAroundUs',
  name: 'The Matrix Is All Around Us',
  type: 'event',
  group: 'System',
  copies: 3,
  text: 'The first player who is in the Real World moves to the Matrix.',
});
C({
  id: 'PartOfTheSystem-WhatGoodIsAPhoneCallIfYoureUnableToSpeak',
  name: "What Good Is a Phone Call If You're Unable to Speak",
  type: 'event',
  group: 'System',
  copies: 3,
  text: "Until your next turn you can't Coordinate. (Solo: you can't play or discard cards with Coordinate during your Action Phase.)",
});

/* ═══════════════ Act 1: What is the Matrix? — mini-deck (10) ═══════════════ */
C({
  id: 'Act1WhatIsTheMatrix_1',
  name: 'Police Officer',
  type: 'enemy',
  group: 'Act1',
  descriptor: 'Human',
  defeat: 3,
  copies: 4,
  text: '',
});
C({
  id: 'Act1WhatIsTheMatrix_2',
  name: 'Agent Brown',
  type: 'enemy',
  group: 'Act1',
  descriptor: 'Program',
  defeat: 8,
  copies: 1,
  kw: ['Chase'],
  text: 'Chase. Strike: If you are not in the Matrix, Agent Brown "leaves": He doesn\'t Strike. Put him into the Defeated Enemies pile.',
});
C({
  id: 'Act1WhatIsTheMatrix_3',
  name: 'Bug',
  type: 'event',
  group: 'Act1',
  copies: 1,
  text: 'Gain this card. When you draw this, discard it.',
});
C({
  id: 'Act1WhatIsTheMatrix_4',
  name: 'Time Is Always Against Us',
  type: 'event',
  group: 'Act1',
  copies: 2,
  text: 'Subtract 1 from the Time Track. If this was revealed in the Combat Zone, subtract another 1.',
});
C({
  id: 'Act1WhatIsTheMatrix_5',
  name: "All I'm Offering Is the Truth",
  type: 'challenge',
  group: 'Act1',
  defeat: 2,
  defeatType: 'A',
  copies: 1,
  text: 'Reveal: Put this in Operations. When this and How Deep the Rabbit Hole Goes have both been completed, begin Act 1 Part 2.',
});
C({
  id: 'Act1WhatIsTheMatrix_6',
  name: 'How Deep the Rabbit Hole Goes',
  type: 'challenge',
  group: 'Act1',
  defeat: 2,
  defeatType: 'R',
  copies: 1,
  text: "Reveal: Put this in Operations. When this and All I'm Offering Is the Truth have both been completed, begin Act 1 Part 2.",
});

/* ═══════════════ Act 2: Know Thyself — mini-deck (11) ═══════════════ */
C({
  id: 'Act2KnowThyself_1',
  name: 'They Cut the Hardline',
  type: 'event',
  group: 'Act2',
  copies: 1,
  text: "Place the No-Phone token on the phone space in the Alley. For the rest of the game, players can't leave the Matrix through this phone.",
});
C({
  id: 'Act2KnowThyself_2',
  name: 'Deja Vu',
  type: 'event',
  group: 'Act2',
  copies: 2,
  text: 'If this is the first Deja Vu revealed, it does nothing. If it is the second, discard it normally, then read the "A Glitch in the Matrix" Extra card.',
});
C({
  id: 'Act2KnowThyself_3',
  name: "No One's Ever Made Their First Jump",
  type: 'challenge',
  group: 'Act2',
  descriptor: 'Training',
  copies: 1,
  text: 'Reveal: Put this above the Building space. While in the Matrix, if the Building space is clear, you may "jump": Discard the top card of your deck. If it has cost 5 or more you made it! Otherwise, draw a Strike. Either way, complete this Challenge.',
});
C({
  id: 'Act2KnowThyself_4',
  name: 'Look Again',
  type: 'enemy',
  group: 'Act2',
  descriptor: 'Training',
  defeat: 3,
  copies: 1,
  text: 'Reveal: If this Enemy is in the Matrix Row, draw a Strike. Matrix Row: At the end of your Action Phase, turn this face down.',
});
C({
  id: 'Act2KnowThyself_5',
  name: 'Looking at the Woman in the Red Dress?',
  type: 'enemy',
  group: 'Act2',
  descriptor: 'Training',
  defeat: 3,
  copies: 2,
  text: 'Matrix Row: At the end of your Action Phase, turn this face down.',
});
C({
  id: 'Act2KnowThyself_6',
  name: 'Hit Me, If You Can',
  type: 'enemy',
  group: 'Act2',
  descriptor: 'Training',
  defeat: 2,
  copies: 1,
  text: 'Fight: Discard the top card of the Strike deck. If it has 2 damage or more, defeat this Enemy. Otherwise, leave it where it is.',
});
C({
  id: 'Act2KnowThyself_7',
  name: "You're Faster Than This",
  type: 'enemy',
  group: 'Act2',
  descriptor: 'Training',
  defeat: 3,
  copies: 1,
  text: 'Fight: Discard the top card of the Strike deck. If it has 2 damage or more, defeat this Enemy. Otherwise, leave it where it is.',
});
C({
  id: 'Act2KnowThyself_8',
  name: 'Stop Trying to Hit Me and Hit Me',
  type: 'enemy',
  group: 'Act2',
  descriptor: 'Training',
  defeat: 4,
  copies: 1,
  text: 'Fight: Discard the top card of the Strike deck. If it has 2 damage or more, defeat this Enemy. Otherwise, leave it where it is.',
});
C({
  id: 'Act2KnowThyself_9',
  name: 'See The Oracle',
  type: 'challenge',
  group: 'Act2',
  copies: 1,
  text: 'Reveal: Put this in Operations. Act 2: If seven Training cards have been defeated, you may "talk to The Oracle": Complete this Challenge and begin Act 2 Part 2.',
});

/* — Act 2 Extras — */
C({
  id: 'Act2KnowThyselfExtra_1',
  name: 'S.W.A.T. Officer',
  type: 'enemy',
  group: 'Act2Extra',
  descriptor: 'Human',
  defeat: 5,
  copies: 2,
  text: '',
});
C({
  id: 'Act2KnowThyselfExtra_2',
  name: 'Agent Smith',
  type: 'enemy',
  group: 'Act2Extra',
  descriptor: 'Program',
  defeat: null,
  copies: 1,
  kw: ['Unfightable'],
  text: 'Combat Zone: Players can\'t leave the Matrix. When it\'s Act 3, Agent Smith "leaves": Put him into the Defeated Enemies pile.',
});
C({
  id: 'Act2KnowThyselfExtra_3',
  name: 'A Glitch in the Matrix',
  type: 'special',
  group: 'Act2Extra',
  copies: 1,
  text: "Put the two S.W.A.T. Officer Extra cards face up into the two rightmost clear spaces in the Matrix Row. (If there aren't enough clear spaces, put each remaining S.W.A.T. Officer into the Combat Zone.) Then put the Agent Smith Extra card face up on top of the Matrix deck.",
});
// The five Oracle Heroes (cost 1, {I}).
C({
  id: 'Act2KnowThyselfExtra_4',
  name: "You've Got the Gift",
  type: 'hero',
  group: 'Oracle',
  cls: 'I',
  cost: 1,
  copies: 1,
  text: 'Draw a card. You may scan any space.',
});
C({
  id: 'Act2KnowThyselfExtra_5',
  name: 'I Can See Why She Likes You',
  type: 'hero',
  group: 'Oracle',
  cls: 'I',
  recruit: 2,
  attack: 2,
  cost: 1,
  copies: 1,
  kw: ['Coordinate'],
  text: 'Coordinate',
});
C({
  id: 'Act2KnowThyselfExtra_6',
  name: 'Take a Cookie',
  type: 'hero',
  group: 'Oracle',
  cls: 'I',
  cost: 1,
  copies: 1,
  text: 'Draw a card. You may heal a Strike from any player.',
});
C({
  id: 'Act2KnowThyselfExtra_7',
  name: "I'd Better Have a Look at You",
  type: 'hero',
  group: 'Oracle',
  cls: 'I',
  cost: 1,
  copies: 1,
  text: 'Look at the top three cards of your deck. Draw one and discard the others.',
});
C({
  id: 'Act2KnowThyselfExtra_8',
  name: "Don't Worry About the Vase",
  type: 'hero',
  group: 'Oracle',
  cls: 'I',
  cost: 1,
  copies: 1,
  text: 'Draw a card. You may defeat a card in your hand or discard pile.',
});

/* ═══════════════ Act 3: He is The One — mini-deck (13 incl. Inevitable) ═══════════════ */
C({
  id: 'Act3HeIsTheOne_1',
  name: 'Military Guard',
  type: 'enemy',
  group: 'Act3',
  descriptor: 'Human',
  defeat: 6,
  copies: 5,
  kw: ['Cover'],
  text: 'Cover',
});
C({
  id: 'Act3HeIsTheOne_2',
  name: 'Agent Jones',
  type: 'enemy',
  group: 'Act3',
  descriptor: 'Program',
  defeat: 8,
  copies: 1,
  text: "Fight: When defeated, if there are any Human Enemies in the Matrix Row or Combat Zone, defeat the one closest to the Matrix deck and put this there. Strike: If you draw an I've Never Seen Anyone Move That Fast, this Enemy strikes you again.",
});
C({
  id: 'Act3HeIsTheOne_3',
  name: 'Agent Brown',
  type: 'enemy',
  group: 'Act3',
  descriptor: 'Program',
  defeat: 8,
  copies: 1,
  text: 'Fight: When defeated, if there are any Human Enemies in the Matrix Row or Combat Zone, defeat the one closest to the Matrix deck and put this there. Strike: If you draw a Strike with at least 1 damage, you draw one fewer card at the end of this turn when you draw a new hand.',
});
C({
  id: 'Act3HeIsTheOne_4',
  name: 'Breaking Into Your Mind',
  type: 'event',
  group: 'Act3',
  copies: 2,
  text: 'Reveal the top two cards of your deck. Discard each with cost 1 or more and put the rest back in any order.',
});
C({
  id: 'Act3HeIsTheOne_5',
  name: 'Humans Are a Disease...',
  type: 'event',
  group: 'Act3',
  copies: 2,
  text: 'The player with the least total damage draws a Strike. (You settle ties.)',
});
C({
  id: 'Act3HeIsTheOne_6',
  name: 'Cypher',
  type: 'enemy',
  group: 'Act3',
  descriptor: 'Human',
  defeat: 5,
  copies: 1,
  realWorld: true,
  text: "Reveal: Put Cypher into the Real World next to your Avatar. At the end of your next turn, if Cypher hasn't been defeated, he defeats all players. Cypher doesn't strike.",
});
C({
  id: 'Act3HeIsTheOne_7A',
  name: 'It Is the Sound of Inevitability',
  type: 'special',
  group: 'Act3',
  copies: 1,
  kw: ['Inevitable'],
  flipTo: 'Act3HeIsTheOne_7B',
  text: 'Inevitable. When this card enters the Matrix Row, turn it over.',
});
C({
  id: 'Act3HeIsTheOne_7B',
  name: 'It Is the Sound of Inevitability',
  type: 'special',
  group: 'Act3',
  copies: 0,
  kw: ['Inevitable'],
  text: 'Inevitable. Combat Zone: During the Strike Phase subtract 1 from the Time Track.',
});

/* — Act 3 Extras — */
C({
  id: 'Act3HeIsTheOneExtra_1',
  name: 'Now Get Up',
  type: 'hero',
  group: 'Act3Extra',
  cls: 'U',
  attack: 5,
  recruit: 5,
  cost: 1,
  copies: 1,
  text: '',
});
C({
  id: 'Act3HeIsTheOneExtra_2',
  name: 'Rescue the Captive',
  type: 'challenge',
  group: 'Act3Extra',
  defeat: 7,
  defeatType: 'R',
  copies: 1,
  text: "You can only complete this Challenge while there are no Captive's Guards in the Combat Zone. When you complete this, begin Act 3 Part 2.",
});
C({
  id: 'Act3HeIsTheOneExtra_3',
  name: 'Sentinel Destroyer',
  type: 'enemy',
  group: 'Act3Extra',
  descriptor: 'Machine',
  defeat: null,
  copies: 1,
  kw: ['Unfightable'],
  realWorld: true,
  text: 'This Enemy doesn\'t strike. During each Real World player\'s Strike Phase it "tears apart your ship": Defeat the top 10 cards of your deck; you may pay ⚔ to reduce the number.',
});
C({
  id: 'Act3HeIsTheOneExtra_4',
  name: "Captive's Guard",
  type: 'enemy',
  group: 'Act3Extra',
  descriptor: 'Human',
  defeat: 7,
  copies: 2,
  text: "This Enemy doesn't strike.",
});
C({
  id: 'Act3HeIsTheOneExtra_5',
  name: "He's Gone",
  type: 'special',
  group: 'Act3Extra',
  copies: 1,
  text: "Heal all Strikes from the Matrix player. They are not defeated and can't draw more Strikes this turn. They gain the Now Get Up Extra card and put it on top of their deck. If they are defeated again, all players are defeated!",
});
C({
  id: 'Act3HeIsTheOneExtra_6',
  name: 'Agent Smith',
  type: 'enemy',
  group: 'Act3Extra',
  descriptor: 'Program',
  defeat: null,
  copies: 1,
  kw: ['Chase', 'DoubleStrike', 'Undefeatable', 'Unfightable', 'Evade'],
  evade: 10,
  text: 'Chase, Double Strike, Undefeatable, Evade 10 ®.',
});
C({
  id: 'Act3HeIsTheOneExtra_7',
  name: 'Agent Brown',
  type: 'enemy',
  group: 'Act3Extra',
  descriptor: 'Program',
  defeat: null,
  copies: 1,
  kw: ['Chase', 'DoubleStrike', 'Undefeatable', 'Unfightable', 'Evade'],
  evade: 6,
  text: 'Chase, Double Strike, Undefeatable, Evade 6 ®.',
});
C({
  id: 'Act3HeIsTheOneExtra_8',
  name: 'Agent Jones',
  type: 'enemy',
  group: 'Act3Extra',
  descriptor: 'Program',
  defeat: null,
  copies: 1,
  kw: ['Chase', 'DoubleStrike', 'Undefeatable', 'Unfightable', 'Evade'],
  evade: 8,
  text: 'Chase, Double Strike, Undefeatable, Evade 8 ®.',
});
C({
  id: 'Act3HeIsTheOneExtra_9',
  name: 'Agent Smith',
  type: 'enemy',
  group: 'Act3Extra',
  descriptor: 'Program',
  defeat: 12,
  copies: 1,
  kw: ['DoubleStrike'],
  text: 'Double Strike. Agent Smith is Undefeatable unless you fight him in the Subway or Combat Zone. When Agent Smith is defeated, begin Act 3 Part 3.',
});
C({
  id: 'Act3HeIsTheOneExtra_10A',
  name: 'Become The One',
  type: 'special',
  group: 'Act3Extra',
  copies: 1,
  text: 'On their turn, the Matrix player may pay ⚔ equal to the next higher number on the Time Track to move it to that number, any number of times. If it reaches 10, turn this card over.',
});
C({
  id: 'Act3HeIsTheOneExtra_10B',
  name: 'Become The One',
  type: 'special',
  group: 'Act3Extra',
  copies: 0,
  text: 'You are The One. You effortlessly destroy Agent Smith. The game ends with a Major Victory!',
});

/* ═══════════════ Avatars ═══════════════ */
export const AVATARS: Record<string, AvatarDef> = {
  AvatarThomasAnderson: {
    id: 'AvatarThomasAnderson',
    name: 'Thomas Anderson',
    rank: 1,
    speed: 5,
    health: 12,
    image: IMG('AvatarThomasAnderson'),
    flipTo: 'AvatarThomasAndersonNeo',
    passive:
      "The Matrix Has You: you begin in the Matrix with Free Your Mind out of play. At the end of your turn, if you're in the Real World, move to the Matrix. When Act 2 begins: move to the Real World, put Free Your Mind on top of your deck, and flip this card.",
    abilities: { 1: '—', 2: '—', 3: '—' },
  },
  AvatarThomasAndersonNeo: {
    id: 'AvatarThomasAndersonNeo',
    name: 'Neo',
    rank: 1,
    speed: 5,
    health: 12,
    image: `${import.meta.env.BASE_URL}cards/AvatarThomasAnderson-Neo.jpg`,
    hidden: true,
    passive: "That's Why It's Going To Work",
    abilities: { 1: '—', 2: 'You get +3 ⚔ and draw a card.', 3: 'You get +5 ⚔ and draw a card.' },
  },
  AvatarMorpheusMatrix: {
    id: 'AvatarMorpheusMatrix',
    name: 'Morpheus',
    rank: 2,
    speed: 5,
    health: 11,
    image: IMG('AvatarMorpheusMatrix'),
    passive: 'I Can Only Show You the Door',
    abilities: {
      1: 'You get +1 ® and draw a card.',
      2: 'You get +3 ® and draw a card.',
      3: 'You get +5 ® and draw a card.',
    },
  },
  AvatarTrinityMatrix: {
    id: 'AvatarTrinityMatrix',
    name: 'Trinity',
    rank: 3,
    speed: 5,
    health: 11,
    image: IMG('AvatarTrinityMatrix'),
    passive: 'I Was Looking for an Answer',
    abilities: { 1: 'Draw a card.', 2: 'Draw two cards.', 3: 'Draw three cards.' },
  },
  AvatarSwitch: {
    id: 'AvatarSwitch',
    name: 'Switch',
    rank: 4,
    speed: 3,
    health: 10,
    image: IMG('AvatarSwitch'),
    passive: 'Our Way or the Highway',
    abilities: {
      1: 'Look at the top card of your deck. You may defeat it.',
      2: 'Same effect, then draw a card.',
      3: 'Look at the top card of your deck; you may defeat it. Draw a card.',
    },
  },
  AvatarApoc: {
    id: 'AvatarApoc',
    name: 'Apoc',
    rank: 5,
    speed: 4,
    health: 10,
    image: IMG('AvatarApoc'),
    passive: 'Lock, I Got Him',
    abilities: {
      1: 'Draw a card. You may scan the leftmost space that has a face-down card.',
      2: 'Draw a card. You may scan any space.',
      3: 'Same as Act 2, or draw two cards.',
    },
  },
  AvatarMouse: {
    id: 'AvatarMouse',
    name: 'Mouse',
    rank: 6,
    speed: 4,
    health: 9,
    image: IMG('AvatarMouse'),
    passive: 'Reminds Me of Tastee Wheat',
    abilities: {
      1: "Draw a card. Heal a Strike with 1 damage or less. If there weren't any, draw a second card.",
      2: 'Same effect but with 2 damage or less.',
      3: 'Same effect but with 3 damage or less.',
    },
  },
};

/* ═══════════════ Act cards (The Matrix) ═══════════════ */
export const ACT_CARDS: Record<string, ActCardDef> = {
  '1.1': {
    image: IMG('TheMatrixAct1Part1'),
    name: 'What Is the Matrix?',
    objective:
      'Show Neo what the Matrix is. (Find and complete both Challenges hidden in the Matrix Deck.)',
  },
  '1.2': {
    image: IMG('TheMatrixAct1Part2'),
    name: 'What Is the Matrix?',
    objective:
      'While in the Real World, if you gain a Hovercraft or have one in your play area, you may "free Neo from the Matrix".',
  },
  '2.1': {
    image: IMG('TheMatrixAct2Part1'),
    name: 'Know Thyself',
    objective:
      'Complete your training, then speak to the Oracle. (Defeat all 7 Training cards, then complete See The Oracle.)',
  },
  '2.2': {
    image: IMG('TheMatrixAct2Part2'),
    name: 'Know Thyself',
    objective: 'Setup: gain a random Oracle Hero on top of your deck. Begin Act 3 Part 1.',
  },
  '3.1': {
    image: IMG('TheMatrixAct3Part1'),
    name: 'He Is The One',
    objective:
      "Rescue the captive. (Clear the Captive's Guards from the Combat Zone, then pay 7 ® to complete Rescue the Captive.)",
  },
  '3.2': {
    image: IMG('TheMatrixAct3Part2'),
    name: 'He Is The One',
    objective:
      'Defeat Agent Smith (12 ⚔ — only in the Subway or the Combat Zone). Or run, and end the game with a Minor Victory.',
  },
  '3.3': {
    image: IMG('TheMatrixAct3Part3A'),
    name: 'He Is The One',
    objective:
      "Become The One: pay ⚔ equal to the next higher number to raise the Time Track to 10. Pay ® to Evade the Agents. You can't leave the Matrix, recruit, or fight the Agents.",
  },
};

/* ═══════════════ Deck builders ═══════════════ */
export function cardsOfGroup(group: string): CardDef[] {
  return Object.values(CARDS).filter(c => c.group === group);
}
function expandCopies(defs: CardDef[]): string[] {
  const out: string[] = [];
  for (const d of defs) for (let i = 0; i < d.copies; i++) out.push(d.id);
  return out;
}
export function buildStarterDeck() {
  return expandCopies(cardsOfGroup('Starter'));
}
export function buildStrikeDeck() {
  return expandCopies(Object.values(CARDS).filter(c => c.type === 'strike'));
}
export function buildHeroGroup(group: string) {
  return expandCopies(cardsOfGroup(group));
}
export function buildActMini(group: string) {
  return expandCopies(
    Object.values(CARDS).filter(c => c.group === group && !c.kw.includes('Inevitable')),
  );
}
export function buildSystemCards(n: number): string[] {
  const pool = expandCopies(cardsOfGroup('System'));
  const out: string[] = [];
  for (let i = 0; i < n && pool.length; i++)
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
