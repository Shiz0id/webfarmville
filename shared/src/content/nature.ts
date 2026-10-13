// Fishing at Meadow Pond and catching the little critters that wander the
// farm. What you can find depends on the season, the time of day and any
// festival that is running. Every species goes into the Nature Journal.

import type { DecoDef } from './decorations';
import { table } from './table';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type TimeOfDay = 'day' | 'night' | 'any';
export type NatureKind = 'fish' | 'bug';

export interface CritterDef {
  id: string;
  name: string;
  kind: NatureKind;
  /** 1 (everywhere) to 5 (legendary). */
  rarity: 1 | 2 | 3 | 4 | 5;
  seasons: Season[] | 'all';
  time: TimeOfDay;
  sell: number;
  xp: number;
  /** Typical size in cm; each catch varies a little. */
  size: number;
  /** Only found while this festival runs. */
  event?: string;
  /** A line for the journal. */
  note: string;
}

const ALL = 'all' as const;
const SP: Season[] = ['spring'];
const SU: Season[] = ['summer'];
const AU: Season[] = ['autumn'];
const WI: Season[] = ['winter'];

const XP_BY_RARITY = [0, 3, 6, 12, 25, 60];

function c(
  kind: NatureKind,
  id: string,
  name: string,
  rarity: CritterDef['rarity'],
  seasons: Season[] | 'all',
  time: TimeOfDay,
  sell: number,
  size: number,
  note: string,
  event?: string,
): CritterDef {
  return { id, name, kind, rarity, seasons, time, sell, size, note, xp: XP_BY_RARITY[rarity], ...(event ? { event } : {}) };
}

const fish = (...a: Parameters<typeof c> extends [unknown, ...infer R] ? R : never) => c('fish', ...a);
const bug = (...a: Parameters<typeof c> extends [unknown, ...infer R] ? R : never) => c('bug', ...a);

export const FISH_LIST: CritterDef[] = [
  fish('bluegill', 'Bluegill', 1, ALL, 'any', 25, 18, 'A friendly little sunfish. Always first to the bait!'),
  fish('minnow', 'Minnow', 1, ALL, 'any', 15, 6, 'Tiny, quick and very curious.'),
  fish('carp', 'Carp', 1, ALL, 'any', 35, 45, 'Grandma Fern says carp are the wise elders of the pond.'),
  fish('perch', 'Yellow Perch', 1, [...SP, ...SU, ...AU], 'day', 35, 22, 'Stripy and sunny, like a little tiger.'),
  fish('tadpole', 'Tadpole', 1, SP, 'any', 20, 3, 'Someday this wiggler will sing to you at night.'),
  fish('crawfish', 'Crawfish', 1, [...SP, ...SU], 'any', 40, 10, 'Snip snip! Hold it by the back.'),
  fish('pumpkinseed', 'Pumpkinseed', 2, AU, 'any', 55, 15, 'A sunfish painted in autumn colors.'),
  fish('catfish', 'Catfish', 2, [...SU, ...AU], 'night', 70, 60, 'Those whiskers! It purrs, probably.'),
  fish('rainbow_trout', 'Rainbow Trout', 2, [...SP, ...AU], 'day', 75, 40, 'Shimmers every color after a rain shower.'),
  fish('bass', 'Largemouth Bass', 2, SU, 'any', 70, 45, 'A big gulp of a fish. Very proud.'),
  fish('pond_smelt', 'Pond Smelt', 2, WI, 'any', 55, 12, 'Loves the cold. Sparkles under the ice.'),
  fish('goldfish', 'Goldfish', 3, [...SP, ...SU], 'day', 130, 12, 'Someone let it go years ago. It is thriving.'),
  fish('koi', 'Koi', 3, ALL, 'day', 160, 55, 'Graceful and lucky. The Mayor has three.'),
  fish('salmon', 'Salmon', 3, AU, 'any', 150, 70, 'Swimming home for the season.'),
  fish('pike', 'Pike', 3, WI, 'any', 140, 80, 'A toothy grin, but a gentle heart.'),
  fish('eel', 'Eel', 3, SU, 'night', 150, 70, 'Slips away like a ribbon in the moonlight.'),
  fish('sturgeon', 'Sturgeon', 4, [...AU, ...WI], 'any', 320, 140, 'An ancient fish with a knobbly armored back.'),
  fish('golden_trout', 'Golden Trout', 4, SP, 'day', 340, 35, 'Glows like a sunbeam in the shallows.'),
  fish('starfin', 'Starfin', 4, SU, 'night', 360, 30, 'Its fins twinkle like the summer sky.'),
  fish('golden_koi', 'Golden Koi', 5, ALL, 'any', 900, 70, 'Legend says it grants one cozy wish.'),
  fish('coelacanth', 'Coelacanth', 5, ALL, 'night', 800, 160, "How did THIS get into Meadow Pond?!"),
  // Festival fish
  fish('ghost_fish', 'Ghost Fish', 3, ALL, 'any', 180, 25, 'Boo! It is see-through and a little shy.', 'halloween'),
  fish('ice_fish', 'Snowflake Fish', 3, ALL, 'any', 180, 20, 'Cold as a snowflake, sweet as cocoa.', 'winter'),
  fish('heart_guppy', 'Heart Guppy', 3, ALL, 'any', 160, 5, 'Its tail is shaped like a little heart.', 'valentines'),
  fish('lucky_minnow', 'Lucky Minnow', 3, ALL, 'any', 160, 7, 'A green minnow. Rub it for luck. Gently!', 'st_patricks'),
  fish('sakura_trout', 'Sakura Trout', 3, ALL, 'any', 180, 35, 'Pink as the blossoms drifting on the water.', 'hanami'),
  fish('lantern_fish', 'Lantern Fish', 3, ALL, 'night', 200, 15, 'Glows softly, like a paper lantern.', 'mid_autumn'),
];

export const BUG_LIST: CritterDef[] = [
  bug('cabbage_white', 'Cabbage White', 1, [...SP, ...SU], 'day', 15, 5, 'A soft white butterfly that loves your veggie patch.'),
  bug('ladybug', 'Ladybug', 1, [...SP, ...SU, ...AU], 'day', 20, 1, 'Seven spots. Good luck for gardeners!'),
  bug('bumblebee', 'Bumblebee', 1, [...SP, ...SU], 'day', 25, 2, 'Fuzzy, round and busy busy busy.'),
  bug('snail', 'Garden Snail', 1, [...SP, ...AU], 'any', 15, 3, 'Carries its cozy house everywhere.'),
  bug('caterpillar', 'Caterpillar', 1, [...SP, ...SU], 'day', 15, 4, 'Very hungry. Will be a butterfly someday!'),
  bug('pill_bug', 'Pill Bug', 1, ALL, 'any', 10, 1, 'Rolls into a tiny ball when it is shy.'),
  bug('grasshopper', 'Grasshopper', 1, [...SU, ...AU], 'day', 20, 4, 'Boing! Boing! Hard to catch.'),
  bug('cricket', 'Cricket', 1, AU, 'night', 25, 2, 'Plays a little violin song at night.'),
  bug('dragonfly', 'Dragonfly', 2, SU, 'day', 55, 8, 'Zips over the pond like a jeweled kite.'),
  bug('firefly', 'Firefly', 2, SU, 'night', 70, 2, 'Tiny lanterns of summer nights.'),
  bug('monarch', 'Monarch Butterfly', 2, [...SU, ...AU], 'day', 65, 9, 'Orange and black, on its way somewhere warm.'),
  bug('woolly_bear', 'Woolly Bear', 2, [...AU, ...WI], 'day', 50, 5, 'A fuzzy caterpillar that predicts the winter.'),
  bug('winter_moth', 'Winter Moth', 2, WI, 'night', 60, 3, 'Dances in the frosty moonlight.'),
  bug('praying_mantis', 'Praying Mantis', 3, AU, 'day', 150, 7, 'Always looks like it is saying please.'),
  bug('stag_beetle', 'Stag Beetle', 3, SU, 'night', 200, 6, 'Big antlers, very gentle.'),
  bug('luna_moth', 'Luna Moth', 4, SU, 'night', 300, 11, 'Pale green wings like moonlight.'),
  bug('rhino_beetle', 'Rhino Beetle', 4, SU, 'night', 340, 8, 'Strong enough to lift a strawberry!'),
  bug('blue_morpho', 'Blue Morpho', 5, ALL, 'day', 800, 14, 'A flash of brilliant blue. Make a wish!'),
  bug('rainbow_stag', 'Rainbow Stag', 5, SU, 'any', 900, 6, 'Every color of the rainbow on one shiny shell.'),
  // Festival critters
  bug('ghost_moth', 'Ghost Moth', 3, ALL, 'any', 180, 6, 'A pale little moth that says "boo" very quietly.', 'halloween'),
  bug('heart_ladybug', 'Sweetheart Ladybug', 3, ALL, 'day', 160, 1, 'Its spots are tiny pink hearts.', 'valentines'),
  bug('sakura_butterfly', 'Sakura Butterfly', 3, ALL, 'day', 180, 6, 'Drifts on the breeze like a cherry petal.', 'hanami'),
  bug('star_firefly', 'Wishing Firefly', 3, ALL, 'night', 200, 2, 'Whisper a wish and let it go.', 'tanabata'),
];

export const CRITTER_LIST: CritterDef[] = [...FISH_LIST, ...BUG_LIST];
export const CRITTERS: Record<string, CritterDef> = table(CRITTER_LIST);

/** How common each rarity is (relative weights). */
export const RARITY_WEIGHT = [0, 100, 40, 14, 4, 1];
export const RARITY_NAMES = ['', 'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'];

/** Daily limits. A fishing dock or duck pond on your farm gives extra casts. */
export const DAILY_CASTS = 12;
export const DAILY_NETS = 15;
export const CAST_BONUS: Record<string, number> = { fishing_dock: 6, duck_pond: 3, koi_pond: 3, fishing_bench: 2, koi_garden_pond: 3 };
export const NET_BONUS: Record<string, number> = { butterfly_bush: 2, bee_hotel: 2, wildflowers: 1, bug_net_stand: 2, butterfly_house: 4 };

export function seasonOf(now: number): Season {
  const m = new Date(now).getUTCMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export function isNight(hour: number): boolean {
  return hour >= 19 || hour < 6;
}

/** Can this species be found right now? (`eventOn` says which festivals are running.) */
export function critterAvailable(def: CritterDef, now: number, hour: number, eventOn: (e: string) => boolean): boolean {
  if (def.event && !eventOn(def.event)) return false;
  if (def.seasons !== 'all' && !def.seasons.includes(seasonOf(now))) return false;
  if (def.time === 'day' && isNight(hour)) return false;
  if (def.time === 'night' && !isNight(hour)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Journal milestones: every few species discovered earns a keepsake.

export interface JournalTier {
  count: number;
  coins: number;
  xp: number;
  deco: string;
}

export const JOURNAL_TIERS: Record<NatureKind, JournalTier[]> = {
  fish: [
    { count: 5, coins: 200, xp: 20, deco: 'fishing_bench' },
    { count: 10, coins: 500, xp: 50, deco: 'glass_aquarium' },
    { count: 15, coins: 1000, xp: 100, deco: 'angler_trophy' },
    { count: 20, coins: 2000, xp: 200, deco: 'koi_garden_pond' },
    { count: 25, coins: 4000, xp: 400, deco: 'golden_fish_statue' },
  ],
  bug: [
    { count: 5, coins: 200, xp: 20, deco: 'bug_net_stand' },
    { count: 10, coins: 500, xp: 50, deco: 'bug_terrarium' },
    { count: 15, coins: 1000, xp: 100, deco: 'butterfly_house' },
    { count: 20, coins: 2500, xp: 250, deco: 'golden_beetle_statue' },
  ],
};

const reward = (id: string, name: string, charm: number, how: string, w = 1, h = 1, flat = false): DecoDef => ({
  id,
  name,
  category: 'water',
  level: 1,
  cost: 0,
  charm,
  w,
  h,
  set: 'nature',
  reward: how,
  ...(flat ? { flat } : {}),
});

/** Keepsakes earned from the Nature Journal (never sold in the shop). */
export const NATURE_DECORATIONS: DecoDef[] = [
  reward('fishing_bench', 'Fishing Bench', 4, 'Discover 5 kinds of fish'),
  reward('glass_aquarium', 'Glass Aquarium', 6, 'Discover 10 kinds of fish'),
  reward('angler_trophy', 'Angler Trophy', 8, 'Discover 15 kinds of fish'),
  reward('koi_garden_pond', 'Koi Garden Pond', 12, 'Discover 20 kinds of fish', 2, 2, true),
  reward('golden_fish_statue', 'Golden Fish Fountain', 16, 'Discover 25 kinds of fish'),
  { ...reward('bug_net_stand', 'Bug Net Stand', 4, 'Discover 5 kinds of critters'), category: 'garden' },
  { ...reward('bug_terrarium', 'Critter Terrarium', 6, 'Discover 10 kinds of critters'), category: 'garden' },
  { ...reward('butterfly_house', 'Butterfly House', 10, 'Discover 15 kinds of critters', 2, 2), category: 'garden' },
  { ...reward('golden_beetle_statue', 'Golden Beetle Statue', 16, 'Discover 20 kinds of critters'), category: 'garden' },
];
