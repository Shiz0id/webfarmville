// The Feed Mill (FarmVille 2): grind crops into animal feed. A fed animal
// gets on with its work sooner and gives a little extra at its next
// collection; a fed baby grows up sooner.

import type { BuildingDef } from './buildings';
import type { ItemDef } from './items';

export const FEED_MILL = 'feed_mill';

export interface FeedDef {
  id: string;
  name: string;
  /** Extra goods at the animal's next collection. */
  bonus: number;
  /** Fraction of the current production cycle skipped. */
  skip: number;
  /** Fraction of a baby's growing-up time skipped. */
  babySkip: number;
}

export const FEED_LIST: FeedDef[] = [
  { id: 'animal_feed', name: 'Barnyard Feed', bonus: 1, skip: 0.25, babySkip: 0.2 },
  { id: 'deluxe_feed', name: 'Deluxe Feed', bonus: 2, skip: 0.5, babySkip: 0.4 },
];

export const FEEDS: Record<string, FeedDef> = Object.fromEntries(FEED_LIST.map((f) => [f.id, f]));

export const FEED_ITEMS: ItemDef[] = [
  { id: 'animal_feed', name: 'Barnyard Feed', category: 'good', sell: 8 },
  { id: 'deluxe_feed', name: 'Deluxe Feed', category: 'good', sell: 30 },
];

export const FEED_MILL_BUILDING: BuildingDef = {
  id: FEED_MILL,
  name: 'Feed Mill',
  level: 3,
  cost: 450,
  w: 2,
  h: 2,
  slots: 3,
  charm: 3,
  recipes: [
    { id: 'animal_feed', output: 'animal_feed', qty: 3, inputs: { wheat: 2, carrot: 1 }, craftSec: 90, xp: 2 },
    { id: 'deluxe_feed', output: 'deluxe_feed', qty: 2, inputs: { corn: 2, blueberry: 1 }, craftSec: 600, xp: 4 },
  ],
};
