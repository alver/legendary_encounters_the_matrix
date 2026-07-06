// cardsCore.ts — the card registry shared by the per-film card modules
// (cards.ts, cardsReloaded.ts, cardsRevolutions.ts). Kept separate so those
// modules can all import C() without circular-import TDZ problems.

import { CARD_IMAGE_URLS } from './cardImages';
import type { CardDef, CardDefInput } from './types';

// Card art comes from legendarycardgame.com's CDN (see cardImages.ts) so the
// scans don't have to be bundled. The BASE_URL fallback covers ids without a
// CDN entry — served from public/cards/ if you keep local copies there.
export const IMG = (id: string): string =>
  CARD_IMAGE_URLS[id] || `${import.meta.env.BASE_URL}cards/${id}.jpg`;

export const CARDS: Record<string, CardDef> = {};
export function C(input: CardDefInput): CardDef {
  const def = input as CardDef;
  def.recruit = def.recruit || 0;
  def.attack = def.attack || 0;
  def.cost = def.cost != null ? def.cost : null;
  def.kw = def.kw || [];
  def.copies = def.copies != null ? def.copies : 1;
  def.image = def.image || IMG(def.id);
  CARDS[def.id] = def;
  return def;
}
