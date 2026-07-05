import { beforeEach, describe, expect, it } from 'vitest';
import { setUI } from '../src/game';
import { botGame, botUI, type BotResult } from './bot';

// SIM_GAMES=50 npm run sim  — heavier regression run (default 10 + 10).
const N = Number(process.env.SIM_GAMES ?? 10);

async function runGames(cheat: boolean): Promise<BotResult[]> {
  const results: BotResult[] = [];
  for (let i = 0; i < N; i++) results.push(await botGame(cheat));
  return results;
}

describe(`headless bot sim (${N} games per mode)`, () => {
  beforeEach(() => setUI(botUI));

  it('plays full games without runtime errors', async () => {
    const results = await runGames(false);
    for (const r of results) {
      expect(r.over, 'game must end').not.toBeNull();
      expect(r.over!.title).not.toBe('Turn cap');
    }
  });

  it('reaches the late Acts and the finale with the resource cheat', async () => {
    const results = await runGames(true);
    for (const r of results) {
      expect(r.over, 'game must end').not.toBeNull();
      expect(r.over!.title).not.toBe('Turn cap');
    }
    // The cheat storms through the Acts — expect at least one game past Act 1.
    expect(results.some(r => r.act >= 2)).toBe(true);
  });
});
