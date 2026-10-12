// Kitty Corner: put out food and goodies, and neighborhood cats wander in to
// play. They leave little thank-you gifts, purr when petted, and once a cat
// loves you enough it can be adopted and live on your farm.

import type { DecoDef } from './decorations';
import { table } from './table';

export type KittyPose = 'sit' | 'loaf' | 'sleep' | 'play';

export interface GoodieDef {
  id: string;
  name: string;
  cost: number;
  level: number;
  charm: number;
  /** How cats look while using it. */
  pose: KittyPose;
  w?: number;
  h?: number;
  event?: string;
}

export interface KittyDef {
  id: string;
  name: string;
  /** A coat description (also the art brief). */
  coat: string;
  personality: string;
  /** Rare cats only come for their favorite goodie and fancy food. */
  rare?: boolean;
  /** The goodie this cat loves most (visits it more often). */
  favorite: string;
  /** Only seen during this festival. */
  event?: string;
}

export interface KittyFood {
  id: string;
  name: string;
  /** Hours the bowls stay full. */
  hours: number;
  coins: number;
  /** Any fish from your barn, this many. */
  fish?: number;
  /** Chance per goodie per visit window that a cat is there. */
  appeal: number;
  /** Rare cats need this. */
  fancy?: boolean;
}

export const KITTY_FOODS: KittyFood[] = [
  { id: 'kibble', name: 'Thrifty Kibble', hours: 6, coins: 20, appeal: 0.45 },
  { id: 'tuna', name: 'Tuna Feast', hours: 8, coins: 90, appeal: 0.65 },
  { id: 'sashimi', name: "Fresh Catch Sashimi", hours: 10, coins: 0, fish: 2, appeal: 0.75, fancy: true },
];
export const KITTY_FOOD: Record<string, KittyFood> = table(KITTY_FOODS);

const g = (id: string, name: string, cost: number, level: number, charm: number, pose: KittyPose, extra: Partial<GoodieDef> = {}): GoodieDef => ({
  id,
  name,
  cost,
  level,
  charm,
  pose,
  ...extra,
});

export const GOODIE_LIST: GoodieDef[] = [
  g('kitty_bowl', 'Kitty Food Bowl', 40, 2, 1, 'sit'),
  g('yarn_ball', 'Ball of Yarn', 60, 2, 2, 'play'),
  g('cardboard_box', 'Cardboard Box', 40, 2, 1, 'loaf'),
  g('cat_cushion', 'Fluffy Cushion', 80, 2, 2, 'sleep'),
  g('paper_bag', 'Crinkly Paper Bag', 30, 3, 1, 'loaf'),
  g('mouse_toy', 'Wind-up Mouse', 70, 3, 2, 'play'),
  g('scratch_post', 'Scratching Post', 110, 3, 3, 'sit'),
  g('cat_bed', 'Cozy Cat Bed', 140, 4, 3, 'sleep'),
  g('teaser_wand', 'Feather Teaser', 90, 4, 2, 'play'),
  g('fish_pillow', 'Fish Pillow', 120, 5, 3, 'sleep'),
  g('cat_tunnel', 'Crinkle Tunnel', 160, 5, 3, 'play', { w: 2 }),
  g('kotatsu', 'Kotatsu', 260, 7, 5, 'sleep'),
  g('big_cushion', 'Giant Squishy Cushion', 300, 8, 5, 'sleep'),
  g('kitty_castle', 'Kitty Castle', 480, 10, 8, 'sit', { w: 2, h: 2 }),
  g('sunny_mat', 'Sunbeam Mat', 70, 3, 2, 'sleep'),
  g('pumpkin_bed', 'Pumpkin Kitty Bed', 150, 1, 4, 'sleep', { event: 'halloween' }),
];
export const GOODIES: Record<string, GoodieDef> = table(GOODIE_LIST);

/** The country set's Cat Tower works as a goodie too. */
export const EXTRA_GOODIES: Record<string, KittyPose> = { cat_tower: 'sit' };

export function goodiePose(def: string): KittyPose | undefined {
  return GOODIES[def]?.pose ?? (Object.hasOwn(EXTRA_GOODIES, def) ? EXTRA_GOODIES[def] : undefined);
}

const k = (id: string, name: string, coat: string, personality: string, favorite: string, extra: Partial<KittyDef> = {}): KittyDef => ({
  id,
  name,
  coat,
  personality,
  favorite,
  ...extra,
});

export const KITTY_LIST: KittyDef[] = [
  k('snowball', 'Snowball', 'all white, pink nose', 'Shy at first, then very cuddly.', 'cat_cushion'),
  k('mochi', 'Mochi', 'soft cream, round as a rice cake', 'Will sleep anywhere. Anywhere.', 'cardboard_box'),
  k('pepper', 'Pepper', 'black and white tuxedo', 'Very polite. Always looks dressed up.', 'scratch_post'),
  k('ginger', 'Ginger', 'orange tabby stripes', 'Loud purr, big appetite.', 'yarn_ball'),
  k('smokey', 'Smokey', 'solid soft gray', 'Calm and wise. Likes high places.', 'cat_tower'),
  k('patches', 'Patches', 'calico: white with orange and black patches', 'Bossy, but in a cute way.', 'paper_bag'),
  k('socks', 'Socks', 'black with four white socks', 'Pounces on everything that moves.', 'mouse_toy'),
  k('marble', 'Marble', 'gray tabby with swirly stripes', 'Curious. Has explored every box.', 'cardboard_box'),
  k('biscuit', 'Biscuit', 'tan with a white belly and chin', 'Kneads biscuits on every cushion.', 'cat_bed'),
  k('noodle', 'Noodle', 'siamese: cream with chocolate ears, face, paws and tail', 'Very chatty. Mrrp? Mrrrp!', 'teaser_wand'),
  k('pudding', 'Pudding', 'chubby orange and white bicolor', 'A gentle giant who loves naps.', 'fish_pillow'),
  k('shadow', 'Shadow', 'all black with golden eyes', 'Appears out of nowhere. Very sweet.', 'cat_tunnel'),
  k('peaches', 'Peaches', 'pale apricot with a fluffy tail', 'Follows the sunbeams around the yard.', 'sunny_mat'),
  k('bean', 'Bean', 'tiny gray-and-white kitten', 'Small. Brave. Falls asleep mid-play.', 'yarn_ball'),
  // Rare cats
  k('big_chonk', 'Big Chonk', 'enormous round white-and-gray cat', 'Eats everything. Leaves the best gifts.', 'big_cushion', { rare: true }),
  k('princess_pearl', 'Princess Pearl', 'fluffy white with a tiny pink tiara', 'Only the finest castles will do.', 'kitty_castle', { rare: true }),
  k('captain_mittens', 'Captain Mittens', 'orange tabby wearing a little pirate hat', 'Sails the seven cardboard boxes.', 'cardboard_box', { rare: true }),
  k('lucky', 'Lucky', 'white calico beckoning cat with a gold bell collar', 'Brings good fortune to cozy farms.', 'kotatsu', { rare: true }),
  // Festival cats
  k('boo', 'Boo', 'black cat with an orange pumpkin bandana', 'Says "mrrrow-boo!" Loves pumpkins.', 'pumpkin_bed', { event: 'halloween' }),
];
export const KITTIES: Record<string, KittyDef> = table(KITTY_LIST);

/** Hearts needed before a cat can be adopted. */
export const ADOPT_HEARTS = 10;
/** Most cats that can live on one farm. */
export const MAX_ADOPTED = 6;
/** Cats stay about this long on a goodie before wandering off. */
export const VISIT_MINUTES = 90;

/** Goodies become decorations in their own shop category. */
export const KITTY_DECORATIONS: DecoDef[] = GOODIE_LIST.map((x) => ({
  id: x.id,
  name: x.name,
  category: 'kitty',
  level: x.level,
  cost: x.cost,
  charm: x.charm,
  w: x.w ?? 1,
  h: x.h ?? 1,
  set: 'kitty',
  ...(x.event ? { event: x.event, category: 'seasonal' as const } : {}),
}));
