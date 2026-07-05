// game.ts — the solo game engine: state, phases, board mechanics, act progression.
//
// The whole game state lives in the module-local `G` as plain JSON data (card
// instances are {uid, id, faceUp, ...}), so undo = restore a deep copy via
// snapshot()/restore(). All interaction goes through the injected UIPort
// (pick / chooseOption / confirmBox / showCard) — see setUI(). Card-specific
// behaviour lives in src/scripts.ts.

import { MX } from './version';
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
  CardDef,
  CardInstance,
  GameOptions,
  GameState,
  PlayerState,
  StrikeOpts,
  TurnFlags,
  UIPort,
} from './types';

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
    row: g().matrixRow, cz: g().combatZone, ops: g().operations, rw: g().realWorldEnemies,
    hand: P().hand, inPlay: P().inPlay, discard: P().discard,
  };
  for (const [name, arr] of Object.entries(zones)) {
    const i = arr.findIndex(c => c && c.uid === uid);
    if (i >= 0) return { zone: name, arr, i, card: arr[i] as CardInstance };
  }
  if (g().attached.building && g().attached.building!.uid === uid)
    return { zone: 'attached', arr: null, i: -1, card: g().attached.building! };
  return null;
}
export function removeCard(uid: number): CardInstance | null {
  const f = findZone(uid);
  if (!f) return null;
  if (f.zone === 'attached') { g().attached.building = null; return f.card; }
  if (f.zone === 'row') { g().matrixRow[f.i] = null; return f.card; }
  f.arr!.splice(f.i, 1);
  return f.card;
}

/* ═══════════ setup ═══════════ */
export function newGame(avatarId: string, options: GameOptions = {}) {
  uidCounter = 1;
  G = {
    options,
    act: 1, part: 1, time: MX.TIME_TRACK_START, turnNo: 1, phase: 'setup',
    matrixDeck: [], matrixRow: [null, null, null, null, null],
    combatZone: [], operations: [], attached: { building: null },
    realWorldEnemies: [],
    defeatedEnemies: [], discardedCES: [],
    strikeDeck: shuffle(buildStrikeDeck().map(mk)), strikeDiscard: [],
    zion: [], dock: [null, null, null, null, null],
    hovercraftStack: shuffle(cardsOfGroup('Hovercraft').map(c => mk(c.id))),
    defeatedHeroes: [],
    pending: [],
    flags: {
      deadPhones: {}, dejaVu: 0, trainingDefeated: 0,
      truthDone: false, rabbitDone: false,
      cypherRevealTurn: null, hesGoneUsed: false, noCoordUntilTurn: 0,
    },
    turn: freshTurnFlags(),
    player: {
      avatarId, rsi: 'real',
      health: AVATARS[avatarId].health + (options.dodgeBullets ? AVATARS[avatarId].speed : 0),
      strikes: [], deck: [], hand: [], discard: [], inPlay: [],
      R: 0, A: 0, fymOutOfPlay: false,
    },
    log: [], gameOver: null, turnEnding: false,
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

  // Zion: the four Matrix-film Hero Groups.
  const zion: string[] = [];
  for (const grp of ['Morpheus', 'Trinity', 'Tank', 'NebCrew']) zion.push(...buildHeroGroup(grp));
  g().zion = shuffle(zion.map(mk));
  for (let i = 0; i < 5; i++) refillDock(i);

  // Matrix Deck: Act1 on top, Act2, Act3, Inevitable at the very bottom.
  // (deck array: last element = top)
  const pots = () => (options.systemCards ? buildSystemCards(options.systemCards) : []);
  const a3 = shuffle([...buildActMini('Act3'), ...pots()]).map(mk);
  const a2 = shuffle([...buildActMini('Act2'), ...pots()]).map(mk);
  const a1 = shuffle([...buildActMini('Act1'), ...pots()]).map(mk);
  const inev = mk('Act3HeIsTheOne_7A');
  inev.faceUp = true;
  g().matrixDeck = [inev, ...a3, ...a2, ...a1];

  drawCards(MX.HAND_SIZE);
  log(`— ${avatar().name} enters the game. Act 1 Part 1: What Is the Matrix? —`, 'act');
  log(avatarId === 'AvatarThomasAnderson'
    ? 'The Matrix has you… You start IN the Matrix, Free Your Mind out of play.'
    : 'You start in the Real World.');
  g().phase = 'startup';
}

function freshTurnFlags(): TurnFlags {
  return {
    playedClasses: { I: 0, R: 0, S: 0, U: 0, T: 0 },
    freeMoveUsed: false, coordUsed: false, gainedHovercraft: false,
    enemiesDefeated: 0, kungfuCZBonus: 0,
    avoidMatrixEnemyStrikes: false, skipStrikePhase: false,
    noScan: false, drawPenalty: 0, noMoreStrikes: false,
  };
}

export function refillDock(i: number) {
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
  // "When you draw this, discard it" — resolve Bugs after the whole batch.
  for (const c of drawn.slice()) {
    if (D(c).name === 'Bug') {
      P().hand.splice(P().hand.indexOf(c), 1);
      P().discard.push(c);
      log('You drew a Bug — it clogs your deck and is discarded.');
    }
  }
  return drawn;
}
export function deckTop(): CardInstance | null { // reveal/discard the top card of your deck (with reshuffle)
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
  if (g().time <= 0) gameOver(false, 'Time has run out', 'The Machines win. The resistance is crushed.');
}
function gameOver(win: boolean, title: string, sub: string) {
  if (g().gameOver) return;
  g().gameOver = { win, title, sub };
  g().phase = 'gameover';
  log(`— ${title} —`, win ? 'act' : 'bad');
}

/* ═══════════ strikes / damage ═══════════ */
export function strikeDeckPop(): CardInstance | null {
  if (!g().strikeDeck.length) {
    if (!g().strikeDiscard.length) {
      gameOver(false, 'No Strikes left', 'The Strike deck and discard are empty — the players lose.');
      return null;
    }
    g().strikeDeck = shuffle(g().strikeDiscard.splice(0));
    log('The Strike deck is reshuffled.');
  }
  return g().strikeDeck.pop() ?? null;
}
function sourceInMatrix(src?: CardInstance): boolean {
  if (!src) return false;
  return g().matrixRow.some(c => c && c.uid === src.uid) || g().combatZone.some(c => c.uid === src.uid);
}
// Draw & resolve one Strike. Returns the strike card taken (or null if avoided/discarded).
export async function drawStrike(opts: StrikeOpts = {}): Promise<CardInstance | null> {
  if (g().gameOver) return null;
  if (g().turn.noMoreStrikes) { log('No more Strikes can be drawn this turn.'); return null; }
  if (!opts.unavoidable && g().turn.avoidMatrixEnemyStrikes && sourceInMatrix(opts.source)) {
    log('You Move Like They Do — the Strike is avoided!', 'good');
    return null;
  }
  const c = strikeDeckPop();
  if (!c) return null;
  c.faceUp = true;
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
  if (g().act === 3 && g().part === 3 && !g().flags.hesGoneUsed) {
    await hesGone();
    return;
  }
  gameOver(false, `${avatar().name} has fallen`,
    g().act < 3 ? 'Your body dies in the chair. The team loses.' : 'There is no one left to carry on.');
}
async function hesGone() {
  g().flags.hesGoneUsed = true;
  await UI.showCard(CARDS['Act3HeIsTheOneExtra_5'].image, "He's Gone");
  g().strikeDiscard.push(...P().strikes.splice(0));
  g().turn.noMoreStrikes = true;
  const up = mk('Act3HeIsTheOneExtra_1');
  P().deck.push(up);
  log("He's Gone… all your Strikes are healed. NOW GET UP. (If you are defeated again, the game is lost.)", 'act');
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
}
export function defeatPlayerCard(c: CardInstance, fromArr?: CardInstance[] | null) {
  const arr = fromArr || null;
  if (arr) { const i = arr.indexOf(c); if (i >= 0) arr.splice(i, 1); }
  else removeCard(c.uid);
  const t = D(c).type;
  if (t === 'event') g().discardedCES.push(c);
  else g().defeatedHeroes.push(c);
  log(`Defeated from your cards: ${D(c).name}.`);
}

/* ═══════════ gaining / recruiting ═══════════ */
export function gainCard(c: CardInstance, dest: 'discard' | 'hand' | 'deckTop' = 'discard') {
  if (dest === 'discard') P().discard.push(c);
  else if (dest === 'hand') P().hand.push(c);
  else if (dest === 'deckTop') P().deck.push(c);
  if (D(c).type === 'hovercraft') g().turn.gainedHovercraft = true;
}

/* ═══════════ the Matrix Row ═══════════ */
export function killPhone(idx: number) {
  if (MX.PHONE_SPACES.includes(idx) && !g().flags.deadPhones[idx]) {
    g().flags.deadPhones[idx] = true;
    log(`☎ The phone in the ${MX.ROW_NAMES[idx]} is destroyed for the rest of the game!`, 'bad');
  }
}
async function placeIntoRow(c: CardInstance, idx: number) {
  if (g().gameOver) return;
  if (idx < 0) { await enterCombatZone(c); return; }
  const cur = g().matrixRow[idx];
  g().matrixRow[idx] = c;
  if (isInev(c)) {
    if (c.id === 'Act3HeIsTheOne_7A') { c.id = 'Act3HeIsTheOne_7B'; log('The Inevitable card flips: It Is the Sound of Inevitability.', 'bad'); }
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
  log(`Revealed${where === 'cz' ? ' in the Combat Zone' : ''}: ${def.name}${def.defeat ? ` (${def.defeat}${def.defeatType === 'R' ? ' ®' : ' ⚔'})` : ''}.`);
  const s = SCRIPTS[c.id];
  if (s && s.reveal) {
    const consumed = await s.reveal(c, where);
    if (consumed) return true;
  }
  if (def.type === 'event') { removeCard(c.uid); g().discardedCES.push(c); return true; }
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
  UI.render();
  await matrixPhase();
  if (g().gameOver) { UI.render(); return; }
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
      log(c.faceUp ? `${D(c).name} enters the Matrix Row!` : 'A face-down card enters the Matrix Row.');
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
  if (g().gameOver) { UI.render(); return; }
  await cleanupPhase();
}

async function strikePhase() {
  if (g().turn.skipStrikePhase) { log('The Strike Phase is skipped (The One).', 'good'); return; }
  // Combat Zone enemies strike, right to left (oldest first).
  for (let i = g().combatZone.length - 1; i >= 0; i--) {
    const c = g().combatZone[i];
    if (g().gameOver) return;
    if (!c) continue;
    const def = D(c);
    if (isInev(c)) { log('The Sound of Inevitability…', 'bad'); subTime(1); continue; }
    if (def.type !== 'enemy') continue;
    const s = SCRIPTS[c.id];
    if (s && s.noStrike) { log(`${def.name} doesn't strike.`); continue; }
    const times = def.kw.includes('DoubleStrike') ? 2 : 1;
    for (let t = 0; t < times && !g().gameOver; t++) {
      if (s && s.strike) { await s.strike(c); continue; }
      if (inMatrix()) {
        log(`${def.name} strikes you!`, 'bad');
        await enemyStrikesPlayer(c);
      } else {
        log(`${def.name} strikes the Time Track!`, 'bad');
        subTime(1);
      }
    }
  }
}
export async function enemyStrikesPlayer(c: CardInstance) {
  const drawn = await drawStrike({ source: c });
  const s = SCRIPTS[c.id];
  if (drawn && s && s.afterStrike) await s.afterStrike(c, drawn);
}

async function cleanupPhase() {
  g().phase = 'cleanup';
  // Cypher's ultimatum: revealed on turn N → checked at the end of turn N+1.
  const cypher = g().realWorldEnemies.find(c => D(c).name === 'Cypher');
  if (cypher && g().turnNo >= (g().flags.cypherRevealTurn ?? 0) + 1) {
    gameOver(false, 'Cypher pulls the plug', 'You did not stop him in time. Everyone dies in their chair.');
    UI.render();
    return;
  }
  // Thomas Anderson: at the end of your turn, if in the Real World, back to the Matrix.
  if (P().avatarId === 'AvatarThomasAnderson' && P().rsi === 'real') {
    P().rsi = 'matrix';
    log('The Matrix has you — Thomas Anderson is pulled back into the Matrix.');
  }
  // Extra draws from "Your Men Are Already Dead" (each copy in play).
  let bonus = 0;
  if (g().turn.enemiesDefeated > 0)
    bonus = P().inPlay.filter(c => c.id === 'TrinityTheMatrix_2Common').length;
  P().discard.push(...P().hand.splice(0));
  P().discard.push(...P().inPlay.splice(0));
  P().R = 0; P().A = 0;
  g().pending = [];
  const n = Math.max(0, MX.HAND_SIZE + bonus - g().turn.drawPenalty);
  drawCards(n);
  if (bonus) log(`Your Men Are Already Dead: you draw ${bonus} extra card${bonus > 1 ? 's' : ''}.`, 'good');
  if (g().turn.drawPenalty) log(`Agent Brown's strike: you draw ${g().turn.drawPenalty} fewer card${g().turn.drawPenalty > 1 ? 's' : ''}.`, 'bad');
  g().turnNo++;
  await startTurn();
}

// "Begin Act X Part Y" — always ends your turn.
export async function beginPart(act: number, part: number) {
  const prevAct = g().act;
  g().act = act; g().part = part;
  const key = `${act}.${part}`;
  log(`— Begin Act ${act} Part ${part}: ${ACT_CARDS[key].name} —`, 'act');
  await UI.showCard(ACT_CARDS[key].image, `Act ${act} Part ${part} — ${ACT_CARDS[key].name}`);

  if (act >= 3 && prevAct < 3) {
    // Act 2's Agent Smith "leaves" when Act 3 begins.
    const smith = [...g().combatZone, ...g().matrixRow.filter(x => x !== null)]
      .find(c => c.id === 'Act2KnowThyselfExtra_2');
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
    log('Welcome to the Real World. Thomas Anderson flips to NEO — Free Your Mind goes on top of your deck.', 'act');
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
    log('An Agent has destroyed your exit. AGENT SMITH (12 ⚔) blocks your way — defeat him in the Subway or the Combat Zone, or run for a Minor Victory.', 'bad');
  }
  if (key === '3.3') {
    P().rsi = 'matrix';
    // Defeat everything in the Matrix deck, row and Combat Zone.
    for (const c of g().matrixDeck.splice(0)) g().defeatedEnemies.push(c);
    for (let i = 0; i < 5; i++) { if (g().matrixRow[i]) { g().defeatedEnemies.push(g().matrixRow[i]!); g().matrixRow[i] = null; } }
    g().defeatedEnemies.push(...g().combatZone.splice(0));
    // The three Agents, Evade face up, into the three rightmost spaces.
    await placeIntoRow(Object.assign(mk('Act3HeIsTheOneExtra_7'), { faceUp: true }), 2); // Brown, Evade 6
    await placeIntoRow(Object.assign(mk('Act3HeIsTheOneExtra_8'), { faceUp: true }), 3); // Jones, Evade 8
    await placeIntoRow(Object.assign(mk('Act3HeIsTheOneExtra_6'), { faceUp: true }), 4); // Smith, Evade 10
    await UI.showCard(CARDS['Act3HeIsTheOneExtra_10A'].image, 'Become The One');
    log(`BECOME THE ONE: pay ⚔ equal to the next number to raise the Time Track from ${g().time} to 10. Evade the Agents with ®. You cannot leave the Matrix, recruit, or fight the Agents.`, 'act');
  }
  g().turnEnding = true; // skip the rest of the Action + Strike Phases
}

/* ═══════════ player actions (called from the UI) ═══════════ */
function assertAction(): boolean {
  return g().phase === 'action' && !g().gameOver;
}

export async function actPlayCard(uid: number) {
  if (!assertAction()) return;
  const i = P().hand.findIndex(c => c.uid === uid);
  if (i < 0) return;
  const c = P().hand[i];
  const def = D(c);
  P().hand.splice(i, 1);
  P().inPlay.push(c);
  const combo = !!(def.cls && g().turn.playedClasses[def.cls] > 0);
  P().R += def.recruit;
  P().A += def.attack;
  log(`You play ${def.name}${def.recruit ? ` (+${def.recruit} ®)` : ''}${def.attack ? ` (+${def.attack} ⚔)` : ''}.`);
  const s = SCRIPTS[c.id];
  if (c.id === 'StarterFreeYourMind') await resolveActAbility();
  if (s && s.onPlay) await s.onPlay(c);
  if (combo && s && s.onCombo) {
    log(`${MX.CLASSES[def.cls!]} class ability triggers!`, 'good');
    await s.onCombo(c);
  }
  if (def.cls) g().turn.playedClasses[def.cls]++;
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
  if (g().turn.coordUsed) { log('You already used your Coordinate discard this turn.'); return; }
  if (g().turnNo < g().flags.noCoordUntilTurn) { log("You can't Coordinate this turn (What good is a phone call…)."); return; }
  const i = P().hand.findIndex(c => c.uid === uid);
  if (i < 0 || !D(P().hand[i]).kw.includes('Coordinate')) return;
  const c = P().hand.splice(i, 1)[0];
  P().discard.push(c);
  g().turn.coordUsed = true;
  drawCards(1);
  log(`Solo Coordinate: you discard ${D(c).name} and draw a card.`);
  UI.render();
}

export async function actRecruitDock(i: number) {
  if (!assertAction()) return;
  const c = g().dock[i];
  if (!c) return;
  const def = D(c);
  if (P().rsi !== 'real') { log('You can only recruit while in the Real World.'); return; }
  if (P().R < (def.cost ?? 0)) { log(`Not enough ® (need ${def.cost}).`); return; }
  P().R -= def.cost ?? 0;
  g().dock[i] = null;
  gainCard(c);
  refillDock(i);
  log(`You recruit ${def.name} (cost ${def.cost} ®).`, 'good');
  await afterActionChecks();
}
export async function actRecruitHovercraft() {
  if (!assertAction()) return;
  if (P().rsi !== 'real') { log('You can only recruit while in the Real World.'); return; }
  if (!g().hovercraftStack.length) { log('No Hovercrafts left.'); return; }
  if (P().R < 3) { log('Not enough ® (need 3).'); return; }
  P().R -= 3;
  const c = g().hovercraftStack.pop()!;
  c.faceUp = true;
  gainCard(c);
  log(`You recruit ${D(c).name}! (Hovercraft)`, 'good');
  await afterActionChecks();
}

export async function actScan(idx: number) {
  if (!assertAction()) return;
  const c = g().matrixRow[idx];
  if (!c || c.faceUp) return;
  if (!inMatrix()) { log('You must be in the Matrix to scan.'); return; }
  if (g().turn.noScan) { log("You can't scan for the rest of this turn."); return; }
  const cost = MX.SCAN_COST[idx];
  if (P().A < cost) { log(`Not enough ⚔ to scan (need ${cost}).`); return; }
  P().A -= cost;
  log(`You scan the ${MX.ROW_NAMES[idx]} (−${cost} ⚔).`);
  await revealCard(c, 'row');
  await afterActionChecks();
}
// Free scan from a card effect ("scan any space") — no cost, works from anywhere.
export async function freeScan(idx: number) {
  const c = g().matrixRow[idx];
  if (!c || c.faceUp) return;
  log(`You scan the ${MX.ROW_NAMES[idx]} (free).`);
  await revealCard(c, 'row');
}

export function fightBlockReason(c: CardInstance): string | null {
  const def = D(c);
  const inRow = g().matrixRow.findIndex(x => x && x.uid === c.uid);
  const inRW = g().realWorldEnemies.some(x => x.uid === c.uid);
  if (def.type !== 'enemy' || !c.faceUp) return 'not-an-enemy';
  if (g().act === 3 && g().part === 3) return "You can't fight the Agents — become The One!";
  if (inRW) {
    if (P().rsi !== 'real') return 'You must be in the Real World to fight this Enemy.';
  } else if (!inMatrix()) return 'You must be in the Matrix to fight.';
  if (def.kw.includes('Unfightable') || def.defeat == null) return `${def.name} can't be fought.`;
  if (c.id === 'Act3HeIsTheOneExtra_9' && inRow >= 0 && inRow !== 0)
    return 'Agent Smith is Undefeatable unless you fight him in the Subway or the Combat Zone.';
  if (def.kw.includes('Cover') && inRow >= 0) {
    const l = g().matrixRow[inRow - 1], r = g().matrixRow[inRow + 1];
    if ((l && !l.faceUp) || (r && !r.faceUp)) return `${def.name} has Cover — a face-down card protects it.`;
  }
  if (c.noFightTurn === g().turnNo) return `${def.name} can't be fought this turn.`;
  const cost = effectiveFightCost(c);
  if (P().A < cost) return `Not enough ⚔ (need ${cost}).`;
  return null;
}
export function effectiveFightCost(c: CardInstance): number {
  let cost = D(c).defeat ?? 0;
  if (g().combatZone.some(x => x.uid === c.uid)) cost = Math.max(0, cost - g().turn.kungfuCZBonus);
  return cost;
}
export async function actFight(uid: number) {
  if (!assertAction()) return;
  const f = findZone(uid);
  if (!f) return;
  const c = f.card;
  const reason = fightBlockReason(c);
  if (reason) { log(reason); return; }
  const inCZ = g().combatZone.some(x => x.uid === c.uid);
  const cost = effectiveFightCost(c);
  P().A -= cost;
  if (inCZ && g().turn.kungfuCZBonus) {
    log(`I Know Kung Fu: −${g().turn.kungfuCZBonus} ⚔ on this fight.`, 'good');
    g().turn.kungfuCZBonus = 0;
  }
  log(`You fight ${D(c).name} (−${cost} ⚔).`);
  const s = SCRIPTS[c.id];
  if (s && s.fight) { await s.fight(c); }
  else {
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
  if (!inMatrix()) { log('You must be in the Matrix to complete Challenges.'); return; }
  const s = SCRIPTS[c.id];
  if (s && s.canComplete) {
    const why = s.canComplete(c);
    if (why) { log(why); return; }
  }
  if (def.defeatType === 'R') {
    if (P().R < (def.defeat ?? 0)) { log(`Not enough ® (need ${def.defeat}).`); return; }
    P().R -= def.defeat ?? 0;
  } else if (def.defeat) {
    if (P().A < def.defeat) { log(`Not enough ⚔ (need ${def.defeat}).`); return; }
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
  if (g().turn.freeMoveUsed) { log('You already used your free move this turn.'); return; }
  if (P().rsi === 'real') {
    P().rsi = 'matrix';
    g().turn.freeMoveUsed = true;
    log('You jack in — you are now IN THE MATRIX.', 'good');
  } else {
    const why = leaveMatrixBlockReason();
    if (why) { log(why); return; }
    const free = phoneAvailable();
    if (free != null) {
      P().rsi = 'real';
      g().turn.freeMoveUsed = true;
      log(`You exit through the ${MX.ROW_NAMES[free]} phone — back in the Real World.`, 'good');
    } else if (g().combatZone.length < MX.COMBAT_PHONE_BLOCKED_AT && P().R >= MX.COMBAT_PHONE_COST) {
      const ok = await UI.confirmBox('Pay phone', `Exit through the Combat Zone phone for ${MX.COMBAT_PHONE_COST} ®?`);
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
export function leaveMatrixBlockReason(): string | null {
  if (g().act === 3 && g().part === 3) return "You can't leave the Matrix. You must become The One.";
  if (g().combatZone.some(c => c.id === 'Act2KnowThyselfExtra_2'))
    return "Agent Smith is in the Combat Zone — players can't leave the Matrix!";
  return null;
}
// Card-effect move to the Real World (no phone needed).
export function effectMoveToRealWorld() {
  if (P().rsi === 'real') return;
  const why = leaveMatrixBlockReason();
  if (why) { log(why); return; }
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
  if (P().R < def.evade) { log(`Not enough ® to Evade (need ${def.evade}).`); return; }
  let target = -1;
  for (let i = 4; i >= 0; i--) if (!g().matrixRow[i]) { target = i; break; }
  if (target < 0) { log('No clear space in the Matrix Row to evade to.'); return; }
  P().R -= def.evade;
  removeCard(c.uid);
  g().matrixRow[target] = c;
  log(`You Evade ${def.name} (−${def.evade} ®) — he is thrown back to the ${MX.ROW_NAMES[target]}.`, 'good');
  await afterActionChecks();
}

export async function actRaiseTime() {
  if (!assertAction() || !(g().act === 3 && g().part === 3)) return;
  const cost = g().time + 1;
  if (g().time >= 10) return;
  if (P().A < cost) { log(`Not enough ⚔ (need ${cost} to raise the Time Track to ${cost}).`); return; }
  P().A -= cost;
  g().time += 1;
  log(`⚡ You pay ${cost} ⚔ — the Time Track rises to ${g().time}!`, 'act');
  if (g().time >= 10) {
    await UI.showCard(CARDS['Act3HeIsTheOneExtra_10B'].image, 'Become The One');
    gameOver(true, 'MAJOR VICTORY — You are The One',
      'You effortlessly destroy Agent Smith. The other Agents flee. "Where we go from there is a choice I leave to you."');
  }
  await afterActionChecks();
}

export async function actJump() {
  if (!assertAction()) return;
  const c = g().attached.building;
  if (!c) return;
  if (!inMatrix()) { log('You must be in the Matrix to jump.'); return; }
  if (g().matrixRow[3]) { log('The Building space must be clear to jump.'); return; }
  const top = deckTop();
  if (!top) { log('Your deck and discard are empty — no card to discard for the jump.'); return; }
  const def = D(top);
  P().discard.push(top);
  if ((def.cost || 0) >= 5) {
    log(`Jump! You discard ${def.name} (cost ${def.cost}) — YOU MADE IT!`, 'good');
  } else {
    log(`Jump… you discard ${def.name} (cost ${def.cost || 0}) — everybody falls the first time.`, 'bad');
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
  if (!inMatrix()) { log('You must be in the Matrix to talk to the Oracle.'); return; }
  if (g().act !== 2) { log('Only during Act 2.'); return; }
  if (g().flags.trainingDefeated < 7) { log(`You need 7 Training cards defeated (${g().flags.trainingDefeated}/7).`); return; }
  removeCard(c.uid);
  g().discardedCES.push(c);
  log('You talk to The Oracle… "You\'re waiting for something. Your next life, maybe."', 'act');
  await beginPart(2, 2);
  await afterActionChecks();
}

export async function actFreeNeo() {
  if (!assertAction()) return;
  if (!(g().act === 1 && g().part === 2)) return;
  if (P().rsi !== 'real') { log('You must be in the Real World to free Neo.'); return; }
  const has = P().inPlay.some(c => D(c).type === 'hovercraft') || g().turn.gainedHovercraft;
  if (!has) { log('You need to gain a Hovercraft or have one in your play area.'); return; }
  const neo = buildHeroGroup('Neo').map(mk);
  const dockCards: CardInstance[] = [];
  for (let i = 0; i < 5; i++) { const dc = g().dock[i]; if (dc) { dockCards.push(dc); g().dock[i] = null; } }
  g().zion.push(...neo, ...dockCards);
  shuffle(g().zion);
  for (let i = 0; i < 5; i++) refillDock(i);
  log('NEO IS FREED FROM THE MATRIX! The 14 Neo Heroes are shuffled into Zion.', 'act');
  await beginPart(2, 1);
  await afterActionChecks();
}

export async function actMinorVictory() {
  if (!assertAction() || !(g().act === 3 && g().part === 2)) return;
  const ok = await UI.confirmBox('Run for it?',
    'An Agent has destroyed your exit. Do you run, and end the game with a MINOR VICTORY? Or are you beginning to believe?', 'Run (Minor Victory)', 'Keep fighting');
  if (!ok) return;
  gameOver(true, 'MINOR VICTORY', 'You escape the Matrix. Neo lives to fight another day… but he is not yet The One.');
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
  if (!fn) { g().pending.splice(idx, 1); return; }
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
  if (g().gameOver) { UI.render(); return; }
  // Act 1 Part 1 → Part 2 when both Challenges are done.
  if (g().act === 1 && g().part === 1 && g().flags.truthDone && g().flags.rabbitDone) {
    await beginPart(1, 2);
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
