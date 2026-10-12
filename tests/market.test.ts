import { describe, expect, it } from 'vitest';
import {
  CRAVING_MULT,
  ITEMS,
  PRICE_TIERS,
  STALL_SLOTS,
  applyAction,
  createFarm,
  cravingFor,
  stallCoins,
  type FarmState,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12);
const act = (s: FarmState, a: Parameters<typeof applyAction>[1], now = T0) => applyAction(s, a, { now });

function shop(): FarmState {
  const s = createFarm('Shopkeep', T0);
  s.objects.st = { id: 'st', kind: 'deco', def: 'market_stall', x: 3, y: 9 };
  s.inventory = { wheat: 20, egg: 10, carrot: 5 };
  return s;
}

describe('market stall', () => {
  it('needs a stall', () => {
    const s = createFarm('Shopkeep', T0);
    s.inventory = { wheat: 5 };
    expect(() => act(s, { type: 'listStall', item: 'wheat', qty: 2, tier: 'fair' })).toThrow(/Stall/);
  });

  it('sells one unit at a time for more than the barn price', () => {
    let s = act(shop(), { type: 'listStall', item: 'wheat', qty: 5, tier: 'fair' }).state;
    expect(s.inventory.wheat).toBe(15);
    const l = s.stall!.listings[0];
    expect(l.each).toBeGreaterThan(ITEMS.wheat.sell);
    expect(stallCoins(s, T0 + l.per - 1)).toBe(0);
    expect(stallCoins(s, T0 + l.per * 2)).toBe(l.each * 2);
    expect(() => act(s, { type: 'collectStall' }, T0 + 1)).toThrow();
    const coins = s.coins;
    s = act(s, { type: 'collectStall' }, T0 + l.per * 2).state;
    expect(s.coins).toBe(coins + l.each * 2);
    expect(s.stall!.listings[0].paid).toBe(2);
    s = act(s, { type: 'collectStall' }, T0 + l.per * 10).state;
    expect(s.stall!.listings).toHaveLength(0);
    expect(s.stats.stallSold).toBe(5);
  });

  it('fancy prices pay more but sell slower', () => {
    const fair = act(shop(), { type: 'listStall', item: 'egg', qty: 1, tier: 'fair' }).state.stall!.listings[0];
    const high = act(shop(), { type: 'listStall', item: 'egg', qty: 1, tier: 'high' }).state.stall!.listings[0];
    expect(high.each).toBeGreaterThan(fair.each);
    expect(high.per).toBeGreaterThan(fair.per);
    expect(PRICE_TIERS.low.minutes).toBeLessThan(PRICE_TIERS.fair.minutes);
  });

  it('the craving sells for double', () => {
    const s = shop();
    const crave = cravingFor(s, T0);
    s.inventory[crave] = 2;
    const a = act(s, { type: 'listStall', item: crave, qty: 1, tier: 'fair' }).state.stall!.listings[0];
    expect(a.each).toBe(Math.round(ITEMS[crave].sell * PRICE_TIERS.fair.mult * CRAVING_MULT));
  });

  it('has limited slots and cancelling returns what is unsold', () => {
    let s = shop();
    for (let i = 0; i < STALL_SLOTS; i++) s = act(s, { type: 'listStall', item: 'wheat', qty: 1, tier: 'low' }).state;
    expect(() => act(s, { type: 'listStall', item: 'wheat', qty: 1, tier: 'low' })).toThrow(/full/);
    s = act(shop(), { type: 'listStall', item: 'carrot', qty: 5, tier: 'high' }).state;
    const l = s.stall!.listings[0];
    const r = act(s, { type: 'cancelListing', slot: 0 }, T0 + l.per + 1).state;
    expect(r.inventory.carrot).toBe(4);
    expect(r.coins).toBe(s.coins + l.each);
    expect(r.stall!.listings).toHaveLength(0);
  });

  it('shrugs off hostile input', () => {
    const s = shop();
    for (const bad of [
      { type: 'listStall', item: '__proto__', qty: 1, tier: 'fair' },
      { type: 'listStall', item: 'wheat', qty: 1, tier: '__proto__' },
      { type: 'listStall', item: 'wheat', qty: 1.5, tier: 'fair' },
      { type: 'listStall', item: 'wheat', qty: 99, tier: 'fair' },
      { type: 'listStall', item: 'candy', qty: 1, tier: 'fair' },
      { type: 'cancelListing', slot: -1 },
      { type: 'cancelListing', slot: 'length' },
    ])
      expect(() => act(s, bad as never)).toThrow();
  });
});
