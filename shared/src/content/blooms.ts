// Flower cross-breeding, in the spirit of Animal Crossing. Tulips and roses
// planted next to each other sometimes sprout a new flower on a free tile
// beside them: usually a copy of a parent, but certain colour pairs can bloom
// into rare hybrids. Watered flowers (or any flower on a rainy day) are much
// more likely to breed.

import type { DecoDef } from './decorations';

export type BloomSpecies = 'tulips' | 'roses';

/** One flower-breeding period: blooms are checked four times a day. */
export const BLOOM_PERIOD = 6 * 3600_000;
/** Chance a flower tries to breed each period, and the boost from water. */
export const BLOOM_CHANCE = 0.12;
export const WATERED_MULT = 2.5;
/** A flower with no partner only clones itself this often when it tries. */
export const LONE_CLONE = 0.5;
/** Most sprouts in one period, and no more sprouting past this many flowers. */
export const MAX_SPROUTS = 3;
export const MAX_BLOOMS = 80;
/** First-discovery rewards. */
export const HYBRID_XP = 25;
export const SPROUT_XP = 2;
/** Discover this many hybrids to receive the Florist's Cart. */
export const FLORIST_AT = 5;

export interface BloomDef {
  id: string;
  species: BloomSpecies;
  hybrid: boolean;
}

export interface BloomRecipe {
  a: string;
  b: string;
  child: string;
  /** Chance the pair blooms into the hybrid (otherwise a copy of a parent). */
  odds: number;
  /** Only blooms while it rains, storms or snows. */
  wet?: boolean;
  /** Who drops the hint, and what they say. */
  hinter: string;
  hint: string;
}

const hy = (id: string, name: string, cost: number, charm: number, reward: string): DecoDef => ({
  id,
  name,
  category: 'flowers',
  level: 1,
  cost,
  charm,
  w: 1,
  h: 1,
  reward,
});

/** Hybrid flowers: never sold, only bred. Painted with the core flower art. */
export const BLOOM_DECORATIONS: DecoDef[] = [
  hy('tulips_orange', 'Orange Tulips', 60, 2, 'Cross-breed red and yellow tulips'),
  hy('tulips_white', 'Snowy Tulips', 60, 2, 'Cross-breed pink and purple tulips'),
  hy('tulips_black', 'Midnight Tulips', 150, 3, 'Cross-breed purple and snowy tulips'),
  hy('tulips_rainbow', 'Rainbow Tulips', 400, 5, 'Cross-breed orange and snowy tulips'),
  hy('roses_yellow', 'Sunny Roses', 80, 3, 'Cross-breed white and pink roses'),
  hy('roses_orange', 'Peach Roses', 80, 3, 'Cross-breed red and sunny roses'),
  hy('roses_lavender', 'Lavender Roses', 100, 3, 'Cross-breed red and white roses'),
  hy('roses_blue', 'Blue Roses', 300, 5, 'Cross-breed lavender and peach roses'),
  hy('roses_gold', 'Golden Roses', 800, 8, 'Cross-breed blue and sunny roses in the rain'),
];

/** The Florist's Cart, a keepsake for discovering five hybrids. */
export const FLORIST_DECORATIONS: DecoDef[] = [
  {
    id: 'florist_cart',
    name: "Florist's Cart",
    category: 'flowers',
    level: 1,
    cost: 500,
    charm: 8,
    w: 2,
    h: 1,
    set: 'blooms',
    reward: `Breed ${FLORIST_AT} kinds of hybrid flowers`,
  },
];

const b = (id: string, species: BloomSpecies, hybrid = false): BloomDef => ({ id, species, hybrid });

export const BLOOM_LIST: BloomDef[] = [
  b('tulips_red', 'tulips'),
  b('tulips_yellow', 'tulips'),
  b('tulips_pink', 'tulips'),
  b('tulips_purple', 'tulips'),
  b('roses_red', 'roses'),
  b('roses_white', 'roses'),
  b('roses_pink', 'roses'),
  ...BLOOM_DECORATIONS.map((d) => b(d.id, d.id.startsWith('tulips') ? 'tulips' : 'roses', true)),
];

export const BLOOMS: Record<string, BloomDef> = Object.fromEntries(BLOOM_LIST.map((x) => [x.id, x]));
export const HYBRIDS = BLOOM_LIST.filter((x) => x.hybrid);

export const BLOOM_RECIPES: BloomRecipe[] = [
  {
    a: 'tulips_red',
    b: 'tulips_yellow',
    child: 'tulips_orange',
    odds: 0.5,
    hinter: 'Henrietta',
    hint: 'My hens nap between the red and yellow tulips, and the ones that come up in the middle are orange as a yolk!',
  },
  {
    a: 'tulips_pink',
    b: 'tulips_purple',
    child: 'tulips_white',
    odds: 0.5,
    hinter: 'Grandma Fern',
    hint: 'Pink and purple tulips side by side, dear. That is how my mother grew her snowy white ones.',
  },
  {
    a: 'tulips_purple',
    b: 'tulips_white',
    child: 'tulips_black',
    odds: 0.3,
    hinter: 'Mayor Maple',
    hint: 'Hoo! Town legend says purple and snowy tulips planted together bloom midnight-dark.',
  },
  {
    a: 'tulips_orange',
    b: 'tulips_white',
    child: 'tulips_rainbow',
    odds: 0.2,
    hinter: 'Rosie',
    hint: 'I put orange tulips next to snowy ones and one came up every colour at once! I nearly fainted!',
  },
  {
    a: 'roses_white',
    b: 'roses_pink',
    child: 'roses_yellow',
    odds: 0.5,
    hinter: 'Penny',
    hint: 'Oink! White roses and pink roses together sometimes make sunny yellow ones. Like lemonade!',
  },
  {
    a: 'roses_red',
    b: 'roses_yellow',
    child: 'roses_orange',
    odds: 0.45,
    hinter: 'Mama Marigold',
    hint: 'Red roses cuddled up with sunny ones give the sweetest peach blossoms, honey.',
  },
  {
    a: 'roses_red',
    b: 'roses_white',
    child: 'roses_lavender',
    odds: 0.4,
    hinter: 'Grandma Fern',
    hint: 'Red and white roses together, and a little patience, and you may find lavender ones.',
  },
  {
    a: 'roses_lavender',
    b: 'roses_orange',
    child: 'roses_blue',
    odds: 0.2,
    hinter: 'Mayor Maple',
    hint: "A blue rose! Only seen once in Meadowbrook, between a lavender bush and a peach one. Remarkable!",
  },
  {
    a: 'roses_blue',
    b: 'roses_yellow',
    child: 'roses_gold',
    odds: 0.25,
    wet: true,
    hinter: 'Mama Marigold',
    hint: 'Golden roses only open in the rain, they say. Blue and sunny, side by side, under a grey sky.',
  },
];

export function recipeFor(a: string, b: string): BloomRecipe | undefined {
  return BLOOM_RECIPES.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
}

export function recipeOf(child: string): BloomRecipe | undefined {
  return BLOOM_RECIPES.find((r) => r.child === child);
}
