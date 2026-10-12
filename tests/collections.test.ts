import { describe, expect, it } from 'vitest';
import {
  COLLECTIBLES,
  COLLECTION_LIST,
  COLLECTIONS,
  CROPS,
  DECORATIONS,
  ITEMS,
  SWAP_COST,
  applyAction,
  canTrade,
  collectibleCount,
  collectionsFor,
  createFarm,
  setProgress,
  sparesIn,
  type FarmState,
  type GameEvent,
} from '@farm/shared';

const T0 = Date.UTC(2026, 9, 12, 12);

function farmer(): FarmState {
  const s = createFarm('Collector', T0);
  s.level = 20;
  s.coins = 1_000_000;
  return s;
}

function give(s: FarmState, items: Record<string, number>): FarmState {
  s.collections = { have: { ...items }, traded: {} };
  return s;
}

describe('collections', () => {
  it('has six sets of five unique collectibles with real sources and keepsakes', () => {
    expect(COLLECTION_LIST).toHaveLength(6);
    const ids = new Set<string>();
    for (const col of COLLECTION_LIST) {
      expect(col.items).toHaveLength(5);
      for (const i of col.items) {
        expect(ids.has(i.id)).toBe(false);
        expect(ITEMS[i.id]).toBeUndefined();
        ids.add(i.id);
      }
      for (const src of col.sources) expect(src === 'tree' || src === 'animal' || !!CROPS[src]).toBe(true);
      expect(DECORATIONS[col.keepsake]?.reward).toContain(col.name);
    }
    expect(collectionsFor('strawberry').map((c) => c.id)).toEqual(['garden_party', 'berry_basket']);
    expect(collectionsFor('apple_tree', 'tree').map((c) => c.id)).toEqual(['orchard']);
  });

  it('collectibles turn up while harvesting and collecting', () => {
    let s = farmer();
    s.objects = {};
    s.objects.p1 = { id: 'p1', kind: 'plot', x: 2, y: 2 };
    s.objects.a1 = { id: 'a1', kind: 'animal', def: 'chicken', x: 5, y: 5, cycleStart: T0 };
    s.nextId = 10;
    const found: Extract<GameEvent, { type: 'collectible' }>[] = [];
    let t = T0;
    for (let i = 0; i < 150; i++) {
      s = applyAction(s, { type: 'plant', id: 'p1', crop: 'carrot' }, { now: t }).state;
      t += 600_000;
      for (const a of [{ type: 'harvest', id: 'p1' }, { type: 'collect', id: 'a1' }] as const) {
        const r = applyAction(s, a, { now: t });
        s = r.state;
        for (const e of r.events) if (e.type === 'collectible') found.push(e);
      }
    }
    expect(found.length).toBeGreaterThan(8);
    expect(new Set(found.map((e) => e.collection))).toEqual(new Set(['garden_party', 'barnyard']));
    const total = Object.values(s.collections!.have).reduce((a, b) => a + b, 0);
    expect(total).toBe(s.stats.collectible);
    expect(Object.keys(s.collections!.have).every((id) => COLLECTIBLES[id])).toBe(true);
  });

  it('turning in a full set pays out, and the keepsake only comes the first time', () => {
    const col = COLLECTIONS.garden_party;
    let s = give(farmer(), Object.fromEntries(col.items.map((i, n) => [i.id, n === 0 ? 3 : 1])));
    expect(canTrade(s, col.id)).toBe(true);
    const coins = s.coins;
    const r = applyAction(s, { type: 'tradeCollection', collection: col.id }, { now: T0 });
    s = r.state;
    expect(s.coins).toBe(coins + col.reward.coins);
    expect(s.inventory[col.keepsake]).toBe(1);
    expect(s.inventory.mystery_gift).toBe(1);
    expect(collectibleCount(s, col.items[0].id)).toBe(2);
    expect(collectibleCount(s, col.items[1].id)).toBe(0);
    expect(s.collections!.have[col.items[1].id]).toBeUndefined();
    expect(r.events.find((e) => e.type === 'collectionTraded')).toMatchObject({ keepsake: col.keepsake });
    expect(() => applyAction(s, { type: 'tradeCollection', collection: col.id }, { now: T0 })).toThrow("isn't complete");
    for (const i of col.items) s.collections!.have[i.id] = 1;
    const again = applyAction(s, { type: 'tradeCollection', collection: col.id }, { now: T0 });
    expect(again.state.inventory[col.keepsake]).toBe(1);
    expect(again.state.collections!.traded[col.id]).toBe(2);
    expect(again.state.stats.collectionTrade).toBe(2);
  });

  it('three spares can be swapped for a missing piece', () => {
    const col = COLLECTIONS.orchard;
    const [a, b, c, , rare] = col.items;
    let s = give(farmer(), { [a.id]: 3, [b.id]: 2, [c.id]: 1 });
    expect(setProgress(s, col)).toBe(3);
    expect(sparesIn(s, col)).toBe(SWAP_COST);
    expect(() => applyAction(s, { type: 'swapCollectible', item: a.id }, { now: T0 })).toThrow('already have');
    s = applyAction(s, { type: 'swapCollectible', item: rare.id }, { now: T0 }).state;
    expect(collectibleCount(s, rare.id)).toBe(1);
    expect(collectibleCount(s, a.id)).toBe(1);
    expect(collectibleCount(s, b.id)).toBe(1);
    expect(collectibleCount(s, c.id)).toBe(1);
    expect(sparesIn(s, col)).toBe(0);
    expect(() => applyAction(s, { type: 'swapCollectible', item: col.items[3].id }, { now: T0 })).toThrow('spare');
  });
});
