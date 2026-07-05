// sim.js — headless smoke test: loads the engine with a stubbed UI and lets a
// simple bot play full games. Goal: 0 runtime errors through all three Acts.
//
//   node tools/sim.js [games] [-v] [--cheat]
//
// --cheat gives the bot +12 ®/⚔ every turn so it storms through the Acts and
// exercises the Act 2/3 transitions and the finale reliably.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const GAMES = parseInt(args.find(a => /^\d+$/.test(a)) || '5', 10);
const VERBOSE = args.includes('-v');
const CHEAT = args.includes('--cheat');

const ctx = { console, Math, JSON, Object, Array, setTimeout };
vm.createContext(ctx);
for (const f of ['js/version.js', 'js/cards.js', 'js/scripts.js', 'js/game.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });

// ── UI stub: auto-answers every prompt ──
vm.runInContext(`
const UI = {
  render() {},
  async showCard() {},
  async pick(items, opts = {}) {
    const min = opts.min ?? 1, max = opts.max ?? 1;
    const n = Math.max(min, Math.min(max, (opts.skippable && Math.random() < .3) ? 0 : 1));
    return items.slice(0, n);
  },
  async chooseOption(t, p, options) { return options[Math.floor(Math.random() * options.length)].value; },
  async confirmBox() { return Math.random() < .7; },
};
`, ctx, { filename: 'ui-stub' });

vm.runInContext(`
async function botActionPhase(cheat) {
  if (cheat) { P().R += 12; P().A += 12; }
  let guard = 0;
  while (G.phase === 'action' && !G.gameOver && guard++ < 80) {
    let did = false;
    // 1. play every card in hand
    if (P().hand.length) { await actPlayCard(P().hand[0].uid); did = true; continue; }
    // 2. resolve pendings
    if (G.pending.length) { await actPending(0); did = true; continue; }
    // 3. finale: raise the time track
    if (G.act === 3 && G.part === 3 && G.time < 10 && P().A >= G.time + 1) { await actRaiseTime(); did = true; continue; }
    // 4. real-world enemies (Cypher!)
    for (const c of G.realWorldEnemies) {
      if (!fightBlockReason(c)) { await actFight(c.uid); did = true; break; }
    }
    if (did) continue;
    // 5. free Neo / jump
    if (G.act === 1 && G.part === 2 && P().rsi === 'real'
        && (P().inPlay.some(x => D(x).type === 'hovercraft') || G.turn.gainedHovercraft)) {
      await actFreeNeo(); did = true; continue;
    }
    if (G.attached.building && inMatrix() && !G.matrixRow[3]) { await actJump(); did = true; continue; }
    // 6. challenges
    if (inMatrix()) {
      for (const c of [...G.operations, ...G.combatZone, ...G.matrixRow.filter(Boolean)]) {
        if (D(c).type !== 'challenge' || !c.faceUp) continue;
        const s = SCRIPTS[c.id];
        if (s && s.canComplete && s.canComplete(c)) continue;
        const def = D(c);
        const ok = def.defeatType === 'R' ? P().R >= (def.defeat || 0) : P().A >= (def.defeat || 0);
        if (ok) { await actCompleteChallenge(c.uid); did = true; break; }
      }
      if (did) continue;
      // 7. fight anything fightable
      for (const c of [...G.combatZone, ...G.matrixRow.filter(Boolean)]) {
        if (D(c).type === 'enemy' && c.faceUp && !fightBlockReason(c)) { await actFight(c.uid); did = true; break; }
      }
      if (did) continue;
      // 8. scan the cheapest face-down space
      if (!G.turn.noScan) {
        for (const i of [0, 1, 2, 3, 4]) {
          const c = G.matrixRow[i];
          if (c && !c.faceUp && P().A >= MX.SCAN_COST[i]) { await actScan(i); did = true; break; }
        }
      }
      if (did) continue;
    } else {
      // Real World: recruit
      if (G.hovercraftStack.length && P().R >= 3 && Math.random() < .6) { await actRecruitHovercraft(); did = true; continue; }
      for (let i = 0; i < 5; i++) {
        const c = G.dock[i];
        if (c && P().R >= D(c).cost) { await actRecruitDock(i); did = true; break; }
      }
      if (did) continue;
    }
    // 9. move once per turn
    if (!G.turn.freeMoveUsed) {
      const before = P().rsi;
      await actMove();
      if (P().rsi !== before) { did = true; continue; }
    }
    break;
  }
  if (G.phase === 'action' && !G.gameOver) await actEndPhase();
}

async function botGame(cheat) {
  const ids = Object.keys(AVATARS).filter(a => !AVATARS[a].hidden);
  const av = ids[Math.floor(Math.random() * ids.length)];
  newGame(av, {});
  await startTurnLoop(cheat);
  return { avatar: av, over: G.gameOver, turns: G.turnNo, act: G.act, part: G.part, time: G.time };
}
// Drive turns iteratively: startTurn stops at the action phase.
async function startTurnLoop(cheat) {
  await startTurn();
  let guard = 0;
  while (!G.gameOver && guard++ < 250) {
    if (G.phase !== 'action') break;
    await botActionPhase(cheat);   // ends with actEndPhase → next turn's action phase
  }
  if (!G.gameOver && guard >= 250) G.gameOver = { win: false, title: 'Turn cap', sub: 'sim cap reached' };
}
`, ctx, { filename: 'bot' });

(async () => {
  let errors = 0;
  const results = [];
  for (let i = 0; i < GAMES; i++) {
    try {
      const r = await vm.runInContext(`botGame(${CHEAT})`, ctx);
      results.push(r);
      if (VERBOSE) {
        console.log(`game ${i + 1}: ${r.avatar} — ${r.over.title} (turn ${r.turns}, Act ${r.act}.${r.part}, time ${r.time})`);
        const log = vm.runInContext('G.log.map(l=>l.msg).join("\\n")', ctx);
        console.log(log.split('\n').slice(-25).join('\n'));
      } else {
        console.log(`game ${i + 1}: ${r.avatar} — ${r.over.title} (turn ${r.turns}, Act ${r.act}.${r.part})`);
      }
    } catch (e) {
      errors++;
      console.error(`game ${i + 1}: ERROR`, e);
      if (VERBOSE) {
        try { console.error(vm.runInContext('G.log.slice(-15).map(l=>l.msg).join("\\n")', ctx)); } catch (_) {}
      }
    }
  }
  const wins = results.filter(r => r.over && r.over.win).length;
  console.log(`\n${GAMES} games, ${errors} errors, ${wins} wins.`);
  process.exit(errors ? 1 : 0);
})();
