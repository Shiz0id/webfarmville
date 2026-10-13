// Baby animals (FarmVille 2). Animals can be bought as babies for half price
// (lonely animals always arrive as babies) and grow up into producing adults.
// Cuddles and treats help them grow, and doubly so near a Nursery Barn.

import type { DecoDef } from './decorations';
import type { ProducerDef } from './producers';

/** Animals that come as babies (beehives don't). */
export const BABY_ANIMALS = ['chicken', 'cow', 'sheep', 'pig', 'duck', 'goat', 'rabbit'];

/** What a baby of each kind is called. */
export const BABY_NAMES: Record<string, string> = {
  chicken: 'Chick',
  cow: 'Calf',
  sheep: 'Lamb',
  pig: 'Piglet',
  duck: 'Duckling',
  goat: 'Kid',
  rabbit: 'Bunny Kit',
};

/** Babies cost this fraction of a grown-up. */
export const BABY_PRICE = 0.5;
/** A baby can be cuddled once every this many ms. */
export const CUDDLE_EVERY = 3600_000;
/** Each cuddle skips this fraction of the whole growing time. */
export const CUDDLE_SKIP = 0.1;
/** Cuddles and treats count this many times over near a Nursery Barn. */
export const NURSERY_MULT = 2;
/** How far (in tiles, from its edge) a Nursery Barn's warmth reaches. */
export const NURSERY_RANGE = 3;
export const NURSERY_DECO = 'nursery_barn';

/** How long a baby takes to grow up (three production cycles, 30 minutes to 12 hours). */
export function babyGrowMs(def: Pick<ProducerDef, 'cycleSec'>): number {
  return Math.max(1800, Math.min(43_200, def.cycleSec * 3)) * 1000;
}

export function babyPrice(def: Pick<ProducerDef, 'cost'>): number {
  return Math.floor(def.cost * BABY_PRICE);
}

export const NURSERY_DECORATIONS: DecoDef[] = [
  {
    id: NURSERY_DECO,
    name: 'Nursery Barn',
    category: 'country',
    level: 3,
    cost: 400,
    charm: 7,
    w: 3,
    h: 3,
    set: 'nursery',
  },
];
