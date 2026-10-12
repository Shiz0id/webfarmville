// The texture keys each art module is expected to provide, derived from game content.
import {
  ANIMAL_LIST,
  BUILDING_LIST,
  CORE_DECORATIONS,
  COUNTRY_DECORATIONS,
  FESTIVAL_DECORATIONS,
  SPOOKY_DECORATIONS,
  CROP_LIST,
  DISH_LIST,
  EVENT_FEATURES,
  HORTICULTURE_DECORATIONS,
  ITEM_LIST,
  LIFESTYLE_DECORATIONS,
  QUEST_LIST,
  TREE_LIST,
  FISH_LIST,
  BUG_LIST,
  NATURE_DECORATIONS,
  FRIEND_DECORATIONS,
  MARKET_DECORATIONS,
  FLORIST_DECORATIONS,
  FAIR_DECORATIONS,
  PROJECT_LIST,
  KITTY_LIST,
  GOODIE_LIST,
  KITTY_FOODS,
} from '@farm/shared';

/** Every cat sprite frame (key `cat:<id>:<frame>`); `#1` frames animate. */
export const KITTY_FRAMES = ['sit', 'loaf', 'sleep', 'sleep#1', 'play', 'play#1', 'walk', 'walk#1'];

/** Pieces of the fishing mini-game scene, painted as icons (key `fishing:<name>`). */
export const FISHING_PROPS = ['bobber', 'splash', 'shadow', 'reeds', 'lily_pad', 'dock'];

export const UI_ICONS = ['coin', 'xp', 'charm', 'level'];

export function expectedKeys(mod: string): string[] {
  const byModule: Record<string, () => string[]> = {
    crops: () => [
      ...CROP_LIST.flatMap((c) => [0, 1, 2].map((s) => `crop:${c.id}:${s}`)),
      'crop:withered',
      ...CROP_LIST.map((c) => `icon:${c.id}`),
    ],
    trees: () => [
      ...TREE_LIST.flatMap((t) => [`tree:${t.id}`, `tree:${t.id}:ready`]),
      ...TREE_LIST.map((t) => `icon:${t.product}`),
    ],
    animals: () => [...ANIMAL_LIST.map((a) => `animal:${a.id}`), ...ANIMAL_LIST.map((a) => `icon:${a.product}`)],
    buildings: () => BUILDING_LIST.map((b) => `building:${b.id}`),
    goods: () => [
      ...ITEM_LIST.filter((i) => i.category === 'good').map((i) => `icon:${i.id}`),
      ...UI_ICONS.map((k) => `icon:${k}`),
    ],
    ground: () => [
      'ground:grass:0',
      'ground:grass:1',
      'ground:grass:2',
      'ground:grass:3',
      'ground:wild:0',
      'ground:wild:1',
      'ground:wild:2',
      'ground:plot',
      'ground:plot_fert',
      'wild:tree:0',
      'wild:tree:1',
      'wild:tree:2',
      'wild:rock',
      'wild:bush',
    ],
    decorations: () => CORE_DECORATIONS.filter((d) => !d.event).map((d) => `deco:${d.id}`),
    seasonal: () => CORE_DECORATIONS.filter((d) => d.event).map((d) => `deco:${d.id}`),
    lifestyle: () => LIFESTYLE_DECORATIONS.map((d) => `deco:${d.id}`),
    horticulture: () => HORTICULTURE_DECORATIONS.map((d) => `deco:${d.id}`),
    spooky_a: () => SPOOKY_DECORATIONS.slice(0, 18).map((d) => `deco:${d.id}`),
    spooky_b: () => SPOOKY_DECORATIONS.slice(18).map((d) => `deco:${d.id}`),
    country_a: () => COUNTRY_DECORATIONS.slice(0, 18).map((d) => `deco:${d.id}`),
    country_b: () => COUNTRY_DECORATIONS.slice(18).map((d) => `deco:${d.id}`),
    festivals_a: () => FESTIVAL_DECORATIONS.slice(0, 17).map((d) => `deco:${d.id}`),
    festivals_b: () => FESTIVAL_DECORATIONS.slice(17).map((d) => `deco:${d.id}`),
    halloween: () => [
      ...['candy_corn', 'ghost_pumpkin'].flatMap((c) => [0, 1, 2].map((s) => `crop:${c}:${s}`).concat(`icon:${c}`)),
      'icon:candy',
      ...['ghost', 'pumpkin', 'witch'].flatMap((k) => [`npc:kid_${k}`, `npc:kid_${k}_walk`]),
      'costume:witch_hat',
      'costume:pumpkin_hat',
      'costume:bat_bow',
      'fx:bat',
      ...['yellow', 'white', 'red', 'blue'].map((c) => `icon:ribbon_${c}`),
    ],
    events_a: () => eventKeys(['winter', 'new_year', 'lunar_new_year']),
    events_b: () => eventKeys(['valentines', 'st_patricks', 'tanabata']),
    events_c: () => eventKeys(['thanksgiving', 'diwali', 'mid_autumn']),
    events_d: () => eventKeys(['hanami', 'earth_day', 'spring']),
    events_e: () => eventKeys(['summer', 'harvest']),
    cooking: () => [
      ...DISH_LIST.map((d) => `icon:${d.id}`),
      ...COOK_PROPS.map((k) => `cook:${k}`),
      'portrait:mama_marigold',
      'npc:mama',
      'npc:mama_walk',
    ],
    anim_animals: () => ANIMAL_LIST.flatMap((a) => [`animal:${a.id}#1`, `animal:${a.id}#2`]),
    anim_decos: () => ANIMATED_DECOS.flatMap(([key, n]) => Array.from({ length: n }, (_, i) => `${key}#${i + 1}`)),
    nature_fish: () => [
      ...FISH_LIST.map((f) => `icon:${f.id}`),
      ...['fish_tacos', 'fish_and_chips', 'grilled_trout', 'salmon_onigiri'].map((d) => `icon:${d}`),
      ...FISHING_PROPS.map((k) => `fishing:${k}`),
    ],
    nature_bugs: () => [...BUG_LIST.map((b) => `icon:${b.id}`), ...NATURE_DECORATIONS.map((d) => `deco:${d.id}`), 'icon:journal', 'icon:net', 'icon:rod'],
    kitty_cats: () => [
      ...KITTY_LIST.flatMap((c) => KITTY_FRAMES.map((f) => `cat:${c.id}:${f}`)),
      ...KITTY_LIST.map((c) => `icon:cat_${c.id}`),
      'pet:cat_stand',
      'pet:cat_walk',
      'pet:cat_sleep',
    ],
    kitty_goodies: () => [
      ...GOODIE_LIST.map((x) => `deco:${x.id}`),
      ...KITTY_FOODS.map((f) => `icon:${f.id}`),
      'icon:paw',
      'kitty:food_full',
      'fx:purr',
    ],
    friends: () => [...FRIEND_DECORATIONS.map((d) => `deco:${d.id}`), 'icon:letter', 'icon:letter_open', 'icon:friendship'],
    market: () => [...MARKET_DECORATIONS.map((d) => `deco:${d.id}`), 'icon:market', 'market:crate', 'market:basket', 'market:sign'],
    blooms: () => [...FLORIST_DECORATIONS.map((d) => `deco:${d.id}`), 'icon:blooms'],
    fair: () => [...FAIR_DECORATIONS.map((d) => `deco:${d.id}`), 'icon:fair', 'icon:ticket'],
    town: () => [...PROJECT_LIST.map((p) => `town:${p.id}`), 'icon:town'],
    portraits: () => [...new Set(QUEST_LIST.map((q) => q.giver))].map((g) => `portrait:${giverKey(g)}`),
  };
  if (mod === 'all') return Object.values(byModule).flatMap((f) => f());
  return byModule[mod]?.() ?? [];
}

/** 'Grandma Fern' -> 'grandma_fern' */
export function giverKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, '_');
}

/** Particle textures that already exist in fx.ts. */
const SHARED_FX = new Set(['fx:snow', 'fx:heart', 'fx:petal', 'fx:fluff', 'fx:sparkle', 'fx:leaf_red', 'fx:leaf_orange', 'fx:leaf_yellow', 'fx:bat']);

/** Every texture an event's features need: currency, crops, visitors, costumes, particles. */
export function eventKeys(events: string[]): string[] {
  return events.flatMap((ev) => {
    const f = EVENT_FEATURES[ev];
    return [
      `icon:${f.currency}`,
      ...f.crops.flatMap((c) => [0, 1, 2].map((s) => `crop:${c}:${s}`).concat(`icon:${c}`)),
      ...f.visitors.flatMap((v) => [`npc:${v}`, `npc:${v}_walk`]),
      ...f.costumes,
      ...f.particles.filter((p) => !SHARED_FX.has(p)),
    ];
  });
}

/** Kitchen props for the cooking mini-games (96×96 icons). */
export const COOK_PROPS = ['board', 'knife', 'pot', 'pan', 'bowl', 'whisk', 'oven', 'plate', 'egg', 'shaker', 'dough', 'flame', 'spoon'];

/** Sprites with extra animation frames (key#1, key#2, ...) and how many. */
export const ANIMATED_DECOS: [string, number][] = [
  ['building:mill', 3],
  ['deco:pinwheel', 2],
  ['deco:campfire', 2],
  ['deco:fountain', 2],
  ['deco:string_lights', 1],
  ['deco:tiki_torch', 2],
  ['deco:jack_o_lantern', 1],
  ['deco:fire_pit', 2],
  ['deco:sprinkler', 2],
  ['deco:bubbling_cauldron', 2],
  ['deco:jack_string_lights', 1],
  ['deco:windchime', 2],
];
