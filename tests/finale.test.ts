// finale.test.ts — scripted end-game paths that the random bot rarely reaches:
// the Reloaded Tow Bomb showdown and the Revolutions Deletion Program.

import { expect, it } from 'vitest';
import {
  P,
  actDeletionMove,
  actFight,
  actReloadedTime,
  beginPart,
  g,
  mk,
  newGame,
  setUI,
  startTurn,
} from '../src/game';
import { SCRIPTS } from '../src/scripts';
import type { UIPort } from '../src/types';
import { botUI } from './bot';

// botUI that always picks the FIRST option (deterministic choices).
const firstUI: UIPort = {
  ...botUI,
  async chooseOption(t, p, options) {
    return options[0].value;
  },
  async confirmBox() {
    return true;
  },
};

it('reloaded finale: architect -> tow bomb -> major victory', async () => {
  setUI(firstUI);
  newGame('AvatarNiobe', {}, 'reloaded');
  await startTurn();
  // Jump to 3.2 (chooseOption[0] = re-enter the Matrix).
  await beginPart(3, 2);
  expect(g().act).toBe(3);
  expect(g().part).toBe(2);
  expect(P().rsi).toBe('matrix');
  // Clear the Matrix down to the Inevitable card and enter 3.3.
  g().matrixDeck = g().matrixDeck.filter(c => c.id === 'Act3TheSource_6A');
  g().matrixRow = [null, null, null, null, null];
  g().combatZone = [];
  expect(g().matrixDeck.length).toBe(1);
  await beginPart(3, 3);
  expect(P().rsi).toBe('real');
  const tow = g().realWorldEnemies.find(c => c.id === 'Act3TheSource_6B');
  expect(tow).toBeTruthy();
  // Gain ⚔ from the Time Track through two Neo Heroes, then blow them up.
  g().phase = 'action';
  g().turnEnding = false;
  g().time = 10;
  P().inPlay.push(mk('NeoReloaded_2Common'), mk('NeoReloaded_3Common'));
  await actReloadedTime('gain');
  expect(P().A).toBe(20);
  await actFight(tow!.uid);
  expect(g().gameOver?.win).toBe(true);
});

it('revolutions finale: make an offer -> oracle-smith -> deletion program', async () => {
  setUI(firstUI);
  newGame('AvatarNeoRevolutions', {}, 'revolutions');
  await startTurn();
  g().act = 3;
  g().part = 1;
  g().flags.baneDefeated = true;
  P().rsi = 'real';
  g().phase = 'action';
  // Stack the Matrix deck with the five Smiths + the Inevitable card, then
  // complete Make an Offer to Deus Ex Machina.
  g().matrixRow = [null, null, null, null, null];
  g().combatZone = [];
  g().matrixDeck = [
    mk('Act3EverythingThatHasABeginning_6A'),
    ...Array.from({ length: 5 }, () => mk('Act3EverythingThatHasABeginning_2')),
  ];
  const offer = mk('Act3EverythingThatHasABeginning_4');
  offer.faceUp = true;
  g().realWorldEnemies.push(offer);
  await SCRIPTS['Act3EverythingThatHasABeginning_4'].onComplete!(offer);
  expect(g().part).toBe(2);
  expect(P().rsi).toBe('matrix'); // chooseOption[0] = enter the Matrix one last time
  const smiths = g().matrixRow.filter(c => c?.id === 'Act3EverythingThatHasABeginning_2');
  expect(smiths.length).toBe(5);
  const oracleSmith = g().combatZone.find(c => c.id === 'Act3EverythingThatHasABeginning_6B');
  expect(oracleSmith).toBeTruthy();
  expect(g().zion.length).toBe(0); // Zion is gone
  // Grind the Oracle-Smith down with 15 damage worth of fights.
  g().phase = 'action';
  g().turnEnding = false;
  for (let i = 0; i < 60 && g().part !== 3; i++) {
    P().A += 5;
    await actFight(oracleSmith!.uid);
    g().turnEnding = false;
    g().phase = 'action';
  }
  expect(g().part).toBe(3);
  // The Deletion Program: walk the Time Track down to 3 — all Smiths cascade.
  g().phase = 'action';
  g().turnEnding = false;
  while (g().time > 3 && !g().gameOver) {
    P().R += g().time - 1;
    await actDeletionMove(-1);
  }
  expect(g().gameOver?.win).toBe(true);
});
