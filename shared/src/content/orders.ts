// Villager orders: a small board of requests that pay better than the market,
// sometimes with a decoration as a thank-you. Orders and mystery gifts use a
// seeded random generator stored in the farm, so client and server always
// roll the same results.

import { ANIMAL_LIST, TREE_LIST } from './producers';
import { BUILDING_LIST } from './buildings';
import { CROP_LIST } from './crops';
import { CORE_DECORATIONS } from './decorations';
import { HORTICULTURE_DECORATIONS } from './decorations2';
import { DISH_LIST } from './cooking';
import { ITEMS } from './items';
import { keepLevel } from './progression';
import type { FarmState, Order } from '../types';

export const ORDER_SLOTS = 3;
export const MYSTERY_GIFT = 'mystery_gift';
/** Chance that harvesting or collecting drops a mystery gift. */
export const MYSTERY_CHANCE = 0.04;

export const ORDER_GIVERS = ['Mayor Maple', 'Henrietta', 'Penny', 'Rosie', 'Grandma Fern'];

const ORDER_NOTES = [
  'for a picnic by the pond',
  'for the village fair',
  'to share with the neighbors',
  'for a cozy dinner',
  'for a birthday surprise',
  'for the festival stall',
  'because I simply adore them',
];

/** Each villager's own reasons, so an order sounds like the one asking. */
const GIVER_NOTES: Record<string, string[]> = {
  'Mayor Maple': ['for the town hall bake sale', 'to welcome some new villagers', 'for my evening cocoa, hoo-hoo', 'for the harvest speech banquet'],
  Henrietta: ['to keep my chicks well fed', 'for my sister’s hen party', 'for a nest-warming brunch', 'for my famous egg salad'],
  Penny: ['for my market stall', 'because the customers keep asking', 'for a very good deal, I promise', 'to restock my sweet shop'],
  Rosie: ['for a picnic in the clover', 'for my famous recipe', 'to decorate my garden party', 'for a carrot cake (shh!)'],
  'Grandma Fern': ['for a pot of my special soup', 'for the grandkids’ visit', 'to put up preserves for winter', 'for my knitting circle'],
};

/** Advance the farm's random seed and return a number in [0, 1). */
export function nextRandom(state: FarmState): number {
  // mulberry32
  let t = (state.seed = (state.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pick<T>(state: FarmState, list: T[]): T {
  return list[Math.floor(nextRandom(state) * list.length)];
}

/** Items the player could plausibly make at their level. */
function orderableItems(level: number): string[] {
  const items = new Set<string>();
  for (const c of CROP_LIST) if (c.level <= level) items.add(c.id);
  for (const p of [...TREE_LIST, ...ANIMAL_LIST]) if (p.level <= level) items.add(p.product);
  for (const b of BUILDING_LIST)
    if (!b.starter && b.level + 1 <= level)
      for (const r of b.recipes) if (Object.keys(r.inputs).every((i) => items.has(i))) items.add(r.output);
  // Home-cooked dishes are popular requests once you can make them.
  for (const d of DISH_LIST)
    if (!d.event && d.level + 1 <= level && Object.keys(d.inputs).every((i) => items.has(i))) items.add(d.id);
  return [...items];
}

/** Decorations an order might gift as a thank-you. */
function bonusPool(level: number): string[] {
  return [...CORE_DECORATIONS, ...HORTICULTURE_DECORATIONS]
    .filter((d) => !d.event && d.level <= level + 4 && d.cost >= 30)
    .map((d) => d.id);
}

export function generateOrder(state: FarmState): Order {
  const pool = orderableItems(state.level);
  const kinds = Math.min(pool.length, 1 + Math.floor(nextRandom(state) * (state.level >= 5 ? 3 : 2)));
  const items: Record<string, number> = {};
  let value = 0;
  while (Object.keys(items).length < kinds) {
    const id = pick(state, pool);
    if (items[id]) continue;
    const sell = ITEMS[id]?.sell ?? 10;
    // Cheap things are asked for in bigger batches.
    const cap = 3 + state.level * 2;
    const qty = Math.max(1, Math.min(cap, Math.round((2 + nextRandom(state) * 3) * Math.min(2, 24 / sell))));
    items[id] = qty;
    value += sell * qty;
  }
  const bonusRoll = nextRandom(state);
  // A different villager, with a different reason, from the orders already up.
  const board = state.orders ?? [];
  const givers = ORDER_GIVERS.filter((g) => !board.some((o) => o.giver === g));
  const giver = pick(state, givers.length ? givers : ORDER_GIVERS);
  const notes = [...GIVER_NOTES[giver], ...ORDER_NOTES].filter((n) => !board.some((o) => o.note === n));
  const order: Order = {
    id: state.nextId++,
    giver,
    note: pick(state, notes),
    items,
    coins: Math.round((value * 1.5) / 5) * 5 + 10,
    xp: Math.max(3, Math.round(value / 12)),
  };
  if (bonusRoll < 0.22) order.bonus = pick(state, bonusPool(state.level));
  return order;
}

/** Bring older saves up to date and keep the order board full. */
export function ensureOrders(state: FarmState): void {
  if (typeof state.seed !== 'number') state.seed = (state.createdAt % 2147483647) | 0;
  if (!Array.isArray(state.orders)) state.orders = [];
  while (state.orders.length < ORDER_SLOTS) state.orders.push(generateOrder(state));
  if (!state.ribbons || typeof state.ribbons !== 'object') state.ribbons = {};
  if (!state.treats || typeof state.treats !== 'object') state.treats = { day: '', count: 0 };
  if (!state.mama || typeof state.mama !== 'object') state.mama = { day: '' };
  keepLevel(state);
}

/** A random decoration from a mystery gift, weighted toward nicer things. */
export function rollMysteryGift(state: FarmState): string {
  const pool = [...CORE_DECORATIONS, ...HORTICULTURE_DECORATIONS].filter((d) => !d.event && d.level <= state.level + 6);
  const weighted: string[] = [];
  for (const d of pool) for (let i = 0; i < Math.min(4, 1 + Math.floor(d.charm / 2)); i++) weighted.push(d.id);
  return pick(state, weighted);
}
