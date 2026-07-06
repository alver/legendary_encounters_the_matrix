// cardsRevolutions.ts — the third film ("The Matrix Revolutions"): its four
// Hero Groups (Neo (Revolutions), Niobe, Link, Defenders of Zion), the Seraph
// Extra group, and the three Act mini-decks.
// Data transcribed from the Sorting Guide / card scans.

import { C } from './cardsCore';

/* ═══════════════ Hero Groups ═══════════════ */

// — Neo (Revolutions)
C({
  id: 'NeoRevolutions_2Common',
  name: 'It Ends Tonight',
  type: 'hero',
  group: 'NeoRevolutions',
  cls: 'S',
  attack: 2,
  cost: 3,
  copies: 5,
  text: 'You get +1 ⚔ for each other Neo Hero in your play area.',
});
C({
  id: 'NeoRevolutions_3Common',
  name: 'I Can See You',
  type: 'hero',
  group: 'NeoRevolutions',
  cls: 'I',
  attack: 2,
  cost: 4,
  copies: 5,
  text: 'Look at a face-down card in the Matrix Row. {I}: You may scan that space. If there are no face-down cards in the Matrix Row, you may draw a card instead.',
});
C({
  id: 'NeoRevolutions_4Uncommon',
  name: 'Go Up, Over Them',
  type: 'hero',
  group: 'NeoRevolutions',
  cls: 'I',
  attack: 4,
  cost: 6,
  copies: 3,
  text: "{I}: Until your next turn, each player can't draw more than one Strike each turn.",
});
C({
  id: 'NeoRevolutions_1Rare',
  name: 'You Cannot Stop Him, But I Can',
  type: 'hero',
  group: 'NeoRevolutions',
  cls: 'S',
  attack: 5,
  cost: 8,
  copies: 1,
  text: 'Avoid all Strikes you would draw this turn. Look at the top three cards of the Strike deck, discard any, and put the rest back in any order.',
});

// — Niobe
C({
  id: 'Niobe_2Common',
  name: 'A Hell of a Pilot',
  type: 'hero',
  group: 'Niobe',
  cls: 'I',
  recruit: 2,
  cost: 2,
  copies: 5,
  text: 'If you have a Hovercraft in your play area, draw a card.',
});
C({
  id: 'Niobe_3Common',
  name: 'Gotcha',
  type: 'hero',
  group: 'Niobe',
  cls: 'U',
  attack: 2,
  cost: 4,
  copies: 5,
  kw: ['Coordinate'],
  text: 'Coordinate. This can only be Coordinated to a player who has at least one Strike. Heal one of your Strikes.',
});
C({
  id: 'Niobe_4Uncommon',
  name: 'Infiltrate',
  type: 'hero',
  group: 'Niobe',
  cls: 'U',
  attack: 4,
  cost: 5,
  copies: 3,
  text: '{U}: You may scan any space. If there are no face-down cards in the Matrix Row, you may draw a card instead.',
});
C({
  id: 'Niobe_1Rare',
  name: 'Some Things Change',
  type: 'hero',
  group: 'Niobe',
  cls: 'I',
  recruit: 3,
  attack: 3,
  cost: 8,
  copies: 1,
  text: 'Add 1 or subtract 1 from the Time Track.',
});

// — Link
C({
  id: 'Link_2Common',
  name: 'Gunnery',
  type: 'hero',
  group: 'Link',
  cls: 'R',
  attack: 2,
  cost: 4,
  copies: 5,
  text: 'You get +2 ⚔ against the next Enemy you fight in the Real World this turn.',
});
C({
  id: 'Link_3Common',
  name: 'Get Us Out of Here, Link',
  type: 'hero',
  group: 'Link',
  cls: 'T',
  recruit: 2,
  cost: 4,
  copies: 5,
  text: 'Once this turn, you may move up to two players to the Real World.',
});
C({
  id: 'Link_4Uncommon',
  name: 'YES!',
  type: 'hero',
  group: 'Link',
  cls: 'R',
  attack: 2,
  cost: 5,
  copies: 3,
  kw: ['Coordinate'],
  text: 'Coordinate. {R}: Choose any number of players to each draw a card.',
});
C({
  id: 'Link_1Rare',
  name: 'Burn It, Link!',
  type: 'hero',
  group: 'Link',
  cls: 'T',
  attack: 3,
  cost: 7,
  copies: 1,
  kw: ['Sacrifice'],
  text: 'Sacrifice: Defeat all Machine Enemies.',
});

// — Defenders of Zion
C({
  id: 'DefendersOfZion_2Common',
  name: 'Mifune',
  type: 'hero',
  group: 'DefendersOfZion',
  cls: 'T',
  attack: 2,
  cost: 3,
  copies: 5,
  text: 'Choose another player. They may defeat a card in their hand. {T}: Once this turn, you may defeat a card in your hand.',
});
C({
  id: 'DefendersOfZion_3Common',
  name: 'Lock',
  type: 'hero',
  group: 'DefendersOfZion',
  cls: 'U',
  recruit: 2,
  cost: 4,
  copies: 5,
  text: '{U}: You get +2 ⚔.',
});
C({
  id: 'DefendersOfZion_4Uncommon',
  name: 'Zee',
  type: 'hero',
  group: 'DefendersOfZion',
  cls: 'T',
  attack: 3,
  cost: 6,
  copies: 3,
  text: 'Choose a player. They may defeat a card in their discard pile. {T}: Once this turn, you get +2 ⚔ for each Hero that was defeated this turn.',
});
C({
  id: 'DefendersOfZion_1Rare',
  name: 'The Kid',
  type: 'hero',
  group: 'DefendersOfZion',
  cls: 'U',
  attack: 5,
  cost: 7,
  copies: 1,
  text: 'You pay 1 less ® to recruit The Kid for each Neo Hero in your play area.',
});

// — Seraph — the Act 1 "Extra" Hero Group, shuffled into Zion by the deal
// with the Merovingian. Digital Heroes.
C({
  id: 'Act1ClubHelExtra_2Common',
  name: 'The Prodigal Child Returns',
  type: 'hero',
  group: 'Seraph',
  cls: 'S',
  recruit: 2,
  cost: 2,
  copies: 5,
  kw: ['DigitalHero'],
  text: 'Digital Hero. {S}: Choose a player. They may put a random Hero from their discard pile into their hand.',
});
C({
  id: 'Act1ClubHelExtra_3Common',
  name: 'No Weapons Allowed in the Club',
  type: 'hero',
  group: 'Seraph',
  cls: 'R',
  attack: 2,
  cost: 3,
  copies: 5,
  kw: ['DigitalHero'],
  text: 'Digital Hero. {R}: You may discard up to two cards from your hand, then draw that many.',
});
C({
  id: 'Act1ClubHelExtra_4Uncommon',
  name: 'I Protect That Which Matters Most',
  type: 'hero',
  group: 'Seraph',
  cls: 'S',
  recruit: 2,
  attack: 2,
  cost: 5,
  copies: 3,
  kw: ['DigitalHero'],
  text: 'Digital Hero. {S}: You may heal a Strike from up to two players.',
});
C({
  id: 'Act1ClubHelExtra_1Rare',
  name: 'I Have Beaten You Before',
  type: 'hero',
  group: 'Seraph',
  cls: 'R',
  attack: 3,
  cost: 7,
  copies: 1,
  kw: ['DigitalHero'],
  text: 'Digital Hero. Once this turn, you may defeat an Enemy with the same name as an Enemy in the Defeated Enemies pile.',
});

/* ═══════════════ Act 1: Club Hel — mini-deck (10) ═══════════════ */
C({
  id: 'Act1ClubHel_1',
  name: 'The Trainman',
  type: 'enemy',
  group: 'RevAct1',
  descriptor: 'Program',
  defeat: null,
  copies: 1,
  kw: ['Chase', 'Unfightable'],
  text: 'Chase. Strike: Instead of striking, the Trainman "escapes": Put him in the Defeated Enemies pile then begin Act 1 Part 2.',
});
C({
  id: 'Act1ClubHel_2',
  name: "Sati's Family",
  type: 'event',
  group: 'RevAct1',
  copies: 1,
  text: 'If this was revealed in the Matrix Row, each player draws a card. Otherwise, each player discards a random card from their hand.',
});
C({
  id: 'Act1ClubHel_3',
  name: 'The Merovingian',
  type: 'enemy',
  group: 'RevAct1',
  descriptor: 'Program',
  defeat: 5,
  copies: 1,
  text: 'Strike: Instead of striking normally, the Merovingian "says something obnoxious": The next player discards a random There Is No Spoon or Unplug Hero from their hand. (Act 1 Part 2: You\'ve made a "deal" — he can now be fought and has 5 ⚔.)',
});
C({
  id: 'Act1ClubHel_4',
  name: 'Club Hel Guard',
  type: 'enemy',
  group: 'RevAct1',
  descriptor: 'Program',
  defeat: 2,
  copies: 6,
  kw: ['Flip180'],
  text: 'Reveal: Flip this Enemy upside down (2 ⚔). Each time this Enemy moves, flip it again (right-side up: 4 ⚔).',
});
C({
  id: 'Act1ClubHel_5',
  name: 'Mobil Ave',
  type: 'event',
  group: 'RevAct1',
  copies: 1,
  text: "You move to Operations. You're not in the Matrix or Real World. You can't scan, fight, gain Heroes, or Coordinate. You can't use your free move to leave Operations, but card effects CAN move you. At the start of your next turn, if you're still in Operations, move to the Matrix. (During your Strike Phase, if you're in Operations, Enemies in the Combat Zone strike as if you were in the Real World.)",
});

/* ═══════════════ Act 2: The Battle of Zion — mini-deck (11) ═══════════════ */
C({
  id: 'Act2TheBattleOfZion_1',
  name: 'Sentinel Swarm',
  type: 'enemy',
  group: 'RevAct2',
  descriptor: 'Machine',
  defeat: 4,
  copies: 4,
  realWorld: true,
  text: "Reveal: Put this in the leftmost space in the Dock that doesn't already have a Sentinel Swarm. If there's a Hero there, defeat it. While in the Dock, this space can't be refilled. (During each player's Strike Phase, this strikes them wherever they are.)",
});
C({
  id: 'Act2TheBattleOfZion_2',
  name: 'Sentinel Hunter',
  type: 'enemy',
  group: 'RevAct2',
  descriptor: 'Machine',
  defeat: 5,
  copies: 3,
  realWorld: true,
  text: 'Reveal: Put this into the Real World next to your Avatar. Strike: Instead of striking normally, this defeats a random Hero in your discard pile with cost 1 or more.',
});
C({
  id: 'Act2TheBattleOfZion_3',
  name: 'Digger',
  type: 'enemy',
  group: 'RevAct2',
  descriptor: 'Machine',
  defeat: 8,
  copies: 1,
  realWorld: true,
  text: "Reveal: Put this into the Real World face up on top of Zion. While there, Zion can't refill the Dock. Strike: Instead of striking normally, this defeats the top five Heroes of Zion. Then if there are no cards in Zion, all players are defeated. This can't be defeated until Act 2.",
});
C({
  id: 'Act2TheBattleOfZion_4',
  name: 'Fly the Mechanical Line',
  type: 'challenge',
  group: 'RevAct2',
  copies: 1,
  text: 'Reveal: Put this below the Hovercraft stack. While in the Real World, each time you gain or play a Hovercraft, move this one space to the right. When this moves to the space below Zion, complete this Challenge then defeat all Machine Enemies.',
});
C({
  id: 'Act2TheBattleOfZion_5',
  name: 'Overwhelming Numbers',
  type: 'event',
  group: 'RevAct2',
  copies: 2,
  text: 'Discard this normally, then add the top card of the Matrix deck face-down to the Matrix Row. If there are now any clear spaces in the Matrix Row, add a second card from the top of the Matrix deck face-down to the Matrix Row.',
});

/* ═══════════ Act 3: Everything That Has a Beginning — mini-deck (13 incl. Inevitable) ═══════════ */
C({
  id: 'Act3EverythingThatHasABeginning_1',
  name: 'Mobile Bomb',
  type: 'enemy',
  group: 'RevAct3',
  descriptor: 'Machine',
  defeat: 6,
  copies: 4,
  realWorld: true,
  text: "Reveal: Put this into the Real World next to your Avatar. If you scanned it this turn, it doesn't strike this turn. Strike: Instead of striking normally, this \"explodes\": Defeat it and draw three Strikes.",
});
C({
  id: 'Act3EverythingThatHasABeginning_2',
  name: 'Smith',
  type: 'enemy',
  group: 'RevAct3',
  descriptor: 'Program',
  defeat: 3,
  copies: 5,
  kw: ['Undefeatable', 'Unfightable', 'Stationary'],
  text: "Undefeatable, Stationary. Reveal: If this was revealed in the Combat Zone, subtract 1 from the Time Track and put this into the rightmost space of the Matrix Row that doesn't have a Smith.",
});
C({
  id: 'Act3EverythingThatHasABeginning_3',
  name: 'Bane',
  type: 'enemy',
  group: 'RevAct3',
  descriptor: 'Human',
  defeat: 7,
  copies: 1,
  realWorld: true,
  text: "Reveal: Put Bane into the Real World next to your Avatar. While you're in the Real World you can't enter the Matrix. Strike: Subtract 1 from the Time Track, then Bane strikes you normally.",
});
C({
  id: 'Act3EverythingThatHasABeginning_4',
  name: 'Make an Offer to Deus Ex Machina',
  type: 'challenge',
  group: 'RevAct3',
  defeat: 7,
  defeatType: 'R',
  copies: 1,
  realWorld: true,
  text: "Reveal: Put this in the Real World in front of all players. This can't be completed until it's Act 3 and Bane has been defeated. When you complete this, defeat all Enemies except Smith. Look at each face-down card in the Matrix Row, turn each Smith face up, and defeat all other cards. One at a time, look at each card in the Matrix deck, put each Smith into any clear space of the Matrix Row, and defeat all other cards. Turn the Inevitable card over and put it into the Combat Zone. Then begin Act 3 Part 2.",
});
C({
  id: 'Act3EverythingThatHasABeginning_5',
  name: 'The Unscorched Sky',
  type: 'event',
  group: 'RevAct3',
  copies: 1,
  text: 'If this was revealed in the Matrix Row, each player draws two cards. Otherwise, each player discards two random cards from their hand.',
});
C({
  id: 'Act3EverythingThatHasABeginning_6A',
  name: 'The Destruction of Zion',
  type: 'special',
  group: 'RevAct3',
  copies: 1,
  kw: ['Inevitable', 'EnterCZ'],
  flipTo: 'Act3EverythingThatHasABeginning_6B',
  text: 'Inevitable. If this card would enter the Matrix Row, put it into the Combat Zone. Combat Zone: During the Strike Phase subtract 1 from the Time Track.',
});
C({
  id: 'Act3EverythingThatHasABeginning_6B',
  name: 'Oracle-Smith',
  type: 'enemy',
  group: 'RevAct3',
  descriptor: 'Program',
  defeat: 5,
  copies: 0,
  life: 15,
  kw: ['DoubleStrike'],
  text: 'Double Strike. Fight: Each time you fight this Enemy, draw a Strike ignoring all text on it. If it has any damage, put it on Oracle-Smith. Otherwise discard it. When he has 15 or more damage, defeat him, then begin Act 3 Part 3.',
});
