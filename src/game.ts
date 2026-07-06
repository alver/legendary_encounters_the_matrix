// game.ts — the solo game engine: state, phases, board mechanics, act progression.
//
// The whole game state lives in the module-local `G` as plain JSON data (card
// instances are {uid, id, faceUp, ...}), so undo = restore a deep copy via
// snapshot()/restore(). All interaction goes through the injected UIPort
// (pick / chooseOption / confirmBox / showCard) — see setUI(). Card-specific
// behaviour lives in src/scripts.ts.

import { MX } from './version';
import { CARD_IMAGE_URLS } from './cardImages';
import {
  ACT_CARDS,
  AVATARS,
  CARDS,
  buildActMini,
  buildHeroGroup,
  buildStarterDeck,
  buildStrikeDeck,
  buildSystemCards,
  cardsOfGroup,
} from './cards';
import { AVATAR_SCRIPTS, SCRIPTS } from './scripts';
import type {
  AvatarDef,
  CardClass,
  CardDef,
  CardInstance,
  GameOptions,
  GameState,
  Movie,
  PlayerState,
  StrikeOpts,
  TurnFlags,
  UIPort,
} from './types';

/* ═══════════ per-film setup (rules.md "Playing through the Films") ═══════════ */
interface MovieSetup {
  title: string;
  zionGroups: string[];
  actGroups: [string, string, string];
  inevitableId: string;
}
export const MOVIE_SETUP: Record<Movie, MovieSetup> = {
  matrix: {
    title: 'The Matrix',
    zionGroups: ['Morpheus', 'Trinity', 'Tank', 'NebCrew'],
    actGroups: ['Act1', 'Act2', 'Act3'],
    inevitableId: 'Act3HeIsTheOne_7A',
  },
  reloaded: {
    title: 'The Matrix Reloaded',
    zionGroups: ['NeoReloaded', 'MorpheusRelRev', 'TrinityRelRev', 'ShipCaptains'],
    actGroups: ['RelAct1', 'RelAct2', 'RelAct3'],
    inevitableId: 'Act3TheSource_6A',
  },
  revolutions: {
    title: 'The Matrix Revolutions',
    zionGroups: ['NeoRevolutions', 'Niobe', 'Link', 'DefendersOfZion'],
    actGroups: ['RevAct1', 'RevAct2', 'RevAct3'],
    inevitableId: 'Act3EverythingThatHasABeginning_6A',
  },
};

/* ═══════════ state container (ESM: importers can't reassign a binding) ═══════════ */
let G: GameState | null = null;
let uidCounter = 1;
let UI: UIPort = null as unknown as UIPort; // injected via setUI() before any game starts

export function getG(): GameState | null {
  return G;
}
// Non-null accessor for code that only runs while a game exists.
export function g(): GameState {
  return G!;
}
export function setUI(port: UIPort) {
  UI = port;
}
export function ui(): UIPort {
  return UI;
}
// Undo support: one snapshot string captures the full engine state.
export function snapshot(): string {
  return JSON.stringify({ g: G, uid: uidCounter });
}
export function restore(s: string) {
  const p = JSON.parse(s) as { g: GameState; uid: number };
  G = p.g;
  uidCounter = p.uid;
}

/* ═══════════ small helpers ═══════════ */
export const D = (inst: CardInstance): CardDef => CARDS[inst.id]; // def of an instance
export function mk(id: string): CardInstance {
  return { uid: uidCounter++, id, faceUp: false };
}
function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function log(msg: string, cls = '') {
  g().log.push({ msg, cls, turn: g().turnNo });
}
export function P(): PlayerState {
  return g().player;
}
export function avatar(): AvatarDef {
  return AVATARS[P().avatarId];
}
export function totalDamage(): number {
  return P().strikes.reduce((s, c) => s + (D(c).damage || 0), 0);
}
export function inMatrix(): boolean {
  return P().rsi === 'matrix';
}
export function isInev(c: CardInstance | null | undefined): boolean {
  return !!c && D(c).kw.includes('Inevitable');
}
export function rowFaceDown(): CardInstance[] {
  return g().matrixRow.filter((c): c is CardInstance => !!c && !c.faceUp);
}
interface ZoneHit {
  zone: string;
  arr: (CardInstance | null)[] | null;
  i: number;
  card: CardInstance;
}
function findZone(uid: number): ZoneHit | null {
  const zones: Record<string, (CardInstance | null)[]> = {
    row: g().matrixRow,
    cz: g().combatZone,
    ops: g().operations,
    rw: g().realWorldEnemies,
    dockE: g().dockEnemies,
    backdoor: g().backdoors,
    hand: P().hand,
    inPlay: P().inPlay,
    discard: P().discard,
  };
  for (const [name, arr] of Object.entries(zones)) {
    const i = arr.findIndex(c => c && c.uid === uid);
    if (i >= 0) return { zone: name, arr, i, card: arr[i] as CardInstance };
  }
  if (g().attached.building && g().attached.building!.uid === uid)
    return { zone: 'attached', arr: null, i: -1, card: g().attached.building! };
  const zb = g().zionBlocker;
  if (zb && zb.uid === uid) return { zone: 'zionBlocker', arr: null, i: -1, card: zb };
  return null;
}
export function removeCard(uid: number): CardInstance | null {
  const f = findZone(uid);
  if (!f) return null;
  if (f.zone === 'attached') {
    g().attached.building = null;
    return f.card;
  }
  if (f.zone === 'zionBlocker') {
    g().zionBlocker = null;
    return f.card;
  }
  if (f.zone === 'row' || f.zone === 'dockE' || f.zone === 'backdoor') {
    f.arr![f.i] = null;
    return f.card;
  }
  f.arr!.splice(f.i, 1);
  return f.card;
}

// All the classes a card instance counts as (Keymaker heroes pick theirs).
export function cardClasses(c: CardInstance): CardClass[] {
  const def = D(c);
  if (def.clsAll) return ['I', 'R', 'S', 'U', 'T'];
  const out: CardClass[] = [];
  if (def.cls) out.push(def.cls);
  if (c.chosenCls) out.push(c.chosenCls);
  if (c.chosenCls2) out.push(c.chosenCls2);
  return out;
}
// Count Heroes of a class in your play area (class-combo "per {X} Hero" texts).
export function inPlayOfClass(cls: CardClass): number {
  return P().inPlay.filter(c => cardClasses(c).includes(cls)).length;
}

/* ═══════════ setup ═══════════ */
export function newGame(avatarId: string, options: GameOptions = {}, movie: Movie = 'matrix') {
  uidCounter = 1;
  const setup = MOVIE_SETUP[movie];
  G = {
    options,
    movie,
    act: 1,
    part: 1,
    time: MX.TIME_TRACK_START,
    turnNo: 1,
    phase: 'setup',
    matrixDeck: [],
    matrixRow: [null, null, null, null, null],
    combatZone: [],
    operations: [],
    attached: { building: null },
    backdoors: [null, null, null, null, null],
    dockEnemies: [null, null, null, null, null],
    zionBlocker: null,
    flyLine: null,
    oracleSmithDamage: 0,
    realWorldEnemies: [],
    defeatedEnemies: [],
    discardedCES: [],
    strikeDeck: shuffle(buildStrikeDeck().map(mk)),
    strikeDiscard: [],
    zion: [],
    dock: [null, null, null, null, null],
    hovercraftStack: shuffle(cardsOfGroup('Hovercraft').map(c => mk(c.id))),
    defeatedHeroes: [],
    pending: [],
    flags: {
      deadPhones: {},
      dejaVu: 0,
      trainingDefeated: 0,
      truthDone: false,
      rabbitDone: false,
      cypherRevealTurn: null,
      hesGoneUsed: false,
      noCoordUntilTurn: 0,
      henchmenDefeated: 0,
      keymakerInGame: false,
      powerStationDone: false,
      emergencyDone: false,
      sourceDeadlineTurn: null,
      merovingianDeal: false,
      diggerDefeated: false,
      flyLineDone: false,
      baneDefeated: false,
      strikeCapUntilTurn: 0,
    },
    turn: freshTurnFlags(),
    player: {
      avatarId,
      rsi: 'real',
      health: AVATARS[avatarId].health + (options.dodgeBullets ? AVATARS[avatarId].speed : 0),
      strikes: [],
      deck: [],
      hand: [],
      discard: [],
      inPlay: [],
      R: 0,
      A: 0,
      fymOutOfPlay: false,
    },
    log: [],
    gameOver: null,
    turnEnding: false,
  };

  // Player deck: 7 Unplug + 5 Spoon + 1 Free Your Mind.
  let deck = buildStarterDeck().map(mk);
  if (avatarId === 'AvatarThomasAnderson') {
    // The Matrix Has You: Free Your Mind starts out of play; you start in the Matrix.
    deck = deck.filter(c => c.id !== 'StarterFreeYourMind');
    P().fymOutOfPlay = true;
    P().rsi = 'matrix';
  }
  P().deck = shuffle(deck);

  // Zion: the film's four Hero Groups.
  const zion: string[] = [];
  for (const grp of setup.zionGroups) zion.push(...buildHeroGroup(grp));
  g().zion = shuffle(zion.map(mk));
  for (let i = 0; i < 5; i++) refillDock(i);

  // Matrix Deck: Act1 on top, Act2, Act3, Inevitable at the very bottom.
  // (deck array: last element = top)
  const pots = () => (options.systemCards ? buildSystemCards(options.systemCards) : []);
  const a3 = shuffle([...buildActMini(setup.actGroups[2]), ...pots()]).map(mk);
  const a2 = shuffle([...buildActMini(setup.actGroups[1]), ...pots()]).map(mk);
  const a1 = shuffle([...buildActMini(setup.actGroups[0]), ...pots()]).map(mk);
  const inev = mk(setup.inevitableId);
  inev.faceUp = true;
  g().matrixDeck = [inev, ...a3, ...a2, ...a1];

  drawCards(MX.HAND_SIZE);
  log(
    `— ${avatar().name} enters ${setup.title}. Act 1 Part 1: ${ACT_CARDS[movie]['1.1'].name} —`,
    'act',
  );
  log(
    avatarId === 'AvatarThomasAnderson'
      ? 'The Matrix has you… You start IN the Matrix, Free Your Mind out of play.'
      : 'You start in the Real World.',
  );
  g().phase = 'startup';
}

function freshTurnFlags(): TurnFlags {
  return {
    playedClasses: { I: 0, R: 0, S: 0, U: 0, T: 0 },
    freeMoveUsed: false,
    coordUsed: false,
    gainedHovercraft: false,
    enemiesDefeated: 0,
    heroesDefeated: 0,
    kungfuCZBonus: 0,
    gunneryRWBonus: 0,
    avoidMatrixEnemyStrikes: false,
    avoidNextStrikes: 0,
    avoidAllStrikes: false,
    enemyDebuff: 0,
    skipStrikePhase: false,
    noScan: false,
    noMatrixMove: false,
    drawPenalty: 0,
    noMoreStrikes: false,
    strikesDrawn: 0,
    smithsFought: 0,
    timeMode: null,
    deckTopGains: 0,
  };
}

export function refillDock(i: number) {
  // A Sentinel Swarm squatting the space or the Digger on Zion stops refills.
  if (g().dockEnemies[i] || g().zionBlocker) return;
  if (!g().dock[i] && g().zion.length) g().dock[i] = g().zion.pop()!;
}

/* ═══════════ drawing / decks ═══════════ */
export function drawCards(n: number): CardInstance[] {
  const drawn: CardInstance[] = [];
  for (let k = 0; k < n; k++) {
    if (!P().deck.length) {
      if (!P().discard.length) break;
      P().deck = shuffle(P().discard.splice(0));
      log('You shuffle your discard pile into a new deck.');
    }
    const c = P().deck.pop()!;
    P().hand.push(c);
    drawn.push(c);
  }
  // "When you draw this…" effects — resolved after the whole batch.
  for (const c of drawn.slice()) {
    if (D(c).name === 'Bug') {
      P().hand.splice(P().hand.indexOf(c), 1);
      P().discard.push(c);
      log('You drew a Bug — it clogs your deck and is discarded.');
    } else if (c.id === 'Act1TheOraclesCall_6') {
      // The Machines Are Digging: draw another card, discard this, dig Zion.
      P().hand.splice(P().hand.indexOf(c), 1);
      P().discard.push(c);
      log('You drew The Machines Are Digging!', 'bad');
      drawCards(1);
      zionDig();
      if (g().gameOver) return drawn;
    } else if (c.id === 'Act2FreeTheKeymaker_6') {
      // Cause and Effect: defeat it and draw three cards.
      P().hand.splice(P().hand.indexOf(c), 1);
      g().discardedCES.push(c);
      log('Cause and Effect — you defeat it and draw three cards.', 'good');
      drawCards(3);
    }
  }
  return drawn;
}
export function deckTop(): CardInstance | null {
  // reveal/discard the top card of your deck (with reshuffle)
  if (!P().deck.length) {
    if (!P().discard.length) return null;
    P().deck = shuffle(P().discard.splice(0));
    log('You shuffle your discard pile into a new deck.');
  }
  return P().deck.pop() ?? null;
}

/* ═══════════ time track / game over ═══════════ */
export function subTime(n: number) {
  g().time -= n;
  log(`⏱ Time Track −${n} → ${Math.max(0, g().time)}`, 'bad');
  if (g().time <= 0)
    gameOver(false, 'Time has run out', 'The Machines win. The resistance is crushed.');
}
export function gameOver(win: boolean, title: string, sub: string) {
  if (g().gameOver) return;
  g().gameOver = { win, title, sub };
  g().phase = 'gameover';
  log(`— ${title} —`, win ? 'act' : 'bad');
}

/* ═══════════ strikes / damage ═══════════ */
export function strikeDeckPop(): CardInstance | null {
  if (!g().strikeDeck.length) {
    if (!g().strikeDiscard.length) {
      gameOver(
        false,
        'No Strikes left',
        'The Strike deck and discard are empty — the players lose.',
      );
      return null;
    }
    g().strikeDeck = shuffle(g().strikeDiscard.splice(0));
    log('The Strike deck is reshuffled.');
  }
  return g().strikeDeck.pop() ?? null;
}
function sourceInMatrix(src?: CardInstance): boolean {
  if (!src) return false;
  return (
    g().matrixRow.some(c => c && c.uid === src.uid) || g().combatZone.some(c => c.uid === src.uid)
  );
}
// Draw & resolve one Strike. Returns the strike card taken (or null if avoided/discarded).
export async function drawStrike(opts: StrikeOpts = {}): Promise<CardInstance | null> {
  if (g().gameOver) return null;
  if (g().turn.noMoreStrikes) {
    log('No more Strikes can be drawn this turn.');
    return null;
  }
  // Go Up, Over Them: at most one Strike per turn (not an "avoid").
  if (g().turnNo < g().flags.strikeCapUntilTurn && g().turn.strikesDrawn >= 1) {
    log('Go Up, Over Them — no more Strikes this turn.', 'good');
    return null;
  }
  if (!opts.unavoidable && g().turn.avoidAllStrikes) {
    log('You Cannot Stop Him, But I Can — the Strike is avoided!', 'good');
    return null;
  }
  if (!opts.unavoidable && g().turn.avoidNextStrikes > 0) {
    g().turn.avoidNextStrikes--;
    log("I'll Handle Them — the Strike is avoided!", 'good');
    return null;
  }
  if (!opts.unavoidable && g().turn.avoidMatrixEnemyStrikes && sourceInMatrix(opts.source)) {
    log('You Move Like They Do — the Strike is avoided!', 'good');
    return null;
  }
  let c = strikeDeckPop();
  if (!c) return null;
  c.faceUp = true;
  // Wild Swing: you may discard the first Strike you draw and draw a new one.
  if (opts.wildSwing) {
    await UI.showCard(D(c).image, `Strike: ${D(c).name}`);
    const redo = await UI.confirmBox(
      'Wild Swing',
      `You drew ${D(c).name}${D(c).damage ? ` (${D(c).damage} damage)` : ''}. Discard it and draw a new Strike? (You must keep the new one.)`,
      'Draw a new one',
      'Keep it',
    );
    if (redo) {
      g().strikeDiscard.push(c);
      log(`Wild Swing: you dodge ${D(c).name} and draw a new Strike.`);
      c = strikeDeckPop();
      if (!c) return null;
      c.faceUp = true;
    }
  }
  g().turn.strikesDrawn++;
  const s = SCRIPTS[c.id];
  log(`💥 Strike: ${D(c).name}${D(c).damage ? ` (${D(c).damage} damage)` : ''}`, 'bad');
  if (s && s.strikeResolve) {
    await s.strikeResolve(c, opts);
  } else {
    P().strikes.push(c);
  }
  await checkPlayerDefeat();
  return c;
}
async function checkPlayerDefeat() {
  if (g().gameOver) return;
  if (totalDamage() < P().health) return;
  if (g().movie === 'matrix' && g().act === 3 && g().part === 3 && !g().flags.hesGoneUsed) {
    await hesGone();
    return;
  }
  gameOver(
    false,
    `${avatar().name} has fallen`,
    g().act < 3
      ? 'Your body dies in the chair. The team loses.'
      : 'There is no one left to carry on.',
  );
}
async function hesGone() {
  g().flags.hesGoneUsed = true;
  await UI.showCard(CARDS['Act3HeIsTheOneExtra_5'].image, "He's Gone");
  g().strikeDiscard.push(...P().strikes.splice(0));
  g().turn.noMoreStrikes = true;
  const up = mk('Act3HeIsTheOneExtra_1');
  P().deck.push(up);
  log(
    "He's Gone… all your Strikes are healed. NOW GET UP. (If you are defeated again, the game is lost.)",
    'act',
  );
}
// The Machines dig toward Zion: defeat its top 5 Heroes; empty Zion = loss.
export function zionDig() {
  const dug = g().zion.splice(Math.max(0, g().zion.length - 5), 5);
  g().defeatedHeroes.push(...dug);
  log(`The Machines are digging — the top ${dug.length} Heroes of Zion are destroyed!`, 'bad');
  if (!g().zion.length)
    gameOver(false, 'Zion has fallen', 'The diggers broke through. All players are defeated.');
}

export function healStrike(c: CardInstance) {
  const i = P().strikes.indexOf(c);
  if (i < 0) return;
  P().strikes.splice(i, 1);
  g().strikeDiscard.push(c);
  log(`Healed: ${D(c).name}.`, 'good');
}

/* ═══════════ defeating cards ═══════════ */
export function defeatEnemy(c: CardInstance) {
  removeCard(c.uid);
  g().defeatedEnemies.push(c);
  g().turn.enemiesDefeated++;
  if (D(c).descriptor === 'Training') {
    g().flags.trainingDefeated++;
    log(`Training complete (${g().flags.trainingDefeated}/7): ${D(c).name}.`, 'good');
  }
  // Objective bookkeeping that must catch EVERY defeat path (fights, EMP,
  // Burn It Link, Fly the Mechanical Line…), not just actFight.
  if (c.id === 'Act2TheBattleOfZion_3') g().flags.diggerDefeated = true;
  if (c.id === 'Act3EverythingThatHasABeginning_3') g().flags.baneDefeated = true;
  if (c.id === 'Act2FreeTheKeymaker_3') {
    g().flags.henchmenDefeated++;
    log(`Merovingian's Henchmen defeated: ${g().flags.henchmenDefeated}/5.`, 'good');
    if (g().flags.henchmenDefeated === 5) {
      // Defeat him wherever he is — even still hidden in the Matrix deck.
      const deckIdx = g().matrixDeck.findIndex(x => x.id === 'Act2FreeTheKeymaker_2');
      if (deckIdx >= 0) g().defeatedEnemies.push(...g().matrixDeck.splice(deckIdx, 1));
      const mero = [...g().combatZone, ...g().matrixRow.filter(x => x !== null)].find(
        x => x!.id === 'Act2FreeTheKeymaker_2',
      );
      if (mero) defeatEnemy(mero);
      if (deckIdx >= 0 || mero)
        log('His Henchmen are gone — THE MEROVINGIAN is defeated!', 'act');
    }
  }
}
export function defeatPlayerCard(c: CardInstance, fromArr?: CardInstance[] | null) {
  const arr = fromArr || null;
  if (arr) {
    const i = arr.indexOf(c);
    if (i >= 0) arr.splice(i, 1);
  } else removeCard(c.uid);
  const t = D(c).type;
  if (t === 'event') g().discardedCES.push(c);
  else g().defeatedHeroes.push(c);
  g().turn.heroesDefeated++;
  log(`Defeated from your cards: ${D(c).name}.`);
}

/* ═══════════ gaining / recruiting ═══════════ */
export function gainCard(c: CardInstance, dest: 'discard' | 'hand' | 'deckTop' = 'discard') {
  if (dest === 'discard') P().discard.push(c);
  else if (dest === 'hand') P().hand.push(c);
  else if (dest === 'deckTop') P().deck.push(c);
  if (D(c).type === 'hovercraft') {
    g().turn.gainedHovercraft = true;
    advanceFlyLine();
  }
}

// Fly the Mechanical Line: while in the Real World, each Hovercraft you gain
// or play moves the Challenge one space right; below Zion it completes.
export function advanceFlyLine() {
  const fl = g().flyLine;
  if (!fl || P().rsi !== 'real') return;
  fl.pos++;
  if (fl.pos <= 4) {
    log(`Fly the Mechanical Line: the Hovercraft advances (${fl.pos + 1}/6).`, 'good');
    return;
  }
  g().flyLine = null;
  g().discardedCES.push(fl.card);
  g().flags.flyLineDone = true;
  log('FLY THE MECHANICAL LINE completed — the line is cleared!', 'act');
  // "…then defeat all Machine Enemies." (all you can see in play)
  const zb = g().zionBlocker;
  const machines: CardInstance[] = [
    ...g().matrixRow.filter((x): x is CardInstance => !!x && x.faceUp),
    ...g().combatZone,
    ...g().realWorldEnemies,
    ...g().dockEnemies.filter((x): x is CardInstance => !!x),
    ...(zb ? [zb] : []),
  ].filter(x => D(x).type === 'enemy' && D(x).descriptor === 'Machine');
  for (const m of machines) {
    defeatEnemy(m);
    log(`${D(m).name} is destroyed!`, 'good');
  }
}

/* ═══════════ the Matrix Row ═══════════ */
export function killPhone(idx: number) {
  if (MX.PHONE_SPACES.includes(idx) && !g().flags.deadPhones[idx]) {
    g().flags.deadPhones[idx] = true;
    log(`☎ The phone in the ${MX.ROW_NAMES[idx]} is destroyed for the rest of the game!`, 'bad');
  }
}
export async function placeIntoRow(c: CardInstance, idx: number) {
  if (g().gameOver) return;
  // Club Hel Guard: each time it moves (already face up), it flips 180°.
  if (c.faceUp && D(c).kw.includes('Flip180')) {
    c.flipped = !c.flipped;
    log(`${D(c).name} flips ${c.flipped ? 'upside down (2 ⚔)' : 'right-side up (4 ⚔)'}.`);
  }
  // "If this card would enter the Matrix Row, put it into the Combat Zone."
  if (D(c).kw.includes('EnterCZ')) {
    await enterCombatZone(c);
    return;
  }
  if (idx < 0) {
    await enterCombatZone(c);
    return;
  }
  const cur = g().matrixRow[idx];
  // Stationary cards never move: the moving card slides past them instead.
  if (cur && D(cur).kw.includes('Stationary')) {
    await placeIntoRow(c, idx - 1);
    return;
  }
  g().matrixRow[idx] = c;
  if (isInev(c)) {
    if (c.id === 'Act3HeIsTheOne_7A') {
      c.id = 'Act3HeIsTheOne_7B';
      log('The Inevitable card flips: It Is the Sound of Inevitability.', 'bad');
    }
    killPhone(idx);
  }
  if (cur) await placeIntoRow(cur, idx - 1);
}
export async function enterCombatZone(c: CardInstance) {
  if (!c.faceUp) {
    const consumed = await revealCard(c, 'cz');
    if (consumed) return;
  }
  g().combatZone.unshift(c); // leftmost = newest; rightmost = oldest
  log(`${D(c).name} enters the Combat Zone!`, 'bad');
}
// Reveal a face-down card. Returns true if the card left the row/CZ flow
// (events → discard pile, challenges → operations, Cypher → Real World…).
async function revealCard(c: CardInstance, where: 'row' | 'cz'): Promise<boolean> {
  c.faceUp = true;
  const def = D(c);
  log(
    `Revealed${where === 'cz' ? ' in the Combat Zone' : ''}: ${def.name}${def.defeat ? ` (${def.defeat}${def.defeatType === 'R' ? ' ®' : ' ⚔'})` : ''}.`,
  );
  const s = SCRIPTS[c.id];
  if (s && s.reveal) {
    const consumed = await s.reveal(c, where);
    if (consumed) return true;
  }
  if (def.type === 'event') {
    removeCard(c.uid);
    g().discardedCES.push(c);
    return true;
  }
  return false;
}

/* ═══════════ phases ═══════════ */
export async function startTurn() {
  if (g().gameOver) return;
  g().turn = freshTurnFlags();
  g().pending = [];
  g().turnEnding = false;
  g().phase = 'matrix';
  log(`— Turn ${g().turnNo} —`, 'turn');
  // Mobil Ave: at the start of your next turn, if still in Operations, move to
  // the Matrix. (Reloaded 3.2 pins you in Operations with the Architect.)
  if (P().rsi === 'ops' && !(g().movie === 'reloaded' && g().act === 3 && g().part === 2)) {
    P().rsi = 'matrix';
    log('The Trainman relents — you leave Mobil Ave and return to the Matrix.');
  }
  // The Source: once one of the three Challenges is completed, the other two
  // must be completed before your next turn — or all players are defeated.
  const deadline = g().flags.sourceDeadlineTurn;
  if (g().movie === 'reloaded' && deadline != null && g().turnNo >= deadline) {
    gameOver(
      false,
      'The window has closed',
      'The emergency system reactivates and the door to the Source seals. All players are defeated.',
    );
    UI.render();
    return;
  }
  UI.render();
  await matrixPhase();
  if (g().gameOver) {
    UI.render();
    return;
  }
  g().phase = 'action';
  UI.render();
}

async function matrixPhase() {
  if (g().options.prepTurn && g().turnNo === 1) {
    log('Prep turn — the Matrix Phase is skipped.');
  } else {
    const inevInPlay = [...g().matrixRow, ...g().combatZone].find(isInev);
    if (inevInPlay) {
      await moveInevitable(inevInPlay);
    } else if (g().matrixDeck.length) {
      const c = g().matrixDeck.pop()!;
      log(
        c.faceUp
          ? `${D(c).name} enters the Matrix Row!`
          : 'A face-down card enters the Matrix Row.',
      );
      await placeIntoRow(c, 4);
    } else {
      log('The Matrix Deck is empty.');
    }
  }
  // Chase: cards in the row with Chase move one more space, left to right.
  for (let i = 0; i <= 4; i++) {
    const c = g().matrixRow[i];
    if (c && D(c).kw.includes('Chase') && (c.faceUp || isInev(c))) {
      g().matrixRow[i] = null;
      log(`${D(c).name} chases you — it moves another space!`, 'bad');
      await placeIntoRow(c, i - 1);
    }
  }
}
async function moveInevitable(c: CardInstance) {
  const i = g().matrixRow.findIndex(x => x && x.uid === c.uid);
  if (i >= 0) {
    g().matrixRow[i] = null;
    log('The Inevitable card slides one space forward.', 'bad');
    await placeIntoRow(c, i - 1);
  } // already in the Combat Zone: nothing more to move.
}

async function endActionPhase() {
  if (g().phase !== 'action' || g().gameOver) return;
  // End-of-Action-Phase hooks (training cards flip back down).
  for (const c of g().matrixRow) {
    if (c && c.faceUp) {
      const s = SCRIPTS[c.id];
      if (s && s.endAction) s.endAction(c);
    }
  }
  g().phase = 'strike';
  UI.render();
  await strikePhase();
  if (g().gameOver) {
    UI.render();
    return;
  }
  await cleanupPhase();
}

async function strikePhase() {
  if (g().turn.skipStrikePhase) {
    log('The Strike Phase is skipped (The One).', 'good');
    return;
  }
  // Combat Zone enemies strike, right to left (oldest first).
  for (let i = g().combatZone.length - 1; i >= 0; i--) {
    const c = g().combatZone[i];
    if (g().gameOver) return;
    if (!c) continue;
    const def = D(c);
    const s = SCRIPTS[c.id];
    if (isInev(c)) {
      log('The Sound of Inevitability…', 'bad');
      subTime(1);
      continue;
    }
    if (def.type !== 'enemy') {
      // e.g. Crisis Meeting: "Combat Zone: subtract 1 from the Time Track."
      if (s && s.strike) await s.strike(c);
      continue;
    }
    if (s && s.noStrike) {
      log(`${def.name} doesn't strike.`);
      continue;
    }
    if (c.buyTimeTurn === g().turnNo) {
      log(`${def.name} was distracted (Buy Time) — it doesn't strike this turn.`, 'good');
      continue;
    }
    const times = def.kw.includes('DoubleStrike') ? 2 : 1;
    for (let t = 0; t < times && !g().gameOver; t++) {
      if (s && s.strike) {
        await s.strike(c);
        continue;
      }
      if (inMatrix()) {
        log(`${def.name} strikes you!`, 'bad');
        await enemyStrikesPlayer(c);
      } else {
        log(`${def.name} strikes the Time Track!`, 'bad');
        subTime(1);
      }
    }
  }
  // Real World enemies (next to your Avatar, in the Dock, on Zion) strike the
  // player wherever they are. (The first film's Real World enemies don't strike.)
  const zb = g().zionBlocker;
  const rwEnemies: CardInstance[] = [
    ...g().realWorldEnemies,
    ...g().dockEnemies.filter((x): x is CardInstance => !!x),
    ...(zb ? [zb] : []),
  ];
  for (const c of rwEnemies) {
    if (g().gameOver) return;
    if (D(c).type !== 'enemy') continue;
    const s = SCRIPTS[c.id];
    if (s && s.noStrike) continue;
    const times = D(c).kw.includes('DoubleStrike') ? 2 : 1;
    for (let t = 0; t < times && !g().gameOver; t++) {
      if (s && s.strike) {
        await s.strike(c);
        continue;
      }
      log(`${D(c).name} strikes you!`, 'bad');
      await enemyStrikesPlayer(c);
    }
  }
}
export async function enemyStrikesPlayer(c: CardInstance) {
  const drawn = await drawStrike({ source: c, wildSwing: D(c).kw.includes('WildSwing') });
  const s = SCRIPTS[c.id];
  if (drawn && s && s.afterStrike) await s.afterStrike(c, drawn);
}

async function cleanupPhase() {
  g().phase = 'cleanup';
  // Cypher's ultimatum: revealed on turn N → checked at the end of turn N+1.
  const cypher = g().realWorldEnemies.find(c => D(c).name === 'Cypher');
  if (cypher && g().turnNo >= (g().flags.cypherRevealTurn ?? 0) + 1) {
    gameOver(
      false,
      'Cypher pulls the plug',
      'You did not stop him in time. Everyone dies in their chair.',
    );
    UI.render();
    return;
  }
  // Thomas Anderson: at the end of your turn, if in the Real World, back to the Matrix.
  if (P().avatarId === 'AvatarThomasAnderson' && P().rsi === 'real') {
    P().rsi = 'matrix';
    log('The Matrix has you — Thomas Anderson is pulled back into the Matrix.');
  }
  // Revolutions finale: the Deletion Program deletes your hand, play area,
  // and discard pile before you draw a new hand.
  if (g().movie === 'revolutions' && g().act === 3 && g().part === 3) {
    const deleted = [...P().hand.splice(0), ...P().inPlay.splice(0), ...P().discard.splice(0)];
    for (const c of deleted) {
      if (D(c).type === 'event') g().discardedCES.push(c);
      else g().defeatedHeroes.push(c);
    }
    if (deleted.length)
      log(`The Deletion Program consumes ${deleted.length} of your cards.`, 'bad');
    if (!P().deck.length) {
      gameOver(
        false,
        'Deleted',
        'The Deletion Program consumes the last of you before the Smiths fall.',
      );
      UI.render();
      return;
    }
  }
  // Extra draws from "Your Men Are Already Dead" (each copy in play).
  let bonus = 0;
  if (g().turn.enemiesDefeated > 0)
    bonus = P().inPlay.filter(c => c.id === 'TrinityTheMatrix_2Common').length;
  P().discard.push(...P().hand.splice(0));
  P().discard.push(...P().inPlay.splice(0));
  P().R = 0;
  P().A = 0;
  g().pending = [];
  const n = Math.max(0, MX.HAND_SIZE + bonus - g().turn.drawPenalty);
  drawCards(n);
  if (bonus)
    log(`Your Men Are Already Dead: you draw ${bonus} extra card${bonus > 1 ? 's' : ''}.`, 'good');
  if (g().turn.drawPenalty)
    log(
      `Agent Brown's strike: you draw ${g().turn.drawPenalty} fewer card${g().turn.drawPenalty > 1 ? 's' : ''}.`,
      'bad',
    );
  g().turnNo++;
  await startTurn();
}

// "Begin Act X Part Y" — always ends your turn.
export async function beginPart(act: number, part: number) {
  const prevAct = g().act;
  g().act = act;
  g().part = part;
  const key = `${act}.${part}`;
  const actDef = ACT_CARDS[g().movie][key];
  log(`— Begin Act ${act} Part ${part}: ${actDef.name} —`, 'act');
  await UI.showCard(actDef.image, `Act ${act} Part ${part} — ${actDef.name}`);

  if (g().movie === 'matrix') await beginPartMatrix(key, prevAct);
  if (g().movie === 'reloaded') await beginPartReloaded(key);
  if (g().movie === 'revolutions') await beginPartRevolutions(key);
  g().turnEnding = true; // skip the rest of the Action + Strike Phases
}

async function beginPartRevolutions(key: string) {
  if (key === '1.2') {
    // Shuffle the 14 Seraph Heroes and the Dock into Zion; the deal is made.
    const seraph = buildHeroGroup('Seraph').map(mk);
    const dockCards: CardInstance[] = [];
    for (let i = 0; i < 5; i++) {
      const dc = g().dock[i];
      if (dc) {
        dockCards.push(dc);
        g().dock[i] = null;
      }
    }
    g().zion.push(...seraph, ...dockCards);
    shuffle(g().zion);
    for (let i = 0; i < 5; i++) refillDock(i);
    g().flags.merovingianDeal = true;
    log(
      'The 14 SERAPH Heroes are shuffled into Zion. The "deal" is made — THE MEROVINGIAN can now be fought (5 ⚔)!',
      'act',
    );
  }
  if (key === '2.2') {
    // Retreat to the Temple.
    P().rsi = 'real';
    log('Everyone retreats to the Temple of Zion.', 'act');
    const opts = g().dock.filter((x): x is CardInstance => !!x && (D(x).cost ?? 0) <= 4);
    if (opts.length) {
      const sel = await UI.pick(opts, {
        title: 'The Temple',
        prompt: 'Gain a Hero with cost 4 or less from the Dock.',
        min: 0,
        max: 1,
        skippable: true,
      });
      if (sel.length) {
        const i = g().dock.findIndex(x => x && x.uid === sel[0].uid);
        g().dock[i] = null;
        gainCard(sel[0]);
        refillDock(i);
        log(`You gain ${D(sel[0]).name}.`, 'good');
      }
    }
    await beginPart(3, 1);
    return;
  }
  if (key === '3.2') {
    const giveUp = await UI.chooseOption(
      'Machine City',
      "You've made it to Machine City, but are exhausted and injured. Do you give up and end the game with a Minor Victory? Or do you enter the Matrix one last time?",
      [
        { label: 'Enter the Matrix one last time', value: false },
        { label: 'Give up (Minor Victory)', value: true },
      ],
    );
    if (giveUp) {
      gameOver(
        true,
        'MINOR VICTORY',
        'The machines accept a truce. Zion is spared — for now. But Smith is still out there…',
      );
      return;
    }
    // The Hovercrafts, the Dock, and Zion are gone. Everyone jacks in.
    g().defeatedHeroes.push(...g().hovercraftStack.splice(0));
    for (let i = 0; i < 5; i++) {
      const dc = g().dock[i];
      if (dc) {
        g().defeatedHeroes.push(dc);
        g().dock[i] = null;
      }
    }
    g().defeatedHeroes.push(...g().zion.splice(0));
    P().rsi = 'matrix';
    log(
      'No more recruits, no way back: you enter the Matrix ONE LAST TIME. Defeat the ORACLE-SMITH (each fight: 5 ⚔ → draw a Strike; its damage sticks to him; 15 total defeats him). Pay ® equal to your speed to avoid his Strikes.',
      'act',
    );
  }
  if (key === '3.3') {
    // The Deletion Program: everything comes back together one last time.
    P().deck.push(...P().hand.splice(0), ...P().inPlay.splice(0), ...P().discard.splice(0));
    shuffle(P().deck);
    log(
      'You shuffle your hand, play area, and discard pile into your deck. SEND THE DELETION PROGRAM: pay ®/⚔ equal to the next higher or lower number to move the Time Track; at 3 the leftmost SMITH is deleted. At the end of each turn your hand, play area, and discard pile are deleted!',
      'act',
    );
  }
}

async function beginPartReloaded(key: string) {
  if (key === '1.2') {
    // The Oracle has a gift for you… and Smith has an offer.
    P().deck.push(mk('Act1TheOraclesCallExtra_1'));
    log('I LOVE CANDY goes on top of your deck.', 'good');
    for (let i = 0; i < 3; i++)
      g().combatZone.unshift(Object.assign(mk('Act1TheOraclesCallExtra_2'), { faceUp: true }));
    log('"Me… me… me." Three SMITHS enter the Combat Zone!', 'bad');
    await beginPart(2, 1);
    return;
  }
  if (key === '2.2') {
    // Shuffle the 14 Keymaker Heroes and the Dock into Zion.
    const keymaker = buildHeroGroup('Keymaker').map(mk);
    const dockCards: CardInstance[] = [];
    for (let i = 0; i < 5; i++) {
      const dc = g().dock[i];
      if (dc) {
        dockCards.push(dc);
        g().dock[i] = null;
      }
    }
    g().zion.push(...keymaker, ...dockCards);
    shuffle(g().zion);
    for (let i = 0; i < 5; i++) refillDock(i);
    g().flags.keymakerInGame = true;
    log('The 14 KEYMAKER Heroes are shuffled into Zion. Find him and rescue him!', 'act');
  }
  if (key === '3.2') {
    g().flags.sourceDeadlineTurn = null;
    // The Inevitable card returns to the top of the Matrix deck.
    const inevIdx = g().matrixRow.findIndex(isInev);
    if (inevIdx >= 0) {
      const inev = g().matrixRow[inevIdx]!;
      g().matrixRow[inevIdx] = null;
      g().matrixDeck.push(inev);
      log('The Prophecy of The One slides back onto the Matrix deck.');
    }
    // The player who opened the door meets the Architect in Operations.
    P().rsi = 'ops';
    const arch = Object.assign(mk('Act3TheSourceExtra_1'), { faceUp: true });
    g().operations.push(arch);
    await UI.showCard(CARDS['Act3TheSourceExtra_1'].image, 'Meet the Architect');
    const back = await UI.chooseOption(
      'Meet the Architect',
      '"The door to your right leads to the Source… the door to your left leads back to the Matrix." Fulfill the function of The One, or rely on the quintessential human delusion — hope?',
      [
        { label: 'Re-enter the Matrix (hope)', value: true },
        { label: 'Return to the Source (Minor Victory)', value: false },
      ],
    );
    if (!back) {
      gameOver(
        true,
        'MINOR VICTORY',
        'You return to the Source. Zion is destroyed, but humanity survives to be freed again.',
      );
      return;
    }
    P().rsi = 'matrix';
    log(
      'You choose HOPE and re-enter the Matrix. Clear the Matrix deck, Row, and Combat Zone down to the Inevitable card!',
      'act',
    );
  }
  if (key === '3.3') {
    // Complete the Architect challenge; the fight moves to the Real World.
    const arch = g().operations.find(x => x.id === 'Act3TheSourceExtra_1');
    if (arch) {
      removeCard(arch.uid);
      g().discardedCES.push(arch);
    }
    P().rsi = 'real';
    const inev =
      g().combatZone.find(isInev) ??
      g().matrixDeck.find(isInev) ??
      g().matrixRow.find(isInev) ??
      null;
    if (inev) {
      removeCard(inev.uid);
      const di = g().matrixDeck.indexOf(inev);
      if (di >= 0) g().matrixDeck.splice(di, 1);
      inev.id = 'Act3TheSource_6B';
      inev.faceUp = true;
      g().realWorldEnemies.push(inev);
    }
    log(
      'The Prophecy was a lie. TOW BOMB SENTINELS (20 ⚔) attack the Nebuchadnezzar in the Real World!',
      'bad',
    );
    log(
      'Once per turn: pay ⚔ to raise the Time Track (any number of times), OR gain ⚔ equal to the Time Track for each Neo Hero in play.',
      'act',
    );
  }
}

async function beginPartMatrix(key: string, prevAct: number) {
  const act = g().act;
  if (act >= 3 && prevAct < 3) {
    // Act 2's Agent Smith "leaves" when Act 3 begins.
    const smith = [...g().combatZone, ...g().matrixRow.filter(x => x !== null)].find(
      c => c.id === 'Act2KnowThyselfExtra_2',
    );
    if (smith) {
      removeCard(smith.uid);
      g().defeatedEnemies.push(smith);
      log('Agent Smith leaves — his work here is done.', 'good');
    }
  }
  if (act === 2 && prevAct === 1 && P().avatarId === 'AvatarThomasAnderson') {
    // Thomas Anderson wakes up as Neo.
    P().rsi = 'real';
    P().avatarId = 'AvatarThomasAndersonNeo';
    P().fymOutOfPlay = false;
    P().deck.push(mk('StarterFreeYourMind'));
    log(
      'Welcome to the Real World. Thomas Anderson flips to NEO — Free Your Mind goes on top of your deck.',
      'act',
    );
    await UI.showCard(AVATARS.AvatarThomasAndersonNeo.image, 'You are Neo now');
  }

  if (key === '2.2') {
    // Setup: gain a random Oracle Hero face down on top of your deck.
    const oracleIds = cardsOfGroup('Oracle').map(c => c.id);
    const pickId = oracleIds[Math.floor(Math.random() * oracleIds.length)];
    P().deck.push(mk(pickId));
    log('The Oracle gives you a gift — a random Oracle Hero is on top of your deck.', 'good');
    await beginPart(3, 1);
    return;
  }
  if (key === '3.1') {
    g().operations.push(Object.assign(mk('Act3HeIsTheOneExtra_2'), { faceUp: true }));
    for (let i = 0; i < 2; i++) {
      const guard = Object.assign(mk('Act3HeIsTheOneExtra_4'), { faceUp: true });
      g().combatZone.unshift(guard);
    }
    log("Rescue the Captive is in Operations. Two Captive's Guards block the Combat Zone!", 'bad');
  }
  if (key === '3.2') {
    const smith = Object.assign(mk('Act3HeIsTheOneExtra_9'), { faceUp: true });
    const inevIdx = g().matrixRow.findIndex(isInev);
    const inevCZ = g().combatZone.find(isInev);
    if (inevCZ) await enterCombatZone(smith);
    else if (inevIdx >= 0) await placeIntoRow(smith, Math.max(0, inevIdx - 1));
    else await placeIntoRow(smith, 4);
    log(
      'An Agent has destroyed your exit. AGENT SMITH (12 ⚔) blocks your way — defeat him in the Subway or the Combat Zone, or run for a Minor Victory.',
      'bad',
    );
  }
  if (key === '3.3') {
    P().rsi = 'matrix';
    // Defeat everything in the Matrix deck, row and Combat Zone.
    for (const c of g().matrixDeck.splice(0)) g().defeatedEnemies.push(c);
    for (let i = 0; i < 5; i++) {
      if (g().matrixRow[i]) {
        g().defeatedEnemies.push(g().matrixRow[i]!);
        g().matrixRow[i] = null;
      }
    }
    g().defeatedEnemies.push(...g().combatZone.splice(0));
    // The three Agents, Evade face up, into the three rightmost spaces.
    await placeIntoRow(Object.assign(mk('Act3HeIsTheOneExtra_7'), { faceUp: true }), 2); // Brown, Evade 6
    await placeIntoRow(Object.assign(mk('Act3HeIsTheOneExtra_8'), { faceUp: true }), 3); // Jones, Evade 8
    await placeIntoRow(Object.assign(mk('Act3HeIsTheOneExtra_6'), { faceUp: true }), 4); // Smith, Evade 10
    await UI.showCard(CARDS['Act3HeIsTheOneExtra_10A'].image, 'Become The One');
    log(
      `BECOME THE ONE: pay ⚔ equal to the next number to raise the Time Track from ${g().time} to 10. Evade the Agents with ®. You cannot leave the Matrix, recruit, or fight the Agents.`,
      'act',
    );
  }
}

/* ═══════════ player actions (called from the UI) ═══════════ */
function assertAction(): boolean {
  return g().phase === 'action' && !g().gameOver;
}

const ALL_CLASSES: CardClass[] = ['I', 'R', 'S', 'U', 'T'];
async function chooseClass(title: string, exclude?: CardClass): Promise<CardClass> {
  return await UI.chooseOption(
    title,
    'Choose a class for this Hero this turn.',
    ALL_CLASSES.filter(x => x !== exclude).map(x => ({ label: MX.CLASSES[x], value: x })),
  );
}

export async function actPlayCard(uid: number) {
  if (!assertAction()) return;
  const i = P().hand.findIndex(c => c.uid === uid);
  if (i < 0) return;
  const c = P().hand[i];
  const def = D(c);
  P().hand.splice(i, 1);
  P().inPlay.push(c);
  // Keymaker heroes pick their class(es) as they're played.
  if (def.clsWild) {
    c.chosenCls = await chooseClass(def.name);
    if (/two different classes/.test(def.text))
      c.chosenCls2 = await chooseClass(def.name, c.chosenCls);
    log(
      `${def.name} counts as ${cardClasses(c)
        .map(x => MX.CLASSES[x])
        .join(' + ')} this turn.`,
    );
  }
  const classes = cardClasses(c);
  const combo = classes.some(x => g().turn.playedClasses[x] > 0);
  P().R += def.recruit;
  P().A += def.attack;
  log(
    `You play ${def.name}${def.recruit ? ` (+${def.recruit} ®)` : ''}${def.attack ? ` (+${def.attack} ⚔)` : ''}.`,
  );
  const s = SCRIPTS[c.id];
  if (c.id === 'StarterFreeYourMind') await resolveActAbility();
  if (s && s.onPlay) await s.onPlay(c);
  if (combo && s && s.onCombo) {
    log(`${classes.map(x => MX.CLASSES[x]).join('/')} class ability triggers!`, 'good');
    await s.onCombo(c);
  }
  for (const x of classes) g().turn.playedClasses[x]++;
  if (def.type === 'hovercraft') advanceFlyLine();
  await afterActionChecks();
}

export async function resolveActAbility() {
  const blinded = P().strikes.filter(c => c.id === 'StrikeBlinded');
  if (blinded.length) {
    for (const b of blinded) healStrike(b);
    log('You were Blinded — instead of your Act ability you discard all Blinded Strikes.', 'bad');
    return;
  }
  const s = AVATAR_SCRIPTS[P().avatarId];
  const fn = s && s[g().act];
  if (fn) await fn();
  else log(`${avatar().name} has no Act ${g().act} ability.`);
}

export async function actCoordinate(uid: number) {
  if (!assertAction()) return;
  if (P().rsi === 'ops') {
    log("You can't Coordinate while in Operations.");
    return;
  }
  const i = P().hand.findIndex(c => c.uid === uid);
  if (i < 0 || !D(P().hand[i]).kw.includes('Coordinate')) return;
  // Ballard doesn't count toward the once-per-turn Coordinate limit.
  const ballard = P().hand[i].id === 'ShipCaptains_4Uncommon';
  if (g().turn.coordUsed && !ballard) {
    log('You already used your Coordinate discard this turn.');
    return;
  }
  if (g().turnNo < g().flags.noCoordUntilTurn) {
    log("You can't Coordinate this turn (What good is a phone call…).");
    return;
  }
  const c = P().hand.splice(i, 1)[0];
  P().discard.push(c);
  if (!ballard) g().turn.coordUsed = true;
  drawCards(1);
  log(`Solo Coordinate: you discard ${D(c).name} and draw a card.`);
  UI.render();
}

// The Kid: 1 less ® per Neo Hero in your play area.
export function effectiveRecruitCost(c: CardInstance): number {
  const def = D(c);
  let cost = def.cost ?? 0;
  if (def.id === 'DefendersOfZion_1Rare')
    cost -= P().inPlay.filter(x => D(x).group?.startsWith('Neo')).length;
  return Math.max(0, cost);
}
export function canRecruitFromHere(c: CardInstance): boolean {
  // Digital Heroes can also be recruited from inside the Matrix.
  return P().rsi === 'real' || (inMatrix() && D(c).kw.includes('DigitalHero'));
}
export async function actRecruitDock(i: number) {
  if (!assertAction()) return;
  const c = g().dock[i];
  if (!c) return;
  const def = D(c);
  if (!canRecruitFromHere(c)) {
    log('You can only recruit while in the Real World (Digital Heroes: also in the Matrix).');
    return;
  }
  const cost = effectiveRecruitCost(c);
  if (P().R < cost) {
    log(`Not enough ® (need ${cost}).`);
    return;
  }
  P().R -= cost;
  g().dock[i] = null;
  gainCard(c, await gainDest(def.name));
  refillDock(i);
  log(`You recruit ${def.name} (cost ${cost} ®).`, 'good');
  await afterActionChecks();
}
// Towering Leap: once this turn, a gained Hero may go on top of your deck.
async function gainDest(name: string): Promise<'discard' | 'deckTop'> {
  if (g().turn.deckTopGains <= 0) return 'discard';
  const top = await UI.confirmBox(
    'Towering Leap',
    `Put ${name} on top of your deck instead of your discard pile?`,
    'Deck top',
    'Discard pile',
  );
  if (top) g().turn.deckTopGains--;
  return top ? 'deckTop' : 'discard';
}
export async function actRecruitHovercraft() {
  if (!assertAction()) return;
  if (P().rsi !== 'real') {
    log('You can only recruit while in the Real World.');
    return;
  }
  if (!g().hovercraftStack.length) {
    log('No Hovercrafts left.');
    return;
  }
  if (P().R < 3) {
    log('Not enough ® (need 3).');
    return;
  }
  P().R -= 3;
  const c = g().hovercraftStack.pop()!;
  c.faceUp = true;
  gainCard(c, await gainDest(D(c).name));
  log(`You recruit ${D(c).name}! (Hovercraft)`, 'good');
  await afterActionChecks();
}

export async function actScan(idx: number) {
  if (!assertAction()) return;
  const c = g().matrixRow[idx];
  if (!c || c.faceUp) return;
  if (!inMatrix()) {
    log('You must be in the Matrix to scan.');
    return;
  }
  if (g().turn.noScan) {
    log("You can't scan for the rest of this turn.");
    return;
  }
  const cost = MX.SCAN_COST[idx];
  // A Backdoor lets you pay ® instead of ⚔ to scan this space.
  const backdoor = g().backdoors[idx];
  let payR = false;
  if (backdoor) {
    const canA = P().A >= cost;
    const canR = P().R >= cost;
    if (!canA && !canR) {
      log(`Not enough ⚔ or ® to scan (need ${cost}).`);
      return;
    }
    payR =
      canR &&
      (!canA ||
        (await UI.chooseOption('Backdoor', `Pay for the scan (${cost}) with:`, [
          { label: `${cost} ® (through the Backdoor)`, value: true },
          { label: `${cost} ⚔`, value: false },
        ])));
  } else if (P().A < cost) {
    log(`Not enough ⚔ to scan (need ${cost}).`);
    return;
  }
  if (payR) {
    P().R -= cost;
    log(`You scan the ${MX.ROW_NAMES[idx]} through the Backdoor (−${cost} ®).`);
    // Find the Oracle: instead of revealing, you may walk through.
    const oracle = g().operations.find(x => x.id === 'Act1TheOraclesCall_5');
    if (oracle) {
      const walk = await UI.confirmBox(
        'Find the Oracle',
        'Instead of revealing that card, walk through the Backdoor and find the Oracle?',
        'Walk through',
        'Reveal the card',
      );
      if (walk) {
        g().backdoors[idx] = null;
        g().discardedCES.push(backdoor!);
        removeCard(oracle.uid);
        g().discardedCES.push(oracle);
        log('You walk through the Backdoor… "I suppose the most obvious question is…"', 'act');
        await beginPart(1, 2);
        await afterActionChecks();
        return;
      }
    }
  } else {
    P().A -= cost;
    log(`You scan the ${MX.ROW_NAMES[idx]} (−${cost} ⚔).`);
  }
  c.scannedTurn = g().turnNo; // Mobile Bomb: revealed by a scan → holds fire
  await revealCard(c, 'row');
  await afterActionChecks();
}
// Free scan from a card effect ("scan any space") — no cost, works from anywhere.
export async function freeScan(idx: number) {
  const c = g().matrixRow[idx];
  if (!c || c.faceUp) return;
  log(`You scan the ${MX.ROW_NAMES[idx]} (free).`);
  c.scannedTurn = g().turnNo;
  await revealCard(c, 'row');
}

// Is this enemy fought from the Real World? (next to your Avatar, squatting
// the Dock, or sitting on Zion)
function inRealWorldZone(uid: number): boolean {
  const zb = g().zionBlocker;
  return (
    g().realWorldEnemies.some(x => x.uid === uid) ||
    g().dockEnemies.some(x => x && x.uid === uid) ||
    (!!zb && zb.uid === uid)
  );
}
export function fightBlockReason(c: CardInstance): string | null {
  const def = D(c);
  const inRow = g().matrixRow.findIndex(x => x && x.uid === c.uid);
  const inRW = inRealWorldZone(c.uid);
  if (def.type !== 'enemy' || !c.faceUp) return 'not-an-enemy';
  if (g().movie === 'matrix' && g().act === 3 && g().part === 3)
    return "You can't fight the Agents — become The One!";
  if (inRW) {
    if (P().rsi !== 'real') return 'You must be in the Real World to fight this Enemy.';
  } else if (!inMatrix()) return 'You must be in the Matrix to fight.';
  const s = SCRIPTS[c.id];
  if (s && s.fightBlock) {
    const why = s.fightBlock(c);
    if (why) return why;
  }
  if (def.kw.includes('Unfightable') || def.defeat == null) return `${def.name} can't be fought.`;
  if (c.id === 'Act3HeIsTheOneExtra_9' && inRow >= 0 && inRow !== 0)
    return 'Agent Smith is Undefeatable unless you fight him in the Subway or the Combat Zone.';
  if (def.kw.includes('Cover') && inRow >= 0) {
    const l = g().matrixRow[inRow - 1],
      r = g().matrixRow[inRow + 1];
    if ((l && !l.faceUp) || (r && !r.faceUp))
      return `${def.name} has Cover — a face-down card protects it.`;
  }
  if (c.noFightTurn === g().turnNo) return `${def.name} can't be fought this turn.`;
  const cost = effectiveFightCost(c);
  if (P().A < cost) return `Not enough ⚔ (need ${cost}).`;
  return null;
}
export function effectiveFightCost(c: CardInstance): number {
  let cost = D(c).defeat ?? 0;
  const s = SCRIPTS[c.id];
  if (s && s.fightCost) cost = s.fightCost(c, cost);
  if (g().combatZone.some(x => x.uid === c.uid)) cost = Math.max(0, cost - g().turn.kungfuCZBonus);
  if (inRealWorldZone(c.uid)) cost = Math.max(0, cost - g().turn.gunneryRWBonus);
  return Math.max(0, cost - g().turn.enemyDebuff);
}
export async function actFight(uid: number) {
  if (!assertAction()) return;
  const f = findZone(uid);
  if (!f) return;
  const c = f.card;
  const reason = fightBlockReason(c);
  if (reason) {
    log(reason);
    return;
  }
  const inCZ = g().combatZone.some(x => x.uid === c.uid);
  const cost = effectiveFightCost(c);
  P().A -= cost;
  if (inCZ && g().turn.kungfuCZBonus) {
    log(`I Know Kung Fu: −${g().turn.kungfuCZBonus} ⚔ on this fight.`, 'good');
    g().turn.kungfuCZBonus = 0;
  }
  if (inRealWorldZone(c.uid) && g().turn.gunneryRWBonus) {
    log(`Gunnery: −${g().turn.gunneryRWBonus} ⚔ on this fight.`, 'good');
    g().turn.gunneryRWBonus = 0;
  }
  if (D(c).name === 'Smith') g().turn.smithsFought++;
  log(`You fight ${D(c).name} (−${cost} ⚔).`);
  const s = SCRIPTS[c.id];
  if (s && s.fight) {
    await s.fight(c);
  } else {
    defeatEnemy(c);
    log(`${D(c).name} is defeated!`, 'good');
    if (s && s.onDefeat) await s.onDefeat(c);
  }
  await afterActionChecks();
}

export async function actCompleteChallenge(uid: number) {
  if (!assertAction()) return;
  const f = findZone(uid);
  if (!f) return;
  const c = f.card;
  const def = D(c);
  if (def.type !== 'challenge' || !c.faceUp) return;
  if (def.realWorld) {
    if (P().rsi !== 'real') {
      log('You must be in the Real World to complete this Challenge.');
      return;
    }
  } else if (!inMatrix()) {
    log('You must be in the Matrix to complete Challenges.');
    return;
  }
  const s = SCRIPTS[c.id];
  if (s && s.canComplete) {
    const why = s.canComplete(c);
    if (why) {
      log(why);
      return;
    }
  }
  if (def.defeatType === 'R') {
    if (P().R < (def.defeat ?? 0)) {
      log(`Not enough ® (need ${def.defeat}).`);
      return;
    }
    P().R -= def.defeat ?? 0;
  } else if (def.defeat) {
    if (P().A < def.defeat) {
      log(`Not enough ⚔ (need ${def.defeat}).`);
      return;
    }
    P().A -= def.defeat;
  }
  removeCard(c.uid);
  g().discardedCES.push(c);
  log(`Challenge completed: ${def.name}!`, 'good');
  if (s && s.onComplete) await s.onComplete(c);
  await afterActionChecks();
}

export async function actMove() {
  if (!assertAction()) return;
  if (g().turn.freeMoveUsed) {
    log('You already used your free move this turn.');
    return;
  }
  if (P().rsi === 'ops') {
    log("You can't use your free move to leave Operations.");
    return;
  }
  if (P().rsi === 'real') {
    const why = enterMatrixBlockReason();
    if (why) {
      log(why);
      return;
    }
    P().rsi = 'matrix';
    g().turn.freeMoveUsed = true;
    log('You jack in — you are now IN THE MATRIX.', 'good');
  } else {
    const why = leaveMatrixBlockReason();
    if (why) {
      log(why);
      return;
    }
    const free = phoneAvailable();
    if (free != null) {
      P().rsi = 'real';
      g().turn.freeMoveUsed = true;
      log(`You exit through the ${MX.ROW_NAMES[free]} phone — back in the Real World.`, 'good');
    } else if (
      g().combatZone.length < MX.COMBAT_PHONE_BLOCKED_AT &&
      P().R >= MX.COMBAT_PHONE_COST
    ) {
      const ok = await UI.confirmBox(
        'Pay phone',
        `Exit through the Combat Zone phone for ${MX.COMBAT_PHONE_COST} ®?`,
      );
      if (!ok) return;
      P().R -= MX.COMBAT_PHONE_COST;
      P().rsi = 'real';
      g().turn.freeMoveUsed = true;
      log('You pay 3 ® and exit through the Combat Zone phone.', 'good');
    } else {
      log('No available phone: Subway/Alley are blocked and the Combat Zone phone is unavailable.');
    }
  }
  await afterActionChecks();
}
export function phoneAvailable(): number | null {
  for (const idx of MX.PHONE_SPACES)
    if (!g().matrixRow[idx] && !g().flags.deadPhones[idx]) return idx;
  return null;
}
export function enterMatrixBlockReason(): string | null {
  if (g().turn.noMatrixMove) return "Stranded — you can't enter the Matrix this turn.";
  if (g().realWorldEnemies.some(c => D(c).name === 'Bane'))
    return "Bane stands over your body — you can't enter the Matrix!";
  if (g().movie === 'reloaded' && g().act === 3 && g().part === 3)
    return 'The fight is in the Real World now.';
  return null;
}
export function leaveMatrixBlockReason(): string | null {
  if (g().movie === 'matrix' && g().act === 3 && g().part === 3)
    return "You can't leave the Matrix. You must become The One.";
  if (g().movie === 'revolutions' && g().act === 3 && g().part >= 2)
    return "You've entered the Matrix one last time — there is no way back.";
  if (g().turn.noMatrixMove) return "Stranded — you can't leave the Matrix this turn.";
  if (g().combatZone.some(c => c.id === 'Act2KnowThyselfExtra_2'))
    return "Agent Smith is in the Combat Zone — players can't leave the Matrix!";
  return null;
}
// Card-effect move to the Real World (no phone needed).
export function effectMoveToRealWorld() {
  if (P().rsi === 'real') return;
  if (P().rsi === 'matrix') {
    const why = leaveMatrixBlockReason();
    if (why) {
      log(why);
      return;
    }
  } // from Operations: card effects CAN move you.
  P().rsi = 'real';
  log('A card effect moves you to the Real World.', 'good');
}

export async function actEvade(uid: number) {
  if (!assertAction()) return;
  const f = findZone(uid);
  if (!f) return;
  const c = f.card;
  const def = D(c);
  if (!def.evade) return;
  if (P().R < def.evade) {
    log(`Not enough ® to Evade (need ${def.evade}).`);
    return;
  }
  let target = -1;
  for (let i = 4; i >= 0; i--)
    if (!g().matrixRow[i]) {
      target = i;
      break;
    }
  if (target < 0) {
    log('No clear space in the Matrix Row to evade to.');
    return;
  }
  P().R -= def.evade;
  removeCard(c.uid);
  g().matrixRow[target] = c;
  log(
    `You Evade ${def.name} (−${def.evade} ®) — he is thrown back to the ${MX.ROW_NAMES[target]}.`,
    'good',
  );
  await afterActionChecks();
}

// Buy Time 5®: distract an Agent so it won't strike this turn.
export async function actBuyTime(uid: number) {
  if (!assertAction()) return;
  const f = findZone(uid);
  if (!f) return;
  const c = f.card;
  if (!D(c).kw.includes('BuyTime') || c.buyTimeTurn === g().turnNo) return;
  if (!inMatrix()) {
    log('You must be in the Matrix to Buy Time.');
    return;
  }
  if (P().R < 5) {
    log('Not enough ® to Buy Time (need 5).');
    return;
  }
  P().R -= 5;
  c.buyTimeTurn = g().turnNo;
  log(`You pay 5 ® to distract ${D(c).name} — it won't strike this turn.`, 'good');
  await afterActionChecks();
}

export async function actRaiseTime() {
  if (!assertAction() || g().movie !== 'matrix' || !(g().act === 3 && g().part === 3)) return;
  const cost = g().time + 1;
  if (g().time >= 10) return;
  if (P().A < cost) {
    log(`Not enough ⚔ (need ${cost} to raise the Time Track to ${cost}).`);
    return;
  }
  P().A -= cost;
  g().time += 1;
  log(`⚡ You pay ${cost} ⚔ — the Time Track rises to ${g().time}!`, 'act');
  if (g().time >= 10) {
    await UI.showCard(CARDS['Act3HeIsTheOneExtra_10B'].image, 'Become The One');
    gameOver(
      true,
      'MAJOR VICTORY — You are The One',
      'You effortlessly destroy Agent Smith. The other Agents flee. "Where we go from there is a choice I leave to you."',
    );
  }
  await afterActionChecks();
}

export async function actJump() {
  if (!assertAction()) return;
  const c = g().attached.building;
  if (!c) return;
  if (!inMatrix()) {
    log('You must be in the Matrix to jump.');
    return;
  }
  if (g().matrixRow[3]) {
    log('The Building space must be clear to jump.');
    return;
  }
  const top = deckTop();
  if (!top) {
    log('Your deck and discard are empty — no card to discard for the jump.');
    return;
  }
  const def = D(top);
  P().discard.push(top);
  if ((def.cost || 0) >= 5) {
    log(`Jump! You discard ${def.name} (cost ${def.cost}) — YOU MADE IT!`, 'good');
  } else {
    log(
      `Jump… you discard ${def.name} (cost ${def.cost || 0}) — everybody falls the first time.`,
      'bad',
    );
    await drawStrike({});
  }
  g().attached.building = null;
  g().discardedCES.push(c);
  g().flags.trainingDefeated++;
  log(`Training complete (${g().flags.trainingDefeated}/7): First Jump.`, 'good');
  await afterActionChecks();
}

export async function actTalkOracle() {
  if (!assertAction()) return;
  const c = g().operations.find(x => x.id === 'Act2KnowThyself_9');
  if (!c) return;
  if (!inMatrix()) {
    log('You must be in the Matrix to talk to the Oracle.');
    return;
  }
  if (g().act !== 2) {
    log('Only during Act 2.');
    return;
  }
  if (g().flags.trainingDefeated < 7) {
    log(`You need 7 Training cards defeated (${g().flags.trainingDefeated}/7).`);
    return;
  }
  removeCard(c.uid);
  g().discardedCES.push(c);
  log('You talk to The Oracle… "You\'re waiting for something. Your next life, maybe."', 'act');
  await beginPart(2, 2);
  await afterActionChecks();
}

export async function actFreeNeo() {
  if (!assertAction()) return;
  if (g().movie !== 'matrix' || !(g().act === 1 && g().part === 2)) return;
  if (P().rsi !== 'real') {
    log('You must be in the Real World to free Neo.');
    return;
  }
  const has = P().inPlay.some(c => D(c).type === 'hovercraft') || g().turn.gainedHovercraft;
  if (!has) {
    log('You need to gain a Hovercraft or have one in your play area.');
    return;
  }
  const neo = buildHeroGroup('Neo').map(mk);
  const dockCards: CardInstance[] = [];
  for (let i = 0; i < 5; i++) {
    const dc = g().dock[i];
    if (dc) {
      dockCards.push(dc);
      g().dock[i] = null;
    }
  }
  g().zion.push(...neo, ...dockCards);
  shuffle(g().zion);
  for (let i = 0; i < 5; i++) refillDock(i);
  log('NEO IS FREED FROM THE MATRIX! The 14 Neo Heroes are shuffled into Zion.', 'act');
  await beginPart(2, 1);
  await afterActionChecks();
}

// Reloaded 2.2: while in the Matrix with a Keymaker Hero in play, rescue him.
export async function actRescueKeymaker() {
  if (!assertAction()) return;
  if (g().movie !== 'reloaded' || !(g().act === 2 && g().part === 2)) return;
  if (!inMatrix()) {
    log('You must be in the Matrix to rescue the Keymaker.');
    return;
  }
  if (!P().inPlay.some(c => D(c).group === 'Keymaker')) {
    log('You need a Keymaker Hero in your play area.');
    return;
  }
  log('THE KEYMAKER IS RESCUED! "We do only what we are meant to do."', 'act');
  await beginPart(3, 1);
  await afterActionChecks();
}

// Reloaded 3.3: once per turn, raise the Time Track with ⚔ (any number of
// times) OR gain ⚔ equal to the Time Track for each Neo Hero in play.
export async function actReloadedTime(mode: 'raise' | 'gain') {
  if (!assertAction() || g().movie !== 'reloaded' || !(g().act === 3 && g().part === 3)) return;
  if (g().turn.timeMode && g().turn.timeMode !== mode) {
    log(`You already chose to ${g().turn.timeMode === 'raise' ? 'raise the Time Track' : 'gain ⚔'} this turn.`);
    return;
  }
  if (mode === 'raise') {
    const cost = g().time + 1;
    if (g().time >= 10) {
      log('The Time Track is already at 10.');
      return;
    }
    if (P().A < cost) {
      log(`Not enough ⚔ (need ${cost} to raise the Time Track to ${cost}).`);
      return;
    }
    g().turn.timeMode = 'raise';
    P().A -= cost;
    g().time += 1;
    log(`⚡ You pay ${cost} ⚔ — the Time Track rises to ${g().time}.`, 'act');
  } else {
    if (g().turn.timeMode === 'gain') {
      log('You already gained ⚔ from the Time Track this turn.');
      return;
    }
    const neos = P().inPlay.filter(c => D(c).group?.startsWith('Neo')).length;
    if (!neos) {
      log('You need a Neo Hero in your play area to channel the Time Track.');
      return;
    }
    g().turn.timeMode = 'gain';
    const gain = g().time * neos;
    P().A += gain;
    log(
      `⚡ Neo channels the Source: +${gain} ⚔ (Time Track ${g().time} × ${neos} Neo Hero${neos > 1 ? 'es' : ''}).`,
      'act',
    );
  }
  await afterActionChecks();
}

// Revolutions 3.3 — Send the Deletion Program: pay ®/⚔ equal to the next
// higher or lower number to move the Time Track there.
export async function actDeletionMove(dir: 1 | -1) {
  if (!assertAction() || g().movie !== 'revolutions' || !(g().act === 3 && g().part === 3)) return;
  const target = g().time + dir;
  if (target < 1 || target > 10) {
    log("The Time Track can't move there.");
    return;
  }
  if (P().R + P().A < target) {
    log(`Not enough ® + ⚔ (need ${target} total to move the Time Track to ${target}).`);
    return;
  }
  // Pay with ® first, keeping ⚔ (only ® and ⚔ exist to pay with in solo).
  const fromR = Math.min(P().R, target);
  P().R -= fromR;
  P().A -= target - fromR;
  g().time = target;
  log(`⚡ The Deletion Program hums — the Time Track moves to ${g().time}.`, 'act');
  await afterActionChecks(); // the Smith check lives there
}

export async function actMinorVictory() {
  if (!assertAction() || g().movie !== 'matrix' || !(g().act === 3 && g().part === 2)) return;
  const ok = await UI.confirmBox(
    'Run for it?',
    'An Agent has destroyed your exit. Do you run, and end the game with a MINOR VICTORY? Or are you beginning to believe?',
    'Run (Minor Victory)',
    'Keep fighting',
  );
  if (!ok) return;
  gameOver(
    true,
    'MINOR VICTORY',
    'You escape the Matrix. Neo lives to fight another day… but he is not yet The One.',
  );
  UI.render();
}

export async function actSacrifice(uid: number) {
  if (!assertAction()) return;
  const c = P().inPlay.find(x => x.uid === uid);
  if (!c || !D(c).kw.includes('Sacrifice')) return;
  const s = SCRIPTS[c.id];
  if (s && s.sacrifice) {
    const done = await s.sacrifice(c);
    if (done === false) return; // cancelled
    defeatPlayerCard(c, P().inPlay);
    log(`Sacrificed: ${D(c).name}.`, 'good');
  }
  await afterActionChecks();
}

export async function actPending(idx: number) {
  if (!assertAction()) return;
  const p = g().pending[idx];
  if (!p) return;
  const s = SCRIPTS[p.cardId];
  const fn = s && s.pending && s.pending[p.key];
  if (!fn) {
    g().pending.splice(idx, 1);
    return;
  }
  const done = await fn(p);
  if (done !== false) g().pending.splice(g().pending.indexOf(p), 1);
  await afterActionChecks();
}
export function addPending(c: CardInstance, key: string, label: string) {
  g().pending.push({ cardId: c.id, uid: c.uid, key, label });
}

export async function actEndPhase() {
  if (!assertAction()) return;
  await endActionPhase();
  UI.render();
}

// After any action: act-transition bookkeeping + win checks + re-render.
async function afterActionChecks() {
  if (g().gameOver) {
    UI.render();
    return;
  }
  // Act 1 Part 1 → Part 2 when both Challenges are done.
  if (g().movie === 'matrix' && g().act === 1 && g().part === 1 && g().flags.truthDone && g().flags.rabbitDone) {
    await beginPart(1, 2);
  }
  // Reloaded 3.2 → 3.3 when only the Inevitable card is left in the Matrix.
  if (g().movie === 'reloaded' && g().act === 3 && g().part === 2 && P().rsi === 'matrix') {
    const left = [
      ...g().matrixDeck,
      ...g().matrixRow.filter((x): x is CardInstance => !!x),
      ...g().combatZone,
    ];
    if (left.length === 1 && isInev(left[0])) await beginPart(3, 3);
  }
  // Revolutions 2.1 → 2.2 once the Digger and the Mechanical Line are done.
  if (
    g().movie === 'revolutions' &&
    g().act === 2 &&
    g().part === 1 &&
    g().flags.diggerDefeated &&
    g().flags.flyLineDone
  ) {
    await beginPart(2, 2);
  }
  // Revolutions finale: while the Time Track equals the leftmost Smith's ⚔,
  // that Smith is deleted; all five gone = Major Victory.
  if (g().movie === 'revolutions' && g().act === 3 && g().part === 3 && !g().gameOver) {
    for (;;) {
      const i = g().matrixRow.findIndex(
        x => x && x.id === 'Act3EverythingThatHasABeginning_2',
      );
      if (i < 0) {
        await UI.showCard(
          CARD_IMAGE_URLS['RevolutionsAct3Part3B'] ?? ACT_CARDS.revolutions['3.3'].image,
          'It was inevitable',
        );
        gameOver(
          true,
          'MAJOR VICTORY — the war is over',
          '"You were right, Smith. It was inevitable." The Deletion Program destroys all the Smiths. The machines leave Zion, and this peace will last as long as it can.',
        );
        break;
      }
      const smith = g().matrixRow[i]!;
      if ((D(smith).defeat ?? 0) !== g().time) break;
      defeatEnemy(smith);
      log('The Deletion Program surges — the leftmost SMITH is deleted!', 'act');
    }
  }
  if (g().turnEnding) {
    g().turnEnding = false;
    g().phase = 'strike';
    UI.render();
    await cleanupPhase();
    return;
  }
  UI.render();
}
