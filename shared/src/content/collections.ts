// FarmVille-style collections. Little treasures sometimes turn up while you
// harvest crops or collect from trees and animals. Each collection has five
// of them, from common to rare; turn a full set in for a reward (the first
// time, a keepsake decoration too). Spares can be swapped with the villagers.

import type { DecoDef } from './decorations';

export interface CollectibleDef {
  id: string;
  name: string;
  /** Shown until the painted icon exists. */
  emoji: string;
}

export interface CollectionDef {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** Crop ids, or 'tree' / 'animal' for every tree or animal. */
  sources: string[];
  /** Five collectibles, most common first. */
  items: CollectibleDef[];
  reward: { coins: number; xp: number };
  /** Keepsake decoration for the first set turned in. */
  keepsake: string;
}

/** Chance that a harvest or collection turns up a collectible. */
export const COLLECTIBLE_CHANCE = 0.08;
/** Relative odds of each of the five items (most common first). */
export const COLLECTIBLE_WEIGHTS = [30, 25, 20, 15, 10];
/** Spares the villagers want in exchange for one missing piece. */
export const SWAP_COST = 3;
/** Every turned-in set also comes with this many mystery gifts. */
export const TRADE_GIFTS = 1;

const c = (id: string, name: string, emoji: string): CollectibleDef => ({ id, name, emoji });

export const COLLECTION_LIST: CollectionDef[] = [
  {
    id: 'garden_party',
    name: 'Garden Party',
    emoji: '🌼',
    blurb: 'Bits and bobs that pop up in a busy vegetable patch.',
    sources: ['strawberry', 'wheat', 'carrot', 'tomato', 'potato'],
    items: [
      c('col_seed_packet', 'Seed Packet', '🌱'),
      c('col_garden_glove', 'Garden Glove', '🧤'),
      c('col_ladybug_button', 'Ladybug Button', '🐞'),
      c('col_tiny_trowel', 'Tiny Trowel', '🥄'),
      c('col_snail_shell', 'Swirly Snail Shell', '🐌'),
    ],
    reward: { coins: 300, xp: 40 },
    keepsake: 'ladybug_bench',
  },
  {
    id: 'golden_fields',
    name: 'Golden Fields',
    emoji: '🌾',
    blurb: 'Sunny treasures from the tall grain and flower rows.',
    sources: ['wheat', 'corn', 'sunflower', 'rice', 'cotton'],
    items: [
      c('col_straw_hat', 'Little Straw Hat', '👒'),
      c('col_sunflower_seed', 'Lucky Sunflower Seed', '🌻'),
      c('col_corn_doll', 'Corn Husk Doll', '🎎'),
      c('col_harvest_bell', 'Harvest Bell', '🔔'),
      c('col_golden_sheaf', 'Golden Sheaf', '✨'),
    ],
    reward: { coins: 450, xp: 60 },
    keepsake: 'golden_sheaf_stack',
  },
  {
    id: 'berry_basket',
    name: 'Berry Basket',
    emoji: '🫐',
    blurb: 'Everything you need for a jam-making afternoon.',
    sources: ['strawberry', 'blueberry', 'grape', 'cranberry'],
    items: [
      c('col_gingham_bow', 'Gingham Bow', '🎀'),
      c('col_jam_jar', 'Jam Jar', '🫙'),
      c('col_pie_tin', 'Pie Tin', '🥧'),
      c('col_berry_thimble', 'Berry Thimble', '🧵'),
      c('col_picnic_napkin', 'Picnic Napkin', '🧺'),
    ],
    reward: { coins: 500, xp: 60 },
    keepsake: 'jam_stand',
  },
  {
    id: 'barnyard',
    name: 'Barnyard Treasures',
    emoji: '🐄',
    blurb: 'Found in the straw when you collect from your animals.',
    sources: ['animal'],
    items: [
      c('col_wool_pom', 'Wool Pom-Pom', '🧶'),
      c('col_feather_quill', 'Feather Quill', '🪶'),
      c('col_cow_bell', 'Cow Bell', '🛎️'),
      c('col_horseshoe', 'Lucky Horseshoe', '🍀'),
      c('col_golden_egg', 'Golden Egg', '🥚'),
    ],
    reward: { coins: 600, xp: 80 },
    keepsake: 'cowbell_gate',
  },
  {
    id: 'orchard',
    name: 'Orchard Keepsakes',
    emoji: '🍎',
    blurb: 'Little gifts that tumble down with the fruit.',
    sources: ['tree'],
    items: [
      c('col_acorn_cap', 'Acorn Cap', '🌰'),
      c('col_pressed_leaf', 'Pressed Leaf', '🍁'),
      c('col_blossom_pin', 'Blossom Hairpin', '🌸'),
      c('col_birds_nest', "Bird's Nest", '🪺'),
      c('col_honey_dipper', 'Honey Dipper', '🍯'),
    ],
    reward: { coins: 700, xp: 90 },
    keepsake: 'orchard_birdhouse',
  },
  {
    id: 'tea_party',
    name: 'Afternoon Tea',
    emoji: '🫖',
    blurb: 'Dainty things for the fanciest garden tea party.',
    sources: ['pumpkin', 'cotton', 'coffee', 'lavender', 'watermelon'],
    items: [
      c('col_sugar_cube', 'Sugar Cube', '🧊'),
      c('col_lace_doily', 'Lace Doily', '🤍'),
      c('col_silver_spoon', 'Silver Spoon', '🥄'),
      c('col_lavender_sachet', 'Lavender Sachet', '💜'),
      c('col_teacup', 'Rosebud Teacup', '☕'),
    ],
    reward: { coins: 900, xp: 120 },
    keepsake: 'garden_tea_table',
  },
];

export const COLLECTIONS: Record<string, CollectionDef> = Object.fromEntries(COLLECTION_LIST.map((x) => [x.id, x]));

export const COLLECTIBLES: Record<string, CollectibleDef & { collection: string }> = Object.fromEntries(
  COLLECTION_LIST.flatMap((col) => col.items.map((i) => [i.id, { ...i, collection: col.id }])),
);

/** Collections that can turn up from this crop id or 'tree' / 'animal'. */
export function collectionsFor(source: string, kind?: 'tree' | 'animal'): CollectionDef[] {
  return COLLECTION_LIST.filter((col) => col.sources.includes(source) || (kind !== undefined && col.sources.includes(kind)));
}

const k = (id: string, name: string, charm: number, w = 1, h = 1): DecoDef => ({
  id,
  name,
  category: 'garden',
  level: 1,
  cost: 0,
  charm,
  w,
  h,
  set: 'collections',
  reward: `Complete the ${COLLECTION_LIST.find((x) => x.keepsake === id)?.name ?? ''} collection`,
});

export const KEEPSAKE_DECORATIONS: DecoDef[] = [
  k('ladybug_bench', 'Ladybug Bench', 5),
  k('golden_sheaf_stack', 'Golden Sheaf Stack', 5),
  k('jam_stand', 'Jam Stand', 6),
  k('cowbell_gate', 'Cow Bell Garden Gate', 6),
  k('orchard_birdhouse', 'Orchard Birdhouse', 6),
  k('garden_tea_table', 'Garden Tea Table', 8, 2, 2),
];
