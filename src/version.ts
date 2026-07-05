// version.ts — global constants for the Matrix build.

import type { CardClass } from './types';

export const MX = {
  VERSION: '1.0.0',
  TIME_TRACK_START: 10,
  HAND_SIZE: 6,
  ROW_NAMES: ['Subway', 'Streets', 'Alley', 'Building', 'Rooftops'], // left → right
  SCAN_COST: [2, 2, 3, 3, 4],
  PHONE_SPACES: [0, 2], // Subway + Alley
  COMBAT_PHONE_COST: 3, // {R} to exit via Combat Zone phone
  COMBAT_PHONE_BLOCKED_AT: 3, // can't use it with 3+ cards in the Combat Zone
  CLASSES: { I: 'Intellect', R: 'Range', S: 'Strength', U: 'Survival', T: 'Tech' } as Record<
    CardClass,
    string
  >,
};
