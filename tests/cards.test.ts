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

// Counts captured from the original js/cards.js at migration time.
describe('card database parity with the original JS data', () => {
  it('has the full card set', () => {
    expect(Object.keys(CARDS).length).toBe(87);
  });

  it('builds the standard decks', () => {
    expect(buildStarterDeck().length).toBe(13);
    expect(buildStrikeDeck().length).toBe(40);
    for (const group of ['Morpheus', 'Trinity', 'Tank', 'NebCrew', 'Neo'])
      expect(buildHeroGroup(group).length).toBe(14);
    expect(buildActMini('Act1').length).toBe(10);
    expect(buildActMini('Act2').length).toBe(11);
    expect(buildActMini('Act3').length).toBe(12); // 13 minus the Inevitable card
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
    for (const [key, act] of Object.entries(ACT_CARDS)) expect(act.image, key).toMatch(cdn);
  });

  it('keys every avatar by its own id and has all 7 act cards', () => {
    for (const [key, a] of Object.entries(AVATARS)) expect(a.id).toBe(key);
    expect(Object.keys(ACT_CARDS)).toEqual(['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3']);
  });
});
