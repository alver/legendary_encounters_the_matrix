// scriptsRevolutions.ts — per-card behaviour for the third film ("The Matrix
// Revolutions"): its Hero Groups, Seraph, and the Act mini-decks.
// Merged into SCRIPTS in scripts.ts. (The Revolutions Avatars are in
// scriptsReloaded.ts — they're shared between the two films.)

import {
  D,
  P,
  addPending,
  avatar,
  beginPart,
  defeatEnemy,
  defeatPlayerCard,
  drawCards,
  drawStrike,
  effectMoveToRealWorld,
  g,
  log,
  placeIntoRow,
  removeCard,
  strikeDeckPop,
  subTime,
  ui,
  zionDig,
} from './game';
import { pickHealStrike, scanAnyOrDraw } from './scriptsShared';
import type { CardInstance, ScriptHooks } from './types';

const REV_SMITH = 'Act3EverythingThatHasABeginning_2';

function discardRandomFromHand(n: number, filter?: (c: CardInstance) => boolean) {
  for (let k = 0; k < n; k++) {
    const opts = P().hand.filter(filter || (() => true));
    if (!opts.length) return;
    const victim = opts[Math.floor(Math.random() * opts.length)];
    P().hand.splice(P().hand.indexOf(victim), 1);
    P().discard.push(victim);
    log(`You discard ${D(victim).name} at random.`, 'bad');
  }
}

/* ═══════════════ SCRIPTS (Revolutions) ═══════════════ */
export const SCRIPTS_REVOLUTIONS: Record<string, ScriptHooks> = {
  /* ── Neo (Revolutions) ── */
  NeoRevolutions_2Common: {
    // It Ends Tonight
    onPlay(c) {
      const n = P().inPlay.filter(
        x => x.uid !== c.uid && D(x).group?.startsWith('Neo'),
      ).length;
      if (n) {
        P().A += n;
        log(`It Ends Tonight: +${n} ⫻ (per other Neo Hero in play).`, 'good');
      }
    },
  },
  NeoRevolutions_3Common: {
    // I Can See You
    async onPlay() {
      const fd = g().matrixRow.filter((x): x is CardInstance => !!x && !x.faceUp);
      if (!fd.length) return;
      const sel = await ui().pick(fd, {
        title: 'I Can See You',
        prompt: 'Look at a face-down card in the Matrix Row.',
        min: 0,
        max: 1,
        skippable: true,
        facedown: true,
      });
      if (sel.length) await ui().showCard(D(sel[0]).image, `Peek: ${D(sel[0]).name}`);
    },
    async onCombo() {
      await scanAnyOrDraw(drawCards);
    },
  },
  NeoRevolutions_4Uncommon: {
    // Go Up, Over Them
    onCombo() {
      g().flags.strikeCapUntilTurn = g().turnNo + 1;
      log("Go Up, Over Them: you can't draw more than one Strike per turn until your next turn.", 'good');
    },
  },
  NeoRevolutions_1Rare: {
    // You Cannot Stop Him, But I Can
    async onPlay() {
      g().turn.avoidAllStrikes = true;
      log('You avoid all Strikes you would draw this turn.', 'good');
      const three: CardInstance[] = [];
      for (let i = 0; i < 3 && g().strikeDeck.length; i++) three.push(g().strikeDeck.pop()!);
      if (!three.length) return;
      const sel = await ui().pick(three, {
        title: 'You Cannot Stop Him, But I Can',
        prompt: `Top ${three.length} card(s) of the Strike deck — discard any; the rest go back on top.`,
        min: 0,
        max: three.length,
        skippable: true,
        facedown: false,
      });
      for (const s of sel) g().strikeDiscard.push(s);
      const rest = three.filter(s => !sel.includes(s));
      for (const s of rest.reverse()) g().strikeDeck.push(s);
    },
  },

  /* ── Niobe ── */
  Niobe_2Common: {
    // A Hell of a Pilot
    onPlay() {
      if (P().inPlay.some(x => D(x).type === 'hovercraft')) {
        drawCards(1);
        log('A Hell of a Pilot: you draw a card.', 'good');
      }
    },
  },
  // Gotcha: Coordinate only (its heal applies when Coordinated to a player).
  Niobe_4Uncommon: {
    // Infiltrate
    async onCombo() {
      await scanAnyOrDraw(drawCards);
    },
  },
  Niobe_1Rare: {
    // Some Things Change
    async onPlay() {
      const v = await ui().chooseOption('Some Things Change', 'The Time Track:', [
        { label: '+1', value: 1 },
        { label: '−1', value: -1 },
      ]);
      if (v === 1) {
        g().time = Math.min(10, g().time + 1);
        log(`⏱ Time Track +1 → ${g().time}`, 'good');
      } else subTime(1);
    },
  },

  /* ── Link ── */
  Link_2Common: {
    // Gunnery
    onPlay() {
      g().turn.gunneryRWBonus += 2;
      log('Gunnery: +2 ⫻ against the next Enemy you fight in the Real World.', 'good');
    },
  },
  Link_3Common: {
    // Get Us Out of Here, Link
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
  Link_4Uncommon: {
    // YES!
    onCombo() {
      drawCards(1);
      log('YES! You draw a card.', 'good');
    },
  },
  Link_1Rare: {
    // Burn It, Link!
    async sacrifice() {
      const zb = g().zionBlocker;
      const machines: CardInstance[] = [
        ...g().matrixRow.filter((x): x is CardInstance => !!x && x.faceUp),
        ...g().combatZone,
        ...g().realWorldEnemies,
        ...g().dockEnemies.filter((x): x is CardInstance => !!x),
        ...(zb ? [zb] : []),
      ].filter(x => D(x).type === 'enemy' && D(x).descriptor === 'Machine');
      if (!machines.length) {
        log('No Machine Enemy in play.');
        return false;
      }
      for (const m of machines) {
        defeatEnemy(m);
        log(`Burn it, Link! ${D(m).name} is destroyed.`, 'good');
      }
    },
  },

  /* ── Defenders of Zion ── */
  DefendersOfZion_2Common: {
    // Mifune ("choose another player" — solo: only the class ability matters)
    onCombo(c) {
      addPending(c, 'defeatHand', 'Defeat a card in your hand');
    },
    pending: {
      async defeatHand() {
        if (!P().hand.length) return false;
        const sel = await ui().pick(P().hand, {
          title: 'Mifune',
          prompt: 'You may defeat a card in your hand.',
          min: 0,
          max: 1,
          skippable: true,
        });
        if (!sel.length) return false;
        defeatPlayerCard(sel[0], P().hand);
      },
    },
  },
  DefendersOfZion_3Common: {
    // Lock
    onCombo() {
      P().A += 2;
      log('Lock: +2 ⫻.', 'good');
    },
  },
  DefendersOfZion_4Uncommon: {
    // Zee
    async onPlay() {
      if (!P().discard.length) return;
      const sel = await ui().pick(P().discard, {
        title: 'Zee',
        prompt: 'You may defeat a card in your discard pile.',
        min: 0,
        max: 1,
        skippable: true,
      });
      if (sel.length) defeatPlayerCard(sel[0], P().discard);
    },
    onCombo(c) {
      addPending(c, 'rage', '+2 ⫻ per Hero defeated this turn');
    },
    pending: {
      rage() {
        const n = g().turn.heroesDefeated * 2;
        P().A += n;
        log(`Zee: +${n} ⫻ (${g().turn.heroesDefeated} Hero(es) defeated this turn).`, 'good');
      },
    },
  },
  // The Kid: recruit discount handled in effectiveRecruitCost (src/game.ts).

  /* ── Seraph (Extra Hero Group) ── */
  Act1ClubHelExtra_2Common: {
    // The Prodigal Child Returns
    onCombo() {
      const heroes = P().discard.filter(x => D(x).type === 'hero' || D(x).type === 'hovercraft');
      if (!heroes.length) {
        log('No Hero in your discard pile.');
        return;
      }
      const c = heroes[Math.floor(Math.random() * heroes.length)];
      P().discard.splice(P().discard.indexOf(c), 1);
      P().hand.push(c);
      log(`${D(c).name} returns to your hand.`, 'good');
    },
  },
  Act1ClubHelExtra_3Common: {
    // No Weapons Allowed in the Club
    async onCombo() {
      if (!P().hand.length) return;
      const sel = await ui().pick(P().hand, {
        title: 'No Weapons Allowed in the Club',
        prompt: 'Discard up to two cards from your hand, then draw that many.',
        min: 0,
        max: 2,
        skippable: true,
      });
      for (const c of sel) {
        P().hand.splice(P().hand.indexOf(c), 1);
        P().discard.push(c);
      }
      if (sel.length) drawCards(sel.length);
    },
  },
  Act1ClubHelExtra_4Uncommon: {
    // I Protect That Which Matters Most
    async onCombo() {
      await pickHealStrike('I Protect That Which Matters Most');
    },
  },
  Act1ClubHelExtra_1Rare: {
    // I Have Beaten You Before
    onPlay(c) {
      addPending(c, 'beat', 'Defeat an Enemy already in the Defeated Enemies pile');
    },
    pending: {
      async beat() {
        const names = new Set(g().defeatedEnemies.map(x => D(x).name));
        const finale = g().movie === 'revolutions' && g().act === 3 && g().part === 3;
        const zb = g().zionBlocker;
        const opts: CardInstance[] = [
          ...g().matrixRow.filter((x): x is CardInstance => !!x && x.faceUp),
          ...g().combatZone,
          ...g().realWorldEnemies,
          ...g().dockEnemies.filter((x): x is CardInstance => !!x),
          ...(zb ? [zb] : []),
        ].filter(
          x =>
            D(x).type === 'enemy' &&
            names.has(D(x).name) &&
            (finale || !D(x).kw.includes('Undefeatable')),
        );
        if (!opts.length) {
          log('No Enemy in play shares a name with the Defeated Enemies pile.');
          return false;
        }
        const sel = await ui().pick(opts, {
          title: 'I Have Beaten You Before',
          prompt: 'Defeat an Enemy with the same name as a defeated one.',
          min: 0,
          max: 1,
          skippable: true,
        });
        if (!sel.length) return false;
        defeatEnemy(sel[0]);
        log(`I have beaten you before — ${D(sel[0]).name} is defeated!`, 'good');
      },
    },
  },

  /* ══ Act 1: Club Hel ══ */
  Act1ClubHel_1: {
    // The Trainman
    async strike(c) {
      removeCard(c.uid);
      g().defeatedEnemies.push(c);
      log('THE TRAINMAN "escapes" into Mobil Ave!', 'act');
      await beginPart(1, 2);
    },
  },
  Act1ClubHel_2: {
    // Sati's Family
    reveal(c, where) {
      if (where === 'row') {
        drawCards(1);
        log("Sati's family wishes you well — you draw a card.", 'good');
      } else discardRandomFromHand(1);
    },
  },
  Act1ClubHel_3: {
    // The Merovingian
    fightBlock() {
      if (!g().flags.merovingianDeal)
        return 'The Merovingian can only be fought after you\'ve made the "deal" (Act 1 Part 2).';
      return null;
    },
    async strike() {
      log('The Merovingian says something obnoxious…', 'bad');
      discardRandomFromHand(1, x =>
        ['StarterThereIsNoSpoon', 'StarterUnplug'].includes(x.id),
      );
    },
    async onDefeat() {
      log('THE MEROVINGIAN IS DEFEATED! You get what you came for.', 'act');
      if (g().act === 1) await beginPart(2, 1);
    },
  },
  Act1ClubHel_4: {
    // Club Hel Guard (Flip180 movement handled by the engine)
    reveal(c) {
      c.flipped = true;
      log('The Club Hel Guard hangs from the ceiling — upside down (2 ⫻).');
    },
    fightCost: c => (c.flipped ? 2 : 4),
  },
  Act1ClubHel_5: {
    // Mobil Ave
    reveal() {
      P().rsi = 'ops';
      log(
        'MOBIL AVE: you are stuck in Operations — no scanning, fighting, recruiting or Coordinating. At the start of your next turn you return to the Matrix.',
        'bad',
      );
    },
  },

  /* ══ Act 2: The Battle of Zion ══ */
  Act2TheBattleOfZion_1: {
    // Sentinel Swarm
    reveal(c) {
      const i = g().dockEnemies.findIndex(x => !x);
      if (i < 0) return; // all five spaces already swarmed — it stays put
      removeCard(c.uid);
      const hero = g().dock[i];
      if (hero) {
        g().dock[i] = null;
        g().defeatedHeroes.push(hero);
        log(`The Sentinel Swarm shreds ${D(hero).name} in the Dock!`, 'bad');
      }
      g().dockEnemies[i] = c;
      log(`A SENTINEL SWARM occupies Dock space ${i + 1} — it can't be refilled.`, 'bad');
      return true;
    },
  },
  Act2TheBattleOfZion_2: {
    // Sentinel Hunter
    reveal(c) {
      removeCard(c.uid);
      g().realWorldEnemies.push(c);
      log('A SENTINEL HUNTER bursts into the Real World next to your Avatar!', 'bad');
      return true;
    },
    strike() {
      const heroes = P().discard.filter(
        x => (D(x).cost || 0) >= 1 && (D(x).type === 'hero' || D(x).type === 'hovercraft'),
      );
      if (heroes.length) {
        const victim = heroes[Math.floor(Math.random() * heroes.length)];
        defeatPlayerCard(victim, P().discard);
        log(`The Sentinel Hunter tears ${D(victim).name} out of your discard pile!`, 'bad');
      } else log('The Sentinel Hunter circles — nothing left to hunt this turn.');
    },
  },
  Act2TheBattleOfZion_3: {
    // Digger
    reveal(c) {
      removeCard(c.uid);
      g().zionBlocker = c;
      log("THE DIGGER bores into Zion — the Dock can't be refilled while it lives!", 'bad');
      return true;
    },
    fightBlock() {
      return g().act < 2 ? "The Digger can't be defeated until Act 2." : null;
    },
    strike() {
      zionDig();
    },
  },
  Act2TheBattleOfZion_4: {
    // Fly the Mechanical Line
    reveal(c) {
      removeCard(c.uid);
      g().flyLine = { card: c, pos: 0 };
      log(
        'FLY THE MECHANICAL LINE: while in the Real World, each Hovercraft you gain or play moves the run one space toward Zion.',
        'good',
      );
      return true;
    },
  },
  Act2TheBattleOfZion_5: {
    // Overwhelming Numbers
    async reveal() {
      log('OVERWHELMING NUMBERS — the machines pour in!', 'bad');
      for (let k = 0; k < 2; k++) {
        if (k === 1 && !g().matrixRow.some(x => !x)) break;
        const top = g().matrixDeck.pop();
        if (!top) break;
        await placeIntoRow(top, 4);
      }
    },
  },

  /* ══ Act 3: Everything That Has a Beginning ══ */
  Act3EverythingThatHasABeginning_1: {
    // Mobile Bomb
    reveal(c) {
      removeCard(c.uid);
      g().realWorldEnemies.push(c);
      log(
        c.scannedTurn === g().turnNo
          ? 'A MOBILE BOMB rolls in next to your Avatar — you scanned it, so it holds fire this turn.'
          : 'A MOBILE BOMB rolls in next to your Avatar!',
        'bad',
      );
      return true;
    },
    async strike(c) {
      if (c.scannedTurn === g().turnNo) {
        log('The Mobile Bomb ticks quietly… (scanned — it holds fire this turn).');
        return;
      }
      log('THE MOBILE BOMB EXPLODES — three Strikes!', 'bad');
      defeatEnemy(c);
      for (let i = 0; i < 3 && !g().gameOver; i++) await drawStrike({ source: c });
    },
  },
  [REV_SMITH]: {
    // Smith (Undefeatable, Stationary)
    async reveal(c, where) {
      if (where !== 'cz') return;
      subTime(1);
      if (g().gameOver) return true;
      removeCard(c.uid);
      let at = -1;
      for (let i = 4; i >= 0; i--) {
        if (g().matrixRow[i]?.id !== REV_SMITH) {
          at = i;
          break;
        }
      }
      if (at >= 0) {
        await placeIntoRow(c, at);
        log(`SMITH sneers and takes over the ${MXROW(at)}.`, 'bad');
      } else g().combatZone.unshift(c);
      return true;
    },
  },
  Act3EverythingThatHasABeginning_3: {
    // Bane
    reveal(c) {
      removeCard(c.uid);
      g().realWorldEnemies.push(c);
      log(
        "BANE stands over your body with a knife — you can't enter the Matrix while he lives!",
        'bad',
      );
      return true;
    },
    async strike(c) {
      log('Bane cuts the power…', 'bad');
      subTime(1);
      if (g().gameOver) return;
      log('…and strikes you!', 'bad');
      await drawStrike({ source: c });
    },
  },
  Act3EverythingThatHasABeginning_4: {
    // Make an Offer to Deus Ex Machina
    reveal(c) {
      removeCard(c.uid);
      g().realWorldEnemies.push(c); // rendered with the Real World cards
      log('MAKE AN OFFER TO DEUS EX MACHINA (7 ★ — Act 3, after Bane is defeated).', 'act');
      return true;
    },
    canComplete() {
      if (g().act < 3) return "This can't be completed until Act 3.";
      if (!g().flags.baneDefeated) return 'Bane must be defeated first.';
      return null;
    },
    async onComplete() {
      log('"What do you want?" — "Peace."', 'act');
      // Defeat all Enemies except Smith, everywhere.
      const zb = g().zionBlocker;
      const everywhere: CardInstance[] = [
        ...g().matrixRow.filter((x): x is CardInstance => !!x && x.faceUp),
        ...g().combatZone,
        ...g().realWorldEnemies,
        ...g().dockEnemies.filter((x): x is CardInstance => !!x),
        ...(zb ? [zb] : []),
      ].filter(x => D(x).type === 'enemy' && D(x).name !== 'Smith' && !isInevLocal(x));
      for (const e of everywhere) defeatEnemy(e);
      // Face-down Row cards: Smiths flip face up, the rest are defeated.
      for (let i = 0; i < 5; i++) {
        const rc = g().matrixRow[i];
        if (rc && !rc.faceUp) {
          if (rc.id === REV_SMITH) rc.faceUp = true;
          else {
            g().matrixRow[i] = null;
            g().defeatedEnemies.push(rc);
          }
        }
      }
      // Sift the Matrix deck: Smiths into clear Row spaces, the rest defeated.
      for (const dc of g().matrixDeck.splice(0)) {
        if (dc.id === REV_SMITH) {
          dc.faceUp = true;
          const at = g().matrixRow.findIndex(x => !x);
          if (at >= 0) g().matrixRow[at] = dc;
          else g().combatZone.unshift(dc);
        } else if (isInevLocal(dc)) {
          g().matrixDeck.push(dc); // handled below
        } else g().defeatedEnemies.push(dc);
      }
      log('The Agents, the machines, the whole system — everything burns away. Only the SMITHS remain.', 'act');
      // The Inevitable card flips to ORACLE-SMITH in the Combat Zone.
      const inev =
        g().matrixDeck.find(x => D(x).kw.includes('Inevitable')) ??
        g().combatZone.find(x => D(x).kw.includes('Inevitable')) ??
        null;
      if (inev) {
        removeCard(inev.uid);
        const di = g().matrixDeck.indexOf(inev);
        if (di >= 0) g().matrixDeck.splice(di, 1);
        inev.id = 'Act3EverythingThatHasABeginning_6B';
        inev.faceUp = true;
        g().combatZone.unshift(inev);
        log('The Destruction of Zion flips — the ORACLE-SMITH rises!', 'bad');
      }
      await beginPart(3, 2);
    },
  },
  Act3EverythingThatHasABeginning_5: {
    // The Unscorched Sky
    reveal(c, where) {
      if (where === 'row') {
        drawCards(2);
        log('The unscorched sky — hope! You draw two cards.', 'good');
      } else discardRandomFromHand(2);
    },
  },
  Act3EverythingThatHasABeginning_6B: {
    // Oracle-Smith
    async fight(c) {
      const sc = strikeDeckPop();
      if (!sc) return;
      g().strikeDiscard.push(sc);
      const dmg = D(sc).damage || 0;
      if (dmg > 0) {
        g().oracleSmithDamage += dmg;
        log(
          `You land ${D(sc).name} on the Oracle-Smith — ${g().oracleSmithDamage}/15 damage!`,
          'good',
        );
      } else log(`You flip ${D(sc).name} — no damage. He laughs.`, 'bad');
      if (g().oracleSmithDamage >= 15) {
        defeatEnemy(c);
        log('THE ORACLE-SMITH IS DEFEATED!', 'act');
        await beginPart(3, 3);
      }
    },
    async strike(c) {
      const bullet = avatar().speed;
      if (P().R >= bullet) {
        const dodge = await ui().confirmBox(
          'Oracle-Smith strikes',
          `Pay ${bullet} ★ (your speed) to avoid this Strike?`,
          `Pay ${bullet} ★`,
          'Take the Strike',
        );
        if (dodge) {
          P().R -= bullet;
          log(`You blur aside — the Strike is avoided (−${bullet} ★).`, 'good');
          return;
        }
      }
      log('The Oracle-Smith strikes you!', 'bad');
      await drawStrike({ source: c });
    },
  },
};

function isInevLocal(c: CardInstance): boolean {
  return D(c).kw.includes('Inevitable');
}
function MXROW(i: number): string {
  return ['Subway', 'Streets', 'Alley', 'Building', 'Rooftops'][i];
}
