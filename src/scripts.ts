// scripts.ts — per-card behaviour for every card in the first film.
//
// Hooks (all may be async):
//   onPlay(c)          — when you play the Hero
//   onCombo(c)         — its class ability (engine already verified the combo)
//   sacrifice(c)       — Sacrifice: effect; return false to cancel
//   pending{key:fn}    — deferred "once this turn" actions; return false to keep
//   reveal(c, where)   — when the Matrix card is revealed ('row'|'cz'); return true
//                        if the card was consumed / moved elsewhere
//   fight(c)           — custom fight resolution (Attack already paid)
//   onDefeat(c)        — after a default fight defeats it
//   strike(c)          — custom Strike-Phase behaviour (replaces the default)
//   afterStrike(c, s)  — after this enemy made you draw Strike s
//   noStrike           — true: the enemy never strikes
//   endAction(c)       — end of your Action Phase, while in the Matrix Row
//   strikeResolve(c)   — for Strike cards: how the drawn Strike resolves

import { MX } from './version';
import { CARDS } from './cards';
import {
  D,
  P,
  addPending,
  beginPart,
  deckTop,
  defeatEnemy,
  defeatPlayerCard,
  drawCards,
  drawStrike,
  effectMoveToRealWorld,
  enemyStrikesPlayer,
  enterCombatZone,
  freeScan,
  g,
  gainCard,
  healStrike,
  inMatrix,
  killPhone,
  log,
  mk,
  refillDock,
  removeCard,
  resolveActAbility,
  rowFaceDown,
  strikeDeckPop,
  subTime,
  ui,
} from './game';
import type { AvatarScript, CardInstance, ScriptHooks } from './types';

/* ─────────── shared helpers ─────────── */
async function pickHealStrike(title: string, filter?: (c: CardInstance) => boolean) {
  const opts = P().strikes.filter(filter || (() => true));
  if (!opts.length) {
    log('No Strike to heal.');
    return false;
  }
  const sel = await ui().pick(opts, {
    title,
    prompt: 'Choose a Strike to heal.',
    min: 0,
    max: 1,
    skippable: true,
  });
  if (!sel.length) return false;
  healStrike(sel[0]);
  return true;
}
async function optionalFreeScan(prompt: string) {
  const fd = g()
    .matrixRow.map((c, i) => (c && !c.faceUp ? i : -1))
    .filter(i => i >= 0);
  if (!fd.length) return false;
  const sel = await ui().pick(
    fd.map(i => ({ uid: 'sp' + i, id: null, spaceIdx: i })),
    {
      title: 'Scan any space',
      prompt,
      min: 0,
      max: 1,
      skippable: true,
      spaces: true,
    },
  );
  if (!sel.length) return false;
  await freeScan(sel[0].spaceIdx);
  return true;
}
function trainingFight(c: CardInstance) {
  // "Fight: discard the top card of the Strike deck; 2+ damage defeats it."
  const sc = strikeDeckPop();
  if (!sc) return;
  g().strikeDiscard.push(sc);
  const dmg = D(sc).damage || 0;
  if (dmg >= 2) {
    log(`You flip ${D(sc).name} (${dmg} damage) — HIT! ${D(c).name} is defeated.`, 'good');
    defeatEnemy(c);
  } else {
    log(`You flip ${D(sc).name} (${dmg} damage) — you miss. ${D(c).name} stays.`, 'bad');
  }
}
function agentFightReplace(c: CardInstance) {
  // Agents Jones/Brown: when defeated, take the place of the Human closest to the Matrix deck.
  let victim: CardInstance | null = null;
  let spot: { row?: number; cz?: number } | null = null;
  for (let i = 4; i >= 0; i--) {
    const x = g().matrixRow[i];
    if (x && x.faceUp && D(x).type === 'enemy' && D(x).descriptor === 'Human') {
      victim = x;
      spot = { row: i };
      break;
    }
  }
  if (!victim) {
    for (let i = g().combatZone.length - 1; i >= 0; i--) {
      const x = g().combatZone[i];
      if (x.faceUp && D(x).type === 'enemy' && D(x).descriptor === 'Human') {
        victim = x;
        spot = { cz: i };
        break;
      }
    }
  }
  if (!victim) {
    defeatEnemy(c);
    log(`${D(c).name} is defeated!`, 'good');
    return;
  }
  removeCard(c.uid);
  defeatEnemy(victim);
  log(`${D(c).name} takes over the body of ${D(victim).name}!`, 'bad');
  if (spot!.row != null) g().matrixRow[spot!.row] = c;
  else g().combatZone.splice(Math.min(spot!.cz!, g().combatZone.length), 0, c);
}

/* ═══════════════ SCRIPTS ═══════════════ */
export const SCRIPTS: Record<string, ScriptHooks> = {
  /* ── Starters / Free Your Mind is handled by the engine ── */

  /* ── Morpheus (The Matrix) ── */
  MorpheusTheMatrix_2Common: {
    async onCombo() {
      if (rowFaceDown().length) await optionalFreeScan('You may scan any space (free).');
      else {
        drawCards(1);
        log('No face-down cards — you draw a card instead.', 'good');
      }
    },
  },
  MorpheusTheMatrix_3Common: {
    onCombo() {
      P().R += 2;
      log('+2 ® (Welcome to the Real World).', 'good');
    },
  },
  MorpheusTheMatrix_4Uncommon: {
    onPlay(c) {
      addPending(c, 'healLow', 'Heal your lowest-damage Strike (Matrix only)');
    },
    onCombo(c) {
      addPending(c, 'heal', 'Heal a Strike (Matrix only)');
    },
    pending: {
      async healLow() {
        if (!inMatrix()) {
          log('You must be in the Matrix.');
          return false;
        }
        if (!P().strikes.length) {
          log('No Strikes to heal.');
          return false;
        }
        const lowest = P().strikes.reduce((a, b) =>
          (D(a).damage || 0) <= (D(b).damage || 0) ? a : b,
        );
        healStrike(lowest);
      },
      async heal() {
        if (!inMatrix()) {
          log('You must be in the Matrix.');
          return false;
        }
        return await pickHealStrike("You Think That's Air You're Breathing?");
      },
    },
  },
  MorpheusTheMatrix_1Rare: {
    // EMP
    async sacrifice() {
      const machines = [
        ...g().matrixRow.filter((x): x is CardInstance => !!x && x.faceUp),
        ...g().combatZone,
        ...g().realWorldEnemies,
      ].filter(x => D(x).type === 'enemy' && D(x).descriptor === 'Machine');
      if (!machines.length) {
        log('No Machine Enemy in play.');
        return false;
      }
      const sel = await ui().pick(machines, {
        title: 'EMP',
        prompt: 'Defeat a Machine Enemy.',
        min: 1,
        max: 1,
      });
      if (!sel.length) return false;
      defeatEnemy(sel[0]);
      log(`EMP! ${D(sel[0]).name} is fried.`, 'good');
    },
  },

  /* ── Trinity (The Matrix) ── */
  TrinityTheMatrix_3Common: {
    async onPlay() {
      if (!P().discard.length) return;
      const sel = await ui().pick(P().discard, {
        title: "We Think You're Bugged",
        prompt: 'You may defeat a card in your discard pile.',
        min: 0,
        max: 1,
        skippable: true,
      });
      if (!sel.length) return;
      const isBug = D(sel[0]).name === 'Bug';
      defeatPlayerCard(sel[0], P().discard);
      if (isBug) {
        drawCards(2);
        log('It WAS a bug! You draw two cards.', 'good');
      }
    },
  },
  TrinityTheMatrix_1Rare: {
    // I Love You
    async sacrifice() {
      const sel = await ui().pick(P().strikes, {
        title: 'I Love You',
        prompt: 'Heal up to three Strikes.',
        min: 0,
        max: 3,
        skippable: true,
      });
      for (const s of sel) healStrike(s);
      drawCards(3);
      log('You draw three cards.', 'good');
    },
  },

  /* ── Tank ── */
  Tank_2Common: {
    // Operator
    onPlay(c) {
      addPending(c, 'move', 'Move to the Real World');
    },
    pending: {
      move() {
        if (P().rsi === 'real') {
          log('You are already in the Real World.');
          return false;
        }
        effectMoveToRealWorld();
      },
    },
  },
  Tank_4Uncommon: {
    // It's a Trap, Get Out!
    async onPlay() {
      const fd = g().matrixRow.filter((x): x is CardInstance => !!x && !x.faceUp);
      if (fd.length) {
        const sel = await ui().pick(fd, {
          title: "It's a Trap!",
          prompt: 'Look at a face-down card in the Matrix Row.',
          min: 0,
          max: 1,
          skippable: true,
          facedown: true,
        });
        if (sel.length) await ui().showCard(D(sel[0]).image, `Peek: ${D(sel[0]).name}`);
      }
    },
    onCombo(c) {
      addPending(c, 'defeat', 'Defeat a card in your play area / discard');
    },
    pending: {
      async defeat() {
        const opts = [...P().inPlay, ...P().discard];
        if (!opts.length) return false;
        const sel = await ui().pick(opts, {
          title: "It's a Trap, Get Out!",
          prompt: 'Defeat a card in your play area or discard pile.',
          min: 0,
          max: 1,
          skippable: true,
        });
        if (!sel.length) return false;
        defeatPlayerCard(sel[0]);
      },
    },
  },
  Tank_1Rare: {
    // Breakfast of Champions
    onPlay(c) {
      addPending(c, 'heal', 'Heal a Strike (Real World only)');
    },
    pending: {
      async heal() {
        if (P().rsi !== 'real') {
          log('You must be in the Real World.');
          return false;
        }
        return await pickHealStrike('Breakfast of Champions');
      },
    },
  },

  /* ── The Nebuchadnezzar Crew ── */
  NebuchadnezzarCrew_2Common: {
    // Dozer
    async onCombo() {
      await pickHealStrike('Dozer');
    },
  },
  NebuchadnezzarCrew_3Common: {
    // Mouse
    onCombo() {
      drawCards(1);
      log('Mouse: you draw a card.', 'good');
    },
  },
  NebuchadnezzarCrew_4Uncommon: {
    // Switch
    async onPlay() {
      const v = await ui().chooseOption('Switch', 'Choose:', [
        { label: '+3 ®', value: 'R' },
        { label: '+3 ⚔', value: 'A' },
      ]);
      if (v === 'R') {
        P().R += 3;
        log('+3 ®.', 'good');
      } else {
        P().A += 3;
        log('+3 ⚔.', 'good');
      }
    },
  },
  NebuchadnezzarCrew_1Rare: {
    // Apoc
    async onCombo() {
      const opts = g().dock.filter((x): x is CardInstance => !!x);
      if (!opts.length) return;
      const sel = await ui().pick(opts, {
        title: 'Apoc',
        prompt: 'You may gain a Hero from the Dock into your hand.',
        min: 0,
        max: 1,
        skippable: true,
      });
      if (!sel.length) return;
      const i = g().dock.findIndex(x => x && x.uid === sel[0].uid);
      g().dock[i] = null;
      gainCard(sel[0], 'hand');
      refillDock(i);
      log(`Apoc sends you ${D(sel[0]).name} — straight into your hand.`, 'good');
    },
  },

  /* ── Neo (The Matrix) ── */
  Act1WhatIsTheMatrixExtra_2Common: {
    // I Know Kung Fu
    onPlay() {
      g().turn.kungfuCZBonus += 2;
      log('+2 ⚔ against the next Enemy you fight in the Combat Zone.', 'good');
    },
  },
  Act1WhatIsTheMatrixExtra_3Common: {
    // Guns, Lots of Guns
    onCombo() {
      P().A += 2;
      log('+2 ⚔ (Guns. Lots of guns.)', 'good');
    },
  },
  Act1WhatIsTheMatrixExtra_4Uncommon: {
    // You Move Like They Do
    onCombo() {
      g().turn.avoidMatrixEnemyStrikes = true;
      log('You avoid each Strike from Enemies in the Matrix this turn.', 'good');
    },
  },
  Act1WhatIsTheMatrixExtra_1Rare: {
    // The One
    onPlay(c) {
      addPending(c, 'act', "Resolve your Avatar's Act ability");
    },
    onCombo() {
      g().turn.skipStrikePhase = true;
      log('The Strike Phase will be skipped this turn.', 'good');
    },
    pending: {
      async act() {
        await resolveActAbility();
      },
    },
  },

  /* ── Oracle Heroes ── */
  Act2KnowThyselfExtra_4: {
    // You've Got the Gift
    async onPlay() {
      drawCards(1);
      await optionalFreeScan('You may scan any space.');
    },
  },
  Act2KnowThyselfExtra_6: {
    // Take a Cookie
    async onPlay() {
      drawCards(1);
      await pickHealStrike('Take a Cookie');
    },
  },
  Act2KnowThyselfExtra_7: {
    // I'd Better Have a Look at You
    async onPlay() {
      const three: CardInstance[] = [];
      for (let i = 0; i < 3; i++) {
        const t = deckTop();
        if (t) three.push(t);
      }
      if (!three.length) return;
      const sel = await ui().pick(three, {
        title: "I'd Better Have a Look at You",
        prompt: 'Draw one — the others are discarded.',
        min: 1,
        max: 1,
      });
      const keep = sel[0] || three[0];
      P().hand.push(keep);
      for (const c of three) if (c !== keep) P().discard.push(c);
    },
  },
  Act2KnowThyselfExtra_8: {
    // Don't Worry About the Vase
    async onPlay() {
      drawCards(1);
      const opts = [...P().hand, ...P().discard];
      if (!opts.length) return;
      const sel = await ui().pick(opts, {
        title: "Don't Worry About the Vase",
        prompt: 'You may defeat a card in your hand or discard pile.',
        min: 0,
        max: 1,
        skippable: true,
      });
      if (sel.length) defeatPlayerCard(sel[0]);
    },
  },

  /* ══ Act 1 mini-deck ══ */
  Act1WhatIsTheMatrix_2: {
    // Agent Brown (Act 1) — Chase
    async strike(c) {
      if (!inMatrix()) {
        removeCard(c.uid);
        g().defeatedEnemies.push(c);
        log('Agent Brown loses your trail and leaves the Matrix Row.', 'good');
      } else {
        log('Agent Brown strikes you!', 'bad');
        await enemyStrikesPlayer(c);
      }
    },
  },
  Act1WhatIsTheMatrix_3: {
    // Bug
    reveal(c) {
      removeCard(c.uid);
      gainCard(c);
      log('A Bug crawls into your deck…', 'bad');
      return true;
    },
  },
  'PartOfTheSystem-Bug': {
    reveal(c) {
      removeCard(c.uid);
      gainCard(c);
      log('A Bug crawls into your deck…', 'bad');
      return true;
    },
  },
  Act1WhatIsTheMatrix_4: {
    // Time Is Always Against Us
    reveal(c, where) {
      subTime(where === 'cz' ? 2 : 1);
    },
  },
  Act1WhatIsTheMatrix_5: {
    // All I'm Offering Is the Truth
    reveal(c) {
      removeCard(c.uid);
      g().operations.push(c);
      log('Challenge moved to Operations.');
      return true;
    },
    onComplete() {
      g().flags.truthDone = true;
    },
  },
  Act1WhatIsTheMatrix_6: {
    // How Deep the Rabbit Hole Goes
    reveal(c) {
      removeCard(c.uid);
      g().operations.push(c);
      log('Challenge moved to Operations.');
      return true;
    },
    onComplete() {
      g().flags.rabbitDone = true;
    },
  },

  /* ══ Act 2 mini-deck ══ */
  Act2KnowThyself_1: {
    // They Cut the Hardline
    reveal() {
      killPhone(2);
    },
  },
  Act2KnowThyself_2: {
    // Deja Vu
    async reveal() {
      g().flags.dejaVu++;
      if (g().flags.dejaVu === 1) {
        log('Deja Vu… a black cat goes past. Nothing happens — yet.');
        return;
      }
      log('DEJA VU AGAIN — a glitch in the Matrix! They changed something.', 'bad');
      await ui().showCard(CARDS['Act2KnowThyselfExtra_3'].image, 'A Glitch in the Matrix');
      for (let k = 0; k < 2; k++) {
        const swat = Object.assign(mk('Act2KnowThyselfExtra_1'), { faceUp: true });
        let idx = -1;
        for (let i = 4; i >= 0; i--)
          if (!g().matrixRow[i]) {
            idx = i;
            break;
          }
        if (idx >= 0) {
          g().matrixRow[idx] = swat;
          log(`S.W.A.T. Officer appears in the ${MX.ROW_NAMES[idx]}!`, 'bad');
        } else await enterCombatZone(swat);
      }
      const smith = Object.assign(mk('Act2KnowThyselfExtra_2'), { faceUp: true });
      g().matrixDeck.push(smith);
      log('AGENT SMITH is on top of the Matrix Deck — he arrives next turn!', 'bad');
    },
  },
  Act2KnowThyself_3: {
    // No One's Ever Made Their First Jump
    reveal(c) {
      removeCard(c.uid);
      g().attached.building = c;
      log('The jump program loads — the Challenge is attached above the Building.', 'good');
      return true;
    },
  },
  Act2KnowThyself_4: {
    // Look Again
    async reveal(c, where) {
      if (where === 'row') {
        log('Look again — the Agent was already there! You draw a Strike.', 'bad');
        await drawStrike({ source: c });
      }
    },
    endAction(c) {
      c.faceUp = false;
      log('Look Again turns face down again.');
    },
  },
  Act2KnowThyself_5: {
    // Woman in the Red Dress
    endAction(c) {
      c.faceUp = false;
      log('The Woman in the Red Dress vanishes into the crowd (face down).');
    },
  },
  Act2KnowThyself_6: { fight: trainingFight },
  Act2KnowThyself_7: { fight: trainingFight },
  Act2KnowThyself_8: { fight: trainingFight },
  Act2KnowThyself_9: {
    // See The Oracle
    reveal(c) {
      removeCard(c.uid);
      g().operations.push(c);
      log('See The Oracle waits in Operations.');
      return true;
    },
    canComplete() {
      if (g().act !== 2) return 'Only during Act 2.';
      if (g().flags.trainingDefeated < 7)
        return `You need all 7 Training cards defeated first (${g().flags.trainingDefeated}/7).`;
      return null;
    },
    async onComplete() {
      log('"You\'re cuter than I thought…" — you talk to The Oracle.', 'act');
      await beginPart(2, 2);
    },
  },

  /* ══ Act 2 Extras ══ */
  Act2KnowThyselfExtra_2: {}, // Agent Smith (Unfightable; exit-blocking handled by the engine)

  /* ══ Act 3 mini-deck ══ */
  Act3HeIsTheOne_2: {
    // Agent Jones
    fight: agentFightReplace,
    async afterStrike(c, s) {
      if (s.id === 'StrikeIveNeverSeenAnyoneMoveThatFast') {
        log('"…he moved like they do." Agent Jones strikes AGAIN!', 'bad');
        await enemyStrikesPlayer(c);
      }
    },
  },
  Act3HeIsTheOne_3: {
    // Agent Brown
    fight: agentFightReplace,
    afterStrike(c, s) {
      if ((D(s).damage || 0) >= 1) {
        g().turn.drawPenalty++;
        log('Agent Brown gets into your head — you will draw one fewer card this turn.', 'bad');
      }
    },
  },
  Act3HeIsTheOne_4: {
    // Breaking Into Your Mind
    async reveal() {
      const two: CardInstance[] = [];
      for (let i = 0; i < 2; i++) {
        const t = deckTop();
        if (t) two.push(t);
      }
      if (!two.length) return;
      const kept: CardInstance[] = [];
      for (const c of two) {
        if ((D(c).cost || 0) >= 1) {
          P().discard.push(c);
          log(`Breaking into your mind: ${D(c).name} is discarded.`, 'bad');
        } else kept.push(c);
      }
      for (const c of kept.reverse()) P().deck.push(c);
      if (kept.length) log(`${kept.length} card(s) go back on top of your deck.`);
    },
  },
  Act3HeIsTheOne_5: {
    // Humans Are a Disease...
    async reveal() {
      log('"You are a plague. And we are the cure."', 'bad');
      await drawStrike({});
    },
  },
  Act3HeIsTheOne_6: {
    // Cypher
    noStrike: true,
    reveal(c) {
      removeCard(c.uid);
      g().realWorldEnemies.push(c);
      g().flags.cypherRevealTurn = g().turnNo;
      log(
        'CYPHER stands over your body in the Real World! Defeat him (5 ⚔, in the Real World) before the end of your NEXT turn — or everyone dies.',
        'bad',
      );
      return true;
    },
  },

  /* ══ Act 3 Extras ══ */
  Act3HeIsTheOneExtra_4: { noStrike: true }, // Captive's Guard
  Act3HeIsTheOneExtra_3: { noStrike: true }, // Sentinel Destroyer (not placed in solo)
  Act3HeIsTheOneExtra_2: {
    // Rescue the Captive
    canComplete() {
      const guards = g().combatZone.filter(x => x.id === 'Act3HeIsTheOneExtra_4');
      if (guards.length)
        return "You can't rescue the captive while Captive's Guards are in the Combat Zone.";
      return null;
    },
    async onComplete() {
      log('The captive is free! Morpheus is coming home.', 'act');
      await beginPart(3, 2);
    },
  },
  Act3HeIsTheOneExtra_9: {
    // Agent Smith (12), Act 3 Part 2
    async onDefeat() {
      log('AGENT SMITH IS DEFEATED! …but the Sentinels are coming.', 'act');
      await beginPart(3, 3);
    },
  },

  /* ══ Part of the System ══ */
  'PartOfTheSystem-SecurityGuard': {
    reveal(c, where) {
      if (where === 'row') {
        c.noFightTurn = g().turnNo;
        log("The Security Guard can't be fought this turn.");
      }
    },
  },
  'PartOfTheSystem-Soldier': {
    async strike(c) {
      if (inMatrix()) {
        log("The Soldier strikes — it can't be avoided!", 'bad');
        await drawStrike({ source: c, unavoidable: true });
      } else {
        log('The Soldier strikes the Time Track!', 'bad');
        subTime(1);
      }
    },
  },
  'PartOfTheSystem-TacticalPolice': {
    reveal() {
      g().turn.noScan = true;
      log("Tactical Police: you can't scan for the rest of the turn.", 'bad');
    },
  },
  'PartOfTheSystem-TheDesertOfTheReal': {
    async reveal() {
      if (P().rsi === 'real') {
        log('Welcome to the desert of the real.', 'bad');
        await drawStrike({});
      }
    },
  },
  'PartOfTheSystem-TheMatrixIsAllAroundUs': {
    reveal() {
      if (P().rsi === 'real') {
        P().rsi = 'matrix';
        log('The Matrix is all around us — you are pulled into the Matrix.', 'bad');
      }
    },
  },
  'PartOfTheSystem-WhatGoodIsAPhoneCallIfYoureUnableToSpeak': {
    reveal() {
      g().flags.noCoordUntilTurn = g().turnNo + 1;
      log("You can't Coordinate until your next turn.", 'bad');
    },
  },

  /* ══ Strikes ══ */
  StrikeIveNeverSeenAnyoneMoveThatFast: {
    strikeResolve(c) {
      g().strikeDiscard.push(c);
      log('…but you dodged. No damage.', 'good');
    },
  },
  StrikeIncoming: {
    async strikeResolve(c) {
      const v = await ui().chooseOption(
        'Incoming!',
        'Take 4 damage, or subtract 1 from the Time Track instead?',
        [
          { label: 'Take the Strike (4 damage)', value: 'take' },
          { label: 'Time Track −1, discard the Strike', value: 'time' },
        ],
      );
      if (v === 'time') {
        g().strikeDiscard.push(c);
        subTime(1);
      } else P().strikes.push(c);
    },
  },
  StrikeNotLikeThis: {
    async strikeResolve(c) {
      const heroes = P().discard.filter(
        x => (D(x).cost || 0) >= 1 && (D(x).type === 'hero' || D(x).type === 'hovercraft'),
      );
      if (heroes.length) {
        const victim = heroes[Math.floor(Math.random() * heroes.length)];
        defeatPlayerCard(victim, P().discard);
        g().strikeDiscard.push(c);
        log(`Not like this… ${D(victim).name} is lost.`, 'bad');
      } else {
        g().strikeDiscard.push(c);
        log('No Hero to lose — you draw another Strike.', 'bad');
        await drawStrike({});
      }
    },
  },
  StrikeBlinded: {
    strikeResolve(c) {
      P().strikes.push(c);
      log(
        'You are BLINDED — your next Act ability will discard the Blinded Strikes instead.',
        'bad',
      );
    },
  },
  StrikeTheyreNotMoving: {
    strikeResolve(c) {
      P().strikes.push(c);
    }, // solo: no other players to hit
  },
  StrikeOneOfYouIsGoingToDie: {
    strikeResolve(c) {
      P().strikes.push(c);
      log('There is no one to take the bullet for you.', 'bad');
    },
  },
};

/* ═══════════════ Avatar Act abilities ═══════════════ */
async function switchLook(drawAfter: boolean) {
  const top = deckTop();
  if (top) {
    await ui().showCard(D(top).image, `Top of your deck: ${D(top).name}`);
    const kill = await ui().confirmBox(
      'Switch',
      `Defeat ${D(top).name}?`,
      'Defeat it',
      'Put it back',
    );
    if (kill) {
      defeatPlayerCard(top, [top]);
      log(`${D(top).name} is defeated from the top of your deck.`);
    } else P().deck.push(top);
  }
  if (drawAfter) drawCards(1);
}
async function mouseHeal(maxDmg: number) {
  drawCards(1);
  const opts = P().strikes.filter(s => (D(s).damage || 0) <= maxDmg);
  if (!opts.length) {
    drawCards(1);
    log('No light Strike to heal — you draw a second card.', 'good');
    return;
  }
  const sel = await ui().pick(opts, {
    title: 'Mouse',
    prompt: `Heal a Strike with ${maxDmg} damage or less.`,
    min: 1,
    max: 1,
  });
  if (sel.length) healStrike(sel[0]);
}
async function apocScan(anySpace: boolean) {
  drawCards(1);
  if (anySpace) {
    await optionalFreeScan('You may scan any space.');
    return;
  }
  const i = g().matrixRow.findIndex(c => c && !c.faceUp);
  if (i < 0) return;
  const ok = await ui().confirmBox(
    'Apoc',
    `Scan the leftmost face-down space (${MX.ROW_NAMES[i]}) for free?`,
    'Scan',
    'Skip',
  );
  if (ok) await freeScan(i);
}

export const AVATAR_SCRIPTS: Record<string, AvatarScript> = {
  AvatarThomasAnderson: {
    1: () => log('Thomas Anderson does not know yet… (no Act 1 ability)'),
  },
  AvatarThomasAndersonNeo: {
    2: () => {
      P().A += 3;
      drawCards(1);
      log('Neo: +3 ⚔, draw a card.', 'good');
    },
    3: () => {
      P().A += 5;
      drawCards(1);
      log('Neo: +5 ⚔, draw a card.', 'good');
    },
  },
  AvatarMorpheusMatrix: {
    1: () => {
      P().R += 1;
      drawCards(1);
      log('Morpheus: +1 ®, draw a card.', 'good');
    },
    2: () => {
      P().R += 3;
      drawCards(1);
      log('Morpheus: +3 ®, draw a card.', 'good');
    },
    3: () => {
      P().R += 5;
      drawCards(1);
      log('Morpheus: +5 ®, draw a card.', 'good');
    },
  },
  AvatarTrinityMatrix: {
    1: () => {
      drawCards(1);
      log('Trinity: draw a card.', 'good');
    },
    2: () => {
      drawCards(2);
      log('Trinity: draw two cards.', 'good');
    },
    3: () => {
      drawCards(3);
      log('Trinity: draw three cards.', 'good');
    },
  },
  AvatarSwitch: {
    1: () => switchLook(false),
    2: () => switchLook(true),
    3: () => switchLook(true),
  },
  AvatarApoc: {
    1: () => apocScan(false),
    2: () => apocScan(true),
    3: async () => {
      const v = await ui().chooseOption('Apoc', 'Choose:', [
        { label: 'Draw a card + scan any space', value: 'scan' },
        { label: 'Draw two cards', value: 'draw' },
      ]);
      if (v === 'scan') await apocScan(true);
      else {
        drawCards(2);
        log('Apoc: draw two cards.', 'good');
      }
    },
  },
  AvatarMouse: {
    1: () => mouseHeal(1),
    2: () => mouseHeal(2),
    3: () => mouseHeal(3),
  },
};
