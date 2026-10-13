// Farmers' Market Stall. Listings sell one unit at a time; coins wait at the
// stall until you collect them.

import { DISHES } from '../content/cooking';
import { CROPS } from '../content/crops';
import { ITEMS, type ItemDef } from '../content/items';
import { MAX_LISTING, PRICE_TIERS, STALL_SLOTS, cravingOn, isStall, quote, stallable, type PriceTier } from '../content/market';
import { ANIMALS, TREES } from '../content/producers';
import { townDone } from '../content/town';
import { registerFeature } from '../logic/features';
import { GameError, type FarmState } from '../types';

export interface Listing {
  item: string;
  qty: number;
  /** Coins per unit and ms per unit. */
  each: number;
  per: number;
  at: number;
  /** Units already paid out. */
  paid: number;
}

export interface StallState {
  listings: Listing[];
}

declare module '../types' {
  interface FarmState {
    stall?: StallState;
  }
  interface ExtraActions {
    listStall: { type: 'listStall'; item: string; qty: number; tier: PriceTier };
    collectStall: { type: 'collectStall' };
    cancelListing: { type: 'cancelListing'; slot: number };
  }
  interface ExtraEvents {
    stallSales: { type: 'stallSales'; coins: number; units: number };
  }
}

function stall(state: FarmState): StallState {
  return (state.stall ??= { listings: [] });
}

/** Stall slots: more once the town has a Market Square. */
export function stallSlots(state: FarmState): number {
  return STALL_SLOTS + (townDone(state, 'market_square') ? 2 : 0);
}

export function hasStall(state: FarmState): boolean {
  return Object.values(state.objects).some((o) => o.kind === 'deco' && isStall(o.def));
}

/** Units of a listing sold by `now`. */
export function soldUnits(l: Listing, now: number): number {
  return Math.max(0, Math.min(l.qty, Math.floor((now - l.at) / l.per)));
}

/** Coins waiting at the stall. */
export function stallCoins(state: FarmState, now: number): number {
  return (state.stall?.listings ?? []).reduce((a, l) => a + (soldUnits(l, now) - l.paid) * l.each, 0);
}

const CRAVE_LEVEL: Record<string, number> = {};
for (const c of Object.values(CROPS)) if (!c.event) CRAVE_LEVEL[c.id] = c.level;
for (const p of [...Object.values(TREES), ...Object.values(ANIMALS)]) CRAVE_LEVEL[p.product] = Math.min(CRAVE_LEVEL[p.product] ?? 99, p.level);
for (const d of Object.values(DISHES)) if (!d.event) CRAVE_LEVEL[d.id] = d.level;

/** Today's craving: something this farm could have made by now. */
export function cravingFor(state: FarmState, now: number): string {
  return cravingOn(now, (i: ItemDef) => (CRAVE_LEVEL[i.id] ?? 99) <= Math.max(1, state.level));
}

function payOut(state: FarmState, now: number): { coins: number; units: number } {
  const s = stall(state);
  let coins = 0;
  let units = 0;
  for (const l of s.listings) {
    const n = soldUnits(l, now) - l.paid;
    coins += n * l.each;
    units += n;
    l.paid += n;
  }
  s.listings = s.listings.filter((l) => l.paid < l.qty);
  return { coins, units };
}

registerFeature({
  id: 'market',
  migrate: (state) => void stall(state),
  actions: {
    listStall: (state, action: { item: string; qty: number; tier: string }, ctx, _events, kit) => {
      if (!hasStall(state)) throw new GameError("Place a Farmers' Market Stall first (Market › Decor)");
      const item = String(action.item);
      const def = Object.hasOwn(ITEMS, item) ? ITEMS[item] : undefined;
      if (!stallable(def)) throw new GameError("That can't be sold at the stall");
      const tier = String(action.tier) as PriceTier;
      if (!Object.hasOwn(PRICE_TIERS, tier)) throw new GameError('Pick a price');
      const qty = Number(action.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_LISTING) throw new GameError(`List 1 to ${MAX_LISTING} at a time`);
      const s = stall(state);
      if (s.listings.length >= stallSlots(state)) throw new GameError('Your stall is full');
      kit.takeItem(state, item, qty);
      const q = quote(def, tier, ctx.now, cravingFor(state, ctx.now));
      s.listings.push({ item, qty, each: q.each, per: q.per, at: ctx.now, paid: 0 });
      kit.bumpStat(state, 'stallList');
    },
    collectStall: (state, _a, ctx, events, kit) => {
      const { coins, units } = payOut(state, ctx.now);
      if (!units) throw new GameError('Nothing has sold yet');
      kit.earn(state, coins, events);
      kit.addXp(state, Math.min(30, units), events);
      kit.bumpStat(state, 'stallSold', units);
      events.push({ type: 'stallSales', coins, units });
    },
    cancelListing: (state, action: { slot: number }, ctx, events, kit) => {
      const s = stall(state);
      const l = s.listings[Number(action.slot)];
      if (!l || !Number.isInteger(Number(action.slot))) throw new GameError('Nothing listed there');
      const sold = soldUnits(l, ctx.now);
      const coins = (sold - l.paid) * l.each;
      if (coins) kit.earn(state, coins, events);
      if (sold > l.paid) kit.bumpStat(state, 'stallSold', sold - l.paid);
      if (l.qty > sold) kit.addItem(state, l.item, l.qty - sold, events);
      s.listings.splice(Number(action.slot), 1);
    },
  },
});
