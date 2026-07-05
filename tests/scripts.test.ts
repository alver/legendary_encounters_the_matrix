import { describe, expect, it } from 'vitest';
import { AVATARS, CARDS } from '../src/cards';
import { AVATAR_SCRIPTS, SCRIPTS } from '../src/scripts';

describe('script hooks reference real cards', () => {
  it('every SCRIPTS key is a card id', () => {
    for (const id of Object.keys(SCRIPTS)) expect(CARDS[id], id).toBeDefined();
  });

  it('every AVATAR_SCRIPTS key is an avatar id', () => {
    for (const id of Object.keys(AVATAR_SCRIPTS)) expect(AVATARS[id], id).toBeDefined();
  });
});
