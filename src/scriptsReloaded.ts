// scriptsReloaded.ts — per-card behaviour for the second film ("The Matrix
// Reloaded"): its Hero Groups (incl. the Morpheus / Trinity groups shared with
// Revolutions), the Keymaker, the Act mini-decks, and the Reloaded /
// Revolutions Avatars. Merged into SCRIPTS / AVATAR_SCRIPTS in scripts.ts.

import { CARDS } from './cardsCore';
import {
  D,
  P,
  addPending,
  beginPart,
  deckTop,
  defeatEnemy,
  defeatPlayerCard,
  drawCards,
  effectMoveToRealWorld,
  enemyStrikesPlayer,
  g,
  gainCard,
  gameOver,
  healStrike,
  inPlayOfClass,
  log,
  placeIntoRow,
  refillDock,
  removeCard,
  strikeDeckPop,
  subTime,
  ui,
} from './game';
import { neoInPlay, scanAnyOrDraw } from './scriptsShared';
import type { AvatarScript, CardInstance, ScriptHooks } from './types';

/* ─────────── helpers ─────────── */
function moveChallengeToOps(c: CardInstance) {
  removeCard(c.uid);
  g().operations.push(c);
  log('Challenge moved to Operations.');
  return true;
}
// The Source: completing the first Challenge starts the countdown.
function armSourceDeadline() {
  if (g().flags.sourceDeadlineTurn != null) return;
  g().flags.sourceDeadlineTurn = g().turnNo + 1;
  log(
    'The countdown starts — the remaining Source Challenges must be completed THIS TURN, before your next turn begins!',
    'bad',
  );
}
async function healUpTo(title: string, n: number) {
  if (!P().strikes.length) return;
  const sel = await ui().pick(P().strikes, {
    title,
    prompt: `Heal up to ${n} Strike${n > 1 ? 's' : ''}.`,
    min: 0,
    max: n,
    skippable: true,
  });
  for (const s of sel) healStrike(s);
}

/* ═══════════════ SCRIPTS (Reloaded) ═══════════════ */
export const SCRIPTS_RELOADED: Record<string, ScriptHooks> = {
  /* ── Neo (Reloaded) ── */
  NeoReloaded_2Common: {
    // Brawl
    onCombo() {
      const n = 1 + g().combatZone.filter(x => D(x).type === 'enemy').length;
      P().A += n;
      log(`Brawl: +${n} ⫻ (1 + Enemies in the Combat Zone).`, 'good');
    },
  },
  NeoReloaded_3Common: {
    // Doing His Superman Thing
    onPlay(c) {
      addPending(c, 'move', 'Move to the Real World');
    },
    async onCombo() {
      await scanAnyOrDraw(drawCards);
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
  NeoReloaded_4Uncommon: {
    // The Bullet Is Still Inside
    async onCombo() {
      await healUpTo('The Bullet Is Still Inside', inPlayOfClass('U'));
    },
  },
  NeoReloaded_1Rare: {
    // I'll Handle Them
    onCombo() {
      const n = inPlayOfClass('S');
      g().turn.avoidNextStrikes += n;
      g().turn.enemyDebuff += n;
      log(`I'll Handle Them: avoid the next ${n} Strike(s); Enemies have −${n} ⫻ this turn.`, 'good');
    },
  },

  /* ── Morpheus (Reloaded/Revolutions) ── */
  MorpheusRelRev_2Common: {
    onCombo() {
      drawCards(1);
      log('Some of You Believe as I Believe: you draw a card.', 'good');
    },
  },
  MorpheusRelRev_3Common: {
    // Towering Leap
    onPlay() {
      g().turn.deckTopGains++;
      log('Towering Leap: once this turn, a gained Hero may go on top of your deck.', 'good');
    },
  },
  MorpheusRelRev_4Uncommon: {
    // Zion, Hear Me!
    onCombo() {
      const n = inPlayOfClass('I');
      P().R += n;
      log(`Zion, Hear Me!: +${n} ★ (per Intellect Hero in play).`, 'good');
    },
  },
  // Fight Through Hel: plain Coordinate in solo (its return-to-hand clause
  // only matters when Coordinated to another player).

  /* ── Trinity (Reloaded/Revolutions) ── */
  TrinityRelRev_2Common: {
    onCombo() {
      P().A += 2;
      log('Scorpion Kick: +2 ⫻.', 'good');
    },
  },
  TrinityRelRev_3Common: {
    // She Is Going to Die (not optional)
    onPlay() {
      const top = deckTop();
      if (!top) return;
      if (top.id === 'StarterFreeYourMind') {
        P().discard.push(top);
        log('She Is Going to Die: Free Your Mind is discarded (not defeated).');
      } else {
        defeatPlayerCard(top, [top]);
        log(`She Is Going to Die: ${D(top).name} is defeated from the top of your deck.`, 'bad');
      }
    },
  },
  TrinityRelRev_4Uncommon: {
    onCombo() {
      const n = inPlayOfClass('R');
      P().A += n;
      log(`You Always Told Me to Stay Off the Freeway: +${n} ⫻.`, 'good');
    },
  },
  TrinityRelRev_1Rare: {
    // You Give Me Neo or We All Die
    onPlay(c) {
      addPending(c, 'gainNeo', 'Gain a Neo Hero from the Dock');
    },
    pending: {
      async gainNeo() {
        const opts = g().dock.filter(
          (x): x is CardInstance => !!x && !!D(x).group?.startsWith('Neo'),
        );
        if (!opts.length) {
          log('No Neo Hero in the Dock.');
          return false;
        }
        const sel = await ui().pick(opts, {
          title: 'You Give Me Neo or We All Die',
          prompt: 'You may gain a Neo Hero from the Dock.',
          min: 0,
          max: 1,
          skippable: true,
        });
        if (!sel.length) return false;
        const i = g().dock.findIndex(x => x && x.uid === sel[0].uid);
        g().dock[i] = null;
        gainCard(sel[0]);
        refillDock(i);
        log(`You gain ${D(sel[0]).name}.`, 'good');
      },
    },
  },

  /* ── Ship Captains ── */
  ShipCaptains_2Common: {
    // Soren
    onCombo(c) {
      addPending(c, 'defeat', 'Defeat a card in your play area / discard');
    },
    pending: {
      async defeat() {
        const opts = [...P().inPlay, ...P().discard];
        if (!opts.length) return false;
        const sel = await ui().pick(opts, {
          title: 'Soren',
          prompt: 'You may defeat a card in your play area or discard pile.',
          min: 0,
          max: 1,
          skippable: true,
        });
        if (!sel.length) return false;
        defeatPlayerCard(sel[0]);
      },
    },
  },
  ShipCaptains_3Common: {
    // Roland
    onPlay(c) {
      addPending(c, 'healRandom', 'Heal a random Strike');
    },
    pending: {
      healRandom() {
        if (!P().strikes.length) {
          log('No Strike to heal.');
          return false;
        }
        const s = P().strikes[Math.floor(Math.random() * P().strikes.length)];
        healStrike(s);
      },
    },
  },
  // Ballard: Coordinate that bypasses the once-per-turn limit — handled in
  // actCoordinate (src/game.ts).
  ShipCaptains_1Rare: {
    // Ice
    onCombo() {
      const n = inPlayOfClass('T');
      drawCards(n);
      log(`Ice: you draw ${n} card(s).`, 'good');
    },
  },

  /* ── I Love Candy (Oracle gift) ── */
  Act1TheOraclesCallExtra_1: {
    async onPlay() {
      drawCards(1);
      if (!P().strikes.length) return;
      const lowest = P().strikes.reduce((a, b) =>
        (D(a).damage || 0) <= (D(b).damage || 0) ? a : b,
      );
      healStrike(lowest);
    },
  },

  /* ══ Act 1: The Oracle's Call ══ */
  Act1TheOraclesCall_1: {
    // Upgrades: free while a Neo Hero is in your play area
    fightCost: (c, base) => (neoInPlay() ? 0 : base),
  },
  Act1TheOraclesCall_2: {
    // Seraph: "You do not truly know someone until you fight them."
    fight(c) {
      const sc = strikeDeckPop();
      if (!sc) return;
      g().strikeDiscard.push(sc);
      const extra = D(sc).damage || 0;
      if (extra === 0) {
        defeatEnemy(c);
        log(`You flip ${D(sc).name} (0 damage) — Seraph yields. He is defeated!`, 'good');
      } else if (P().A >= extra) {
        P().A -= extra;
        defeatEnemy(c);
        log(`You flip ${D(sc).name} — you pay ${extra} more ⫻ and defeat Seraph!`, 'good');
      } else {
        log(`You flip ${D(sc).name} — Seraph gets +${extra} ⫻ and you can't keep up. He stays.`, 'bad');
      }
    },
  },
  Act1TheOraclesCall_3: {
    // Crisis Meeting
    canComplete() {
      const groups = new Set(
        g()
          .dock.filter((x): x is CardInstance => !!x)
          .map(x => D(x).group),
      );
      if (groups.size < 4)
        return `You need at least four different Hero Groups in the Dock (now: ${groups.size}).`;
      return null;
    },
    strike() {
      log('The Crisis Meeting drags on…', 'bad');
      subTime(1);
    },
  },
  Act1TheOraclesCall_4: {
    // Backdoor
    reveal(c, where) {
      removeCard(c.uid);
      const idx = where === 'cz' ? 3 : g().matrixRow.findIndex(x => x && x.uid === c.uid);
      const at = idx >= 0 ? idx : 3;
      g().backdoors[at] = c;
      log(
        `A BACKDOOR is attached to the ${['Subway', 'Streets', 'Alley', 'Building', 'Rooftops'][at]} — you may pay ★ instead of ⫻ to scan there.`,
        'good',
      );
      return true;
    },
  },
  Act1TheOraclesCall_5: {
    // Find the Oracle
    reveal: moveChallengeToOps,
    canComplete() {
      return 'Pay ★ to scan a Backdoor space with a face-down card, then walk through.';
    },
  },
  Act1TheOraclesCall_6: {
    // The Machines Are Digging (gain; effect on draw — see drawCards)
    reveal(c) {
      removeCard(c.uid);
      gainCard(c);
      log('THE MACHINES ARE DIGGING… the card burrows into your deck.', 'bad');
      return true;
    },
  },
  Act1TheOraclesCall_7: {
    // We're Already Late
    reveal(c, where) {
      if (where === 'cz') {
        log("We're already late!", 'bad');
        subTime(3);
      } else log("We're Already Late — but you caught it in time. No effect.");
    },
  },
  Act1TheOraclesCallExtra_2: {
    // Smith (Act 1 Extra): max one Smith fight per turn without a Neo
    fightBlock() {
      if (g().turn.smithsFought >= 1 && !neoInPlay())
        return "You can't fight more than one Smith each turn (unless a Neo Hero is in your play area).";
      return null;
    },
  },

  /* ══ Act 2: Free the Keymaker ══ */
  Act2FreeTheKeymaker_1: {
    // Persephone's Kiss
    reveal: moveChallengeToOps,
    canComplete() {
      if (g().act !== 2) return 'Only during Act 2.';
      if (!neoInPlay()) return 'You need a Neo Hero in your play area to kiss Persephone.';
      return null;
    },
    async onComplete() {
      log('"Kiss me as if you were kissing her." Persephone leads you to the Keymaker.', 'act');
      await beginPart(2, 2);
    },
  },
  Act2FreeTheKeymaker_2: { noStrike: true }, // The Merovingian (falls with his Henchmen)
  Act2FreeTheKeymaker_3: {
    // Merovingian's Henchman: +2 ⫻ while he watches from the Combat Zone
    fightCost(c, base) {
      const inCZ = g().combatZone.some(x => x.uid === c.uid);
      const meroCZ = g().combatZone.some(x => x.id === 'Act2FreeTheKeymaker_2');
      return inCZ && meroCZ ? base + 2 : base;
    },
  },
  Act2FreeTheKeymaker_4: {
    // Twin
    async reveal(c, where) {
      if (where !== 'row') return;
      removeCard(c.uid);
      g().combatZone.unshift(c);
      log('The TWIN phases out — and reappears in the Combat Zone!', 'bad');
      return true;
    },
    async fight(c) {
      if (g().combatZone.some(x => x.uid === c.uid)) {
        removeCard(c.uid);
        await placeIntoRow(c, 2);
        log('The Twin phases away from your blows — he reappears in the Alley!', 'bad');
      } else {
        defeatEnemy(c);
        log('The Twin is defeated!', 'good');
      }
    },
  },
  Act2FreeTheKeymaker_5: {
    // Stranded
    reveal() {
      g().turn.noMatrixMove = true;
      log("Stranded: you can't enter or leave the Matrix this turn.", 'bad');
    },
  },
  Act2FreeTheKeymaker_6: {
    // Cause and Effect ("when you draw this" — see drawCards)
    reveal(c, where) {
      if (where === 'row') {
        removeCard(c.uid);
        gainCard(c);
        log('Cause and Effect — you gain it.', 'good');
        return true;
      }
      log('Cause and Effect is defeated.');
    },
  },

  /* ══ Act 3: The Source ══ */
  // Agent: Double Strike + Buy Time are engine keywords.
  Act3TheSource_2: {
    // Smith: +1 ⫻ per Smith already in the Defeated Enemies pile
    fightCost: (c, base) =>
      base + g().defeatedEnemies.filter(x => D(x).name === 'Smith').length,
  },
  Act3TheSource_3: {
    // Destroy the Power Station
    reveal: moveChallengeToOps,
    canComplete() {
      return g().act < 3 ? "This can't be completed until Act 3." : null;
    },
    onComplete() {
      g().flags.powerStationDone = true;
      log('THE POWER STATION IS DESTROYED!', 'act');
      armSourceDeadline();
    },
  },
  Act3TheSource_5: {
    // Deactivate the Emergency System
    reveal: moveChallengeToOps,
    canComplete() {
      return g().act < 3 ? "This can't be completed until Act 3." : null;
    },
    onComplete() {
      g().flags.emergencyDone = true;
      log('THE EMERGENCY SYSTEM IS DOWN!', 'act');
      armSourceDeadline();
    },
  },
  Act3TheSource_4: {
    // Open the Door
    reveal: moveChallengeToOps,
    canComplete() {
      if (g().act < 3) return "This can't be completed until Act 3.";
      if (!g().flags.powerStationDone || !g().flags.emergencyDone)
        return 'Destroy the Power Station and Deactivate the Emergency System first.';
      const key = P().inPlay.some(c => D(c).group === 'Keymaker');
      const neoFallback = !g().flags.keymakerInGame && neoInPlay();
      if (!key && !neoFallback)
        return g().flags.keymakerInGame
          ? 'You need a Keymaker Hero in your play area.'
          : 'You need a Keymaker (or Neo) Hero in your play area.';
      return null;
    },
    async onComplete() {
      log('THE DOOR TO THE SOURCE OPENS…', 'act');
      await beginPart(3, 2);
    },
  },
  Act3TheSource_6B: {
    // Tow Bomb Sentinels
    async strike(c) {
      const hovs = P().inPlay.filter(x => D(x).type === 'hovercraft');
      if (hovs.length) {
        const sel = await ui().pick(hovs, {
          title: 'Tow Bomb Sentinels',
          prompt: 'The Sentinels destroy one of your Hovercrafts instead of striking.',
          min: 1,
          max: 1,
        });
        const victim = sel[0] || hovs[0];
        defeatPlayerCard(victim, P().inPlay);
        log(`The Sentinels tear ${D(victim).name} apart!`, 'bad');
        return;
      }
      log('The Tow Bomb Sentinels swarm you — three strikes!', 'bad');
      for (let i = 0; i < 3 && !g().gameOver; i++) await enemyStrikesPlayer(c);
    },
    async onDefeat() {
      await ui().showCard(
        CARDS['Act3TheSource_6B'].image,
        'The Tow Bomb Sentinels are destroyed',
      );
      gameOver(
        true,
        'MAJOR VICTORY — but at what cost?',
        "Neo somehow forces the Sentinels to shut down… and falls into a coma. The Nebuchadnezzar is gone, and the Prophecy of The One was a lie. TO BE CONCLUDED…",
      );
    },
  },
};

/* ═══════════════ Avatar Act abilities (Reloaded / Revolutions) ═══════════════ */
async function morpheusLook(n: number) {
  const cards: CardInstance[] = [];
  for (let i = 0; i < n; i++) {
    const t = deckTop();
    if (t) cards.push(t);
  }
  if (cards.length) {
    const sel = await ui().pick(cards, {
      title: 'I Do Not Believe In Chance',
      prompt: `Top ${cards.length} card(s) of your deck — discard any; the rest go back on top.`,
      min: 0,
      max: cards.length,
      skippable: true,
    });
    for (const c of sel) P().discard.push(c);
    const rest = cards.filter(c => !sel.includes(c));
    for (const c of rest.reverse()) P().deck.push(c);
  }
  drawCards(1);
  log('Morpheus: draw a card.', 'good');
}
async function niobeGain(deckTopOpt: boolean, draw: boolean) {
  const opts = g().dock.filter((x): x is CardInstance => !!x && (D(x).cost ?? 0) <= 4);
  if (opts.length) {
    const sel = await ui().pick(opts, {
      title: 'Give Me Full Power',
      prompt: 'You may gain a Hero with cost 4 or less from the Dock.',
      min: 0,
      max: 1,
      skippable: true,
    });
    if (sel.length) {
      const i = g().dock.findIndex(x => x && x.uid === sel[0].uid);
      g().dock[i] = null;
      let dest: 'discard' | 'deckTop' = 'discard';
      if (
        deckTopOpt &&
        (await ui().confirmBox('Niobe', `Put ${D(sel[0]).name} on top of your deck?`, 'Deck top', 'Discard'))
      )
        dest = 'deckTop';
      gainCard(sel[0], dest);
      refillDock(i);
      log(`Niobe gains ${D(sel[0]).name}.`, 'good');
    }
  } else log('No Hero with cost 4 or less in the Dock.');
  if (draw) drawCards(1);
}
async function sorenShips(act: number) {
  drawCards(1);
  if (act === 1) {
    if (g().hovercraftStack.length) {
      const c = g().hovercraftStack.pop()!;
      c.faceUp = true;
      gainCard(c);
      log(`Soren: you gain ${D(c).name} from the Hovercraft stack.`, 'good');
    } else log('No Hovercrafts left in the stack.');
    return;
  }
  const hovs = P().discard.filter(x => D(x).type === 'hovercraft');
  if (hovs.length) {
    const sel = await ui().pick(hovs, {
      title: 'Three Ships, Three Captains',
      prompt: 'Put a Hovercraft from your discard pile into your hand.',
      min: 0,
      max: 1,
      skippable: true,
    });
    if (sel.length) {
      P().discard.splice(P().discard.indexOf(sel[0]), 1);
      P().hand.push(sel[0]);
      log(`${D(sel[0]).name} returns to your hand.`, 'good');
    }
  } else log('No Hovercraft in your discard pile.');
  if (act === 3) drawCards(1);
}
async function rolandMove(extraDraw: boolean) {
  drawCards(extraDraw ? 2 : 1);
  if (P().rsi !== 'real') {
    const ok = await ui().confirmBox(
      'Roland',
      'Move to the Real World?',
      'Move',
      'Stay',
    );
    if (ok) effectMoveToRealWorld();
  }
}
async function neoRevChoice(r: number, a: number) {
  drawCards(1);
  const v = await ui().chooseOption('Because I Choose To', 'Choose:', [
    { label: `+${r} ★`, value: 'R' },
    { label: `+${a} ⫻`, value: 'A' },
  ]);
  if (v === 'R') {
    P().R += r;
    log(`Neo: +${r} ★.`, 'good');
  } else {
    P().A += a;
    log(`Neo: +${a} ⫻.`, 'good');
  }
}

export const AVATAR_SCRIPTS_RELREV: Record<string, AvatarScript> = {
  AvatarNeoReloaded: {
    1: async () => {
      drawCards(1);
      await healUpTo("I Can't Lose You", 1);
    },
    2: async () => {
      drawCards(1);
      await healUpTo("I Can't Lose You", 2);
    },
    3: async () => {
      drawCards(1);
      await healUpTo("I Can't Lose You", 3);
    },
  },
  AvatarMorpheusRelRev: {
    1: () => morpheusLook(1),
    2: () => morpheusLook(2),
    3: () => morpheusLook(3),
  },
  AvatarTrinityRelRev: {
    1: () => {
      P().A += 2;
      drawCards(1);
      log('Trinity: +2 ⫻, draw a card.', 'good');
    },
    2: () => {
      P().A += 3;
      drawCards(1);
      log('Trinity: +3 ⫻, draw a card.', 'good');
    },
    3: () => {
      P().A += 4;
      drawCards(1);
      log('Trinity: +4 ⫻, draw a card.', 'good');
    },
  },
  AvatarNeoRevolutions: {
    1: () => neoRevChoice(1, 1),
    2: () => neoRevChoice(2, 3),
    3: () => neoRevChoice(3, 3),
  },
  AvatarNiobe: {
    1: () => niobeGain(false, false),
    2: () => niobeGain(true, false),
    3: () => niobeGain(true, true),
  },
  AvatarSoren: {
    1: () => sorenShips(1),
    2: () => sorenShips(2),
    3: () => sorenShips(3),
  },
  AvatarRoland: {
    1: () => rolandMove(false),
    2: () => rolandMove(false),
    3: () => rolandMove(true),
  },
};
