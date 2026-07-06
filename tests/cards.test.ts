import { describe, expect, it } from 'vitest';
import {
  ACT_CARDS,
  AVATARS,
  CARDS,
  buildActMini,
  buildHeroGroup,
  buildStarterDeck,
  buildStrikeDeck,
} from '../src/cards';
import type { Movie } from '../src/types';

const PART_KEYS = ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3'];
const MOVIES: Movie[] = ['matrix', 'reloaded', 'revolutions'];

// Counts captured from the original js/cards.js at migration time (first film)
// plus the Reloaded / Revolutions sets from the Sorting Guide.
describe('card database parity with the Sorting Guide', () => {
  it('has the full card set', () => {
    expect(Object.keys(CARDS).length).toBe(167);
  });

  it('builds the standard decks', () => {
    expect(buildStarterDeck().length).toBe(13);
    expect(buildStrikeDeck().length).toBe(40);
    // 12 regular Hero Groups + the 3 Extra groups, 14 cards each.
    for (const group of [
      'Morpheus',
      'Trinity',
      'Tank',
      'NebCrew',
      'Neo',
      'NeoReloaded',
      'MorpheusRelRev',
      'TrinityRelRev',
      'ShipCaptains',
      'NeoRevolutions',
      'Niobe',
      'Link',
      'DefendersOfZion',
      'Keymaker',
      'Seraph',
    ])
      expect(buildHeroGroup(group).length, group).toBe(14);
    expect(buildActMini('Act1').length).toBe(10);
    expect(buildActMini('Act2').length).toBe(11);
    expect(buildActMini('Act3').length).toBe(12); // 13 minus the Inevitable card
    expect(buildActMini('RelAct1').length).toBe(10);
    expect(buildActMini('RelAct2').length).toBe(11);
    expect(buildActMini('RelAct3').length).toBe(12); // 13 minus the Inevitable card
    expect(buildActMini('RevAct1').length).toBe(10);
    expect(buildActMini('RevAct2').length).toBe(11);
    expect(buildActMini('RevAct3').length).toBe(12); // 13 minus the Inevitable card
  });

  it('gives every card a CDN image URL and defaults', () => {
    const cdn = /^https:\/\/images\.squarespace-cdn\.com\/.+\.jpg\?format=\d+w$/;
    for (const def of Object.values(CARDS)) {
      expect(def.image, def.id).toMatch(cdn);
      expect(def.kw).toBeInstanceOf(Array);
      expect(typeof def.recruit).toBe('number');
      expect(typeof def.attack).toBe('number');
    }
    for (const a of Object.values(AVATARS)) expect(a.image, a.id).toMatch(cdn);
    for (const movie of MOVIES)
      for (const [key, act] of Object.entries(ACT_CARDS[movie]))
        expect(act.image, `${movie} ${key}`).toMatch(cdn);
  });

  it('keys every avatar by its own id, tagged with its films', () => {
    for (const [key, a] of Object.entries(AVATARS)) {
      expect(a.id).toBe(key);
      expect(a.movies.length, key).toBeGreaterThan(0);
    }
    // 6 selectable avatars per film.
    for (const movie of MOVIES)
      expect(
        Object.values(AVATARS).filter(a => !a.hidden && a.movies.includes(movie)).length,
        movie,
      ).toBe(6);
  });

  it('has all 7 act cards for each film', () => {
    for (const movie of MOVIES) expect(Object.keys(ACT_CARDS[movie])).toEqual(PART_KEYS);
  });
});
