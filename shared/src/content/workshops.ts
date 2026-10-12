// Workshop upgrades (FarmVille 2): spend coins and some of a workshop's own
// goods to give it more queue slots, faster crafting and, at the top level,
// a chance of a bonus item with every job.

import type { BuildingDef, RecipeDef } from './buildings';

export interface WorkshopLevel {
  level: number;
  /** Extra queue slots over the building's base. */
  slots: number;
  /** Crafting time multiplier. */
  speed: number;
  /** Chance of one bonus item per finished job. */
  bonus: number;
  /** Player level needed, over the building's own unlock level. */
  needsLevel: number;
  /** Coins, as a fraction of the building's price. */
  costFactor: number;
  /** How many of the building's first and second recipe outputs it takes. */
  goods: [number, number];
}

export const WORKSHOP_LEVELS: WorkshopLevel[] = [
  { level: 1, slots: 0, speed: 1, bonus: 0, needsLevel: 0, costFactor: 0, goods: [0, 0] },
  { level: 2, slots: 1, speed: 0.85, bonus: 0, needsLevel: 1, costFactor: 0.6, goods: [5, 0] },
  { level: 3, slots: 2, speed: 0.7, bonus: 0.25, needsLevel: 3, costFactor: 1.2, goods: [10, 5] },
];

export const MAX_WORKSHOP_LEVEL = WORKSHOP_LEVELS.length;

export function workshopLevel(b: { level?: number }): WorkshopLevel {
  return WORKSHOP_LEVELS[Math.max(1, Math.min(MAX_WORKSHOP_LEVEL, b.level ?? 1)) - 1];
}

export function workshopSlots(b: { level?: number }, def: Pick<BuildingDef, 'slots'> | undefined): number {
  return (def?.slots ?? 0) + workshopLevel(b).slots;
}

/** How long one job of `recipe` takes in this workshop, in ms. */
export function craftMs(b: { level?: number }, recipe: Pick<RecipeDef, 'craftSec'>): number {
  return Math.round(recipe.craftSec * 1000 * workshopLevel(b).speed);
}

/** What upgrading to `level` costs: coins plus some of the workshop's own goods. */
export function upgradeCost(def: BuildingDef, level: number): { coins: number; goods: Record<string, number>; playerLevel: number } | null {
  const lv = WORKSHOP_LEVELS[level - 1];
  if (!lv || level < 2 || !def.recipes.length) return null;
  const goods: Record<string, number> = {};
  const [a, b] = lv.goods;
  const first = def.recipes[0].output;
  const second = def.recipes[1]?.output ?? first;
  if (a) goods[first] = (goods[first] ?? 0) + a;
  if (b) goods[second] = (goods[second] ?? 0) + b;
  return { coins: Math.round(def.cost * lv.costFactor), goods, playerLevel: def.level + lv.needsLevel };
}
