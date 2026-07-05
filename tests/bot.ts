// bot.ts — headless test bot, ported from the original tools/sim.js.
// A stubbed UIPort auto-answers every prompt and a simple rule-following bot
// plays full games. Goal: 0 runtime errors through all three Acts.

import { AVATARS } from '../src/cards';
import { MX } from '../src/version';
import { SCRIPTS } from '../src/scripts';
import {
  D,
  P,
  actCompleteChallenge,
  actEndPhase,
  actFight,
  actFreeNeo,
  actJump,
  actMove,
  actPending,
  actPlayCard,
  actRaiseTime,
  actRecruitDock,
  actRecruitHovercraft,
  actScan,
  fightBlockReason,
  g,
  inMatrix,
  newGame,
  startTurn,
} from '../src/game';
import type { GameOverState, UIPort } from '../src/types';

/* ── UI stub: auto-answers every prompt ── */
export const botUI: UIPort = {
  render() {},
  async showCard() {},
  async pick(items, opts = {}) {
    const min = opts.min ?? 1,
      max = opts.max ?? 1;
    const n = Math.max(min, Math.min(max, opts.skippable && Math.random() < 0.3 ? 0 : 1));
    return items.slice(0, n);
  },
  async chooseOption(t, p, options) {
    return options[Math.floor(Math.random() * options.length)].value;
  },
  async confirmBox() {
    return Math.random() < 0.7;
  },
};

async function botActionPhase(cheat: boolean) {
  if (cheat) {
    P().R += 12;
    P().A += 12;
  }
  let guard = 0;
  while (g().phase === 'action' && !g().gameOver && guard++ < 80) {
    let did = false;
    // 1. play every card in hand
    if (P().hand.length) {
      await actPlayCard(P().hand[0].uid);
      continue;
    }
    // 2. resolve pendings
    if (g().pending.length) {
      await actPending(0);
      continue;
    }
    // 3. finale: raise the time track
    if (g().act === 3 && g().part === 3 && g().time < 10 && P().A >= g().time + 1) {
      await actRaiseTime();
      continue;
    }
    // 4. real-world enemies (Cypher!)
    for (const c of g().realWorldEnemies) {
      if (!fightBlockReason(c)) {
        await actFight(c.uid);
        did = true;
        break;
      }
    }
    if (did) continue;
    // 5. free Neo / jump
    if (
      g().act === 1 &&
      g().part === 2 &&
      P().rsi === 'real' &&
      (P().inPlay.some(x => D(x).type === 'hovercraft') || g().turn.gainedHovercraft)
    ) {
      await actFreeNeo();
      continue;
    }
    if (g().attached.building && inMatrix() && !g().matrixRow[3]) {
      await actJump();
      continue;
    }
    // 6. challenges
    if (inMatrix()) {
      const inPlayCards = [
        ...g().operations,
        ...g().combatZone,
        ...g().matrixRow.filter(x => x !== null),
      ];
      for (const c of inPlayCards) {
        if (D(c).type !== 'challenge' || !c.faceUp) continue;
        const s = SCRIPTS[c.id];
        if (s && s.canComplete && s.canComplete(c)) continue;
        const def = D(c);
        const ok = def.defeatType === 'R' ? P().R >= (def.defeat || 0) : P().A >= (def.defeat || 0);
        if (ok) {
          await actCompleteChallenge(c.uid);
          did = true;
          break;
        }
      }
      if (did) continue;
      // 7. fight anything fightable
      for (const c of [...g().combatZone, ...g().matrixRow.filter(x => x !== null)]) {
        if (D(c).type === 'enemy' && c.faceUp && !fightBlockReason(c)) {
          await actFight(c.uid);
          did = true;
          break;
        }
      }
      if (did) continue;
      // 8. scan the cheapest face-down space
      if (!g().turn.noScan) {
        for (const i of [0, 1, 2, 3, 4]) {
          const c = g().matrixRow[i];
          if (c && !c.faceUp && P().A >= MX.SCAN_COST[i]) {
            await actScan(i);
            did = true;
            break;
          }
        }
      }
      if (did) continue;
    } else {
      // Real World: recruit
      if (g().hovercraftStack.length && P().R >= 3 && Math.random() < 0.6) {
        await actRecruitHovercraft();
        continue;
      }
      for (let i = 0; i < 5; i++) {
        const c = g().dock[i];
        if (c && P().R >= (D(c).cost ?? 0)) {
          await actRecruitDock(i);
          did = true;
          break;
        }
      }
      if (did) continue;
    }
    // 9. move once per turn
    if (!g().turn.freeMoveUsed) {
      const before = P().rsi;
      await actMove();
      if (P().rsi !== before) {
        continue;
      }
    }
    break;
  }
  if (g().phase === 'action' && !g().gameOver) await actEndPhase();
}

export interface BotResult {
  avatar: string;
  over: GameOverState | null;
  turns: number;
  act: number;
  part: number;
  time: number;
}

export async function botGame(cheat: boolean): Promise<BotResult> {
  const ids = Object.keys(AVATARS).filter(a => !AVATARS[a].hidden);
  const av = ids[Math.floor(Math.random() * ids.length)];
  newGame(av, {});
  await startTurnLoop(cheat);
  return {
    avatar: av,
    over: g().gameOver,
    turns: g().turnNo,
    act: g().act,
    part: g().part,
    time: g().time,
  };
}
// Drive turns iteratively: startTurn stops at the action phase.
async function startTurnLoop(cheat: boolean) {
  await startTurn();
  let guard = 0;
  while (!g().gameOver && guard++ < 250) {
    if (g().phase !== 'action') break;
    await botActionPhase(cheat); // ends with actEndPhase → next turn's action phase
  }
  if (!g().gameOver && guard >= 250)
    g().gameOver = { win: false, title: 'Turn cap', sub: 'sim cap reached' };
}
