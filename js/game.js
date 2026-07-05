// game.js — the solo game engine: state, phases, board mechanics, act progression.
//
// The whole game state lives in the global `G` as plain JSON data (card
// instances are {uid, id, faceUp, ...}), so undo = restore a deep copy.
// All interaction goes through UI.* promise helpers (pick / chooseOption /
// confirmBox / showCard). Card-specific behaviour lives in js/scripts.js.

let G = null;
let uidCounter = 1;

/* ═══════════ small helpers ═══════════ */
const D = inst => CARDS[inst.id];                     // def of an instance
function mk(id) { return { uid: uidCounter++, id, faceUp: false }; }
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function log(msg, cls = '') { G.log.push({ msg, cls, turn: G.turnNo }); }
function P() { return G.player; }
function avatar() { return AVATARS[P().avatarId]; }
function totalDamage() { return P().strikes.reduce((s, c) => s + (D(c).damage || 0), 0); }
function inMatrix() { return P().rsi === 'matrix'; }
function isInev(c) { return c && D(c).kw.includes('Inevitable'); }
function rowFaceDown() { return G.matrixRow.filter(c => c && !c.faceUp); }
function findZone(uid) {
  const zones = {
    row: G.matrixRow, cz: G.combatZone, ops: G.operations, rw: G.realWorldEnemies,
    hand: P().hand, inPlay: P().inPlay, discard: P().discard,
  };
  for (const [name, arr] of Object.entries(zones)) {
    const i = arr.findIndex(c => c && c.uid === uid);
    if (i >= 0) return { zone: name, arr, i, card: arr[i] };
  }
  if (G.attached.building && G.attached.building.uid === uid)
    return { zone: 'attached', arr: null, i: -1, card: G.attached.building };
  return null;
}
function removeCard(uid) {
  const f = findZone(uid);
  if (!f) return null;
  if (f.zone === 'attached') { G.attached.building = null; return f.card; }
  if (f.zone === 'row') { G.matrixRow[f.i] = null; return f.card; }
  f.arr.splice(f.i, 1);
  return f.card;
}

/* ═══════════ setup ═══════════ */
function newGame(avatarId, options = {}) {
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
  const zion = [];
  for (const g of ['Morpheus', 'Trinity', 'Tank', 'NebCrew']) zion.push(...buildHeroGroup(g));
  G.zion = shuffle(zion.map(mk));
  for (let i = 0; i < 5; i++) refillDock(i);

  // Matrix Deck: Act1 on top, Act2, Act3, Inevitable at the very bottom.
  // (deck array: last element = top)
  const pots = n => (options.systemCards ? buildSystemCards(options.systemCards) : []);
  const a3 = shuffle([...buildActMini('Act3'), ...pots()]).map(mk);
  const a2 = shuffle([...buildActMini('Act2'), ...pots()]).map(mk);
  const a1 = shuffle([...buildActMini('Act1'), ...pots()]).map(mk);
  const inev = mk('Act3HeIsTheOne_7A');
  inev.faceUp = true;
  G.matrixDeck = [inev, ...a3, ...a2, ...a1];

  drawCards(MX.HAND_SIZE);
  log(`— ${avatar().name} enters the game. Act 1 Part 1: What Is the Matrix? —`, 'act');
  log(avatarId === 'AvatarThomasAnderson'
    ? 'The Matrix has you… You start IN the Matrix, Free Your Mind out of play.'
    : 'You start in the Real World.');
  G.phase = 'startup';
}

function freshTurnFlags() {
  return {
    playedClasses: { I: 0, R: 0, S: 0, U: 0, T: 0 },
    freeMoveUsed: false, coordUsed: false, gainedHovercraft: false,
    enemiesDefeated: 0, kungfuCZBonus: 0,
    avoidMatrixEnemyStrikes: false, skipStrikePhase: false,
    noScan: false, drawPenalty: 0, noMoreStrikes: false,
  };
}

function refillDock(i) {
  if (!G.dock[i] && G.zion.length) G.dock[i] = G.zion.pop();
}

/* ═══════════ drawing / decks ═══════════ */
function drawCards(n) {
  const drawn = [];
  for (let k = 0; k < n; k++) {
    if (!P().deck.length) {
      if (!P().discard.length) break;
      P().deck = shuffle(P().discard.splice(0));
      log('You shuffle your discard pile into a new deck.');
    }
    const c = P().deck.pop();
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
function deckTop() {  // reveal/discard the top card of your deck (with reshuffle)
  if (!P().deck.length) {
    if (!P().discard.length) return null;
    P().deck = shuffle(P().discard.splice(0));
    log('You shuffle your discard pile into a new deck.');
  }
  return P().deck.pop();
}

/* ═══════════ time track / game over ═══════════ */
function subTime(n) {
  G.time -= n;
  log(`⏱ Time Track −${n} → ${Math.max(0, G.time)}`, 'bad');
  if (G.time <= 0) gameOver(false, 'Time has run out', 'The Machines win. The resistance is crushed.');
}
function gameOver(win, title, sub) {
  if (G.gameOver) return;
  G.gameOver = { win, title, sub };
  G.phase = 'gameover';
  log(`— ${title} —`, win ? 'act' : 'bad');
}

/* ═══════════ strikes / damage ═══════════ */
function strikeDeckPop() {
  if (!G.strikeDeck.length) {
    if (!G.strikeDiscard.length) {
      gameOver(false, 'No Strikes left', 'The Strike deck and discard are empty — the players lose.');
      return null;
    }
    G.strikeDeck = shuffle(G.strikeDiscard.splice(0));
    log('The Strike deck is reshuffled.');
  }
  return G.strikeDeck.pop();
}
function sourceInMatrix(src) {
  if (!src) return false;
  return G.matrixRow.some(c => c && c.uid === src.uid) || G.combatZone.some(c => c.uid === src.uid);
}
// Draw & resolve one Strike. Returns the strike card taken (or null if avoided/discarded).
async function drawStrike(opts = {}) {
  if (G.gameOver) return null;
  if (G.turn.noMoreStrikes) { log('No more Strikes can be drawn this turn.'); return null; }
  if (!opts.unavoidable && G.turn.avoidMatrixEnemyStrikes && sourceInMatrix(opts.source)) {
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
  if (G.gameOver) return;
  if (totalDamage() < P().health) return;
  if (G.act === 3 && G.part === 3 && !G.flags.hesGoneUsed) {
    await hesGone();
    return;
  }
  gameOver(false, `${avatar().name} has fallen`,
    G.act < 3 ? 'Your body dies in the chair. The team loses.' : 'There is no one left to carry on.');
}
async function hesGone() {
  G.flags.hesGoneUsed = true;
  await UI.showCard(CARDS['Act3HeIsTheOneExtra_5'].image, "He's Gone");
  G.strikeDiscard.push(...P().strikes.splice(0));
  G.turn.noMoreStrikes = true;
  const up = mk('Act3HeIsTheOneExtra_1');
  P().deck.push(up);
  log("He's Gone… all your Strikes are healed. NOW GET UP. (If you are defeated again, the game is lost.)", 'act');
}
function healStrike(c) {
  const i = P().strikes.indexOf(c);
  if (i < 0) return;
  P().strikes.splice(i, 1);
  G.strikeDiscard.push(c);
  log(`Healed: ${D(c).name}.`, 'good');
}

/* ═══════════ defeating cards ═══════════ */
function defeatEnemy(c) {
  removeCard(c.uid);
  G.defeatedEnemies.push(c);
  G.turn.enemiesDefeated++;
  if (D(c).descriptor === 'Training') {
    G.flags.trainingDefeated++;
    log(`Training complete (${G.flags.trainingDefeated}/7): ${D(c).name}.`, 'good');
  }
}
function defeatPlayerCard(c, fromArr) {
  const arr = fromArr || null;
  if (arr) { const i = arr.indexOf(c); if (i >= 0) arr.splice(i, 1); }
  else removeCard(c.uid);
  const t = D(c).type;
  if (t === 'event') G.discardedCES.push(c);
  else G.defeatedHeroes.push(c);
  log(`Defeated from your cards: ${D(c).name}.`);
}

/* ═══════════ gaining / recruiting ═══════════ */
function gainCard(c, dest = 'discard') {
  if (dest === 'discard') P().discard.push(c);
  else if (dest === 'hand') P().hand.push(c);
  else if (dest === 'deckTop') P().deck.push(c);
  if (D(c).type === 'hovercraft') G.turn.gainedHovercraft = true;
}

/* ═══════════ the Matrix Row ═══════════ */
function killPhone(idx) {
  if (MX.PHONE_SPACES.includes(idx) && !G.flags.deadPhones[idx]) {
    G.flags.deadPhones[idx] = true;
    log(`☎ The phone in the ${MX.ROW_NAMES[idx]} is destroyed for the rest of the game!`, 'bad');
  }
}
async function placeIntoRow(c, idx, opts = {}) {
  if (G.gameOver) return;
  if (idx < 0) { await enterCombatZone(c); return; }
  const cur = G.matrixRow[idx];
  G.matrixRow[idx] = c;
  if (isInev(c)) {
    if (c.id === 'Act3HeIsTheOne_7A') { c.id = 'Act3HeIsTheOne_7B'; log('The Inevitable card flips: It Is the Sound of Inevitability.', 'bad'); }
    killPhone(idx);
  }
  if (cur) await placeIntoRow(cur, idx - 1);
}
async function enterCombatZone(c) {
  if (!c.faceUp) {
    const consumed = await revealCard(c, 'cz');
    if (consumed) return;
  }
  G.combatZone.unshift(c);   // leftmost = newest; rightmost = oldest
  log(`${D(c).name} enters the Combat Zone!`, 'bad');
}
// Reveal a face-down card. Returns true if the card left the row/CZ flow
// (events → discard pile, challenges → operations, Cypher → Real World…).
async function revealCard(c, where) {
  c.faceUp = true;
  const def = D(c);
  log(`Revealed${where === 'cz' ? ' in the Combat Zone' : ''}: ${def.name}${def.defeat ? ` (${def.defeat}${def.defeatType === 'R' ? ' ®' : ' ⚔'})` : ''}.`);
  const s = SCRIPTS[c.id];
  if (s && s.reveal) {
    const consumed = await s.reveal(c, where);
    if (consumed) return true;
  }
  if (def.type === 'event') { removeCard(c.uid); G.discardedCES.push(c); return true; }
  return false;
}

/* ═══════════ phases ═══════════ */
async function startTurn() {
  if (G.gameOver) return;
  G.turn = freshTurnFlags();
  G.pending = [];
  G.turnEnding = false;
  G.phase = 'matrix';
  log(`— Turn ${G.turnNo} —`, 'turn');
  UI.render();
  await matrixPhase();
  if (G.gameOver) { UI.render(); return; }
  G.phase = 'action';
  UI.render();
}

async function matrixPhase() {
  if (G.options.prepTurn && G.turnNo === 1) {
    log('Prep turn — the Matrix Phase is skipped.');
  } else {
    const inevInPlay = [...G.matrixRow, ...G.combatZone].find(isInev);
    if (inevInPlay) {
      await moveInevitable(inevInPlay);
    } else if (G.matrixDeck.length) {
      const c = G.matrixDeck.pop();
      log(c.faceUp ? `${D(c).name} enters the Matrix Row!` : 'A face-down card enters the Matrix Row.');
      await placeIntoRow(c, 4);
    } else {
      log('The Matrix Deck is empty.');
    }
  }
  // Chase: cards in the row with Chase move one more space, left to right.
  for (let i = 0; i <= 4; i++) {
    const c = G.matrixRow[i];
    if (c && D(c).kw.includes('Chase') && (c.faceUp || isInev(c))) {
      G.matrixRow[i] = null;
      log(`${D(c).name} chases you — it moves another space!`, 'bad');
      await placeIntoRow(c, i - 1);
    }
  }
}
async function moveInevitable(c) {
  const i = G.matrixRow.findIndex(x => x && x.uid === c.uid);
  if (i >= 0) {
    G.matrixRow[i] = null;
    log('The Inevitable card slides one space forward.', 'bad');
    await placeIntoRow(c, i - 1);
  } // already in the Combat Zone: nothing more to move.
}

async function endActionPhase() {
  if (G.phase !== 'action' || G.gameOver) return;
  // End-of-Action-Phase hooks (training cards flip back down).
  for (const c of G.matrixRow) {
    if (c && c.faceUp && SCRIPTS[c.id] && SCRIPTS[c.id].endAction) SCRIPTS[c.id].endAction(c);
  }
  G.phase = 'strike';
  UI.render();
  await strikePhase();
  if (G.gameOver) { UI.render(); return; }
  await cleanupPhase();
}

async function strikePhase() {
  if (G.turn.skipStrikePhase) { log('The Strike Phase is skipped (The One).', 'good'); return; }
  // Combat Zone enemies strike, right to left (oldest first).
  for (let i = G.combatZone.length - 1; i >= 0; i--) {
    const c = G.combatZone[i];
    if (G.gameOver) return;
    if (!c) continue;
    const def = D(c);
    if (isInev(c)) { log('The Sound of Inevitability…', 'bad'); subTime(1); continue; }
    if (def.type !== 'enemy') continue;
    const s = SCRIPTS[c.id];
    if (s && s.noStrike) { log(`${def.name} doesn't strike.`); continue; }
    const times = def.kw.includes('DoubleStrike') ? 2 : 1;
    for (let t = 0; t < times && !G.gameOver; t++) {
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
async function enemyStrikesPlayer(c) {
  const drawn = await drawStrike({ source: c });
  const s = SCRIPTS[c.id];
  if (drawn && s && s.afterStrike) await s.afterStrike(c, drawn);
}

async function cleanupPhase() {
  G.phase = 'cleanup';
  // Cypher's ultimatum: revealed on turn N → checked at the end of turn N+1.
  const cypher = G.realWorldEnemies.find(c => D(c).name === 'Cypher');
  if (cypher && G.turnNo >= G.flags.cypherRevealTurn + 1) {
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
  if (G.turn.enemiesDefeated > 0)
    bonus = P().inPlay.filter(c => c.id === 'TrinityTheMatrix_2Common').length;
  P().discard.push(...P().hand.splice(0));
  P().discard.push(...P().inPlay.splice(0));
  P().R = 0; P().A = 0;
  G.pending = [];
  const n = Math.max(0, MX.HAND_SIZE + bonus - G.turn.drawPenalty);
  drawCards(n);
  if (bonus) log(`Your Men Are Already Dead: you draw ${bonus} extra card${bonus > 1 ? 's' : ''}.`, 'good');
  if (G.turn.drawPenalty) log(`Agent Brown's strike: you draw ${G.turn.drawPenalty} fewer card${G.turn.drawPenalty > 1 ? 's' : ''}.`, 'bad');
  G.turnNo++;
  await startTurn();
}

// "Begin Act X Part Y" — always ends your turn.
async function beginPart(act, part) {
  const prevAct = G.act;
  G.act = act; G.part = part;
  const key = `${act}.${part}`;
  log(`— Begin Act ${act} Part ${part}: ${ACT_CARDS[key].name} —`, 'act');
  await UI.showCard(ACT_CARDS[key].image, `Act ${act} Part ${part} — ${ACT_CARDS[key].name}`);

  if (act >= 3 && prevAct < 3) {
    // Act 2's Agent Smith "leaves" when Act 3 begins.
    const smith = [...G.combatZone, ...G.matrixRow.filter(Boolean)].find(c => c.id === 'Act2KnowThyselfExtra_2');
    if (smith) {
      removeCard(smith.uid);
      G.defeatedEnemies.push(smith);
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
    G.operations.push(Object.assign(mk('Act3HeIsTheOneExtra_2'), { faceUp: true }));
    for (let i = 0; i < 2; i++) {
      const g = Object.assign(mk('Act3HeIsTheOneExtra_4'), { faceUp: true });
      G.combatZone.unshift(g);
    }
    log("Rescue the Captive is in Operations. Two Captive's Guards block the Combat Zone!", 'bad');
  }
  if (key === '3.2') {
    const smith = Object.assign(mk('Act3HeIsTheOneExtra_9'), { faceUp: true });
    const inevIdx = G.matrixRow.findIndex(isInev);
    const inevCZ = G.combatZone.find(isInev);
    if (inevCZ) await enterCombatZone(smith);
    else if (inevIdx >= 0) await placeIntoRow(smith, Math.max(0, inevIdx - 1));
    else await placeIntoRow(smith, 4);
    log('An Agent has destroyed your exit. AGENT SMITH (12 ⚔) blocks your way — defeat him in the Subway or the Combat Zone, or run for a Minor Victory.', 'bad');
  }
  if (key === '3.3') {
    P().rsi = 'matrix';
    // Defeat everything in the Matrix deck, row and Combat Zone.
    for (const c of G.matrixDeck.splice(0)) G.defeatedEnemies.push(c);
    for (let i = 0; i < 5; i++) { if (G.matrixRow[i]) { G.defeatedEnemies.push(G.matrixRow[i]); G.matrixRow[i] = null; } }
    G.defeatedEnemies.push(...G.combatZone.splice(0));
    // The three Agents, Evade face up, into the three rightmost spaces.
    await placeIntoRow(Object.assign(mk('Act3HeIsTheOneExtra_7'), { faceUp: true }), 2); // Brown, Evade 6
    await placeIntoRow(Object.assign(mk('Act3HeIsTheOneExtra_8'), { faceUp: true }), 3); // Jones, Evade 8
    await placeIntoRow(Object.assign(mk('Act3HeIsTheOneExtra_6'), { faceUp: true }), 4); // Smith, Evade 10
    await UI.showCard(CARDS['Act3HeIsTheOneExtra_10A'].image, 'Become The One');
    log(`BECOME THE ONE: pay ⚔ equal to the next number to raise the Time Track from ${G.time} to 10. Evade the Agents with ®. You cannot leave the Matrix, recruit, or fight the Agents.`, 'act');
  }
  G.turnEnding = true;   // skip the rest of the Action + Strike Phases
}

/* ═══════════ player actions (called from the UI) ═══════════ */
function assertAction() { return G.phase === 'action' && !G.gameOver; }

async function actPlayCard(uid) {
  if (!assertAction()) return;
  const i = P().hand.findIndex(c => c.uid === uid);
  if (i < 0) return;
  const c = P().hand[i];
  const def = D(c);
  P().hand.splice(i, 1);
  P().inPlay.push(c);
  const combo = !!(def.cls && G.turn.playedClasses[def.cls] > 0);
  P().R += def.recruit;
  P().A += def.attack;
  log(`You play ${def.name}${def.recruit ? ` (+${def.recruit} ®)` : ''}${def.attack ? ` (+${def.attack} ⚔)` : ''}.`);
  const s = SCRIPTS[c.id];
  if (c.id === 'StarterFreeYourMind') await resolveActAbility();
  if (s && s.onPlay) await s.onPlay(c);
  if (combo && s && s.onCombo) {
    log(`${MX.CLASSES[def.cls]} class ability triggers!`, 'good');
    await s.onCombo(c);
  }
  if (def.cls) G.turn.playedClasses[def.cls]++;
  await afterActionChecks();
}

async function resolveActAbility() {
  const blinded = P().strikes.filter(c => c.id === 'StrikeBlinded');
  if (blinded.length) {
    for (const b of blinded) healStrike(b);
    log('You were Blinded — instead of your Act ability you discard all Blinded Strikes.', 'bad');
    return;
  }
  const s = AVATAR_SCRIPTS[P().avatarId];
  const fn = s && s[G.act];
  if (fn) await fn();
  else log(`${avatar().name} has no Act ${G.act} ability.`);
}

async function actCoordinate(uid) {
  if (!assertAction()) return;
  if (G.turn.coordUsed) { log('You already used your Coordinate discard this turn.'); return; }
  if (G.turnNo < G.flags.noCoordUntilTurn) { log("You can't Coordinate this turn (What good is a phone call…)."); return; }
  const i = P().hand.findIndex(c => c.uid === uid);
  if (i < 0 || !D(P().hand[i]).kw.includes('Coordinate')) return;
  const c = P().hand.splice(i, 1)[0];
  P().discard.push(c);
  G.turn.coordUsed = true;
  drawCards(1);
  log(`Solo Coordinate: you discard ${D(c).name} and draw a card.`);
  UI.render();
}

async function actRecruitDock(i) {
  if (!assertAction()) return;
  const c = G.dock[i];
  if (!c) return;
  const def = D(c);
  if (P().rsi !== 'real') { log('You can only recruit while in the Real World.'); return; }
  if (P().R < def.cost) { log(`Not enough ® (need ${def.cost}).`); return; }
  P().R -= def.cost;
  G.dock[i] = null;
  gainCard(c);
  refillDock(i);
  log(`You recruit ${def.name} (cost ${def.cost} ®).`, 'good');
  await afterActionChecks();
}
async function actRecruitHovercraft() {
  if (!assertAction()) return;
  if (P().rsi !== 'real') { log('You can only recruit while in the Real World.'); return; }
  if (!G.hovercraftStack.length) { log('No Hovercrafts left.'); return; }
  if (P().R < 3) { log('Not enough ® (need 3).'); return; }
  P().R -= 3;
  const c = G.hovercraftStack.pop();
  c.faceUp = true;
  gainCard(c);
  log(`You recruit ${D(c).name}! (Hovercraft)`, 'good');
  await afterActionChecks();
}

async function actScan(idx) {
  if (!assertAction()) return;
  const c = G.matrixRow[idx];
  if (!c || c.faceUp) return;
  if (!inMatrix()) { log('You must be in the Matrix to scan.'); return; }
  if (G.turn.noScan) { log("You can't scan for the rest of this turn."); return; }
  const cost = MX.SCAN_COST[idx];
  if (P().A < cost) { log(`Not enough ⚔ to scan (need ${cost}).`); return; }
  P().A -= cost;
  log(`You scan the ${MX.ROW_NAMES[idx]} (−${cost} ⚔).`);
  await revealCard(c, 'row');
  await afterActionChecks();
}
// Free scan from a card effect ("scan any space") — no cost, works from anywhere.
async function freeScan(idx) {
  const c = G.matrixRow[idx];
  if (!c || c.faceUp) return;
  log(`You scan the ${MX.ROW_NAMES[idx]} (free).`);
  await revealCard(c, 'row');
}

function fightBlockReason(c) {
  const def = D(c);
  const inRow = G.matrixRow.findIndex(x => x && x.uid === c.uid);
  const inCZ = G.combatZone.some(x => x.uid === c.uid);
  const inRW = G.realWorldEnemies.some(x => x.uid === c.uid);
  if (def.type !== 'enemy' || !c.faceUp) return 'not-an-enemy';
  if (G.act === 3 && G.part === 3) return "You can't fight the Agents — become The One!";
  if (inRW) {
    if (P().rsi !== 'real') return 'You must be in the Real World to fight this Enemy.';
  } else if (!inMatrix()) return 'You must be in the Matrix to fight.';
  if (def.kw.includes('Unfightable') || def.defeat == null) return `${def.name} can't be fought.`;
  if (c.id === 'Act3HeIsTheOneExtra_9' && inRow >= 0 && inRow !== 0)
    return 'Agent Smith is Undefeatable unless you fight him in the Subway or the Combat Zone.';
  if (def.kw.includes('Cover') && inRow >= 0) {
    const l = G.matrixRow[inRow - 1], r = G.matrixRow[inRow + 1];
    if ((l && !l.faceUp) || (r && !r.faceUp)) return `${def.name} has Cover — a face-down card protects it.`;
  }
  if (c.noFightTurn === G.turnNo) return `${def.name} can't be fought this turn.`;
  const cost = effectiveFightCost(c);
  if (P().A < cost) return `Not enough ⚔ (need ${cost}).`;
  return null;
}
function effectiveFightCost(c) {
  let cost = D(c).defeat;
  if (G.combatZone.some(x => x.uid === c.uid)) cost = Math.max(0, cost - G.turn.kungfuCZBonus);
  return cost;
}
async function actFight(uid) {
  if (!assertAction()) return;
  const f = findZone(uid);
  if (!f) return;
  const c = f.card;
  const reason = fightBlockReason(c);
  if (reason) { log(reason); return; }
  const inCZ = G.combatZone.some(x => x.uid === c.uid);
  const cost = effectiveFightCost(c);
  P().A -= cost;
  if (inCZ && G.turn.kungfuCZBonus) {
    log(`I Know Kung Fu: −${G.turn.kungfuCZBonus} ⚔ on this fight.`, 'good');
    G.turn.kungfuCZBonus = 0;
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

async function actCompleteChallenge(uid) {
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
    if (P().R < def.defeat) { log(`Not enough ® (need ${def.defeat}).`); return; }
    P().R -= def.defeat;
  } else if (def.defeat) {
    if (P().A < def.defeat) { log(`Not enough ⚔ (need ${def.defeat}).`); return; }
    P().A -= def.defeat;
  }
  removeCard(c.uid);
  G.discardedCES.push(c);
  log(`Challenge completed: ${def.name}!`, 'good');
  if (s && s.onComplete) await s.onComplete(c);
  await afterActionChecks();
}

async function actMove() {
  if (!assertAction()) return;
  if (G.turn.freeMoveUsed) { log('You already used your free move this turn.'); return; }
  if (P().rsi === 'real') {
    P().rsi = 'matrix';
    G.turn.freeMoveUsed = true;
    log('You jack in — you are now IN THE MATRIX.', 'good');
  } else {
    const why = leaveMatrixBlockReason();
    if (why) { log(why); return; }
    const free = phoneAvailable();
    if (free != null) {
      P().rsi = 'real';
      G.turn.freeMoveUsed = true;
      log(`You exit through the ${MX.ROW_NAMES[free]} phone — back in the Real World.`, 'good');
    } else if (G.combatZone.length < MX.COMBAT_PHONE_BLOCKED_AT && P().R >= MX.COMBAT_PHONE_COST) {
      const ok = await UI.confirmBox('Pay phone', `Exit through the Combat Zone phone for ${MX.COMBAT_PHONE_COST} ®?`);
      if (!ok) return;
      P().R -= MX.COMBAT_PHONE_COST;
      P().rsi = 'real';
      G.turn.freeMoveUsed = true;
      log('You pay 3 ® and exit through the Combat Zone phone.', 'good');
    } else {
      log('No available phone: Subway/Alley are blocked and the Combat Zone phone is unavailable.');
    }
  }
  await afterActionChecks();
}
function phoneAvailable() {
  for (const idx of MX.PHONE_SPACES)
    if (!G.matrixRow[idx] && !G.flags.deadPhones[idx]) return idx;
  return null;
}
function leaveMatrixBlockReason() {
  if (G.act === 3 && G.part === 3) return "You can't leave the Matrix. You must become The One.";
  if (G.combatZone.some(c => c.id === 'Act2KnowThyselfExtra_2'))
    return "Agent Smith is in the Combat Zone — players can't leave the Matrix!";
  return null;
}
// Card-effect move to the Real World (no phone needed).
function effectMoveToRealWorld() {
  if (P().rsi === 'real') return;
  if (leaveMatrixBlockReason()) { log(leaveMatrixBlockReason()); return; }
  P().rsi = 'real';
  log('A card effect moves you to the Real World.', 'good');
}

async function actEvade(uid) {
  if (!assertAction()) return;
  const f = findZone(uid);
  if (!f) return;
  const c = f.card;
  const def = D(c);
  if (!def.evade) return;
  if (P().R < def.evade) { log(`Not enough ® to Evade (need ${def.evade}).`); return; }
  let target = -1;
  for (let i = 4; i >= 0; i--) if (!G.matrixRow[i]) { target = i; break; }
  if (target < 0) { log('No clear space in the Matrix Row to evade to.'); return; }
  P().R -= def.evade;
  removeCard(c.uid);
  G.matrixRow[target] = c;
  log(`You Evade ${def.name} (−${def.evade} ®) — he is thrown back to the ${MX.ROW_NAMES[target]}.`, 'good');
  await afterActionChecks();
}

async function actRaiseTime() {
  if (!assertAction() || !(G.act === 3 && G.part === 3)) return;
  const cost = G.time + 1;
  if (G.time >= 10) return;
  if (P().A < cost) { log(`Not enough ⚔ (need ${cost} to raise the Time Track to ${cost}).`); return; }
  P().A -= cost;
  G.time += 1;
  log(`⚡ You pay ${cost} ⚔ — the Time Track rises to ${G.time}!`, 'act');
  if (G.time >= 10) {
    await UI.showCard(CARDS['Act3HeIsTheOneExtra_10B'].image, 'Become The One');
    gameOver(true, 'MAJOR VICTORY — You are The One',
      'You effortlessly destroy Agent Smith. The other Agents flee. "Where we go from there is a choice I leave to you."');
  }
  await afterActionChecks();
}

async function actJump() {
  if (!assertAction()) return;
  const c = G.attached.building;
  if (!c) return;
  if (!inMatrix()) { log('You must be in the Matrix to jump.'); return; }
  if (G.matrixRow[3]) { log('The Building space must be clear to jump.'); return; }
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
  G.attached.building = null;
  G.discardedCES.push(c);
  G.flags.trainingDefeated++;
  log(`Training complete (${G.flags.trainingDefeated}/7): First Jump.`, 'good');
  await afterActionChecks();
}

async function actTalkOracle() {
  if (!assertAction()) return;
  const c = G.operations.find(x => x.id === 'Act2KnowThyself_9');
  if (!c) return;
  if (!inMatrix()) { log('You must be in the Matrix to talk to the Oracle.'); return; }
  if (G.act !== 2) { log('Only during Act 2.'); return; }
  if (G.flags.trainingDefeated < 7) { log(`You need 7 Training cards defeated (${G.flags.trainingDefeated}/7).`); return; }
  removeCard(c.uid);
  G.discardedCES.push(c);
  log('You talk to The Oracle… "You\'re waiting for something. Your next life, maybe."', 'act');
  await beginPart(2, 2);
  await afterActionChecks();
}

async function actFreeNeo() {
  if (!assertAction()) return;
  if (!(G.act === 1 && G.part === 2)) return;
  if (P().rsi !== 'real') { log('You must be in the Real World to free Neo.'); return; }
  const has = P().inPlay.some(c => D(c).type === 'hovercraft') || G.turn.gainedHovercraft;
  if (!has) { log('You need to gain a Hovercraft or have one in your play area.'); return; }
  const neo = buildHeroGroup('Neo').map(mk);
  const dockCards = [];
  for (let i = 0; i < 5; i++) { if (G.dock[i]) { dockCards.push(G.dock[i]); G.dock[i] = null; } }
  G.zion.push(...neo, ...dockCards);
  shuffle(G.zion);
  for (let i = 0; i < 5; i++) refillDock(i);
  log('NEO IS FREED FROM THE MATRIX! The 14 Neo Heroes are shuffled into Zion.', 'act');
  await beginPart(2, 1);
  await afterActionChecks();
}

async function actMinorVictory() {
  if (!assertAction() || !(G.act === 3 && G.part === 2)) return;
  const ok = await UI.confirmBox('Run for it?',
    'An Agent has destroyed your exit. Do you run, and end the game with a MINOR VICTORY? Or are you beginning to believe?', 'Run (Minor Victory)', 'Keep fighting');
  if (!ok) return;
  gameOver(true, 'MINOR VICTORY', 'You escape the Matrix. Neo lives to fight another day… but he is not yet The One.');
  UI.render();
}

async function actSacrifice(uid) {
  if (!assertAction()) return;
  const c = P().inPlay.find(x => x.uid === uid);
  if (!c || !D(c).kw.includes('Sacrifice')) return;
  const s = SCRIPTS[c.id];
  if (s && s.sacrifice) {
    const done = await s.sacrifice(c);
    if (done === false) return;   // cancelled
    defeatPlayerCard(c, P().inPlay);
    log(`Sacrificed: ${D(c).name}.`, 'good');
  }
  await afterActionChecks();
}

async function actPending(idx) {
  if (!assertAction()) return;
  const p = G.pending[idx];
  if (!p) return;
  const s = SCRIPTS[p.cardId];
  const fn = s && s.pending && s.pending[p.key];
  if (!fn) { G.pending.splice(idx, 1); return; }
  const done = await fn(p);
  if (done !== false) G.pending.splice(G.pending.indexOf(p), 1);
  await afterActionChecks();
}
function addPending(c, key, label) {
  G.pending.push({ cardId: c.id, uid: c.uid, key, label });
}

async function actEndPhase() {
  if (!assertAction()) return;
  await endActionPhase();
  UI.render();
}

// After any action: act-transition bookkeeping + win checks + re-render.
async function afterActionChecks() {
  if (G.gameOver) { UI.render(); return; }
  // Act 1 Part 1 → Part 2 when both Challenges are done.
  if (G.act === 1 && G.part === 1 && G.flags.truthDone && G.flags.rabbitDone) {
    await beginPart(1, 2);
  }
  if (G.turnEnding) {
    G.turnEnding = false;
    G.phase = 'strike';
    UI.render();
    await cleanupPhase();
    return;
  }
  UI.render();
}
