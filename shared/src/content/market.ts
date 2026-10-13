// The Farmers' Market Stall: list goods at a price and villagers buy them
// over time. Higher prices sell slower; something different is in demand
// every day, and the weather changes how many shoppers come out.

import type { DecoDef } from './decorations';
import { ITEMS, type ItemDef } from './items';
import { weatherAt, type Weather } from './weather';

export type PriceTier = 'low' | 'fair' | 'high';

export const PRICE_TIERS: Record<PriceTier, { name: string; mult: number; minutes: number }> = {
  low: { name: 'Bargain', mult: 1.25, minutes: 3 },
  fair: { name: 'Fair', mult: 1.6, minutes: 8 },
  high: { name: 'Fancy', mult: 2.2, minutes: 20 },
};

export const STALL_SLOTS = 4;
export const MAX_LISTING = 10;
/** The day's craving sells for this much more. */
export const CRAVING_MULT = 2;

/** How the weather changes how quickly things sell (lower is faster). */
export const SHOPPERS: Record<Weather, number> = { sunny: 0.8, rainbow: 0.7, cloudy: 1, windy: 1, snow: 1.2, rain: 1.4, storm: 1.8 };

export const MARKET_DECORATIONS: DecoDef[] = [
  { id: 'market_stall', name: "Farmers' Market Stall", category: 'garden', level: 4, cost: 600, charm: 6, w: 2, h: 1, set: 'market' },
];

export function isStall(def: string): boolean {
  return def === 'market_stall';
}

/** Can this be sold at the stall? Everyday goods only. */
export function stallable(item: ItemDef | undefined): item is ItemDef {
  return !!item && item.category !== 'special' && item.sell > 0;
}

const CRAVE_CATEGORIES = new Set(['crop', 'fruit', 'animal', 'good', 'dish']);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  return (h >>> 0) / 4294967296;
}

/** What the villagers are craving on the UTC day containing `now`. */
export function cravingOn(now: number, eligible: (item: ItemDef) => boolean = () => true): string {
  const list = Object.values(ITEMS).filter((i) => CRAVE_CATEGORIES.has(i.category) && stallable(i) && eligible(i));
  const day = new Date(now).toISOString().slice(0, 10);
  return list[Math.floor(hash(`crave:${day}`) * list.length)]?.id ?? 'strawberry';
}

/** Coins per unit and minutes per unit for a listing made now. */
export function quote(item: ItemDef, tier: PriceTier, now: number, craving: string): { each: number; per: number } {
  const t = PRICE_TIERS[tier];
  const crave = item.id === craving ? CRAVING_MULT : 1;
  const each = Math.round(item.sell * t.mult * crave);
  const per = t.minutes * Math.max(1, Math.sqrt(item.sell / 10)) * SHOPPERS[weatherAt(now)] * 60_000;
  return { each, per: Math.round(per) };
}
