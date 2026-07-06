// scriptsShared.ts — helpers shared by the per-film script modules
// (scripts.ts, scriptsReloaded.ts, scriptsRevolutions.ts).

import { D, P, freeScan, g, healStrike, log, ui } from './game';
import type { CardInstance } from './types';

export async function pickHealStrike(title: string, filter?: (c: CardInstance) => boolean) {
  const opts = P().strikes.filter(filter || (() => true));
  if (!opts.length) {
    log('No Strike to heal.');
    return false;
  }
  const sel = await ui().pick(opts, {
    title,
    prompt: 'Choose a Strike to heal.',
    min: 0,
    max: 1,
    skippable: true,
  });
  if (!sel.length) return false;
  healStrike(sel[0]);
  return true;
}

export async function optionalFreeScan(prompt: string) {
  const fd = g()
    .matrixRow.map((c, i) => (c && !c.faceUp ? i : -1))
    .filter(i => i >= 0);
  if (!fd.length) return false;
  const sel = await ui().pick(
    fd.map(i => ({ uid: 'sp' + i, id: null, spaceIdx: i })),
    {
      title: 'Scan any space',
      prompt,
      min: 0,
      max: 1,
      skippable: true,
      spaces: true,
    },
  );
  if (!sel.length) return false;
  await freeScan(sel[0].spaceIdx);
  return true;
}

// "…scan any space. If there are no face-down cards, draw a card instead."
export async function scanAnyOrDraw(drawCards: (n: number) => void) {
  const fd = g().matrixRow.some(c => c && !c.faceUp);
  if (fd) await optionalFreeScan('You may scan any space (free).');
  else {
    drawCards(1);
    log('No face-down cards — you draw a card instead.', 'good');
  }
}

// A Neo Hero in your play area? (groups Neo / NeoReloaded / NeoRevolutions)
export function neoInPlay(): boolean {
  return P().inPlay.some(c => D(c).group?.startsWith('Neo'));
}
