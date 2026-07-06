import { beforeEach, describe, expect, it } from 'vitest';
import { setUI } from '../src/game';
import type { Movie } from '../src/types';
import { botGame, botUI, type BotResult } from './bot';

// SIM_GAMES=50 npm run sim  — heavier regression run (default 10 + 10 per film).
const N = Number(process.env.SIM_GAMES ?? 10);
const MOVIES: Movie[] = ['matrix', 'reloaded', 'revolutions'];

async function runGames(cheat: boolean, movie: Movie): Promise<BotResult[]> {
  const results: BotResult[] = [];
  for (let i = 0; i < N; i++) results.push(await botGame(cheat, movie));
  return results;
}

for (const movie of MOVIES) {
  describe(`headless bot sim — ${movie} (${N} games per mode)`, () => {
    beforeEach(() => setUI(botUI));

    it('plays full games without runtime errors', async () => {
      const results = await runGames(false, movie);
      for (const r of results) {
        expect(r.over, 'game must end').not.toBeNull();
        expect(r.over!.title).not.toBe('Turn cap');
      }
    });

    it('reaches the late Acts and the finale with the resource cheat', async () => {
      const results = await runGames(true, movie);
      for (const r of results) {
        expect(r.over, 'game must end').not.toBeNull();
        expect(r.over!.title).not.toBe('Turn cap');
      }
      // The cheat storms through the Acts — expect at least one game past Act 1.
      expect(results.some(r => r.act >= 2)).toBe(true);
    });
  });
}
